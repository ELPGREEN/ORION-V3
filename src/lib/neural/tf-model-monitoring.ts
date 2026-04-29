/**
 * ─── TF.js Model Monitoring & Data Governance ───
 * Production monitoring, performance tracking, data quality framework,
 * and experimentation/A/B testing infrastructure.
 * 
 * Ref: Sculley et al. (2015) — Hidden Technical Debt in ML Systems
 */

// ─── Types ───

export interface ModelMetricSnapshot {
  modelName: string;
  timestamp: number;
  accuracy: number;
  latencyMs: number;
  errorRate: number;
  sampleCount: number;
  memoryMB: number;
}

export interface PerformanceDegradation {
  modelName: string;
  metric: string;
  baseline: number;
  current: number;
  degradationPercent: number;
  severity: "minor" | "moderate" | "severe";
  detectedAt: string;
}

export interface DataQualityReport {
  timestamp: string;
  completeness: number;  // 0-1
  consistency: number;   // 0-1
  accuracy: number;      // 0-1
  validity: number;      // 0-1
  timeliness: number;    // 0-1
  overallScore: number;  // 0-1
  issues: DataQualityIssue[];
}

export interface DataQualityIssue {
  field: string;
  type: "missing" | "invalid" | "inconsistent" | "stale" | "duplicate";
  severity: "low" | "medium" | "high";
  count: number;
  description: string;
}

export interface Experiment {
  id: string;
  name: string;
  status: "draft" | "running" | "completed" | "cancelled";
  variants: ExperimentVariant[];
  startedAt: string | null;
  endedAt: string | null;
  winnerVariant: string | null;
  confidenceLevel: number;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number; // traffic percentage 0-1
  sampleCount: number;
  conversions: number;
  avgMetric: number;
  metrics: Record<string, number>;
}

export interface MonitoringState {
  totalSnapshots: number;
  totalDegradations: number;
  activeExperiments: number;
  completedExperiments: number;
  dataQualityScore: number;
  lastCheck: string | null;
}

// ─── State ───

const _snapshots: Map<string, ModelMetricSnapshot[]> = new Map();
const _baselines: Map<string, Record<string, number>> = new Map();
const _degradations: PerformanceDegradation[] = [];
const _experiments: Map<string, Experiment> = new Map();
const _movingAverages: Map<string, Map<string, number[]>> = new Map();
const _lastAlertTs: Map<string, Map<string, number>> = new Map();
let _lastDataQuality: DataQualityReport | null = null;

const MAX_SNAPSHOTS_PER_MODEL = 500;
const MAX_DEGRADATIONS = 1000;
const MAX_EXPERIMENTS = 100;
const MOVING_AVERAGE_WINDOW = 10;
const ALERT_COOLDOWN_MS = 600_000; // 10 minutes

/** Get monitoring state */
export function getMonitoringState(): MonitoringState {
  let totalSnapshots = 0;
  for (const [, snaps] of _snapshots) totalSnapshots += snaps.length;

  return {
    totalSnapshots,
    totalDegradations: _degradations.length,
    activeExperiments: Array.from(_experiments.values()).filter(e => e.status === "running").length,
    completedExperiments: Array.from(_experiments.values()).filter(e => e.status === "completed").length,
    dataQualityScore: _lastDataQuality?.overallScore ?? 0,
    lastCheck: _lastDataQuality?.timestamp ?? null,
  };
}

/** Record a model performance snapshot */
export function recordSnapshot(snapshot: ModelMetricSnapshot): void {
  if (!_snapshots.has(snapshot.modelName)) _snapshots.set(snapshot.modelName, []);
  const snaps = _snapshots.get(snapshot.modelName)!;
  snaps.push(snapshot);
  if (snaps.length > MAX_SNAPSHOTS_PER_MODEL) {
    _snapshots.set(snapshot.modelName, snaps.slice(-MAX_SNAPSHOTS_PER_MODEL));
  }
}

/** Set a performance baseline for a model */
export function setBaseline(modelName: string, metrics: Record<string, number>): void {
  _baselines.set(modelName, { ...metrics });
}

/**
 * Manually or automatically update the baseline if a new normal is detected.
 * This prevents persistent alerts when environment conditions change permanently.
 */
export function maybeRebaseline(modelName: string, newMetrics: Record<string, number>): void {
  const currentBaseline = _baselines.get(modelName) || {};
  _baselines.set(modelName, { ...currentBaseline, ...newMetrics });
  // Clear moving averages for this model to start fresh
  _movingAverages.delete(modelName);
  console.log(`[tf-model-monitoring] Re-baselined ${modelName}:`, newMetrics);
}

/** Check for performance degradation against baseline with moving average smoothing and alert cooldowns */
export function checkDegradation(
  modelName: string,
  currentMetrics: Record<string, number>,
  thresholdPercent: number = 10
): PerformanceDegradation[] {
  const baseline = _baselines.get(modelName);
  if (!baseline) return [];

  const degradations: PerformanceDegradation[] = [];
  const now = Date.now();

  // Initialize model state if missing
  if (!_movingAverages.has(modelName)) _movingAverages.set(modelName, new Map());
  if (!_lastAlertTs.has(modelName)) _lastAlertTs.set(modelName, new Map());

  const modelAverages = _movingAverages.get(modelName)!;
  const modelAlerts = _lastAlertTs.get(modelName)!;

  for (const [metric, baselineValue] of Object.entries(baseline)) {
    const rawCurrent = currentMetrics[metric];
    if (rawCurrent === undefined || baselineValue === 0) continue;

    // 1. Update Moving Average
    if (!modelAverages.has(metric)) modelAverages.set(metric, []);
    const window = modelAverages.get(metric)!;
    window.push(rawCurrent);
    if (window.length > MOVING_AVERAGE_WINDOW) window.shift();

    const currentAvg = window.reduce((a, b) => a + b, 0) / window.length;

    // 2. Check for Degradation using smoothed value
    const isHigherBetter = ["accuracy", "precision", "recall", "f1"].includes(metric);
    const degradation = isHigherBetter
      ? ((baselineValue - currentAvg) / baselineValue) * 100
      : ((currentAvg - baselineValue) / baselineValue) * 100;

    if (degradation > thresholdPercent) {
      // 3. Apply Alert Cooldown
      const lastAlert = modelAlerts.get(metric) || 0;
      if (now - lastAlert < ALERT_COOLDOWN_MS) {
        continue; // Still on cooldown for this metric
      }

      const severity: PerformanceDegradation["severity"] =
        degradation > 30 ? "severe" : degradation > 15 ? "moderate" : "minor";

      const entry: PerformanceDegradation = {
        modelName,
        metric,
        baseline: baselineValue,
        current: Math.round(currentAvg * 100) / 100,
        degradationPercent: Math.round(degradation * 100) / 100,
        severity,
        detectedAt: new Date().toISOString(),
      };

      degradations.push(entry);
      _degradations.push(entry);
      modelAlerts.set(metric, now);

      if (_degradations.length > MAX_DEGRADATIONS) {
        _degradations.shift();
      }
    }
  }

  return degradations;
}

/** Run data quality assessment */
export function assessDataQuality(
  data: Record<string, unknown>[],
  schema: { required?: string[]; types?: Record<string, string>; maxAgeMs?: number } = {}
): DataQualityReport {
  const issues: DataQualityIssue[] = [];
  const { required = [], types = {}, maxAgeMs = 86_400_000 } = schema;

  // Completeness
  let missingCount = 0;
  let totalFields = 0;
  for (const row of data) {
    for (const field of required) {
      totalFields++;
      if (row[field] === null || row[field] === undefined || row[field] === "") {
        missingCount++;
      }
    }
  }
  const completeness = totalFields > 0 ? 1 - missingCount / totalFields : 1;
  if (missingCount > 0) {
    issues.push({ field: "required_fields", type: "missing", severity: missingCount > data.length ? "high" : "medium", count: missingCount, description: `${missingCount} missing required values` });
  }

  // Validity
  let invalidCount = 0;
  for (const row of data) {
    for (const [field, expectedType] of Object.entries(types)) {
      if (row[field] !== undefined && typeof row[field] !== expectedType) invalidCount++;
    }
  }
  const validity = data.length > 0 ? 1 - invalidCount / (data.length * Object.keys(types).length || 1) : 1;

  // Consistency (check for duplicate IDs)
  const ids = data.map(d => (d as any).id).filter(Boolean);
  const uniqueIds = new Set(ids);
  const duplicateCount = ids.length - uniqueIds.size;
  const consistency = ids.length > 0 ? 1 - duplicateCount / ids.length : 1;
  if (duplicateCount > 0) {
    issues.push({ field: "id", type: "duplicate", severity: "high", count: duplicateCount, description: `${duplicateCount} duplicate IDs detected` });
  }

  // Timeliness
  const timestamps = data.map(d => new Date((d as any).timestamp || (d as any).created_at || 0).getTime()).filter(t => t > 0);
  const staleCount = timestamps.filter(t => Date.now() - t > maxAgeMs).length;
  const timeliness = timestamps.length > 0 ? 1 - staleCount / timestamps.length : 0.5;

  const accuracy = Math.max(0, 1 - invalidCount / Math.max(data.length, 1));
  const overallScore = (completeness * 0.3 + consistency * 0.25 + validity * 0.2 + accuracy * 0.15 + timeliness * 0.1);

  const report: DataQualityReport = {
    timestamp: new Date().toISOString(),
    completeness: Math.round(completeness * 1000) / 1000,
    consistency: Math.round(consistency * 1000) / 1000,
    accuracy: Math.round(accuracy * 1000) / 1000,
    validity: Math.round(validity * 1000) / 1000,
    timeliness: Math.round(timeliness * 1000) / 1000,
    overallScore: Math.round(overallScore * 1000) / 1000,
    issues,
  };

  _lastDataQuality = report;
  return report;
}

/** Create a new A/B experiment */
export function createExperiment(name: string, variantNames: string[], weights?: number[]): Experiment {
  // Cap experiments map
  if (_experiments.size >= MAX_EXPERIMENTS) {
    const oldestId = _experiments.keys().next().value;
    if (oldestId) _experiments.delete(oldestId);
  }

  const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const defaultWeight = 1 / variantNames.length;

  const experiment: Experiment = {
    id,
    name,
    status: "draft",
    variants: variantNames.map((n, i) => ({
      id: `var_${i}`,
      name: n,
      weight: weights?.[i] ?? defaultWeight,
      sampleCount: 0,
      conversions: 0,
      avgMetric: 0,
      metrics: {},
    })),
    startedAt: null,
    endedAt: null,
    winnerVariant: null,
    confidenceLevel: 0,
  };

  _experiments.set(id, experiment);
  return experiment;
}

/** Start an experiment */
export function startExperiment(experimentId: string): boolean {
  const exp = _experiments.get(experimentId);
  if (!exp || exp.status !== "draft") return false;
  exp.status = "running";
  exp.startedAt = new Date().toISOString();
  return true;
}

/** Record a conversion for an experiment variant */
export function recordExperimentEvent(
  experimentId: string,
  variantId: string,
  converted: boolean,
  metricValue?: number
): boolean {
  const exp = _experiments.get(experimentId);
  if (!exp || exp.status !== "running") return false;
  const variant = exp.variants.find(v => v.id === variantId);
  if (!variant) return false;

  variant.sampleCount++;
  if (converted) variant.conversions++;
  if (metricValue !== undefined) {
    variant.avgMetric = (variant.avgMetric * (variant.sampleCount - 1) + metricValue) / variant.sampleCount;
  }
  return true;
}

/** Evaluate experiment results using simple Z-test */
export function evaluateExperiment(experimentId: string): Experiment | null {
  const exp = _experiments.get(experimentId);
  if (!exp) return null;

  // Need a control variant (var_0) and at least one challenger with enough samples
  const control = exp.variants.find(v => v.id === "var_0");
  if (!control || control.sampleCount < 30) return exp;

  const validChallengers = exp.variants.filter(v => v.id !== "var_0" && v.sampleCount >= 30);
  if (validChallengers.length === 0) return exp;

  // Find best challenger
  let bestChallenger = validChallengers[0];
  for (const v of validChallengers) {
    const vRate = v.conversions / v.sampleCount;
    const bestRate = bestChallenger.conversions / bestChallenger.sampleCount;
    if (vRate > bestRate) bestChallenger = v;
  }

  const p1 = bestChallenger.conversions / bestChallenger.sampleCount;
  const p0 = control.conversions / control.sampleCount;

  if (p1 <= p0) {
    exp.winnerVariant = control.id;
    exp.confidenceLevel = 0;
    return exp;
  }

  // Z-test for statistical significance (one-tailed: is challenger significantly better than control?)
  const pPooled = (bestChallenger.conversions + control.conversions) / (bestChallenger.sampleCount + control.sampleCount);
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / bestChallenger.sampleCount + 1 / control.sampleCount)) || 0.001;
  const zScore = (p1 - p0) / se;

  // Z > 1.645 = 90%, Z > 1.96 = 95%, Z > 2.576 = 99%
  exp.confidenceLevel = Math.min(0.99, zScore > 2.576 ? 0.99 : zScore > 1.96 ? 0.95 : zScore > 1.645 ? 0.90 : Math.max(0, zScore / 1.96 * 0.85));

  if (exp.confidenceLevel >= 0.95) {
    exp.winnerVariant = bestChallenger.id;
  } else {
    exp.winnerVariant = control.id;
  }

  return exp;
}

/** Complete an experiment */
export function completeExperiment(experimentId: string): boolean {
  const exp = _experiments.get(experimentId);
  if (!exp || exp.status !== "running") return false;
  evaluateExperiment(experimentId);
  exp.status = "completed";
  exp.endedAt = new Date().toISOString();
  return true;
}

/** Get experiment by ID */
export function getExperiment(experimentId: string): Experiment | null {
  return _experiments.get(experimentId) ?? null;
}

/** Get all experiments */
export function getAllExperiments(): Experiment[] {
  return Array.from(_experiments.values());
}

/** Get degradation history */
export function getDegradationHistory(): PerformanceDegradation[] {
  return [..._degradations];
}

/** Get latest data quality report */
export function getLatestDataQualityReport(): DataQualityReport | null {
  return _lastDataQuality;
}
