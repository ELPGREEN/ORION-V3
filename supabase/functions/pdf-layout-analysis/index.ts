import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type LayoutMode = "analyze" | "markdown" | "html" | "ocr" | "visualize";

const MODE_ENDPOINTS: Record<LayoutMode, string> = {
  analyze: "/",
  markdown: "/markdown",
  html: "/html",
  ocr: "/ocr",
  visualize: "/visualize",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceUrl = Deno.env.get("PDF_LAYOUT_SERVICE_URL");
    if (!serviceUrl) {
      return new Response(
        JSON.stringify({ error: "PDF_LAYOUT_SERVICE_URL not configured. Layout analysis unavailable." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { pdfBase64, mode = "analyze", fast = false, language = "eng" } = body as {
      pdfBase64: string;
      mode?: LayoutMode;
      fast?: boolean;
      language?: string;
    };

    if (!pdfBase64) {
      return new Response(
        JSON.stringify({ error: "pdfBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const endpoint = MODE_ENDPOINTS[mode] ?? "/";
    const targetUrl = `${serviceUrl.replace(/\/$/, "")}${endpoint}`;

    // Convert base64 to binary
    const binaryStr = atob(pdfBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Build form data for HURIDOCS API
    const formData = new FormData();
    formData.append("file", new Blob([bytes], { type: "application/pdf" }), "document.pdf");

    if (fast) formData.append("fast", "true");
    if (language !== "eng") formData.append("language", language);

    console.log(`[pdf-layout-analysis] Proxying to ${targetUrl} (mode=${mode}, fast=${fast}, lang=${language})`);

    const response = await fetch(targetUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[pdf-layout-analysis] Upstream error ${response.status}: ${errText}`);
      return new Response(
        JSON.stringify({ error: `Upstream service error: ${response.status}`, details: errText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For visualize mode, return binary PDF
    if (mode === "visualize" || mode === "ocr") {
      const pdfBuffer = await response.arrayBuffer();
      const resultBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
      return new Response(
        JSON.stringify({ pdfBase64: resultBase64, mode }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For other modes, return JSON/text
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return new Response(JSON.stringify({ data, mode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = await response.text();
    return new Response(JSON.stringify({ content: text, mode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[pdf-layout-analysis] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
