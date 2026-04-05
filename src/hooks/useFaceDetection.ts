/**
 * useFaceDetection — Real-time face detection with 4-tier fallback
 * Tier 0: face-api.js (68 landmarks, 128d descriptor, expressions, age, gender) ★ BEST
 * Tier 1: BlazeFace (TF.js, GPU-accelerated, 6 landmarks)
 * Tier 2: Browser FaceDetector API (Chrome/Edge only)
 * Tier 3: Skin-tone + Sobel edge detection + HOG confirmation (universal fallback)
 */
import { useRef, useCallback, useState, useEffect } from "react";
import { getBlazeFaceModel, getTFMetrics } from "@/lib/neural/tf-runtime";
import {
  loadFaceApiModels,
  detectSingleFaceFull,
  detectAllFacesFull,
  getFaceApiMetrics,
  type FaceApiDetection,
} from "@/lib/neural/face-api-runtime";

export interface DetectedFace {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  landmarks?: { type: string; x: number; y: number }[];
  nx: number;
  ny: number;
  nw: number;
  nh: number;
  /** Full face-api.js detection data (Tier 0 only) */
  faceApiData?: FaceApiDetection;
}

interface FaceDetectionState {
  faces: DetectedFace[];
  isSupported: boolean;
  isActive: boolean;
  lastDetectionMs: number;
  detectionTier: "faceapi" | "blazeface" | "native" | "fallback" | "none";
  /** Full face-api.js result for the primary face */
  faceApiDetection?: FaceApiDetection | null;
}

function hasFaceDetectorAPI(): boolean {
  return typeof (window as any).FaceDetector === "function";
}

// ─── Tier 0: face-api.js Full Pipeline ───
async function detectWithFaceApi(
  source: HTMLVideoElement | HTMLCanvasElement,
  w: number,
  h: number
): Promise<{ faces: DetectedFace[]; raw: FaceApiDetection[] } | null> {
  try {
    const loaded = await loadFaceApiModels();
    if (!loaded) return null;

    const results = await detectAllFacesFull(source);
    if (!results || results.length === 0) return { faces: [], raw: [] };

    const faces: DetectedFace[] = results.map((r) => {
      // Map 68 landmarks to typed landmark array
      const landmarks: { type: string; x: number; y: number }[] = [];

      if (r.landmarks.length >= 68) {
        // Key facial landmarks from 68-point model
        // Jaw: 0-16, Right brow: 17-21, Left brow: 22-26
        // Nose: 27-35, Right eye: 36-41, Left eye: 42-47, Mouth: 48-67

        // Eyes (centers)
        const rEyeX = (r.landmarks[36].x + r.landmarks[39].x) / 2;
        const rEyeY = (r.landmarks[36].y + r.landmarks[39].y) / 2;
        const lEyeX = (r.landmarks[42].x + r.landmarks[45].x) / 2;
        const lEyeY = (r.landmarks[42].y + r.landmarks[45].y) / 2;
        landmarks.push(
          { type: "eye_right", x: rEyeX, y: rEyeY },
          { type: "eye_left", x: lEyeX, y: lEyeY }
        );

        // Nose tip
        landmarks.push({ type: "nose", x: r.landmarks[30].x, y: r.landmarks[30].y });

        // Mouth corners
        landmarks.push(
          { type: "mouth_left", x: r.landmarks[48].x, y: r.landmarks[48].y },
          { type: "mouth_right", x: r.landmarks[54].x, y: r.landmarks[54].y }
        );

        // Mouth center (upper + lower lip midpoints)
        const mouthCenterX = (r.landmarks[51].x + r.landmarks[57].x) / 2;
        const mouthCenterY = (r.landmarks[51].y + r.landmarks[57].y) / 2;
        landmarks.push({ type: "mouth_center", x: mouthCenterX, y: mouthCenterY });

        // Jaw chin
        landmarks.push({ type: "chin", x: r.landmarks[8].x, y: r.landmarks[8].y });

        // Eyebrow midpoints
        landmarks.push(
          { type: "brow_right", x: r.landmarks[19].x, y: r.landmarks[19].y },
          { type: "brow_left", x: r.landmarks[24].x, y: r.landmarks[24].y }
        );

        // All 68 as raw points
        r.landmarks.forEach((pt, idx) => {
          landmarks.push({ type: `point_${idx}`, x: pt.x, y: pt.y });
        });
      } else {
        // Fewer landmarks — add what we have
        r.landmarks.forEach((pt, idx) => {
          landmarks.push({ type: `point_${idx}`, x: pt.x, y: pt.y });
        });
      }

      return {
        x: r.box.x,
        y: r.box.y,
        width: r.box.width,
        height: r.box.height,
        confidence: r.score,
        landmarks,
        nx: (r.box.x / w) * 2 - 1,
        ny: -((r.box.y / h) * 2 - 1),
        nw: (r.box.width / w) * 2,
        nh: (r.box.height / h) * 2,
        faceApiData: r,
      };
    });

    return { faces, raw: results };
  } catch {
    return null;
  }
}

// ─── Tier 1: BlazeFace Detection ───
async function detectWithBlazeFace(
  source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
  w: number,
  h: number
): Promise<DetectedFace[] | null> {
  try {
    const model = await getBlazeFaceModel();
    if (!model) return null;

    const predictions = await model.estimateFaces(source, false);
    if (!predictions || predictions.length === 0) return [];

    return predictions.map((pred: any) => {
      const start = pred.topLeft as [number, number];
      const end = pred.bottomRight as [number, number];
      const fx = start[0];
      const fy = start[1];
      const fw = end[0] - start[0];
      const fh = end[1] - start[1];
      const probability = pred.probability?.[0] ?? pred.probability ?? 0.9;

      const landmarks: { type: string; x: number; y: number }[] = [];
      if (pred.landmarks && pred.landmarks.length >= 6) {
        const lm = pred.landmarks;
        landmarks.push(
          { type: "eye_right", x: lm[0][0], y: lm[0][1] },
          { type: "eye_left", x: lm[1][0], y: lm[1][1] },
          { type: "nose", x: lm[2][0], y: lm[2][1] },
          { type: "mouth_center", x: lm[3][0], y: lm[3][1] },
          { type: "ear_right", x: lm[4][0], y: lm[4][1] },
          { type: "ear_left", x: lm[5][0], y: lm[5][1] },
        );
      }

      return {
        x: fx, y: fy, width: fw, height: fh,
        confidence: typeof probability === "number" ? probability : 0.9,
        landmarks,
        nx: (fx / w) * 2 - 1,
        ny: -((fy / h) * 2 - 1),
        nw: (fw / w) * 2,
        nh: (fh / h) * 2,
      };
    });
  } catch {
    return null;
  }
}

// ─── Tier 3: Sobel + HOG Fallback ───
import { detectFacesFallbackFromImageData } from "@/lib/neural/face-detection-fallback";

export function useFaceDetection() {
  const detectorRef = useRef<any>(null);
  const [state, setState] = useState<FaceDetectionState>({
    faces: [],
    isSupported: false,
    isActive: false,
    lastDetectionMs: 0,
    detectionTier: "none",
  });
  const lastRunRef = useRef(0);
  const faceApiReadyRef = useRef(false);
  const blazeReadyRef = useRef(false);

  useEffect(() => {
    // Pre-warm models in priority order
    loadFaceApiModels().then((ok) => {
      faceApiReadyRef.current = ok;
      if (ok) setState((s) => ({ ...s, isSupported: true }));
    });
    getBlazeFaceModel().then((m) => {
      blazeReadyRef.current = !!m;
    });

    const supported = hasFaceDetectorAPI();
    setState((s) => ({ ...s, isSupported: supported || blazeReadyRef.current }));
    if (supported) {
      try {
        detectorRef.current = new (window as any).FaceDetector({
          fastMode: true,
          maxDetectedFaces: 5,
        });
      } catch {
        setState((s) => ({ ...s, isSupported: blazeReadyRef.current }));
      }
    }
    return () => {
      detectorRef.current = null;
    };
  }, []);

  // Main detection function — 4-tier fallback (Tier 0 → 1 → 2 → 3)
  const detectFaces = useCallback(
    async (
      source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
      ctx?: CanvasRenderingContext2D,
      w?: number,
      h?: number
    ): Promise<DetectedFace[]> => {
      const now = performance.now();
      if (now - lastRunRef.current < 120) return state.faces;
      lastRunRef.current = now;

      const start = performance.now();
      const sw = (source as any).videoWidth || (source as any).width || w || 320;
      const sh = (source as any).videoHeight || (source as any).height || h || 240;
      let faces: DetectedFace[] = [];
      let tier: FaceDetectionState["detectionTier"] = "none";
      let faceApiResult: FaceApiDetection | null = null;

      // ★ Tier 0: face-api.js (68 landmarks, expressions, descriptor)
      if (source instanceof HTMLVideoElement || source instanceof HTMLCanvasElement) {
        const faceApiOutput = await detectWithFaceApi(source, sw, sh);
        if (faceApiOutput !== null && faceApiOutput.faces.length > 0) {
          faces = faceApiOutput.faces;
          tier = "faceapi";
          faceApiResult = faceApiOutput.raw[0] || null;
        }
      }

      // Tier 1: BlazeFace (TF.js)
      if (faces.length === 0) {
        const blazeResult = await detectWithBlazeFace(source, sw, sh);
        if (blazeResult !== null && blazeResult.length > 0) {
          faces = blazeResult;
          tier = "blazeface";
        }
      }

      // Tier 2: Browser FaceDetector API
      if (faces.length === 0 && detectorRef.current) {
        try {
          const detected = await detectorRef.current.detect(source);
          faces = detected.map((d: any) => {
            const bb = d.boundingBox;
            const landmarks = (d.landmarks || []).map((lm: any) => ({
              type: lm.type,
              x: lm.locations?.[0]?.x || bb.x + bb.width / 2,
              y: lm.locations?.[0]?.y || bb.y + bb.height / 2,
            }));
            return {
              x: bb.x,
              y: bb.y,
              width: bb.width,
              height: bb.height,
              confidence: 0.92,
              nx: (bb.x / sw) * 2 - 1,
              ny: -((bb.y / sh) * 2 - 1),
              nw: (bb.width / sw) * 2,
              nh: (bb.height / sh) * 2,
              landmarks,
            };
          });
          if (faces.length > 0) tier = "native";
        } catch {
          // fall through to tier 3
        }
      }

      // Tier 3: Heuristic fallback (skin-tone + Sobel + HOG)
      if (faces.length === 0 && ctx && w && h) {
        faces = detectFacesFallbackFromImageData(ctx, w, h);
        if (faces.length > 0) tier = "fallback";
      }

      const elapsed = performance.now() - start;
      setState({
        faces,
        isSupported: true,
        isActive: true,
        lastDetectionMs: Math.round(elapsed),
        detectionTier: tier,
        faceApiDetection: faceApiResult,
      });

      return faces;
    },
    [state.faces]
  );

  return { ...state, detectFaces, tfMetrics: getTFMetrics() };
}
