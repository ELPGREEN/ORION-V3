/**
 * ─── v21: State Space Model (Mamba/SSM) ───
 * Selective State Space Model for long-sequence processing.
 * Linear-time O(n) alternative to Transformer's O(n²) attention.
 * 
 * Architecture:
 * - Selective scan (input-dependent state transitions)
 * - Discretized continuous-time SSM (A, B, C, D matrices)
 * - Causal convolution pre-processing
 * - Hybrid Mamba-Transformer scoring head
 * 
 * Ref: Gu & Dao (2023) "Mamba: Linear-Time Sequence Modeling with Selective State Spaces"
 * Ref: Gu et al. (2022) "Efficiently Modeling Long Sequences with Structured State Spaces"
 */

// ─── Configuration ───

export interface MambaConfig {
  dModel: number;       // Model dimension (e.g., 768)
  dState: number;       // SSM state dimension (e.g., 16 or 64)
  dConv: number;        // Local convolution width (e.g., 4)
  expandFactor: number; // Inner dimension expansion (e.g., 2)
  dtRank: number;       // Rank of Δ projection
  seqLen: number;       // Max sequence length
  nLayers: number;      // Number of Mamba blocks
  useBidirectional: boolean; // BiMamba for non-causal tasks
}

export const DEFAULT_MAMBA_CONFIG: MambaConfig = {
  dModel: 768,
  dState: 16,
  dConv: 4,
  expandFactor: 2,
  dtRank: 48,  // dModel / 16
  seqLen: 131072, // 128k tokens — legal document scale
  nLayers: 12,
  useBidirectional: false,
};

// ─── SSM State ───

export interface SSMState {
  A: number[][];  // State transition [dState x dState] (diagonal, discretized)
  B: number[][];  // Input projection [dState x 1] (input-dependent)
  C: number[][];  // Output projection [1 x dState] (input-dependent)
  D: number[];    // Skip connection (residual)
  dt: number[];   // Discretization step Δ (input-dependent)
  h: number[];    // Hidden state [dState]
}

// ─── Initialization (HiPPO-LegS for long-range memory) ───

export function initHiPPOMatrix(n: number): number[][] {
  /**
   * HiPPO (High-order Polynomial Projection Operators) initialization.
   * Specifically HiPPO-LegS for Legendre polynomials.
   * Enables SSM to remember long-range dependencies — critical for legal texts.
   * Ref: Gu et al. (2020) "HiPPO: Recurrent Memory with Optimal Polynomial Projections"
   */
  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i > j) {
        A[i][j] = -Math.sqrt((2 * i + 1) * (2 * j + 1));
      } else if (i === j) {
        A[i][j] = -(i + 1);
      }
      // Upper triangle stays 0
    }
  }
  return A;
}

export function initSSMState(config: MambaConfig): SSMState {
  const { dState, dModel } = config;
  return {
    A: initHiPPOMatrix(dState),
    B: Array.from({ length: dState }, () => [0]),
    C: [new Array(dState).fill(0)],
    D: new Array(dModel).fill(1), // Skip/residual initialized to 1
    dt: new Array(dModel).fill(0.01), // Small initial Δ
    h: new Array(dState).fill(0), // Zero initial hidden state
  };
}

// ─── Discretization (Zero-Order Hold) ───

export function discretizeZOH(
  A_cont: number[][],
  B_cont: number[][],
  dt: number
): { A_disc: number[][]; B_disc: number[][] } {
  /**
   * Zero-Order Hold discretization:
   *   A_disc = exp(Δ * A_cont)
   *   B_disc = (A_disc - I) * A_cont^{-1} * B_cont
   * 
   * For diagonal A (Mamba's S4D simplification):
   *   A_disc[i][i] = exp(dt * A_cont[i][i])
   *   B_disc[i] = (A_disc[i][i] - 1) / A_cont[i][i] * B_cont[i]
   */
  const n = A_cont.length;
  const A_disc: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const B_disc: number[][] = Array.from({ length: n }, () => [0]);

  for (let i = 0; i < n; i++) {
    // Diagonal approximation (S4D)
    const a = A_cont[i][i];
    const expA = Math.exp(dt * a);
    A_disc[i][i] = expA;
    
    // Avoid division by zero
    const bScale = Math.abs(a) > 1e-8 ? (expA - 1) / a : dt;
    B_disc[i][0] = bScale * (B_cont[i]?.[0] ?? 0);
  }

  return { A_disc, B_disc };
}

// ─── Selective Scan (Core Mamba Algorithm) ───

export interface SelectiveScanResult {
  output: number[];
  finalState: number[];
  stateHistory: number[][]; // For analysis/debugging
}

export function selectiveScan(
  input: number[],       // [seqLen] — projected input sequence
  dt: number[],          // [seqLen] — input-dependent time steps
  A_diag: number[],      // [dState] — diagonal of A
  B_seq: number[][],     // [seqLen x dState] — input-dependent B
  C_seq: number[][],     // [seqLen x dState] — input-dependent C
  D: number,             // Scalar skip connection
  initialState?: number[] // [dState]
): SelectiveScanResult {
  /**
   * Selective scan — the heart of Mamba.
   * Unlike standard SSMs, B, C, and Δ are input-dependent (selective).
   * This is what gives Mamba content-aware reasoning.
   * 
   * For each timestep t:
   *   h[t] = A_bar * h[t-1] + B_bar * x[t]
   *   y[t] = C[t] . h[t] + D * x[t]
   * 
   * where A_bar, B_bar are discretized using dt[t].
   */
  const seqLen = input.length;
  const dState = A_diag.length;
  const h = initialState ? [...initialState] : new Array(dState).fill(0);
  const output: number[] = new Array(seqLen);
  const stateHistory: number[][] = [];

  const recordInterval = Math.max(1, Math.floor(seqLen / 100));

  for (let t = 0; t < seqLen; t++) {
    const deltaT = Math.max(dt[t], 1e-6); // Clamp for stability
    const x = input[t];

    // Discretize per-step (selective)
    for (let i = 0; i < dState; i++) {
      // Clamp exponent to prevent overflow (A_diag[i] is negative for stability)
      const expArg = Math.max(-20, Math.min(20, deltaT * A_diag[i]));
      const a_disc = Math.exp(expArg);
      const b_disc = Math.abs(A_diag[i]) > 1e-8
        ? (a_disc - 1) / A_diag[i] * (B_seq[t]?.[i] ?? 0)
        : deltaT * (B_seq[t]?.[i] ?? 0);
      
      h[i] = a_disc * h[i] + b_disc * x;
      // Clamp state for numerical stability
      h[i] = Math.max(-1e6, Math.min(1e6, h[i]));
    }

    // Output: y = C[t] . h + D * x
    let y = D * x;
    for (let i = 0; i < dState; i++) {
      y += (C_seq[t]?.[i] ?? 0) * h[i];
    }
    output[t] = y;

    // Record state for analysis
    if (t % recordInterval === 0) {
      stateHistory.push([...h]);
    }
  }

  return { output, finalState: [...h], stateHistory };
}

// ─── Causal Convolution (Pre-SSM local feature extraction) ───

export function causalConv1d(input: number[], kernel: number[]): number[] {
  /**
   * Causal convolution: only looks at past/current positions.
   * Width = dConv (typically 4). Provides local context before SSM.
   */
  const len = input.length;
  const kLen = kernel.length;
  const output = new Array(len).fill(0);

  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (let k = 0; k < kLen; k++) {
      const idx = i - k;
      if (idx >= 0) {
        sum += input[idx] * kernel[k];
      }
    }
    output[i] = sum;
  }
  return output;
}

// ─── SiLU / Swish Gate (Mamba's gating mechanism) ───

export function siluGate(x: number[], gate: number[]): number[] {
  /** Element-wise SiLU gating: y = x * σ(gate) */
  return x.map((xi, i) => xi * (1 / (1 + Math.exp(-gate[i]))));
}

// ─── Full Mamba Block ───

export interface MambaBlockResult {
  output: number[];
  state: number[];
  metrics: {
    stateNorm: number;
    selectivity: number;  // How much dt varies (high = more selective)
    effectiveMemory: number; // Estimated effective memory span
  };
}

export function mambaBlock(
  input: number[],
  config: MambaConfig,
  convKernel?: number[],
  prevState?: number[]
): MambaBlockResult {
  /**
   * Full Mamba block: Conv1D → SSM → Gated output
   * 
   * 1. Linear projection: x → (z, x') where dim = expand * dModel
   * 2. Causal Conv1D on x'
   * 3. SiLU activation
   * 4. Selective SSM
   * 5. Gated multiplication: y = SSM(x') ⊙ SiLU(z)
   * 6. Linear projection back to dModel
   */
  const seqLen = input.length;
  const { dState, dConv } = config;

  // Default conv kernel (learned in real Mamba, random init here)
  const kernel = convKernel || Array.from({ length: dConv }, (_, i) => 
    Math.exp(-i * 0.5) // Exponential decay kernel
  );

  // Step 1-2: Causal convolution
  const convOutput = causalConv1d(input, kernel);

  // Step 3: SiLU activation
  const activated = convOutput.map(x => x / (1 + Math.exp(-x)));

  // Generate input-dependent parameters (selectivity)
  // In real Mamba these are linear projections; here we simulate
  const dtProjected = activated.map(x => 0.01 + 0.1 * Math.abs(Math.tanh(x)));
  
  const B_seq = activated.map(x => {
    const b = new Array(dState).fill(0);
    for (let i = 0; i < dState; i++) {
      b[i] = Math.tanh(x * (i + 1) / dState);
    }
    return b;
  });

  const C_seq = activated.map(x => {
    const c = new Array(dState).fill(0);
    for (let i = 0; i < dState; i++) {
      c[i] = Math.tanh(x * (dState - i) / dState);
    }
    return c;
  });

  // A diagonal (HiPPO-initialized, negative for stability)
  const A_diag = Array.from({ length: dState }, (_, i) => -(i + 1));

  // Step 4: Selective scan
  const scanResult = selectiveScan(
    activated, dtProjected, A_diag, B_seq, C_seq, 1.0, prevState
  );

  // Step 5: Gated output (simplified — gate = original input through SiLU)
  const gated = siluGate(scanResult.output, input);

  // Compute metrics
  const stateNorm = Math.sqrt(
    scanResult.finalState.reduce((s, v) => s + v * v, 0)
  );
  
  const dtMean = dtProjected.reduce((s, v) => s + v, 0) / seqLen;
  const dtVar = dtProjected.reduce((s, v) => s + (v - dtMean) ** 2, 0) / seqLen;
  const selectivity = Math.sqrt(dtVar) / (dtMean + 1e-8);

  // Effective memory: based on slowest decaying state
  const slowestDecay = Math.min(...A_diag.map(a => Math.abs(a)));
  const effectiveMemory = slowestDecay > 0 ? 1 / slowestDecay : seqLen;

  return {
    output: gated,
    state: scanResult.finalState,
    metrics: { stateNorm, selectivity, effectiveMemory },
  };
}

// ─── BiMamba (Bidirectional for non-causal tasks) ───

export function biMambaBlock(
  input: number[],
  config: MambaConfig
): MambaBlockResult {
  /** 
   * Bidirectional Mamba: forward + reverse scan, averaged.
   * Useful for legal document classification (non-autoregressive).
   */
  const forward = mambaBlock(input, config);
  const reversed = mambaBlock([...input].reverse(), config);
  reversed.output.reverse(); // Align back

  const output = forward.output.map((v, i) => (v + reversed.output[i]) / 2);
  
  return {
    output,
    state: forward.state.map((v, i) => (v + reversed.state[i]) / 2),
    metrics: {
      stateNorm: (forward.metrics.stateNorm + reversed.metrics.stateNorm) / 2,
      selectivity: (forward.metrics.selectivity + reversed.metrics.selectivity) / 2,
      effectiveMemory: Math.max(forward.metrics.effectiveMemory, reversed.metrics.effectiveMemory),
    },
  };
}

// ─── Hybrid Mamba-Transformer Scoring Head ───

export interface HybridScore {
  mambaScore: number;         // Long-range coherence from SSM
  transformerScore: number;   // Existing MHA score
  qnnScore: number;           // Existing quantum score
  hybridScore: number;        // Weighted combination
  longRangeCoherence: number; // Mamba-specific metric
}

export function computeHybridScore(
  mambaOutput: number[],
  transformerScore: number,
  qnnScore: number,
  weights = { mamba: 0.15, transformer: 0.55, qnn: 0.25, entropy: 0.05 }
): HybridScore {
  /**
   * Hybrid scoring: combines Mamba (long-range), Transformer (semantic),
   * QNN (quantum), and entropy (uncertainty).
   * 
   * Updated from v20: 0.6 MHA + 0.3 QNN + 0.1 Entropy
   * To v21: 0.55 MHA + 0.25 QNN + 0.15 Mamba + 0.05 Entropy
   */
  // Mamba score: normalized state coherence
  const mean = mambaOutput.reduce((s, v) => s + v, 0) / mambaOutput.length;
  const variance = mambaOutput.reduce((s, v) => s + (v - mean) ** 2, 0) / mambaOutput.length;
  const coherence = 1 / (1 + Math.sqrt(variance)); // High coherence = low variance
  const mambaScore = Math.min(1, Math.max(0, (coherence + Math.tanh(mean)) / 2));

  // Long-range coherence: autocorrelation at lag
  const lag = Math.min(50, Math.floor(mambaOutput.length / 4));
  let autoCorr = 0;
  if (mambaOutput.length > lag) {
    for (let i = lag; i < mambaOutput.length; i++) {
      autoCorr += mambaOutput[i] * mambaOutput[i - lag];
    }
    autoCorr /= (mambaOutput.length - lag);
  }
  const longRangeCoherence = Math.min(1, Math.max(0, Math.tanh(autoCorr)));

  // Entropy term
  const entropyTerm = 1 - variance / (1 + variance);

  const hybridScore =
    weights.mamba * mambaScore +
    weights.transformer * transformerScore +
    weights.qnn * qnnScore +
    weights.entropy * entropyTerm;

  return {
    mambaScore,
    transformerScore,
    qnnScore,
    hybridScore: Math.min(1, Math.max(0, hybridScore)),
    longRangeCoherence,
  };
}

// ─── Mamba for Legal Sequence Analysis ───

export interface LegalSequenceAnalysis {
  documentCoherence: number;
  sectionTransitions: Array<{ position: number; sharpness: number }>;
  longRangeDependencies: number;
  estimatedComplexity: "simple" | "moderate" | "complex" | "very_complex";
  processingTimeMs: number;
}

export function analyzeLegalSequence(
  tokenScores: number[], // Per-token importance/embedding scores
  config: Partial<MambaConfig> = {}
): LegalSequenceAnalysis {
  /**
   * Analyze a legal document's structure using Mamba's selective SSM.
   * Detects section transitions, long-range dependencies, and complexity.
   * Ideal for preprocessing before RAG pipeline (v11 step 3).
   */
  const start = performance.now();
  const fullConfig = { ...DEFAULT_MAMBA_CONFIG, ...config };

  const result = fullConfig.useBidirectional
    ? biMambaBlock(tokenScores, fullConfig)
    : mambaBlock(tokenScores, fullConfig);

  // Detect section transitions (sharp state changes)
  const transitions: Array<{ position: number; sharpness: number }> = [];
  for (let i = 1; i < result.output.length; i++) {
    const delta = Math.abs(result.output[i] - result.output[i - 1]);
    if (delta > 0.3) { // Threshold for "sharp" transition
      transitions.push({ position: i, sharpness: delta });
    }
  }

  // Complexity estimation based on metrics
  const { selectivity, effectiveMemory, stateNorm } = result.metrics;
  let complexity: LegalSequenceAnalysis["estimatedComplexity"] = "simple";
  const complexityScore = selectivity * 0.4 + (stateNorm / 10) * 0.3 + (transitions.length / tokenScores.length) * 100 * 0.3;
  
  if (complexityScore > 2.0) complexity = "very_complex";
  else if (complexityScore > 1.0) complexity = "complex";
  else if (complexityScore > 0.5) complexity = "moderate";

  return {
    documentCoherence: 1 / (1 + Math.sqrt(
      result.output.reduce((s, v, i) => i > 0 ? s + (v - result.output[i-1]) ** 2 : 0, 0) / result.output.length
    )),
    sectionTransitions: transitions.slice(0, 20), // Top 20
    longRangeDependencies: effectiveMemory / tokenScores.length,
    estimatedComplexity: complexity,
    processingTimeMs: performance.now() - start,
  };
}
