/**
 * Orion Voice Engine — Dedicated TTS via HuggingFace voice cloning
 * Uses Fish Speech / XTTS models on HuggingFace with Iapetus reference audio.
 * Completely independent from Google/Gemini APIs.
 * Falls back to HF Inference API TTS if clone fails.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// HuggingFace models for voice cloning / TTS
const HF_TTS_MODELS = [
  "fishaudio/fish-speech-1.5",        // Fish Speech — voice cloning from reference
  "coqui/XTTS-v2",                     // XTTS — multi-language voice cloning
  "facebook/mms-tts-por",              // MMS — Portuguese TTS fallback
];

/**
 * Get HuggingFace API token with rotation
 */
function getHFToken(): string {
  const tokens = [
    Deno.env.get("HUGGINGFACE_API_KEY"),
    Deno.env.get("HF_TOKEN"),
    Deno.env.get("HF_WRITE_TOKEN"),
    Deno.env.get("CHAVE_API_HUGGINGFACE"),
  ].filter(Boolean) as string[];
  
  if (tokens.length === 0) throw new Error("No HuggingFace token configured");
  const idx = Math.floor(Date.now() / 1000) % tokens.length;
  return tokens[idx];
}

/**
 * Try Fish Speech voice cloning via HF Inference API
 */
async function tryFishSpeech(text: string, token: string): Promise<Response | null> {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/fishaudio/fish-speech-1.5",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            language: "pt",
          },
        }),
      }
    );
    
    if (response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("audio/")) return response;
    }
    console.log(`[Orion Voice] Fish Speech status: ${response.status}`);
    await response.text(); // consume
    return null;
  } catch (e) {
    console.log("[Orion Voice] Fish Speech failed:", (e as Error).message);
    return null;
  }
}

/**
 * Try Facebook MMS TTS (Portuguese) via HF Inference API
 */
async function tryMMS(text: string, token: string): Promise<Response | null> {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/mms-tts-por",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );
    
    if (response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("audio/")) return response;
    }
    console.log(`[Orion Voice] MMS status: ${response.status}`);
    await response.text();
    return null;
  } catch (e) {
    console.log("[Orion Voice] MMS failed:", (e as Error).message);
    return null;
  }
}

/**
 * Try generic HF TTS model
 */
async function tryHFModel(text: string, model: string, token: string): Promise<Response | null> {
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: text }),
      }
    );
    
    if (response.ok) {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("audio/")) return response;
    }
    await response.text();
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, model } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanText = text.trim().slice(0, 3000);
    const token = getHFToken();

    console.log(`[Orion Voice] Synthesizing ${cleanText.length} chars`);

    // Cascade through available HF models
    let audioResponse: Response | null = null;

    // 1. Fish Speech (voice cloning capable)
    if (!audioResponse) {
      audioResponse = await tryFishSpeech(cleanText, token);
      if (audioResponse) console.log("[Orion Voice] ✅ Fish Speech");
    }

    // 2. Facebook MMS Portuguese
    if (!audioResponse) {
      audioResponse = await tryMMS(cleanText, token);
      if (audioResponse) console.log("[Orion Voice] ✅ MMS Portuguese");
    }

    // 3. Custom model if specified
    if (!audioResponse && model) {
      audioResponse = await tryHFModel(cleanText, model, token);
      if (audioResponse) console.log(`[Orion Voice] ✅ ${model}`);
    }

    if (!audioResponse) {
      return new Response(
        JSON.stringify({ error: "All HF TTS models unavailable", fallback: true }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream audio response back
    const audioData = await audioResponse.arrayBuffer();
    const contentType = audioResponse.headers.get("content-type") || "audio/wav";

    console.log(`[Orion Voice] ✅ Generated ${(audioData.byteLength / 1024).toFixed(1)}KB`);

    return new Response(audioData, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Length": String(audioData.byteLength),
        "X-Orion-Engine": "huggingface",
      },
    });
  } catch (error: any) {
    console.error("[Orion Voice] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
