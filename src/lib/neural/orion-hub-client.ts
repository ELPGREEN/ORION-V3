/**
 * ORION Neural Hub — Unified HF Space Client (ZeroGPU)
 * Connects to Ericsonv12/orion-gpu Gradio Space
 *
 * GPU→CPU Fallback: When ZeroGPU quota is exhausted (429/quota errors),
 * GPU endpoints automatically fall back to CPU-only alternatives on the same Space.
 *
 * Capabilities: TTS, LLM, OCR, Vision, Embeddings, PDF
 * Hardware: ZeroGPU H200/A100 (GPU) + CPU fallback
 */

const ORION_HUB_URL = "https://ericsonv12-orion-gpu.hf.space";
const DEFAULT_TIMEOUT = 60_000;
const GPU_TIMEOUT = 180_000;

// ─── GPU Quota Tracker ───

interface QuotaState {
  exhausted: boolean;
  exhaustedAt: number;
  cooldownMs: number; // how long to skip GPU before retrying
  consecutiveFailures: number;
}

const _quota: QuotaState = {
  exhausted: false,
  exhaustedAt: 0,
  cooldownMs: 5 * 60_000, // 5 min cooldown before retrying GPU
  consecutiveFailures: 0,
};

/** Check if GPU quota is likely available */
function isGpuAvailable(): boolean {
  if (!_quota.exhausted) return true;
  // After cooldown, try GPU again
  if (Date.now() - _quota.exhaustedAt > _quota.cooldownMs) {
    _quota.exhausted = false;
    _quota.consecutiveFailures = 0;
    console.log("[OrionHub] GPU cooldown expired, retrying GPU path");
    return true;
  }
  return false;
}

function markGpuExhausted() {
  _quota.exhausted = true;
  _quota.exhaustedAt = Date.now();
  _quota.consecutiveFailures++;
  // Exponential backoff: 5min, 10min, 20min... max 60min
  _quota.cooldownMs = Math.min(5 * 60_000 * Math.pow(2, _quota.consecutiveFailures - 1), 60 * 60_000);
  console.warn(`[OrionHub] GPU quota exhausted. Cooldown: ${Math.round(_quota.cooldownMs / 60_000)}min`);
}

function markGpuSuccess() {
  _quota.exhausted = false;
  _quota.consecutiveFailures = 0;
  _quota.cooldownMs = 5 * 60_000;
}

/** Check if an error indicates GPU quota exhaustion */
function isQuotaError(status: number, body: string): boolean {
  if (status === 429) return true;
  const lower = body.toLowerCase();
  return lower.includes("quota") || lower.includes("gpu quota")
    || lower.includes("exceeded") || lower.includes("zerogpu")
    || lower.includes("no gpu") || lower.includes("rate limit");
}

/** Get current quota state for UI */
export function getGpuQuotaState() {
  return {
    exhausted: _quota.exhausted,
    cooldownRemainingMs: _quota.exhausted
      ? Math.max(0, _quota.cooldownMs - (Date.now() - _quota.exhaustedAt))
      : 0,
    consecutiveFailures: _quota.consecutiveFailures,
    gpuAvailable: isGpuAvailable(),
  };
}

// ─── Types ───

// ─── Health Check ───

export async function checkOrionHub(): Promise<OrionHubHealth> {
  try {
    const result = await callGradio<string>("health", [], 10_000);
    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    return {
      status: "online",
      gpu: parsed.gpu ?? { available: false, name: "N/A", vram_gb: 0 },
      models_loaded: parsed.models_loaded ?? [],
      capabilities: parsed.capabilities ?? [],
    };
  } catch {
    return {
      status: "error",
      gpu: { available: false, name: "N/A", vram_gb: 0 },
      models_loaded: [],
      capabilities: [],
    };
  }
}

// ─── TTS (JARVIS) ───

export async function speakJarvis(text: string, speed = 1.0): Promise<TTSResult> {
  const result = await callGradio<{ name: string; data: string; is_file?: boolean }>(
    "tts",
    [text, speed],
    GPU_TIMEOUT,
  );

  // Gradio returns audio as { name, data (base64), is_file } or file URL
  let audioBlob: Blob;
  let audioUrl: string;

  const resultAny = result as any;

  if (resultAny && typeof resultAny === "object" && "data" in resultAny) {
    // Base64 audio data
    const binaryStr = atob(resultAny.data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    audioBlob = new Blob([bytes], { type: "audio/wav" });
    audioUrl = URL.createObjectURL(audioBlob);
  } else if (typeof resultAny === "string" && resultAny.startsWith("http")) {
    // File URL from Gradio
    audioUrl = resultAny as string;
    const resp = await fetch(audioUrl);
    audioBlob = await resp.blob();
  } else {
    // Numpy tuple format: [sampleRate, audioArray]
    const [sampleRate, audioArray] = resultAny as [number, number[]];
    audioBlob = int16ArrayToWavBlob(new Int16Array(audioArray), sampleRate);
    audioUrl = URL.createObjectURL(audioBlob);
  }

  return {
    audioUrl,
    audioBlob,
    sampleRate: 22050,
    durationMs: Math.round((audioBlob.size / (22050 * 2)) * 1000),
  };
}

function int16ArrayToWavBlob(samples: Int16Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

// ─── LLM Chat (Gemma 4 on ZeroGPU) ───

export async function llmChat(
  message: string,
  systemPrompt = "Você é o ORION, assistente jurídico neural avançado. Responda em português.",
  maxTokens = 1024,
  temperature = 0.7,
): Promise<string> {
  return callGradio<string>("gemma_chat", [message, systemPrompt, maxTokens, temperature], GPU_TIMEOUT);
}

// ─── Vision Caption (BLIP on ZeroGPU) ───

export interface VisionCaptionResult {
  caption: string;
  model: string;
  source: string;
}

export async function visionCaption(imageFile: File | Blob): Promise<VisionCaptionResult> {
  const base64 = await blobToBase64(imageFile);
  const result = await callGradio<string>("vision_caption", [base64], GPU_TIMEOUT);
  return typeof result === "string" ? JSON.parse(result) : result;
}

// ─── Whisper STT (on ZeroGPU) ───

export interface WhisperSTTResult {
  text: string;
  language: string;
  model: string;
  source: string;
}

export async function whisperSTT(
  audioBlob: Blob,
  language = "pt"
): Promise<WhisperSTTResult> {
  // Convert blob to numpy-compatible format via base64
  const base64 = await blobToBase64(audioBlob);
  const result = await callGradio<string>("whisper_stt", [base64, language], GPU_TIMEOUT);
  return typeof result === "string" ? JSON.parse(result) : result;
}

// ─── OCR ───

export async function ocrExtract(imageFile: File | Blob): Promise<OCRResult> {
  const base64 = await blobToBase64(imageFile);
  const result = await callGradio<string>("ocr", [base64], GPU_TIMEOUT);
  return typeof result === "string" ? JSON.parse(result) : result;
}

// ─── Vision Classification ───

export async function visionClassify(imageFile: File | Blob): Promise<VisionResult[]> {
  const base64 = await blobToBase64(imageFile);
  const result = await callGradio<string>("vision", [base64], GPU_TIMEOUT);
  return typeof result === "string" ? JSON.parse(result) : result;
}

// ─── Embeddings ───

export async function computeEmbeddings(texts: string[]): Promise<EmbeddingResult> {
  const joined = texts.join("\n");
  const result = await callGradio<string>("embeddings", [joined], GPU_TIMEOUT);
  return typeof result === "string" ? JSON.parse(result) : result;
}

// ─── PDF Processing ───

export async function pdfToMarkdown(pdfFile: File | Blob): Promise<string> {
  const base64 = await blobToBase64(pdfFile);
  return callGradio<string>("pdf", [base64, "Markdown"], DEFAULT_TIMEOUT);
}

export async function pdfToHtml(pdfFile: File | Blob): Promise<string> {
  const base64 = await blobToBase64(pdfFile);
  return callGradio<string>("pdf", [base64, "HTML"], DEFAULT_TIMEOUT);
}

// ─── Utils ───

async function blobToBase64(blob: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
