/**
 * ─── Entanglement & Multi-Qubit Register ───
 * Bell states, GHZ states, n-qubit registers.
 * 
 * Entrelaçamento: o estado de um qubit depende instantaneamente
 * do outro — princípio essencial para algoritmos quânticos.
 * 
 * n qubits → 2ⁿ estados simultâneos (superposição exponencial).
 */

import {
  type Complex,
  type QubitState,
  qubitZero,
  qubitPlus,
  measureCollapse,
  measureProbability,
  cAbs2,
  C_ZERO,
  C_ONE,
  cScale,
  cAdd,
  normalize,
} from "./qubit-core";

import { hadamard, cnot, pauliX, pauliZ } from "./quantum-gates";

// ─── Bell States (maximally entangled 2-qubit states) ───

export interface EntangledPair {
  qubitA: QubitState;
  qubitB: QubitState;
  bellState: "Φ+" | "Φ-" | "Ψ+" | "Ψ-";
  /** Concurrence: 0 = separable, 1 = maximally entangled */
  concurrence: number;
}

/**
 * Create Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2
 * Apply H to qubit A, then CNOT(A→B).
 */
export function bellPhiPlus(): EntangledPair {
  const a = hadamard(qubitZero()); // |+⟩
  const b = qubitZero();           // |0⟩
  const { control, target } = cnot(a, b);
  return { qubitA: control, qubitB: target, bellState: "Φ+", concurrence: 1.0 };
}

/**
 * Create Bell state |Φ-⟩ = (|00⟩ - |11⟩)/√2
 */
export function bellPhiMinus(): EntangledPair {
  const pair = bellPhiPlus();
  // Apply Z to first qubit for phase flip
  return { ...pair, qubitA: pauliZ(pair.qubitA), bellState: "Φ-" };
}

/**
 * Create Bell state |Ψ+⟩ = (|01⟩ + |10⟩)/√2
 */
export function bellPsiPlus(): EntangledPair {
  const pair = bellPhiPlus();
  return { ...pair, qubitB: pauliX(pair.qubitB), bellState: "Ψ+" };
}

/**
 * Create Bell state |Ψ-⟩ = (|01⟩ - |10⟩)/√2 (singlet)
 */
export function bellPsiMinus(): EntangledPair {
  const pair = bellPsiPlus();
  return { ...pair, qubitA: pauliZ(pair.qubitA), bellState: "Ψ-" };
}

/**
 * Measure entangled pair: when A collapses, B is determined.
 * This demonstrates non-classical correlation.
 */
export function measureEntangledPair(pair: EntangledPair): {
  outcomeA: number;
  outcomeB: number;
  correlation: "correlated" | "anticorrelated";
} {
  const { outcome: outcomeA } = measureCollapse(pair.qubitA);

  // For |Φ⟩ states: same outcomes (correlated)
  // For |Ψ⟩ states: opposite outcomes (anticorrelated)
  const isPhiState = pair.bellState.startsWith("Φ");
  const outcomeB = isPhiState ? outcomeA : (1 - outcomeA);

  return {
    outcomeA,
    outcomeB,
    correlation: isPhiState ? "correlated" : "anticorrelated",
  };
}

// ─── Multi-Qubit Register ───

export interface QubitRegister {
  /** Number of qubits */
  n: number;
  /** Individual qubit states (separable approximation) */
  qubits: QubitState[];
  /** Entanglement map: pairs of entangled qubit indices */
  entanglements: Array<{ i: number; j: number; concurrence: number }>;
}

/**
 * Create n-qubit register, all initialized to |0⟩.
 * n qubits can represent 2ⁿ states in superposition.
 */
export function createRegister(n: number): QubitRegister {
  if (n < 1 || n > 20) {
    throw new Error(`Qubit count must be 1-20, got ${n}`);
  }
  return {
    n,
    qubits: Array.from({ length: n }, () => qubitZero()),
    entanglements: [],
  };
}

/**
 * Put all qubits in equal superposition (apply H to each).
 * Creates 2ⁿ simultaneous states.
 */
export function superpositionAll(reg: QubitRegister): QubitRegister {
  return {
    ...reg,
    qubits: reg.qubits.map(q => hadamard(q)),
  };
}

/**
 * Entangle qubit i with qubit j via CNOT.
 */
export function entanglePair(reg: QubitRegister, i: number, j: number): QubitRegister {
  if (i < 0 || i >= reg.n || j < 0 || j >= reg.n || i === j) {
    return reg;
  }
  const { control, target, entangled } = cnot(reg.qubits[i], reg.qubits[j]);
  const qubits = [...reg.qubits];
  qubits[i] = control;
  qubits[j] = target;

  const entanglements = [...reg.entanglements];
  if (entangled) {
    entanglements.push({ i, j, concurrence: 1.0 });
  }

  return { ...reg, qubits, entanglements };
}

/**
 * Create GHZ state: (|00...0⟩ + |11...1⟩)/√2
 * Maximally entangled n-qubit state.
 */
export function ghzState(n: number): QubitRegister {
  let reg = createRegister(n);
  // H on first qubit
  reg.qubits[0] = hadamard(reg.qubits[0]);
  // CNOT chain: 0→1, 1→2, ..., (n-2)→(n-1)
  for (let i = 0; i < n - 1; i++) {
    reg = entanglePair(reg, i, i + 1);
  }
  return reg;
}

/**
 * Measure entire register. Returns bit string.
 */
export function measureRegister(reg: QubitRegister): {
  outcomes: number[];
  bitString: string;
  register: QubitRegister;
} {
  const outcomes: number[] = [];
  const qubits = [...reg.qubits];

  for (let i = 0; i < reg.n; i++) {
    const { outcome, postState } = measureCollapse(qubits[i]);
    outcomes.push(outcome);
    qubits[i] = postState;

    // Collapse entangled partners
    for (const ent of reg.entanglements) {
      if (ent.i === i && ent.j < reg.n) {
        // Partner collapses based on correlation
        const partnerOutcome = outcome; // For GHZ/Bell Φ states
        qubits[ent.j] = partnerOutcome === 0
          ? qubitZero()
          : [[0, 0], [1, 0]] as QubitState;
      }
    }
  }

  return {
    outcomes,
    bitString: outcomes.join(""),
    register: { ...reg, qubits, entanglements: [] }, // Post-measurement: no entanglement
  };
}

/**
 * Count possible simultaneous states for n qubits.
 */
export function hilbertSpaceDimension(n: number): number {
  return Math.pow(2, n);
}
