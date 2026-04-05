/**
 * RoPE (Rotary Position Embedding) — Simulação para perfis neurais
 * Implementação real da codificação posicional rotacional usada em transformers modernos.
 * 
 * Aplicação no sistema: gera embeddings posicionais para tokens de contexto,
 * permitindo que o perfil neural mantenha "consciência" de posição e relação
 * entre conceitos aprendidos.
 */

// Calcula as frequências theta para cada par de dimensões
export function computeThetas(dim: number, base: number = 10000): number[] {
  const thetas: number[] = [];
  for (let i = 0; i < dim / 2; i++) {
    thetas.push(Math.pow(base, -2 * i / dim));
  }
  return thetas;
}

// Aplica RoPE em um vetor na posição m
export function applyRoPE(vector: number[], position: number, thetas: number[]): number[] {
  const rotated = [...vector];
  for (let i = 0; i < vector.length; i += 2) {
    const thetaIdx = i / 2;
    if (thetaIdx >= thetas.length) break;
    
    const angle = position * thetas[thetaIdx];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    rotated[i]     = vector[i] * cos - vector[i + 1] * sin;
    rotated[i + 1] = vector[i] * sin + vector[i + 1] * cos;
  }
  return rotated;
}

// Calcula dot product entre dois vetores com RoPE aplicado
export function ropeDotProduct(
  query: number[], queryPos: number,
  key: number[], keyPos: number,
  thetas: number[]
): number {
  const qRot = applyRoPE(query, queryPos, thetas);
  const kRot = applyRoPE(key, keyPos, thetas);
  return qRot.reduce((sum, val, i) => sum + val * kRot[i], 0);
}

// Gera positional encoding matrix para uma sequência
export function generatePositionalMatrix(
  seqLength: number,
  dim: number,
  base: number = 10000
): number[][] {
  const thetas = computeThetas(dim, base);
  const matrix: number[][] = [];
  
  for (let pos = 0; pos < seqLength; pos++) {
    const row: number[] = [];
    for (let i = 0; i < dim; i += 2) {
      const angle = pos * thetas[i / 2];
      row.push(Math.cos(angle)); // even dimension
      row.push(Math.sin(angle)); // odd dimension
    }
    matrix.push(row);
  }
  return matrix;
}

// Visualização: calcula attention scores entre todas as posições
export function computeAttentionPattern(
  seqLength: number,
  dim: number = 8
): number[][] {
  const thetas = computeThetas(dim);
  // Use identity-like vectors to show pure positional effects
  const baseVec = Array.from({ length: dim }, (_, i) => i % 2 === 0 ? 1.0 : 0.0);
  
  const scores: number[][] = [];
  for (let i = 0; i < seqLength; i++) {
    const row: number[] = [];
    for (let j = 0; j < seqLength; j++) {
      const score = ropeDotProduct(baseVec, i, baseVec, j, thetas);
      row.push(score);
    }
    scores.push(row);
  }
  
  // Normalize to 0-1 range
  const flat = scores.flat();
  const min = Math.min(...flat);
  const max = Math.max(...flat);
  const range = max - min || 1;
  
  return scores.map(row => row.map(v => (v - min) / range));
}

// Self-attention simulation with softmax
export function selfAttention(
  queries: number[][],
  keys: number[][],
  values: number[][],
  thetas: number[]
): number[][] {
  const seqLen = queries.length;
  const dk = queries[0].length;
  
  // Compute attention scores with RoPE
  const scores: number[][] = [];
  for (let i = 0; i < seqLen; i++) {
    const row: number[] = [];
    for (let j = 0; j < seqLen; j++) {
      row.push(ropeDotProduct(queries[i], i, keys[j], j, thetas) / Math.sqrt(dk));
    }
    scores.push(row);
  }
  
  // Softmax per row
  const attention = scores.map(row => {
    const maxVal = Math.max(...row);
    const exps = row.map(v => Math.exp(v - maxVal));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(v => v / sum);
  });
  
  // Weighted sum of values
  return attention.map(weights =>
    values[0].map((_, dim) =>
      weights.reduce((sum, w, j) => sum + w * values[j][dim], 0)
    )
  );
}
