/**
 * MediaPipe Vision — STUB (removed for performance)
 * All detection now handled by Gemini on-demand.
 * Exports preserved as no-ops to avoid breaking imports.
 */

export interface MPDetectedObject { label: string; confidence: number; bbox: { x: number; y: number; w: number; h: number } }
export interface MPFace { bbox: { x: number; y: number; w: number; h: number }; confidence: number }
export interface MPFaceLandmarks { landmarks: any[] }
export interface MPHand { landmarks: any[]; handedness: string }
export interface MPPose { landmarks: any[]; worldLandmarks: any[] }
export interface MPVisionResult {
  objects: MPDetectedObject[];
  faces: MPFace[];
  faceLandmarks: MPFaceLandmarks[];
  hands: MPHand[];
  poses: MPPose[];
  timestamp: number;
}

export async function detectObjects(): Promise<MPDetectedObject[]> { return []; }
export async function detectFacesMP(): Promise<MPFace[]> { return []; }
export async function detectFaceLandmarks(): Promise<MPFaceLandmarks[]> { return []; }
export async function detectHands(): Promise<MPHand[]> { return []; }
export async function detectPose(): Promise<MPPose[]> { return []; }
export async function detectAllMP(_video?: any): Promise<MPVisionResult> {
  return { objects: [], faces: [], faceLandmarks: [], hands: [], poses: [], timestamp: Date.now() };
}
export function isMediaPipeReady(): boolean { return false; }
export function preloadMediaPipe(): Promise<void> { return Promise.resolve(); }
export function getMediaPipeStatus() { return { ready: false, modelsLoaded: 0 }; }
