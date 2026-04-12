/**
 * ─── Sistema Autônomo: Autonomic Decoding Controller ───
 * Dynamically adjusts temperature, top_p, repetition_penalty
 * based on InteroceptiveState (stress, arousal, valence).
 *
 * Simpático (stress alto) → conservador (T↓, p↓)
 * Parassimpático (calmo) → criativo (T↑, p↑)
 *
 * Ref: Doya (2002) "Metalearning and neuromodulation"
 *      Friston (2010) "Free energy principle"
 */

import type { InteroceptiveState } from "./interoception-engine";

// ─── Types ───

export interface DecodingParams {
  temperature: number;        // 0.1–1.5
  topP: number;               // 0.5–0.99
  topK: number;               // 10–100
  repetitionPenalty: number;   // 1.0–1.5
  maxTokens: number;          // 256–4096
  /** Which autonomic branch is dominant */
  branch: "sympathetic" | "parasympathetic" | "balanced";
  /** Confidence in these params (0-1) */
  confidence: number;
}

export interface AutonomicConfig {
  /** Minimum temperature (full sympathetic) */
  minTemp: number;
  /** Maximum temperature (full parasympathetic) */
  maxTemp: number;
  /** Base temperature (balanced) */
  baseTemp: number;
  /** Stress threshold for sympathetic activation */
  stressThreshold: number;
  /** Calm threshold for parasympathetic activation */
  calmThreshold: number;
  /** Enable dynamic adjustment */
  enabled: boolean;
}

// ─── Defaults ───

export const DEFAULT_AUTONOMIC_CONFIG: AutonomicConfig = {
  minTemp: 0.3,
  maxTemp: 1.2,
  baseTemp: 0.7,
  stressThreshold: 0.6,
  calmThreshold: 0.3,
  enabled: true,
};

const DEFAULT_PARAMS: DecodingParams = {
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repetitionPenalty: 1.1,
  maxTokens: 1024,
  branch: "balanced",
  confidence: 0.5,
};

// ─── State ───

let currentConfig = { ...DEFAULT_AUTONOMIC_CONFIG };
let lastState: InteroceptiveState | null = null;
let lastParams: DecodingParams = { ...DEFAULT_PARAMS };

// ─── Core Logic ───

/**
 * Compute sympathetic activation (0-1) from interoceptive state.
 * High stress, high arousal, negative valence → sympathetic dominant.
 */
function computeSympatheticDrive(state: InteroceptiveState): number {
  const stressSignal = state.painIndex;
  const arousalSignal = state.arousal;
  const valenceSignal = Math.max(0, -state.valence); // negative valence → stress

  // Weighted combination (Doya 2002 neuromodulator model)
  const drive = (
    stressSignal * 0.40 +
    arousalSignal * 0.30 +
    valenceSignal * 0.30
  );

  return Math.min(1, Math.max(0, drive));
}

/**
 * Compute parasympathetic activation (0-1).
 * Low stress, low arousal, positive valence → parasympathetic.
 */
function computeParasympatheticDrive(state: InteroceptiveState): number {
  const calmSignal = 1 - state.arousal;
  const energySignal = state.energyLevel;
  const valenceSignal = Math.max(0, state.valence); // positive valence → calm

  const drive = (
    calmSignal * 0.35 +
    energySignal * 0.30 +
    valenceSignal * 0.35
  );

  return Math.min(1, Math.max(0, drive));
}

/**
 * Map autonomic drive to decoding parameters.
 * Uses sigmoid-like interpolation for smooth transitions.
 */
function mapToDecodingParams(
  sympathetic: number,
  parasympathetic: number,
  config: AutonomicConfig
): DecodingParams {
  // Net autonomic balance: -1 (full sympathetic) to +1 (full parasympathetic)
  const balance = parasympathetic - sympathetic;
  const branch: DecodingParams["branch"] =
    balance < -0.2 ? "sympathetic" :
    balance > 0.2 ? "parasympathetic" :
    "balanced";

  // Sigmoid interpolation for smooth transitions
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-5 * x));
  const t = sigmoid(balance); // 0 (sympathetic) to 1 (parasympathetic)

  // Temperature: stress → low, calm → high
  const temperature = config.minTemp + t * (config.maxTemp - config.minTemp);

  // Top-P: stress → narrow (0.7), calm → wide (0.95)
  const topP = 0.70 + t * 0.25;

  // Top-K: stress → fewer candidates (15), calm → more (80)
  const topK = Math.round(15 + t * 65);

  // Repetition penalty: stress → higher (more cautious), calm → lower
  const repetitionPenalty = 1.3 - t * 0.25;

  // Max tokens: stress → shorter (512), calm → longer (2048)
  const maxTokens = Math.round(512 + t * 1536);

  // Confidence based on how decisive the balance is
  const confidence = Math.abs(balance) * 0.5 + 0.5;

  return {
    temperature: Math.round(temperature * 100) / 100,
    topP: Math.round(topP * 100) / 100,
    topK,
    repetitionPenalty: Math.round(repetitionPenalty * 100) / 100,
    maxTokens,
    branch,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// ─── Public API ───

/**
 * Compute optimal decoding parameters from current interoceptive state.
 */
export function computeDecodingParams(state: InteroceptiveState): DecodingParams {
  if (!currentConfig.enabled) return { ...DEFAULT_PARAMS };

  const sympathetic = computeSympatheticDrive(state);
  const parasympathetic = computeParasympatheticDrive(state);
  const params = mapToDecodingParams(sympathetic, parasympathetic, currentConfig);

  lastState = state;
  lastParams = params;

  return params;
}

/**
 * Get the last computed params (cached, no recomputation).
 */
export function getLastDecodingParams(): DecodingParams {
  return { ...lastParams };
}

/**
 * Override a specific parameter (manual intervention).
 */
export function overrideParam<K extends keyof DecodingParams>(
  key: K,
  value: DecodingParams[K]
): void {
  lastParams = { ...lastParams, [key]: value, confidence: 1.0 };
}

/**
 * Update autonomic config.
 */
export function updateAutonomicConfig(partial: Partial<AutonomicConfig>): void {
  currentConfig = { ...currentConfig, ...partial };
}

/**
 * Get diagnostic snapshot for introspection.
 */
export function getAutonomicSnapshot() {
  const sympathetic = lastState ? computeSympatheticDrive(lastState) : 0;
  const parasympathetic = lastState ? computeParasympatheticDrive(lastState) : 0;

  return {
    config: { ...currentConfig },
    lastParams: { ...lastParams },
    drives: { sympathetic, parasympathetic, balance: parasympathetic - sympathetic },
    hasState: !!lastState,
    lastStateTimestamp: lastState?.timestamp ?? null,
  };
}
