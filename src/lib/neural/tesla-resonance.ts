/**
 * ─── Tesla Resonance Engine ───
 * Kuramoto-coupled oscillator synchronization inspired by Tesla's
 * LC resonance circuits. Oscillators from different neural modules
 * mutually attract in phase, creating spontaneous synchronization
 * that maximizes inter-module cooperation and reduces latency.
 *
 * Core model: dθ_i/dt = ω_i + (K/N) * Σ_j [ A_j * sin(θ_j - θ_i) ]
 *
 * Ref: Kuramoto (1984), Tesla LC Resonance, Fries (2005)
 */

import type { OscillatorState, OscillatorConfig } from "./gamma-oscillations";

// ─── Types ───

export type ResonanceModuleId =
  | "feedforward" | "binding" | "feedback"
  | "multiagent" | "voice" | "vision"
  | "temporal" | "memory" | "planner";

export interface ResonanceNode {
  moduleId: ResonanceModuleId;
  oscillator: OscillatorState;
  config: OscillatorConfig;
  /** Natural frequency — never changes */
  naturalHz: number;
  /** Current adapted frequency (±5% from natural) */
  adaptedHz: number;
  /** Timestamp of registration */
  registeredAt: number;
}

export interface ResonanceMetrics {
  /** Kuramoto order parameter R (0=incoherent, 1=perfect sync) */
  resonanceIndex: number;
  /** Mean phase of the ensemble (Ψ) */
  meanPhase: number;
  /** Effective energy transfer rate between modules */
  energyTransfer: number;
  /** Time (ms) system has been in supercoherent state (R>0.8) */
  coherenceTime: number;
  /** Whether system is in supercoherent mode */
  isSupercoherent: boolean;
  /** Per-module phase deviation from mean */
  phaseDeviations: Record<string, number>;
  /** Timestamp */
  timestamp: number;
}

export interface TeslaResonanceField {
  nodes: Map<ResonanceModuleId, ResonanceNode>;
  /** Coupling strength K (modulated by dopamine) */
  couplingK: number;
  /** Frequency adaptation rate (how fast oscillators converge) */
  adaptationRate: number;
  /** Maximum frequency deviation from natural (fraction, e.g. 0.05 = ±5%) */
  maxFreqDeviation: number;
  /** Last computed metrics */
  metrics: ResonanceMetrics;
  /** When supercoherence started (0 if not active) */
  supercoherenceOnset: number;
  /** Total cycles run */
  cycleCount: number;
}

// ─── Constants ───

const DEFAULT_COUPLING_K = 0.3;
const SUPERCOHERENCE_THRESHOLD = 0.8;
const ULTRA_FAST_PATH_THRESHOLD = 0.85;
const MAX_FREQ_DEVIATION = 0.05; // ±5%
const ADAPTATION_RATE = 0.002;

// ─── Singleton ───

let _field: TeslaResonanceField | null = null;

// ─── Factory ───

export function createResonanceField(couplingK: number = DEFAULT_COUPLING_K): TeslaResonanceField {
  return {
    nodes: new Map(),
    couplingK,
    adaptationRate: ADAPTATION_RATE,
    maxFreqDeviation: MAX_FREQ_DEVIATION,
    metrics: {
      resonanceIndex: 0,
      meanPhase: 0,
      energyTransfer: 0,
      coherenceTime: 0,
      isSupercoherent: false,
      phaseDeviations: {},
      timestamp: Date.now(),
    },
    supercoherenceOnset: 0,
    cycleCount: 0,
  };
}

// ─── Registration ───

export function registerOscillator(
  field: TeslaResonanceField,
  moduleId: ResonanceModuleId,
  oscillator: OscillatorState,
  config: OscillatorConfig,
): TeslaResonanceField {
  const node: ResonanceNode = {
    moduleId,
    oscillator: { ...oscillator },
    config,
    naturalHz: config.centerHz,
    adaptedHz: config.centerHz,
    registeredAt: Date.now(),
  };
  const updated = { ...field, nodes: new Map(field.nodes) };
  updated.nodes.set(moduleId, node);
  return updated;
}

export function unregisterOscillator(
  field: TeslaResonanceField,
  moduleId: ResonanceModuleId,
): TeslaResonanceField {
  const updated = { ...field, nodes: new Map(field.nodes) };
  updated.nodes.delete(moduleId);
  return updated;
}

// ─── Kuramoto Order Parameter R ───

export function computeKuramotoOrderParameter(
  oscillators: OscillatorState[],
): { R: number; meanPhase: number } {
  if (oscillators.length === 0) return { R: 0, meanPhase: 0 };

  let cosSum = 0;
  let sinSum = 0;
  for (const osc of oscillators) {
    cosSum += osc.amplitude * Math.cos(osc.phase);
    sinSum += osc.amplitude * Math.sin(osc.phase);
  }

  const totalAmp = oscillators.reduce((s, o) => s + o.amplitude, 0) || 1;
  cosSum /= totalAmp;
  sinSum /= totalAmp;

  const R = Math.sqrt(cosSum * cosSum + sinSum * sinSum);
  const meanPhase = Math.atan2(sinSum, cosSum);
  return { R: Math.min(1, R), meanPhase };
}

// ─── Core: Coupled Resonance Step ───

/**
 * Advances all oscillators in the field with Kuramoto coupling.
 * Each oscillator's phase is pulled toward the ensemble mean,
 * weighted by coupling K and neighbor amplitudes.
 * Frequencies adapt slightly toward convergence (Tesla resonance).
 */
export function stepResonanceField(
  field: TeslaResonanceField,
  dt: number,
  stimuli: Partial<Record<ResonanceModuleId, number>>,
  dopamineLevel: number = 0.7,
): TeslaResonanceField {
  const updated: TeslaResonanceField = {
    ...field,
    nodes: new Map(),
    cycleCount: field.cycleCount + 1,
  };

  const nodeArray = Array.from(field.nodes.values());
  const N = nodeArray.length;
  if (N === 0) return updated;

  // Modulate coupling by dopamine (higher dopamine = stronger coupling)
  const effectiveK = field.couplingK * (0.5 + dopamineLevel * 0.7);

  // Collect all oscillator states for coupling computation
  const allOscStates = nodeArray.map(n => n.oscillator);

  // Step each oscillator with Kuramoto coupling
  for (const node of nodeArray) {
    const stimulus = stimuli[node.moduleId] ?? 0.1;
    const osc = node.oscillator;

    // Kuramoto coupling term: (K/N) * Σ_j [ A_j * sin(θ_j - θ_i) ]
    let couplingTerm = 0;
    for (const other of allOscStates) {
      if (other === osc) continue;
      couplingTerm += other.amplitude * Math.sin(other.phase - osc.phase);
    }
    couplingTerm *= effectiveK / N;

    // Phase advance with coupling
    const adaptedFreqRad = 2 * Math.PI * node.adaptedHz / 1000;
    const newPhase = (osc.phase + dt * (adaptedFreqRad + couplingTerm)) % (2 * Math.PI);

    // Step E/I dynamics based on model
    let newExcitation = osc.excitation;
    let newInhibition = osc.inhibition;
    if (node.config.model === "PING") {
      newExcitation += dt * (-osc.excitation / node.config.tauAMPA + stimulus);
      newInhibition += dt * (-osc.inhibition / node.config.tauGABA + osc.excitation);
    } else {
      newInhibition += dt * (-osc.inhibition / node.config.tauGABA + stimulus * 0.5);
      newExcitation += dt * (-osc.excitation / node.config.tauAMPA - osc.inhibition * 0.3);
    }

    const sigmoid = (x: number) => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
    const newAmplitude = sigmoid(newExcitation - newInhibition);

    // Frequency adaptation: gently pull toward ensemble mean frequency
    const meanHz = nodeArray.reduce((s, n) => s + n.adaptedHz, 0) / N;
    const freqPull = (meanHz - node.adaptedHz) * field.adaptationRate;
    const maxDev = node.naturalHz * field.maxFreqDeviation;
    const newAdaptedHz = Math.max(
      node.naturalHz - maxDev,
      Math.min(node.naturalHz + maxDev, node.adaptedHz + freqPull),
    );

    const newNode: ResonanceNode = {
      ...node,
      adaptedHz: newAdaptedHz,
      oscillator: {
        phase: newPhase,
        amplitude: newAmplitude,
        frequency: newAdaptedHz,
        excitation: newExcitation,
        inhibition: newInhibition,
      },
    };

    updated.nodes.set(node.moduleId, newNode);
  }

  // Compute metrics
  const updatedOscillators = Array.from(updated.nodes.values()).map(n => n.oscillator);
  const { R, meanPhase } = computeKuramotoOrderParameter(updatedOscillators);

  // Energy transfer: average amplitude exchange rate
  const energyTransfer = R * updatedOscillators.reduce((s, o) => s + o.amplitude, 0) / N;

  // Phase deviations per module
  const phaseDeviations: Record<string, number> = {};
  for (const [id, node] of updated.nodes) {
    phaseDeviations[id] = Math.abs(node.oscillator.phase - meanPhase);
  }

  // Supercoherence tracking
  const now = Date.now();
  let supercoherenceOnset = field.supercoherenceOnset;
  const isSupercoherent = R >= SUPERCOHERENCE_THRESHOLD;

  if (isSupercoherent && supercoherenceOnset === 0) {
    supercoherenceOnset = now;
  } else if (!isSupercoherent) {
    supercoherenceOnset = 0;
  }

  const coherenceTime = isSupercoherent && supercoherenceOnset > 0
    ? now - supercoherenceOnset
    : 0;

  updated.supercoherenceOnset = supercoherenceOnset;
  updated.metrics = {
    resonanceIndex: R,
    meanPhase,
    energyTransfer,
    coherenceTime,
    isSupercoherent,
    phaseDeviations,
    timestamp: now,
  };

  return updated;
}

// ─── Singleton API ───

export function getResonanceField(): TeslaResonanceField {
  if (!_field) _field = createResonanceField();
  return _field;
}

export function setResonanceField(field: TeslaResonanceField): void {
  _field = field;
}

export function getResonanceMetrics(): ResonanceMetrics {
  return getResonanceField().metrics;
}

export function getResonanceIndex(): number {
  return getResonanceField().metrics.resonanceIndex;
}

export function isUltraFastPathActive(): boolean {
  return getResonanceField().metrics.resonanceIndex >= ULTRA_FAST_PATH_THRESHOLD;
}

export function isSupercoherent(): boolean {
  return getResonanceField().metrics.isSupercoherent;
}

// ─── Convenience: Register consciousness-bridge oscillators ───

export function registerConsciousnessOscillators(
  oscillators: Record<string, OscillatorState>,
  configs: Record<string, OscillatorConfig>,
): TeslaResonanceField {
  let field = getResonanceField();
  for (const [name, osc] of Object.entries(oscillators)) {
    const config = configs[name];
    if (config) {
      field = registerOscillator(field, name as ResonanceModuleId, osc, config);
    }
  }
  setResonanceField(field);
  return field;
}

// ─── Modulate coupling dynamically ───

export function modulateCoupling(dopamine: number, acetylcholine: number = 0.5): void {
  const field = getResonanceField();
  // Dopamine strengthens coupling; acetylcholine fine-tunes
  field.couplingK = DEFAULT_COUPLING_K * (0.6 + dopamine * 0.5 + acetylcholine * 0.2);
  setResonanceField(field);
}

// ─── Diagnostics ───

export function getResonanceDiagnostics(): {
  moduleCount: number;
  resonanceIndex: number;
  coherenceTimeMs: number;
  isSupercoherent: boolean;
  frequencySpread: number;
  meanAmplitude: number;
  couplingK: number;
  cycleCount: number;
} {
  const field = getResonanceField();
  const nodes = Array.from(field.nodes.values());
  const freqs = nodes.map(n => n.adaptedHz);
  const amps = nodes.map(n => n.oscillator.amplitude);
  const freqSpread = freqs.length > 1
    ? Math.max(...freqs) - Math.min(...freqs)
    : 0;
  const meanAmp = amps.length > 0
    ? amps.reduce((s, a) => s + a, 0) / amps.length
    : 0;

  return {
    moduleCount: nodes.length,
    resonanceIndex: field.metrics.resonanceIndex,
    coherenceTimeMs: field.metrics.coherenceTime,
    isSupercoherent: field.metrics.isSupercoherent,
    frequencySpread: freqSpread,
    meanAmplitude: meanAmp,
    couplingK: field.couplingK,
    cycleCount: field.cycleCount,
  };
}
