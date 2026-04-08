/**
 * ORION Neural Hub — Unified HF Space Client (ZeroGPU)
 * Connects to Ericsonv12/orion-gpu Gradio Space via @gradio/client SDK
 *
 * GPU→CPU Fallback: When ZeroGPU quota is exhausted,
 * GPU endpoints return structured error JSON instead of crashing.
 *
 * Capabilities: TTS, LLM, OCR, Vision, Embeddings, PDF
 * Hardware: ZeroGPU H200/A100 (GPU) + CPU fallback
 */

const ORION_SPACE_ID = "Ericsonv12/orion-gpu";
const DEFAULT_TIMEOUT = 60_000;
const GPU_TIMEOUT = 180_000;

// ─── GPU Quota Tracker ───

interface QuotaState {
  exhausted: boolean;
  exhaustedAt: number;
  cooldownMs: number;
  consecutiveFailures: number;
}

const _quota: QuotaState = {
  exhausted: false,
  exhaustedAt: 0,
  cooldownMs: 5 * 60_000,
  consecutiveFailures: 0,
};

function isGpuAvailable(): boolean {
  if (!_quota.exhausted) return true;
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
  _quota.cooldownMs = Math.min(5 * 60_000 * Math.pow(2, _quota.consecutiveFailures - 1), 60 * 60_000);
  console.warn(`[OrionHub] GPU quota exhausted. Cooldown: ${Math.round(_quota.cooldownMs / 60_000)}min`);
}

function markGpuSuccess() {
  _quota.exhausted = false;
  _quota.consecutiveFailures = 0;
  _quota.cooldownMs = 5 * 60_000;
}

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
  capabilities: Record<string, string[]> | string[];
  quotaState?: ReturnType<typeof getGpuQuotaState>;
  endpoint_status?: Record<string, string>;
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

// ─── Gradio Client Connection ───

let _clientPromise: Promise<unknown> | null = null;

async function getClient(): Promise<unknown> {
  if (!_clientPromise) {
    _clientPromise = (async () => {
      try {
        const { Client } = await import("@gradio/client");
        const client = await Client.connect(ORION_SPACE_ID);
        console.log("[OrionHub] Connected to Gradio Space");
        return client;
      } catch (e) {
        _clientPromise = null;
        console.error("[OrionHub] Failed to connect:", e);
        throw e;
      }
    })();
  }
  return _clientPromise;
}

/** Reset connection (e.g., after Space restart) */
export function resetConnection(): void {
  _clientPromise = null;
}

// ─── Gradio API Helper ───

async function callGradio<T>(
  apiName: string,
  inputs: Record<string, unknown>,
  timeout = DEFAULT_TIMEOUT,
): Promise<T> {
  const client = await getClient() as {
    predict: (endpoint: string, data: Record<string, unknown>) => Promise<{ data: unknown[] }>;
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const result = await client.predict(`/${apiName}`, inputs);
    const data = result.data?.[0] ?? result.data;

    // Check for structured GPU error responses
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        if (parsed?.error === "gpu_unavailable") {
          markGpuExhausted();
          console.warn(`[OrionHub] ${apiName}: GPU unavailable (structured response)`);
        }
        return parsed as T;
      } catch {
        return data as T;
      }
    }

    // GPU success tracking
    const GPU_ENDPOINTS = ["vision_caption", "whisper_stt"];
    if (GPU_ENDPOINTS.includes(apiName)) {
      markGpuSuccess();
    }

    return data as T;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const lower = errMsg.toLowerCase();
    if (lower.includes("quota") || lower.includes("429") || lower.includes("rate limit") || lower.includes("zerogpu")) {
      markGpuExhausted();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function callGpuWithFallback<T>(
  gpuApiName: string,
  gpuInputs: Record<string, unknown>,
  cpuFallbackFn: (() => Promise<T>) | null,
  timeout = GPU_TIMEOUT,
): Promise<T> {
  if (!isGpuAvailable()) {
    if (cpuFallbackFn) {
      console.log(`[OrionHub] GPU quota exhausted, using CPU fallback for ${gpuApiName}`);
      return cpuFallbackFn();
    }
    throw new Error(`[OrionHub] GPU quota exhausted and no CPU fallback for ${gpuApiName}`);
  }

  try {
    return await callGradio<T>(gpuApiName, gpuInputs, timeout);
  } catch (err) {
    if (cpuFallbackFn) {
      console.warn(`[OrionHub] ${gpuApiName} failed, falling back to CPU:`, err);
      return cpuFallbackFn();
    }
    throw err;
  }
}

// ─── Health Check ───

export async function checkOrionHub(): Promise<OrionHubHealth> {
  try {
    const result = await callGradio<OrionHubHealth>("health", {}, 10_000);
    const parsed = typeof result === "string" ? JSON.parse(result as string) : result;
    return {
      status: "online",
      gpu: parsed.gpu ?? { available: false, name: "N/A", vram_gb: 0 },
      models_loaded: parsed.models_loaded ?? [],
      capabilities: parsed.capabilities ?? [],
      endpoint_status: parsed.endpoint_status,
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

// ─── TTS (JARVIS — CPU, may fail if Piper not installed) ───
// NOTE: TTS on HF Space is unreliable (Piper install issues on CPU).
// Primary TTS is Gemini TTS via edge function. This is a secondary option.

export async function speakJarvis(text: string, speed = 1.0): Promise<TTSResult> {
  // Check health first — don't attempt if Space TTS is known broken
  try {
    const health = await checkOrionHub();
    const ttsStatus = health.endpoint_status?.tts ?? health.endpoint_status?.["tts"];
    if (ttsStatus === "error" || health.status === "error") {
      throw new Error("[OrionHub] TTS endpoint unavailable on Space");
    }
  } catch {}

  const result = await callGradio<unknown>("tts", { text, speed }, GPU_TIMEOUT);

  let audioBlob: Blob;
  let audioUrl: string;
  const resultAny = result as Record<string, unknown>;

  // Gradio returns file reference with url
  if (resultAny && typeof resultAny === "object" && "url" in resultAny) {
    audioUrl = resultAny.url as string;
    const resp = await fetch(audioUrl);
    audioBlob = await resp.blob();
  } else if (typeof result === "string" && (result as string).startsWith("http")) {
    audioUrl = result as string;
    const resp = await fetch(audioUrl);
    audioBlob = await resp.blob();
  } else if (Array.isArray(result)) {
    const [sampleRate, audioArray] = result as [number, number[]];
    audioBlob = int16ArrayToWavBlob(new Int16Array(audioArray), sampleRate);
    audioUrl = URL.createObjectURL(audioBlob);
  } else {
    throw new Error(`[OrionHub] Unexpected TTS result: ${JSON.stringify(result).slice(0, 200)}`);
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

// ─── LLM Chat (Gemma 4 GPU — endpoint may not exist) ───
// NOTE: /gemma_chat endpoint was removed from the Space.
// This function is kept for API compatibility but returns a fallback message.
// Use Gemini via edge functions for actual LLM chat.

export async function llmChat(
  message: string,
  _systemPrompt = "Você é o ORION, assistente jurídico neural avançado. Responda em português.",
  _maxTokens = 1024,
  _temperature = 0.7,
): Promise<string> {
  console.warn("[OrionHub] llmChat: /gemma_chat endpoint removed from Space. Use Gemini edge functions.");
  return `[Orion] LLM via HF Space indisponível. Use Gemini API (edge function) para chat.`;
}

// ─── Vision Caption (BLIP GPU → OCR CPU fallback) ───

export async function visionCaption(imageFile: File | Blob): Promise<VisionCaptionResult> {
  return callGpuWithFallback<VisionCaptionResult>(
    "vision_caption",
    { image: imageFile },
    async () => {
      console.warn("[OrionHub] Vision caption fallback: using OCR (CPU)");
      try {
        const ocrResult = await callGradio<OCRResult>("ocr", { image: imageFile }, DEFAULT_TIMEOUT);
        const parsed = typeof ocrResult === "string" ? JSON.parse(ocrResult as string) : ocrResult;
        return {
          caption: parsed.full_text
            ? `[OCR fallback] Texto: ${parsed.full_text.slice(0, 300)}`
            : "[OCR fallback] Nenhum texto detectado",
          model: "easyocr-cpu-fallback",
          source: "orion-hub-cpu",
        };
      } catch {
        return {
          caption: "[CPU] Visão GPU indisponível (quota ZeroGPU).",
          model: "fallback",
          source: "orion-hub-cpu",
        };
      }
    },
    GPU_TIMEOUT,
  );
}

// ─── Whisper STT (GPU → graceful error) ───

export async function whisperSTT(
  audioBlob: Blob,
  language = "pt"
): Promise<WhisperSTTResult> {
  return callGpuWithFallback<WhisperSTTResult>(
    "whisper_stt",
    { audio: audioBlob, language },
    async () => ({
      text: `[Quota GPU excedida] STT indisponível. Tente em ${Math.ceil(getGpuQuotaState().cooldownRemainingMs / 60_000)} min.`,
      language,
      model: "fallback-no-gpu",
      source: "orion-hub-cpu",
    }),
    GPU_TIMEOUT,
  );
}

// ─── OCR (CPU — always available) ───

export async function ocrExtract(imageFile: File | Blob): Promise<OCRResult> {
  const result = await callGradio<OCRResult>("ocr", { image: imageFile }, DEFAULT_TIMEOUT);
  return typeof result === "string" ? JSON.parse(result as string) : result;
}

// ─── Vision Classification (CPU — always available) ───

export async function visionClassify(imageFile: File | Blob): Promise<VisionResult[]> {
  const result = await callGradio<VisionResult[]>("vision_classify", { image: imageFile }, DEFAULT_TIMEOUT);
  return typeof result === "string" ? JSON.parse(result as string) : result;
}

// ─── Embeddings (CPU — always available) ───

export async function computeEmbeddings(texts: string[]): Promise<EmbeddingResult> {
  const joined = texts.join("\n");
  const result = await callGradio<EmbeddingResult>("embeddings", { texts: joined }, DEFAULT_TIMEOUT);
  return typeof result === "string" ? JSON.parse(result as string) : result;
}

// ─── PDF Processing (CPU — always available) ───

export async function pdfToMarkdown(pdfFile: File | Blob): Promise<string> {
  return callGradio<string>("pdf", { file: pdfFile, fmt: "Markdown" }, DEFAULT_TIMEOUT);
}

export async function pdfToHtml(pdfFile: File | Blob): Promise<string> {
  return callGradio<string>("pdf", { file: pdfFile, fmt: "HTML" }, DEFAULT_TIMEOUT);
}
