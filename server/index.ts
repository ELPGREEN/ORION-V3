import { serve } from "bun";

const PORT = process.env.PORT || 3000;

console.log(`[Orion-Render] Starting server on port ${PORT}...`);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

serve({
  port: PORT,
  async fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        status: "ok",
        platform: "Render",
        runtime: "Bun",
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Direct Orchestration (Offloading from Supabase)
    if (url.pathname === "/api/orchestrate") {
      try {
        const { action, ...payload } = await req.json();
        console.log(`[Orion-Render] Direct Orchestration: ${action}`);

        // Handle simple actions directly to save Supabase invocations
        if (action === "ping") {
          return new Response(JSON.stringify({ data: { message: "pong" }, error: null }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Fallback to proxying the rest to Supabase ai-orchestrator for now
        return await proxyToSupabase("ai-orchestrator", { action, ...payload }, req);
      } catch (err) {
        return new Response(JSON.stringify({ error: "Orchestration failed" }), { status: 500, headers: corsHeaders });
      }
    }

    if (url.pathname.startsWith("/api/proxy/")) {
      const functionName = url.pathname.replace("/api/proxy/", "");
      try {
        const body = await req.json();
        return await proxyToSupabase(functionName, body, req);
      } catch (err) {
        return new Response(JSON.stringify({ error: "Proxy failed" }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ message: "ORION V3 Backend Ready" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  },
});

async function proxyToSupabase(functionName: string, body: any, req: Request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || req.headers.get("apikey");

  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: "SUPABASE_URL not configured" }), { status: 500, headers: corsHeaders });
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
      "x-client-info": req.headers.get("x-client-info") || "orion-render-proxy",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
