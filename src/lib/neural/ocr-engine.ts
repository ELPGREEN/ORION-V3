/**
 * OCR Engine — Real Text Extraction from Images (browser-local)
 * Uses @huggingface/transformers with TrOCR for real optical character recognition.
 * Falls back to canvas-based heuristic if model unavailable.
 */

import { pipeline, type ImageToTextPipeline } from "@huggingface/transformers";
import { isHuggingFaceAvailable } from "./hf-connectivity";

// ─── Types ───
export interface OCRResult {
  /** Extracted text lines */
  texts: string[];
  /** Overall confidence 0-1 */
  confidence: number;
  /** Processing time */
  inferenceMs: number;
  /** Engine used */
  engine: "trocr" | "heuristic";
}

// ─── State ───
let ocrPipeline: ImageToTextPipeline | null = null;
let loading = false;
let lastResult: OCRResult | null = null;
let frameCounter = 0;
const RUN_EVERY_N_FRAMES = 10; // OCR is heavy — run sparingly

// ─── Canvas helpers ───
function cropToCanvas(
  video: HTMLVideoElement,
  region?: { x: number; y: number; width: number; height: number },
  maxDim = 384,
): HTMLCanvasElement {
  const sx = region?.x ?? 0;
  const sy = region?.y ?? 0;
  const sw = region?.width ?? video.videoWidth;
  const sh = region?.height ?? video.videoHeight;

  const scale = Math.min(maxDim / sw, maxDim / sh, 1);
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);

  const c = document.createElement("canvas");
  c.width = dw;
  c.height = dh;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
  return c;
}

// ─── Core ───

export async function preloadOCR(): Promise<boolean> {
  if (ocrPipeline || loading) return !!ocrPipeline;
  if (!await isHuggingFaceAvailable()) {
    console.log("[OCREngine] Skipping — HuggingFace unreachable");
    return false;
  }
  loading = true;
  try {
    ocrPipeline = await pipeline(
      "image-to-text",
      "Xenova/trocr-small-printed",
    ) as ImageToTextPipeline;
    console.log("[OCREngine] ✅ TrOCR model loaded");
    return true;
  } catch (e) {
    console.warn("[OCREngine] TrOCR load failed, will use heuristic:", e);
    return false;
  } finally {
    loading = false;
  }
}

export function isOCRReady(): boolean {
  return !!ocrPipeline;
}

/**
 * Extract text from a video frame or image.
 * Throttled to every N frames. Returns cached result on skipped frames.
 */
export async function extractText(
  video: HTMLVideoElement,
  region?: { x: number; y: number; width: number; height: number },
  force = false,
): Promise<OCRResult | null> {
  frameCounter++;
  if (!force && frameCounter % RUN_EVERY_N_FRAMES !== 0) return lastResult;

  const start = performance.now();

  if (ocrPipeline) {
    try {
      const canvas = cropToCanvas(video, region, 384);
      const dataUrl = canvas.toDataURL("image/png");
      const output = await ocrPipeline(dataUrl);

      const texts: string[] = [];
      if (Array.isArray(output)) {
        for (const item of output) {
          const text = (item as any)?.generated_text?.trim();
          if (text && text.length > 1) texts.push(text);
        }
      }

      lastResult = {
        texts,
        confidence: texts.length > 0 ? 0.8 : 0.1,
        inferenceMs: Math.round(performance.now() - start),
        engine: "trocr",
      };
      return lastResult;
    } catch (e) {
      console.warn("[OCREngine] TrOCR inference error:", e);
    }
  }

  // ─── Heuristic fallback: edge density analysis ───
  try {
    const canvas = cropToCanvas(video, region, 200);
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasTextLikeRegions = detectTextRegions(imgData);

    lastResult = {
      texts: hasTextLikeRegions ? ["[texto detectado — modelo OCR não carregado]"] : [],
      confidence: hasTextLikeRegions ? 0.3 : 0.05,
      inferenceMs: Math.round(performance.now() - start),
      engine: "heuristic",
    };
    return lastResult;
  } catch {
    return lastResult;
  }
}

/**
 * Simple heuristic: detect high-contrast horizontal edges typical of text.
 */
function detectTextRegions(imgData: ImageData): boolean {
  const { data, width, height } = imgData;
  let edgeCount = 0;
  const threshold = 40;

  // Sample horizontal gradients
  for (let y = 2; y < height - 2; y += 3) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const idxLeft = (y * width + x - 1) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const grayLeft = (data[idxLeft] + data[idxLeft + 1] + data[idxLeft + 2]) / 3;
      if (Math.abs(gray - grayLeft) > threshold) edgeCount++;
    }
  }

  const density = edgeCount / ((width * height) / 6);
  return density > 0.15; // Text typically has high edge density
}

/**
 * Format OCR result for AI prompt.
 */
export function formatOCRForAI(result: OCRResult | null): string {
  if (!result || result.texts.length === 0) return "";
  return `TEXTO OCR (${result.engine}, ${result.inferenceMs}ms): ${result.texts.join(" | ")}`;
}
