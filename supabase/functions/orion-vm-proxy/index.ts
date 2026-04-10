import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * ORION VM Proxy — Routes requests to GCP VM with HF Space fallback.
 * 
 * POST /orion-vm-proxy
 * Body: { action: "health" | "tts" | "stt" | "detect" | "classify" | "ocr" | "embeddings" | "proxy/gemini", ...params }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VM_URL = Deno.env.get("ORION_VM_URL");
    const HF_SPACE_URL = "https://ericsonv12-orion-gpu.hf.space";

    console.log("[orion-vm-proxy] VM_URL:", VM_URL ? `${VM_URL.substring(0, 20)}...` : "NOT SET");

    if (!VM_URL) {
      return new Response(
        JSON.stringify({ error: "ORION_VM_URL not configured", fallback: "hf-space" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    let action = "";
    let body: any;

    if (contentType.includes("multipart/form-data")) {
      // Forward multipart as-is to VM
      const formData = await req.formData();
      action = formData.get("action") as string || "detect";
      
      const endpoint = mapActionToEndpoint(action);
      const vmResp = await fetchWithFallback(
        `${VM_URL}${endpoint}`,
        { method: "POST", body: formData },
        `${HF_SPACE_URL}/api/predict/${action}`,
      );
      
      return new Response(vmResp.body, {
        status: vmResp.status,
        headers: { ...corsHeaders, "Content-Type": vmResp.headers.get("Content-Type") || "application/json" },
      });
    }

    body = await req.json();
    action = body.action || "health";
    delete body.action;

    const endpoint = mapActionToEndpoint(action);

    // For JSON endpoints, proxy to VM
    let vmUrl = `${VM_URL}${endpoint}`;
    let fetchOpts: RequestInit = {
      method: action === "health" ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
    };

    if (action !== "health") {
      // Convert to form data for VM endpoints that expect it
      if (["tts", "stt", "embeddings"].includes(action)) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(body)) {
          fd.append(k, String(v));
        }
        fetchOpts = { method: "POST", body: fd };
      } else {
        fetchOpts.body = JSON.stringify(body);
      }
    }

    console.log(`[orion-vm-proxy] Fetching: ${vmUrl}`);
    const startTime = Date.now();

    const vmResp = await fetchWithFallback(
      vmUrl,
      fetchOpts,
      null, // no HF fallback for direct JSON endpoints
    );

    console.log(`[orion-vm-proxy] Response in ${Date.now() - startTime}ms, status: ${vmResp.status}`);

    const respBody = await vmResp.text();
    return new Response(respBody, {
      status: vmResp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[orion-vm-proxy] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error", source: "proxy" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapActionToEndpoint(action: string): string {
  const map: Record<string, string> = {
    health: "/health",
    tts: "/tts",
    stt: "/stt",
    detect: "/vision/detect",
    classify: "/vision/classify",
    ocr: "/ocr",
    embeddings: "/embeddings",
    "proxy/gemini": "/proxy/gemini",
    "cache/stats": "/cache/stats",
  };
  return map[action] || `/${action}`;
}

async function fetchWithFallback(
  primaryUrl: string,
  opts: RequestInit,
  fallbackUrl: string | null,
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    const resp = await fetch(primaryUrl, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    if (resp.ok) return resp;
    throw new Error(`VM returned ${resp.status}`);
  } catch (err) {
    if (fallbackUrl) {
      console.warn(`[orion-vm-proxy] VM failed, trying HF fallback: ${err}`);
      return fetch(fallbackUrl, { method: "POST", headers: { "Content-Type": "application/json" } });
    }
    throw err;
  }
}
