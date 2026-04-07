/**
 * Gemini TTS — Free neural TTS using Google Gemini 2.5 Flash Preview TTS
 * Tier 0 (highest quality) in Orion's voice cascade.
 * Uses edge function with key rotation. Falls back on 429/error.
 */

let geminiTTSDisabled = false;
let geminiTTSRetryAfter = 0;

export interface GeminiTTSResult {
  played: boolean;
  audio: HTMLAudioElement | null;
}

/**
 * Split text into sentence-level chunks for progressive playback.
 */
function splitIntoSentences(text: string): string[] {
  const sentences = text.match(/[^.!?…;]+[.!?…;]+\s*/g) || [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current.length + s.length > 200 && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(c => c.length > 2);
}

/**
 * Fetch audio for a single chunk from Gemini TTS edge function.
 * Per-sentence timeout of 10s to prevent hanging.
 */
async function fetchGeminiAudio(
  text: string,
  voice: string,
  signal: AbortSignal,
  stylePrompt?: string,
  lang?: string,
): Promise<Blob | null> {
  // Per-sentence abort with 10s timeout
  const sentenceController = new AbortController();
  const sentenceTimeout = setTimeout(() => sentenceController.abort(), 10000);
  const onParentAbort = () => sentenceController.abort();
  signal.addEventListener("abort", onParentAbort, { once: true });

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-tts`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text: text.slice(0, 5000), voice, prompt: stylePrompt, lang }),
      signal: sentenceController.signal,
    });

    if (sentenceController.signal.aborted || signal.aborted) return null;

    if (response.status === 429) {
      geminiTTSDisabled = true;
      geminiTTSRetryAfter = Date.now() + 30_000;
      console.warn("[Gemini TTS] Rate limited, disabled for 30s");
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    
    // If response is JSON, it's an error (even if status 200)
    if (!contentType.includes("audio/")) {
      const data = await response.json().catch(() => null);
      if (data?.fallback || data?.error) {
        console.warn("[Gemini TTS] Server error:", data?.error);
        // Don't disable for long — retry next sentence
        return null;
      }
      return null;
    }

    const blob = await response.blob();
    return blob.size >= 100 ? blob : null;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("[Gemini TTS] Sentence fetch timed out or aborted");
    } else {
      console.warn("[Gemini TTS] Fetch error:", err?.message);
    }
    return null;
  } finally {
    clearTimeout(sentenceTimeout);
    signal.removeEventListener("abort", onParentAbort);
  }
}

/**
 * Play a single audio blob. Returns a promise that resolves when playback ends.
 */
function playAudioBlob(blob: Blob, signal: AbortSignal): Promise<HTMLAudioElement | null> {
  return new Promise((resolve) => {
    if (signal.aborted) { resolve(null); return; }
    
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    const cleanup = () => URL.revokeObjectURL(audioUrl);
    const onAbort = () => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
      cleanup();
      resolve(null);
    };
    signal.addEventListener("abort", onAbort, { once: true });

    audio.onended = () => {
      signal.removeEventListener("abort", onAbort);
      cleanup();
      resolve(audio);
    };
    audio.onerror = () => {
      signal.removeEventListener("abort", onAbort);
      cleanup();
      resolve(null);
    };
    audio.play().catch(() => {
      signal.removeEventListener("abort", onAbort);
      cleanup();
      resolve(null);
    });
  });
}

/**
 * Synthesize speech via Gemini TTS with progressive sentence-by-sentence playback.
 * Fetches next sentence while current one plays (pipeline).
 * NO global timeout — each sentence has its own 10s fetch timeout.
 */
export async function speakWithGeminiTTS(
  text: string,
  voice: string = "Charon",
  signal?: AbortSignal,
  stylePrompt?: string,
  lang?: string,
): Promise<GeminiTTSResult> {
  const fail: GeminiTTSResult = { played: false, audio: null };
  if (!text?.trim()) return fail;
  if (signal?.aborted) return fail;

  if (geminiTTSDisabled && Date.now() < geminiTTSRetryAfter) return fail;
  if (geminiTTSDisabled && Date.now() >= geminiTTSRetryAfter) {
    geminiTTSDisabled = false;
  }

  // Use a local abort controller that respects the parent signal
  const localController = new AbortController();
  const onExternalAbort = () => localController.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const sentences = splitIntoSentences(text);
    let anyPlayed = false;
    let lastAudio: HTMLAudioElement | null = null;
    let consecutiveFailures = 0;

    // Pipeline: fetch next while playing current
    let nextBlobPromise: Promise<Blob | null> | null = null;

    for (let i = 0; i < sentences.length; i++) {
      if (localController.signal.aborted) break;

      // Get current blob (either pre-fetched or fetch now)
      let currentBlob: Blob | null;
      if (nextBlobPromise) {
        currentBlob = await nextBlobPromise;
        nextBlobPromise = null;
      } else {
        currentBlob = await fetchGeminiAudio(sentences[i], voice, localController.signal, stylePrompt, lang);
      }

      if (localController.signal.aborted) break;

      if (!currentBlob) {
        consecutiveFailures++;
        // If first 2 sentences fail, abort early — Gemini TTS is down
        if (consecutiveFailures >= 2) {
          console.warn("[Gemini TTS] 2+ consecutive failures — aborting pipeline");
          break;
        }
        continue;
      }

      consecutiveFailures = 0;

      // Start fetching next sentence while current plays
      if (i + 1 < sentences.length && !localController.signal.aborted) {
        nextBlobPromise = fetchGeminiAudio(sentences[i + 1], voice, localController.signal, stylePrompt, lang);
      }

      // Play current
      const audio = await playAudioBlob(currentBlob, localController.signal);
      if (audio) {
        anyPlayed = true;
        lastAudio = audio;
      }
    }

    signal?.removeEventListener("abort", onExternalAbort);
    return { played: anyPlayed, audio: lastAudio };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.warn("[Gemini TTS] Request aborted");
    } else {
      console.warn("[Gemini TTS] Error:", err?.message);
    }
    signal?.removeEventListener("abort", onExternalAbort);
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
