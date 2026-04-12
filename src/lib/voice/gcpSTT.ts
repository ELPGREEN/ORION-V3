/**
 * Google Cloud STT Client — Real-time streaming via chunked audio
 * Captures mic audio → converts to LINEAR16 → sends to google-stt edge function
 * Returns transcription results with confidence scores
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

/** Convert Float32Array PCM → Int16 LINEAR16 base64 */
function float32ToLinear16Base64(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
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

export function createGCPSTTSession(options: GCPSTTOptions = {}): GCPSTTSession {
  const {
    languageCode = "pt-BR",
    sampleRate = 16000,
    chunkIntervalMs = 4000,
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
  let chunkTimer: ReturnType<typeof setInterval> | null = null;
  let audioBuffer: Float32Array[] = [];
  let overlapBuffer: Float32Array | null = null; // Keep last 0.5s for context overlap
  let sending = false;

  const sendChunk = async () => {
    if (!active || sending || audioBuffer.length === 0) return;
    sending = true;

    try {
      // Concatenate all buffered audio
      const totalLength = audioBuffer.reduce((acc, b) => acc + b.length, 0);
      if (totalLength < sampleRate * 0.3) {
        // Less than 300ms of audio — skip
        sending = false;
        return;
      }

      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const buf of audioBuffer) {
        merged.set(buf, offset);
        offset += buf.length;
      }
      audioBuffer = [];

      // Downsample to target rate
      const sourceSR = audioContext?.sampleRate || 48000;
      const downsampled = downsample(merged, sourceSR, sampleRate);

      // Check if there's actual audio (not just silence)
      let maxAmplitude = 0;
      for (let i = 0; i < downsampled.length; i++) {
        const abs = Math.abs(downsampled[i]);
        if (abs > maxAmplitude) maxAmplitude = abs;
      }
      if (maxAmplitude < 0.01) {
        // Silence — skip
        sending = false;
        return;
      }

      const base64 = float32ToLinear16Base64(downsampled);

      if (onInterim) onInterim("...");

      const { data, error } = await supabase.functions.invoke("google-stt", {
        body: { audio: base64, sampleRate, languageCode },
      });

      if (error) {
        console.warn("[GCP-STT] Edge function error:", error.message);
        onError?.(error.message);
        sending = false;
        return;
      }

      if (data?.text) {
        const confidence = data.confidence || 0;
        console.log(`[GCP-STT] "${data.text}" (conf: ${(confidence * 100).toFixed(1)}%)`);
        onFinal?.(data.text, confidence);
      }
    } catch (err: any) {
      console.warn("[GCP-STT] Send error:", err.message);
      onError?.(err.message);
    }

    sending = false;
  };

  const start = async (): Promise<boolean> => {
    if (active) return true;

    try {
      // Use persistent mic stream if available
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

      // ScriptProcessorNode for capturing raw PCM
      const bufferSize = 4096;
      processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!active) return;
        const channelData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(new Float32Array(channelData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      active = true;

      // Send chunks periodically
      chunkTimer = setInterval(sendChunk, chunkIntervalMs);

      // Handle abort signal
      if (signal) {
        signal.addEventListener("abort", stop, { once: true });
      }

      console.log("[GCP-STT] Session started — streaming to Google Cloud");
      return true;
    } catch (err: any) {
      console.error("[GCP-STT] Failed to start:", err.message);
      onError?.(err.message);
      return false;
    }
  };

  const stop = () => {
    active = false;

    if (chunkTimer) {
      clearInterval(chunkTimer);
      chunkTimer = null;
    }

    // Send remaining audio
    if (audioBuffer.length > 0) {
      sendChunk();
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

    // Don't stop persistent mic stream
    const persistentMic = (window as any).__orion_persistent_mic__;
    if (mediaStream && mediaStream !== persistentMic?.stream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }
    mediaStream = null;
    audioBuffer = [];

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
      if (!ok) { resolve(null); return; }
      setTimeout(() => {
        if (session.isActive()) {
          session.stop();
          setTimeout(() => resolve(null), 1000);
        }
      }, durationMs);
    });
  });
}
