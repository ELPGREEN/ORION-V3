/**
 * ─── v22.2: Vision Tribunal — Computer Vision for Courts ───
 * Superior Temporal Sulcus (STS) + Fusiform Face Area (FFA) analogy.
 * 
 * Specialized vision processing for Brazilian court systems:
 * - Tribunal screen detection (PJe, ePROC, Conexão Gaia)
 * - Document OCR + layout analysis for judicial documents
 * - Facial expression recognition (7 emotions + Action Units)
 * - Gesture analysis for courtroom behavior
 * - 5-stream multimodal fusion (text + vision + audio + gesture + layout)
 * 
 * Ref: Dosovitskiy et al. (2021) ViT, Zhai et al. (2023) SigLIP,
 *      Lugaresi et al. (2019) MediaPipe, Kim et al. (2022) Donut
 */

// ─── Types ───

export type TribunalSystemType = "pje" | "eproc" | "gaia" | "pdpj" | "projudi" | "unknown";
export type EmotionLabel = "neutral" | "joy" | "anger" | "surprise" | "disgust" | "fear" | "sadness";
export type JuridicalGesture = "doubt" | "defensiveness" | "confidence" | "evasion" | "emphasis" | "agreement" | "disagreement" | "neutral";
export type ParticipantRole = "judge" | "prosecutor" | "defense_attorney" | "witness" | "defendant" | "clerk" | "unknown";

export interface TribunalVisionConfig {
  enableFaceDetection: boolean;
  enableGestureAnalysis: boolean;
  enableOCR: boolean;
  enableScreenDetection: boolean;
  emotionThreshold: number;     // Minimum confidence for emotion detection
  gestureWindowMs: number;      // Temporal window for gesture analysis (300-800ms)
  maxFaces: number;             // Max faces to track simultaneously
  embeddingDim: number;         // Vision embedding dimension (1024)
}

export const DEFAULT_TRIBUNAL_VISION_CONFIG: TribunalVisionConfig = {
  enableFaceDetection: true,
  enableGestureAnalysis: true,
  enableOCR: true,
  enableScreenDetection: true,
  emotionThreshold: 0.4,
  gestureWindowMs: 500,
  maxFaces: 8,
  embeddingDim: 1024,
};

export interface TribunalVisionFrame {
  frameIndex: number;
  timestampMs: number;
  width: number;
  height: number;
  features: number[];  // Extracted visual features
}

export interface TribunalDetection {
  type: "screen" | "document" | "face" | "gesture" | "text_region";
  label: string;
  confidence: number;
  boundingBox: { x: number; y: number; w: number; h: number };
  metadata: Record<string, unknown>;
}

export interface EmotionVector {
  dominant: EmotionLabel;
  scores: Record<EmotionLabel, number>;
  actionUnits: Record<string, number>;  // AU1, AU2, etc.
  valence: number;    // -1 (negative) to 1 (positive)
  arousal: number;    // 0 (calm) to 1 (excited)
}

export interface GestureAnalysis {
  gesture: JuridicalGesture;
  confidence: number;
  bodyParts: string[];  // Which body parts involved
  temporalDuration: number;  // ms
  juridicalRelevance: number;  // 0-1, how relevant for court analysis
}

export interface FaceDetection {
  faceId: number;
  landmarks: number[];  // 468 landmarks flattened (x, y pairs)
  emotion: EmotionVector;
  participantRole: ParticipantRole;
  roleConfidence: number;
  embedding: number[];  // 128d face embedding for identification
}

export interface VisionAnalysisResult {
  detections: TribunalDetection[];
  faces: FaceDetection[];
  gestures: GestureAnalysis[];
  screenType: TribunalSystemType;
  ocrText: string;
  visionEmbedding: number[];  // 1024d
  processingTimeMs: number;
}

// ─── Helper Functions (consolidated from activations.ts) ───
import { sigmoid, softmax, layerNorm, cosineSimilarity } from "./activations";

// ─── Tribunal Screen Detection ───

/**
 * Detect which court system is displayed on screen.
 * Uses feature pattern matching against known system signatures.
 */
export function detectTribunalSystem(frameFeatures: number[]): {
  system: TribunalSystemType;
  confidence: number;
} {
  if (frameFeatures.length === 0) return { system: "unknown", confidence: 0 };

  // Simulated system signatures (in production, these would be learned embeddings)
  const signatures: Record<TribunalSystemType, number[]> = {
    pje: Array.from({ length: 16 }, (_, i) => Math.sin(i * 0.5) * 0.8),
    eproc: Array.from({ length: 16 }, (_, i) => Math.cos(i * 0.3) * 0.7),
    gaia: Array.from({ length: 16 }, (_, i) => Math.sin(i * 0.7 + 1) * 0.9),
    pdpj: Array.from({ length: 16 }, (_, i) => Math.cos(i * 0.4 + 0.5) * 0.6),
    projudi: Array.from({ length: 16 }, (_, i) => Math.sin(i * 0.2 + 2) * 0.5),
    unknown: Array.from({ length: 16 }, () => 0),
  };

  const featureSlice = frameFeatures.slice(0, 16);
  while (featureSlice.length < 16) featureSlice.push(0);

  let bestSystem: TribunalSystemType = "unknown";
  let bestScore = -1;

  for (const [sys, sig] of Object.entries(signatures)) {
    if (sys === "unknown") continue;
    const sim = Math.max(0, cosineSimilarity(featureSlice, sig));
    if (sim > bestScore) {
      bestScore = sim;
      bestSystem = sys as TribunalSystemType;
    }
  }

  return {
    system: bestScore > 0.3 ? bestSystem : "unknown",
    confidence: bestScore,
  };
}

// ─── Tribunal Element Detection ───

/**
 * Detect juridical elements in a frame: screens, documents, faces, text regions.
 */
export function detectTribunalElements(
  frameFeatures: number[],
  config: TribunalVisionConfig = DEFAULT_TRIBUNAL_VISION_CONFIG
): TribunalDetection[] {
  const detections: TribunalDetection[] = [];
  if (frameFeatures.length === 0) return detections;

  const featureEnergy = frameFeatures.reduce((s, v) => s + v * v, 0) / frameFeatures.length;

  // Screen detection
  if (config.enableScreenDetection) {
    const { system, confidence } = detectTribunalSystem(frameFeatures);
    if (confidence > 0.3) {
      detections.push({
        type: "screen",
        label: `Sistema: ${system.toUpperCase()}`,
        confidence,
        boundingBox: { x: 0.05, y: 0.05, w: 0.9, h: 0.85 },
        metadata: { system },
      });
    }
  }

  // Face detection (simplified — score based on feature patterns)
  if (config.enableFaceDetection) {
    const faceScore = sigmoid(featureEnergy * 2 - 0.5);
    if (faceScore > config.emotionThreshold) {
      detections.push({
        type: "face",
        label: "Participante detectado",
        confidence: faceScore,
        boundingBox: { x: 0.3, y: 0.1, w: 0.4, h: 0.5 },
        metadata: { faceCount: Math.min(config.maxFaces, Math.ceil(faceScore * 3)) },
      });
    }
  }

  // Text region detection (for OCR)
  if (config.enableOCR) {
    const textScore = sigmoid(featureEnergy - 0.2);
    if (textScore > 0.3) {
      detections.push({
        type: "text_region",
        label: "Região de texto detectada",
        confidence: textScore,
        boundingBox: { x: 0.1, y: 0.6, w: 0.8, h: 0.3 },
        metadata: { estimatedChars: Math.floor(textScore * 500) },
      });
    }
  }

  return detections;
}

// ─── Facial Expression Analysis ───

/**
 * Analyze facial landmarks to determine emotion and action units.
 * Simulates MediaPipe FaceMesh + FER pipeline.
 */
export function analyzeFacialExpression(
  landmarks: number[],
  config: TribunalVisionConfig = DEFAULT_TRIBUNAL_VISION_CONFIG
): EmotionVector {
  // Default neutral emotion
  const scores: Record<EmotionLabel, number> = {
    neutral: 0.3,
    joy: 0,
    anger: 0,
    surprise: 0,
    disgust: 0,
    fear: 0,
    sadness: 0,
  };

  if (landmarks.length < 10) {
    return {
      dominant: "neutral",
      scores,
      actionUnits: {},
      valence: 0,
      arousal: 0.2,
    };
  }

  // Extract features from landmarks (simulated — real would use FER model)
  const landmarkEnergy = landmarks.reduce((s, v) => s + Math.abs(v), 0) / landmarks.length;
  const landmarkVar = landmarks.reduce((s, v) => s + (v - landmarkEnergy) ** 2, 0) / landmarks.length;

  // Map features to emotion scores
  scores.neutral = sigmoid(1 - landmarkVar * 5);
  scores.joy = sigmoid(landmarkEnergy * 2 - 0.8);
  scores.anger = sigmoid(landmarkVar * 3 - 0.6);
  scores.surprise = sigmoid(Math.abs(landmarks[0] || 0) * 4 - 1);
  scores.disgust = sigmoid(landmarkVar * 2 - 0.9);
  scores.fear = sigmoid((landmarks[2] || 0) * 3 - 1.2);
  scores.sadness = sigmoid(-(landmarks[1] || 0) * 2 - 0.3);

  // Normalize via softmax
  const emotionLabels: EmotionLabel[] = ["neutral", "joy", "anger", "surprise", "disgust", "fear", "sadness"];
  const rawScores = emotionLabels.map(e => scores[e]);
  const normalized = softmax(rawScores);
  emotionLabels.forEach((e, i) => { scores[e] = normalized[i]; });

  // Find dominant
  let dominant: EmotionLabel = "neutral";
  let maxScore = 0;
  for (const e of emotionLabels) {
    if (scores[e] > maxScore) {
      maxScore = scores[e];
      dominant = e;
    }
  }

  // Action Units (simplified)
  const actionUnits: Record<string, number> = {
    AU1: Math.min(1, Math.abs(landmarks[0] || 0) * 2),  // Inner brow raise
    AU2: Math.min(1, Math.abs(landmarks[1] || 0) * 2),  // Outer brow raise
    AU4: Math.min(1, Math.abs(landmarks[2] || 0) * 2),  // Brow lowerer
    AU6: Math.min(1, scores.joy * 1.5),                  // Cheek raiser
    AU12: Math.min(1, scores.joy * 2),                   // Lip corner puller
    AU15: Math.min(1, scores.sadness * 2),               // Lip corner depressor
    AU20: Math.min(1, scores.fear * 1.5),                // Lip stretcher
    AU25: Math.min(1, scores.surprise * 2),              // Lips part
  };

  // Valence and arousal
  const valence = scores.joy * 0.8 - scores.anger * 0.6 - scores.sadness * 0.5 + scores.surprise * 0.2;
  const arousal = scores.anger * 0.7 + scores.surprise * 0.8 + scores.fear * 0.6 + scores.joy * 0.3 - scores.neutral * 0.5;

  return {
    dominant,
    scores,
    actionUnits,
    valence: Math.max(-1, Math.min(1, valence)),
    arousal: Math.max(0, Math.min(1, (arousal + 1) / 2)),
  };
}

// ─── Gesture Analysis ───

/**
 * Analyze body/hand landmarks for juridically relevant gestures.
 * Uses temporal window of 300-800ms for gesture detection.
 */
export function analyzeGestures(
  landmarks: number[],
  config: TribunalVisionConfig = DEFAULT_TRIBUNAL_VISION_CONFIG
): GestureAnalysis {
  if (landmarks.length < 6) {
    return {
      gesture: "neutral",
      confidence: 0.5,
      bodyParts: [],
      temporalDuration: 0,
      juridicalRelevance: 0,
    };
  }

  // Extract gesture features
  const handEnergy = landmarks.slice(0, Math.floor(landmarks.length / 2))
    .reduce((s, v) => s + v * v, 0) / Math.max(1, Math.floor(landmarks.length / 2));
  const bodyEnergy = landmarks.slice(Math.floor(landmarks.length / 2))
    .reduce((s, v) => s + v * v, 0) / Math.max(1, Math.ceil(landmarks.length / 2));

  // Gesture classification (simplified — real would use temporal CNN or LSTM)
  const gestureScores: Record<JuridicalGesture, number> = {
    doubt: sigmoid(landmarks[0] * 3 - 0.5),
    defensiveness: sigmoid(bodyEnergy * 4 - 1),
    confidence: sigmoid(handEnergy * 2 + bodyEnergy - 0.8),
    evasion: sigmoid(-(landmarks[1] || 0) * 3 - 0.3),
    emphasis: sigmoid(handEnergy * 5 - 1.5),
    agreement: sigmoid((landmarks[2] || 0) * 2 + 0.1),
    disagreement: sigmoid(-(landmarks[2] || 0) * 2 - 0.3),
    neutral: 0.3,
  };

  // Find dominant gesture
  let dominant: JuridicalGesture = "neutral";
  let maxScore = 0;
  for (const [g, s] of Object.entries(gestureScores)) {
    if (s > maxScore) {
      maxScore = s;
      dominant = g as JuridicalGesture;
    }
  }

  // Body parts involved
  const bodyParts: string[] = [];
  if (handEnergy > 0.3) bodyParts.push("hands");
  if (bodyEnergy > 0.4) bodyParts.push("torso");
  if (Math.abs(landmarks[0] || 0) > 0.3) bodyParts.push("head");

  // Juridical relevance
  const relevanceMap: Record<JuridicalGesture, number> = {
    doubt: 0.8,
    defensiveness: 0.9,
    evasion: 0.95,
    confidence: 0.6,
    emphasis: 0.7,
    agreement: 0.5,
    disagreement: 0.7,
    neutral: 0.1,
  };

  return {
    gesture: dominant,
    confidence: maxScore,
    bodyParts,
    temporalDuration: config.gestureWindowMs,
    juridicalRelevance: relevanceMap[dominant] * maxScore,
  };
}

// ─── Vision Embedding Generation ───

/**
 * Generate a 1024d vision embedding from frame features.
 * Simulates SigLIP-2 / InternVL-2 encoding.
 */
export function generateVisionEmbedding(
  frameFeatures: number[],
  config: TribunalVisionConfig = DEFAULT_TRIBUNAL_VISION_CONFIG
): number[] {
  const dim = config.embeddingDim;
  const embedding = new Array(dim).fill(0);

  for (let d = 0; d < dim; d++) {
    let sum = 0;
    for (let i = 0; i < Math.min(frameFeatures.length, 64); i++) {
      sum += frameFeatures[i] * Math.sin((d * (i + 1)) / dim * Math.PI * 2);
    }
    embedding[d] = Math.tanh(sum / Math.max(1, Math.min(frameFeatures.length, 64)));
  }

  return layerNorm(embedding);
}

// ─── 5-Stream Multimodal Fusion ───

export interface FiveStreamFusionConfig {
  textWeight: number;
  visionWeight: number;
  audioWeight: number;
  gestureWeight: number;
  layoutWeight: number;
  useGatedFusion: boolean;
  useCrossAttention: boolean;
  nHeads: number;
}

export const DEFAULT_FIVE_STREAM_CONFIG: FiveStreamFusionConfig = {
  textWeight: 0.30,
  visionWeight: 0.25,
  audioWeight: 0.20,
  gestureWeight: 0.10,
  layoutWeight: 0.15,
  useGatedFusion: true,
  useCrossAttention: true,
  nHeads: 8,
};

/**
 * Fuse 5 streams: Text + Vision + Audio + Gesture + Layout.
 * Uses gated fusion with optional cross-attention heads.
 * This is the core multimodal integration for v22.
 */
export function fuseVisionAudioText(
  textEmb: number[],
  visionEmb: number[],
  audioEmb: number[],
  gestureEmb: number[],
  layoutEmb: number[],
  config: FiveStreamFusionConfig = DEFAULT_FIVE_STREAM_CONFIG
): number[] {
  const dim = Math.min(
    textEmb.length || Infinity,
    visionEmb.length || Infinity,
    audioEmb.length || Infinity,
    gestureEmb.length || Infinity,
    layoutEmb.length || Infinity
  );

  if (!isFinite(dim) || dim === 0) return [];

  // Truncate all streams to same dimension
  const streams = [
    textEmb.slice(0, dim),
    visionEmb.slice(0, dim),
    audioEmb.slice(0, dim),
    gestureEmb.slice(0, dim),
    layoutEmb.slice(0, dim),
  ];
  const weights = [
    config.textWeight,
    config.visionWeight,
    config.audioWeight,
    config.gestureWeight,
    config.layoutWeight,
  ];

  const fused = new Array(dim).fill(0);

  if (config.useGatedFusion) {
    // Gated fusion: learn a gate per dimension per stream
    for (let i = 0; i < dim; i++) {
      const streamVals = streams.map(s => s[i]);
      const gateInputs = streamVals.map((v, si) => v * weights[si]);
      const gates = softmax(gateInputs);

      for (let s = 0; s < streams.length; s++) {
        fused[i] += gates[s] * streams[s][i];
      }
    }
  } else {
    // Simple weighted average
    for (let i = 0; i < dim; i++) {
      for (let s = 0; s < streams.length; s++) {
        fused[i] += weights[s] * streams[s][i];
      }
    }
  }

  // Cross-attention refinement (simplified multi-head)
  if (config.useCrossAttention && dim >= config.nHeads) {
    const headDim = Math.floor(dim / config.nHeads);
    for (let h = 0; h < config.nHeads; h++) {
      const start = h * headDim;
      const end = start + headDim;

      // Q from text, K from vision+audio, V from all
      for (let i = start; i < end && i < dim; i++) {
        const q = textEmb[i] || 0;
        const k = ((visionEmb[i] || 0) + (audioEmb[i] || 0)) / 2;
        const attention = sigmoid(q * k / Math.sqrt(headDim));
        fused[i] = fused[i] * (1 - attention * 0.3) + attention * 0.3 * (
          (visionEmb[i] || 0) * 0.4 + (audioEmb[i] || 0) * 0.3 +
          (gestureEmb[i] || 0) * 0.15 + (layoutEmb[i] || 0) * 0.15
        );
      }
    }
  }

  return layerNorm(fused);
}

// ─── Full Vision Pipeline ───

/**
 * Complete vision analysis pipeline for a tribunal frame.
 */
export function analyzeFrame(
  frame: TribunalVisionFrame,
  faceLandmarks: number[] = [],
  bodyLandmarks: number[] = [],
  config: TribunalVisionConfig = DEFAULT_TRIBUNAL_VISION_CONFIG
): VisionAnalysisResult {
  const start = performance.now();

  // 1. Detect tribunal elements
  const detections = detectTribunalElements(frame.features, config);

  // 2. Screen type
  const { system: screenType } = detectTribunalSystem(frame.features);

  // 3. Face analysis
  const faces: FaceDetection[] = [];
  if (config.enableFaceDetection && faceLandmarks.length > 0) {
    const emotion = analyzeFacialExpression(faceLandmarks, config);
    faces.push({
      faceId: 0,
      landmarks: faceLandmarks,
      emotion,
      participantRole: "unknown",
      roleConfidence: 0.5,
      embedding: faceLandmarks.slice(0, 128),
    });
  }

  // 4. Gesture analysis
  const gestures: GestureAnalysis[] = [];
  if (config.enableGestureAnalysis && bodyLandmarks.length > 0) {
    gestures.push(analyzeGestures(bodyLandmarks, config));
  }

  // 5. Vision embedding
  const visionEmbedding = generateVisionEmbedding(frame.features, config);

  // 6. OCR text (placeholder — real OCR via Edge Function)
  const ocrText = detections
    .filter(d => d.type === "text_region")
    .map(d => `[Texto detectado: ${d.metadata.estimatedChars} chars]`)
    .join(" ");

  return {
    detections,
    faces,
    gestures,
    screenType,
    ocrText,
    visionEmbedding,
    processingTimeMs: performance.now() - start,
  };
}
