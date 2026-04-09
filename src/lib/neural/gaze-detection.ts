/**
 * Gaze Detection Engine — Derived from MediaPipe FaceLandmarker iris landmarks
 * No additional model needed — uses the 478 face mesh landmarks already loaded.
 * Iris landmarks: left eye (468-472), right eye (473-477)
 * Eye contour: left (33,133,159,145,160,144,153,154,155,157,158,163), right (362,263,386,374,387,373,380,381,382,384,385,390)
 */

export interface GazeResult {
  /** Normalized gaze direction [-1, 1] for each axis */
  x: number; // negative = looking left, positive = looking right
  y: number; // negative = looking down, positive = looking up
  /** Confidence 0-1 */
  confidence: number;
  /** Human-readable direction */
  direction: string;
  /** Per-eye data */
  leftEye: { irisX: number; irisY: number; openness: number };
  rightEye: { irisX: number; irisY: number; openness: number };
}

// MediaPipe face mesh landmark indices
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
const LEFT_EYE_INNER = 133;
const LEFT_EYE_OUTER = 33;
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_INNER = 362;
const RIGHT_EYE_OUTER = 263;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;

/**
 * Estimate gaze direction from MediaPipe 478 face landmarks.
 * Works with the landmarks already produced by FaceLandmarker.
 */
export function estimateGaze(
  landmarks: Array<{ x: number; y: number; z: number }>
): GazeResult | null {
  if (!landmarks || landmarks.length < 478) return null;

  try {
    // Left eye iris relative position within eye socket
    const leftIris = landmarks[LEFT_IRIS_CENTER];
    const leftInner = landmarks[LEFT_EYE_INNER];
    const leftOuter = landmarks[LEFT_EYE_OUTER];
    const leftTop = landmarks[LEFT_EYE_TOP];
    const leftBottom = landmarks[LEFT_EYE_BOTTOM];

    const leftEyeWidth = Math.abs(leftInner.x - leftOuter.x) || 0.001;
    const leftEyeHeight = Math.abs(leftTop.y - leftBottom.y) || 0.001;
    const leftIrisX = (leftIris.x - leftOuter.x) / leftEyeWidth * 2 - 1;
    const leftIrisY = (leftIris.y - leftTop.y) / leftEyeHeight * 2 - 1;
    const leftOpenness = leftEyeHeight / leftEyeWidth;

    // Right eye
    const rightIris = landmarks[RIGHT_IRIS_CENTER];
    const rightInner = landmarks[RIGHT_EYE_INNER];
    const rightOuter = landmarks[RIGHT_EYE_OUTER];
    const rightTop = landmarks[RIGHT_EYE_TOP];
    const rightBottom = landmarks[RIGHT_EYE_BOTTOM];

    const rightEyeWidth = Math.abs(rightInner.x - rightOuter.x) || 0.001;
    const rightEyeHeight = Math.abs(rightTop.y - rightBottom.y) || 0.001;
    const rightIrisX = (rightIris.x - rightOuter.x) / rightEyeWidth * 2 - 1;
    const rightIrisY = (rightIris.y - rightTop.y) / rightEyeHeight * 2 - 1;
    const rightOpenness = rightEyeHeight / rightEyeWidth;

    // Average both eyes for final gaze
    const gazeX = clamp((leftIrisX + rightIrisX) / 2, -1, 1);
    const gazeY = clamp((leftIrisY + rightIrisY) / 2, -1, 1);

    // Confidence based on eye openness (closed eyes = low confidence)
    const avgOpenness = (leftOpenness + rightOpenness) / 2;
    const confidence = clamp(avgOpenness * 3, 0, 1); // normalized

    // Human-readable direction
    const direction = getGazeDirection(gazeX, gazeY);

    return {
      x: round3(gazeX),
      y: round3(gazeY),
      confidence: round3(confidence),
      direction,
      leftEye: { irisX: round3(leftIrisX), irisY: round3(leftIrisY), openness: round3(leftOpenness) },
      rightEye: { irisX: round3(rightIrisX), irisY: round3(rightIrisY), openness: round3(rightOpenness) },
    };
  } catch {
    return null;
  }
}

function getGazeDirection(x: number, y: number): string {
  const threshold = 0.2;
  const h = x < -threshold ? "esquerda" : x > threshold ? "direita" : "";
  const v = y < -threshold ? "cima" : y > threshold ? "baixo" : "";
  if (h && v) return `${v}-${h}`;
  if (h) return h;
  if (v) return v;
  return "centro";
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/**
 * Format gaze data for AI prompt injection.
 */
export function formatGazeForAI(gaze: GazeResult): string {
  return `OLHAR DO USUÁRIO: ${gaze.direction} (x=${gaze.x}, y=${gaze.y}, conf=${(gaze.confidence * 100).toFixed(0)}%) | Olhos: esq abertura=${gaze.leftEye.openness.toFixed(2)} dir abertura=${gaze.rightEye.openness.toFixed(2)}`;
}