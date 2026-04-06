/**
 * Orion Voice Engine — Formant + RVC Voice Conversion
 * 
 * CASCADE:
 * 1. Local Cache (IndexedDB) → instant, 0ms
 * 2. Formant Synthesis → ~50ms, 100% offline
 * 3. RVC Post-processing → ~2-5s, converts to cloned voice via HF Space
 * 
 * If RVC is unavailable, falls back to raw formant voice.
 */

import { getCachedAudio, cacheAudio } from "./voiceCache";

export interface OrionVoiceResult {
  played: boolean;
  audio: HTMLAudioElement | null;
  engine: string;
}

// RVC availability cache (check once per session)
let _rvcAvailable: boolean | null = null;
let _rvcCheckPromise: Promise<boolean> | null = null;

async function checkRVCOnce(): Promise<boolean> {
  if (_rvcAvailable !== null) return _rvcAvailable;
  if (_rvcCheckPromise) return _rvcCheckPromise;
  
  _rvcCheckPromise = import("./rvcClient").then(m => m.isRVCAvailable()).catch(() => false);
  _rvcAvailable = await _rvcCheckPromise;
  _rvcCheckPromise = null;
  
  console.log(`[Orion Voice] RVC available: ${_rvcAvailable}`);
  return _rvcAvailable;
}

/**
 * Synthesize speech using Orion's formant engine + RVC voice conversion
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

  // ── 3. RVC POST-PROCESSING (if available) ──
  let finalBlob = formantBlob;
  let engine = "formant-iapetus";

  try {
    const rvcReady = await checkRVCOnce();
    if (rvcReady && !signal?.aborted) {
      console.log("[Orion Voice] Sending to RVC for voice conversion...");
      const { convertWithRVC, convertWithRVCGradio } = await import("./rvcClient");
      
      // Try direct HTTP first, then Gradio
      let rvcBlob = await convertWithRVC(formantBlob, undefined, signal);
      if (!rvcBlob && !signal?.aborted) {
        rvcBlob = await convertWithRVCGradio(formantBlob, undefined, signal);
      }

      if (rvcBlob && rvcBlob.size > 100) {
        finalBlob = rvcBlob;
        engine = "rvc-orion";
        console.log(`[Orion Voice] RVC conversion successful: ${rvcBlob.size} bytes`);
      } else {
        console.log("[Orion Voice] RVC unavailable, using raw formant");
      }
    }
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.warn("[Orion Voice] RVC post-processing failed, using formant:", err?.message);
    }
  }

  if (signal?.aborted) return fail;

  // ── 4. CACHE & PLAY ──
  cacheAudio(cleanText, finalBlob, engine).catch(() => {});

  const result = await playBlob(finalBlob, signal);
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

/** Orion voice is always available — formant is local, RVC is bonus */
export function isOrionVoiceAvailable(): boolean {
  return true;
}
