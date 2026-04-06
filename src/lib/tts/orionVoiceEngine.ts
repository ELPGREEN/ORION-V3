/**
 * Orion Voice Engine — Formant Synthesis (100% local)
 * 
 * CASCADE:
 * 1. Local Cache (IndexedDB) → instant, 0ms
 * 2. Formant Synthesis → ~50ms, 100% offline
 * 
 * RVC post-processing disabled (no Spaces deployed).
 * Re-enable when HF Spaces are live.
 */

import { getCachedAudio, cacheAudio } from "./voiceCache";

export interface OrionVoiceResult {
  played: boolean;
  audio: HTMLAudioElement | null;
  engine: string;
}

/**
 * Synthesize speech using Orion's formant engine
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

  // ── 2. FORMANT SYNTHESIS ──
  let formantBlob: Blob | null = null;
  try {
    console.log("[Orion Voice] Starting formant synthesis...");
    const { synthesizeFormant } = await import("./formantSynth");
    formantBlob = await synthesizeFormant(cleanText);
    console.log(`[Orion Voice] Formant blob: size=${formantBlob?.size}, type=${formantBlob?.type}`);
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.error("[Orion Voice] Formant synthesis error:", err?.message);
    }
    return fail;
  }

  if (!formantBlob || formantBlob.size < 100) {
    console.warn(`[Orion Voice] Formant produced empty blob`);
    return fail;
  }

  if (signal?.aborted) return fail;

  // ── 3. CACHE & PLAY ──
  const engine = "formant-iapetus";
  cacheAudio(cleanText, formantBlob, engine).catch(() => {});

  const result = await playBlob(formantBlob, signal);
  if (result.played) {
    return { ...result, engine };
  }

  return fail;
}

/**
 * Play an audio blob
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

/** Orion voice is always available — formant is 100% local */
export function isOrionVoiceAvailable(): boolean {
  return true;
}
