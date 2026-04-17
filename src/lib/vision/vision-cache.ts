/**
 * ─── Vision Cache — Smart frame analysis with Zilliz memory ───
 *
 * 3-layer optimization:
 *  1. Client pre-filter — pixel diff + brightness → skip static/dark frames (0ms)
 *  2. Zilliz visual memory — perceptual hash lookup → reuse past description (~50ms)
 *  3. Gemini fallback — only on truly novel scenes → save + cache (~1500ms)
 *
 * Embedding strategy: 16x16 grayscale perceptual hash → 256-dim vector (COSINE).
 * Lightweight, deterministic, no model needed in browser.
 */

import { supabase } from "@/integrations/supabase/client";
import { analyzeFrame, type GeminiVisionResult } from "./gemini-vision";

// ─── Tuning ───
const PIXEL_DIFF_THRESHOLD = 0.08; // 8% pixel change = "new scene"
const DARK_FRAME_THRESHOLD = 25; // mean luminance < 25/255 = too dark
const ZILLIZ_SIMILARITY_THRESHOLD = 0.92; // cosine similarity ≥ 0.92 = same scene
const CACHE_TTL_MS = 2_000; // local memo: same hash within 2s → instant return

// ─── State ───
let lastFrameSignature: Float32Array | null = null;
let lastFrameMeanLuma = 0;
const localCache = new Map<string, { result: GeminiVisionResult; ts: number }>();

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
        // Grayscale luma + normalize to [0, 1]
        vec[j] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      }
      // L2-normalize for cosine similarity
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

// ─── Layer 1: pixel-diff pre-filter (synchronous, ~1ms) ───
function shouldSkipFrame(signature: Float32Array): { skip: boolean; reason?: string } {
  // Brightness check
  let sum = 0;
  for (let i = 0; i < signature.length; i++) sum += signature[i];
  const meanLuma = (sum / signature.length) * 255;
  if (meanLuma < DARK_FRAME_THRESHOLD) {
    return { skip: true, reason: "frame_too_dark" };
  }

  // Diff vs previous frame
  if (lastFrameSignature) {
    let diff = 0;
    for (let i = 0; i < signature.length; i++) {
      diff += Math.abs(signature[i] - lastFrameSignature[i]);
    }
    const normalizedDiff = diff / signature.length;
    if (normalizedDiff < PIXEL_DIFF_THRESHOLD) {
      return { skip: true, reason: "scene_unchanged" };
    }
  }

  lastFrameSignature = signature;
  lastFrameMeanLuma = meanLuma;
  return { skip: false };
}

// ─── Layer 2: Zilliz visual memory lookup ───
async function lookupVisualMemory(vector: Float32Array): Promise<GeminiVisionResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke("zilliz-vectors", {
      body: {
        action: "search",
        collection: "orion_vision_memory",
        vector: Array.from(vector),
        topK: 1,
      },
    });
    if (error || !data?.results) return null;
    const hits = Array.isArray(data.results[0]) ? data.results[0] : data.results;
    const top = hits[0];
    if (!top) return null;

    // Zilliz COSINE returns distance (1 - similarity). Convert.
    const similarity = typeof top.distance === "number" ? 1 - top.distance : 0;
    if (similarity < ZILLIZ_SIMILARITY_THRESHOLD) return null;

    return {
      description: (top.description as string) || null,
      objects: (top.objects as any[]) || [],
    };
  } catch {
    return null;
  }
}

// ─── Layer 3: save new analysis to Zilliz (fire-and-forget) ───
function saveVisualMemory(vector: Float32Array, result: GeminiVisionResult, frameId: string): void {
  if (!result.description) return;
  queueMicrotask(() => {
    supabase.functions
      .invoke("zilliz-vectors", {
        body: {
          action: "insert",
          collection: "orion_vision_memory",
          items: [
            {
              id: frameId,
              vector: Array.from(vector),
              metadata: {
                description: result.description,
                objects: result.objects ?? [],
                ts: Date.now(),
              },
            },
          ],
        },
      })
      .catch(() => {});
  });
}

// ─── Public: smart analyze ───
export interface SmartVisionResult extends GeminiVisionResult {
  source: "skipped" | "local_cache" | "zilliz_memory" | "gemini_fresh";
  latencyMs: number;
  reason?: string;
}

export async function analyzeFrameSmart(
  imageBase64: string,
  question?: string,
  context?: string,
): Promise<SmartVisionResult> {
  const t0 = performance.now();
  if (!imageBase64) {
    return { description: null, source: "skipped", latencyMs: 0, reason: "empty_frame" };
  }

  // Compute perceptual hash
  let signature: Float32Array;
  try {
    signature = await perceptualHash(imageBase64);
  } catch {
    // Fallback: skip cache, go straight to Gemini
    const fresh = await analyzeFrame(imageBase64, question, context);
    return { ...fresh, source: "gemini_fresh", latencyMs: performance.now() - t0 };
  }

  // Layer 1: pixel-diff pre-filter
  const { skip, reason } = shouldSkipFrame(signature);
  if (skip) {
    return {
      description: null,
      source: "skipped",
      latencyMs: performance.now() - t0,
      reason,
    };
  }

  // Local 2s cache by hash key
  const hashKey = signature.slice(0, 32).join(",");
  const cached = localCache.get(hashKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { ...cached.result, source: "local_cache", latencyMs: performance.now() - t0 };
  }

  // Layer 2: Zilliz memory
  const memory = await lookupVisualMemory(signature);
  if (memory) {
    localCache.set(hashKey, { result: memory, ts: Date.now() });
    return { ...memory, source: "zilliz_memory", latencyMs: performance.now() - t0 };
  }

  // Layer 3: Gemini fresh + save
  const fresh = await analyzeFrame(imageBase64, question, context);
  if (fresh.description) {
    const frameId = `vis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    saveVisualMemory(signature, fresh, frameId);
    localCache.set(hashKey, { result: fresh, ts: Date.now() });
  }
  return { ...fresh, source: "gemini_fresh", latencyMs: performance.now() - t0 };
}

/** Reset state (useful when camera restarts) */
export function resetVisionCache(): void {
  lastFrameSignature = null;
  lastFrameMeanLuma = 0;
  localCache.clear();
}
