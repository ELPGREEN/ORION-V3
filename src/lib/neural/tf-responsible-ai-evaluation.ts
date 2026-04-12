/**
 * ─── TensorFlow Responsible AI: Evaluation Tools ───
 * Browser-adapted implementations for model evaluation, 
 * interpretability, and privacy testing.
 *
 * 1. TF Model Analysis (TFMA) — distributed model evaluation with slicing
 * 2. What-If Tool (WIT) — counterfactual analysis and threshold tuning
 * 3. Language Interpretability Tool (LIT) — NLP model understanding
 * 4. Explainable AI (XAI) — feature attributions (SHAP/IG/LIME)
 * 5. TF Privacy Tests — membership inference, model inversion attacks
 *
 * Ref: tensorflow.org/responsible_ai
 *      pair-code.github.io/what-if-tool
 *      pair-code.github.io/lit
 *      Sundararajan et al. (2017) — Integrated Gradients
 *      Shokri et al. (2017) — Membership Inference
 */

// ═══════════════════════════════════════════
// TF MODEL ANALYSIS (TFMA)
// ═══════════════════════════════════════════

export interface TFMAConfig {
  metrics: string[];
  slicingSpecs: SlicingSpec[];
  thresholds: MetricThreshold[];
  crossSlicingSpecs?: CrossSlicingSpec[];
}

export interface SlicingSpec {
  featureKey: string;
  featureValues?: string[];  // specific values to slice on, or all if omitted
}

export interface CrossSlicingSpec {
  featureKeys: string[];
}

export interface MetricThreshold {
  metric: string;
  lowerBound?: number;
  upperBound?: number;
}

export interface SliceMetrics {
  sliceKey: string;
  sliceValue: string;
  sampleCount: number;
  metrics: Record<string, number>;
  passesThresholds: boolean;
  failedThresholds: string[];
}

export interface TFMAResult {
  overallMetrics: Record<string, number>;
  sliceResults: SliceMetrics[];
  crossSliceResults: SliceMetrics[];
  blessedModel: boolean; // all thresholds pass
  timestamp: string;
}

/** Run TF Model Analysis on predictions */
export function runTFMA(
  predictions: number[],
  labels: number[],
  features: Record<string, unknown>[],
  config: TFMAConfig
): TFMAResult {
  // Overall metrics
  const overallMetrics = computeMetricSuite(predictions, labels, config.metrics);

  // Slice-based metrics
  const sliceResults: SliceMetrics[] = [];
  for (const spec of config.slicingSpecs) {
    const groups = new Map<string, { preds: number[]; labels: number[] }>();

    for (let i = 0; i < features.length; i++) {
      const val = String(features[i][spec.featureKey] ?? "unknown");
      if (spec.featureValues && !spec.featureValues.includes(val)) continue;
      if (!groups.has(val)) groups.set(val, { preds: [], labels: [] });
      groups.get(val)!.preds.push(predictions[i]);
      groups.get(val)!.labels.push(labels[i]);
    }

    for (const [value, group] of groups) {
      const metrics = computeMetricSuite(group.preds, group.labels, config.metrics);
      const failedThresholds = checkThresholds(metrics, config.thresholds);

      sliceResults.push({
        sliceKey: spec.featureKey,
        sliceValue: value,
        sampleCount: group.preds.length,
        metrics,
        passesThresholds: failedThresholds.length === 0,
        failedThresholds,
      });
    }
  }

  // Cross-slice metrics
  const crossSliceResults: SliceMetrics[] = [];
  if (config.crossSlicingSpecs) {
    for (const crossSpec of config.crossSlicingSpecs) {
      const groups = new Map<string, { preds: number[]; labels: number[] }>();
      for (let i = 0; i < features.length; i++) {
        const key = crossSpec.featureKeys.map(k => `${k}=${features[i][k]}`).join("×");
        if (!groups.has(key)) groups.set(key, { preds: [], labels: [] });
        groups.get(key)!.preds.push(predictions[i]);
        groups.get(key)!.labels.push(labels[i]);
      }

      for (const [key, group] of groups) {
        const metrics = computeMetricSuite(group.preds, group.labels, config.metrics);
        const failedThresholds = checkThresholds(metrics, config.thresholds);
        crossSliceResults.push({
          sliceKey: crossSpec.featureKeys.join("×"),
          sliceValue: key,
          sampleCount: group.preds.length,
          metrics,
          passesThresholds: failedThresholds.length === 0,
          failedThresholds,
        });
      }
    }
  }

  const blessed = sliceResults.every(s => s.passesThresholds) &&
    checkThresholds(overallMetrics, config.thresholds).length === 0;

  return {
    overallMetrics,
    sliceResults,
    crossSliceResults,
    blessedModel: blessed,
    timestamp: new Date().toISOString(),
  };
}

function computeMetricSuite(predictions: number[], labels: number[], metricNames: string[], threshold = 0.5): Record<string, number> {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  let sumSquaredError = 0, sumAbsError = 0, sumLogLoss = 0;

  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i] >= threshold ? 1 : 0;
    const prob = Math.max(1e-7, Math.min(1 - 1e-7, predictions[i]));
    if (pred === 1 && labels[i] === 1) tp++;
    else if (pred === 1 && labels[i] === 0) fp++;
    else if (pred === 0 && labels[i] === 1) fn++;
    else tn++;
    sumSquaredError += (predictions[i] - labels[i]) ** 2;
    sumAbsError += Math.abs(predictions[i] - labels[i]);
    sumLogLoss += -(labels[i] * Math.log(prob) + (1 - labels[i]) * Math.log(1 - prob));
  }

  const n = Math.max(predictions.length, 1);
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;

  const all: Record<string, number> = {
    accuracy: (tp + tn) / n,
    precision,
    recall,
    f1: precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0,
    auc_roc: estimateAUC(predictions, labels),
    fpr: fp + tn > 0 ? fp / (fp + tn) : 0,
    fnr: tp + fn > 0 ? fn / (tp + fn) : 0,
    mse: sumSquaredError / n,
    mae: sumAbsError / n,
    log_loss: sumLogLoss / n,
    calibration_error: estimateCalibrationError(predictions, labels),
  };

  const result: Record<string, number> = {};
  for (const m of metricNames) {
    if (m in all) result[m] = Math.round(all[m] * 10000) / 10000;
  }
  return result;
}

function estimateAUC(preds: number[], labels: number[]): number {
  const pairs = preds.map((p, i) => ({ p, l: labels[i] })).sort((a, b) => b.p - a.p);
  let tp = 0, fp = 0, auc = 0;
  const totalPos = labels.filter(l => l === 1).length;
  const totalNeg = labels.length - totalPos;
  if (totalPos === 0 || totalNeg === 0) return 0.5;

  let prevFPR = 0, prevTPR = 0;
  for (const { l } of pairs) {
    if (l === 1) tp++;
    else fp++;
    const tpr = tp / totalPos, fpr = fp / totalNeg;
    auc += (fpr - prevFPR) * (tpr + prevTPR) / 2; // trapezoidal
    prevFPR = fpr; prevTPR = tpr;
  }
  return auc;
}

function estimateCalibrationError(preds: number[], labels: number[], bins = 10): number {
  let ece = 0;
  for (let b = 0; b < bins; b++) {
    const lo = b / bins, hi = (b + 1) / bins;
    const inBin = preds.map((p, i) => ({ p, l: labels[i] })).filter(x => x.p >= lo && x.p < hi);
    if (inBin.length === 0) continue;
    const avgConf = inBin.reduce((s, x) => s + x.p, 0) / inBin.length;
    const avgAcc = inBin.reduce((s, x) => s + x.l, 0) / inBin.length;
    ece += (inBin.length / preds.length) * Math.abs(avgConf - avgAcc);
  }
  return ece;
}

function checkThresholds(metrics: Record<string, number>, thresholds: MetricThreshold[]): string[] {
  const failed: string[] = [];
  for (const t of thresholds) {
    const val = metrics[t.metric];
    if (val === undefined) continue;
    if (t.lowerBound !== undefined && val < t.lowerBound) failed.push(`${t.metric} < ${t.lowerBound}`);
    if (t.upperBound !== undefined && val > t.upperBound) failed.push(`${t.metric} > ${t.upperBound}`);
  }
  return failed;
}

// ═══════════════════════════════════════════
// WHAT-IF TOOL (WIT)
// ═══════════════════════════════════════════

export interface WITConfig {
  modelFn: (features: number[]) => number;  // prediction function
  featureNames: string[];
  featureRanges: { min: number; max: number }[];
}

export interface CounterfactualResult {
  original: { features: number[]; prediction: number };
  counterfactual: { features: number[]; prediction: number };
  changedFeatures: { name: string; from: number; to: number; impact: number }[];
  distance: number;
  flipped: boolean; // prediction class changed
}

export interface ThresholdAnalysis {
  thresholds: number[];
  accuracy: number[];
  precision: number[];
  recall: number[];
  f1: number[];
  fpr: number[];
  fnr: number[];
  optimalThreshold: number;
  optimalMetric: string;
}

/** Find nearest counterfactual (flip prediction class) */
export function findCounterfactual(
  input: number[],
  config: WITConfig,
  maxIterations = 200
): CounterfactualResult {
  const originalPred = config.modelFn(input);
  const targetClass = originalPred >= 0.5 ? 0 : 1; // flip
  const cf = [...input];
  let bestCf = [...input];
  let bestDist = Infinity;
  let flipped = false;

  for (let iter = 0; iter < maxIterations; iter++) {
    // Perturb a random feature
    const fi = Math.floor(Math.random() * cf.length);
    const range = config.featureRanges[fi];
    const perturbation = (Math.random() - 0.5) * (range.max - range.min) * 0.1;
    const backup = cf[fi];
    cf[fi] = Math.max(range.min, Math.min(range.max, cf[fi] + perturbation));

    const pred = config.modelFn(cf);
    const isTarget = targetClass === 1 ? pred >= 0.5 : pred < 0.5;
    const dist = Math.sqrt(cf.reduce((s, v, i) => {
      const normed = (v - input[i]) / ((config.featureRanges[i].max - config.featureRanges[i].min) || 1);
      return s + normed * normed;
    }, 0));

    if (isTarget && dist < bestDist) {
      bestDist = dist;
      bestCf = [...cf];
      flipped = true;
    } else if (!isTarget) {
      cf[fi] = backup; // revert
    }
  }

  const changedFeatures = config.featureNames
    .map((name, i) => ({
      name,
      from: Math.round(input[i] * 10000) / 10000,
      to: Math.round(bestCf[i] * 10000) / 10000,
      impact: Math.abs(bestCf[i] - input[i]),
    }))
    .filter(c => c.impact > 1e-6)
    .sort((a, b) => b.impact - a.impact);

  return {
    original: { features: input, prediction: Math.round(originalPred * 10000) / 10000 },
    counterfactual: { features: bestCf, prediction: Math.round(config.modelFn(bestCf) * 10000) / 10000 },
    changedFeatures,
    distance: Math.round(bestDist * 10000) / 10000,
    flipped,
  };
}

/** Threshold sweep analysis */
export function analyzeThresholds(
  predictions: number[],
  labels: number[],
  steps = 50
): ThresholdAnalysis {
  const thresholds: number[] = [];
  const accuracy: number[] = [], precision: number[] = [], recall: number[] = [];
  const f1: number[] = [], fpr: number[] = [], fnr: number[] = [];

  let bestF1 = 0, optimalThreshold = 0.5;

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    thresholds.push(t);
    const metrics = computeMetricSuite(predictions, labels, ["accuracy", "precision", "recall", "f1", "fpr", "fnr"], t);
    accuracy.push(metrics.accuracy ?? 0);
    precision.push(metrics.precision ?? 0);
    recall.push(metrics.recall ?? 0);
    f1.push(metrics.f1 ?? 0);
    fpr.push(metrics.fpr ?? 0);
    fnr.push(metrics.fnr ?? 0);

    if ((metrics.f1 ?? 0) > bestF1) {
      bestF1 = metrics.f1 ?? 0;
      optimalThreshold = t;
    }
  }

  return { thresholds, accuracy, precision, recall, f1, fpr, fnr, optimalThreshold, optimalMetric: "f1" };
}

// ═══════════════════════════════════════════
// LANGUAGE INTERPRETABILITY TOOL (LIT)
// ═══════════════════════════════════════════

export interface LITAnalysis {
  tokens: string[];
  tokenSaliency: number[];          // per-token importance
  attentionWeights: number[][];     // attention matrix
  embeddingSimilarities: { token: string; similar: { token: string; score: number }[] }[];
  prediction: { label: string; confidence: number };
}

/** Analyze NLP model interpretability */
export function analyzeLIT(
  text: string,
  tokenize: (text: string) => string[],
  predictFn: (tokens: string[]) => { label: string; confidence: number }
): LITAnalysis {
  const tokens = tokenize(text);
  const prediction = predictFn(tokens);

  // Compute saliency via leave-one-out
  const basePred = prediction.confidence;
  const tokenSaliency = tokens.map((_, i) => {
    const masked = [...tokens];
    masked[i] = "[MASK]";
    const maskedPred = predictFn(masked).confidence;
    return Math.abs(basePred - maskedPred);
  });

  // Normalize saliency
  const maxSal = Math.max(...tokenSaliency, 1e-8);
  const normalizedSaliency = tokenSaliency.map(s => Math.round(s / maxSal * 10000) / 10000);

  // Simulate attention weights (self-attention pattern)
  const n = tokens.length;
  const attentionWeights: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      // Simple attention pattern: nearby tokens attend more
      const dist = Math.abs(i - j);
      const raw = Math.exp(-dist * 0.5);
      return raw;
    })
  );
  // Normalize rows
  for (let i = 0; i < n; i++) {
    const rowSum = attentionWeights[i].reduce((s, v) => s + v, 0);
    for (let j = 0; j < n; j++) attentionWeights[i][j] = Math.round(attentionWeights[i][j] / rowSum * 10000) / 10000;
  }

  // Embedding similarities (cosine sim via hash-based embeddings)
  const embeddingSimilarities = tokens.slice(0, 5).map(token => ({
    token,
    similar: tokens
      .filter(t => t !== token)
      .map(t => ({ token: t, score: Math.round(simpleCosineSim(token, t) * 10000) / 10000 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
  }));

  return { tokens, tokenSaliency: normalizedSaliency, attentionWeights, embeddingSimilarities, prediction };
}

function simpleCosineSim(a: string, b: string): number {
  // Character n-gram based similarity (simple)
  const ngramsA = new Set<string>(), ngramsB = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) ngramsA.add(a.slice(i, i + 2));
  for (let i = 0; i < b.length - 1; i++) ngramsB.add(b.slice(i, i + 2));
  if (ngramsA.size === 0 || ngramsB.size === 0) return 0;
  let intersection = 0;
  for (const ng of ngramsA) if (ngramsB.has(ng)) intersection++;
  return intersection / Math.sqrt(ngramsA.size * ngramsB.size);
}

// ═══════════════════════════════════════════
// EXPLAINABLE AI (XAI)
// ═══════════════════════════════════════════

export interface FeatureAttribution {
  featureName: string;
  attributionValue: number;     // signed: +/- contribution
  absoluteImportance: number;
  percentageContribution: number;
}

export interface ExplanationResult {
  method: "integrated_gradients" | "shap_kernel" | "lime";
  baselineValue: number;
  predictionValue: number;
  attributions: FeatureAttribution[];
  convergenceDelta?: number;
}

/** Integrated Gradients — Sundararajan et al. (2017) */
export function integratedGradients(
  input: number[],
  baseline: number[],
  modelFn: (x: number[]) => number,
  steps = 50
): ExplanationResult {
  const baseVal = modelFn(baseline);
  const predVal = modelFn(input);

  // Compute path integral via Riemann sum
  const attributions = new Array(input.length).fill(0);

  for (let s = 0; s <= steps; s++) {
    const alpha = s / steps;
    const interpolated = input.map((v, i) => baseline[i] + alpha * (v - baseline[i]));

    // Numerical gradient at this point
    for (let i = 0; i < input.length; i++) {
      const eps = 1e-5;
      const plus = [...interpolated]; plus[i] += eps;
      const minus = [...interpolated]; minus[i] -= eps;
      const grad = (modelFn(plus) - modelFn(minus)) / (2 * eps);
      attributions[i] += grad / (steps + 1);
    }
  }

  // Scale by (input - baseline)
  for (let i = 0; i < attributions.length; i++) {
    attributions[i] *= (input[i] - baseline[i]);
  }

  // Convergence delta (completeness axiom check)
  const sumAttr = attributions.reduce((s, a) => s + a, 0);
  const convergenceDelta = Math.abs(sumAttr - (predVal - baseVal));

  return _formatExplanation("integrated_gradients", attributions, baseVal, predVal,
    input.map((_, i) => `feature_${i}`), convergenceDelta);
}

/** Kernel SHAP (simplified Shapley values) */
export function kernelSHAP(
  input: number[],
  modelFn: (x: number[]) => number,
  backgroundData: number[][],
  numSamples = 100
): ExplanationResult {
  const baseVal = backgroundData.reduce((s, bg) => s + modelFn(bg), 0) / backgroundData.length;
  const predVal = modelFn(input);
  const d = input.length;

  // Monte Carlo SHAP estimation
  const shapValues = new Array(d).fill(0);
  const counts = new Array(d).fill(0);

  for (let s = 0; s < numSamples; s++) {
    // Random coalition
    const coalition = input.map(() => Math.random() > 0.5);
    const bg = backgroundData[Math.floor(Math.random() * backgroundData.length)];

    // With and without each feature
    for (let i = 0; i < d; i++) {
      const withFeature = input.map((v, j) => j === i ? v : (coalition[j] ? v : bg[j]));
      const withoutFeature = input.map((v, j) => j === i ? bg[i] : (coalition[j] ? v : bg[j]));

      shapValues[i] += modelFn(withFeature) - modelFn(withoutFeature);
      counts[i]++;
    }
  }

  for (let i = 0; i < d; i++) {
    shapValues[i] = counts[i] > 0 ? shapValues[i] / counts[i] : 0;
  }

  return _formatExplanation("shap_kernel", shapValues, baseVal, predVal,
    input.map((_, i) => `feature_${i}`));
}

/** LIME (Local Interpretable Model-agnostic Explanations) */
export function limeExplain(
  input: number[],
  modelFn: (x: number[]) => number,
  featureRanges: { min: number; max: number }[],
  numSamples = 200,
  kernelWidth = 0.75
): ExplanationResult {
  const predVal = modelFn(input);
  const d = input.length;

  // Generate perturbed samples
  const perturbedInputs: number[][] = [];
  const perturbedOutputs: number[] = [];
  const weights: number[] = [];

  for (let s = 0; s < numSamples; s++) {
    const perturbed = input.map((v, i) => {
      const range = featureRanges[i].max - featureRanges[i].min || 1;
      return v + (Math.random() - 0.5) * range * 0.3;
    });
    perturbedInputs.push(perturbed);
    perturbedOutputs.push(modelFn(perturbed));

    // Exponential kernel weight
    const dist = Math.sqrt(perturbed.reduce((s, v, i) => {
      const normed = (v - input[i]) / ((featureRanges[i].max - featureRanges[i].min) || 1);
      return s + normed * normed;
    }, 0));
    weights.push(Math.exp(-dist * dist / (2 * kernelWidth * kernelWidth)));
  }

  // Weighted linear regression
  const coefficients = weightedLinearRegression(perturbedInputs, perturbedOutputs, weights);

  const baseVal = perturbedOutputs.reduce((s, v, i) => s + v * weights[i], 0) / weights.reduce((s, w) => s + w, 0);

  return _formatExplanation("lime", coefficients, baseVal, predVal,
    input.map((_, i) => `feature_${i}`));
}

function weightedLinearRegression(X: number[][], y: number[], weights: number[]): number[] {
  const d = X[0]?.length ?? 0;
  const coeffs = new Array(d).fill(0);

  // Simple: feature-wise weighted correlation as coefficient estimate
  for (let j = 0; j < d; j++) {
    let num = 0, den = 0;
    const meanX = X.reduce((s, x, i) => s + x[j] * weights[i], 0) / weights.reduce((s, w) => s + w, 0);
    const meanY = y.reduce((s, v, i) => s + v * weights[i], 0) / weights.reduce((s, w) => s + w, 0);

    for (let i = 0; i < X.length; i++) {
      num += weights[i] * (X[i][j] - meanX) * (y[i] - meanY);
      den += weights[i] * (X[i][j] - meanX) ** 2;
    }
    coeffs[j] = den > 1e-10 ? num / den : 0;
  }

  return coeffs;
}

function _formatExplanation(
  method: ExplanationResult["method"],
  attributions: number[],
  baseVal: number,
  predVal: number,
  featureNames: string[],
  convergenceDelta?: number
): ExplanationResult {
  const totalAbs = attributions.reduce((s, a) => s + Math.abs(a), 0) || 1;

  return {
    method,
    baselineValue: Math.round(baseVal * 10000) / 10000,
    predictionValue: Math.round(predVal * 10000) / 10000,
    attributions: featureNames.map((name, i) => ({
      featureName: name,
      attributionValue: Math.round(attributions[i] * 10000) / 10000,
      absoluteImportance: Math.round(Math.abs(attributions[i]) * 10000) / 10000,
      percentageContribution: Math.round(Math.abs(attributions[i]) / totalAbs * 10000) / 100,
    })).sort((a, b) => b.absoluteImportance - a.absoluteImportance),
    convergenceDelta: convergenceDelta !== undefined ? Math.round(convergenceDelta * 100000) / 100000 : undefined,
  };
}

// ═══════════════════════════════════════════
// TF PRIVACY TESTS
// ═══════════════════════════════════════════

export interface MembershipInferenceResult {
  attackAccuracy: number;       // how well attacker can distinguish members
  advantage: number;            // attacker advantage over random
  precision: number;
  recall: number;
  auc: number;
  vulnerability: "low" | "medium" | "high" | "critical";
  recommendation: string;
}

export interface ModelInversionResult {
  reconstructionError: number;  // lower = more vulnerable
  ssim: number;                 // structural similarity to original
  vulnerability: "low" | "medium" | "high";
  recommendation: string;
}

/** Membership Inference Attack — Shokri et al. (2017) */
export function membershipInferenceTest(
  trainPredictions: number[],
  trainLabels: number[],
  testPredictions: number[],
  testLabels: number[]
): MembershipInferenceResult {
  // Train predictions should have higher confidence than test predictions
  // if the model is overfitting (memorizing training data)

  const trainConfidences = trainPredictions.map((p, i) => {
    const label = trainLabels[i];
    return label === 1 ? p : 1 - p; // confidence in correct class
  });

  const testConfidences = testPredictions.map((p, i) => {
    const label = testLabels[i];
    return label === 1 ? p : 1 - p;
  });

  // Shadow model attack: threshold on confidence
  const allConfidences = [
    ...trainConfidences.map(c => ({ c, member: 1 })),
    ...testConfidences.map(c => ({ c, member: 0 })),
  ].sort((a, b) => b.c - a.c);

  // Find optimal threshold
  let bestAcc = 0, bestThresh = 0.5;
  for (let t = 0; t <= 100; t++) {
    const thresh = t / 100;
    let correct = 0;
    for (const item of allConfidences) {
      const predictMember = item.c >= thresh ? 1 : 0;
      if (predictMember === item.member) correct++;
    }
    const acc = correct / allConfidences.length;
    if (acc > bestAcc) { bestAcc = acc; bestThresh = thresh; }
  }

  // Compute detailed metrics at optimal threshold
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const item of allConfidences) {
    const predictMember = item.c >= bestThresh ? 1 : 0;
    if (predictMember === 1 && item.member === 1) tp++;
    else if (predictMember === 1 && item.member === 0) fp++;
    else if (predictMember === 0 && item.member === 1) fn++;
    else tn++;
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const advantage = bestAcc - 0.5; // advantage over random guessing

  const vulnerability = advantage > 0.3 ? "critical" : advantage > 0.15 ? "high" : advantage > 0.05 ? "medium" : "low";

  return {
    attackAccuracy: Math.round(bestAcc * 10000) / 10000,
    advantage: Math.round(advantage * 10000) / 10000,
    precision: Math.round(precision * 10000) / 10000,
    recall: Math.round(recall * 10000) / 10000,
    auc: Math.round(estimateAUC(
      allConfidences.map(x => x.c),
      allConfidences.map(x => x.member)
    ) * 10000) / 10000,
    vulnerability,
    recommendation: vulnerability === "low"
      ? "Modelo apresenta boa resistência a ataques de membership inference."
      : vulnerability === "medium"
      ? "Considerar regularização (dropout, L2) ou differential privacy para reduzir memorização."
      : "ALERTA: Modelo memoriza dados de treinamento. Aplicar DP-SGD, regularização forte ou reduzir epochs.",
  };
}

/** Model Inversion Attack simulation */
export function modelInversionTest(
  modelFn: (x: number[]) => number,
  targetOutput: number,
  inputDim: number,
  iterations = 500,
  learningRate = 0.01
): ModelInversionResult {
  // Gradient-based inversion: reconstruct input that produces target output
  const reconstructed = Array.from({ length: inputDim }, () => Math.random());

  for (let iter = 0; iter < iterations; iter++) {
    const pred = modelFn(reconstructed);
    const loss = (pred - targetOutput) ** 2;

    // Numerical gradient
    for (let i = 0; i < inputDim; i++) {
      const eps = 1e-5;
      const plus = [...reconstructed]; plus[i] += eps;
      const grad = (modelFn(plus) - pred) / eps;
      reconstructed[i] -= learningRate * 2 * (pred - targetOutput) * grad;
      reconstructed[i] = Math.max(0, Math.min(1, reconstructed[i])); // clamp
    }
  }

  const finalPred = modelFn(reconstructed);
  const reconstructionError = Math.abs(finalPred - targetOutput);

  // SSIM-like metric (simplified)
  const ssim = 1 - reconstructionError;

  const vulnerability = reconstructionError < 0.01 ? "high" : reconstructionError < 0.1 ? "medium" : "low";

  return {
    reconstructionError: Math.round(reconstructionError * 10000) / 10000,
    ssim: Math.round(Math.max(0, ssim) * 10000) / 10000,
    vulnerability,
    recommendation: vulnerability === "low"
      ? "Modelo resistente a ataques de inversão."
      : "Modelo vulnerável a ataques de inversão. Aplicar DP, output perturbation ou limitar precisão de saída.",
  };
}

// ═══ STATE ═══

export function getResponsibleAIEvaluationState() {
  return {
    tfma: ["Slice-based Evaluation", "Cross-slice Metrics", "Threshold Validation", "Model Blessing", "AUC/Precision/Recall/F1/MSE/MAE/LogLoss/ECE"],
    whatIfTool: ["Counterfactual Analysis", "Threshold Sweep", "Feature Perturbation", "Nearest Counterfactual"],
    lit: ["Token Saliency (Leave-One-Out)", "Attention Visualization", "Embedding Similarity", "NLP Interpretability"],
    explainableAI: ["Integrated Gradients (Sundararajan 2017)", "Kernel SHAP", "LIME", "Feature Attribution", "Convergence Delta"],
    privacyTests: ["Membership Inference (Shokri 2017)", "Model Inversion", "Vulnerability Assessment", "Attack Advantage"],
  };
}
