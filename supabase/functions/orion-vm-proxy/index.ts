import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { recordVmActivity } from "../_shared/orion-vm-activity.ts";

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
    let VM_URL = Deno.env.get("ORION_VM_URL");
    const HF_SPACE_URL = "https://ericsonv12-orion-gpu.hf.space";

    if (VM_URL && !VM_URL.includes(":8080") && !VM_URL.includes(":443")) {
      VM_URL = VM_URL.replace(/\/+$/, "") + ":8080";
    }

    console.log("[orion-vm-proxy] VM_URL:", VM_URL || "NOT SET");

    if (!VM_URL) {
      return new Response(
        JSON.stringify({ error: "ORION_VM_URL not configured", fallback: "hf-space" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const action = (formData.get("action") as string) || "detect";
      const endpoint = mapActionToEndpoint(action);
      const vmResp = await fetchWithAutoStart(
        `${VM_URL.replace(/\/+$/, "")}${endpoint}`,
        { method: "POST", body: formData },
        `${HF_SPACE_URL}/api/predict/${action}`,
      );

      recordVmActivity(`orion-vm-proxy:${action}`).catch(() => {});
      return toProxyResponse(vmResp);
    }

    const body = await req.json();
    const action = body.action || body.endpoint || "health";
    delete body.action;
    delete body.endpoint;

    const endpoint = mapActionToEndpoint(action);
    const baseUrl = VM_URL.replace(/\/+$/, "");
    const vmUrl = `${baseUrl}${endpoint}`;
    const GET_ACTIONS = ["health", "cache/stats"];
    const isGet = GET_ACTIONS.includes(action);

    let fetchOpts: RequestInit = {
      method: isGet ? "GET" : "POST",
    };

    if (!isGet) {
      if (["tts", "stt", "embeddings"].includes(action)) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(body.payload || body)) {
          fd.append(k, String(v));
        }
        fetchOpts = { method: "POST", body: fd };
      } else {
        fetchOpts.headers = { "Content-Type": "application/json" };
        fetchOpts.body = JSON.stringify(body.payload || body);
      }
    }

    console.log(`[orion-vm-proxy] Fetching: ${vmUrl}`);
    const startTime = Date.now();
    const vmResp = await fetchWithAutoStart(vmUrl, fetchOpts, null);
    console.log(`[orion-vm-proxy] Response in ${Date.now() - startTime}ms, status: ${vmResp.status}`);

    recordVmActivity(`orion-vm-proxy:${action}`).catch(() => {});
    return toProxyResponse(vmResp);
  } catch (err) {
    console.error("[orion-vm-proxy] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error", source: "proxy" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
    const errBody = await resp.text().catch(() => "");
    throw new Error(`VM returned ${resp.status}: ${errBody.substring(0, 200)}`);
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

function toProxyResponse(resp: Response): Response {
  return new Response(resp.body, {
    status: resp.status,
    headers: {
      ...corsHeaders,
      "Content-Type": resp.headers.get("Content-Type") || "application/json",
    },
  });
}
