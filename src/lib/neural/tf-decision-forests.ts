/**
 * ─── TensorFlow Decision Forests (Browser-Adapted) ───
 * Random Forest, Gradient Boosted Decision Trees (GBDT), and
 * interpretability tools for classification and regression.
 * 
 * Ref: TensorFlow Decision Forests (Google, Apache 2.0)
 *      Breiman (2001) — Random Forests
 *      Friedman (2001) — Greedy Function Approximation (GBDT)
 */

// ═══ TYPES ═══

export interface DecisionNode {
  featureIndex: number;
  threshold: number;
  left: DecisionNode | DecisionLeaf;
  right: DecisionNode | DecisionLeaf;
  importance: number;
}

export interface DecisionLeaf {
  value: number;      // class label or regression value
  probability: number; // confidence
  samples: number;
}

export interface DecisionTree {
  root: DecisionNode | DecisionLeaf;
  depth: number;
  numLeaves: number;
}

export interface ForestConfig {
  numTrees: number;
  maxDepth: number;
  minSamplesLeaf: number;
  maxFeatures: "sqrt" | "log2" | "all" | number;
  subsampleRatio: number;
}

export interface ForestModel {
  trees: DecisionTree[];
  config: ForestConfig;
  featureImportances: number[];
  oobScore: number;
  trainedAt: string;
}

export interface GBDTConfig extends ForestConfig {
  learningRate: number;
  l2Regularization: number;
}

export interface GBDTModel {
  trees: DecisionTree[];
  config: GBDTConfig;
  baseValue: number;
  featureImportances: number[];
  trainedAt: string;
}

export interface TreeExplanation {
  featureContributions: { feature: number; contribution: number }[];
  prediction: number;
  leafPath: number[];
}

// ═══ HELPERS ═══

function isLeaf(node: DecisionNode | DecisionLeaf): node is DecisionLeaf {
  return "value" in node && !("featureIndex" in node);
}

function giniImpurity(labels: number[]): number {
  if (labels.length === 0) return 0;
  const counts = new Map<number, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  let impurity = 1;
  for (const c of counts.values()) {
    const p = c / labels.length;
    impurity -= p * p;
  }
  return impurity;
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

function majorityClass(labels: number[]): { value: number; probability: number } {
  const counts = new Map<number, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  let bestVal = 0, bestCount = 0;
  for (const [val, count] of counts) {
    if (count > bestCount) { bestVal = val; bestCount = count; }
  }
  return { value: bestVal, probability: bestCount / labels.length };
}

function getMaxFeatures(total: number, mode: ForestConfig["maxFeatures"]): number {
  if (mode === "sqrt") return Math.max(1, Math.floor(Math.sqrt(total)));
  if (mode === "log2") return Math.max(1, Math.floor(Math.log2(total)));
  if (mode === "all") return total;
  return Math.min(total, mode);
}

function subsample<T>(data: T[], ratio: number): T[] {
  const n = Math.floor(data.length * ratio);
  const result: T[] = [];
  for (let i = 0; i < n; i++) result.push(data[Math.floor(Math.random() * data.length)]);
  return result;
}

function selectFeatures(total: number, max: number): number[] {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, max);
}

// ═══ TREE BUILDING ═══

function buildTree(
  data: number[][],
  labels: number[],
  depth: number,
  maxDepth: number,
  minSamplesLeaf: number,
  featureSubset: number[],
  isRegression: boolean
): DecisionNode | DecisionLeaf {
  if (depth >= maxDepth || labels.length <= minSamplesLeaf) {
    if (isRegression) {
      const mean = labels.reduce((s, v) => s + v, 0) / labels.length;
      return { value: mean, probability: 1, samples: labels.length };
    }
    const mc = majorityClass(labels);
    return { value: mc.value, probability: mc.probability, samples: labels.length };
  }

  const allSame = labels.every(l => l === labels[0]);
  if (allSame) return { value: labels[0], probability: 1, samples: labels.length };

  let bestFeature = -1, bestThreshold = 0, bestGain = -Infinity;

  for (const f of featureSubset) {
    const values = [...new Set(data.map(row => row[f]))].sort((a, b) => a - b);
    for (let t = 0; t < values.length - 1; t++) {
      const threshold = (values[t] + values[t + 1]) / 2;
      const leftIdx: number[] = [], rightIdx: number[] = [];
      for (let i = 0; i < data.length; i++) {
        if (data[i][f] <= threshold) leftIdx.push(i);
        else rightIdx.push(i);
      }
      if (leftIdx.length < minSamplesLeaf || rightIdx.length < minSamplesLeaf) continue;

      const leftLabels = leftIdx.map(i => labels[i]);
      const rightLabels = rightIdx.map(i => labels[i]);
      const criterion = isRegression ? variance : (l: number[]) => giniImpurity(l);
      const parentScore = criterion(labels);
      const gain = parentScore
        - (leftLabels.length / labels.length) * criterion(leftLabels)
        - (rightLabels.length / labels.length) * criterion(rightLabels);

      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = f;
        bestThreshold = threshold;
      }
    }
  }

  if (bestFeature === -1) {
    if (isRegression) {
      const mean = labels.reduce((s, v) => s + v, 0) / labels.length;
      return { value: mean, probability: 1, samples: labels.length };
    }
    const mc = majorityClass(labels);
    return { value: mc.value, probability: mc.probability, samples: labels.length };
  }

  const leftData: number[][] = [], leftLabels: number[] = [];
  const rightData: number[][] = [], rightLabels: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i][bestFeature] <= bestThreshold) {
      leftData.push(data[i]); leftLabels.push(labels[i]);
    } else {
      rightData.push(data[i]); rightLabels.push(labels[i]);
    }
  }

  return {
    featureIndex: bestFeature,
    threshold: bestThreshold,
    importance: bestGain,
    left: buildTree(leftData, leftLabels, depth + 1, maxDepth, minSamplesLeaf, featureSubset, isRegression),
    right: buildTree(rightData, rightLabels, depth + 1, maxDepth, minSamplesLeaf, featureSubset, isRegression),
  };
}

function predictSingle(node: DecisionNode | DecisionLeaf, sample: number[]): number {
  if (isLeaf(node)) return node.value;
  return sample[node.featureIndex] <= node.threshold
    ? predictSingle(node.left, sample)
    : predictSingle(node.right, sample);
}

function treeDepth(node: DecisionNode | DecisionLeaf): number {
  if (isLeaf(node)) return 0;
  return 1 + Math.max(treeDepth(node.left), treeDepth(node.right));
}

function countLeaves(node: DecisionNode | DecisionLeaf): number {
  if (isLeaf(node)) return 1;
  return countLeaves(node.left) + countLeaves(node.right);
}

// ═══ RANDOM FOREST ═══

export function trainRandomForest(
  data: number[][],
  labels: number[],
  config: Partial<ForestConfig> = {},
  isRegression = false
): ForestModel {
  const cfg: ForestConfig = {
    numTrees: config.numTrees ?? 10,
    maxDepth: config.maxDepth ?? 8,
    minSamplesLeaf: config.minSamplesLeaf ?? 2,
    maxFeatures: config.maxFeatures ?? "sqrt",
    subsampleRatio: config.subsampleRatio ?? 1.0,
  };

  const numFeatures = data[0]?.length ?? 0;
  const maxF = getMaxFeatures(numFeatures, cfg.maxFeatures);
  const featureImportances = new Array(numFeatures).fill(0);
  const trees: DecisionTree[] = [];

  for (let t = 0; t < cfg.numTrees; t++) {
    const indices = subsample(Array.from({ length: data.length }, (_, i) => i), cfg.subsampleRatio);
    const subData = indices.map(i => data[i]);
    const subLabels = indices.map(i => labels[i]);
    const features = selectFeatures(numFeatures, maxF);

    const root = buildTree(subData, subLabels, 0, cfg.maxDepth, cfg.minSamplesLeaf, features, isRegression);
    trees.push({ root, depth: treeDepth(root), numLeaves: countLeaves(root) });

    // Accumulate feature importances
    const accumulateImportance = (node: DecisionNode | DecisionLeaf) => {
      if (!isLeaf(node)) {
        featureImportances[node.featureIndex] += node.importance;
        accumulateImportance(node.left);
        accumulateImportance(node.right);
      }
    };
    accumulateImportance(root);
  }

  // Normalize importances
  const totalImp = featureImportances.reduce((s, v) => s + v, 0) || 1;
  const normalizedImp = featureImportances.map(v => v / totalImp);

  // OOB score (simplified)
  let oobCorrect = 0, oobTotal = 0;
  for (let i = 0; i < Math.min(data.length, 100); i++) {
    const preds = trees.map(tree => predictSingle(tree.root, data[i]));
    const pred = isRegression
      ? preds.reduce((s, v) => s + v, 0) / preds.length
      : majorityClass(preds).value;
    if (isRegression) {
      oobCorrect += 1 - Math.abs(pred - labels[i]) / (Math.abs(labels[i]) || 1);
    } else {
      if (pred === labels[i]) oobCorrect++;
    }
    oobTotal++;
  }

  return {
    trees,
    config: cfg,
    featureImportances: normalizedImp,
    oobScore: oobTotal > 0 ? oobCorrect / oobTotal : 0,
    trainedAt: new Date().toISOString(),
  };
}

export function predictRandomForest(model: ForestModel, sample: number[], isRegression = false): number {
  const preds = model.trees.map(t => predictSingle(t.root, sample));
  if (isRegression) return preds.reduce((s, v) => s + v, 0) / preds.length;
  return majorityClass(preds).value;
}

// ═══ GRADIENT BOOSTED DECISION TREES ═══

export function trainGBDT(
  data: number[][],
  labels: number[],
  config: Partial<GBDTConfig> = {}
): GBDTModel {
  const cfg: GBDTConfig = {
    numTrees: config.numTrees ?? 20,
    maxDepth: config.maxDepth ?? 4,
    minSamplesLeaf: config.minSamplesLeaf ?? 5,
    maxFeatures: config.maxFeatures ?? "all",
    subsampleRatio: config.subsampleRatio ?? 0.8,
    learningRate: config.learningRate ?? 0.1,
    l2Regularization: config.l2Regularization ?? 0.01,
  };

  const numFeatures = data[0]?.length ?? 0;
  const maxF = getMaxFeatures(numFeatures, cfg.maxFeatures);
  const baseValue = labels.reduce((s, v) => s + v, 0) / labels.length;
  let residuals = labels.map(l => l - baseValue);
  const trees: DecisionTree[] = [];
  const featureImportances = new Array(numFeatures).fill(0);

  for (let t = 0; t < cfg.numTrees; t++) {
    const indices = subsample(Array.from({ length: data.length }, (_, i) => i), cfg.subsampleRatio);
    const subData = indices.map(i => data[i]);
    const subResiduals = indices.map(i => residuals[i]);
    const features = selectFeatures(numFeatures, maxF);

    const root = buildTree(subData, subResiduals, 0, cfg.maxDepth, cfg.minSamplesLeaf, features, true);
    trees.push({ root, depth: treeDepth(root), numLeaves: countLeaves(root) });

    // Update residuals with learning rate
    for (let i = 0; i < data.length; i++) {
      const pred = predictSingle(root, data[i]);
      residuals[i] -= cfg.learningRate * pred;
    }

    const accumulateImportance = (node: DecisionNode | DecisionLeaf) => {
      if (!isLeaf(node)) {
        featureImportances[node.featureIndex] += node.importance;
        accumulateImportance(node.left);
        accumulateImportance(node.right);
      }
    };
    accumulateImportance(root);
  }

  const totalImp = featureImportances.reduce((s, v) => s + v, 0) || 1;

  return {
    trees,
    config: cfg,
    baseValue,
    featureImportances: featureImportances.map(v => v / totalImp),
    trainedAt: new Date().toISOString(),
  };
}

export function predictGBDT(model: GBDTModel, sample: number[]): number {
  let pred = model.baseValue;
  for (const tree of model.trees) {
    pred += model.config.learningRate * predictSingle(tree.root, sample);
  }
  return pred;
}

// ═══ INTERPRETABILITY ═══

export function explainPrediction(node: DecisionNode | DecisionLeaf, sample: number[]): TreeExplanation {
  const contributions: { feature: number; contribution: number }[] = [];
  const path: number[] = [];
  let current = node;
  let baseValue = 0;

  while (!isLeaf(current)) {
    const n = current as DecisionNode;
    path.push(n.featureIndex);
    const goLeft = sample[n.featureIndex] <= n.threshold;
    contributions.push({ feature: n.featureIndex, contribution: n.importance * (goLeft ? 1 : -1) });
    current = goLeft ? n.left : n.right;
  }

  return {
    featureContributions: contributions,
    prediction: (current as DecisionLeaf).value,
    leafPath: path,
  };
}

export function getDecisionForestsState() {
  return {
    models: ["RandomForest", "GradientBoostedDecisionTrees"],
    features: ["Gini Impurity", "Variance Reduction", "Feature Importance", "OOB Score"],
    interpretability: ["Leaf Path", "Feature Contributions", "Split Explanations"],
    maxDepth: 8,
    maxTrees: 100,
  };
}
