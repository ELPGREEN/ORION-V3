/**
 * ─── Tensor VQC: Variational Quantum Circuit on Full State Vector ───
 * 
 * VQC forward pass using proper 2^n state vector instead of
 * separable qubit array. Entangling layers use real CNOT/CZ gates.
 * 
 * Drop-in replacement for vqcForward when tensor mode is desired.
 */

import {
  type StateVector,
  type DensityMatrix,
  tensorZero,
  applySingleGate,
  applyCNOT,
  applyCZ,
  RY2,
  RX2,
  RZ2,
  H2,
  qubitProbability,
  normalizeSV,
  measureAll,
  stateFidelity,
} from "./tensor-state-vector";

import type { VQCConfig } from "./vqc-types";

// ═══ Tensor Feature Maps ═══

/**
 * ZZ feature map on full state vector.
 * Encodes input as RY rotations + ZZ entangling via CNOT-RZ-CNOT.
 */
export function tensorZZFeatureMap(
  input: number[],
  config: { nQubits: number }
): StateVector {
  const n = config.nQubits;
  let sv = tensorZero(n);

  // Hadamard layer
  for (let i = 0; i < n; i++) {
    sv = applySingleGate(H2, i, n, sv);
  }

  // Single-qubit RZ encoding
  for (let i = 0; i < Math.min(input.length, n); i++) {
    sv = applySingleGate(RZ2(input[i] * Math.PI * 2), i, n, sv);
  }

  // ZZ entangling: CNOT(i, i+1) → RZ(x_i · x_{i+1}) on target → CNOT(i, i+1)
  for (let i = 0; i < n - 1; i++) {
    const xi = input[i % input.length] ?? 0;
    const xj = input[(i + 1) % input.length] ?? 0;
    const zzPhase = xi * xj * Math.PI;
    sv = applyCNOT(i, i + 1, n, sv);
    sv = applySingleGate(RZ2(zzPhase), i + 1, n, sv);
    sv = applyCNOT(i, i + 1, n, sv);
  }

  return sv;
}

/**
 * IQP feature map on full state vector.
 */
export function tensorIQPFeatureMap(
  input: number[],
  config: { nQubits: number }
): StateVector {
  const n = config.nQubits;
  let sv = tensorZero(n);

  // Hadamard layer
  for (let i = 0; i < n; i++) {
    sv = applySingleGate(H2, i, n, sv);
  }

  // Diagonal phase encoding
  for (let i = 0; i < Math.min(input.length, n); i++) {
    sv = applySingleGate(RZ2(input[i] * Math.PI), i, n, sv);
  }

  // IQP entangling: CZ with product phase
  for (let i = 0; i < n - 1; i++) {
    const phase = input[i % input.length] * input[(i + 1) % input.length] * Math.PI;
    sv = applyCNOT(i, i + 1, n, sv);
    sv = applySingleGate(RZ2(phase), i + 1, n, sv);
    sv = applyCNOT(i, i + 1, n, sv);
  }

  // Second Hadamard layer (IQP structure)
  for (let i = 0; i < n; i++) {
    sv = applySingleGate(H2, i, n, sv);
  }

  return sv;
}

// ═══ Tensor VQC Forward Pass ═══

/**
 * Full VQC forward pass on tensor state vector.
 * 
 * 1. Feature map encoding (proper entangling)
 * 2. Parameterized ansatz layers (RX-RY-RZ + CNOT entangling)
 * 3. Measurement: expectation value of Z on first qubit
 */
export function tensorVQCForward(
  input: number[],
  params: number[][][],
  config: VQCConfig
): number {
  const n = config.nQubits;

  // Feature map
  let sv: StateVector;
  switch (config.featureMap) {
    case "iqp":
      sv = tensorIQPFeatureMap(input, config);
      break;
    default:
      sv = tensorZZFeatureMap(input, config);
  }

  // Ansatz layers
  for (let layer = 0; layer < config.nLayers; layer++) {
    // Single-qubit rotations
    for (let q = 0; q < n; q++) {
      const p = params[layer]?.[q] ?? [0, 0, 0];
      sv = applySingleGate(RX2(p[0]), q, n, sv);
      sv = applySingleGate(RY2(p[1]), q, n, sv);
      sv = applySingleGate(RZ2(p[2]), q, n, sv);
    }

    // Entangling layer: linear CNOT chain
    if (config.ansatz === "strongly_entangling") {
      // All-to-all CNOT pattern (shifted per layer)
      for (let q = 0; q < n; q++) {
        const target = (q + layer + 1) % n;
        if (target !== q) {
          sv = applyCNOT(q, target, n, sv);
        }
      }
    } else {
      // Hardware efficient: nearest-neighbor CNOT
      for (let q = 0; q < n - 1; q++) {
        sv = applyCNOT(q, q + 1, n, sv);
      }
    }
  }

  // Measurement: average Z expectation across all qubits
  // ⟨Z_i⟩ = P(0) - P(1) = 1 - 2·P(1)
  // Return as probability-like value in [0, 1]
  let totalP = 0;
  for (let q = 0; q < n; q++) {
    totalP += qubitProbability(q, n, sv);
  }
  return totalP / n;
}

/**
 * Parameter-shift gradient on tensor VQC.
 */
export function tensorParameterShiftGradient(
  input: number[],
  params: number[][][],
  layer: number,
  qubit: number,
  paramIdx: number,
  config: VQCConfig
): number {
  const shift = Math.PI / 2;
  const paramsPlus = params.map((l, li) =>
    l.map((q, qi) =>
      q.map((p, pi) => (li === layer && qi === qubit && pi === paramIdx ? p + shift : p))
    )
  );
  const paramsMinus = params.map((l, li) =>
    l.map((q, qi) =>
      q.map((p, pi) => (li === layer && qi === qubit && pi === paramIdx ? p - shift : p))
    )
  );
  const grad = (tensorVQCForward(input, paramsPlus, config) -
                tensorVQCForward(input, paramsMinus, config)) / 2;
  return Math.max(-config.gradientClip, Math.min(config.gradientClip, grad));
}
