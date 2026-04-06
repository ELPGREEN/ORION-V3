/**
 * HF Vision Gate — Free HuggingFace Vision Classification
 * Uses @huggingface/transformers (browser-local, zero API costs) to classify
 * images BEFORE sending to Gemini. If confidence is high enough, skip Gemini entirely.
 * 
 * Strategy: 60%+ Gemini cost reduction by:
 * 1. HF image classification → if confident, return immediately (no Gemini)
 * 2. HF image captioning → if descriptive enough + local detections, skip Gemini
 * 3. When Gemini IS needed, reduce image resolution & token limits
 */

import { pipeline, type ImageClassificationPipeline, type ImageToTextPipeline } from "@huggingface/transformers";

// ─── State ───
let classifierPipeline: ImageClassificationPipeline | null = null;
let captionerPipeline: ImageToTextPipeline | null = null;
let classifierLoading = false;
let captionerLoading = false;
let _gateStats = { totalCalls: 0, gatedCalls: 0, geminiCalls: 0, savedTokensEstimate: 0 };

// ─── Types ───
export interface HFVisionGateResult {
  /** Whether the gate handled the request (Gemini NOT needed) */
  gated: boolean;
  /** Classification labels with confidence */
  classifications: Array<{ label: string; score: number }>;
  /** Generated caption (if available) */
  caption: string | null;
  /** Combined confidence score 0-1 */
  confidence: number;
  /** Processing time */
  inferenceMs: number;
  /** Recommendation for Gemini usage */
  geminiAction: "skip" | "text_only" | "low_res_image" | "full";
}

export interface LocalDetectionContext {
  objectCount: number;
  faceCount: number;
  hasOCR: boolean;
  hasScene: boolean;
  topObjects: string[];
  confidence: number;
}

// ─── Configuration ───
const GATE_CONFIDENCE_THRESHOLD = 0.70; // Skip Gemini if HF+local confidence > 70%
const CAPTION_MIN_LENGTH = 15; // Minimum caption length to be useful
const MAX_IMAGE_DIM_FOR_HF = 224; // MobileNet expects 224x224

// ─── Preloading ───

export async function preloadHFVisionGate(): Promise<boolean> {
  const results = await Promise.allSettled([
    preloadClassifier(),
    preloadCaptioner(),
  ]);
  return results.some(r => r.status === "fulfilled" && r.value === true);
}

async function preloadClassifier(): Promise<boolean> {
  if (classifierPipeline || classifierLoading) return !!classifierPipeline;
  classifierLoading = true;
  try {
    classifierPipeline = await pipeline(
      "image-classification",
      "Xenova/mobilevit-small",
      { device: "wasm" }
    ) as ImageClassificationPipeline;
    console.log("[HFVisionGate] ✅ MobileViT classifier loaded (free, local)");
    return true;
  } catch (e) {
    console.warn("[HFVisionGate] Classifier load failed:", e);
    return false;
  } finally {
    classifierLoading = false;
  }
}

async function preloadCaptioner(): Promise<boolean> {
  if (captionerPipeline || captionerLoading) return !!captionerPipeline;
  captionerLoading = true;
  try {
    captionerPipeline = await pipeline(
      "image-to-text",
      "Xenova/vit-gpt2-image-captioning",
      { device: "wasm" }
    ) as ImageToTextPipeline;
    console.log("[HFVisionGate] ✅ ViT-GPT2 captioner loaded (free, local)");
    return true;
  } catch (e) {
    console.warn("[HFVisionGate] Captioner load failed:", e);
    return false;
  } finally {
    captionerLoading = false;
  }
}

// ─── Core Gate Logic ───

/**
 * Run the HF Vision Gate on a canvas frame.
 * Returns whether Gemini can be skipped and what action to take.
 */
export async function runVisionGate(
  canvas: HTMLCanvasElement | null,
  localContext: LocalDetectionContext,
  questionType: "visual" | "textual" | "mixed",
): Promise<HFVisionGateResult> {
  const start = performance.now();
  _gateStats.totalCalls++;

  // Text-only queries never need image analysis
  if (questionType === "textual") {
    _gateStats.gatedCalls++;
    return {
      gated: true,
      classifications: [],
      caption: null,
      confidence: 1.0,
      inferenceMs: 0,
      geminiAction: "text_only",
    };
  }

  // If no canvas or no HF models loaded, pass through to Gemini
  if (!canvas || (!classifierPipeline && !captionerPipeline)) {
    _gateStats.geminiCalls++;
    return {
      gated: false,
      classifications: [],
      caption: null,
      confidence: 0,
      inferenceMs: Math.round(performance.now() - start),
      geminiAction: localContext.objectCount > 3 ? "low_res_image" : "full",
    };
  }

  // Downscale canvas for HF models
  const dataUrl = downscaleToDataUrl(canvas, MAX_IMAGE_DIM_FOR_HF);

  // Run classifier and captioner in parallel
  const [classResult, captionResult] = await Promise.allSettled([
    classifierPipeline
      ? classifierPipeline(dataUrl, { topk: 5 })
      : Promise.resolve([]),
    captionerPipeline
      ? captionerPipeline(dataUrl)
      : Promise.resolve([]),
  ]);

  const classifications: Array<{ label: string; score: number }> = 
    classResult.status === "fulfilled" && Array.isArray(classResult.value)
      ? (classResult.value as any[]).map(c => ({ label: c.label, score: c.score }))
      : [];

  let caption: string | null = null;
  if (captionResult.status === "fulfilled" && Array.isArray(captionResult.value)) {
    const text = (captionResult.value[0] as any)?.generated_text?.trim();
    if (text && text.length >= CAPTION_MIN_LENGTH) caption = text;
  }

  const inferenceMs = Math.round(performance.now() - start);

  // Calculate combined confidence from HF + local detections
  const hfTopScore = classifications.length > 0 ? classifications[0].score : 0;
  const localScore = localContext.confidence;
  const combinedConfidence = Math.max(hfTopScore, localScore);

  // Decide gate action
  const richLocalData = localContext.objectCount >= 3 || 
    (localContext.faceCount > 0 && localContext.hasScene);
  
  let geminiAction: HFVisionGateResult["geminiAction"];
  let gated = false;

  if (combinedConfidence >= GATE_CONFIDENCE_THRESHOLD && richLocalData && caption) {
    // High confidence + rich local data + caption → skip Gemini entirely
    geminiAction = "skip";
    gated = true;
    _gateStats.gatedCalls++;
    _gateStats.savedTokensEstimate += 3000; // ~3000 tokens saved per skipped call
  } else if (combinedConfidence >= 0.55 && richLocalData) {
    // Medium confidence + rich local data → send text context only (no image)
    geminiAction = "text_only";
    gated = false;
    _gateStats.geminiCalls++;
    _gateStats.savedTokensEstimate += 2000; // ~2000 tokens saved (no image)
  } else if (localContext.objectCount > 0 || classifications.length > 0) {
    // Some detections → send low-res image
    geminiAction = "low_res_image";
    gated = false;
    _gateStats.geminiCalls++;
    _gateStats.savedTokensEstimate += 1000; // ~1000 tokens saved (smaller image)
  } else {
    // No local data → full Gemini call
    geminiAction = "full";
    _gateStats.geminiCalls++;
  }

  console.log(
    `[HFVisionGate] ${geminiAction} | HF:${(hfTopScore * 100).toFixed(0)}% Local:${(localScore * 100).toFixed(0)}% | ` +
    `${classifications.length} classes, caption:${caption ? "yes" : "no"} | ${inferenceMs}ms | ` +
    `Stats: ${_gateStats.gatedCalls}/${_gateStats.totalCalls} gated (~${_gateStats.savedTokensEstimate} tokens saved)`
  );

  return { gated, classifications, caption, confidence: combinedConfidence, inferenceMs, geminiAction };
}

/**
 * Build a rich description from HF + local detections (used when Gemini is skipped).
 */
export function buildGatedResponse(
  gate: HFVisionGateResult,
  localContext: LocalDetectionContext,
  question: string,
): string {
  const parts: string[] = [];

  if (gate.caption) {
    parts.push(gate.caption);
  }

  if (gate.classifications.length > 0) {
    const topClasses = gate.classifications
      .filter(c => c.score > 0.1)
      .slice(0, 3)
      .map(c => `${c.label} (${(c.score * 100).toFixed(0)}%)`)
      .join(", ");
    if (topClasses) parts.push(`Classificação: ${topClasses}`);
  }

  if (localContext.topObjects.length > 0) {
    parts.push(`Objetos detectados localmente: ${localContext.topObjects.join(", ")}`);
  }

  if (localContext.faceCount > 0) {
    parts.push(`${localContext.faceCount} rosto(s) detectado(s)`);
  }

  return parts.join(". ") + ".";
}

/**
 * Get gate statistics for monitoring.
 */
export function getGateStats() {
  const bypassRate = _gateStats.totalCalls > 0
    ? Math.round((_gateStats.gatedCalls / _gateStats.totalCalls) * 100)
    : 0;
  return { ..._gateStats, bypassRate };
}

export function isHFVisionGateReady(): boolean {
  return !!classifierPipeline || !!captionerPipeline;
}

// ─── Helpers ───

function downscaleToDataUrl(canvas: HTMLCanvasElement, maxDim: number): string {
  const scale = Math.min(maxDim / canvas.width, maxDim / canvas.height, 1);
  const w = Math.round(canvas.width * scale);
  const h = Math.round(canvas.height * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.8);
}
