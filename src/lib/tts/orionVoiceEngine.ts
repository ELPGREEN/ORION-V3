/**
 * Orion Voice Engine — Unified client for Orion's own voice synthesis
 * 
 * CASCADE (all free, no Google dependency):
 * 1. Local Cache (IndexedDB) → instant, 0ms
 * 2. HuggingFace Voice Engine (orion-voice-engine edge function) → ~3-5s
 * 3. Gemini TTS (backup, still free) → ~2s
 * 4. Piper WASM (offline fallback) → ~1s
 * 
 * Audio is cached locally after first synthesis.
 */

import { getCachedAudio, cacheAudio } from "./voiceCache";
import { applyIapetusSignature } from "./voiceDSP";

export interface OrionVoiceResult {
  played: boolean;
  audio: HTMLAudioElement | null;
  engine: string;
}

let orionEngineDisabled = false;
let orionEngineRetryAfter = 0;

/**
 * Synthesize speech using Orion's own voice engine
 * Tries HuggingFace-based synthesis first, caches result locally
 */
export async function speakWithOrionVoice(
  text: string,
  signal?: AbortSignal,
): Promise<OrionVoiceResult> {
  const fail: OrionVoiceResult = { played: false, audio: null, engine: "none" };
  if (!text?.trim()) return fail;
  if (signal?.aborted) return fail;

  const cleanText = text.trim().slice(0, 3000);

  // ── 1. CHECK LOCAL CACHE ──
  try {
    const cached = await getCachedAudio(cleanText);
    if (cached && cached.size > 100) {
      const result = await playBlob(cached, signal);
      if (result.played) {
        return { ...result, engine: "cache" };
      }
    }
  } catch {}

  if (signal?.aborted) return fail;

  // ── 2. ORION VOICE ENGINE (HuggingFace) + DSP ──
  if (!orionEngineDisabled || Date.now() >= orionEngineRetryAfter) {
    try {
      let blob = await fetchOrionEngine(cleanText, signal);
      if (blob && blob.size > 100) {
        // Apply Iapetus voice signature DSP
        try {
          blob = await applyIapetusSignature(blob);
        } catch (dspErr) {
          console.warn("[Orion Voice] DSP failed, using raw audio:", dspErr);
        }
        
        // Cache the processed audio
        cacheAudio(cleanText, blob, "orion-hf-dsp").catch(() => {});
        
        const result = await playBlob(blob, signal);
        if (result.played) {
          return { ...result, engine: "orion-hf-dsp" };
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.warn("[Orion Voice] HF engine failed:", err?.message);
      }
    }
  }

  if (signal?.aborted) return fail;

  // ── 3. GEMINI TTS (backup, still free) ──
  try {
    const { speakWithGeminiTTS, isGeminiTTSAvailable } = await import("./geminiTTS");
    if (isGeminiTTSAvailable()) {
      const result = await speakWithGeminiTTS(cleanText, "Iapetus", signal);
      if (result.played) {
        return { played: true, audio: result.audio, engine: "gemini-tts" };
      }
    }
  } catch {}

  if (signal?.aborted) return fail;

  // ── 4. FORMANT SYNTH (100% offline, Iapetus voice DNA) ──
  try {
    const { speakFormant } = await import("./formantSynth");
    const result = await speakFormant(cleanText, signal);
    if (result.played) {
      return { played: true, audio: result.audio, engine: "formant-iapetus" };
    }
  } catch {}

  // ── 5. PIPER WASM (offline fallback) ──
  try {
    const { speakWithPiper } = await import("./piperTTS");
    await speakWithPiper(cleanText);
    return { played: true, audio: null, engine: "piper-wasm" };
  } catch {}

  return fail;
}

/**
 * Fetch audio from the orion-voice-engine edge function
 */
async function fetchOrionEngine(text: string, signal?: AbortSignal): Promise<Blob | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orion-voice-engine`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      orionEngineDisabled = true;
      orionEngineRetryAfter = Date.now() + 60_000;
      console.warn("[Orion Voice] HF rate limited, disabled for 60s");
      return null;
    }

    if (response.status === 503) {
      orionEngineDisabled = true;
      orionEngineRetryAfter = Date.now() + 120_000;
      await response.text();
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("audio/")) {
      await response.text();
      return null;
    }

    return await response.blob();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

/**
 * Play an audio blob and return result
 */
async function playBlob(blob: Blob, signal?: AbortSignal): Promise<OrionVoiceResult> {
  const fail: OrionVoiceResult = { played: false, audio: null, engine: "none" };
  if (signal?.aborted) return fail;

  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);

  try {
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        audio.pause();
        audio.src = "";
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      audio.onended = () => {
        signal?.removeEventListener("abort", onAbort);
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = () => {
        signal?.removeEventListener("abort", onAbort);
        URL.revokeObjectURL(audioUrl);
        reject(new Error("Playback error"));
      };
      audio.play().catch(reject);
    });

    return { played: !signal?.aborted, audio, engine: "blob" };
  } catch {
    URL.revokeObjectURL(audioUrl);
    return fail;
  }
}

/** Check if Orion voice engine is available */
export function isOrionVoiceAvailable(): boolean {
  return !orionEngineDisabled || Date.now() >= orionEngineRetryAfter;
}
