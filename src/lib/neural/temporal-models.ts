/**
 * ─── Temporal & Statistical Models ───
 * Kalman Filter, EM Algorithm, HMM Viterbi
 * Used by neural pipeline for state estimation, clustering, and sequence decoding.
 * 
 * Refs: Kalman (1960), Dempster et al. (1977) EM, Viterbi (1967)
 */

import { softmax, layerNorm } from './activations';

// ─── Kalman Filter ───

export interface KalmanState {
  x: number[];      // state estimate
  P: number[][];    // error covariance
}

/**
 * 1D/nD Kalman Filter — predict + update cycle.
 * F: state transition, H: observation, Q: process noise, R: measurement noise
 */
export function kalmanPredict(
  state: KalmanState,
  F: number[][],
  Q: number[][]
): KalmanState {
  const n = state.x.length;
  const x = matVecMul(F, state.x);
  const P = matAdd(matMul(matMul(F, state.P), transpose(F)), Q);
  return { x, P };
}

export function kalmanUpdate(
  state: KalmanState,
  z: number[],
  H: number[][],
  R: number[][]
): KalmanState {
  const n = state.x.length;
  const m = z.length;
  
  // Innovation
  const y = vecSub(z, matVecMul(H, state.x));
  // Innovation covariance
  const S = matAdd(matMul(matMul(H, state.P), transpose(H)), R);
  // Kalman gain
  const K = matMul(matMul(state.P, transpose(H)), matInv(S));
  // Updated state
  const x = vecAdd(state.x, matVecMul(K, y));
  // Updated covariance
  const I = eye(n);
  const P = matMul(matSub(I, matMul(K, H)), state.P);
  
  return { x, P };
}

/** Full Kalman filter step: predict then update */
export function kalmanFilter(
  state: KalmanState,
  z: number[],
  F: number[][],
  H: number[][],
  Q: number[][],
  R: number[][]
): KalmanState {
  const predicted = kalmanPredict(state, F, Q);
  return kalmanUpdate(predicted, z, H, R);
}

/** Simple 1D Kalman for scalar tracking (convenience) */
export function kalman1D(
  xPrev: number, pPrev: number,
  measurement: number,
  processNoise = 0.01, measurementNoise = 0.1
): { x: number; p: number } {
  // Predict
  const xPred = xPrev;
  const pPred = pPrev + processNoise;
  // Update
  const K = pPred / (pPred + measurementNoise);
  const x = xPred + K * (measurement - xPred);
  const p = (1 - K) * pPred;
  return { x, p };
}

// ─── EM Algorithm (Gaussian Mixture) ───

export interface GaussianComponent {
  mean: number[];
  variance: number[];
  weight: number;
}

/**
 * Expectation-Maximization for Gaussian Mixture Model.
 * Returns fitted components after `maxIter` iterations.
 */
export function emGaussianMixture(
  data: number[][],
  k: number,
  maxIter = 20
): GaussianComponent[] {
  if (!data.length || !data[0]?.length) return [];
  const n = data.length;
  const d = data[0].length;

  // Initialize components
  const components: GaussianComponent[] = Array.from({ length: k }, (_, i) => ({
    mean: data[Math.floor(i * n / k)].slice(),
    variance: new Array(d).fill(1),
    weight: 1 / k,
  }));

  const responsibilities = Array.from({ length: n }, () => new Array(k).fill(0));

  for (let iter = 0; iter < maxIter; iter++) {
    // E-step: compute responsibilities
    for (let i = 0; i < n; i++) {
      let total = 0;
      for (let j = 0; j < k; j++) {
        const logProb = gaussianLogPdf(data[i], components[j].mean, components[j].variance);
        responsibilities[i][j] = components[j].weight * Math.exp(logProb);
        total += responsibilities[i][j];
      }
      if (total > 1e-300) {
        for (let j = 0; j < k; j++) responsibilities[i][j] /= total;
      }
    }

    // M-step: update parameters
    for (let j = 0; j < k; j++) {
      let Nk = 0;
      const newMean = new Array(d).fill(0);
      for (let i = 0; i < n; i++) {
        Nk += responsibilities[i][j];
        for (let dim = 0; dim < d; dim++) {
          newMean[dim] += responsibilities[i][j] * data[i][dim];
        }
      }
      if (Nk < 1e-10) continue;

      for (let dim = 0; dim < d; dim++) newMean[dim] /= Nk;
      components[j].mean = newMean;

      const newVar = new Array(d).fill(0);
      for (let i = 0; i < n; i++) {
        for (let dim = 0; dim < d; dim++) {
          const diff = data[i][dim] - newMean[dim];
          newVar[dim] += responsibilities[i][j] * diff * diff;
        }
      }
      for (let dim = 0; dim < d; dim++) {
        newVar[dim] = Math.max(newVar[dim] / Nk, 1e-6);
      }
      components[j].variance = newVar;
      components[j].weight = Nk / n;
    }
  }

  return components;
}

function gaussianLogPdf(x: number[], mean: number[], variance: number[]): number {
  const d = x.length;
  let logP = -0.5 * d * Math.log(2 * Math.PI);
  for (let i = 0; i < d; i++) {
    const v = Math.max(variance[i], 1e-10);
    const diff = x[i] - mean[i];
    logP -= 0.5 * (Math.log(v) + diff * diff / v);
  }
  return logP;
}

// ─── HMM Viterbi ───

export interface HMMParams {
  states: number;         // N states
  observations: number;   // M observation symbols
  initial: number[];      // π[N] initial state probabilities
  transition: number[][];  // A[N][N] state transition
  emission: number[][];    // B[N][M] observation emission
}

/**
 * Viterbi algorithm: find most likely state sequence given observations.
 * Returns { path: number[], logProb: number }
 */
export function viterbi(
  hmm: HMMParams,
  obs: number[]
): { path: number[]; logProb: number } {
  const T = obs.length;
  const N = hmm.states;
  if (T === 0) return { path: [], logProb: -Infinity };

  // Work in log space for numerical stability
  const delta: number[][] = Array.from({ length: T }, () => new Array(N).fill(-Infinity));
  const psi: number[][] = Array.from({ length: T }, () => new Array(N).fill(0));

  // Init
  for (let s = 0; s < N; s++) {
    delta[0][s] = safeLog(hmm.initial[s]) + safeLog(hmm.emission[s][obs[0]]);
  }

  // Recursion
  for (let t = 1; t < T; t++) {
    for (let j = 0; j < N; j++) {
      let bestVal = -Infinity;
      let bestIdx = 0;
      for (let i = 0; i < N; i++) {
        const val = delta[t - 1][i] + safeLog(hmm.transition[i][j]);
        if (val > bestVal) { bestVal = val; bestIdx = i; }
      }
      delta[t][j] = bestVal + safeLog(hmm.emission[j][obs[t]]);
      psi[t][j] = bestIdx;
    }
  }

  // Termination
  let bestFinal = -Infinity;
  let lastState = 0;
  for (let s = 0; s < N; s++) {
    if (delta[T - 1][s] > bestFinal) {
      bestFinal = delta[T - 1][s];
      lastState = s;
    }
  }

  // Backtrack
  const path = new Array(T);
  path[T - 1] = lastState;
  for (let t = T - 2; t >= 0; t--) {
    path[t] = psi[t + 1][path[t + 1]];
  }

  return { path, logProb: bestFinal };
}

/** Forward algorithm: compute observation likelihood P(O|λ) */
export function hmmForward(hmm: HMMParams, obs: number[]): number {
  const T = obs.length;
  const N = hmm.states;
  if (T === 0) return 0;

  let alpha = new Array(N);
  for (let s = 0; s < N; s++) {
    alpha[s] = hmm.initial[s] * hmm.emission[s][obs[0]];
  }

  for (let t = 1; t < T; t++) {
    const newAlpha = new Array(N).fill(0);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        newAlpha[j] += alpha[i] * hmm.transition[i][j];
      }
      newAlpha[j] *= hmm.emission[j][obs[t]];
    }
    alpha = newAlpha;
  }

  return alpha.reduce((a, b) => a + b, 0);
}

function safeLog(x: number): number {
  return x > 1e-300 ? Math.log(x) : -700;
}

// ─── Matrix utilities (small N, no deps) ───

function matVecMul(A: number[][], v: number[]): number[] {
  return A.map(row => row.reduce((s, a, j) => s + a * (v[j] || 0), 0));
}

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, p = B[0]?.length || 0;
  return A.map(row =>
    Array.from({ length: p }, (_, j) =>
      row.reduce((s, a, k) => s + a * (B[k]?.[j] || 0), 0)
    )
  );
}

function matAdd(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v + (B[i]?.[j] || 0)));
}

function matSub(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v - (B[i]?.[j] || 0)));
}

function transpose(A: number[][]): number[][] {
  if (!A.length) return [];
  return A[0].map((_, j) => A.map(row => row[j]));
}

function eye(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

function vecAdd(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + (b[i] || 0));
}

function vecSub(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - (b[i] || 0));
}

/** Simple matrix inverse via Gauss-Jordan (for small matrices ≤6×6) */
function matInv(A: number[][]): number[][] {
  const n = A.length;
  const aug = A.map((row, i) => [...row, ...eye(n)[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    const pivot = aug[col][col] || 1e-10;
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map(row => row.slice(n));
}
