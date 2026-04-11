/**
 * Orion Voice Engine — Multi-tier TTS Cascade (100% resilient)
 * 
 * CASCADE:
 * 1. Local Cache (IndexedDB) → instant, 0ms
 * 2. Google Cloud TTS (Neural2) → ~500ms, high quality
 * 3. Gemini TTS (2.5 Flash) → ~2-4s, excellent quality
 * 4. Formant Synthesis → ~50ms, 100% offline fallback
 */

import { getCachedAudio, cacheAudio } from "./voiceCache";

export interface OrionVoiceResult {
  played: boolean;
  audio: HTMLAudioElement | null;
  engine: string;
}

/**
 * Synthesize speech using Orion's multi-tier cascade
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

  // ── 2. GOOGLE CLOUD TTS (Neural2 — ~500ms) ──
  try {
    console.log("[Orion Voice] Trying Google Cloud TTS...");
    const cloudBlob = await fetchCloudTTS(cleanText, signal);
    if (cloudBlob && cloudBlob.size > 100) {
      if (signal?.aborted) return fail;
      cacheAudio(cleanText, cloudBlob, "cloud-tts-neural2").catch(() => {});
      const result = await playBlob(cloudBlob, signal);
      if (result.played) {
        return { ...result, engine: "cloud-tts-neural2" };
      }
    }
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.warn("[Orion Voice] Cloud TTS failed:", err?.message);
    }
  }

  if (signal?.aborted) return fail;

  // ── 3. GEMINI TTS (2.5 Flash — ~2-4s) ──
  try {
    console.log("[Orion Voice] Trying Gemini TTS...");
    const { speakWithGeminiTTS, isGeminiTTSAvailable } = await import("./geminiTTS");
    if (isGeminiTTSAvailable()) {
      const geminiResult = await speakWithGeminiTTS(cleanText, "Charon", signal);
      if (geminiResult.played) {
        return { played: true, audio: geminiResult.audio, engine: "gemini-tts" };
      }
    }
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.warn("[Orion Voice] Gemini TTS failed:", err?.message);
    }
  }

  if (signal?.aborted) return fail;

  // ── 4. FORMANT SYNTHESIS (local offline — ~50ms) ──
  let formantBlob: Blob | null = null;
  try {
    console.log("[Orion Voice] Falling back to formant synthesis...");
    const { synthesizeFormant } = await import("./formantSynth");
    formantBlob = await synthesizeFormant(cleanText);
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.error("[Orion Voice] Formant synthesis error:", err?.message);
    }
    return fail;
  }

  if (!formantBlob || formantBlob.size < 100) {
    console.warn("[Orion Voice] Formant produced empty blob");
    return fail;
  }

  if (signal?.aborted) return fail;

  const engine = "formant-iapetus";
  cacheAudio(cleanText, formantBlob, engine).catch(() => {});

  const result = await playBlob(formantBlob, signal);
  if (result.played) {
    return { ...result, engine };
  }

  return fail;
}

/**
 * Fetch audio from Google Cloud TTS edge function
 */
async function fetchCloudTTS(text: string, signal?: AbortSignal): Promise<Blob | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-cloud-tts`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        voice: "neural2-grave",
        encoding: "OGG_OPUS",
      }),
      signal: controller.signal,
    });

    if (controller.signal.aborted || signal?.aborted) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("audio/")) {
      // Got JSON error response
      const data = await response.json().catch(() => null);
      if (data?.fallback) {
        console.warn("[Cloud TTS] Fallback:", data?.error);
      }
      return null;
    }

    const blob = await response.blob();
    return blob.size >= 100 ? blob : null;
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.warn("[Cloud TTS] Fetch error:", err?.message);
    }
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
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
