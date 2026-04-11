/**
 * Gemini TTS — Free neural TTS using Google Gemini 2.5 Flash TTS (GA stable)
 * Tier 0 (highest quality) in Orion's voice cascade.
 * Uses edge function with key rotation. Falls back on 429/error.
 * 
 * v2: Gap-free playback via pre-buffering + larger chunks
 */

let geminiTTSDisabled = false;
let geminiTTSRetryAfter = 0;

export interface GeminiTTSResult {
  played: boolean;
  audio: HTMLAudioElement | null;
}

function disableGeminiTTS(retryAfterMs: number, reason: string): void {
  const safeRetryMs = Math.max(3000, Math.min(retryAfterMs, 60_000));
  geminiTTSDisabled = true;
  geminiTTSRetryAfter = Date.now() + safeRetryMs;
  console.warn(`[Gemini TTS] ${reason}; disabled for ${Math.ceil(safeRetryMs / 1000)}s`);
}

function isGeminiTTSCoolingDown(): boolean {
  if (!geminiTTSDisabled) return false;
  if (Date.now() >= geminiTTSRetryAfter) {
    geminiTTSDisabled = false;
    geminiTTSRetryAfter = 0;
    console.log("[Gemini TTS] Cooldown ended, re-enabling");
    return false;
  }
  return true;
}

/**
 * Split text into chunks for TTS. Short texts (≤2000 chars) stay as a single
 * chunk to avoid any pauses. Longer texts are split at sentence boundaries
 * into ~1200-char chunks.
 */
function splitIntoSentences(text: string): string[] {
  if (text.length <= 2000) return [text.trim()];

  const sentences = text.match(/[^.!?…]+[.!?…]+\s*|[^.!?…]+$/g) || [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if (current.length + s.length > 1200 && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 2);
}

/**
 * Fetch audio for a single chunk from Gemini TTS edge function.
 */
async function fetchGeminiAudio(
  text: string,
  voice: string,
  signal: AbortSignal,
  stylePrompt?: string,
  lang?: string,
): Promise<Blob | null> {
  if (signal.aborted || isGeminiTTSCoolingDown()) return null;

  const sentenceController = new AbortController();
  const sentenceTimeout = setTimeout(() => sentenceController.abort(), 25000);
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
      disableGeminiTTS(5_000, "Rate limited by edge function");
      return null;
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("audio/")) {
      const data = await response.json().catch(() => null);

      if (data?.fallback || data?.error) {
        if (data?.rate_limited) {
          const retryAfterMs = typeof data?.retry_after_ms === "number" && Number.isFinite(data.retry_after_ms)
            ? data.retry_after_ms
            : 5_000;
          disableGeminiTTS(retryAfterMs, data?.error || "Rate limited");
        } else {
          console.warn("[Gemini TTS] Server fallback (no cooldown):", data?.error);
        }
        return null;
      }

      if (!response.ok) {
        console.warn(`[Gemini TTS] Edge function error ${response.status} — will retry next call`);
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
 * Accepts an optional `nextBlobUrl` to pre-create the next Audio element for
 * gap-free transitions.
 */
function playAudioBlob(
  blob: Blob,
  signal: AbortSignal,
  nextBlobUrl?: string,
): Promise<{ audio: HTMLAudioElement | null; nextAudio: HTMLAudioElement | null }> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve({ audio: null, nextAudio: null });
      return;
    }

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    // Pre-create next audio element for gap-free playback
    let nextAudio: HTMLAudioElement | null = null;
    if (nextBlobUrl) {
      nextAudio = new Audio(nextBlobUrl);
      nextAudio.preload = "auto";
    }

    const cleanup = () => URL.revokeObjectURL(audioUrl);
    const onAbort = () => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
      cleanup();
      if (nextAudio) { nextAudio.src = ""; nextAudio = null; }
      resolve({ audio: null, nextAudio: null });
    };
    signal.addEventListener("abort", onAbort, { once: true });

    audio.onended = () => {
      signal.removeEventListener("abort", onAbort);
      cleanup();
      resolve({ audio, nextAudio });
    };
    audio.onerror = (e) => {
      console.warn("[Gemini TTS] Audio playback error:", e);
      signal.removeEventListener("abort", onAbort);
      cleanup();
      resolve({ audio: null, nextAudio });
    };

    // Unlock AudioContext if suspended (autoplay policy)
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      ctx.close().catch(() => {});
    } catch {}

    audio.play().catch((err) => {
      console.warn("[Gemini TTS] audio.play() blocked:", err?.message);
      signal.removeEventListener("abort", onAbort);
      cleanup();
      resolve({ audio: null, nextAudio });
    });
  });
}

/**
 * Synthesize speech via Gemini TTS with parallel fetch + gap-free sequential playback.
 * 
 * Strategy:
 * 1. ALL chunks are fetched in parallel (unchanged)
 * 2. Blob URLs are pre-created so the next Audio element can preload
 *    while the current one plays → zero gap between sentences
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
  if (signal?.aborted || isGeminiTTSCoolingDown()) return fail;

  const localController = new AbortController();
  const onExternalAbort = () => localController.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const sentences = splitIntoSentences(text);

    // ── Fetch ALL sentences in parallel ──
    const blobPromises = sentences.map((s) =>
      fetchGeminiAudio(s, voice, localController.signal, stylePrompt, lang)
    );
    const blobs = await Promise.all(blobPromises);

    if (localController.signal.aborted) {
      signal?.removeEventListener("abort", onExternalAbort);
      return fail;
    }

    // Filter to valid blobs and pre-create object URLs
    const validBlobs: Blob[] = [];
    const blobUrls: string[] = [];
    for (const blob of blobs) {
      if (blob) {
        validBlobs.push(blob);
        blobUrls.push(URL.createObjectURL(blob));
      }
    }

    if (validBlobs.length === 0) {
      // ═══ FALLBACK: Try Google Cloud TTS when Gemini fails ═══
      console.log("[Gemini TTS] No valid blobs, trying Google Cloud TTS fallback");
      try {
        const cloudResult = await fetchGoogleCloudTTSFallback(text, localController.signal);
        if (cloudResult) {
          const result = await playAudioBlob(cloudResult, localController.signal);
          signal?.removeEventListener("abort", onExternalAbort);
          return { played: !!result.audio, audio: result.audio };
        }
      } catch (e) {
        console.warn("[Gemini TTS] Google Cloud TTS fallback also failed:", e);
      }
      signal?.removeEventListener("abort", onExternalAbort);
      return fail;
    }

    // ── Play sequentially with pre-buffered next element ──
    let anyPlayed = false;
    let lastAudio: HTMLAudioElement | null = null;

    for (let i = 0; i < validBlobs.length; i++) {
      if (localController.signal.aborted) break;

      // Revoke the pre-created URL since playAudioBlob creates its own
      URL.revokeObjectURL(blobUrls[i]);

      // Pass next blob URL for preloading (gap-free transition)
      const nextUrl = i + 1 < validBlobs.length ? blobUrls[i + 1] : undefined;
      const result = await playAudioBlob(validBlobs[i], localController.signal, nextUrl);

      if (result.audio) {
        anyPlayed = true;
        lastAudio = result.audio;
      }

      // If we have a pre-loaded next audio and it's ready, play it immediately
      if (result.nextAudio && i + 1 < validBlobs.length) {
        // The nextAudio was pre-created with the blob URL — start it now
        try {
          await result.nextAudio.play();
          // Wait for it to finish
          await new Promise<void>((resolve) => {
            result.nextAudio!.onended = () => resolve();
            result.nextAudio!.onerror = () => resolve();
            const onAbort = () => {
              result.nextAudio!.pause();
              resolve();
            };
            localController.signal.addEventListener("abort", onAbort, { once: true });
          });
          anyPlayed = true;
          lastAudio = result.nextAudio;
          // Clean up the URL
          URL.revokeObjectURL(blobUrls[i + 1]);
          i++; // Skip next iteration since we already played it
        } catch {
          // Pre-play failed, will be played normally in next loop iteration
        }
      }
    }

    // Clean up any remaining URLs
    for (let i = 0; i < blobUrls.length; i++) {
      try { URL.revokeObjectURL(blobUrls[i]); } catch {}
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
  return !isGeminiTTSCoolingDown();
}

/** Available Gemini TTS voices */
export const GEMINI_VOICES = [
  { id: "Charon", label: "Charon (Padrão Orion — Sério/JARVIS)" },
  { id: "Orus", label: "Orus (Calmo/Grave)" },
  { id: "Algieba", label: "Algieba (Neutro)" },
  { id: "Kore", label: "Kore (Firme)" },
  { id: "Zephyr", label: "Zephyr (Brilhante)" },
  { id: "Puck", label: "Puck (Animado)" },
  { id: "Fenrir", label: "Fenrir (Empolgado)" },
  { id: "Leda", label: "Leda (Jovem)" },
  { id: "Aoede", label: "Aoede (Brisa)" },
] as const;

// ═══ Google Cloud TTS Fallback ═══
async function fetchGoogleCloudTTSFallback(
  text: string,
  signal: AbortSignal,
): Promise<Blob | null> {
  if (signal.aborted) return null;
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
        text: text.slice(0, 3000),
        voice: "neural2-grave",
        encoding: "OGG_OPUS",
        speakingRate: 1.05,
      }),
      signal,
    });

    if (signal.aborted) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("audio/")) {
      console.warn("[Cloud TTS Fallback] Non-audio response");
      return null;
    }

    const blob = await response.blob();
    if (blob.size < 100) return null;
    console.log(`[Cloud TTS Fallback] ✅ ${(blob.size / 1024).toFixed(1)}KB audio`);
    return blob;
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.warn("[Cloud TTS Fallback] Error:", err?.message);
    }
    return null;
  }
}
