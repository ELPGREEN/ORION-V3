/**
 * Gemini TTS — Free text-to-speech using Gemini 2.5 Flash TTS (GA)
 * Uses the dedicated TTS model with prompt/text separation for natural speech.
 * Returns WAV audio. PT-BR optimized with voice selection and style prompts.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "gemini-2.5-flash-preview-tts";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Default voice for Orion — Charon is informative male
const DEFAULT_VOICE = "Charon";
const DEFAULT_LANG = "pt-BR";

// Style prompt for natural Portuguese speech
const DEFAULT_PROMPT = "Fale de forma natural, clara e fluida em português brasileiro. Use um tom profissional mas amigável.";

/**
 * Round-robin key rotation across 7 Gemini API keys
 * Caches failed keys (403) for 5 minutes to avoid wasting time
 */
const failedKeyCache: Record<string, number> = {};
const KEY_COOLDOWN_MS = 5 * 60 * 1000; // 5 min cooldown for 403 keys

function getAllGeminiKeys(): string[] {
  const now = Date.now();
  const keys = [
    Deno.env.get("GEMINI_API_KEY"),
  ].filter((k): k is string => {
    if (!k) return false;
    const failedAt = failedKeyCache[k];
    if (failedAt && (now - failedAt) < KEY_COOLDOWN_MS) return false;
    return true;
  });

  if (keys.length === 0) throw new Error("No GEMINI_API_KEY configured (all keys cooling down)");
  return keys;
}

/**
 * Decode base64 PCM data into WAV buffer
 */
function pcmToWav(pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16): Uint8Array {
  const pcmBytes = Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0));
  const dataSize = pcmBytes.length;
  const wav = new Uint8Array(44 + dataSize);
  const view = new DataView(wav.buffer);

  wav.set([0x52, 0x49, 0x46, 0x46], 0);
  view.setUint32(4, 36 + dataSize, true);
  wav.set([0x57, 0x41, 0x56, 0x45], 8);
  wav.set([0x66, 0x6d, 0x74, 0x20], 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true);
  view.setUint16(32, channels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  wav.set([0x64, 0x61, 0x74, 0x61], 36);
  view.setUint32(40, dataSize, true);
  wav.set(pcmBytes, 44);

  return wav;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice, lang, prompt, multispeaker } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanText = text.trim().slice(0, 4000);

    const selectedVoice = voice || DEFAULT_VOICE;
    const selectedLang = lang || DEFAULT_LANG;
    const stylePrompt = prompt || DEFAULT_PROMPT;
    const keys = getAllGeminiKeys();

    console.log(`[Gemini TTS] Synthesizing ${cleanText.length} chars, voice="${selectedVoice}", lang="${selectedLang}", keys=${keys.length}`);

    const buildSingleSpeakerRequest = (options: { includePrompt: boolean; includeLanguage: boolean }) => {
      const body: any = {
        contents: [{
          role: "user",
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

      if (options.includePrompt && stylePrompt?.trim()) {
        body.systemInstruction = {
          role: "system",
          parts: [{ text: stylePrompt.trim().slice(0, 500) }]
        };
      }

      if (options.includeLanguage && selectedLang?.trim()) {
        body.generationConfig.speechConfig.languageCode = selectedLang;
      }

      return body;
    };

    const requestVariants: Array<{ label: string; body: any }> = (multispeaker && Array.isArray(multispeaker) && multispeaker.length > 0)
      ? [{
          label: "multispeaker",
          body: {
            contents: [{
              role: "user",
              parts: [{ text: cleanText }]
            }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                languageCode: selectedLang,
                multiSpeakerVoiceConfig: {
                  speakerVoiceConfigs: multispeaker.map((s: any) => ({
                    speaker: s.speaker,
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: s.voice || DEFAULT_VOICE }
                    }
                  }))
                }
              }
            }
          }
        }]
      : [
          { label: "single/full", body: buildSingleSpeakerRequest({ includePrompt: true, includeLanguage: true }) },
          { label: "single/no-lang", body: buildSingleSpeakerRequest({ includePrompt: true, includeLanguage: false }) },
          { label: "single/plain", body: buildSingleSpeakerRequest({ includePrompt: false, includeLanguage: false }) },
        ];

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Try payload variants with retries — Gemini preview TTS can return transient 500s
    let response: Response | null = null;
    let lastError = "";
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1200;

    for (const apiKey of keys) {
      const url = `${API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

      for (const variant of requestVariants) {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(variant.body),
          });

          if (r.ok) {
            response = r;
            console.log(`[Gemini TTS] Success via ${variant.label} on attempt ${attempt}/${MAX_RETRIES}`);
            break;
          }

          const errText = await r.text();
          lastError = errText.slice(0, 300);
          console.warn(`[Gemini TTS] ${variant.label} attempt ${attempt}/${MAX_RETRIES} failed (${r.status}): ${lastError.slice(0, 120)}`);

          if (r.status === 429) {
            return new Response(
              JSON.stringify({ error: "Rate limited, try again shortly", fallback: true }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          if (r.status === 403) {
            failedKeyCache[apiKey] = Date.now();
            break;
          }

          if (r.status >= 500 && attempt < MAX_RETRIES) {
            await sleep(RETRY_DELAY_MS * attempt);
            continue;
          }

          break;
        }

        if (response || failedKeyCache[apiKey]) break;
      }

      if (response) break;
    }

      throw new Error(`All ${keys.length} keys failed. Last: ${lastError}`);
    }

    const data = await response.json();

    const candidate = data.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData?.mimeType?.startsWith("audio/"));

    if (!audioPart?.inlineData?.data) {
      console.error("[Gemini TTS] No audio in response:", JSON.stringify(data).slice(0, 500));
      throw new Error("No audio data in Gemini response");
    }

    const mimeType = audioPart.inlineData.mimeType;
    const audioBase64 = audioPart.inlineData.data;

    // Gemini TTS returns raw PCM L16 at 24kHz — convert to WAV
    if (mimeType.includes("L16") || mimeType.includes("pcm") || mimeType.includes("raw")) {
      const wav = pcmToWav(audioBase64, 24000);
      console.log(`[Gemini TTS] ✅ WAV ${(wav.length / 1024).toFixed(1)}KB`);
      return new Response(wav.buffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/wav",
          "Content-Length": String(wav.length),
        },
      });
    }

    // Other formats (mp3/wav/ogg) — pass through
    const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    console.log(`[Gemini TTS] ✅ ${mimeType} ${(audioBytes.length / 1024).toFixed(1)}KB`);

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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
