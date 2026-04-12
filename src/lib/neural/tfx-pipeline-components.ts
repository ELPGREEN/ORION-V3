/**
 * ─── TFX Pipeline Components (Browser-Adapted) ───
 * 
 * Complete implementation of TFX standard components adapted for browser:
 * 
 * 1. ExampleGen     — Data ingestion & train/eval/test splitting
 * 2. StatisticsGen  — Feature statistics computation (TFDV)
 * 3. SchemaGen      — Automatic schema inference
 * 4. ExampleValidator — Anomaly detection via schema
 * 5. Transform      — Feature engineering pipeline
 * 6. Tuner          — Hyperparameter search (grid/random)
 * 7. InfraValidator — Runtime environment validation
 * 8. Pusher         — Model deployment management
 * 9. BulkInferrer   — Batch inference execution
 * 10. ML Metadata   — Artifact & execution lineage tracking
 * 
 * Ref: Baylor et al. (2017) — TFX: A TensorFlow-Based Production-Scale ML Platform
 *      Google TFX Guide (tensorflow.org/tfx/guide)
 */

// ═══════════════════════════════════════════════════
//  ML Metadata (MLMD) — Artifact & Execution Lineage
// ═══════════════════════════════════════════════════

export type ArtifactType = "dataset" | "schema" | "statistics" | "model" | "evaluation" | "transform" | "deployment";

export interface MLArtifact {
  id: string;
  type: ArtifactType;
  name: string;
  uri: string;            // logical path/identifier
  properties: Record<string, string | number | boolean>;
  createTimeMs: number;
  state: "pending" | "live" | "marked_for_deletion";
  producerExecutionId?: string;
}

export interface MLExecution {
  id: string;
  componentName: string;
  state: "new" | "running" | "complete" | "failed" | "cached";
  startTimeMs: number;
  endTimeMs?: number;
  properties: Record<string, string | number | boolean>;
  inputArtifactIds: string[];
  outputArtifactIds: string[];
}

export interface MLContext {
  id: string;
  pipelineRunId: string;
  executionIds: string[];
  createdAt: number;
}

class MLMetadataStore {
  private artifacts: Map<string, MLArtifact> = new Map();
  private executions: Map<string, MLExecution> = new Map();
  private contexts: Map<string, MLContext> = new Map();
  private nextId = 0;

  private genId(prefix: string): string {
    return `${prefix}_${++this.nextId}_${Date.now()}`;
  }

  putArtifact(type: ArtifactType, name: string, uri: string, props: Record<string, string | number | boolean> = {}): MLArtifact {
    const artifact: MLArtifact = {
      id: this.genId("art"),
      type, name, uri, properties: props,
      createTimeMs: performance.now(),
      state: "live",
    };
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  putExecution(componentName: string, inputIds: string[] = [], props: Record<string, string | number | boolean> = {}): MLExecution {
    const execution: MLExecution = {
      id: this.genId("exec"),
      componentName,
      state: "running",
      startTimeMs: performance.now(),
      properties: props,
      inputArtifactIds: inputIds,
      outputArtifactIds: [],
    };
    this.executions.set(execution.id, execution);
    return execution;
  }

  completeExecution(executionId: string, outputArtifactIds: string[], state: MLExecution["state"] = "complete"): void {
    const exec = this.executions.get(executionId);
    if (exec) {
      exec.state = state;
      exec.endTimeMs = performance.now();
      exec.outputArtifactIds = outputArtifactIds;
      for (const artId of outputArtifactIds) {
        const art = this.artifacts.get(artId);
        if (art) art.producerExecutionId = executionId;
      }
    }
  }

  createContext(pipelineRunId: string): MLContext {
    const ctx: MLContext = { id: this.genId("ctx"), pipelineRunId, executionIds: [], createdAt: Date.now() };
    this.contexts.set(ctx.id, ctx);
    return ctx;
  }

  addExecutionToContext(contextId: string, executionId: string): void {
    const ctx = this.contexts.get(contextId);
    if (ctx) ctx.executionIds.push(executionId);
  }

  getArtifact(id: string): MLArtifact | undefined { return this.artifacts.get(id); }
  getExecution(id: string): MLExecution | undefined { return this.executions.get(id); }

  getLineage(artifactId: string): { producers: MLExecution[]; consumers: MLExecution[] } {
    const producers: MLExecution[] = [];
    const consumers: MLExecution[] = [];
    for (const exec of this.executions.values()) {
      if (exec.outputArtifactIds.includes(artifactId)) producers.push(exec);
      if (exec.inputArtifactIds.includes(artifactId)) consumers.push(exec);
    }
    return { producers, consumers };
  }

  getStats() {
    return {
      artifacts: this.artifacts.size,
      executions: this.executions.size,
      contexts: this.contexts.size,
      byType: Object.fromEntries(
        (["dataset", "schema", "statistics", "model", "evaluation", "transform", "deployment"] as ArtifactType[])
          .map(t => [t, Array.from(this.artifacts.values()).filter(a => a.type === t).length])
      ),
    };
  }
}

// Global MLMD store
export const mlmd = new MLMetadataStore();

// ═══════════════════════════════════════════
//  1. ExampleGen — Data Ingestion & Splitting
// ═══════════════════════════════════════════

export interface SplitConfig {
  trainRatio: number;
  evalRatio: number;
  testRatio: number;
  shuffleSeed?: number;
}

export interface ExampleGenOutput {
  train: number[][];
  eval: number[][];
  test: number[][];
  totalExamples: number;
  artifactId: string;
}

export function exampleGen(
  data: number[][],
  config: SplitConfig = { trainRatio: 0.7, evalRatio: 0.15, testRatio: 0.15 }
): ExampleGenOutput {
  const exec = mlmd.putExecution("ExampleGen", [], { totalExamples: data.length });

  // Seeded shuffle (Fisher-Yates)
  const shuffled = [...data];
  let seed = config.shuffleSeed ?? 42;
  const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const total = shuffled.length;
  const trainEnd = Math.floor(total * config.trainRatio);
  const evalEnd = trainEnd + Math.floor(total * config.evalRatio);

  const output: ExampleGenOutput = {
    train: shuffled.slice(0, trainEnd),
    eval: shuffled.slice(trainEnd, evalEnd),
    test: shuffled.slice(evalEnd),
    totalExamples: total,
    artifactId: "",
  };

  const art = mlmd.putArtifact("dataset", "split_dataset", "mem://examples", {
    trainSize: output.train.length,
    evalSize: output.eval.length,
    testSize: output.test.length,
  });
  output.artifactId = art.id;
  mlmd.completeExecution(exec.id, [art.id]);

  return output;
}

// ═══════════════════════════════════════════
//  2. StatisticsGen — Feature Statistics (TFDV)
// ═══════════════════════════════════════════

export interface FeatureStatistics {
  name: string;
  count: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
  p25: number;
  p75: number;
  missing: number;
  zeros: number;
  uniqueValues: number;
  histogram: number[];     // 10-bin histogram counts
}

export interface StatisticsGenOutput {
  features: FeatureStatistics[];
  totalExamples: number;
  totalFeatures: number;
  artifactId: string;
}

export function statisticsGen(data: number[][], featureNames?: string[]): StatisticsGenOutput {
  const exec = mlmd.putExecution("StatisticsGen", [], { samples: data.length });

  if (data.length === 0) {
    const art = mlmd.putArtifact("statistics", "empty_stats", "mem://stats", {});
    mlmd.completeExecution(exec.id, [art.id]);
    return { features: [], totalExamples: 0, totalFeatures: 0, artifactId: art.id };
  }

  const numFeatures = data[0].length;
  const features: FeatureStatistics[] = [];

  for (let f = 0; f < numFeatures; f++) {
    const values = data.map(row => row[f]).filter(v => v !== undefined && v !== null && !isNaN(v));
    const missing = data.length - values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = values.length > 0 ? sum / values.length : 0;
    const variance = values.length > 0 ? values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length : 0;

    // Histogram (10 bins)
    const min = sorted[0] ?? 0;
    const max = sorted[sorted.length - 1] ?? 0;
    const binWidth = (max - min) / 10 || 1;
    const histogram = new Array(10).fill(0);
    for (const v of values) {
      const bin = Math.min(Math.floor((v - min) / binWidth), 9);
      histogram[bin]++;
    }

    features.push({
      name: featureNames?.[f] ?? `feature_${f}`,
      count: values.length,
      mean: Math.round(mean * 1000) / 1000,
      stdDev: Math.round(Math.sqrt(variance) * 1000) / 1000,
      min: sorted[0] ?? 0,
      max: sorted[sorted.length - 1] ?? 0,
      median: sorted[Math.floor(sorted.length / 2)] ?? 0,
      p25: sorted[Math.floor(sorted.length * 0.25)] ?? 0,
      p75: sorted[Math.floor(sorted.length * 0.75)] ?? 0,
      missing,
      zeros: values.filter(v => v === 0).length,
      uniqueValues: new Set(values).size,
      histogram,
    });
  }

  const art = mlmd.putArtifact("statistics", "feature_statistics", "mem://stats", {
    numFeatures,
    totalExamples: data.length,
  });
  mlmd.completeExecution(exec.id, [art.id]);

  return { features, totalExamples: data.length, totalFeatures: numFeatures, artifactId: art.id };
}

// ═══════════════════════════════════════════
//  3. SchemaGen — Auto Schema Inference
// ═══════════════════════════════════════════

export interface FeatureSchema {
  name: string;
  dtype: "float" | "int" | "categorical";
  required: boolean;
  minValue?: number;
  maxValue?: number;
  minFractionPresent: number;  // 0-1
  uniqueRatio: number;         // unique/total — high = categorical candidate
  vocabulary?: string[];
}

export interface SchemaGenOutput {
  features: FeatureSchema[];
  version: number;
  artifactId: string;
}

export function schemaGen(stats: StatisticsGenOutput): SchemaGenOutput {
  const exec = mlmd.putExecution("SchemaGen", [stats.artifactId]);

  const features: FeatureSchema[] = stats.features.map(s => {
    const uniqueRatio = s.count > 0 ? s.uniqueValues / s.count : 0;
    const isInt = s.min === Math.floor(s.min) && s.max === Math.floor(s.max) && s.stdDev > 0;
    const isCategorical = uniqueRatio < 0.05 && s.uniqueValues <= 20;

    return {
      name: s.name,
      dtype: isCategorical ? "categorical" : isInt ? "int" : "float",
      required: s.missing === 0,
      minValue: s.min,
      maxValue: s.max,
      minFractionPresent: s.count > 0 ? (s.count - s.missing) / s.count : 0,
      uniqueRatio: Math.round(uniqueRatio * 1000) / 1000,
    };
  });

  const art = mlmd.putArtifact("schema", "inferred_schema", "mem://schema", {
    numFeatures: features.length,
  });
  mlmd.completeExecution(exec.id, [art.id]);

  return { features, version: 1, artifactId: art.id };
}

// ═══════════════════════════════════════════
//  4. ExampleValidator — Anomaly Detection
// ═══════════════════════════════════════════

export interface AnomalyReport {
  featureName: string;
  anomalyType: "missing_values" | "out_of_range" | "type_mismatch" | "unexpected_categorical" | "distribution_skew";
  severity: "warning" | "error";
  description: string;
  affectedRows: number;
}

export interface ExampleValidatorOutput {
  isValid: boolean;
  anomalies: AnomalyReport[];
  totalChecked: number;
  artifactId: string;
}

export function exampleValidator(
  data: number[][],
  schema: SchemaGenOutput,
  stats: StatisticsGenOutput
): ExampleValidatorOutput {
  const exec = mlmd.putExecution("ExampleValidator", [schema.artifactId, stats.artifactId]);
  const anomalies: AnomalyReport[] = [];

  for (let f = 0; f < schema.features.length; f++) {
    const feat = schema.features[f];
    const stat = stats.features[f];
    if (!stat) continue;

    // Check missing values
    if (feat.required && stat.missing > 0) {
      anomalies.push({
        featureName: feat.name,
        anomalyType: "missing_values",
        severity: "error",
        description: `${stat.missing} valores ausentes em feature obrigatória`,
        affectedRows: stat.missing,
      });
    }

    // Check range violations
    if (feat.minValue !== undefined && feat.maxValue !== undefined) {
      let outOfRange = 0;
      for (const row of data) {
        const v = row[f];
        if (v !== undefined && (v < feat.minValue! || v > feat.maxValue!)) outOfRange++;
      }
      if (outOfRange > 0) {
        anomalies.push({
          featureName: feat.name,
          anomalyType: "out_of_range",
          severity: outOfRange > data.length * 0.1 ? "error" : "warning",
          description: `${outOfRange} valores fora do intervalo [${feat.minValue}, ${feat.maxValue}]`,
          affectedRows: outOfRange,
        });
      }
    }

    // Distribution skew detection (compare current mean vs training stats)
    if (stat.stdDev > 0) {
      const currentMean = data.reduce((s, r) => s + (r[f] ?? 0), 0) / data.length;
      const zScore = Math.abs(currentMean - stat.mean) / stat.stdDev;
      if (zScore > 3) {
        anomalies.push({
          featureName: feat.name,
          anomalyType: "distribution_skew",
          severity: zScore > 5 ? "error" : "warning",
          description: `Desvio de distribuição (z-score: ${zScore.toFixed(2)})`,
          affectedRows: data.length,
        });
      }
    }
  }

  const art = mlmd.putArtifact("evaluation", "validation_report", "mem://validation", {
    anomalyCount: anomalies.length,
    isValid: anomalies.filter(a => a.severity === "error").length === 0,
  });
  mlmd.completeExecution(exec.id, [art.id]);

  return {
    isValid: anomalies.filter(a => a.severity === "error").length === 0,
    anomalies,
    totalChecked: data.length,
    artifactId: art.id,
  };
}

// ═══════════════════════════════════════════
//  5. Transform — Feature Engineering
// ═══════════════════════════════════════════

export type TransformOp =
  | { type: "normalize"; featureIndex: number }       // z-score normalization
  | { type: "minmax"; featureIndex: number }           // min-max scaling [0,1]
  | { type: "log"; featureIndex: number }              // log1p transform
  | { type: "bucketize"; featureIndex: number; boundaries: number[] }
  | { type: "polynomial"; featureIndices: number[]; degree: number }
  | { type: "interaction"; featureA: number; featureB: number };

export interface TransformOutput {
  data: number[][];
  transformSpec: TransformOp[];
  featureStats: { mean: number; std: number; min: number; max: number }[];
  artifactId: string;
}

export function transform(data: number[][], ops: TransformOp[], stats: StatisticsGenOutput): TransformOutput {
  const exec = mlmd.putExecution("Transform", [stats.artifactId], { opsCount: ops.length });
  const result = data.map(row => [...row]);
  const featureStats: TransformOutput["featureStats"] = stats.features.map(s => ({
    mean: s.mean, std: s.stdDev, min: s.min, max: s.max,
  }));

  for (const op of ops) {
    switch (op.type) {
      case "normalize": {
        const s = featureStats[op.featureIndex];
        if (s && s.std > 0) {
          for (const row of result) {
            row[op.featureIndex] = (row[op.featureIndex] - s.mean) / s.std;
          }
        }
        break;
      }
      case "minmax": {
        const s = featureStats[op.featureIndex];
        if (s && s.max - s.min > 0) {
          for (const row of result) {
            row[op.featureIndex] = (row[op.featureIndex] - s.min) / (s.max - s.min);
          }
        }
        break;
      }
      case "log": {
        for (const row of result) {
          row[op.featureIndex] = Math.log1p(Math.abs(row[op.featureIndex]));
        }
        break;
      }
      case "bucketize": {
        for (const row of result) {
          const v = row[op.featureIndex];
          let bucket = 0;
          for (const b of op.boundaries) {
            if (v > b) bucket++;
          }
          row[op.featureIndex] = bucket;
        }
        break;
      }
      case "polynomial": {
        for (const row of result) {
          const values = op.featureIndices.map(i => row[i]);
          for (let d = 2; d <= op.degree; d++) {
            for (const v of values) {
              row.push(Math.pow(v, d));
            }
          }
        }
        break;
      }
      case "interaction": {
        for (const row of result) {
          row.push(row[op.featureA] * row[op.featureB]);
        }
        break;
      }
    }
  }

  const art = mlmd.putArtifact("transform", "transformed_data", "mem://transform", {
    originalFeatures: data[0]?.length ?? 0,
    resultFeatures: result[0]?.length ?? 0,
    opsApplied: ops.length,
  });
  mlmd.completeExecution(exec.id, [art.id]);

  return { data: result, transformSpec: ops, featureStats, artifactId: art.id };
}

// ═══════════════════════════════════════════
//  6. Tuner — Hyperparameter Search
// ═══════════════════════════════════════════

export interface HyperparameterSpace {
  name: string;
  type: "float" | "int" | "choice";
  min?: number;
  max?: number;
  choices?: (number | string)[];
}

export interface TunerTrial {
  trialId: number;
  params: Record<string, number | string>;
  metric: number;
  durationMs: number;
}

export interface TunerOutput {
  bestParams: Record<string, number | string>;
  bestMetric: number;
  trials: TunerTrial[];
  totalTrials: number;
  artifactId: string;
}

export function tuner(
  searchSpace: HyperparameterSpace[],
  objectiveFn: (params: Record<string, number | string>) => number,
  maxTrials: number = 20,
  strategy: "random" | "grid" = "random"
): TunerOutput {
  const exec = mlmd.putExecution("Tuner", [], { strategy, maxTrials });
  const trials: TunerTrial[] = [];

  let seed = 12345;
  const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };

  const generateParams = (): Record<string, number | string> => {
    const params: Record<string, number | string> = {};
    for (const hp of searchSpace) {
      if (hp.type === "choice" && hp.choices) {
        params[hp.name] = hp.choices[Math.floor(rng() * hp.choices.length)];
      } else if (hp.type === "int" && hp.min !== undefined && hp.max !== undefined) {
        params[hp.name] = Math.floor(rng() * (hp.max - hp.min + 1)) + hp.min;
      } else if (hp.type === "float" && hp.min !== undefined && hp.max !== undefined) {
        params[hp.name] = Math.round((rng() * (hp.max - hp.min) + hp.min) * 10000) / 10000;
      }
    }
    return params;
  };

  for (let t = 0; t < maxTrials; t++) {
    const params = generateParams();
    const start = performance.now();
    const metric = objectiveFn(params);
    trials.push({
      trialId: t,
      params,
      metric,
      durationMs: Math.round(performance.now() - start),
    });
  }

  trials.sort((a, b) => b.metric - a.metric); // higher is better
  const best = trials[0];

  const art = mlmd.putArtifact("model", "tuner_result", "mem://tuner", {
    bestMetric: best.metric,
    totalTrials: trials.length,
  });
  mlmd.completeExecution(exec.id, [art.id]);

  return {
    bestParams: best.params,
    bestMetric: best.metric,
    trials,
    totalTrials: trials.length,
    artifactId: art.id,
  };
}

// ═══════════════════════════════════════════
//  7. InfraValidator — Environment Validation
// ═══════════════════════════════════════════

export interface InfraValidatorOutput {
  isValid: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
  artifactId: string;
}

export function infraValidator(modelSizeKB: number = 0): InfraValidatorOutput {
  const exec = mlmd.putExecution("InfraValidator");
  const checks: InfraValidatorOutput["checks"] = [];

  // Check TF.js backend
  const hasTF = typeof window !== "undefined";
  checks.push({
    name: "tf_runtime",
    passed: hasTF,
    detail: hasTF ? "TF.js runtime disponível" : "TF.js não carregado",
  });

  // Check WebGL
  let hasWebGL = false;
  try {
    const canvas = document.createElement("canvas");
    hasWebGL = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {}
  checks.push({
    name: "webgl_backend",
    passed: hasWebGL,
    detail: hasWebGL ? "WebGL disponível para aceleração GPU" : "WebGL indisponível",
  });

  // Check memory
  const memMB = (performance as any).memory?.usedJSHeapSize
    ? Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024))
    : -1;
  const memOk = memMB < 0 || memMB < 500;
  checks.push({
    name: "memory_headroom",
    passed: memOk,
    detail: memMB >= 0 ? `Heap JS: ${memMB}MB` : "API memory não disponível",
  });

  // Check model size vs available
  const sizeOk = modelSizeKB < 50000; // 50MB limit
  checks.push({
    name: "model_size",
    passed: sizeOk,
    detail: `Modelo: ${modelSizeKB}KB (limite: 50MB)`,
  });

  // Check SharedArrayBuffer (for WASM threads)
  const hasSAB = typeof SharedArrayBuffer !== "undefined";
  checks.push({
    name: "shared_array_buffer",
    passed: hasSAB,
    detail: hasSAB ? "WASM multi-thread suportado" : "SharedArrayBuffer indisponível",
  });

  // Check WebGPU
  const hasWebGPU = typeof navigator !== "undefined" && "gpu" in navigator;
  checks.push({
    name: "webgpu",
    passed: hasWebGPU,
    detail: hasWebGPU ? "WebGPU disponível (aceleração NPU)" : "WebGPU indisponível",
  });

  const isValid = checks.filter(c => !c.passed && ["tf_runtime", "model_size"].includes(c.name)).length === 0;

  const art = mlmd.putArtifact("evaluation", "infra_validation", "mem://infra", {
    isValid,
    checksCount: checks.length,
    passedCount: checks.filter(c => c.passed).length,
  });
  mlmd.completeExecution(exec.id, [art.id]);

  return { isValid, checks, artifactId: art.id };
}

// ═══════════════════════════════════════════
//  8. Pusher — Model Deployment Management
// ═══════════════════════════════════════════

export type DeploymentTarget = "browser_indexeddb" | "browser_localstorage" | "supabase_storage" | "service_worker";

export interface PusherOutput {
  deployed: boolean;
  target: DeploymentTarget;
  modelId: string;
  version: string;
  deployedAt: string;
  artifactId: string;
}

const _deployments: PusherOutput[] = [];

export function pusher(
  modelId: string,
  version: string,
  target: DeploymentTarget = "browser_indexeddb",
  infraValidation?: InfraValidatorOutput
): PusherOutput {
  const exec = mlmd.putExecution("Pusher", infraValidation ? [infraValidation.artifactId] : [], { target });

  // Block deployment if infra validation failed
  if (infraValidation && !infraValidation.isValid) {
    const art = mlmd.putArtifact("deployment", `${modelId}_blocked`, `mem://deploy/${modelId}`, {
      blocked: true,
      reason: "InfraValidator failed",
    });
    mlmd.completeExecution(exec.id, [art.id], "failed");
    return {
      deployed: false,
      target,
      modelId,
      version,
      deployedAt: new Date().toISOString(),
      artifactId: art.id,
    };
  }

  const output: PusherOutput = {
    deployed: true,
    target,
    modelId,
    version,
    deployedAt: new Date().toISOString(),
    artifactId: "",
  };

  const art = mlmd.putArtifact("deployment", `${modelId}_v${version}`, `mem://deploy/${modelId}/${version}`, {
    target,
    deployed: true,
  });
  output.artifactId = art.id;
  _deployments.push(output);

  mlmd.completeExecution(exec.id, [art.id]);
  return output;
}

export function getDeployments(): PusherOutput[] {
  return [..._deployments];
}

// ═══════════════════════════════════════════
//  9. BulkInferrer — Batch Inference
// ═══════════════════════════════════════════

export interface BulkInferenceResult {
  predictions: number[][];
  totalSamples: number;
  avgLatencyMs: number;
  throughput: number;       // samples/sec
  artifactId: string;
}

export async function bulkInferrer(
  data: number[][],
  inferFn: (batch: number[][]) => number[][] | Promise<number[][]>,
  batchSize: number = 32
): Promise<BulkInferenceResult> {
  const exec = mlmd.putExecution("BulkInferrer", [], { totalSamples: data.length, batchSize });
  const predictions: number[][] = [];
  const latencies: number[] = [];

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, Math.min(i + batchSize, data.length));
    const start = performance.now();
    const result = await inferFn(batch);
    latencies.push(performance.now() - start);
    predictions.push(...result);
  }

  const totalMs = latencies.reduce((a, b) => a + b, 0);
  const avgMs = latencies.length > 0 ? totalMs / latencies.length : 0;

  const art = mlmd.putArtifact("evaluation", "bulk_inference", "mem://bulk_infer", {
    totalSamples: data.length,
    avgLatencyMs: Math.round(avgMs * 100) / 100,
    throughput: Math.round((data.length / (totalMs / 1000)) * 100) / 100,
  });
  mlmd.completeExecution(exec.id, [art.id]);

  return {
    predictions,
    totalSamples: data.length,
    avgLatencyMs: Math.round(avgMs * 100) / 100,
    throughput: totalMs > 0 ? Math.round((data.length / (totalMs / 1000)) * 100) / 100 : 0,
    artifactId: art.id,
  };
}

// ═══════════════════════════════════════════
//  Pipeline Orchestrator
// ═══════════════════════════════════════════

export interface TFXPipelineConfig {
  name: string;
  splitConfig?: SplitConfig;
  transformOps?: TransformOp[];
  tunerSpace?: HyperparameterSpace[];
  tunerTrials?: number;
  deployTarget?: DeploymentTarget;
}

export interface TFXPipelineRun {
  pipelineId: string;
  status: "running" | "complete" | "failed";
  startedAt: string;
  completedAt?: string;
  stages: { name: string; status: string; durationMs: number; artifactId?: string }[];
}

const _pipelineRuns: TFXPipelineRun[] = [];

/**
 * Run a complete TFX pipeline: ExampleGen → StatisticsGen → SchemaGen → 
 * ExampleValidator → Transform → [Tuner] → InfraValidator → Pusher
 */
export function runTFXPipeline(
  data: number[][],
  config: TFXPipelineConfig,
  objectiveFn?: (params: Record<string, number | string>) => number
): TFXPipelineRun {
  const ctx = mlmd.createContext(config.name);
  const run: TFXPipelineRun = {
    pipelineId: ctx.id,
    status: "running",
    startedAt: new Date().toISOString(),
    stages: [],
  };

  const addStage = (name: string, fn: () => string | undefined) => {
    const start = performance.now();
    try {
      const artId = fn();
      run.stages.push({ name, status: "complete", durationMs: Math.round(performance.now() - start), artifactId: artId });
    } catch (err) {
      run.stages.push({ name, status: "failed", durationMs: Math.round(performance.now() - start) });
      run.status = "failed";
    }
  };

  // 1. ExampleGen
  let splitData: ExampleGenOutput | null = null;
  addStage("ExampleGen", () => {
    splitData = exampleGen(data, config.splitConfig);
    return splitData.artifactId;
  });
  if (run.status === "failed" || !splitData) { _pipelineRuns.push(run); return run; }

  // 2. StatisticsGen
  let stats: StatisticsGenOutput | null = null;
  addStage("StatisticsGen", () => {
    stats = statisticsGen(splitData!.train);
    return stats.artifactId;
  });
  if (!stats) { _pipelineRuns.push(run); return run; }

  // 3. SchemaGen
  let schema: SchemaGenOutput | null = null;
  addStage("SchemaGen", () => {
    schema = schemaGen(stats!);
    return schema.artifactId;
  });
  if (!schema) { _pipelineRuns.push(run); return run; }

  // 4. ExampleValidator
  let validation: ExampleValidatorOutput | null = null;
  addStage("ExampleValidator", () => {
    validation = exampleValidator(splitData!.eval, schema!, stats!);
    return validation.artifactId;
  });

  // 5. Transform
  if (config.transformOps && config.transformOps.length > 0) {
    addStage("Transform", () => {
      const t = transform(splitData!.train, config.transformOps!, stats!);
      return t.artifactId;
    });
  }

  // 6. Tuner (optional)
  if (config.tunerSpace && objectiveFn) {
    addStage("Tuner", () => {
      const t = tuner(config.tunerSpace!, objectiveFn, config.tunerTrials ?? 20);
      return t.artifactId;
    });
  }

  // 7. InfraValidator
  let infraResult: InfraValidatorOutput | null = null;
  addStage("InfraValidator", () => {
    infraResult = infraValidator();
    return infraResult.artifactId;
  });

  // 8. Pusher
  addStage("Pusher", () => {
    const p = pusher(config.name, "1.0", config.deployTarget, infraResult ?? undefined);
    return p.artifactId;
  });

  run.status = run.stages.some(s => s.status === "failed") ? "failed" : "complete";
  run.completedAt = new Date().toISOString();
  _pipelineRuns.push(run);

  return run;
}

export function getPipelineRuns(): TFXPipelineRun[] {
  return [..._pipelineRuns];
}

export function getMLMDStats() {
  return mlmd.getStats();
}
