/**
 * Vision Inference Worker Manager
 * Offloads heavy ONNX/MediaPipe inference to a Web Worker via OffscreenCanvas.
 * Falls back to main-thread processing when Workers or OffscreenCanvas are unavailable.
 */

export interface WorkerInferenceRequest {
  type: 'yolo' | 'depth' | 'ocr';
  imageData: ImageData;
  options?: Record<string, unknown>;
}

export interface WorkerInferenceResult {
  type: string;
  data: unknown;
  inferenceMs: number;
  worker: boolean;
}

// ─── Capability Detection ───

let _supportsOffscreen: boolean | null = null;

export function supportsOffscreenCanvas(): boolean {
  if (_supportsOffscreen !== null) return _supportsOffscreen;
  try {
    const c = document.createElement('canvas');
    _supportsOffscreen = typeof c.transferControlToOffscreen === 'function'
      && typeof Worker !== 'undefined';
  } catch {
    _supportsOffscreen = false;
  }
  return _supportsOffscreen;
}

// ─── Worker Pool ───

interface WorkerHandle {
  worker: Worker;
  busy: boolean;
}

const MAX_WORKERS = Math.min(navigator.hardwareConcurrency ?? 2, 4);
const pool: WorkerHandle[] = [];
const pendingQueue: Array<{
  request: WorkerInferenceRequest;
  resolve: (r: WorkerInferenceResult) => void;
  reject: (e: Error) => void;
}> = [];

/**
 * Create the inline worker script as a Blob URL.
 * The worker receives ImageData and runs lightweight preprocessing.
 * Heavy model inference (ONNX) still requires main-thread model handles
 * but preprocessing (resize, normalize, edge detection) runs off-thread.
 */
function createWorkerBlob(): string {
  const code = `
    self.onmessage = function(e) {
      const { type, imageData, options, id } = e.data;
      const start = performance.now();
      let result = null;

      try {
        if (type === 'preprocess') {
          // Resize and normalize image data for inference
          const { data, width, height } = imageData;
          const targetSize = options?.targetSize || 256;
          
          // Simple bilinear downscale
          const scaleX = width / targetSize;
          const scaleY = height / targetSize;
          const out = new Float32Array(targetSize * targetSize * 3);
          
          for (let y = 0; y < targetSize; y++) {
            for (let x = 0; x < targetSize; x++) {
              const srcX = Math.floor(x * scaleX);
              const srcY = Math.floor(y * scaleY);
              const srcIdx = (srcY * width + srcX) * 4;
              const dstIdx = (y * targetSize + x) * 3;
              out[dstIdx] = data[srcIdx] / 255.0;
              out[dstIdx + 1] = data[srcIdx + 1] / 255.0;
              out[dstIdx + 2] = data[srcIdx + 2] / 255.0;
            }
          }
          
          result = { normalized: out, width: targetSize, height: targetSize };
        }
        
        if (type === 'edge_density') {
          // Fast edge density check for adaptive OCR
          const { data, width, height } = imageData;
          let edgeCount = 0;
          const threshold = 35;
          
          for (let y = 0; y < height; y += 2) {
            for (let x = 1; x < width; x += 2) {
              const idx = (y * width + x) * 4;
              const idxPrev = (y * width + x - 1) * 4;
              const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
              const grayPrev = (data[idxPrev] + data[idxPrev + 1] + data[idxPrev + 2]) / 3;
              if (Math.abs(gray - grayPrev) > threshold) edgeCount++;
            }
          }
          
          const density = edgeCount / ((width * height) / 4);
          result = { density, hasText: density > 0.12 };
        }

        if (type === 'depth_normalize') {
          // Normalize raw depth map off-thread
          const rawData = imageData.data;
          const depthMap = new Float32Array(rawData.length / 4);
          let min = Infinity, max = -Infinity;
          
          for (let i = 0; i < depthMap.length; i++) {
            const val = rawData[i * 4]; // Use red channel
            if (val < min) min = val;
            if (val > max) max = val;
            depthMap[i] = val;
          }
          
          const range = max - min || 1;
          for (let i = 0; i < depthMap.length; i++) {
            depthMap[i] = (depthMap[i] - min) / range;
          }
          
          result = { depthMap, min, max };
        }
      } catch (err) {
        self.postMessage({ id, error: err.message, inferenceMs: performance.now() - start, worker: true });
        return;
      }

      self.postMessage(
        { id, type, data: result, inferenceMs: performance.now() - start, worker: true },
        result?.normalized ? [result.normalized.buffer] : 
        result?.depthMap ? [result.depthMap.buffer] : []
      );
    };
  `;
  return URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
}

let workerBlobUrl: string | null = null;

function getOrCreateWorker(): WorkerHandle | null {
  if (!supportsOffscreenCanvas()) return null;
  
  // Find idle worker
  const idle = pool.find(w => !w.busy);
  if (idle) return idle;
  
  // Create new worker if under limit
  if (pool.length < MAX_WORKERS) {
    if (!workerBlobUrl) workerBlobUrl = createWorkerBlob();
    try {
      const handle: WorkerHandle = {
        worker: new Worker(workerBlobUrl),
        busy: false,
      };
      pool.push(handle);
      return handle;
    } catch {
      return null;
    }
  }
  
  return null; // All busy, will queue
}

let requestId = 0;

/**
 * Run preprocessing task in a Web Worker.
 * Falls back to returning null if workers unavailable.
 */
export function runInWorker(
  type: string,
  imageData: ImageData,
  options?: Record<string, unknown>
): Promise<WorkerInferenceResult | null> {
  const handle = getOrCreateWorker();
  if (!handle) return Promise.resolve(null);

  return new Promise((resolve) => {
    const id = ++requestId;
    handle.busy = true;

    const timeout = setTimeout(() => {
      handle.busy = false;
      resolve(null);
    }, 2000);

    handle.worker.onmessage = (e) => {
      if (e.data.id !== id) return;
      clearTimeout(timeout);
      handle.busy = false;
      
      if (e.data.error) {
        resolve(null);
      } else {
        resolve({
          type: e.data.type,
          data: e.data.data,
          inferenceMs: e.data.inferenceMs,
          worker: true,
        });
      }

      // Process queue
      if (pendingQueue.length > 0) {
        const next = pendingQueue.shift()!;
        runInWorker(next.request.type, next.request.imageData, next.request.options)
          .then(r => next.resolve(r as WorkerInferenceResult))
          .catch(next.reject);
      }
    };

    handle.worker.postMessage({ id, type, imageData, options });
  });
}

/**
 * Check edge density for text presence using a Web Worker.
 * Returns null if workers unavailable (caller should fallback).
 */
export async function checkEdgeDensityInWorker(
  video: HTMLVideoElement
): Promise<{ density: number; hasText: boolean } | null> {
  const c = document.createElement('canvas');
  const size = 64;
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(video, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);

  const result = await runInWorker('edge_density', imageData);
  return result?.data as { density: number; hasText: boolean } | null;
}

/**
 * Preprocess an image for ONNX inference in a Web Worker.
 */
export async function preprocessInWorker(
  video: HTMLVideoElement,
  targetSize = 256
): Promise<{ normalized: Float32Array; width: number; height: number } | null> {
  const c = document.createElement('canvas');
  const scale = Math.min(targetSize / video.videoWidth, targetSize / video.videoHeight, 1);
  c.width = Math.round(video.videoWidth * scale);
  c.height = Math.round(video.videoHeight * scale);
  const ctx = c.getContext('2d')!;
  ctx.drawImage(video, 0, 0, c.width, c.height);
  const imageData = ctx.getImageData(0, 0, c.width, c.height);

  const result = await runInWorker('preprocess', imageData, { targetSize });
  return result?.data as { normalized: Float32Array; width: number; height: number } | null;
}

/**
 * Terminate all workers and release resources.
 */
export function terminateVisionWorkers(): void {
  for (const h of pool) {
    h.worker.terminate();
  }
  pool.length = 0;
  pendingQueue.length = 0;
  if (workerBlobUrl) {
    URL.revokeObjectURL(workerBlobUrl);
    workerBlobUrl = null;
  }
}

/**
 * Get worker pool stats for monitoring.
 */
export function getWorkerPoolStats() {
  return {
    supported: supportsOffscreenCanvas(),
    poolSize: pool.length,
    maxWorkers: MAX_WORKERS,
    busyWorkers: pool.filter(w => w.busy).length,
    queueLength: pendingQueue.length,
  };
}
