/**
 * ─── v23.0: Variational Quantum Circuit (VQC) Simulator ───
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

export { VQCConfig, DEFAULT_VQC_CONFIG } from "./vqc-types";
export {
  zzFeatureMap,
  iqpFeatureMap,
  tanhFeatureMap,
  vqcForward,
  initVQCParams,
  clipGradient,
  parameterShiftGradient,
} from "./vqc-core";

export { vqcForwardWithRuntime } from "./vqc-runtime-orchestrator";
export type { RuntimeForwardResult } from "./vqc-runtime-orchestrator";

export {
  tensorVQCForward,
  tensorParameterShiftGradient,
  tensorZZFeatureMap,
  tensorIQPFeatureMap,
} from "./tensor-vqc";

export type { StateVector, DensityMatrix } from "./tensor-state-vector";
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
