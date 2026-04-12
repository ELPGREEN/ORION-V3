import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
  if (!CLIENT_ID) {
    return new Response(JSON.stringify({ error: "No SPOTIFY_CLIENT_ID" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, has_client_id: !!CLIENT_ID }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
