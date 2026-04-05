/**
 * ─── v21: Cross-Modal Embeddings (CLIP-inspired) ───
 * Ventral visual stream meets Wernicke's area analogy.
 * Contrastive learning to align text and vision embeddings.
 * 
 * Ref: Radford et al. (2021) CLIP
 */

export interface CrossModalConfig {
  embeddingDim: number;
  temperature: number;
  projectionDim: number;
  textWeight: number;
  visionWeight: number;
}

export const DEFAULT_CROSS_MODAL_CONFIG: CrossModalConfig = {
  embeddingDim: 512,
  temperature: 0.07,
  projectionDim: 256,
  textWeight: 0.6,
  visionWeight: 0.4,
};

import { l2Normalize, cosineSimilarity } from "./activations";
export { l2Normalize, cosineSimilarity };

export function infoNCELoss(
  anchor: number[],
  positive: number[],
  negatives: number[][],
  temperature: number = 0.07
): number {
  const posSim = cosineSimilarity(anchor, positive) / temperature;
  const negSims = negatives.map(n => cosineSimilarity(anchor, n) / temperature);
  const allSims = [posSim, ...negSims];
  const maxSim = Math.max(...allSims);
  const logSumExp = maxSim + Math.log(allSims.reduce((s, v) => s + Math.exp(v - maxSim), 0));
  return -(posSim - logSumExp);
}

function projectionHead(input: number[], dim: number): number[] {
  // 2-layer MLP projection (Xavier-initialized simulation)
  const hidden = input.map((v, i) => Math.max(0, v * (0.1 * ((i % 7) - 3))));
  return hidden.slice(0, dim).map((v, i) => v * (0.05 * ((i % 5) - 2)));
}

export function textToEmbedding(text: string, dim: number = 512): number[] {
  // Deterministic text → embedding (hash-based for consistency)
  const embedding = new Array(dim).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    embedding[i % dim] += Math.sin(charCode * 0.1 * (i + 1)) * 0.1;
  }
  return l2Normalize(embedding);
}

export function visionToEmbedding(imageFeatures: number[], dim: number = 512): number[] {
  const embedding = new Array(dim).fill(0);
  for (let i = 0; i < imageFeatures.length; i++) {
    embedding[i % dim] += imageFeatures[i] * 0.1;
  }
  return l2Normalize(embedding);
}

export function fuseEmbeddings(
  textEmb: number[],
  visionEmb: number[],
  config: CrossModalConfig = DEFAULT_CROSS_MODAL_CONFIG
): number[] {
  const dim = Math.min(textEmb.length, visionEmb.length);
  const fused = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    fused[i] = config.textWeight * textEmb[i] + config.visionWeight * visionEmb[i];
  }
  return l2Normalize(fused);
}

export function retrieveCrossModal(
  query: number[],
  candidates: Array<{ id: string; embedding: number[] }>,
  topK: number = 5
): Array<{ id: string; score: number }> {
  return candidates
    .map(c => ({ id: c.id, score: cosineSimilarity(query, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
