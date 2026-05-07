import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
  timeoutMs = 120000
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);

      // Retry on 503 (cold start) or 404 (HF space loading)
      if ((response.status === 503 || response.status === 404) && attempt < maxRetries) {
        const backoff = (attempt + 1) * 5000;
        console.log(`Service ${response.status} — retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timer);
      if (attempt < maxRetries) {
        const backoff = (attempt + 1) * 10000;
        console.log(`Fetch error (${(err as Error).message}) — retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("Auth error:", userError?.message || "No user");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[generate-pdf] Request from user ${userData.user.id}`);

    // Use configured URL or fallback to known HF Space
    const rawServiceUrl = Deno.env.get("PDF_LAYOUT_SERVICE_URL") || "";
    // Normalize: if user pasted a HuggingFace page URL, convert to API URL
    let serviceUrl = rawServiceUrl;
    const hfPageMatch = rawServiceUrl.match(/huggingface\.co\/spaces\/([^\/]+)\/([^\/]+)/);
    if (hfPageMatch) {
      serviceUrl = `https://${hfPageMatch[1].toLowerCase()}-${hfPageMatch[2].toLowerCase()}.hf.space`;
      console.log(`[generate-pdf] Normalized HF URL: ${rawServiceUrl} → ${serviceUrl}`);
    }
    if (!serviceUrl) {
      // Default fallback to known Orion HF Space
      serviceUrl = "https://ericsonv12-adv.hf.space";
    }

    const body = await req.json();
    const { html } = body as { html: string };

    if (!html) {
      return new Response(
        JSON.stringify({ error: "html field is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call the HF Space /generate-pdf endpoint with retry for cold starts
    const generateUrl = `${serviceUrl.replace(/\/$/, "")}/generate-pdf`;
    console.log(`[generate-pdf] Calling: ${generateUrl} (html length: ${html.length})`);

    const response = await fetchWithRetry(generateUrl, {
      method: "POST",
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ html }),
    });
    console.log(`[generate-pdf] Response: ${response.status} ${response.statusText} (content-type: ${response.headers.get("content-type")})`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HF Space error:", response.status, errorText.substring(0, 500));

      // Detect HF Spaces HTML page (service down/moved)
      const isHfPage = errorText.includes("huggingface") || errorText.includes("<!DOCTYPE html>");
      if (isHfPage || response.status === 404) {
        return new Response(
          JSON.stringify({
            error: "Serviço de PDF indisponível",
            message: "O Hugging Face Space está inativo ou em cold start. Tente novamente em 30s.",
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "PDF generation failed", details: errorText.substring(0, 300) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check content type — if it's a PDF binary, convert to base64
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/pdf")) {
      const pdfBytes = new Uint8Array(await response.arrayBuffer());
      let base64 = "";
      const chunkSize = 8192;
      for (let i = 0; i < pdfBytes.length; i += chunkSize) {
        base64 += String.fromCharCode(...pdfBytes.subarray(i, i + chunkSize));
      }
      base64 = btoa(base64);

      return new Response(
        JSON.stringify({ pdfBase64: base64, size: pdfBytes.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If JSON response (already has pdfBase64)
    const result = await response.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-pdf error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});