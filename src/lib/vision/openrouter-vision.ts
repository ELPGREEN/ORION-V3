/**
 * ─── OpenRouter Multimodal Vision Pipeline ───
 * Priority 1: Async vision with OpenRouter multimodal API
 * 
 * Features:
 * - Batch frame processing (Promise.all parallel)
 * - Smart skip via pixel diff threshold
 * - Local cache + Zilliz memory lookup
 * - detail: 'low' for triage, 'high' for events
 * - Fallback chain: Gemini Flash → GPT-5 Nano → Llama Vision Free
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Config ───
// Cascade real-time (todos free, validados em OpenRouter):
//  1) Gemma 3 12B   — leve/rápido, 32K ctx, ideal para triagem em câmera
//  2) Nemotron Nano 12B VL — Mamba-Transformer, ótimo para sequência de frames
//  3) Gemma 4 26B (MoE a4b) — fallback robusto, suporta vídeo, 262K ctx
const VISION_MODELS = [
  { model: "google/gemma-3-12b-it:free", timeout: 4000, detail: "low" as const },
  { model: "nvidia/nemotron-nano-12b-v2-vl:free", timeout: 5000, detail: "low" as const },
  { model: "google/gemma-4-26b-a4b-it:free", timeout: 6000, detail: "low" as const },
];

const PIXEL_DIFF_THRESHOLD = 0.08;
const DARK_FRAME_THRESHOLD = 25;
const CACHE_TTL_MS = 5000; // Increased from 2000ms

// ─── State ───
let lastFrameSignature: Float32Array | null = null;
const localCache = new Map<string, { result: string; ts: number }>();

// ─── Perceptual hash: 16x16 grayscale → 256-dim float vector ───
function perceptualHash(base64Jpeg: string): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return reject(new Error("Canvas 2D unavailable"));
      ctx.drawImage(img, 0, 0, 16, 16);
      const { data } = ctx.getImageData(0, 0, 16, 16);
      const vec = new Float32Array(256);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        vec[j] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      }
      let norm = 0;
      for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
      norm = Math.sqrt(norm) || 1;
      for (let i = 0; i < vec.length; i++) vec[i] /= norm;
      resolve(vec);
    };
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = `data:image/jpeg;base64,${base64Jpeg}`;
  });
}

// ─── Smart frame skip ───
function shouldSkipFrame(signature: Float32Array): { skip: boolean; reason?: string } {
  let sum = 0;
  for (let i = 0; i < signature.length; i++) sum += signature[i];
  const meanLuma = (sum / signature.length) * 255;
  if (meanLuma < DARK_FRAME_THRESHOLD) return { skip: true, reason: "frame_too_dark" };

  if (lastFrameSignature) {
    let diff = 0;
    for (let i = 0; i < signature.length; i++) diff += Math.abs(signature[i] - lastFrameSignature[i]);
    const normalizedDiff = diff / signature.length;
    if (normalizedDiff < PIXEL_DIFF_THRESHOLD) return { skip: true, reason: "scene_unchanged" };
  }

  lastFrameSignature = signature;
  return { skip: false };
}

// ─── Local hash → string key ───
function hashKey(signature: Float32Array): string {
  return signature.slice(0, 32).join(",");
}

// ─── Zilliz visual memory lookup ───
async function lookupVisualMemory(vector: Float32Array): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("zilliz-vectors", {
      body: { action: "search", collection: "orion_vision_memory", vector: Array.from(vector), topK: 1 },
    });
    if (error || !data?.results) return null;
    const hits = Array.isArray(data.results[0]) ? data.results[0] : data.results;
    const top = hits[0];
    if (!top) return null;
    const similarity = typeof top.distance === "number" ? 1 - top.distance : 0;
    return similarity >= 0.92 ? (top.description as string) : null;
  } catch {
    return null;
  }
}

// ─── Save to Zilliz (fire-and-forget) ───
function saveVisualMemory(vector: Float32Array, description: string, frameId: string): void {
  queueMicrotask(() => {
    supabase.functions.invoke("zilliz-vectors", {
      body: {
        action: "insert",
        collection: "orion_vision_memory",
        items: [{ id: frameId, vector: Array.from(vector), metadata: { description, ts: Date.now() } }],
      },
    }).catch(() => {});
  });
}

// ─── OpenRouter multimodal call with fallback chain ───
async function callVisionModel(
  imageBase64: string,
  question: string,
  modelConfig: typeof VISION_MODELS[number],
): Promise<string | null> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || "";
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), modelConfig.timeout);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://iasofthub.com",
        "X-Title": "Orion Vision",
      },
      body: JSON.stringify({
        model: modelConfig.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: question || "Descreva objetos, pessoas e ações nesta cena. Seja conciso." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: modelConfig.detail } },
            ],
          },
        ],
        max_tokens: 150,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Public: Smart async analyze with batch support ───
export interface SmartVisionResult {
  description: string | null;
  source: "skipped" | "local_cache" | "zilliz_memory" | "openrouter_fresh";
  latencyMs: number;
  reason?: string;
}

export async function analyzeFrameSmart(
  imageBase64: string,
  question?: string,
): Promise<SmartVisionResult> {
  const t0 = performance.now();
  if (!imageBase64) return { description: null, source: "skipped", latencyMs: 0, reason: "empty_frame" };

  let signature: Float32Array;
  try {
    signature = await perceptualHash(imageBase64);
  } catch {
    // Hash failed → try first model directly
    const desc = await callVisionModel(imageBase64, question || "", VISION_MODELS[0]);
    return { description: desc, source: "openrouter_fresh", latencyMs: performance.now() - t0 };
  }

  // Layer 1: Skip unchanged/dark frames
  const { skip, reason } = shouldSkipFrame(signature);
  if (skip) return { description: null, source: "skipped", latencyMs: performance.now() - t0, reason };

  // Layer 2: Local cache (5s TTL)
  const key = hashKey(signature);
  const cached = localCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { description: cached.result, source: "local_cache", latencyMs: performance.now() - t0 };
  }

  // Layer 3: Zilliz memory
  const memory = await lookupVisualMemory(signature);
  if (memory) {
    localCache.set(key, { result: memory, ts: Date.now() });
    return { description: memory, source: "zilliz_memory", latencyMs: performance.now() - t0 };
  }

  // Layer 4: OpenRouter multimodal with fallback chain
  let description: string | null = null;
  for (const modelConfig of VISION_MODELS) {
    description = await callVisionModel(imageBase64, question || "", modelConfig);
    if (description) break;
  }

  if (description) {
    localCache.set(key, { result: description, ts: Date.now() });
    const frameId = `vis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    saveVisualMemory(signature, description, frameId);
  }

  return { description, source: "openrouter_fresh", latencyMs: performance.now() - t0 };
}

// ─── Batch analyze multiple frames in parallel ───
export async function analyzeFramesBatch(
  frames: string[],
  question?: string,
): Promise<SmartVisionResult[]> {
  return Promise.all(frames.map(frame => analyzeFrameSmart(frame, question)));
}

// ─── Reset state ───
export function resetVisionCache(): void {
  lastFrameSignature = null;
  localCache.clear();
}
