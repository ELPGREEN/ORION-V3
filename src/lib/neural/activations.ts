/**
 * ─── Activation Functions & Math Utilities Catalog ───
 * Complete set of activation functions and shared math helpers.
 * Includes standard, advanced, quantum variants, and linear algebra utils.
 * All functions include NaN/Infinity guards for robustness.
 * 
 * Refs: Misra (2019) Mish, Clevert et al. (2015) ELU,
 *       Hendrycks & Gimpel (2016) GELU
 */

// ─── Guard Helper ───

function safeNum(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x;
}

// ─── Standard Activations ───

export function sigmoid(x: number): number {
  const clamped = Math.max(-500, Math.min(500, safeNum(x)));
  return 1 / (1 + Math.exp(-clamped));
}

export function sigmoidDerivative(x: number): number {
  const s = sigmoid(x);
  return s * (1 - s);
}

export function tanh(x: number): number {
  return Math.tanh(safeNum(x));
}

export function tanhDerivative(x: number): number {
  const t = Math.tanh(safeNum(x));
  return 1 - t * t;
}

export function relu(x: number): number {
  return Math.max(0, safeNum(x));
}

export function reluDerivative(x: number): number {
  return safeNum(x) > 0 ? 1 : 0;
}

export function leakyRelu(x: number, alpha = 0.01): number {
  const v = safeNum(x);
  return v > 0 ? v : alpha * v;
}

export function leakyReluDerivative(x: number, alpha = 0.01): number {
  return safeNum(x) > 0 ? 1 : alpha;
}

// ─── Advanced Activations ───

export function softplus(x: number): number {
  const v = safeNum(x);
  if (v > 20) return v;
  if (v < -20) return Math.exp(v);
  return Math.log(1 + Math.exp(v));
}

export function mish(x: number): number {
  const v = safeNum(x);
  return v * Math.tanh(softplus(v));
}

export function mishDerivative(x: number): number {
  const v = safeNum(x);
  const sp = softplus(v);
  const tsp = Math.tanh(sp);
  const omega = 4 * (v + 1) + 4 * Math.exp(2 * v) + Math.exp(3 * v) + Math.exp(v) * (4 * v + 6);
  const delta = 2 * Math.exp(v) + Math.exp(2 * v) + 2;
  return Math.exp(v) * omega / (delta * delta);
}

export function elu(x: number, alpha = 1.0): number {
  const v = safeNum(x);
  return v > 0 ? v : alpha * (Math.exp(v) - 1);
}

export function eluDerivative(x: number, alpha = 1.0): number {
  const v = safeNum(x);
  return v > 0 ? 1 : elu(v, alpha) + alpha;
}

export function gelu(x: number): number {
  const v = safeNum(x);
  const k = Math.sqrt(2 / Math.PI);
  return 0.5 * v * (1 + Math.tanh(k * (v + 0.044715 * v * v * v)));
}

export function swish(x: number): number {
  return safeNum(x) * sigmoid(x);
}

export const silu = swish; // alias

// ─── Quantum Activations ───

export function quantumSigmoid(x: number): number {
  const s = sigmoid(x);
  return s * s;
}

export function quantumTanh(x: number): number {
  const v = safeNum(x);
  return Math.tanh(v) * Math.cos(v * Math.PI / 4);
}

export function quantumRelu(x: number): number {
  const v = safeNum(x);
  return relu(v) * (1 + 0.1 * Math.sin(v));
}

// ─── Softmax ───

export function softmax(values: number[]): number[] {
  if (!values || values.length === 0) return [];
  const safe = values.map(safeNum);
  const maxVal = Math.max(...safe);
  const exps = safe.map(v => Math.exp(v - maxVal));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map(e => e / sum);
}

// ─── Linear Algebra Utilities (consolidated) ───

/** Layer normalization: zero-mean, unit-variance */
export function layerNorm(values: number[]): number[] {
  if (!values || values.length === 0) return [];
  const safe = values.map(safeNum);
  const mean = safe.reduce((a, b) => a + b, 0) / safe.length;
  const variance = safe.reduce((s, v) => s + (v - mean) ** 2, 0) / safe.length;
  const std = Math.sqrt(variance + 1e-5);
  return safe.map(v => (v - mean) / std);
}

/** L2 normalization: unit vector */
export function l2Normalize(vec: number[]): number[] {
  if (!vec || vec.length === 0) return [];
  const safe = vec.map(safeNum);
  const norm = Math.sqrt(safe.reduce((s, v) => s + v * v, 0) + 1e-8);
  return safe.map(v => v / norm);
}

/** Cosine similarity between two vectors */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const dim = Math.min(a.length, b.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < dim; i++) {
    const va = safeNum(a[i]), vb = safeNum(b[i]);
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB) + 1e-8;
  return dot / denom;
}

/** Euclidean distance between two vectors */
export function euclideanDistance(a: number[], b: number[]): number {
  if (!a || !b) return Infinity;
  const dim = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < dim; i++) {
    const d = safeNum(a[i]) - safeNum(b[i]);
    sum += d * d;
  }
  return Math.sqrt(sum);
}
