/**
 * Google Cloud STT Client — utterance-based capture
 * Buffers speech locally and sends the FULL utterance after silence,
 * avoiding cut-off phrases and hallucinated chunk merges.
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

interface GCPSTTSession {
  start: () => Promise<boolean>;
  stop: () => void;
  isActive: () => boolean;
}

const PROCESSOR_BUFFER_SIZE = 4096;
const PRE_ROLL_FRAMES = 4;
const FLUSH_POLL_MS = 200;
const SPEECH_RMS_THRESHOLD = 0.0065;

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
  let sending = false;
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let preRollBuffers: Float32Array[] = [];
  let utteranceBuffers: Float32Array[] = [];
  let utteranceActive = false;
  let lastSpeechAt = 0;
  let utteranceStartedAt = 0;

  const silenceDurationMs = Math.max(950, Math.round(chunkIntervalMs * 0.7));
  const maxUtteranceMs = Math.max(7000, chunkIntervalMs * 5);

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
      const minSamples = Math.floor(sourceSR * 0.45);

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
    if (active) return true;

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
      audioContext = new AudioContext({ sampleRate: 48000 });
      source = audioContext.createMediaStreamSource(stream);
      processor = audioContext.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!active) return;

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
      resetUtterance();
      preRollBuffers = [];

      flushTimer = setInterval(() => {
        if (!active || sending || !utteranceActive || utteranceBuffers.length === 0) return;

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

      console.log("[GCP-STT] Session started — utterance mode enabled");
      return true;
    } catch (err: any) {
      console.error("[GCP-STT] Failed to start:", err.message);
      onError?.(err.message);
      return false;
    }
  };

  const stop = () => {
    active = false;

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

    const persistentMic = (window as any).__orion_persistent_mic__;
    if (mediaStream && mediaStream !== persistentMic?.stream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }

    mediaStream = null;
    preRollBuffers = [];
    resetUtterance();

    console.log("[GCP-STT] Session stopped");
  };

  return {
    start,
    stop,
    isActive: () => active,
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
