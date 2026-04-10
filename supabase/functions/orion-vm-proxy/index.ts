import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * ORION VM Proxy — Routes requests to GCP VM with auto-start and HF Space fallback.
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
      const formData = await req.formData();
      action = formData.get("action") as string || "detect";
      
      const endpoint = mapActionToEndpoint(action);
      const vmResp = await fetchWithAutoStart(
        `${VM_URL.replace(/\/+$/, "")}${endpoint}`,
        { method: "POST", body: formData },
        `${HF_SPACE_URL}/api/predict/${action}`,
      );
      
      return new Response(vmResp.body, {
        status: vmResp.status,
        headers: { ...corsHeaders, "Content-Type": vmResp.headers.get("Content-Type") || "application/json" },
      });
    }

    body = await req.json();
    action = body.action || body.endpoint || "health";
    delete body.action;
    delete body.endpoint;

    const endpoint = mapActionToEndpoint(action);

    // Remove trailing slash from VM_URL to avoid double-slash (e.g. http://x:8080//health)
    const baseUrl = VM_URL.replace(/\/+$/, "");
    let vmUrl = `${baseUrl}${endpoint}`;
    const GET_ACTIONS = ["health", "cache/stats"];
    let fetchOpts: RequestInit = {
      method: GET_ACTIONS.includes(action) ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
    };

    if (!GET_ACTIONS.includes(action)) {
      if (["tts", "stt", "embeddings"].includes(action)) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(body.payload || body)) {
          fd.append(k, String(v));
        }
        fetchOpts = { method: "POST", body: fd };
      } else {
        fetchOpts.body = JSON.stringify(body.payload || body);
      }
    }

    console.log(`[orion-vm-proxy] Fetching: ${vmUrl}`);
    const startTime = Date.now();

    const vmResp = await fetchWithAutoStart(vmUrl, fetchOpts, null);

    console.log(`[orion-vm-proxy] Response in ${Date.now() - startTime}ms, status: ${vmResp.status}`);

    // Record activity for auto-stop timer
    recordActivity().catch(() => {});

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

/**
 * Try to reach the VM. If connection refused (VM is stopped), 
 * trigger auto-start and return a "starting" response.
 */
async function fetchWithAutoStart(
  primaryUrl: string,
  opts: RequestInit,
  fallbackUrl: string | null,
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const resp = await fetch(primaryUrl, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    if (resp.ok) return resp;
    throw new Error(`VM returned ${resp.status}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isOffline = errMsg.includes("connection refused") || 
                      errMsg.includes("Connection refused") ||
                      errMsg.includes("failed to connect") ||
                      errMsg.includes("ECONNREFUSED") ||
                      errMsg.includes("aborted") ||
                      errMsg.includes("timed out");

    if (isOffline) {
      console.log("[orion-vm-proxy] VM appears offline, triggering auto-start...");
      await triggerVmStart();
      
      return new Response(
        JSON.stringify({
          status: "vm_starting",
          message: "Orion VM is starting up. Please retry in ~60-90 seconds.",
          retry_after_seconds: 90,
        }),
        { status: 503 },
      );
    }

    if (fallbackUrl) {
      console.warn(`[orion-vm-proxy] VM failed, trying HF fallback: ${err}`);
      return fetch(fallbackUrl, { method: "POST", headers: { "Content-Type": "application/json" } });
    }
    throw err;
  }
}

/**
 * Call the orion-vm-control function to start the VM
 */
async function triggerVmStart(): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return;

    await fetch(`${supabaseUrl}/functions/v1/orion-vm-control`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command: "start" }),
    });
  } catch (e) {
    console.error("[orion-vm-proxy] Failed to trigger VM start:", e);
  }
}

/**
 * Record activity timestamp for auto-stop timer
 */
async function recordActivity(): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return;

  await fetch(`${supabaseUrl}/rest/v1/api_cache`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      query_hash: "orion-vm-last-activity",
      query_text: "last-activity",
      source: "orion-vm-control",
      response_data: { timestamp: Date.now() },
      expires_at: new Date(Date.now() + 86400_000).toISOString(),
    }),
  });
}
