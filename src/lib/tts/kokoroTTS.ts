/**
 * Kokoro TTS — Ultra-lightweight local-first TTS client
 * Connects to the orion-voice-space (Hugging Face)
 */

import { buildTTSKey, getCachedTTS, isCacheable, setCachedTTS } from "./ttsCache";

const VOICE_SPACE_URL = "https://ericsonv12-orion-voice-space.hf.space";

export interface KokoroTTSResult {
  played: boolean;
  audio: HTMLAudioElement | null;
}

/**
 * Fetch audio from Kokoro TTS service
 */
export async function fetchKokoroAudio(
  text: string,
  voice: string = "af_heart",
  speed: number = 1.0,
  signal?: AbortSignal
): Promise<Blob | null> {
  if (signal?.aborted) return null;

  // Cache lookup
  let cacheKey: string | null = null;
  if (isCacheable(text)) {
    cacheKey = await buildTTSKey(text, `kokoro-${voice}`, "pt-br", "");
    const cached = await getCachedTTS(cacheKey);
    if (cached) return cached;
  }

  try {
    const formData = new FormData();
    formData.append("text", text);
    formData.append("voice", voice);
    formData.append("speed", String(speed));

    const response = await fetch(`${VOICE_SPACE_URL}/kokoro_tts`, {
      method: "POST",
      body: formData,
      signal,
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    if (blob.size < 100) return null;

    if (cacheKey) {
      void setCachedTTS(cacheKey, blob);
    }

    return blob;
  } catch (err) {
    console.warn("[Kokoro TTS] Fetch error:", err);
    return null;
  }
}

/**
 * Play Kokoro TTS audio
 */
export async function speakWithKokoroTTS(
  text: string,
  voice: string = "af_heart",
  signal?: AbortSignal
): Promise<KokoroTTSResult> {
  if (!text?.trim() || signal?.aborted) return { played: false, audio: null };

  try {
    const blob = await fetchKokoroAudio(text, voice, 1.0, signal);
    if (!blob) return { played: false, audio: null };

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const volume = (window as any).ORION_VOICE_VOLUME ?? 1.0;
    audio.volume = volume;

    return new Promise((resolve) => {
      const cleanup = () => {
        URL.revokeObjectURL(url);
        signal?.removeEventListener("abort", onAbort);
      };

      const onAbort = () => {
        audio.pause();
        cleanup();
        resolve({ played: false, audio: null });
      };

      signal?.addEventListener("abort", onAbort);

      audio.onended = () => {
        cleanup();
        resolve({ played: true, audio });
      };

      audio.onerror = () => {
        cleanup();
        resolve({ played: false, audio: null });
      };

      audio.play().catch(() => {
        cleanup();
        resolve({ played: false, audio: null });
      });
    });
  } catch {
    return { played: false, audio: null };
  }
}
