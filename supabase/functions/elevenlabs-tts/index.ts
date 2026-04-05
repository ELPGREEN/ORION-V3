import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: validate user JWT
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ") && !authHeader.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI")) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.warn("[TTS] Invalid user token, proceeding with anon access");
      }
    }

    const { text, voiceId, userId } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!text || text.length < 1) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate to ElevenLabs limit (5000 chars) with smart sentence break
    const MAX_CHARS = 4800;
    let ttsText = text;
    if (ttsText.length > MAX_CHARS) {
      const cutPoint = ttsText.lastIndexOf(". ", MAX_CHARS);
      ttsText = cutPoint > MAX_CHARS * 0.5 
        ? ttsText.slice(0, cutPoint + 1)
        : ttsText.slice(0, MAX_CHARS);
    }

    // Check for user's custom cloned voice
    let selectedVoice = voiceId || "onwK4e9ZLuTAKqWW03F9";

    if (!voiceId && userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceKey);
        const { data: configData } = await adminClient
          .from("neural_agent_config")
          .select("orion_voice_id")
          .eq("user_id", userId)
          .maybeSingle();
        if (configData?.orion_voice_id) {
          selectedVoice = configData.orion_voice_id;
          console.log(`[TTS] Using cloned voice ${selectedVoice} for user ${userId}`);
        }
      } catch (e) {
        console.warn("[TTS] Failed to check custom voice, using default:", e);
      }
    }

    // Use turbo model for low-latency, natural speech
    // eleven_turbo_v2_5: fastest, high quality, multilingual
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: ttsText,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.35,          // More expressive, less monotone
            similarity_boost: 0.78,   // Keep voice identity
            style: 0.55,              // More stylized/natural inflection
            use_speaker_boost: true,
            speed: 1.12,              // Slightly faster for conversational feel
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`ElevenLabs error ${response.status}: ${errText}`);
      
      // Fallback to non-streaming with multilingual model
      if (response.status !== 401 && response.status !== 403) {
        try {
          const fallbackResp = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}?output_format=mp3_22050_32`,
            {
              method: "POST",
              headers: {
                "xi-api-key": ELEVENLABS_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: ttsText.slice(0, 2000),
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                  stability: 0.4,
                  similarity_boost: 0.75,
                  style: 0.45,
                  use_speaker_boost: true,
                  speed: 1.1,
                },
              }),
            }
          );
          if (fallbackResp.ok) {
            const audioBuffer = await fallbackResp.arrayBuffer();
            return new Response(audioBuffer, {
              headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
            });
          }
        } catch (e) {
          console.warn("[TTS] Fallback model also failed:", e);
        }
      }
      
      return new Response(
        JSON.stringify({ error: "TTS failed", fallback: true, details: errText }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream audio back for fastest time-to-first-audio
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: error.message, fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});