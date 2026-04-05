/**
 * ─── Face-API.js Runtime ───
 * Full facial recognition pipeline using @vladmandic/face-api
 * Provides: 68-point landmarks, 128d descriptors, FaceMatcher
 * 
 * Ref: Gist by Dante Testa — Sistema de Detecção e Reconhecimento Facial
 */

import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model";

let _modelsLoaded = false;
let _loading = false;
let _loadTime = 0;
let _faceMatcher: faceapi.FaceMatcher | null = null;

export interface FaceApiDetection {
  box: { x: number; y: number; width: number; height: number };
  score: number;
  landmarks: { x: number; y: number }[];
  descriptor: Float32Array | null;
  expressions: Record<string, number> | null;
}

/** Load all face-api.js models (TinyFaceDetector + landmarks + recognition + expressions) */
export async function loadFaceApiModels(): Promise<boolean> {
  if (_modelsLoaded) return true;
  if (_loading) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (_modelsLoaded || !_loading) { clearInterval(check); resolve(_modelsLoaded); }
      }, 200);
      setTimeout(() => { clearInterval(check); resolve(false); }, 15000);
    });
  }

  _loading = true;
  const start = performance.now();

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);

    _modelsLoaded = true;
    _loadTime = Math.round(performance.now() - start);
    console.log(`[face-api] Models loaded (${_loadTime}ms)`);
    return true;
  } catch (err) {
    console.warn("[face-api] Failed to load models:", err);
    _loading = false;
    return false;
  }
}

/** Detect a single face with landmarks + descriptor + expressions */
export async function detectSingleFaceFull(
  input: HTMLVideoElement | HTMLCanvasElement
): Promise<FaceApiDetection | null> {
  if (!_modelsLoaded) {
    const ok = await loadFaceApiModels();
    if (!ok) return null;
  }

  try {
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5,
    });

    const result = await faceapi
      .detectSingleFace(input, options)
      .withFaceLandmarks()
      .withFaceDescriptor()
      .withFaceExpressions();

    if (!result) return null;

    const box = result.detection.box;
    const landmarks = result.landmarks.positions.map((p) => ({ x: p.x, y: p.y }));
    const expressions: Record<string, number> = {};
    const exprEntries = Object.entries(result.expressions);
    for (const [key, val] of exprEntries) {
      expressions[key] = val as number;
    }

    return {
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      score: result.detection.score,
      landmarks,
      descriptor: result.descriptor,
      expressions,
    };
  } catch (err) {
    console.warn("[face-api] Detection error:", err);
    return null;
  }
}

/** Detect all faces with landmarks + descriptors */
export async function detectAllFacesFull(
  input: HTMLVideoElement | HTMLCanvasElement
): Promise<FaceApiDetection[]> {
  if (!_modelsLoaded) {
    const ok = await loadFaceApiModels();
    if (!ok) return [];
  }

  try {
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5,
    });

    const results = await faceapi
      .detectAllFaces(input, options)
      .withFaceLandmarks()
      .withFaceDescriptors()
      .withFaceExpressions();

    return results.map((r) => ({
      box: {
        x: r.detection.box.x,
        y: r.detection.box.y,
        width: r.detection.box.width,
        height: r.detection.box.height,
      },
      score: r.detection.score,
      landmarks: r.landmarks.positions.map((p) => ({ x: p.x, y: p.y })),
      descriptor: r.descriptor,
      expressions: Object.fromEntries(
        Object.entries(r.expressions).map(([k, v]) => [k, v as number])
      ),
    }));
  } catch (err) {
    console.warn("[face-api] All-faces detection error:", err);
    return [];
  }
}

/** Create a FaceMatcher from labeled descriptors */
export function createFaceMatcher(
  labeled: { name: string; descriptors: Float32Array[] }[],
  threshold = 0.5
): faceapi.FaceMatcher {
  const labeledDescriptors = labeled.map(
    (l) => new faceapi.LabeledFaceDescriptors(l.name, l.descriptors)
  );
  _faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, threshold);
  return _faceMatcher;
}

/** Match a descriptor against the current FaceMatcher */
export function matchFace(
  descriptor: Float32Array,
  matcher?: faceapi.FaceMatcher
): { label: string; distance: number; confidence: number } {
  const m = matcher || _faceMatcher;
  if (!m) return { label: "unknown", distance: 1, confidence: 0 };

  const match = m.findBestMatch(descriptor);
  return {
    label: match.label,
    distance: match.distance,
    confidence: Math.round((1 - match.distance) * 100),
  };
}

/** Convert descriptor to JSON-safe array */
export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

/** Restore descriptor from JSON array */
export function arrayToDescriptor(arr: number[]): Float32Array {
  return new Float32Array(arr);
}

/** Draw scanner-style overlay on canvas */
export function drawFaceOverlay(
  ctx: CanvasRenderingContext2D,
  detection: FaceApiDetection,
  options?: {
    label?: string;
    color?: string;
    showLandmarks?: boolean;
    showCorners?: boolean;
    showConfidence?: boolean;
    scaleX?: number;
    scaleY?: number;
  }
) {
  const {
    label,
    color = "#22c55e",
    showLandmarks = true,
    showCorners = true,
    showConfidence = true,
    scaleX = 1,
    scaleY = 1,
  } = options || {};

  const { box, score, landmarks } = detection;
  const x = box.x * scaleX;
  const y = box.y * scaleY;
  const w = box.width * scaleX;
  const h = box.height * scaleY;

  // ─── Scanner corners (L-shaped) ───
  if (showCorners) {
    const cornerSize = Math.min(w, h) * 0.15;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + cornerSize);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerSize, y);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + w - cornerSize, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + cornerSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + h - cornerSize);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + cornerSize, y + h);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w - cornerSize, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - cornerSize);
    ctx.stroke();
  }

  // ─── 68 landmarks ───
  if (showLandmarks && landmarks.length > 0) {
    ctx.fillStyle = color;
    for (const point of landmarks) {
      ctx.beginPath();
      ctx.arc(point.x * scaleX, point.y * scaleY, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // ─── Label text ───
  const displayLabel = label || (score > 0.7 ? "Detectado" : "Analisando...");
  ctx.fillStyle = color;
  ctx.font = "bold 12px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(displayLabel, x + w / 2, y - 8);

  // ─── Confidence ───
  if (showConfidence) {
    const conf = Math.round(score * 100);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px 'Inter', sans-serif";
    ctx.fillText(`${conf}%`, x + w / 2, y + h + 14);
  }
}

/** Get runtime metrics */
export function getFaceApiMetrics() {
  return {
    modelsLoaded: _modelsLoaded,
    loadTimeMs: _loadTime,
    hasMatcher: !!_faceMatcher,
  };
}
