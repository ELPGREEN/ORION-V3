import type { QubitState } from "./qubit-core";
import { qubitZero, measureProbability } from "./qubit-core";
import { rotationX, rotationY, rotationZ } from "./quantum-gates";
import { applyNoise } from "./quantum-decoherence";
import { VQCConfig, DEFAULT_VQC_CONFIG } from "./vqc-types";

export function zzFeatureMap(input: number[], nQubits: number): QubitState[] {
  const qubits: QubitState[] = Array.from({ length: nQubits }, () => qubitZero());
  for (let i = 0; i < Math.min(input.length, nQubits); i++) {
    qubits[i] = rotationY(input[i] * Math.PI, qubits[i]);
  }
  for (let i = 0; i < nQubits - 1; i++) {
    const phase = measureProbability(qubits[i]) * measureProbability(qubits[i + 1]) * Math.PI;
    qubits[i] = rotationZ(phase, qubits[i]);
    qubits[i + 1] = rotationZ(phase, qubits[i + 1]);
  }
  return qubits;
}

export function iqpFeatureMap(input: number[], nQubits: number): QubitState[] {
  const qubits: QubitState[] = Array.from({ length: nQubits }, () => qubitZero());
  for (let i = 0; i < Math.min(input.length, nQubits); i++) {
    qubits[i] = rotationY(input[i] * Math.PI, qubits[i]);
  }
  for (let i = 0; i < nQubits - 1; i++) {
    const iqpPhase = input[i % input.length] * input[(i + 1) % input.length] * Math.PI;
    qubits[i] = rotationZ(iqpPhase, qubits[i]);
    qubits[i + 1] = rotationZ(iqpPhase, qubits[i + 1]);
  }
  return qubits;
}

export function tanhFeatureMap(input: number[], nQubits: number): QubitState[] {
  const qubits: QubitState[] = Array.from({ length: nQubits }, () => qubitZero());
  for (let i = 0; i < Math.min(input.length, nQubits); i++) {
    qubits[i] = rotationY(Math.tanh(input[i]) * Math.PI, qubits[i]);
  }
  return qubits;
}

export function vqcForward(
  input: number[],
  params: number[][][],
  config: VQCConfig = DEFAULT_VQC_CONFIG
): number {
  let qubits: QubitState[];
  switch (config.featureMap) {
    case "tanh":
      qubits = tanhFeatureMap(input, config.nQubits);
      break;
    case "iqp":
      qubits = iqpFeatureMap(input, config.nQubits);
      break;
    default:
      qubits = zzFeatureMap(input, config.nQubits);
  }

  for (let layer = 0; layer < config.nLayers; layer++) {
    for (let q = 0; q < config.nQubits; q++) {
      const p = params[layer]?.[q] ?? [0, 0, 0];
      qubits[q] = rotationX(p[0], qubits[q]);
      qubits[q] = rotationY(p[1], qubits[q]);
      qubits[q] = rotationZ(p[2], qubits[q]);
    }

    for (let q = 0; q < config.nQubits - 1; q++) {
      const controlPhase = measureProbability(qubits[q]) * Math.PI;
      qubits[q + 1] = rotationZ(controlPhase, qubits[q + 1]);
    }

    qubits = applyNoise(qubits, config.noiseModel, config.noiseStrength);
  }

  return qubits.reduce((s, q) => s + measureProbability(q), 0) / qubits.length;
}

export function initVQCParams(config: VQCConfig = DEFAULT_VQC_CONFIG): number[][][] {
  return Array.from({ length: config.nLayers }, () =>
    Array.from({ length: config.nQubits }, () =>
      Array.from({ length: 3 }, () => (Math.random() - 0.5) * 2 * Math.PI)
    )
  );
}

export function clipGradient(grad: number, maxNorm: number = 1.0): number {
  return Math.max(-maxNorm, Math.min(maxNorm, grad));
}

export function parameterShiftGradient(
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
  const grad = (vqcForward(input, paramsPlus, config) - vqcForward(input, paramsMinus, config)) / 2;
  return clipGradient(grad, config.gradientClip);
}
