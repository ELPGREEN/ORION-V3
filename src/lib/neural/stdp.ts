/**
 * ─── v21.5: Spike-Timing-Dependent Plasticity (STDP) ───
 * Pairwise STDP (Bi & Poo 1998) + Triplet STDP (Pfister & Gerstner 2006)
 * + Neuromodulation (Brzosko 2019) + Eligibility Traces
 * 
 * Corrected in v21.5:
 * - Depression formula fixed (deltaT already negative, exp(deltaT/tau) decays correctly)
 * - Triplet STDP with proper tau_triplet window
 * - Dopaminergic neuromodulation as third factor
 * - Eligibility traces with configurable decay
 * - Event-driven applySTDP for discrete spike events
 */

// ─── Core STDP Config ───

export interface STDPConfig {
  /** Learning rate for potentiation (pre→post) */
  etaPlus: number;
  /** Learning rate for depression (post→pre) */
  etaMinus: number;
  /** Time constant for potentiation window (ms) */
  tauPlus: number;
  /** Time constant for depression window (ms) */
  tauMinus: number;
  /** Triplet learning rate */
  etaTriplet: number;
  /** Triplet time constant (ms) */
  tauTriplet: number;
  /** Dopamine gain (neuromodulatory third factor) [0-2] */
  dopamineGain: number;
  /** Maximum weight bound */
  wMax: number;
  /** Minimum weight bound */
  wMin: number;
  /** Eligibility trace decay per cycle */
  eligibilityDecay: number;
}

export const DEFAULT_STDP_CONFIG: STDPConfig = {
  etaPlus: 0.01,
  etaMinus: 0.012,
  tauPlus: 20,
  tauMinus: 20,
  etaTriplet: 0.005,
  tauTriplet: 50,
  dopamineGain: 1.0,
  wMax: 1.0,
  wMin: -1.0,
  eligibilityDecay: 0.95,
};

// ─── Spike Events ───

export interface SpikeEvent {
  neuronId: number;
  timestamp: number;
  type: "pre" | "post" | "reward" | "feedback";
  dopamineLevel?: number;
}

interface EligibilityTrace {
  [key: string]: number;
}

// ─── Helper ───

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

// ─── Pairwise + Triplet STDP Delta (v21.5 corrected) ───

/**
 * Compute STDP weight change based on spike timing difference.
 * Supports both pairwise (2 args) and triplet (3 args) modes.
 *
 * Pairwise:
 *   Δw = η⁺ · exp(-Δt/τ⁺) if Δt > 0 (potentiation)
 *   Δw = -η⁻ · exp(Δt/τ⁻) if Δt < 0 (depression — Δt already negative)
 *
 * Triplet (Pfister & Gerstner 2006):
 *   Adds modulation by inter-post-spike interval.
 */
export function computeSTDPDelta(
  deltaT: number,
  config: STDPConfig = DEFAULT_STDP_CONFIG
): number {
  if (deltaT > 0) {
    return config.etaPlus * Math.exp(-deltaT / config.tauPlus);
  } else if (deltaT < 0) {
    // deltaT is already negative, so exp(deltaT / tauMinus) decays correctly
    return -config.etaMinus * Math.exp(deltaT / config.tauMinus);
  }
  return 0;
}

/**
 * Combined pairwise + triplet STDP delta with neuromodulation support.
 */
export function computeFullSTDPDelta(
  deltaT: number,
  post2DeltaT: number | null,
  config: STDPConfig = DEFAULT_STDP_CONFIG
): number {
  let dw = computeSTDPDelta(deltaT, config);

  // Triplet modulation (Pfister & Gerstner 2006)
  if (post2DeltaT !== null && post2DeltaT > 0) {
    const tripletFactor =
      Math.exp(-Math.abs(deltaT) / config.tauTriplet) *
      Math.exp(-post2DeltaT / config.tauTriplet);
    dw += config.etaTriplet * tripletFactor;
  }

  return dw;
}

// ─── Legacy pairwise applySTDP (preserves existing API) ───

/**
 * Apply pairwise STDP to a weight matrix given spike timing arrays.
 * Legacy API preserved for backward compatibility.
 */
export function applySTDP(
  weights: number[][],
  preSpikeTimes: number[],
  postSpikeTimes: number[],
  config: STDPConfig = DEFAULT_STDP_CONFIG
): number[][] {
  const n = weights.length;
  const updated = weights.map(row => [...row]);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const deltaT = (postSpikeTimes[j] ?? 0) - (preSpikeTimes[i] ?? 0);
      const dw = computeSTDPDelta(deltaT, config);
      updated[i][j] = clamp(updated[i][j] + dw, config.wMin, config.wMax);
    }
  }

  return updated;
}

// ─── Event-driven STDP with eligibility traces + neuromodulation (v21.5) ───

export interface STDPResult {
  updatedWeights: number[][];
  traces: Record<string, number>;
}

/**
 * Event-driven STDP with dopaminergic neuromodulation and eligibility traces.
 * Processes discrete spike events (pre, post, reward, feedback).
 * Third factor: Brzosko et al. (2019).
 */
export function applyEventDrivenSTDP(
  weights: number[][],
  events: SpikeEvent[],
  config: STDPConfig = DEFAULT_STDP_CONFIG
): STDPResult {
  const N = weights.length;
  const traces: EligibilityTrace = {};
  const updatedWeights = weights.map(row => [...row]);

  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const lastPostTimes = new Array(N).fill(-Infinity);
  const lastPost2Times = new Array(N).fill(-Infinity);

  for (const event of sortedEvents) {
    const i = event.neuronId;
    if (i < 0 || i >= N) continue;

    if (event.type === "pre") {
      for (let j = 0; j < N; j++) {
        const key = `${i}-${j}`;
        traces[key] = (traces[key] || 0) + 1;
      }
    }

    if (event.type === "post" || event.type === "reward") {
      const dopamine = event.dopamineLevel ?? config.dopamineGain;

      for (let preId = 0; preId < N; preId++) {
        const key = `${preId}-${i}`;
        const trace = traces[key] || 0;
        if (trace === 0) continue;

        const deltaT = event.timestamp - lastPostTimes[preId];
        const dt2 = event.timestamp - lastPost2Times[preId];

        const delta = computeFullSTDPDelta(
          deltaT,
          dt2 > 0 ? dt2 : null,
          config
        );

        // Neuromodulation (third factor)
        const modulatedDelta = delta * dopamine * trace;

        updatedWeights[preId][i] = clamp(
          updatedWeights[preId][i] + modulatedDelta,
          config.wMin,
          config.wMax
        );

        // Decay trace
        traces[key] *= config.eligibilityDecay;
        if (Math.abs(traces[key]) < 0.001) delete traces[key];
      }

      lastPost2Times[i] = lastPostTimes[i];
      lastPostTimes[i] = event.timestamp;
    }
  }

  return { updatedWeights, traces };
}

// ─── Neuromodulation ───

export type Neuromodulator = "dopamine" | "serotonin" | "norepinephrine" | "acetylcholine";

export interface NeuromodulationState {
  dopamine: number;
  serotonin: number;
  norepinephrine: number;
  acetylcholine: number;
}

export const DEFAULT_NEUROMODULATION: NeuromodulationState = {
  dopamine: 0.5,
  serotonin: 0.5,
  norepinephrine: 0.5,
  acetylcholine: 0.5,
};

/**
 * Update neuromodulation based on feedback signals.
 * Inspired by Aguilar (2021) emotional modulation.
 */
export function updateNeuromodulation(
  state: NeuromodulationState,
  signal: {
    reward?: number;
    uncertainty?: number;
    novelty?: number;
    successStreak?: number;
  }
): NeuromodulationState {
  const decay = 0.95;
  const lr = 0.1;

  let { dopamine, serotonin, norepinephrine, acetylcholine } = state;

  dopamine = dopamine * decay + 0.5 * (1 - decay);
  serotonin = serotonin * decay + 0.5 * (1 - decay);
  norepinephrine = norepinephrine * decay + 0.5 * (1 - decay);
  acetylcholine = acetylcholine * decay + 0.5 * (1 - decay);

  if (signal.reward !== undefined) {
    dopamine += lr * signal.reward;
    acetylcholine += lr * Math.abs(signal.reward) * 0.5;
  }

  if (signal.uncertainty !== undefined) {
    norepinephrine += lr * signal.uncertainty;
    dopamine -= lr * signal.uncertainty * 0.3;
  }

  if (signal.novelty !== undefined) {
    acetylcholine += lr * signal.novelty;
    norepinephrine += lr * signal.novelty * 0.5;
  }

  if (signal.successStreak !== undefined && signal.successStreak > 3) {
    serotonin += lr * 0.3;
    norepinephrine -= lr * 0.2;
  }

  const c = (v: number) => clamp(v, 0, 1);

  return {
    dopamine: c(dopamine),
    serotonin: c(serotonin),
    norepinephrine: c(norepinephrine),
    acetylcholine: c(acetylcholine),
  };
}

/**
 * Modulate learning rate based on neuromodulation state.
 */
export function modulateLearningRate(
  baseLR: number,
  state: NeuromodulationState
): number {
  const excitation = (state.dopamine + state.acetylcholine) / 2;
  const inhibition = state.serotonin * 0.3;
  const alertness = state.norepinephrine * 0.2;
  return baseLR * (0.5 + excitation - inhibition + alertness);
}

/**
 * Modulate exploration rate (epsilon) based on neuromodulation.
 */
export function modulateExploration(
  baseEpsilon: number,
  state: NeuromodulationState
): number {
  const explorationDrive = (1 - state.serotonin) * 0.5 + state.norepinephrine * 0.5;
  return Math.max(0.01, Math.min(0.5, baseEpsilon * explorationDrive * 2));
}

// ─── Triplet STDP (standalone, Pfister & Gerstner 2006) ───

export interface TripletSTDPConfig {
  etaPlus: number;
  etaMinus: number;
  tauPlus: number;
  tauMinus: number;
  tauX: number;
  tauY: number;
}

export const DEFAULT_TRIPLET_STDP_CONFIG: TripletSTDPConfig = {
  etaPlus: 0.01,
  etaMinus: 0.012,
  tauPlus: 20,
  tauMinus: 20,
  tauX: 40,
  tauY: 40,
};

export function computeTripletSTDPDelta(
  preSpikeTime: number,
  postSpikeTime: number,
  previousPostSpikeTime: number,
  config: TripletSTDPConfig = DEFAULT_TRIPLET_STDP_CONFIG
): number {
  const dt1 = postSpikeTime - preSpikeTime;
  const dt2 = postSpikeTime - previousPostSpikeTime;

  if (dt1 > 0 && dt2 > 0) {
    return config.etaPlus * Math.exp(-dt1 / config.tauPlus) * Math.exp(-dt2 / config.tauY);
  } else if (dt1 < 0) {
    return -config.etaMinus * Math.exp(dt1 / config.tauMinus);
  }
  return 0;
}

export function applyTripletSTDP(
  weights: number[][],
  spikeTimes: number[][],
  config: TripletSTDPConfig = DEFAULT_TRIPLET_STDP_CONFIG
): number[][] {
  const n = weights.length;
  const updated = weights.map(row => [...row]);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const preSpikes = spikeTimes[i] || [];
      const postSpikes = spikeTimes[j] || [];
      if (preSpikes.length === 0 || postSpikes.length < 2) continue;

      const lastPre = preSpikes[preSpikes.length - 1];
      const lastPost = postSpikes[postSpikes.length - 1];
      const prevPost = postSpikes[postSpikes.length - 2];

      const dw = computeTripletSTDPDelta(lastPre, lastPost, prevPost, config);
      updated[i][j] = clamp(updated[i][j] + dw, -1, 1);
    }
  }

  return updated;
}
