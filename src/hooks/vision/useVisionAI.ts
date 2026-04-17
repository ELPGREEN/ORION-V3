import { useRef, useCallback } from "react";
import { captureVideoFrame, analyzeFrame } from "@/lib/vision/gemini-vision";

export type RealTimeVisionResult = {
  allObjects: unknown[];
  faces: unknown[];
  hands: unknown[];
  poses: unknown[];
  detections: unknown[];
  timestamp: number;
  processingMs: number;
  status: "none" | "active";
};

const VISION_GEMINI_THROTTLE_MS = parseInt(import.meta.env.VITE_VISION_GEMINI_THROTTLE || '1000', 10);

export function useVisionAI() {
  const rtCache = useRef<{ lastCall: number; lastResult: RealTimeVisionResult | null }>({
    lastCall: 0,
    lastResult: null,
  });

  const detectRealTime = useCallback(async (video?: HTMLVideoElement): Promise<RealTimeVisionResult> => {
    const now = Date.now();
    if (now - rtCache.current.lastCall < VISION_GEMINI_THROTTLE_MS && rtCache.current.lastResult) {
      return rtCache.current.lastResult;
    }

    if (!video || video.readyState < 2) {
      return { allObjects: [], faces: [], hands: [], poses: [], detections: [], timestamp: now, processingMs: 0, status: "none" };
    }

    rtCache.current.lastCall = now;
    try {
      const base64 = captureVideoFrame(video, 320, 0.6);
      if (!base64) {
        return { allObjects: [], faces: [], hands: [], poses: [], detections: [], timestamp: now, processingMs: 0, status: "none" };
      }

      const result = await analyzeFrame(base64, "Liste TODOS os objetos, pessoas, rostos e elementos visíveis. Para cada item retorne: nome em português, confiança (0-1), e posição aproximada (x,y,largura,altura em 0-1). Responda em JSON: {objects:[{name,namePt,confidence,x,y,width,height,source}], faces:[{x,y,width,height,confidence}]}").catch(() => null);
      if (!result) {
        return { allObjects: [], faces: [], hands: [], poses: [], detections: [], timestamp: now, processingMs: 0, status: "none" };
      }

      let parsed: unknown = {};
      if (result.description) {
        const jsonMatch = result.description.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch (e) { console.warn("JSON parse failed", e); }
        }
      }

      const objects = (parsed.objects || result.objects || []).map((o: unknown) => ({
        ...o,
        source: "gemini",
      }));

      const rtResult: RealTimeVisionResult = {
        allObjects: objects,
        faces: parsed.faces || [],
        hands: [],
        poses: [],
        detections: objects,
        timestamp: now,
        processingMs: Date.now() - now,
        status: objects.length > 0 ? "active" : "none",
      };
      rtCache.current.lastResult = rtResult;
      return rtResult;
    } catch (e) {
      console.warn("[detectRealTime] Gemini vision failed:", e);
      return { allObjects: [], faces: [], hands: [], poses: [], detections: [], timestamp: now, processingMs: 0, status: "none" };
    }
  }, []);

  return { detectRealTime };
}
