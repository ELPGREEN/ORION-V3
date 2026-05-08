import { LogManager, Logger } from '../core/log-manager';

export interface VisionPipelineConfig {
  geminiThrottleMs: number;
  mediapipeFrameskip: number;
  localProcessingFrameskip: number;
  supernetFrameskip: number;
  targetFps: number;
  enableWebGL: boolean;
  enableWorkers: boolean;
  maxResolution: number;
}

export const DEFAULT_VISION_CONFIG: VisionPipelineConfig = {
  geminiThrottleMs: 500,
  mediapipeFrameskip: 5,
  localProcessingFrameskip: 3,
  supernetFrameskip: 10,
  targetFps: 30,
  enableWebGL: false,
  enableWorkers: true,
  maxResolution: 240,
};

export interface VisionPerformanceMetrics {
  fps: number;
  frameProcessingMs: number;
  geminiLatencyMs: number;
  mediapipeLatencyMs: number;
  totalDetectionsPerSecond: number;
  droppedFrames: number;
  gpuUtilization: number;
}

export class RealTimeVisionOptimizer {
  private logger: Logger;
  private config: VisionPipelineConfig;
  metrics: VisionPerformanceMetrics;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private lastGeminiCall = 0;
  private lastMediaPipeCall = 0;

  constructor(config: Partial<VisionPipelineConfig> = {}) {
    this.logger = LogManager.getInstance().createLogger('RealTimeVisionOptimizer');
    this.config = { ...DEFAULT_VISION_CONFIG, ...config };
    this.metrics = { fps: 0, frameProcessingMs: 0, geminiLatencyMs: 0, mediapipeLatencyMs: 0, totalDetectionsPerSecond: 0, droppedFrames: 0, gpuUtilization: 0 };
  }

  shouldProcessGemini(now: number): boolean { return now - this.lastGeminiCall >= this.config.geminiThrottleMs; }
  shouldProcessMediaPipe(frameNum: number): boolean { return frameNum % this.config.mediapipeFrameskip === 0; }
  markGeminiProcessed(): void { this.lastGeminiCall = Date.now(); }
  markMediaPipeProcessed(): void { this.lastMediaPipeCall = Date.now(); }
  recordFrame(): number {
    this.frameCount++;
    const now = Date.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.metrics.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    return this.metrics.fps;
  }
}

export function optimizeVisionLoop(
  frameNum: number,
  video: HTMLVideoElement,
  callbacks: { onGeminiFrame?: (frame: string) => Promise<void>; onMediaPipeFrame?: (video: HTMLVideoElement) => void; },
  optimizer?: RealTimeVisionOptimizer
): void {
  const opt = optimizer || new RealTimeVisionOptimizer();
  const now = Date.now();
  opt.recordFrame();

  if (opt.shouldProcessGemini(now) && callbacks.onGeminiFrame) {
    const base64 = captureVideoFrameFast(video);
    if (base64) {
      callbacks.onGeminiFrame(base64).then(() => opt.markGeminiProcessed());
    }
  }

  if (opt.shouldProcessMediaPipe(frameNum) && callbacks.onMediaPipeFrame) {
    callbacks.onMediaPipeFrame(video);
    opt.markMediaPipeProcessed();
  }
}

function captureVideoFrameFast(video: HTMLVideoElement, maxWidth = 240, quality = 0.4): string {
  if (!video || video.readyState < 2) return '';
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, maxWidth / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality).split(',')[1];
}

async function analyzeFrameFast(imageBase64: string): Promise<unknown> {
  const { supabase } = await import('@/integrations/supabase/client');
  const saved = localStorage.getItem("orion_model_config");
  let model = "google/gemini-2.5-flash:free";
  if (saved) {
    try { const cfg = JSON.parse(saved); if (cfg.visionModel) model = `openrouter/${cfg.visionModel}`; } catch {}
  }

  const { data } = await supabase.functions.invoke('ai-orchestrator', {
    body: {
      imageBase64,
      prompt: 'FAST LIST: objects, faces. JSON: {objects:[], faces:[]}',
      preferredProvider: model,
      useCase: 'vision',
    },
  }).catch(() => ({ data: null }));
  return data;
}

export function createFastVisionPipeline(videoElement: HTMLVideoElement) {
  const optimizer = new RealTimeVisionOptimizer();
  let animId = 0;
  let frameNum = 0;
  let isRunning = false;

  const loop = () => {
    if (!isRunning) return;
    optimizeVisionLoop(frameNum, videoElement, {
      onGeminiFrame: async (base64) => {
        const start = Date.now();
        await analyzeFrameFast(base64);
        optimizer.metrics.geminiLatencyMs = Date.now() - start;
      },
      onMediaPipeFrame: () => {},
    }, optimizer);
    frameNum++;
    animId = requestAnimationFrame(loop);
  };

  return {
    start: () => { isRunning = true; loop(); },
    stop: () => { isRunning = false; cancelAnimationFrame(animId); },
    getMetrics: () => optimizer.metrics,
  };
}
