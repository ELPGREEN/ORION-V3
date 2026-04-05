/**
 * ─── Body Language Analysis Module ───
 * Detects advanced behavioral signals from posture, gaze, and head position.
 * Based on nonverbal communication research (Mehrabian, 1972; Knapp & Hall, 2013).
 * 
 * Signals analyzed:
 *   - Mão no queixo (chin touch) → reflexão/análise
 *   - Desvio de olhar (gaze aversion) → desconforto/insegurança
 *   - Inclinação do corpo (body lean) → interesse/engajamento
 *   - Cruzar braços (arms crossed) → defensividade
 *   - Inclinar cabeça (head tilt) → curiosidade/atenção
 */

// ─── Types ───

export type BodyLanguageSignal =
  | "chin_touch"
  | "gaze_aversion"
  | "body_lean_forward"
  | "body_lean_back"
  | "arms_crossed"
  | "head_tilt"
  | "nodding"
  | "head_shake"
  | "neutral_posture";

export interface BodyLanguageResult {
  signal: BodyLanguageSignal;
  confidence: number;
  interpretation: string;
  emotionalHint: "positive" | "negative" | "neutral" | "ambiguous";
  engagementScore: number; // 0-1, how engaged the person appears
}

export interface PostureFrame {
  /** Normalized head position (0-1 within frame) */
  headX: number;
  headY: number;
  /** Shoulder line endpoints (if detectable) */
  shoulderLeftX?: number;
  shoulderLeftY?: number;
  shoulderRightX?: number;
  shoulderRightY?: number;
  /** Hand position relative to face (normalized) */
  handNearFace: boolean;
  handY?: number;
  /** Gaze direction from facial recognition */
  gazeDirection: "camera" | "left" | "right" | "down" | "document" | "unknown";
  /** Head rotation angles (radians, from landmark geometry) */
  headTiltAngle?: number; // Roll — side tilt
  headNodAngle?: number;  // Pitch — up/down
  timestamp: number;
}

// ─── Constants ───

const SIGNAL_INTERPRETATIONS: Record<BodyLanguageSignal, { text: string; hint: BodyLanguageResult["emotionalHint"] }> = {
  chin_touch: { text: "Mão no queixo — reflexão ou análise profunda", hint: "neutral" },
  gaze_aversion: { text: "Desvio de olhar — possível desconforto ou insegurança", hint: "negative" },
  body_lean_forward: { text: "Inclinação para frente — interesse e engajamento ativo", hint: "positive" },
  body_lean_back: { text: "Inclinação para trás — distanciamento ou relaxamento", hint: "ambiguous" },
  arms_crossed: { text: "Braços cruzados — postura defensiva ou auto-conforto", hint: "negative" },
  head_tilt: { text: "Cabeça inclinada — curiosidade ou atenção concentrada", hint: "positive" },
  nodding: { text: "Aceno afirmativo — concordância ou compreensão", hint: "positive" },
  head_shake: { text: "Negação com a cabeça — discordância ou negação", hint: "negative" },
  neutral_posture: { text: "Postura neutra — sem sinais comportamentais significativos", hint: "neutral" },
};

// ─── Analysis Engine ───

/**
 * Analyze body language from a sequence of posture frames.
 * Requires at least 3 frames for temporal analysis (nodding/shaking).
 */
export function analyzeBodyLanguage(
  frames: PostureFrame[],
  currentFrame: PostureFrame
): BodyLanguageResult {
  const signals: { signal: BodyLanguageSignal; confidence: number }[] = [];

  // ── 1. Chin Touch: hand near face at chin level ──
  if (currentFrame.handNearFace && currentFrame.handY !== undefined) {
    // Hand is below eyes but near face → chin touch
    const chinProximity = currentFrame.handY > 0.55 && currentFrame.handY < 0.75;
    if (chinProximity) {
      signals.push({ signal: "chin_touch", confidence: 0.7 });
    }
  }

  // ── 2. Gaze Aversion: looking away from camera ──
  if (currentFrame.gazeDirection !== "camera" && currentFrame.gazeDirection !== "unknown") {
    const isDocument = currentFrame.gazeDirection === "document" || currentFrame.gazeDirection === "down";
    // Document reading is not aversion
    if (!isDocument) {
      // Check persistence: was gaze averted for multiple frames?
      const recentAversions = frames.slice(-5).filter(
        f => f.gazeDirection !== "camera" && f.gazeDirection !== "document" && f.gazeDirection !== "down"
      ).length;
      if (recentAversions >= 3) {
        signals.push({ signal: "gaze_aversion", confidence: 0.6 + recentAversions * 0.05 });
      }
    }
  }

  // ── 3. Body Lean: head position shift from baseline ──
  if (frames.length >= 5) {
    const baselineY = frames.slice(0, Math.min(5, frames.length)).reduce((s, f) => s + f.headY, 0) / Math.min(5, frames.length);
    const currentY = currentFrame.headY;
    const deltaY = currentY - baselineY;

    // Leaning forward = head moves down + closer (larger in frame)
    if (deltaY > 0.04) {
      signals.push({ signal: "body_lean_forward", confidence: Math.min(0.85, 0.5 + deltaY * 5) });
    } else if (deltaY < -0.04) {
      signals.push({ signal: "body_lean_back", confidence: Math.min(0.8, 0.5 + Math.abs(deltaY) * 5) });
    }
  }

  // ── 4. Arms Crossed: both shoulders visible but narrow spread ──
  if (
    currentFrame.shoulderLeftX !== undefined &&
    currentFrame.shoulderRightX !== undefined
  ) {
    const shoulderSpread = Math.abs(currentFrame.shoulderRightX - currentFrame.shoulderLeftX);
    // Narrow shoulder spread + hands not visible = likely arms crossed
    if (shoulderSpread < 0.25 && !currentFrame.handNearFace) {
      signals.push({ signal: "arms_crossed", confidence: 0.5 });
    }
  }

  // ── 5. Head Tilt: roll angle ──
  if (currentFrame.headTiltAngle !== undefined) {
    const tiltDeg = Math.abs(currentFrame.headTiltAngle * (180 / Math.PI));
    if (tiltDeg > 8 && tiltDeg < 35) {
      signals.push({ signal: "head_tilt", confidence: Math.min(0.8, 0.4 + tiltDeg / 40) });
    }
  }

  // ── 6. Nodding & Head Shake: temporal head movement patterns ──
  if (frames.length >= 6) {
    const recent = frames.slice(-6);
    // Nodding: vertical oscillation
    const yValues = recent.map(f => f.headY);
    const yChanges = yValues.slice(1).map((y, i) => y - yValues[i]);
    const signChangesY = yChanges.slice(1).filter((d, i) => Math.sign(d) !== Math.sign(yChanges[i])).length;

    if (signChangesY >= 3) {
      const amplitude = Math.max(...yValues) - Math.min(...yValues);
      if (amplitude > 0.015 && amplitude < 0.1) {
        signals.push({ signal: "nodding", confidence: Math.min(0.8, 0.4 + signChangesY * 0.1) });
      }
    }

    // Head shake: horizontal oscillation
    const xValues = recent.map(f => f.headX);
    const xChanges = xValues.slice(1).map((x, i) => x - xValues[i]);
    const signChangesX = xChanges.slice(1).filter((d, i) => Math.sign(d) !== Math.sign(xChanges[i])).length;

    if (signChangesX >= 3) {
      const amplitude = Math.max(...xValues) - Math.min(...xValues);
      if (amplitude > 0.02 && amplitude < 0.15) {
        signals.push({ signal: "head_shake", confidence: Math.min(0.75, 0.4 + signChangesX * 0.1) });
      }
    }
  }

  // ── Select highest-confidence signal ──
  if (signals.length === 0) {
    signals.push({ signal: "neutral_posture", confidence: 0.5 });
  }

  signals.sort((a, b) => b.confidence - a.confidence);
  const best = signals[0];
  const interp = SIGNAL_INTERPRETATIONS[best.signal];

  // ── Engagement Score ──
  const engagementPositive = signals.filter(s =>
    ["body_lean_forward", "head_tilt", "nodding", "chin_touch"].includes(s.signal)
  );
  const engagementNegative = signals.filter(s =>
    ["gaze_aversion", "body_lean_back", "arms_crossed", "head_shake"].includes(s.signal)
  );
  const engagementScore = Math.min(1, Math.max(0,
    0.5
    + engagementPositive.reduce((s, e) => s + e.confidence * 0.2, 0)
    - engagementNegative.reduce((s, e) => s + e.confidence * 0.15, 0)
  ));

  return {
    signal: best.signal,
    confidence: best.confidence,
    interpretation: interp.text,
    emotionalHint: interp.hint,
    engagementScore,
  };
}

/**
 * Extract a PostureFrame from facial detection results and gesture data.
 * Bridge function connecting facial-recognition + gesture modules to body language analysis.
 */
export function extractPostureFrame(
  faceData?: {
    boundingBox: { x: number; y: number; w: number; h: number };
    gazeDirection: "camera" | "left" | "right" | "down" | "document" | "unknown";
    landmarks: number[];
  },
  handNearFace = false,
  handY?: number,
): PostureFrame {
  const headX = faceData ? faceData.boundingBox.x + faceData.boundingBox.w / 2 : 0.5;
  const headY = faceData ? faceData.boundingBox.y + faceData.boundingBox.h / 2 : 0.5;

  // Estimate head tilt from eye landmarks
  let headTiltAngle: number | undefined;
  if (faceData && faceData.landmarks.length >= 4) {
    const eyeL_x = faceData.landmarks[0] || 0;
    const eyeL_y = faceData.landmarks[1] || 0;
    const eyeR_x = faceData.landmarks[2] || 0;
    const eyeR_y = faceData.landmarks[3] || 0;
    headTiltAngle = Math.atan2(eyeR_y - eyeL_y, eyeR_x - eyeL_x);
  }

  return {
    headX,
    headY,
    handNearFace,
    handY,
    gazeDirection: faceData?.gazeDirection || "unknown",
    headTiltAngle,
    timestamp: Date.now(),
  };
}
