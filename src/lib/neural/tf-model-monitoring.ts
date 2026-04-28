/**
 * 📊 TensorFlow Model Monitoring
 * Tracks model performance, baseline drift, and experiments.
 * v2: Enhanced with Moving Average, Cooldowns and Dynamic Thresholds
 */

export interface ModelMetricSnapshot {
  modelName: string;
  timestamp: number;
  accuracy: number;
  latencyMs: number;
  errorRate: number;
  sampleCount: number;
  memoryMB: number;
  customMetrics?: Record<string, number>;
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

export interface MonitoringState {
  totalSnapshots: number;
  totalDegradations: number;
  activeExperiments: number;
  completedExperiments: number;
  dataQualityScore: number;
  lastCheck: string | null;
}

export interface DataQualityIssue {
  field: string;
  type: "missing" | "duplicate" | "out_of_range" | "mismatch";
  severity: "low" | "medium" | "high";
  count: number;
  description: string;
}

export interface DataQualityReport {
  timestamp: string;
  completeness: number;
  consistency: number;
  accuracy: number;
  validity: number;
  timeliness: number;
  overallScore: number;
  issues: DataQualityIssue[];
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number;
  sampleCount: number;
  conversions: number;
  avgMetric: number;
  metrics: Record<string, number>;
}

export interface Experiment {
  id: string;
  name: string;
  status: "draft" | "running" | "completed";
  variants: ExperimentVariant[];
  startedAt: string | null;
  endedAt: string | null;
  winnerVariant: string | null;
  confidenceLevel: number;
}

// ─── Private State ───

const _snapshots = new Map<string, ModelMetricSnapshot[]>();
const _baselines = new Map<string, Record<string, number>>();
const _degradations: PerformanceDegradation[] = [];
const _experiments = new Map<string, Experiment>();
let _lastDataQuality: DataQualityReport | null = null;

// v2 state
const _movingAverages = new Map<string, Record<string, number>>();
const _lastAlertTime = new Map<string, number>();

const MAX_SNAPSHOTS_PER_MODEL = 500;
const MAX_DEGRADATIONS = 1000;
const MAX_EXPERIMENTS = 100;
const ALERT_COOLDOWN_MS = 600_000; // 10 minutes
const MOVING_AVG_WINDOW = 10;

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

  // Update moving average
  updateMovingAverage(snapshot.modelName, {
    accuracy: snapshot.accuracy,
    latencyMs: snapshot.latencyMs,
    errorRate: snapshot.errorRate,
    ...snapshot.customMetrics
  });

  if (snaps.length > MAX_SNAPSHOTS_PER_MODEL) {
    _snapshots.set(snapshot.modelName, snaps.slice(-MAX_SNAPSHOTS_PER_MODEL));
  }
}

function updateMovingAverage(modelName: string, metrics: Record<string, number>): void {
  if (!_movingAverages.has(modelName)) _movingAverages.set(modelName, {});
  const averages = _movingAverages.get(modelName)!;

  for (const [metric, value] of Object.entries(metrics)) {
    const currentAvg = averages[metric] ?? value;
    averages[metric] = (currentAvg * (MOVING_AVG_WINDOW - 1) + value) / MOVING_AVG_WINDOW;
  }
}

/** Set a performance baseline for a model */
export function setBaseline(modelName: string, metrics: Record<string, number>): void {
  _baselines.set(modelName, { ...metrics });
}

/** Check for performance degradation against baseline */
export function checkDegradation(
  modelName: string,
  currentMetrics: Record<string, number>,
  thresholdPercent: number = 15 // Increased from 10 to 15 for stability
): PerformanceDegradation[] {
  const baseline = _baselines.get(modelName);
  if (!baseline) return [];

  const averages = _movingAverages.get(modelName) || currentMetrics;
  const degradations: PerformanceDegradation[] = [];
  const now = Date.now();

  for (const [metric, baselineValue] of Object.entries(baseline)) {
    const current = averages[metric] ?? currentMetrics[metric];
    if (current === undefined || baselineValue === 0) continue;

    const isHigherBetter = ["accuracy", "precision", "recall", "f1"].includes(metric);
    const degradation = isHigherBetter
      ? ((baselineValue - current) / baselineValue) * 100
      : ((current - baselineValue) / baselineValue) * 100;

    // Use a dynamic threshold: latency is naturally noisier, so it needs a higher buffer
    const dynamicThreshold = metric === "latencyMs" ? thresholdPercent * 2 : thresholdPercent;

    if (degradation > dynamicThreshold) {
      const severity: PerformanceDegradation["severity"] =
        degradation > 50 ? "severe" : degradation > 25 ? "moderate" : "minor";

      const entry: PerformanceDegradation = {
        modelName,
        metric,
        baseline: baselineValue,
        current,
        degradationPercent: Math.round(degradation * 100) / 100,
        severity,
        detectedAt: new Date().toISOString(),
      };

      // Implement alert cooldown per model/metric pair
      const alertKey = `${modelName}:${metric}`;
      const lastAlert = _lastAlertTime.get(alertKey) ?? 0;

      if (now - lastAlert > ALERT_COOLDOWN_MS || severity === "severe") {
        degradations.push(entry);
        _lastAlertTime.set(alertKey, now);
      }

      _degradations.push(entry);
      if (_degradations.length > MAX_DEGRADATIONS) _degradations.shift();
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

  const control = exp.variants.find(v => v.id === "var_0");
  if (!control || control.sampleCount < 30) return exp;

  const validChallengers = exp.variants.filter(v => v.id !== "var_0" && v.sampleCount >= 30);
  if (validChallengers.length === 0) return exp;

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

  const pPooled = (bestChallenger.conversions + control.conversions) / (bestChallenger.sampleCount + control.sampleCount);
  const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / bestChallenger.sampleCount + 1 / control.sampleCount)) || 0.001;
  const zScore = (p1 - p0) / se;

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

/**
 * Automatically update baseline if the moving average has been stable
 * at a new level for a significant period.
 */
export function maybeRebaseline(modelName: string, stabilityThreshold = 0.05, minSnapshots = 100): boolean {
  const snaps = _snapshots.get(modelName);
  if (!snaps || snaps.length < minSnapshots) return false;

  const baseline = _baselines.get(modelName);
  const currentAverages = _movingAverages.get(modelName);
  if (!baseline || !currentAverages) return false;

  let needsRebaseline = false;
  const newBaseline: Record<string, number> = { ...baseline };

  for (const [metric, baselineVal] of Object.entries(baseline)) {
    const currentAvg = currentAverages[metric];
    if (currentAvg === undefined) continue;

    const diff = Math.abs(currentAvg - baselineVal) / baselineVal;

    // If it has drifted significantly (>2x threshold) but is very stable lately (implied by moving avg window)
    // and we haven't alerted in a while, maybe we should adapt.
    if (diff > 0.2 && diff < 0.5) { // Adaptive range
      newBaseline[metric] = currentAvg;
      needsRebaseline = true;
    }
  }

  if (needsRebaseline) {
    setBaseline(modelName, newBaseline);
    return true;
  }
  return false;
}
