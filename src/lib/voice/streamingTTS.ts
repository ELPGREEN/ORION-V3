/**
 * ─── Sentence-Level Streaming TTS ───
 * Starts speaking completed sentences while LLM is still generating.
 * Primary: Piper TTS (neural WASM). Fallback: Browser Web Speech.
 */

import { cleanTextForSpeech } from "@/hooks/useNeuralVoice";
import { getOrionVoice, ORION_VOICE_PARAMS } from "@/lib/voice/voicePicker";

const SENTENCE_END = /[.!?…]\s+/;
const MIN_SENTENCE_LEN = 15;

export interface StreamingTTSController {
  feed(chunk: string): void;
  finish(): void;
  cancel(): void;
  readonly active: boolean;
}

export function createStreamingTTS(options?: {
  onSentenceStart?: (sentence: string, index: number) => void;
  onAllDone?: () => void;
}): StreamingTTSController {
  let buffer = "";
  let sentenceIndex = 0;
  let cancelled = false;
  let _active = false;
  const queue: string[] = [];
  let processing = false;

  function extractSentences(text: string): { sentences: string[]; remaining: string } {
    const sentences: string[] = [];
    let remaining = text;

    while (true) {
      const match = remaining.match(SENTENCE_END);
      if (!match || match.index === undefined) break;

      const end = match.index + match[0].length;
      const sentence = remaining.slice(0, end).trim();
      remaining = remaining.slice(end);

      if (sentence.length >= MIN_SENTENCE_LEN) {
        sentences.push(sentence);
      } else if (sentences.length > 0) {
        sentences[sentences.length - 1] += " " + sentence;
      } else {
        remaining = sentence + " " + remaining;
        break;
      }
    }

    return { sentences, remaining };
  }

  async function speakSentence(text: string): Promise<void> {
    if (cancelled) return;
    const clean = cleanTextForSpeech(text);
    if (!clean || clean.length < 3) return;

    options?.onSentenceStart?.(clean, sentenceIndex++);

    // Direct Web Speech (free, instant)
    if (typeof window !== "undefined" && window.speechSynthesis) {
      await new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = "pt-BR";
        u.rate = ORION_VOICE_PARAMS.rate;
        u.pitch = ORION_VOICE_PARAMS.pitch;
        u.volume = ORION_VOICE_PARAMS.volume;
        const voice = getOrionVoice();
        if (voice) u.voice = voice;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        window.speechSynthesis.speak(u);
      });
    }
  }

  async function processQueue() {
    if (processing || cancelled) return;
    processing = true;
    _active = true;

    while (queue.length > 0 && !cancelled) {
      const sentence = queue.shift()!;
      await speakSentence(sentence);
    }

    processing = false;
    if (queue.length === 0) {
      _active = false;
      if (!cancelled) options?.onAllDone?.();
    }
  }

  return {
    feed(chunk: string) {
      if (cancelled) return;
      buffer += chunk;
      const { sentences, remaining } = extractSentences(buffer);
      buffer = remaining;
      if (sentences.length > 0) {
        queue.push(...sentences);
        processQueue();
      }
    },

    finish() {
      if (cancelled) return;
      const remaining = buffer.trim();
      buffer = "";
      if (remaining.length >= 5) {
        queue.push(remaining);
      }
      processQueue();
    },

    cancel() {
      cancelled = true;
      queue.length = 0;
      buffer = "";
      _active = false;
      try { window.speechSynthesis?.cancel(); } catch {}
    },

    get active() { return _active; },
  };
}
