/**
 * ─── Tensor VQC: Variational Quantum Circuit on Full State Vector ───
 */

import {
  type StateVector,
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
} from "./tensor-state-vector";

import { VQCConfig, DEFAULT_VQC_CONFIG } from "./vqc-types";

// ═══ Tensor Feature Maps ═══

export function tensorZZFeatureMap(input: number[], nQubits: number): StateVector {
  let sv = tensorZero(nQubits);

  for (let q = 0; q < nQubits; q++) {
    sv = applySingleGate(H2, q, nQubits, sv);
  }

  for (let q = 0; q < Math.min(input.length, nQubits); q++) {
    sv = applySingleGate(RY2(input[q] * Math.PI), q, nQubits, sv);
  }

  for (let q = 0; q < nQubits - 1; q++) {
    const phase = input[q % input.length] * input[(q + 1) % input.length] * Math.PI;
    sv = applySingleGate(RZ2(phase), q, nQubits, sv);
    sv = applySingleGate(RZ2(phase), q + 1, nQubits, sv);
  }

  return normalizeSV(sv);
}

export function tensorIQPFeatureMap(input: number[], nQubits: number): StateVector {
  let sv = tensorZero(nQubits);
  for (let q = 0; q < nQubits; q++) sv = applySingleGate(H2, q, nQubits, sv);

  for (let q = 0; q < Math.min(input.length, nQubits); q++) {
    sv = applySingleGate(RZ2(input[q] * Math.PI), q, nQubits, sv);
  }

  for (let q = 0; q < nQubits - 1; q++) {
    const iqpPhase = input[q % input.length] * input[(q + 1) % input.length] * Math.PI;
    sv = applySingleGate(RZ2(iqpPhase), q, nQubits, sv);
    sv = applySingleGate(RZ2(iqpPhase), q + 1, nQubits, sv);
    sv = applyCNOT(q, q + 1, nQubits, sv);
  }

  return normalizeSV(sv);
}

// ═══ Tensor Forward Pass ═══

export function tensorVQCForward(
  input: number[],
  params: number[][][],
  config: VQCConfig = DEFAULT_VQC_CONFIG
): number {
  let sv: StateVector;

  switch (config.featureMap) {
    case "iqp": sv = tensorIQPFeatureMap(input, config.nQubits); break;
    default: sv = tensorZZFeatureMap(input, config.nQubits);
  }

  for (let layer = 0; layer < config.nLayers; layer++) {
    for (let q = 0; q < config.nQubits; q++) {
      const p = params[layer]?.[q] ?? [0, 0, 0];
      sv = applySingleGate(RX2(p[0]), q, config.nQubits, sv);
      sv = applySingleGate(RY2(p[1]), q, config.nQubits, sv);
      sv = applySingleGate(RZ2(p[2]), q, config.nQubits, sv);
    }

    if (config.ansatz === "hardware_efficient") {
      for (let q = 0; q < config.nQubits - 1; q++) {
        sv = applyCNOT(q, q + 1, config.nQubits, sv);
      }
    } else {
      for (let q = 0; q < config.nQubits; q++) {
        sv = applyCNOT(q, (q + 1) % config.nQubits, config.nQubits, sv);
      }
    }
  }

  let totalProb = 0;
  for (let q = 0; q < config.nQubits; q++) {
    totalProb += qubitProbability(sv, q, config.nQubits);
  }

  return totalProb / config.nQubits;
}

export function tensorParameterShiftGradient(
  input: number[],
  params: number[][][],
  layer: number,
  qubit: number,
  paramIdx: number,
  config: VQCConfig = DEFAULT_VQC_CONFIG
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

  const plus = tensorVQCForward(input, paramsPlus, config);
  const minus = tensorVQCForward(input, paramsMinus, config);

  return (plus - minus) / 2;
}
