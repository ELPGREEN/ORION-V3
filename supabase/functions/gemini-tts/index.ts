/**
 * Gemini TTS — text-to-speech using Gemini 2.5 Flash Preview TTS
 * Uses a minimal request shape with fallback variants because the preview API
 * can return intermittent INTERNAL 500 errors for some payload combinations.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "gemini-2.5-flash-preview-tts";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_VOICE = "Algieba";
const DEFAULT_LANG = "pt-BR";
const DEFAULT_PROMPT = "Fale de forma natural, clara e fluida em português brasileiro. Use um tom profissional mas amigável, com ritmo conversacional.";

const failedKeyCache: Record<string, number> = {};
const KEY_AUTH_COOLDOWN_MS = 5 * 60 * 1000;
const KEY_RATE_LIMIT_COOLDOWN_MS = 60 * 1000;
const CLIENT_RETRY_AFTER_MS = 30 * 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1200;
const TRANSIENT_STATUS_CODES = new Set([408, 500, 502, 503, 504]);

type MultiSpeakerVoice = {
  speaker: string;
  voice?: string;
};

type RequestVariant = {
  label: string;
  body: Record<string, unknown>;
};

function markKeyCooldown(apiKey: string, cooldownMs: number): void {
  failedKeyCache[apiKey] = Date.now() + cooldownMs;
}

function isKeyCoolingDown(apiKey: string, now = Date.now()): boolean {
  const cooldownUntil = failedKeyCache[apiKey];
  if (!cooldownUntil) return false;
  if (cooldownUntil <= now) {
    delete failedKeyCache[apiKey];
    return false;
  }
  return true;
}

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fallbackResponse(error: string, extra: Record<string, unknown> = {}): Response {
  return jsonResponse({ error, fallback: true, ...extra }, 200);
}

function getAllGeminiKeys(): string[] {
  const now = Date.now();
  const keyNames = [
    "GEMINI_API_KEY",
    "GEMINI_API_KEY_2",
    "GEMINI_API_KEY_3",
    "GEMINI_API_KEY_4",
    "GEMINI_API_KEY_5",
    "GEMINI_API_KEY_6",
    "GEMINI_API_KEY_7",
  ];

  const keys = keyNames
    .map((name) => Deno.env.get(name))
    .filter((key): key is string => Boolean(key) && !isKeyCoolingDown(key, now));

  if (keys.length === 0) {
    throw new Error("No GEMINI_API_KEY configured or all keys are temporarily unavailable");
  }

  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }

  return keys;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pcmToWav(
  pcmBase64: string,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
): Uint8Array {
  const pcmBytes = Uint8Array.from(atob(pcmBase64), (c) => c.charCodeAt(0));
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

function buildSingleSpeakerRequest(
  cleanText: string,
  selectedVoice: string,
  selectedLang: string,
  stylePrompt: string,
  options: { includePrompt: boolean; includeLanguage: boolean },
): Record<string, unknown> {
  const speechConfig: Record<string, unknown> = {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: selectedVoice,
      },
    },
  };

  if (options.includeLanguage && selectedLang.trim()) {
    speechConfig.languageCode = selectedLang;
  }

  const body: Record<string, unknown> = {
    contents: [{
      parts: [{ text: cleanText }],
    }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig,
    },
  };

  if (options.includePrompt && stylePrompt.trim()) {
    body.systemInstruction = {
      parts: [{ text: stylePrompt.trim().slice(0, 500) }],
    };
  }

  return body;
}

function buildMultiSpeakerRequest(
  cleanText: string,
  selectedLang: string,
  multispeaker: MultiSpeakerVoice[],
  includeLanguage: boolean,
): Record<string, unknown> {
  const speechConfig: Record<string, unknown> = {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: multispeaker
        .filter((speaker) => typeof speaker?.speaker === "string" && speaker.speaker.trim().length > 0)
        .map((speaker) => ({
          speaker: speaker.speaker,
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: speaker.voice || DEFAULT_VOICE,
            },
          },
        })),
    },
  };

  if (includeLanguage && selectedLang.trim()) {
    speechConfig.languageCode = selectedLang;
  }

  return {
    contents: [{
      parts: [{ text: cleanText }],
    }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig,
    },
  };
}

async function requestGeminiAudio(
  keys: string[],
  requestVariants: RequestVariant[],
): Promise<{ response: Response | null; lastError: string; rateLimited: boolean }> {
  let lastError = "";
  let hadRateLimit = false;

  for (const apiKey of keys) {
    const url = `${API_BASE}/${MODEL}:generateContent?key=${apiKey}`;
    let skipRemainingVariantsForKey = false;

    for (const variant of requestVariants) {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variant.body),
        });

        if (response.ok) {
          console.log(`[Gemini TTS] Success via ${variant.label} on attempt ${attempt}/${MAX_RETRIES}`);
          return { response, lastError, rateLimited: false };
        }

        const errText = await response.text();
        lastError = errText.slice(0, 300);
        console.warn(
          `[Gemini TTS] ${variant.label} attempt ${attempt}/${MAX_RETRIES} failed (${response.status}): ${lastError.slice(0, 120)}`,
        );

        if (response.status === 429) {
          hadRateLimit = true;
          markKeyCooldown(apiKey, KEY_RATE_LIMIT_COOLDOWN_MS);
          skipRemainingVariantsForKey = true;
          break;
        }

        if (response.status === 403) {
          markKeyCooldown(apiKey, KEY_AUTH_COOLDOWN_MS);
          skipRemainingVariantsForKey = true;
          break;
        }

        if (TRANSIENT_STATUS_CODES.has(response.status) && attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }

        break;
      }

      if (skipRemainingVariantsForKey || isKeyCoolingDown(apiKey)) {
        break;
      }
    }
  }

  return { response: null, lastError, rateLimited: hadRateLimit };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text : "";
    const voice = typeof body?.voice === "string" ? body.voice : DEFAULT_VOICE;
    const lang = typeof body?.lang === "string" ? body.lang : DEFAULT_LANG;
    const prompt = typeof body?.prompt === "string" ? body.prompt : DEFAULT_PROMPT;
    const multispeaker = Array.isArray(body?.multispeaker) ? body.multispeaker as MultiSpeakerVoice[] : undefined;

    if (!text.trim()) {
      return jsonResponse({ error: "Text is required" }, 400);
    }

    const cleanText = text.trim().slice(0, 2500);
    const selectedVoice = voice || DEFAULT_VOICE;
    const selectedLang = lang || DEFAULT_LANG;
    const stylePrompt = prompt || DEFAULT_PROMPT;
    const keys = getAllGeminiKeys();

    console.log(
      `[Gemini TTS] Synthesizing ${cleanText.length} chars, voice="${selectedVoice}", lang="${selectedLang}", keys=${keys.length}`,
    );

    const requestVariants: RequestVariant[] = multispeaker && multispeaker.length > 0
      ? [
          {
            label: "multispeaker/with-lang",
            body: buildMultiSpeakerRequest(cleanText, selectedLang, multispeaker, true),
          },
          {
            label: "multispeaker/no-lang",
            body: buildMultiSpeakerRequest(cleanText, selectedLang, multispeaker, false),
          },
        ]
      : [
          {
            label: "single/full",
            body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, {
              includePrompt: true,
              includeLanguage: true,
            }),
          },
          {
            label: "single/no-lang",
            body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, {
              includePrompt: true,
              includeLanguage: false,
            }),
          },
          {
            label: "single/plain",
            body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, {
              includePrompt: false,
              includeLanguage: false,
            }),
          },
        ];

    const { response, lastError, rateLimited } = await requestGeminiAudio(keys, requestVariants);

    if (rateLimited) {
      return fallbackResponse("Rate limited, try again shortly", {
        rate_limited: true,
        retry_after_ms: CLIENT_RETRY_AFTER_MS,
      });
    }

    if (!response) {
      return fallbackResponse("Gemini TTS unavailable", {
        details: lastError || undefined,
        retry_after_ms: 10000,
      });
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((part: any) => part?.inlineData?.mimeType?.startsWith("audio/"));

    if (!audioPart?.inlineData?.data) {
      console.error("[Gemini TTS] No audio in response:", JSON.stringify(data).slice(0, 600));
      return fallbackResponse("No audio data in Gemini response", { retry_after_ms: 10000 });
    }

    const mimeType = audioPart.inlineData.mimeType || "audio/wav";
    const audioBase64 = audioPart.inlineData.data;

    if (mimeType.includes("L16") || mimeType.includes("pcm") || mimeType.includes("raw")) {
      const wav = pcmToWav(audioBase64, 24000);
      console.log(`[Gemini TTS] WAV ${(wav.length / 1024).toFixed(1)}KB`);
      return new Response(wav.buffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/wav",
          "Content-Length": String(wav.length),
        },
      });
    }

    const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
    console.log(`[Gemini TTS] ${mimeType} ${(audioBytes.length / 1024).toFixed(1)}KB`);

    return new Response(audioBytes.buffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": mimeType,
        "Content-Length": String(audioBytes.length),
      },
    });
  } catch (error: any) {
    console.error("[Gemini TTS] Error:", error?.message || error);
    return fallbackResponse(error?.message || "Unknown error", {
      retry_after_ms: CLIENT_RETRY_AFTER_MS,
    });
  }
});