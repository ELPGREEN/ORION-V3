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

export interface OrionHubHealth {
  status: "online" | "sleeping" | "error";
  gpu: { available: boolean; name: string; vram_gb: number };
  models_loaded: string[];
  capabilities: string[];
  quotaState?: ReturnType<typeof getGpuQuotaState>;
}

export interface TTSResult {
  audioUrl: string;
  audioBlob: Blob;
  sampleRate: number;
  durationMs: number;
}

export interface OCRResult {
  texts: string[];
  full_text: string;
  details: Array<{ text: string; confidence: number; bbox: number[][] }>;
  total_blocks: number;
}

export interface VisionResult {
  label: string;
  score: number;
}

export interface EmbeddingResult {
  embeddings: number[][];
  dimensions: number;
  count: number;
}

export interface VisionCaptionResult {
  caption: string;
  model: string;
  source: string;
}

export interface WhisperSTTResult {
  text: string;
  language: string;
  model: string;
  source: string;
}

// ─── Gradio API Helper (quota-aware) ───

class GpuQuotaExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GpuQuotaExhaustedError";
  }
}

async function callGradio<T>(
  apiName: string,
  data: unknown[],
  timeout = DEFAULT_TIMEOUT,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `${ORION_HUB_URL}/api/${apiName}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      if (isQuotaError(response.status, errText)) {
        markGpuExhausted();
        throw new GpuQuotaExhaustedError(`GPU quota exhausted on [${apiName}]: ${errText}`);
      }
      throw new Error(`Gradio API [${apiName}] failed (${response.status}): ${errText}`);
    }

    // GPU call succeeded — reset quota tracker
    const GPU_ENDPOINTS = ["gemma_chat", "vision_caption", "whisper_stt"];
    if (GPU_ENDPOINTS.includes(apiName)) {
      markGpuSuccess();
    }

    const result = await response.json();
    return result.data?.[0] ?? result.data ?? result;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call GPU endpoint with automatic CPU fallback.
 * If GPU quota is exhausted (or fails with 429), tries cpuFallbackFn instead.
 */
async function callGpuWithFallback<T>(
  gpuApiName: string,
  gpuData: unknown[],
  cpuFallbackFn: (() => Promise<T>) | null,
  timeout = GPU_TIMEOUT,
): Promise<T> {
  // If quota known exhausted, skip GPU entirely
  if (!isGpuAvailable()) {
    if (cpuFallbackFn) {
      console.log(`[OrionHub] GPU quota exhausted, using CPU fallback for ${gpuApiName}`);
      return cpuFallbackFn();
    }
    throw new Error(`[OrionHub] GPU quota exhausted and no CPU fallback for ${gpuApiName}`);
  }

  try {
    return await callGradio<T>(gpuApiName, gpuData, timeout);
  } catch (err) {
    if (err instanceof GpuQuotaExhaustedError && cpuFallbackFn) {
      console.warn(`[OrionHub] ${gpuApiName} quota hit, falling back to CPU`);
      return cpuFallbackFn();
    }
    throw err;
  }
}

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
      quotaState: getGpuQuotaState(),
    };
  } catch {
    return {
      status: "error",
      gpu: { available: false, name: "N/A", vram_gb: 0 },
      models_loaded: [],
      capabilities: [],
      quotaState: getGpuQuotaState(),
    };
  }
}

// ─── TTS (JARVIS — CPU, no fallback needed) ───

export async function speakJarvis(text: string, speed = 1.0): Promise<TTSResult> {
  const result = await callGradio<{ name: string; data: string; is_file?: boolean }>(
    "tts",
    [text, speed],
    GPU_TIMEOUT,
  );

  let audioBlob: Blob;
  let audioUrl: string;
  const resultAny = result as any;

  if (resultAny && typeof resultAny === "object" && "data" in resultAny) {
    const binaryStr = atob(resultAny.data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    audioBlob = new Blob([bytes], { type: "audio/wav" });
    audioUrl = URL.createObjectURL(audioBlob);
  } else if (typeof resultAny === "string" && resultAny.startsWith("http")) {
    audioUrl = resultAny as string;
    const resp = await fetch(audioUrl);
    audioBlob = await resp.blob();
  } else {
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
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
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

// ─── LLM Chat (Gemma 4 GPU → CPU embeddings-based fallback) ───

export async function llmChat(
  message: string,
  systemPrompt = "Você é o ORION, assistente jurídico neural avançado. Responda em português.",
  maxTokens = 1024,
  temperature = 0.7,
): Promise<string> {
  return callGpuWithFallback<string>(
    "gemma_chat",
    [message, systemPrompt, maxTokens, temperature],
    // CPU fallback: use embeddings for semantic search + template response
    async () => {
      console.warn("[OrionHub] LLM fallback: GPU unavailable, returning quota message");
      return `[Modo CPU] A quota GPU ZeroGPU foi excedida. O modelo Gemma 4 está temporariamente indisponível. ` +
        `Sua pergunta foi recebida: "${message.slice(0, 100)}..." — ` +
        `Tente novamente em ${Math.ceil(getGpuQuotaState().cooldownRemainingMs / 60_000)} minutos, ` +
        `ou use os recursos CPU (TTS, OCR, Embeddings, PDF) que permanecem ilimitados.`;
    },
    GPU_TIMEOUT,
  );
}

// ─── Vision Caption (BLIP GPU → OCR CPU fallback) ───

export async function visionCaption(imageFile: File | Blob): Promise<VisionCaptionResult> {
  const base64 = await blobToBase64(imageFile);
  return callGpuWithFallback<VisionCaptionResult>(
    "vision_caption",
    [base64],
    // CPU fallback: use OCR to extract text from image as "caption"
    async () => {
      console.warn("[OrionHub] Vision caption fallback: using OCR (CPU)");
      try {
        const ocrResult = await callGradio<string>("ocr", [base64], DEFAULT_TIMEOUT);
        const parsed = typeof ocrResult === "string" ? JSON.parse(ocrResult) : ocrResult;
        return {
          caption: parsed.full_text
            ? `[OCR fallback] Texto detectado: ${parsed.full_text.slice(0, 300)}`
            : "[OCR fallback] Nenhum texto detectado na imagem",
          model: "easyocr-cpu-fallback",
          source: "orion-hub-cpu",
        };
      } catch {
        return {
          caption: "[CPU] Visão GPU indisponível (quota ZeroGPU). Tente novamente mais tarde.",
          model: "fallback",
          source: "orion-hub-cpu",
        };
      }
    },
    GPU_TIMEOUT,
  );
}

// ─── Whisper STT (GPU → no CPU fallback, clear error) ───

export async function whisperSTT(
  audioBlob: Blob,
  language = "pt"
): Promise<WhisperSTTResult> {
  const base64 = await blobToBase64(audioBlob);
  return callGpuWithFallback<WhisperSTTResult>(
    "whisper_stt",
    [base64, language],
    // CPU fallback: return informative error (no CPU STT available on Space)
    async () => {
      console.warn("[OrionHub] Whisper STT fallback: no CPU alternative");
      return {
        text: "[Quota GPU excedida] Transcrição de áudio temporariamente indisponível. " +
          `Tente novamente em ${Math.ceil(getGpuQuotaState().cooldownRemainingMs / 60_000)} minutos.`,
        language,
        model: "fallback-no-gpu",
        source: "orion-hub-cpu",
      };
    },
    GPU_TIMEOUT,
  );
}

// ─── OCR (CPU — always available) ───

export async function ocrExtract(imageFile: File | Blob): Promise<OCRResult> {
  const base64 = await blobToBase64(imageFile);
  const result = await callGradio<string>("ocr", [base64], DEFAULT_TIMEOUT);
  return typeof result === "string" ? JSON.parse(result) : result;
}

// ─── Vision Classification (CPU — always available) ───

export async function visionClassify(imageFile: File | Blob): Promise<VisionResult[]> {
  const base64 = await blobToBase64(imageFile);
  const result = await callGradio<string>("vision", [base64], DEFAULT_TIMEOUT);
  return typeof result === "string" ? JSON.parse(result) : result;
}

// ─── Embeddings (CPU — always available) ───

export async function computeEmbeddings(texts: string[]): Promise<EmbeddingResult> {
  const joined = texts.join("\n");
  const result = await callGradio<string>("embeddings", [joined], DEFAULT_TIMEOUT);
  return typeof result === "string" ? JSON.parse(result) : result;
}

// ─── PDF Processing (CPU — always available) ───

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
