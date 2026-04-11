/**
 * ─── Quantum Wave Function Engine (ψ) ───
 * Motor central da função de onda multi-dimensional para o Orion.
 * 
 * ψ(x,t) = Σ cₙφₙ(x)·e^(-iEₙt/ħ)
 * 
 * Now fully synchronized with tensor state vector 2^n for correct
 * entropy, fidelity, entanglement, and decoherence.
 */

import {
  type Complex,
  type QubitState,
  qubitZero,
  qubitFromProbability,
  measureProbability,
  measureCollapse,
  normalize,
  fidelity as qubitFidelity,
  cAbs2,
  cScale,
  cAdd,
  cMul,
  cFromPolar,
  C_ZERO,
} from "./qubit-core";

import {
  type QubitRegister,
  createRegister,
  superpositionAll,
  measureRegister,
} from "./quantum-entanglement";

import {
  applyDecoherence,
  depolarize,
  depolarizeTensor,
  applyDecoherenceTensor,
  type DecoherenceModel,
  DEFAULT_DECOHERENCE,
} from "./quantum-decoherence";

import { hadamard, rotationY } from "./quantum-gates";

import {
  type StateVector,
  tensorFromProbabilities,
  densityMatrix as tensorDensityMatrix,
  vonNeumannEntropy as tensorVonNeumannEntropy,
  stateFidelity as tensorStateFidelity,
  applySingleGate,
  RY2,
  H2,
  measureQubit,
  measureAll as tensorMeasureAll,
  qubitProbability as tensorQubitProbability,
  normalizeSV,
} from "./tensor-state-vector";

// ═══ Types ═══

export interface WaveFunction {
  /** Label for this subsystem (e.g. "cognition", "vision", "hallucination") */
  label: string;
  /** Underlying qubit register */
  register: QubitRegister;
  /** Basis labels for each qubit */
  basisLabels: string[];
  /** Creation timestamp */
  createdAt: number;
  /** Last evolution timestamp */
  evolvedAt: number;
  /** Number of evolution steps applied */
  evolutionSteps: number;
}

export interface CollapseResult {
  /** Measured outcomes per qubit (0 or 1) */
  outcomes: number[];
  /** Bit string representation */
  bitString: string;
  /** Which basis label "won" for each qubit */
  collapsedLabels: string[];
  /** Post-collapse wave function */
  postState: WaveFunction;
  /** Probabilities before collapse */
  priorProbabilities: number[];
}

export interface WaveFunctionMetrics {
  /** von Neumann entropy: S = -Σ pᵢ log₂(pᵢ), 0=pure state, max=log₂(n) */
  entropy: number;
  /** Maximum possible entropy for this register size */
  maxEntropy: number;
  /** Normalized entropy (0-1): 0=certain, 1=maximally uncertain */
  normalizedEntropy: number;
  /** Probabilities of each qubit measuring |1⟩ */
  probabilities: number[];
  /** Mean probability across qubits */
  meanProbability: number;
  /** Variance in probabilities (low=uniform, high=peaked) */
  variance: number;
}

// ═══ Core: Create Wave Function ═══

/**
 * Create a wave function from labeled probability dimensions.
 * Each dimension becomes a qubit with P(|1⟩) = probability.
 * Builds tensor state 2^n for correct entropy/fidelity/entanglement.
 */
export function createWaveFunction(
  label: string,
  dimensions: Record<string, number>
): WaveFunction {
  const entries = Object.entries(dimensions);
  const n = Math.max(1, Math.min(entries.length, 12)); // Max 12 for tensor
  const reg = createRegister(n);

  const probs: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = Math.max(0, Math.min(1, entries[i][1]));
    reg.qubits[i] = qubitFromProbability(p);
    probs.push(p);
  }

  // Build synchronized tensor state |ψ⟩ = ⊗ᵢ (√(1-pᵢ)|0⟩ + √pᵢ|1⟩)
  reg.tensorState = tensorFromProbabilities(probs);

  return {
    label,
    register: reg,
    basisLabels: entries.slice(0, n).map(e => e[0]),
    createdAt: Date.now(),
    evolvedAt: Date.now(),
    evolutionSteps: 0,
  };
}

/**
 * Create a wave function from raw qubit states.
 */
export function createWaveFunctionFromQubits(
  label: string,
  qubits: QubitState[],
  labels?: string[]
): WaveFunction {
  const n = Math.max(1, Math.min(qubits.length, 12));
  const reg = createRegister(n);
  const probs: number[] = [];
  for (let i = 0; i < n; i++) {
    reg.qubits[i] = normalize(qubits[i]);
    probs.push(measureProbability(reg.qubits[i]));
  }
  reg.tensorState = tensorFromProbabilities(probs);
  return {
    label,
    register: reg,
    basisLabels: labels ?? qubits.map((_, i) => `q${i}`),
    createdAt: Date.now(),
    evolvedAt: Date.now(),
    evolutionSteps: 0,
  };
}

// ═══ Superpose: Create Superposition ═══

/**
 * Put specific qubits into equal superposition (Hadamard).
 * Applies H gate on both per-qubit and tensor state.
 */
export function superpose(wf: WaveFunction, indices?: number[]): WaveFunction {
  const reg = { ...wf.register, qubits: [...wf.register.qubits] };
  const targets = indices ?? reg.qubits.map((_, i) => i);

  // Update tensor state
  let ts = reg.tensorState;
  for (const i of targets) {
    if (i >= 0 && i < reg.n) {
      reg.qubits[i] = hadamard(reg.qubits[i]);
      if (ts) {
        ts = applySingleGate(H2, i, reg.n, ts);
      }
    }
  }
  reg.tensorState = ts;

  return { ...wf, register: reg, evolvedAt: Date.now() };
}

/**
 * Blend two wave functions by mixing their qubit amplitudes.
 * NOTE: This is a classical approximation — not a unitary operation.
 * Result is normalized to maintain |α|² + |β|² = 1.
 */
export function blend(a: WaveFunction, b: WaveFunction, weightB: number = 0.5): WaveFunction {
  const n = Math.min(a.register.n, b.register.n);
  const wA = 1 - weightB;
  const reg = createRegister(n);

  const probs: number[] = [];
  for (let i = 0; i < n; i++) {
    const qa = a.register.qubits[i];
    const qb = b.register.qubits[i];
    reg.qubits[i] = normalize([
      cAdd(cScale(wA, qa[0]), cScale(weightB, qb[0])),
      cAdd(cScale(wA, qa[1]), cScale(weightB, qb[1])),
    ]);
    probs.push(measureProbability(reg.qubits[i]));
  }

  // Rebuild tensor state from blended probabilities
  reg.tensorState = tensorFromProbabilities(probs);

  return {
    label: `${a.label}⊗${b.label}`,
    register: reg,
    basisLabels: a.basisLabels.slice(0, n),
    createdAt: Date.now(),
    evolvedAt: Date.now(),
    evolutionSteps: 0,
  };
}

// ═══ Evolve: Schrödinger Time Evolution (Discretized) ═══

/**
 * Evolve the wave function under a simplified Hamiltonian.
 * Applies RY(E·dt) on both per-qubit and tensor state.
 */
export function evolve(
  wf: WaveFunction,
  hamiltonian: Record<string, number>,
  dt: number = 0.05
): WaveFunction {
  const reg = { ...wf.register, qubits: [...wf.register.qubits] };
  let ts = reg.tensorState;

  for (let i = 0; i < reg.n; i++) {
    const label = wf.basisLabels[i];
    const energy = hamiltonian[label] ?? 0;
    if (Math.abs(energy) > 1e-10) {
      const angle = energy * dt;
      reg.qubits[i] = rotationY(angle, reg.qubits[i]);
      if (ts) {
        ts = applySingleGate(RY2(angle), i, reg.n, ts);
      }
    }
  }

  reg.tensorState = ts;
  return {
    ...wf,
    register: reg,
    evolvedAt: Date.now(),
    evolutionSteps: wf.evolutionSteps + 1,
  };
}

// ═══ Collapse: Born Rule Measurement ═══

/**
 * Measure (collapse) the entire wave function.
 * Uses tensor state for correct joint probability distribution.
 */
export function collapse(wf: WaveFunction): CollapseResult {
  const n = wf.register.n;

  // Get prior probabilities from tensor state
  const priorProbabilities = wf.register.tensorState
    ? Array.from({ length: n }, (_, i) => tensorQubitProbability(i, n, wf.register.tensorState!))
    : wf.register.qubits.map(q => measureProbability(q));

  // Measure using tensor state if available
  if (wf.register.tensorState) {
    const { outcomes, bitString, postState } = tensorMeasureAll(n, wf.register.tensorState);
    const reg = createRegister(n);
    reg.tensorState = postState;
    // Sync per-qubit states
    for (let i = 0; i < n; i++) {
      reg.qubits[i] = qubitFromProbability(outcomes[i]);
    }

    const collapsedLabels = outcomes.map((o, i) =>
      o === 1 ? wf.basisLabels[i] : `¬${wf.basisLabels[i]}`
    );

    return {
      outcomes,
      bitString,
      collapsedLabels,
      postState: { ...wf, register: reg, evolvedAt: Date.now() },
      priorProbabilities,
    };
  }

  // Legacy fallback
  const { outcomes, bitString, register } = measureRegister(wf.register);
  const collapsedLabels = outcomes.map((o, i) =>
    o === 1 ? wf.basisLabels[i] : `¬${wf.basisLabels[i]}`
  );

  return {
    outcomes,
    bitString,
    collapsedLabels,
    postState: { ...wf, register, evolvedAt: Date.now() },
    priorProbabilities,
  };
}

/**
 * Selective measurement: collapse only specific qubits.
 * Uses tensor partial measurement when available.
 */
export function collapsePartial(wf: WaveFunction, indices: number[]): CollapseResult {
  const n = wf.register.n;
  const priorProbabilities = wf.register.tensorState
    ? Array.from({ length: n }, (_, i) => tensorQubitProbability(i, n, wf.register.tensorState!))
    : wf.register.qubits.map(q => measureProbability(q));

  const reg = { ...wf.register, qubits: [...wf.register.qubits] };
  const outcomes: number[] = new Array(reg.n).fill(-1);
  let ts = reg.tensorState;

  for (const i of indices) {
    if (i >= 0 && i < reg.n) {
      if (ts) {
        // Tensor partial measurement
        const { outcome, postState } = measureQubit(i, reg.n, ts);
        outcomes[i] = outcome;
        ts = postState;
        reg.qubits[i] = qubitFromProbability(outcome);
      } else {
        // Legacy
        const { outcome, postState } = measureCollapse(reg.qubits[i]);
        outcomes[i] = outcome;
        reg.qubits[i] = postState;
      }
    }
  }

  reg.tensorState = ts;
  const collapsedLabels = outcomes.map((o, i) =>
    o === -1 ? `~${wf.basisLabels[i]}` : o === 1 ? wf.basisLabels[i] : `¬${wf.basisLabels[i]}`
  );

  return {
    outcomes,
    bitString: outcomes.map(o => o === -1 ? "?" : String(o)).join(""),
    collapsedLabels,
    postState: { ...wf, register: reg, evolvedAt: Date.now() },
    priorProbabilities,
  };
}

// ═══ Entropy: von Neumann Entropy ═══

/**
 * Calculate von Neumann entropy of the wave function.
 * Tensor mode: S(ρ) = -Tr(ρ log₂ ρ) via density matrix eigenvalues.
 * Legacy: S = -Σ pᵢ log₂(pᵢ) per qubit.
 */
export function entropy(wf: WaveFunction): number {
  if (wf.register.tensorState) {
    const rho = tensorDensityMatrix(wf.register.tensorState);
    return tensorVonNeumannEntropy(rho);
  }
  let s = 0;
  for (const q of wf.register.qubits) {
    const p1 = measureProbability(q);
    const p0 = 1 - p1;
    if (p1 > 1e-10) s -= p1 * Math.log2(p1);
    if (p0 > 1e-10) s -= p0 * Math.log2(p0);
  }
  return s;
}

/** Maximum entropy for n qubits. */
export function maxEntropy(n: number): number {
  return n;
}

/** Normalized entropy: 0 = certain, 1 = maximally uncertain. */
export function normalizedEntropy(wf: WaveFunction): number {
  const s = entropy(wf);
  const m = maxEntropy(wf.register.n);
  return m > 0 ? s / m : 0;
}

// ═══ Metrics ═══

export function getMetrics(wf: WaveFunction): WaveFunctionMetrics {
  const n = wf.register.n;
  const probabilities = wf.register.tensorState
    ? Array.from({ length: n }, (_, i) => tensorQubitProbability(i, n, wf.register.tensorState!))
    : wf.register.qubits.map(q => measureProbability(q));

  const s = entropy(wf);
  const m = maxEntropy(n);
  const mean = probabilities.reduce((a, b) => a + b, 0) / probabilities.length;
  const variance = probabilities.reduce((a, p) => a + (p - mean) ** 2, 0) / probabilities.length;

  return {
    entropy: s,
    maxEntropy: m,
    normalizedEntropy: m > 0 ? s / m : 0,
    probabilities,
    meanProbability: mean,
    variance,
  };
}

// ═══ Fidelity ═══

/**
 * Compute fidelity: F = |⟨ψ₁|ψ₂⟩|² via tensor state.
 */
export function waveFidelity(a: WaveFunction, b: WaveFunction): number {
  if (a.register.tensorState && b.register.tensorState) {
    return tensorStateFidelity(a.register.tensorState, b.register.tensorState);
  }
  const n = Math.min(a.register.n, b.register.n);
  let f = 1;
  for (let i = 0; i < n; i++) {
    f *= qubitFidelity(a.register.qubits[i], b.register.qubits[i]);
  }
  return f;
}

// ═══ Decoherence ═══

/**
 * Apply decoherence to the wave function.
 * Uses tensor Kraus channels when tensor state is available.
 */
export function decohere(wf: WaveFunction, noise: number = 0.05): WaveFunction {
  const reg = { ...wf.register, qubits: [...wf.register.qubits] };

  if (reg.tensorState) {
    // Tensor depolarizing channel on each qubit
    let ts = reg.tensorState;
    for (let i = 0; i < reg.n; i++) {
      ts = depolarizeTensor(ts, i, reg.n, noise);
    }
    reg.tensorState = ts;
    // Sync per-qubit from tensor
    for (let i = 0; i < reg.n; i++) {
      const p = tensorQubitProbability(i, reg.n, ts);
      reg.qubits[i] = qubitFromProbability(p);
    }
  } else {
    for (let i = 0; i < reg.n; i++) {
      reg.qubits[i] = depolarize(reg.qubits[i], noise);
    }
  }

  return { ...wf, register: reg, evolvedAt: Date.now() };
}

/**
 * Apply full decoherence model (T1+T2) — tensor Kraus or legacy.
 */
export function decoherePhysical(wf: WaveFunction, model?: DecoherenceModel): WaveFunction {
  const reg = { ...wf.register, qubits: [...wf.register.qubits] };
  const m = model ?? DEFAULT_DECOHERENCE;

  if (reg.tensorState) {
    reg.tensorState = applyDecoherenceTensor(reg.tensorState, reg.n, m);
    for (let i = 0; i < reg.n; i++) {
      const p = tensorQubitProbability(i, reg.n, reg.tensorState);
      reg.qubits[i] = qubitFromProbability(p);
    }
  } else {
    for (let i = 0; i < reg.n; i++) {
      reg.qubits[i] = applyDecoherence(reg.qubits[i], m);
    }
  }

  return { ...wf, register: reg, evolvedAt: Date.now() };
}

// ═══ Utility ═══

export function confidenceWaveFunction(
  label: string,
  signals: Array<{ name: string; confidence: number }>
): WaveFunction {
  const dims: Record<string, number> = {};
  for (const s of signals) {
    dims[s.name] = Math.max(0, Math.min(1, s.confidence));
  }
  return createWaveFunction(label, dims);
}

export function isUncertain(wf: WaveFunction, threshold: number = 0.6): boolean {
  return normalizedEntropy(wf) > threshold;
}

export function getDominantDimension(wf: WaveFunction): { label: string; probability: number } {
  const n = wf.register.n;
  let maxP = -1;
  let maxIdx = 0;
  for (let i = 0; i < n; i++) {
    const p = wf.register.tensorState
      ? tensorQubitProbability(i, n, wf.register.tensorState)
      : measureProbability(wf.register.qubits[i]);
    if (p > maxP) { maxP = p; maxIdx = i; }
  }
  return { label: wf.basisLabels[maxIdx], probability: maxP };
}
