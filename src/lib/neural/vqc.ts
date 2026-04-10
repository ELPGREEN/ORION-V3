/**
 * ─── v23.0: Variational Quantum Circuit (VQC) Simulator ───
 * Refactored into proper quantum modules:
 *   - qubit-core.ts: Complex arithmetic, state primitives, Bloch sphere
 *   - quantum-gates.ts: RX, RY, RZ, H, CNOT, CZ, SWAP
 *   - quantum-entanglement.ts: Bell states, GHZ, multi-qubit registers
 *   - quantum-decoherence.ts: T1/T2, noise channels, calibration
 *
 * This file orchestrates the VQC forward pass and re-exports all primitives.
 *
 * Refs: Nielsen & Chuang (2000), Cerezo et al. (2021), Schumacher (1995)
 */

// ─── Re-exports (backward compatibility) ───

export type { Complex, QubitState, BlochCoordinates } from "./qubit-core";
export {
  qubitZero,
  qubitOne,
  qubitPlus,
  qubitMinus,
  qubitFromProbability,
  measureProbability,
  measureCollapse,
  normalize,
  toBlochSphere,
  fromBlochSphere,
  fidelity,
  cAbs2,
} from "./qubit-core";

export {
  rotationX,
  rotationY,
  rotationZ,
  hadamard,
  pauliX,
  pauliZ,
  cnot,
  cz,
  swap,
  rx,
  ry,
  rz,
} from "./quantum-gates";

export type { CalibrationMatrix, NoiseModelType, DecoherenceModel } from "./quantum-decoherence";
export {
  applyNoise,
  applyDecoherence,
  calibrate,
  applyCalibration,
  amplitudeDamping,
  phaseDamping,
  depolarize,
  coherenceLifetime,
  DEFAULT_DECOHERENCE,
} from "./quantum-decoherence";

export type { EntangledPair, QubitRegister } from "./quantum-entanglement";
export {
  bellPhiPlus,
  bellPhiMinus,
  bellPsiPlus,
  bellPsiMinus,
  measureEntangledPair,
  createRegister,
  superpositionAll,
  entanglePair,
  ghzState,
  measureRegister,
  hilbertSpaceDimension,
} from "./quantum-entanglement";

// ─── VQC Config ───

import type { QubitState } from "./qubit-core";
import { qubitZero, measureProbability } from "./qubit-core";
import { rotationX, rotationY, rotationZ } from "./quantum-gates";
import { applyNoise } from "./quantum-decoherence";
import type { NoiseModelType } from "./quantum-decoherence";

export interface VQCConfig {
  nQubits: number;
  nLayers: number;
  featureMap: "zz" | "iqp" | "tanh";
  ansatz: "hardware_efficient" | "strongly_entangling";
  noiseModel: NoiseModelType;
  noiseStrength: number;
  naturalGradient: boolean;
  residualStrength: number;
  gradientClip: number;
}

export const DEFAULT_VQC_CONFIG: VQCConfig = {
  nQubits: 4,
  nLayers: 3,
  featureMap: "zz",
  ansatz: "hardware_efficient",
  noiseModel: "depolarizing",
  noiseStrength: 0.01,
  naturalGradient: true,
  residualStrength: 0.1,
  gradientClip: 1.0,
};

// ─── Feature Maps ───

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

// ─── VQC Forward Pass ───

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

    // Entangling layer: CZ-inspired controlled-phase
    for (let q = 0; q < config.nQubits - 1; q++) {
      const controlPhase = measureProbability(qubits[q]) * Math.PI;
      qubits[q + 1] = rotationZ(controlPhase, qubits[q + 1]);
    }

    qubits = applyNoise(qubits, config.noiseModel, config.noiseStrength);
  }

  return qubits.reduce((s, q) => s + measureProbability(q), 0) / qubits.length;
}

// ─── Gradient ───

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

// ─── Runtime-backed Forward Pass ───

import {
  createInstance,
  createJob,
  executeJob,
  transpile as transpileCircuit,
} from "./qiskit-runtime";
import type {
  QPUId,
  ErrorMitigationType as QiskitMitigationType,
  RuntimeCircuit,
} from "./qiskit-runtime";

export interface RuntimeForwardResult {
  value: number;
  mitigatedValue: number;
  jobId: string;
  qpuId: string;
  transpiledDepth: number;
  originalDepth: number;
  shots: number;
}

/**
 * Execute VQC forward pass through the Qiskit Runtime pipeline:
 * transpile → execute with QPU noise → error mitigation
 */
export function vqcForwardWithRuntime(
  input: number[],
  params: number[][][],
  runtimeOptions: {
    qpuId?: QPUId;
    errorMitigation?: QiskitMitigationType;
    shots?: number;
  } = {},
  config: VQCConfig = DEFAULT_VQC_CONFIG
): RuntimeForwardResult {
  const instance = createInstance({ plan: "standard", region: "us-east" });

  const circuit: RuntimeCircuit = {
    nQubits: config.nQubits,
    nLayers: config.nLayers,
    params,
    input,
    config,
  };

  const qpuId = runtimeOptions.qpuId || "simulator_stabilizer";
  const job = createJob(instance, circuit, {
    qpuId,
    shots: runtimeOptions.shots || 1024,
    errorMitigation: runtimeOptions.errorMitigation || "zne",
  });

  const executed = executeJob(job);
  const result = executed.result!;

  return {
    value: result.expectationValue,
    mitigatedValue: result.mitigatedExpectation,
    jobId: executed.id,
    qpuId,
    transpiledDepth: executed.transpiledDepth || 0,
    originalDepth: executed.originalDepth || 0,
    shots: result.shots,
  };
}

// ─── Tensor Mode Re-exports ───

export {
  tensorVQCForward,
  tensorParameterShiftGradient,
  tensorZZFeatureMap,
  tensorIQPFeatureMap,
} from "./tensor-vqc";

export type {
  StateVector,
  DensityMatrix,
} from "./tensor-state-vector";

export {
  tensorZero,
  basisState,
  kronecker,
  kroneckerMatrix,
  applySingleGate,
  applyCNOT,
  applyCZ,
  applySWAP,
  qubitProbability,
  probabilityDistribution,
  measureQubit,
  measureAll,
  densityMatrix,
  partialTrace,
  partialTraceFromSV,
  vonNeumannEntropy,
  entanglementEntropy,
  stateFidelity,
  normalizeSV,
  H2, X2, Z2, I2,
  RX2, RY2, RZ2,
} from "./tensor-state-vector";

// ─── Init ───

export function initVQCParams(config: VQCConfig = DEFAULT_VQC_CONFIG): number[][][] {
  return Array.from({ length: config.nLayers }, () =>
    Array.from({ length: config.nQubits }, () =>
      Array.from({ length: 3 }, () => (Math.random() - 0.5) * 2 * Math.PI)
    )
  );
}
