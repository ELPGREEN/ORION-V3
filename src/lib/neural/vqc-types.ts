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
