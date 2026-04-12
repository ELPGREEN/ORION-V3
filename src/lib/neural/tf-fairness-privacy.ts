/**
 * ─── TensorFlow Responsible AI (Browser-Adapted) ───
 * Fairness Indicators, Differential Privacy, Model Cards, and Model Remediation.
 * 
 * Ref: Fairness Indicators (TensorFlow, Apache 2.0)
 *      TF Privacy — Abadi et al. (2016) Deep Learning with Differential Privacy
 *      Model Card Toolkit — Mitchell et al. (2019)
 *      TF Model Remediation — Dixon et al. (2018)
 */

// ═══════════════════════════════════════════
// FAIRNESS INDICATORS
// ═══════════════════════════════════════════

export interface FairnessSlice {
  name: string;
  feature: string;
  value: string;
  sampleCount: number;
}

export interface FairnessMetrics {
  slice: FairnessSlice;
  truePositiveRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  demographicParity: number;
  equalizedOdds: number;
  calibration: number;
}

export interface FairnessReport {
  timestamp: string;
  overallMetrics: Omit<FairnessMetrics, "slice">;
  sliceMetrics: FairnessMetrics[];
  disparityAlerts: DisparityAlert[];
  recommendation: string;
}

export interface DisparityAlert {
  metric: string;
  slice1: string;
  slice2: string;
  disparity: number;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
}

/** Compute fairness metrics for a prediction slice */
export function computeFairnessMetrics(
  predictions: number[],
  labels: number[],
  slice: FairnessSlice,
  threshold = 0.5
): FairnessMetrics {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  let positives = 0;

  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i] >= threshold ? 1 : 0;
    const label = labels[i];
    positives += pred;
    if (pred === 1 && label === 1) tp++;
    else if (pred === 1 && label === 0) fp++;
    else if (pred === 0 && label === 1) fn++;
    else tn++;
  }

  const total = predictions.length || 1;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;

  return {
    slice,
    truePositiveRate: tp + fn > 0 ? tp / (tp + fn) : 0,
    falsePositiveRate: fp + tn > 0 ? fp / (fp + tn) : 0,
    falseNegativeRate: tp + fn > 0 ? fn / (tp + fn) : 0,
    accuracy: (tp + tn) / total,
    precision,
    recall,
    f1,
    demographicParity: positives / total,
    equalizedOdds: Math.abs((tp + fn > 0 ? tp / (tp + fn) : 0) - (fp + tn > 0 ? fp / (fp + tn) : 0)),
    calibration: positives > 0
      ? predictions.filter((_, i) => predictions[i] >= threshold).reduce((s, p) => s + p, 0) / positives
      : 0,
  };
}

/** Generate a full fairness report comparing slices */
export function generateFairnessReport(
  sliceResults: FairnessMetrics[],
  overallPreds: number[],
  overallLabels: number[]
): FairnessReport {
  const overallSlice: FairnessSlice = { name: "overall", feature: "all", value: "all", sampleCount: overallPreds.length };
  const overall = computeFairnessMetrics(overallPreds, overallLabels, overallSlice);

  const alerts: DisparityAlert[] = [];
  const metricsToCheck = ["truePositiveRate", "falsePositiveRate", "accuracy", "demographicParity"] as const;

  for (let i = 0; i < sliceResults.length; i++) {
    for (let j = i + 1; j < sliceResults.length; j++) {
      for (const metric of metricsToCheck) {
        const diff = Math.abs(sliceResults[i][metric] - sliceResults[j][metric]);
        if (diff > 0.05) {
          const severity = diff > 0.3 ? "critical" : diff > 0.2 ? "high" : diff > 0.1 ? "medium" : "low";
          alerts.push({
            metric,
            slice1: sliceResults[i].slice.name,
            slice2: sliceResults[j].slice.name,
            disparity: diff,
            severity,
            description: `${metric} differs by ${(diff * 100).toFixed(1)}% between ${sliceResults[i].slice.name} and ${sliceResults[j].slice.name}`,
          });
        }
      }
    }
  }

  const hasHighAlert = alerts.some(a => a.severity === "critical" || a.severity === "high");
  const recommendation = hasHighAlert
    ? "ATENÇÃO: Disparidades significativas detectadas. Aplicar técnicas de remediação (resampling, reweighting ou adversarial debiasing)."
    : alerts.length > 0
    ? "Disparidades moderadas identificadas. Monitorar e considerar ajustes."
    : "Métricas de fairness dentro dos limites aceitáveis.";

  return {
    timestamp: new Date().toISOString(),
    overallMetrics: overall,
    sliceMetrics: sliceResults,
    disparityAlerts: alerts.sort((a, b) => b.disparity - a.disparity),
    recommendation,
  };
}

// ═══════════════════════════════════════════
// DIFFERENTIAL PRIVACY
// ═══════════════════════════════════════════

export interface DPConfig {
  epsilon: number;       // Privacy budget
  delta: number;         // Failure probability
  maxGradNorm: number;   // Gradient clipping bound
  noiseMechanism: "gaussian" | "laplace";
}

export interface DPAccountingState {
  totalEpsilon: number;
  totalDelta: number;
  stepsConsumed: number;
  budgetRemaining: number;
  privacyGuarantee: string;
}

const _dpAccounting: DPAccountingState = {
  totalEpsilon: 0,
  totalDelta: 0,
  stepsConsumed: 0,
  budgetRemaining: 1.0,
  privacyGuarantee: "(ε,δ)-DP not yet applied",
};

/** Clip gradient to maxGradNorm (L2) */
export function clipGradient(gradient: number[], maxNorm: number): number[] {
  const norm = Math.sqrt(gradient.reduce((s, g) => s + g * g, 0));
  if (norm <= maxNorm) return gradient;
  const scale = maxNorm / norm;
  return gradient.map(g => g * scale);
}

/** Add Gaussian noise for (ε,δ)-DP — Abadi et al. (2016) */
export function addGaussianNoise(values: number[], sensitivity: number, epsilon: number, delta: number): number[] {
  const sigma = sensitivity * Math.sqrt(2 * Math.log(1.25 / delta)) / epsilon;
  return values.map(v => v + gaussianRandom(0, sigma));
}

/** Add Laplace noise for ε-DP */
export function addLaplaceNoise(values: number[], sensitivity: number, epsilon: number): number[] {
  const scale = sensitivity / epsilon;
  return values.map(v => v + laplaceRandom(scale));
}

/** DP-SGD step: clip + noise + aggregate */
export function dpSGDStep(
  gradients: number[][],
  config: DPConfig,
  batchSize: number
): number[] {
  const clipped = gradients.map(g => clipGradient(g, config.maxGradNorm));
  const dim = clipped[0]?.length ?? 0;
  const aggregated = new Array(dim).fill(0);
  for (const g of clipped) {
    for (let i = 0; i < dim; i++) aggregated[i] += g[i];
  }
  for (let i = 0; i < dim; i++) aggregated[i] /= batchSize;

  const noised = config.noiseMechanism === "gaussian"
    ? addGaussianNoise(aggregated, config.maxGradNorm / batchSize, config.epsilon, config.delta)
    : addLaplaceNoise(aggregated, config.maxGradNorm / batchSize, config.epsilon);

  // Update accounting
  _dpAccounting.stepsConsumed++;
  _dpAccounting.totalEpsilon += config.epsilon;
  _dpAccounting.totalDelta += config.delta;
  _dpAccounting.budgetRemaining = Math.max(0, 1 - _dpAccounting.totalEpsilon / 10);
  _dpAccounting.privacyGuarantee = `(${_dpAccounting.totalEpsilon.toFixed(2)}, ${_dpAccounting.totalDelta.toExponential(2)})-DP after ${_dpAccounting.stepsConsumed} steps`;

  return noised;
}

export function getDPAccountingState(): DPAccountingState {
  return { ..._dpAccounting };
}

function gaussianRandom(mean: number, stddev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function laplaceRandom(scale: number): number {
  const u = Math.random() - 0.5;
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

// ═══════════════════════════════════════════
// MODEL CARD TOOLKIT
// ═══════════════════════════════════════════

export interface ModelCard {
  modelDetails: {
    name: string;
    version: string;
    type: string;
    owner: string;
    createdAt: string;
    framework: string;
    license: string;
    references: string[];
  };
  intendedUse: {
    primaryUses: string[];
    outOfScopeUses: string[];
    users: string[];
  };
  factors: {
    relevantFactors: string[];
    evaluationFactors: string[];
  };
  metrics: {
    performanceMetrics: { name: string; value: number; confidence?: number }[];
    decisionThresholds: { metric: string; threshold: number }[];
  };
  ethicalConsiderations: {
    risks: string[];
    mitigations: string[];
    useCasesWithCaution: string[];
  };
  fairnessAnalysis?: FairnessReport;
  caveatsAndRecommendations: string[];
  generatedAt: string;
}

/** Generate a Model Card for transparency and documentation */
export function generateModelCard(params: {
  name: string;
  version: string;
  type: string;
  metrics: { name: string; value: number }[];
  intendedUses: string[];
  risks?: string[];
  fairnessReport?: FairnessReport;
}): ModelCard {
  return {
    modelDetails: {
      name: params.name,
      version: params.version,
      type: params.type,
      owner: "Orion AI System",
      createdAt: new Date().toISOString(),
      framework: "TensorFlow.js + Orion Neural Pipeline",
      license: "Proprietary",
      references: [
        "Mitchell et al. (2019) — Model Cards for Model Reporting",
        "tensorflow.org/responsible_ai/model_card_toolkit",
      ],
    },
    intendedUse: {
      primaryUses: params.intendedUses,
      outOfScopeUses: ["Decisões autônomas sem revisão humana", "Aplicações em domínios não validados"],
      users: ["Desenvolvedores", "Pesquisadores", "Analistas"],
    },
    factors: {
      relevantFactors: ["Qualidade dos dados de entrada", "Distribuição demográfica", "Condições de iluminação (visão)"],
      evaluationFactors: ["Acurácia por subgrupo", "Latência de inferência", "Uso de memória"],
    },
    metrics: {
      performanceMetrics: params.metrics.map(m => ({ ...m, confidence: 0.95 })),
      decisionThresholds: [{ metric: "accuracy", threshold: 0.7 }, { metric: "latencyMs", threshold: 500 }],
    },
    ethicalConsiderations: {
      risks: params.risks ?? ["Viés em dados de treinamento", "Privacidade de dados biométricos"],
      mitigations: ["Auditoria de fairness periódica", "Differential Privacy no treinamento", "Consentimento explícito para biometria"],
      useCasesWithCaution: ["Reconhecimento facial em ambientes públicos", "Decisões automatizadas com impacto legal"],
    },
    fairnessAnalysis: params.fairnessReport,
    caveatsAndRecommendations: [
      "Validar performance em dados representativos do domínio alvo",
      "Monitorar drift de dados continuamente",
      "Revalidar fairness após retraining",
    ],
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════
// MODEL REMEDIATION
// ═══════════════════════════════════════════

/** Counterfactual Logit Pairing (CLP) — adjust predictions to reduce disparity */
export function counterfactualLogitPairing(
  logits: number[],
  counterfactualLogits: number[],
  alpha = 0.1
): number {
  let loss = 0;
  for (let i = 0; i < logits.length; i++) {
    loss += (logits[i] - counterfactualLogits[i]) ** 2;
  }
  return alpha * loss / logits.length;
}

/** MinDiff: minimize difference in FPR/FNR between groups — Prost et al. (2019) */
export function minDiffLoss(
  groupAPreds: number[],
  groupBPreds: number[],
  kernel: "gaussian" | "laplacian" = "gaussian",
  bandwidth = 1.0
): number {
  if (groupAPreds.length === 0 || groupBPreds.length === 0) return 0;

  const kernelFn = kernel === "gaussian"
    ? (x: number, y: number) => Math.exp((-((x - y) ** 2)) / (2 * bandwidth ** 2))
    : (x: number, y: number) => Math.exp(-Math.abs(x - y) / bandwidth);

  let mmd = 0;
  const nA = groupAPreds.length, nB = groupBPreds.length;

  for (let i = 0; i < nA; i++)
    for (let j = 0; j < nA; j++)
      mmd += kernelFn(groupAPreds[i], groupAPreds[j]) / (nA * nA);

  for (let i = 0; i < nB; i++)
    for (let j = 0; j < nB; j++)
      mmd += kernelFn(groupBPreds[i], groupBPreds[j]) / (nB * nB);

  for (let i = 0; i < nA; i++)
    for (let j = 0; j < nB; j++)
      mmd -= 2 * kernelFn(groupAPreds[i], groupBPreds[j]) / (nA * nB);

  return Math.max(0, mmd);
}

/** Reweighting: compute sample weights to balance fairness */
export function computeFairnessWeights(
  labels: number[],
  protectedAttr: number[],
  targetParityMetric: "demographic" | "equalized" = "demographic"
): number[] {
  const groups = new Map<string, { count: number; posCount: number; indices: number[] }>();

  for (let i = 0; i < labels.length; i++) {
    const key = `${protectedAttr[i]}`;
    if (!groups.has(key)) groups.set(key, { count: 0, posCount: 0, indices: [] });
    const g = groups.get(key)!;
    g.count++;
    if (labels[i] === 1) g.posCount++;
    g.indices.push(i);
  }

  const weights = new Array(labels.length).fill(1);
  const totalPos = labels.filter(l => l === 1).length;
  const totalNeg = labels.length - totalPos;

  for (const [, group] of groups) {
    const groupPosRate = group.posCount / group.count;
    const overallPosRate = totalPos / labels.length;
    const ratio = overallPosRate / (groupPosRate || 0.001);

    for (const idx of group.indices) {
      weights[idx] = labels[idx] === 1 ? ratio : 1 / ratio;
    }
  }

  // Normalize
  const meanW = weights.reduce((s, w) => s + w, 0) / weights.length;
  return weights.map(w => w / meanW);
}

export function getResponsibleAIState() {
  return {
    fairness: ["Fairness Indicators", "Demographic Parity", "Equalized Odds", "Calibration", "Slice Analysis"],
    privacy: ["DP-SGD", "Gaussian Mechanism", "Laplace Mechanism", "Privacy Accounting", "Gradient Clipping"],
    transparency: ["Model Cards (Mitchell 2019)", "Performance Metrics", "Ethical Considerations", "Intended Use"],
    remediation: ["MinDiff (MMD)", "Counterfactual Logit Pairing", "Reweighting", "Adversarial Debiasing"],
  };
}
