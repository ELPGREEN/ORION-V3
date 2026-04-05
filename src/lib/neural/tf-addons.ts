/**
 * ─── TensorFlow Addons (Browser-Adapted) ───
 * Extra functionality: advanced activations, optimizers, layers, and metrics.
 * Ref: TensorFlow Addons (SIG Addons, Apache 2.0)
 *      github.com/tensorflow/addons
 */

// ═══ ACTIVATIONS ═══

/** Mish activation: x * tanh(softplus(x)) — Misra (2019) */
export function mish(x: number): number {
  return x * Math.tanh(Math.log(1 + Math.exp(x)));
}

/** GELU activation: Gaussian Error Linear Unit — Hendrycks & Gimpel (2016) */
export function gelu(x: number): number {
  return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
}

/** Swish (SiLU): x * sigmoid(x) — Ramachandran et al. (2017) */
export function swish(x: number): number {
  return x / (1 + Math.exp(-x));
}

/** LiSHT: x * tanh(x) — Roy et al. (2019) */
export function lisht(x: number): number {
  return x * Math.tanh(x);
}

/** RRELU: Randomized Leaky ReLU — Xu et al. (2015) */
export function rrelu(x: number, lower = 0.125, upper = 0.3333): number {
  if (x >= 0) return x;
  const slope = lower + Math.random() * (upper - lower);
  return slope * x;
}

/** Sparsemax: projects onto probability simplex — Martins & Astudillo (2016) */
export function sparsemax(logits: number[]): number[] {
  const sorted = [...logits].sort((a, b) => b - a);
  const n = sorted.length;
  let cumSum = 0;
  let k = 0;
  for (let i = 0; i < n; i++) {
    cumSum += sorted[i];
    if (sorted[i] > (cumSum - 1) / (i + 1)) k = i + 1;
  }
  const tau = (sorted.slice(0, k).reduce((a, b) => a + b, 0) - 1) / k;
  return logits.map(z => Math.max(0, z - tau));
}

/** Apply activation by name */
export function applyActivation(x: number, name: ActivationName): number {
  switch (name) {
    case "mish": return mish(x);
    case "gelu": return gelu(x);
    case "swish": return swish(x);
    case "lisht": return lisht(x);
    case "rrelu": return rrelu(x);
    default: return Math.max(0, x); // relu fallback
  }
}

export type ActivationName = "mish" | "gelu" | "swish" | "lisht" | "rrelu" | "relu";

// ═══ OPTIMIZERS ═══

export interface AdamWState {
  m: number[];
  v: number[];
  t: number;
}

/** AdamW optimizer: Adam with decoupled weight decay — Loshchilov & Hutter (2019) */
export function adamWStep(
  params: number[],
  grads: number[],
  state: AdamWState,
  lr = 0.001,
  beta1 = 0.9,
  beta2 = 0.999,
  eps = 1e-8,
  weightDecay = 0.01
): number[] {
  state.t++;
  const updated = new Array(params.length);
  for (let i = 0; i < params.length; i++) {
    state.m[i] = beta1 * state.m[i] + (1 - beta1) * grads[i];
    state.v[i] = beta2 * state.v[i] + (1 - beta2) * grads[i] * grads[i];
    const mHat = state.m[i] / (1 - Math.pow(beta1, state.t));
    const vHat = state.v[i] / (1 - Math.pow(beta2, state.t));
    updated[i] = params[i] - lr * (mHat / (Math.sqrt(vHat) + eps) + weightDecay * params[i]);
  }
  return updated;
}

export function createAdamWState(size: number): AdamWState {
  return { m: new Array(size).fill(0), v: new Array(size).fill(0), t: 0 };
}

/** LAMB optimizer: Layer-wise Adaptive Moments — You et al. (2020) */
export function lambStep(
  params: number[],
  grads: number[],
  state: AdamWState,
  lr = 0.001,
  beta1 = 0.9,
  beta2 = 0.999,
  eps = 1e-6,
  weightDecay = 0.01
): number[] {
  state.t++;
  const updated = new Array(params.length);
  for (let i = 0; i < params.length; i++) {
    state.m[i] = beta1 * state.m[i] + (1 - beta1) * grads[i];
    state.v[i] = beta2 * state.v[i] + (1 - beta2) * grads[i] * grads[i];
    const mHat = state.m[i] / (1 - Math.pow(beta1, state.t));
    const vHat = state.v[i] / (1 - Math.pow(beta2, state.t));
    const adamUpdate = mHat / (Math.sqrt(vHat) + eps) + weightDecay * params[i];
    const paramNorm = Math.sqrt(params.reduce((s, p) => s + p * p, 0));
    const updateNorm = Math.sqrt(grads.reduce((s, g) => s + g * g, 0));
    const trustRatio = paramNorm > 0 && updateNorm > 0 ? paramNorm / updateNorm : 1;
    updated[i] = params[i] - lr * trustRatio * adamUpdate;
  }
  return updated;
}

/** Lookahead wrapper: slow weights updated every k steps — Zhang et al. (2019) */
export interface LookaheadState {
  slowWeights: number[];
  stepCount: number;
}

export function lookaheadStep(
  fastWeights: number[],
  state: LookaheadState,
  k = 5,
  alpha = 0.5
): number[] {
  state.stepCount++;
  if (state.stepCount % k === 0) {
    for (let i = 0; i < state.slowWeights.length; i++) {
      state.slowWeights[i] += alpha * (fastWeights[i] - state.slowWeights[i]);
    }
    return [...state.slowWeights];
  }
  return fastWeights;
}

// ═══ LAYERS ═══

/** Group Normalization: Wu & He (2018) — normalizes across channel groups */
export function groupNorm(
  features: number[],
  numGroups: number,
  gamma: number[] = [],
  beta: number[] = [],
  eps = 1e-5
): number[] {
  const groupSize = Math.floor(features.length / numGroups);
  const result = new Array(features.length);
  for (let g = 0; g < numGroups; g++) {
    const start = g * groupSize;
    const end = g === numGroups - 1 ? features.length : start + groupSize;
    let mean = 0, variance = 0;
    const count = end - start;
    for (let i = start; i < end; i++) mean += features[i];
    mean /= count;
    for (let i = start; i < end; i++) variance += (features[i] - mean) ** 2;
    variance /= count;
    for (let i = start; i < end; i++) {
      const norm = (features[i] - mean) / Math.sqrt(variance + eps);
      const g_ = gamma[i] ?? 1;
      const b_ = beta[i] ?? 0;
      result[i] = g_ * norm + b_;
    }
  }
  return result;
}

/** Spectral Normalization: constrains weight matrix spectral norm — Miyato et al. (2018) */
export function spectralNorm(weights: number[][], iterations = 1): { normalized: number[][]; sigma: number } {
  const rows = weights.length;
  const cols = weights[0].length;
  let u = new Array(rows).fill(0).map(() => Math.random());
  let v = new Array(cols).fill(0).map(() => Math.random());

  for (let iter = 0; iter < iterations; iter++) {
    // v = W^T u / ||W^T u||
    const wtu = new Array(cols).fill(0);
    for (let j = 0; j < cols; j++) {
      for (let i = 0; i < rows; i++) wtu[j] += weights[i][j] * u[i];
    }
    const vNorm = Math.sqrt(wtu.reduce((s, x) => s + x * x, 0)) || 1;
    v = wtu.map(x => x / vNorm);

    // u = W v / ||W v||
    const wv = new Array(rows).fill(0);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) wv[i] += weights[i][j] * v[j];
    }
    const uNorm = Math.sqrt(wv.reduce((s, x) => s + x * x, 0)) || 1;
    u = wv.map(x => x / uNorm);
  }

  // sigma = u^T W v
  let sigma = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) sigma += u[i] * weights[i][j] * v[j];
  }

  const normalized = weights.map(row => row.map(w => w / (sigma || 1)));
  return { normalized, sigma };
}

// ═══ METRICS ═══

/** F-Beta score: generalized F1 with tunable beta */
export function fBetaScore(precision: number, recall: number, beta = 1): number {
  const b2 = beta * beta;
  const denom = b2 * precision + recall;
  return denom > 0 ? (1 + b2) * precision * recall / denom : 0;
}

/** Matthews Correlation Coefficient: balanced metric for imbalanced datasets */
export function matthewsCorrelation(tp: number, tn: number, fp: number, fn: number): number {
  const denom = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  return denom > 0 ? (tp * tn - fp * fn) / denom : 0;
}

/** Cohen's Kappa: inter-rater agreement correcting for chance */
export function cohensKappa(observed: number, expected: number): number {
  return expected < 1 ? (observed - expected) / (1 - expected) : 1;
}

/** R² (coefficient of determination) */
export function r2Score(actual: number[], predicted: number[]): number {
  const mean = actual.reduce((s, v) => s + v, 0) / actual.length;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < actual.length; i++) {
    ssRes += (actual[i] - predicted[i]) ** 2;
    ssTot += (actual[i] - mean) ** 2;
  }
  return ssTot > 0 ? 1 - ssRes / ssTot : 0;
}

// ═══ LOSSES ═══

/** Focal Loss: Lin et al. (2017) — handles class imbalance */
export function focalLoss(predictions: number[], targets: number[], gamma = 2, alpha = 0.25): number {
  let loss = 0;
  for (let i = 0; i < predictions.length; i++) {
    const p = Math.max(Math.min(predictions[i], 1 - 1e-7), 1e-7);
    const pt = targets[i] === 1 ? p : 1 - p;
    const at = targets[i] === 1 ? alpha : 1 - alpha;
    loss -= at * Math.pow(1 - pt, gamma) * Math.log(pt);
  }
  return loss / predictions.length;
}

/** Triplet Loss: Schroff et al. (2015) — metric learning */
export function tripletLoss(anchor: number[], positive: number[], negative: number[], margin = 1.0): number {
  let dPos = 0, dNeg = 0;
  for (let i = 0; i < anchor.length; i++) {
    dPos += (anchor[i] - positive[i]) ** 2;
    dNeg += (anchor[i] - negative[i]) ** 2;
  }
  return Math.max(0, Math.sqrt(dPos) - Math.sqrt(dNeg) + margin);
}

/** Contrastive Loss: Hadsell et al. (2006) — Siamese networks */
export function contrastiveLoss(embedding1: number[], embedding2: number[], label: number, margin = 1.0): number {
  let dist = 0;
  for (let i = 0; i < embedding1.length; i++) dist += (embedding1[i] - embedding2[i]) ** 2;
  dist = Math.sqrt(dist);
  return label * dist * dist + (1 - label) * Math.max(0, margin - dist) ** 2;
}

// ═══ CALLBACKS ═══

export interface EarlyStoppingState {
  bestValue: number;
  patience: number;
  counter: number;
  shouldStop: boolean;
}

export function createEarlyStopping(patience = 5, mode: "min" | "max" = "min"): EarlyStoppingState {
  return { bestValue: mode === "min" ? Infinity : -Infinity, patience, counter: 0, shouldStop: false };
}

export function checkEarlyStopping(state: EarlyStoppingState, value: number, mode: "min" | "max" = "min"): boolean {
  const improved = mode === "min" ? value < state.bestValue : value > state.bestValue;
  if (improved) {
    state.bestValue = value;
    state.counter = 0;
  } else {
    state.counter++;
    if (state.counter >= state.patience) state.shouldStop = true;
  }
  return state.shouldStop;
}

/** Cosine Annealing LR scheduler — Loshchilov & Hutter (2017) */
export function cosineAnnealingLR(epoch: number, maxEpochs: number, lrMax: number, lrMin = 0): number {
  return lrMin + 0.5 * (lrMax - lrMin) * (1 + Math.cos(Math.PI * epoch / maxEpochs));
}

/** Warmup + Cosine decay scheduler */
export function warmupCosineDecay(step: number, warmupSteps: number, totalSteps: number, lrMax: number): number {
  if (step < warmupSteps) return lrMax * (step / warmupSteps);
  const progress = (step - warmupSteps) / (totalSteps - warmupSteps);
  return lrMax * 0.5 * (1 + Math.cos(Math.PI * progress));
}

export function getAddonsState() {
  return {
    activations: ["mish", "gelu", "swish", "lisht", "rrelu", "sparsemax"],
    optimizers: ["AdamW", "LAMB", "Lookahead"],
    layers: ["GroupNorm", "SpectralNorm"],
    metrics: ["F-Beta", "MCC", "Cohen's Kappa", "R²"],
    losses: ["Focal", "Triplet", "Contrastive"],
    schedulers: ["CosineAnnealing", "WarmupCosineDecay"],
    callbacks: ["EarlyStopping"],
  };
}
