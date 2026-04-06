/**
 * Gemini TTS — Free text-to-speech using Gemini 2.5 Flash Preview TTS
 * Uses Google's generative AI TTS model with 7-key rotation.
 * Returns WAV audio. PT-BR optimized with voice selection support.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "gemini-2.5-flash-preview-tts";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Available Gemini TTS voices
const VOICES = [
  "Zephyr",   // Bright
  "Puck",     // Upbeat  
  "Charon",   // Informative
  "Kore",     // Firm
  "Fenrir",   // Excitable
  "Leda",     // Youthful
  "Orus",     // Firm
  "Aoede",    // Breezy
];

// Default voice for Orion
const DEFAULT_VOICE = "Charon";

/**
 * Round-robin key rotation across 7 Gemini API keys
 */
function getGeminiKey(): string {
  const keys = [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
    Deno.env.get("GEMINI_API_KEY_4"),
    Deno.env.get("GEMINI_API_KEY_5"),
    Deno.env.get("GEMINI_API_KEY_6"),
    Deno.env.get("GEMINI_API_KEY_7"),
  ].filter(Boolean) as string[];

  if (keys.length === 0) throw new Error("No GEMINI_API_KEY configured");

  // Simple round-robin based on current second
  const idx = Math.floor(Date.now() / 1000) % keys.length;
  return keys[idx];
}

/**
 * Decode base64 PCM data from Gemini response into WAV buffer
 */
function pcmToWav(pcmBase64: string, sampleRate: number = 24000, channels: number = 1, bitsPerSample: number = 16): Uint8Array {
  const pcmBytes = Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0));
  const dataSize = pcmBytes.length;
  const headerSize = 44;
  const wav = new Uint8Array(headerSize + dataSize);
  const view = new DataView(wav.buffer);

  // RIFF header
  wav.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  wav.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // fmt chunk
  wav.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true);
  view.setUint16(32, channels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  wav.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, dataSize, true);
  wav.set(pcmBytes, 44);

  return wav;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice, lang, multispeaker } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanText = text.trim().slice(0, 5000);
    const selectedVoice = voice || DEFAULT_VOICE;
    const apiKey = getGeminiKey();

    console.log(`[Gemini TTS] Synthesizing ${cleanText.length} chars with voice "${selectedVoice}"`);

    // Build request body
    const requestBody: any = {
      contents: [{
        parts: [{ text: cleanText }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedVoice
            }
          }
        }
      }
    };

    // Multi-speaker support
    if (multispeaker && Array.isArray(multispeaker)) {
      // For multi-speaker, text should use markup like:
      // [Speaker1] Hello! [Speaker2] Hi there!
      requestBody.generationConfig.speechConfig = {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: multispeaker.map((s: any) => ({
            speaker: s.speaker,
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: s.voice || DEFAULT_VOICE }
            }
          }))
        }
      };
    }

    const url = `${API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Gemini TTS] API error ${response.status}:`, errText);

      // If rate limited, try with a different key
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, try again shortly", fallback: true }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Gemini TTS failed: ${response.status}`);
    }

    const data = await response.json();

    // Extract audio from response
    const candidate = data.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith("audio/"));

    if (!audioPart?.inlineData?.data) {
      console.error("[Gemini TTS] No audio in response:", JSON.stringify(data).slice(0, 500));
      throw new Error("No audio data in Gemini response");
    }

    const mimeType = audioPart.inlineData.mimeType;
    const audioBase64 = audioPart.inlineData.data;

    // Gemini returns raw PCM L16 at 24kHz — convert to WAV
    if (mimeType.includes("L16") || mimeType.includes("pcm")) {
      const wav = pcmToWav(audioBase64, 24000);
      console.log(`[Gemini TTS] ✅ Generated WAV ${(wav.length / 1024).toFixed(1)}KB`);
      return new Response(wav.buffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/wav",
          "Content-Length": String(wav.length),
        },
      });
    }

    // If it returns another format (mp3/wav), send raw
    const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    console.log(`[Gemini TTS] ✅ Generated ${mimeType} ${(audioBytes.length / 1024).toFixed(1)}KB`);

    return new Response(audioBytes.buffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": mimeType || "audio/wav",
        "Content-Length": String(audioBytes.length),
      },
    });
  } catch (error: any) {
    console.error("[Gemini TTS] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
