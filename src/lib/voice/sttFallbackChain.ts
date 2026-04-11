/**
 * STT Fallback Chain for Orion
 * 
 * Google Cloud STT (Tier 0, ~300ms)
 *   ↓ error/unavailable
 * Groq Whisper (edge function, ~2s, free tier)
 *   ↓ 429/error
 * Transformers.js Whisper (browser, ~5s first load)
 * 
 * Provides a unified fallbackTranscribe() that tries each tier.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── State ───

interface STTFallbackState {
  googleAvailable: boolean;
  googleCooldownUntil: number;
  groqAvailable: boolean;
  groqCooldownUntil: number;
  browserWhisperLoading: boolean;
  lastProvider: string;
}

const _state: STTFallbackState = {
  googleAvailable: true,
  googleCooldownUntil: 0,
  groqAvailable: true,
  groqCooldownUntil: 0,
  browserWhisperLoading: false,
  lastProvider: "none",
};

export function getSTTFallbackState() {
  return { ..._state };
}

// ─── Tier 0: Google Cloud Speech-to-Text ───

async function transcribeWithGoogleCloud(audioBlob: Blob): Promise<string | null> {
  if (!_state.googleAvailable || Date.now() < _state.googleCooldownUntil) {
    return null;
  }

  try {
    const arrayBuf = await audioBlob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuf).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    // Detect encoding from blob type
    const isWav = audioBlob.type.includes("wav");
    const encoding = isWav ? "LINEAR16" : "WEBM_OPUS";
    const sampleRate = isWav ? 16000 : 48000;

    const { data, error } = await supabase.functions.invoke("google-cloud-stt", {
      body: {
        audio_base64: base64,
        language: "pt-BR",
        encoding,
        sample_rate: sampleRate,
      },
    });

    if (error) {
      console.warn("[STT-Fallback] Google Cloud STT error:", error.message);
      // Cooldown 30s on error
      _state.googleAvailable = false;
      _state.googleCooldownUntil = Date.now() + 30_000;
      setTimeout(() => { _state.googleAvailable = true; }, 30_000);
      return null;
    }

    if (data?.text) {
      _state.lastProvider = "google-cloud-stt";
      console.log("[STT-Fallback] ✅ Google Cloud STT:", data.text.slice(0, 80));
      return data.text;
    }
    return null;
  } catch (err) {
    console.warn("[STT-Fallback] Google Cloud STT exception:", err);
    return null;
  }
}

// ─── Tier 1: Groq Whisper Edge Function ───

async function transcribeWithGroq(audioBlob: Blob): Promise<string | null> {
  if (!_state.groqAvailable || Date.now() < _state.groqCooldownUntil) {
    return null;
  }

  try {
    const arrayBuf = await audioBlob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuf).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    const { data, error } = await supabase.functions.invoke("groq-whisper-stt", {
      body: {
        audio_base64: base64,
        language: "pt",
        model: "whisper-large-v3-turbo",
      },
    });

    if (error) {
      console.warn("[STT-Fallback] Groq error:", error.message);
      if (error.message?.includes("429") || error.message?.includes("rate")) {
        _state.groqAvailable = false;
        _state.groqCooldownUntil = Date.now() + 60_000;
        setTimeout(() => { _state.groqAvailable = true; }, 60_000);
      }
      return null;
    }

    if (data?.text) {
      _state.lastProvider = "groq-whisper";
      console.log("[STT-Fallback] ✅ Groq Whisper:", data.text.slice(0, 80));
      return data.text;
    }
    return null;
  } catch (err) {
    console.warn("[STT-Fallback] Groq exception:", err);
    return null;
  }
}

// ─── Tier 2: Transformers.js Whisper (Browser) ───

async function transcribeWithBrowserWhisper(audioBlob: Blob): Promise<string | null> {
  if (_state.browserWhisperLoading) return null;

  try {
    _state.browserWhisperLoading = true;
    const { transcribeAudio } = await import("@/lib/huggingface/transformers-audio");
    
    const result = await transcribeAudio(audioBlob, "Xenova/whisper-tiny", "pt");
    _state.browserWhisperLoading = false;

    if (result?.text) {
      _state.lastProvider = "browser-whisper";
      console.log("[STT-Fallback] ✅ Browser Whisper:", result.text.slice(0, 80));
      return result.text;
    }
    return null;
  } catch (err) {
    _state.browserWhisperLoading = false;
    console.warn("[STT-Fallback] Browser Whisper exception:", err);
    return null;
  }
}

// ─── Main: Fallback Transcribe ───

/**
 * Transcribes audio using the fallback chain: Google Cloud → Groq → Browser Whisper
 * Call this when Web Speech API fails.
 */
export async function fallbackTranscribe(audioBlob: Blob): Promise<{
  text: string | null;
  provider: string;
  latencyMs: number;
}> {
  const start = performance.now();

  // Tier 0: Google Cloud STT (~300ms)
  const googleResult = await transcribeWithGoogleCloud(audioBlob);
  if (googleResult) {
    return {
      text: googleResult,
      provider: "google-cloud-stt",
      latencyMs: performance.now() - start,
    };
  }

  // Tier 1: Groq Whisper
  const groqResult = await transcribeWithGroq(audioBlob);
  if (groqResult) {
    return {
      text: groqResult,
      provider: "groq-whisper",
      latencyMs: performance.now() - start,
    };
  }

  // Tier 2: Browser Whisper
  const browserResult = await transcribeWithBrowserWhisper(audioBlob);
  if (browserResult) {
    return {
      text: browserResult,
      provider: "browser-whisper",
      latencyMs: performance.now() - start,
    };
  }

  return {
    text: null,
    provider: "none",
    latencyMs: performance.now() - start,
  };
}

// ─── Audio Recording Helper ───

/**
 * Records audio from AudioWorklet chunks into a WAV blob
 * for use with the fallback STT chain.
 */
export function chunksToWavBlob(chunks: Float32Array[], sampleRate: number): Blob {
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  // Convert to 16-bit PCM WAV
  const buffer = new ArrayBuffer(44 + merged.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + merged.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, merged.length * 2, true);
  for (let i = 0; i < merged.length; i++) {
    const s = Math.max(-1, Math.min(1, merged[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}
