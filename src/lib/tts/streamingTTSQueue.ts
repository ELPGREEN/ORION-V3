/**
 * Streaming TTS Queue — Real-time speech as text streams in
 * 
 * Pre-fetches audio for upcoming sentences while current one plays.
 * No gaps between sentences — audio N+1 is ready before audio N finishes.
 * Integrates with mic arbiter to stop/restart microphone properly.
 */

import { cleanTextForSpeech } from "@/hooks/useNeuralVoice";

const ORION_STREAMING_PROMPT = `Você é ORION, IA Lumen7 AquaMonkey Fusion. Fale CONTÍNUO sem pausas. Máximo 0.15s entre frases. Voz masculina tenor ~200Hz, calorosa. Ritmo moderado-rápido como podcast brasileiro.`;

interface QueueItem {
  text: string;
  blobPromise: Promise<Blob | null>;
}

interface StreamingTTSOptions {
  onStartSpeaking?: () => void;
  onStopSpeaking?: () => void;
  /** Called once before first audio plays — stop mic here */
  onMicShouldStop?: () => void;
  /** Called after ALL audio finishes — restart mic here */
  onMicShouldRestart?: () => void;
}

export class StreamingTTSQueue {
  private queue: QueueItem[] = [];
  private playing = false;
  private aborted = false;
  private currentAudio: HTMLAudioElement | null = null;
  private onStartSpeaking?: () => void;
  private onStopSpeaking?: () => void;
  private onMicShouldStop?: () => void;
  private onMicShouldRestart?: () => void;
  private micStopped = false;
  /** Pre-decoded AudioBuffers for gapless playback */
  private audioContext: AudioContext | null = null;

  constructor(opts?: StreamingTTSOptions) {
    this.onStartSpeaking = opts?.onStartSpeaking;
    this.onStopSpeaking = opts?.onStopSpeaking;
    this.onMicShouldStop = opts?.onMicShouldStop;
    this.onMicShouldRestart = opts?.onMicShouldRestart;
  }

  /** Add a sentence — audio fetch starts IMMEDIATELY (parallel with current playback) */
  push(text: string) {
    if (this.aborted) return;
    const clean = cleanTextForSpeech(text).slice(0, 3000);
    if (!clean || clean.length < 3) return;

    // Start fetching audio RIGHT NOW — don't wait for current playback to finish
    const blobPromise = this.fetchAudio(clean);
    this.queue.push({ text: clean, blobPromise });

    // Start playing if not already
    if (!this.playing) {
      this.playing = true;
      // Stop mic BEFORE first audio plays
      if (!this.micStopped) {
        this.micStopped = true;
        this.onMicShouldStop?.();
      }
      this.onStartSpeaking?.();
      void this.processQueue();
    }
  }

  /** Abort all pending and playing audio */
  abort() {
    this.aborted = true;
    this.queue = [];
    if (this.currentAudio) {
      try { this.currentAudio.pause(); this.currentAudio.src = ""; } catch {}
      this.currentAudio = null;
    }
    this.playing = false;
    this.onStopSpeaking?.();
    // Restart mic on abort too
    if (this.micStopped) {
      this.micStopped = false;
      this.onMicShouldRestart?.();
    }
  }

  /** Check if queue is actively playing or has pending items */
  get isActive() {
    return this.playing || this.queue.length > 0;
  }

  /** Wait for all queued audio to finish playing */
  async waitForCompletion(): Promise<void> {
    while (this.playing || this.queue.length > 0) {
      if (this.aborted) return;
      await new Promise(r => setTimeout(r, 100));
    }
  }

  private async fetchAudio(text: string): Promise<Blob | null> {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-tts`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text,
          voice: "Kore",
          prompt: ORION_STREAMING_PROMPT,
          lang: "pt-BR",
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("audio/")) return null;

      const blob = await response.blob();
      return blob.size >= 100 ? blob : null;
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.warn("[StreamingTTS] Fetch error:", err?.message);
      }
      return null;
    }
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 && !this.aborted) {
      const item = this.queue.shift()!;

      try {
        // Audio was pre-fetched — should be ready or nearly ready
        const blob = await item.blobPromise;
        if (!blob || this.aborted) continue;

        await this.playBlob(blob);
      } catch (err) {
        console.warn("[StreamingTTS] Playback error:", err);
      }
    }

    this.playing = false;
    this.onStopSpeaking?.();
    
    // Restart mic after all audio finishes
    if (this.micStopped) {
      this.micStopped = false;
      this.onMicShouldRestart?.();
    }
  }

  private playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      if (this.aborted) { resolve(); return; }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.currentAudio = audio;
      // Minimize latency
      audio.preload = "auto";

      const cleanup = () => {
        URL.revokeObjectURL(url);
        this.currentAudio = null;
      };

      audio.onended = () => { cleanup(); resolve(); };
      audio.onerror = () => { cleanup(); resolve(); };

      audio.play().catch(() => { cleanup(); resolve(); });
    });
  }
}
