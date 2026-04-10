/**
 * ─── Entanglement & Multi-Qubit Register ───
 * Bell states, GHZ states, n-qubit registers.
 *
 * v2: Dual mode — separable (legacy) + tensor (correct).
 * Tensor mode uses full 2^n state vector for true entanglement.
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

import {
  type StateVector,
  tensorZero,
  basisState,
  applySingleGate,
  applyCNOT,
  applyCZ as tensorCZ,
  applySWAP,
  H2,
  X2,
  Z2,
  measureAll as tensorMeasureAll,
  measureQubit as tensorMeasureQubit,
  qubitProbability,
  densityMatrix,
  partialTrace,
  vonNeumannEntropy,
  stateFidelity,
  entanglementEntropy,
  normalizeSV,
  kronecker,
} from "./tensor-state-vector";

// ─── Bell States (tensor mode: correct 4-amplitude vectors) ───

export interface EntangledPair {
  qubitA: QubitState;
  qubitB: QubitState;
  bellState: "Φ+" | "Φ-" | "Ψ+" | "Ψ-";
  /** Concurrence: 0 = separable, 1 = maximally entangled */
  concurrence: number;
  /** Full 2-qubit state vector (4 amplitudes) — correct representation */
  tensorState?: StateVector;
}

/**
 * Create Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2
 * Tensor: H on q0, CNOT(0→1)
 */
export function bellPhiPlus(): EntangledPair {
  const n = 2;
  let sv = tensorZero(n);
  sv = applySingleGate(H2, 0, n, sv);
  sv = applyCNOT(0, 1, n, sv);

  // Legacy separable approximation
  const a = hadamard(qubitZero());
  const b = qubitZero();
  const { control, target } = cnot(a, b);

  return {
    qubitA: control,
    qubitB: target,
    bellState: "Φ+",
    concurrence: 1.0,
    tensorState: sv,
  };
}

/**
 * Create Bell state |Φ-⟩ = (|00⟩ - |11⟩)/√2
 * Tensor: Z on q0, H on q0, CNOT(0→1)
 */
export function bellPhiMinus(): EntangledPair {
  const n = 2;
  let sv = tensorZero(n);
  sv = applySingleGate(Z2, 0, n, sv);
  sv = applySingleGate(H2, 0, n, sv);
  sv = applyCNOT(0, 1, n, sv);

  const a = pauliZ(hadamard(qubitZero()));
  const b = qubitZero();
  const { control, target } = cnot(a, b);

  return {
    qubitA: control,
    qubitB: target,
    bellState: "Φ-",
    concurrence: 1.0,
    tensorState: sv,
  };
}

/**
 * Create Bell state |Ψ+⟩ = (|01⟩ + |10⟩)/√2
 * Tensor: H on q0, CNOT(0→1), X on q1
 */
export function bellPsiPlus(): EntangledPair {
  const n = 2;
  let sv = tensorZero(n);
  sv = applySingleGate(H2, 0, n, sv);
  sv = applyCNOT(0, 1, n, sv);
  sv = applySingleGate(X2, 1, n, sv);

  const a = hadamard(qubitZero());
  const b = pauliX(qubitZero());
  const { control, target } = cnot(a, b);

  return {
    qubitA: control,
    qubitB: target,
    bellState: "Ψ+",
    concurrence: 1.0,
    tensorState: sv,
  };
}

/**
 * Create Bell state |Ψ-⟩ = (|01⟩ - |10⟩)/√2 (singlet)
 * Tensor: Z on q0, H on q0, CNOT(0→1), X on q1
 */
export function bellPsiMinus(): EntangledPair {
  const n = 2;
  let sv = tensorZero(n);
  sv = applySingleGate(Z2, 0, n, sv);
  sv = applySingleGate(H2, 0, n, sv);
  sv = applyCNOT(0, 1, n, sv);
  sv = applySingleGate(X2, 1, n, sv);

  const a = pauliZ(hadamard(qubitZero()));
  const b = pauliX(qubitZero());
  const { control, target } = cnot(a, b);

  return {
    qubitA: control,
    qubitB: target,
    bellState: "Ψ-",
    concurrence: 1.0,
    tensorState: sv,
  };
}

/**
 * Measure entangled pair using tensor state (correct) or legacy.
 */
export function measureEntangledPair(pair: EntangledPair): {
  outcomeA: number;
  outcomeB: number;
  correlation: "correlated" | "anticorrelated";
} {
  if (pair.tensorState) {
    // Correct: sample from full 4-amplitude distribution
    const { outcomes } = tensorMeasureAll(2, pair.tensorState);
    const isPhiState = pair.bellState.startsWith("Φ");
    return {
      outcomeA: outcomes[0],
      outcomeB: outcomes[1],
      correlation: isPhiState ? "correlated" : "anticorrelated",
    };
  }

  // Legacy fallback
  const { outcome: outcomeA } = measureCollapse(pair.qubitA);
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
  /** Individual qubit states (separable approximation — legacy) */
  qubits: QubitState[];
  /** Full tensor state vector (correct representation) */
  tensorState?: StateVector;
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
 * Initializes both separable and tensor representations.
 */
export function createRegister(n: number): QubitRegister {
  if (n < 1 || n > 20) {
    throw new Error(`Qubit count must be 1-20, got ${n}`);
  }
  return {
    n,
    qubits: Array.from({ length: n }, () => qubitZero()),
    tensorState: n <= 12 ? tensorZero(n) : undefined,
    entanglements: [],
  };
}

/**
 * Put all qubits in equal superposition (apply H to each).
 */
export function superpositionAll(reg: QubitRegister): QubitRegister {
  let tensorState = reg.tensorState;
  if (tensorState) {
    for (let i = 0; i < reg.n; i++) {
      tensorState = applySingleGate(H2, i, reg.n, tensorState);
    }
  }
  return {
    ...reg,
    qubits: reg.qubits.map(q => hadamard(q)),
    tensorState,
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

  // Tensor mode: apply real CNOT
  let tensorState = reg.tensorState;
  if (tensorState) {
    tensorState = applyCNOT(i, j, reg.n, tensorState);
  }

  // Legacy separable
  const { control, target, entangled } = cnot(reg.qubits[i], reg.qubits[j]);
  const qubits = [...reg.qubits];
  qubits[i] = control;
  qubits[j] = target;

  const entanglements = [...reg.entanglements];
  if (entangled || tensorState) {
    entanglements.push({ i, j, concurrence: 1.0, type });
  }

  return { ...reg, qubits, tensorState, entanglements };
}

/**
 * Create GHZ state: (|00...0⟩ + |11...1⟩)/√2
 * Maximally entangled n-qubit state.
 */
export function ghzState(n: number): QubitRegister {
  let reg = createRegister(n);

  // Tensor: H on q0, then CNOT chain
  if (reg.tensorState) {
    let sv = reg.tensorState;
    sv = applySingleGate(H2, 0, n, sv);
    for (let i = 0; i < n - 1; i++) {
      sv = applyCNOT(i, i + 1, n, sv);
    }
    reg.tensorState = sv;
  }

  // Legacy
  reg.qubits[0] = hadamard(reg.qubits[0]);
  for (let i = 0; i < n - 1; i++) {
    reg = entanglePair(reg, i, i + 1, "correlated");
  }
  return reg;
}

/**
 * Measure entire register using tensor state vector (correct) or legacy.
 */
export function measureRegister(reg: QubitRegister): {
  outcomes: number[];
  bitString: string;
  register: QubitRegister;
} {
  if (reg.tensorState) {
    const { outcomes, bitString, postState } = tensorMeasureAll(reg.n, reg.tensorState);
    const qubits = outcomes.map(o =>
      o === 0 ? qubitZero() : (normalize([[0, 0], [1, 0]] as QubitState))
    );
    return {
      outcomes,
      bitString,
      register: { ...reg, qubits, tensorState: postState, entanglements: [] },
    };
  }

  // Legacy measurement
  const outcomes: number[] = new Array(reg.n).fill(-1);
  const qubits = [...reg.qubits];

  for (let i = 0; i < reg.n; i++) {
    if (outcomes[i] !== -1) continue;

    const { outcome, postState } = measureCollapse(qubits[i]);
    outcomes[i] = outcome;
    qubits[i] = postState;

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

// ─── Tensor Utility Exports ───

/**
 * Get entanglement entropy between qubit i and the rest of the register.
 * Only works with tensor state. Returns 0 for separable states.
 */
export function registerEntanglementEntropy(
  reg: QubitRegister,
  qubitIdx: number
): number {
  if (!reg.tensorState || reg.n > 12) return 0;
  return entanglementEntropy(reg.tensorState, qubitIdx, reg.n);
}

/**
 * Tensor state fidelity between two registers.
 */
export function registerFidelity(a: QubitRegister, b: QubitRegister): number {
  if (a.tensorState && b.tensorState) {
    return stateFidelity(a.tensorState, b.tensorState);
  }
  // Legacy: product of per-qubit fidelities
  const { fidelity: qFidelity } = require("./qubit-core") as typeof import("./qubit-core");
  const n = Math.min(a.n, b.n);
  let f = 1;
  for (let i = 0; i < n; i++) {
    f *= qFidelity(a.qubits[i], b.qubits[i]);
  }
  return f;
}
  for (let i = 0; i < n; i++) {
    f *= fidelity(a.qubits[i], b.qubits[i]);
  }
  return f;
}
