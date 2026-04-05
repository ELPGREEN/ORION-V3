/**
 * ─── v21.5: Temporal Binding + STDP + Gamma Oscillations ───
 * Cross-modal temporal binding with corrected STDP (Bi & Poo 1998),
 * Triplet STDP (Pfister & Gerstner 2006), Neuromodulation (Brzosko 2019),
 * Eligibility Traces, and Gamma Oscillation models (Fries 2005/2015).
 */

import type { SpikeEvent } from "./stdp";
export type { SpikeEvent };

// ─── Types ───

export interface BindingState {
  weights: number[][];
  lastSpikeTimes: number[];
  eligibilityTraces: Record<string, number>;
  neuromodulation: BindingNeuroState;
  gammaOscillators: GammaOscillator[];
  bindingEvents: BindingEvent[];
}

export interface BindingNeuroState {
  dopamine: number;
  serotonin: number;
  norepinephrine: number;
  acetylcholine: number;
}

export interface GammaOscillator {
  phase: number;
  amplitude: number;
  frequency: number;
  subBand: "low" | "mid" | "high";
}

export interface BindingEvent {
  preId: number;
  postId: number;
  strength: number;
  timestamp: number;
}

// ─── Config ───

const BINDING_CONFIG = {
  etaPlus: 0.01,
  etaMinus: 0.012,
  tauPlus: 20,
  tauMinus: 20,
  etaTriplet: 0.005,
  tauTriplet: 50,
  eligibilityDecay: 0.95,
  minWeight: -1.0,
  maxWeight: 1.0,
} as const;

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

// ─── STDP Core (corrected v21.5) ───

function computeBindingSTDP(
  preTime: number,
  postTime: number,
  post2Time: number | null
): number {
  const deltaT = postTime - preTime;
  let dw = 0;

  if (deltaT > 0) {
    dw += BINDING_CONFIG.etaPlus * Math.exp(-deltaT / BINDING_CONFIG.tauPlus);
  } else if (deltaT < 0) {
    dw -= BINDING_CONFIG.etaMinus * Math.exp(deltaT / BINDING_CONFIG.tauMinus);
  }

  if (post2Time !== null) {
    const dt2 = post2Time - postTime;
    if (dt2 > 0) {
      const triplet =
        Math.exp(-Math.abs(deltaT) / BINDING_CONFIG.tauTriplet) *
        Math.exp(-dt2 / BINDING_CONFIG.tauTriplet);
      dw += BINDING_CONFIG.etaTriplet * triplet;
    }
  }

  return dw;
}

// ─── Gamma Oscillations (PING/CTC, Fries 2005/2015) ───

function stepGammaOscillator(
  osc: GammaOscillator,
  dtMs: number,
  stimulus: number,
  couplingTerm: number = 0,
): GammaOscillator {
  return {
    ...osc,
    phase: osc.phase + dtMs * (2 * Math.PI * osc.frequency / 1000 + couplingTerm),
    amplitude: clamp(osc.amplitude * 0.95 + stimulus * 0.05, 0.01, 1.0),
  };
}

function computeCTC(a: GammaOscillator, b: GammaOscillator): number {
  const plv = Math.abs(Math.cos(a.phase - b.phase));
  return plv * Math.min(a.amplitude, b.amplitude);
}

// ─── Public API ───

export function initBindingState(numNeurons: number = 12): BindingState {
  return {
    weights: Array.from({ length: numNeurons }, () => Array(numNeurons).fill(0.1)),
    lastSpikeTimes: new Array(numNeurons).fill(-Infinity),
    eligibilityTraces: {},
    neuromodulation: { dopamine: 0.5, serotonin: 0.5, norepinephrine: 0.5, acetylcholine: 0.5 },
    gammaOscillators: [
      { phase: 0, amplitude: 0.6, frequency: 32, subBand: "low" },
      { phase: 0, amplitude: 0.8, frequency: 52, subBand: "mid" },
      { phase: 0, amplitude: 0.4, frequency: 80, subBand: "high" },
    ],
    bindingEvents: [],
  };
}

export function registerEvent(state: BindingState, event: SpikeEvent): BindingState {
  const N = state.weights.length;
  const i = event.neuronId;
  if (i < 0 || i >= N) return state;

  const now = event.timestamp;
  const newState: BindingState = {
    weights: state.weights.map(row => [...row]),
    lastSpikeTimes: [...state.lastSpikeTimes],
    eligibilityTraces: { ...state.eligibilityTraces },
    neuromodulation: { ...state.neuromodulation },
    gammaOscillators: state.gammaOscillators.map(o => ({ ...o })),
    bindingEvents: [...state.bindingEvents],
  };

  // Neuromodulation update
  if (event.dopamineLevel !== undefined) {
    newState.neuromodulation.dopamine = clamp(
      newState.neuromodulation.dopamine + event.dopamineLevel * 0.3, 0, 1
    );
  }

  // STDP + Eligibility Traces on post/reward events
  if (event.type === "post" || event.type === "reward") {
    const dopamine = event.dopamineLevel ?? newState.neuromodulation.dopamine;

    for (let preId = 0; preId < N; preId++) {
      const key = `${preId}-${i}`;
      const trace = newState.eligibilityTraces[key] || 0;
      if (trace === 0) continue;

      const delta = computeBindingSTDP(
        newState.lastSpikeTimes[preId],
        now,
        newState.lastSpikeTimes[preId] > -Infinity ? now : null
      );

      newState.weights[preId][i] = clamp(
        newState.weights[preId][i] + delta * dopamine * trace,
        BINDING_CONFIG.minWeight,
        BINDING_CONFIG.maxWeight
      );
    }
  }

  // Update spike time
  newState.lastSpikeTimes[i] = now;

  // Pre events create eligibility traces
  if (event.type === "pre") {
    for (let j = 0; j < N; j++) {
      const key = `${i}-${j}`;
      newState.eligibilityTraces[key] = (newState.eligibilityTraces[key] || 0) + 1;
    }
  }

  // Decay all traces
  for (const key in newState.eligibilityTraces) {
    newState.eligibilityTraces[key] *= BINDING_CONFIG.eligibilityDecay;
    if (Math.abs(newState.eligibilityTraces[key]) < 0.001) {
      delete newState.eligibilityTraces[key];
    }
  }

  // Step gamma oscillators with internal Kuramoto coupling
  const stimulus = event.type === "reward" ? 0.3 : 0.05;
  const oscs = newState.gammaOscillators;
  const couplingK = 0.2;
  newState.gammaOscillators = oscs.map((o, idx) => {
    // Compute coupling from sibling oscillators
    let coupling = 0;
    for (let j = 0; j < oscs.length; j++) {
      if (j === idx) continue;
      coupling += oscs[j].amplitude * Math.sin(oscs[j].phase - o.phase);
    }
    coupling *= couplingK / oscs.length;
    return stepGammaOscillator(o, 10, stimulus, coupling);
  });

  // Record binding event on post
  if (event.type === "post") {
    // Find strongest pre trace for this post
    let bestPre = 0;
    let bestTrace = 0;
    for (let p = 0; p < N; p++) {
      const t = newState.eligibilityTraces[`${p}-${i}`] || 0;
      if (t > bestTrace) { bestTrace = t; bestPre = p; }
    }
    newState.bindingEvents.push({
      preId: bestPre,
      postId: i,
      strength: newState.weights[bestPre]?.[i] ?? 0.5,
      timestamp: now,
    });
  }

  return newState;
}

export function consolidateBindings(state: BindingState, maxAgeMs: number = 300000): BindingState {
  const cutoff = Date.now() - maxAgeMs;
  return {
    ...state,
    bindingEvents: state.bindingEvents.filter(e => e.timestamp > cutoff),
  };
}

export function queryBindings(state: BindingState, neuronId: number): BindingEvent[] {
  return state.bindingEvents
    .filter(e => e.preId === neuronId || e.postId === neuronId)
    .sort((a, b) => b.strength - a.strength);
}

export function gammaSynchrony(state: BindingState): number {
  const osc = state.gammaOscillators;
  if (osc.length < 2) return 0;
  let plvSum = 0;
  let pairs = 0;
  for (let i = 0; i < osc.length; i++) {
    for (let j = i + 1; j < osc.length; j++) {
      plvSum += computeCTC(osc[i], osc[j]);
      pairs++;
    }
  }
  return pairs > 0 ? plvSum / pairs : 0;
}

export function getBindingSummary(state: BindingState): {
  totalBindings: number;
  avgStrength: number;
  gammaHealth: number;
  neuromodulation: BindingNeuroState;
  strongestLink: number;
  activeNeurons: number;
} {
  const now = Date.now();
  return {
    totalBindings: state.bindingEvents.length,
    avgStrength: state.bindingEvents.length > 0
      ? state.bindingEvents.reduce((s, e) => s + e.strength, 0) / state.bindingEvents.length
      : 0,
    gammaHealth: gammaSynchrony(state),
    neuromodulation: { ...state.neuromodulation },
    strongestLink: state.weights.length > 0 ? Math.max(...state.weights.flat()) : 0,
    activeNeurons: state.lastSpikeTimes.filter(t => t > now - 1000).length,
  };
}

// ─── Legal STDP Application Layer ───

/** Hash a legal concept string to a neuron index (0–11) */
function hashConceito(conceito: string): number {
  let hash = 0;
  for (let i = 0; i < conceito.length; i++) {
    hash = ((hash << 5) - hash + conceito.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 12;
}

export type LegalEventType = "pesquisa" | "feedback_pos" | "feedback_neg" | "correcao" | "pdf_layout" | "citacao";

/**
 * Apply STDP in a legal context: binds two legal concepts temporally
 * with appropriate dopamine levels based on interaction type.
 */
export function applyLegalSTDP(
  state: BindingState,
  contexto: {
    conceito1: string;
    conceito2: string;
    tipo: LegalEventType;
    dopamineLevel?: number;
  }
): { state: BindingState; summary: ReturnType<typeof getBindingSummary> } {
  const now = Date.now();

  const dopamineMap: Record<LegalEventType, number> = {
    pesquisa: 0.8,
    feedback_pos: 1.4,
    feedback_neg: 0.2,
    correcao: 0.3,
    pdf_layout: 0.6,
    citacao: 1.0,
  };

  const postType = contexto.tipo === "feedback_pos" || contexto.tipo === "citacao"
    ? "reward" as const
    : contexto.tipo === "correcao" || contexto.tipo === "feedback_neg"
      ? "feedback" as const
      : "post" as const;

  // Pre-synaptic spike (first concept)
  let updated = registerEvent(state, {
    neuronId: hashConceito(contexto.conceito1),
    timestamp: now - 50,
    type: "pre",
  });

  // Post-synaptic spike (second concept + dopamine)
  updated = registerEvent(updated, {
    neuronId: hashConceito(contexto.conceito2),
    timestamp: now,
    type: postType,
    dopamineLevel: contexto.dopamineLevel ?? dopamineMap[contexto.tipo] ?? 1.0,
  });

  return { state: updated, summary: getBindingSummary(updated) };
}
