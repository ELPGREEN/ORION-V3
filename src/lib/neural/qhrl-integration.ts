/**
 * ─── v22.1: QHRL-LLM Integration ───
 * Quantum-enhanced legal AI using proper qubit mechanics.
 * Born rule measurement, wave function collapse, calibration.
 *
 * Fixed: VQC params cached per session for reproducibility.
 */

import {
  vqcForward,
  initVQCParams,
  DEFAULT_VQC_CONFIG,
  measureProbability,
  qubitFromProbability,
  calibrate,
  applyCalibration,
  type CalibrationMatrix,
} from "./vqc";

export type QHRLDomain =
  | "petition_decomposition"
  | "outcome_prediction"
  | "relation_extraction"
  | "multimodal_evidence"
  | "swarm_negotiation"
  | "auto_evolution"
  | "concept_drift_adaptation";

export interface QHRLResult {
  domain: QHRLDomain;
  selectionProbability: number;
  decoherence: number;
  output: Record<string, unknown>;
  quantumAdvantage: number;
}

export interface QHRLSummary {
  activeDomains: number;
  avgSelectionProbability: number;
  avgDecoherence: number;
  conceptDriftEvents: number;
  classicalFallbacks: number;
  quantumAdvantageEstimate: number;
}

// ─── Cached state (per session) ───

let _calibration: CalibrationMatrix | null = null;
let _cachedParams: number[][][] | null = null;

function getCalibration(): CalibrationMatrix {
  if (_calibration == null) {
    _calibration = calibrate(500, DEFAULT_VQC_CONFIG.noiseStrength);
  }
  return _calibration;
}

function getCachedParams(): number[][][] {
  if (_cachedParams == null) {
    _cachedParams = initVQCParams();
  }
  return _cachedParams;
}

/** Reset calibration and params (call when noise model changes) */
export function resetCalibration(): void {
  _calibration = null;
  _cachedParams = null;
}

// ─── Von Neumann Entropy ───

function vonNeumannEntropy(probabilities: number[]): number {
  return -probabilities
    .filter(p => p > 1e-15)
    .reduce((s, p) => s + p * Math.log2(p), 0);
}

// ─── Calibrated VQC measurement (uses cached params) ───

function calibratedMeasure(input: number[]): { prob: number; entropy: number } {
  const params = getCachedParams();
  const rawProb = vqcForward(input, params);
  const cal = getCalibration();
  const prob = applyCalibration(rawProb, cal);
  const entropy = vonNeumannEntropy([prob, 1 - prob]);
  return { prob, entropy };
}

// ─── Domain Functions ───

export function qhrlPetitionDecomposition(
  caseDescription: string,
  petitionType: string,
  legalArea: string
): QHRLResult {
  const features = extractQueryFeatures(caseDescription);
  const { prob, entropy } = calibratedMeasure(features);

  return {
    domain: "petition_decomposition",
    selectionProbability: prob,
    decoherence: entropy,
    output: {
      petitionType,
      legalArea,
      suggestedSections: Math.ceil(prob * 8) + 3,
    },
    quantumAdvantage: prob * (1 - entropy),
  };
}

export function qhrlOutcomePrediction(caseFeatures: number[]): QHRLResult {
  const { prob, entropy } = calibratedMeasure(caseFeatures.slice(0, 4));

  return {
    domain: "outcome_prediction",
    selectionProbability: prob,
    decoherence: entropy,
    output: { favorableProbability: prob, confidenceLevel: 1 - entropy },
    quantumAdvantage: prob * (1 - entropy),
  };
}

export function qhrlSwarmNegotiation(
  disputeDescription: string,
  parties: string[]
): QHRLResult {
  const features = extractQueryFeatures(disputeDescription);
  const { prob, entropy } = calibratedMeasure(features);

  return {
    domain: "swarm_negotiation",
    selectionProbability: prob,
    decoherence: entropy,
    output: {
      parties,
      consensusProbability: prob,
      recommendedAgents: Math.ceil(prob * 5),
    },
    quantumAdvantage: prob * (1 - entropy),
  };
}

export function qhrlAutoEvolutionStep(
  rewards: number[],
  features: number[],
  conceptDrift: boolean
): QHRLResult {
  const { prob, entropy } = calibratedMeasure(features.slice(0, 4));
  const avgReward = rewards.length > 0
    ? rewards.reduce((a, b) => a + b, 0) / rewards.length
    : 0;

  return {
    domain: conceptDrift ? "concept_drift_adaptation" : "auto_evolution",
    selectionProbability: prob,
    decoherence: entropy,
    output: {
      avgReward,
      adaptationNeeded: conceptDrift,
      learningRate: prob * 0.1,
    },
    quantumAdvantage: prob * (1 - entropy) * (conceptDrift ? 0.5 : 1),
  };
}

// ─── Concept Drift Detection ───

export function detectConceptDrift(
  recentEntropies: number[],
  windowSize: number = 10
): boolean {
  if (recentEntropies.length < windowSize) return false;
  const recent = recentEntropies.slice(-windowSize);
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  return mean > 0.85;
}

// ─── Feature Extraction ───

export function extractQueryFeatures(query: string): number[] {
  const features = [0, 0, 0, 0];
  const safeQuery = typeof query === "string" ? query : "";
  for (let i = 0; i < safeQuery.length; i++) {
    features[i % 4] += Math.sin(safeQuery.charCodeAt(i) * 0.01) * 0.1;
  }
  return features.map(f => 1 / (1 + Math.exp(-f)));
}

// ─── Summary ───

export function computeQHRLSummary(results: QHRLResult[]): QHRLSummary {
  if (results.length === 0) {
    return {
      activeDomains: 0,
      avgSelectionProbability: 0,
      avgDecoherence: 0,
      conceptDriftEvents: 0,
      classicalFallbacks: 0,
      quantumAdvantageEstimate: 0,
    };
  }

  const avgProb = results.reduce((s, r) => s + r.selectionProbability, 0) / results.length;
  const avgDeco = results.reduce((s, r) => s + r.decoherence, 0) / results.length;
  const driftEvents = results.filter(r => r.domain === "concept_drift_adaptation").length;
  const fallbacks = results.filter(r => r.decoherence > 0.95).length;

  return {
    activeDomains: new Set(results.map(r => r.domain)).size,
    avgSelectionProbability: avgProb,
    avgDecoherence: avgDeco,
    conceptDriftEvents: driftEvents,
    classicalFallbacks: fallbacks,
    quantumAdvantageEstimate: avgProb * (1 - avgDeco) * (1 - fallbacks / Math.max(results.length, 1)),
  };
}
