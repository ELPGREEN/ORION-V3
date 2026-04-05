/**
 * useFaceDetection — Real-time face detection with 4-tier fallback
 * Tier 0: face-api.js (68 landmarks, 128d descriptor, expressions)
 * Tier 1: BlazeFace (TF.js, GPU-accelerated)
 * Tier 2: Browser FaceDetector API (Chrome/Edge)
 * Tier 3: Skin-tone + Sobel edge detection + HOG confirmation
 */
import { useRef, useCallback, useState, useEffect } from "react";
import { getBlazeFaceModel, getTFMetrics } from "@/lib/neural/tf-runtime";
import { loadFaceApiModels, detectSingleFaceFull, getFaceApiMetrics, type FaceApiDetection } from "@/lib/neural/face-api-runtime";

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
}

interface FaceDetectionState {
  faces: DetectedFace[];
  isSupported: boolean;
  isActive: boolean;
  lastDetectionMs: number;
  detectionTier: "faceapi" | "blazeface" | "native" | "fallback" | "none";
  faceApiDetection?: FaceApiDetection | null;
}

function hasFaceDetectorAPI(): boolean {
  return typeof (window as any).FaceDetector === "function";
}

// ─── Tier 1: BlazeFace Detection ───
async function detectWithBlazeFace(
  source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
  w: number, h: number
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

      // Extract landmarks from BlazeFace (6 points: eyes, ears, nose, mouth)
      const landmarks: { type: string; x: number; y: number }[] = [];
      if (pred.landmarks && pred.landmarks.length >= 6) {
        const lm = pred.landmarks;
        landmarks.push(
          { type: "eye", x: lm[0][0], y: lm[0][1] },
          { type: "eye", x: lm[1][0], y: lm[1][1] },
          { type: "nose", x: lm[2][0], y: lm[2][1] },
          { type: "mouth", x: lm[3][0], y: lm[3][1] },
          { type: "ear", x: lm[4][0], y: lm[4][1] },
          { type: "ear", x: lm[5][0], y: lm[5][1] },
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
import { sobelEdgeMagnitude, computeHOGScore, detectFacesFallbackFromImageData } from "@/lib/neural/face-detection-fallback";

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
  const blazeReadyRef = useRef(false);

  useEffect(() => {
    // Pre-warm models
    getBlazeFaceModel().then(m => { blazeReadyRef.current = !!m; });
    loadFaceApiModels().then(() => {});

    const supported = hasFaceDetectorAPI();
    setState(s => ({ ...s, isSupported: supported || blazeReadyRef.current }));
    if (supported) {
      try {
        detectorRef.current = new (window as any).FaceDetector({
          fastMode: true,
          maxDetectedFaces: 5,
        });
      } catch {
        setState(s => ({ ...s, isSupported: blazeReadyRef.current }));
      }
    }
    return () => { detectorRef.current = null; };
  }, []);

  // Main detection function — 3-tier fallback
  const detectFaces = useCallback(async (
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

    // Tier 1: BlazeFace (TF.js)
    const blazeResult = await detectWithBlazeFace(source, sw, sh);
    if (blazeResult !== null && blazeResult.length > 0) {
      faces = blazeResult;
      tier = "blazeface";
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
            x: bb.x, y: bb.y, width: bb.width, height: bb.height,
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
    });

    return faces;
  }, [state.faces]);

  return { ...state, detectFaces, tfMetrics: getTFMetrics() };
}
