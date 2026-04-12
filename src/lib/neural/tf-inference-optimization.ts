/**
 * ─── TF.js Inference Optimization ───
 * Quantization, pruning, and performance profiling for TF.js models.
 * Ensures maximum efficiency in browser-based neural inference.
 * 
 * Ref: Han et al. (2016) — Deep Compression
 */

import { ensureTF } from "./tf-runtime";

// ─── Types ───

export interface QuantizationResult {
  originalSizeKB: number;
  quantizedSizeKB: number;
  compressionRatio: number;
  quantizationType: "float16" | "uint8" | "dynamic";
  accuracyDelta: number; // expected accuracy loss
}

export interface PruningResult {
  totalParams: number;
  prunedParams: number;
  pruningRatio: number;
  sparsity: number;
  estimatedSpeedup: number;
}

export interface InferenceProfile {
  modelName: string;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughputOpsPerSec: number;
  memoryUsageMB: number;
  samples: number;
}

export interface OptimizationRecommendation {
  technique: string;
  expectedImprovement: string;
  risk: "low" | "medium" | "high";
  priority: number; // 1-5
  description: string;
}

export interface InferenceOptimizationState {
  totalOptimizations: number;
  totalProfiles: number;
  avgLatencyReduction: number;
  avgCompressionRatio: number;
}

// ─── State ───

const _profiles: Map<string, number[]> = new Map(); // model -> latencies
let _state: InferenceOptimizationState = {
  totalOptimizations: 0,
  totalProfiles: 0,
  avgLatencyReduction: 0,
  avgCompressionRatio: 1,
};

/** Get optimization state */
export function getInferenceOptimizationState(): InferenceOptimizationState {
  return { ..._state };
}

/** Profile model inference latency */
export async function profileInference(
  model: any,
  modelName: string,
  inputShape: number[],
  numRuns: number = 20
): Promise<InferenceProfile | null> {
  const tf = await ensureTF();
  if (!tf || !model) return null;

  const latencies: number[] = [];

  try {
    // Warm-up
    const warmupInput = tf.randomNormal([1, ...inputShape]);
    model.predict(warmupInput);
    warmupInput.dispose();

    // Profile
    for (let i = 0; i < numRuns; i++) {
      const input = tf.randomNormal([1, ...inputShape]);
      const start = performance.now();
      const output = model.predict(input);
      // Force sync
      if (output.dataSync) output.dataSync();
      latencies.push(performance.now() - start);
      input.dispose();
      if (output.dispose) output.dispose();
    }

    latencies.sort((a, b) => a - b);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    _profiles.set(modelName, latencies);
    _state.totalProfiles++;

    // Estimate memory
    const memInfo = tf.memory();
    const memoryMB = (memInfo.numBytes || 0) / (1024 * 1024);

    return {
      modelName,
      avgLatencyMs: Math.round(avg * 100) / 100,
      p95LatencyMs: Math.round(p95 * 100) / 100,
      p99LatencyMs: Math.round(p99 * 100) / 100,
      throughputOpsPerSec: Math.round(1000 / avg),
      memoryUsageMB: Math.round(memoryMB * 100) / 100,
      samples: numRuns,
    };
  } catch (err) {
    console.warn("[tf-optimize] Profiling failed:", err);
    return null;
  }
}

/** Simulate quantization effects (TF.js doesn't support full quantization natively) */
export function estimateQuantization(
  modelWeights: number[][],
  type: "float16" | "uint8" | "dynamic" = "float16"
): QuantizationResult {
  let totalParams = 0;
  for (const w of modelWeights) totalParams += w.length;

  const originalSizeKB = (totalParams * 4) / 1024; // float32
  let quantizedSizeKB: number;
  let accuracyDelta: number;

  switch (type) {
    case "float16":
      quantizedSizeKB = (totalParams * 2) / 1024;
      accuracyDelta = -0.001; // ~0.1% accuracy loss
      break;
    case "uint8":
      quantizedSizeKB = totalParams / 1024;
      accuracyDelta = -0.01; // ~1% accuracy loss
      break;
    case "dynamic":
      quantizedSizeKB = (totalParams * 1.5) / 1024;
      accuracyDelta = -0.005;
      break;
  }

  _state.totalOptimizations++;
  _state.avgCompressionRatio = originalSizeKB / quantizedSizeKB;

  return {
    originalSizeKB: Math.round(originalSizeKB),
    quantizedSizeKB: Math.round(quantizedSizeKB),
    compressionRatio: Math.round((originalSizeKB / quantizedSizeKB) * 100) / 100,
    quantizationType: type,
    accuracyDelta,
  };
}

/** Apply magnitude-based weight pruning */
export async function pruneWeights(
  model: any,
  pruningRatio: number = 0.3
): Promise<PruningResult | null> {
  const tf = await ensureTF();
  if (!tf || !model) return null;

  try {
    const weights = model.getWeights();
    let totalParams = 0;
    let prunedParams = 0;

    const newWeights = weights.map((w: any) => {
      const data = w.dataSync();
      totalParams += data.length;

      // Find threshold for pruning
      const absValues = Array.from(data as Float32Array).map(Math.abs).sort((a: number, b: number) => a - b);
      const thresholdIdx = Math.floor(absValues.length * pruningRatio);
      const threshold = absValues[thresholdIdx] || 0;

      // Zero out small weights
      const pruned = new Float32Array(data.length);
      for (let i = 0; i < data.length; i++) {
        if (Math.abs(data[i]) > threshold) {
          pruned[i] = data[i];
        } else {
          prunedParams++;
        }
      }

      return tf.tensor(pruned, w.shape);
    });

    model.setWeights(newWeights);
    // Dispose old weights
    weights.forEach((w: any) => w.dispose());

    _state.totalOptimizations++;

    return {
      totalParams,
      prunedParams,
      pruningRatio: prunedParams / totalParams,
      sparsity: prunedParams / totalParams,
      estimatedSpeedup: 1 + (prunedParams / totalParams) * 0.5, // rough estimate
    };
  } catch (err) {
    console.warn("[tf-optimize] Pruning failed:", err);
    return null;
  }
}

/** Generate optimization recommendations for a model */
export function getOptimizationRecommendations(profile: InferenceProfile): OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = [];

  if (profile.avgLatencyMs > 100) {
    recommendations.push({
      technique: "Weight Pruning",
      expectedImprovement: "20-40% latency reduction",
      risk: "medium",
      priority: 1,
      description: "Remove small-magnitude weights to reduce computation while maintaining accuracy",
    });
  }

  if (profile.memoryUsageMB > 50) {
    recommendations.push({
      technique: "Float16 Quantization",
      expectedImprovement: "50% memory reduction, ~10% faster inference",
      risk: "low",
      priority: 2,
      description: "Convert float32 weights to float16 for smaller model size with minimal accuracy loss",
    });
  }

  if (profile.avgLatencyMs > 200) {
    recommendations.push({
      technique: "Knowledge Distillation",
      expectedImprovement: "2-5x smaller model with 95%+ accuracy retention",
      risk: "medium",
      priority: 3,
      description: "Train a smaller student model to mimic the larger teacher model",
    });
  }

  if (profile.p99LatencyMs > profile.avgLatencyMs * 3) {
    recommendations.push({
      technique: "Input Batching",
      expectedImprovement: "Reduced variance in latency",
      risk: "low",
      priority: 4,
      description: "Batch multiple inference requests to amortize overhead and reduce P99 latency",
    });
  }

  recommendations.push({
    technique: "WebGL Shader Optimization",
    expectedImprovement: "10-30% faster on GPU",
    risk: "low",
    priority: 5,
    description: "Ensure WebGL backend is active and fused ops are enabled for GPU acceleration",
  });

  return recommendations.sort((a, b) => a.priority - b.priority);
}

/** Benchmark model against reference latency targets */
export function benchmarkModel(profile: InferenceProfile, targets: { maxLatencyMs: number; minThroughput: number }): {
  passesLatency: boolean;
  passesThroughput: boolean;
  overallPass: boolean;
  latencyMargin: number;
  throughputMargin: number;
} {
  return {
    passesLatency: profile.avgLatencyMs <= targets.maxLatencyMs,
    passesThroughput: profile.throughputOpsPerSec >= targets.minThroughput,
    overallPass: profile.avgLatencyMs <= targets.maxLatencyMs && profile.throughputOpsPerSec >= targets.minThroughput,
    latencyMargin: targets.maxLatencyMs - profile.avgLatencyMs,
    throughputMargin: profile.throughputOpsPerSec - targets.minThroughput,
  };
}
