/**
 * Quality Presets — inspired by Vita Recorder's qual_val[] system.
 * Controls resolution, FPS, JPEG quality, and TTS engine globally.
 */

export type QualityLevel = 'best' | 'high' | 'default' | 'low' | 'worst';
export type TTSEngine = 'elevenlabs' | 'jarvis' | 'piper' | 'browser';

export interface QualityPreset {
  level: QualityLevel;
  label: string;
  resolution: { width: number; height: number };
  fpsCap: number;
  frameIntervalMs: number;
  jpegQuality: number;
  ttsEngine: TTSEngine;
  videoBitrate: number; // bps for screen recording
  frameSkip: number; // 0 = no skip, 4 = skip 4 of every 5 frames
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  best: {
    level: 'best',
    label: 'Máxima',
    resolution: { width: 640, height: 480 },
    fpsCap: 30,
    frameIntervalMs: 33,
    jpegQuality: 0.9,
    ttsEngine: 'elevenlabs',
    videoBitrate: 4_000_000,
    frameSkip: 0,
  },
  high: {
    level: 'high',
    label: 'Alta',
    resolution: { width: 480, height: 360 },
    fpsCap: 15,
    frameIntervalMs: 67,
    jpegQuality: 0.8,
    ttsEngine: 'jarvis',
    videoBitrate: 2_500_000,
    frameSkip: 1,
  },
  default: {
    level: 'default',
    label: 'Padrão',
    resolution: { width: 320, height: 240 },
    fpsCap: 10,
    frameIntervalMs: 100,
    jpegQuality: 0.7,
    ttsEngine: 'piper',
    videoBitrate: 1_500_000,
    frameSkip: 2,
  },
  low: {
    level: 'low',
    label: 'Baixa',
    resolution: { width: 240, height: 180 },
    fpsCap: 5,
    frameIntervalMs: 200,
    jpegQuality: 0.5,
    ttsEngine: 'piper',
    videoBitrate: 800_000,
    frameSkip: 3,
  },
  worst: {
    level: 'worst',
    label: 'Mínima',
    resolution: { width: 160, height: 120 },
    fpsCap: 3,
    frameIntervalMs: 333,
    jpegQuality: 0.3,
    ttsEngine: 'browser',
    videoBitrate: 400_000,
    frameSkip: 4,
  },
};

const QUALITY_STORAGE_KEY = 'orion_quality_level';

/** Detect hardware tier based on available resources */
export function detectHardwareTier(): QualityLevel {
  try {
    const cores = navigator.hardwareConcurrency || 2;
    const memGB = (navigator as any).deviceMemory || 4;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    if (isMobile && memGB <= 2) return 'worst';
    if (isMobile) return 'low';
    if (cores >= 8 && memGB >= 8) return 'best';
    if (cores >= 4 && memGB >= 4) return 'high';
    return 'default';
  } catch {
    return 'default';
  }
}

/** Get saved quality level or auto-detect */
export function getQualityLevel(): QualityLevel {
  const saved = localStorage.getItem(QUALITY_STORAGE_KEY) as QualityLevel | null;
  if (saved && saved in QUALITY_PRESETS) return saved;
  return detectHardwareTier();
}

/** Save quality level preference */
export function setQualityLevel(level: QualityLevel): void {
  localStorage.setItem(QUALITY_STORAGE_KEY, level);
}

/** Get current quality preset config */
export function getQualityPreset(): QualityPreset {
  return QUALITY_PRESETS[getQualityLevel()];
}

/** Downscale a canvas to the target resolution (mutates a temp canvas) */
export function downscaleCanvas(
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  if (source.width <= targetWidth && source.height <= targetHeight) return source;

  const temp = document.createElement('canvas');
  temp.width = targetWidth;
  temp.height = targetHeight;
  const ctx = temp.getContext('2d');
  if (!ctx) return source;

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return temp;
}
