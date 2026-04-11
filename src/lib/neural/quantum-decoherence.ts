/**
 * ─── Decoherence & Error Mitigation ───
 * Models the fragility of quantum states due to environmental interaction.
 * 
 * T1 (relaxation): |1⟩ → |0⟩ decay (amplitude damping)
 * T2 (dephasing): loss of phase coherence (phase randomization)
 * 
 * Supports both per-qubit (legacy) and tensor 2^n Kraus channels.
 * Calibration: readout error mitigation via confusion matrix inversion.
 */

import {
  type QubitState,
  qubitZero,
  qubitFromProbability,
  normalize,
  measureCollapse,
  measureProbability,
  cAbs2,
  C_ZERO,
  type Complex,
  cMul,
  cAdd,
  cScale,
  cConj,
} from "./qubit-core";

import {
  type StateVector,
  type DensityMatrix,
  applySingleGate,
  I2,
  normalizeSV,
} from "./tensor-state-vector";

// ─── Decoherence Parameters ───

export interface DecoherenceModel {
  /** T1 relaxation time (arbitrary units). Higher = more stable. */
  t1: number;
  /** T2 dephasing time. Must satisfy T2 ≤ 2·T1. */
  t2: number;
  /** Gate operation time (determines error per gate). */
  tGate: number;
}

export const DEFAULT_DECOHERENCE: DecoherenceModel = {
  t1: 100,    // ~100 μs for superconducting qubits
  t2: 50,     // T2 ≤ 2·T1
  tGate: 0.02 // ~20 ns gate time
};

/**
 * Apply T1 amplitude damping to a qubit.
 * Probability of |1⟩ → |0⟩ decay: p = 1 - e^(-t/T1)
 */
export function amplitudeDamping(q: QubitState, t: number, t1: number): QubitState {
  if (t1 <= 0) return q;
  const gamma = 1 - Math.exp(-t / t1);
  const p1 = cAbs2(q[1]);
  const dampedP1 = p1 * (1 - gamma);
  return normalize(qubitFromProbability(dampedP1));
}

/**
 * Apply T2 phase damping (dephasing) to a qubit.
 * Off-diagonal elements of density matrix decay: ρ₀₁ → ρ₀₁·e^(-t/T2)
 */
export function phaseDamping(q: QubitState, t: number, t2: number): QubitState {
  if (t2 <= 0) return q;
  const lambda = Math.exp(-t / t2);
  if (Math.random() > lambda) {
    const randomPhase = Math.random() * 2 * Math.PI;
    const c = Math.cos(randomPhase);
    const s = Math.sin(randomPhase);
    return [
      q[0],
      [q[1][0] * c - q[1][1] * s, q[1][0] * s + q[1][1] * c],
    ];
  }
  return q;
}

/**
 * Apply full decoherence model (T1 + T2) after one gate operation.
 */
export function applyDecoherence(q: QubitState, model: DecoherenceModel = DEFAULT_DECOHERENCE): QubitState {
  let state = amplitudeDamping(q, model.tGate, model.t1);
  state = phaseDamping(state, model.tGate, model.t2);
  return state;
}

/**
 * Calculate coherence lifetime: how many gates before decoherence dominates.
 */
export function coherenceLifetime(model: DecoherenceModel): number {
  return Math.floor(Math.min(model.t1, model.t2) / model.tGate);
}

// ─── Depolarizing Channel ───

/**
 * Depolarizing noise: with probability p, replace state with maximally mixed.
 */
export function depolarize(q: QubitState, p: number): QubitState {
  if (Math.random() < p) {
    return qubitFromProbability(0.5);
  }
  return q;
}

/**
 * Phase flip (bit-phase error): Z gate applied with probability p.
 */
export function phaseFlip(q: QubitState, p: number): QubitState {
  if (Math.random() < p) {
    return [q[0], [-q[1][0], -q[1][1]]];
  }
  return q;
}

/**
 * Bit flip: X gate applied with probability p.
 */
export function bitFlip(q: QubitState, p: number): QubitState {
  if (Math.random() < p) {
    return [q[1], q[0]];
  }
  return q;
}

// ─── Noise Application (batch, per-qubit legacy) ───

export type NoiseModelType = "none" | "depolarizing" | "amplitude_damping" | "phase_flip";

export function applyNoise(
  qubits: QubitState[],
  model: NoiseModelType,
  strength: number
): QubitState[] {
  if (model === "none") return qubits;
  return qubits.map(q => {
    switch (model) {
      case "depolarizing":
        return depolarize(q, strength);
      case "amplitude_damping":
        return amplitudeDamping(q, 1, 1 / Math.max(strength, 1e-10));
      case "phase_flip":
        return phaseFlip(q, strength);
      default:
        return q;
    }
  });
}

// ═══ Tensor Kraus Channels (2^n state vector) ═══

/**
 * Depolarizing channel on qubit `target` in an n-qubit tensor state.
 * ρ' = (1-p)ρ + (p/3)(XρX + YρY + ZρZ)
 * 
 * Implemented via stochastic Kraus: with probability p, apply random Pauli.
 * For state vectors, this is exact in the Monte Carlo sense.
 */
export function depolarizeTensor(
  sv: StateVector,
  target: number,
  n: number,
  p: number
): StateVector {
  if (p <= 0 || Math.random() > p) return sv;
  
  // Pick random Pauli: X (0), Y (1), Z (2)
  const pauliChoice = Math.floor(Math.random() * 3);
  
  const X2: Complex[][] = [[C_ZERO, [1, 0]], [[1, 0], C_ZERO]];
  const Y2: Complex[][] = [[C_ZERO, [0, -1]], [[0, 1], C_ZERO]];
  const Z2: Complex[][] = [[[1, 0], C_ZERO], [C_ZERO, [-1, 0]]];
  
  const gates = [X2, Y2, Z2];
  return applySingleGate(gates[pauliChoice], target, n, sv);
}

/**
 * Amplitude damping (T1 decay) on qubit `target` in tensor state.
 * Kraus operators:
 *   E₀ = |0⟩⟨0| + √(1-γ)|1⟩⟨1|
 *   E₁ = √γ |0⟩⟨1|
 * 
 * For state vectors, stochastic: with probability γ·P(target=1), decay happens.
 */
export function amplitudeDampingTensor(
  sv: StateVector,
  target: number,
  n: number,
  gamma: number
): StateVector {
  if (gamma <= 0) return sv;
  
  const dim = 1 << n;
  const tBit = n - 1 - target;
  const mask = 1 << tBit;
  
  // Compute P(target=1)
  let p1 = 0;
  for (let i = 0; i < dim; i++) {
    if (i & mask) p1 += cAbs2(sv[i]);
  }
  
  // Stochastic: decay happens with probability gamma * p1
  if (Math.random() < gamma * p1 && p1 > 1e-15) {
    // Apply E₁ = √γ |0⟩⟨1| on target: move |1⟩ amplitudes to |0⟩
    const result: StateVector = new Array(dim);
    for (let i = 0; i < dim; i++) result[i] = C_ZERO;
    
    for (let i = 0; i < dim; i++) {
      if (i & mask) {
        // This basis state has target=1 → map to target=0
        const j = i & ~mask;
        result[j] = cAdd(result[j], cScale(Math.sqrt(gamma), sv[i]));
      }
    }
    return normalizeSV(result);
  }
  
  // Apply E₀ = |0⟩⟨0| + √(1-γ)|1⟩⟨1|: dampen |1⟩ amplitudes
  const result: StateVector = [...sv];
  const sqrtSurv = Math.sqrt(1 - gamma);
  for (let i = 0; i < dim; i++) {
    if (i & mask) {
      result[i] = cScale(sqrtSurv, sv[i]);
    }
  }
  return normalizeSV(result);
}

/**
 * Phase damping (T2 dephasing) on qubit `target` in tensor state.
 * With probability (1-λ), apply random phase to |1⟩ amplitudes.
 * λ = e^(-t/T2)
 */
export function phaseDampingTensor(
  sv: StateVector,
  target: number,
  n: number,
  lambda: number
): StateVector {
  if (lambda >= 1 || Math.random() < lambda) return sv;
  
  const dim = 1 << n;
  const tBit = n - 1 - target;
  const mask = 1 << tBit;
  const phase = Math.random() * 2 * Math.PI;
  const c = Math.cos(phase);
  const s = Math.sin(phase);
  
  const result: StateVector = [...sv];
  for (let i = 0; i < dim; i++) {
    if (i & mask) {
      const re = sv[i][0];
      const im = sv[i][1];
      result[i] = [re * c - im * s, re * s + im * c];
    }
  }
  return result;
}

/**
 * Apply noise model to full tensor state vector.
 * Applies channel to each qubit independently (local noise model).
 */
export function applyNoiseTensor(
  sv: StateVector,
  n: number,
  model: NoiseModelType,
  strength: number
): StateVector {
  if (model === "none" || strength <= 0) return sv;
  
  let state = sv;
  for (let q = 0; q < n; q++) {
    switch (model) {
      case "depolarizing":
        state = depolarizeTensor(state, q, n, strength);
        break;
      case "amplitude_damping": {
        const gamma = 1 - Math.exp(-1 / Math.max(1 / strength, 1e-10));
        state = amplitudeDampingTensor(state, q, n, gamma);
        break;
      }
      case "phase_flip":
        // Phase flip = Z with probability p
        if (Math.random() < strength) {
          const Z2: Complex[][] = [[[1, 0], C_ZERO], [C_ZERO, [-1, 0]]];
          state = applySingleGate(Z2, q, n, state);
        }
        break;
    }
  }
  return state;
}

/**
 * Apply full decoherence model (T1+T2) to tensor state.
 */
export function applyDecoherenceTensor(
  sv: StateVector,
  n: number,
  model: DecoherenceModel = DEFAULT_DECOHERENCE
): StateVector {
  let state = sv;
  const gamma = 1 - Math.exp(-model.tGate / model.t1);
  const lambda = Math.exp(-model.tGate / model.t2);
  
  for (let q = 0; q < n; q++) {
    state = amplitudeDampingTensor(state, q, n, gamma);
    state = phaseDampingTensor(state, q, n, lambda);
  }
  return state;
}

// ─── Calibration (Readout Error Mitigation) ───

export interface CalibrationMatrix {
  /** P(measure 0 | true 0) */
  p00: number;
  /** P(measure 1 | true 1) */
  p11: number;
}

/**
 * Characterize readout errors by preparing known states and measuring.
 */
export function calibrate(shots: number = 1000, noiseStrength: number = 0.01): CalibrationMatrix {
  let correct0 = 0;
  let correct1 = 0;
  for (let i = 0; i < shots; i++) {
    const q0 = depolarize(qubitZero(), noiseStrength);
    if (measureCollapse(q0).outcome === 0) correct0++;
    const q1 = depolarize([[0, 0], [1, 0]] as QubitState, noiseStrength);
    if (measureCollapse(q1).outcome === 1) correct1++;
  }
  return { p00: correct0 / shots, p11: correct1 / shots };
}

/**
 * Apply calibration: invert confusion matrix to correct raw measurement.
 */
export function applyCalibration(rawP1: number, cal: CalibrationMatrix): number {
  const denom = cal.p00 + cal.p11 - 1;
  if (Math.abs(denom) < 1e-10) return rawP1;
  return Math.max(0, Math.min(1, (rawP1 - (1 - cal.p00)) / denom));
}
