/**
 * ─── TensorFlow GNN + Neural Structured Learning (Browser-Adapted) ───
 * Graph Neural Networks for node/edge/graph tasks and
 * Neural Structured Learning for graph-regularized training.
 * 
 * Ref: TensorFlow GNN (Google, Apache 2.0)
 *      Neural Structured Learning (Bui et al., 2018)
 *      Kipf & Welling (2017) — Semi-supervised GCN
 *      Hamilton et al. (2017) — GraphSAGE
 *      Veličković et al. (2018) — Graph Attention Networks
 */

// ═══ TYPES ═══

export interface GraphNode {
  id: string;
  features: number[];
  label?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  features?: number[];
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed: boolean;
}

export interface GNNConfig {
  type: "gcn" | "graphsage" | "gat";
  hiddenDim: number;
  numLayers: number;
  dropout: number;
  aggregation: "mean" | "sum" | "max";
  numHeads?: number; // GAT only
}

export interface GNNModel {
  config: GNNConfig;
  weights: number[][][]; // layer -> row -> col
  biases: number[][];
  attentionWeights?: number[][][]; // GAT
  trainedAt: string;
}

export interface GNNPrediction {
  nodeId: string;
  embedding: number[];
  prediction: number;
  confidence: number;
  neighborInfluence: { nodeId: string; weight: number }[];
}

export interface NSLConfig {
  graphRegWeight: number;      // lambda for graph regularization
  adversarialRegWeight: number; // for adversarial regularization
  adversarialEpsilon: number;
  numNeighbors: number;
}

// ═══ GRAPH UTILITIES ═══

function getAdjacencyMap(graph: Graph): Map<string, { neighbor: string; weight: number }[]> {
  const adj = new Map<string, { neighbor: string; weight: number }[]>();
  for (const node of graph.nodes) adj.set(node.id, []);
  for (const edge of graph.edges) {
    adj.get(edge.source)?.push({ neighbor: edge.target, weight: edge.weight });
    if (!graph.directed) adj.get(edge.target)?.push({ neighbor: edge.source, weight: edge.weight });
  }
  return adj;
}

function nodeMap(graph: Graph): Map<string, GraphNode> {
  const m = new Map<string, GraphNode>();
  for (const n of graph.nodes) m.set(n.id, n);
  return m;
}

function relu(x: number): number { return Math.max(0, x); }

function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map(v => Math.exp(v - max));
  const sum = exps.reduce((s, e) => s + e, 0);
  return exps.map(e => e / sum);
}

function matVecMul(mat: number[][], vec: number[]): number[] {
  return mat.map(row => row.reduce((s, w, j) => s + w * (vec[j] ?? 0), 0));
}

function randomMatrix(rows: number, cols: number, scale = 0.1): number[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale)
  );
}

// ═══ GCN — Graph Convolutional Network ═══

function gcnLayer(
  nodeFeatures: Map<string, number[]>,
  adj: Map<string, { neighbor: string; weight: number }[]>,
  weights: number[][],
  bias: number[],
  applyRelu = true
): Map<string, number[]> {
  const result = new Map<string, number[]>();
  for (const [nodeId, neighbors] of adj) {
    const selfFeats = nodeFeatures.get(nodeId) ?? [];
    const degree = neighbors.length + 1;
    // Aggregate: self + neighbors (normalized by degree)
    const agg = [...selfFeats].map(v => v / degree);
    for (const { neighbor, weight } of neighbors) {
      const nFeats = nodeFeatures.get(neighbor) ?? [];
      const nDegree = (adj.get(neighbor)?.length ?? 0) + 1;
      const normFactor = 1 / Math.sqrt(degree * nDegree);
      for (let i = 0; i < agg.length; i++) agg[i] += (nFeats[i] ?? 0) * weight * normFactor;
    }
    // Transform: W * agg + b
    const transformed = matVecMul(weights, agg).map((v, i) => v + (bias[i] ?? 0));
    result.set(nodeId, applyRelu ? transformed.map(relu) : transformed);
  }
  return result;
}

// ═══ GraphSAGE ═══

function graphSAGELayer(
  nodeFeatures: Map<string, number[]>,
  adj: Map<string, { neighbor: string; weight: number }[]>,
  weights: number[][],
  bias: number[],
  aggregation: "mean" | "sum" | "max",
  numSample = 10
): Map<string, number[]> {
  const result = new Map<string, number[]>();
  for (const [nodeId, neighbors] of adj) {
    const selfFeats = nodeFeatures.get(nodeId) ?? [];
    const sampled = neighbors.length <= numSample ? neighbors : neighbors.slice(0, numSample);

    // Aggregate neighbors
    const featDim = selfFeats.length;
    const aggFeats = new Array(featDim).fill(0);
    if (sampled.length > 0) {
      if (aggregation === "max") {
        aggFeats.fill(-Infinity);
        for (const { neighbor } of sampled) {
          const nf = nodeFeatures.get(neighbor) ?? [];
          for (let i = 0; i < featDim; i++) aggFeats[i] = Math.max(aggFeats[i], nf[i] ?? 0);
        }
        aggFeats.forEach((v, i) => { if (v === -Infinity) aggFeats[i] = 0; });
      } else {
        for (const { neighbor } of sampled) {
          const nf = nodeFeatures.get(neighbor) ?? [];
          for (let i = 0; i < featDim; i++) aggFeats[i] += nf[i] ?? 0;
        }
        if (aggregation === "mean") {
          for (let i = 0; i < featDim; i++) aggFeats[i] /= sampled.length;
        }
      }
    }

    // Concat self + agg
    const concat = [...selfFeats, ...aggFeats];
    const transformed = matVecMul(weights, concat).map((v, i) => relu(v + (bias[i] ?? 0)));

    // L2 normalize
    const norm = Math.sqrt(transformed.reduce((s, v) => s + v * v, 0)) || 1;
    result.set(nodeId, transformed.map(v => v / norm));
  }
  return result;
}

// ═══ GAT — Graph Attention Network ═══

function gatLayer(
  nodeFeatures: Map<string, number[]>,
  adj: Map<string, { neighbor: string; weight: number }[]>,
  weights: number[][],
  attentionW: number[][],
  bias: number[],
  numHeads = 4
): Map<string, number[]> {
  const result = new Map<string, number[]>();
  const headDim = Math.floor((weights[0]?.length ?? 1) / numHeads);

  for (const [nodeId, neighbors] of adj) {
    const selfFeats = nodeFeatures.get(nodeId) ?? [];
    const selfTransformed = matVecMul(weights, selfFeats);

    const allNeighbors = [{ neighbor: nodeId, weight: 1 }, ...neighbors];
    const attentionScores: number[] = [];

    for (const { neighbor } of allNeighbors) {
      const nFeats = nodeFeatures.get(neighbor) ?? [];
      const nTransformed = matVecMul(weights, nFeats);
      // LeakyReLU(a^T [Wh_i || Wh_j])
      const concat = [...selfTransformed, ...nTransformed];
      const score = matVecMul(attentionW, concat).reduce((s, v) => s + v, 0);
      attentionScores.push(score > 0 ? score : 0.01 * score); // LeakyReLU
    }

    const attnProbs = softmax(attentionScores);
    const outDim = selfTransformed.length;
    const aggregated = new Array(outDim).fill(0);

    for (let i = 0; i < allNeighbors.length; i++) {
      const nFeats = nodeFeatures.get(allNeighbors[i].neighbor) ?? [];
      const nTransformed = matVecMul(weights, nFeats);
      for (let d = 0; d < outDim; d++) aggregated[d] += attnProbs[i] * nTransformed[d];
    }

    result.set(nodeId, aggregated.map((v, i) => relu(v + (bias[i] ?? 0))));
  }
  return result;
}

// ═══ GNN MODEL API ═══

export function initializeGNN(config: Partial<GNNConfig>, inputDim: number): GNNModel {
  const cfg: GNNConfig = {
    type: config.type ?? "gcn",
    hiddenDim: config.hiddenDim ?? 64,
    numLayers: config.numLayers ?? 2,
    dropout: config.dropout ?? 0.5,
    aggregation: config.aggregation ?? "mean",
    numHeads: config.numHeads ?? 4,
  };

  const weights: number[][][] = [];
  const biases: number[][] = [];
  const attentionWeights: number[][][] = [];

  let prevDim = inputDim;
  for (let l = 0; l < cfg.numLayers; l++) {
    const outDim = cfg.hiddenDim;
    const wRows = outDim;
    const wCols = cfg.type === "graphsage" ? prevDim * 2 : prevDim;
    weights.push(randomMatrix(wRows, wCols));
    biases.push(new Array(outDim).fill(0));
    if (cfg.type === "gat") {
      attentionWeights.push(randomMatrix(1, outDim * 2, 0.01));
    }
    prevDim = outDim;
  }

  return { config: cfg, weights, biases, attentionWeights, trainedAt: new Date().toISOString() };
}

export function forwardGNN(model: GNNModel, graph: Graph): Map<string, number[]> {
  const adj = getAdjacencyMap(graph);
  let features = new Map<string, number[]>();
  for (const node of graph.nodes) features.set(node.id, [...node.features]);

  for (let l = 0; l < model.config.numLayers; l++) {
    const isLast = l === model.config.numLayers - 1;
    switch (model.config.type) {
      case "gcn":
        features = gcnLayer(features, adj, model.weights[l], model.biases[l], !isLast);
        break;
      case "graphsage":
        features = graphSAGELayer(features, adj, model.weights[l], model.biases[l], model.config.aggregation);
        break;
      case "gat":
        features = gatLayer(features, adj, model.weights[l], model.attentionWeights?.[l] ?? [[]], model.biases[l], model.config.numHeads);
        break;
    }
  }
  return features;
}

export function predictNodes(model: GNNModel, graph: Graph): GNNPrediction[] {
  const embeddings = forwardGNN(model, graph);
  const adj = getAdjacencyMap(graph);
  const predictions: GNNPrediction[] = [];

  for (const node of graph.nodes) {
    const emb = embeddings.get(node.id) ?? [];
    const scores = softmax(emb.slice(0, Math.min(emb.length, 10)));
    const prediction = scores.indexOf(Math.max(...scores));
    const confidence = Math.max(...scores);
    const neighbors = adj.get(node.id)?.map(n => ({ nodeId: n.neighbor, weight: n.weight })) ?? [];

    predictions.push({ nodeId: node.id, embedding: emb, prediction, confidence, neighborInfluence: neighbors.slice(0, 5) });
  }
  return predictions;
}

// ═══ NEURAL STRUCTURED LEARNING ═══

/** Graph regularization loss — encourages similar predictions for connected nodes */
export function graphRegularizationLoss(
  embeddings: Map<string, number[]>,
  edges: GraphEdge[],
  weight = 0.1
): number {
  let loss = 0;
  for (const edge of edges) {
    const e1 = embeddings.get(edge.source);
    const e2 = embeddings.get(edge.target);
    if (!e1 || !e2) continue;
    let dist = 0;
    for (let i = 0; i < e1.length; i++) dist += (e1[i] - (e2[i] ?? 0)) ** 2;
    loss += edge.weight * dist;
  }
  return weight * loss / (edges.length || 1);
}

/** Adversarial regularization: generates perturbations for robust training */
export function adversarialPerturbation(
  features: number[],
  gradient: number[],
  epsilon = 0.01
): number[] {
  const gradNorm = Math.sqrt(gradient.reduce((s, g) => s + g * g, 0)) || 1;
  return features.map((f, i) => f + epsilon * (gradient[i] ?? 0) / gradNorm);
}

/** Build kNN graph from feature vectors for NSL */
export function buildKNNGraph(
  nodes: GraphNode[],
  k = 5,
  metric: "euclidean" | "cosine" = "euclidean"
): Graph {
  const edges: GraphEdge[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const distances: { idx: number; dist: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      let dist: number;
      if (metric === "cosine") {
        let dot = 0, n1 = 0, n2 = 0;
        for (let d = 0; d < nodes[i].features.length; d++) {
          dot += nodes[i].features[d] * nodes[j].features[d];
          n1 += nodes[i].features[d] ** 2;
          n2 += nodes[j].features[d] ** 2;
        }
        dist = 1 - dot / (Math.sqrt(n1) * Math.sqrt(n2) || 1);
      } else {
        dist = 0;
        for (let d = 0; d < nodes[i].features.length; d++) {
          dist += (nodes[i].features[d] - nodes[j].features[d]) ** 2;
        }
        dist = Math.sqrt(dist);
      }
      distances.push({ idx: j, dist });
    }
    distances.sort((a, b) => a.dist - b.dist);
    for (let n = 0; n < Math.min(k, distances.length); n++) {
      edges.push({
        source: nodes[i].id,
        target: nodes[distances[n].idx].id,
        weight: 1 / (1 + distances[n].dist),
      });
    }
  }

  return { nodes, edges, directed: false };
}

export function getGNNState() {
  return {
    architectures: ["GCN (Kipf & Welling 2017)", "GraphSAGE (Hamilton 2017)", "GAT (Veličković 2018)"],
    nslMethods: ["Graph Regularization", "Adversarial Regularization", "kNN Graph Builder"],
    aggregations: ["mean", "sum", "max"],
    features: ["Node classification", "Graph embedding", "Attention visualization", "Feature perturbation"],
  };
}
