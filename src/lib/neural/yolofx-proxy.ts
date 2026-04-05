/**
 * ═══ YOLOFrameX Proxy (Main Thread) ═══
 * Lightweight proxy that:
 *   1. Runs ML inference on main thread (MediaPipe + YOLO ONNX → WebGL required)
 *   2. Sends raw detections to Web Worker for CPU-bound post-processing
 *   3. Returns full MultiTaskResult with zero main-thread blocking on tracking/OCR/scene
 *
 * Usage: import { yoloFrameXProxy } from "./yolofx-proxy";
 *        const result = await yoloFrameXProxy.processFrame(video);
 */

import type { MultiTaskResult } from "./yolo-framex-types";
import { detectAllMP, isMediaPipeReady, type MPVisionResult } from "./mediapipe-vision";
import { detectWithYOLO, isYOLOReady, type YOLODetection } from "./yolo-onnx-detector";

type WorkerCallback = (result: MultiTaskResult) => void;

class YOLOFrameXProxy {
  private worker: Worker | null = null;
  private callbacks = new Map<number, WorkerCallback>();
  private nextId = 0;
  private workerReady = false;

  // Reusable canvas for pixel extraction (32x24 for lighting + OCR)
  private thumbCanvas: OffscreenCanvas | null = null;
  private thumbCtx: OffscreenCanvasRenderingContext2D | null = null;

  // Fallback: import the original engine for browsers without Worker support
  private fallbackEngine: any = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      this.worker = new Worker(
        new URL("./yolofx-worker.ts", import.meta.url),
        { type: "module" },
      );

      this.worker.onmessage = (e: MessageEvent) => {
        const { id, result, error } = e.data;
        const cb = this.callbacks.get(id);
        if (cb && result) cb(result);
        else if (error) console.warn("[YOLOFrameX Proxy] Worker error:", error);
        this.callbacks.delete(id);
      };

      this.worker.onerror = (err) => {
        console.warn("[YOLOFrameX Proxy] Worker creation failed, falling back to main thread:", err.message);
        this.worker = null;
        this.workerReady = false;
      };

      this.workerReady = true;
      console.log("[YOLOFrameX Proxy] ✅ Worker initialized — post-processing off main thread");
    } catch {
      console.warn("[YOLOFrameX Proxy] Worker not supported, using main thread fallback");
      this.workerReady = false;
    }
  }

  /**
   * Process a video frame through the multi-task pipeline.
   * ML inference (MediaPipe + YOLO) runs on main thread.
   * Post-processing (tracking, scene, OCR, movement) runs in Worker.
   */
  async processFrame(video: HTMLVideoElement): Promise<MultiTaskResult> {
    const now = Date.now();
    const isMobile = window.innerWidth < 768;

    // 1. Run ML inference on main thread (requires WebGL)
    const [mpResult, yoloResult] = await Promise.all([
      isMediaPipeReady()
        ? detectAllMP(video).catch(() => ({ objects: [], faces: [], faceLandmarks: [], hands: [], poses: [], timestamp: 0, inferenceMs: 0 } as MPVisionResult))
        : Promise.resolve({ objects: [], faces: [], faceLandmarks: [], hands: [], poses: [], timestamp: 0, inferenceMs: 0 } as MPVisionResult),
      isYOLOReady()
        ? detectWithYOLO(video).catch(() => [] as YOLODetection[])
        : Promise.resolve([] as YOLODetection[]),
    ]);

    // 2. Extract small thumbnail for lighting + OCR analysis
    let pixelData: Uint8ClampedArray | undefined;
    const thumbW = 64, thumbH = 48;
    try {
      if (!this.thumbCanvas) {
        this.thumbCanvas = new OffscreenCanvas(thumbW, thumbH);
        this.thumbCtx = this.thumbCanvas.getContext("2d", { alpha: false }) as OffscreenCanvasRenderingContext2D;
      }
      this.thumbCanvas.width = thumbW;
      this.thumbCanvas.height = thumbH;
      this.thumbCtx!.drawImage(video, 0, 0, thumbW, thumbH);
      pixelData = this.thumbCtx!.getImageData(0, 0, thumbW, thumbH).data;
    } catch {
      // Canvas extraction failed
    }

    // 3. Get emotion from global vision state
    const visionState = (globalThis as any).__orionVisionServiceState;
    const emotion = visionState?.emotion || "neutro";

    // 4. Flatten raw detections for transfer
    const rawObjects: Array<{ name: string; x: number; y: number; w: number; h: number; confidence: number; source: string }> = [];

    for (const y of yoloResult) {
      rawObjects.push({ name: y.name || "unknown", x: y.x, y: y.y, w: y.width, h: y.height, confidence: y.confidence, source: "yolo" });
    }
    for (const mp of mpResult.objects) {
      rawObjects.push({ name: mp.name, x: mp.x, y: mp.y, w: mp.width, h: mp.height, confidence: mp.confidence, source: "mp" });
    }

    const rawFaces = mpResult.faces.map(f => ({ x: f.x, y: f.y, w: f.width, h: f.height, confidence: f.confidence }));

    // 5. Send to worker (if available) or fallback
    if (this.workerReady && this.worker) {
      return this.processInWorker(rawObjects, rawFaces, mpResult.hands.length, emotion, video.videoWidth || 640, video.videoHeight || 480, pixelData, thumbW, thumbH, isMobile, now);
    }

    // Fallback: use original engine on main thread
    return this.processOnMainThread(video);
  }

  private processInWorker(
    rawObjects: any[],
    rawFaces: any[],
    rawHands: number,
    emotion: string,
    videoWidth: number,
    videoHeight: number,
    pixelData: Uint8ClampedArray | undefined,
    pixelW: number,
    pixelH: number,
    isMobile: boolean,
    timestamp: number,
  ): Promise<MultiTaskResult> {
    return new Promise((resolve) => {
      const id = this.nextId++;
      this.callbacks.set(id, resolve);

      const msg: any = {
        type: "process",
        id,
        timestamp,
        rawObjects,
        rawFaces,
        rawHands,
        emotion,
        videoWidth,
        videoHeight,
        pixelW,
        pixelH,
        isMobile,
      };

      // Transfer pixel data (zero-copy) if available
      const transferables: Transferable[] = [];
      if (pixelData) {
        msg.pixelData = pixelData;
        transferables.push(pixelData.buffer);
      }

      this.worker!.postMessage(msg, transferables);

      // Timeout fallback (5s)
      setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          console.warn("[YOLOFrameX Proxy] Worker timeout, returning empty result");
          resolve(this.emptyResult(timestamp, isMobile));
        }
      }, 5000);
    });
  }

  private async processOnMainThread(video: HTMLVideoElement): Promise<MultiTaskResult> {
    // Lazy-load original engine as fallback
    if (!this.fallbackEngine) {
      const mod = await import("./yolo-framex-engine");
      this.fallbackEngine = mod.yoloFrameX;
    }
    return this.fallbackEngine.processFrame(video);
  }

  private emptyResult(timestamp: number, isMobile: boolean): MultiTaskResult {
    return {
      scenario: { label: "outro", confidence: 0, lighting: "artificial", isIndoor: true },
      objects: [],
      faces: [],
      reading: { text: [], lipMovement: null, expression: "neutro", textRegions: [] },
      movement: { trackingIds: [], objectsInMotion: [], globalMotion: { intensity: 0, dominant: "parado" } },
      timestamp,
      adaptiveSize: isMobile ? 320 : 640,
      cacheHit: false,
      inferenceMs: 0,
      sources: { mediapipe: false, yolo: false, ocr: false },
    };
  }

  /** Format result for AI context (delegates to original engine) */
  async formatForAI(result: MultiTaskResult): Promise<string> {
    if (!this.fallbackEngine) {
      const mod = await import("./yolo-framex-engine");
      this.fallbackEngine = mod.yoloFrameX;
    }
    return this.fallbackEngine.formatForAI(result);
  }

  /** Reset state */
  reset() {
    this.callbacks.clear();
    this.nextId = 0;
    // Worker will auto-reset via fresh message sequence
  }

  /** Terminate worker */
  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.workerReady = false;
  }
}

// ─── Singleton ───
export const yoloFrameXProxy = new YOLOFrameXProxy();
