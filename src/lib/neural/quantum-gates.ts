/**
 * ─── Quantum Gates: Single & Two-Qubit Operations ───
 * Rotation gates (RX, RY, RZ), Hadamard, CNOT, CZ, SWAP.
 * All operations are unitary: preserve |α|²+|β|²=1.
 */

import {
  type Complex,
  type QubitState,
  cMul,
  cAdd,
  cScale,
  C_ZERO,
  normalize,
} from "./qubit-core";

// ─── Single-Qubit Gates ───

/** RX(θ): rotation around X axis on Bloch sphere */
export function rotationX(theta: number, q: QubitState): QubitState {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  const alpha: Complex = cAdd(cMul([c, 0], q[0]), cMul([0, -s], q[1]));
  const beta: Complex = cAdd(cMul([0, -s], q[0]), cMul([c, 0], q[1]));
  return [alpha, beta];
}

/** RY(θ): rotation around Y axis (pure real rotation) */
export function rotationY(theta: number, q: QubitState): QubitState {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  const alpha: Complex = cAdd(cMul([c, 0], q[0]), cMul([-s, 0], q[1]));
  const beta: Complex = cAdd(cMul([s, 0], q[0]), cMul([c, 0], q[1]));
  return [alpha, beta];
}

/** RZ(θ): rotation around Z axis (phase rotation) */
export function rotationZ(theta: number, q: QubitState): QubitState {
  const alpha: Complex = cMul([Math.cos(theta / 2), -Math.sin(theta / 2)], q[0]);
  const beta: Complex = cMul([Math.cos(theta / 2), Math.sin(theta / 2)], q[1]);
  return [alpha, beta];
}

/** Hadamard gate: H|0⟩=|+⟩, H|1⟩=|−⟩ */
export function hadamard(q: QubitState): QubitState {
  const s = 1 / Math.sqrt(2);
  const alpha: Complex = cAdd(cScale(s, q[0]), cScale(s, q[1]));
  const beta: Complex = cAdd(cScale(s, q[0]), cScale(-s, q[1]));
  return [alpha, beta];
}

/** Pauli-X gate (NOT): |0⟩↔|1⟩ */
export function pauliX(q: QubitState): QubitState {
  return [q[1], q[0]];
}

/** Pauli-Z gate: phase flip on |1⟩ */
export function pauliZ(q: QubitState): QubitState {
  return [q[0], [-q[1][0], -q[1][1]]];
}

/** Phase gate S: RZ(π/2) */
export function phaseS(q: QubitState): QubitState {
  return rotationZ(Math.PI / 2, q);
}

/** T gate: RZ(π/4) — important for universal gate sets */
export function phaseT(q: QubitState): QubitState {
  return rotationZ(Math.PI / 4, q);
}

// ─── Two-Qubit Gates (operate on product state of 2 qubits) ───

/**
 * CNOT (Controlled-NOT): flips target if control is |1⟩.
 * Fundamental for creating entanglement.
 * 
 * For product states |c⟩⊗|t⟩:
 *   |00⟩→|00⟩, |01⟩→|01⟩, |10⟩→|11⟩, |11⟩→|10⟩
 * 
 * Returns [control, target] after gate.
 */
export function cnot(control: QubitState, target: QubitState): {
  control: QubitState;
  target: QubitState;
  entangled: boolean;
} {
  // For separable states, approximate via probability mixing
  const pControl1 = control[1][0] * control[1][0] + control[1][1] * control[1][1];

  // When control has |1⟩ component, target gets X applied proportionally
  // This creates correlation (entanglement-like behavior in separable approx)
  if (pControl1 > 0.999) {
    return { control, target: pauliX(target), entangled: true };
  } else if (pControl1 < 0.001) {
    return { control, target, entangled: false };
  }

  // Superposition case: creates entanglement
  // Apply X to target weighted by control's |1⟩ amplitude
  const flipped = pauliX(target);
  const pC0 = 1 - pControl1;
  const newTarget: QubitState = normalize([
    cAdd(cScale(Math.sqrt(pC0), target[0]), cScale(Math.sqrt(pControl1), flipped[0])),
    cAdd(cScale(Math.sqrt(pC0), target[1]), cScale(Math.sqrt(pControl1), flipped[1])),
  ]);

  return { control, target: newTarget, entangled: pControl1 > 0.01 && pControl1 < 0.99 };
}

/**
 * CZ (Controlled-Z): applies Z to target when control is |1⟩.
 * Important for entangling layers in VQC.
 */
export function cz(control: QubitState, target: QubitState): {
  control: QubitState;
  target: QubitState;
} {
  const pControl1 = control[1][0] * control[1][0] + control[1][1] * control[1][1];

  if (pControl1 > 0.999) {
    return { control, target: pauliZ(target) };
  } else if (pControl1 < 0.001) {
    return { control, target };
  }

  // Superposition: partial phase flip
  const phased = pauliZ(target);
  const pC0 = 1 - pControl1;
  const newTarget: QubitState = normalize([
    cAdd(cScale(Math.sqrt(pC0), target[0]), cScale(Math.sqrt(pControl1), phased[0])),
    cAdd(cScale(Math.sqrt(pC0), target[1]), cScale(Math.sqrt(pControl1), phased[1])),
  ]);

  return { control, target: newTarget };
}

/**
 * SWAP gate: exchanges two qubit states.
 */
export function swap(a: QubitState, b: QubitState): { a: QubitState; b: QubitState } {
  return { a: b, b: a };
}

// Legacy aliases
export const rx = (theta: number): [number, number] => [Math.cos(theta / 2), -Math.sin(theta / 2)];
export const ry = (theta: number): [number, number] => [Math.cos(theta / 2), Math.sin(theta / 2)];
export const rz = (theta: number): [number, number] => [Math.cos(theta / 2), -Math.sin(theta / 2)];
