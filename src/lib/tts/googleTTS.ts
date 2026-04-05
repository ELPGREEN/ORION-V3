/**
 * Google Translate TTS — Free, unlimited PT-BR synthesis
 * Adapted from eac-ufsm/texto-para-voz (gTTS technique)
 * Uses Edge Function proxy to avoid CORS issues.
 * Tier 1.5 in Orion's voice cascade (between ElevenLabs and Piper).
 */

let googleTTSDisabled = false;
let googleTTSRetryAfter = 0;

export interface GoogleTTSResult {
  played: boolean;
  /** Reference to the Audio element for external control (pause/cancel) */
  audio: HTMLAudioElement | null;
}

/**
 * Synthesize speech via Google Translate TTS (free, unlimited).
 * Returns a GoogleTTSResult with the Audio element for barge-in control.
 * Supports AbortSignal for cancellation.
 */
export async function speakWithGoogleTTS(
  text: string,
  lang: string = "pt-br",
  signal?: AbortSignal,
): Promise<GoogleTTSResult> {
  const fail: GoogleTTSResult = { played: false, audio: null };
  if (!text?.trim()) return fail;

  // Check if already aborted
  if (signal?.aborted) return fail;

  // Check if temporarily disabled
  if (googleTTSDisabled && Date.now() < googleTTSRetryAfter) return fail;
  if (googleTTSDisabled && Date.now() >= googleTTSRetryAfter) {
    googleTTSDisabled = false;
  }

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-tts`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    // Chain external signal to our internal controller
    const onExternalAbort = () => controller.abort();
    signal?.addEventListener("abort", onExternalAbort, { once: true });

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: text.trim().slice(0, 3000), lang }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onExternalAbort);
    }

    // Check abort after fetch
    if (signal?.aborted) return fail;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("audio/")) {
      const data = await response.json().catch(() => null);
      if (data?.fallback || data?.error) {
        googleTTSDisabled = true;
        googleTTSRetryAfter = Date.now() + 60_000;
        console.warn("[Google TTS] Disabled for 60s:", data?.error);
        return fail;
      }
      return fail;
    }

    const audioBlob = await response.blob();
    if (audioBlob.size < 100) {
      console.warn("[Google TTS] Audio too small, likely empty");
      return fail;
    }

    // Final abort check before playing
    if (signal?.aborted) return fail;

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    await new Promise<void>((resolve, reject) => {
      // Listen for external abort during playback
      const onAbortDuringPlay = () => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
        URL.revokeObjectURL(audioUrl);
        resolve(); // Resolve gracefully, not reject
      };
      signal?.addEventListener("abort", onAbortDuringPlay, { once: true });

      audio.onended = () => {
        signal?.removeEventListener("abort", onAbortDuringPlay);
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = () => {
        signal?.removeEventListener("abort", onAbortDuringPlay);
        URL.revokeObjectURL(audioUrl);
        reject(new Error("Google TTS playback error"));
      };
      audio.play().catch((err) => {
        signal?.removeEventListener("abort", onAbortDuringPlay);
        reject(err);
      });
    });

    return { played: !signal?.aborted, audio };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("[Google TTS] Request aborted");
    } else {
      console.warn("[Google TTS] Error:", err?.message);
    }
    return fail;
  }
}

/** Check if Google TTS is currently available (not rate-limited) */
export function isGoogleTTSAvailable(): boolean {
  return !googleTTSDisabled || Date.now() >= googleTTSRetryAfter;
}
