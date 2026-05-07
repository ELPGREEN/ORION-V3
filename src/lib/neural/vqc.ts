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
  // Tensor Kraus channels
  depolarizeTensor,
  amplitudeDampingTensor,
  phaseDampingTensor,
  applyNoiseTensor,
  applyDecoherenceTensor,
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

// ─── VQC Core imports ───
export type { VQCConfig } from "./vqc-types";
export { DEFAULT_VQC_CONFIG } from "./vqc-types";
export {
  zzFeatureMap,
  iqpFeatureMap,
  tanhFeatureMap,
  vqcForward,
  clipGradient,
  parameterShiftGradient,
  initVQCParams
} from "./vqc-core";

// ─── Runtime-backed Forward Pass ───

import {
  createInstance,
  createJob,
  executeJob,
} from "./qiskit-runtime";
import type {
  QPUId,
  ErrorMitigationType as QiskitMitigationType,
  RuntimeCircuit,
} from "./qiskit-runtime";
import { VQCConfig, DEFAULT_VQC_CONFIG } from "./vqc-types";

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
} from "./tensor-vqc-core";

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
