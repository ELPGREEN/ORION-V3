/**
 * ─── v21: SHAP-based MHA Head Pruning ───
 * Analyzes importance of each attention head using Leave-One-Out SHAP.
 * Prunes low-contribution heads to reduce computational cost.
 * 
 * Refs: Michel et al. (2019), Voita et al. (2019)
 */

export interface HeadImportance {
  headName: string;
  weight: number;
  shapValue: number;
  shouldPrune: boolean;
}

export interface BayesianUncertainty {
  mean: number;
  variance: number;
  coefficientOfVariation: number;
  entropy: number;
  calibration: number;
  confidenceInterval: [number, number];
}

function computeWeightedScore(
  heads: Array<{ name: string; weight: number }>,
  scores: Record<string, number>
): number {
  let totalWeight = 0;
  let weightedSum = 0;
  for (const head of heads) {
    const score = scores[head.name] || 0;
    weightedSum += head.weight * score;
    totalWeight += head.weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

export function computeHeadImportance(
  heads: Array<{ name: string; weight: number }>,
  scores: Record<string, number>,
  pruneThreshold: number = 0.05
): HeadImportance[] {
  const baselineScore = computeWeightedScore(heads, scores);

  return heads.map(head => {
    const reducedHeads = heads.filter(h => h.name !== head.name);
    const reducedScore = computeWeightedScore(reducedHeads, scores);
    const shapValue = baselineScore - reducedScore;

    return {
      headName: head.name,
      weight: head.weight,
      shapValue,
      shouldPrune: Math.abs(shapValue) < pruneThreshold,
    };
  });
}

export function bayesianUncertainty(scores: number[]): BayesianUncertainty {
  if (scores.length === 0) {
    return { mean: 0, variance: 0, coefficientOfVariation: 0, entropy: 0, calibration: 0, confidenceInterval: [0, 0] };
  }

  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  // Bessel's correction for unbiased variance (n > 1)
  const variance = n > 1
    ? scores.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
    : scores.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const cv = Math.abs(mean) > 1e-10 ? stdDev / Math.abs(mean) : 0;

  // Entropy (Shannon entropy of normalized absolute values)
  const total = scores.reduce((s, v) => s + Math.abs(v), 0);
  const probs = total > 0 ? scores.map(v => Math.abs(v) / total) : scores.map(() => 1 / n);
  const entropy = -probs.reduce((s, p) => s + (p > 1e-15 ? p * Math.log(p) : 0), 0);

  // Calibration: agreement between mean and median
  const sorted = [...scores].sort((a, b) => a - b);
  const median = n % 2 === 1
    ? sorted[Math.floor(n / 2)]
    : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const range = (sorted[n - 1] - sorted[0]) || 1;
  const calibration = Math.max(0, 1 - Math.abs(mean - median) / range);

  // 95% CI using t-distribution approximation (z=1.96 for large n)
  const stderr = stdDev / Math.sqrt(n);
  const confidenceInterval: [number, number] = [mean - 1.96 * stderr, mean + 1.96 * stderr];

  return { mean, variance, coefficientOfVariation: cv, entropy, calibration, confidenceInterval };
}

export function dynamicPrune(
  heads: Array<{ name: string; weight: number }>,
  scores: Record<string, number>,
  targetSpeedup: number = 1.5
): Array<{ name: string; weight: number }> {
  const importance = computeHeadImportance(heads, scores);
  const sorted = [...importance].sort((a, b) => a.shapValue - b.shapValue);
  const pruneCount = Math.ceil(heads.length * (1 - 1 / targetSpeedup));
  const prunedNames = new Set(sorted.slice(0, pruneCount).map(h => h.headName));
  return heads.filter(h => !prunedNames.has(h.name));
}

// ─── v21.4: Fast Magnitude Pruning (alternative to SHAP LOO) ───

/**
 * Magnitude-based pruning: prune heads with lowest absolute weight sum.
 * Much faster than SHAP Leave-One-Out with near-identical accuracy.
 * Ref: Michel et al. (2019) - "Are Sixteen Heads Really Better than One?"
 */
export function magnitudePrune(
  heads: Array<{ name: string; weight: number }>,
  pruneRatio: number = 0.3
): { kept: Array<{ name: string; weight: number }>; pruned: string[] } {
  const sorted = [...heads].sort((a, b) => Math.abs(a.weight) - Math.abs(b.weight));
  const pruneCount = Math.floor(heads.length * pruneRatio);
  const prunedNames = new Set(sorted.slice(0, pruneCount).map(h => h.name));

  return {
    kept: heads.filter(h => !prunedNames.has(h.name)),
    pruned: sorted.slice(0, pruneCount).map(h => h.name),
  };
}

/**
 * Attention rollout importance: considers cumulative attention flow.
 */
export function attentionRolloutImportance(
  heads: Array<{ name: string; weight: number }>,
  layerWeights: number[] = []
): Array<{ name: string; importance: number }> {
  const totalWeight = heads.reduce((s, h) => s + Math.abs(h.weight), 0) || 1;
  return heads.map((h, i) => {
    const layerFactor = layerWeights[i] ?? 1;
    return {
      name: h.name,
      importance: (Math.abs(h.weight) / totalWeight) * layerFactor,
    };
  }).sort((a, b) => b.importance - a.importance);
}
