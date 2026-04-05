/**
 * ─── Decoherence & Error Mitigation ───
 * Models the fragility of quantum states due to environmental interaction.
 * 
 * T1 (relaxation): |1⟩ → |0⟩ decay (amplitude damping)
 * T2 (dephasing): loss of phase coherence (phase randomization)
 * 
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
} from "./qubit-core";

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
  // Reduce off-diagonal coherence by mixing phase randomly
  if (Math.random() > lambda) {
    // Phase kicked randomly
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
 * Models general environmental noise.
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

// ─── Noise Application (batch) ───

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

// ─── Calibration (Readout Error Mitigation) ───

export interface CalibrationMatrix {
  /** P(measure 0 | true 0) */
  p00: number;
  /** P(measure 1 | true 1) */
  p11: number;
}

/**
 * Characterize readout errors by preparing known states and measuring.
 * Creates a confusion matrix for error correction.
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
