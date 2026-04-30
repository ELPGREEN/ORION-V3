import { OrbState } from "./orb-state";
import { VoiceState } from "./voice-state-shared";

export interface Region {
  label: string;
  category: string;
  confidence: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
  avgR: number;
  avgG: number;
  avgB: number;
  edgeDensity: number;
}

export interface MotionData {
  intensity: number;
  direction: string;
  zones: boolean[];
  vectors: { x: number; y: number; magnitude: number }[];
}

export interface ShapeDescriptor {
  type: string;
  confidence: number;
  path?: string;
}

export type SceneContext = { label: string; confidence: number; lighting: string };
export type YOLOClassification = { label: string; confidence: number; bbox: number[] };
export type TextRegion = { x: number; y: number; w: number; h: number; confidence: number };
export type KMeansResult = { clusters: { r: number; g: number; b: number; count: number }[]; k: number };
export type ImageQuality = { sharpness: number; exposure: number; overall: number };

// ═══ Global shared store ═══
export const VS = {
  regions: [] as Region[],
  motion: { intensity: 0, direction: "●", zones: Array(9).fill(false), vectors: [] } as MotionData,
  shapeDescriptors: [] as ShapeDescriptor[],
  sceneContext: null as SceneContext | null,
  yoloClassifications: [] as YOLOClassification[],
  textRegions: [] as TextRegion[],
  otsuThresholdValue: 0,
  kmeansResult: null as KMeansResult | null,
  imageQuality: null as ImageQuality | null,
  /** Real-time vision result (stub — ML engines removed) */
  realTimeVision: null as any,
  get active() { return OrbState.active; },
  set active(v: boolean) { OrbState.active = v; },
  get awareness() { return OrbState.awareness; },
  set awareness(v: number) { OrbState.awareness = v; },
  frames: 0,
  debugLog: [] as string[],
  supernetConnected: false,
  supernetLatency: 0,
  supernetAnalysis: "" as string,
  get aiResponding() { return VoiceState.aiResponding; },
  set aiResponding(v: boolean) { VoiceState.aiResponding = v; OrbState.aiResponding = v; },
  get regions_sync() { return OrbState.regions; },
  set regions_sync(v: any[]) { OrbState.regions = v; },
};

export function vsLog(msg: string) {
  VS.debugLog = [...VS.debugLog.slice(-29), `[${new Date().toLocaleTimeString("pt-BR")}] ${msg}`];
}
