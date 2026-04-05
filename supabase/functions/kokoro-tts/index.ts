const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEEPINFRA_URL = "https://api.deepinfra.com/v1/inference/hexgrad/Kokoro-82M";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const DEEPINFRA_TOKEN = Deno.env.get("DEEPINFRA_TOKEN");
    if (!DEEPINFRA_TOKEN) {
      return new Response(JSON.stringify({ error: "DEEPINFRA_TOKEN not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { text, voice, speed } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 1) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const cleanText = text.slice(0, 5000);
    const voicePreset = voice || "bm_george";
    const ttsSpeed = Math.max(0.5, Math.min(2.0, speed || 1.0));

    console.log(`[Kokoro] text="${cleanText.slice(0, 60)}..." voice=${voicePreset} speed=${ttsSpeed}`);

    const response = await fetch(DEEPINFRA_URL, {
      method: "POST",
      headers: {
        "Authorization": `bearer ${DEEPINFRA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: cleanText,
        output_format: "mp3",
        preset: voicePreset,
        speed: ttsSpeed,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Kokoro] DeepInfra error ${response.status}: ${errText}`);
      return new Response(JSON.stringify({ error: `DeepInfra error: ${response.status}`, fallback: true }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const contentType = response.headers.get("content-type") || "";

    // If response is direct audio binary
    if (contentType.includes("audio/")) {
      const audioData = await response.arrayBuffer();
      return new Response(audioData, {
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // JSON response with base64 audio
    const data = await response.json();
    if (data.audio) {
      const binaryString = atob(data.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Response(bytes, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mp3",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    return new Response(JSON.stringify({ error: "No audio returned", fallback: true }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[Kokoro] Error:", error);
    return new Response(JSON.stringify({ error: error.message, fallback: true }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
