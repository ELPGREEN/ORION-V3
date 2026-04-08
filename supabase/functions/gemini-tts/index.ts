/**
 * Gemini TTS — text-to-speech using Gemini 2.5 Flash Preview TTS
 * PRIMARY: GCP Console API key (consumes GCP credits €1.126)
 * FALLBACK: AI Studio API keys (free tier)
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

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1200;
const CLIENT_RETRY_AFTER_MS = 30_000;
const TRANSIENT_STATUS_CODES = new Set([408, 500, 502, 503, 504]);

const failedKeyCache: Record<string, number> = {};
const KEY_AUTH_COOLDOWN_MS = 5 * 60 * 1000;
const KEY_RATE_LIMIT_COOLDOWN_MS = 60 * 1000;

type MultiSpeakerVoice = { speaker: string; voice?: string };
type RequestVariant = { label: string; body: Record<string, unknown> };

// ─── Helpers ──────────────────────────────────────────────

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fallbackResponse(error: string, extra: Record<string, unknown> = {}): Response {
  return jsonResponse({ error, fallback: true, ...extra }, 200);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function markKeyCooldown(key: string, ms: number): void { failedKeyCache[key] = Date.now() + ms; }
function isKeyCoolingDown(key: string, now = Date.now()): boolean {
  const u = failedKeyCache[key];
  if (!u) return false;
  if (u <= now) { delete failedKeyCache[key]; return false; }
  return true;
}

// ─── PCM → WAV ───────────────────────────────────────────

function pcmToWav(pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16): Uint8Array {
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

// ─── Request body builders ───────────────────────────────

function buildSingleSpeakerRequest(
  cleanText: string, selectedVoice: string, selectedLang: string,
  stylePrompt: string, options: { includePrompt: boolean; includeLanguage: boolean },
): Record<string, unknown> {
  const speechConfig: Record<string, unknown> = {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
  };
  if (options.includeLanguage && selectedLang.trim()) speechConfig.languageCode = selectedLang;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: cleanText }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig },
  };
  if (options.includePrompt && stylePrompt.trim()) {
    body.systemInstruction = { parts: [{ text: stylePrompt.trim().slice(0, 500) }] };
  }
  return body;
}

function buildMultiSpeakerRequest(
  cleanText: string, selectedLang: string,
  multispeaker: MultiSpeakerVoice[], includeLanguage: boolean,
): Record<string, unknown> {
  const speechConfig: Record<string, unknown> = {
    multiSpeakerVoiceConfig: {
      speakerVoiceConfigs: multispeaker
        .filter((s) => typeof s?.speaker === "string" && s.speaker.trim().length > 0)
        .map((s) => ({
          speaker: s.speaker,
          voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice || DEFAULT_VOICE } },
        })),
    },
  };
  if (includeLanguage && selectedLang.trim()) speechConfig.languageCode = selectedLang;

  return {
    contents: [{ parts: [{ text: cleanText }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig },
  };
}

// ─── Get ordered API keys (GCP first, then AI Studio) ────

function getOrderedKeys(): { key: string; label: string }[] {
  const now = Date.now();
  const result: { key: string; label: string }[] = [];

  // GCP Console key FIRST (consumes credits)
  const gcpKey = Deno.env.get("GEMINI_API_KEY_GCP");
  if (gcpKey && !isKeyCoolingDown(gcpKey, now)) {
    result.push({ key: gcpKey, label: "GCP-credits" });
  }

  // Then free-tier AI Studio keys as fallback
  const freeNames = ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY_5", "GEMINI_API_KEY_6", "GEMINI_API_KEY_7"];
  const freeKeys = freeNames
    .map((n) => ({ key: Deno.env.get(n), name: n }))
    .filter((x): x is { key: string; name: string } => Boolean(x.key) && !isKeyCoolingDown(x.key!, now));

  // Shuffle free keys for load distribution
  for (let i = freeKeys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [freeKeys[i], freeKeys[j]] = [freeKeys[j], freeKeys[i]];
  }

  for (const fk of freeKeys) result.push({ key: fk.key, label: `free:${fk.name}` });
  return result;
}

// ─── Main request loop ───────────────────────────────────

async function requestGeminiAudio(
  variants: RequestVariant[],
): Promise<{ response: Response | null; lastError: string; rateLimited: boolean; usedLabel: string }> {
  const keys = getOrderedKeys();
  if (keys.length === 0) {
    return { response: null, lastError: "No API keys available", rateLimited: false, usedLabel: "" };
  }

  let lastError = "";
  let hadRateLimit = false;

  for (const { key, label } of keys) {
    const url = `${API_BASE}/${MODEL}:generateContent?key=${key}`;
    let skipKey = false;

    for (const variant of variants) {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variant.body),
        });

        if (resp.ok) {
          console.log(`[TTS] ✅ ${label} / ${variant.label} attempt ${attempt}`);
          return { response: resp, lastError: "", rateLimited: false, usedLabel: label };
        }

        const errText = await resp.text();
        lastError = errText.slice(0, 300);
        console.warn(`[TTS] ${label}/${variant.label} attempt ${attempt} (${resp.status}): ${lastError.slice(0, 100)}`);

        if (resp.status === 429) {
          hadRateLimit = true;
          markKeyCooldown(key, KEY_RATE_LIMIT_COOLDOWN_MS);
          skipKey = true;
          break;
        }
        if (resp.status === 403) {
          markKeyCooldown(key, KEY_AUTH_COOLDOWN_MS);
          skipKey = true;
          break;
        }
        if (TRANSIENT_STATUS_CODES.has(resp.status) && attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        break;
      }
      if (skipKey) break;
    }
  }

  return { response: null, lastError, rateLimited: hadRateLimit, usedLabel: "" };
}

// ─── Audio response parser ───────────────────────────────

function parseAudioResponse(data: any): Response | null {
  const audioPart = data?.candidates?.[0]?.content?.parts?.find(
    (p: any) => p?.inlineData?.mimeType?.startsWith("audio/"),
  );
  if (!audioPart?.inlineData?.data) return null;

  const mimeType = audioPart.inlineData.mimeType || "audio/wav";
  const audioBase64 = audioPart.inlineData.data;

  if (mimeType.includes("L16") || mimeType.includes("pcm") || mimeType.includes("raw")) {
    const wav = pcmToWav(audioBase64, 24000);
    console.log(`[TTS] WAV ${(wav.length / 1024).toFixed(1)}KB`);
    return new Response(wav.buffer, {
      headers: { ...corsHeaders, "Content-Type": "audio/wav", "Content-Length": String(wav.length) },
    });
  }

  const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  console.log(`[TTS] ${mimeType} ${(audioBytes.length / 1024).toFixed(1)}KB`);
  return new Response(audioBytes.buffer, {
    headers: { ...corsHeaders, "Content-Type": mimeType, "Content-Length": String(audioBytes.length) },
  });
}

// ─── Main handler ────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text : "";
    const voice = typeof body?.voice === "string" ? body.voice : DEFAULT_VOICE;
    const lang = typeof body?.lang === "string" ? body.lang : DEFAULT_LANG;
    const prompt = typeof body?.prompt === "string" ? body.prompt : DEFAULT_PROMPT;
    const multispeaker = Array.isArray(body?.multispeaker) ? body.multispeaker as MultiSpeakerVoice[] : undefined;

    if (!text.trim()) return jsonResponse({ error: "Text is required" }, 400);

    const cleanText = text.trim().slice(0, 2500);
    const selectedVoice = voice || DEFAULT_VOICE;
    const selectedLang = lang || DEFAULT_LANG;
    const stylePrompt = prompt || DEFAULT_PROMPT;

    const hasGcp = !!Deno.env.get("GEMINI_API_KEY_GCP");
    console.log(`[TTS] ${cleanText.length} chars, voice="${selectedVoice}", GCP=${hasGcp}`);

    // Build variants
    const variants: RequestVariant[] = multispeaker && multispeaker.length > 0
      ? [
          { label: "multi/lang", body: buildMultiSpeakerRequest(cleanText, selectedLang, multispeaker, true) },
          { label: "multi/plain", body: buildMultiSpeakerRequest(cleanText, selectedLang, multispeaker, false) },
        ]
      : [
          { label: "full", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: true, includeLanguage: true }) },
          { label: "no-lang", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: true, includeLanguage: false }) },
          { label: "plain", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: false, includeLanguage: false }) },
        ];

    const { response, lastError, rateLimited, usedLabel } = await requestGeminiAudio(variants);

    if (rateLimited && !response) {
      return fallbackResponse("Rate limited", { rate_limited: true, retry_after_ms: CLIENT_RETRY_AFTER_MS });
    }

    if (!response) {
      return fallbackResponse("TTS unavailable", { details: lastError, retry_after_ms: 10000 });
    }

    const data = await response.json();
    const audioResp = parseAudioResponse(data);
    if (audioResp) return audioResp;

    console.error("[TTS] No audio in response:", JSON.stringify(data).slice(0, 400));
    return fallbackResponse("No audio in response", { retry_after_ms: 10000 });
  } catch (error: any) {
    console.error("[TTS] Error:", error?.message || error);
    return fallbackResponse(error?.message || "Unknown error", { retry_after_ms: CLIENT_RETRY_AFTER_MS });
  }
});
