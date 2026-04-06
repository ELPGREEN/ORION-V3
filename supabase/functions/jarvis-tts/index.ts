/**
 * Jarvis TTS Edge Function
 * Proxies to HuggingFace Space running Piper with Jarvis voice model.
 * Model: jgkawell/jarvis (en_GB, medium quality, Piper ONNX)
 * 
 * Endpoints:
 *   POST /speak  — { text, speed?, speaker_id? } → audio/wav
 *   POST /health — health check
 *
 * Fallback cascade:
 *   1. HuggingFace Space (ekc4/jarvis-tts) — primary
 *   2. Gradio Client API — secondary
 *   3. Direct HF Inference API — tertiary
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// HuggingFace Space URL (FastAPI backend with Piper)
const HF_SPACE_URL = "https://ekc4-jarvis-tts.hf.space";
// Gradio Client endpoint (alternative)
const HF_GRADIO_API = "https://ekc4-jarvis-tts.hf.space/api/predict";

// Max text length (Piper handles well up to ~500 chars)
const MAX_TEXT_LENGTH = 500;

/**
 * Primary: Call the HF Space FastAPI /speak endpoint directly
 */
async function speakViaSpace(text: string): Promise<ArrayBuffer> {
  const res = await fetch(`${HF_SPACE_URL}/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HF Space /speak failed [${res.status}]: ${errText}`);
  }

  return await res.arrayBuffer();
}

/**
 * Secondary: Use Gradio predict API
 */
async function speakViaGradio(text: string): Promise<ArrayBuffer> {
  const res = await fetch(HF_GRADIO_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [text],
      fn_index: 0,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gradio API failed [${res.status}]: ${errText}`);
  }

  const result = await res.json();
  // Gradio returns file reference, need to fetch it
  if (result?.data?.[0]?.url) {
    const audioRes = await fetch(result.data[0].url);
    if (!audioRes.ok) throw new Error(`Gradio audio fetch failed [${audioRes.status}]`);
    return await audioRes.arrayBuffer();
  }

  throw new Error("Gradio returned unexpected format");
}

/**
 * Tertiary: Use HF Inference API with the Piper model directly
 */
async function speakViaInferenceAPI(text: string, hfToken: string): Promise<ArrayBuffer> {
  const res = await fetch(
    "https://api-inference.huggingface.co/models/ekc4/jarvis-tts",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HF Inference API failed [${res.status}]: ${errText}`);
  }

  return await res.arrayBuffer();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action || "speak";

    // ── Health Check ──
    if (action === "health") {
      try {
        const healthRes = await fetch(`${HF_SPACE_URL}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        if (healthRes.ok) {
          const data = await healthRes.json();
          return new Response(
            JSON.stringify({
              success: true,
              status: "online",
              voice: data.voice || "jarvis-medium",
              sampleRate: data.sample_rate || 22050,
              model: "jgkawell/jarvis",
              space: "ekc4/jarvis-tts",
              timestamp: new Date().toISOString(),
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        await healthRes.text(); // consume
      } catch {
        // Space might be sleeping
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: "sleeping",
          message: "HF Space may be cold-starting. First request wakes it up (~30s).",
          model: "jgkawell/jarvis",
          space: "ekc4/jarvis-tts",
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Speak ──
    const text = (body.text || "").trim();
    if (!text) {
      return new Response(
        JSON.stringify({ error: "Text is required", field: "text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate with smart sentence break
    let ttsText = text;
    if (ttsText.length > MAX_TEXT_LENGTH) {
      const cutPoint = ttsText.lastIndexOf(". ", MAX_TEXT_LENGTH);
      ttsText = cutPoint > MAX_TEXT_LENGTH * 0.5
        ? ttsText.slice(0, cutPoint + 1)
        : ttsText.slice(0, MAX_TEXT_LENGTH);
    }

    console.log(`[JARVIS-TTS] Synthesizing ${ttsText.length} chars: "${ttsText.slice(0, 60)}..."`);
    const t0 = Date.now();

    // Cascade: Space → Gradio → Inference API
    let audioBuffer: ArrayBuffer | null = null;
    let usedMethod = "";
    const errors: string[] = [];

    // 1. Primary: HF Space /speak
    try {
      audioBuffer = await speakViaSpace(ttsText);
      usedMethod = "hf_space";
    } catch (e) {
      errors.push(`Space: ${(e as Error).message}`);
      console.warn(`[JARVIS-TTS] Space failed:`, (e as Error).message);
    }

    // 2. Secondary: Gradio API
    if (!audioBuffer) {
      try {
        audioBuffer = await speakViaGradio(ttsText);
        usedMethod = "gradio_api";
      } catch (e) {
        errors.push(`Gradio: ${(e as Error).message}`);
        console.warn(`[JARVIS-TTS] Gradio failed:`, (e as Error).message);
      }
    }

    // 3. Tertiary: HF Inference API
    if (!audioBuffer) {
      const hfToken = Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGINGFACE_API_KEY");
      if (hfToken) {
        try {
          audioBuffer = await speakViaInferenceAPI(ttsText, hfToken);
          usedMethod = "inference_api";
        } catch (e) {
          errors.push(`InferenceAPI: ${(e as Error).message}`);
          console.warn(`[JARVIS-TTS] Inference API failed:`, (e as Error).message);
        }
      } else {
        errors.push("No HF_TOKEN for Inference API fallback");
      }
    }

    if (!audioBuffer || audioBuffer.byteLength < 44) {
      return new Response(
        JSON.stringify({
          error: "All TTS methods failed",
          details: errors,
          hint: "The HuggingFace Space may be sleeping. Try again in ~30s.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const latencyMs = Date.now() - t0;
    console.log(`[JARVIS-TTS] ✅ Generated ${audioBuffer.byteLength} bytes via ${usedMethod} in ${latencyMs}ms`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/wav",
        "X-TTS-Method": usedMethod,
        "X-TTS-Latency-Ms": latencyMs.toString(),
        "X-TTS-Voice": "jarvis-medium",
        "X-TTS-Model": "jgkawell/jarvis",
      },
    });
  } catch (error) {
    console.error("[JARVIS-TTS] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
