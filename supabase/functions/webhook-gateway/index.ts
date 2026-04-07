/**
 * ─── Orion Webhook Gateway ───
 * Configurable webhook system: register callbacks for events.
 * Supports: Slack, Discord, Zapier, generic HTTP.
 * HMAC signature validation for security.
 * SECURITY: SSRF protection, input validation, auth via getClaims.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  event_type: string;
  data: Record<string, unknown>;
  timestamp: string;
  trace_id?: string;
}

// ─── Input Validation ───
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS (SSRF protection)
    if (parsed.protocol !== "https:") return false;
    // Block internal/private IPs
    const hostname = parsed.hostname.toLowerCase();
    const blocked = [
      "localhost", "127.0.0.1", "0.0.0.0", "::1",
      "metadata.google.internal", "169.254.169.254",
      "10.", "172.16.", "172.17.", "172.18.", "172.19.",
      "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
      "172.25.", "172.26.", "172.27.", "172.28.", "172.29.",
      "172.30.", "172.31.", "192.168."
    ];
    for (const b of blocked) {
      if (hostname === b || hostname.startsWith(b)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function sanitizeString(s: unknown, maxLen: number): string | null {
  if (typeof s !== "string") return null;
  return s.trim().slice(0, maxLen) || null;
}

// HMAC-SHA256 signature
async function generateHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function deliverWebhook(
  callbackUrl: string,
  payload: WebhookPayload,
  secret?: string | null
): Promise<{ success: boolean; status: number; error?: string }> {
  // Re-validate URL before delivery (SSRF defense-in-depth)
  if (!isValidUrl(callbackUrl)) {
    return { success: false, status: 0, error: "Blocked: invalid or internal URL" };
  }

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (secret) {
    headers["X-Orion-Signature"] = await generateHmacSignature(body, secret);
  }

  try {
    const res = await fetch(callbackUrl, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });
    return { success: res.ok, status: res.status };
  } catch (e) {
    return { success: false, status: 0, error: "Delivery failed" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    // Auth check via getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabaseAuth.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = claimsData.claims.sub as string;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "trigger";

    // ─── REGISTER webhook ───
    if (req.method === "POST" && action === "register") {
      let body: Record<string, unknown>;
      try { body = await req.json(); } catch { 
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const event_type = sanitizeString(body.event_type, 100);
      const callback_url = sanitizeString(body.callback_url, 2000);
      const secret = sanitizeString(body.secret, 256);
      const description = sanitizeString(body.description, 500);

      if (!event_type || !callback_url) {
        return new Response(JSON.stringify({ error: "event_type and callback_url required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // SSRF: validate callback URL
      if (!isValidUrl(callback_url)) {
        return new Response(JSON.stringify({ error: "callback_url must be a valid HTTPS URL (no internal/private IPs)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data, error } = await supabase.from("webhook_subscriptions").insert({
        user_id: userId,
        event_type,
        callback_url,
        secret: secret || null,
        description: description || null,
      }).select("id").single();

      if (error) throw error;
      return new Response(JSON.stringify({ id: data.id, message: "Webhook registered" }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── LIST webhooks ───
    if (req.method === "GET" && action === "list") {
      const { data, error } = await supabase
        .from("webhook_subscriptions")
        .select("id, event_type, callback_url, is_active, description, last_triggered_at, failure_count, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ webhooks: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── TRIGGER event (internal use) ───
    if (req.method === "POST" && action === "trigger") {
      let body: Record<string, unknown>;
      try { body = await req.json(); } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const event_type = sanitizeString(body.event_type, 100);
      if (!event_type) {
        return new Response(JSON.stringify({ error: "event_type required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Find active subscriptions for this event
      const { data: subs } = await supabase
        .from("webhook_subscriptions")
        .select("*")
        .eq("event_type", event_type)
        .eq("is_active", true);

      if (!subs || subs.length === 0) {
        return new Response(JSON.stringify({ message: "No active subscriptions", delivered: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const payload: WebhookPayload = {
        event_type,
        data: (typeof body.data === "object" && body.data !== null ? body.data : {}) as Record<string, unknown>,
        timestamp: new Date().toISOString(),
        trace_id: sanitizeString(body.trace_id, 64) || undefined,
      };

      let delivered = 0;
      let failed = 0;

      for (const sub of subs) {
        const result = await deliverWebhook(sub.callback_url, payload, sub.secret);

        if (result.success) {
          delivered++;
          await supabase.from("webhook_subscriptions").update({
            last_triggered_at: new Date().toISOString(),
            failure_count: 0,
          }).eq("id", sub.id);
        } else {
          failed++;
          const newFailCount = (sub.failure_count || 0) + 1;
          await supabase.from("webhook_subscriptions").update({
            failure_count: newFailCount,
            is_active: newFailCount < 10, // Disable after 10 failures
          }).eq("id", sub.id);
        }
      }

      return new Response(JSON.stringify({ delivered, failed, total: subs.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── DELETE webhook ───
    if (req.method === "DELETE") {
      const webhookId = url.searchParams.get("id");
      if (!webhookId || !/^[0-9a-f-]{36}$/i.test(webhookId)) {
        return new Response(JSON.stringify({ error: "Valid UUID id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error } = await supabase
        .from("webhook_subscriptions")
        .delete()
        .eq("id", webhookId)
        .eq("user_id", userId);

      if (error) throw error;
      return new Response(JSON.stringify({ message: "Webhook deleted" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[webhook-gateway] Error:", e);
    // Never expose stack traces
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
