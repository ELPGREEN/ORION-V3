/**
 * Face Attributes Engine — Age / Gender / Emotion (browser-local)
 * Uses heuristic analysis from face-api.js landmarks + lightweight scoring.
 * No extra ONNX models needed — leverages existing face-api.js detections.
 */

export interface FaceAttributes {
  /** Estimated age range */
  ageRange: string;
  /** Estimated age (midpoint) */
  ageEstimate: number;
  /** Gender estimate */
  gender: "male" | "female" | "unknown";
  genderConfidence: number;
  /** Expanded emotion (8 classes) */
  emotion: string;
  emotionConfidence: number;
  /** Micro-expressions / secondary signals */
  secondaryEmotions: string[];
  inferenceMs: number;
}

export interface FaceAttributesInput {
  /** face-api.js expressions (7 emotions with scores) */
  expressions?: Record<string, number>;
  /** face-api.js age estimate */
  age?: number;
  /** face-api.js gender */
  gender?: string;
  genderProbability?: number;
  /** Face landmarks count (68 or 478) */
  landmarkCount?: number;
  /** Bounding box dimensions for size heuristics */
  faceWidth?: number;
  faceHeight?: number;
}

// ─── Emotion Mapping (7 → 8 classes with FER+ alignment) ───
const EMOTION_MAP: Record<string, string> = {
  neutral: "neutro",
  happy: "feliz",
  sad: "triste",
  angry: "irritado",
  fearful: "com medo",
  disgusted: "com nojo",
  surprised: "surpreso",
};

const SECONDARY_THRESHOLDS = 0.15;

/**
 * Analyze face attributes from existing face-api.js data.
 * This is a lightweight wrapper that enriches existing detections
 * with Portuguese labels and expanded emotion analysis.
 */
export function analyzeFaceAttributes(input: FaceAttributesInput): FaceAttributes {
  const start = performance.now();

  // ─── Age ───
  let ageEstimate = input.age ?? 30;
  let ageRange = "adulto";
  if (ageEstimate < 13) ageRange = "criança (0-12)";
  else if (ageEstimate < 18) ageRange = "adolescente (13-17)";
  else if (ageEstimate < 30) ageRange = "jovem adulto (18-29)";
  else if (ageEstimate < 50) ageRange = "adulto (30-49)";
  else if (ageEstimate < 65) ageRange = "meia-idade (50-64)";
  else ageRange = "idoso (65+)";

  // ─── Gender ───
  const gender = input.gender === "male" ? "male" : input.gender === "female" ? "female" : "unknown";
  const genderConfidence = input.genderProbability ?? 0.5;

  // ─── Primary Emotion ───
  let emotion = "neutro";
  let emotionConfidence = 0.5;
  const secondaryEmotions: string[] = [];

  if (input.expressions) {
    const sorted = Object.entries(input.expressions).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      emotion = EMOTION_MAP[sorted[0][0]] ?? sorted[0][0];
      emotionConfidence = sorted[0][1];

      // Detect secondary emotions (for micro-expression hints)
      for (let i = 1; i < sorted.length && i < 4; i++) {
        if (sorted[i][1] > SECONDARY_THRESHOLDS) {
          const label = EMOTION_MAP[sorted[i][0]] ?? sorted[i][0];
          secondaryEmotions.push(`${label} (${(sorted[i][1] * 100).toFixed(0)}%)`);
        }
      }

      // ─── "Contempt" detection (FER+ 8th class) ───
      // Heuristic: low angry + low disgusted + moderate neutral = contempt-like
      const angry = input.expressions.angry ?? 0;
      const disgusted = input.expressions.disgusted ?? 0;
      const neutral = input.expressions.neutral ?? 0;
      if (angry > 0.1 && angry < 0.35 && disgusted > 0.08 && neutral > 0.3) {
        secondaryEmotions.push("desprezo (heurístico)");
      }

      // ─── "Confusion" detection ───
      const surprised = input.expressions.surprised ?? 0;
      const fearful = input.expressions.fearful ?? 0;
      if (surprised > 0.15 && fearful > 0.1 && neutral > 0.2) {
        secondaryEmotions.push("confusão (heurístico)");
      }
    }
  }

  return {
    ageRange,
    ageEstimate: Math.round(ageEstimate),
    gender,
    genderConfidence: Math.round(genderConfidence * 100) / 100,
    emotion,
    emotionConfidence: Math.round(emotionConfidence * 100) / 100,
    secondaryEmotions,
    inferenceMs: Math.round(performance.now() - start),
  };
}

/**
 * Format face attributes for AI prompt injection.
 */
export function formatFaceAttributesForAI(attrs: FaceAttributes[]): string {
  if (attrs.length === 0) return "";

  const parts = attrs.map((a, i) => {
    const genderPt = a.gender === "male" ? "masculino" : a.gender === "female" ? "feminino" : "indeterminado";
    let s = `Rosto ${i + 1}: ${a.ageRange}, ${genderPt} (${(a.genderConfidence * 100).toFixed(0)}%), emoção: ${a.emotion} (${(a.emotionConfidence * 100).toFixed(0)}%)`;
    if (a.secondaryEmotions.length > 0) {
      s += ` | micro-expressões: ${a.secondaryEmotions.join(", ")}`;
    }
    return s;
  });

  return `ATRIBUTOS FACIAIS: ${parts.join(" | ")}`;
}

/**
 * Check if face attributes analysis is available.
 * Always true since it's a lightweight heuristic wrapper.
 */
export function isFaceAttributesReady(): boolean {
  return true;
}
