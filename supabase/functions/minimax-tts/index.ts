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

    const { text, voice_id, model, speed, pitch, volume, format } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.minimax.io/v1/t2a_v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || "speech-2.8-hd",
        text,
        voice_setting: {
          voice_id: voice_id || "Wise_Woman",
          speed: speed ?? 1.0,
          vol: volume ?? 1.0,
          pitch: pitch ?? 0,
        },
        audio_setting: {
          format: format || "mp3",
          sample_rate: 32000,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("MiniMax TTS error:", response.status, err);
      return new Response(JSON.stringify({ error: `MiniMax TTS error: ${response.status}`, details: err }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    if (data.data?.audio) {
      // Return audio as base64
      return new Response(JSON.stringify({
        audio_base64: data.data.audio,
        format: format || "mp3",
        duration: data.data.duration_ms,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("minimax-tts error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
