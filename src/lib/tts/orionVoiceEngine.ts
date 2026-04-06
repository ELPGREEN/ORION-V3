/**
 * Orion Voice Engine — 100% Independent Formant Synthesis
 * 
 * Orion's OWN voice. No external APIs. No HuggingFace. No Gemini. No Piper.
 * Pure formant synthesis from Iapetus voice DNA (55s / 7 samples).
 * 
 * CASCADE:
 * 1. Local Cache (IndexedDB) → instant, 0ms
 * 2. Formant Synthesis (Iapetus DNA) → ~50ms, 100% offline
 * 
 * That's it. Orion speaks with its own voice.
 */

import { getCachedAudio, cacheAudio } from "./voiceCache";

export interface OrionVoiceResult {
  played: boolean;
  audio: HTMLAudioElement | null;
  engine: string;
}

/**
 * Synthesize speech using Orion's own formant voice engine
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

  // ── 2. FORMANT SYNTHESIS (Orion's own voice) ──
  try {
    console.log("[Orion Voice] Starting formant synthesis...");
    const { synthesizeFormant } = await import("./formantSynth");
    const blob = await synthesizeFormant(cleanText);

    console.log(`[Orion Voice] Formant blob: size=${blob?.size}, type=${blob?.type}`);

    if (blob && blob.size > 100) {
      // Cache for next time
      cacheAudio(cleanText, blob, "formant-iapetus").catch(() => {});

      const result = await playBlob(blob, signal);
      console.log(`[Orion Voice] playBlob result: played=${result.played}`);
      if (result.played) {
        return { ...result, engine: "formant-iapetus" };
      }
    } else {
      console.warn(`[Orion Voice] Formant produced tiny/empty blob: ${blob?.size} bytes`);
    }
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.error("[Orion Voice] Formant synthesis error:", err?.message, err?.stack?.slice(0, 200));
    }
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

/** Orion voice is always available — it's local */
export function isOrionVoiceAvailable(): boolean {
  return true;
}
