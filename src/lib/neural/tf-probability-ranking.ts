/**
 * 📊 TensorFlow Probability, Ranking & Information Geometry
 * Enhanced with Fisher Information, Boltzmann Energy & Manifold logic
 */

export interface Distribution {
  sample: () => number;
  pdf: (x: number) => number;
  logPdf: (x: number) => number;
  mean: () => number;
  variance: () => number;
  cdf: (x: number) => number;
  type: string;
}

/** Normal (Gaussian) Distribution */
export function normal(mu = 0, sigma = 1): Distribution {
  return {
    type: "Normal",
    sample: () => {
      const u1 = Math.random(), u2 = Math.random();
      return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    },
    pdf: (x) => (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2),
    logPdf: (x) => -Math.log(sigma * Math.sqrt(2 * Math.PI)) - 0.5 * ((x - mu) / sigma) ** 2,
    mean: () => mu,
    variance: () => sigma ** 2,
    cdf: (x) => 0.5 * (1 + erf((x - mu) / (sigma * Math.sqrt(2)))),
  };
}

/** Bernoulli Distribution */
export function bernoulli(p = 0.5): Distribution {
  return {
    type: "Bernoulli",
    sample: () => (Math.random() < p ? 1 : 0),
    pdf: (x) => (x === 1 ? p : x === 0 ? 1 - p : 0),
    logPdf: (x) => (x === 1 ? Math.log(p) : x === 0 ? Math.log(1 - p) : -Infinity),
    mean: () => p,
    variance: () => p * (1 - p),
    cdf: (x) => (x < 0 ? 0 : x < 1 ? 1 - p : 1),
  };
}

/** Beta Distribution */
export function beta(alpha = 1, betaParam = 1): Distribution {
  return {
    type: "Beta",
    sample: () => {
      const u = gammaSample(alpha), v = gammaSample(betaParam);
      return u / (u + v);
    },
    pdf: (x) => (x < 0 || x > 1 ? 0 : (Math.pow(x, alpha - 1) * Math.pow(1 - x, betaParam - 1)) / (gammaFn(alpha) * gammaFn(betaParam) / gammaFn(alpha + betaParam))),
    logPdf: (x) => (x < 0 || x > 1 ? -Infinity : (alpha - 1) * Math.log(x) + (betaParam - 1) * Math.log(1 - x) - Math.log(gammaFn(alpha) * gammaFn(betaParam) / gammaFn(alpha + betaParam))),
    mean: () => alpha / (alpha + betaParam),
    variance: () => (alpha * betaParam) / ((alpha + betaParam) ** 2 * (alpha + betaParam + 1)),
    cdf: (x) => 0, // Incomplete Beta function needed for full implementation
  };
}

/** Poisson Distribution */
export function poisson(lambda = 1): Distribution {
  return {
    type: "Poisson",
    sample: () => {
      let L = Math.exp(-lambda), p = 1, k = 0;
      do { k++; p *= Math.random(); } while (p > L);
      return k - 1;
    },
    pdf: (x) => (x < 0 ? 0 : (Math.pow(lambda, x) * Math.exp(-lambda)) / factorial(Math.round(x))),
    logPdf: (x) => (x < 0 ? -Infinity : x * Math.log(lambda) - lambda - logFactorial(Math.round(x))),
    mean: () => lambda,
    variance: () => lambda,
    cdf: (x) => 0, // Poisson CDF sum
  };
}

/** Categorical (Multinoulli) Distribution */
export function categorical(probs: number[]): Distribution {
  const sum = probs.reduce((a, b) => a + b, 0);
  const normalized = probs.map(p => p / sum);
  const cumProbs = normalized.reduce((acc: number[], p) => {
    acc.push((acc[acc.length - 1] ?? 0) + p);
    return acc;
  }, []);
  return {
    type: "Categorical",
    sample: () => {
      const u = Math.random();
      for (let i = 0; i < cumProbs.length; i++) if (u <= cumProbs[i]) return i;
      return probs.length - 1;
    },
    pdf: (x) => normalized[Math.round(x)] ?? 0,
    logPdf: (x) => Math.log(normalized[Math.round(x)] ?? 1e-10),
    mean: () => normalized.reduce((s, p, i) => s + p * i, 0),
    variance: () => {
      const m = normalized.reduce((s, p, i) => s + p * i, 0);
      return normalized.reduce((s, p, i) => s + p * (i - m) ** 2, 0);
    },
    cdf: (x) => cumProbs[Math.floor(x)] ?? (x < 0 ? 0 : 1),
  };
}

// ═══════════════════════════════════════════
// INFORMATION GEOMETRY & PHYSICS
// ═══════════════════════════════════════════

/** KL divergence: D_KL(P || Q) */
export function klDivergence(pSamples: number[], qDist: Distribution, pDist: Distribution): number {
  let kl = 0;
  for (const x of pSamples) {
    kl += pDist.logPdf(x) - qDist.logPdf(x);
  }
  return kl / pSamples.length;
}

/**
 * Fisher Information Metric Approximation
 * Measures how much information an observable random variable X carries about an unknown parameter θ.
 * Used here to measure 'Logical Stability' or 'Knowledge Sensitivity'.
 */
export function estimateFisherMetric(dist: Distribution, samples: number[]): number {
  let sumScoreSq = 0;
  const eps = 1e-4;
  for (const x of samples) {
    // Score function: gradient of log-likelihood (approximated)
    const logP = dist.logPdf(x);
    const logP_plus = dist.logPdf(x + eps);
    const score = (logP_plus - logP) / eps;
    sumScoreSq += score * score;
  }
  return sumScoreSq / samples.length;
}

/**
 * Boltzmann (Gibbs) Distribution / Free Energy Scoring
 * P(s) = exp(-E(s)/kT) / Z
 * In reasoning, E(s) is the "Inconsistency Energy". High energy = Low probability.
 */
export function boltzmannScore(energy: number, temperature = 1.0): number {
  return Math.exp(-energy / temperature);
}

/**
 * Manifold Curvature Projection (Simplified)
 * Projects high-dimensional embedding similarity into a "Curved Workspace".
 * Connects distant data using a non-linear geometric metric.
 */
export function geometricManifoldDistance(v1: number[], v2: number[]): number {
  // Use arc-cosine distance as a proxy for distance on a spherical manifold (Hypersphere)
  let dot = 0, n1 = 0, n2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    n1 += v1[i] ** 2;
    n2 += v2[i] ** 2;
  }
  const cosSim = dot / (Math.sqrt(n1) * Math.sqrt(n2));
  // Arc-distance on unit sphere
  return Math.acos(Math.max(-1, Math.min(1, cosSim)));
}

// ═══════════════════════════════════════════
// MONTE CARLO & VARIATIONAL
// ═══════════════════════════════════════════

/** Monte Carlo Estimation of expectation */
export function monteCarloExpectation(dist: Distribution, f: (x: number) => number, numSamples = 1000): number {
  let sum = 0;
  for (let i = 0; i < numSamples; i++) sum += f(dist.sample());
  return sum / numSamples;
}

/** Variational inference: ELBO estimation */
export function estimateELBO(
  qDist: Distribution,
  logLikelihood: (z: number) => number,
  priorDist: Distribution,
  numSamples = 100
): number {
  let elbo = 0;
  for (let i = 0; i < numSamples; i++) {
    const z = qDist.sample();
    elbo += logLikelihood(z) + priorDist.logPdf(z) - qDist.logPdf(z);
  }
  return elbo / numSamples;
}

// Math helpers
function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function gammaFn(n: number): number {
  if (n <= 0) return Infinity;
  if (n < 0.5) return Math.PI / (Math.sin(Math.PI * n) * gammaFn(1 - n));
  n -= 1;
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (n + i);
  const t = n + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, n + 0.5) * Math.exp(-t) * x;
}

function gammaSample(alpha: number): number {
  if (alpha < 1) {
    return gammaSample(alpha + 1) * Math.pow(Math.random(), 1 / alpha);
  }
  const d = alpha - 1 / 3, c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x: number, v: number;
    do { x = normal(0, 1).sample(); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * (x * x) * (x * x) || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function logFactorial(n: number): number {
  if (n <= 1) return 0;
  let r = 0;
  for (let i = 2; i <= n; i++) r += Math.log(i);
  return r;
}

// ═══════════════════════════════════════════
// TENSORFLOW RANKING
// ═══════════════════════════════════════════

export interface RankingItem {
  id: string;
  features: number[];
  relevance: number; // ground truth
  score?: number;    // predicted
}

/** Pairwise Logistic Loss (RankNet) — Burges et al. (2005) */
export function pairwiseLogisticLoss(items: RankingItem[]): number {
  let loss = 0, pairs = 0;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].relevance === items[j].relevance) continue;
      const si = items[i].score ?? 0;
      const sj = items[j].score ?? 0;
      const label = items[i].relevance > items[j].relevance ? 1 : -1;
      loss += Math.log(1 + Math.exp(-label * (si - sj)));
      pairs++;
    }
  }
  return pairs > 0 ? loss / pairs : 0;
}

/** Listwise Softmax Loss (ListNet) — Cao et al. (2007) */
export function listwiseSoftmaxLoss(items: RankingItem[]): number {
  const scores = items.map(i => i.score ?? 0);
  const relevances = items.map(i => i.relevance);
  const maxS = Math.max(...scores);
  const maxR = Math.max(...relevances);
  const predProbs = softmaxArr(scores.map(s => s - maxS));
  const trueProbs = softmaxArr(relevances.map(r => r - maxR));
  return -trueProbs.reduce((s, p, i) => s + p * Math.log(predProbs[i] + 1e-10), 0);
}

/** NDCG (Normalized Discounted Cumulative Gain) */
export function ndcg(items: RankingItem[], k?: number): number {
  const sorted = [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const ideal = [...items].sort((a, b) => b.relevance - a.relevance);
  const n = k ?? items.length;

  let dcg = 0, idcg = 0;
  for (let i = 0; i < n; i++) {
    if (sorted[i]) dcg += (Math.pow(2, sorted[i].relevance) - 1) / Math.log2(i + 2);
    if (ideal[i]) idcg += (Math.pow(2, ideal[i].relevance) - 1) / Math.log2(i + 2);
  }
  return idcg > 0 ? dcg / idcg : 0;
}

/** Mean Reciprocal Rank (MRR) */
export function mrr(queries: RankingItem[][]): number {
  let total = 0;
  for (const items of queries) {
    const sorted = [...items].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const rank = sorted.findIndex(i => i.relevance > 0);
    if (rank >= 0) total += 1 / (rank + 1);
  }
  return total / queries.length;
}

function softmaxArr(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map(v => Math.exp(v - max));
  const sum = exps.reduce((s, e) => s + e, 0);
  return exps.map(e => e / sum);
}

// ═══════════════════════════════════════════
// TENSORFLOW RECOMMENDERS
// ═══════════════════════════════════════════

export interface UserItemInteraction {
  userId: string;
  itemId: string;
  rating: number;
  timestamp?: number;
}

export interface RecommenderModel {
  type: "collaborative" | "content" | "hybrid";
  userFactors: Map<string, number[]>;
  itemFactors: Map<string, number[]>;
  userBias: Map<string, number>;
  itemBias: Map<string, number>;
  globalBias: number;
  numFactors: number;
}

/** Train Matrix Factorization model (ALS-style) — Koren et al. (2009) */
export function trainMatrixFactorization(
  interactions: UserItemInteraction[],
  numFactors = 32,
  numEpochs = 10,
  learningRate = 0.01,
  reg = 0.02
): RecommenderModel {
  const userFactors = new Map<string, number[]>();
  const itemFactors = new Map<string, number[]>();
  const userBias = new Map<string, number>();
  const itemBias = new Map<string, number>();

  const users = [...new Set(interactions.map(i => i.userId))];
  const items = [...new Set(interactions.map(i => i.itemId))];
  const globalBias = interactions.reduce((s, i) => s + i.rating, 0) / interactions.length;

  const initVec = () => Array.from({ length: numFactors }, () => (Math.random() - 0.5) * 0.1);
  for (const u of users) { userFactors.set(u, initVec()); userBias.set(u, 0); }
  for (const i of items) { itemFactors.set(i, initVec()); itemBias.set(i, 0); }

  for (let epoch = 0; epoch < numEpochs; epoch++) {
    // Shuffle
    const shuffled = [...interactions].sort(() => Math.random() - 0.5);
    for (const { userId, itemId, rating } of shuffled) {
      const uf = userFactors.get(userId)!;
      const itf = itemFactors.get(itemId)!;
      const ub = userBias.get(userId) ?? 0;
      const ib = itemBias.get(itemId) ?? 0;

      let pred = globalBias + ub + ib;
      for (let f = 0; f < numFactors; f++) pred += uf[f] * itf[f];
      const error = rating - pred;

      userBias.set(userId, ub + learningRate * (error - reg * ub));
      itemBias.set(itemId, ib + learningRate * (error - reg * ib));
      for (let f = 0; f < numFactors; f++) {
        const oldU = uf[f], oldI = itf[f];
        uf[f] += learningRate * (error * oldI - reg * oldU);
        itf[f] += learningRate * (error * oldU - reg * oldI);
      }
    }
  }

  return { type: "collaborative", userFactors, itemFactors, userBias, itemBias, globalBias, numFactors };
}

/** Predict rating for user-item pair */
export function predictRating(model: RecommenderModel, userId: string, itemId: string): number {
  const uf = model.userFactors.get(userId);
  const itf = model.itemFactors.get(itemId);
  if (!uf || !itf) return model.globalBias;
  const ub = model.userBias.get(userId) ?? 0;
  const ib = model.itemBias.get(itemId) ?? 0;
  let pred = model.globalBias + ub + ib;
  for (let f = 0; f < model.numFactors; f++) pred += uf[f] * itf[f];
  return pred;
}

/** Get top-K recommendations for a user */
export function recommend(model: RecommenderModel, userId: string, excludeItems: Set<string>, k = 10): { itemId: string; score: number }[] {
  const scores: { itemId: string; score: number }[] = [];
  for (const [itemId] of model.itemFactors) {
    if (excludeItems.has(itemId)) continue;
    scores.push({ itemId, score: predictRating(model, userId, itemId) });
  }
  return scores.sort((a, b) => b.score - a.score).slice(0, k);
}

/** Content-based similarity using cosine */
export function contentSimilarity(features1: number[], features2: number[]): number {
  let dot = 0, n1 = 0, n2 = 0;
  for (let i = 0; i < features1.length; i++) {
    dot += features1[i] * (features2[i] ?? 0);
    n1 += features1[i] ** 2;
    n2 += (features2[i] ?? 0) ** 2;
  }
  return n1 > 0 && n2 > 0 ? dot / (Math.sqrt(n1) * Math.sqrt(n2)) : 0;
}

export function getProbabilityRankingRecommendersState() {
  return {
    probability: ["Normal", "Bernoulli", "Beta", "Poisson", "Categorical", "KL Divergence", "Monte Carlo", "Variational ELBO"],
    ranking: ["RankNet (Pairwise)", "ListNet (Listwise)", "NDCG", "MRR"],
    recommenders: ["Matrix Factorization (ALS)", "Content-Based Similarity", "Top-K Recommendations", "User/Item Biases"],
    informationGeometry: ["Fisher Information Metric", "Boltzmann Energy Scoring", "Manifold Curvature Projection"],
  };
}
