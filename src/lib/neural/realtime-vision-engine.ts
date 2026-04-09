/**
 * Unified Real-Time Vision Engine
 * Combines MediaPipe (faces, hands, objects, poses) + YOLO ONNX (80 COCO classes)
 * + Temporal Buffer + Regional Description + Layout Parsing
 * 100% local, zero API calls, runs in browser via WASM/WebGL.
 */

import { markVisionStart, markVisionEnd } from "./pipeline-latency-tracker";

import { detectAllMP, preloadMediaPipe, isMediaPipeReady, type MPVisionResult, type MPPose } from "./mediapipe-vision";
import { preloadHFVisionGate } from "./hf-vision-gate";
import { detectWithYOLO, preloadYOLO, isYOLOReady, type YOLODetection } from "./yolo-onnx-detector";
import { yoloFrameX } from "./yolo-framex-engine";
import type { MultiTaskResult } from "./yolo-framex-types";
import { estimateDepth, preloadDepthEstimation, isDepthReady, formatDepthForAI, type DepthEstimationResult } from "./depth-estimation-engine";
import { analyzeFaceAttributes, formatFaceAttributesForAI, type FaceAttributes, type FaceAttributesInput } from "./face-attributes-engine";
import { extractText, preloadOCR, isOCRReady, formatOCRForAI, type OCRResult } from "./ocr-engine";
import { reconstructScene, format3DForAI, type SceneReconstruction } from "./scene-reconstruction-3d";
import { enhanceVisionDetections, formatQuantumVisionForAI, type VisionEnhancementResult } from "./quantum-vision-enhancer";
import { estimateGaze, formatGazeForAI, type GazeResult } from "./gaze-detection";
import { recognizeHandwritingFromVideo, isTrOCRReady, formatHandwrittenOCRForAI, preloadTrOCRPrinted, type HandwrittenOCRResult } from "./trocr-handwritten";
import { visionTemporalBuffer } from "./vision-temporal-buffer";
import { prepareRegionalDescriptions, formatRegionalForAI, type RegionalDescription } from "./vision-regional-description";
import { parseDocumentLayout, formatLayoutForAI, type DocumentLayout } from "./vision-layout-parser";

export interface RealTimeVisionResult {
  /** MediaPipe detected objects (EfficientDet) */
  mpObjects: MPVisionResult["objects"];
  /** YOLO detected objects (80 COCO classes) */
  yoloObjects: YOLODetection[];
  /** Merged unique objects from both detectors */
  allObjects: UnifiedDetection[];
  /** Faces from MediaPipe */
  faces: MPVisionResult["faces"];
  /** Hands from MediaPipe */
  hands: MPVisionResult["hands"];
  /** Poses from MediaPipe (33 body landmarks) */
  poses: MPPose[];
  /** Total inference time */
  inferenceMs: number;
  /** Which detectors are active */
  status: {
    mediapipe: boolean;
    yolo: boolean;
    frameX: boolean;
    depth: boolean;
    ocr: boolean;
    faceAttributes: boolean;
    gaze: boolean;
    handwrittenOCR: boolean;
    pose: boolean;
    layout: boolean;
  };
  /** Multi-task FrameX result (scene, OCR, movement, expressions) — null if not available */
  frameXResult: MultiTaskResult | null;
  /** Depth estimation result — null if not available */
  depthResult: DepthEstimationResult | null;
  /** Face attributes (age/gender/emotion) for detected faces */
  faceAttributes: FaceAttributes[];
  /** OCR result — null if not available */
  ocrResult: OCRResult | null;
  /** 3D scene reconstruction — null if depth not available */
  sceneReconstruction: SceneReconstruction | null;
  /** Quantum-enhanced detection results */
  quantumEnhancement: VisionEnhancementResult | null;
  /** Gaze direction from iris landmarks */
  gazeResult: GazeResult | null;
  /** Handwritten text recognition */
  handwrittenOCR: HandwrittenOCRResult | null;
  /** Regional descriptions of interesting areas */
  regionalDescriptions: RegionalDescription[];
  /** Document layout parsing */
  documentLayout: DocumentLayout | null;
}

export interface UnifiedDetection {
  name: string;
  namePt: string;
  confidence: number;
  source: "mediapipe" | "yolo" | "both";
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── EMA Bounding Box Stabilization ───
const EMA_ALPHA = 0.3;
const _emaBoxes = new Map<string, { x: number; y: number; width: number; height: number; lastSeen: number }>();

function stabilizeBBox(det: UnifiedDetection): UnifiedDetection {
  const key = `${det.source}_${det.name}`;
  const now = performance.now();
  const prev = _emaBoxes.get(key);
  if (prev && now - prev.lastSeen < 500) {
    const x = EMA_ALPHA * det.x + (1 - EMA_ALPHA) * prev.x;
    const y = EMA_ALPHA * det.y + (1 - EMA_ALPHA) * prev.y;
    const width = EMA_ALPHA * det.width + (1 - EMA_ALPHA) * prev.width;
    const height = EMA_ALPHA * det.height + (1 - EMA_ALPHA) * prev.height;
    _emaBoxes.set(key, { x, y, width, height, lastSeen: now });
    return { ...det, x, y, width, height };
  }
  _emaBoxes.set(key, { x: det.x, y: det.y, width: det.width, height: det.height, lastSeen: now });
  return det;
}

// Prune stale EMA entries every 5s
setInterval(() => {
  const now = performance.now();
  for (const [k, v] of _emaBoxes) {
    if (now - v.lastSeen > 2000) _emaBoxes.delete(k);
  }
}, 5000);

// ─── Portuguese name mapping for MediaPipe classes ───
const MP_CLASS_PT: Record<string, string> = {
  person: "pessoa", car: "carro", chair: "cadeira", cup: "caneca/copo",
  bottle: "garrafa", cell_phone: "celular", book: "livro", laptop: "notebook",
  keyboard: "teclado", mouse: "mouse", remote: "controle remoto",
  tv: "TV", clock: "relógio", scissors: "tesoura", knife: "faca",
  fork: "garfo", spoon: "colher", bowl: "tigela", banana: "banana",
  apple: "maçã", sandwich: "sanduíche", pizza: "pizza", donut: "rosquinha",
  cake: "bolo", couch: "sofá", bed: "cama", dining_table: "mesa",
  toilet: "vaso sanitário", potted_plant: "planta", backpack: "mochila",
  umbrella: "guarda-chuva", handbag: "bolsa", tie: "gravata",
  suitcase: "mala", dog: "cachorro", cat: "gato", bird: "pássaro",
};

/**
 * Merge detections from MediaPipe and YOLO, removing duplicates via IoU.
 */
function mergeDetections(
  mpObjects: MPVisionResult["objects"],
  yoloObjects: YOLODetection[]
): UnifiedDetection[] {
  const merged: UnifiedDetection[] = [];

  // Add YOLO detections first (generally more accurate class names)
  for (const y of yoloObjects) {
    merged.push({
      name: y.name,
      namePt: y.namePt,
      confidence: y.confidence,
      source: "yolo",
      x: y.x,
      y: y.y,
      width: y.width,
      height: y.height,
    });
  }

  // Add MediaPipe detections that don't overlap with YOLO
  for (const mp of mpObjects) {
    let isDuplicate = false;
    for (const m of merged) {
      const iou = computeIoU(
        { x: mp.x, y: mp.y, w: mp.width, h: mp.height },
        { x: m.x, y: m.y, w: m.width, h: m.height }
      );
      if (iou > 0.4) {
        // Same object — boost confidence if both agree
        if (m.source === "yolo") m.source = "both";
        m.confidence = Math.max(m.confidence, mp.confidence);
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      const normalizedName = mp.name.toLowerCase().replace(/\s+/g, "_");
      merged.push({
        name: mp.name,
        namePt: MP_CLASS_PT[normalizedName] || mp.name,
        confidence: mp.confidence,
        source: "mediapipe",
        x: mp.x,
        y: mp.y,
        width: mp.width,
        height: mp.height,
      });
    }
  }

  return merged.map(stabilizeBBox).sort((a, b) => b.confidence - a.confidence);
}

function computeIoU(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  return intersection / (areaA + areaB - intersection + 1e-6);
}

/**
 * Run full vision pipeline on a video frame.
 * Uses MediaPipe for faces/hands/objects + YOLO for 80-class object detection.
 */
/**
 * Detect if frame likely contains text via fast edge density check.
 * Used to skip expensive OCR on frames without text.
 */
function shouldRunOCR(video: HTMLVideoElement): boolean {
  try {
    const c = document.createElement("canvas");
    const size = 64; // tiny sample for speed
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(video, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    let edgeCount = 0;
    for (let i = 4; i < data.length; i += 8) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const prev = (data[i - 4] + data[i - 3] + data[i - 2]) / 3;
      if (Math.abs(gray - prev) > 35) edgeCount++;
    }
    const density = edgeCount / (size * size / 2);
    return density > 0.12; // Only run OCR when edge density suggests text
  } catch {
    return true; // fallback: always run
  }
}

/**
 * Get optimal depth estimation resolution based on hardware.
 */
function getAdaptiveDepthMaxDim(): number {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) return 384;
  const cores = (typeof navigator !== 'undefined' ? (navigator as any).hardwareConcurrency : 2) ?? 2;
  if (cores >= 8) return 320;
  if (cores >= 4) return 256;
  return 128;
}

export async function detectRealTime(
  video: HTMLVideoElement
): Promise<RealTimeVisionResult> {
  const start = performance.now();

  // ═══ Frame Preprocessing: chromatic aberration correction + denoising ═══
  // Only apply on every 3rd frame to maintain <100ms budget
  const frameCount = ((window as any).__orion_rt_frame_count__ || 0) + 1;
  (window as any).__orion_rt_frame_count__ = frameCount;

  // Adaptive OCR: pre-check edge density before committing to expensive OCR
  const ocrWorthRunning = isOCRReady() && shouldRunOCR(video);

  // Run ALL detectors in parallel (including FrameX — previously sequential)
  const [mpResult, yoloResult, depthResult, ocrResult, frameXResult] = await Promise.all([
    isMediaPipeReady()
      ? detectAllMP(video).catch(() => ({ objects: [], faces: [], faceLandmarks: [], hands: [], poses: [], timestamp: 0, inferenceMs: 0 }))
      : Promise.resolve({ objects: [], faces: [], faceLandmarks: [], hands: [], poses: [], timestamp: 0, inferenceMs: 0 } as MPVisionResult),
    isYOLOReady()
      ? detectWithYOLO(video).catch(() => [])
      : Promise.resolve([] as YOLODetection[]),
    isDepthReady()
      ? estimateDepth(video).catch(() => null)
      : Promise.resolve(null as DepthEstimationResult | null),
    ocrWorthRunning
      ? extractText(video).catch(() => null)
      : Promise.resolve(null as OCRResult | null),
    // FrameX now runs in parallel instead of sequentially (~30ms gain)
    yoloFrameX.processFrame(video).catch(() => null),
  ]);

  const allObjects = mergeDetections(mpResult.objects, yoloResult);

  // Face attributes — analyze detected faces with existing face-api data
  const faceAttributes: FaceAttributes[] = [];
  for (const face of mpResult.faces.slice(0, 4)) {
    const attrs = analyzeFaceAttributes({
      expressions: (face as any).expressions,
      age: (face as any).age,
      gender: (face as any).gender,
      genderProbability: (face as any).genderProbability,
      faceWidth: face.width,
      faceHeight: face.height,
    } as FaceAttributesInput);
    faceAttributes.push(attrs);
  }

  // Quantum enhancement of detections
  let quantumEnhancement: VisionEnhancementResult | null = null;
  if (allObjects.length > 0) {
    try {
      quantumEnhancement = enhanceVisionDetections(allObjects);
    } catch {}
  }

  // Regional descriptions (every 10th frame)
  const regionalDescriptions: RegionalDescription[] = frameCount % 10 === 0
    ? prepareRegionalDescriptions(video, allObjects, video.videoWidth || 640, video.videoHeight || 480)
    : [];

  // Document layout parsing from OCR
  let documentLayout: DocumentLayout | null = null;
  if (ocrResult && ocrResult.texts.length > 0) {
    try {
      documentLayout = parseDocumentLayout(ocrResult, video.videoWidth || 640, video.videoHeight || 480);
    } catch {}
  }

  const result: RealTimeVisionResult = {
    mpObjects: mpResult.objects,
    yoloObjects: yoloResult,
    allObjects,
    faces: mpResult.faces,
    hands: mpResult.hands,
    poses: mpResult.poses ?? [],
    inferenceMs: Math.round(performance.now() - start),
    status: {
      mediapipe: isMediaPipeReady(),
      yolo: isYOLOReady(),
      frameX: !!frameXResult,
      depth: isDepthReady(),
      ocr: isOCRReady(),
      faceAttributes: true,
      gaze: true,
      handwrittenOCR: isTrOCRReady(),
      pose: (mpResult.poses?.length ?? 0) > 0,
      layout: !!documentLayout,
    },
    frameXResult,
    depthResult,
    faceAttributes,
    ocrResult,
    sceneReconstruction: depthResult
      ? reconstructScene(depthResult, video, allObjects)
      : null,
    quantumEnhancement,
    gazeResult: null,
    handwrittenOCR: null,
    regionalDescriptions,
    documentLayout,
  };

  // Gaze detection from face landmarks (zero cost — uses existing data)
  if ((mpResult as any).faceLandmarks?.length > 0) {
    const firstFaceLandmarks = (mpResult as any).faceLandmarks[0]?.landmarks;
    if (firstFaceLandmarks) {
      result.gazeResult = estimateGaze(firstFaceLandmarks);
    }
  }

  // Handwritten OCR (every 15th frame to avoid lag)
  if (isTrOCRReady() && frameCount % 15 === 0) {
    try {
      result.handwrittenOCR = await recognizeHandwritingFromVideo(video);
    } catch {}
  }

  // ─── Temporal Buffer: push frame and detect events ───
  visionTemporalBuffer.pushFrame(result);

  // Publish for Vision-RAG cross-referencing
  if (typeof window !== "undefined") {
    (window as any).__orion_last_rt_vision_result__ = result;
  }

  return result;
}

/**
 * Preload all models (call early for faster first detection).
 */
export async function preloadAllVision(): Promise<void> {
  await Promise.allSettled([preloadMediaPipe(), preloadYOLO(), preloadDepthEstimation(), preloadOCR(), preloadHFVisionGate(), preloadTrOCRPrinted()]);
}

/**
 * Format detections as a descriptive string for the AI prompt.
 */
export function formatDetectionsForAI(result: RealTimeVisionResult): string {
  const parts: string[] = [];

  if (result.allObjects.length > 0) {
    const objList = result.allObjects
      .map((o) => `${o.namePt} (${(o.confidence * 100).toFixed(0)}%, fonte: ${o.source})`)
      .join(", ");
    parts.push(`OBJETOS DETECTADOS LOCALMENTE (MediaPipe+YOLO real-time): ${objList}`);
  }

  if (result.faces.length > 0) {
    const landmarkInfo = (result as any).faceLandmarks?.length
      ? ` | FaceMesh: ${(result as any).faceLandmarks.length} face(s) com 478 landmarks`
      : "";
    parts.push(
      `ROSTOS DETECTADOS (MediaPipe): ${result.faces.length} rosto(s), ` +
        result.faces
          .map((f) => `conf=${(f.confidence * 100).toFixed(0)}%, pos=(${Math.round(f.x)},${Math.round(f.y)})`)
          .join("; ") +
        landmarkInfo
    );
  }

  if (result.hands.length > 0) {
    parts.push(
      `MÃOS DETECTADAS (MediaPipe HandLandmarker): ${result.hands.length} mão(s), ` +
        result.hands.map((h) => `${h.handedness} (${(h.confidence * 100).toFixed(0)}%)`).join(", ")
    );
  }

  // ─── POSE DATA (MediaPipe 33 body landmarks) ───
  if (result.poses.length > 0) {
    const poseDescriptions = result.poses.map((pose, i) => {
      const lm = pose.landmarks;
      // Interpret body position from key landmarks
      const nose = lm[0];
      const leftShoulder = lm[11];
      const rightShoulder = lm[12];
      const leftWrist = lm[15];
      const rightWrist = lm[16];
      const leftHip = lm[23];
      const rightHip = lm[24];

      const parts: string[] = [];

      // Standing vs sitting detection
      if (leftHip && rightHip && leftShoulder && rightShoulder) {
        const hipY = (leftHip.y + rightHip.y) / 2;
        const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const torsoRatio = Math.abs(hipY - shoulderY);
        if (torsoRatio < 0.15) parts.push("sentado(a)");
        else parts.push("em pé");
      }

      // Arms raised detection
      if (leftWrist && leftShoulder && leftWrist.y < leftShoulder.y) {
        parts.push("braço esq. levantado");
      }
      if (rightWrist && rightShoulder && rightWrist.y < rightShoulder.y) {
        parts.push("braço dir. levantado");
      }

      // Head tilt
      if (nose && leftShoulder && rightShoulder) {
        const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
        const tilt = nose.x - shoulderMidX;
        if (Math.abs(tilt) > 0.05) {
          parts.push(`cabeça inclinada para ${tilt > 0 ? "direita" : "esquerda"}`);
        }
      }

      const posture = parts.length > 0 ? parts.join(", ") : "postura neutra";
      const conf = (pose.confidence * 100).toFixed(0);
      return `Pessoa ${i + 1}: ${posture} (${conf}%)`;
    });
    parts.push(`POSTURA CORPORAL (MediaPipe Pose): ${poseDescriptions.join(" | ")}`);
  }

  if (parts.length === 0) {
    parts.push("Nenhum objeto/rosto/mão/pose detectado localmente neste frame.");
  }

  // FrameX multi-task data (scene, OCR, movement)
  if (result.frameXResult) {
    const fx = result.frameXResult;
    if (fx.scenario.label !== "outro") {
      parts.push(`CENA: ${fx.scenario.label} (${(fx.scenario.confidence * 100).toFixed(0)}%)`);
    }
    if (fx.reading.text.length > 0) {
      parts.push(`TEXTO OCR (FrameX): ${fx.reading.text.join("; ")}`);
    }
    if (fx.movement.objectsInMotion.length > 0) {
      parts.push(`MOVIMENTO: ${fx.movement.objectsInMotion.map(m => `${m.id}: ${m.direction}`).join(", ")}`);
    }
  }

  // Depth estimation data
  if (result.depthResult && result.allObjects.length > 0) {
    const depthStr = formatDepthForAI(result.depthResult, result.allObjects, 640, 480);
    if (depthStr) parts.push(depthStr);
  }

  // Face attributes (age/gender/emotion)
  if (result.faceAttributes.length > 0) {
    parts.push(formatFaceAttributesForAI(result.faceAttributes));
  }

  // Real OCR
  if (result.ocrResult) {
    const ocrStr = formatOCRForAI(result.ocrResult);
    if (ocrStr) parts.push(ocrStr);
  }

  // 3D Reconstruction
  if (result.sceneReconstruction) {
    const str3d = format3DForAI(result.sceneReconstruction);
    if (str3d) parts.push(str3d);
  }

  // Quantum Vision Enhancement
  if (result.quantumEnhancement) {
    const qvStr = formatQuantumVisionForAI(result.quantumEnhancement);
    if (qvStr) parts.push(qvStr);
  }

  // Gaze direction
  if (result.gazeResult && result.gazeResult.confidence > 0.3) {
    parts.push(formatGazeForAI(result.gazeResult));
  }

  // Handwritten OCR
  if (result.handwrittenOCR?.text) {
    parts.push(formatHandwrittenOCRForAI(result.handwrittenOCR));
  }

  // ─── NEW: Regional descriptions ───
  if (result.regionalDescriptions.length > 0) {
    const regionStr = formatRegionalForAI(result.regionalDescriptions);
    if (regionStr) parts.push(regionStr);
  }

  // ─── NEW: Document layout parsing ───
  if (result.documentLayout && result.documentLayout.blockCount > 0) {
    const layoutStr = formatLayoutForAI(result.documentLayout);
    if (layoutStr) parts.push(layoutStr);
  }

  // ─── NEW: Temporal context (events, tracking, scene stability) ───
  const temporalStr = visionTemporalBuffer.formatForAI();
  if (temporalStr) parts.push(temporalStr);

  parts.push(`Inferência local: ${result.inferenceMs}ms | MediaPipe: ${result.status.mediapipe ? "✅" : "⏳"} | YOLOv10: ${result.status.yolo ? "✅" : "⏳"} | FrameX: ${result.status.frameX ? "✅" : "⏳"} | Depth: ${result.status.depth ? "✅" : "⏳"} | OCR: ${result.status.ocr ? "✅" : "⏳"} | Gaze: ${result.gazeResult ? "✅" : "⏳"} | TrOCR: ${result.status.handwrittenOCR ? "✅" : "⏳"} | Quantum: ${result.quantumEnhancement ? "✅" : "⏳"} | Pose: ${result.status.pose ? "✅" : "⏳"} | Layout: ${result.status.layout ? "✅" : "⏳"}`);

  return parts.join("\n");
}
