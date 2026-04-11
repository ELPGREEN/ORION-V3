import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// GCP VM details
const PROJECT_ID = "orion-d3734";
const ZONE = "us-central1-f";
const INSTANCE_NAME = "orion-backend";

/**
 * ORION VM Control — Start/Stop/Status the GCP VM
 * 
 * POST /orion-vm-control
 * Body: { "command": "start" | "stop" | "status" }
 * 
 * Also called by cron to auto-stop after inactivity.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const command = body.command || "status";

    const accessToken = await getAccessToken();
    if (!accessToken) {
      return jsonResp({ error: "GCP credentials not configured" }, 503);
    }

    const baseUrl = `https://compute.googleapis.com/compute/v1/projects/${PROJECT_ID}/zones/${ZONE}/instances/${INSTANCE_NAME}`;

    if (command === "status") {
      const status = await getVmStatus(baseUrl, accessToken);
      return jsonResp({ status, instance: INSTANCE_NAME });
    }

    if (command === "start") {
      const status = await getVmStatus(baseUrl, accessToken);
      if (status === "RUNNING") {
        return jsonResp({ status: "already_running", instance: INSTANCE_NAME });
      }
      if (status === "STAGING" || status === "PROVISIONING") {
        return jsonResp({ status: "starting", instance: INSTANCE_NAME });
      }
      
      const resp = await fetch(`${baseUrl}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await resp.json();
      console.log("[orion-vm-control] Start response:", data.status);
      
      // Record activity timestamp
      await recordActivity();
      
      return jsonResp({ 
        status: "starting", 
        operation: data.status,
        instance: INSTANCE_NAME,
        message: "VM is starting. It will be ready in ~60-90 seconds.",
      });
    }

    if (command === "stop") {
      const status = await getVmStatus(baseUrl, accessToken);
      if (status === "TERMINATED" || status === "STOPPED") {
        return jsonResp({ status: "already_stopped", instance: INSTANCE_NAME });
      }
      
      const resp = await fetch(`${baseUrl}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await resp.json();
      console.log("[orion-vm-control] Stop response:", data.status);
      
      return jsonResp({ 
        status: "stopping", 
        operation: data.status,
        instance: INSTANCE_NAME,
      });
    }

    if (command === "auto-stop-check") {
      // Called by cron — stop VM if no activity in last 15 minutes
      const lastActivity = await getLastActivity();
      const inactiveMinutes = (Date.now() - lastActivity) / 60_000;
      
      console.log(`[orion-vm-control] Inactivity check: ${inactiveMinutes.toFixed(1)} minutes`);
      
      if (inactiveMinutes > 15) {
        const status = await getVmStatus(baseUrl, accessToken);
        if (status === "RUNNING") {
          console.log("[orion-vm-control] Auto-stopping VM due to inactivity");
          await fetch(`${baseUrl}/stop`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          return jsonResp({ action: "stopped", inactive_minutes: Math.round(inactiveMinutes) });
        }
      }
      
      return jsonResp({ action: "no-op", inactive_minutes: Math.round(inactiveMinutes) });
    }

    return jsonResp({ error: "Unknown command. Use: start, stop, status, auto-stop-check" }, 400);
  } catch (err) {
    console.error("[orion-vm-control] Error:", err);
    return jsonResp({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

// ============================================================
// GCP Auth — Service Account JWT → Access Token
// ============================================================

async function getAccessToken(): Promise<string | null> {
  const saKeyJson = Deno.env.get("GCP_SA_KEY");
  if (!saKeyJson) return null;

  try {
    const saKey = JSON.parse(saKeyJson);
    const now = Math.floor(Date.now() / 1000);
    
    // Create JWT
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
      iss: saKey.client_email,
      scope: "https://www.googleapis.com/auth/compute",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    };

    const jwt = await signJwt(header, payload, saKey.private_key);

    // Exchange JWT for access token
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const data = await resp.json();
    return data.access_token || null;
  } catch (err) {
    console.error("[orion-vm-control] Auth error:", err);
    return null;
  }
}

async function signJwt(
  header: Record<string, string>,
  payload: Record<string, unknown>,
  privateKeyPem: string,
): Promise<string> {
  const encoder = new TextEncoder();
  
  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const pemContent = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  
  const keyData = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(unsignedToken),
  );

  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

function base64urlEncode(data: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...data));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ============================================================
// VM Status
// ============================================================

async function getVmStatus(baseUrl: string, accessToken: string): Promise<string> {
  const resp = await fetch(baseUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await resp.json();
  return data.status || "UNKNOWN";
}

// ============================================================
// Activity Tracking (using Supabase)
// ============================================================

async function recordActivity(): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return;

  // Use api_cache table to store last activity timestamp
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

async function getLastActivity(): Promise<number> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return 0;

  const resp = await fetch(
    `${supabaseUrl}/rest/v1/api_cache?query_hash=eq.orion-vm-last-activity&select=response_data`,
    {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    },
  );
  
  const data = await resp.json();
  if (data?.[0]?.response_data?.timestamp) {
    return data[0].response_data.timestamp;
  }
  return 0;
}

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
