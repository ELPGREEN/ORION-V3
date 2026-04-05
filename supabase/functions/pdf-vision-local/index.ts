/**
 * NEUROCORE AI — PDF Vision Local Edge Function
 * Accepts base64 JSON or multipart/form-data PDF uploads.
 * Rate-limited (20 req / 5 min per user). Auth required.
 * Pipeline: HF Space → Gemini Vision fallback.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // === AUTH ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Não autenticado" }, 401);
    }

    // === RATE LIMITING (20 req / 5 min) ===
    try {
      const { data: allowed } = await supabase.rpc("check_rate_limit", {
        _user_id: user.id,
        _function_name: "pdf-vision-local",
        _max_requests: 20,
        _window_minutes: 5,
      });
      if (allowed === false) {
        return jsonResponse({ error: "Rate limit excedido. Aguarde alguns minutos." }, 429);
      }
    } catch (e) {
      console.warn("[pdf-vision-local] Rate limit check failed, proceeding:", e);
    }

    // === PARSE INPUT (JSON or FormData) ===
    let pdfBase64 = "";
    let mode = "markdown";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      mode = (formData.get("mode") as string) || "markdown";

      if (!file) {
        return jsonResponse({ error: "Campo 'file' obrigatório no FormData" }, 400);
      }

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      pdfBase64 = btoa(binary);
    } else {
      const body = await req.json();
      pdfBase64 = body.pdfBase64 || "";
      mode = body.mode || "markdown";
    }

    if (!pdfBase64) {
      return jsonResponse({ error: "PDF não fornecido (pdfBase64 ou file)" }, 400);
    }

    // Limit: 10MB base64 (~7.5MB raw)
    if (pdfBase64.length > 10 * 1024 * 1024) {
      return jsonResponse({ error: "PDF muito grande (max 10MB)" }, 413);
    }

    // === PROCESSING PIPELINE ===
    const hfSpaceUrl = Deno.env.get("PDF_LAYOUT_SERVICE_URL") || "https://ericsonv12-adv.hf.space";
    let result: any = null;

    // Attempt 1: HF Space
    try {
      const binaryString = atob(pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const formData = new FormData();
      formData.append("file", new Blob([bytes], { type: "application/pdf" }), "document.pdf");

      const endpoint = mode === "html" ? "/html" : mode === "analyze" ? "/" : "/markdown";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);

      const hfRes = await fetch(`${hfSpaceUrl}${endpoint}`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (hfRes.ok) {
        if (mode === "analyze") {
          result = await hfRes.json();
          result.source = "hf_space";
        } else {
          result = { content: await hfRes.text(), source: "hf_space", mode };
        }
      }
    } catch (e) {
      console.warn("[pdf-vision-local] HF Space unavailable:", e instanceof Error ? e.message : "unknown");
    }

    // Attempt 2: Gemini Vision fallback
    if (!result) {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (geminiKey) {
        try {
          const prompt = mode === "html"
            ? "Extract all text from this PDF and format it as clean HTML with proper headings, paragraphs, and tables. Return only the HTML."
            : mode === "analyze"
            ? "Analyze this PDF layout. Return a JSON object with: { segments: [{ type: 'title'|'paragraph'|'table'|'image', content: string, page: number }], page_count: number }"
            : "Extract all text from this PDF and format it as clean Markdown with proper headings, lists, and tables. Return only the Markdown.";

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
                  ],
                }],
              }),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

            if (mode === "analyze") {
              try {
                result = JSON.parse(text.replace(/```json\s*/g, "").replace(/```\s*/g, ""));
                result.source = "gemini_fallback";
              } catch {
                result = { segments: [{ type: "text", content: text, page: 1 }], page_count: 1, source: "gemini_fallback" };
              }
            } else {
              result = { content: text, source: "gemini_fallback", mode };
            }
          }
        } catch (e) {
          console.error("[pdf-vision-local] Gemini fallback failed:", e);
        }
      }
    }

    if (!result) {
      return jsonResponse({ error: "Nenhum provedor disponível para processar o PDF" }, 503);
    }

    // === LOG METRICS ===
    const durationMs = Date.now() - startTime;
    try {
      await supabase.from("ai_metrics").insert({
        user_id: user.id,
        query: `[PDF-Vision] mode=${mode}`,
        provider: result.source || "hf_space",
        success: true,
        total_duration_ms: durationMs,
        complexity: "pdf_analysis",
        tools_used: ["pdf-vision-local"],
      });
    } catch {}

    return jsonResponse(result);
  } catch (error) {
    console.error("[pdf-vision-local] Error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Erro interno" }, 500);
  }
});