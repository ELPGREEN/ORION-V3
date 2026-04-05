/**
 * ─── Quantum Wave Function Engine (ψ) ───
 * Motor central da função de onda multi-dimensional para o Orion.
 * 
 * ψ(x,t) = Σ cₙφₙ(x)·e^(-iEₙt/ħ)
 * 
 * Abstração sobre registros multi-qubit para representar subsistemas
 * cognitivos (visão, texto, consciência) como estados quânticos com
 * superposição, colapso (Born rule), decoerência e entropia de von Neumann.
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
  type DecoherenceModel,
  DEFAULT_DECOHERENCE,
} from "./quantum-decoherence";

import { hadamard, rotationY } from "./quantum-gates";

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
 * 
 * Example: createWaveFunction("cognition", { episodic: 0.8, causal: 0.3, tom: 0.5 })
 */
export function createWaveFunction(
  label: string,
  dimensions: Record<string, number>
): WaveFunction {
  const entries = Object.entries(dimensions);
  const n = Math.max(1, Math.min(entries.length, 20));
  const reg = createRegister(n);

  // Initialize each qubit with its probability amplitude
  for (let i = 0; i < n; i++) {
    const p = Math.max(0, Math.min(1, entries[i][1]));
    reg.qubits[i] = qubitFromProbability(p);
  }

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
  const n = Math.max(1, Math.min(qubits.length, 20));
  const reg = createRegister(n);
  for (let i = 0; i < n; i++) {
    reg.qubits[i] = normalize(qubits[i]);
  }
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
 * If no indices given, superposes all.
 */
export function superpose(wf: WaveFunction, indices?: number[]): WaveFunction {
  const reg = { ...wf.register, qubits: [...wf.register.qubits] };
  const targets = indices ?? reg.qubits.map((_, i) => i);
  for (const i of targets) {
    if (i >= 0 && i < reg.n) {
      reg.qubits[i] = hadamard(reg.qubits[i]);
    }
  }
  return { ...wf, register: reg, evolvedAt: Date.now() };
}

/**
 * Blend two wave functions by mixing their qubit amplitudes.
 * Useful for combining vision + cognition subsystems.
 */
export function blend(a: WaveFunction, b: WaveFunction, weightB: number = 0.5): WaveFunction {
  const n = Math.min(a.register.n, b.register.n);
  const wA = 1 - weightB;
  const reg = createRegister(n);

  for (let i = 0; i < n; i++) {
    const qa = a.register.qubits[i];
    const qb = b.register.qubits[i];
    reg.qubits[i] = normalize([
      cAdd(cScale(wA, qa[0]), cScale(weightB, qb[0])),
      cAdd(cScale(wA, qa[1]), cScale(weightB, qb[1])),
    ]);
  }

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
 * 
 * Each qubit evolves via rotation: |ψ⟩ → Ry(E·dt/ħ)|ψ⟩
 * where E is the "energy" of that dimension.
 * 
 * @param wf - Wave function to evolve
 * @param hamiltonian - Energy per dimension (maps label → energy in [0,1])
 * @param dt - Time step (arbitrary units, typically 0.01-0.1)
 */
export function evolve(
  wf: WaveFunction,
  hamiltonian: Record<string, number>,
  dt: number = 0.05
): WaveFunction {
  const reg = { ...wf.register, qubits: [...wf.register.qubits] };

  for (let i = 0; i < reg.n; i++) {
    const label = wf.basisLabels[i];
    const energy = hamiltonian[label] ?? 0;
    if (Math.abs(energy) > 1e-10) {
      // Ry(θ) rotation where θ = E·dt
      const angle = energy * dt;
      reg.qubits[i] = rotationY(angle, reg.qubits[i]);
    }
  }

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
 * Each qubit collapses to |0⟩ or |1⟩ with probability |cₙ|².
 */
export function collapse(wf: WaveFunction): CollapseResult {
  const priorProbabilities = wf.register.qubits.map(q => measureProbability(q));
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
 */
export function collapsePartial(wf: WaveFunction, indices: number[]): CollapseResult {
  const priorProbabilities = wf.register.qubits.map(q => measureProbability(q));
  const reg = { ...wf.register, qubits: [...wf.register.qubits] };
  const outcomes: number[] = new Array(reg.n).fill(-1);

  for (const i of indices) {
    if (i >= 0 && i < reg.n) {
      const { outcome, postState } = measureCollapse(reg.qubits[i]);
      outcomes[i] = outcome;
      reg.qubits[i] = postState;
    }
  }

  // Unmeasured qubits keep outcome -1
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
 * S = -Σ pᵢ log₂(pᵢ) where pᵢ = P(|1⟩) for each qubit.
 * 
 * Returns 0 for pure certain states, max for maximally mixed.
 */
export function entropy(wf: WaveFunction): number {
  let s = 0;
  for (const q of wf.register.qubits) {
    const p1 = measureProbability(q);
    const p0 = 1 - p1;
    if (p1 > 1e-10) s -= p1 * Math.log2(p1);
    if (p0 > 1e-10) s -= p0 * Math.log2(p0);
  }
  return s;
}

/**
 * Maximum entropy for n qubits (each maximally mixed = 0.5).
 */
export function maxEntropy(n: number): number {
  return n; // Each qubit contributes max 1 bit of entropy
}

/**
 * Normalized entropy: 0 = fully certain, 1 = maximally uncertain.
 */
export function normalizedEntropy(wf: WaveFunction): number {
  const s = entropy(wf);
  const m = maxEntropy(wf.register.n);
  return m > 0 ? s / m : 0;
}

// ═══ Metrics: Full Analysis ═══

/**
 * Compute comprehensive metrics for the wave function.
 */
export function getMetrics(wf: WaveFunction): WaveFunctionMetrics {
  const probabilities = wf.register.qubits.map(q => measureProbability(q));
  const s = entropy(wf);
  const m = maxEntropy(wf.register.n);
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

// ═══ Fidelity: State Comparison ═══

/**
 * Compute fidelity between two wave functions.
 * F = Π fidelity(qᵢ_a, qᵢ_b) — product of per-qubit fidelities.
 * Returns 1 for identical states, 0 for orthogonal.
 */
export function waveFidelity(a: WaveFunction, b: WaveFunction): number {
  const n = Math.min(a.register.n, b.register.n);
  let f = 1;
  for (let i = 0; i < n; i++) {
    f *= qubitFidelity(a.register.qubits[i], b.register.qubits[i]);
  }
  return f;
}

// ═══ Decoherence: Environmental Noise ═══

/**
 * Apply decoherence to the wave function.
 * Models environmental noise degrading quantum coherence.
 * 
 * @param wf - Wave function
 * @param noise - Noise strength 0-1 (0=no noise, 1=fully decohered)
 */
export function decohere(wf: WaveFunction, noise: number = 0.05): WaveFunction {
  const reg = { ...wf.register, qubits: [...wf.register.qubits] };
  for (let i = 0; i < reg.n; i++) {
    reg.qubits[i] = depolarize(reg.qubits[i], noise);
  }
  return { ...wf, register: reg, evolvedAt: Date.now() };
}

/**
 * Apply full decoherence model (T1+T2) to each qubit.
 */
export function decoherePhysical(wf: WaveFunction, model?: DecoherenceModel): WaveFunction {
  const reg = { ...wf.register, qubits: [...wf.register.qubits] };
  for (let i = 0; i < reg.n; i++) {
    reg.qubits[i] = applyDecoherence(reg.qubits[i], model ?? DEFAULT_DECOHERENCE);
  }
  return { ...wf, register: reg, evolvedAt: Date.now() };
}

// ═══ Utility: Quick Constructors ═══

/**
 * Create a "confidence wave function" from a list of (label, confidence) pairs.
 * Shortcut for the anti-hallucination and vision pipelines.
 */
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

/**
 * Quick entropy check: is this wave function "uncertain"?
 * Returns true if normalized entropy > threshold.
 */
export function isUncertain(wf: WaveFunction, threshold: number = 0.6): boolean {
  return normalizedEntropy(wf) > threshold;
}

/**
 * Get dominant dimension: the qubit most likely to measure |1⟩.
 */
export function getDominantDimension(wf: WaveFunction): { label: string; probability: number } {
  let maxP = -1;
  let maxIdx = 0;
  for (let i = 0; i < wf.register.n; i++) {
    const p = measureProbability(wf.register.qubits[i]);
    if (p > maxP) { maxP = p; maxIdx = i; }
  }
  return { label: wf.basisLabels[maxIdx], probability: maxP };
}
