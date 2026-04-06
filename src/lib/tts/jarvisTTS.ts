/**
 * ─── Jarvis TTS Client ───
 * Client-side interface for JARVIS voice synthesis.
 * Uses Piper ONNX model (jgkawell/jarvis) via HuggingFace Space.
 *
 * Voice: British English male, inspired by Marvel's J.A.R.V.I.S.
 * Model: jgkawell/jarvis (en_GB, medium, 22050Hz WAV)
 *
 * Integration points:
 *  - Edge function: supabase/functions/jarvis-tts
 *  - Voice evolution: src/lib/neural/orion-voice-evolution.ts
 *  - Quality presets: src/lib/neural/quality-presets.ts
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface JarvisVoiceConfig {
  /** Apply DSP post-processing (pitch, reverb, EQ) */
  applyDSP: boolean;
  /** Pitch shift in semitones (-12 to +12) */
  pitchShiftSemitones: number;
  /** Reverb dry/wet mix (0 = dry, 1 = full reverb) */
  reverbMix: number;
  /** Low-frequency boost in dB */
  bassBoostDb: number;
  /** Playback speed multiplier */
  speed: number;
}

export const DEFAULT_JARVIS_CONFIG: JarvisVoiceConfig = {
  applyDSP: true,
  pitchShiftSemitones: -1.5,   // Slightly deeper than base
  reverbMix: 0.08,              // Subtle room presence
  bassBoostDb: 3,               // Warm low-end
  speed: 1.0,
};

export interface JarvisHealthStatus {
  success: boolean;
  status: "online" | "sleeping" | "error";
  voice?: string;
  sampleRate?: number;
  model?: string;
  message?: string;
}

export interface JarvisSpeakResult {
  audioUrl: string;
  audioBlob: Blob;
  latencyMs: number;
  method: string;
  voice: string;
  byteSize: number;
}

// ─── Health Check ───

export async function checkJarvisHealth(): Promise<JarvisHealthStatus> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/jarvis-tts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: "health" }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      return { success: false, status: "error", message: err.error || `HTTP ${res.status}` };
    }

    return await res.json();
  } catch (e) {
    return { success: false, status: "error", message: (e as Error).message };
  }
}

// ─── Speak ───

export async function speakJarvis(
  text: string,
  config: Partial<JarvisVoiceConfig> = {}
): Promise<JarvisSpeakResult> {
  const cfg = { ...DEFAULT_JARVIS_CONFIG, ...config };
  const t0 = performance.now();

  const res = await fetch(`${SUPABASE_URL}/functions/v1/jarvis-tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action: "speak", text }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || err.details?.join("; ") || `Jarvis TTS failed: ${res.status}`);
  }

  let audioBlob = await res.blob();
  const latencyMs = Math.round(performance.now() - t0);
  const method = res.headers.get("X-TTS-Method") || "unknown";
  const voice = res.headers.get("X-TTS-Voice") || "jarvis-medium";

  // Apply client-side DSP if enabled
  if (cfg.applyDSP) {
    audioBlob = await applyJarvisDSP(audioBlob, cfg);
  }

  const audioUrl = URL.createObjectURL(audioBlob);

  return {
    audioUrl,
    audioBlob,
    latencyMs,
    method,
    voice,
    byteSize: audioBlob.size,
  };
}

// ─── Play with Auto-Cleanup ───

let currentAudio: HTMLAudioElement | null = null;

export async function playJarvis(
  text: string,
  config: Partial<JarvisVoiceConfig> = {}
): Promise<void> {
  // Stop any currently playing Jarvis audio
  stopJarvis();

  const result = await speakJarvis(text, config);

  return new Promise<void>((resolve, reject) => {
    currentAudio = new Audio(result.audioUrl);
    currentAudio.playbackRate = config.speed || DEFAULT_JARVIS_CONFIG.speed;

    currentAudio.onended = () => {
      URL.revokeObjectURL(result.audioUrl);
      currentAudio = null;
      resolve();
    };

    currentAudio.onerror = (e) => {
      URL.revokeObjectURL(result.audioUrl);
      currentAudio = null;
      reject(new Error(`Audio playback failed: ${e}`));
    };

    currentAudio.play().catch(reject);
  });
}

export function stopJarvis(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
}

export function isJarvisPlaying(): boolean {
  return currentAudio !== null && !currentAudio.paused;
}

// ─── DSP Post-Processing ───

async function applyJarvisDSP(
  audioBlob: Blob,
  config: JarvisVoiceConfig
): Promise<Blob> {
  try {
    const audioCtx = new AudioContext({ sampleRate: 22050 });
    const arrayBuffer = await audioBlob.arrayBuffer();

    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    } catch {
      // Raw PCM int16 at 22050Hz (Piper output)
      const int16 = new Int16Array(arrayBuffer);
      audioBuffer = audioCtx.createBuffer(1, int16.length, 22050);
      const channel = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16.length; i++) {
        channel[i] = int16[i] / 32768;
      }
    }

    // Offline rendering for DSP chain
    const offlineCtx = new OfflineAudioContext(
      1,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    // Pitch shift via playback rate (simple approximation)
    const pitchFactor = Math.pow(2, config.pitchShiftSemitones / 12);
    source.playbackRate.value = pitchFactor;

    // Bass boost (low shelf filter)
    const bassBoost = offlineCtx.createBiquadFilter();
    bassBoost.type = "lowshelf";
    bassBoost.frequency.value = 200;
    bassBoost.gain.value = config.bassBoostDb;

    // Presence (high shelf for clarity)
    const presence = offlineCtx.createBiquadFilter();
    presence.type = "highshelf";
    presence.frequency.value = 3000;
    presence.gain.value = 2;

    // Compressor for consistent volume
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // Chain: source → bassBoost → presence → compressor → destination
    source.connect(bassBoost);
    bassBoost.connect(presence);
    presence.connect(compressor);
    compressor.connect(offlineCtx.destination);

    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    audioCtx.close();

    // Convert to WAV
    return audioBufferToWavBlob(renderedBuffer);
  } catch (e) {
    console.warn("[Jarvis DSP] Failed, returning raw audio:", e);
    return audioBlob;
  }
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const data = buffer.getChannelData(0);
  const dataLength = data.length * bytesPerSample;
  const headerLength = 44;

  const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

// ─── Voice Info ───

export const JARVIS_VOICE_INFO = {
  name: "J.A.R.V.I.S.",
  description: "British English male voice inspired by Marvel's JARVIS AI assistant",
  model: "jgkawell/jarvis",
  engine: "Piper TTS (ONNX)",
  quality: "medium",
  sampleRate: 22050,
  language: "en_GB",
  space: "ekc4/jarvis-tts",
  capabilities: [
    "Text-to-Speech synthesis",
    "British English accent",
    "Consistent voice identity",
    "Low-latency (~1-3s)",
    "Client-side DSP post-processing",
    "Home Assistant Piper compatible",
  ],
  homeAssistant: {
    compatible: true,
    addonPath: "/share/piper",
    modelFiles: ["jarvis-medium.onnx", "jarvis-medium.onnx.json"],
    huggingFaceRepo: "jgkawell/jarvis",
    modelPath: "en/en_GB/jarvis/medium/",
  },
} as const;
