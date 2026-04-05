/**
 * Kokoro TTS — High-quality neural TTS running in-browser via WebGPU/WASM
 * 
 * Inspired by irelate-ai/voice-chat Supertonic TTS and BrowserAI Kokoro integration.
 * Uses @huggingface/transformers to load the Kokoro 82M ONNX model.
 * 
 * Features:
 * - 100+ voices, male/female, multiple languages
 * - WebGPU acceleration (falls back to WASM)
 * - Streaming chunk synthesis for low latency
 * - ~82MB model, cached in IndexedDB after first load
 * 
 * Ref: https://github.com/irelate-ai/voice-chat
 *      https://github.com/sauravpanda/BrowserAI
 */

import type { TextToAudioPipeline } from "@huggingface/transformers";

// ─── State ───
let pipelineInstance: TextToAudioPipeline | null = null;
let loadingPromise: Promise<TextToAudioPipeline | null> | null = null;
let isAvailable: boolean | null = null;
let lastError: string | null = null;

// ─── Config ───
const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICE_ID = "am_michael"; // Male voice, good for PT-BR content
const FALLBACK_VOICE = "af_heart"; // Female fallback

// ─── Device Detection (from irelate-ai/voice-chat) ───
async function getBestDevice(): Promise<"webgpu" | "wasm"> {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  
  if (isIOS) return "wasm"; // WebGPU unstable on iOS

  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    try {
      const adapter = await (navigator as any).gpu?.requestAdapter();
      if (adapter) return "webgpu";
    } catch {}
  }
  return "wasm";
}

// ─── Load Model ───
async function loadKokoro(): Promise<TextToAudioPipeline | null> {
  if (pipelineInstance) return pipelineInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const { pipeline, env } = await import("@huggingface/transformers");
      
      // Suppress ONNX warnings
      if ((env as any).backends?.onnx) {
        (env as any).backends.onnx.logSeverityLevel = 3;
      }
      env.useBrowserCache = true;

      const device = await getBestDevice();
      console.log(`[KokoroTTS] Loading model on ${device}...`);

      const tts = await pipeline("text-to-speech", MODEL_ID, {
        device,
        dtype: device === "webgpu" ? "fp32" : "q8" as any,
      }) as TextToAudioPipeline;

      // Warm up to compile shaders
      try {
        await tts("test", { language: "en" } as any);
      } catch {}

      pipelineInstance = tts;
      isAvailable = true;
      lastError = null;
      console.log("[KokoroTTS] ✅ Model loaded and ready");
      return tts;
    } catch (err: any) {
      console.warn("[KokoroTTS] Failed to load:", err?.message);
      isAvailable = false;
      lastError = err?.message || "Unknown error";
      loadingPromise = null;
      return null;
    }
  })();

  return loadingPromise;
}

// ─── Text Normalization (from irelate-ai/voice-chat) ───
function normalizeForTTS(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Split Text into Chunks ───
function splitIntoChunks(text: string, maxChars = 300): string[] {
  if (text.length <= maxChars) return [text];
  
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChars && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ─── Main: Speak with Kokoro ───
export async function speakWithKokoro(text: string): Promise<boolean> {
  try {
    const tts = await loadKokoro();
    if (!tts) return false;

    const normalizedText = normalizeForTTS(text);
    if (!normalizedText) return false;

    const chunks = splitIntoChunks(normalizedText);
    const audioCtx = new AudioContext();
    
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;

      const output = await tts(chunk, {
        speaker_embeddings: VOICE_ID,
        language: "pt",
      } as any) as any;

      if (!output?.audio || !output?.sampling_rate) continue;

      const audioData = output.audio instanceof Float32Array
        ? output.audio
        : new Float32Array(output.audio);

      const buffer = audioCtx.createBuffer(1, audioData.length, output.sampling_rate);
      buffer.getChannelData(0).set(audioData);

      await new Promise<void>((resolve) => {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = () => resolve();
        source.start();
      });
    }

    await audioCtx.close();
    return true;
  } catch (err: any) {
    console.warn("[KokoroTTS] Speak error:", err?.message);
    return false;
  }
}

// ─── Preload (lazy background load) ───
export function preloadKokoro(): void {
  if (isAvailable !== null) return;
  // Delay to avoid blocking initial load
  setTimeout(() => {
    loadKokoro().catch(() => {});
  }, 5000);
}

// ─── Status ───
export function isKokoroAvailable(): boolean {
  return isAvailable === true;
}

export function getKokoroError(): string | null {
  return lastError;
}
