/**
 * Real-Time Vision Engine — STUB (removed for performance)
 * Heavy MediaPipe real-time loop removed. Gemini handles vision on-demand.
 * Exports preserved as no-ops.
 */

export interface UnifiedDetection {
  label: string;
  confidence: number;
  bbox?: { x: number; y: number; width: number; height: number };
  source: string;
}

export interface RealTimeVisionResult {
  mpObjects: any[];
  yoloObjects: any[];
  faces: any[];
  faceLandmarks: any[];
  hands: any[];
  poses: any[];
  detections: UnifiedDetection[];
  gazeDirection?: string;
  gazeConfidence?: number;
  faceAttributes?: any;
  dominantEmotion?: string;
  sceneDescription?: string;
  timestamp: number;
  processingMs: number;
}

export async function detectRealTime(_video?: any): Promise<RealTimeVisionResult> {
  return {
    mpObjects: [], yoloObjects: [], faces: [], faceLandmarks: [],
    hands: [], poses: [], detections: [],
    timestamp: Date.now(), processingMs: 0,
  };
}

export async function preloadAllVision(): Promise<void> {}

export function formatDetectionsForAI(_result: RealTimeVisionResult): string {
  return "";
}
