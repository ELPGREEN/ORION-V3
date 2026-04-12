/**
 * ─── TF.js MLOps Pipeline ───
 * TFX-inspired model lifecycle management: validation, monitoring,
 * drift detection, and automated retraining triggers.
 * 
 * Now integrated with full TFX pipeline components (tfx-pipeline-components.ts):
 *   ExampleGen → StatisticsGen → SchemaGen → ExampleValidator →
 *   Transform → Tuner → InfraValidator → Pusher + ML Metadata (MLMD)
 * 
 * Ref: Baylor et al. (2017) — TFX: A TensorFlow-Based Production-Scale ML Platform
 *      Google TFX Guide (tensorflow.org/tfx/guide)
 */

// Re-export all TFX pipeline components for unified access
export {
  exampleGen,
  statisticsGen,
  schemaGen,
  exampleValidator,
  transform,
  tuner,
  infraValidator,
  pusher,
  bulkInferrer,
  runTFXPipeline,
  getPipelineRuns,
  getMLMDStats,
  mlmd,
  type ExampleGenOutput,
  type StatisticsGenOutput,
  type SchemaGenOutput,
  type ExampleValidatorOutput,
  type TransformOutput,
  type TunerOutput,
  type InfraValidatorOutput,
  type PusherOutput,
  type BulkInferenceResult,
  type TFXPipelineConfig,
  type TFXPipelineRun,
  type MLArtifact,
  type MLExecution,
} from "./tfx-pipeline-components";

// ─── Types ───

export interface DataValidationResult {
  isValid: boolean;
  totalSamples: number;
  missingValues: number;
  outOfRangeValues: number;
  duplicates: number;
  schemaViolations: string[];
  distributionSkew: number;
}

export interface ModelValidationResult {
  isValid: boolean;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  latencyMs: number;
  modelSizeKB: number;
  meetsThreshold: boolean;
}

export interface DriftReport {
  hasDrift: boolean;
  driftScore: number; // 0-1
  driftType: "none" | "gradual" | "sudden" | "recurring";
  affectedFeatures: string[];
  recommendation: "none" | "monitor" | "retrain" | "alert";
  detectedAt: string;
}

export interface ModelLifecycleEntry {
  id: string;
  modelName: string;
  version: string;
  status: "training" | "validating" | "staging" | "production" | "retired" | "failed";
  createdAt: string;
  metrics: Record<string, number>;
  dataValidation: DataValidationResult | null;
  modelValidation: ModelValidationResult | null;
}

export interface MLOpsPipelineState {
  totalModelsManaged: number;
  activeModels: number;
  totalDriftsDetected: number;
  totalRetrains: number;
  lastDriftCheck: string | null;
  pipelineHealth: "healthy" | "degraded" | "critical";
}

// ─── State ───

const _registry: ModelLifecycleEntry[] = [];
const _driftHistory: DriftReport[] = [];
let _referenceDistribution: Map<string, number[]> = new Map();
let _state: MLOpsPipelineState = {
  totalModelsManaged: 0,
  activeModels: 0,
  totalDriftsDetected: 0,
  totalRetrains: 0,
  lastDriftCheck: null,
  pipelineHealth: "healthy",
};

/** Get pipeline state */
export function getMLOpsState(): MLOpsPipelineState {
  return {
    ..._state,
    totalModelsManaged: _registry.length,
    activeModels: _registry.filter(m => m.status === "production").length,
  };
}

/** Validate a dataset before training */
export function validateData(
  data: number[][],
  schema: { minValue?: number; maxValue?: number; expectedDim?: number } = {}
): DataValidationResult {
  const { minValue = -Infinity, maxValue = Infinity, expectedDim } = schema;
  let missingValues = 0;
  let outOfRange = 0;
  let violations: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (expectedDim && row.length !== expectedDim) {
      violations.push(`Row ${i}: expected ${expectedDim} features, got ${row.length}`);
    }
    for (const val of row) {
      if (val === null || val === undefined || isNaN(val)) missingValues++;
      if (val < minValue || val > maxValue) outOfRange++;
    }
  }

  // Detect duplicates (hash-based)
  const hashes = new Set<string>();
  let duplicates = 0;
  for (const row of data) {
    const h = row.join(",");
    if (hashes.has(h)) duplicates++;
    else hashes.add(h);
  }

  // Distribution skew (simplified: use mean/median ratio of first feature)
  const firstFeature = data.map(r => r[0] ?? 0).sort((a, b) => a - b);
  const mean = firstFeature.reduce((a, b) => a + b, 0) / firstFeature.length;
  const median = firstFeature[Math.floor(firstFeature.length / 2)] ?? 0;
  const skew = median !== 0 ? Math.abs((mean - median) / median) : 0;

  return {
    isValid: missingValues === 0 && violations.length === 0 && outOfRange < data.length * 0.05,
    totalSamples: data.length,
    missingValues,
    outOfRangeValues: outOfRange,
    duplicates,
    schemaViolations: violations,
    distributionSkew: skew,
  };
}

/** Validate model performance metrics */
export function validateModel(
  metrics: { accuracy: number; precision: number; recall: number; latencyMs: number; modelSizeKB: number },
  thresholds: { minAccuracy?: number; maxLatencyMs?: number; maxSizeKB?: number } = {}
): ModelValidationResult {
  const { minAccuracy = 0.7, maxLatencyMs = 500, maxSizeKB = 10240 } = thresholds;
  const f1 = metrics.precision + metrics.recall > 0
    ? (2 * metrics.precision * metrics.recall) / (metrics.precision + metrics.recall)
    : 0;

  return {
    isValid: true,
    accuracy: metrics.accuracy,
    precision: metrics.precision,
    recall: metrics.recall,
    f1Score: f1,
    latencyMs: metrics.latencyMs,
    modelSizeKB: metrics.modelSizeKB,
    meetsThreshold: metrics.accuracy >= minAccuracy && metrics.latencyMs <= maxLatencyMs && metrics.modelSizeKB <= maxSizeKB,
  };
}

/** Set reference distribution for drift detection */
export function setReferenceDistribution(featureName: string, values: number[]): void {
  _referenceDistribution.set(featureName, [...values]);
}

/** Detect data drift using Population Stability Index (PSI) */
export function detectDrift(featureName: string, currentValues: number[]): DriftReport {
  const refValues = _referenceDistribution.get(featureName);
  if (!refValues || refValues.length < 10 || currentValues.length < 10) {
    return { hasDrift: false, driftScore: 0, driftType: "none", affectedFeatures: [], recommendation: "none", detectedAt: new Date().toISOString() };
  }

  // Calculate PSI (Population Stability Index)
  const numBins = 10;
  const allValues = [...refValues, ...currentValues];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const binWidth = (max - min) / numBins || 1;

  const refHist = new Array(numBins).fill(0);
  const curHist = new Array(numBins).fill(0);

  for (const v of refValues) {
    const bin = Math.min(Math.floor((v - min) / binWidth), numBins - 1);
    refHist[bin]++;
  }
  for (const v of currentValues) {
    const bin = Math.min(Math.floor((v - min) / binWidth), numBins - 1);
    curHist[bin]++;
  }

  // Normalize to proportions
  const refTotal = refValues.length;
  const curTotal = currentValues.length;
  let psi = 0;
  for (let i = 0; i < numBins; i++) {
    const refP = Math.max(refHist[i] / refTotal, 0.0001);
    const curP = Math.max(curHist[i] / curTotal, 0.0001);
    psi += (curP - refP) * Math.log(curP / refP);
  }

  const driftScore = Math.min(1, psi);
  const hasDrift = psi > 0.1;
  const driftType: DriftReport["driftType"] = psi > 0.25 ? "sudden" : psi > 0.1 ? "gradual" : "none";
  const recommendation: DriftReport["recommendation"] = psi > 0.25 ? "retrain" : psi > 0.1 ? "monitor" : "none";

  const report: DriftReport = {
    hasDrift,
    driftScore,
    driftType,
    affectedFeatures: hasDrift ? [featureName] : [],
    recommendation,
    detectedAt: new Date().toISOString(),
  };

  if (hasDrift) {
    _state.totalDriftsDetected++;
    _driftHistory.push(report);
  }
  _state.lastDriftCheck = report.detectedAt;

  return report;
}

/** Register a model in the lifecycle registry */
export function registerModel(
  modelName: string,
  version: string,
  metrics: Record<string, number>
): ModelLifecycleEntry {
  const entry: ModelLifecycleEntry = {
    id: `${modelName}_${version}_${Date.now()}`,
    modelName,
    version,
    status: "staging",
    createdAt: new Date().toISOString(),
    metrics,
    dataValidation: null,
    modelValidation: null,
  };
  _registry.push(entry);
  return entry;
}

/** Promote a model to production */
export function promoteModel(modelId: string): boolean {
  const entry = _registry.find(m => m.id === modelId);
  if (!entry || entry.status === "failed") return false;
  // Retire old production models of same name
  for (const m of _registry) {
    if (m.modelName === entry.modelName && m.status === "production") {
      m.status = "retired";
    }
  }
  entry.status = "production";
  return true;
}

/** Get drift history */
export function getDriftHistory(): DriftReport[] {
  return [..._driftHistory];
}

/** Get all registered models */
export function getModelRegistry(): ModelLifecycleEntry[] {
  return [..._registry];
}

/** Update pipeline health based on current state */
export function evaluatePipelineHealth(): MLOpsPipelineState {
  const recentDrifts = _driftHistory.filter(d => Date.now() - new Date(d.detectedAt).getTime() < 3_600_000).length;
  _state.pipelineHealth = recentDrifts > 5 ? "critical" : recentDrifts > 2 ? "degraded" : "healthy";
  return getMLOpsState();
}
