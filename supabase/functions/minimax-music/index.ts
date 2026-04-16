import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const MINIMAX_API_KEY = Deno.env.get("MINIMAX_API_KEY");
    if (!MINIMAX_API_KEY) throw new Error("MINIMAX_API_KEY not configured");

    const { action, prompt, task_id, file_id, refer_voice, refer_instrumental } = await req.json();

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MINIMAX_API_KEY}`,
    };

    if (action === "create") {
      if (!prompt) {
        return new Response(JSON.stringify({ error: "prompt required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body: Record<string, unknown> = {
        model: "music-01",
        prompt,
      };

      if (refer_voice) body.refer_voice = refer_voice;
      if (refer_instrumental) body.refer_instrumental = refer_instrumental;

      const response = await fetch("https://api.minimax.io/v1/music_generation", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("MiniMax music error:", response.status, err);
        return new Response(JSON.stringify({ error: `MiniMax error: ${response.status}`, details: err }), {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      if (!task_id) {
        return new Response(JSON.stringify({ error: "task_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await fetch(`https://api.minimax.io/v1/query/music_generation?task_id=${task_id}`, {
        headers,
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "download") {
      if (!file_id) {
        return new Response(JSON.stringify({ error: "file_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await fetch(`https://api.minimax.io/v1/files/retrieve?file_id=${file_id}`, {
        headers,
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action must be: create, status, or download" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("minimax-music error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
