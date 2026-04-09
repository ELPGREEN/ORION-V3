/**
 * TrOCR Text Recognition — Handwritten + Printed
 * Uses microsoft/trocr-base-handwritten AND trocr-base-printed via Transformers.js (ONNX).
 * 100% browser-local, zero API calls.
 */

let trocrHandwrittenPipeline: any = null;
let trocrPrintedPipeline: any = null;
let trocrHandwrittenLoading = false;
let trocrPrintedLoading = false;
let trocrHandwrittenReady = false;
let trocrPrintedReady = false;

const TROCR_HANDWRITTEN_MODEL = "Xenova/trocr-small-handwritten";
const TROCR_PRINTED_MODEL = "Xenova/trocr-small-printed";

/**
 * Preload TrOCR handwritten model.
 */
export async function preloadTrOCR(): Promise<boolean> {
  if (trocrHandwrittenReady) return true;
  if (trocrHandwrittenLoading) return false;
  trocrHandwrittenLoading = true;

  try {
    const { pipeline } = await import("@huggingface/transformers");
    trocrHandwrittenPipeline = await pipeline(
      "image-to-text",
      TROCR_HANDWRITTEN_MODEL,
      { device: "wasm" }
    );
    trocrHandwrittenReady = true;
    console.log("[TrOCR] ✅ Handwritten recognition model loaded");
    return true;
  } catch (e) {
    console.warn("[TrOCR] Handwritten model load failed:", e);
    return false;
  } finally {
    trocrHandwrittenLoading = false;
  }
}

/**
 * Preload TrOCR printed text model (microsoft/trocr-base-printed).
 * Optimized for printed/typed text — much better than handwritten model for docs.
 */
export async function preloadTrOCRPrinted(): Promise<boolean> {
  if (trocrPrintedReady) return true;
  if (trocrPrintedLoading) return false;
  trocrPrintedLoading = true;

  try {
    const { pipeline } = await import("@huggingface/transformers");
    trocrPrintedPipeline = await pipeline(
      "image-to-text",
      TROCR_PRINTED_MODEL,
      { device: "wasm" }
    );
    trocrPrintedReady = true;
    console.log("[TrOCR] ✅ Printed recognition model loaded");
    return true;
  } catch (e) {
    console.warn("[TrOCR] Printed model load failed:", e);
    return false;
  } finally {
    trocrPrintedLoading = false;
  }
}

export function isTrOCRReady(): boolean {
  return trocrHandwrittenReady || trocrPrintedReady;
}

export function isTrOCRPrintedReady(): boolean {
  return trocrPrintedReady;
}

export interface HandwrittenOCRResult {
  text: string;
  confidence: number;
  source: "trocr-handwritten" | "trocr-printed" | "trocr";
  inferenceMs: number;
}

/**
 * Recognize handwritten text from an image source.
 */
export async function recognizeHandwriting(
  imageSource: string | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<HandwrittenOCRResult> {
  if (!trocrHandwrittenPipeline) {
    await preloadTrOCR();
  }
  if (!trocrHandwrittenPipeline) {
    return { text: "", confidence: 0, source: "trocr-handwritten", inferenceMs: 0 };
  }

  const start = performance.now();
  try {
    const input = await toDataURL(imageSource);
    const results = await trocrHandwrittenPipeline(input);
    const text = (results as any)?.[0]?.generated_text?.trim() || "";
    return {
      text,
      confidence: text.length > 0 ? 0.8 : 0,
      source: "trocr-handwritten",
      inferenceMs: Math.round(performance.now() - start),
    };
  } catch (e) {
    console.warn("[TrOCR] Handwritten inference error:", e);
    return { text: "", confidence: 0, source: "trocr-handwritten", inferenceMs: Math.round(performance.now() - start) };
  }
}

/**
 * Recognize printed text from an image source.
 * Uses microsoft/trocr-base-printed — best for typed/printed documents.
 */
export async function recognizePrintedText(
  imageSource: string | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<HandwrittenOCRResult> {
  if (!trocrPrintedPipeline) {
    await preloadTrOCRPrinted();
  }
  if (!trocrPrintedPipeline) {
    return { text: "", confidence: 0, source: "trocr-printed", inferenceMs: 0 };
  }

  const start = performance.now();
  try {
    const input = await toDataURL(imageSource);
    const results = await trocrPrintedPipeline(input);
    const text = (results as any)?.[0]?.generated_text?.trim() || "";
    return {
      text,
      confidence: text.length > 0 ? 0.85 : 0,
      source: "trocr-printed",
      inferenceMs: Math.round(performance.now() - start),
    };
  } catch (e) {
    console.warn("[TrOCR] Printed inference error:", e);
    return { text: "", confidence: 0, source: "trocr-printed", inferenceMs: Math.round(performance.now() - start) };
  }
}

/**
 * Smart OCR: auto-selects handwritten or printed model based on availability.
 * Prioritizes printed (more common), falls back to handwritten.
 */
export async function recognizeTextSmart(
  imageSource: string | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<HandwrittenOCRResult> {
  // Try printed first (more accurate for most content)
  if (trocrPrintedReady || (!trocrHandwrittenReady && !trocrPrintedReady)) {
    const result = await recognizePrintedText(imageSource);
    if (result.text.length > 0) return result;
  }
  // Fallback to handwritten
  return recognizeHandwriting(imageSource);
}

/**
 * Recognize text from a video frame (captures current frame).
 */
export async function recognizeHandwritingFromVideo(
  video: HTMLVideoElement
): Promise<HandwrittenOCRResult> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { text: "", confidence: 0, source: "trocr", inferenceMs: 0 };
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return recognizeTextSmart(canvas);
}

async function toDataURL(
  source: string | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<string> {
  if (typeof source === "string") return source;

  const canvas = document.createElement("canvas");
  if (source instanceof HTMLVideoElement) {
    canvas.width = source.videoWidth || 640;
    canvas.height = source.videoHeight || 480;
  } else if (source instanceof HTMLImageElement) {
    canvas.width = source.naturalWidth || source.width;
    canvas.height = source.naturalHeight || source.height;
  } else {
    canvas.width = source.width;
    canvas.height = source.height;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export function formatHandwrittenOCRForAI(result: HandwrittenOCRResult): string {
  if (!result.text) return "";
  const label = result.source === "trocr-printed" ? "TEXTO IMPRESSO" : "TEXTO MANUSCRITO";
  return `${label} (TrOCR): "${result.text}" (${result.inferenceMs}ms)`;
}