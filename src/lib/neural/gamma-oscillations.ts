/**
 * ─── v21.2: Gamma Oscillation Models ───
 * PING/ING circuit models, Communication Through Coherence (CTC).
 * 
 * Ref: Fries (2005, 2015), Tort et al. (2010)
 * Sub-bands: Low (25-40Hz), Mid (40-65Hz), High (65-100Hz)
 */

export interface OscillatorState {
  phase: number;
  amplitude: number;
  frequency: number;
  excitation: number;
  inhibition: number;
}

export interface OscillatorConfig {
  centerHz: number;
  tauAMPA: number;  // ms
  tauGABA: number;  // ms
  model: "PING" | "ING";
}

export const GAMMA_SUB_BANDS = {
  low:  { min: 25, max: 40, center: 32, label: "Low gamma (feedback/memory)" },
  mid:  { min: 40, max: 65, center: 52, label: "Mid gamma (binding/perception)" },
  high: { min: 65, max: 100, center: 80, label: "High gamma (feedforward/local)" },
} as const;

export function initOscillator(config: OscillatorConfig): OscillatorState {
  return {
    phase: 0,
    amplitude: 0,
    frequency: config.centerHz,
    excitation: 0,
    inhibition: 0,
  };
}

function sigmoid(x: number): number {
  const clamped = Math.max(-500, Math.min(500, x));
  return 1 / (1 + Math.exp(-clamped));
}

export function stepOscillator(
  state: OscillatorState,
  dt: number,
  stimulus: number,
  config: OscillatorConfig
): OscillatorState {
  const newState = { ...state };

  if (config.model === "PING") {
    newState.excitation += dt * (-state.excitation / config.tauAMPA + stimulus);
    newState.inhibition += dt * (-state.inhibition / config.tauGABA + state.excitation);
  } else {
    // ING: mutual inhibition
    newState.inhibition += dt * (-state.inhibition / config.tauGABA + stimulus * 0.5);
    newState.excitation += dt * (-state.excitation / config.tauAMPA - state.inhibition * 0.3);
  }

  newState.phase += dt * 2 * Math.PI * config.centerHz / 1000;
  newState.phase = newState.phase % (2 * Math.PI);
  newState.amplitude = sigmoid(newState.excitation - newState.inhibition);
  newState.frequency = config.centerHz;

  return newState;
}

export function computeCTC(
  oscA: OscillatorState,
  oscB: OscillatorState,
  phaseDiffs: number[]
): number {
  // Phase-Locking Value (PLV)
  if (phaseDiffs.length === 0) return 0;
  const cosSum = phaseDiffs.reduce((s, dp) => s + Math.cos(dp), 0);
  const sinSum = phaseDiffs.reduce((s, dp) => s + Math.sin(dp), 0);
  const plv = Math.sqrt(cosSum * cosSum + sinSum * sinSum) / phaseDiffs.length;
  const ampGate = Math.min(oscA.amplitude, oscB.amplitude);
  return plv * ampGate;
}

export function antiPhaseBindingStrength(phaseDiff: number): number {
  return Math.pow(Math.cos(phaseDiff - Math.PI), 2);
}

export function detectGammaBurst(
  timestamps: number[],
  onset: number,
  window: number = 280
): number[] {
  return timestamps.filter(t => t >= onset && t <= onset + window);
}

export function thetaGammaCouplingMI(
  thetaPhases: number[],
  gammaAmps: number[],
  nBins: number = 18
): number {
  const bins = new Array(nBins).fill(0);
  const counts = new Array(nBins).fill(0);

  for (let i = 0; i < Math.min(thetaPhases.length, gammaAmps.length); i++) {
    const phase = ((thetaPhases[i] % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const binIdx = Math.min(Math.floor(phase / (2 * Math.PI) * nBins), nBins - 1);
    bins[binIdx] += gammaAmps[i];
    counts[binIdx]++;
  }

  for (let i = 0; i < nBins; i++) {
    bins[i] = counts[i] > 0 ? bins[i] / counts[i] : 0;
  }

  const total = bins.reduce((s, v) => s + v, 0) || 1;
  const p = bins.map(v => v / total);
  const H = -p.reduce((s, pi) => s + (pi > 0 ? pi * Math.log(pi) : 0), 0);
  return (Math.log(nBins) - H) / Math.log(nBins);
}

export function classifyGammaSubBand(frequency: number): keyof typeof GAMMA_SUB_BANDS | "out_of_range" {
  if (frequency >= 25 && frequency <= 40) return "low";
  if (frequency > 40 && frequency <= 65) return "mid";
  if (frequency > 65 && frequency <= 100) return "high";
  return "out_of_range";
}

export function gammaHealthScore(oscillator: OscillatorState, targetHz: number = 40): number {
  const freqMatch = 1 - Math.abs(oscillator.frequency - targetHz) / targetHz;
  return Math.max(0, freqMatch * oscillator.amplitude);
}

// ─── Tesla Resonance Extensions (Kuramoto Coupling) ───

/**
 * Step oscillator with Kuramoto coupling from neighbors.
 * Each neighbor pulls the oscillator's phase proportionally
 * to its amplitude and the phase difference (sin coupling).
 */
export function stepOscillatorCoupled(
  state: OscillatorState,
  dt: number,
  stimulus: number,
  config: OscillatorConfig,
  neighbors: OscillatorState[],
  couplingK: number = 0.3,
): OscillatorState {
  const newState = { ...state };

  // E/I dynamics (same as stepOscillator)
  if (config.model === "PING") {
    newState.excitation += dt * (-state.excitation / config.tauAMPA + stimulus);
    newState.inhibition += dt * (-state.inhibition / config.tauGABA + state.excitation);
  } else {
    newState.inhibition += dt * (-state.inhibition / config.tauGABA + stimulus * 0.5);
    newState.excitation += dt * (-state.excitation / config.tauAMPA - state.inhibition * 0.3);
  }

  // Kuramoto coupling term: (K/N) * Σ_j [ A_j * sin(θ_j - θ_i) ]
  let couplingTerm = 0;
  const N = neighbors.length;
  if (N > 0) {
    for (const neighbor of neighbors) {
      couplingTerm += neighbor.amplitude * Math.sin(neighbor.phase - state.phase);
    }
    couplingTerm *= couplingK / N;
  }

  // Phase advance with coupling
  newState.phase += dt * (2 * Math.PI * config.centerHz / 1000 + couplingTerm);
  newState.phase = ((newState.phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  newState.amplitude = sigmoid(newState.excitation - newState.inhibition);
  newState.frequency = config.centerHz;

  return newState;
}

/**
 * Compute Kuramoto order parameter R for an ensemble of oscillators.
 * R=0: fully incoherent; R=1: perfectly synchronized.
 */
export function computeResonanceIndex(oscillators: OscillatorState[]): number {
  if (oscillators.length === 0) return 0;
  let cosSum = 0;
  let sinSum = 0;
  let totalAmp = 0;
  for (const osc of oscillators) {
    cosSum += osc.amplitude * Math.cos(osc.phase);
    sinSum += osc.amplitude * Math.sin(osc.phase);
    totalAmp += osc.amplitude;
  }
  if (totalAmp === 0) return 0;
  cosSum /= totalAmp;
  sinSum /= totalAmp;
  return Math.min(1, Math.sqrt(cosSum * cosSum + sinSum * sinSum));
}
