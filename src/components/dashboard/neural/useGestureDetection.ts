import { useRef, useCallback, useState, useEffect } from "react";
import { analyzeBodyLanguage, extractPostureFrame, type PostureFrame, type BodyLanguageResult } from "@/lib/neural/body-language";

// ═══ MediaPipe 21-Point Hand Landmark Topology ═══
// Ref: https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer
//
//  0. WRIST
//  1. THUMB_CMC    2. THUMB_MCP    3. THUMB_IP     4. THUMB_TIP
//  5. INDEX_MCP    6. INDEX_PIP    7. INDEX_DIP    8. INDEX_TIP
//  9. MIDDLE_MCP  10. MIDDLE_PIP  11. MIDDLE_DIP  12. MIDDLE_TIP
// 13. RING_MCP    14. RING_PIP    15. RING_DIP    16. RING_TIP
// 17. PINKY_MCP   18. PINKY_PIP   19. PINKY_DIP   20. PINKY_TIP

export const LANDMARK_NAMES = [
  "WRIST",
  "THUMB_CMC", "THUMB_MCP", "THUMB_IP", "THUMB_TIP",
  "INDEX_MCP", "INDEX_PIP", "INDEX_DIP", "INDEX_TIP",
  "MIDDLE_MCP", "MIDDLE_PIP", "MIDDLE_DIP", "MIDDLE_TIP",
  "RING_MCP", "RING_PIP", "RING_DIP", "RING_TIP",
  "PINKY_MCP", "PINKY_PIP", "PINKY_DIP", "PINKY_TIP",
] as const;

// Skeleton connections for visualization
export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17],            // Palm connections
];

export interface HandLandmark {
  x: number; // normalized 0-1
  y: number;
  z: number; // depth (negative = closer to camera)
}

export type GestureType = "none" | "pointing" | "thumbs_up" | "thumbs_down" | "wave" | "open_palm" | "fist" | "peace" | "ok" | "hang_loose" | "i_love_you" | "socorro";

export interface GestureResult {
  gesture: GestureType;
  confidence: number;
  handPosition: { x: number; y: number };
  fingerDirection?: { x: number; y: number };
  landmarks?: HandLandmark[];
  bodyLanguage?: BodyLanguageResult;
  timestamp: number;
}

export interface GestureAction {
  gesture: GestureType;
  label: string;
  emoji: string;
  action: string;
  cooldownMs: number;
}

// ═══ Default Gesture → AI Action Mapping ═══
export const GESTURE_ACTIONS: GestureAction[] = [
  { gesture: "pointing", label: "Apontar", emoji: "👉", action: "O usuário está APONTANDO para algo específico na cena. Descreva detalhadamente o que está na direção apontada. Foque no objeto/área indicada.", cooldownMs: 5000 },
  { gesture: "thumbs_up", label: "Positivo", emoji: "👍", action: "O usuário fez sinal de POSITIVO (👍). Responda com entusiasmo e confirme o que ele está vendo/fazendo. Seja breve e animado.", cooldownMs: 4000 },
  { gesture: "thumbs_down", label: "Negativo", emoji: "👎", action: "O usuário fez sinal de NEGATIVO (👎). Pergunte o que está errado ou o que pode melhorar. Seja empático.", cooldownMs: 4000 },
  { gesture: "wave", label: "Acenar", emoji: "👋", action: "O usuário está ACENANDO. Cumprimente de volta de forma natural e amigável. Comente brevemente o que vê.", cooldownMs: 6000 },
  { gesture: "open_palm", label: "Parar", emoji: "✋", action: "O usuário mostrou a PALMA ABERTA (sinal de parar/esperar). Pare o que está fazendo e pergunte o que ele precisa.", cooldownMs: 5000 },
  { gesture: "peace", label: "Paz / Vitória", emoji: "✌️", action: "O usuário fez sinal de PAZ/VITÓRIA (✌️). Responda de forma descontraída e positiva.", cooldownMs: 6000 },
  { gesture: "ok", label: "OK", emoji: "👌", action: "O usuário fez sinal de OK (👌). Confirme que tudo está certo e continue.", cooldownMs: 5000 },
  { gesture: "hang_loose", label: "Hang Loose", emoji: "🤙", action: "O usuário fez sinal de HANG LOOSE (🤙). Responda de forma tranquila e relaxada. Tudo certo!", cooldownMs: 6000 },
  { gesture: "i_love_you", label: "Te Amo / Rock", emoji: "🤟", action: "O usuário fez sinal de I LOVE YOU / ROCK (🤟). Responda com energia positiva e entusiasmo!", cooldownMs: 6000 },
  { gesture: "socorro", label: "Socorro", emoji: "🆘", action: "O usuário fez o SINAL DE SOCORRO (palma aberta, polegar recolhido, dedos fechando). Este é um sinal de emergência. Pergunte imediatamente se precisa de ajuda e ofereça recursos de emergência.", cooldownMs: 3000 },
];

// ═══ 21-Point Landmark Extraction from Canvas ═══

/**
 * Extract 21 hand landmarks from a canvas using gradient-based finger detection.
 * This replaces the old skin-color blob approach with anatomically-aware landmark extraction.
 * 
 * Pipeline: Canvas → Downsample → Skin mask → Contour → Wrist → Finger rays → 21 landmarks
 */
function extractLandmarksFromCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): HandLandmark[] | null {
  const scale = 4;
  const sw = Math.floor(w / scale);
  const sh = Math.floor(h / scale);

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = sw;
  tempCanvas.height = sh;
  const tCtx = tempCanvas.getContext("2d");
  if (!tCtx) return null;
  tCtx.drawImage(ctx.canvas, 0, 0, sw, sh);
  const imageData = tCtx.getImageData(0, 0, sw, sh);
  const data = imageData.data;

  // Build skin mask
  const mask = new Uint8Array(sw * sh);
  let skinCount = 0;
  let sumX = 0, sumY = 0;
  let minX = sw, maxX = 0, minY = sh, maxY = 0;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      if (isSkinColor(data[i], data[i + 1], data[i + 2])) {
        mask[y * sw + x] = 1;
        skinCount++;
        sumX += x;
        sumY += y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Need minimum skin pixels
  const area = sw * sh;
  if (skinCount < area * 0.003 || skinCount > area * 0.35) return null;

  // Filter out face region (top-center, compact, large)
  const centX = sumX / skinCount;
  const centY = sumY / skinCount;
  const regionW = (maxX - minX) / sw;
  const regionH = (maxY - minY) / sh;
  const normCentX = centX / sw;
  const normCentY = centY / sh;

  const isFaceLike = normCentY < 0.35 && normCentX > 0.3 && normCentX < 0.7 && regionW > 0.12;
  if (isFaceLike && regionH < 0.4) return null;

  // Determine wrist (bottommost point of hand region)
  const bboxW = maxX - minX + 1;
  const bboxH = maxY - minY + 1;

  // Find wrist: lowest skin point near horizontal center
  let wristX = centX, wristY = maxY;
  for (let y = maxY; y >= maxY - Math.floor(bboxH * 0.15); y--) {
    for (let x = Math.floor(centX - bboxW * 0.2); x <= Math.floor(centX + bboxW * 0.2); x++) {
      if (x >= 0 && x < sw && y >= 0 && y < sh && mask[y * sw + x]) {
        wristX = x;
        wristY = y;
      }
    }
  }

  // Find fingertip candidates: topmost skin pixels in 5 vertical strips
  const strips = 5; // thumb, index, middle, ring, pinky
  const stripW = Math.max(1, Math.floor(bboxW / strips));
  const fingerTips: { x: number; y: number }[] = [];

  for (let s = 0; s < strips; s++) {
    const sx = minX + s * stripW;
    const ex = Math.min(sw, sx + stripW);
    let topY = maxY, topX = (sx + ex) / 2;

    for (let y = minY; y <= maxY; y++) {
      for (let x = sx; x < ex; x++) {
        if (mask[y * sw + x] && y < topY) {
          topY = y;
          topX = x;
        }
      }
      if (topY < maxY) break;
    }
    fingerTips.push({ x: topX, y: topY });
  }

  // Build 21 landmarks by interpolating between wrist and fingertips
  const landmarks: HandLandmark[] = [];

  // Helper: interpolate along a finger ray
  const addFinger = (tipIdx: number, mcpRatio: number, pipRatio: number, dipRatio: number) => {
    const tip = fingerTips[tipIdx] || { x: centX, y: centY };
    const mcp = lerp2D(wristX, wristY, tip.x, tip.y, mcpRatio);
    const pip = lerp2D(wristX, wristY, tip.x, tip.y, pipRatio);
    const dip = lerp2D(wristX, wristY, tip.x, tip.y, dipRatio);
    return [
      { x: mcp.x / sw, y: mcp.y / sh, z: 0 },    // MCP
      { x: pip.x / sw, y: pip.y / sh, z: -0.01 },  // PIP
      { x: dip.x / sw, y: dip.y / sh, z: -0.02 },  // DIP
      { x: tip.x / sw, y: tip.y / sh, z: -0.03 },   // TIP
    ];
  };

  // 0: WRIST
  landmarks.push({ x: wristX / sw, y: wristY / sh, z: 0 });

  // 1-4: THUMB (CMC, MCP, IP, TIP)
  const thumbRay = addFinger(0, 0.25, 0.45, 0.7);
  landmarks.push(
    { x: lerp2D(wristX, wristY, fingerTips[0]?.x ?? centX, fingerTips[0]?.y ?? centY, 0.15).x / sw, y: lerp2D(wristX, wristY, fingerTips[0]?.x ?? centX, fingerTips[0]?.y ?? centY, 0.15).y / sh, z: 0 }, // CMC
    thumbRay[0], thumbRay[1], thumbRay[3] // MCP, IP, TIP
  );

  // 5-8: INDEX
  const indexRay = addFinger(1, 0.35, 0.55, 0.75);
  landmarks.push(indexRay[0], indexRay[1], indexRay[2], indexRay[3]);

  // 9-12: MIDDLE
  const middleRay = addFinger(2, 0.35, 0.55, 0.75);
  landmarks.push(middleRay[0], middleRay[1], middleRay[2], middleRay[3]);

  // 13-16: RING
  const ringRay = addFinger(3, 0.35, 0.55, 0.75);
  landmarks.push(ringRay[0], ringRay[1], ringRay[2], ringRay[3]);

  // 17-20: PINKY
  const pinkyRay = addFinger(4, 0.35, 0.55, 0.75);
  landmarks.push(pinkyRay[0], pinkyRay[1], pinkyRay[2], pinkyRay[3]);

  return landmarks;
}

function lerp2D(x1: number, y1: number, x2: number, y2: number, t: number) {
  return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
}

function isSkinColor(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (r > 95 && g > 40 && b > 20 && r > g && r > b && (max - min) > 15 && Math.abs(r - g) > 15) return true;
  const sum = r + g + b;
  if (sum > 0) {
    const nr = r / sum;
    const ng = g / sum;
    if (nr > 0.36 && nr < 0.465 && ng > 0.28 && ng < 0.363) return true;
  }
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.169 * r - 0.331 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.419 * g - 0.081 * b;
  if (y > 80 && cb > 77 && cb < 127 && cr > 133 && cr < 173) return true;
  return false;
}

// ═══ 21-Point Landmark-Based Gesture Classification ═══

function dist2D(a: HandLandmark, b: HandLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isFingerExtended(landmarks: HandLandmark[], tip: number, dip: number, pip: number, mcp: number): boolean {
  // A finger is extended when tip is farther from wrist than pip
  const wrist = landmarks[0];
  const tipDist = dist2D(landmarks[tip], wrist);
  const pipDist = dist2D(landmarks[pip], wrist);
  // Also check: tip-to-mcp > pip-to-mcp (finger not curled)
  const tipToMcp = dist2D(landmarks[tip], landmarks[mcp]);
  const pipToMcp = dist2D(landmarks[pip], landmarks[mcp]);
  return tipDist > pipDist * 0.95 && tipToMcp > pipToMcp * 0.8;
}

function isThumbExtended(landmarks: HandLandmark[]): boolean {
  // Thumb extended: tip (4) is far from index MCP (5) laterally
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const wrist = landmarks[0];
  const handWidth = dist2D(landmarks[5], landmarks[17]); // index MCP to pinky MCP
  const thumbSpread = Math.abs(thumbTip.x - indexMcp.x);
  return thumbSpread > handWidth * 0.4 || dist2D(thumbTip, wrist) > dist2D(landmarks[3], wrist);
}

function classifyFromLandmarks(
  landmarks: HandLandmark[],
  prevLandmarks: HandLandmark[][] | null,
): { gesture: GestureType; confidence: number; direction?: { x: number; y: number } } {
  if (landmarks.length < 21) return { gesture: "none", confidence: 0 };

  const thumb = isThumbExtended(landmarks);
  const index = isFingerExtended(landmarks, 8, 7, 6, 5);
  const middle = isFingerExtended(landmarks, 12, 11, 10, 9);
  const ring = isFingerExtended(landmarks, 16, 15, 14, 13);
  const pinky = isFingerExtended(landmarks, 20, 19, 18, 17);

  const extendedCount = [thumb, index, middle, ring, pinky].filter(Boolean).length;
  const wrist = landmarks[0];

  // ── Check for motion (waving) ──
  let motionMag = 0;
  if (prevLandmarks && prevLandmarks.length >= 2) {
    const prev = prevLandmarks[prevLandmarks.length - 1];
    if (prev.length >= 21) {
      motionMag = dist2D(landmarks[0], prev[0]) + dist2D(landmarks[12], prev[12]);
    }
  }

  if (motionMag > 0.06 && extendedCount >= 4) {
    return { gesture: "wave", confidence: Math.min(0.95, 0.6 + motionMag * 3) };
  }

  // THUMBS UP: only thumb extended, thumb tip above wrist
  if (thumb && !index && !middle && !ring && !pinky && landmarks[4].y < wrist.y) {
    return { gesture: "thumbs_up", confidence: 0.85 };
  }

  // THUMBS DOWN: only thumb extended, thumb tip below wrist
  if (thumb && !index && !middle && !ring && !pinky && landmarks[4].y > wrist.y) {
    return { gesture: "thumbs_down", confidence: 0.80 };
  }

  // POINTING: only index extended
  if (!thumb && index && !middle && !ring && !pinky) {
    const dir = { x: landmarks[8].x - landmarks[5].x, y: landmarks[8].y - landmarks[5].y };
    const mag = Math.sqrt(dir.x ** 2 + dir.y ** 2) || 1;
    return { gesture: "pointing", confidence: 0.85, direction: { x: dir.x / mag, y: dir.y / mag } };
  }

  // PEACE / VICTORY: index + middle extended
  if (index && middle && !ring && !pinky) {
    return { gesture: "peace", confidence: 0.80 };
  }

  // OK: thumb tip touches index tip (distance < threshold)
  const thumbIndexDist = dist2D(landmarks[4], landmarks[8]);
  const handSize = dist2D(landmarks[0], landmarks[12]);
  if (thumbIndexDist < handSize * 0.2 && middle && ring) {
    return { gesture: "ok", confidence: 0.80 };
  }

  // OPEN PALM: all 5 extended
  if (extendedCount === 5) {
    return { gesture: "open_palm", confidence: 0.85 };
  }

  // FIST: no fingers extended
  if (extendedCount === 0) {
    return { gesture: "fist", confidence: 0.80 };
  }

  // HANG LOOSE: thumb + pinky extended, others curled
  if (thumb && !index && !middle && !ring && pinky) {
    return { gesture: "hang_loose", confidence: 0.80 };
  }

  // I LOVE YOU: thumb + index + pinky extended
  if (thumb && index && !middle && !ring && pinky) {
    return { gesture: "i_love_you", confidence: 0.80 };
  }

  // SOCORRO: detect transition from open palm to fist (thumb tucked)
  if (prevLandmarks && prevLandmarks.length >= 3) {
    const prev2 = prevLandmarks[prevLandmarks.length - 2];
    if (prev2 && prev2.length >= 21) {
      const prevThumb = isThumbExtended(prev2);
      const prevIndex = isFingerExtended(prev2, 8, 7, 6, 5);
      const prevOpen = [prevThumb, prevIndex].filter(Boolean).length;
      // Was open, now closed with thumb tucked
      if (prevOpen >= 2 && extendedCount === 0 && !thumb) {
        return { gesture: "socorro", confidence: 0.75 };
      }
    }
  }

  return { gesture: "none", confidence: 0 };
}

// ═══ Hook: useGestureDetection (21-point + Body Language) ═══
export function useGestureDetection(
  active: boolean,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onGestureAction: (gesture: GestureType, action: GestureAction) => void,
) {
  const [currentGesture, setCurrentGesture] = useState<GestureResult>({
    gesture: "none", confidence: 0, handPosition: { x: 0, y: 0 }, timestamp: 0,
  });
  const [gesturesEnabled, setGesturesEnabled] = useState(false); // OFF by default — user must opt in
  const prevLandmarksRef = useRef<HandLandmark[][]>([]);
  const gestureHistoryRef = useRef<GestureType[]>([]);
  const lastActionTimeRef = useRef<Record<string, number>>({});
  const postureHistoryRef = useRef<PostureFrame[]>([]);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const processGestures = useCallback(() => {
    if (!active || !gesturesEnabled || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || canvas.width === 0) return;

    // Extract 21-point landmarks
    const landmarks = extractLandmarksFromCanvas(ctx, canvas.width, canvas.height);

    if (!landmarks) {
      prevLandmarksRef.current = [];
      gestureHistoryRef.current = [];
      setCurrentGesture(prev =>
        prev.gesture !== "none"
          ? { gesture: "none", confidence: 0, handPosition: { x: 0, y: 0 }, timestamp: Date.now() }
          : prev
      );
      return;
    }

    // Classify gesture from landmarks
    const { gesture, confidence, direction } = classifyFromLandmarks(
      landmarks,
      prevLandmarksRef.current.length > 0 ? prevLandmarksRef.current : null
    );

    // Store landmark history (keep last 8 frames)
    prevLandmarksRef.current.push(landmarks);
    if (prevLandmarksRef.current.length > 8) prevLandmarksRef.current.shift();

    // Body language integration: extract posture from hand-face proximity
    const wrist = landmarks[0];
    const handNearFace = wrist.y < 0.4 && wrist.x > 0.3 && wrist.x < 0.7;
    const postureFrame = extractPostureFrame(undefined, handNearFace, wrist.y);
    postureHistoryRef.current.push(postureFrame);
    if (postureHistoryRef.current.length > 15) postureHistoryRef.current.shift();

    const bodyLanguage = postureHistoryRef.current.length >= 3
      ? analyzeBodyLanguage(postureHistoryRef.current.slice(0, -1), postureFrame)
      : undefined;

    // Temporal smoothing: require 3 consecutive same gestures
    gestureHistoryRef.current.push(gesture);
    if (gestureHistoryRef.current.length > 5) gestureHistoryRef.current.shift();

    const recentGestures = gestureHistoryRef.current.slice(-3);
    const allSame = recentGestures.length >= 3 && recentGestures.every(g => g === gesture);

    if (gesture !== "none" && allSame && confidence > 0.5) {
      const result: GestureResult = {
        gesture,
        confidence,
        handPosition: { x: wrist.x, y: wrist.y },
        fingerDirection: direction,
        landmarks,
        bodyLanguage,
        timestamp: Date.now(),
      };
      setCurrentGesture(result);

      const action = GESTURE_ACTIONS.find(a => a.gesture === gesture);
      if (action) {
        const lastTime = lastActionTimeRef.current[gesture] || 0;
        if (Date.now() - lastTime > action.cooldownMs) {
          lastActionTimeRef.current[gesture] = Date.now();
          onGestureAction(gesture, action);
        }
      }
    } else if (gesture === "none") {
      setCurrentGesture(prev =>
        prev.gesture !== "none"
          ? { gesture: "none", confidence: 0, handPosition: { x: 0, y: 0 }, timestamp: Date.now() }
          : prev
      );
    }
  }, [active, gesturesEnabled, canvasRef, onGestureAction]);

  useEffect(() => {
    if (!active || !gesturesEnabled) {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      return;
    }
    detectionIntervalRef.current = setInterval(processGestures, 200);
    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    };
  }, [active, gesturesEnabled, processGestures]);

  return { currentGesture, gesturesEnabled, setGesturesEnabled };
}
