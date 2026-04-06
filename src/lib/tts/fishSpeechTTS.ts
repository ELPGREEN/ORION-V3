/**
 * Fish Speech TTS — Zero-shot voice cloning via HuggingFace Spaces
 * Uses reference audio stored in Supabase Storage for each TTS call.
 * Falls back to Gemini TTS → Google TTS cascade if Fish Speech is unavailable.
 */

let fishTTSDisabled = false;
let fishTTSRetryAfter = 0;

export interface FishTTSResult {
  played: boolean;
  audio: HTMLAudioElement | null;
}

/**
 * Get the primary reference audio path for the user's cloned voice
 */
export function getClonedVoiceRefPath(voiceId: string | undefined): string | null {
  if (!voiceId?.startsWith("fish_clone_")) return null;
  // Format: fish_clone_{userId8}_{timestamp}_{storagePath}
  const parts = voiceId.split("__path__");
  return parts[1] || null;
}

/**
 * Synthesize speech using Fish Speech voice clone (zero-shot).
 * Requires a reference audio path in Supabase Storage.
 */
export async function speakWithFishClone(
  text: string,
  referenceStoragePath: string,
  referenceText?: string,
  signal?: AbortSignal,
): Promise<FishTTSResult> {
  const fail: FishTTSResult = { played: false, audio: null };
  if (!text?.trim() || !referenceStoragePath) return fail;
  if (signal?.aborted) return fail;

  // Check if temporarily disabled
  if (fishTTSDisabled && Date.now() < fishTTSRetryAfter) return fail;
  if (fishTTSDisabled && Date.now() >= fishTTSRetryAfter) {
    fishTTSDisabled = false;
  }

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fish-speech-clone`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s for cloning

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
        body: JSON.stringify({
          text: text.trim().slice(0, 3000),
          reference_storage_path: referenceStoragePath,
          reference_text: referenceText || "Olá, esta é minha voz natural.",
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onExternalAbort);
    }

    if (signal?.aborted) return fail;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("audio/")) {
      const data = await response.json().catch(() => null);
      if (data?.fallback || data?.error) {
        fishTTSDisabled = true;
        fishTTSRetryAfter = Date.now() + 120_000; // 2 min cooldown
        console.warn("[Fish Clone TTS] Disabled for 2min:", data?.error);
        return fail;
      }
      return fail;
    }

    const audioBlob = await response.blob();
    if (audioBlob.size < 200) {
      console.warn("[Fish Clone TTS] Audio too small");
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
        reject(new Error("Fish Clone TTS playback error"));
      };
      audio.play().catch((err) => {
        signal?.removeEventListener("abort", onAbortDuringPlay);
        reject(err);
      });
    });

    return { played: !signal?.aborted, audio };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("[Fish Clone TTS] Request aborted");
    } else {
      console.warn("[Fish Clone TTS] Error:", err?.message);
      fishTTSDisabled = true;
      fishTTSRetryAfter = Date.now() + 60_000;
    }
    return fail;
  }
}

/** Check if Fish Clone TTS is currently available */
export function isFishCloneAvailable(): boolean {
  return !fishTTSDisabled || Date.now() >= fishTTSRetryAfter;
}
