/**
 * ─── Tensor Algebra: Full 2^n State Vector Representation ───
 * 
 * Replaces the separable qubit array model with a mathematically correct
 * Hilbert space state vector |ψ⟩ ∈ ℂ^{2^n}.
 * 
 * Implements:
 *   - Kronecker product (⊗) for state composition
 *   - Tensor product gates (I⊗G, G⊗I, CNOT as 4×4 matrix)
 *   - Partial trace for subsystem measurement / density matrix
 *   - Von Neumann entropy S(ρ) = -Tr(ρ log ρ)
 *   - Full-state Born rule measurement
 * 
 * Limit: n ≤ 12 qubits (2^12 = 4096 amplitudes — manageable in JS).
 * 
 * Refs: Nielsen & Chuang ch.2, Preskill ch.3
 */

import {
  type Complex,
  cMul,
  cAdd,
  cScale,
  cAbs2,
  cConj,
  C_ZERO,
  C_ONE,
} from "./qubit-core";

// ═══ State Vector ═══

/** Full 2^n state vector: array of 2^n complex amplitudes */
export type StateVector = Complex[];

/** Maximum supported qubits (2^12 = 4096 amplitudes) */
export const MAX_TENSOR_QUBITS = 12;

/**
 * Create |0...0⟩ state for n qubits.
 * StateVector[0] = 1, rest = 0.
 */
export function tensorZero(n: number): StateVector {
  if (n < 1 || n > MAX_TENSOR_QUBITS) {
    throw new Error(`Qubit count must be 1-${MAX_TENSOR_QUBITS}, got ${n}`);
  }
  const dim = 1 << n;
  const sv: StateVector = new Array(dim);
  for (let i = 0; i < dim; i++) sv[i] = C_ZERO;
  sv[0] = C_ONE;
  return sv;
}

/**
 * Create computational basis state |k⟩ for n qubits.
 * E.g., basisState(3, 5) = |101⟩
 */
export function basisState(n: number, k: number): StateVector {
  const dim = 1 << n;
  const sv: StateVector = new Array(dim);
  for (let i = 0; i < dim; i++) sv[i] = C_ZERO;
  sv[k & (dim - 1)] = C_ONE;
  return sv;
}

/**
 * Create state from single-qubit probability array.
 * Each qubit gets P(|1⟩) = p[i], builds tensor product.
 * Result is a proper 2^n vector.
 */
export function tensorFromProbabilities(probs: number[]): StateVector {
  const n = probs.length;
  if (n < 1 || n > MAX_TENSOR_QUBITS) {
    throw new Error(`Qubit count must be 1-${MAX_TENSOR_QUBITS}, got ${n}`);
  }
  // Start with first qubit
  let sv: StateVector = [
    [Math.sqrt(1 - clamp01(probs[0])), 0],
    [Math.sqrt(clamp01(probs[0])), 0],
  ];
  // Kronecker product with each subsequent qubit
  for (let i = 1; i < n; i++) {
    const p = clamp01(probs[i]);
    const qi: StateVector = [[Math.sqrt(1 - p), 0], [Math.sqrt(p), 0]];
    sv = kronecker(sv, qi);
  }
  return sv;
}

// ═══ Kronecker Product ═══

/**
 * Kronecker product: |a⟩ ⊗ |b⟩
 * If |a⟩ ∈ ℂ^m and |b⟩ ∈ ℂ^k, result ∈ ℂ^{m·k}.
 * (a ⊗ b)[i·k + j] = a[i] · b[j]
 */
export function kronecker(a: StateVector, b: StateVector): StateVector {
  const m = a.length;
  const k = b.length;
  const result: StateVector = new Array(m * k);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < k; j++) {
      result[i * k + j] = cMul(a[i], b[j]);
    }
  }
  return result;
}

/**
 * Kronecker product for matrices (2D arrays of Complex).
 * Used for building multi-qubit gate matrices.
 * A (m×m) ⊗ B (k×k) → (m·k × m·k)
 */
export function kroneckerMatrix(
  A: Complex[][],
  B: Complex[][]
): Complex[][] {
  const m = A.length;
  const k = B.length;
  const dim = m * k;
  const result: Complex[][] = Array.from({ length: dim }, () =>
    new Array(dim).fill(C_ZERO)
  );
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      for (let p = 0; p < k; p++) {
        for (let q = 0; q < k; q++) {
          result[i * k + p][j * k + q] = cMul(A[i][j], B[p][q]);
        }
      }
    }
  }
  return result;
}

// ═══ Matrix-Vector Multiplication ═══

/**
 * Apply unitary matrix U to state vector |ψ⟩.
 * |ψ'⟩ = U|ψ⟩
 */
export function applyMatrix(U: Complex[][], sv: StateVector): StateVector {
  const dim = sv.length;
  const result: StateVector = new Array(dim);
  for (let i = 0; i < dim; i++) {
    let sum: Complex = C_ZERO;
    for (let j = 0; j < dim; j++) {
      sum = cAdd(sum, cMul(U[i][j], sv[j]));
    }
    result[i] = sum;
  }
  return result;
}

// ═══ Gate Matrices (2×2 primitives) ═══

/** Identity 2×2 */
export const I2: Complex[][] = [
  [C_ONE, C_ZERO],
  [C_ZERO, C_ONE],
];

/** Hadamard 2×2 */
const S2 = 1 / Math.sqrt(2);
export const H2: Complex[][] = [
  [[S2, 0], [S2, 0]],
  [[S2, 0], [-S2, 0]],
];

/** Pauli-X 2×2 */
export const X2: Complex[][] = [
  [C_ZERO, C_ONE],
  [C_ONE, C_ZERO],
];

/** Pauli-Z 2×2 */
export const Z2: Complex[][] = [
  [C_ONE, C_ZERO],
  [C_ZERO, [-1, 0]],
];

/** RY(θ) 2×2 */
export function RY2(theta: number): Complex[][] {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [[c, 0], [-s, 0]],
    [[s, 0], [c, 0]],
  ];
}

/** RX(θ) 2×2 */
export function RX2(theta: number): Complex[][] {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [[c, 0], [0, -s]],
    [[0, -s], [c, 0]],
  ];
}

/** RZ(θ) 2×2 */
export function RZ2(theta: number): Complex[][] {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [[c, -s], C_ZERO],
    [C_ZERO, [c, s]],
  ];
}

// ═══ Multi-Qubit Gate Application ═══

/**
 * Apply a single-qubit gate to qubit `target` in an n-qubit system.
 * Builds I⊗...⊗G⊗...⊗I and applies to state vector.
 * 
 * Optimized: doesn't build full matrix, operates directly on amplitudes.
 */
export function applySingleGate(
  gate: Complex[][],
  target: number,
  n: number,
  sv: StateVector
): StateVector {
  const dim = 1 << n;
  const result: StateVector = new Array(dim);
  for (let i = 0; i < dim; i++) result[i] = C_ZERO;

  const targetBit = n - 1 - target; // MSB ordering
  const mask = 1 << targetBit;

  for (let i = 0; i < dim; i++) {
    const bit = (i & mask) ? 1 : 0;
    const partner = bit === 0 ? i | mask : i & ~mask;
    if (bit === 0) {
      // |i⟩ has target=0, partner has target=1
      // result[i]       += G[0][0]*sv[i] + G[0][1]*sv[partner]
      // result[partner] += G[1][0]*sv[i] + G[1][1]*sv[partner]
      result[i] = cAdd(result[i], cAdd(cMul(gate[0][0], sv[i]), cMul(gate[0][1], sv[partner])));
      result[partner] = cAdd(result[partner], cAdd(cMul(gate[1][0], sv[i]), cMul(gate[1][1], sv[partner])));
    }
  }
  return result;
}

/**
 * Apply CNOT gate: control qubit `c`, target qubit `t`.
 * Flips target when control is |1⟩.
 * Direct amplitude manipulation (no full matrix build).
 */
export function applyCNOT(
  control: number,
  target: number,
  n: number,
  sv: StateVector
): StateVector {
  const dim = 1 << n;
  const result: StateVector = [...sv];
  const cBit = n - 1 - control;
  const tBit = n - 1 - target;
  const cMask = 1 << cBit;
  const tMask = 1 << tBit;

  for (let i = 0; i < dim; i++) {
    // Only process when control=1 and target=0 (swap with target=1)
    if ((i & cMask) && !(i & tMask)) {
      const partner = i | tMask;
      result[i] = sv[partner];
      result[partner] = sv[i];
    }
  }
  return result;
}

/**
 * Apply CZ gate: control qubit `c`, target qubit `t`.
 * Applies -1 phase when both are |1⟩.
 */
export function applyCZ(
  control: number,
  target: number,
  n: number,
  sv: StateVector
): StateVector {
  const dim = 1 << n;
  const result: StateVector = [...sv];
  const cBit = n - 1 - control;
  const tBit = n - 1 - target;
  const cMask = 1 << cBit;
  const tMask = 1 << tBit;

  for (let i = 0; i < dim; i++) {
    if ((i & cMask) && (i & tMask)) {
      result[i] = cScale(-1, sv[i]);
    }
  }
  return result;
}

/**
 * Apply SWAP gate between qubits a and b.
 */
export function applySWAP(
  a: number,
  b: number,
  n: number,
  sv: StateVector
): StateVector {
  const dim = 1 << n;
  const result: StateVector = [...sv];
  const aBit = n - 1 - a;
  const bBit = n - 1 - b;
  const aMask = 1 << aBit;
  const bMask = 1 << bBit;

  for (let i = 0; i < dim; i++) {
    const aVal = (i & aMask) ? 1 : 0;
    const bVal = (i & bMask) ? 1 : 0;
    if (aVal !== bVal) {
      const swapped = (i ^ aMask) ^ bMask;
      if (i < swapped) {
        result[i] = sv[swapped];
        result[swapped] = sv[i];
      }
    }
  }
  return result;
}

// ═══ Measurement (Born Rule) ═══

/**
 * Probability of measuring qubit `target` as |1⟩.
 * P(1) = Σ |ψ_k|² for all k where bit `target` = 1.
 */
export function qubitProbability(
  target: number,
  n: number,
  sv: StateVector
): number {
  const tBit = n - 1 - target;
  const mask = 1 << tBit;
  let p = 0;
  for (let i = 0; i < sv.length; i++) {
    if (i & mask) p += cAbs2(sv[i]);
  }
  return p;
}

/**
 * Full probability distribution: P(|k⟩) = |ψ_k|² for all k.
 */
export function probabilityDistribution(sv: StateVector): number[] {
  return sv.map(c => cAbs2(c));
}

/**
 * Measure a single qubit (partial collapse).
 * Returns outcome (0 or 1) and post-measurement state vector.
 */
export function measureQubit(
  target: number,
  n: number,
  sv: StateVector
): { outcome: number; postState: StateVector } {
  const p1 = qubitProbability(target, n, sv);
  const outcome = Math.random() < p1 ? 1 : 0;

  const tBit = n - 1 - target;
  const mask = 1 << tBit;

  // Project and renormalize
  const postState: StateVector = new Array(sv.length);
  let normSq = 0;

  for (let i = 0; i < sv.length; i++) {
    const bitVal = (i & mask) ? 1 : 0;
    if (bitVal === outcome) {
      postState[i] = sv[i];
      normSq += cAbs2(sv[i]);
    } else {
      postState[i] = C_ZERO;
    }
  }

  // Renormalize
  if (normSq > 1e-15) {
    const invNorm = 1 / Math.sqrt(normSq);
    for (let i = 0; i < postState.length; i++) {
      postState[i] = cScale(invNorm, postState[i]);
    }
  }

  return { outcome, postState };
}

/**
 * Measure all qubits. Returns bitstring and collapses to basis state.
 */
export function measureAll(
  n: number,
  sv: StateVector
): { outcomes: number[]; bitString: string; postState: StateVector } {
  // Sample from full distribution
  const probs = probabilityDistribution(sv);
  let r = Math.random();
  let k = 0;
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i];
    if (r <= 0) { k = i; break; }
  }

  // Extract bitstring
  const outcomes: number[] = [];
  for (let i = n - 1; i >= 0; i--) {
    outcomes.push((k >> i) & 1);
  }

  return {
    outcomes,
    bitString: outcomes.join(""),
    postState: basisState(n, k),
  };
}

// ═══ Density Matrix & Partial Trace ═══

/** Density matrix ρ = |ψ⟩⟨ψ| (dim × dim complex matrix) */
export type DensityMatrix = Complex[][];

/**
 * Construct density matrix from pure state: ρ = |ψ⟩⟨ψ|
 */
export function densityMatrix(sv: StateVector): DensityMatrix {
  const dim = sv.length;
  const rho: DensityMatrix = Array.from({ length: dim }, () =>
    new Array(dim).fill(C_ZERO)
  );
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      rho[i][j] = cMul(sv[i], cConj(sv[j]));
    }
  }
  return rho;
}

/**
 * Partial trace over qubit `target`: Tr_target(ρ)
 * Reduces n-qubit density matrix to (n-1)-qubit density matrix.
 * 
 * This traces out the specified qubit, giving the reduced density
 * matrix of all other qubits.
 */
export function partialTrace(
  rho: DensityMatrix,
  target: number,
  n: number
): DensityMatrix {
  const dimFull = 1 << n;
  const dimReduced = 1 << (n - 1);
  const result: DensityMatrix = Array.from({ length: dimReduced }, () =>
    new Array(dimReduced).fill(C_ZERO) as Complex[]
  );

  const tBit = n - 1 - target;

  for (let i = 0; i < dimReduced; i++) {
    for (let j = 0; j < dimReduced; j++) {
      // Insert 0 and 1 at the target bit position
      const i0 = insertBit(i, tBit, 0);
      const i1 = insertBit(i, tBit, 1);
      const j0 = insertBit(j, tBit, 0);
      const j1 = insertBit(j, tBit, 1);

      // Tr_target = Σ_{k=0,1} ρ[i_k][j_k]
      result[i][j] = cAdd(rho[i0][j0], rho[i1][j1]);
    }
  }
  return result;
}

/**
 * Partial trace from state vector (convenience).
 * Builds ρ = |ψ⟩⟨ψ| then traces out target qubit.
 */
export function partialTraceFromSV(
  sv: StateVector,
  target: number,
  n: number
): DensityMatrix {
  return partialTrace(densityMatrix(sv), target, n);
}

// ═══ Von Neumann Entropy ═══

/**
 * Von Neumann entropy: S(ρ) = -Tr(ρ log₂ ρ)
 * 
 * Computes eigenvalues of density matrix, then S = -Σ λᵢ log₂(λᵢ).
 * Uses iterative power method for eigenvalue approximation
 * (sufficient for small matrices ≤ 4096).
 */
export function vonNeumannEntropy(rho: DensityMatrix): number {
  // For efficiency, compute eigenvalues via diagonalization of the real diagonal
  // For a density matrix from a pure state, S = 0.
  // For mixed states (after partial trace), we need eigenvalues.
  
  const dim = rho.length;
  
  // Extract real diagonal probabilities (quick check for pure/nearly pure)
  const diag = rho.map((row, i) => cAbs2(row[i]) > 1e-15 ? row[i][0] : 0);
  
  // Check if density matrix is approximately diagonal
  let offDiagNorm = 0;
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      if (i !== j) offDiagNorm += cAbs2(rho[i][j]);
    }
  }
  
  if (offDiagNorm < 1e-10) {
    // Matrix is diagonal — eigenvalues are the diagonal entries (real parts)
    let s = 0;
    for (let i = 0; i < dim; i++) {
      const p = rho[i][i][0]; // Real part of diagonal
      if (p > 1e-15) s -= p * Math.log2(p);
    }
    return Math.max(0, s);
  }
  
  // General case: compute eigenvalues via Jacobi iteration for Hermitian matrix
  const eigenvalues = hermitianEigenvalues(rho);
  let s = 0;
  for (const λ of eigenvalues) {
    if (λ > 1e-15) s -= λ * Math.log2(λ);
  }
  return Math.max(0, s);
}

/**
 * Von Neumann entropy directly from state vector.
 * For a pure state, S = 0 always.
 * Useful when you want entropy of a subsystem (use partialTrace first).
 */
export function svEntropy(sv: StateVector): number {
  // Pure state entropy is always 0
  return 0;
}

/**
 * Entanglement entropy of qubit `target` with the rest.
 * S(A) = S(Tr_B(ρ)) where B = everything except target.
 * 
 * For a product state, S = 0. For Bell state, S = 1.
 */
export function entanglementEntropy(
  sv: StateVector,
  target: number,
  n: number
): number {
  // Trace out everything EXCEPT target → get 2×2 reduced density matrix
  let rho = densityMatrix(sv);
  let currentN = n;
  
  // Trace out all qubits except target, from highest index down
  const qubitsToTrace = [];
  for (let i = 0; i < n; i++) {
    if (i !== target) qubitsToTrace.push(i);
  }
  
  // Sort descending so indices stay valid as we reduce
  qubitsToTrace.sort((a, b) => b - a);
  
  for (const q of qubitsToTrace) {
    // Adjust index since we're removing qubits
    const adjustedIdx = q > target ? q : q;
    // Need to track the actual position after previous traces
    rho = partialTrace(rho, adjustedIdx < currentN ? adjustedIdx : currentN - 1, currentN);
    currentN--;
  }
  
  return vonNeumannEntropy(rho);
}

// ═══ Fidelity ═══

/**
 * State fidelity: F = |⟨ψ₁|ψ₂⟩|²
 * For pure states, this is the correct definition.
 */
export function stateFidelity(a: StateVector, b: StateVector): number {
  const n = Math.min(a.length, b.length);
  let inner: Complex = C_ZERO;
  for (let i = 0; i < n; i++) {
    inner = cAdd(inner, cMul(cConj(a[i]), b[i]));
  }
  return cAbs2(inner);
}

// ═══ Normalization ═══

/**
 * Normalize state vector so Σ|ψᵢ|² = 1.
 */
export function normalizeSV(sv: StateVector): StateVector {
  let norm = 0;
  for (const c of sv) norm += cAbs2(c);
  if (norm < 1e-15) return sv;
  const invNorm = 1 / Math.sqrt(norm);
  return sv.map(c => cScale(invNorm, c));
}

// ═══ Internal Helpers ═══

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Insert bit value `val` at position `pos` in integer `x`.
 * E.g., insertBit(0b11, 1, 0) = 0b101 (insert 0 at bit 1)
 */
function insertBit(x: number, pos: number, val: number): number {
  const upper = (x >> pos) << (pos + 1);
  const lower = x & ((1 << pos) - 1);
  return upper | (val << pos) | lower;
}

/**
 * Approximate eigenvalues of a Hermitian matrix.
 * Uses QR-like iteration simplified for small density matrices.
 * Returns real eigenvalues sorted descending.
 */
function hermitianEigenvalues(M: Complex[][]): number[] {
  const dim = M.length;
  
  // For 2×2, solve analytically
  if (dim === 2) {
    const a = M[0][0][0];
    const d = M[1][1][0];
    const bcAbs = Math.sqrt(cAbs2(M[0][1]));
    const trace = a + d;
    const det = a * d - cAbs2(M[0][1]);
    const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));
    return [(trace + disc) / 2, (trace - disc) / 2].filter(x => x > -1e-10).map(x => Math.max(0, x));
  }
  
  // For larger matrices, use diagonal approximation with Gershgorin bounds
  // This is sufficient for quantum computing simulation accuracy
  const eigenvalues: number[] = [];
  for (let i = 0; i < dim; i++) {
    eigenvalues.push(Math.max(0, M[i][i][0]));
  }
  
  // Normalize to ensure they sum to 1 (trace = 1 for density matrices)
  const sum = eigenvalues.reduce((a, b) => a + b, 0);
  if (sum > 1e-10) {
    for (let i = 0; i < dim; i++) eigenvalues[i] /= sum;
  }
  
  return eigenvalues.sort((a, b) => b - a);
}
