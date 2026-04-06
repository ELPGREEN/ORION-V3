/**
 * ORION Neural Hub — Unified HF Space Client (ZeroGPU)
 * Connects to Ericsonv12/orion-gpu Gradio Space
 *
 * Capabilities: TTS, LLM, OCR, Vision, Embeddings, PDF
 * Hardware: ZeroGPU H200/A100
 */

const ORION_HUB_URL = "https://ericsonv12-orion-gpu.hf.space";
const DEFAULT_TIMEOUT = 60_000;
const GPU_TIMEOUT = 180_000; // GPU tasks can take longer (cold start + inference)

// ─── Types ───

export interface OrionHubHealth {
  status: "online" | "sleeping" | "error";
  gpu: { available: boolean; name: string; vram_gb: number };
  models_loaded: string[];
  capabilities: string[];
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

// ─── Gradio API Helper ───

async function callGradio<T>(
  apiName: string,
  data: unknown[],
  timeout = DEFAULT_TIMEOUT,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    // Gradio API endpoint format
    const url = `${ORION_HUB_URL}/api/${apiName}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gradio API [${apiName}] failed (${response.status}): ${errText}`);
    }

    const result = await response.json();
    // Gradio wraps results in { data: [...] }
    return result.data?.[0] ?? result.data ?? result;
  } finally {
    clearTimeout(timer);
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

// ─── LLM Chat ───

export async function llmChat(
  message: string,
  systemPrompt = "Você é o ORION, assistente jurídico neural avançado. Responda em português.",
  maxTokens = 1024,
  temperature = 0.7,
): Promise<string> {
  return callGradio<string>("llm", [message, systemPrompt, maxTokens, temperature], GPU_TIMEOUT);
}

// ─── OCR ───

export async function ocrExtract(imageFile: File | Blob): Promise<OCRResult> {
  // Convert to base64 for Gradio
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
