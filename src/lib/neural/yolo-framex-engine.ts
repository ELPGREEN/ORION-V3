/**
 * ═══ YOLOFrameX Engine ═══
 * Multi-task real-time vision: Objects + Faces + Scene + OCR + Movement
 * Integrates with existing MediaPipe + YOLO ONNX pipeline
 * 100% local, zero API calls
 */

import {
  type MultiTaskResult,
  type DetectedObject,
  type FaceDetection,
  type SceneClassification,
  type ReadingResult,
  type MovementAnalysis,
  type TrackedMotion,
  type ObjectClass,
  type ObjectDirection,
  type FaceExpression,
  type LipMovement,
  type SceneLabel,
  type TextRegionResult,
} from "./yolo-framex-types";
import { detectAllMP, preloadMediaPipe, isMediaPipeReady, type MPVisionResult } from "./mediapipe-vision";
import { detectWithYOLO, preloadYOLO, isYOLOReady, type YOLODetection } from "./yolo-onnx-detector";
import { detectTextRegions, type TextRegion } from "./vision-text-detection";

// ─── Object tracker with persistent IDs ───

interface TrackedObject {
  id: string;
  class: ObjectClass;
  box: { x: number; y: number; w: number; h: number };
  score: number;
  lastSeen: number;
  velocity: { x: number; y: number };
  prevBoxes: Array<{ x: number; y: number; w: number; h: number; t: number }>;
}

// ─── Expression smoothing buffer ───

interface ExpressionBuffer {
  expressions: FaceExpression[];
  maxSize: number;
}

// ─── Scene classification heuristics (no extra model needed) ───

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

// ─── Main Engine ───

class YOLOFrameXEngine {
  private tracker = new Map<string, TrackedObject>();
  private nextId = 0;
  private expressionBuffer: ExpressionBuffer = { expressions: [], maxSize: 4 };
  private lastSceneLabel: SceneLabel = "outro";
  private sceneStability = 0;

  // Cache
  private lastResult: MultiTaskResult | null = null;
  private lastResultTime = 0;
  private readonly CACHE_TTL = 120; // ms

  // Canvas reuse (zero GC)
  private offCanvas: OffscreenCanvas | null = null;
  private offCtx: OffscreenCanvasRenderingContext2D | null = null;

  /**
   * Process a video frame through the full multi-task pipeline
   */
  async processFrame(video: HTMLVideoElement): Promise<MultiTaskResult> {
    const now = Date.now();

    // Cache check
    if (this.lastResult && now - this.lastResultTime < this.CACHE_TTL) {
      return { ...this.lastResult, cacheHit: true };
    }

    const start = performance.now();

    // 1. Run MediaPipe + YOLO in parallel (existing pipeline)
    const [mpResult, yoloResult] = await Promise.all([
      isMediaPipeReady()
        ? detectAllMP(video).catch(() => ({ objects: [], faces: [], faceLandmarks: [], hands: [], poses: [], timestamp: 0, inferenceMs: 0 } as MPVisionResult))
        : Promise.resolve({ objects: [], faces: [], faceLandmarks: [], hands: [], poses: [], timestamp: 0, inferenceMs: 0 } as MPVisionResult),
      isYOLOReady()
        ? detectWithYOLO(video).catch(() => [] as YOLODetection[])
        : Promise.resolve([] as YOLODetection[]),
    ]);

    // 2. Merge & track objects
    const rawObjects = this.mergeToDetectedObjects(mpResult.objects, yoloResult, now);
    const trackedObjects = this.updateTracker(rawObjects, now);

    // 3. Scene classification (heuristic from detected objects)
    const scenario = this.classifyScene(trackedObjects, video);

    // 4. Face analysis (from MediaPipe faces + hands for lip/expression)
    const faces = this.analyzeFaces(mpResult.faces, mpResult.hands);

    // 5. OCR / Text detection
    const reading = await this.analyzeReading(video, faces);

    // 6. Movement analysis
    const movement = this.analyzeMovement(trackedObjects);

    const inferenceMs = Math.round(performance.now() - start);

    const result: MultiTaskResult = {
      scenario,
      objects: trackedObjects,
      faces,
      reading,
      movement,
      timestamp: now,
      adaptiveSize: this.getAdaptiveSize(video),
      cacheHit: false,
      inferenceMs,
      sources: {
        mediapipe: isMediaPipeReady(),
        yolo: isYOLOReady(),
        ocr: true, // heuristic OCR always available
      },
    };

    this.lastResult = result;
    this.lastResultTime = now;

    return result;
  }

  // ═══ Object Merging ═══

  private mergeToDetectedObjects(
    mpObjects: MPVisionResult["objects"],
    yoloObjects: YOLODetection[],
    now: number
  ): DetectedObject[] {
    const result: DetectedObject[] = [];

    // YOLO detections
    for (const y of yoloObjects) {
      result.push({
        id: `y_${y.classId}_${Math.round(y.x)}_${Math.round(y.y)}`,
        class: (y.name as ObjectClass) || "unknown",
        score: y.confidence,
        box: { x: y.x, y: y.y, width: y.width, height: y.height, confidence: y.confidence },
        isMoving: false,
        timestamp: now,
      });
    }

    // MediaPipe detections (deduplicate via IoU)
    for (const mp of mpObjects) {
      let isDuplicate = false;
      for (const existing of result) {
        if (this.computeIoU(
          { x: mp.x, y: mp.y, w: mp.width, h: mp.height },
          { x: existing.box.x, y: existing.box.y, w: existing.box.width, h: existing.box.height }
        ) > 0.4) {
          existing.score = Math.max(existing.score, mp.confidence);
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        const className = mp.name.toLowerCase().replace(/\s+/g, "_") as ObjectClass;
        result.push({
          id: `mp_${className}_${Math.round(mp.x)}_${Math.round(mp.y)}`,
          class: className,
          score: mp.confidence,
          box: { x: mp.x, y: mp.y, width: mp.width, height: mp.height, confidence: mp.confidence },
          isMoving: false,
          timestamp: now,
        });
      }
    }

    return result;
  }

  // ═══ Object Tracking (persistent IDs + velocity) ═══

  private updateTracker(objects: DetectedObject[], now: number): DetectedObject[] {
    const matched = new Set<string>();
    const result: DetectedObject[] = [];

    for (const obj of objects) {
      let bestMatch: TrackedObject | null = null;
      let bestIoU = 0.3; // minimum IoU to match

      for (const [id, tracked] of this.tracker) {
        if (matched.has(id)) continue;
        if (tracked.class !== obj.class) continue;

        const iou = this.computeIoU(
          { x: obj.box.x, y: obj.box.y, w: obj.box.width, h: obj.box.height },
          tracked.box
        );
        if (iou > bestIoU) {
          bestIoU = iou;
          bestMatch = tracked;
        }
      }

      if (bestMatch) {
        // Update existing track
        matched.add(bestMatch.id);
        const dt = Math.max(1, now - bestMatch.lastSeen);
        const vx = (obj.box.x - bestMatch.box.x) / dt * 16.67; // normalize to ~60fps
        const vy = (obj.box.y - bestMatch.box.y) / dt * 16.67;

        bestMatch.box = { x: obj.box.x, y: obj.box.y, w: obj.box.width, h: obj.box.height };
        bestMatch.score = obj.score;
        bestMatch.lastSeen = now;
        bestMatch.velocity = { x: vx * 0.7 + bestMatch.velocity.x * 0.3, y: vy * 0.7 + bestMatch.velocity.y * 0.3 };
        bestMatch.prevBoxes.push({ ...bestMatch.box, t: now });
        if (bestMatch.prevBoxes.length > 10) bestMatch.prevBoxes.shift();

        const speed = Math.sqrt(bestMatch.velocity.x ** 2 + bestMatch.velocity.y ** 2);
        const direction = this.velocityToDirection(bestMatch.velocity, speed);

        result.push({
          ...obj,
          id: bestMatch.id,
          velocity: bestMatch.velocity,
          direction,
          isMoving: speed > 0.5,
        });
      } else {
        // New track
        const id = `obj_${this.nextId++}`;
        this.tracker.set(id, {
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

    // Prune stale tracks (not seen for > 2s)
    for (const [id, tracked] of this.tracker) {
      if (now - tracked.lastSeen > 2000) this.tracker.delete(id);
    }

    return result;
  }

  // ═══ Scene Classification (heuristic, no extra model) ═══

  private classifyScene(objects: DetectedObject[], video: HTMLVideoElement): SceneClassification {
    const objectNames = objects.map(o => o.class);
    const scores: Record<SceneLabel, number> = {} as any;

    for (const [scene, keywords] of Object.entries(SCENE_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        const matches = objectNames.filter(n => n === kw).length;
        score += matches;
      }
      scores[scene as SceneLabel] = score;
    }

    // Find best scene
    let bestScene: SceneLabel = "outro";
    let bestScore = 0;
    for (const [scene, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestScene = scene as SceneLabel;
      }
    }

    // Stability filter (prevent flickering)
    if (bestScene === this.lastSceneLabel) {
      this.sceneStability = Math.min(10, this.sceneStability + 1);
    } else if (bestScore > 2 || this.sceneStability <= 2) {
      this.lastSceneLabel = bestScene;
      this.sceneStability = 1;
    }

    // Lighting heuristic from video brightness
    const lighting = this.estimateLighting(video);
    const isIndoor = ["sala", "escritório", "quarto", "cozinha", "banheiro", "loja", "restaurante"].includes(this.lastSceneLabel);

    return {
      label: this.lastSceneLabel,
      confidence: Math.min(1, bestScore / 3),
      lighting,
      isIndoor,
    };
  }

  // ═══ Face Analysis ═══

  private analyzeFaces(
    mpFaces: MPVisionResult["faces"],
    mpHands: MPVisionResult["hands"]
  ): FaceDetection[] {
    return mpFaces.map((face, i) => {
      // Basic landmarks from BlazeFace bounding box
      const cx = face.x + face.width / 2;
      const cy = face.y + face.height / 2;
      const halfW = face.width / 2;
      const halfH = face.height / 2;

      const landmarks = {
        leftEye: { x: cx - halfW * 0.3, y: cy - halfH * 0.15 },
        rightEye: { x: cx + halfW * 0.3, y: cy - halfH * 0.15 },
        nose: { x: cx, y: cy + halfH * 0.05 },
        mouthLeft: { x: cx - halfW * 0.2, y: cy + halfH * 0.35 },
        mouthRight: { x: cx + halfW * 0.2, y: cy + halfH * 0.35 },
      };

      // Expression from emotion state (if available from face-api)
      const visionState = (globalThis as any).__orionVisionServiceState;
      const emotion = visionState?.emotion || "neutro";
      const expression = this.mapEmotionToExpression(emotion);

      // Lip movement heuristic
      const lipMovement = this.detectLipMovement(expression);

      // Gaze direction (simplified)
      const faceRatioX = (face.x + face.width / 2) / 640; // normalized to typical frame width
      const gazeDirection = faceRatioX < 0.35 ? "esquerda" as const
        : faceRatioX > 0.65 ? "direita" as const
        : "camera" as const;

      return {
        id: `face_${i}`,
        box: { x: face.x, y: face.y, width: face.width, height: face.height, confidence: face.confidence },
        landmarks,
        expression: this.smoothExpression(expression),
        lipMovement,
        gazeDirection,
      };
    });
  }

  // ═══ Reading / OCR ═══

  private async analyzeReading(
    video: HTMLVideoElement,
    faces: FaceDetection[]
  ): Promise<ReadingResult> {
    const textRegions: TextRegionResult[] = [];
    const detectedTexts: string[] = [];

    try {
      // Use existing text detection from vision-text-detection
      if (!this.offCanvas) {
        this.offCanvas = new OffscreenCanvas(320, 240);
        this.offCtx = this.offCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
      }

      const w = 320, h = 240;
      this.offCanvas.width = w;
      this.offCanvas.height = h;
      this.offCtx!.drawImage(video, 0, 0, w, h);
      const imageData = this.offCtx!.getImageData(0, 0, w, h);

      // Convert to grayscale and compute Sobel magnitude
      const gray = new Float32Array(w * h);
      const sobelMag = new Float32Array(w * h);

      for (let i = 0; i < w * h; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        gray[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      }

      // Simple Sobel
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const gx = -gray[(y-1)*w+(x-1)] + gray[(y-1)*w+(x+1)]
                   - 2*gray[y*w+(x-1)] + 2*gray[y*w+(x+1)]
                   - gray[(y+1)*w+(x-1)] + gray[(y+1)*w+(x+1)];
          const gy = -gray[(y-1)*w+(x-1)] - 2*gray[(y-1)*w+x] - gray[(y-1)*w+(x+1)]
                   + gray[(y+1)*w+(x-1)] + 2*gray[(y+1)*w+x] + gray[(y+1)*w+(x+1)];
          sobelMag[y * w + x] = Math.sqrt(gx * gx + gy * gy);
        }
      }

      const regions = detectTextRegions(gray, sobelMag, w, h);

      for (const region of regions.slice(0, 5)) {
        textRegions.push({
          text: `[texto detectado em (${region.x},${region.y})]`,
          box: { x: region.x, y: region.y, width: region.w, height: region.h, confidence: region.confidence },
          confidence: region.confidence,
        });
        detectedTexts.push(`[região de texto: ${region.type}, conf=${(region.confidence * 100).toFixed(0)}%]`);
      }
    } catch {
      // OCR analysis failed silently
    }

    // Lip and expression from faces
    const primaryFace = faces[0];

    return {
      text: detectedTexts,
      lipMovement: primaryFace?.lipMovement || null,
      expression: primaryFace?.expression || "neutro",
      textRegions,
    };
  }

  // ═══ Movement Analysis ═══

  private analyzeMovement(objects: DetectedObject[]): MovementAnalysis {
    const inMotion: TrackedMotion[] = [];

    for (const obj of objects) {
      if (obj.isMoving && obj.velocity) {
        const speed = Math.sqrt(obj.velocity.x ** 2 + obj.velocity.y ** 2);
        inMotion.push({
          id: obj.id,
          velocity: obj.velocity,
          direction: obj.direction || "parado",
          speed,
        });
      }
    }

    // Global motion
    let totalVx = 0, totalVy = 0, count = 0;
    for (const m of inMotion) {
      totalVx += m.velocity.x;
      totalVy += m.velocity.y;
      count++;
    }

    const globalSpeed = count > 0 ? Math.sqrt((totalVx / count) ** 2 + (totalVy / count) ** 2) : 0;
    const globalDir = count > 0
      ? this.velocityToDirection({ x: totalVx / count, y: totalVy / count }, globalSpeed)
      : "parado" as ObjectDirection;

    return {
      trackingIds: objects.map(o => o.id),
      objectsInMotion: inMotion,
      globalMotion: {
        intensity: Math.min(1, globalSpeed / 5),
        dominant: globalDir,
      },
    };
  }

  // ═══ Utility Methods ═══

  private computeIoU(
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

  private velocityToDirection(v: { x: number; y: number }, speed: number): ObjectDirection {
    if (speed < 0.5) return "parado";
    const angle = Math.atan2(v.y, v.x) * (180 / Math.PI);

    // Check for approach (object getting bigger)
    if (Math.abs(angle) < 30 && speed > 2) return "aproximando";
    if (angle > -45 && angle < 45) return "direita";
    if (angle >= 45 && angle < 135) return "baixo";
    if (angle >= -135 && angle < -45) return "cima";
    return "esquerda";
  }

  private mapEmotionToExpression(emotion: string): FaceExpression {
    const map: Record<string, FaceExpression> = {
      happy: "sorrindo", sad: "triste", angry: "irritado",
      surprised: "surpreso", neutral: "neutro", fearful: "sério",
      disgusted: "irritado", contempt: "pensativo",
      feliz: "sorrindo", triste: "triste", irritado: "irritado",
      surpreso: "surpreso", neutro: "neutro",
    };
    return map[emotion.toLowerCase()] || "neutro";
  }

  private smoothExpression(current: FaceExpression): FaceExpression {
    this.expressionBuffer.expressions.push(current);
    if (this.expressionBuffer.expressions.length > this.expressionBuffer.maxSize) {
      this.expressionBuffer.expressions.shift();
    }

    // Weighted vote (recent frames have more weight)
    const votes: Record<string, number> = {};
    const buf = this.expressionBuffer.expressions;
    for (let i = 0; i < buf.length; i++) {
      const weight = 1 + i * 0.5; // newer = heavier
      votes[buf[i]] = (votes[buf[i]] || 0) + weight;
    }

    let best: FaceExpression = "neutro";
    let bestScore = 0;
    for (const [expr, score] of Object.entries(votes)) {
      if (score > bestScore) {
        bestScore = score;
        best = expr as FaceExpression;
      }
    }
    return best;
  }

  private detectLipMovement(expression: FaceExpression): LipMovement {
    if (expression === "sorrindo") return "sorrindo";
    // Without actual lip tracking model, we use a heuristic
    return "neutro";
  }

  private estimateLighting(video: HTMLVideoElement): "dia" | "noite" | "artificial" | "misto" {
    try {
      if (!this.offCanvas) {
        this.offCanvas = new OffscreenCanvas(32, 24);
        this.offCtx = this.offCanvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
      }
      this.offCanvas.width = 32;
      this.offCanvas.height = 24;
      this.offCtx!.drawImage(video, 0, 0, 32, 24);
      const data = this.offCtx!.getImageData(0, 0, 32, 24).data;

      let totalBrightness = 0;
      const pixelCount = 32 * 24;
      for (let i = 0; i < data.length; i += 4) {
        totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      const avgBrightness = totalBrightness / pixelCount;

      if (avgBrightness > 180) return "dia";
      if (avgBrightness > 100) return "artificial";
      if (avgBrightness > 50) return "misto";
      return "noite";
    } catch {
      return "artificial";
    }
  }

  private getAdaptiveSize(video: HTMLVideoElement): number {
    const isMobile = window.innerWidth < 768;
    return isMobile ? 320 : 640;
  }

  /**
   * Format multi-task result as AI-readable description
   */
  formatForAI(result: MultiTaskResult): string {
    const parts: string[] = [];

    // Scene
    if (result.scenario.confidence > 0.2) {
      parts.push(`CENÁRIO: ${result.scenario.label} (${result.scenario.isIndoor ? "interno" : "externo"}, iluminação: ${result.scenario.lighting})`);
    }

    // Objects
    if (result.objects.length > 0) {
      const objList = result.objects
        .map(o => {
          let desc = `${o.class} (${(o.score * 100).toFixed(0)}%)`;
          if (o.isMoving && o.direction) desc += ` [${o.direction}]`;
          return desc;
        })
        .join(", ");
      parts.push(`OBJETOS (${result.objects.length}): ${objList}`);
    }

    // Faces
    if (result.faces.length > 0) {
      const faceList = result.faces
        .map(f => `expressão=${f.expression}, olhar=${f.gazeDirection}, lábios=${f.lipMovement}`)
        .join("; ");
      parts.push(`ROSTOS (${result.faces.length}): ${faceList}`);
    }

    // Text/OCR
    if (result.reading.text.length > 0) {
      parts.push(`TEXTO DETECTADO: ${result.reading.text.join("; ")}`);
    }

    // Movement
    if (result.movement.objectsInMotion.length > 0) {
      const motionList = result.movement.objectsInMotion
        .map(m => `${m.id}: ${m.direction} (${m.speed.toFixed(1)}px/f)`)
        .join(", ");
      parts.push(`MOVIMENTO: ${motionList} | Global: ${result.movement.globalMotion.dominant} (${(result.movement.globalMotion.intensity * 100).toFixed(0)}%)`);
    }

    if (parts.length === 0) {
      parts.push("Nenhuma detecção significativa neste frame.");
    }

    parts.push(`⚡ ${result.inferenceMs}ms | MP:${result.sources.mediapipe ? "✅" : "⏳"} YOLO:${result.sources.yolo ? "✅" : "⏳"}`);

    return parts.join("\n");
  }

  /** Reset tracker state */
  reset() {
    this.tracker.clear();
    this.nextId = 0;
    this.expressionBuffer.expressions = [];
    this.lastResult = null;
    this.lastResultTime = 0;
    this.sceneStability = 0;
  }
}

// ─── Singleton ───
export const yoloFrameX = new YOLOFrameXEngine();

// ─── Convenience exports ───
export { preloadAllVision } from "./realtime-vision-engine";
