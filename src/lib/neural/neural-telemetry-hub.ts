/**
 * ─── Neural Telemetry Hub v2 ───
 * Central integration layer connecting ALL TF modules, TFX pipeline,
 * Responsible AI, LiteRT conversion, TF Libraries Registry,
 * Interoception Engine and Multimodal Pipeline into the active reasoning pipeline.
 *
 * v2 additions:
 * - tf-libraries-registry: ecosystem-wide library status for introspection
 * - tf-responsible-ai-data/evaluation/training: fairness monitoring
 * - tfx-pipeline-components: MLMD artifact tracking per cycle
 * - litert-conversion: model optimization profiling
 * - multimodal-pipeline: sensor fusion readiness
 * - orion-nav-map: navigation intent context
 * - yolo-framex-engine: multi-task vision status
 *
 * Called from: consciousness-bridge.ts and useOrionReasoning.ts
 */

import {
  addTimeSeriesPoint,
  detectAnomalyStatistical,
  getPredictiveAnalyticsState,
  type AnomalyResult,
  type PredictiveAnalyticsState,
} from "./tf-predictive-analytics";

import {
  addIncrementalSample,
  getContinuousLearningState,
  type ContinuousLearningState,
} from "./tf-continuous-learning";

import {
  validateData,
  detectDrift,
  setReferenceDistribution,
  evaluatePipelineHealth,
  getMLOpsState,
  type DriftReport,
  type MLOpsPipelineState,
} from "./tf-mlops-pipeline";

import {
  getInferenceOptimizationState,
  type InferenceOptimizationState,
} from "./tf-inference-optimization";

import {
  recordSnapshot,
  checkDegradation,
  setBaseline,
  getMonitoringState,
  type PerformanceDegradation,
  type MonitoringState,
} from "./tf-model-monitoring";

import {
  computeInteroceptiveState,
  getCachedInteroceptiveState,
  isSystemInPain,
  isEnergyDepleted,
  describeInteroceptiveState,
  getInteroceptiveTrend,
  type InteroceptiveState,
  type VisceralInput,
} from "./interoception-engine";

// ─── Newly integrated modules ───

import {
  getTFLibrariesSummary,
  buildTFLibrariesIntrospection,
} from "./tf-libraries-registry";

import {
  mlmd,
} from "./tfx-pipeline-components";

import { detectNavigationIntent } from "./orion-nav-map";

// ─── v3 Integrations: Responsible AI, Multimodal Search, Document Versioning, Offline Sync ───

import { multimodalSearch, type MultimodalSearchResult } from "./multimodal-search";
import { DocumentVersionManager } from "./document-versioning";
import { getOfflineSyncState, type OfflineSyncState } from "./offline-sync";
import { createNeuralDataSpace, type FederatedDataSpace } from "./federated-data-space";
import { NeuralMessageBus, NeuralContextBroker } from "./interoperability-middleware";
import { runTFMA, type TFMAResult } from "./tf-responsible-ai-evaluation";
import { createFederatedSimulation, executeFederatedRound, type FederatedState } from "./tf-responsible-ai-training";

// Singleton instances for v3 modules
let _docVersionManager: DocumentVersionManager | null = null;
let _messageBus: NeuralMessageBus | null = null;
let _contextBroker: NeuralContextBroker | null = null;

function getDocVersionManager(): DocumentVersionManager {
  if (!_docVersionManager) _docVersionManager = new DocumentVersionManager();
  return _docVersionManager;
}

function getMessageBus(): NeuralMessageBus {
  if (!_messageBus) _messageBus = new NeuralMessageBus();
  return _messageBus;
}

function getContextBroker(): NeuralContextBroker {
  if (!_contextBroker) _contextBroker = new NeuralContextBroker();
  return _contextBroker;
}
// ─── Types ───

export interface TelemetrySnapshot {
  anomaly: AnomalyResult | null;
  interoception: InteroceptiveState | null;
  degradations: PerformanceDegradation[];
  drift: DriftReport | null;
  isInPain: boolean;
  isEnergyLow: boolean;
  visceralDescription: string;
  trend: "improving" | "stable" | "declining";
  timestamp: number;
  // v2 additions
  tfEcosystemTotal: number;
  tfEcosystemCapabilities: number;
  mlmdArtifactCount: number;
  navigationIntent: string | null;
  // v3 additions
  offlinePendingChanges: number;
  messageBusSubscribers: number;
  documentVersions: number;
}

export interface TelemetryHubState {
  predictive: PredictiveAnalyticsState;
  continuousLearning: ContinuousLearningState;
  mlops: MLOpsPipelineState;
  inferenceOpt: InferenceOptimizationState;
  monitoring: MonitoringState;
  interoception: InteroceptiveState | null;
  lastAnomalySeverity: string | null;
  totalTelemetryCycles: number;
  // v2 additions
  tfLibrariesSummary: ReturnType<typeof getTFLibrariesSummary>;
  mlmdArtifacts: number;
}

// ─── State ───

let _telemetryCycles = 0;
let _lastAnomalySeverity: string | null = null;
let _baselineSet = false;
let _latencyHistory: number[] = [];
let _phiHistory: number[] = [];
let _lastInteroState: InteroceptiveState | null = null;
let _lastUserInput = "";

// ─── Core Functions ───

/**
 * Feed reasoning cycle metrics into all TF modules.
 * Called after each reasoning cycle completes.
 */
export function feedReasoningMetrics(metrics: {
  latencyMs: number;
  phi: number;
  plv: number;
  gammaCTC: number;
  consciousnessLevel: string;
  intent: string;
  score: number;
  hrlQValue: number;
  agentCount: number;
  userInput?: string;
}): TelemetrySnapshot {
  _telemetryCycles++;
  const now = Date.now();

  // 1. Feed time-series data for predictive analytics
  addTimeSeriesPoint({ timestamp: now, value: metrics.latencyMs, label: "latency" });
  addTimeSeriesPoint({ timestamp: now, value: metrics.phi, label: "phi" });
  addTimeSeriesPoint({ timestamp: now, value: metrics.score, label: "quality_score" });

  // 2. Detect anomalies in latency
  const anomaly = detectAnomalyStatistical(metrics.latencyMs);

  // 3. Feed continuous learning with interaction features
  const features = [
    metrics.latencyMs / 10000, // normalized
    metrics.phi,
    metrics.plv,
    metrics.gammaCTC,
    metrics.score,
    metrics.hrlQValue / 10,
    metrics.agentCount / 10,
    consciousnessLevelToNumber(metrics.consciousnessLevel),
  ];
  addIncrementalSample({
    features,
    label: metrics.score >= 0.7 ? 1 : 0,
    weight: 1.0,
    timestamp: now,
  });

  // 4. Track latency for drift detection
  _latencyHistory.push(metrics.latencyMs);
  if (_latencyHistory.length > 200) _latencyHistory = _latencyHistory.slice(-200);
  _phiHistory.push(metrics.phi);
  if (_phiHistory.length > 200) _phiHistory = _phiHistory.slice(-200);

  // Set baseline on first 50 samples
  if (!_baselineSet && _latencyHistory.length >= 50) {
    setReferenceDistribution("latency", _latencyHistory.slice(0, 50));
    setReferenceDistribution("phi", _phiHistory.slice(0, 50));
    setBaseline("orion-reasoning", {
      accuracy: 0.85,
      latencyMs: average(_latencyHistory.slice(0, 50)),
      errorRate: 0.05,
    });
    _baselineSet = true;
  }

  // 5. Detect drift (every 20 cycles after baseline)
  let drift: DriftReport | null = null;
  if (_baselineSet && _telemetryCycles % 20 === 0 && _latencyHistory.length >= 30) {
    drift = detectDrift("latency", _latencyHistory.slice(-30));
  }

  // 6. Record model monitoring snapshot
  recordSnapshot({
    modelName: "orion-reasoning",
    timestamp: now,
    accuracy: metrics.score,
    latencyMs: metrics.latencyMs,
    errorRate: metrics.score < 0.3 ? 1 : 0,
    sampleCount: _telemetryCycles,
    memoryMB: estimateMemoryUsage(),
  });

  // 7. Check degradation
  const degradations = _baselineSet
    ? checkDegradation("orion-reasoning", {
        accuracy: metrics.score,
        latencyMs: metrics.latencyMs,
        errorRate: metrics.score < 0.3 ? 1 : 0,
      })
    : [];

  // 8. Update pipeline health
  if (_telemetryCycles % 10 === 0) {
    evaluatePipelineHealth();
  }

  _lastAnomalySeverity = anomaly.isAnomaly ? anomaly.severity : null;

  // 9. Get interoception (use cached if available)
  const intero = _lastInteroState;
  const isInPain = intero ? isSystemInPain(intero) : false;
  const isEnergyLow = intero ? isEnergyDepleted(intero) : false;
  const visceralDescription = intero ? describeInteroceptiveState(intero) : "Aguardando dados viscerais...";
  const trend = getInteroceptiveTrend();

  // 10. [v2] Record MLMD artifact for this reasoning cycle
  if (_telemetryCycles % 5 === 0) {
    try {
      const exec = mlmd.putExecution("reasoning-cycle", [], {
        cycle: _telemetryCycles,
        latencyMs: metrics.latencyMs,
        score: metrics.score,
        intent: metrics.intent,
      });
      mlmd.putArtifact("evaluation", `reasoning-eval-${_telemetryCycles}`, `cycle/${_telemetryCycles}`, {
        score: metrics.score,
        phi: metrics.phi,
      });
    } catch {}
  }

  // 11. [v2] Navigation intent detection
  _lastUserInput = metrics.userInput || _lastUserInput;
  const navIntent = _lastUserInput ? detectNavigationIntent(_lastUserInput) : null;

  // 12. [v2] TF ecosystem summary
  const tfSummary = getTFLibrariesSummary();

  // 13. [v3] Interoperability + offline state
  const offlineState = getOfflineSyncState();
  const bus = getMessageBus();

  return {
    anomaly: anomaly.isAnomaly ? anomaly : null,
    interoception: intero,
    degradations,
    drift,
    isInPain,
    isEnergyLow,
    visceralDescription,
    trend,
    timestamp: now,
    tfEcosystemTotal: tfSummary.total,
    tfEcosystemCapabilities: tfSummary.totalCapabilities,
    mlmdArtifactCount: mlmd.getStats().artifacts,
    navigationIntent: navIntent?.label || null,
    offlinePendingChanges: offlineState.pendingChanges,
    messageBusSubscribers: 0, // bus tracks internally
    documentVersions: getDocVersionManager().getVersionCount?.() ?? 0,
  };
}

/**
 * Compute the interoceptive state from system metrics.
 * Called periodically from the consciousness bridge.
 */
export function updateInteroception(input: VisceralInput): InteroceptiveState {
  _lastInteroState = computeInteroceptiveState(input);
  return _lastInteroState;
}

/**
 * Get the current interoceptive state.
 */
export function getInteroception(): InteroceptiveState | null {
  return _lastInteroState || getCachedInteroceptiveState();
}

/**
 * Get a full state snapshot of all TF modules.
 */
export function getTelemetryHubState(): TelemetryHubState {
  return {
    predictive: getPredictiveAnalyticsState(),
    continuousLearning: getContinuousLearningState(),
    mlops: getMLOpsState(),
    inferenceOpt: getInferenceOptimizationState(),
    monitoring: getMonitoringState(),
    interoception: _lastInteroState,
    lastAnomalySeverity: _lastAnomalySeverity,
    totalTelemetryCycles: _telemetryCycles,
    tfLibrariesSummary: getTFLibrariesSummary(),
    mlmdArtifacts: mlmd.getStats().artifacts,
  };
}

/**
 * Build a context string for AI prompt injection.
 */
export function buildTelemetryContextPrompt(): string {
  const state = getTelemetryHubState();
  const parts: string[] = [];

  parts.push(`[TELEMETRY] Cycles=${state.totalTelemetryCycles}`);

  // Predictive
  if (state.predictive.totalAnomaliesDetected > 0) {
    parts.push(`Anomalies=${state.predictive.totalAnomaliesDetected}`);
  }
  if (state.lastAnomalySeverity) {
    parts.push(`LastAnomaly=${state.lastAnomalySeverity}`);
  }

  // Continuous Learning
  if (state.continuousLearning.adaptationCount > 0) {
    parts.push(`Adaptations=${state.continuousLearning.adaptationCount} AvgLoss=${state.continuousLearning.avgLoss.toFixed(3)}`);
  }

  // MLOps
  parts.push(`Pipeline=${state.mlops.pipelineHealth}`);

  // Interoception
  if (state.interoception) {
    const intero = state.interoception;
    parts.push(`Body=[valence=${intero.valence.toFixed(2)} arousal=${intero.arousal.toFixed(2)} pain=${intero.painIndex.toFixed(2)} energy=${intero.energyLevel.toFixed(2)} signal=${intero.dominantSignal}]`);
  }

  // [v2] TF Ecosystem
  parts.push(`TFLibs=${state.tfLibrariesSummary.total} Capabilities=${state.tfLibrariesSummary.totalCapabilities}`);

  // [v2] MLMD
  if (state.mlmdArtifacts > 0) {
    parts.push(`MLMD_Artifacts=${state.mlmdArtifacts}`);
  }

  // [v3] Interoperability & Offline
  const offlineState = getOfflineSyncState();
  if (offlineState.pendingChanges > 0) {
    parts.push(`Offline_Pending=${offlineState.pendingChanges}`);
  }
  if (!offlineState.isOnline) {
    parts.push(`⚠️ OFFLINE`);
  }

  return parts.join(" | ");
}

/**
 * [v2] Get the TF Libraries introspection string for AI self-awareness.
 */
export function getTFEcosystemIntrospection(): string {
  return buildTFLibrariesIntrospection();
}

// ─── Helpers ───

function consciousnessLevelToNumber(level: string): number {
  switch (level) {
    case "metaconscious": return 1.0;
    case "conscious": return 0.75;
    case "preconscious": return 0.5;
    case "unconscious": return 0.25;
    default: return 0.0;
  }
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function estimateMemoryUsage(): number {
  try {
    const perf = (performance as any);
    if (perf.memory) {
      return perf.memory.usedJSHeapSize / (1024 * 1024);
    }
  } catch {}
  return 0;
}
