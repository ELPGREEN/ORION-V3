/**
 * Gemini TTS — Cloud Text-to-Speech API with Gemini 2.5 Flash TTS (GA)
 * 
 * Uses the official Cloud TTS synthesizeSpeech endpoint which:
 * - Returns audio directly (no JSON parsing needed)
 * - Supports prompt/style instructions natively
 * - Uses GCP credits via service account
 * 
 * CASCADE:
 * 1. Cloud TTS API (synthesizeSpeech) — primary, uses GCP credits
 * 2. Vertex AI generateContent — fallback
 * 3. AI Studio free keys — last resort
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLOUD_TTS_MODEL = "gemini-2.5-flash-tts";
const VERTEX_MODELS = ["gemini-2.5-flash-tts", "gemini-2.5-flash-preview-tts"];
const VERTEX_LOCATION = "us-central1";
const AI_STUDIO_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_VOICE = "Enceladus";
const DEFAULT_LANG = "pt-BR";
const DEFAULT_PROMPT = `Você é ORION, assistente IA pessoal — inteligente, descontraído e direto.
PERFIL VOCAL:
- Voz MASCULINA jovem-adulta, clara e articulada
- Tom CONFIANTE e NATURAL — como um amigo inteligente falando com você
- Humor leve e sarcasmo amigável quando apropriado
- Ritmo moderado, calmo e controlado — nunca apressado
- Sotaque brasileiro neutro/moderno, dicção perfeita
- Personalidade: esperto, prestativo, com personalidade AquaMonkey (criativo e adaptável)
REGRAS DE FLUÊNCIA:
1. Fale de forma CONTÍNUA e FLUIDA sem pausas longas
2. Pausas entre frases: MÁXIMO 0.15 segundos
3. Transições entre sentenças INSTANTÂNEAS e suaves
4. NUNCA pare no meio de frase ou faça silêncio prolongado
5. Articule cada palavra completamente
6. Ritmo natural e envolvente — como uma conversa real`;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1200;
const CLIENT_RETRY_AFTER_MS = 30_000;
const TRANSIENT_STATUS_CODES = new Set([408, 500, 502, 503, 504]);

const failedKeyCache: Record<string, number> = {};
const KEY_AUTH_COOLDOWN_MS = 5 * 60 * 1000;
const KEY_RATE_LIMIT_COOLDOWN_MS = 60 * 1000;

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

// ─── JWT for GCP Auth ────────────────────────────────────

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

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string | null> {
  try {
    if (cachedAccessToken && Date.now() < tokenExpiresAt - 60_000) return cachedAccessToken;

    const jwt = await createJWT(sa);
    const resp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!resp.ok) {
      console.error("[GCP Auth] Token exchange failed:", resp.status, await resp.text());
      return null;
    }

    const data = await resp.json();
    cachedAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    console.log("[GCP Auth] ✅ Token obtained, expires in", data.expires_in, "s");
    return cachedAccessToken;
  } catch (err: any) {
    console.error("[GCP Auth] Error:", err?.message);
    return null;
  }
}

function getServiceAccount(): { client_email: string; private_key: string; project_id: string } | null {
  try {
    // Try GCP_SA_KEY first (dedicated), then FIREBASE_SERVICE_ACCOUNT_KEY
    const raw = Deno.env.get("GCP_SA_KEY") || Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
    if (!raw) {
      console.warn("[SA] No service account key found");
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

// ═══════════════════════════════════════════════════════════
// PATH 1: Cloud Text-to-Speech API (synthesizeSpeech) — PRIMARY
// Uses official TTS endpoint, returns audio directly
// ═══════════════════════════════════════════════════════════

// ─── SSML helpers ────────────────────────────────────────
// Cloud TTS supports a strict subset of SSML. We auto-wrap plain text into
// SSML with prosody + natural pauses to improve intelligibility.

export interface EscapeReport {
  escaped: string;
  counts: Record<string, number>; // char → occurrences escaped
  total: number;
}

function escapeSSMLWithReport(s: string): EscapeReport {
  const counts: Record<string, number> = {};
  const bump = (ch: string) => {
    counts[ch] = (counts[ch] ?? 0) + 1;
  };
  const escaped = s
    .replace(/&/g, () => { bump("&"); return "&amp;"; })
    .replace(/</g, () => { bump("<"); return "&lt;"; })
    .replace(/>/g, () => { bump(">"); return "&gt;"; })
    .replace(/"/g, () => { bump('"'); return "&quot;"; })
    .replace(/'/g, () => { bump("'"); return "&apos;"; });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { escaped, counts, total };
}

function escapeSSML(s: string): string {
  return escapeSSMLWithReport(s).escaped;
}

function isAlreadySSML(s: string): boolean {
  return /^\s*<speak[\s>]/i.test(s);
}

/**
 * Convert plain text → SSML with natural pacing for pt-BR.
 * - Sentence-ending punctuation gets short <break>
 * - Comma/semicolon get micro pauses
 * - Wraps in <prosody rate="medium" pitch="+0st"> for stable cadence
 * - Escapes XML-unsafe chars
 */
function textToSSML(text: string): string {
  // Normalize line endings first so \r\n behaves like \n
  const normalized = text.trim().replace(/\r\n?/g, "\n");
  const escaped = escapeSSML(normalized);

  // Order matters: handle blank-line paragraph breaks BEFORE single newlines,
  // so a single line break stays a short pause instead of a long paragraph gap.
  const withBreaks = escaped
    // Punctuation pacing
    .replace(/([.!?…])(\s+|$)/g, '$1<break time="280ms"/>$2')
    .replace(/([,;:])(\s+)/g, '$1<break time="120ms"/>$2')
    // True paragraph break: one or more blank lines (\n followed by optional spaces and another \n)
    .replace(/\n[ \t]*\n+/g, '<break time="380ms"/>')
    // Single line break → short pause (~150ms), like a soft comma, NOT a paragraph
    .replace(/\n/g, '<break time="150ms"/>');

  return `<speak><prosody rate="medium" pitch="+0st" volume="medium">${withBreaks}</prosody></speak>`;
}

async function requestCloudTTS(
  token: string,
  text: string,
  voice: string,
  lang: string,
  _stylePrompt: string,
  multispeaker?: MultiSpeakerVoice[],
  audioOpts?: { speakingRate?: number; pitch?: number; volumeGainDb?: number },
): Promise<Response | null> {
  const url = "https://texttospeech.googleapis.com/v1beta1/text:synthesize";

  const isMulti = multispeaker && multispeaker.length > 0;

  // ── Voice config (only fields supported by Cloud TTS v1beta1) ──
  const voiceParams: Record<string, unknown> = {
    languageCode: lang,
    name: voice,
    modelName: CLOUD_TTS_MODEL,
  };

  if (isMulti) {
    voiceParams.multiSpeakerVoiceConfig = {
      speakerVoiceConfigs: multispeaker!
        .filter((s) => typeof s?.speaker === "string" && s.speaker.trim().length > 0)
        .map((s) => ({
          speakerAlias: s.speaker,
          speakerId: s.voice || DEFAULT_VOICE,
        })),
    };
    delete voiceParams.name;
  }

  // ── Input: SSML preferred, with auto-wrap for plain text ──
  const inputContent = text.slice(0, 4000);
  const useSSML = isAlreadySSML(inputContent);
  const ssmlInput = useSSML ? inputContent : textToSSML(inputContent);
  // Plain text fallback: strip ALL XML tags and unescape basic entities so the
  // synthesizer always has a safe, valid input even if SSML generation breaks.
  const plainTextFallback = inputContent
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  // ── Audio config: only Cloud-TTS-supported fields ──
  // speakingRate: 0.25–4.0 (1.0 = normal)
  // pitch: -20.0 to +20.0 semitones
  // volumeGainDb: -96.0 to +16.0 dB
  const audioConfig: Record<string, unknown> = {
    audioEncoding: "MP3",
    sampleRateHertz: 24000,
    speakingRate: clamp(audioOpts?.speakingRate ?? 1.0, 0.25, 4.0),
    pitch: clamp(audioOpts?.pitch ?? 0.0, -20.0, 20.0),
    volumeGainDb: clamp(audioOpts?.volumeGainDb ?? 0.0, -96.0, 16.0),
  };

  // Build two payload variants: primary (SSML) and fallback (plain text).
  const buildBody = (mode: "ssml" | "text"): Record<string, unknown> => ({
    input: mode === "ssml" ? { ssml: ssmlInput } : { text: plainTextFallback },
    voice: voiceParams,
    audioConfig,
  });

  // Heuristic: a 400 response usually means malformed SSML — retry once as plain text.
  let plainTextRetried = false;
  let inputMode: "ssml" | "text" = "ssml";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildBody(inputMode)),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data?.audioContent) {
          const audioBytes = Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0));
          const inputLabel = inputMode === "text"
            ? "plain-text-fallback"
            : useSSML ? "ssml-passthrough" : "ssml-auto";
          console.log(`[Cloud TTS] ✅ ${CLOUD_TTS_MODEL} ${(audioBytes.length / 1024).toFixed(1)}KB MP3 (input=${inputLabel})`);
          return new Response(audioBytes.buffer, {
            headers: {
              ...corsHeaders,
              "Content-Type": "audio/mpeg",
              "Content-Length": String(audioBytes.length),
              "X-TTS-Engine": "cloud-tts",
              "X-TTS-Model": CLOUD_TTS_MODEL,
              "X-TTS-Input": inputLabel,
              "X-TTS-Fallback": inputMode === "text" ? "plain-text" : "none",
            },
          });
        }
        console.warn("[Cloud TTS] No audioContent in response");
        return null;
      }

      const errText = await resp.text();
      console.warn(`[Cloud TTS] Attempt ${attempt} mode=${inputMode} (${resp.status}): ${errText.slice(0, 200)}`);

      // ── SSML failure → retry as plain text (one shot) ──
      if (resp.status === 400 && inputMode === "ssml" && !plainTextRetried && plainTextFallback.length > 0) {
        console.warn("[Cloud TTS] ⚠️ SSML rejected — retrying with plain text fallback");
        inputMode = "text";
        plainTextRetried = true;
        continue; // do not count as a normal retry; immediately re-fire
      }

      if (resp.status === 429 || resp.status === 403 || resp.status === 401) {
        if (resp.status !== 429) cachedAccessToken = null;
        return null;
      }

      if (TRANSIENT_STATUS_CODES.has(resp.status) && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      return null;
    } catch (err: any) {
      console.warn(`[Cloud TTS] Attempt ${attempt} error:`, err?.message);
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  return null;
}

function clamp(n: number, min: number, max: number): number {
  if (typeof n !== "number" || !isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// ═══════════════════════════════════════════════════════════
// PATH 2: Vertex AI generateContent — secondary fallback
// ═══════════════════════════════════════════════════════════

function buildSingleSpeakerRequest(
  cleanText: string, selectedVoice: string, selectedLang: string,
  stylePrompt: string, opts: { includePrompt: boolean; includeLanguage: boolean },
): Record<string, unknown> {
  const speechConfig: Record<string, unknown> = {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } },
  };
  if (opts.includeLanguage && selectedLang.trim()) speechConfig.languageCode = selectedLang;

  // ⚠️ NEVER prefix the style prompt to the text — Gemini TTS would READ IT ALOUD.
  // The style is conveyed via systemInstruction (separate field), not as spoken content.
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: cleanText }] }],
    generationConfig: { responseModalities: ["AUDIO"], maxOutputTokens: 8192, speechConfig },
  };
  if (opts.includePrompt && stylePrompt.trim()) {
    body.systemInstruction = {
      parts: [{ text: stylePrompt.trim().slice(0, 800) }],
    };
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
    generationConfig: { responseModalities: ["AUDIO"], maxOutputTokens: 8192, speechConfig },
  };
}

async function requestVertexAI(
  sa: { client_email: string; private_key: string; project_id: string },
  token: string,
  variants: RequestVariant[],
): Promise<{ response: Response | null; lastError: string; usedModel: string }> {
  let lastError = "";

  for (const model of VERTEX_MODELS) {
    const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/${VERTEX_LOCATION}/publishers/google/models/${model}:generateContent`;

    for (const variant of variants) {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(variant.body),
        });

        if (resp.ok) {
          console.log(`[Vertex TTS] ✅ ${model} ${variant.label} attempt ${attempt}`);
          return { response: resp, lastError: "", usedModel: model };
        }

        const errText = await resp.text();
        lastError = errText.slice(0, 300);
        console.warn(`[Vertex TTS] ${model} ${variant.label} attempt ${attempt} (${resp.status}): ${lastError.slice(0, 120)}`);

        if (resp.status === 429 || resp.status === 403 || resp.status === 401) {
          if (resp.status !== 429) cachedAccessToken = null;
          break;
        }

        if (TRANSIENT_STATUS_CODES.has(resp.status) && attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        break;
      }
    }
  }
  return { response: null, lastError, usedModel: "" };
}

// ═══════════════════════════════════════════════════════════
// PATH 3: AI Studio free keys — last resort
// ═══════════════════════════════════════════════════════════

let _ttsRRIdx = 0;
function getAllGeminiKeys(): string[] {
  const now = Date.now();
  const names = ["GEMINI_API_KEY_GCP", "GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY_5", "GEMINI_API_KEY_6", "GEMINI_API_KEY_7"];
  const keys = names.map((n) => Deno.env.get(n)).filter((k): k is string => Boolean(k)).filter((k) => !isKeyCoolingDown(k, now));
  if (keys.length === 0) return [];
  // Round-robin: rotate starting position so each invocation starts at a different key
  _ttsRRIdx = _ttsRRIdx % keys.length;
  const rotated = [...keys.slice(_ttsRRIdx), ...keys.slice(0, _ttsRRIdx)];
  _ttsRRIdx++;
  return rotated;
}

async function requestAIStudio(
  keys: string[], variants: RequestVariant[],
): Promise<{ response: Response | null; lastError: string; rateLimited: boolean; usedModel: string }> {
  let lastError = "";
  let hadRateLimit = false;

  for (const model of VERTEX_MODELS) {
    for (const apiKey of keys) {
      const url = `${AI_STUDIO_BASE}/${model}:generateContent?key=${apiKey}`;
      let skipKey = false;

      for (const variant of variants) {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(variant.body),
          });
          if (resp.ok) {
            console.log(`[AI Studio] ✅ ${model} ${variant.label} attempt ${attempt}`);
            return { response: resp, lastError, rateLimited: false, usedModel: model };
          }
          const errText = await resp.text();
          lastError = errText.slice(0, 300);
          console.warn(`[AI Studio] ${model} ${variant.label} attempt ${attempt} (${resp.status})`);

          if (resp.status === 429) { hadRateLimit = true; markKeyCooldown(apiKey, KEY_RATE_LIMIT_COOLDOWN_MS); skipKey = true; break; }
          if (resp.status === 403) { markKeyCooldown(apiKey, KEY_AUTH_COOLDOWN_MS); skipKey = true; break; }
          if (resp.status === 404) { break; }
          if (TRANSIENT_STATUS_CODES.has(resp.status) && attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * attempt); continue; }
          break;
        }
        if (skipKey) break;
      }
    }
  }
  return { response: null, lastError, rateLimited: hadRateLimit, usedModel: "" };
}

// ─── Audio response parser (for Vertex/AI Studio) ────────

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
    return new Response(new Uint8Array(wav.buffer).buffer as ArrayBuffer, {
      headers: { ...corsHeaders, "Content-Type": "audio/wav", "Content-Length": String(wav.length) },
    });
  }

  const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  console.log(`[TTS] ${mimeType} ${(audioBytes.length / 1024).toFixed(1)}KB`);
  return new Response(audioBytes.buffer, {
    headers: { ...corsHeaders, "Content-Type": mimeType, "Content-Length": String(audioBytes.length) },
  });
}

// ═══════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text : "";
    const voice = typeof body?.voice === "string" ? body.voice : DEFAULT_VOICE;
    const lang = typeof body?.lang === "string" ? body.lang : DEFAULT_LANG;
    const prompt = typeof body?.prompt === "string" ? body.prompt : DEFAULT_PROMPT;
    const multispeaker = Array.isArray(body?.multispeaker) ? body.multispeaker as MultiSpeakerVoice[] : undefined;

    // Speech-only audio params (Cloud TTS-supported subset)
    const audioOpts = {
      speakingRate: typeof body?.speakingRate === "number" ? body.speakingRate : undefined,
      pitch: typeof body?.pitch === "number" ? body.pitch : undefined,
      volumeGainDb: typeof body?.volumeGainDb === "number" ? body.volumeGainDb : undefined,
    };

    // ⚡ Warm-up ping: client wants to wake the function but skip synthesis
    if (body?.warmup === true) {
      // Pre-fetch access token so the next real request is hot
      try { const sa = getServiceAccount(); if (sa) await getAccessToken(sa); } catch {}
      return jsonResponse({ warmed: true });
    }

    if (!text.trim()) return jsonResponse({ error: "Text is required" }, 400);

    const cleanText = text.trim().slice(0, 5000);
    const selectedVoice = voice || DEFAULT_VOICE;
    const selectedLang = lang || DEFAULT_LANG;
    const stylePrompt = prompt || DEFAULT_PROMPT;

    // ── 1) Cloud TTS API (official, uses GCP credits directly) ──
    const sa = getServiceAccount();
    if (sa) {
      const token = await getAccessToken(sa);
      if (token) {
        console.log(`[TTS] ${cleanText.length} chars → Cloud TTS API (${CLOUD_TTS_MODEL}, voice: ${selectedVoice})`);
        const cloudResp = await requestCloudTTS(token, cleanText, selectedVoice, selectedLang, stylePrompt, multispeaker, audioOpts);
        if (cloudResp) return cloudResp;

        // ── 2) Vertex AI generateContent (fallback, same GCP credits) ──
        console.log("[TTS] Cloud TTS failed, trying Vertex AI generateContent...");
        const vertexVariants: RequestVariant[] = multispeaker && multispeaker.length > 0
          ? [
              { label: "multi/lang", body: buildMultiSpeakerRequest(cleanText, selectedLang, multispeaker, true) },
              { label: "multi/plain", body: buildMultiSpeakerRequest(cleanText, selectedLang, multispeaker, false) },
            ]
          : [
              { label: "full", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: true, includeLanguage: true }) },
              { label: "lang", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: false, includeLanguage: true }) },
              { label: "plain", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: false, includeLanguage: false }) },
            ];

        const vertex = await requestVertexAI(sa, token, vertexVariants);
        if (vertex.response) {
          const data = await vertex.response.json();
          const audioResp = parseAudioResponse(data);
          if (audioResp) {
            audioResp.headers.set("X-TTS-Engine", "vertex-ai");
            audioResp.headers.set("X-TTS-Model", vertex.usedModel);
            return audioResp;
          }
        }
      }
    }

    // ── 3) AI Studio free keys (last resort) ──
    const keys = getAllGeminiKeys();
    if (keys.length > 0) {
      console.log(`[TTS] Fallback AI Studio (${keys.length} keys)`);
      const studioVariants: RequestVariant[] = multispeaker && multispeaker.length > 0
        ? [
            { label: "multi/lang", body: buildMultiSpeakerRequest(cleanText, selectedLang, multispeaker, true) },
          ]
        : [
            { label: "full", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: true, includeLanguage: true }) },
            { label: "no-lang", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: true, includeLanguage: false }) },
            { label: "plain", body: buildSingleSpeakerRequest(cleanText, selectedVoice, selectedLang, stylePrompt, { includePrompt: false, includeLanguage: false }) },
          ];

      const { response, lastError, rateLimited, usedModel } = await requestAIStudio(keys, studioVariants);

      if (rateLimited && !response) {
        return fallbackResponse("Rate limited", { rate_limited: true, retry_after_ms: CLIENT_RETRY_AFTER_MS });
      }
      if (response) {
        const data = await response.json();
        const audioResp = parseAudioResponse(data);
        if (audioResp) {
          audioResp.headers.set("X-TTS-Engine", "ai-studio");
          audioResp.headers.set("X-TTS-Model", usedModel);
          return audioResp;
        }
      }
      return fallbackResponse("TTS unavailable", { details: lastError, retry_after_ms: 10000 });
    }

    return fallbackResponse("No TTS backends configured", { retry_after_ms: CLIENT_RETRY_AFTER_MS });
  } catch (error: any) {
    console.error("[TTS] Error:", error?.message || error);
    return fallbackResponse(error?.message || "Unknown error", { retry_after_ms: CLIENT_RETRY_AFTER_MS });
  }
});
