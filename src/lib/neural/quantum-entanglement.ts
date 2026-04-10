/**
 * ─── Entanglement & Multi-Qubit Register ───
 * Bell states, GHZ states, n-qubit registers.
 *
 * n qubits → 2ⁿ estados simultâneos (superposição exponencial).
 */

import {
  type Complex,
  type QubitState,
  qubitZero,
  measureCollapse,
  measureProbability,
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
 * Correct: apply Z BEFORE CNOT to get phase flip on |11⟩.
 */
export function bellPhiMinus(): EntangledPair {
  const a = pauliZ(hadamard(qubitZero())); // Z|+⟩ = |−⟩
  const b = qubitZero();
  const { control, target } = cnot(a, b);
  return { qubitA: control, qubitB: target, bellState: "Φ-", concurrence: 1.0 };
}

/**
 * Create Bell state |Ψ+⟩ = (|01⟩ + |10⟩)/√2
 * Correct: apply X to target BEFORE CNOT.
 */
export function bellPsiPlus(): EntangledPair {
  const a = hadamard(qubitZero()); // |+⟩
  const b = pauliX(qubitZero());   // |1⟩
  const { control, target } = cnot(a, b);
  return { qubitA: control, qubitB: target, bellState: "Ψ+", concurrence: 1.0 };
}

/**
 * Create Bell state |Ψ-⟩ = (|01⟩ - |10⟩)/√2 (singlet)
 * Z on first qubit before H, then X on target, then CNOT.
 */
export function bellPsiMinus(): EntangledPair {
  const a = pauliZ(hadamard(qubitZero())); // |−⟩
  const b = pauliX(qubitZero());            // |1⟩
  const { control, target } = cnot(a, b);
  return { qubitA: control, qubitB: target, bellState: "Ψ-", concurrence: 1.0 };
}

/**
 * Measure entangled pair: when A collapses, B is determined.
 */
export function measureEntangledPair(pair: EntangledPair): {
  outcomeA: number;
  outcomeB: number;
  correlation: "correlated" | "anticorrelated";
} {
  const { outcome: outcomeA } = measureCollapse(pair.qubitA);

  // |Φ⟩ states: same outcomes (correlated)
  // |Ψ⟩ states: opposite outcomes (anticorrelated)
  const isPhiState = pair.bellState.startsWith("Φ");
  const outcomeB = isPhiState ? outcomeA : (1 - outcomeA);

  return {
    outcomeA,
    outcomeB,
    correlation: isPhiState ? "correlated" : "anticorrelated",
  };
}

// ─── Multi-Qubit Register ───

export type EntanglementType = "correlated" | "anticorrelated";

export interface QubitRegister {
  /** Number of qubits */
  n: number;
  /** Individual qubit states (separable approximation) */
  qubits: QubitState[];
  /** Entanglement map: pairs of entangled qubit indices */
  entanglements: Array<{
    i: number;
    j: number;
    concurrence: number;
    type: EntanglementType;
  }>;
}

/**
 * Create n-qubit register, all initialized to |0⟩.
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
export function entanglePair(
  reg: QubitRegister,
  i: number,
  j: number,
  type: EntanglementType = "correlated"
): QubitRegister {
  if (i < 0 || i >= reg.n || j < 0 || j >= reg.n || i === j) {
    return reg;
  }
  const { control, target, entangled } = cnot(reg.qubits[i], reg.qubits[j]);
  const qubits = [...reg.qubits];
  qubits[i] = control;
  qubits[j] = target;

  const entanglements = [...reg.entanglements];
  if (entangled) {
    entanglements.push({ i, j, concurrence: 1.0, type });
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
    reg = entanglePair(reg, i, i + 1, "correlated");
  }
  return reg;
}

/**
 * Measure entire register. Correctly handles entanglement correlations.
 */
export function measureRegister(reg: QubitRegister): {
  outcomes: number[];
  bitString: string;
  register: QubitRegister;
} {
  const outcomes: number[] = new Array(reg.n).fill(-1);
  const qubits = [...reg.qubits];

  for (let i = 0; i < reg.n; i++) {
    // Skip if already determined by entanglement
    if (outcomes[i] !== -1) continue;

    const { outcome, postState } = measureCollapse(qubits[i]);
    outcomes[i] = outcome;
    qubits[i] = postState;

    // Collapse entangled partners
    for (const ent of reg.entanglements) {
      const partnerIdx = ent.i === i ? ent.j : ent.j === i ? ent.i : -1;
      if (partnerIdx === -1 || partnerIdx >= reg.n || outcomes[partnerIdx] !== -1) continue;

      const partnerOutcome = ent.type === "correlated" ? outcome : (1 - outcome);
      outcomes[partnerIdx] = partnerOutcome;
      qubits[partnerIdx] = partnerOutcome === 0
        ? qubitZero()
        : normalize([[0, 0], [1, 0]] as QubitState);
    }
  }

  return {
    outcomes,
    bitString: outcomes.join(""),
    register: { ...reg, qubits, entanglements: [] },
  };
}

/**
 * Count possible simultaneous states for n qubits.
 */
export function hilbertSpaceDimension(n: number): number {
  return Math.pow(2, n);
}
