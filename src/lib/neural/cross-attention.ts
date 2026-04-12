/**
 * ─── v21: Cross-Attention Vision<>Text (Flamingo-style) ───
 * Angular gyrus + superior colliculus analogy.
 * Implements multi-head cross-attention between text and vision modalities.
 * 
 * Ref: Alayrac et al. (2022) Flamingo, Jaegle et al. (2021) Perceiver
 */

export interface CrossAttentionConfig {
  dModel: number;
  dK: number;
  nHeads: number;
  useGating: boolean;
  type: "multi_head" | "bidirectional" | "perceiver";
  nLatents?: number; // for perceiver-style
}

export const DEFAULT_CROSS_ATTENTION_CONFIG: CrossAttentionConfig = {
  dModel: 512,
  dK: 64,
  nHeads: 8,
  useGating: true,
  type: "multi_head",
  nLatents: 32,
};

interface AttentionResult {
  output: number[];
  attentionWeights: number[][];
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function softmax(values: number[]): number[] {
  if (values.length === 0) return [];
  const maxVal = Math.max(...values);
  const exps = values.map(v => Math.exp(v - maxVal));
  const sum = exps.reduce((a, b) => a + b, 0) + 1e-8;
  return exps.map(e => e / sum);
}

export function scaledDotProductAttention(
  query: number[],
  keys: number[][],
  values: number[][],
  dK: number
): { output: number[]; weights: number[] } {
  const scores = keys.map(k => dotProduct(query, k) / Math.sqrt(dK));
  const weights = softmax(scores);

  const dim = values[0]?.length || 0;
  const output = new Array(dim).fill(0);
  for (let i = 0; i < values.length; i++) {
    for (let d = 0; d < dim; d++) {
      output[d] += weights[i] * (values[i]?.[d] || 0);
    }
  }
  return { output, weights };
}

export function crossAttention(
  textTokens: number[][],
  visionTokens: number[][],
  config: CrossAttentionConfig = DEFAULT_CROSS_ATTENTION_CONFIG
): AttentionResult {
  // Q from text, K/V from vision (Flamingo-style)
  const allWeights: number[][] = [];
  const outputs: number[] = [];

  for (const textToken of textTokens) {
    const { output, weights } = scaledDotProductAttention(
      textToken,
      visionTokens,
      visionTokens,
      config.dK
    );
    allWeights.push(weights);
    outputs.push(...output.slice(0, Math.ceil(output.length / textTokens.length)));
  }

  // Apply gating if enabled
  if (config.useGating) {
    const gate = 1 / (1 + Math.exp(-dotProduct(outputs.slice(0, 4), [0.5, 0.5, 0.5, 0.5])));
    for (let i = 0; i < outputs.length; i++) {
      outputs[i] *= gate;
    }
  }

  return { output: outputs, attentionWeights: allWeights };
}

export function bidirectionalCrossAttention(
  textTokens: number[][],
  visionTokens: number[][],
  config: CrossAttentionConfig = DEFAULT_CROSS_ATTENTION_CONFIG
): { textToVision: AttentionResult; visionToText: AttentionResult } {
  const textToVision = crossAttention(textTokens, visionTokens, config);
  const visionToText = crossAttention(visionTokens, textTokens, config);
  return { textToVision, visionToText };
}

export function perceiverAttention(
  inputTokens: number[][],
  nLatents: number = 32,
  config: CrossAttentionConfig = DEFAULT_CROSS_ATTENTION_CONFIG
): AttentionResult {
  // Initialize latent array (bottleneck)
  const latents: number[][] = Array.from({ length: nLatents }, (_, i) =>
    Array.from({ length: config.dK }, (_, d) => Math.sin((i + 1) * (d + 1) * 0.1))
  );
  return crossAttention(latents, inputTokens, config);
}
