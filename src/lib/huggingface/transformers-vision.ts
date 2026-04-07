/**
 * Transformers.js — Vision no Browser (100% grátis, offline)
 * 
 * Modelos ONNX leves que rodam em WebAssembly/WebGPU:
 * - Image Classification (ViT) ~85MB
 * - Object Detection (DETR) ~160MB  
 * - Zero-Shot Image Classification (CLIP) ~340MB
 * - Image Captioning (ViT-GPT2) ~180MB
 * - Depth Estimation (Depth-Anything) ~25MB
 */

let transformersModule: typeof import("@huggingface/transformers") | null = null;
const pipelineCache = new Map<string, unknown>();

async function getTransformers() {
  if (!transformersModule) {
    transformersModule = await import("@huggingface/transformers");
  }
  return transformersModule;
}

async function getVisionPipeline(task: string, model: string) {
  const key = `${task}:${model}`;
  if (pipelineCache.has(key)) return pipelineCache.get(key);

  const { pipeline } = await getTransformers();
  console.log(`[TJS-Vision] Loading ${task} (${model})...`);
  const pipe = await pipeline(task as any, model);
  pipelineCache.set(key, pipe);
  console.log(`[TJS-Vision] Ready: ${task}`);
  return pipe;
}

// ─── Types ───

export interface VisionClassification {
  label: string;
  score: number;
}

export interface VisionDetection {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

export interface VisionCaption {
  generated_text: string;
}

// ─── Image Classification (ViT) ───

export async function classifyImage(
  imageSource: string | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  model = "Xenova/vit-base-patch16-224",
  topK = 5
): Promise<VisionClassification[]> {
  const pipe = await getVisionPipeline("image-classification", model) as any;
  const input = await prepareInput(imageSource);
  const results = await pipe(input, { topk: topK });
  return results as VisionClassification[];
}

// ─── Object Detection (DETR) ───

export async function detectObjects(
  imageSource: string | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  model = "Xenova/detr-resnet-50",
  threshold = 0.5
): Promise<VisionDetection[]> {
  const pipe = await getVisionPipeline("object-detection", model) as any;
  const input = await prepareInput(imageSource);
  const results = await pipe(input, { threshold });
  return results as VisionDetection[];
}

// ─── Zero-Shot Image Classification (CLIP) ───

export async function classifyImageZeroShot(
  imageSource: string | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  candidateLabels: string[],
  model = "Xenova/clip-vit-base-patch32"
): Promise<VisionClassification[]> {
  const pipe = await getVisionPipeline("zero-shot-image-classification", model) as any;
  const input = await prepareInput(imageSource);
  const results = await pipe(input, candidateLabels);
  return results as VisionClassification[];
}

// ─── Image Captioning (ViT-GPT2) ───

export async function captionImage(
  imageSource: string | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  model = "Xenova/vit-gpt2-image-captioning",
  maxLength = 50
): Promise<string> {
  const pipe = await getVisionPipeline("image-to-text", model) as any;
  const input = await prepareInput(imageSource);
  const results = await pipe(input, { max_new_tokens: maxLength });
  const captions = results as VisionCaption[];
  return captions[0]?.generated_text || "";
}

// ─── Depth Estimation (Depth-Anything) ───

export async function estimateDepth(
  imageSource: string | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  model = "Xenova/depth-anything-small-hf"
): Promise<{ depth: Float32Array; width: number; height: number }> {
  const pipe = await getVisionPipeline("depth-estimation", model) as any;
  const input = await prepareInput(imageSource);
  const result = await pipe(input);
  return {
    depth: result.predicted_depth?.data || result.depth?.data || new Float32Array(),
    width: result.predicted_depth?.dims?.[1] || 0,
    height: result.predicted_depth?.dims?.[0] || 0,
  };
}

// ─── Helpers ───

async function prepareInput(
  source: string | HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<string> {
  if (typeof source === "string") return source;

  // Convert HTML elements to data URL
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
  if (!ctx) throw new Error("Canvas 2D not available");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function clearVisionCache(): void {
  pipelineCache.clear();
  console.log("[TJS-Vision] Cache cleared");
}

export function getLoadedVisionModels(): string[] {
  return Array.from(pipelineCache.keys());
}
