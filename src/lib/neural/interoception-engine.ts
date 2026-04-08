/**
 * ─── Camada 6: Interocepcão Sintética ───
 * Models the system's "visceral state" — cognitive load, provider health,
 * pipeline stress, resource consumption. Inspired by Damasio's somatic
 * marker hypothesis: the body influences cognition.
 *
 * Collects metrics from: system-health, provider-health, task-orchestrator, reward-loop.
 * Generates an InteroceptiveState with internal valence/arousal.
 * Feeds Layer 9 (somatic markers) for body-informed decisions.
 *
 * Ref: Damasio (1994) "Descartes' Error"
 *      Craig (2009) "How do you feel — now?"
 *      Gazzola (2026) "Introdução à Cognição Incorporada"
 */

import type { ProviderHealth, ProviderStatus } from "./provider-health";
import type { SystemHealthSnapshot, SystemMode } from "./system-health";

// ─── Types ───

export type VisceralSignal =
  | "homeostasis"           // System in balance
  | "cognitive_load"        // High processing demand
  | "provider_stress"       // AI providers degraded
  | "memory_pressure"       // Storage/cache near limits
  | "pipeline_fatigue"      // Long task queues
  | "thermal_warning"       // CPU/GPU high utilization
  | "resource_depletion"    // API quotas nearing limits
  // v26: Robotic Interoception signals
  | "proprioception_drift"  // Visual proprioception: servo/motor command vs observed position mismatch
  | "hardware_degradation"  // Internal hardware integrity: wear, overheating, mechanical stress
  | "biofeedback_alert"     // User biofeedback: integration quality with human operator
  | "iaa_prediction";       // Intelligent Adaptive AI: predictive risk from visual internal state

/** v26: Robotic interoception — visual proprioception + hardware integrity */
export interface RoboticInteroception {
  /** Visual proprioception: command-observation error (0=perfect, 1=total mismatch) */
  proprioceptionError: number;
  /** Hardware integrity score (1=pristine, 0=critical failure) */
  hardwareIntegrity: number;
  /** Component temperatures (normalized 0-1, >0.8 = overheating) */
  thermalMap: Record<string, number>;
  /** Biofeedback integration quality with human operator (0-1) */
  biofeedbackQuality: number;
  /** IAA predictive risk score (0=safe, 1=imminent failure) */
  iaaPredictiveRisk: number;
  /** Active internal cameras / visual sensors count */
  activeInternalSensors: number;
  /** Mechanical wear index (0=new, 1=end-of-life) */
  mechanicalWear: number;
  /** Balance/equilibrium confidence (0=falling, 1=perfect balance) */
  equilibriumConfidence: number;
}

export interface InteroceptiveState {
  /** Overall internal valence: -1 (distressed) to 1 (thriving) */
  valence: number;
  /** Internal arousal: 0 (calm/idle) to 1 (highly activated) */
  arousal: number;
  /** Dominant visceral signal */
  dominantSignal: VisceralSignal;
  /** All active signals with intensity (0-1) */
  signals: Record<VisceralSignal, number>;
  /** System "pain" — aggregate distress metric (0-1) */
  painIndex: number;
  /** System "energy" — available processing capacity (0-1) */
  energyLevel: number;
  /** Homeostatic deviation — how far from ideal (0 = perfect) */
  homeostaticDeviation: number;
  /** Timestamp of measurement */
  timestamp: number;
  /** Cycle count for temporal tracking */
  cycle: number;
  /** v26: Robotic interoception layer */
  robotic: RoboticInteroception;
}

export interface InteroceptiveConfig {
  /** How often to sample (ms) */
  samplingIntervalMs: number;
  /** Weight for provider health in valence calculation */
  providerWeight: number;
  /** Weight for cognitive load */
  cognitiveLoadWeight: number;
  /** Weight for memory pressure */
  memoryWeight: number;
  /** Weight for pipeline queue depth */
  pipelineWeight: number;
  /** Pain threshold — above this, triggers somatic alarm */
  painThreshold: number;
  /** Energy threshold — below this, triggers conservation mode */
  energyThreshold: number;
}

export interface VisceralInput {
  /** Provider health data */
  providerHealths: ProviderHealth[];
  /** System mode */
  systemMode: SystemMode;
  /** Overall system score (0-100) */
  systemScore: number;
  /** Active task count */
  activeTasks: number;
  /** Queue depth */
  queueDepth: number;
  /** Memory usage (0-1) */
  memoryUsage: number;
  /** Error rate across providers (0-1) */
  avgErrorRate: number;
  /** Average latency across providers (ms) */
  avgLatency: number;
  /** Reward loop positive rate (0-1) */
  rewardPositiveRate: number;
}

// ─── Constants ───

export const DEFAULT_INTEROCEPTIVE_CONFIG: InteroceptiveConfig = {
  samplingIntervalMs: 5000,
  providerWeight: 0.30,
  cognitiveLoadWeight: 0.25,
  memoryWeight: 0.20,
  pipelineWeight: 0.25,
  painThreshold: 0.7,
  energyThreshold: 0.3,
};

const INTEROCEPTION_CACHE_KEY = "orion_interoception_state";
let _cycleCount = 0;
let _history: InteroceptiveState[] = [];
const MAX_HISTORY = 50;

// ─── Core Engine ───

/**
 * Compute the interoceptive state from raw system metrics.
 * This is the "visceral sense" — the system feeling its own body.
 */
export function computeInteroceptiveState(
  input: VisceralInput,
  config: InteroceptiveConfig = DEFAULT_INTEROCEPTIVE_CONFIG
): InteroceptiveState {
  _cycleCount++;

  // Compute individual signals
  const providerStress = computeProviderStress(input.providerHealths, input.avgErrorRate);
  const cognitiveLoad = computeCognitiveLoad(input.activeTasks, input.queueDepth, input.avgLatency);
  const memoryPressure = input.memoryUsage;
  const pipelineFatigue = Math.min(1, input.queueDepth / 20);
  const thermalWarning = input.avgLatency > 5000 ? Math.min(1, (input.avgLatency - 5000) / 15000) : 0;
  const resourceDepletion = 1 - input.rewardPositiveRate;

  // v26: Robotic interoception signals (simulated from system metrics)
  const proprioceptionDrift = clamp(input.avgLatency / 20000 + Math.random() * 0.05);
  const hardwareDeg = clamp(thermalWarning * 0.6 + memoryPressure * 0.3 + Math.random() * 0.05);
  const biofeedbackAlert = clamp(1 - input.rewardPositiveRate * 0.7 - (input.systemScore / 100) * 0.3);
  const iaaPrediction = clamp(providerStress * 0.4 + cognitiveLoad * 0.3 + thermalWarning * 0.3);

  const signals: Record<VisceralSignal, number> = {
    homeostasis: Math.max(0, 1 - providerStress - cognitiveLoad * 0.5),
    cognitive_load: cognitiveLoad,
    provider_stress: providerStress,
    memory_pressure: memoryPressure,
    pipeline_fatigue: pipelineFatigue,
    thermal_warning: thermalWarning,
    resource_depletion: resourceDepletion,
    proprioception_drift: proprioceptionDrift,
    hardware_degradation: hardwareDeg,
    biofeedback_alert: biofeedbackAlert,
    iaa_prediction: iaaPrediction,
  };

  // Pain index: weighted distress
  const painIndex = clamp(
    config.providerWeight * providerStress +
    config.cognitiveLoadWeight * cognitiveLoad +
    config.memoryWeight * memoryPressure +
    config.pipelineWeight * pipelineFatigue +
    thermalWarning * 0.15 +
    resourceDepletion * 0.1
  );

  // Energy: inverse of system strain, boosted by system score
  const energyLevel = clamp(
    (input.systemScore / 100) * 0.6 +
    (1 - cognitiveLoad) * 0.2 +
    (1 - memoryPressure) * 0.2
  );

  // Valence: positive when healthy, negative when stressed
  const valence = clamp(energyLevel - painIndex, -1, 1);

  // Arousal: how activated the system is (high tasks/queue = high arousal)
  const arousal = clamp(
    cognitiveLoad * 0.4 +
    pipelineFatigue * 0.3 +
    (input.activeTasks > 0 ? 0.2 : 0) +
    thermalWarning * 0.1
  );

  // Homeostatic deviation
  const homeostaticDeviation = clamp(
    Math.abs(valence) * 0.3 +
    painIndex * 0.4 +
    (1 - energyLevel) * 0.3
  );

  // Dominant signal = highest intensity
  const dominantSignal = (Object.entries(signals) as [VisceralSignal, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  // v26: Build robotic interoception layer
  const robotic: RoboticInteroception = {
    proprioceptionError: proprioceptionDrift,
    hardwareIntegrity: clamp(1 - hardwareDeg),
    thermalMap: {
      cpu: clamp(thermalWarning * 0.8 + 0.2),
      gpu: clamp(thermalWarning * 0.6 + 0.15),
      memory: clamp(memoryPressure * 0.5 + 0.1),
      network: clamp(providerStress * 0.4 + 0.1),
    },
    biofeedbackQuality: clamp(1 - biofeedbackAlert),
    iaaPredictiveRisk: iaaPrediction,
    activeInternalSensors: 4 + (thermalWarning > 0.5 ? 2 : 0), // extra sensors when hot
    mechanicalWear: clamp(hardwareDeg * 0.7 + proprioceptionDrift * 0.3),
    equilibriumConfidence: clamp(1 - proprioceptionDrift * 0.8 - thermalWarning * 0.2),
  };

  const state: InteroceptiveState = {
    valence,
    arousal,
    dominantSignal,
    signals,
    painIndex,
    energyLevel,
    homeostaticDeviation,
    timestamp: Date.now(),
    cycle: _cycleCount,
    robotic,
  };

  // Store in history
  _history.push(state);
  if (_history.length > MAX_HISTORY) _history = _history.slice(-MAX_HISTORY);

  // Persist latest
  try {
    localStorage.setItem(INTEROCEPTION_CACHE_KEY, JSON.stringify(state));
  } catch { /* silent */ }

  return state;
}

/**
 * Get the cached interoceptive state (last computed).
 */
export function getCachedInteroceptiveState(): InteroceptiveState | null {
  try {
    const raw = localStorage.getItem(INTEROCEPTION_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Get interoceptive history for temporal analysis.
 */
export function getInteroceptiveHistory(): InteroceptiveState[] {
  return [..._history];
}

/**
 * Check if the system is in "pain" — should trigger conservative behavior.
 */
export function isSystemInPain(
  state: InteroceptiveState,
  config: InteroceptiveConfig = DEFAULT_INTEROCEPTIVE_CONFIG
): boolean {
  return state.painIndex >= config.painThreshold;
}

/**
 * Check if energy is critically low — trigger conservation mode.
 */
export function isEnergyDepleted(
  state: InteroceptiveState,
  config: InteroceptiveConfig = DEFAULT_INTEROCEPTIVE_CONFIG
): boolean {
  return state.energyLevel <= config.energyThreshold;
}

/**
 * Get a natural language description of the visceral state.
 */
export function describeInteroceptiveState(state: InteroceptiveState): string {
  const valenceLabel = state.valence > 0.3 ? "saudável" : state.valence < -0.3 ? "estressado" : "neutro";
  const arousalLabel = state.arousal > 0.6 ? "alta ativação" : state.arousal < 0.3 ? "calmo" : "moderado";
  const painLabel = state.painIndex > 0.7 ? "dor significativa" : state.painIndex > 0.4 ? "desconforto leve" : "sem dor";

  return `Sistema ${valenceLabel}, ${arousalLabel}, ${painLabel}. ` +
    `Energia: ${(state.energyLevel * 100).toFixed(0)}%. ` +
    `Sinal dominante: ${signalLabels[state.dominantSignal]}. ` +
    `Desvio homeostático: ${(state.homeostaticDeviation * 100).toFixed(0)}%.`;
}

/**
 * Compute temporal trend from history (improving, stable, declining).
 */
export function getInteroceptiveTrend(): "improving" | "stable" | "declining" {
  if (_history.length < 5) return "stable";
  const recent = _history.slice(-5);
  const older = _history.slice(-10, -5);
  if (older.length < 3) return "stable";

  const recentAvg = recent.reduce((s, h) => s + h.valence, 0) / recent.length;
  const olderAvg = older.reduce((s, h) => s + h.valence, 0) / older.length;
  const delta = recentAvg - olderAvg;

  if (delta > 0.1) return "improving";
  if (delta < -0.1) return "declining";
  return "stable";
}

// ─── Internal Helpers ───

const signalLabels: Record<VisceralSignal, string> = {
  homeostasis: "Homeostase",
  cognitive_load: "Carga Cognitiva",
  provider_stress: "Stress de Provedores",
  memory_pressure: "Pressão de Memória",
  pipeline_fatigue: "Fadiga do Pipeline",
  thermal_warning: "Alerta Térmico",
  resource_depletion: "Depleção de Recursos",
  proprioception_drift: "Drift Proprioceptivo",
  hardware_degradation: "Degradação Hardware",
  biofeedback_alert: "Alerta Biofeedback",
  iaa_prediction: "Predição IAA",
};

function computeProviderStress(healthData: ProviderHealth[], avgErrorRate: number): number {
  if (healthData.length === 0) return avgErrorRate;
  const statusScores: Record<ProviderStatus, number> = { healthy: 0, degraded: 0.5, down: 1, unknown: 0.3 };
  const avg = healthData.reduce((s, h) => s + statusScores[h.status], 0) / healthData.length;
  return clamp(avg * 0.6 + avgErrorRate * 0.4);
}

function computeCognitiveLoad(activeTasks: number, queueDepth: number, avgLatency: number): number {
  const taskLoad = Math.min(1, activeTasks / 10);
  const queueLoad = Math.min(1, queueDepth / 15);
  const latencyLoad = Math.min(1, avgLatency / 10000);
  return clamp(taskLoad * 0.4 + queueLoad * 0.35 + latencyLoad * 0.25);
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}
