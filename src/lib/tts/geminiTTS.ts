/**
 * Gemini TTS — Free neural TTS using Google Gemini 2.5 Flash TTS (GA stable)
 * Tier 0 (highest quality) in Orion's voice cascade.
 * 
 * v4: ⚡ Real streaming: Play tokens as they arrive
 */

import { buildTTSKey, getCachedTTS, isCacheable, setCachedTTS } from "./ttsCache";

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
    return false;
  }
  return true;
}

function splitIntoSentences(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= 220) return [trimmed];
  const sentences = trimmed.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) || [trimmed];
  const chunks: string[] = [];
  let first = sentences[0] || "";
  chunks.push(first.trim());
  let current = "";
  for (let i = 1; i < sentences.length; i++) {
    const s = sentences[i];
    if (current.length + s.length > 1500 && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 2);
}

export async function fetchGeminiAudio(
  text: string,
  voice: string,
  signal: AbortSignal,
  stylePrompt?: string,
  lang?: string,
): Promise<Blob | null> {
  if (signal.aborted || isGeminiTTSCoolingDown()) return null;
  let cacheKey: string | null = null;
  if (isCacheable(text)) {
    cacheKey = await buildTTSKey(text, voice, lang, stylePrompt);
    const cached = await getCachedTTS(cacheKey);
    if (cached) return cached;
  }

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-tts`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text: text.slice(0, 8000), voice, prompt: stylePrompt, lang }),
      signal,
    });
    if (response.status === 429) { disableGeminiTTS(5000, "Rate limited"); return null; }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("audio/")) return null;
    const blob = await response.blob();
    if (blob.size < 100) return null;
    if (cacheKey) void setCachedTTS(cacheKey, blob);
    return blob;
  } catch { return null; }
}

export function playAudioBlob(
  blob: Blob,
  signal: AbortSignal,
): Promise<{ audio: HTMLAudioElement | null }> {
  return new Promise((resolve) => {
    if (signal.aborted) { resolve({ audio: null }); return; }
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    const cleanup = () => { try { URL.revokeObjectURL(audioUrl); } catch {} };
    const onAbort = () => {
      audio.pause(); audio.currentTime = 0; audio.src = "";
      cleanup(); resolve({ audio: null });
    };
    signal.addEventListener("abort", onAbort, { once: true });
    audio.onended = () => { signal.removeEventListener("abort", onAbort); cleanup(); resolve({ audio }); };
    audio.onerror = () => { signal.removeEventListener("abort", onAbort); cleanup(); resolve({ audio: null }); };
    audio.play().catch(() => { signal.removeEventListener("abort", onAbort); cleanup(); resolve({ audio: null }); });
  });
}

/**
 * ⚡ Real-time Streaming TTS
 */
export async function streamOrionSpeech(
  textStream: ReadableStream<Uint8Array>,
  voice: string = "Enceladus",
  signal: AbortSignal,
  stylePrompt?: string,
  lang?: string,
): Promise<void> {
  const reader = textStream.getReader();
  const decoder = new TextDecoder();
  let sentenceBuffer = "";
  const queue: string[] = [];
  let isPlaying = false;

  const processQueue = async () => {
    if (isPlaying || queue.length === 0) return;
    isPlaying = true;
    while (queue.length > 0) {
      const sentence = queue.shift();
      if (sentence && !signal.aborted) {
        const blob = await fetchGeminiAudio(sentence.slice(0, 5000), voice, signal, stylePrompt, lang);
        if (blob) await playAudioBlob(blob, signal);
      }
    }
    isPlaying = false;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });

      // Parse SSE if needed, or assume raw text if coming from a proxy
      // For ai-orchestrator SSE: data: {"type":"token", "content":"..."}
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "token") {
              sentenceBuffer += data.content;
            }
          } catch {}
        } else if (!line.startsWith("event: ") && line.trim()) {
           sentenceBuffer += line; // Raw text fallback
        }

        const sentences = sentenceBuffer.split(/[.!?\n]/);
        if (sentences.length > 1) {
          sentenceBuffer = sentences.pop() || "";
          for (const s of sentences) {
            if (s.trim().length > 2) {
              queue.push(s.trim());
              processQueue();
            }
          }
        }
      }
    }
    if (sentenceBuffer.trim().length > 0) {
      queue.push(sentenceBuffer.trim());
      processQueue();
    }
  } finally {
    reader.releaseLock();
  }
}

export async function speakWithGeminiTTS(
  text: string,
  voice: string = "Enceladus",
  signal?: AbortSignal,
  stylePrompt?: string,
  lang?: string,
): Promise<GeminiTTSResult> {
  const fail: GeminiTTSResult = { played: false, audio: null };
  if (!text?.trim()) return fail;
  const localController = new AbortController();
  const onExternalAbort = () => localController.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const sentences = splitIntoSentences(text);
    let anyPlayed = false;
    let lastAudio: HTMLAudioElement | null = null;
    for (const s of sentences) {
      const blob = await fetchGeminiAudio(s, voice, localController.signal, stylePrompt, lang);
      if (blob) {
        const res = await playAudioBlob(blob, localController.signal);
        if (res.audio) { anyPlayed = true; lastAudio = res.audio; }
      }
    }
    return { played: anyPlayed, audio: lastAudio };
  } catch { return fail; }
  finally { signal?.removeEventListener("abort", onExternalAbort); }
}

export function isGeminiTTSAvailable(): boolean { return !isGeminiTTSCoolingDown(); }
export const GEMINI_VOICES = [{ id: "Enceladus", label: "Enceladus (Padrão Orion)" }] as const;
