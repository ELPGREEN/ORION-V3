/**
 * Kokoro-82M TTS Client for Orion.
 * 
 * Tier 1: Kokoro-82M via DeepInfra — ultra-natural voice
 * Tier 2: Returns false so caller handles Web Speech fallback
 * 
 * IMPORTANT: No internal Web Speech fallback to prevent dual-voice overlap.
 */

import { getOrionVoice, ORION_VOICE_PARAMS } from "@/lib/voice/voicePicker";

let kokoroAvailable: boolean | null = null;

export async function speakWithKokoro(
  text: string,
  options?: {
    voice?: string;
    speed?: number;
    onStart?: () => void;
    onEnd?: () => void;
    signal?: AbortSignal;
  }
): Promise<boolean> {
  const cleanText = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/[\u{1F600}-\u{1FAFF}]/gu, "")
    .replace(/^[-•*]\s+/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .trim();

  if (!cleanText || cleanText.length < 2) return false;

  // If Kokoro known down, return false immediately
  if (kokoroAvailable === false) return false;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kokoro-tts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text: cleanText.slice(0, 4800),
          voice: options?.voice || "bm_george",
          speed: options?.speed || 1.0,
        }),
        signal: options?.signal,
      }
    );

    if (!response.ok) {
      console.warn(`[Kokoro] DeepInfra error: ${response.status}`);
      kokoroAvailable = false;
      // 402 = no balance, 502 = upstream down — retry after 5min
      setTimeout(() => { kokoroAvailable = null; }, 5 * 60 * 1000);
      // Throw so caller's circuit breaker can detect the failure
      throw new Error(`Kokoro API error: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const errData = await response.json();
      if (errData.fallback || errData.error) {
        console.warn("[Kokoro] Error:", errData.error);
        kokoroAvailable = false;
        setTimeout(() => { kokoroAvailable = null; }, 60000);
        return false;
      }
    }

    const audioBlob = await response.blob();
    if (audioBlob.size < 100) return false;

    kokoroAvailable = true;
    options?.onStart?.();

    const audioUrl = URL.createObjectURL(audioBlob);
    await playAudioUrl(audioUrl, options?.signal);
    URL.revokeObjectURL(audioUrl);

    options?.onEnd?.();
    return true;

  } catch (error) {
    if ((error as Error).name === "AbortError") return false;
    console.warn("[Kokoro] Failed:", error);
    kokoroAvailable = false;
    setTimeout(() => { kokoroAvailable = null; }, 60000);
    return false;
  }
}

async function playAudioUrl(url: string, signal?: AbortSignal): Promise<void> {
  const audio = new Audio(url);
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }

    const abortHandler = () => { audio.pause(); audio.currentTime = 0; reject(new DOMException("Aborted", "AbortError")); };
    signal?.addEventListener("abort", abortHandler, { once: true });

    audio.onended = () => { signal?.removeEventListener("abort", abortHandler); resolve(); };
    audio.onerror = () => { signal?.removeEventListener("abort", abortHandler); reject(new Error("Playback failed")); };
    audio.play().catch(reject);
  });
}

export function isKokoroAvailable(): boolean | null {
  return kokoroAvailable;
}

export async function checkKokoroAvailability(): Promise<boolean> {
  try {
    const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kokoro-tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text: "ok", voice: "bm_george" }),
      signal: AbortSignal.timeout(8000),
    });
    kokoroAvailable = r.ok;
    return kokoroAvailable;
  } catch { kokoroAvailable = false; return false; }
}
