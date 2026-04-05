/**
 * ─── HumaneX Face Recognition Pipeline ───
 * Implements the full 5-stage pipeline from HumaneX AI:
 * 
 * Stage 1: DATA CAPTURE — Video/camera → frame extraction → face scan
 * Stage 2: FACE DETECTION — MTCNN/face-api.js → bounding box + alignment (68 landmarks)
 * Stage 3: FEATURE EXTRACTION — CNN embeddings (128d descriptor via face-api + hybrid LBP+Geo)
 * Stage 4: CLASSIFICATION — SVM-style cosine similarity + L2 distance vs known embeddings
 * Stage 5: IDENTIFICATION — Threshold-gated decision with liveness + anti-spoofing
 *
 * Browser adaptation: Uses face-api.js (TinyFaceDetector + FaceNet-style descriptors)
 * instead of MTCNN + FaceNet Python stack, achieving equivalent pipeline in-browser.
 *
 * Ref: HumaneX AI Face Recognition (github.com/Jawabreh0/HumanexAI_FaceRecognition)
 * Ref: Orion AVFI Agent (vision-agent-presets.ts)
 */

import {
  loadFaceApiModels,
  detectSingleFaceFull,
  detectAllFacesFull,
  createFaceMatcher,
  matchFace,
  descriptorToArray,
  arrayToDescriptor,
  type FaceApiDetection,
} from "./face-api-runtime";

import {
  preprocessFaceRegion,
  extractLBPHistogram,
  extractGeometricTemplate,
  generateFaceEmbedding,
  cosineSimilarity,
  createLGPDAuditEntry,
  type FacialAnalysisConfig,
  DEFAULT_FACIAL_CONFIG,
} from "./facial-recognition";

// ─── Types ───

export interface FaceEnrollment {
  id: string;
  name: string;
  label: string;
  descriptors: Float32Array[];         // face-api.js 128d descriptors (multiple captures)
  hybridEmbeddings: number[][];        // LBP+Geo+ArcFace hybrid embeddings
  enrolledAt: number;
  captureCount: number;
  metadata?: Record<string, unknown>;
}

export interface IdentificationResult {
  stage: "detected" | "aligned" | "embedded" | "classified" | "identified";
  id: string | null;
  name: string | null;
  confidence: number;                  // 0-1, cosine similarity
  euclideanDistance: number;            // L2 distance (lower = more similar)
  livenessScore: number;               // 0-1 anti-spoofing confidence
  isMaskDetected: boolean;
  action: "allow" | "deny" | "verify" | "alert_security";
  reason: string;
  embeddingHash: string;
  pipelineMs: number;
  stageTimings: Record<string, number>;
  rawDetection: FaceApiDetection | null;
  hybridEmbedding: number[] | null;
}

export interface PipelineConfig {
  allowThreshold: number;              // > this = ALLOW (default 0.95)
  verifyThreshold: number;             // > this = VERIFY (default 0.80)
  denyThreshold: number;               // < this = DENY (default 0.80)
  livenessRequired: boolean;           // Require liveness check
  livenessMinBlinks: number;           // Min blinks detected for liveness
  maxCapturesForEnroll: number;        // Number of frames for enrollment
  useHybridEmbedding: boolean;         // Combine face-api + LBP + Geometric
  enableAuditLog: boolean;             // LGPD compliance
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  allowThreshold: 0.95,
  verifyThreshold: 0.80,
  denyThreshold: 0.80,
  livenessRequired: true,
  livenessMinBlinks: 2,
  maxCapturesForEnroll: 5,
  useHybridEmbedding: true,
  enableAuditLog: true,
};

// ─── State ───

const _enrollments: Map<string, FaceEnrollment> = new Map();
let _config: PipelineConfig = { ...DEFAULT_PIPELINE_CONFIG };
let _blinkHistory: { timestamp: number; eyeAR: number }[] = [];
let _lastFrameEyeOpen = true;
let _totalBlinks = 0;
let _modelsReady = false;

// ─── Configuration ───

export function configurePipeline(config: Partial<PipelineConfig>): void {
  _config = { ..._config, ...config };
}

export function getPipelineConfig(): Readonly<PipelineConfig> {
  return _config;
}

// ─── Stage 1: DATA CAPTURE ───
// In browser context, capture = extracting frame from video element.
// HumaneX equivalent: divide.py (video → images)

export async function captureFrameFromVideo(
  video: HTMLVideoElement
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Capture multiple frames for enrollment (HumaneX: 150-1000 frames from face scan video)
 */
export async function captureMultipleFrames(
  video: HTMLVideoElement,
  count: number = 5,
  intervalMs: number = 500
): Promise<HTMLCanvasElement[]> {
  const frames: HTMLCanvasElement[] = [];
  for (let i = 0; i < count; i++) {
    frames.push(await captureFrameFromVideo(video));
    if (i < count - 1) {
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }
  return frames;
}

// ─── Stage 2: FACE DETECTION + ALIGNMENT ───
// HumaneX equivalent: MTCNN face detection + alignment to standard coordinates
// Browser: face-api.js TinyFaceDetector + 68-point landmarks (auto-aligned)

export async function detectAndAlign(
  input: HTMLVideoElement | HTMLCanvasElement
): Promise<{ detection: FaceApiDetection; alignedCanvas: HTMLCanvasElement } | null> {
  if (!_modelsReady) {
    _modelsReady = await loadFaceApiModels();
    if (!_modelsReady) return null;
  }

  const detection = await detectSingleFaceFull(input);
  if (!detection || detection.score < 0.5) return null;

  // Create aligned face crop (160x160 — FaceNet standard)
  const { box, landmarks } = detection;

  // Calculate eye centers for alignment angle
  const leftEye = landmarks.slice(36, 42);  // landmarks 36-41 = left eye
  const rightEye = landmarks.slice(42, 48); // landmarks 42-47 = right eye

  let eyeAngle = 0;
  if (leftEye.length >= 2 && rightEye.length >= 2) {
    const leftCenter = {
      x: leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length,
      y: leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length,
    };
    const rightCenter = {
      x: rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length,
      y: rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length,
    };
    eyeAngle = Math.atan2(rightCenter.y - leftCenter.y, rightCenter.x - leftCenter.x);
  }

  // Extract and align face crop
  const alignedCanvas = document.createElement("canvas");
  alignedCanvas.width = 160;
  alignedCanvas.height = 160;
  const ctx = alignedCanvas.getContext("2d")!;

  // Get source canvas/video
  const source = input;
  const sx = Math.max(0, box.x);
  const sy = Math.max(0, box.y);
  const sw = box.width;
  const sh = box.height;

  // Apply rotation correction for alignment
  ctx.save();
  ctx.translate(80, 80);
  ctx.rotate(-eyeAngle); // Counter-rotate to align eyes horizontally
  ctx.drawImage(source, sx, sy, sw, sh, -80, -80, 160, 160);
  ctx.restore();

  return { detection, alignedCanvas };
}

/**
 * Detect ALL faces (multi-face scenario, HumaneX: surveillance mode)
 */
export async function detectAndAlignAll(
  input: HTMLVideoElement | HTMLCanvasElement
): Promise<{ detection: FaceApiDetection; alignedCanvas: HTMLCanvasElement }[]> {
  if (!_modelsReady) {
    _modelsReady = await loadFaceApiModels();
    if (!_modelsReady) return [];
  }

  const detections = await detectAllFacesFull(input);
  const results: { detection: FaceApiDetection; alignedCanvas: HTMLCanvasElement }[] = [];

  for (const detection of detections) {
    if (detection.score < 0.5) continue;

    const alignedCanvas = document.createElement("canvas");
    alignedCanvas.width = 160;
    alignedCanvas.height = 160;
    const ctx = alignedCanvas.getContext("2d")!;

    const { box } = detection;
    ctx.drawImage(input, 
      Math.max(0, box.x), Math.max(0, box.y), box.width, box.height,
      0, 0, 160, 160
    );

    results.push({ detection, alignedCanvas });
  }

  return results;
}

// ─── Stage 3: FEATURE EXTRACTION (Embeddings) ───
// HumaneX equivalent: FaceNet CNN → 128d embedding vector
// Browser: face-api.js descriptor (128d) + optional hybrid (LBP + Geometric)

export function extractEmbeddings(
  detection: FaceApiDetection,
  alignedCanvas?: HTMLCanvasElement
): { faceApiDescriptor: Float32Array | null; hybridEmbedding: number[] | null } {
  const faceApiDescriptor = detection.descriptor;

  let hybridEmbedding: number[] | null = null;

  if (_config.useHybridEmbedding && alignedCanvas) {
    const ctx = alignedCanvas.getContext("2d");
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, 160, 160);
      const pixels = imageData.data;

      // Grayscale + histogram equalization
      const { grayscale, width, height } = preprocessFaceRegion(
        pixels, 160, 160
      );

      // LBP texture descriptor
      const lbpHist = grayscale.length > 9
        ? extractLBPHistogram(grayscale, width, height)
        : undefined;

      // Geometric template from landmarks
      const landmarkFlat = detection.landmarks.flatMap(p => [p.x, p.y]);
      const geoTemplate = extractGeometricTemplate(landmarkFlat);

      // Hybrid embedding: ArcFace-style + LBP + Geometric
      hybridEmbedding = generateFaceEmbedding(
        landmarkFlat, 128, lbpHist, geoTemplate, DEFAULT_FACIAL_CONFIG
      );
    }
  }

  return { faceApiDescriptor, hybridEmbedding };
}

// ─── Stage 4: CLASSIFICATION (Comparison) ───
// HumaneX equivalent: SVM classifier with L2-normalized embeddings
// Browser: Cosine similarity + Euclidean distance against enrolled embeddings

export function classifyFace(
  descriptor: Float32Array | null,
  hybridEmbedding: number[] | null
): { matchId: string | null; matchName: string | null; cosineSim: number; euclideanDist: number } {
  if (!descriptor && !hybridEmbedding) {
    return { matchId: null, matchName: null, cosineSim: 0, euclideanDist: Infinity };
  }

  let bestId: string | null = null;
  let bestName: string | null = null;
  let bestCosineSim = -1;
  let bestEuclideanDist = Infinity;

  for (const [id, enrollment] of _enrollments) {
    // Method 1: face-api.js descriptor comparison (primary — FaceNet equivalent)
    if (descriptor && enrollment.descriptors.length > 0) {
      for (const enrolledDesc of enrollment.descriptors) {
        // Cosine similarity
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < descriptor.length; i++) {
          dot += descriptor[i] * enrolledDesc[i];
          normA += descriptor[i] * descriptor[i];
          normB += enrolledDesc[i] * enrolledDesc[i];
        }
        const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);

        // Euclidean distance
        let sumSq = 0;
        for (let i = 0; i < descriptor.length; i++) {
          sumSq += (descriptor[i] - enrolledDesc[i]) ** 2;
        }
        const dist = Math.sqrt(sumSq);

        if (sim > bestCosineSim) {
          bestCosineSim = sim;
          bestEuclideanDist = dist;
          bestId = id;
          bestName = enrollment.name;
        }
      }
    }

    // Method 2: Hybrid embedding comparison (secondary — LBP+Geo+ArcFace)
    if (hybridEmbedding && enrollment.hybridEmbeddings.length > 0) {
      for (const enrolledHybrid of enrollment.hybridEmbeddings) {
        const sim = cosineSimilarity(hybridEmbedding, enrolledHybrid);
        if (sim > bestCosineSim) {
          bestCosineSim = sim;
          bestId = id;
          bestName = enrollment.name;
        }
      }
    }
  }

  return { matchId: bestId, matchName: bestName, cosineSim: bestCosineSim, euclideanDist: bestEuclideanDist };
}

// ─── Stage 5: IDENTIFICATION (Decision) ───
// HumaneX equivalent: threshold-gated decision + unknown handling
// Enhanced with: liveness detection, mask detection, audit logging

export function makeDecision(
  cosineSim: number,
  euclideanDist: number,
  livenessScore: number,
  isMaskDetected: boolean,
  matchId: string | null,
  matchName: string | null
): { action: IdentificationResult["action"]; reason: string } {
  // Anti-spoofing gate
  if (_config.livenessRequired && livenessScore < 0.5) {
    return { action: "deny", reason: "Liveness check failed — possible spoofing attempt" };
  }

  // No match found
  if (!matchId || cosineSim < _config.denyThreshold) {
    return { action: "alert_security", reason: `Unknown face (similarity: ${(cosineSim * 100).toFixed(1)}% < ${(_config.denyThreshold * 100).toFixed(0)}% threshold)` };
  }

  // Mask reduces confidence — require verification
  if (isMaskDetected && cosineSim < _config.allowThreshold) {
    return { action: "verify", reason: `Mask detected, reduced confidence (${(cosineSim * 100).toFixed(1)}%)` };
  }

  // High confidence match
  if (cosineSim >= _config.allowThreshold) {
    return { action: "allow", reason: `Identity confirmed: ${matchName} (${(cosineSim * 100).toFixed(1)}%)` };
  }

  // Medium confidence — additional verification needed
  if (cosineSim >= _config.verifyThreshold) {
    return { action: "verify", reason: `Partial match: ${matchName} (${(cosineSim * 100).toFixed(1)}%) — additional verification required` };
  }

  return { action: "deny", reason: `Low confidence match (${(cosineSim * 100).toFixed(1)}%)` };
}

// ─── Liveness Detection ───
// Anti-spoofing via eye-aspect-ratio blink detection

export function updateBlinkDetection(landmarks: { x: number; y: number }[]): number {
  if (landmarks.length < 48) return 0.5; // Not enough landmarks

  // Eye aspect ratio (EAR) — Soukupová & Čech (2016)
  // EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
  const ear = (eye: { x: number; y: number }[]): number => {
    if (eye.length < 6) return 0.3;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    const v1 = dist(eye[1], eye[5]);
    const v2 = dist(eye[2], eye[4]);
    const h = dist(eye[0], eye[3]);
    return (v1 + v2) / (2 * h + 1e-8);
  };

  const leftEAR = ear(landmarks.slice(36, 42));
  const rightEAR = ear(landmarks.slice(42, 48));
  const avgEAR = (leftEAR + rightEAR) / 2;

  const isEyeOpen = avgEAR > 0.2;

  // Detect blink: transition from open → closed → open
  if (_lastFrameEyeOpen && !isEyeOpen) {
    _totalBlinks++;
    _blinkHistory.push({ timestamp: Date.now(), eyeAR: avgEAR });
    // Keep only last 30s of history
    const cutoff = Date.now() - 30_000;
    _blinkHistory = _blinkHistory.filter(b => b.timestamp > cutoff);
  }
  _lastFrameEyeOpen = isEyeOpen;

  // Liveness score based on natural blink pattern
  const recentBlinks = _blinkHistory.filter(b => b.timestamp > Date.now() - 10_000).length;
  // Normal blink rate: 12-15/min → ~2-3 per 10s
  if (recentBlinks >= _config.livenessMinBlinks) return 0.95;
  if (recentBlinks >= 1) return 0.7;
  return 0.3; // No blinks — possible static image
}

export function detectMask(detection: FaceApiDetection): boolean {
  if (!detection.landmarks || detection.landmarks.length < 48) return false;

  // Mask detection heuristic: if mouth/chin landmarks have very low contrast
  // compared to eye/forehead landmarks, likely masked
  const noseLandmarks = detection.landmarks.slice(27, 36);   // nose bridge
  const mouthLandmarks = detection.landmarks.slice(48, 68);  // mouth contour

  if (noseLandmarks.length === 0 || mouthLandmarks.length === 0) return false;

  // Check vertical spread of mouth landmarks — masked faces have compressed lower face
  const mouthYs = mouthLandmarks.map(p => p.y);
  const mouthSpread = Math.max(...mouthYs) - Math.min(...mouthYs);
  const noseYs = noseLandmarks.map(p => p.y);
  const noseSpread = Math.max(...noseYs) - Math.min(...noseYs);

  // If mouth vertical spread is abnormally small relative to nose, likely masked
  const ratio = mouthSpread / (noseSpread + 1e-8);
  return ratio < 1.2; // Threshold tuned empirically
}

// ─── Enrollment (Training equivalent) ───
// HumaneX: load_dataset → face detection → feature extraction → embeddings.npz

export async function enrollFace(
  video: HTMLVideoElement,
  userId: string,
  userName: string,
  label: string,
  captureCount?: number
): Promise<FaceEnrollment | null> {
  const count = captureCount || _config.maxCapturesForEnroll;
  const frames = await captureMultipleFrames(video, count, 600);

  const descriptors: Float32Array[] = [];
  const hybridEmbeddings: number[][] = [];

  for (const frame of frames) {
    const result = await detectAndAlign(frame);
    if (!result) continue;

    const { faceApiDescriptor, hybridEmbedding } = extractEmbeddings(
      result.detection, result.alignedCanvas
    );

    if (faceApiDescriptor) descriptors.push(faceApiDescriptor);
    if (hybridEmbedding) hybridEmbeddings.push(hybridEmbedding);
  }

  if (descriptors.length === 0) return null;

  const enrollment: FaceEnrollment = {
    id: userId,
    name: userName,
    label,
    descriptors,
    hybridEmbeddings,
    enrolledAt: Date.now(),
    captureCount: descriptors.length,
  };

  _enrollments.set(userId, enrollment);

  // Rebuild FaceMatcher with all enrolled faces
  rebuildFaceMatcher();

  return enrollment;
}

/**
 * Enroll from pre-existing descriptors (e.g., loaded from database)
 */
export function enrollFromDescriptors(
  userId: string,
  userName: string,
  label: string,
  descriptorArrays: number[][],
  hybridEmbeddings?: number[][]
): FaceEnrollment {
  const descriptors = descriptorArrays.map(arr => new Float32Array(arr));

  const enrollment: FaceEnrollment = {
    id: userId,
    name: userName,
    label,
    descriptors,
    hybridEmbeddings: hybridEmbeddings || [],
    enrolledAt: Date.now(),
    captureCount: descriptors.length,
  };

  _enrollments.set(userId, enrollment);
  rebuildFaceMatcher();

  return enrollment;
}

function rebuildFaceMatcher(): void {
  const labeled = Array.from(_enrollments.values())
    .filter(e => e.descriptors.length > 0)
    .map(e => ({ name: e.label, descriptors: e.descriptors }));

  if (labeled.length > 0) {
    createFaceMatcher(labeled, 0.5);
  }
}

export function removeEnrollment(userId: string): boolean {
  const deleted = _enrollments.delete(userId);
  if (deleted) rebuildFaceMatcher();
  return deleted;
}

export function getEnrollments(): FaceEnrollment[] {
  return Array.from(_enrollments.values());
}

export function getEnrollmentCount(): number {
  return _enrollments.size;
}

// ─── FULL PIPELINE: Detect → Align → Embed → Classify → Identify ───

function hashEmbedding(arr: Float32Array | number[]): string {
  let hash = 0;
  const values = arr instanceof Float32Array ? Array.from(arr) : arr;
  for (let i = 0; i < Math.min(values.length, 32); i++) {
    hash = ((hash << 5) - hash + Math.round(values[i] * 1000)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Run the complete HumaneX-style pipeline on a single frame:
 * Stage 1: Capture frame
 * Stage 2: Detect face + align (MTCNN equivalent via face-api.js)
 * Stage 3: Extract embeddings (FaceNet equivalent — 128d descriptor)
 * Stage 4: Classify against known enrollments (SVM equivalent — cosine similarity)
 * Stage 5: Make access decision with liveness check
 */
export async function runIdentificationPipeline(
  input: HTMLVideoElement | HTMLCanvasElement,
  sessionId: string = "default"
): Promise<IdentificationResult> {
  const pipelineStart = performance.now();
  const timings: Record<string, number> = {};

  // ── Stage 1: Capture ──
  const t1 = performance.now();
  // Input is already a video/canvas, no extraction needed in browser
  timings.capture = Math.round(performance.now() - t1);

  // ── Stage 2: Detect + Align ──
  const t2 = performance.now();
  const aligned = await detectAndAlign(input);
  timings.detection = Math.round(performance.now() - t2);

  if (!aligned) {
    return {
      stage: "detected", id: null, name: null, confidence: 0,
      euclideanDistance: Infinity, livenessScore: 0, isMaskDetected: false,
      action: "deny", reason: "No face detected in frame",
      embeddingHash: "00000000",
      pipelineMs: Math.round(performance.now() - pipelineStart),
      stageTimings: timings, rawDetection: null, hybridEmbedding: null,
    };
  }

  // ── Stage 3: Extract Embeddings ──
  const t3 = performance.now();
  const { faceApiDescriptor, hybridEmbedding } = extractEmbeddings(
    aligned.detection, aligned.alignedCanvas
  );
  timings.embedding = Math.round(performance.now() - t3);

  if (!faceApiDescriptor) {
    return {
      stage: "embedded", id: null, name: null, confidence: 0,
      euclideanDistance: Infinity, livenessScore: 0,
      isMaskDetected: detectMask(aligned.detection),
      action: "deny", reason: "Failed to extract face embedding",
      embeddingHash: "00000000",
      pipelineMs: Math.round(performance.now() - pipelineStart),
      stageTimings: timings, rawDetection: aligned.detection, hybridEmbedding: null,
    };
  }

  // ── Liveness + Mask Detection ──
  const t4a = performance.now();
  const livenessScore = updateBlinkDetection(aligned.detection.landmarks);
  const isMaskDetected = detectMask(aligned.detection);
  timings.liveness = Math.round(performance.now() - t4a);

  // ── Stage 4: Classification ──
  const t4 = performance.now();
  const { matchId, matchName, cosineSim, euclideanDist } = classifyFace(
    faceApiDescriptor, hybridEmbedding
  );
  timings.classification = Math.round(performance.now() - t4);

  // ── Stage 5: Decision ──
  const t5 = performance.now();
  const { action, reason } = makeDecision(
    cosineSim, euclideanDist, livenessScore, isMaskDetected, matchId, matchName
  );
  timings.decision = Math.round(performance.now() - t5);

  const embHash = hashEmbedding(faceApiDescriptor);

  // LGPD Audit
  if (_config.enableAuditLog) {
    createLGPDAuditEntry(
      matchId ? "face_identified" : "face_detected",
      1, true, sessionId
    );
  }

  return {
    stage: "identified",
    id: matchId,
    name: matchName,
    confidence: cosineSim,
    euclideanDistance: euclideanDist,
    livenessScore,
    isMaskDetected,
    action,
    reason,
    embeddingHash: embHash,
    pipelineMs: Math.round(performance.now() - pipelineStart),
    stageTimings: timings,
    rawDetection: aligned.detection,
    hybridEmbedding,
  };
}

/**
 * Run pipeline on ALL faces in frame (surveillance mode)
 */
export async function runMultiFaceIdentification(
  input: HTMLVideoElement | HTMLCanvasElement,
  sessionId: string = "default"
): Promise<IdentificationResult[]> {
  const all = await detectAndAlignAll(input);
  const results: IdentificationResult[] = [];

  for (const { detection, alignedCanvas } of all) {
    const start = performance.now();
    const { faceApiDescriptor, hybridEmbedding } = extractEmbeddings(detection, alignedCanvas);
    const livenessScore = updateBlinkDetection(detection.landmarks);
    const isMaskDetected = detectMask(detection);

    const { matchId, matchName, cosineSim, euclideanDist } = classifyFace(
      faceApiDescriptor, hybridEmbedding
    );
    const { action, reason } = makeDecision(
      cosineSim, euclideanDist, livenessScore, isMaskDetected, matchId, matchName
    );

    results.push({
      stage: "identified",
      id: matchId,
      name: matchName,
      confidence: cosineSim,
      euclideanDistance: euclideanDist,
      livenessScore,
      isMaskDetected,
      action,
      reason,
      embeddingHash: faceApiDescriptor ? hashEmbedding(faceApiDescriptor) : "00000000",
      pipelineMs: Math.round(performance.now() - start),
      stageTimings: {},
      rawDetection: detection,
      hybridEmbedding,
    });
  }

  if (_config.enableAuditLog && results.length > 0) {
    createLGPDAuditEntry("face_detected", results.length, true, sessionId);
  }

  return results;
}

// ─── Reset ───

export function resetPipeline(): void {
  _enrollments.clear();
  _blinkHistory = [];
  _lastFrameEyeOpen = true;
  _totalBlinks = 0;
  _config = { ...DEFAULT_PIPELINE_CONFIG };
}

export function getBlinkCount(): number {
  return _totalBlinks;
}

export function resetBlinkCount(): void {
  _totalBlinks = 0;
  _blinkHistory = [];
}
