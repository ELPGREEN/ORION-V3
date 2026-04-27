import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { query, force_agent } = await req.json();
    if (!query) return new Response(JSON.stringify({ error: "Missing query" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Route to the appropriate agent edge function
    // agente-construcao removed — redirect to ai-orchestrator
    const agentMap: Record<string, string> = {
      leitura: "agente-leitura",
      construcao: "ai-orchestrator",
      pesquisa: "agente-pesquisa",
    };

    const targetFunction = agentMap[force_agent] || "ai-orchestrator";

    const { data, error } = await supabase.functions.invoke(targetFunction, {
      body: { query, source: "smart-agent-route" },
    });

    if (error) {
      console.error(`[smart-agent-route] Error invoking ${targetFunction}:`, error);
      return new Response(JSON.stringify({ error: error.message, message: "Falha ao processar com o agente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[smart-agent-route] Unhandled error:", err);
    return new Response(JSON.stringify({ error: (err as any)?.message ?? String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
