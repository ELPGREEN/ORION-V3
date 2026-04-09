/**
 * TrOCR Handwritten Text Recognition
 * Uses microsoft/trocr-base-handwritten via Transformers.js (ONNX, browser-local).
 * Recognizes handwritten text from images — useful for legal documents, notes, etc.
 */

let trocrPipeline: any = null;
let trocrLoading = false;
let trocrReady = false;

const TROCR_MODEL = "Xenova/trocr-small-handwritten";

/**
 * Preload TrOCR model for handwritten recognition.
 * ~85MB download, cached by browser after first load.
 */
export async function preloadTrOCR(): Promise<boolean> {
  if (trocrReady) return true;
  if (trocrLoading) return false;
  trocrLoading = true;

  try {
    const { pipeline } = await import("@huggingface/transformers");
    trocrPipeline = await pipeline(
      "image-to-text",
      TROCR_MODEL,
      { device: "wasm" }
    );
    trocrReady = true;
    console.log("[TrOCR] ✅ Handwritten recognition model loaded");
    return true;
  } catch (e) {
    console.warn("[TrOCR] Model load failed:", e);
    return false;
  } finally {
    trocrLoading = false;
  }
}

export function isTrOCRReady(): boolean {
  return trocrReady;
}

export interface HandwrittenOCRResult {
  text: string;
  confidence: number;
  source: "trocr";
  inferenceMs: number;
}

/**
 * Recognize handwritten text from an image source.
 * Best results with cropped regions containing single lines of text.
 */
export async function recognizeHandwriting(
  imageSource: string | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<HandwrittenOCRResult> {
  if (!trocrPipeline) {
    await preloadTrOCR();
  }
  if (!trocrPipeline) {
    return { text: "", confidence: 0, source: "trocr", inferenceMs: 0 };
  }

  const start = performance.now();

  try {
    const input = await toDataURL(imageSource);
    const results = await trocrPipeline(input);
    const text = (results as any)?.[0]?.generated_text?.trim() || "";
    const inferenceMs = Math.round(performance.now() - start);

    return {
      text,
      confidence: text.length > 0 ? 0.8 : 0, // TrOCR doesn't output confidence scores
      source: "trocr",
      inferenceMs,
    };
  } catch (e) {
    console.warn("[TrOCR] Inference error:", e);
    return { text: "", confidence: 0, source: "trocr", inferenceMs: Math.round(performance.now() - start) };
  }
}

/**
 * Recognize handwritten text from a video frame (captures current frame).
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
  return recognizeHandwriting(canvas);
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
  return `TEXTO MANUSCRITO (TrOCR): "${result.text}" (${result.inferenceMs}ms)`;
}