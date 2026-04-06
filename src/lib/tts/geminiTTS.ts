/**
 * Gemini TTS — Free neural TTS using Google Gemini 2.5 Flash Preview TTS
 * Tier 0 (highest quality) in Orion's voice cascade.
 * Uses edge function with 7-key rotation. Falls back on 429/error.
 */

let geminiTTSDisabled = false;
let geminiTTSRetryAfter = 0;

export interface GeminiTTSResult {
  played: boolean;
  audio: HTMLAudioElement | null;
}

/**
 * Synthesize speech via Gemini TTS (free, neural quality).
 * Supports AbortSignal for barge-in cancellation.
 */
export async function speakWithGeminiTTS(
  text: string,
  voice: string = "Iapetus",
  signal?: AbortSignal,
): Promise<GeminiTTSResult> {
  const fail: GeminiTTSResult = { played: false, audio: null };
  if (!text?.trim()) return fail;
  if (signal?.aborted) return fail;

  // Check if temporarily disabled (rate limited)
  if (geminiTTSDisabled && Date.now() < geminiTTSRetryAfter) return fail;
  if (geminiTTSDisabled && Date.now() >= geminiTTSRetryAfter) {
    geminiTTSDisabled = false;
  }

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-tts`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

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
        body: JSON.stringify({ text: text.trim().slice(0, 5000), voice }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onExternalAbort);
    }

    if (signal?.aborted) return fail;

    // Handle rate limiting
    if (response.status === 429) {
      geminiTTSDisabled = true;
      geminiTTSRetryAfter = Date.now() + 30_000; // retry after 30s
      console.warn("[Gemini TTS] Rate limited, disabled for 30s");
      return fail;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("audio/")) {
      const data = await response.json().catch(() => null);
      if (data?.fallback || data?.error) {
        geminiTTSDisabled = true;
        geminiTTSRetryAfter = Date.now() + 60_000;
        console.warn("[Gemini TTS] Disabled for 60s:", data?.error);
        return fail;
      }
      return fail;
    }

    const audioBlob = await response.blob();
    if (audioBlob.size < 100) {
      console.warn("[Gemini TTS] Audio too small, likely empty");
      return fail;
    }

    if (signal?.aborted) return fail;

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    await new Promise<void>((resolve, reject) => {
      const onAbortDuringPlay = () => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
        URL.revokeObjectURL(audioUrl);
        resolve();
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
        reject(new Error("Gemini TTS playback error"));
      };
      audio.play().catch((err) => {
        signal?.removeEventListener("abort", onAbortDuringPlay);
        reject(err);
      });
    });

    return { played: !signal?.aborted, audio };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("[Gemini TTS] Request aborted");
    } else {
      console.warn("[Gemini TTS] Error:", err?.message);
    }
    return fail;
  }
}

/** Check if Gemini TTS is currently available */
export function isGeminiTTSAvailable(): boolean {
  return !geminiTTSDisabled || Date.now() >= geminiTTSRetryAfter;
}

/** Available Gemini TTS voices */
export const GEMINI_VOICES = [
  { id: "Zephyr", label: "Zephyr (Brilhante)" },
  { id: "Puck", label: "Puck (Animado)" },
  { id: "Charon", label: "Charon (Informativo)" },
  { id: "Kore", label: "Kore (Firme)" },
  { id: "Fenrir", label: "Fenrir (Empolgado)" },
  { id: "Leda", label: "Leda (Jovem)" },
  { id: "Orus", label: "Orus (Firme)" },
  { id: "Aoede", label: "Aoede (Brisa)" },
] as const;
