/**
 * Fish Speech Voice Clone — Zero-shot voice cloning via HuggingFace Spaces
 * Uses Fish Speech v1.5 for high-quality voice cloning from reference audio.
 * 100% gratuito — roda em HF Spaces com ZeroGPU.
 * 
 * Flow:
 * 1. Receive reference audio (from Supabase Storage path or direct upload)
 * 2. Receive text to synthesize
 * 3. Call Fish Speech HF Space with reference audio + text
 * 4. Return cloned voice audio
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Fish Speech HF Spaces (tried in order)
const FISH_SPEECH_SPACES = [
  "fishaudio/fish-speech-1",
  "pc206044/fishaudio-fish-speech-1.5",
  "Tonic/fish-speech",
];

/**
 * Try calling a Fish Speech HF Space via Gradio HTTP API
 */
async function callFishSpeechSpace(
  spaceUrl: string,
  referenceAudio: Uint8Array,
  referenceText: string,
  synthesisText: string,
  hfToken: string,
): Promise<Uint8Array | null> {
  const baseUrl = `https://${spaceUrl.replace("/", "-")}.hf.space`;
  
  // Step 1: Upload reference audio as a file
  const formData = new FormData();
  const audioBlob = new Blob([referenceAudio], { type: "audio/wav" });
  formData.append("files", audioBlob, "reference.wav");

  const uploadResp = await fetch(`${baseUrl}/upload`, {
    method: "POST",
    headers: hfToken ? { Authorization: `Bearer ${hfToken}` } : {},
    body: formData,
  });

  if (!uploadResp.ok) {
    console.error(`[Fish Speech] Upload to ${spaceUrl} failed: ${uploadResp.status}`);
    return null;
  }

  const uploadData = await uploadResp.json();
  const filePath = Array.isArray(uploadData) ? uploadData[0] : uploadData;

  // Step 2: Call the TTS endpoint with reference
  const predictResp = await fetch(`${baseUrl}/api/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}),
    },
    body: JSON.stringify({
      data: [
        synthesisText,           // Text to synthesize
        true,                    // Enable reference audio
        filePath,                // Reference audio file
        referenceText,           // Reference transcript  
        0.7,                     // Temperature
        64,                      // Top-K
        1.2,                     // Repetition penalty
      ],
      fn_index: 0,
    }),
  });

  if (!predictResp.ok) {
    console.error(`[Fish Speech] Predict on ${spaceUrl} failed: ${predictResp.status}`);
    return null;
  }

  const result = await predictResp.json();
  
  // Extract audio from result
  const audioPath = result?.data?.[0]?.url || result?.data?.[0]?.path || result?.data?.[0];
  if (!audioPath) {
    console.error("[Fish Speech] No audio in response");
    return null;
  }

  // Download the generated audio
  const audioUrl = typeof audioPath === "string" && audioPath.startsWith("http") 
    ? audioPath 
    : `${baseUrl}/file=${audioPath}`;
    
  const audioResp = await fetch(audioUrl, {
    headers: hfToken ? { Authorization: `Bearer ${hfToken}` } : {},
  });
  
  if (!audioResp.ok) return null;
  
  const audioBuffer = await audioResp.arrayBuffer();
  return new Uint8Array(audioBuffer);
}

/**
 * Alternative: Use Fish Audio's free API (if available)
 * POST https://api.fish.audio/v1/tts with inline reference
 */
async function callFishAudioAPI(
  referenceAudio: Uint8Array,
  referenceText: string,
  synthesisText: string,
): Promise<Uint8Array | null> {
  try {
    // Build multipart request with inline reference
    const boundary = "----FishAudioBoundary" + Date.now();
    
    const requestBody = JSON.stringify({
      text: synthesisText,
      references: [{
        audio: btoa(String.fromCharCode(...referenceAudio.slice(0, 500000))), // limit size
        text: referenceText,
      }],
      format: "wav",
      latency: "balanced",
    });

    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    if (response.status === 401 || response.status === 403) {
      // No API key / not free — skip
      return null;
    }
    
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, reference_storage_path, reference_text, action } = await req.json();

    // ─── Action: List available voices ───
    if (action === "list_voices") {
      return new Response(
        JSON.stringify({
          voices: [
            { id: "clone", label: "Sua Voz Clonada", type: "clone" },
            { id: "Charon", label: "Charon (Gemini)", type: "gemini" },
            { id: "Puck", label: "Puck (Gemini)", type: "gemini" },
          ],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Validate inputs for TTS ───
    if (!text?.trim()) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!reference_storage_path) {
      return new Response(
        JSON.stringify({ error: "Reference audio path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("URL_SUPABAS")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const hfToken = Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGINGFACE_API_KEY") || "";

    const supabase = createClient(supabaseUrl, serviceKey);

    // ─── Download reference audio from Storage ───
    console.log(`[Fish Clone] Downloading reference: ${reference_storage_path}`);
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("orion-voice-samples")
      .download(reference_storage_path);

    if (downloadError || !audioData) {
      console.error("[Fish Clone] Download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download reference audio", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const referenceBytes = new Uint8Array(await audioData.arrayBuffer());
    const refText = reference_text || "Olá, esta é minha voz natural falando normalmente.";
    const cleanText = text.trim().slice(0, 3000);

    console.log(`[Fish Clone] Synthesizing ${cleanText.length} chars with cloned voice`);

    // ─── Try Fish Speech HF Spaces ───
    let synthesizedAudio: Uint8Array | null = null;

    for (const space of FISH_SPEECH_SPACES) {
      if (synthesizedAudio) break;
      try {
        console.log(`[Fish Clone] Trying Space: ${space}`);
        synthesizedAudio = await callFishSpeechSpace(
          space, referenceBytes, refText, cleanText, hfToken
        );
        if (synthesizedAudio) {
          console.log(`[Fish Clone] ✅ Success via ${space}`);
        }
      } catch (err) {
        console.warn(`[Fish Clone] Space ${space} failed:`, (err as Error).message);
      }
    }

    // ─── Fallback: Fish Audio API ───
    if (!synthesizedAudio) {
      try {
        console.log("[Fish Clone] Trying Fish Audio API...");
        synthesizedAudio = await callFishAudioAPI(referenceBytes, refText, cleanText);
        if (synthesizedAudio) {
          console.log("[Fish Clone] ✅ Success via Fish Audio API");
        }
      } catch (err) {
        console.warn("[Fish Clone] Fish Audio API failed:", (err as Error).message);
      }
    }

    // ─── If all fail, return fallback signal ───
    if (!synthesizedAudio || synthesizedAudio.length < 100) {
      console.warn("[Fish Clone] All Fish Speech sources failed, signaling fallback");
      return new Response(
        JSON.stringify({ error: "Voice cloning temporarily unavailable", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(synthesizedAudio.buffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/wav",
        "Content-Length": String(synthesizedAudio.length),
      },
    });
  } catch (error: any) {
    console.error("[Fish Clone] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
