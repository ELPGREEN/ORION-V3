/**
 * Gemini TTS — Free neural TTS using Google Gemini 2.5 Flash TTS (GA stable)
 * Tier 0 (highest quality) in Orion's voice cascade.
 * Uses edge function with key rotation. Falls back on 429/error.
 * 
 * v2: Gap-free playback via pre-buffering + larger chunks
 * v3: ⚡ TTS cache (memory + IndexedDB) for short phrases — ~5ms vs ~800ms
 */

import { buildTTSKey, getCachedTTS, isCacheable, setCachedTTS } from "./ttsCache";

let geminiTTSDisabled = false;
let geminiTTSRetryAfter = 0;

export interface GeminiTTSResult {
  played: boolean;
  audio: HTMLAudioElement | null;
}

function disableGeminiTTS(retryAfterMs: number, reason: string): void {
  const safeRetryMs = Math.max(3000, Math.min(retryAfterMs, 60_000));
  geminiTTSDisabled = true;
  geminiTTSRetryAfter = Date.now() + safeRetryMs;
  console.warn(`[Gemini TTS] ${reason}; disabled for ${Math.ceil(safeRetryMs / 1000)}s`);
}

function isGeminiTTSCoolingDown(): boolean {
  if (!geminiTTSDisabled) return false;
  if (Date.now() >= geminiTTSRetryAfter) {
    geminiTTSDisabled = false;
    geminiTTSRetryAfter = 0;
    console.log("[Gemini TTS] Cooldown ended, re-enabling");
    return false;
  }
  return true;
}

/**
 * Split text into chunks for TTS. Short texts (≤2000 chars) stay as a single
 * chunk to avoid any pauses. Longer texts are split at sentence boundaries
 * into ~1200-char chunks.
 */
/**
 * Send the ENTIRE text as a single chunk to Gemini TTS.
 * Gemini handles up to 5000 chars natively — splitting causes
 * gaps and cut-off words. Only split if truly enormous.
 */
function splitIntoSentences(text: string): string[] {
  const trimmed = text.trim();
  // ⚡ ULTRA: tiny first chunk = first audio in ~400-600ms instead of 1.5-2s
  // Strategy: first chunk = up to 1st sentence boundary (max ~180 chars)
  //           remaining chunks = ~1500 chars each (parallel fetch, gap-free play)
  if (trimmed.length <= 180) return [trimmed];

  const sentences = trimmed.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [trimmed];
  const chunks: string[] = [];

  // First chunk: just the first sentence (or first ~180 chars if huge)
  let first = sentences[0] || "";
  if (first.length > 220) first = first.slice(0, 200).replace(/\S+$/, "").trim() + "...";
  chunks.push(first.trim());

  // Remaining: pack into ~1500-char chunks
  let current = "";
  for (let i = 1; i < sentences.length; i++) {
    const s = sentences[i];
    if (current.length + s.length > 1500 && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 2);
}

// ⚡ TTS WARM-UP: pre-warm edge function on speech_start to cut cold-start (~200-400ms)
let _lastWarmUp = 0;
export async function warmUpGeminiTTS(): Promise<void> {
  const now = Date.now();
  if (now - _lastWarmUp < 30_000) return; // throttle to once per 30s
  _lastWarmUp = now;
  if (isGeminiTTSCoolingDown()) return;
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-tts`;
    // Fire-and-forget HEAD-like call with tiny payload to wake edge function
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text: ".", voice: "Enceladus", warmup: true }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {}); // swallow — warm-up is best-effort
  } catch {}
}

/**
 * Fetch audio for a single chunk from Gemini TTS edge function.
 */
export async function fetchGeminiAudio(
  text: string,
  voice: string,
  signal: AbortSignal,
  stylePrompt?: string,
  lang?: string,
): Promise<Blob | null> {
  if (signal.aborted || isGeminiTTSCoolingDown()) return null;

  // ⚡ Cache lookup for short phrases (skip network entirely)
  let cacheKey: string | null = null;
  if (isCacheable(text)) {
    cacheKey = await buildTTSKey(text, voice, lang, stylePrompt);
    const cached = await getCachedTTS(cacheKey);
    if (cached) {
      console.log(`[Gemini TTS] ⚡ cache hit (${cached.size}B) — "${text.slice(0, 40)}"`);
      return cached;
    }
  }

  const sentenceController = new AbortController();
  const sentenceTimeout = setTimeout(() => sentenceController.abort(), 25000); // Longer for bigger chunks
  const onParentAbort = () => sentenceController.abort();
  signal.addEventListener("abort", onParentAbort, { once: true });

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-tts`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text: text.slice(0, 8000), voice, prompt: stylePrompt, lang }),
      signal: sentenceController.signal,
    });

    if (sentenceController.signal.aborted || signal.aborted) return null;

    if (response.status === 429) {
      disableGeminiTTS(5_000, "Rate limited by edge function");
      return null;
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("audio/")) {
      const data = await response.json().catch(() => null);

      if (data?.fallback || data?.error) {
        if (data?.rate_limited) {
          const retryAfterMs = typeof data?.retry_after_ms === "number" && Number.isFinite(data.retry_after_ms)
            ? data.retry_after_ms
            : 5_000;
          disableGeminiTTS(retryAfterMs, data?.error || "Rate limited");
        } else {
          console.warn("[Gemini TTS] Server fallback (no cooldown):", data?.error);
        }
        return null;
      }

      if (!response.ok) {
        console.warn(`[Gemini TTS] Edge function error ${response.status} — will retry next call`);
      }
      return null;
    }

    const blob = await response.blob();
    if (blob.size < 100) return null;
    // ⚡ Persist short phrases for next time
    if (cacheKey) {
      void setCachedTTS(cacheKey, blob);
    }
    return blob;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("[Gemini TTS] Sentence fetch timed out or aborted");
    } else {
      console.warn("[Gemini TTS] Fetch error:", err?.message);
    }
    return null;
  } finally {
    clearTimeout(sentenceTimeout);
    signal.removeEventListener("abort", onParentAbort);
  }
}

/**
 * Play a single audio blob. Returns a promise that resolves when playback ends.
 * Accepts an optional `nextBlobUrl` to pre-create the next Audio element for
 * gap-free transitions.
 */
export function playAudioBlob(
  blob: Blob,
  signal: AbortSignal,
  nextBlobUrl?: string,
): Promise<{ audio: HTMLAudioElement | null; nextAudio: HTMLAudioElement | null }> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve({ audio: null, nextAudio: null });
      return;
    }

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    // Pre-create next audio element for gap-free playback
    let nextAudio: HTMLAudioElement | null = null;
    if (nextBlobUrl) {
      nextAudio = new Audio(nextBlobUrl);
      nextAudio.preload = "auto";
    }

    const cleanup = () => URL.revokeObjectURL(audioUrl);
    const onAbort = () => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
      cleanup();
      if (nextAudio) { nextAudio.src = ""; nextAudio = null; }
      resolve({ audio: null, nextAudio: null });
    };
    signal.addEventListener("abort", onAbort, { once: true });

    audio.onended = () => {
      signal.removeEventListener("abort", onAbort);
      cleanup();
      resolve({ audio, nextAudio });
    };
    audio.onerror = (e) => {
      console.warn("[Gemini TTS] Audio playback error:", e);
      signal.removeEventListener("abort", onAbort);
      cleanup();
      resolve({ audio: null, nextAudio });
    };

    audio.play().catch((err) => {
      console.warn("[Gemini TTS] audio.play() blocked:", err?.message);
      // Try resuming AudioContext if blocked by autoplay policy
      const ctx = (window as any).__orion_shared_audio_ctx__;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          audio.play().catch((err2) => {
            console.warn("[Gemini TTS] audio.play() still blocked after resume:", err2?.message);
            signal.removeEventListener("abort", onAbort);
            cleanup();
            resolve({ audio: null, nextAudio });
          });
        }).catch(() => {
          signal.removeEventListener("abort", onAbort);
          cleanup();
          resolve({ audio: null, nextAudio });
        });
      } else {
        signal.removeEventListener("abort", onAbort);
        cleanup();
        resolve({ audio: null, nextAudio });
      }
    });
  });
}

/**
 * Synthesize speech via Gemini TTS with parallel fetch + gap-free sequential playback.
 * 
 * Strategy:
 * 1. ALL chunks are fetched in parallel (unchanged)
 * 2. Blob URLs are pre-created so the next Audio element can preload
 *    while the current one plays → zero gap between sentences
 */
export async function speakWithGeminiTTS(
  text: string,
  voice: string = "Enceladus",
  signal?: AbortSignal,
  stylePrompt?: string,
  lang?: string,
): Promise<GeminiTTSResult> {
  const fail: GeminiTTSResult = { played: false, audio: null };
  if (!text?.trim()) return fail;
  if (signal?.aborted || isGeminiTTSCoolingDown()) return fail;

  const localController = new AbortController();
  const onExternalAbort = () => localController.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const sentences = splitIntoSentences(text);

    // ⚡ STREAMING: kick off all fetches in parallel, but PLAY as soon as each one is ready
    // Previously: Promise.all blocked until ALL chunks fetched (slowest = total wait)
    // Now: first audio plays after ~chunk0 latency (~400-600ms), others overlap
    const blobPromises: Promise<Blob | null>[] = sentences.map((s) =>
      fetchGeminiAudio(s, voice, localController.signal, stylePrompt, lang)
    );

    let anyPlayed = false;
    let lastAudio: HTMLAudioElement | null = null;
    let firstChunkFailed = false;

    for (let i = 0; i < blobPromises.length; i++) {
      if (localController.signal.aborted) break;
      const blob = await blobPromises[i];
      if (!blob) {
        if (i === 0) firstChunkFailed = true;
        continue;
      }
      const result = await playAudioBlob(blob, localController.signal);
      if (result.audio) {
        anyPlayed = true;
        lastAudio = result.audio;
      }
    }

    // Fallback: if first chunk failed AND nothing played, try Google Cloud TTS
    if (!anyPlayed && firstChunkFailed) {
      console.log("[Gemini TTS] First chunk failed, trying Google Cloud TTS fallback");
      try {
        const cloudResult = await fetchGoogleCloudTTSFallback(text, localController.signal);
        if (cloudResult) {
          const result = await playAudioBlob(cloudResult, localController.signal);
          signal?.removeEventListener("abort", onExternalAbort);
          return { played: !!result.audio, audio: result.audio };
        }
      } catch (e) {
        console.warn("[Gemini TTS] Google Cloud TTS fallback also failed:", e);
      }
    }

    signal?.removeEventListener("abort", onExternalAbort);
    return { played: anyPlayed, audio: lastAudio };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("[Gemini TTS] Request aborted");
    } else {
      console.warn("[Gemini TTS] Error:", err?.message);
    }
    signal?.removeEventListener("abort", onExternalAbort);
    return fail;
  }
}

/** Check if Gemini TTS is currently available */
export function isGeminiTTSAvailable(): boolean {
  return !isGeminiTTSCoolingDown();
}

/** Available Gemini TTS voices */
export const GEMINI_VOICES = [
  { id: "Enceladus", label: "Enceladus (Padrão Orion — JARVIS/Moderno)" },
  { id: "Charon", label: "Charon (Sério/Grave)" },
  { id: "Iapetus", label: "Iapetus (Grave/Clássico)" },
  { id: "Algieba", label: "Algieba (Neutro)" },
  { id: "Kore", label: "Kore (Firme)" },
  { id: "Zephyr", label: "Zephyr (Brilhante)" },
  { id: "Puck", label: "Puck (Animado)" },
  { id: "Fenrir", label: "Fenrir (Empolgado)" },
  { id: "Leda", label: "Leda (Jovem)" },
  { id: "Aoede", label: "Aoede (Brisa)" },
] as const;

// ═══ Google Cloud TTS Fallback ═══
async function fetchGoogleCloudTTSFallback(
  text: string,
  signal: AbortSignal,
): Promise<Blob | null> {
  if (signal.aborted) return null;
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-tts`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        text: text.slice(0, 8000),
        voice: "neural2-grave",
        encoding: "OGG_OPUS",
        speakingRate: 1.05,
      }),
      signal,
    });

    if (signal.aborted) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("audio/")) {
      console.warn("[Cloud TTS Fallback] Non-audio response");
      return null;
    }

    const blob = await response.blob();
    if (blob.size < 100) return null;
    console.log(`[Cloud TTS Fallback] ✅ ${(blob.size / 1024).toFixed(1)}KB audio`);
    return blob;
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.warn("[Cloud TTS Fallback] Error:", err?.message);
    }
    return null;
  }
}
