/**
 * Depth Estimation Engine — MiDaS via Transformers.js
 * Estimates depth maps from video frames, 100% browser-local.
 * Uses Xenova/depth-anything-small-hf (lighter, faster than DPT-MiDaS).
 */

import { pipeline, type DepthEstimationPipeline } from "@huggingface/transformers";
import { isHuggingFaceAvailable } from "./hf-connectivity";

// ─── Types ───
export interface DepthEstimationResult {
  /** Normalized depth map [0..1], row-major */
  depthMap: Float32Array;
  width: number;
  height: number;
  inferenceMs: number;
}

export interface ObjectDepthInfo {
  name: string;
  estimatedDistanceM: number;
  depthNormalized: number;
  confidence: number;
}

// ─── State ───
let depthPipeline: DepthEstimationPipeline | null = null;
let loading = false;
let lastResult: DepthEstimationResult | null = null;
let frameCounter = 0;
const RUN_EVERY_N_FRAMES = 5; // ~200ms at 25fps

/**
 * Get adaptive max dimension for depth estimation based on hardware.
 * - WebGPU-capable: 384px (high quality)
 * - 8+ cores: 320px
 * - 4+ cores: 256px (default)
 * - Low-end: 128px (fast but coarse)
 */
function getAdaptiveDepthDim(): number {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) return 384;
  const cores = (typeof navigator !== 'undefined' ? (navigator as any).hardwareConcurrency : 2) ?? 2;
  if (cores >= 8) return 320;
  if (cores >= 4) return 256;
  return 128;
}

// ─── Helpers ───
function videoToCanvas(video: HTMLVideoElement, maxDim?: number): HTMLCanvasElement {
  const dim = maxDim ?? getAdaptiveDepthDim();
  const scale = Math.min(dim / video.videoWidth, dim / video.videoHeight, 1);
  const w = Math.round(video.videoWidth * scale);
  const h = Math.round(video.videoHeight * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(video, 0, 0, w, h);
  return c;
}

function canvasToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", 0.7);
}

// ─── Core ───

export async function preloadDepthEstimation(): Promise<boolean> {
  if (depthPipeline || loading) return !!depthPipeline;
  loading = true;
  try {
    depthPipeline = await pipeline("depth-estimation", "Xenova/depth-anything-small-hf", {
      device: "webgpu" as any,
      dtype: "fp32" as any,
    }).catch(() =>
      // fallback to WASM if WebGPU unavailable
      pipeline("depth-estimation", "Xenova/depth-anything-small-hf")
    ) as DepthEstimationPipeline;
    console.log("[DepthEngine] ✅ Model loaded");
    return true;
  } catch (e) {
    console.warn("[DepthEngine] Failed to load:", e);
    return false;
  } finally {
    loading = false;
  }
}

export function isDepthReady(): boolean {
  return !!depthPipeline;
}

/**
 * Run depth estimation on a video frame.
 * Throttled to every N frames for performance.
 * Returns cached result on skipped frames.
 */
export async function estimateDepth(
  video: HTMLVideoElement,
  force = false,
): Promise<DepthEstimationResult | null> {
  frameCounter++;
  if (!force && frameCounter % RUN_EVERY_N_FRAMES !== 0) return lastResult;
  if (!depthPipeline) return null;

  const start = performance.now();
  try {
    const canvas = videoToCanvas(video, 256);
    const dataUrl = canvasToDataURL(canvas);
    const output = await depthPipeline(dataUrl);

    // output.depth is a RawImage with { data, width, height }
    const raw = (output as any)?.depth ?? output;
    const data = raw?.data;
    const w = raw?.width ?? canvas.width;
    const h = raw?.height ?? canvas.height;

    if (!data) return lastResult;

    // Normalize to 0-1
    const depthMap = new Float32Array(data.length);
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    const range = max - min || 1;
    for (let i = 0; i < data.length; i++) {
      depthMap[i] = (data[i] - min) / range;
    }

    lastResult = { depthMap, width: w, height: h, inferenceMs: Math.round(performance.now() - start) };
    return lastResult;
  } catch (e) {
    console.warn("[DepthEngine] Inference error:", e);
    return lastResult;
  }
}

/**
 * Get estimated depth for a bounding box region.
 * Returns normalized depth (0=near, 1=far) and rough meters estimate.
 */
export function getObjectDepth(
  depthResult: DepthEstimationResult,
  bbox: { x: number; y: number; width: number; height: number },
  frameWidth: number,
  frameHeight: number,
): ObjectDepthInfo | null {
  if (!depthResult?.depthMap) return null;

  const { depthMap, width: dw, height: dh } = depthResult;
  const scaleX = dw / frameWidth;
  const scaleY = dh / frameHeight;

  // Map bbox to depth map coordinates
  const x1 = Math.max(0, Math.round(bbox.x * scaleX));
  const y1 = Math.max(0, Math.round(bbox.y * scaleY));
  const x2 = Math.min(dw - 1, Math.round((bbox.x + bbox.width) * scaleX));
  const y2 = Math.min(dh - 1, Math.round((bbox.y + bbox.height) * scaleY));

  // Sample center region (inner 50%) for more stable reading
  const cx1 = Math.round(x1 + (x2 - x1) * 0.25);
  const cx2 = Math.round(x1 + (x2 - x1) * 0.75);
  const cy1 = Math.round(y1 + (y2 - y1) * 0.25);
  const cy2 = Math.round(y1 + (y2 - y1) * 0.75);

  let sum = 0, count = 0;
  for (let y = cy1; y <= cy2; y++) {
    for (let x = cx1; x <= cx2; x++) {
      const idx = y * dw + x;
      if (idx < depthMap.length) {
        sum += depthMap[idx];
        count++;
      }
    }
  }

  if (count === 0) return null;
  const avgDepth = sum / count;

  // Rough heuristic: map 0-1 depth to ~0.3m-10m (monocular, uncalibrated)
  const estimatedM = 0.3 + avgDepth * 9.7;

  return {
    name: "",
    estimatedDistanceM: Math.round(estimatedM * 10) / 10,
    depthNormalized: Math.round(avgDepth * 100) / 100,
    confidence: Math.min(1, count / 100),
  };
}

/**
 * Format depth info for AI prompt enrichment.
 */
export function formatDepthForAI(
  depthResult: DepthEstimationResult | null,
  detections: Array<{ name: string; namePt: string; x: number; y: number; width: number; height: number }>,
  frameWidth: number,
  frameHeight: number,
): string {
  if (!depthResult || detections.length === 0) return "";

  const items: string[] = [];
  for (const det of detections.slice(0, 8)) {
    const info = getObjectDepth(depthResult, det, frameWidth, frameHeight);
    if (info) {
      items.push(`${det.namePt}: ~${info.estimatedDistanceM}m`);
    }
  }

  if (items.length === 0) return "";
  return `PROFUNDIDADE ESTIMADA (MiDaS): ${items.join(", ")} | ${depthResult.inferenceMs}ms`;
}
