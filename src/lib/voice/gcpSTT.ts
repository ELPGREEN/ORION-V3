/**
 * Google Cloud STT Client — utterance-based capture
 * Buffers speech locally and sends the FULL utterance after silence,
 * avoiding cut-off phrases and hallucinated chunk merges.
 * 
 * v2: Supports pause/resume to keep mic stream open continuously
 * without AudioContext teardown (eliminates mic cycling sounds).
 */
import { supabase } from "@/integrations/supabase/client";

interface GCPSTTOptions {
  languageCode?: string;
  sampleRate?: number;
  chunkIntervalMs?: number;
  onInterim?: (text: string) => void;
  onFinal?: (text: string, confidence: number) => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
}

export interface GCPSTTSession {
  start: () => Promise<boolean>;
  stop: () => void;
  destroy: () => void;
  pause: () => void;
  resume: () => void;
  isActive: () => boolean;
  isPaused: () => boolean;
}

const PROCESSOR_BUFFER_SIZE = 2048; // Smaller buffer = faster reaction (~43ms @ 48kHz)
const PRE_ROLL_FRAMES = 6; // More pre-roll to catch first phoneme cleanly
const FLUSH_POLL_MS = 60; // Aggressive poll for instant turn detection
const SPEECH_RMS_THRESHOLD = 0.01;
// ULTRA mode: 500ms silence — JARVIS-like instant response
const DEFAULT_SILENCE_MS = 500;

/** Convert Float32Array PCM → Int16 LINEAR16 base64 */
function float32ToLinear16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Downsample audio from sourceSampleRate to targetSampleRate */
function downsample(buffer: Float32Array, sourceSampleRate: number, targetSampleRate: number): Float32Array {
  if (sourceSampleRate === targetSampleRate) return buffer;
  const ratio = sourceSampleRate / targetSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const idx = Math.round(i * ratio);
    result[i] = buffer[Math.min(idx, buffer.length - 1)];
  }
  return result;
}

/** RMS amplitude — more reliable than peak for speech detection */
function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

export function createGCPSTTSession(options: GCPSTTOptions = {}): GCPSTTSession {
  const {
    languageCode = "pt-BR",
    sampleRate = 16000,
    chunkIntervalMs = 1400,
    onInterim,
    onFinal,
    onError,
    signal,
  } = options;

  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let processor: ScriptProcessorNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let active = false;
  let paused = false;
  let sending = false;
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let preRollBuffers: Float32Array[] = [];
  let utteranceBuffers: Float32Array[] = [];
  let utteranceActive = false;
  let lastSpeechAt = 0;
  let utteranceStartedAt = 0;

  const silenceDurationMs = DEFAULT_SILENCE_MS;
  const maxUtteranceMs = Math.max(12000, chunkIntervalMs * 8);

  const pushPreRollFrame = (frame: Float32Array) => {
    preRollBuffers.push(frame);
    if (preRollBuffers.length > PRE_ROLL_FRAMES) {
      preRollBuffers.shift();
    }
  };

  const resetUtterance = () => {
    utteranceBuffers = [];
    utteranceActive = false;
    lastSpeechAt = 0;
    utteranceStartedAt = 0;
  };

  const flushUtterance = async (force = false) => {
    if (sending || utteranceBuffers.length === 0) return;
    sending = true;

    const buffers = utteranceBuffers;
    resetUtterance();

    try {
      const totalLength = buffers.reduce((acc, b) => acc + b.length, 0);
      const sourceSR = audioContext?.sampleRate || 48000;
      const minSamples = Math.floor(sourceSR * 0.3); // 300ms (was 600ms) — accept short commands like "para"

      if (totalLength < minSamples) {
        return;
      }

      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const buf of buffers) {
        merged.set(buf, offset);
        offset += buf.length;
      }

      const downsampled = downsample(merged, sourceSR, sampleRate);
      const rms = calculateRMS(downsampled);

      if (!force && rms < SPEECH_RMS_THRESHOLD) {
        return;
      }

      const base64 = float32ToLinear16Base64(downsampled);
      onInterim?.("...");

      const { data, error } = await supabase.functions.invoke("google-stt", {
        body: { audio: base64, sampleRate, languageCode },
      });

      if (error) {
        console.warn("[GCP-STT] Edge function error:", error.message);
        onError?.(error.message);
        return;
      }

      if (data?.text) {
        const confidence = data.confidence || 0;
        console.log(`[GCP-STT] utterance="${data.text}" (conf: ${(confidence * 100).toFixed(1)}%)`);
        onFinal?.(data.text, confidence);
      }
    } catch (err: any) {
      console.warn("[GCP-STT] Send error:", err.message);
      onError?.(err.message);
    } finally {
      sending = false;
    }
  };

  const start = async (): Promise<boolean> => {
    if (active && audioContext?.state === "running") return true;

    try {
      const persistentMic = (window as any).__orion_persistent_mic__;
      const stream = persistentMic?.stream?.active
        ? persistentMic.stream
        : await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            },
          });

      mediaStream = stream;
      // Reuse gesture-warmed AudioContext if available (prevents "suspended" on mobile)
      const sharedCtx = (window as any).__orion_shared_audio_ctx__;
      if (sharedCtx && sharedCtx.state !== 'closed') {
        audioContext = sharedCtx;
      } else {
        audioContext = new AudioContext({ sampleRate: 48000 });
        (window as any).__orion_shared_audio_ctx__ = audioContext;
      }
      if (audioContext.state === "suspended") {
        try {
          await audioContext.resume();
        } catch (err) {
          console.warn("[GCP-STT] AudioContext resume blocked:", err);
        }
      }
      if (audioContext.state !== "running") {
        console.warn("[GCP-STT] AudioContext not running — falling back", audioContext.state);
        onError?.("audio-context-not-running");
        try { await audioContext.close(); } catch {}
        audioContext = null;
        return false;
      }
      source = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!active || paused) return;

        const frame = new Float32Array(e.inputBuffer.getChannelData(0));
        const rms = calculateRMS(frame);
        const now = Date.now();
        const isSpeech = rms >= SPEECH_RMS_THRESHOLD;

        if (isSpeech) {
          if (!utteranceActive) {
            utteranceActive = true;
            utteranceStartedAt = now;
            utteranceBuffers = [...preRollBuffers, frame];
            onInterim?.("...");
          } else {
            utteranceBuffers.push(frame);
          }
          lastSpeechAt = now;
        } else if (utteranceActive) {
          // Keep trailing silence so the last phonemes are not clipped.
          utteranceBuffers.push(frame);
        }

        pushPreRollFrame(frame);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      active = true;
      paused = false;
      resetUtterance();
      preRollBuffers = [];

      flushTimer = setInterval(() => {
        if (!active || paused || sending || !utteranceActive || utteranceBuffers.length === 0) return;

        const now = Date.now();
        const silenceElapsed = lastSpeechAt > 0 ? now - lastSpeechAt : 0;
        const utteranceElapsed = utteranceStartedAt > 0 ? now - utteranceStartedAt : 0;

        if (silenceElapsed >= silenceDurationMs || utteranceElapsed >= maxUtteranceMs) {
          void flushUtterance(utteranceElapsed >= maxUtteranceMs);
        }
      }, FLUSH_POLL_MS);

      if (signal) {
        signal.addEventListener("abort", stop, { once: true });
      }

      console.log("[GCP-STT] Session started — always-listening mode, silence tolerance: 3s");
      return true;
    } catch (err: any) {
      console.error("[GCP-STT] Failed to start:", err.message);
      onError?.(err.message);
      return false;
    }
  };

  /**
   * Pause processing without tearing down AudioContext or mic stream.
   * The mic stays open — no click/beep sounds.
   */
  const pause = () => {
    if (!active || paused) return;
    paused = true;
    // Flush any pending utterance before pausing
    if (utteranceBuffers.length > 0) {
      void flushUtterance(true);
    }
    resetUtterance();
    console.log("[GCP-STT] Paused (mic stream stays open)");
  };

  /**
   * Resume processing after pause. No AudioContext recreation needed.
   */
  const resume = () => {
    if (!active || !paused) return;
    paused = false;
    resetUtterance();
    preRollBuffers = [];
    if (audioContext?.state === "suspended") {
      void audioContext.resume().catch((err) => {
        console.warn("[GCP-STT] Resume blocked:", err);
        onError?.("audio-context-resume-blocked");
      });
    }
    console.log("[GCP-STT] Resumed — listening again");
  };

  /**
   * Soft stop — pauses processing but keeps mic stream alive.
   * Use this for normal stop/start cycles to avoid mic cycling sounds.
   */
  const stop = () => {
    if (!active) return;
    // Just pause — don't tear down
    pause();
    console.log("[GCP-STT] Soft stop (mic stays open, use destroy() for full teardown)");
  };

  /**
   * Full teardown — closes AudioContext and releases non-persistent streams.
   * Only call on unmount or when truly done with voice.
   */
  const destroy = () => {
    active = false;
    paused = false;

    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }

    if (utteranceBuffers.length > 0) {
      void flushUtterance(true);
    }

    if (processor) {
      try { processor.disconnect(); } catch {}
      processor = null;
    }
    if (source) {
      try { source.disconnect(); } catch {}
      source = null;
    }
    if (audioContext) {
      try { audioContext.close(); } catch {}
      audioContext = null;
    }

    // NEVER stop persistent mic tracks
    const persistentMic = (window as any).__orion_persistent_mic__;
    if (mediaStream && mediaStream !== persistentMic?.stream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }

    mediaStream = null;
    preRollBuffers = [];
    resetUtterance();

    console.log("[GCP-STT] Session destroyed (full teardown)");
  };

  return {
    start,
    stop,
    destroy,
    pause,
    resume,
    isActive: () => active && !!audioContext && audioContext.state === "running",
    isPaused: () => paused,
  };
}

/**
 * One-shot transcription — record for `durationMs` then transcribe
 */
export async function transcribeOnce(
  durationMs = 5000,
  languageCode = "pt-BR"
): Promise<{ text: string; confidence: number } | null> {
  return new Promise((resolve) => {
    const session = createGCPSTTSession({
      languageCode,
      chunkIntervalMs: durationMs + 500,
      onFinal: (text, confidence) => {
        session.stop();
        resolve({ text, confidence });
      },
      onError: () => {
        session.stop();
        resolve(null);
      },
    });

    session.start().then((ok) => {
      if (!ok) {
        resolve(null);
        return;
      }

      setTimeout(() => {
        if (session.isActive()) {
          session.stop();
          setTimeout(() => resolve(null), 1000);
        }
      }, durationMs);
    });
  });
}
