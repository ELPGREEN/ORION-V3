/**
 * ═══ YOLOFrameX Web Worker ═══
 * Handles ALL CPU-bound post-processing off the main thread:
 *   - Object tracking (persistent IDs + velocity)
 *   - Scene classification (heuristic)
 *   - Expression smoothing (4-frame buffer)
 *   - OCR / Sobel edge detection
 *   - Movement analysis
 *   - Lighting estimation
 *
 * ML inference (MediaPipe + YOLO ONNX) stays on main thread (WebGL requirement).
 * Main thread sends raw detections → Worker returns full MultiTaskResult.
 */
/// <reference lib="webworker" />

import type {
  MultiTaskResult,
  DetectedObject,
  FaceDetection,
  SceneClassification,
  ReadingResult,
  MovementAnalysis,
  TrackedMotion,
  ObjectClass,
  ObjectDirection,
  FaceExpression,
  LipMovement,
  SceneLabel,
  TextRegionResult,
} from "./yolo-framex-types";

// ─── Worker message types ───

interface WorkerInput {
  type: "process";
  id: number;
  timestamp: number;
  rawObjects: Array<{ name: string; x: number; y: number; w: number; h: number; confidence: number; source: string }>;
  rawFaces: Array<{ x: number; y: number; w: number; h: number; confidence: number }>;
  rawHands: number;
  emotion: string;
  videoWidth: number;
  videoHeight: number;
  // Pixel data for OCR + lighting (small resolution)
  pixelData?: Uint8ClampedArray;
  pixelW?: number;
  pixelH?: number;
  isMobile: boolean;
}

interface WorkerOutput {
  id: number;
  result?: MultiTaskResult;
  error?: string;
}

// ─── Object tracker (persistent IDs + velocity) ───

interface TrackedObj {
  id: string;
  class: ObjectClass;
  box: { x: number; y: number; w: number; h: number };
  score: number;
  lastSeen: number;
  velocity: { x: number; y: number };
  prevBoxes: Array<{ x: number; y: number; w: number; h: number; t: number }>;
}

const tracker = new Map<string, TrackedObj>();
let nextTrackId = 0;

// ─── Expression smoothing ───

const expressionBuffer: FaceExpression[] = [];
const EXPR_BUF_SIZE = 4;

let lastSceneLabel: SceneLabel = "outro";
let sceneStability = 0;

// ─── Cache ───

let lastResult: MultiTaskResult | null = null;
let lastResultTime = 0;
const CACHE_TTL = 120;

// ─── Scene keywords ───

const SCENE_KEYWORDS: Record<SceneLabel, string[]> = {
  sala: ["couch", "tv", "remote", "potted plant"],
  escritório: ["laptop", "keyboard", "mouse", "book", "clock", "cell phone"],
  quarto: ["bed", "clock", "teddy bear"],
  cozinha: ["microwave", "oven", "toaster", "sink", "refrigerator", "bowl", "cup", "knife", "fork", "spoon"],
  banheiro: ["toilet", "toothbrush", "hair drier", "sink"],
  rua: ["car", "truck", "bus", "motorcycle", "bicycle", "traffic light", "stop sign", "fire hydrant", "parking meter"],
  estrada: ["car", "truck", "bus", "motorcycle"],
  parque: ["bench", "bird", "dog", "frisbee", "kite"],
  praia: ["surfboard", "umbrella", "boat"],
  veículo: ["car", "truck", "bus"],
  loja: ["bottle", "backpack", "handbag", "suitcase"],
  restaurante: ["dining table", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "pizza", "cake"],
  natureza: ["bird", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe"],
  academia: ["sports ball", "skateboard", "tennis racket", "baseball bat", "skis", "snowboard"],
  escola: ["book", "backpack", "laptop", "chair"],
  outro: [],
};

// ─── Utility functions ───

function computeIoU(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / (a.w * a.h + b.w * b.h - inter + 1e-6);
}

function velocityToDirection(v: { x: number; y: number }, speed: number): ObjectDirection {
  if (speed < 0.5) return "parado";
  const angle = Math.atan2(v.y, v.x) * (180 / Math.PI);
  if (Math.abs(angle) < 30 && speed > 2) return "aproximando";
  if (angle > -45 && angle < 45) return "direita";
  if (angle >= 45 && angle < 135) return "baixo";
  if (angle >= -135 && angle < -45) return "cima";
  return "esquerda";
}

function mapEmotionToExpression(emotion: string): FaceExpression {
  const map: Record<string, FaceExpression> = {
    happy: "sorrindo", sad: "triste", angry: "irritado",
    surprised: "surpreso", neutral: "neutro", fearful: "sério",
    disgusted: "irritado", contempt: "pensativo",
    feliz: "sorrindo", triste: "triste", irritado: "irritado",
    surpreso: "surpreso", neutro: "neutro",
  };
  return map[emotion.toLowerCase()] || "neutro";
}

function smoothExpression(current: FaceExpression): FaceExpression {
  expressionBuffer.push(current);
  if (expressionBuffer.length > EXPR_BUF_SIZE) expressionBuffer.shift();

  const votes: Record<string, number> = {};
  for (let i = 0; i < expressionBuffer.length; i++) {
    const weight = 1 + i * 0.5;
    votes[expressionBuffer[i]] = (votes[expressionBuffer[i]] || 0) + weight;
  }

  let best: FaceExpression = "neutro";
  let bestScore = 0;
  for (const [expr, score] of Object.entries(votes)) {
    if (score > bestScore) { bestScore = score; best = expr as FaceExpression; }
  }
  return best;
}

// ─── Core processing functions ───

function mergeObjects(
  raw: WorkerInput["rawObjects"],
  now: number,
): DetectedObject[] {
  const result: DetectedObject[] = [];

  for (const r of raw) {
    let isDuplicate = false;
    for (const existing of result) {
      if (computeIoU(
        { x: r.x, y: r.y, w: r.w, h: r.h },
        { x: existing.box.x, y: existing.box.y, w: existing.box.width, h: existing.box.height },
      ) > 0.4) {
        existing.score = Math.max(existing.score, r.confidence);
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      const className = r.name.toLowerCase().replace(/\s+/g, "_") as ObjectClass;
      result.push({
        id: `${r.source}_${className}_${Math.round(r.x)}_${Math.round(r.y)}`,
        class: className,
        score: r.confidence,
        box: { x: r.x, y: r.y, width: r.w, height: r.h, confidence: r.confidence },
        isMoving: false,
        timestamp: now,
      });
    }
  }

  return result;
}

function updateTracker(objects: DetectedObject[], now: number): DetectedObject[] {
  const matched = new Set<string>();
  const result: DetectedObject[] = [];

  for (const obj of objects) {
    let bestMatch: TrackedObj | null = null;
    let bestIoU = 0.3;

    for (const [id, tracked] of tracker) {
      if (matched.has(id) || tracked.class !== obj.class) continue;
      const iou = computeIoU(
        { x: obj.box.x, y: obj.box.y, w: obj.box.width, h: obj.box.height },
        tracked.box,
      );
      if (iou > bestIoU) { bestIoU = iou; bestMatch = tracked; }
    }

    if (bestMatch) {
      matched.add(bestMatch.id);
      const dt = Math.max(1, now - bestMatch.lastSeen);
      const vx = (obj.box.x - bestMatch.box.x) / dt * 16.67;
      const vy = (obj.box.y - bestMatch.box.y) / dt * 16.67;

      bestMatch.box = { x: obj.box.x, y: obj.box.y, w: obj.box.width, h: obj.box.height };
      bestMatch.score = obj.score;
      bestMatch.lastSeen = now;
      bestMatch.velocity = { x: vx * 0.7 + bestMatch.velocity.x * 0.3, y: vy * 0.7 + bestMatch.velocity.y * 0.3 };
      bestMatch.prevBoxes.push({ ...bestMatch.box, t: now });
      if (bestMatch.prevBoxes.length > 10) bestMatch.prevBoxes.shift();

      const speed = Math.sqrt(bestMatch.velocity.x ** 2 + bestMatch.velocity.y ** 2);
      const direction = velocityToDirection(bestMatch.velocity, speed);

      result.push({ ...obj, id: bestMatch.id, velocity: bestMatch.velocity, direction, isMoving: speed > 0.5 });
    } else {
      const id = `obj_${nextTrackId++}`;
      tracker.set(id, {
        id,
        class: obj.class,
        box: { x: obj.box.x, y: obj.box.y, w: obj.box.width, h: obj.box.height },
        score: obj.score,
        lastSeen: now,
        velocity: { x: 0, y: 0 },
        prevBoxes: [{ x: obj.box.x, y: obj.box.y, w: obj.box.width, h: obj.box.height, t: now }],
      });
      result.push({ ...obj, id, velocity: { x: 0, y: 0 }, direction: "parado", isMoving: false });
    }
  }

  // Prune stale tracks
  for (const [id, tracked] of tracker) {
    if (now - tracked.lastSeen > 2000) tracker.delete(id);
  }

  return result;
}

function classifyScene(objects: DetectedObject[], pixelData?: Uint8ClampedArray, pixelW?: number, pixelH?: number): SceneClassification {
  const objectNames = objects.map(o => o.class);
  const scores: Partial<Record<SceneLabel, number>> = {};

  for (const [scene, keywords] of Object.entries(SCENE_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      score += objectNames.filter(n => n === kw).length;
    }
    scores[scene as SceneLabel] = score;
  }

  let bestScene: SceneLabel = "outro";
  let bestScore = 0;
  for (const [scene, score] of Object.entries(scores)) {
    if ((score as number) > bestScore) { bestScore = score as number; bestScene = scene as SceneLabel; }
  }

  if (bestScene === lastSceneLabel) {
    sceneStability = Math.min(10, sceneStability + 1);
  } else if (bestScore > 2 || sceneStability <= 2) {
    lastSceneLabel = bestScene;
    sceneStability = 1;
  }

  const lighting = estimateLighting(pixelData, pixelW, pixelH);
  const isIndoor = ["sala", "escritório", "quarto", "cozinha", "banheiro", "loja", "restaurante"].includes(lastSceneLabel);

  return { label: lastSceneLabel, confidence: Math.min(1, bestScore / 3), lighting, isIndoor };
}

function estimateLighting(pixelData?: Uint8ClampedArray, w?: number, h?: number): "dia" | "noite" | "artificial" | "misto" {
  if (!pixelData || !w || !h) return "artificial";
  let total = 0;
  const count = w * h;
  for (let i = 0; i < pixelData.length; i += 4) {
    total += (pixelData[i] + pixelData[i + 1] + pixelData[i + 2]) / 3;
  }
  const avg = total / count;
  if (avg > 180) return "dia";
  if (avg > 100) return "artificial";
  if (avg > 50) return "misto";
  return "noite";
}

function analyzeFaces(
  rawFaces: WorkerInput["rawFaces"],
  emotion: string,
): FaceDetection[] {
  return rawFaces.map((face, i) => {
    const cx = face.x + face.w / 2;
    const cy = face.y + face.h / 2;
    const halfW = face.w / 2;
    const halfH = face.h / 2;

    const landmarks = {
      leftEye: { x: cx - halfW * 0.3, y: cy - halfH * 0.15 },
      rightEye: { x: cx + halfW * 0.3, y: cy - halfH * 0.15 },
      nose: { x: cx, y: cy + halfH * 0.05 },
      mouthLeft: { x: cx - halfW * 0.2, y: cy + halfH * 0.35 },
      mouthRight: { x: cx + halfW * 0.2, y: cy + halfH * 0.35 },
    };

    const expression = mapEmotionToExpression(emotion);
    const lipMovement: LipMovement = expression === "sorrindo" ? "sorrindo" : "neutro";
    const faceRatioX = (face.x + face.w / 2) / 640;
    const gazeDirection = faceRatioX < 0.35 ? "esquerda" as const
      : faceRatioX > 0.65 ? "direita" as const
      : "camera" as const;

    return {
      id: `face_${i}`,
      box: { x: face.x, y: face.y, width: face.w, height: face.h, confidence: face.confidence },
      landmarks,
      expression: smoothExpression(expression),
      lipMovement,
      gazeDirection,
    };
  });
}

function analyzeReading(
  faces: FaceDetection[],
  pixelData?: Uint8ClampedArray,
  pixelW?: number,
  pixelH?: number,
): ReadingResult {
  const textRegions: TextRegionResult[] = [];
  const detectedTexts: string[] = [];

  if (pixelData && pixelW && pixelH) {
    // Simple Sobel edge detection for text region detection
    const w = pixelW;
    const h = pixelH;
    const gray = new Float32Array(w * h);

    for (let i = 0; i < w * h; i++) {
      const r = pixelData[i * 4];
      const g = pixelData[i * 4 + 1];
      const b = pixelData[i * 4 + 2];
      gray[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    }

    // Scan for high-edge-density blocks (text indicators)
    const blockSize = 16;
    const blocksX = Math.floor(w / blockSize);
    const blocksY = Math.floor(h / blockSize);

    for (let by = 0; by < blocksY && textRegions.length < 5; by++) {
      for (let bx = 0; bx < blocksX && textRegions.length < 5; bx++) {
        let edgeSum = 0;
        let count = 0;
        const startX = bx * blockSize;
        const startY = by * blockSize;

        for (let y = startY + 1; y < startY + blockSize - 1 && y < h - 1; y++) {
          for (let x = startX + 1; x < startX + blockSize - 1 && x < w - 1; x++) {
            const gx = -gray[(y-1)*w+(x-1)] + gray[(y-1)*w+(x+1)]
                     - 2*gray[y*w+(x-1)] + 2*gray[y*w+(x+1)]
                     - gray[(y+1)*w+(x-1)] + gray[(y+1)*w+(x+1)];
            const gy = -gray[(y-1)*w+(x-1)] - 2*gray[(y-1)*w+x] - gray[(y-1)*w+(x+1)]
                     + gray[(y+1)*w+(x-1)] + 2*gray[(y+1)*w+x] + gray[(y+1)*w+(x+1)];
            edgeSum += Math.sqrt(gx * gx + gy * gy);
            count++;
          }
        }

        const avgEdge = count > 0 ? edgeSum / count : 0;
        if (avgEdge > 0.15) {
          const confidence = Math.min(1, avgEdge / 0.4);
          textRegions.push({
            text: `[texto detectado em (${startX},${startY})]`,
            box: { x: startX, y: startY, width: blockSize, height: blockSize, confidence },
            confidence,
          });
          detectedTexts.push(`[região de texto: bloco, conf=${(confidence * 100).toFixed(0)}%]`);
        }
      }
    }
  }

  const primaryFace = faces[0];
  return {
    text: detectedTexts,
    lipMovement: primaryFace?.lipMovement || null,
    expression: primaryFace?.expression || "neutro",
    textRegions,
  };
}

function analyzeMovement(objects: DetectedObject[]): MovementAnalysis {
  const inMotion: TrackedMotion[] = [];
  for (const obj of objects) {
    if (obj.isMoving && obj.velocity) {
      const speed = Math.sqrt(obj.velocity.x ** 2 + obj.velocity.y ** 2);
      inMotion.push({ id: obj.id, velocity: obj.velocity, direction: obj.direction || "parado", speed });
    }
  }

  let totalVx = 0, totalVy = 0, count = 0;
  for (const m of inMotion) { totalVx += m.velocity.x; totalVy += m.velocity.y; count++; }

  const globalSpeed = count > 0 ? Math.sqrt((totalVx / count) ** 2 + (totalVy / count) ** 2) : 0;
  const globalDir = count > 0
    ? velocityToDirection({ x: totalVx / count, y: totalVy / count }, globalSpeed)
    : "parado" as ObjectDirection;

  return {
    trackingIds: objects.map(o => o.id),
    objectsInMotion: inMotion,
    globalMotion: { intensity: Math.min(1, globalSpeed / 5), dominant: globalDir },
  };
}

// ─── Worker message handler ───

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const msg = e.data;
  if (msg.type !== "process") return;

  const now = msg.timestamp;

  // Cache check
  if (lastResult && now - lastResultTime < CACHE_TTL) {
    (self as any).postMessage({ id: msg.id, result: { ...lastResult, cacheHit: true } } as WorkerOutput);
    return;
  }

  try {
    const start = performance.now();

    // 1. Merge & track objects
    const rawObjects = mergeObjects(msg.rawObjects, now);
    const trackedObjects = updateTracker(rawObjects, now);

    // 2. Scene classification
    const scenario = classifyScene(trackedObjects, msg.pixelData, msg.pixelW, msg.pixelH);

    // 3. Face analysis
    const faces = analyzeFaces(msg.rawFaces, msg.emotion);

    // 4. OCR / text detection
    const reading = analyzeReading(faces, msg.pixelData, msg.pixelW, msg.pixelH);

    // 5. Movement analysis
    const movement = analyzeMovement(trackedObjects);

    const inferenceMs = Math.round(performance.now() - start);

    const result: MultiTaskResult = {
      scenario,
      objects: trackedObjects,
      faces,
      reading,
      movement,
      timestamp: now,
      adaptiveSize: msg.isMobile ? 320 : 640,
      cacheHit: false,
      inferenceMs,
      sources: { mediapipe: true, yolo: true, ocr: true },
    };

    lastResult = result;
    lastResultTime = now;

    (self as any).postMessage({ id: msg.id, result } as WorkerOutput);
  } catch (err: any) {
    (self as any).postMessage({ id: msg.id, error: err.message } as WorkerOutput);
  }
};

console.log("[YOLOFrameX Worker] ✅ Inicializado — post-processing off main thread");
