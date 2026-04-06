import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// NEURAL SEARCH v19 — Rauber UFES: Redes Neurais Artificiais
// v19 Rauber: Competitive Learning (Winner-Takes-All, Seção V),
//             Hopfield Network (Associative Memory, Seção IV),
//             Energy Function (Eq. 22), Hebb Generalized (Eq. 21)
// Arquitetura QNN concebida por Ericson Piccoli (linkedin.com/in/elpgreen)
// v18 Attention: Sinusoidal Positional Encoding, Attention Dropout,
//                Pre-Norm LayerNorm, Learned W^Q/W^K/W^V Projections
// v17 iDanae: GNN Message Passing, Cross-Result Self-Attention Q/K/V,
//             SHAP Interpretability, Adversarial Detection, Privacy Sanitization
// v16 DL: BatchNorm, Residual Connections, Xavier Init, GRU, Cosine Annealing, Mini-Batch
// v15 Neuro: Synaptic Pruning (Morais 2020), Emotional Modulation (Aguilar 2021)
// v14 Neuro: Weber-Fechner, Edelman, Parallel→Serial, Memory Consolidation
// v13 RL: TD Error, Eligibility Traces, Q-Learning
// v12 DBN: Kalman Filter, EM Algorithm, HMM Session Tracker
// v11 Base: Adam Optimizer, Multi-Layer QNN, Amplitude Encoding
// ═══════════════════════════════════════════════════════════════

const EMBEDDING_MODEL = "text-embedding-004"; // Gemini (free, native 768d)
const EMBEDDING_DIMS = 768;

// ═══ v17 iDanae Lacuna 5: Adversarial Query Detection ═══
// Filters malicious queries (injection, random text, high entropy)
function detectAdversarialQuery(query: string): { isAdversarial: boolean; reason?: string } {
  if (!query || query.length < 3) return { isAdversarial: true, reason: "Query muito curta (min 3 caracteres)" };
  if (query.length > 4000) return { isAdversarial: true, reason: "Query excede limite de 4000 caracteres" };
  // SQL/JSON injection patterns
  if (/(\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bALTER\b|\bEXEC\b|\bunion\s+select\b)/i.test(query)) {
    return { isAdversarial: true, reason: "Padrão de SQL injection detectado" };
  }
  if (/^\s*[\{\[\(]/.test(query) && /[\}\]\)]\s*$/.test(query)) {
    return { isAdversarial: true, reason: "Padrão de JSON/code injection detectado" };
  }
  // High entropy check (random characters)
  const uniqueChars = new Set(query.replace(/\s/g, "").split(""));
  const charRatio = uniqueChars.size / Math.max(query.replace(/\s/g, "").length, 1);
  if (charRatio > 0.85 && query.length > 20) {
    return { isAdversarial: true, reason: "Entropia de caracteres muito alta (texto aleatório)" };
  }
  // Excessive special characters
  const specialCount = (query.match(/[^a-zA-ZÀ-ÿ0-9\s.,;:!?()/-]/g) || []).length;
  if (specialCount > query.length * 0.4) {
    return { isAdversarial: true, reason: "Excesso de caracteres especiais" };
  }
  return { isAdversarial: false };
}

// ═══ v17 iDanae Lacuna 6: Privacy Sanitization (Federated Privacy Score) ═══
// Detects and masks PII (CPF, email, phone, addresses) in results
function sanitizePrivateData(text: string): { sanitized: string; piiFound: number } {
  let piiFound = 0;
  let sanitized = text;
  // CPF: 000.000.000-00
  const cpfPattern = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;
  const cpfMatches = sanitized.match(cpfPattern);
  if (cpfMatches) { piiFound += cpfMatches.length; sanitized = sanitized.replace(cpfPattern, "***.***.***-**"); }
  // CNPJ: 00.000.000/0000-00
  const cnpjPattern = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g;
  const cnpjMatches = sanitized.match(cnpjPattern);
  if (cnpjMatches) { piiFound += cnpjMatches.length; sanitized = sanitized.replace(cnpjPattern, "**.***.****/****-**"); }
  // Email
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = sanitized.match(emailPattern);
  if (emailMatches) { piiFound += emailMatches.length; sanitized = sanitized.replace(emailPattern, "[email protegido]"); }
  // Phone: (00) 00000-0000 or (00) 0000-0000
  const phonePattern = /\(\d{2}\)\s*\d{4,5}-\d{4}/g;
  const phoneMatches = sanitized.match(phonePattern);
  if (phoneMatches) { piiFound += phoneMatches.length; sanitized = sanitized.replace(phonePattern, "(XX) XXXXX-XXXX"); }
  return { sanitized, piiFound };
}

// ═══ v17 iDanae Lacuna 1: Graph Neural Network — Message Passing ═══
// Propagates scores between results that share legislation, tribunal, or citations
function gnnMessagePassing(results: any[], iterations: number = 2): any[] {
  if (results.length <= 1) return results;
  
  // Build adjacency based on shared metadata (tribunal, legislation, citations)
  const adjacency: number[][] = Array.from({ length: results.length }, () => []);
  
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      let connected = false;
      // Same source/tribunal
      if (results[i].source && results[i].source === results[j].source) connected = true;
      // Same quantum category
      if (results[i].quantum_category && results[i].quantum_category === results[j].quantum_category) connected = true;
      // Shared legislation citations in content
      const contentI = (results[i].content || "").substring(0, 2000);
      const contentJ = (results[j].content || "").substring(0, 2000);
      const lawsI = new Set((contentI.match(/(?:Art\.\s*\d+|Lei\s*n[°º]\s*[\d.]+|Súmula\s+\d+)/gi) || []).map((s: string) => s.toLowerCase()));
      const lawsJ = new Set((contentJ.match(/(?:Art\.\s*\d+|Lei\s*n[°º]\s*[\d.]+|Súmula\s+\d+)/gi) || []).map((s: string) => s.toLowerCase()));
      for (const law of lawsI) {
        if (lawsJ.has(law)) { connected = true; break; }
      }
      if (connected) {
        adjacency[i].push(j);
        adjacency[j].push(i);
      }
    }
  }
  
  // Message passing iterations
  let nodeScores = results.map(r => r.multi_head_score || r.combined_score || 0);
  for (let iter = 0; iter < iterations; iter++) {
    const newScores = [...nodeScores];
    for (let i = 0; i < results.length; i++) {
      const neighbors = adjacency[i];
      if (neighbors.length > 0) {
        const avgNeighbor = neighbors.reduce((s, j) => s + nodeScores[j], 0) / neighbors.length;
        newScores[i] = 0.7 * nodeScores[i] + 0.3 * avgNeighbor;
      }
    }
    nodeScores = newScores;
  }
  
  const totalEdges = adjacency.reduce((s, a) => s + a.length, 0) / 2;
  console.log(`🔗 v17 GNN: ${iterations} iterations, ${totalEdges} edges, ${results.length} nodes`);
  
  return results.map((r, i) => ({ ...r, gnn_score: nodeScores[i], multi_head_score: nodeScores[i] }));
}

// ═══ v18 Lacuna 1: Sinusoidal Positional Encoding (Vaswani et al. 2017) ═══
// PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
// PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
// Encodes temporal/positional information into result representations
function sinusoidalPositionalEncoding(position: number, dim: number): number[] {
  const pe: number[] = new Array(dim);
  for (let i = 0; i < dim; i++) {
    const angle = position / Math.pow(10000, (2 * Math.floor(i / 2)) / dim);
    pe[i] = i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  }
  return pe;
}

// Apply positional encoding to result vectors based on temporal order
function applyPositionalEncoding(vectors: number[][], results: any[]): number[][] {
  // Sort indices by recency (most recent = position 0)
  const dated = results.map((r, i) => ({
    idx: i,
    date: r.published_date ? new Date(r.published_date).getTime() : 0,
  }));
  dated.sort((a, b) => b.date - a.date);
  const positionMap = new Map<number, number>();
  dated.forEach((d, pos) => positionMap.set(d.idx, pos));

  return vectors.map((vec, i) => {
    const pos = positionMap.get(i) || i;
    const pe = sinusoidalPositionalEncoding(pos, vec.length);
    return vec.map((v, d) => v + pe[d] * 0.1); // scale PE to avoid dominating
  });
}

// ═══ v18 Lacuna 2: Attention Dropout (Srivastava et al. 2014) ═══
// Randomly zeros attention weights during scoring to improve generalization
function applyAttentionDropout(weights: number[], dropRate: number = 0.1): number[] {
  if (dropRate <= 0) return weights;
  const kept = weights.map(w => Math.random() > dropRate ? w : 0);
  const scale = 1 / (1 - dropRate);
  // Re-normalize after dropout
  const sum = kept.reduce((s, w) => s + w, 0);
  if (sum <= 0) return weights; // fallback if all dropped
  return kept.map(w => w * scale);
}

// ═══ v18 Lacuna 3: Pre-Norm LayerNorm (Xiong et al. 2020) ═══
// LayerNorm BEFORE attention (more stable training than post-norm)
// LN(x) = (x - μ) / √(σ² + ε) * γ + β
function layerNorm(values: number[], gamma: number = 1.0, beta: number = 0.0): number[] {
  if (values.length === 0) return values;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const epsilon = 1e-5;
  return values.map(v => gamma * (v - mean) / Math.sqrt(variance + epsilon) + beta);
}

// ═══ v18 Lacuna 4: Learned W^Q / W^K / W^V Projection Matrices ═══
// Instead of using raw head scores as Q/K/V, project through learned weight matrices
interface QKVProjections {
  Wq: number[][]; // [d_model x d_model]
  Wk: number[][]; // [d_model x d_model]
  Wv: number[][]; // [d_model x d_model]
}

function getDefaultQKVProjections(dim: number): QKVProjections {
  // Initialize with Xavier
  const makeMatrix = () => Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => i === j ? 1.0 : xavierInit(dim, dim) * 0.1)
  );
  return { Wq: makeMatrix(), Wk: makeMatrix(), Wv: makeMatrix() };
}

function matVecMul(matrix: number[][], vec: number[]): number[] {
  return matrix.map(row => {
    let sum = 0;
    for (let i = 0; i < Math.min(row.length, vec.length); i++) sum += row[i] * vec[i];
    return sum;
  });
}

// ═══ v17+v18 Combined: Cross-Result Self-Attention with Learned Projections ═══
// v17: Q/K/V from head scores
// v18: Sinusoidal PE, Attention Dropout, Pre-Norm LayerNorm, Learned W^Q/W^K/W^V
function crossResultAttention(results: any[], headNames: string[], qkvProj?: QKVProjections): any[] {
  if (results.length <= 1) return results;
  
  const dim = headNames.length;
  const dk = Math.sqrt(dim);
  const proj = qkvProj || getDefaultQKVProjections(dim);
  
  // Build raw vectors from head scores
  let vectors: number[][] = results.map(r => {
    const heads = r.attention_heads || {};
    return headNames.map(h => heads[h] || 0);
  });

  // v18 Lacuna 1: Add sinusoidal positional encoding
  vectors = applyPositionalEncoding(vectors, results);

  // v18 Lacuna 3: Pre-Norm LayerNorm (normalize BEFORE attention)
  vectors = vectors.map(v => layerNorm(v));

  // v18 Lacuna 4: Project through learned W^Q, W^K, W^V
  const Q = vectors.map(v => matVecMul(proj.Wq, v));
  const K = vectors.map(v => matVecMul(proj.Wk, v));
  const V = vectors.map(v => matVecMul(proj.Wv, v));
  
  // Compute attention scores between all pairs
  const attendedScores: number[] = [];
  for (let i = 0; i < results.length; i++) {
    const q = Q[i];
    const attentionLogits: number[] = [];
    for (let j = 0; j < results.length; j++) {
      const k = K[j];
      let dot = 0;
      for (let d = 0; d < q.length; d++) { dot += q[d] * k[d]; }
      attentionLogits.push(dot / dk);
    }
    // Softmax over attention logits
    const maxLogit = Math.max(...attentionLogits);
    const exps = attentionLogits.map(l => Math.exp(l - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    let weights = exps.map(e => e / sumExps);
    
    // v18 Lacuna 2: Attention Dropout
    weights = applyAttentionDropout(weights, 0.1);
    
    // Weighted sum of V vectors, then take mean as contextual score
    let contextualScore = 0;
    for (let j = 0; j < results.length; j++) {
      const vMean = V[j].reduce((s, val) => s + val, 0) / V[j].length;
      contextualScore += weights[j] * vMean;
    }
    // Also blend with original multi_head_score via V
    const origBlend = results[i].multi_head_score || 0;
    attendedScores.push(0.6 * origBlend + 0.4 * contextualScore);
  }
  
  console.log(`🎯 v18 Cross-Attention: ${results.length} results, dk=${dk.toFixed(2)}, PE+LN+QKV+Dropout`);
  
  // Blend: 70% original + 30% contextual
  return results.map((r, i) => ({
    ...r,
    cross_attention_score: attendedScores[i],
    multi_head_score: 0.7 * (r.multi_head_score || 0) + 0.3 * attendedScores[i],
  }));
}

// ═══ v17 iDanae Lacuna 3: SHAP Simplified Interpretability ═══
// Computes marginal contribution of each attention head to the final score
function computeSHAPExplanation(
  headScores: Record<string, number>,
  weights: AttentionWeights
): Record<string, { contribution: number; explanation: string }> {
  const shap: Record<string, { contribution: number; explanation: string }> = {};
  const baseline = weights.globalBias || 0.1;
  
  // Full score with all heads
  let fullScore = baseline;
  for (const head of weights.heads) {
    fullScore += head.weight * (headScores[head.name] || 0) + (head.bias || 0);
  }
  
  // Marginal contribution: score_with - score_without
  for (const head of weights.heads) {
    const headContrib = head.weight * (headScores[head.name] || 0) + (head.bias || 0);
    const scoreWithout = fullScore - headContrib;
    const contribution = fullScore - scoreWithout; // = headContrib
    const normalizedContrib = fullScore !== 0 ? contribution / Math.abs(fullScore) : 0;
    
    let explanation: string;
    if (normalizedContrib > 0.3) {
      explanation = `${head.description} — contribuição ALTA (+${(normalizedContrib * 100).toFixed(0)}%)`;
    } else if (normalizedContrib > 0.1) {
      explanation = `${head.description} — contribuição moderada (+${(normalizedContrib * 100).toFixed(0)}%)`;
    } else if (normalizedContrib > 0) {
      explanation = `${head.description} — contribuição baixa (+${(normalizedContrib * 100).toFixed(0)}%)`;
    } else {
      explanation = `${head.description} — sem contribuição significativa`;
    }
    
    shap[head.name] = { contribution: Math.round(normalizedContrib * 1000) / 1000, explanation };
  }
  
  return shap;
}

// ─── Lacuna 4: Activation Functions ───
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function relu(x: number): number {
  return Math.max(0, x);
}

function tanh_activation(x: number): number {
  return Math.tanh(x);
}

function softmax(values: number[]): number[] {
  const maxVal = Math.max(...values);
  const exps = values.map(v => Math.exp(v - maxVal));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sumExps);
}

// ═══ Deep Learning Cap. 7.5: Batch Normalization ═══
// Normaliza ativações entre camadas usando média e variância, com parâmetros aprendíveis gamma e beta
function batchNormalize(layerOutput: number[], gamma: number = 1.0, beta: number = 0.0): number[] {
  if (layerOutput.length === 0) return layerOutput;
  const mean = layerOutput.reduce((s, v) => s + v, 0) / layerOutput.length;
  const variance = layerOutput.reduce((s, v) => s + (v - mean) ** 2, 0) / layerOutput.length;
  const epsilon = 1e-5;
  return layerOutput.map(v => gamma * (v - mean) / Math.sqrt(variance + epsilon) + beta);
}

// ═══ Deep Learning Cap. 4.8.2: Xavier/He Initialization ═══
// Xavier: U(-sqrt(6/(fan_in+fan_out)), sqrt(6/(fan_in+fan_out))) para sigmoid/tanh
// He: N(0, sqrt(2/fan_in)) para ReLU
function xavierInit(fanIn: number, fanOut: number): number {
  const limit = Math.sqrt(6 / (fanIn + fanOut));
  return (Math.random() * 2 - 1) * limit;
}

function heInit(fanIn: number): number {
  const std = Math.sqrt(2 / fanIn);
  // Box-Muller para distribuição normal
  const u1 = Math.random() || 1e-10;
  const u2 = Math.random();
  return std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ═══ Deep Learning Cap. 9.1: GRU Cell (Gated Recurrent Unit) ═══
// Simplificada para session memory — substitui/complementa HMM
interface GRUWeights {
  Wz: number[];  // update gate weights
  Wr: number[];  // reset gate weights
  Wh: number[];  // candidate weights
  bz: number;    // update gate bias
  br: number;    // reset gate bias
  bh: number;    // candidate bias
}

function getDefaultGRUWeights(dim: number): GRUWeights {
  return {
    Wz: Array.from({ length: dim * 2 }, () => xavierInit(dim * 2, dim)),
    Wr: Array.from({ length: dim * 2 }, () => xavierInit(dim * 2, dim)),
    Wh: Array.from({ length: dim * 2 }, () => xavierInit(dim * 2, dim)),
    bz: 0, br: 0, bh: 0,
  };
}

function gruCell(
  ht_prev: number[],
  xt: number[],
  weights: GRUWeights
): number[] {
  const dim = ht_prev.length;
  const concat = [...xt, ...ht_prev];

  // Update gate: z_t = σ(W_z · [x_t, h_{t-1}] + b_z)
  let zSum = weights.bz;
  for (let i = 0; i < concat.length && i < weights.Wz.length; i++) {
    zSum += concat[i] * weights.Wz[i];
  }
  const zt = sigmoid(zSum);

  // Reset gate: r_t = σ(W_r · [x_t, h_{t-1}] + b_r)
  let rSum = weights.br;
  for (let i = 0; i < concat.length && i < weights.Wr.length; i++) {
    rSum += concat[i] * weights.Wr[i];
  }
  const rt = sigmoid(rSum);

  // Candidate: h̃_t = tanh(W_h · [x_t, r_t ⊙ h_{t-1}] + b_h)
  const resetH = ht_prev.map(h => rt * h);
  const concatReset = [...xt, ...resetH];
  let hSum = weights.bh;
  for (let i = 0; i < concatReset.length && i < weights.Wh.length; i++) {
    hSum += concatReset[i] * weights.Wh[i];
  }
  const ht_tilde = tanh_activation(hSum);

  // New hidden state: h_t = (1 - z_t) ⊙ h_{t-1} + z_t ⊙ h̃_t
  return ht_prev.map(h => (1 - zt) * h + zt * ht_tilde);
}

// ─── Multi-Head Attention Configuration (Lacuna 5: Bias added) ───
interface AttentionHead {
  name: string;
  weight: number;
  bias: number; // Lacuna 5: learnable bias per head
  description: string;
}

interface AttentionWeights {
  heads: AttentionHead[];
  version: string;
  globalBias: number; // Lacuna 5: global bias term
}

// ─── Lacuna 10: Amplitude Encoding (H gate + RY + RZ — Volkan Erol QNN) ───
// H * RY(θ) * RZ(θ/2) for true quantum superposition + dual rotation
function amplitudeEncode(value: number): number {
  const angle = value * Math.PI;
  const hadamard = 1 / Math.SQRT2; // H gate = 1/√2
  const ry = Math.cos(angle / 2);  // RY(θ) rotation
  const rz = Math.cos(angle / 4);  // RZ(θ/2) rotation
  return hadamard * ry * rz;       // H * RY(θ) * RZ(θ/2)
}

// ─── Lacuna 11: Multi-Class Cross-Entropy Loss ───
function multiClassCrossEntropy(predictions: number[], trueLabel: number): number {
  // L = -log P(true class) — from Volkan Erol's QNN article
  const p = Math.max(predictions[trueLabel] || 0.001, 1e-10);
  return -Math.log(p);
}

// ─── Lacuna 12: Von Neumann Entropy (quantum entanglement measure) ───
function vonNeumannEntropy(probabilities: number[]): number {
  // S(ρ) = -Σ p_i log₂(p_i) — measures quantum correlation strength
  let entropy = 0;
  for (const p of probabilities) {
    if (p > 1e-10) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

// ─── Lacuna 9: Multi-Layer QNN Architecture (adaptive depth, RX+RY+RZ per qubit) ───
// v16 Deep Learning: BatchNorm (Cap 7.5), Residual Connections (Cap 7.6), Xavier Init (Cap 4.8)
function multiLayerQNNScore(
  headScores: Record<string, number>,
  layerWeights: number[][],
  bnParams?: { gamma: number[]; beta: number[] }
): number {
  const headOrder = ["semantic", "keyword", "authority", "recency", "jurisdiction", "depth", "sumula_match"];
  
  // Layer 1: Amplitude encoding + first rotation
  let layerInput = headOrder.map(h => amplitudeEncode(headScores[h] || 0));
  
  // v11.2: Adaptive Depth — medir entropia da 1ª camada para decidir profundidade
  const inputSum = layerInput.reduce((s, v) => s + Math.abs(v), 0) || 1;
  const inputProbs = layerInput.map(v => Math.abs(v) / inputSum);
  const inputEntropy = vonNeumannEntropy(inputProbs);
  const maxEntropy = Math.log2(layerInput.length);
  const normalizedEntropy = maxEntropy > 0 ? inputEntropy / maxEntropy : 0;
  
  const activeLayers = normalizedEntropy > 0.7 ? layerWeights.length : 
                       normalizedEntropy < 0.4 ? Math.min(layerWeights.length, 2) : 
                       layerWeights.length;
  
  for (let layer = 0; layer < activeLayers; layer++) {
    const weights = layerWeights[layer];
    const layerOutput: number[] = [];
    
    // ═══ Cap. 7.6 ResNet: Save input for skip connection ═══
    const residualInput = [...layerInput];
    
    for (let i = 0; i < layerInput.length; i++) {
      // 3 parameters per qubit: RX(θ1) → RY(θ2) → RZ(θ3)
      const baseIdx = i * 3;
      const wRX = weights[baseIdx] || 1.0;
      const wRY = weights[baseIdx + 1] || 1.0;
      const wRZ = weights[baseIdx + 2] || 1.0;
      
      const thetaX = layerInput[i] * wRX * Math.PI;
      const thetaY = layerInput[i] * wRY * Math.PI;
      const thetaZ = layerInput[i] * wRZ * Math.PI;
      
      const rx = Math.cos(thetaX / 2);
      const ry = Math.cos(thetaY / 2);
      const rz = Math.cos(thetaZ / 2);
      const rotated = rx * ry * rz;
      
      const nextIdx = (i + 1) % layerInput.length;
      const entangled = rotated * layerInput[nextIdx];
      
      // v11.2: DropConnect quântico (5% chance)
      const dropConnect = Math.random() > 0.05 ? 1 : 0;
      layerOutput.push(sigmoid(entangled * 2 * dropConnect));
    }
    
    // ═══ Cap. 7.5: Batch Normalization between layers ═══
    const gamma = bnParams?.gamma?.[layer] ?? 1.0;
    const beta = bnParams?.beta?.[layer] ?? 0.0;
    const normalizedOutput = batchNormalize(layerOutput, gamma, beta);
    
    // ═══ Cap. 7.6: Residual Connection — H(x) = F(x) + x ═══
    // Prevents gradient degradation in deeper layers
    layerInput = normalizedOutput.map((v, i) => v + (residualInput[i] || 0));
  }
  
  // Softmax na camada final
  const finalSoftmax = softmax(layerInput);
  return finalSoftmax.reduce((sum, p, i) => sum + p * layerInput[i], 0);
}

function getDefaultAttentionWeights(): AttentionWeights {
  return {
    heads: [
      { name: "semantic", weight: 0.35, bias: 0, description: "Similaridade semântica via embeddings vetoriais" },
      { name: "keyword", weight: 0.15, bias: 0, description: "Correspondência textual por palavras-chave (BM25/tsvector)" },
      { name: "authority", weight: 0.15, bias: 0, description: "Peso da fonte (STF > STJ > TJ > doutrina)" },
      { name: "recency", weight: 0.10, bias: 0, description: "Boost temporal: documentos recentes > antigos" },
      { name: "jurisdiction", weight: 0.10, bias: 0, description: "Relevância jurisdicional: tribunal/vara compatível" },
      { name: "depth", weight: 0.05, bias: 0, description: "Profundidade do conteúdo (extensão, citações, fundamentação)" },
      { name: "sumula_match", weight: 0.10, bias: 0.1, description: "Relevância de Súmulas STJ/STF (boost em precedentes vinculantes)" },
    ],
    version: "v18-attention-pe-dropout-layernorm-qkv",
    globalBias: 0.1,
  };
}

// Default 3-layer QNN weights: 21 params per layer (3 per qubit × 7 qubits)
// ═══ Cap. 4.8.2: Xavier Initialization (ao invés de valores fixos) ═══
function getDefaultLayerWeights(): number[][] {
  const QUBITS = 7;
  const PARAMS_PER_QUBIT = 3;
  const fanIn = QUBITS;
  const fanOut = QUBITS;
  return [
    // Layer 1: Xavier-initialized RX, RY, RZ rotations
    Array.from({ length: QUBITS * PARAMS_PER_QUBIT }, () => {
      const w = xavierInit(fanIn, fanOut);
      return Math.max(0.1, Math.min(2.0, 1.0 + w * 0.3)); // Center around 1.0 for stability
    }),
    // Layer 2: refinement
    Array.from({ length: QUBITS * PARAMS_PER_QUBIT }, () => {
      const w = xavierInit(fanIn, fanOut);
      return Math.max(0.1, Math.min(2.0, 1.0 + w * 0.2));
    }),
    // Layer 3: measurement preparation (closer to identity)
    Array.from({ length: QUBITS * PARAMS_PER_QUBIT }, () => {
      const w = xavierInit(fanIn, fanOut);
      return Math.max(0.1, Math.min(2.0, 1.0 + w * 0.1));
    }),
  ];
}

// ─── Positional Encoding (Temporal Decay) ───
function computeTemporalScore(publishedDate: string | null): number {
  if (!publishedDate) return 0.3;
  const now = Date.now();
  const pubDate = new Date(publishedDate).getTime();
  if (isNaN(pubDate)) return 0.3;
  const year = new Date(pubDate).getFullYear();
  if (year < 1900 || year > 2030) return 0.3;
  const ageMs = now - pubDate;
  const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
  const halfLife = 3;
  const lambda = Math.log(2) / halfLife;
  const decayScore = Math.exp(-lambda * Math.max(0, ageYears));
  return Math.max(decayScore, 0.1);
}

// ─── Jurisdiction Score ───
function computeJurisdictionScore(source: string, query: string): number {
  const queryLower = query.toLowerCase();
  const jurisdictionMap: Record<string, string[]> = {
    "stf": ["constitucional", "adi", "adpf", "recurso extraordinário", "re ", "stf"],
    "datajud_stj": ["stj", "recurso especial", "resp", "superior tribunal"],
    "datajud_tst": ["tst", "trabalhista", "clt", "reclamação trabalhista"],
    "datajud_tse": ["tse", "eleitoral", "eleição"],
    "datajud_tjsp": ["tjsp", "são paulo", "paulista", "sp"],
    "datajud_tjrj": ["tjrj", "rio de janeiro", "fluminense", "rj"],
    "datajud_tjmg": ["tjmg", "minas gerais", "mineiro", "mg"],
    "datajud_tjrs": ["tjrs", "rio grande do sul", "gaúcho", "rs"],
    "datajud_tjpr": ["tjpr", "paraná", "paranaense", "pr"],
    "cnj": ["cnj", "conselho nacional", "resolução"],
    "lexml": ["legislação", "lei", "código", "decreto"],
    "lexml_catalogo": ["legislação", "lei", "código", "decreto", "constituição"],
    "senado_contratos": ["contrato", "contratação", "licitação", "senado", "administrativo"],
    "senado_contratos_tb": ["contrato", "contratação", "senado"],
    "senado_contratos_api": ["contrato", "contratação", "senado"],
    "senado_licitacoes": ["licitação", "pregão", "edital", "homologação", "senado"],
    "senado_licitacoes_tb": ["licitação", "pregão", "senado"],
    "senado_licitacoes_api": ["licitação", "pregão", "senado"],
    "senado_avencas": ["avença", "convênio", "nota de empenho", "senado"],
    "senado_avencas_tb": ["avença", "convênio", "senado"],
    "senado_empresas": ["empresa", "cnpj", "contratada", "fornecedor", "senado"],
    "senado_empresas_tb": ["empresa", "cnpj", "contratada", "senado"],
    "senado_empresas_api": ["empresa", "cnpj", "contratada", "senado"],
    "senado_escritorios": ["escritório", "apoio", "senador", "parlamentar", "gabinete"],
    "senado_terceirizados": ["terceirizado", "terceirização", "prestador", "funcionário"],
    "senado_notas_empenho": ["empenho", "nota de empenho", "despesa", "orçamento"],
    "senado_atas_rp": ["ata", "registro de preço", "arp", "pregão"],
    "senado_ceaps": ["ceaps", "cota", "verba", "reembolso", "despesa parlamentar"],
    "senado_moradia": ["moradia", "auxílio", "transporte", "imóvel"],
    "senado_aprendizes": ["aprendiz", "menor", "jovem aprendiz"],
    "senado_servidores": ["servidor", "funcionário público", "cargo", "lotação", "senado"],
    "senado_remuneracoes": ["remuneração", "salário", "vencimento", "servidor", "senado"],
    "senado_remun_pension": ["pensionista", "pensão", "remuneração", "senado"],
    "senado_pensionistas": ["pensionista", "pensão", "beneficiário", "senado"],
    "senado_estagiarios": ["estagiário", "estágio", "senado"],
    "senado_horas_extras": ["horas extras", "hora extra", "adicional", "senado"],
    "senado_prev_aposent": ["aposentadoria", "previsão", "servidor", "senado"],
    "senado_aposentados": ["aposentado", "senador aposentado", "ex-senador"],
    "senado_quant_pessoal": ["quantitativo", "pessoal", "quadro", "senado"],
    "senado_quant_cargos": ["cargo", "função", "comissionado", "senado"],
    "senado_supridos": ["suprido", "suprimento de fundos", "cartão corporativo", "senado"],
    "senado_supr_transac": ["transação", "suprido", "cartão", "senado"],
    "senado_supr_movim": ["movimentação", "suprido", "senado"],
    "senado_supr_empenh": ["empenho", "suprido", "ato concessão", "senado"],
    "senado_supr_atos": ["ato concessão", "suprido", "senado"],
    "senado_quantitativos": ["quantitativo", "parlamentar", "senado"],
  };
  for (const [src, keywords] of Object.entries(jurisdictionMap)) {
    if (source === src || source.startsWith(src)) {
      if (keywords.some(kw => queryLower.includes(kw))) return 1.0;
      return 0.6;
    }
  }
  return 0.4;
}

// ─── Content Depth Score ───
function computeDepthScore(content: string, title: string): number {
  let score = 0.3;
  const len = content.length;
  if (len > 5000) score += 0.3;
  else if (len > 2000) score += 0.2;
  else if (len > 500) score += 0.1;
  const citations = (content.match(/Art\.\s*\d|§\s*\d|Lei\s*n[°º]|Súmula/gi) || []).length;
  if (citations > 5) score += 0.2;
  else if (citations > 2) score += 0.1;
  if (/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.test(content)) score += 0.1;
  return Math.min(score, 1.0);
}

function computeSumulaMatch(title: string, content: string, query: string): number {
  if (title.toLowerCase().includes("súmula") || title.toLowerCase().includes("sumula")) {
    // High boost if query asks for sumula
    if (query.toLowerCase().includes("súmula") || query.toLowerCase().includes("sumula")) return 1.0;
    // Moderate boost for sumulas in general context
    return 0.8;
  }
  // Check content for citations
  if (/súmula\s+\d+/i.test(content)) return 0.6;
  return 0.0;
}

// ─── Multi-Head Attention Scoring (per-result, raw scores) ───
function computeHeadScores(
  result: any,
  query: string,
  weights: AttentionWeights
): Record<string, number> {
  const headScores: Record<string, number> = {};
  for (const head of weights.heads) {
    switch (head.name) {
      case "semantic":
        headScores.semantic = result.semantic_score || 0;
        break;
      case "keyword":
        headScores.keyword = result.keyword_score || 0;
        break;
      case "authority":
        headScores.authority = result.authority_score || computeAuthorityScore(result.source);
        break;
      case "recency":
        headScores.recency = result.recency_score || computeTemporalScore(result.published_date);
        break;
      case "jurisdiction":
        headScores.jurisdiction = computeJurisdictionScore(result.source, query);
        break;
      case "depth":
        headScores.depth = computeDepthScore(result.content || "", result.title || "");
        break;
      case "sumula_match":
        headScores.sumula_match = computeSumulaMatch(result.title || "", result.content || "", query);
        break;
    }
  }
  return headScores;
}

// ═══ v14 Neuro Module 1: Weber-Fechner Normalization (Dehaene ANS) ═══
// perception = log(value / reference) — bio-realistic logarithmic discrimination
function weberFechnerNormalize(values: number[]): number[] {
  if (values.length === 0) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const reference = sorted[Math.floor(sorted.length / 2)] || 0.5; // median as reference
  const epsilon = 1e-8;
  const normalized = values.map(v => {
    const safeVal = Math.max(v, epsilon);
    const safeRef = Math.max(reference, epsilon);
    const perception = Math.log(safeVal / safeRef); // Weber-Fechner law
    return perception;
  });
  // Re-scale to [0, 1] after log transform
  const minN = Math.min(...normalized);
  const maxN = Math.max(...normalized);
  const range = maxN - minN;
  if (range < epsilon) return values.map(() => 0.5);
  return normalized.map(n => (n - minN) / range);
}

// ═══ v14 Neuro Module 3: Parallel-to-Serial Focus (Crick 1994, Tall 2000) ═══
// When entropy is high (confusion), focus on top-3 strongest signals
function parallelToSerialFocus(
  normalizedScores: Record<string, number>,
  entropyNormalized: number
): Record<string, number> {
  // Only activate when entropy > 0.7 (high confusion — all heads similar)
  if (entropyNormalized <= 0.7) return normalizedScores;
  
  const entries = Object.entries(normalizedScores);
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const top3 = new Set(sorted.slice(0, 3).map(e => e[0]));
  
  // Top-3 heads get 80% weight; remaining 4 share 20%
  const result: Record<string, number> = {};
  const top3Sum = sorted.slice(0, 3).reduce((s, e) => s + e[1], 0) || 1;
  const restSum = sorted.slice(3).reduce((s, e) => s + e[1], 0) || 1;
  
  for (const [name, value] of entries) {
    if (top3.has(name)) {
      result[name] = 0.8 * (value / top3Sum) * top3Sum / (entries.length > 0 ? 1 : 1);
      // Simplified: scale top3 to dominate
      result[name] = value * 1.3; // ~30% boost to top signals
    } else {
      result[name] = value * 0.5; // ~50% reduction for weak signals
    }
  }
  
  console.log(`🔬 v14 Parallel→Serial Focus: entropy=${entropyNormalized.toFixed(3)} > 0.7, top3=[${sorted.slice(0,3).map(e=>e[0]).join(",")}] boosted`);
  return result;
}

// ═══ v14 Neuro Module 2: Edelman Co-Activation (synaptic reinforcement) ═══
// Apply learned synaptic pairs: if head A is strong and (A,B) synapse exists, boost B
function applyEdelmanCoActivation(
  normalizedScores: Record<string, number>,
  synapses: Record<string, number> | undefined
): Record<string, number> {
  if (!synapses || Object.keys(synapses).length === 0) return normalizedScores;
  
  const result = { ...normalizedScores };
  const headNames = Object.keys(result);
  const MAX_BOOST = 0.10; // cap co-activation at +10%
  
  for (const [pairKey, strength] of Object.entries(synapses)) {
    const [headA, headB] = pairKey.split("__");
    if (!headA || !headB) continue;
    if (result[headA] !== undefined && result[headB] !== undefined) {
      // If headA is strong (>0.6), boost headB proportionally to synapse strength
      if (result[headA] > 0.6) {
        const boost = Math.min(strength * result[headA] * 0.1, MAX_BOOST);
        result[headB] = Math.min(1.0, result[headB] + boost);
      }
      // Bidirectional
      if (result[headB] > 0.6) {
        const boost = Math.min(strength * result[headB] * 0.1, MAX_BOOST);
        result[headA] = Math.min(1.0, result[headA] + boost);
      }
    }
  }
  
  return result;
}

// ─── Lacuna 4+5+9+10+12: Batch MHA with Multi-Layer QNN + v14 Neuro ───
function applyBatchMHAScoring(
  results: any[],
  query: string,
  weights: AttentionWeights,
  layerWeights?: number[][],
  adamState?: AdamState | null
): any[] {
  if (results.length === 0) return results;

  // ═══ ICMC-USP Fase 2: Use trained layerWeights if available ═══
  const qnnLayers = layerWeights || getDefaultLayerWeights();

  // Step 1: Compute raw head scores for all results
  const allHeadScores = results.map(r => computeHeadScores(r, query, weights));
  const headNames = weights.heads.map(h => h.name);
  const epsilon = 1e-8;

  // Step 2: Find min/max per head across all results
  const minMax: Record<string, { min: number; max: number }> = {};
  for (const name of headNames) {
    const values = allHeadScores.map(hs => hs[name] || 0);
    minMax[name] = { min: Math.min(...values), max: Math.max(...values) };
  }

  // ═══ v14 Neuro Module 1: Weber-Fechner for large result sets ═══
  const useWeberFechner = results.length > 10;
  let weberNormalized: Record<string, number[]> | null = null;
  if (useWeberFechner) {
    weberNormalized = {};
    for (const name of headNames) {
      const values = allHeadScores.map(hs => hs[name] || 0);
      weberNormalized[name] = weberFechnerNormalize(values);
    }
    console.log(`🧠 v14 Weber-Fechner: log-normalized ${headNames.length} heads across ${results.length} results`);
  }

  // Lacuna 4: Apply softmax to weights to ensure they sum to 1.0
  const rawWeights = weights.heads.map(h => h.weight);
  const softmaxWeights = softmax(rawWeights);

  // Load synapses for Edelman co-activation
  const synapses = adamState?.synapticReinforcement || undefined;

  // Step 3: Normalize, apply v14 neuro modules, Multi-Layer QNN, compute entropy
  return results.map((r, idx) => {
    const rawScores = allHeadScores[idx];
    let normalizedScores: Record<string, number> = {};
    let preActivation = weights.globalBias || 0.1;

    for (let i = 0; i < weights.heads.length; i++) {
      const head = weights.heads[i];
      if (useWeberFechner && weberNormalized) {
        // v14: Weber-Fechner log normalization
        normalizedScores[head.name] = weberNormalized[head.name]?.[idx] ?? 0.5;
      } else {
        // Original: linear min-max
        const raw = rawScores[head.name] || 0;
        const { min, max } = minMax[head.name];
        const range = max - min;
        normalizedScores[head.name] = range > epsilon ? (raw - min) / range : 0.5;
      }
    }

    // ═══ v14 Neuro Module 2: Edelman co-activation ═══
    normalizedScores = applyEdelmanCoActivation(normalizedScores, synapses);

    // Compute entropy BEFORE serial focus (needed for the decision)
    const headValues = Object.values(normalizedScores);
    const headSum = headValues.reduce((s, v) => s + v, 0) || 1;
    const headProbs = headValues.map(v => v / headSum);
    const entanglement = vonNeumannEntropy(headProbs);
    const maxEntropy = Math.log2(headValues.length);
    const normalizedEntropy = maxEntropy > 0 ? entanglement / maxEntropy : 0;

    // ═══ v14 Neuro Module 3: Parallel→Serial Focus ═══
    normalizedScores = parallelToSerialFocus(normalizedScores, normalizedEntropy);

    // Apply activation and compute pre-activation
    for (let i = 0; i < weights.heads.length; i++) {
      const head = weights.heads[i];
      const activated = relu(normalizedScores[head.name] || 0);
      normalizedScores[head.name] = activated;
      preActivation += softmaxWeights[i] * activated + (head.bias || 0);
    }

    // ═══ Cap. 10.3.3: Scaled Dot-Product Attention ═══
    // Dividir por sqrt(d_k) para estabilidade numérica em dimensões altas
    const dk = Math.sqrt(weights.heads.length); // sqrt(7) ≈ 2.65
    preActivation = (preActivation / dk) + (weights.globalBias || 0.1);

    // Sigmoid on scaled MHA combined score
    const mhaScore = sigmoid((preActivation - 0.5) * 4);

    // Multi-Layer QNN score with BatchNorm params
    const bnParams = adamState?.batchNormParams || undefined;
    const qnnScore = multiLayerQNNScore(normalizedScores, qnnLayers, bnParams);

    // Combined: MHA (60%) + QNN (30%) + Entropy bonus (10%)
    const entropyBonus = Math.min(normalizedEntropy, 1.0);
    const finalScore = 0.6 * mhaScore + 0.3 * qnnScore + 0.1 * entropyBonus;

    return {
      ...r,
      multi_head_score: finalScore,
      attention_heads: normalizedScores,
      combined_score: finalScore,
      qnn_score: qnnScore,
      entanglement_entropy: entanglement,
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// FASE 5: Perceptron Quântico-Inspirado
// ═══════════════════════════════════════════════════════════════

interface QuantumCategoryWeights {
  name: string;
  weights: number[];
}

const QUANTUM_LEGAL_CATEGORIES: QuantumCategoryWeights[] = [
  { name: "constitucional", weights: [-1, -1, +1, -1, +1, -1] },
  { name: "trabalhista",    weights: [-1, -1, -1, +1, +1, -1] },
  { name: "penal",          weights: [+1, +1, -1, -1, +1, -1] },
  { name: "civil",          weights: [+1, -1, -1, -1, -1, +1] },
  { name: "tributario",     weights: [-1, +1, +1, -1, +1, -1] },
  { name: "administrativo", weights: [-1, +1, +1, +1, +1, -1] },
  { name: "ambiental",      weights: [+1, -1, -1, +1, -1, +1] },
  { name: "consumidor",     weights: [+1, +1, -1, +1, -1, -1] },
  { name: "previdenciario", weights: [-1, +1, +1, +1, +1, +1] },
  { name: "eleitoral",      weights: [-1, -1, +1, +1, +1, -1] },
  { name: "empresarial",    weights: [+1, +1, -1, -1, -1, +1] },
  { name: "familia",        weights: [+1, -1, -1, +1, -1, +1] },
];

// ═══ v19 Rauber UFES — Aprendizagem Competitiva (Seção II.4.3, V) ═══
// Winner-Takes-All: apenas 1 neurônio vence (yi* = 1, yi = 0 para i ≠ i*)
// Regra: Δwij = η * yi * (xj − wij) — pesos se deslocam em direção ao estímulo
interface CompetitiveLayer {
  neurons: { name: string; weights: number[] }[];
  learningRate: number;
}

function getDefaultCompetitiveLayer(): CompetitiveLayer {
  return {
    neurons: QUANTUM_LEGAL_CATEGORIES.map(c => ({
      name: c.name,
      weights: c.weights.map(w => w * 0.5 + (Math.random() - 0.5) * 0.1),
    })),
    learningRate: 0.05,
  };
}

// Normaliza vetor para comprimento unitário (Seção V.1: ||x|| = 1, ||wi|| = 1)
function normalizeVector(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map(x => x / norm);
}

// Winner-Takes-All: vencedor = maior produto interno wi^T · x (Eq. 23)
function competitiveLearning(
  input: number[],
  layer: CompetitiveLayer,
  train: boolean = false
): { winner: string; confidence: number; allScores: Record<string, number> } {
  const xNorm = normalizeVector(input);
  let bestScore = -Infinity;
  let winnerIdx = 0;
  const allScores: Record<string, number> = {};

  for (let i = 0; i < layer.neurons.length; i++) {
    const wNorm = normalizeVector(layer.neurons[i].weights);
    let dot = 0;
    for (let j = 0; j < xNorm.length; j++) {
      dot += xNorm[j] * (wNorm[j] || 0);
    }
    allScores[layer.neurons[i].name] = dot;
    if (dot > bestScore) {
      bestScore = dot;
      winnerIdx = i;
    }
  }

  // Adaptação competitiva: wi ← wi + η(x − wi) — apenas o vencedor atualiza
  if (train) {
    const η = layer.learningRate;
    const w = layer.neurons[winnerIdx].weights;
    for (let j = 0; j < w.length; j++) {
      w[j] = w[j] + η * ((xNorm[j] || 0) - w[j]);
    }
    console.log(`🏆 v19 Competitive: winner="${layer.neurons[winnerIdx].name}" score=${bestScore.toFixed(3)}, weights updated`);
  }

  return {
    winner: layer.neurons[winnerIdx].name,
    confidence: Math.max(0, bestScore),
    allScores,
  };
}

// ═══ v19 Rauber UFES — Rede de Hopfield (Seção IV) ═══
// Memória associativa com pesos simétricos, relaxação assíncrona, função de energia
// wij = (1/H) * Σ(xpi * xpj) — Regra de Hebb Generalizada (Eq. 21)
// E = -1/2 * Σ(wij * xi * xj) — Função de Energia (Eq. 22)
// xi(t+Δt) = sgn(Σ wij * xj(t)) — Regra de Atualização (Eq. 19)

interface HopfieldNetwork {
  weights: number[][]; // Matriz simétrica H×H, wii = 0
  patterns: number[][]; // Padrões memorizados (bipolares: -1/+1)
  size: number; // H — número de neurônios
}

// Memorizar padrões via Regra de Hebb Generalizada (Eq. 21)
function hopfieldLearn(patterns: number[][]): HopfieldNetwork {
  if (patterns.length === 0) return { weights: [], patterns: [], size: 0 };
  const H = patterns[0].length;
  const weights: number[][] = Array.from({ length: H }, () => new Array(H).fill(0));

  for (const pattern of patterns) {
    for (let i = 0; i < H; i++) {
      for (let j = 0; j < H; j++) {
        if (i !== j) {
          weights[i][j] += (pattern[i] * pattern[j]) / H; // wij = (1/H) Σ xpi·xpj
        }
      }
    }
  }

  console.log(`🧲 v19 Hopfield: memorized ${patterns.length} patterns, H=${H}`);
  return { weights, patterns, size: H };
}

// Relaxação assíncrona até estado estável (Seção IV.1)
function hopfieldRecall(
  network: HopfieldNetwork,
  stimulus: number[],
  maxIter: number = 50
): { state: number[]; energy: number; converged: boolean; iterations: number } {
  if (network.size === 0) return { state: stimulus, energy: 0, converged: true, iterations: 0 };
  let state = [...stimulus];
  let converged = false;

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    // Atualização assíncrona: percorrer neurônios em ordem aleatória
    const order = Array.from({ length: network.size }, (_, i) => i);
    for (let k = order.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [order[k], order[j]] = [order[j], order[k]];
    }

    for (const i of order) {
      let sum = 0;
      for (let j = 0; j < network.size; j++) {
        sum += (network.weights[i]?.[j] || 0) * state[j];
      }
      const newVal = sum >= 0 ? 1 : -1; // sgn function (Eq. 19)
      if (newVal !== state[i]) {
        state[i] = newVal;
        changed = true;
      }
    }

    if (!changed) {
      converged = true;
      break;
    }
  }

  // Função de Energia (Eq. 22): E = -1/2 * Σ wij * xi * xj
  const energy = hopfieldEnergy(network.weights, state);

  return { state, energy, converged, iterations: maxIter };
}

// Função de Energia de Hopfield (Eq. 22)
function hopfieldEnergy(weights: number[][], state: number[]): number {
  let E = 0;
  for (let i = 0; i < state.length; i++) {
    for (let j = i + 1; j < state.length; j++) {
      E -= (weights[i]?.[j] || 0) * state[i] * state[j];
    }
  }
  return E;
}

// Encontrar padrão memorizado mais próximo (distância de Hamming)
function hopfieldFindClosest(
  network: HopfieldNetwork,
  state: number[]
): { patternIdx: number; distance: number } {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let p = 0; p < network.patterns.length; p++) {
    let dist = 0;
    for (let i = 0; i < state.length; i++) {
      if (state[i] !== network.patterns[p][i]) dist++;
    }
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = p;
    }
  }
  return { patternIdx: bestIdx, distance: bestDist };
}

// ═══ v19: Classificação Híbrida (Competitiva + Keywords fallback) ═══
function detectQueryCategory(query: string): string | null {
  const q = query.toLowerCase();
  const categoryKeywords: Record<string, string[]> = {
    constitucional: ["constitucional", "adi", "adpf", "mandado de segurança", "habeas corpus", "recurso extraordinário", "stf", "constituição"],
    trabalhista: ["trabalhista", "clt", "reclamação trabalhista", "tst", "fgts", "demissão", "rescisão", "horas extras"],
    penal: ["penal", "crime", "réu", "acusado", "prisão", "furto", "roubo", "homicídio", "código penal"],
    civil: ["civil", "contrato", "responsabilidade civil", "dano", "obrigação", "propriedade"],
    tributario: ["tributário", "imposto", "tributo", "icms", "irpf", "contribuição", "fiscal", "isenção"],
    administrativo: ["administrativo", "licitação", "contrato administrativo", "servidor público", "concurso", "ato administrativo"],
    ambiental: ["ambiental", "meio ambiente", "licenciamento", "ibama", "poluição", "desmatamento"],
    consumidor: ["consumidor", "cdc", "defeito", "produto", "serviço", "propaganda enganosa", "recall"],
    previdenciario: ["previdenciário", "aposentadoria", "inss", "benefício", "pensão por morte", "auxílio-doença", "auxílio doença", "bpc", "loas"],
    eleitoral: ["eleitoral", "eleição", "tse", "candidato", "propaganda eleitoral", "urna", "voto", "partido"],
    empresarial: ["empresarial", "sociedade", "sócio", "falência", "recuperação judicial", "contrato social", "empresa"],
    familia: ["família", "divórcio", "guarda", "alimentos", "pensão alimentícia", "adoção", "casamento", "união estável"],
  };
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => q.includes(kw))) return cat;
  }
  return null;
}

// ─── Lacuna 10: Amplitude-Encoded Quantum Classification ───
// v12: Enhanced with EM fallback when keyword detection fails
function quantumInspiredClassify(
  headScores: Record<string, number>,
  query: string
): { compatibility: number; category: string | null; entanglement: number } {
  const headOrder = ["semantic", "keyword", "authority", "recency", "jurisdiction", "depth"];
  const m = headOrder.length;
  const amplitudeInput = headOrder.map(h => amplitudeEncode(headScores[h] || 0));
  const detectedCategory = detectQueryCategory(query);

  // v12 DBN: If keyword detection fails, use EM Algorithm (Ghahramani eq. 17-18)
  let bestCompatibility = 0;
  let bestCategory: string | null = null;

  if (!detectedCategory) {
    // EM inference: probabilistic area detection
    const emResult = emCategoryInference(headScores, QUANTUM_LEGAL_CATEGORIES, 5);
    bestCategory = emResult.bestCategory;
    bestCompatibility = emResult.confidence;
    console.log(`🔬 EM v12: inferred area="${bestCategory}" (confidence=${emResult.confidence.toFixed(3)}) — keywords failed`);
  } else {
    // Original path: use detected category
    for (const cat of QUANTUM_LEGAL_CATEGORIES) {
      if (cat.name !== detectedCategory) continue;
      let dotProduct = 0;
      for (let j = 0; j < m; j++) {
        dotProduct += amplitudeInput[j] * cat.weights[j];
      }
      bestCompatibility = Math.pow(dotProduct / m, 2);
      bestCategory = cat.name;
    }
  }

  const ampSum = amplitudeInput.reduce((s, v) => s + Math.abs(v), 0) || 1;
  const ampProbs = amplitudeInput.map(v => Math.abs(v) / ampSum);
  const entanglement = vonNeumannEntropy(ampProbs);
  return { compatibility: bestCompatibility, category: bestCategory || detectedCategory, entanglement };
}

function quantumInspiredClassifyWithCats(
  headScores: Record<string, number>,
  query: string,
  categories: QuantumCategoryWeights[]
): { compatibility: number; category: string | null; entanglement: number } {
  const headOrder = ["semantic", "keyword", "authority", "recency", "jurisdiction", "depth"];
  const m = headOrder.length;
  const amplitudeInput = headOrder.map(h => amplitudeEncode(headScores[h] || 0));
  const detectedCategory = detectQueryCategory(query);
  let bestCompatibility = 0;
  let bestCategory: string | null = null;
  for (const cat of categories) {
    if (detectedCategory && cat.name !== detectedCategory) continue;
    let dotProduct = 0;
    for (let j = 0; j < m; j++) {
      dotProduct += amplitudeInput[j] * (cat.weights[j] || 0);
    }
    const compatibility = Math.pow(dotProduct / m, 2);
    if (compatibility > bestCompatibility) {
      bestCompatibility = compatibility;
      bestCategory = cat.name;
    }
  }
  const ampSum = amplitudeInput.reduce((s, v) => s + Math.abs(v), 0) || 1;
  const ampProbs = amplitudeInput.map(v => Math.abs(v) / ampSum);
  const entanglement = vonNeumannEntropy(ampProbs);
  return { compatibility: bestCompatibility, category: bestCategory || detectedCategory, entanglement };
}

// ─── Threshold Adaptativo ───
function computeAdaptiveThreshold(results: any[]): number {
  if (results.length === 0) return 0.3;
  const topScore = Math.max(...results.map(r => r.multi_head_score || 0));
  if (topScore > 0.8) return 0.40;
  if (topScore > 0.5) return 0.30;
  return 0.20;
}

// ─── Signal Flip ───
const NEGATION_OPERATORS = [
  "exceto", "salvo", "não se aplica", "excludente", "exceção",
  "ressalvado", "excluído", "inaplicável", "afastado", "não incide",
  "não se enquadra", "não abrange", "vedado", "proibido",
];

function detectNegation(query: string): boolean {
  const q = query.toLowerCase();
  return NEGATION_OPERATORS.some(op => q.includes(op));
}

function applySignalFlip(results: any[], query: string): any[] {
  if (!detectNegation(query)) return results;
  console.log("⚡ Signal Flip (SF) ativado — negação jurídica detectada");
  return results.map(r => {
    const heads = { ...(r.attention_heads || {}) };
    if (heads.authority !== undefined) heads.authority = 1.0 - heads.authority;
    if (heads.recency !== undefined) heads.recency = 1.0 - heads.recency;
    const weights = getDefaultAttentionWeights();
    let newScore = weights.globalBias;
    for (const head of weights.heads) {
      newScore += head.weight * (heads[head.name] || 0) + (head.bias || 0);
    }
    newScore = sigmoid((newScore - 0.5) * 4);
    return { ...r, attention_heads: heads, multi_head_score: newScore, combined_score: newScore, signal_flip_applied: true };
  });
}

// ═══════════════════════════════════════════════════════════════
// FASE 6+: Auto-tuning via Adam Optimizer + Parameter-Shift Gradient
// v11 Lacunas: 8 (Adam), 11 (Multi-Class CE), 13 (Confusion Matrix),
//              15 (Parameter-Shift Gradient)
// ═══════════════════════════════════════════════════════════════

// ─── Lacuna 1+11: Loss Functions ───
function computeLoss(predicted: number, actual: number): number {
  const p = Math.max(Math.min(predicted, 0.9999), 0.0001);
  const t = actual;
  return -(t * Math.log(p) + (1 - t) * Math.log(1 - p));
}

// ─── Lacuna 15: Parameter-Shift Gradient (quantum-native) ───
// ∂f/∂θ = [f(θ + π/2) − f(θ − π/2)] / 2
function parameterShiftGradient(
  headScores: Record<string, number>,
  headName: string,
  catWeights: number[],
  headIndex: number,
  query: string,
  categories: QuantumCategoryWeights[]
): number {
  const shift = Math.PI / 2;
  
  // f(θ + π/2)
  const weightsPlus = [...catWeights];
  weightsPlus[headIndex] = Math.max(-1, Math.min(1, weightsPlus[headIndex] + shift / Math.PI));
  const catPlus = categories.map((c, i) => i === 0 ? { ...c, weights: weightsPlus } : c);
  const { compatibility: compPlus } = quantumInspiredClassifyWithCats(headScores, query, catPlus);
  
  // f(θ - π/2)
  const weightsMinus = [...catWeights];
  weightsMinus[headIndex] = Math.max(-1, Math.min(1, weightsMinus[headIndex] - shift / Math.PI));
  const catMinus = categories.map((c, i) => i === 0 ? { ...c, weights: weightsMinus } : c);
  const { compatibility: compMinus } = quantumInspiredClassifyWithCats(headScores, query, catMinus);
  
  return (compPlus - compMinus) / 2;
}

// ─── Lacuna 6: Simple gradient ───
function computeGradient(predicted: number, actual: number, headScore: number): number {
  return (predicted - actual) * headScore;
}

// ─── Lacuna 3: L2 Weight Decay Regularization ───
function applyWeightDecay(weight: number, lambda: number = 0.01): number {
  return weight * (1 - lambda);
}

// ─── Lacuna 3: Simulated Dropout ───
function applyDropout(headScores: Record<string, number>, dropRate: number = 0.2): Record<string, number> {
  const result = { ...headScores };
  const headNames = Object.keys(result);
  const dropCount = Math.floor(headNames.length * dropRate);
  const shuffled = headNames.sort(() => Math.random() - 0.5);
  for (let i = 0; i < dropCount; i++) {
    result[shuffled[i]] = 0;
  }
  const scale = 1 / (1 - dropRate);
  for (let i = dropCount; i < shuffled.length; i++) {
    result[shuffled[i]] *= scale;
  }
  return result;
}

// ═══ v12 DBN Module 1: Kalman Filter (Ghahramani eq. 21-28) ═══
// Models each attention head weight as a hidden state with uncertainty
interface KalmanState {
  estimate: number;   // x̂ — current weight estimate (mean)
  variance: number;   // P — estimation uncertainty (covariance)
}

interface KalmanConfig {
  processNoise: number;      // Q — how much weights drift naturally (0.001)
  measurementNoise: number;  // R — feedback noise (higher = trust prediction more)
}

function kalmanWeightUpdate(
  state: KalmanState,
  measurement: number,
  config: KalmanConfig
): KalmanState {
  // Predict step (eq. 21-22): x̂⁻ = x̂, P⁻ = P + Q
  const predictedEstimate = state.estimate;
  const predictedVariance = state.variance + config.processNoise;

  // Update step (eq. 23-28): K = P⁻/(P⁻+R), x̂ = x̂⁻ + K(z - x̂⁻), P = (1-K)P⁻
  const kalmanGain = predictedVariance / (predictedVariance + config.measurementNoise);
  const newEstimate = predictedEstimate + kalmanGain * (measurement - predictedEstimate);
  const newVariance = (1 - kalmanGain) * predictedVariance;

  return {
    estimate: Math.max(-1, Math.min(1, newEstimate)),
    variance: Math.max(1e-6, newVariance), // prevent collapse
  };
}

// ═══ v12 DBN Module 2: EM Algorithm (Ghahramani eq. 17-18) ═══
// Infers latent legal area when keyword matching fails
function emCategoryInference(
  headScores: Record<string, number>,
  categories: QuantumCategoryWeights[],
  maxIterations: number = 5
): { posteriors: number[]; bestCategory: string; confidence: number } {
  const headOrder = ["semantic", "keyword", "authority", "recency", "jurisdiction", "depth"];
  const K = categories.length;

  // Initialize priors uniformly: P(z_k) = 1/K
  let priors = new Array(K).fill(1 / K);

  for (let iter = 0; iter < maxIterations; iter++) {
    // E-step (eq. 17): Compute P(z_k | x) ∝ P(x | z_k) * P(z_k)
    const likelihoods = categories.map((cat, k) => {
      let logLikelihood = 0;
      for (let j = 0; j < headOrder.length; j++) {
        const x = headScores[headOrder[j]] || 0;
        const w = cat.weights[j] || 0;
        // Gaussian emission: P(x|z_k) ~ exp(-0.5 * (x - w)^2 / σ^2)
        const diff = x - w * 0.5; // scale weights to [−0.5, 0.5] range
        logLikelihood -= 0.5 * diff * diff;
      }
      return Math.exp(logLikelihood) * priors[k];
    });

    const totalLikelihood = likelihoods.reduce((s, l) => s + l, 0) || 1e-10;
    const posteriors = likelihoods.map(l => l / totalLikelihood);

    // M-step (eq. 18): Update priors with smoothing
    const smoothing = 0.1 / K; // Laplace smoothing
    priors = posteriors.map(p => p * 0.9 + smoothing);
    const priorSum = priors.reduce((s, p) => s + p, 0);
    priors = priors.map(p => p / priorSum);
  }

  // Final posteriors
  const finalLikelihoods = categories.map((cat, k) => {
    let logLikelihood = 0;
    for (let j = 0; j < headOrder.length; j++) {
      const x = headScores[headOrder[j]] || 0;
      const diff = x - (cat.weights[j] || 0) * 0.5;
      logLikelihood -= 0.5 * diff * diff;
    }
    return Math.exp(logLikelihood) * priors[k];
  });
  const totalFinal = finalLikelihoods.reduce((s, l) => s + l, 0) || 1e-10;
  const posteriors = finalLikelihoods.map(l => l / totalFinal);

  let bestIdx = 0;
  let bestProb = posteriors[0];
  for (let k = 1; k < K; k++) {
    if (posteriors[k] > bestProb) { bestProb = posteriors[k]; bestIdx = k; }
  }

  return { posteriors, bestCategory: categories[bestIdx].name, confidence: bestProb };
}

// ═══ v12 DBN Module 3: HMM Session Tracker (Ghahramani eq. 32-36) ═══
const HMM_LEGAL_STATES = [
  "constitucional", "trabalhista", "penal", "civil", "tributario",
  "administrativo", "ambiental", "consumidor", "previdenciario",
  "eleitoral", "empresarial", "familia"
];

function getDefaultTransitionMatrix(): Record<string, Record<string, number>> {
  const N = HMM_LEGAL_STATES.length;
  const selfProb = 0.6;  // high self-transition (users stay in same area)
  const otherProb = (1 - selfProb) / (N - 1);
  const matrix: Record<string, Record<string, number>> = {};
  for (const from of HMM_LEGAL_STATES) {
    matrix[from] = {};
    for (const to of HMM_LEGAL_STATES) {
      matrix[from][to] = from === to ? selfProb : otherProb;
    }
  }
  return matrix;
}

// Viterbi algorithm (eq. 37-44): Decode most likely state sequence
function viterbiDecode(
  observations: string[],  // detected categories per query
  transitionMatrix: Record<string, Record<string, number>>,
  emissionStrength: number = 0.8
): { path: string[]; probability: number } {
  if (observations.length === 0) return { path: [], probability: 0 };

  const states = HMM_LEGAL_STATES;
  const N = states.length;
  const T = observations.length;
  const initProb = 1 / N;

  // Log-probabilities for numerical stability
  const viterbi: number[][] = Array.from({ length: T }, () => new Array(N).fill(-Infinity));
  const backpointer: number[][] = Array.from({ length: T }, () => new Array(N).fill(0));

  // Initialization (t=0)
  for (let s = 0; s < N; s++) {
    const emission = observations[0] === states[s] ? emissionStrength : (1 - emissionStrength) / (N - 1);
    viterbi[0][s] = Math.log(initProb) + Math.log(Math.max(emission, 1e-10));
  }

  // Recursion (t=1..T-1)
  for (let t = 1; t < T; t++) {
    for (let s = 0; s < N; s++) {
      const emission = observations[t] === states[s] ? emissionStrength : (1 - emissionStrength) / (N - 1);
      const logEmission = Math.log(Math.max(emission, 1e-10));
      let bestScore = -Infinity;
      let bestPrev = 0;
      for (let p = 0; p < N; p++) {
        const trans = transitionMatrix[states[p]]?.[states[s]] || (1 / N);
        const score = viterbi[t - 1][p] + Math.log(Math.max(trans, 1e-10));
        if (score > bestScore) { bestScore = score; bestPrev = p; }
      }
      viterbi[t][s] = bestScore + logEmission;
      backpointer[t][s] = bestPrev;
    }
  }

  // Termination: find best final state
  let bestFinal = 0;
  let bestFinalScore = viterbi[T - 1][0];
  for (let s = 1; s < N; s++) {
    if (viterbi[T - 1][s] > bestFinalScore) {
      bestFinalScore = viterbi[T - 1][s];
      bestFinal = s;
    }
  }

  // Backtrack
  const path: string[] = new Array(T);
  path[T - 1] = states[bestFinal];
  let current = bestFinal;
  for (let t = T - 2; t >= 0; t--) {
    current = backpointer[t + 1][current];
    path[t] = states[current];
  }

  return { path, probability: Math.exp(bestFinalScore) };
}

// Load HMM transition matrix from neural_specializations
async function loadHMMTransitionMatrix(supabase: any): Promise<Record<string, Record<string, number>>> {
  try {
    const { data } = await supabase
      .from("neural_specializations")
      .select("prompts")
      .eq("name", "HMM Transition Matrix v12")
      .eq("is_active", true)
      .maybeSingle();
    if (data?.prompts?.matrix) return data.prompts.matrix;
  } catch {}
  return getDefaultTransitionMatrix();
}

// Run HMM + GRU session inference for a user
// ═══ v16 Deep Learning Cap. 9.1: GRU complementa HMM para memória de sessão ═══
async function hmmSessionInference(
  supabase: any,
  userId: string | null,
  currentQuery: string
): Promise<{ inferredArea: string | null; confidence: number }> {
  if (!userId) return { inferredArea: null, confidence: 0 };
  try {
    const { data: recentQueries } = await supabase
      .from("neural_learning_data")
      .select("input_text, metadata")
      .eq("interaction_type", "search_query")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!recentQueries || recentQueries.length < 2) return { inferredArea: null, confidence: 0 };

    const observations: string[] = recentQueries
      .reverse()
      .map((q: any) => {
        const metaArea = q.metadata?.area || q.metadata?.quantum_category;
        if (metaArea && HMM_LEGAL_STATES.includes(metaArea)) return metaArea;
        return detectQueryCategory(q.input_text) || "civil";
      });

    const currentCategory = detectQueryCategory(currentQuery) || "civil";
    observations.push(currentCategory);

    // HMM Viterbi path (original)
    const transitionMatrix = await loadHMMTransitionMatrix(supabase);
    const { path, probability } = viterbiDecode(observations, transitionMatrix);
    const hmmArea = path[path.length - 1];
    const hmmConfidence = Math.min(probability * 100, 1.0);

    // ═══ GRU Session Memory (Cap. 9.1) ═══
    // Encode each area as a one-hot-like vector and pass through GRU
    const GRU_DIM = HMM_LEGAL_STATES.length; // dimension = number of legal areas
    let gruResult: { area: string; confidence: number } = { area: hmmArea, confidence: hmmConfidence };
    
    try {
      // Load GRU state from AdamState
      const adamForGRU = await loadAdamState(supabase);
      const gruW = adamForGRU.gruWeights || getDefaultGRUWeights(GRU_DIM);
      let hiddenState = adamForGRU.gruHiddenState || new Array(GRU_DIM).fill(0);
      
      // Process each observation through GRU
      for (const obs of observations) {
        const obsIdx = HMM_LEGAL_STATES.indexOf(obs);
        const xt = new Array(GRU_DIM).fill(0);
        if (obsIdx >= 0) xt[obsIdx] = 1.0;
        hiddenState = gruCell(hiddenState, xt, gruW);
      }
      
      // Decode: area with highest activation in hidden state
      let maxIdx = 0;
      let maxVal = -Infinity;
      for (let i = 0; i < hiddenState.length; i++) {
        if (hiddenState[i] > maxVal) { maxVal = hiddenState[i]; maxIdx = i; }
      }
      const gruArea = HMM_LEGAL_STATES[maxIdx] || currentCategory;
      const gruConfidence = sigmoid(maxVal); // normalize to [0,1]
      
      // Save updated hidden state
      adamForGRU.gruWeights = gruW;
      adamForGRU.gruHiddenState = hiddenState;
      await saveAdamState(supabase, adamForGRU);
      
      gruResult = { area: gruArea, confidence: gruConfidence };
      console.log(`🧠 v16 GRU: inferred="${gruArea}" (conf=${gruConfidence.toFixed(3)}), HMM="${hmmArea}" (conf=${hmmConfidence.toFixed(3)})`);
    } catch (gruErr) {
      console.warn("GRU session inference failed, using HMM only:", gruErr);
    }

    // Combine HMM + GRU: weighted ensemble (60% HMM + 40% GRU)
    let inferredArea: string;
    let confidence: number;
    if (gruResult.area === hmmArea) {
      // Agreement — high confidence
      inferredArea = hmmArea;
      confidence = Math.max(hmmConfidence, gruResult.confidence) * 1.2;
    } else if (gruResult.confidence > hmmConfidence * 1.5) {
      // GRU much more confident — trust GRU
      inferredArea = gruResult.area;
      confidence = gruResult.confidence;
    } else {
      // Default to HMM
      inferredArea = hmmArea;
      confidence = hmmConfidence;
    }
    confidence = Math.min(confidence, 1.0);

    if (inferredArea !== currentCategory) {
      console.log(`🔗 v16 HMM+GRU: session inference suggests "${inferredArea}" (was "${currentCategory}"), confidence=${confidence.toFixed(3)}`);
    }

    return { inferredArea, confidence: Math.max(confidence, 0.3) };
  } catch (e) {
    console.warn("HMM+GRU session inference failed:", e);
    return { inferredArea: null, confidence: 0 };
  }
}

// ═══ v13 RL Module 1: TD Error (Sutton & Barto 1990) ═══
// δ_t = r_{t+1} + γ * V(s_{t+1}) - V(s_t)
const TD_GAMMA = 0.9;  // discount factor (imminence weighting)
const TD_ALPHA = 0.1;  // V-estimate learning rate

function computeTDError(
  reward: number,        // +1.0 positive, -0.5 negative
  vCurrent: number,      // V(s_t) = multi_head_score of the result
  vNext: number,         // V(s_{t+1}) = avg score of next results (0 if last)
  gamma: number = TD_GAMMA
): number {
  const delta = reward + gamma * vNext - vCurrent;
  // Clipping to [-2, 2] prevents instability (plan risk mitigation)
  return Math.max(-2, Math.min(2, delta));
}

// ═══ v13 RL Module 3: Q-Learning (Mitchell Ch.13) ═══
// Q(s,a) = (1-α) * Q(s,a) + α * [r + γ * max_a' Q(s',a')]
const Q_QUERY_TYPES = ["process_number", "exact_phrase", "wildcard"] as const;
const Q_ACTIONS = ["semantic_heavy", "authority_heavy", "balanced", "recency_heavy"] as const;

// Action → head weight multipliers
const Q_ACTION_WEIGHTS: Record<string, Record<string, number>> = {
  semantic_heavy:  { semantic: 1.5, keyword: 1.0, authority: 0.8, recency: 0.7, jurisdiction: 0.9, depth: 0.8, sumula_match: 0.9 },
  authority_heavy: { semantic: 0.9, keyword: 0.8, authority: 1.5, recency: 0.7, jurisdiction: 1.2, depth: 1.0, sumula_match: 1.3 },
  balanced:        { semantic: 1.0, keyword: 1.0, authority: 1.0, recency: 1.0, jurisdiction: 1.0, depth: 1.0, sumula_match: 1.0 },
  recency_heavy:   { semantic: 0.9, keyword: 0.9, authority: 0.8, recency: 1.5, jurisdiction: 0.9, depth: 0.7, sumula_match: 0.8 },
};

interface QTableEntry {
  value: number;
  visits: number;
}

function getQStateKey(area: string, queryType: string): string {
  return `${area}__${queryType}`;
}

function qLearningUpdate(
  qTable: Record<string, Record<string, QTableEntry>>,
  stateKey: string,
  action: string,
  reward: number,
  nextStateKey: string,
  gamma: number = TD_GAMMA
): void {
  if (!qTable[stateKey]) qTable[stateKey] = {};
  if (!qTable[stateKey][action]) qTable[stateKey][action] = { value: 0, visits: 0 };
  
  const entry = qTable[stateKey][action];
  entry.visits++;
  const alpha = 1 / (1 + entry.visits); // decaying learning rate for convergence
  
  // max_a' Q(s', a')
  let maxNextQ = 0;
  if (qTable[nextStateKey]) {
    maxNextQ = Math.max(0, ...Object.values(qTable[nextStateKey]).map(e => e.value));
  }
  
  // Q(s,a) = (1-α) * Q(s,a) + α * [r + γ * max_a' Q(s',a')]
  entry.value = (1 - alpha) * entry.value + alpha * (reward + gamma * maxNextQ);
}

function selectAction(
  qTable: Record<string, Record<string, QTableEntry>>,
  stateKey: string,
  epsilon: number = 0.1
): string {
  // ε-greedy: explore with probability ε
  if (Math.random() < epsilon) {
    return Q_ACTIONS[Math.floor(Math.random() * Q_ACTIONS.length)];
  }
  // Exploit: pick action with max Q(s,a)
  const stateEntries = qTable[stateKey];
  if (!stateEntries || Object.keys(stateEntries).length === 0) {
    return "balanced"; // default
  }
  let bestAction = "balanced";
  let bestValue = -Infinity;
  for (const [action, entry] of Object.entries(stateEntries)) {
    if (entry.value > bestValue) {
      bestValue = entry.value;
      bestAction = action;
    }
  }
  return bestAction;
}

function detectQueryType(query: string): string {
  if (/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.test(query)) return "process_number";
  if (/^".*"$/.test(query.trim()) || query.includes('"')) return "exact_phrase";
  return "wildcard";
}

// ─── Lacuna 8: Adam Optimizer State (β1=0.9, β2=0.999) ───
interface AdamState {
  m: Record<string, number>;   // First moment (mean of gradients)
  v: Record<string, number>;   // Second moment (mean of squared gradients)
  iteration: number;
  // Lacuna 13: Confusion matrix tracking per area
  confusion: Record<string, { tp: number; fp: number; fn: number; tn: number }>;
  // Layer weights for multi-layer QNN
  layerWeights?: number[][];
  // v12 DBN: Kalman states per attention head weight
  kalman?: Record<string, KalmanState>;
  // v13 RL: TD value estimates per category
  vEstimates?: Record<string, number>;
  // v13 RL: Eligibility traces per head per category
  eligibilityTraces?: Record<string, number>;
  // v13 RL: Q-table for ranking strategies
  qTable?: Record<string, Record<string, QTableEntry>>;
  // v13 RL: last action taken per state (for delayed feedback)
  lastAction?: Record<string, string>;
  // v14 Neuro Module 2: Edelman synaptic reinforcement (head pair co-activation)
  synapticReinforcement?: Record<string, number>;
  // v14 Neuro Module 4: Memory Consolidation (Tall 1999)
  memoryConsolidation?: {
    shortTermWeights: Record<string, number>;
    longTermWeights: Record<string, number>;
    feedbackCount: Record<string, number>;
    negativeStreak: Record<string, number>;
  };
  // ═══ v16 Deep Learning: Mini-Batch Gradient Accumulation (Cap. 11.5) ═══
  gradientBuffer?: Record<string, number[]>;
  bufferSize?: number;
  // ═══ v16 Deep Learning: Learnable BatchNorm params (Cap. 7.5) ═══
  batchNormParams?: { gamma: number[]; beta: number[] };
  // ═══ v16 Deep Learning: GRU Session Weights (Cap. 9.1) ═══
  gruWeights?: GRUWeights;
  gruHiddenState?: number[];
  // ═══ v18 Attention: Learned QKV Projections ═══
  qkvProjections?: QKVProjections;
  // ═══ v18 Attention: LayerNorm params ═══
  layerNormParams?: { gamma: number; beta: number };
}

async function loadAdamState(supabase: any): Promise<AdamState> {
  try {
    // Lacuna 4: Corrigido user_id para usar o admin real (service role key não precisa de user_id específico, mas upsert precisa)
    const { data: adminUser } = await supabase.from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle();
    const userId = adminUser?.user_id || "00000000-0000-0000-0000-000000000000";

    const { data } = await supabase
      .from("neural_specializations")
      .select("prompts")
      .eq("name", "Adam Optimizer State v11")
      .eq("is_active", true)
      .maybeSingle();
    if (data?.prompts?.adam) return data.prompts.adam as AdamState;
  } catch {}
  return { m: {}, v: {}, iteration: 0, confusion: {} };
}

async function saveAdamState(supabase: any, state: AdamState): Promise<void> {
  try {
    const { data: adminUser } = await supabase.from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle();
    const userId = adminUser?.user_id || "00000000-0000-0000-0000-000000000000"; // Fallback para ID fixo se não houver admin

    await supabase.from("neural_specializations").upsert({
      user_id: userId,
      name: "Adam Optimizer State v11",
      category: "custom",
      description: "Estado do Adam Optimizer (β1=0.9, β2=0.999) + Confusion Matrix — não remover",
      prompts: { adam: state, updated_at: new Date().toISOString() },
      training_status: "completed",
      accuracy_score: 0,
      is_active: true,
    }, { onConflict: "user_id,name" });
  } catch (err) {
    console.warn("Failed to save Adam state:", err);
  }
}

async function loadQuantumCategoryWeights(supabase: any): Promise<QuantumCategoryWeights[] | null> {
  try {
    const { data } = await supabase
      .from("neural_specializations")
      .select("prompts")
      .eq("name", "Quantum Category Weights")
      .eq("is_active", true)
      .maybeSingle();
    if (data?.prompts?.categories) return data.prompts.categories as QuantumCategoryWeights[];
  } catch {}
  return null;
}

async function saveQuantumCategoryWeights(supabase: any, categories: QuantumCategoryWeights[], accuracy: number): Promise<void> {
  try {
    await supabase.from("neural_specializations").upsert({
      user_id: "00000000-0000-0000-0000-000000000000",
      name: "Quantum Category Weights",
      category: "custom",
      description: "Pesos quânticos auto-ajustados via Adam Optimizer — não remover",
      prompts: { categories, updated_at: new Date().toISOString() },
      training_status: "completed",
      accuracy_score: accuracy,
      is_active: true,
    }, { onConflict: "user_id,name" });
  } catch (err) {
    console.warn("Failed to save quantum weights:", err);
  }
}

// ─── Lacuna 8+13+15: Process feedback with Adam Optimizer ───
async function processSearchFeedback(
  supabase: any,
  data: {
    result_id: string;
    query: string;
    quantum_category: string;
    feedback: "positive" | "negative";
    attention_heads?: Record<string, number>;
  }
): Promise<{ success: boolean; weights_adjusted: boolean; loss?: number; confusion_update?: Record<string, number> }> {
  try {
    const learned = await loadQuantumCategoryWeights(supabase);
    const categories = learned || [...QUANTUM_LEGAL_CATEGORIES];
    
    const catIdx = categories.findIndex(c => c.name === data.quantum_category);
    if (catIdx < 0) return { success: true, weights_adjusted: false };
    
    const cat = categories[catIdx];
    const heads = data.attention_heads || {
      semantic: 0.7, keyword: 0.5, authority: 0.6,
      recency: 0.4, jurisdiction: 0.5, depth: 0.3,
    };
    
    // Lacuna 11: Multi-class scores via softmax of head averages per category
    const categoryScores = categories.map(c => {
      const headOrder = ["semantic", "keyword", "authority", "recency", "jurisdiction", "depth"];
      let dot = 0;
      for (let j = 0; j < headOrder.length; j++) {
        dot += (heads[headOrder[j]] || 0) * (c.weights[j] || 0);
      }
      return dot;
    });
    const categoryProbs = softmax(categoryScores);
    const multiClassLoss = multiClassCrossEntropy(categoryProbs, catIdx);
    
    // ═══ v13 RL: TD Error as Learning Signal (Sutton & Barto 1990) ═══
    // Instead of raw binary feedback, compute surprise (TD error)
    const predicted = Object.values(heads).reduce((s, v) => s + v, 0) / Object.keys(heads).length;
    const reward = data.feedback === "positive" ? 1.0 : -0.5;
    
    // V(s_t) = multi_head_score or predicted average
    const vCurrent = Object.values(heads).reduce((s, v) => s + v, 0) / Math.max(Object.keys(heads).length, 1);
    
    // V(s_{t+1}): load V estimate for this category (converges to expected score)
    const adamStatePreload = await loadAdamState(supabase);
    if (!adamStatePreload.vEstimates) adamStatePreload.vEstimates = {};
    const vNext = adamStatePreload.vEstimates[data.quantum_category] || 0.5;
    
    // δ_t = r + γ * V(s') - V(s) — the "surprise" signal
    const tdError = computeTDError(reward, vCurrent, vNext);
    
    // Update V estimate: V(s) = V(s) + α * δ
    adamStatePreload.vEstimates[data.quantum_category] = 
      (adamStatePreload.vEstimates[data.quantum_category] || 0.5) + TD_ALPHA * tdError;
    
    // Original losses (kept for monitoring)
    const actual = data.feedback === "positive" ? 1.0 : 0.0;
    const bceLoss = computeLoss(sigmoid(predicted), actual);
    // multiClassLoss already computed above
    
    // Combined loss modulated by |TD error| — surprises cause bigger updates
    const tdModulation = Math.min(Math.abs(tdError) + 0.3, 1.5); // floor of 0.3 ensures minimum learning
    const loss = (0.5 * bceLoss + 0.5 * multiClassLoss) * tdModulation;
    
    // Lacuna 8: Adam Optimizer (β1=0.9, β2=0.999, ε=1e-8)
    const adamState = adamStatePreload; // already loaded for TD
    const β1 = 0.9;
    const β2 = 0.999;
    const ε = 1e-8;
    const baseη = 0.05;
    
    // ═══ v16 Deep Learning Cap. 11.11: LR Warmup + Cosine Annealing ═══
    // Warmup: nos primeiros 100 feedbacks, LR sobe linearmente de 0 até baseη
    const WARMUP_STEPS = 100;
    const warmupFactor = Math.min(adamState.iteration / Math.max(WARMUP_STEPS, 1), 1.0);
    const ηWarmed = baseη * warmupFactor;
    
    // Cosine Annealing (após warmup): ciclo completo a cada 2000 iterações
    const T_MAX = 2000;
    const ηMin = 0.001;
    const postWarmupIter = Math.max(0, adamState.iteration - WARMUP_STEPS);
    const ηCosine = adamState.iteration < WARMUP_STEPS
      ? ηWarmed
      : ηMin + 0.5 * (baseη - ηMin) * (1 + Math.cos(Math.PI * (postWarmupIter % T_MAX) / T_MAX));
    
    // ═══ v15 Module 2: Emotional Modulation of Learning Rate (Aguilar 2021) ═══
    const qualityScore = data.feedback === "positive" ? 1.0 : 0.0;
    const emotionalIntensity = Math.abs(qualityScore - 0.5) * 2;
    const lrModulator = 1.0 + emotionalIntensity * 0.5;
    const η = ηCosine * lrModulator;
    console.log(`💓 v16 LR Schedule: warmup=${warmupFactor.toFixed(2)}, cosine=${ηCosine.toFixed(5)}, emotional=${lrModulator.toFixed(2)}, η=${η.toFixed(5)}, iter=${adamState.iteration}`);
    
    // ═══ v16 Deep Learning Cap. 11.5: Mini-Batch Gradient Accumulation ═══
    const MINI_BATCH_SIZE = 4;
    if (!adamState.gradientBuffer) adamState.gradientBuffer = {};
    if (!adamState.bufferSize) adamState.bufferSize = 0;
    
    // ═══ v13 RL Module 2: Eligibility Traces (Sutton & Barto — λ=0.7) ═══
    if (!adamState.eligibilityTraces) adamState.eligibilityTraces = {};
    const LAMBDA = 0.7;
    
    const headOrder = ["semantic", "keyword", "authority", "recency", "jurisdiction", "depth"];
    
    // Compute gradients and accumulate in buffer
    for (let j = 0; j < headOrder.length; j++) {
      const headVal = heads[headOrder[j]] || 0;
      const headKey = `${data.quantum_category}_${j}`;
      
      let gradient: number;
      if (catIdx === 0) {
        gradient = parameterShiftGradient(heads, headOrder[j], cat.weights, j, data.query, categories);
      } else {
        gradient = computeGradient(sigmoid(predicted), actual, headVal);
      }
      
      gradient = Math.max(-1.0, Math.min(1.0, gradient));
      
      const traceKey = `${data.quantum_category}_trace_${headOrder[j]}`;
      const trace = adamState.eligibilityTraces?.[traceKey] || 0.5;
      gradient *= trace;
      
      // Accumulate gradient in buffer
      if (!adamState.gradientBuffer[headKey]) adamState.gradientBuffer[headKey] = [];
      adamState.gradientBuffer[headKey].push(gradient);
    }
    adamState.bufferSize = (adamState.bufferSize || 0) + 1;
    
    // Only apply Adam update when mini-batch is full
    const shouldApplyUpdate = (adamState.bufferSize || 0) >= MINI_BATCH_SIZE;
    
    if (shouldApplyUpdate) {
      for (let j = 0; j < headOrder.length; j++) {
        const headKey = `${data.quantum_category}_${j}`;
        const buffer = adamState.gradientBuffer?.[headKey] || [0];
        
        // Average gradient across mini-batch
        const avgGradient = buffer.reduce((s, g) => s + g, 0) / buffer.length;
        
        // Adam update rule
        const prevM = adamState.m[headKey] || 0;
        const newM = β1 * prevM + (1 - β1) * avgGradient;
        adamState.m[headKey] = newM;
        
        const prevV = adamState.v[headKey] || 0;
        const newV = β2 * prevV + (1 - β2) * avgGradient * avgGradient;
        adamState.v[headKey] = newV;
        
        const mHat = newM / (1 - Math.pow(β1, adamState.iteration + 1));
        const vHat = newV / (1 - Math.pow(β2, adamState.iteration + 1));
        
        cat.weights[j] = applyWeightDecay(cat.weights[j]);
        
        const direction = data.feedback === "positive" ? -1 : 1;
        const delta = η * direction * mHat / (Math.sqrt(vHat) + ε);
        cat.weights[j] = Math.max(-1, Math.min(1, cat.weights[j] - delta));
      }
      
      // Clear gradient buffer after applying
      adamState.gradientBuffer = {};
      adamState.bufferSize = 0;
      console.log(`📦 v16 Mini-Batch: applied accumulated gradients (batch=${MINI_BATCH_SIZE})`);
    } else {
      // Still accumulating — apply simple weight decay only
      for (let j = 0; j < headOrder.length; j++) {
        cat.weights[j] = applyWeightDecay(cat.weights[j]);
      }
      console.log(`📦 v16 Mini-Batch: accumulating gradients (${adamState.bufferSize}/${MINI_BATCH_SIZE})`);
    }
    
    adamState.iteration++;
    categories[catIdx] = cat;
    
    // ═══ ICMC-USP Mudança 5: Pruning de Heads Insignificantes ═══
    // "Se existirem valores muito pequenos, as conexões associadas podem ser
    //  consideradas insignificantes e assim serem eliminadas (pruning)."
    const PRUNING_THRESHOLD = 0.02;
    const OVERFIT_MULTIPLIER = 3.0;
    const absWeights = cat.weights.map(w => Math.abs(w));
    const avgAbsWeight = absWeights.reduce((s, w) => s + w, 0) / absWeights.length;
    
    for (let j = 0; j < cat.weights.length; j++) {
      if (Math.abs(cat.weights[j]) < PRUNING_THRESHOLD) {
        // Prune: redistribute weight proportionally to significant heads
        const prunedWeight = cat.weights[j];
        cat.weights[j] = 0;
        const significantIndices = cat.weights
          .map((w, idx) => ({ w, idx }))
          .filter(x => x.idx !== j && Math.abs(x.w) >= PRUNING_THRESHOLD);
        if (significantIndices.length > 0) {
          const totalSig = significantIndices.reduce((s, x) => s + Math.abs(x.w), 0);
          for (const sig of significantIndices) {
            cat.weights[sig.idx] += (prunedWeight * Math.abs(sig.w)) / totalSig;
          }
        }
        console.log(`✂️ ICMC-USP Pruning: head[${j}] weight=${prunedWeight.toFixed(4)} < ${PRUNING_THRESHOLD} — pruned & redistributed`);
      }
      
      // Alert for potential over-fitting (weight > 3x average)
      if (Math.abs(cat.weights[j]) > avgAbsWeight * OVERFIT_MULTIPLIER && avgAbsWeight > 0.05) {
        console.warn(`⚠️ ICMC-USP Over-fitting alert: head[${j}] weight=${cat.weights[j].toFixed(4)} > ${OVERFIT_MULTIPLIER}x avg(${avgAbsWeight.toFixed(4)})`);
      }
    }
    
    // Lacuna 13: Update confusion matrix for this category
    if (!adamState.confusion[data.quantum_category]) {
      adamState.confusion[data.quantum_category] = { tp: 0, fp: 0, fn: 0, tn: 0 };
    }
    const cm = adamState.confusion[data.quantum_category];
    if (data.feedback === "positive") {
      cm.tp++; // True positive: relevant result correctly identified
    } else {
      cm.fp++; // False positive: irrelevant result was shown
    }
    
    // Lacuna 13: Compute precision/recall for this category
    const precision = cm.tp / Math.max(cm.tp + cm.fp, 1);
    const recall = cm.tp / Math.max(cm.tp + cm.fn, 1);
    const f1 = 2 * precision * recall / Math.max(precision + recall, 1e-8);
    
    // ═══ ICMC-USP Fase 2 Gap 1: Treinamento dos Layer Weights do QNN ═══
    // "Os pesos das conexões das camadas internas vão sendo modificados conforme o erro é retropropagado"
    // Parameter-Shift Gradient para cada peso de cada camada do QNN
    const currentLayerWeights = adamState.layerWeights || getDefaultLayerWeights();
    const layerη = η * 0.5; // taxa menor para estabilidade dos layer weights
    
    for (let layer = 0; layer < currentLayerWeights.length; layer++) {
      for (let wi = 0; wi < currentLayerWeights[layer].length; wi++) {
        const paramKey = `qnn_L${layer}_w${wi}`;
        const shift = Math.PI / 2;
        
        // f(θ + π/2)
        const weightsPlus = currentLayerWeights.map(l => [...l]);
        weightsPlus[layer][wi] += shift / Math.PI;
        const scorePlus = multiLayerQNNScore(heads, weightsPlus);
        
        // f(θ - π/2)
        const weightsMinus = currentLayerWeights.map(l => [...l]);
        weightsMinus[layer][wi] -= shift / Math.PI;
        const scoreMinus = multiLayerQNNScore(heads, weightsMinus);
        
        // ∂f/∂θ = [f(θ+π/2) - f(θ-π/2)] / 2
        let qnnGradient = (scorePlus - scoreMinus) / 2;
        qnnGradient = Math.max(-1.0, Math.min(1.0, qnnGradient));
        
        // Direction: positive feedback → increase score, negative → decrease
        const qnnDirection = data.feedback === "positive" ? 1 : -1;
        
        // Adam update for this QNN weight
        const prevMq = adamState.m[paramKey] || 0;
        const prevVq = adamState.v[paramKey] || 0;
        const newMq = β1 * prevMq + (1 - β1) * qnnGradient;
        const newVq = β2 * prevVq + (1 - β2) * qnnGradient * qnnGradient;
        adamState.m[paramKey] = newMq;
        adamState.v[paramKey] = newVq;
        
        const mHatQ = newMq / (1 - Math.pow(β1, adamState.iteration));
        const vHatQ = newVq / (1 - Math.pow(β2, adamState.iteration));
        const qnnDelta = layerη * qnnDirection * mHatQ / (Math.sqrt(vHatQ) + ε);
        currentLayerWeights[layer][wi] = Math.max(0.1, Math.min(2.0, currentLayerWeights[layer][wi] + qnnDelta));
      }
    }
    adamState.layerWeights = currentLayerWeights;
    
    // ═══ v16 Deep Learning: Update BatchNorm gamma/beta parameters ═══
    if (!adamState.batchNormParams) {
      adamState.batchNormParams = {
        gamma: [1.0, 1.0, 1.0],  // one per layer
        beta: [0.0, 0.0, 0.0],
      };
    }
    if (shouldApplyUpdate) {
      const bnη = η * 0.1; // smaller LR for BN params
      for (let layer = 0; layer < adamState.batchNormParams.gamma.length; layer++) {
        // Adjust gamma toward 1.0 (stabilizing), beta toward loss gradient direction
        const bnDirection = data.feedback === "positive" ? 1 : -1;
        adamState.batchNormParams.gamma[layer] += bnη * bnDirection * 0.01;
        adamState.batchNormParams.gamma[layer] = Math.max(0.5, Math.min(2.0, adamState.batchNormParams.gamma[layer]));
        adamState.batchNormParams.beta[layer] += bnη * bnDirection * 0.005;
        adamState.batchNormParams.beta[layer] = Math.max(-0.5, Math.min(0.5, adamState.batchNormParams.beta[layer]));
      }
      console.log(`🔬 v16 BatchNorm: γ=[${adamState.batchNormParams.gamma.map(g => g.toFixed(3)).join(",")}], β=[${adamState.batchNormParams.beta.map(b => b.toFixed(3)).join(",")}]`);
    }
    // ═══ v12 DBN: Kalman Filter for global attention head weights ═══
    // Smooth evolution of head weights using Bayesian state estimation
    if (!adamState.kalman) adamState.kalman = {};
    const headOrder6 = ["semantic", "keyword", "authority", "recency", "jurisdiction", "depth"];
    const kalmanConfig: KalmanConfig = {
      processNoise: 0.001,        // Q: small drift expected
      measurementNoise: data.feedback === "positive" ? 0.05 : 0.15, // R: negative feedback is noisier
    };
    
    for (let j = 0; j < headOrder6.length; j++) {
      const headName = headOrder6[j];
      const kalmanKey = `global_${headName}`;
      const currentKalman = adamState.kalman[kalmanKey] || { estimate: cat.weights[j] || 0, variance: 0.1 };
      const measurement = heads[headName] || 0;
      const direction = data.feedback === "positive" ? 1 : -1;
      const adjustedMeasurement = currentKalman.estimate + direction * 0.1 * measurement;
      
      const updated = kalmanWeightUpdate(currentKalman, adjustedMeasurement, kalmanConfig);
      adamState.kalman[kalmanKey] = updated;
    }
    console.log(`📐 Kalman v12: ${headOrder6.length} head weights smoothed (Q=${kalmanConfig.processNoise}, R=${kalmanConfig.measurementNoise})`);
    
    // ═══ v13 RL Module 3: Q-Learning Update (Mitchell Ch.13) ═══
    if (!adamState.qTable) adamState.qTable = {};
    if (!adamState.lastAction) adamState.lastAction = {};
    
    const queryType = detectQueryType(data.query);
    const stateKey = getQStateKey(data.quantum_category, queryType);
    const lastAction = adamState.lastAction[stateKey] || "balanced";
    const qReward = data.feedback === "positive" ? 1.0 : -0.5;
    
    // Next state = same area, same type (delayed update)
    qLearningUpdate(adamState.qTable, stateKey, lastAction, qReward, stateKey);
    
    console.log(`🎯 Q-Learning v13: state="${stateKey}" action="${lastAction}" reward=${qReward} Q=${adamState.qTable[stateKey]?.[lastAction]?.value?.toFixed(3) || 0}`);
    
    // ═══ v13: TD Error log ═══
    console.log(`📊 TD v13: δ=${tdError.toFixed(4)}, V(${data.quantum_category})=${adamState.vEstimates?.[data.quantum_category]?.toFixed(3)}, modulation=${tdModulation.toFixed(3)}`);
    
    // ═══ v14 Neuro Module 2: Edelman Neural Group Selection (Nobel 1972) ═══
    // Identify top-2 heads as a "neural group" and reinforce their co-activation synapse
    if (!adamState.synapticReinforcement) adamState.synapticReinforcement = {};
    const headEntries = Object.entries(heads).sort((a, b) => b[1] - a[1]);
    if (headEntries.length >= 2) {
      const [topHead1] = headEntries[0];
      const [topHead2] = headEntries[1];
      const synapseKey = [topHead1, topHead2].sort().join("__");
      const currentSynapse = adamState.synapticReinforcement[synapseKey] || 0;
      
      if (data.feedback === "positive") {
        // Reinforce the neural group: co-occurring heads that produce good results
        adamState.synapticReinforcement[synapseKey] = Math.min(1.0, currentSynapse + 0.05);
      } else {
        // Weaken the group, but gently (individual heads survive)
        adamState.synapticReinforcement[synapseKey] = Math.max(0, currentSynapse - 0.02);
      }
      
      // Also reinforce 3rd head if close to 2nd
      if (headEntries.length >= 3 && headEntries[2][1] > headEntries[1][1] * 0.8) {
        const [topHead3] = headEntries[2];
        const synapseKey2 = [topHead1, topHead3].sort().join("__");
        const syn2 = adamState.synapticReinforcement[synapseKey2] || 0;
        if (data.feedback === "positive") {
          adamState.synapticReinforcement[synapseKey2] = Math.min(1.0, syn2 + 0.03);
        }
      }
      
      // ═══ v15 Module 1a: Passive Synaptic Decay (Morais 2020 — desuso gradativo) ═══
      // Synapses NOT activated in this feedback decay by 0.5%
      const activatedSynapseKeys = new Set<string>();
      activatedSynapseKeys.add(synapseKey);
      if (headEntries.length >= 3 && headEntries[2][1] > headEntries[1][1] * 0.8) {
        const [topHead3] = headEntries[2];
        activatedSynapseKeys.add([topHead1, topHead3].sort().join("__"));
      }
      for (const [sKey, sVal] of Object.entries(adamState.synapticReinforcement)) {
        if (!activatedSynapseKeys.has(sKey)) {
          adamState.synapticReinforcement[sKey] = sVal * 0.995; // 0.5% decay per disuse
        }
      }
      
      console.log(`🧬 v14 Edelman: group=[${topHead1},${topHead2}] synapse=${adamState.synapticReinforcement[synapseKey]?.toFixed(3)}`);
    }
    
    // ═══ v15 Module 1b: Synaptic Pruning (Morais 2020) ═══
    // "o desuso da informação pode ocasionar enfraquecimento das vias neuronais"
    // Every 50 feedbacks, prune insignificant synapses and dead traces
    if (adamState.iteration % 50 === 0 && adamState.iteration > 0) {
      let prunedSynapses = 0;
      let prunedTraces = 0;
      
      // Prune weak synaptic reinforcements
      if (adamState.synapticReinforcement) {
        for (const [sKey, sVal] of Object.entries(adamState.synapticReinforcement)) {
          if (sVal < 0.02) {
            delete adamState.synapticReinforcement[sKey];
            prunedSynapses++;
          }
        }
      }
      
      // Prune dead eligibility traces
      if (adamState.eligibilityTraces) {
        for (const [tKey, tVal] of Object.entries(adamState.eligibilityTraces)) {
          if (Math.abs(tVal) < 0.01) {
            delete adamState.eligibilityTraces[tKey];
            prunedTraces++;
          }
        }
      }
      
      if (prunedSynapses > 0 || prunedTraces > 0) {
        console.log(`✂️ v15 Synaptic Pruning: removed ${prunedSynapses} synapses (<0.02) and ${prunedTraces} traces (<0.01) at iteration ${adamState.iteration}`);
      }
    }
    
    // ═══ v14 Neuro Module 4: Memory Consolidation Short→Long Term (Tall 1999) ═══
    if (!adamState.memoryConsolidation) {
      adamState.memoryConsolidation = {
        shortTermWeights: {},
        longTermWeights: {},
        feedbackCount: {},
        negativeStreak: {},
      };
    }
    const memCon = adamState.memoryConsolidation;
    
    for (let j = 0; j < headOrder.length; j++) {
      const wKey = `${data.quantum_category}_${headOrder[j]}`;
      const currentWeight = cat.weights[j];
      const prevShort = memCon.shortTermWeights[wKey];
      
      // Track short-term weight
      memCon.shortTermWeights[wKey] = currentWeight;
      
      if (prevShort !== undefined) {
        const drift = Math.abs(currentWeight - prevShort);
        
        if (drift < 0.1 * Math.abs(prevShort || 0.1)) {
          // Weight is stable (within ±10%) — increment consolidation counter
          memCon.feedbackCount[wKey] = (memCon.feedbackCount[wKey] || 0) + 1;
          
          // Consolidation threshold: 20 consecutive stable feedbacks
          if ((memCon.feedbackCount[wKey] || 0) >= 20 && !memCon.longTermWeights[wKey]) {
            memCon.longTermWeights[wKey] = currentWeight;
            console.log(`🧠 v14 Memory Consolidated: ${wKey} = ${currentWeight.toFixed(4)} (myelinated after 20 stable feedbacks)`);
          }
        } else {
          // Unstable — reset counter
          memCon.feedbackCount[wKey] = 0;
        }
      }
      
      // Reconsolidation: 5 consecutive negative feedbacks → revert to short-term
      if (data.feedback === "negative") {
        memCon.negativeStreak[wKey] = (memCon.negativeStreak[wKey] || 0) + 1;
        if ((memCon.negativeStreak[wKey] || 0) >= 5 && memCon.longTermWeights[wKey] !== undefined) {
          delete memCon.longTermWeights[wKey];
          memCon.feedbackCount[wKey] = 0;
          console.log(`🔄 v14 Reconsolidation: ${wKey} returned to short-term (5 consecutive negatives)`);
        }
      } else {
        memCon.negativeStreak[wKey] = 0;
      }
      
      // Apply memory consolidation: effectiveWeight = 0.7*longTerm + 0.3*shortTerm
      if (memCon.longTermWeights[wKey] !== undefined) {
        const effectiveWeight = 0.7 * memCon.longTermWeights[wKey] + 0.3 * currentWeight;
        cat.weights[j] = Math.max(-1, Math.min(1, effectiveWeight));
      }
    }
    
    // Save adjusted weights, Adam state (with TD + traces + Q-table + Kalman + v14 neuro), and category weights
    await Promise.all([
      saveQuantumCategoryWeights(supabase, categories, f1),
      saveAdamState(supabase, adamState),
    ]);
    
    // Record feedback with comprehensive metrics
    await supabase.from("neural_learning_data").insert({
      input_text: data.query,
      output_text: JSON.stringify({ result_id: data.result_id, category: data.quantum_category, feedback: data.feedback }),
      interaction_type: "quantum_feedback",
      quality_score: data.feedback === "positive" ? 1.0 : 0.0,
      metadata: {
        attention_heads: heads,
        category: data.quantum_category,
        loss,
        bce_loss: bceLoss,
        multi_class_loss: multiClassLoss,
        td_error: tdError,
        td_modulation: tdModulation,
        v_estimate: adamState.vEstimates?.[data.quantum_category],
        q_state: stateKey,
        q_action: lastAction,
        q_value: adamState.qTable[stateKey]?.[lastAction]?.value,
        learning_rate: η,
        adam_iteration: adamState.iteration,
        optimizer: "adam+kalman+td+ql+neuro_v15",
        emotional_intensity: emotionalIntensity,
        lr_modulator: lrModulator,
        β1, β2,
        confusion_matrix: cm,
        precision, recall, f1,
        parameter_shift: catIdx === 0,
        edelman_synapses: Object.keys(adamState.synapticReinforcement || {}).length,
        consolidated_weights: Object.keys(memCon.longTermWeights).length,
        kalman_states: Object.fromEntries(
          headOrder6.map(h => [h, adamState.kalman?.[`global_${h}`]?.variance?.toFixed(4) || "n/a"])
        ),
      },
      learned: data.feedback === "positive",
    });
    
    console.log(`⚛️ v15 Neuro+Adam+TD+QL: ${data.quantum_category} (loss=${loss.toFixed(4)}, δ=${tdError.toFixed(3)}, η=${η.toFixed(5)}, emot=${lrModulator.toFixed(2)}x, P=${precision.toFixed(2)}, R=${recall.toFixed(2)}, F1=${f1.toFixed(2)}, synapses=${Object.keys(adamState.synapticReinforcement || {}).length}, consolidated=${Object.keys(memCon.longTermWeights).length}, iter=${adamState.iteration})`);
    return { success: true, weights_adjusted: true, loss, confusion_update: { precision, recall, f1 } };
  } catch (err) {
    console.error("Search feedback error:", err);
    return { success: false, weights_adjusted: false };
  }
}

// ─── A/B Testing ───
function abTestScoring(
  results: any[],
  query: string,
  attentionWeights: AttentionWeights
): { sigmoid_results: any[]; quantum_results: any[]; comparison: Record<string, number> } {
  const sigmoidResults = results.map(r => {
    const heads = r.attention_heads || {};
    let score = 0;
    for (const head of attentionWeights.heads) {
      score += head.weight * (heads[head.name] || 0);
    }
    return { ...r, ab_score: score, ab_group: "sigmoid" };
  });
  const quantumResults = results.map(r => {
    const heads = r.attention_heads || {};
    let score = 0;
    for (const head of attentionWeights.heads) {
      score += head.weight * (heads[head.name] || 0);
    }
    const { compatibility } = quantumInspiredClassify(heads, query);
    score *= (1.0 + 0.3 * compatibility);
    return { ...r, ab_score: score, ab_group: "quantum" };
  });
  const sigTop5 = [...sigmoidResults].sort((a, b) => b.ab_score - a.ab_score).slice(0, 5);
  const qTop5 = [...quantumResults].sort((a, b) => b.ab_score - a.ab_score).slice(0, 5);
  let concordant = 0, discordant = 0;
  for (let i = 0; i < Math.min(sigTop5.length, qTop5.length); i++) {
    if (sigTop5[i].id === qTop5[i].id) concordant++;
    else discordant++;
  }
  const avgSigmoidScore = sigmoidResults.reduce((s, r) => s + r.ab_score, 0) / Math.max(sigmoidResults.length, 1);
  const avgQuantumScore = quantumResults.reduce((s, r) => s + r.ab_score, 0) / Math.max(quantumResults.length, 1);
  return {
    sigmoid_results: sigTop5,
    quantum_results: qTop5,
    comparison: {
      rank_agreement: concordant / Math.max(concordant + discordant, 1),
      avg_sigmoid_score: avgSigmoidScore,
      avg_quantum_score: avgQuantumScore,
      quantum_lift: avgQuantumScore > 0 ? (avgQuantumScore - avgSigmoidScore) / avgSigmoidScore : 0,
    },
  };
}

function multiHeadAttentionScore(
  result: any,
  query: string,
  weights: AttentionWeights
): { finalScore: number; headScores: Record<string, number> } {
  const headScores = computeHeadScores(result, query, weights);
  // Lacuna 4+5: Apply activation + bias
  let preActivation = weights.globalBias || 0.1;
  const rawWeights = weights.heads.map(h => h.weight);
  const smWeights = softmax(rawWeights);
  for (let i = 0; i < weights.heads.length; i++) {
    const head = weights.heads[i];
    const activated = relu(headScores[head.name] || 0);
    preActivation += smWeights[i] * activated + (head.bias || 0);
  }
  const finalScore = sigmoid((preActivation - 0.5) * 4);
  return { finalScore, headScores };
}

function computeAuthorityScore(source: string): number {
  const authorityMap: Record<string, number> = {
    "stf": 1.0, "datajud_stj": 1.0, "datajud_tst": 1.0, "datajud_tse": 1.0, "cnj": 1.0,
    "lexml": 0.85, "camara": 0.85, "senado_legislacao": 0.85,
    "freelaw": 0.7, "courtlistener_dockets": 0.7,
    "google_books": 0.5, "knowledge_graph": 0.5,
  };
  return authorityMap[source] || 0.4;
}

// ─── Document Feedback Boost: prioritize sources from well-rated documents ───
async function loadDocumentFeedbackBoosts(supabase: any): Promise<Record<string, number>> {
  const boosts: Record<string, number> = {};
  try {
    const { data } = await supabase
      .from("neural_learning_data")
      .select("metadata, quality_score")
      .in("interaction_type", ["document_generation", "document_feedback"])
      .gte("quality_score", 0.7)
      .order("quality_score", { ascending: false })
      .limit(50);

    if (data) {
      // Count high-quality documents per source/tipo to boost those sources in search
      const tipoCounts: Record<string, { count: number; avgScore: number }> = {};
      for (const d of data) {
        const meta = (d.metadata as Record<string, any>) || {};
        const tipo = meta.tipo || meta.documentType;
        if (tipo) {
          if (!tipoCounts[tipo]) tipoCounts[tipo] = { count: 0, avgScore: 0 };
          tipoCounts[tipo].count++;
          tipoCounts[tipo].avgScore += Number(d.quality_score) || 0;
        }
      }
      // Normalize: types with more approved docs get higher boosts (max 0.15)
      const maxCount = Math.max(...Object.values(tipoCounts).map(v => v.count), 1);
      for (const [tipo, stats] of Object.entries(tipoCounts)) {
        boosts[tipo] = Math.min(0.15, (stats.count / maxCount) * 0.15);
      }
    }
  } catch (err) {
    console.warn("Failed to load document feedback boosts:", err);
  }
  return boosts;
}

// ─── Auto-Evolution: Load learned weights from DB ───
async function loadLearnedWeights(supabase: any): Promise<AttentionWeights | null> {
  try {
    const { data } = await supabase
      .from("neural_specializations")
      .select("prompts")
      .eq("name", "Multi-Head Attention Weights")
      .eq("is_active", true)
      .maybeSingle();
    if (data?.prompts?.attention_weights) {
      const aw = data.prompts.attention_weights as any;
      // Ensure heads have bias field (backward compat)
      if (aw.heads) {
        aw.heads = aw.heads.map((h: any) => ({ ...h, bias: h.bias || 0 }));
      }
      if (aw.globalBias === undefined) aw.globalBias = 0.1;
      return aw as AttentionWeights;
    }
  } catch {}
  return null;
}

// ─── Record attention data ───
async function recordAttentionData(
  supabase: any,
  query: string,
  topResults: any[],
  weights: AttentionWeights
): Promise<void> {
  try {
    const attentionSnapshot = topResults.slice(0, 5).map((r: any) => ({
      id: r.id,
      title: r.title?.substring(0, 100),
      headScores: r.attention_heads,
      finalScore: r.multi_head_score,
    }));
    await supabase.from("neural_learning_data").insert({
      input_text: query,
      output_text: JSON.stringify(attentionSnapshot),
      interaction_type: "multi_head_attention",
      metadata: {
        weights_version: weights.version,
        result_count: topResults.length,
        heads: weights.heads.map(h => ({ name: h.name, weight: h.weight, bias: h.bias })),
        globalBias: weights.globalBias,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn("Failed to record attention data:", err);
  }
}

// Track keys that returned 400 (invalid/expired)
const badKeys = new Set<string>();

function getOpenAIKeys(): string[] {
  return [
    Deno.env.get("OPENAI_API_KEY"),
    Deno.env.get("OPENAI_API_KEY_2"),
  ].filter((k): k is string => Boolean(k) && !badKeys.has(k));
}

function getGeminiKeys(): string[] {
  return [
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
    Deno.env.get("GEMINI_API_KEY"),
  ].filter((k): k is string => Boolean(k) && !badKeys.has(k));
}

let keyIndex = 0;
function getNextGeminiKey(): string {
  const keys = getGeminiKeys();
  if (keys.length === 0) throw new Error("No GEMINI_API_KEY configured");
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return key;
}

// ─── Dynamic AI Provider Routing (from ai_providers table) ───
interface AIProvider {
  provider_name: string;
  is_enabled: boolean;
  priority: number;
  use_for: string[];
  fallback_to: string | null;
}

let cachedProviders: AIProvider[] | null = null;
let providersCacheTime = 0;

async function loadEnabledProviders(supabase: any): Promise<AIProvider[]> {
  // Cache for 5 minutes
  if (cachedProviders && Date.now() - providersCacheTime < 300000) return cachedProviders;
  try {
    const { data } = await supabase
      .from("ai_providers")
      .select("provider_name, is_enabled, priority, use_for, fallback_to")
      .eq("is_enabled", true)
      .order("priority", { ascending: true });
    cachedProviders = (data || []) as AIProvider[];
    providersCacheTime = Date.now();
    return cachedProviders;
  } catch {
    return cachedProviders || [];
  }
}

function getProvidersForUseCase(providers: AIProvider[], useCase: string): AIProvider[] {
  return providers.filter(p => {
    const uses = p.use_for as unknown;
    if (Array.isArray(uses)) return uses.includes(useCase);
    return true;
  });
}

// Generic LLM call that routes through enabled providers in priority order
async function callLLM(
  supabase: any,
  prompt: string,
  useCase: "search" | "chat" | "documents",
  options: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {}
): Promise<string> {
  const { maxTokens = 200, temperature = 0.2, timeoutMs = 8000 } = options;
  const providers = await loadEnabledProviders(supabase);
  const ordered = getProvidersForUseCase(providers, useCase);
  
  if (ordered.length === 0) {
    // Fallback: try all known providers
    ordered.push(
      { provider_name: "groq", is_enabled: true, priority: 1, use_for: [useCase], fallback_to: "openai" },
      { provider_name: "openai", is_enabled: true, priority: 2, use_for: [useCase], fallback_to: "anthropic" },
      { provider_name: "anthropic", is_enabled: true, priority: 3, use_for: [useCase], fallback_to: null },
    );
  }

  const errors: string[] = [];

  for (const provider of ordered) {
    try {
      const result = await callProviderLLM(provider.provider_name, prompt, { maxTokens, temperature, timeoutMs });
      if (result) return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.provider_name}: ${msg}`);
      console.warn(`⚠️ LLM ${provider.provider_name} failed: ${msg}`);
    }
  }

  // Last resort: try Gemini even if disabled (for backward compat with existing keys)
  if (!ordered.some(p => p.provider_name === "gemini")) {
    try {
      const result = await callProviderLLM("gemini", prompt, { maxTokens, temperature, timeoutMs });
      if (result) return result;
    } catch {}
  }

  throw new Error(`All LLM providers failed: ${errors.join("; ")}`);
}

async function callProviderLLM(
  providerName: string,
  prompt: string,
  opts: { maxTokens: number; temperature: number; timeoutMs: number }
): Promise<string | null> {
  switch (providerName) {
    case "groq": {
      const key = Deno.env.get("GROQ_API_KEY");
      if (!key) throw new Error("No GROQ_API_KEY");
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(opts.timeoutMs),
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: opts.maxTokens,
          temperature: opts.temperature,
        }),
      });
      if (!resp.ok) throw new Error(`Groq [${resp.status}]`);
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || null;
    }
    case "openai": {
      const keys = getOpenAIKeys();
      if (!keys.length) throw new Error("No OpenAI keys");
      for (const key of keys) {
        try {
          const resp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(opts.timeoutMs),
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              max_tokens: opts.maxTokens,
              temperature: opts.temperature,
            }),
          });
          if (!resp.ok) { if (resp.status === 400) badKeys.add(key); continue; }
          const data = await resp.json();
          return data.choices?.[0]?.message?.content || null;
        } catch { continue; }
      }
      throw new Error("All OpenAI keys failed");
    }
    case "anthropic": {
      const key = Deno.env.get("ANTHROPIC_API_KEY");
      if (!key) throw new Error("No ANTHROPIC_API_KEY");
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(opts.timeoutMs),
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: opts.maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!resp.ok) throw new Error(`Anthropic [${resp.status}]`);
      const data = await resp.json();
      return data.content?.[0]?.text || null;
    }
    case "gemini": {
      const keys = getGeminiKeys();
      if (!keys.length) throw new Error("No Gemini keys");
      for (const key of keys) {
        try {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(opts.timeoutMs),
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: opts.temperature, maxOutputTokens: opts.maxTokens },
              }),
            }
          );
          if (!resp.ok) { await resp.text(); continue; }
          const data = await resp.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch { continue; }
      }
      throw new Error("All Gemini keys failed");
    }
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

// ─── Smart Legal Chunking ───
function smartLegalChunk(text: string, maxChunkSize = 1500): string[] {
  if (text.length <= maxChunkSize) return [text];
  const chunks: string[] = [];
  const legalBoundaries = /(?=\n\s*(?:Art\.\s*\d|§\s*\d|Parágrafo|CAPÍTULO|SEÇÃO|TÍTULO|CLÁUSULA|Inciso|Alínea|I{1,3}V?\s*[-–]|V?I{0,3}\s*[-–]|\d+[.)]\s|[a-z]\)\s))/gi;
  const sections = text.split(legalBoundaries).filter((s) => s.trim().length > 0);
  let currentChunk = "";
  for (const section of sections) {
    if ((currentChunk + section).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = section;
    } else {
      currentChunk += section;
    }
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  if (chunks.length <= 1 && text.length > maxChunkSize) {
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const fallbackChunks: string[] = [];
    let current = "";
    for (const para of paragraphs) {
      if ((current + "\n\n" + para).length > maxChunkSize && current.length > 0) {
        fallbackChunks.push(current.trim());
        current = para;
      } else {
        current += (current ? "\n\n" : "") + para;
      }
    }
    if (current.trim().length > 0) fallbackChunks.push(current.trim());
    return fallbackChunks.length > 0 ? fallbackChunks : [text.substring(0, maxChunkSize)];
  }
  return chunks.length > 0 ? chunks : [text.substring(0, maxChunkSize)];
}

function hashQuery(query: string): string {
  let hash = 0;
  const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `q_${Math.abs(hash).toString(36)}`;
}

// ─── Cache Layer ───
async function getCachedResults(supabase: any, queryHash: string, source: string): Promise<any[] | null> {
  try {
    const { data, error } = await supabase.from("api_cache").select("response_data, id, hit_count").eq("query_hash", queryHash).eq("source", source).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (error || !data) return null;
    supabase.from("api_cache").update({ hit_count: (data.hit_count || 0) + 1, last_hit_at: new Date().toISOString() }).eq("id", data.id).then(() => {});
    return data.response_data;
  } catch { return null; }
}

async function setCacheResults(supabase: any, queryHash: string, source: string, queryText: string, results: any[], ttlHours = 24): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    await supabase.from("api_cache").upsert({ query_hash: queryHash, source, query_text: queryText, response_data: results, result_count: results.length, expires_at: expiresAt, hit_count: 0 }, { onConflict: "query_hash,source" });
  } catch (err) { console.warn("Cache write error:", err); }
}

async function getCachedEmbedding(supabase: any, queryHash: string): Promise<number[] | null> {
  try {
    const { data, error } = await supabase.from("query_embedding_cache").select("embedding, id, hit_count").eq("query_hash", queryHash).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (error || !data || !data.embedding) return null;
    supabase.from("query_embedding_cache").update({ hit_count: (data.hit_count || 0) + 1, last_hit_at: new Date().toISOString() }).eq("id", data.id).then(() => {});
    if (typeof data.embedding === "string") return JSON.parse(data.embedding.replace(/^\[/, "[").replace(/\]$/, "]"));
    return data.embedding;
  } catch { return null; }
}

async function setCachedEmbedding(supabase: any, queryHash: string, queryText: string, embedding: number[]): Promise<void> {
  try {
    await supabase.from("query_embedding_cache").upsert({ query_hash: queryHash, query_text: queryText, embedding: `[${embedding.join(",")}]`, task_type: "RETRIEVAL_QUERY", expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), hit_count: 0 }, { onConflict: "query_hash" });
  } catch (err) { console.warn("Embedding cache write error:", err); }
}

// ─── Query Expansion (dynamic provider routing) ───
async function expandQuery(query: string, previousContext?: string, supabaseClient?: any): Promise<string[]> {
  const contextBlock = previousContext ? `\nCONTEXTO DA BUSCA ANTERIOR (follow-up): ${previousContext}\nUse o contexto acima para enriquecer a expansão.\n` : "";
  const prompt = `Dado a query jurídica brasileira: "${query}"\n${contextBlock}\nGere 3 queries alternativas/expandidas que capturem sinônimos, termos técnicos relacionados e variações semânticas.\n\nResponda APENAS com um JSON array de strings, sem markdown:\n["query1", "query2", "query3"]`;
  try {
    const text = await callLLM(supabaseClient, prompt, "search", { maxTokens: 200, temperature: 0.2, timeoutMs: 5000 });
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const expanded = JSON.parse(match[0]) as string[];
      return [query, ...expanded.slice(0, 3)];
    }
  } catch (err) { console.warn("Query expansion failed:", err); }
  return [query];
}

// ─── Embedding Generation ───
async function generateEmbedding(text: string, retryCount = 0): Promise<number[]> {
  const truncated = text.substring(0, 8000);
  const keys = getOpenAIKeys();
  const MAX_RETRIES = 2;
  for (const key of keys) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: truncated, dimensions: EMBEDDING_DIMS }),
      });
      if (!response.ok) {
        const status = response.status;
        await response.text();
        if (status === 400) { badKeys.add(key); continue; }
        if (status === 429 && retryCount < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, retryCount)));
          return generateEmbedding(text, retryCount + 1);
        }
        continue;
      }
      const data = await response.json();
      return data?.data?.[0]?.embedding || [];
    } catch (err) { console.warn(`Embedding error: ${err}`); }
  }
  throw new Error("All OpenAI keys exhausted for embedding");
}

async function generateQueryEmbeddingCached(supabase: any, query: string): Promise<{ embedding: number[]; cached: boolean }> {
  const qHash = hashQuery(query);
  const cached = await getCachedEmbedding(supabase, qHash);
  if (cached && cached.length === EMBEDDING_DIMS) return { embedding: cached, cached: true };
  const keys = getOpenAIKeys();
  for (const key of keys) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: query, dimensions: EMBEDDING_DIMS }),
      });
      if (!response.ok) { if (response.status === 400) badKeys.add(key); await response.text(); continue; }
      const data = await response.json();
      const embedding = data?.data?.[0]?.embedding || [];
      if (embedding.length > 0) { setCachedEmbedding(supabase, qHash, query, embedding); return { embedding, cached: false }; }
    } catch { continue; }
  }
  throw new Error("All OpenAI keys exhausted for query embedding");
}

async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 5;
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await Promise.all(batch.map((text) => generateEmbedding(text)));
    results.push(...embeddings);
    if (i + BATCH_SIZE < texts.length) await new Promise((r) => setTimeout(r, 500));
  }
  return results;
}

// ─── Index with Smart Chunking ───
interface IndexItem {
  title: string; content: string; source: string; sourceLabel: string; contentType: string;
  url?: string; publishedDate?: string; metadata?: Record<string, unknown>;
}

// ─── Filter out placeholder/template content that pollutes search ───
function isPlaceholderContent(title: string, content: string): boolean {
  const t = (title + " " + content).toLowerCase();
  const placeholderPatterns = [
    /^pesquise\s/i,
    /^busque\s/i,
    /^estatísticas\s/i,
    /^estatisticas\s/i,
    /pesquise\s+(normas|acórdãos|decisões|livros|entidades|súmulas)/i,
    /busque\s+(decisões|acórdãos|súmulas|livros)/i,
    /o portal retorna ementas completas/i,
    /pesquise entidades relacionadas/i,
    /pesquise livros jurídicos sobre/i,
    /inclui dados de produtividade, tempo de tramitação/i,
  ];
  if (placeholderPatterns.some(p => p.test(content))) return true;
  if (placeholderPatterns.some(p => p.test(title))) return true;
  // Reject very short content that is just a template
  if (content.length < 80 && /^(legislação|jurisprudência|acórdãos|súmulas|livros|entidades|justiça em números):/i.test(title)) return true;
  return false;
}

async function indexResults(supabase: any, items: IndexItem[], queryOrigin: string): Promise<number> {
  // Filter out placeholder/template content before indexing
  const validItems = items.filter(item => !isPlaceholderContent(item.title, item.content));
  const limitedItems = validItems.slice(0, 8);
  if (limitedItems.length === 0) return 0;
  const expandedItems: { item: IndexItem; chunkText: string; chunkIndex: number }[] = [];
  for (const item of limitedItems) {
    const fullText = `${item.title}. ${item.content}`;
    const chunks = smartLegalChunk(fullText, 1500);
    chunks.forEach((chunk, idx) => { expandedItems.push({ item, chunkText: chunk, chunkIndex: idx }); });
  }
  const textsToEmbed = expandedItems.map((e) => e.chunkText.substring(0, 2000));
  const embeddings = await generateBatchEmbeddings(textsToEmbed);
  const titles = [...new Set(expandedItems.map((e) => e.item.title))];
  const { data: existing } = await supabase.from("legal_embeddings").select("title, source").in("title", titles);
  const existingSet = new Set((existing || []).map((e: any) => `${e.title}::${e.source}`));
  const newItems = expandedItems
    .map((expanded, idx) => {
      const { item, chunkIndex } = expanded;
      const chunkTitle = chunkIndex > 0 ? `${item.title} (parte ${chunkIndex + 1})` : item.title;
      return {
        title: chunkTitle, content: expanded.chunkText.substring(0, 5000), source: item.source, source_label: item.sourceLabel,
        content_type: item.contentType, url: item.url || null, published_date: item.publishedDate || null,
        metadata: { ...(item.metadata || {}), chunk_index: chunkIndex, total_chunks: expandedItems.filter((e) => e.item === item).length },
        embedding: `[${embeddings[idx].join(",")}]`, query_origin: queryOrigin,
      };
    })
    .filter((item) => !existingSet.has(`${item.title}::${item.source}`));
  if (newItems.length === 0) return 0;
  const INSERT_BATCH = 50;
  let totalInserted = 0;
  for (let i = 0; i < newItems.length; i += INSERT_BATCH) {
    const batch = newItems.slice(i, i + INSERT_BATCH);
    const { error } = await supabase.from("legal_embeddings").insert(batch);
    if (error) console.error("Index insert error:", error);
    else totalInserted += batch.length;
  }
  return totalInserted;
}

// ─── Hybrid Search v3 (keyword + vector) ───
async function semanticSearchV3(
  supabase: any, queryEmbedding: number[], queryText: string,
  options: { matchThreshold?: number; matchCount?: number; filterSource?: string; filterType?: string; filterSources?: string[]; filterDateFrom?: string; filterDateTo?: string; } = {}
): Promise<any[]> {
  const { matchThreshold = 0.3, matchCount = 20, filterSource, filterType, filterSources, filterDateFrom, filterDateTo } = options;
  const safeMC = Math.min(matchCount, 20);

  // Primary: hybrid search (vector + keyword via tsvector, with authority + recency)
  try {
    const { data, error } = await supabase.rpc("hybrid_search_legal_v3", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      query_text: queryText,
      match_count: safeMC,
      semantic_weight: 0.55,
      keyword_weight: 0.25,
      authority_weight: 0.10,
      recency_weight: 0.10,
      filter_source: filterSource || null,
      filter_type: filterType || null,
      filter_sources: filterSources || null,
      filter_date_from: filterDateFrom || null,
      filter_date_to: filterDateTo || null,
    });
    if (!error && data?.length) {
      console.log(`✅ Hybrid search v3 returned ${data.length} results (keyword+vector)`);
      return data;
    }
    if (error) console.warn("Hybrid v3 error:", error.message, "— falling back to vector search");
  } catch (e) { console.warn("Hybrid v3 exception:", e, "— falling back"); }

  // Fallback: pure vector search (HNSW index, fast)
  try {
    const { data, error } = await supabase.rpc("search_legal_embeddings", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      match_threshold: Math.max(matchThreshold - 0.1, 0.15),
      match_count: safeMC,
      filter_source: filterSource || null,
      filter_type: filterType || null,
    });
    if (!error && data?.length) {
      console.log(`✅ Fallback vector search returned ${data.length} results`);
      return data.map((r: any) => ({
        ...r,
        semantic_score: r.similarity || 0,
        keyword_score: 0,
        authority_score: computeAuthorityScore(r.source),
        recency_score: computeTemporalScore(r.published_date),
        combined_score: r.similarity || 0,
      }));
    }
    if (error) console.warn("Vector search error:", error.message);
  } catch (e) { console.warn("Vector search exception:", e); }

  return [];
}

// ─── Fetch from pesquisa-unificada ───
async function fetchFromUnifiedSearch(supabase: any, query: string): Promise<IndexItem[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !supabaseAnonKey) return [];
  const qHash = hashQuery(query);
  const cached = await getCachedResults(supabase, qHash, "pesquisa_unificada");
  if (cached) { console.log(`  📦 Cache HIT for unified search: ${cached.length} results`); return cached as IndexItem[]; }
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/pesquisa-unificada`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        query,
        sources: [
          "camara", "lexml", "stf", "cnj", "google_books", "knowledge_graph",
          "datajud_stj", "datajud_tst", "datajud_tse",
          "datajud_tjsp", "datajud_tjrj", "datajud_tjrs", "datajud_tjmg",
          "datajud_tjpr", "datajud_tjba", "datajud_tjpe", "datajud_tjsc",
          "datajud_tjce", "datajud_tjgo", "datajud_tjdft", "datajud_tjpa", "datajud_tjma",
          "datajud_trf1", "datajud_trf2", "datajud_trf3", "datajud_trf4", "datajud_trf5",
          "brasilapi", "oab_cna", "senado_legislacao", "catalogo_leis",
        ],
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const rawResults = (data.results || []).map((r: any) => ({
      title: r.title || "", content: r.description || "", source: r.source || "unknown",
      sourceLabel: r.sourceLabel || r.source || "Unknown", contentType: r.type || "lei",
      url: r.url || "", publishedDate: r.date || "", metadata: r.metadata || {},
    }));
    // Filter out placeholder/template results that don't contain real legal content
    const results = rawResults.filter((item: IndexItem) => !isPlaceholderContent(item.title, item.content));
    return results;
  } catch { return []; }
}

// ─── Cross-Encoder Reranking (dynamic provider routing) ───
async function crossEncoderRerank(query: string, results: any[], topK = 10, supabaseClient?: any): Promise<any[]> {
  if (results.length <= topK) return results;
  const candidates = results.slice(0, 25).map((r: any, i: number) => {
    const authorityLabel = r.authority_score >= 0.85 ? "⭐OFICIAL" : r.authority_score >= 0.7 ? "✓verificado" : "";
    const recencyLabel = r.recency_score >= 0.8 ? "🕐recente" : "";
    return `[${i}] (${r.source_label || r.source}) ${authorityLabel} ${recencyLabel}\n  Título: ${r.title}\n  Conteúdo: ${(r.content || "").substring(0, 200)}\n  Score: ${(r.multi_head_score || 0).toFixed(3)}`;
  }).join("\n\n");
  const prompt = `Você é um especialista em ranqueamento jurídico brasileiro.\n\nQUERY: "${query}"\n\nRanqueie por RELEVÂNCIA JURÍDICA:\n${candidates}\n\nResponda APENAS com os índices em ordem, separados por vírgula.`;
  try {
    const text = await callLLM(supabaseClient, prompt, "search", { maxTokens: 100, temperature: 0, timeoutMs: 6000 });
    const indices = text.match(/\d+/g)?.map(Number).filter((n: number) => n < results.length) || [];
    if (indices.length === 0) return results.slice(0, topK);
    const seen = new Set<number>();
    const reranked: any[] = [];
    for (const idx of indices) {
      if (!seen.has(idx) && idx < results.length) { seen.add(idx); reranked.push({ ...results[idx], rerank_position: reranked.length + 1 }); }
      if (reranked.length >= topK) break;
    }
    for (let i = 0; reranked.length < topK && i < results.length; i++) {
      if (!seen.has(i)) reranked.push({ ...results[i], rerank_position: reranked.length + 1 });
    }
    return reranked;
  } catch (err) { console.warn("Cross-encoder reranking failed:", err); return results.slice(0, topK); }
}

// ═══════════════════════════════════════
// URL Correction: Map tribunal sources to correct portals
// ═══════════════════════════════════════
function getProcessUrl(source: string, title: string, existingUrl: string): string {
  // ✅ PRIORITY 1: If we already have a valid, specific URL (not a generic search), keep it
  if (existingUrl && existingUrl.startsWith("http") && !existingUrl.includes("SearchableText=") && !existingUrl.includes("google.com/search")) {
    return existingUrl;
  }

  // Extract only digits (and format chars) from the title, removing stray leading dashes
  const rawNum = title.replace(/[^\d]/g, '').trim();
  const num = encodeURIComponent(rawNum || title);
  const tribunalUrlMap: Record<string, string> = {
    datajud_stj: `https://processo.stj.jus.br/processo/pesquisa/?termo=${num}&aplicacao=processos.ea&tipoPesquisa=tipoPesquisaGenerica`,
    datajud_tst: `https://consultaprocessual.tst.jus.br/consultaProcessual/consultaTstNumUnica.do?consulta=Consultar&conscsjt=&numeroTst=${num}`,
    datajud_tse: `https://www.tse.jus.br/servicos-judiciais/processos`,
    datajud_stm: `https://www.stm.jus.br/servicos-stm/pesquisa-de-jurisprudencia`,
    stf: `https://portal.stf.jus.br/processos/detalhe.asp?incidente=${num}`,
    stf_bigquery: `https://portal.stf.jus.br/processos/detalhe.asp?incidente=${num}`,
    datajud_trf1: `https://processual.trf1.jus.br/consultaProcessual/processo.php?proc=${num}`,
    datajud_trf2: `https://eproc.trf2.jus.br/eproc/externo_controlador.php?acao=processo_seleciona_publica&num_processo=${num}`,
    datajud_trf3: `https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam`,
    datajud_trf4: `https://www2.trf4.jus.br/trf4/controlador.php?acao=consulta_processual_resultado_pesquisa&txtValor=${num}`,
    datajud_trf5: `https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam`,
    datajud_trf6: `https://pje.trf6.jus.br/pje/ConsultaPublica/listView.seam`,
    datajud_tjsp: `https://esaj.tjsp.jus.br/cpopg/search.do?conversationId=&dadosConsulta.localPesquisa.cdLocal=-1&cbPesquisa=NUMPROC&dadosConsulta.tipoNuProcesso=UNIFICADO&numeroDigitoAnoUnificado=${num}`,
    datajud_tjrj: `https://www3.tjrj.jus.br/ejuris/ConsultarJurisprudencia.aspx`,
    datajud_tjrs: `https://www.tjrs.jus.br/novo/busca/?return=proc&client=wp_index&q=${num}`,
    datajud_tjmg: `https://www5.tjmg.jus.br/jurisprudencia/pesquisaPalavrasEspelhoAcordao.do?&numeroRegistro=1&totalLinhas=1&palavras=${num}`,
    datajud_tjpr: `https://portal.tjpr.jus.br/jurisprudencia/j/12/p/${num}`,
    datajud_tjsc: `https://busca.tjsc.jus.br/jurisprudencia/#resultado_ancora`,
    datajud_tjba: `https://esaj.tjba.jus.br/cpopg/open.do`,
    datajud_tjpe: `https://www.tjpe.jus.br/consultaprocessualunificada/processo/${num}`,
    datajud_tjce: `https://esaj.tjce.jus.br/cpopg/open.do`,
    datajud_tjgo: `https://www.tjgo.jus.br/jurisprudencia/`,
    datajud_tjdft: `https://pesquisajuris.tjdft.jus.br/IndexadorAcordaos-web/sistj`,
    datajud_tjmt: `https://servicos.tjmt.jus.br/consultaProcessual/`,
    datajud_tjms: `https://esaj.tjms.jus.br/cpopg/open.do`,
    datajud_tjma: `https://jurisconsult.tjma.jus.br/`,
    datajud_tjpa: `https://consultas.tjpa.jus.br/consultaprocessual/`,
    datajud_tjam: `https://consultasaj.tjam.jus.br/cpopg/open.do`,
    datajud_tjal: `https://www2.tjal.jus.br/cpopg/open.do`,
    datajud_tjpi: `https://www.tjpi.jus.br/e-tjpi/home`,
    datajud_tjrn: `https://esaj.tjrn.jus.br/cpopg/open.do`,
    datajud_tjse: `https://www.tjse.jus.br/portal/consultas/consulta-processual`,
    datajud_tjes: `https://sistemas.tjes.jus.br/consultaunificada/`,
    datajud_tjpb: `https://app.tjpb.jus.br/consultaprocessual/`,
    datajud_tjro: `https://webapp.tjro.jus.br/consultaprocessual/`,
    datajud_tjac: `https://esaj.tjac.jus.br/cpopg/open.do`,
    datajud_tjap: `https://tucujuris.tjap.jus.br/`,
    datajud_tjrr: `https://judicial.tjrr.jus.br/`,
    datajud_tjto: `https://eproc1.tjto.jus.br/eprocV2_prod_1grau/`,
    cnj: `https://www.cnj.jus.br/`,
  };

  // LexML/catalogo: use keyword search as fallback only
  if (source === "lexml" || source === "lexml_catalogo") {
    return `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(title)}`;
  }
  // Camara propositions
  if (source === "camara" || source === "camara_proposicoes") {
    return `https://www.camara.leg.br/busca-portal?contextoBusca=BuscaProposicoes&termo=${encodeURIComponent(title)}`;
  }

  // Check TRT sources
  for (let i = 1; i <= 24; i++) {
    if (source === `datajud_trt${i}`) {
      return `https://pje.trt${i}.jus.br/consultaprocessual/pages/consultas/ConsultaPublica.seam`;
    }
  }

  const mapped = tribunalUrlMap[source];
  if (mapped) return mapped;

  // If existing URL is valid (even generic), keep it
  if (existingUrl && existingUrl.startsWith("http")) return existingUrl;

  // Fallback: Google search
  return `https://www.google.com/search?q=${encodeURIComponent(title)}+site:jus.br`;
}

// ═══════════════════════════════════════
// MAIN HANDLER — v17 iDanae Neural Pipeline
// ═══════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: A1 — Validate user authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: "Não autorizado. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      mode = "search_and_index", query, items, matchThreshold, matchCount,
      filterSource, filterType, filterSources, filterDateFrom, filterDateTo,
      hybrid = true, rerank = true, expandQueries = true, includeAttentionData = false,
      feedbackData, previousContext, jurisdiction = "brasil",
    } = body;

    // ═══ v17 iDanae Lacuna 5: Adversarial Query Detection ═══
    if (query && mode !== "feedback" && mode !== "rlvr" && mode !== "dpo_feedback" && mode !== "index") {
      const adversarialCheck = detectAdversarialQuery(query);
      if (adversarialCheck.isAdversarial) {
        console.warn(`🛡️ v17 Adversarial query blocked: "${query.substring(0, 50)}..." — ${adversarialCheck.reason}`);
        return new Response(JSON.stringify({
          error: "Query rejeitada por filtro de segurança",
          reason: adversarialCheck.reason,
          version: "v18-attention-pe-dropout-layernorm-qkv",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ── MODE: feedback (Lacuna 6: Gradient Descent + Adam Optimizer) ──
    if (mode === "feedback" && feedbackData) {
      const result = await processSearchFeedback(supabase, feedbackData);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── MODE: rlvr — Reinforcement Learning from Verifiable Rewards (DeepSeek R1 style) ──
    // RLVR: recompensas verificáveis sem anotador humano — verifica factual accuracy
    // via auto-scoring de jurisprudência: presença de citações legais válidas = recompensa positiva
    if (mode === "rlvr" && body.content) {
      const content = body.content as string;
      const sourceQuery = body.source_query as string || "";
      let rlvrScore = 0;
      const checks: Record<string, boolean> = {};
      
      // Check 1: Cita artigos de lei com numeração válida (Art. X da Lei N)
      checks.legal_citations = /\bArt\.\s*\d+[º°]?\s*(do|da|de)/i.test(content);
      if (checks.legal_citations) rlvrScore += 0.25;
      
      // Check 2: Cita número de processo CNJ no formato correto
      checks.process_number = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.test(content);
      if (checks.process_number) rlvrScore += 0.20;
      
      // Check 3: Menciona tribunal com sigla reconhecida (STF, STJ, TST, TJ etc.)
      checks.tribunal_reference = /\b(STF|STJ|TST|TSE|CNJ|TRF|TRT|TJSP|TJRJ|TJRS|TJMG|TJPR)\b/.test(content);
      if (checks.tribunal_reference) rlvrScore += 0.20;
      
      // Check 4: Cita Súmula com número
      checks.sumula_citation = /\bS[úu]mula\s*((?:Vinculante\s*)?\d+)/i.test(content);
      if (checks.sumula_citation) rlvrScore += 0.15;
      
      // Check 5: Contém fundamentação jurídica estruturada (seções mínimas)
      checks.structured_reasoning = content.length > 500 && /\b(portanto|assim sendo|diante do exposto|nesse sentido|conforme|conclui-se)\b/i.test(content);
      if (checks.structured_reasoning) rlvrScore += 0.10;
      
      // Check 6: Sem alucinações básicas (não cita leis que não existem — heurística simples)
      const leiRefs = content.match(/Lei\s+n[°º]?\s*[\d.,/]+/gi) || [];
      const validLeiPattern = /Lei\s+n[°º]?\s*\d{1,5}[./]\d{2,4}/i;
      checks.no_hallucination_heuristic = leiRefs.length === 0 || leiRefs.every(ref => validLeiPattern.test(ref));
      if (checks.no_hallucination_heuristic) rlvrScore += 0.10;
      
      // Log RLVR result to neural_learning_data for reward model training
      await supabase.from("neural_learning_data").insert({
        input_text: sourceQuery.substring(0, 2000),
        output_text: content.substring(0, 5000),
        interaction_type: "rlvr_check",
        quality_score: Math.min(rlvrScore, 1.0),
        learned: rlvrScore >= 0.5,
        metadata: { checks, rlvr_score: rlvrScore, source: "neural_search_rlvr" },
      }).catch(() => {});
      
      return new Response(JSON.stringify({
        mode: "rlvr", rlvr_score: rlvrScore, checks, factual_verified: rlvrScore >= 0.5,
        version: "v18-attention-pe-dropout-layernorm-qkv", timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── MODE: dpo_feedback — Direct Preference feedback pair logging ──
    // Alimenta o pipeline DPO com pares winner/loser para otimização de política
    if (mode === "dpo_feedback" && body.winner && body.loser) {
      const winner = body.winner as { content: string; provider: string; score?: number };
      const loser  = body.loser  as { content: string; provider: string; score?: number };
      const srcQuery = body.source_query as string || "";

      await Promise.all([
        supabase.from("neural_learning_data").insert({
          input_text: srcQuery.substring(0, 2000),
          output_text: winner.content.substring(0, 5000),
          interaction_type: "dpo_winner",
          quality_score: winner.score ?? 0.9,
          learned: true,
          metadata: { provider: winner.provider, dpo_role: "winner", source: "neural_search_dpo" },
        }),
        supabase.from("neural_learning_data").insert({
          input_text: srcQuery.substring(0, 2000),
          output_text: loser.content.substring(0, 5000),
          interaction_type: "dpo_loser",
          quality_score: loser.score ?? 0.2,
          learned: false,
          metadata: { provider: loser.provider, dpo_role: "loser", source: "neural_search_dpo" },
        }),
      ]).catch(() => {});

      return new Response(JSON.stringify({
        mode: "dpo_feedback", logged: true,
        version: "v18-attention-pe-dropout-layernorm-qkv", timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── MODE: ab_test ──
    if (mode === "ab_test" && query) {
      const keys = getGeminiKeys();
      if (keys.length === 0) return new Response(JSON.stringify({ error: "No GEMINI_API_KEY configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const learnedWeights = await loadLearnedWeights(supabase);
      const attentionWeights = learnedWeights || getDefaultAttentionWeights();
      const { embedding: qEmb } = await generateQueryEmbeddingCached(supabase, query);
      const searchResults = await semanticSearchV3(supabase, qEmb, query, { matchCount: 20 });
      const scored = applyBatchMHAScoring(searchResults, query, attentionWeights);
      const abResults = abTestScoring(scored, query, attentionWeights);
      return new Response(JSON.stringify({ query, mode: "ab_test", ...abResults, version: "v18-attention-pe-dropout-layernorm-qkv", timestamp: new Date().toISOString() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const keys = getGeminiKeys();
    if (keys.length === 0) return new Response(JSON.stringify({ error: "No GEMINI_API_KEY configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (!query && mode !== "index") return new Response(JSON.stringify({ error: "Query is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const effectiveFilterSources = filterSources || null;
    let results: any[] = [];
    let indexed = 0;
    let cacheHit = false;
    let embeddingCacheHit = false;
    let expandedQueries: string[] = [query];
    const pipelineStages: string[] = [];
    const timings: Record<string, number> = {};

    const learnedWeights = await loadLearnedWeights(supabase);
    const attentionWeights = learnedWeights || getDefaultAttentionWeights();
    pipelineStages.push("quantum_deep_learning_init_v11");

    // ── MODE: neural_knowledge ──
    if (mode === "neural_knowledge") {
      const nkStart = Date.now();
      pipelineStages.push("neural_knowledge_embedding");
      const { embedding: qEmb, cached: qCached } = await generateQueryEmbeddingCached(supabase, query);
      embeddingCacheHit = qCached;
      timings.embedding_ms = Date.now() - nkStart;
      pipelineStages.push("search_neural_knowledge_rpc");
      const rpcStart = Date.now();
      const { data: nkData, error: nkError } = await supabase.rpc("search_neural_knowledge", {
        query_embedding: `[${qEmb.join(",")}]`, query_text: query, match_count: matchCount || 20,
        semantic_weight: 0.7, keyword_weight: 0.3, filter_type: filterType || null,
      });
      timings.neural_knowledge_search_ms = Date.now() - rpcStart;
      if (nkError) throw nkError;
      return new Response(JSON.stringify({ query, mode: "neural_knowledge", neuralResults: nkData || [], totalResults: (nkData || []).length, embeddingCacheHit, pipeline: pipelineStages, timings, version: "v18-attention-pe-dropout-layernorm-qkv", timestamp: new Date().toISOString() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── MODE: index ──
    if (mode === "index" && items) {
      pipelineStages.push("smart_chunking", "indexing");
      indexed = await indexResults(supabase, items, query || "manual");
    }

    // ── Query Pattern Detection ──
    type QueryType = "process_number" | "exact_phrase" | "wildcard" | "normal";
    function detectQueryType(q: string): { type: QueryType; cleanQuery: string; processNumber?: string; exactPhrases?: string[]; wildcardPattern?: string } {
      if (!q) return { type: "normal", cleanQuery: q };
      const trimmed = q.trim();
      // CNJ process number: NNNNNNN-DD.YYYY.J.TR.OOOO
      const cnjMatch = trimmed.match(/^(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})$/);
      if (cnjMatch) return { type: "process_number", cleanQuery: trimmed, processNumber: cnjMatch[1] };
      // Also match partial process numbers (at least NNNNNNN-DD)
      const partialCnj = trimmed.match(/^(\d{5,7}-?\d{0,2}\.?\d{0,4}\.?\d?\.?\d{0,2}\.?\d{0,4})$/);
      if (partialCnj && trimmed.length >= 10 && /\d/.test(trimmed) && (trimmed.includes("-") || trimmed.includes("."))) {
        return { type: "process_number", cleanQuery: trimmed, processNumber: partialCnj[1] };
      }
      // Exact phrase: "código civil"
      const phraseMatches = trimmed.match(/"([^"]+)"/g);
      if (phraseMatches) {
        const phrases = phraseMatches.map(p => p.replace(/"/g, ""));
        const remaining = trimmed.replace(/"[^"]*"/g, "").trim();
        return { type: "exact_phrase", cleanQuery: remaining || phrases[0], exactPhrases: phrases };
      }
      // Wildcard: imov*, UF??
      if (/[*?]/.test(trimmed)) {
        const sqlPattern = trimmed.replace(/\*/g, "%").replace(/\?/g, "_");
        return { type: "wildcard", cleanQuery: trimmed.replace(/[*?]/g, ""), wildcardPattern: sqlPattern };
      }
      return { type: "normal", cleanQuery: trimmed };
    }

    // ── Direct text search for special query types ──
    async function directTextSearch(
      supabase: any, pattern: string, mode: "ilike" | "exact", limit = 20,
      fSource?: string, fType?: string, fSources?: string[], fDateFrom?: string, fDateTo?: string
    ): Promise<any[]> {
      try {
        let q = supabase.from("legal_embeddings")
          .select("id, title, content, source, source_label, content_type, url, published_date, metadata")
          .limit(limit);
        if (mode === "ilike") {
          q = q.or(`title.ilike.%${pattern}%,content.ilike.%${pattern}%`);
        } else {
          q = q.or(`title.ilike.%${pattern}%,content.ilike.%${pattern}%`);
        }
        if (fSource) q = q.eq("source", fSource);
        if (fType) q = q.eq("content_type", fType);
        if (fSources?.length) q = q.in("source", fSources);
        if (fDateFrom) q = q.gte("published_date", fDateFrom);
        if (fDateTo) q = q.lte("published_date", fDateTo);
        const { data, error } = await q;
        if (error) { console.warn("Direct text search error:", error.message); return []; }
        return (data || []).map((r: any) => ({
          ...r,
          semantic_score: 0.9,
          keyword_score: 1.0,
          authority_score: computeAuthorityScore(r.source),
          recency_score: computeTemporalScore(r.published_date),
          combined_score: 0.95,
        }));
      } catch (e) { console.warn("Direct text search exception:", e); return []; }
    }

    // ── MODE: search / search_and_index ──
    let refinedQuery: string | undefined;
    let detectedArea: string | undefined;
    let queryTypeDetected: QueryType = "normal";
    
    if (mode !== "index") {
      const searchStart = Date.now();

      // Detect query type (process number, exact phrase, wildcard)
      const queryInfo = detectQueryType(query || "");
      queryTypeDetected = queryInfo.type;

      // ── FAST PATH: Process number search ──
      if (queryInfo.type === "process_number" && queryInfo.processNumber) {
        pipelineStages.push("process_number_detection", "direct_text_search");
        const pnStart = Date.now();
        // Normalize: search both formatted (1505236-57.2025.8.26.0073) and raw (15052365720258260073)
        const rawNumber = queryInfo.processNumber.replace(/[-./]/g, "");
        const formattedNumber = queryInfo.processNumber;
        const directFormatted = await directTextSearch(
          supabase, formattedNumber, "ilike", matchCount || 20,
          filterSource, filterType, effectiveFilterSources, filterDateFrom, filterDateTo
        );
        const directRaw = rawNumber !== formattedNumber ? await directTextSearch(
          supabase, rawNumber, "ilike", matchCount || 20,
          filterSource, filterType, effectiveFilterSources, filterDateFrom, filterDateTo
        ) : [];
        // Merge and deduplicate by id
        const seenIds = new Set<string>();
        const directResults: any[] = [];
        for (const r of [...directFormatted, ...directRaw]) {
          if (r.id && !seenIds.has(r.id)) { seenIds.add(r.id); directResults.push(r); }
        }
        timings.direct_search_ms = Date.now() - pnStart;

        if (directResults.length > 0) {
          console.log(`🔍 Process number search: found ${directResults.length} results for ${queryInfo.processNumber}`);
          pipelineStages.push("url_correction");
          const fixedResults = directResults.map(r => ({ ...r, url: getProcessUrl(r.source || "", r.title || "", r.url || "") }));
          return new Response(JSON.stringify({
            query, mode, results: fixedResults, totalResults: fixedResults.length, indexed: 0,
            cacheHit: false, embeddingCacheHit: false, pipeline: pipelineStages, timings,
            queryType: "process_number",
            version: "v18-attention-pe-dropout-layernorm-qkv", timestamp: new Date().toISOString(),
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // If no direct results, fall through to normal search
        console.log(`🔍 Process number not found in local DB, falling through to neural search`);
      }

      // ── BOOST PATH: Exact phrase or wildcard — run direct search in parallel later ──
      let directBoostResults: any[] = [];
      if (queryInfo.type === "exact_phrase" && queryInfo.exactPhrases?.length) {
        pipelineStages.push("exact_phrase_detection", "direct_phrase_search");
        const epStart = Date.now();
        for (const phrase of queryInfo.exactPhrases) {
          const phraseResults = await directTextSearch(
            supabase, phrase, "exact", matchCount || 20,
            filterSource, filterType, effectiveFilterSources, filterDateFrom, filterDateTo
          );
          directBoostResults.push(...phraseResults);
        }
        timings.direct_phrase_search_ms = Date.now() - epStart;
        console.log(`🔍 Exact phrase search: found ${directBoostResults.length} results for "${queryInfo.exactPhrases.join('", "')}"`);
      } else if (queryInfo.type === "wildcard" && queryInfo.wildcardPattern) {
        pipelineStages.push("wildcard_detection", "direct_wildcard_search");
        const wcStart = Date.now();
        directBoostResults = await directTextSearch(
          supabase, queryInfo.wildcardPattern, "ilike", matchCount || 20,
          filterSource, filterType, effectiveFilterSources, filterDateFrom, filterDateTo
        );
        timings.direct_wildcard_search_ms = Date.now() - wcStart;
        console.log(`🔍 Wildcard search: found ${directBoostResults.length} results for pattern "${queryInfo.wildcardPattern}"`);
      }

      // ═══ v17.1 Performance: Parallelize AI refinement + embedding + expansion ═══
      const parallelStart = Date.now();
      const parallelTasks: Promise<void>[] = [];
      
      // Task 1: AI Query Refinement (non-blocking)
      if (query && queryInfo.type === "normal") {
        parallelTasks.push((async () => {
          try {
            pipelineStages.push("ai_query_refinement");
            const refinePrompt = `Analise esta busca jurídica: "${query}"\n\nRetorne APENAS JSON válido:\n{"refined_query":"busca otimizada","area":"penal|civil|trabalhista|tributario|constitucional|administrativo|consumidor|ambiental|previdenciario|eleitoral|empresarial|familia"}`;
            const refineText = await callLLM(supabase, refinePrompt, "search", { maxTokens: 200, temperature: 0.1, timeoutMs: 4000 });
            const refineMatch = refineText.match(/\{[\s\S]*\}/);
            if (refineMatch) {
              const parsed = JSON.parse(refineMatch[0]);
              if (parsed.refined_query) refinedQuery = parsed.refined_query;
              if (parsed.area) detectedArea = parsed.area;
              console.log(`[Neural AI Refine] "${query}" → area: ${detectedArea}`);
            }
          } catch (e) { console.warn("[Neural AI Refine] Failed:", e); }
        })());
      }
      
      // Task 2: Query Expansion (non-blocking)
      if (expandQueries && query) {
        if (previousContext) pipelineStages.push("conversational_context");
        pipelineStages.push("query_expansion");
        parallelTasks.push((async () => {
          expandedQueries = await expandQuery(query, previousContext || undefined, supabase);
        })());
      }
      
      // Task 3: Embedding Generation (always needed — run in parallel)
      pipelineStages.push("embedding_generation");
      let queryEmbedding: number[] = [];
      parallelTasks.push((async () => {
        const { embedding, cached: embCached } = await generateQueryEmbeddingCached(supabase, query);
        queryEmbedding = embedding;
        embeddingCacheHit = embCached;
      })());
      
      // Wait for all parallel tasks
      await Promise.all(parallelTasks);
      timings.parallel_init_ms = Date.now() - parallelStart;

      // Quantum Query Superposition
      let superposedEmbedding: number[] | null = null;
      if (expandedQueries.length > 1) {
        pipelineStages.push("quantum_query_superposition");
        const supStart = Date.now();
        try {
          const allQueryEmbeddings = await Promise.all(expandedQueries.slice(0, 2).map(async (eq) => { const { embedding } = await generateQueryEmbeddingCached(supabase, eq); return embedding; }));
          const weights = [2.0, ...Array(allQueryEmbeddings.length - 1).fill(1.0)];
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          superposedEmbedding = new Array(EMBEDDING_DIMS).fill(0);
          for (let i = 0; i < allQueryEmbeddings.length; i++) {
            for (let d = 0; d < EMBEDDING_DIMS; d++) { superposedEmbedding[d] += (allQueryEmbeddings[i][d] || 0) * weights[i] / totalWeight; }
          }
        } catch (e) { console.warn("Superposition failed:", e); }
        timings.superposition_ms = Date.now() - supStart;
      }

      // Multi-query hybrid search
      pipelineStages.push("multi_query_hybrid_search");
      const hybridStart = Date.now();
      const searchEmbedding = superposedEmbedding || queryEmbedding;
      const primaryResults = await semanticSearchV3(supabase, searchEmbedding, query, {
        matchThreshold: matchThreshold || 0.25, matchCount: matchCount || 20,
        filterSource, filterType, filterSources: effectiveFilterSources, filterDateFrom, filterDateTo,
      });
      const allResults = [...primaryResults];

      // Merge direct text search results (exact phrase / wildcard) with boost
      if (directBoostResults.length > 0) {
        pipelineStages.push("direct_results_merge");
        directBoostResults.forEach(r => { r.combined_score = Math.max(r.combined_score || 0, 0.95); allResults.push(r); });
      }

      const resultMap = new Map<string, any>();
      allResults.forEach((r) => { const existing = resultMap.get(r.id); if (!existing || (r.combined_score || 0) > (existing.combined_score || 0)) resultMap.set(r.id, r); });
      results = Array.from(resultMap.values());
      timings.hybrid_search_ms = Date.now() - hybridStart;

      // ═══ v12 DBN: HMM Session Tracker — infer user intent from query history ═══
      pipelineStages.push("hmm_session_inference");
      const hmmStart = Date.now();
      let hmmArea: string | null = null;
      let hmmConfidence = 0;
      try {
        // Extract userId from auth header if available
        const authHeader = req.headers.get("authorization");
        let sessionUserId: string | null = null;
        if (authHeader?.startsWith("Bearer ")) {
          try {
            const token = authHeader.replace("Bearer ", "");
            const { data: claims } = await supabase.auth.getClaims(token);
            sessionUserId = claims?.claims?.sub || null;
          } catch {}
        }
        const hmmResult = await hmmSessionInference(supabase, sessionUserId, query);
        hmmArea = hmmResult.inferredArea;
        hmmConfidence = hmmResult.confidence;
      } catch (e) { console.warn("HMM inference skipped:", e); }
      timings.hmm_inference_ms = Date.now() - hmmStart;

      // MHA + Multi-Layer QNN scoring (v12: DBN + Lacunas 4+5+9+10+12)
      pipelineStages.push("multi_layer_qnn_mha_scoring");
      const mhaStart = Date.now();
      // ═══ v17.1 Performance: Single adamState load (was 4 separate calls) ═══
      const adamState = await loadAdamState(supabase);
      const trainedLayerWeights = adamState.layerWeights || undefined;
      
      // v12: Apply Kalman-smoothed weights to attention heads if available
      if (adamState.kalman) {
        const kalmanHeads = ["semantic", "keyword", "authority", "recency", "jurisdiction", "depth"];
        for (const headName of kalmanHeads) {
          const kalmanState = adamState.kalman[`global_${headName}`];
          if (kalmanState) {
            const head = attentionWeights.heads.find(h => h.name === headName);
            if (head) {
              head.weight = 0.7 * kalmanState.estimate + 0.3 * head.weight;
            }
          }
        }
      }
      
      // ═══ v13 RL: Q-Learning action selection (ε-greedy) ═══
      pipelineStages.push("q_learning_policy");
      let selectedAction = "balanced";
      try {
        const qTable = adamState.qTable || {};
        const detectedArea = detectQueryCategory(query) || "civil";
        const qType = detectQueryType(query);
        const qStateKey = getQStateKey(detectedArea, qType);
        selectedAction = selectAction(qTable, qStateKey, 0.1);
        
        if (!adamState.lastAction) adamState.lastAction = {};
        adamState.lastAction[qStateKey] = selectedAction;
        
        // ═══ v13 RL: Update eligibility traces (decay + activate) ═══
        if (!adamState.eligibilityTraces) adamState.eligibilityTraces = {};
        for (const traceKey of Object.keys(adamState.eligibilityTraces)) {
          adamState.eligibilityTraces[traceKey] *= TD_GAMMA * 0.7;
          if (adamState.eligibilityTraces[traceKey] < 0.01) delete adamState.eligibilityTraces[traceKey];
        }
        
        const actionWeights = Q_ACTION_WEIGHTS[selectedAction] || Q_ACTION_WEIGHTS.balanced;
        for (const head of attentionWeights.heads) {
          const multiplier = actionWeights[head.name] || 1.0;
          head.weight *= multiplier;
        }
        
        console.log(`🎯 Q-Learning v13: state="${qStateKey}" → action="${selectedAction}" (ε=0.1)`);
      } catch (qErr) {
        console.warn("Q-Learning selection failed, using balanced:", qErr);
      }
      
      // v14: Use same adamState for Edelman co-activation synapses
      results = applyBatchMHAScoring(results, query, attentionWeights, trainedLayerWeights, adamState);
      
      // ═══ v13: Update eligibility traces with current head scores ═══
      try {
        if (!adamState.eligibilityTraces) adamState.eligibilityTraces = {};
        const detectedAreaForTraces = detectQueryCategory(query) || "civil";
        for (const r of results.slice(0, 5)) {
          const heads = r.attention_heads || {};
          for (const [headName, headVal] of Object.entries(heads)) {
            const traceKey = `${detectedAreaForTraces}_trace_${headName}`;
            const current = adamState.eligibilityTraces[traceKey] || 0;
            adamState.eligibilityTraces[traceKey] = Math.min(1.0, current + (headVal as number) * 0.2);
          }
        }
        // Single save for all adamState modifications
        await saveAdamState(supabase, adamState);
      } catch {}


      // Quantum classification
      pipelineStages.push("quantum_inspired_classification");
      const learnedQuantumCats = await loadQuantumCategoryWeights(supabase);
      const quantumCats = learnedQuantumCats || QUANTUM_LEGAL_CATEGORIES;
      results = results.map(r => {
        const heads = r.attention_heads || {};
        const { compatibility, category } = quantumInspiredClassifyWithCats(heads, query, quantumCats);
        let boost = 1.0 + 0.3 * compatibility;
        
        // v12 DBN: HMM jurisdiction boost — if HMM agrees with quantum category, extra boost
        if (hmmArea && category === hmmArea && hmmConfidence > 0.3) {
          boost += 0.2 * hmmConfidence;
        }
        
        return { ...r, multi_head_score: (r.multi_head_score || 0) * boost, combined_score: (r.combined_score || 0) * boost, quantum_compatibility: compatibility, quantum_category: category, hmm_area: hmmArea, hmm_confidence: hmmConfidence };
      });

      // Document Feedback Cross-Learning Boost
      pipelineStages.push("document_feedback_boost");
      const docFeedbackBoosts = await loadDocumentFeedbackBoosts(supabase);
      if (Object.keys(docFeedbackBoosts).length > 0) {
        results = results.map(r => {
          const category = r.quantum_category || "";
          const boostValue = docFeedbackBoosts[category] || 0;
          if (boostValue > 0) {
            const boosted = 1.0 + boostValue;
            return {
              ...r,
              multi_head_score: (r.multi_head_score || 0) * boosted,
              combined_score: (r.combined_score || 0) * boosted,
              document_feedback_boost: boostValue,
            };
          }
          return r;
        });
        console.log(`📊 Document feedback boosts applied: ${JSON.stringify(docFeedbackBoosts)}`);
      }

      // ═══ v17 iDanae Lacuna 1: GNN Message Passing ═══
      pipelineStages.push("gnn_message_passing");
      const gnnStart = Date.now();
      results = gnnMessagePassing(results, 2);
      timings.gnn_ms = Date.now() - gnnStart;

      // ═══ v18 Attention: Cross-Result Self-Attention with PE+LN+QKV+Dropout ═══
      pipelineStages.push("cross_result_attention_v18");
      const craStart = Date.now();
      const headNames = attentionWeights.heads.map(h => h.name);
      const qkvProj = adamState.qkvProjections || getDefaultQKVProjections(headNames.length);
      results = crossResultAttention(results, headNames, qkvProj);
      timings.cross_attention_ms = Date.now() - craStart;

      // ═══ v17 iDanae Lacuna 3: SHAP Interpretability ═══
      pipelineStages.push("shap_interpretability");
      results = results.map(r => {
        const heads = r.attention_heads || {};
        const shap = computeSHAPExplanation(heads, attentionWeights);
        return { ...r, shap_explanation: shap };
      });

      // Signal Flip
      if (detectNegation(query)) { pipelineStages.push("signal_flip_negation"); results = applySignalFlip(results, query); }

      // Adaptive threshold
      const adaptiveThreshold = computeAdaptiveThreshold(results);
      const beforeFilter = results.length;
      results = results.filter(r => (r.multi_head_score || 0) >= adaptiveThreshold);
      results.sort((a, b) => (b.multi_head_score || 0) - (a.multi_head_score || 0));
      timings.multi_head_attention_ms = Date.now() - mhaStart;

      // API enrichment
      if (mode === "search_and_index" && results.length < 3) {
        pipelineStages.push("cached_api_enrichment");
        const apiStart = Date.now();
        const apiResults = await fetchFromUnifiedSearch(supabase, query);
        cacheHit = apiResults.length > 0;
        if (apiResults.length > 0) {
          pipelineStages.push("smart_auto_indexing");
          try {
            indexed = await indexResults(supabase, apiResults, query);
            if (indexed > 0) {
              const freshResults = await semanticSearchV3(supabase, queryEmbedding, query, { matchThreshold: matchThreshold || 0.25, matchCount: matchCount || 20, filterSource, filterType, filterSources: effectiveFilterSources, filterDateFrom, filterDateTo });
              freshResults.forEach((r) => {
                if (!resultMap.has(r.id)) {
                  const { finalScore, headScores } = multiHeadAttentionScore(r, query, attentionWeights);
                  resultMap.set(r.id, { ...r, multi_head_score: finalScore, attention_heads: headScores, combined_score: finalScore });
                }
              });
              results = Array.from(resultMap.values()).sort((a, b) => (b.multi_head_score || 0) - (a.multi_head_score || 0));
            }
          } catch (indexErr) { console.warn("Auto-indexing failed:", indexErr); }
        }
        timings.api_enrichment_ms = Date.now() - apiStart;
      }

      // Cross-encoder reranking
      if (rerank && results.length > 3 && results.length <= 20) {
        pipelineStages.push("cross_encoder_reranking");
        const rerankStart = Date.now();
        results = await crossEncoderRerank(query, results, matchCount || 10, supabase);
        results = results.filter(r => (r.multi_head_score || 0) >= adaptiveThreshold);
        timings.reranking_ms = Date.now() - rerankStart;
      }

      timings.total_search_ms = Date.now() - searchStart;
      recordAttentionData(supabase, query, results, attentionWeights);
    }

    pipelineStages.push("explainability_metadata");

    // ═══ v17 iDanae Lacuna 6: Privacy Sanitization ═══
    pipelineStages.push("privacy_sanitization");
    let totalPiiFound = 0;
    results = results.map(r => {
      const titleSan = sanitizePrivateData(r.title || "");
      const contentSan = sanitizePrivateData((r.content || "").substring(0, 5000));
      totalPiiFound += titleSan.piiFound + contentSan.piiFound;
      return {
        ...r,
        title: titleSan.sanitized,
        content: contentSan.sanitized,
        privacy_score: 1.0 - Math.min((titleSan.piiFound + contentSan.piiFound) * 0.1, 0.5),
      };
    });
    if (totalPiiFound > 0) {
      console.log(`🔒 v17 Privacy: sanitized ${totalPiiFound} PII instances across ${results.length} results`);
    }

    // ── Fix URLs: map tribunal sources to correct portals ──
    pipelineStages.push("url_correction");
    results = results.map(r => {
      r.url = getProcessUrl(r.source || "", r.title || "", r.url || "");
      return r;
    });

    // ═══ v19 Rauber UFES: Competitive Classification ═══
    if (results.length > 0) {
      pipelineStages.push("competitive_classify_v19");
      const compLayer = getDefaultCompetitiveLayer();
      const headOrder = ["semantic", "keyword", "authority", "recency", "jurisdiction", "depth"];
      results = results.map(r => {
        const heads = r.attention_heads || {};
        const inputVec = headOrder.map(h => heads[h] || 0);
        const compResult = competitiveLearning(inputVec, compLayer, false);
        return {
          ...r,
          competitive_category: compResult.winner,
          competitive_confidence: compResult.confidence,
        };
      });
    }

    // ═══ v19 Rauber UFES: Hopfield Associative Memory ═══
    if (results.length >= 3) {
      pipelineStages.push("hopfield_memory_v19");
      // Convert top results into bipolar patterns for Hopfield memorization
      const patterns = results.slice(0, Math.min(8, results.length)).map(r => {
        const heads = r.attention_heads || {};
        return ["semantic", "keyword", "authority", "recency", "jurisdiction", "depth"]
          .map(h => (heads[h] || 0) >= 0.5 ? 1 : -1);
      });
      const hopfield = hopfieldLearn(patterns);
      // Use first result as stimulus and check stability
      if (hopfield.size > 0) {
        const stimulus = patterns[0];
        const recalled = hopfieldRecall(hopfield, stimulus, 20);
        const closest = hopfieldFindClosest(hopfield, recalled.state);
        results[0] = {
          ...results[0],
          hopfield_energy: recalled.energy,
          hopfield_converged: recalled.converged,
          hopfield_closest_pattern: closest.patternIdx,
          hopfield_hamming_distance: closest.distance,
        };
        console.log(`🧲 v19 Hopfield: energy=${recalled.energy.toFixed(3)}, converged=${recalled.converged}, closest_pattern=${closest.patternIdx}`);
      }
    }

    console.log(`✨ Neural search v19 (Rauber UFES + Competitive + Hopfield) complete: ${pipelineStages.join(" → ")} | ${results.length} results, ${indexed} indexed | ${timings.total_search_ms || 0}ms`);

    // ─── RLHF Feedback Loop: Log search interaction to neural_learning_data ───
    // Every search is a training signal — quality derived from result count + pipeline stages
    EdgeRuntime.waitUntil((async () => {
      try {
        let searchQuality = 0.4;
        if (results.length >= 5) searchQuality += 0.2;
        if (results.length >= 10) searchQuality += 0.1;
        if (indexed > 0) searchQuality += 0.1;  // indexed new content = high signal
        if (embeddingCacheHit) searchQuality += 0.05;
        if (cacheHit) searchQuality -= 0.05;    // cache hit = less fresh
        const topScore = results[0]?.multi_head_score || results[0]?.combined_score || 0;
        if (topScore >= 0.7) searchQuality += 0.1;
        searchQuality = Math.min(Math.max(searchQuality, 0.1), 1.0);

        const topTitles = results.slice(0, 3).map((r: any) => r.title || "").join(" | ");
        await supabase.from("neural_learning_data").insert({
          interaction_type: "search_query",
          input_text: query.substring(0, 2000),
          output_text: topTitles.substring(0, 2000) || `${results.length} results found`,
          quality_score: searchQuality,
          learned: searchQuality >= 0.7,
          metadata: {
            result_count: results.length,
            indexed_count: indexed,
            pipeline_stages: pipelineStages.length,
            top_score: Math.round(topScore * 1000) / 1000,
            mode,
            filterSource: filterSource || null,
            timing_ms: timings.total_search_ms || 0,
            embedding_cache_hit: embeddingCacheHit,
            source: "neural_search_v11",
            autoScored: true,
          },
        });
        console.log(`🧠 Search RLHF logged: quality=${searchQuality.toFixed(2)}, results=${results.length}`);
      } catch (e) {
        console.warn("Search RLHF log failed:", e);
      }
    })());

    return new Response(
      JSON.stringify({
        query, mode, results, totalResults: results.length, indexed, cacheHit, embeddingCacheHit,
        queryType: queryTypeDetected !== "normal" ? queryTypeDetected : undefined,
        expandedQueries: expandedQueries.length > 1 ? expandedQueries : undefined,
        pipeline: pipelineStages, timings,
        attentionWeights: includeAttentionData ? attentionWeights : undefined,
        refinedQuery: refinedQuery || undefined,
        area: detectedArea || undefined,
        version: "v19-rauber-ufes-competitive-hopfield", timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Neural search v12 error:", error);
    return new Response(JSON.stringify({ error: "Erro ao processar pesquisa" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
