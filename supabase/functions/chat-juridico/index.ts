import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  try {
    const body = await req.json();
    const { messages, stream } = body;
    
    // Redirect to ai-orchestrator for unified management
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-orchestrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("Authorization") || "",
        apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
      },
      body: JSON.stringify({
        messages,
        stream,
        useCase: "chat",
        jurisdiction: "brasil"
      }),
    });
    
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": response.headers.get("content-type") || "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
