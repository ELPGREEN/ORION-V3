/**
 * Unified Real-Time Vision Engine — LEAN BUILD
 * Only MediaPipe (faces, hands, objects, poses) + gaze + face attributes.
 * Heavy modules (YOLO, depth, OCR, TrOCR, FrameX, quantum, 3D) REMOVED
 * from real-time loop. Gemini handles advanced analysis on-demand only.
 * Target: <300ms per cycle, <3s total response.
 */

import { markVisionStart, markVisionEnd } from "./pipeline-latency-tracker";

import { detectAllMP, preloadMediaPipe, isMediaPipeReady, type MPVisionResult, type MPPose } from "./mediapipe-vision";
import { analyzeFaceAttributes, formatFaceAttributesForAI, type FaceAttributes, type FaceAttributesInput } from "./face-attributes-engine";
import { estimateGaze, formatGazeForAI, type GazeResult } from "./gaze-detection";
import { visionTemporalBuffer } from "./vision-temporal-buffer";

export interface RealTimeVisionResult {
  /** MediaPipe detected objects (EfficientDet) */
  mpObjects: MPVisionResult["objects"];
  /** YOLO detected objects — disabled for performance */
  yoloObjects: any[];
  /** Merged unique objects (MediaPipe only now) */
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
  /** Multi-task FrameX result — disabled, always null */
  frameXResult: { scenario?: { label?: string; confidence?: number }; reading?: { text?: string[] }; movement?: { objectsInMotion?: any[] }; faces?: any[] } | null;
  /** Depth estimation result — disabled, always null */
  depthResult: any | null;
  /** Face attributes (age/gender/emotion) for detected faces */
  faceAttributes: FaceAttributes[];
  /** OCR result — disabled, always null */
  ocrResult: { texts?: string[]; regions?: any[] } | null;
  /** 3D scene reconstruction — disabled, always null */
  sceneReconstruction: any | null;
  /** Quantum-enhanced detection — disabled, always null */
  quantumEnhancement: any | null;
  /** Gaze direction from iris landmarks */
  gazeResult: GazeResult | null;
  /** Handwritten text recognition — disabled, always null */
  handwrittenOCR: any | null;
  /** Regional descriptions — disabled */
  regionalDescriptions: any[];
  /** Document layout parsing — disabled, always null */
  documentLayout: any | null;
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
 * Convert MediaPipe detections to unified format.
 */
function mpToUnified(mpObjects: MPVisionResult["objects"]): UnifiedDetection[] {
  return mpObjects.map((mp) => {
    const normalizedName = mp.name.toLowerCase().replace(/\s+/g, "_");
    return stabilizeBBox({
      name: mp.name,
      namePt: MP_CLASS_PT[normalizedName] || mp.name,
      confidence: mp.confidence,
      source: "mediapipe",
      x: mp.x,
      y: mp.y,
      width: mp.width,
      height: mp.height,
    });
  }).sort((a, b) => b.confidence - a.confidence);
}

// ─── Frame throttle cache for <300ms target ───
let _lastDetectTime = 0;
let _cachedResult: RealTimeVisionResult | null = null;
const MIN_INTERVAL = 250; // ms — max ~4 FPS for vision

export async function detectRealTime(
  video: HTMLVideoElement
): Promise<RealTimeVisionResult> {
  // Early return if called within throttle window
  const now = performance.now();
  if (_cachedResult && now - _lastDetectTime < MIN_INTERVAL) {
    return _cachedResult;
  }

  markVisionStart();
  const start = now;

  // ─── Only MediaPipe — lightweight, ~15-30ms on GPU ───
  const mpResult = isMediaPipeReady()
    ? await detectAllMP(video).catch(() => ({
        objects: [], faces: [], faceLandmarks: [], hands: [], poses: [],
        timestamp: 0, inferenceMs: 0,
      } as MPVisionResult))
    : { objects: [], faces: [], faceLandmarks: [], hands: [], poses: [], timestamp: 0, inferenceMs: 0 } as MPVisionResult;

  const allObjects = mpToUnified(mpResult.objects);

  // Face attributes — lightweight, uses existing MediaPipe data
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

  const result: RealTimeVisionResult = {
    mpObjects: mpResult.objects,
    yoloObjects: [],
    allObjects,
    faces: mpResult.faces,
    hands: mpResult.hands,
    poses: mpResult.poses ?? [],
    inferenceMs: Math.round(performance.now() - start),
    status: {
      mediapipe: isMediaPipeReady(),
      yolo: false,
      frameX: false,
      depth: false,
      ocr: false,
      faceAttributes: true,
      gaze: true,
      handwrittenOCR: false,
      pose: (mpResult.poses?.length ?? 0) > 0,
      layout: false,
    },
    frameXResult: null,
    depthResult: null,
    faceAttributes,
    ocrResult: null,
    sceneReconstruction: null,
    quantumEnhancement: null,
    gazeResult: null,
    handwrittenOCR: null,
    regionalDescriptions: [],
    documentLayout: null,
  };

  // Gaze detection from face landmarks (zero cost — uses existing data)
  if ((mpResult as any).faceLandmarks?.length > 0) {
    const firstFaceLandmarks = (mpResult as any).faceLandmarks[0]?.landmarks;
    if (firstFaceLandmarks) {
      result.gazeResult = estimateGaze(firstFaceLandmarks);
    }
  }

  // ─── Temporal Buffer: push frame and detect events ───
  visionTemporalBuffer.pushFrame(result);

  // Publish for Vision-RAG cross-referencing
  if (typeof window !== "undefined") {
    (window as any).__orion_last_rt_vision_result__ = result;
  }

  // Cache result and update timestamp
  _cachedResult = result;
  _lastDetectTime = performance.now();

  markVisionEnd();
  return result;
}

/**
 * Preload only lightweight models (MediaPipe).
 * Heavy models (YOLO, depth, OCR) removed from preload.
 */
export async function preloadAllVision(): Promise<void> {
  await preloadMediaPipe();
}

/**
 * Format detections as a descriptive string for the AI prompt.
 */
export function formatDetectionsForAI(result: RealTimeVisionResult): string {
  const parts: string[] = [];

  if (result.allObjects.length > 0) {
    const objList = result.allObjects
      .map((o) => `${o.namePt} (${(o.confidence * 100).toFixed(0)}%)`)
      .join(", ");
    parts.push(`OBJETOS DETECTADOS (MediaPipe real-time): ${objList}`);
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
      const nose = lm[0];
      const leftShoulder = lm[11];
      const rightShoulder = lm[12];
      const leftWrist = lm[15];
      const rightWrist = lm[16];
      const leftHip = lm[23];
      const rightHip = lm[24];

      const poseParts: string[] = [];

      if (leftHip && rightHip && leftShoulder && rightShoulder) {
        const hipY = (leftHip.y + rightHip.y) / 2;
        const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const torsoRatio = Math.abs(hipY - shoulderY);
        if (torsoRatio < 0.15) poseParts.push("sentado(a)");
        else poseParts.push("em pé");
      }

      if (leftWrist && leftShoulder && leftWrist.y < leftShoulder.y) {
        poseParts.push("braço esq. levantado");
      }
      if (rightWrist && rightShoulder && rightWrist.y < rightShoulder.y) {
        poseParts.push("braço dir. levantado");
      }

      if (nose && leftShoulder && rightShoulder) {
        const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
        const tilt = nose.x - shoulderMidX;
        if (Math.abs(tilt) > 0.05) {
          poseParts.push(`cabeça inclinada para ${tilt > 0 ? "direita" : "esquerda"}`);
        }
      }

      const posture = poseParts.length > 0 ? poseParts.join(", ") : "postura neutra";
      const conf = (pose.confidence * 100).toFixed(0);
      return `Pessoa ${i + 1}: ${posture} (${conf}%)`;
    });
    parts.push(`POSTURA CORPORAL (MediaPipe Pose): ${poseDescriptions.join(" | ")}`);
  }

  if (parts.length === 0) {
    parts.push("Nenhum objeto/rosto/mão/pose detectado localmente neste frame.");
  }

  // Face attributes (age/gender/emotion)
  if (result.faceAttributes.length > 0) {
    parts.push(formatFaceAttributesForAI(result.faceAttributes));
  }

  // Gaze direction
  if (result.gazeResult && result.gazeResult.confidence > 0.3) {
    parts.push(formatGazeForAI(result.gazeResult));
  }

  // ─── Temporal context (events, tracking, scene stability) ───
  const temporalStr = visionTemporalBuffer.formatForAI();
  if (temporalStr) parts.push(temporalStr);

  parts.push(`Inferência local: ${result.inferenceMs}ms | MediaPipe: ${result.status.mediapipe ? "✅" : "⏳"} | Pose: ${result.status.pose ? "✅" : "⏳"}`);

  return parts.join("\n");
}
