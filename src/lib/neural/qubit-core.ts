/**
 * ─── Qubit Core: Complex Arithmetic & State Primitives ───
 * Fundamentos: número complexo, estado qubit, normalização.
 * 
 * |ψ⟩ = α|0⟩ + β|1⟩  onde  |α|² + |β|² = 1
 * Representação: [α, β] com α,β ∈ ℂ = [real, imag]
 */

// ─── Complex Number ───

/** Complex number as [real, imaginary] */
export type Complex = [number, number];

export function cMul(a: Complex, b: Complex): Complex {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
}

export function cAdd(a: Complex, b: Complex): Complex {
  return [a[0] + b[0], a[1] + b[1]];
}

export function cSub(a: Complex, b: Complex): Complex {
  return [a[0] - b[0], a[1] - b[1]];
}

export function cAbs2(a: Complex): number {
  return a[0] * a[0] + a[1] * a[1];
}

export function cAbs(a: Complex): number {
  return Math.sqrt(cAbs2(a));
}

export function cConj(a: Complex): Complex {
  return [a[0], -a[1]];
}

export function cScale(s: number, a: Complex): Complex {
  return [s * a[0], s * a[1]];
}

export function cFromPolar(r: number, theta: number): Complex {
  return [r * Math.cos(theta), r * Math.sin(theta)];
}

export function cPhase(a: Complex): number {
  return Math.atan2(a[1], a[0]);
}

/** Complex zero */
export const C_ZERO: Complex = [0, 0];
/** Complex one */
export const C_ONE: Complex = [1, 0];
/** Complex i */
export const C_I: Complex = [0, 1];

// ─── Single Qubit State ───

/** Single qubit: |ψ⟩ = α|0⟩ + β|1⟩ as [α, β] */
export type QubitState = [Complex, Complex];

/** |0⟩ state */
export function qubitZero(): QubitState {
  return [[1, 0], [0, 0]];
}

/** |1⟩ state */
export function qubitOne(): QubitState {
  return [[0, 0], [1, 0]];
}

/** |+⟩ = (|0⟩ + |1⟩)/√2 — equal superposition */
export function qubitPlus(): QubitState {
  const s = 1 / Math.sqrt(2);
  return [[s, 0], [s, 0]];
}

/** |−⟩ = (|0⟩ − |1⟩)/√2 */
export function qubitMinus(): QubitState {
  const s = 1 / Math.sqrt(2);
  return [[s, 0], [-s, 0]];
}

/** Create qubit with P(|1⟩) = p, real amplitudes */
export function qubitFromProbability(p: number): QubitState {
  const clamped = Math.max(0, Math.min(1, p));
  return [[Math.sqrt(1 - clamped), 0], [Math.sqrt(clamped), 0]];
}

/** Normalize qubit state so |α|²+|β|² = 1 */
export function normalize(q: QubitState): QubitState {
  const norm = Math.sqrt(cAbs2(q[0]) + cAbs2(q[1]));
  if (norm < 1e-12) return qubitZero();
  return [
    [q[0][0] / norm, q[0][1] / norm],
    [q[1][0] / norm, q[1][1] / norm],
  ];
}

/** Born rule: probability of measuring |1⟩ */
export function measureProbability(q: QubitState): number {
  return cAbs2(q[1]);
}

/** Collapse qubit via Born rule. Returns 0 or 1. */
export function measureCollapse(q: QubitState): { outcome: number; postState: QubitState } {
  const p1 = cAbs2(q[1]);
  const outcome = Math.random() < p1 ? 1 : 0;
  const postState: QubitState = outcome === 0 ? qubitZero() : qubitOne();
  return { outcome, postState };
}

// ─── Bloch Sphere (Schumacher 1995) ───

export interface BlochCoordinates {
  /** θ ∈ [0, π]: polar angle from |0⟩ pole */
  theta: number;
  /** φ ∈ [0, 2π): azimuthal angle in equatorial plane */
  phi: number;
  /** Cartesian (x, y, z) on unit sphere */
  x: number;
  y: number;
  z: number;
}

/**
 * Convert qubit state to Bloch sphere coordinates.
 * |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩
 */
export function toBlochSphere(q: QubitState): BlochCoordinates {
  const nq = normalize(q);
  const alpha = nq[0];
  const beta = nq[1];

  // θ = 2·arccos(|α|), clamped for numerical stability
  const alphaAbs = Math.min(1, cAbs(alpha));
  const theta = 2 * Math.acos(alphaAbs);

  // φ = arg(β) - arg(α): relative phase
  const phi = (cPhase(beta) - cPhase(alpha) + 2 * Math.PI) % (2 * Math.PI);

  // Cartesian on Bloch sphere
  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(theta);

  return { theta, phi, x, y, z };
}

/**
 * Create qubit from Bloch sphere angles.
 * |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ}sin(θ/2)|1⟩
 */
export function fromBlochSphere(theta: number, phi: number): QubitState {
  const alpha: Complex = [Math.cos(theta / 2), 0];
  const beta: Complex = cFromPolar(Math.sin(theta / 2), phi);
  return [alpha, beta];
}

/**
 * Fidelity between two qubit states: F = |⟨ψ₁|ψ₂⟩|²
 */
export function fidelity(a: QubitState, b: QubitState): number {
  // ⟨a|b⟩ = conj(α_a)·α_b + conj(β_a)·β_b
  const inner = cAdd(cMul(cConj(a[0]), b[0]), cMul(cConj(a[1]), b[1]));
  return cAbs2(inner);
}
