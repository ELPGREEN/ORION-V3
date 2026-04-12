/**
 * ─── Quantum Embedding Kernel (Tensor Mode) ───
 * Applies quantum kernel methods to classical embeddings using
 * the full 2^n tensor state vector for real entanglement.
 * 
 * Architecture: Amplitude Encoding → Tensor ZZ Feature Map → State Fidelity
 * Refs: Havlíček et al. (2019), Schuld & Killoran (2019)
 */

import {
  type StateVector,
  tensorFromProbabilities,
  stateFidelity,
  qubitProbability,
} from "./tensor-state-vector";

import { tensorZZFeatureMap } from "./tensor-vqc";
import { applyNoiseTensor, type NoiseModelType } from "./quantum-decoherence";

// ─── Types ───

export interface QuantumKernelResult {
  /** Quantum kernel similarity 0-1 */
  quantumSimilarity: number;
  /** Classical cosine similarity 0-1 */
  classicalSimilarity: number;
  /** Combined hybrid score */
  hybridScore: number;
  /** How much quantum improved over classical */
  quantumBoost: number;
  /** Processing time */
  kernelLatencyMs: number;
}

export interface QuantumKernelConfig {
  nQubits: number;
  nReps: number;
  quantumWeight: number;
  noiseStrength: number;
  entangle: boolean;
}

export const DEFAULT_KERNEL_CONFIG: QuantumKernelConfig = {
  nQubits: 4,
  nReps: 2,
  quantumWeight: 0.35,
  noiseStrength: 0.005,
  entangle: true,
};

// ─── Tensor Feature Encoding ───

/**
 * Encode a classical vector into a tensor state vector using
 * the ZZ feature map with real CNOT entangling gates.
 */
function encodeToTensor(
  vector: number[],
  config: QuantumKernelConfig
): StateVector {
  // Project to nQubits dimensions
  const projected = projectVector(vector, config.nQubits);

  // Use tensor ZZ feature map (real entanglement via CNOT)
  let sv = tensorZZFeatureMap(projected, { nQubits: config.nQubits });

  // Apply realistic noise on tensor state
  if (config.noiseStrength > 0) {
    sv = applyNoiseTensor(sv, config.nQubits, "depolarizing", config.noiseStrength);
  }

  return sv;
}

// ─── Classical helpers ───

function cosineSimilarity(a: number[], b: number[]): number {
  const minLen = Math.min(a.length, b.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < minLen; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Reduce high-dimensional embedding to targetDim via chunked averaging.
 */
function projectVector(vec: number[], targetDim: number): number[] {
  if (vec.length <= targetDim) {
    const padded = [...vec];
    while (padded.length < targetDim) padded.push(0);
    return padded;
  }
  const chunkSize = Math.ceil(vec.length / targetDim);
  const projected: number[] = [];
  for (let i = 0; i < targetDim; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, vec.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += vec[j];
    projected.push(sum / (end - start));
  }
  const maxAbs = Math.max(...projected.map(Math.abs), 1e-8);
  return projected.map(v => v / maxAbs);
}

// ─── Main Kernel Function ───

/**
 * Compute quantum kernel similarity between two embedding vectors.
 * Uses tensor state fidelity F = |⟨ψ_A|ψ_B⟩|² for quantum similarity.
 */
export function quantumKernelSimilarity(
  embeddingA: number[],
  embeddingB: number[],
  config: QuantumKernelConfig = DEFAULT_KERNEL_CONFIG
): QuantumKernelResult {
  const start = performance.now();

  // Classical baseline
  const classicalSim = cosineSimilarity(embeddingA, embeddingB);

  // Tensor encoding with real entanglement
  const svA = encodeToTensor(embeddingA, config);
  const svB = encodeToTensor(embeddingB, config);

  // Quantum kernel: state fidelity on full 2^n vector
  const quantumSim = stateFidelity(svA, svB);

  // Hybrid score
  const hybridScore =
    config.quantumWeight * quantumSim +
    (1 - config.quantumWeight) * classicalSim;

  const quantumBoost = classicalSim > 0
    ? (hybridScore - classicalSim) / classicalSim
    : 0;

  return {
    quantumSimilarity: Math.round(quantumSim * 10000) / 10000,
    classicalSimilarity: Math.round(classicalSim * 10000) / 10000,
    hybridScore: Math.round(hybridScore * 10000) / 10000,
    quantumBoost: Math.round(quantumBoost * 10000) / 10000,
    kernelLatencyMs: Math.round(performance.now() - start),
  };
}

/**
 * Batch kernel scoring — rank multiple candidates against a query embedding.
 */
export function quantumKernelRank(
  queryEmbedding: number[],
  candidateEmbeddings: Array<{ id: string; embedding: number[]; metadata?: any }>,
  config: QuantumKernelConfig = DEFAULT_KERNEL_CONFIG
): Array<{ id: string; result: QuantumKernelResult; metadata?: any }> {
  return candidateEmbeddings
    .map(candidate => ({
      id: candidate.id,
      result: quantumKernelSimilarity(queryEmbedding, candidate.embedding, config),
      metadata: candidate.metadata,
    }))
    .sort((a, b) => b.result.hybridScore - a.result.hybridScore);
}

/**
 * Format quantum kernel results for AI context.
 */
export function formatQuantumKernelForAI(results: Array<{ id: string; result: QuantumKernelResult }>): string {
  if (results.length === 0) return "";
  const top = results.slice(0, 5);
  const avgBoost = top.reduce((s, r) => s + r.result.quantumBoost, 0) / top.length;
  return `⚛️ QUANTUM KERNEL: ${top.length} results ranked | Avg boost: ${(avgBoost * 100).toFixed(1)}% | Top: ${top.map(r => `${r.id}(${r.result.hybridScore})`).join(", ")}`;
}
