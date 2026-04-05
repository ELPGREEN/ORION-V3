/**
 * ─── LiteRT Model Conversion, Optimization & NPU Dispatch ───
 * 
 * Browser-adapted implementation of LiteRT's model lifecycle tools:
 * 
 * 1. Model Conversion Pipeline (PyTorch/TF/JAX → .tflite/.litertlm)
 * 2. Post-Training Quantization (int4/int8/float16/dynamic)
 * 3. AI Edge Quantizer (per-channel, mixed-precision)
 * 4. NPU Dispatch API (Qualcomm QNN, MediaTek NeuroPilot — simulated)
 * 5. ML Drift GPU Acceleration Layer
 * 6. XNNPACK CPU Optimization
 * 7. Model Profiling & Benchmarking
 * 
 * Ref: Google AI Edge LiteRT 2.x (2025-2026)
 *      ai.google.dev/edge/litert/conversion/overview
 *      ai.google.dev/edge/litert/overview#hardware-acceleration
 *      AI Edge Quantizer (github.com/google-ai-edge/ai-edge-quantizer)
 */

import type { AcceleratorType } from "./litert-compiled-model";

// ═══ CONVERSION TYPES ═══

export type SourceFramework = "pytorch" | "tensorflow" | "jax" | "onnx" | "tflite";
export type TargetFormat = "tflite" | "litertlm";

export interface ConversionConfig {
  sourceFramework: SourceFramework;
  targetFormat: TargetFormat;
  modelName: string;
  inputSpecs: InputSpec[];
  outputSpecs?: OutputSpec[];
  optimizations: OptimizationFlag[];
  quantization?: QuantizationConfig;
  enableSignatures?: boolean;      // multi-signature models
  enableDynamicShapes?: boolean;
  metadata?: Record<string, string>;
}

export interface InputSpec {
  name: string;
  shape: number[];         // e.g., [1, 224, 224, 3]
  dtype: "float32" | "int32" | "int64" | "uint8" | "float16";
  dynamicAxes?: number[];  // which dims can vary
}

export interface OutputSpec {
  name: string;
  shape: number[];
  dtype: "float32" | "int32" | "int64";
}

export type OptimizationFlag = 
  | "DEFAULT"                // safe optimizations
  | "OPTIMIZE_FOR_SIZE"      // minimize model size
  | "OPTIMIZE_FOR_LATENCY"   // minimize inference time
  | "EXPERIMENTAL_SPARSITY"; // experimental weight sparsity

export interface ConversionResult {
  success: boolean;
  targetFormat: TargetFormat;
  modelSizeBytes: number;
  originalSizeBytes: number;
  compressionRatio: number;
  opsCovered: number;        // ops successfully converted
  opsTotal: number;
  unsupportedOps: string[];
  warnings: string[];
  conversionTimeMs: number;
  signatures: string[];
  metadata: Record<string, string>;
}

// ═══ QUANTIZATION TYPES ═══

export type QuantizationMode = 
  | "dynamic_range"          // weights int8, activations float32
  | "full_integer"           // weights + activations int8
  | "float16"                // weights float16
  | "int4_per_channel"       // 4-bit per channel (GenAI)
  | "mixed_precision";       // layer-by-layer precision

export interface QuantizationConfig {
  mode: QuantizationMode;
  calibrationDataSize?: number;   // num samples for calibration
  representativeDataset?: Float32Array[];
  excludeLayers?: string[];       // layers to skip quantization
  perChannelWeights?: boolean;
  symmetricWeights?: boolean;
  outputDtype?: "float32" | "int8" | "uint8";
}

export interface QuantizationResult {
  mode: QuantizationMode;
  originalSizeBytes: number;
  quantizedSizeBytes: number;
  compressionRatio: number;
  accuracyDelta: number;      // estimated accuracy loss (0-1)
  layersQuantized: number;
  layersSkipped: number;
  calibrationSamples: number;
  quantizationTimeMs: number;
  perLayerStats: LayerQuantStats[];
}

export interface LayerQuantStats {
  layerName: string;
  originalDtype: string;
  quantizedDtype: string;
  parameterCount: number;
  compressionRatio: number;
  rangeMin: number;
  rangeMax: number;
  scaleFactors: number;
}

// ═══ NPU DISPATCH TYPES ═══

export type NPUVendor = "qualcomm_qnn" | "mediatek_neuropilot" | "google_tpu" | "apple_ane" | "samsung_npu";

export interface NPUConfig {
  vendor: NPUVendor;
  socModel?: string;           // e.g., "SM8750", "MT6989"
  delegateOptions: Record<string, unknown>;
  fallbackToGPU: boolean;
  fallbackToCPU: boolean;
  enableProfiling: boolean;
}

export interface NPUCapability {
  vendor: NPUVendor;
  available: boolean;
  socModel: string;
  supportedOps: string[];
  maxModelSizeMB: number;
  int4Support: boolean;
  int8Support: boolean;
  float16Support: boolean;
  estimatedSpeedup: number;    // vs CPU
  powerEfficiency: number;     // vs GPU (higher = better)
}

export interface NPUDispatchResult {
  vendor: NPUVendor;
  success: boolean;
  opsOnNPU: number;
  opsOnCPU: number;            // fallback ops
  estimatedSpeedup: number;
  delegateInitTimeMs: number;
  warnings: string[];
}

// ═══ GPU ACCELERATION (ML Drift) ═══

export interface MLDriftConfig {
  backend: "webgpu" | "webgl" | "opengl" | "opencl" | "metal";
  enableFloat16: boolean;
  enableAsyncDispatch: boolean;
  shaderCache: boolean;
  maxBatchSize: number;
}

export interface MLDriftState {
  backend: string;
  shadersCompiled: number;
  dispatchCount: number;
  avgDispatchMs: number;
  float16Enabled: boolean;
  memoryUsageMB: number;
}

// ═══ MODEL CONVERSION PIPELINE ═══

/** Convert a model from source framework to LiteRT format */
export function convertModel(config: ConversionConfig): ConversionResult {
  const start = performance.now();

  // Simulate framework-specific conversion
  const frameworkOps = getFrameworkOps(config.sourceFramework);
  const supportedOps = getLiteRTSupportedOps();
  
  const unsupported: string[] = [];
  let covered = 0;
  for (const op of frameworkOps) {
    if (supportedOps.has(op)) covered++;
    else unsupported.push(op);
  }

  // Estimate model size based on input specs
  const inputBytes = config.inputSpecs.reduce((s, spec) => {
    const elements = spec.shape.reduce((a, b) => a * b, 1);
    const bytesPerElement = spec.dtype === "float32" ? 4 : spec.dtype === "float16" ? 2 : spec.dtype === "int64" ? 8 : 4;
    return s + elements * bytesPerElement;
  }, 0);

  const originalSize = inputBytes * 100; // rough model size estimate
  let targetSize = originalSize;

  // Apply optimizations
  for (const opt of config.optimizations) {
    switch (opt) {
      case "OPTIMIZE_FOR_SIZE": targetSize *= 0.6; break;
      case "OPTIMIZE_FOR_LATENCY": targetSize *= 0.85; break;
      case "EXPERIMENTAL_SPARSITY": targetSize *= 0.5; break;
      default: targetSize *= 0.9; break;
    }
  }

  // Apply quantization
  if (config.quantization) {
    const qRatio = getQuantizationCompressionRatio(config.quantization.mode);
    targetSize *= qRatio;
  }

  const result: ConversionResult = {
    success: unsupported.length === 0 || unsupported.length < frameworkOps.length * 0.1,
    targetFormat: config.targetFormat,
    modelSizeBytes: Math.round(targetSize),
    originalSizeBytes: originalSize,
    compressionRatio: Math.round((originalSize / targetSize) * 100) / 100,
    opsCovered: covered,
    opsTotal: frameworkOps.length,
    unsupportedOps: unsupported,
    warnings: [],
    conversionTimeMs: Math.round(performance.now() - start),
    signatures: config.enableSignatures ? ["serving_default", "encode", "decode"] : ["serving_default"],
    metadata: {
      ...config.metadata,
      source_framework: config.sourceFramework,
      litert_version: "2.1",
      converted_at: new Date().toISOString(),
    },
  };

  if (unsupported.length > 0) {
    result.warnings.push(`${unsupported.length} ops will use TF Select delegate (slower)`);
  }

  console.log(`[LiteRT-Convert] ${config.sourceFramework} → ${config.targetFormat}: ${(targetSize / 1024 / 1024).toFixed(1)}MB (${result.compressionRatio}x compression)`);
  return result;
}

/** Quantize a model with specified configuration */
export function quantizeModel(
  modelSizeBytes: number,
  config: QuantizationConfig,
  numLayers = 50
): QuantizationResult {
  const start = performance.now();
  const ratio = getQuantizationCompressionRatio(config.mode);
  const quantizedSize = Math.round(modelSizeBytes * ratio);
  
  const excludeCount = config.excludeLayers?.length ?? 0;
  const layersQuantized = numLayers - excludeCount;

  // Generate per-layer stats
  const perLayerStats: LayerQuantStats[] = [];
  for (let i = 0; i < numLayers; i++) {
    const isExcluded = config.excludeLayers?.includes(`layer_${i}`);
    const quantizedDtype = isExcluded ? "float32" : 
      config.mode === "float16" ? "float16" :
      config.mode === "int4_per_channel" ? "int4" : "int8";
    
    perLayerStats.push({
      layerName: `layer_${i}`,
      originalDtype: "float32",
      quantizedDtype,
      parameterCount: Math.round(modelSizeBytes / (numLayers * 4)),
      compressionRatio: isExcluded ? 1.0 : 1 / ratio,
      rangeMin: -(1 + Math.random()),
      rangeMax: 1 + Math.random(),
      scaleFactors: config.perChannelWeights ? 64 : 1,
    });
  }

  // Estimate accuracy delta based on quantization aggressiveness
  const accuracyDelta = config.mode === "dynamic_range" ? 0.005 :
    config.mode === "full_integer" ? 0.01 :
    config.mode === "float16" ? 0.001 :
    config.mode === "int4_per_channel" ? 0.02 : 0.008;

  return {
    mode: config.mode,
    originalSizeBytes: modelSizeBytes,
    quantizedSizeBytes: quantizedSize,
    compressionRatio: Math.round((modelSizeBytes / quantizedSize) * 100) / 100,
    accuracyDelta,
    layersQuantized,
    layersSkipped: excludeCount,
    calibrationSamples: config.calibrationDataSize ?? 0,
    quantizationTimeMs: Math.round(performance.now() - start),
    perLayerStats,
  };
}

// ═══ NPU DISPATCH ═══

/** Probe NPU capabilities (browser-adapted) */
export function probeNPUCapabilities(): NPUCapability[] {
  const capabilities: NPUCapability[] = [];

  // WebGPU as NPU proxy (browser has no direct NPU access)
  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    capabilities.push({
      vendor: "qualcomm_qnn",
      available: true,
      socModel: "WebGPU (browser proxy)",
      supportedOps: ["conv2d", "depthwise_conv2d", "fully_connected", "softmax", "batch_norm", "relu", "add", "mul", "reshape", "transpose"],
      maxModelSizeMB: 512,
      int4Support: true,
      int8Support: true,
      float16Support: true,
      estimatedSpeedup: 4.0,
      powerEfficiency: 3.0,
    });
  }

  // Simulated NPU vendors for capability tracking
  capabilities.push(
    {
      vendor: "mediatek_neuropilot",
      available: false,
      socModel: "N/A (requires Android)",
      supportedOps: ["conv2d", "fully_connected", "softmax", "batch_norm"],
      maxModelSizeMB: 1024,
      int4Support: true, int8Support: true, float16Support: true,
      estimatedSpeedup: 5.0, powerEfficiency: 4.0,
    },
    {
      vendor: "google_tpu",
      available: false,
      socModel: "N/A (requires Pixel/Cloud)",
      supportedOps: ["conv2d", "matmul", "softmax", "layer_norm", "attention"],
      maxModelSizeMB: 2048,
      int4Support: true, int8Support: true, float16Support: true,
      estimatedSpeedup: 8.0, powerEfficiency: 5.0,
    },
    {
      vendor: "apple_ane",
      available: false,
      socModel: "N/A (requires Apple Silicon)",
      supportedOps: ["conv2d", "fully_connected", "batch_norm", "relu"],
      maxModelSizeMB: 1024,
      int4Support: false, int8Support: true, float16Support: true,
      estimatedSpeedup: 6.0, powerEfficiency: 4.5,
    }
  );

  return capabilities;
}

/** Dispatch model to NPU backend */
export function dispatchToNPU(
  modelOps: string[],
  npuConfig: NPUConfig
): NPUDispatchResult {
  const start = performance.now();
  const capabilities = probeNPUCapabilities();
  const npu = capabilities.find(c => c.vendor === npuConfig.vendor);

  if (!npu || !npu.available) {
    return {
      vendor: npuConfig.vendor,
      success: false,
      opsOnNPU: 0,
      opsOnCPU: modelOps.length,
      estimatedSpeedup: 1.0,
      delegateInitTimeMs: Math.round(performance.now() - start),
      warnings: [`NPU vendor ${npuConfig.vendor} not available in browser environment`],
    };
  }

  const supportedSet = new Set(npu.supportedOps);
  let opsOnNPU = 0, opsOnCPU = 0;
  const warnings: string[] = [];

  for (const op of modelOps) {
    if (supportedSet.has(op)) opsOnNPU++;
    else {
      opsOnCPU++;
      if (opsOnCPU <= 3) warnings.push(`Op '${op}' falls back to CPU`);
    }
  }

  const npuRatio = modelOps.length > 0 ? opsOnNPU / modelOps.length : 0;
  const speedup = 1 + (npu.estimatedSpeedup - 1) * npuRatio;

  return {
    vendor: npuConfig.vendor,
    success: true,
    opsOnNPU,
    opsOnCPU,
    estimatedSpeedup: Math.round(speedup * 10) / 10,
    delegateInitTimeMs: Math.round(performance.now() - start),
    warnings,
  };
}

// ═══ ML DRIFT GPU LAYER ═══

let _mlDriftState: MLDriftState = {
  backend: "none",
  shadersCompiled: 0,
  dispatchCount: 0,
  avgDispatchMs: 0,
  float16Enabled: false,
  memoryUsageMB: 0,
};

/** Initialize ML Drift GPU acceleration */
export async function initMLDrift(config?: Partial<MLDriftConfig>): Promise<MLDriftState> {
  const backend = config?.backend ?? "webgl";
  
  _mlDriftState = {
    backend,
    shadersCompiled: 0,
    dispatchCount: 0,
    avgDispatchMs: 0,
    float16Enabled: config?.enableFloat16 ?? false,
    memoryUsageMB: 0,
  };

  // Detect WebGPU availability
  if (backend === "webgpu" && typeof navigator !== "undefined" && "gpu" in navigator) {
    try {
      const adapter = await (navigator as any).gpu?.requestAdapter();
      if (adapter) {
        _mlDriftState.shadersCompiled = 1;
        _mlDriftState.float16Enabled = true;
        console.log("[MLDrift] WebGPU initialized");
      }
    } catch {}
  } else if (backend === "webgl") {
    _mlDriftState.shadersCompiled = 1;
    console.log("[MLDrift] WebGL initialized");
  }

  return { ..._mlDriftState };
}

export function getMLDriftState(): MLDriftState {
  return { ..._mlDriftState };
}

// ═══ XNNPACK CPU OPTIMIZATION ═══

export interface XNNPackConfig {
  numThreads: number;
  enableFP16: boolean;
  enableWeightsPacking: boolean;
}

export interface XNNPackState {
  available: boolean;
  simdSupport: boolean;
  numThreads: number;
  optimizedOps: string[];
}

/** Check XNNPACK (WASM SIMD) availability */
export function probeXNNPack(): XNNPackState {
  let simdSupport = false;
  try {
    simdSupport = typeof WebAssembly !== "undefined" && 
      WebAssembly.validate(new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123,
        3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
      ]));
  } catch {}

  return {
    available: typeof WebAssembly !== "undefined",
    simdSupport,
    numThreads: typeof navigator !== "undefined" ? navigator.hardwareConcurrency ?? 4 : 4,
    optimizedOps: [
      "conv2d", "depthwise_conv2d", "fully_connected", "average_pool2d",
      "max_pool2d", "add", "mul", "softmax", "relu", "prelu",
      "batch_norm", "instance_norm", "layer_norm", "transpose_conv2d",
    ],
  };
}

// ═══ MODEL PROFILING ═══

export interface ProfilingResult {
  totalLatencyMs: number;
  layerBreakdown: { name: string; latencyMs: number; percentage: number }[];
  memoryPeakMB: number;
  opsCount: number;
  flops: number;
  backend: string;
  recommendations: string[];
}

/** Profile model inference performance */
export function profileModel(
  modelOps: string[],
  inputShapes: number[][],
  backend: AcceleratorType = "cpu"
): ProfilingResult {
  // Estimate FLOPS from input shapes
  const totalElements = inputShapes.reduce((s, shape) => s + shape.reduce((a, b) => a * b, 1), 0);
  const opsPerElement = 2; // mul + add per element
  const flops = totalElements * opsPerElement * modelOps.length;

  // Simulate per-layer timing
  const baseLatencyPerOp = backend === "webgpu" ? 0.05 : backend === "webgl" ? 0.1 : backend === "wasm" ? 0.3 : 1.0;
  const layerBreakdown = modelOps.map((op, i) => {
    const latency = baseLatencyPerOp * (1 + Math.random() * 0.5);
    return { name: `${op}_${i}`, latencyMs: Math.round(latency * 100) / 100, percentage: 0 };
  });

  const totalLatency = layerBreakdown.reduce((s, l) => s + l.latencyMs, 0);
  for (const layer of layerBreakdown) {
    layer.percentage = totalLatency > 0 ? Math.round(layer.latencyMs / totalLatency * 10000) / 100 : 0;
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (backend === "cpu") recommendations.push("Consider enabling WebGPU/WebGL for 3-8x speedup");
  if (totalElements > 1000000) recommendations.push("Large model — consider int8 quantization to reduce size 4x");
  if (modelOps.length > 100) recommendations.push("Deep model — consider layer fusion for reduced overhead");

  return {
    totalLatencyMs: Math.round(totalLatency * 100) / 100,
    layerBreakdown: layerBreakdown.sort((a, b) => b.latencyMs - a.latencyMs).slice(0, 10),
    memoryPeakMB: Math.round(totalElements * 4 / 1024 / 1024 * 100) / 100,
    opsCount: modelOps.length,
    flops,
    backend,
    recommendations,
  };
}

// ═══ HELPERS ═══

function getFrameworkOps(framework: SourceFramework): string[] {
  const commonOps = ["conv2d", "batch_norm", "relu", "max_pool2d", "average_pool2d", 
    "fully_connected", "softmax", "add", "mul", "reshape", "transpose",
    "concat", "slice", "pad", "resize_bilinear", "depthwise_conv2d"];
  
  const frameworkSpecific: Record<string, string[]> = {
    pytorch: [...commonOps, "group_norm", "gelu", "silu", "layer_norm", "attention", "scaled_dot_product_attention"],
    tensorflow: [...commonOps, "fused_batch_norm", "bias_add", "squeeze", "expand_dims"],
    jax: [...commonOps, "dot_general", "scatter", "gather", "dynamic_slice"],
    onnx: [...commonOps, "gemm", "global_average_pool", "instance_norm"],
    tflite: commonOps,
  };
  return frameworkSpecific[framework] ?? commonOps;
}

function getLiteRTSupportedOps(): Set<string> {
  return new Set([
    "conv2d", "depthwise_conv2d", "fully_connected", "softmax", "batch_norm",
    "fused_batch_norm", "relu", "relu6", "prelu", "leaky_relu", "add", "mul",
    "sub", "div", "max_pool2d", "average_pool2d", "reshape", "transpose",
    "concat", "slice", "pad", "resize_bilinear", "resize_nearest_neighbor",
    "squeeze", "expand_dims", "bias_add", "layer_norm", "group_norm",
    "gelu", "silu", "tanh", "sigmoid", "mean", "sum",
    // GenAI ops
    "attention", "scaled_dot_product_attention", "rotary_embedding",
    "kv_cache", "rms_norm", "rope",
  ]);
}

function getQuantizationCompressionRatio(mode: QuantizationMode): number {
  switch (mode) {
    case "dynamic_range": return 0.25;     // ~4x compression
    case "full_integer": return 0.25;      // ~4x
    case "float16": return 0.5;            // ~2x
    case "int4_per_channel": return 0.125; // ~8x
    case "mixed_precision": return 0.35;   // ~3x
    default: return 1.0;
  }
}

// ═══ FULL STATE ═══

export function getLiteRTConversionState() {
  return {
    conversion: {
      supportedSources: ["pytorch", "tensorflow", "jax", "onnx"] as SourceFramework[],
      targetFormats: ["tflite", "litertlm"] as TargetFormat[],
      optimizationFlags: ["DEFAULT", "OPTIMIZE_FOR_SIZE", "OPTIMIZE_FOR_LATENCY", "EXPERIMENTAL_SPARSITY"] as OptimizationFlag[],
    },
    quantization: {
      modes: ["dynamic_range", "full_integer", "float16", "int4_per_channel", "mixed_precision"] as QuantizationMode[],
      features: ["per-channel weights", "symmetric quantization", "calibration-based", "mixed-precision per-layer"],
    },
    npu: probeNPUCapabilities(),
    gpu: getMLDriftState(),
    cpu: probeXNNPack(),
    version: "2.1",
  };
}
