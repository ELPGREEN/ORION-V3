/**
 * Gemini TTS — text-to-speech using Gemini 2.5 Flash Preview TTS
 * PRIMARY: Vertex AI endpoint (uses GCP credits via service account JWT)
 * FALLBACK: AI Studio API keys (free tier)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "gemini-2.5-flash-preview-tts";
const VERTEX_LOCATION = "us-central1";
const AI_STUDIO_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

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

// Vertex AI token cache
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

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

// ─── JWT for Vertex AI ───────────────────────────────────

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createJWT(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payloadB64 = base64url(enc.encode(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })));
  const unsigned = `${headerB64}.${payloadB64}`;

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"],
  );

  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, enc.encode(unsigned)));
  return `${unsigned}.${base64url(sig)}`;
}

async function getVertexToken(sa: { client_email: string; private_key: string }): Promise<string | null> {
  try {
    if (cachedAccessToken && Date.now() < tokenExpiresAt - 60_000) return cachedAccessToken;

    const jwt = await createJWT(sa);
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!resp.ok) {
      console.error("[Vertex Auth] Token exchange failed:", resp.status, await resp.text());
      return null;
    }

    const data = await resp.json();
    cachedAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    console.log("[Vertex Auth] ✅ Token obtained, expires in", data.expires_in, "s");
    return cachedAccessToken;
  } catch (err: any) {
    console.error("[Vertex Auth] Error:", err?.message);
    return null;
  }
}

function getServiceAccount(): { client_email: string; private_key: string; project_id: string } | null {
  try {
    const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
    if (!raw) {
      console.warn("[SA] FIREBASE_SERVICE_ACCOUNT_KEY not set");
      return null;
    }
    const sa = JSON.parse(raw);
    if (sa.client_email && sa.private_key && sa.project_id) return sa;
    console.warn("[SA] Missing fields in service account JSON");
    return null;
  } catch (e: any) {
    console.error("[SA] Failed to parse service account:", e?.message);
    return null;
  }
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
  stylePrompt: string, opts: { includePrompt: boolean; includeLanguage: boolean },
): Record<string, unknown> {
  const speechConfig: Record<string, unknown> = {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
  };
  if (opts.includeLanguage && selectedLang.trim()) speechConfig.languageCode = selectedLang;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: cleanText }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig },
  };
  if (opts.includePrompt && stylePrompt.trim()) {
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
    contents: [{ role: "user", parts: [{ text: cleanText }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig },
  };
}

// ─── Vertex AI request (PRIMARY) ─────────────────────────

async function requestVertexAI(
  sa: { client_email: string; private_key: string; project_id: string },
  variants: RequestVariant[],
): Promise<{ response: Response | null; lastError: string }> {
  const token = await getVertexToken(sa);
  if (!token) return { response: null, lastError: "Failed to get Vertex AI access token" };

  const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${VERTEX_LOCATION}/publishers/google/models/${MODEL}:generateContent`;
  let lastError = "";

  for (const variant of variants) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(variant.body),
      });

      if (resp.ok) {
        console.log(`[Vertex TTS] ✅ ${variant.label} attempt ${attempt}`);
        return { response: resp, lastError: "" };
      }

      const errText = await resp.text();
      lastError = errText.slice(0, 300);
      console.warn(`[Vertex TTS] ${variant.label} attempt ${attempt} (${resp.status}): ${lastError.slice(0, 120)}`);

      if (resp.status === 429 || resp.status === 403 || resp.status === 401) {
        if (resp.status !== 429) cachedAccessToken = null;
        return { response: null, lastError };
      }

      if (TRANSIENT_STATUS_CODES.has(resp.status) && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      break;
    }
  }
  return { response: null, lastError };
}

// ─── AI Studio fallback (free tier) ──────────────────────

function getAllGeminiKeys(): string[] {
  const now = Date.now();
  const names = ["GEMINI_API_KEY_GCP", "GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY_5", "GEMINI_API_KEY_6", "GEMINI_API_KEY_7"];
  const keys = names.map((n) => Deno.env.get(n)).filter((k): k is string => Boolean(k) && !isKeyCoolingDown(k, now));
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys;
}

async function requestAIStudio(
  keys: string[], variants: RequestVariant[],
): Promise<{ response: Response | null; lastError: string; rateLimited: boolean }> {
  let lastError = "";
  let hadRateLimit = false;

  for (const apiKey of keys) {
    const url = `${AI_STUDIO_BASE}/${MODEL}:generateContent?key=${apiKey}`;
    let skipKey = false;

    for (const variant of variants) {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(variant.body),
        });
        if (resp.ok) {
          console.log(`[AI Studio] ✅ ${variant.label} attempt ${attempt}`);
          return { response: resp, lastError, rateLimited: false };
        }
        const errText = await resp.text();
        lastError = errText.slice(0, 300);
        console.warn(`[AI Studio] ${variant.label} attempt ${attempt} (${resp.status})`);

        if (resp.status === 429) { hadRateLimit = true; markKeyCooldown(apiKey, KEY_RATE_LIMIT_COOLDOWN_MS); skipKey = true; break; }
        if (resp.status === 403) { markKeyCooldown(apiKey, KEY_AUTH_COOLDOWN_MS); skipKey = true; break; }
        if (TRANSIENT_STATUS_CODES.has(resp.status) && attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * attempt); continue; }
        break;
      }
      if (skipKey) break;
    }
  }
  return { response: null, lastError, rateLimited: hadRateLimit };
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

    // Build variants — Vertex AI does NOT support systemInstruction for TTS
    const vertexVariants: RequestVariant[] = multispeaker && multispeaker.length > 0
      ? [
          { label: "multi/lang", body: buildMultiSpeakerRequest(cleanText, selectedLang, multispeaker, true) },
          { label: "multi/plain", body: buildMultiSpeakerRequest(cleanText, selectedLang, multispeaker, false) },
        ]
      : [
          { label: "lang", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: false, includeLanguage: true }) },
          { label: "plain", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: false, includeLanguage: false }) },
        ];

    // AI Studio supports systemInstruction
    const studioVariants: RequestVariant[] = multispeaker && multispeaker.length > 0
      ? vertexVariants
      : [
          { label: "full", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: true, includeLanguage: true }) },
          { label: "no-lang", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: true, includeLanguage: false }) },
          { label: "plain", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: false, includeLanguage: false }) },
        ];

    // ── 1) Vertex AI (GCP credits) ──
    const sa = getServiceAccount();
    if (sa) {
      console.log(`[TTS] ${cleanText.length} chars → Vertex AI (project: ${sa.project_id})`);
      const vertex = await requestVertexAI(sa, vertexVariants);
      if (vertex.response) {
        const data = await vertex.response.json();
        const audioResp = parseAudioResponse(data);
        if (audioResp) return audioResp;
        console.error("[Vertex TTS] No audio:", JSON.stringify(data).slice(0, 400));
      } else {
        console.warn("[Vertex TTS] Failed:", vertex.lastError.slice(0, 150));
      }
    } else {
      console.warn("[TTS] No service account, skipping Vertex AI");
    }

    // ── 2) AI Studio fallback (free keys) ──
    const keys = getAllGeminiKeys();
    if (keys.length > 0) {
      console.log(`[TTS] Fallback AI Studio (${keys.length} keys)`);
      const { response, lastError, rateLimited } = await requestAIStudio(keys, studioVariants);

      if (rateLimited && !response) {
        return fallbackResponse("Rate limited", { rate_limited: true, retry_after_ms: CLIENT_RETRY_AFTER_MS });
      }
      if (response) {
        const data = await response.json();
        const audioResp = parseAudioResponse(data);
        if (audioResp) return audioResp;
      }
      return fallbackResponse("TTS unavailable", { details: lastError, retry_after_ms: 10000 });
    }

    return fallbackResponse("No TTS backends configured", { retry_after_ms: CLIENT_RETRY_AFTER_MS });
  } catch (error: any) {
    console.error("[TTS] Error:", error?.message || error);
    return fallbackResponse(error?.message || "Unknown error", { retry_after_ms: CLIENT_RETRY_AFTER_MS });
  }
});
