/**
 * ─── TensorFlow.js Runtime Singleton (LiteRT-Enhanced) ───
 * 
 * Manages TF.js backend initialization and BlazeFace model loading.
 * Now integrated with LiteRT CompiledModel API for:
 *   - Automatic hardware selection (WebGPU > WebGL > WASM > CPU)
 *   - TensorBuffer pool for zero-copy buffer reuse
 *   - Async execution queue
 *   - Inference profiling
 * 
 * Ref: Google AI Edge LiteRT — CompiledModel API (2026)
 *      TensorFlow.js (Google, Apache 2.0)
 *      BlazeFace: Bazarevsky et al. (2019)
 */

import type * as TF from "@tensorflow/tfjs";
import {
  CompiledModel,
  getCompiledModel,
  getExistingModel,
  getLiteRTState,
  probeHardwareCapabilities,
  type AcceleratorType,
  type CompiledModelMetrics,
  type HardwareCapability,
  type LiteRTState,
} from "./litert-compiled-model";

let _tf: typeof TF | null = null;
let _blazeModel: any = null;
let _backendName = "none";
let _loading = false;
let _modelLoading = false;
let _initTime = 0;
let _liteRTCompiled = false;
let _hwCapabilities: HardwareCapability[] = [];

/** Lazy-load TensorFlow.js core with LiteRT auto hardware selection */
export async function ensureTF(): Promise<typeof TF | null> {
  if (_tf) return _tf;
  if (_loading) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (_tf || !_loading) { clearInterval(check); resolve(_tf); }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(null); }, 8000);
    });
  }

  _loading = true;
  const start = performance.now();

  try {
    // Phase 1: Probe hardware (LiteRT pattern)
    _hwCapabilities = await probeHardwareCapabilities();
    const bestAccelerator = _hwCapabilities.find(h => h.available)?.accelerator ?? "cpu";

    const tf = await import("@tensorflow/tfjs");

    // Phase 2: Initialize with LiteRT-selected backend
    const backendOrder: Record<AcceleratorType, string[]> = {
      webgpu: ["webgpu", "webgl", "cpu"],
      webgl: ["webgl", "cpu"],
      wasm: ["wasm", "cpu"],
      cpu: ["cpu"],
    };

    let initialized = false;
    for (const backend of backendOrder[bestAccelerator]) {
      try {
        await tf.setBackend(backend);
        await tf.ready();
        _backendName = backend;
        initialized = true;
        break;
      } catch { /* try next */ }
    }

    if (!initialized) {
      _loading = false;
      console.warn("[tf-runtime] Failed to initialize any backend");
      return null;
    }

    // Phase 3: Apply LiteRT optimizations
    tf.env().set("WEBGL_DELETE_TEXTURE_THRESHOLD", 0);
    tf.env().set("WEBGL_FLUSH_THRESHOLD", 1);
    if (_backendName === "webgl") {
      try { tf.env().set("WEBGL_FORCE_F16_TEXTURES", true); } catch {}
    }

    _tf = tf;
    _initTime = Math.round(performance.now() - start);
    console.log(`[tf-runtime] LiteRT Backend: ${_backendName} (${_initTime}ms) | HW: ${_hwCapabilities.map(h => `${h.accelerator}:${h.available ? "✓" : "✗"}`).join(", ")}`);
    return _tf;
  } catch (err) {
    console.warn("[tf-runtime] TF.js import failed:", err);
    _loading = false;
    return null;
  }
}

/** Get or compile a LiteRT CompiledModel for face detection */
export async function getCompiledFaceModel(): Promise<CompiledModel | null> {
  const existing = getExistingModel("blazeface-litert");
  if (existing) return existing;

  try {
    const model = await getCompiledModel({
      modelId: "blazeface-litert",
      inputShapes: [[128, 128, 3]],
      enableAsyncExecution: true,
      enableProfiling: true,
      quantization: "float16",
    });
    return model;
  } catch (err) {
    console.warn("[tf-runtime] LiteRT face model compilation failed:", err);
    return null;
  }
}

/** Get or compile a LiteRT CompiledModel for vision processing */
export async function getCompiledVisionModel(): Promise<CompiledModel | null> {
  const existing = getExistingModel("vision-pipeline-litert");
  if (existing) return existing;

  try {
    const model = await getCompiledModel({
      modelId: "vision-pipeline-litert",
      inputShapes: [[224, 224, 3]],
      enableAsyncExecution: true,
      enableProfiling: true,
      quantization: "none",
    });
    return model;
  } catch (err) {
    console.warn("[tf-runtime] LiteRT vision model compilation failed:", err);
    return null;
  }
}

/** Lazy-load BlazeFace model (~200KB) with LiteRT compilation */
export async function getBlazeFaceModel(): Promise<any> {
  if (_blazeModel) return _blazeModel;
  if (_modelLoading) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (_blazeModel || !_modelLoading) { clearInterval(check); resolve(_blazeModel); }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(null); }, 8000);
    });
  }

  _modelLoading = true;

  try {
    const tf = await ensureTF();
    if (!tf) { _modelLoading = false; return null; }

    const blazeface = await import("@tensorflow-models/blazeface");
    
    const model = await Promise.race([
      blazeface.load({ maxFaces: 5 }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("BlazeFace timeout")), 5000)),
    ]);

    _blazeModel = model;

    // Attach to LiteRT CompiledModel for unified metrics
    const compiledFace = await getCompiledFaceModel();
    if (compiledFace && model) {
      compiledFace.attachModel(model);
    }

    console.log("[tf-runtime] BlazeFace loaded (LiteRT-compiled)");
    return _blazeModel;
  } catch (err) {
    console.warn("[tf-runtime] BlazeFace load failed:", err);
    _modelLoading = false;
    return null;
  }
}

/** Get current backend name */
export function getTFBackend(): string {
  return _backendName;
}

/** Get initialization metrics (extended with LiteRT data) */
export function getTFMetrics() {
  const liteRTState = getLiteRTState();
  return {
    backend: _backendName,
    initTimeMs: _initTime,
    tfReady: !!_tf,
    blazeFaceReady: !!_blazeModel,
    // LiteRT extensions
    liteRT: {
      compiledModels: liteRTState.compiledModels,
      activeAccelerators: liteRTState.activeAccelerators,
      totalInferences: liteRTState.totalInferences,
      avgLatencyMs: liteRTState.avgLatencyMs,
      bufferPool: liteRTState.bufferPoolStats,
    },
    hwCapabilities: _hwCapabilities.map(h => ({
      accelerator: h.accelerator,
      available: h.available,
      speedup: h.estimatedSpeedup,
    })),
  };
}

/** Get full LiteRT state for introspection */
export function getLiteRTRuntime(): LiteRTState {
  return getLiteRTState();
}

/** Dispose model and free memory */
export function disposeTFRuntime(): void {
  if (_blazeModel) {
    try { _blazeModel.dispose?.(); } catch {}
    _blazeModel = null;
  }
  if (_tf) {
    try { _tf.disposeVariables(); } catch {}
  }
  _modelLoading = false;
  _liteRTCompiled = false;
  console.log("[tf-runtime] Disposed (LiteRT cleanup)");
}

// Re-export LiteRT types for consumers
export type { AcceleratorType, CompiledModelMetrics, HardwareCapability, LiteRTState };
