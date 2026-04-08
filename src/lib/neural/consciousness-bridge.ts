/**
 * ─── Consciousness Bridge ───
 * Connects Global Workspace, Gamma Oscillations, Hierarchical RL,
 * Embodied Memory, Interoception, and TF Telemetry into the main
 * reasoning loop (useOrionReasoning).
 * 
 * v2: Now integrates interoception (body-sense) and neural telemetry
 * (predictive analytics, anomaly detection, drift monitoring) into
 * each consciousness cycle.
 */

import {
  createGlobalWorkspace,
  createSelfModel,
  runConsciousnessCycle,
  recordAutobiographicalMemory,
  type ConsciousState,
  type SelfModelState,
  type AgentBroadcast,
  type ConsciousnessLevel,
  type MetacognitionResult,
} from "./global-workspace";

import type { NeuromodulationState } from "./multi-agent";

import {
  initOscillator,
  stepOscillator,
  stepOscillatorCoupled,
  computeCTC,
  computeResonanceIndex,
  thetaGammaCouplingMI,
  classifyGammaSubBand,
  gammaHealthScore,
  GAMMA_SUB_BANDS,
  type OscillatorState,
  type OscillatorConfig,
} from "./gamma-oscillations";

import {
  getResonanceField,
  setResonanceField,
  registerOscillator,
  stepResonanceField,
  modulateCoupling,
  type ResonanceMetrics,
} from "./tesla-resonance";

import {
  initHRLState,
  symbolicPlan,
  selectSubGoal,
  computeIntrinsicReward,
  updateQValues,
  LEGAL_OPTIONS,
  type HRLState,
  type SubGoal,
  type Option,
} from "./hierarchical-rl";

import {
  feedReasoningMetrics,
  updateInteroception,
  getInteroception,
  buildTelemetryContextPrompt,
  type TelemetrySnapshot,
} from "./neural-telemetry-hub";

import { computeProviderHealth, type ProviderHealth } from "./provider-health";

// ─── v3 Integrations: QHRL, Temporal Binding, Agent Planner ───

import {
  qhrlPetitionDecomposition,
  computeQHRLSummary,
  extractQueryFeatures,
  type QHRLResult,
  type QHRLSummary,
} from "./qhrl-integration";

import {
  initBindingState,
  registerEvent,
  gammaSynchrony,
  getBindingSummary,
  type BindingState,
} from "./temporal-binding";

import {
  decomposePlan,
  classifyComplexity,
  type DAGPlan,
} from "./agent-planner";

import {
  quantumRouteQuery,
  formatQuantumRoutingForAI,
  type QuantumRoutingResult,
} from "./quantum-llm-router";

// ─── Singleton State ───

let _workspace: ConsciousState | null = null;
let _selfModel: SelfModelState | null = null;
let _gammaOscillators: Record<string, OscillatorState> = {};
let _phaseDiffHistory: number[] = [];
let _hrlState: HRLState | null = null;
let _lastCycleResult: ConsciousnessCycleSnapshot | null = null;
// v3 state
let _bindingState: BindingState | null = null;
let _qhrlHistory: QHRLResult[] = [];
let _lastDAGPlan: DAGPlan | null = null;

// ─── Types ───

export interface HRLDecision {
  plan: Option[];
  activeSubGoal: SubGoal | null;
  totalQValue: number;
  planSteps: number;
}

export interface ConsciousnessCycleSnapshot {
  consciousnessLevel: ConsciousnessLevel;
  phi: number;
  globalPLV: number;
  gammaHealth: number;
  gammaSubBand: string;
  gammaCTC: number;
  thetaGammaMI: number;
  consciousAgents: string[];
  metacognition: MetacognitionResult | null;
  selfModelConfidence: number;
  emotionalValence: number;
  hrl: HRLDecision;
  processingTimeMs: number;
  cycleCount: number;
  timestamp: number;
  /** v2: Interoceptive body-state */
  interoception: {
    valence: number;
    arousal: number;
    painIndex: number;
    energyLevel: number;
    dominantSignal: string;
    isInPain: boolean;
    isEnergyLow: boolean;
  } | null;
  /** v2: Telemetry anomaly severity (null = no anomaly) */
  anomalySeverity: string | null;
  /** v2: MLOps pipeline health */
  pipelineHealth: string;
  /** v2: Interoceptive trend */
  visceralTrend: "improving" | "stable" | "declining";
  /** v3: Temporal binding synchrony (0-1) */
  temporalSynchrony: number;
  /** v3: Task complexity classification */
  taskComplexity: string;
  /** v3: QHRL quantum advantage summary */
  qhrlAdvantage: number;
  /** v4: Tesla Resonance — Kuramoto order parameter R (0-1) */
  resonanceIndex: number;
  /** v4: Time in supercoherent state (ms) */
  coherenceTime: number;
  /** v4: Whether Tesla resonance ultra-fast-path is active */
  teslaResonanceActive: boolean;
}

export interface ReasoningContext {
  intent: string;
  query: string;
  hasVision: boolean;
  hasAudio: boolean;
  memoryFacts: string[];
  activeModules: string[];
  audioEmbedding?: number[];
  vocalEnergy?: number;
  vocalValence?: number;
}

// ─── Gamma Oscillator Configs ───

const GAMMA_CONFIGS: Record<string, OscillatorConfig> = {
  feedforward: { centerHz: GAMMA_SUB_BANDS.high.center, tauAMPA: 2, tauGABA: 8, model: "PING" },
  binding:     { centerHz: GAMMA_SUB_BANDS.mid.center, tauAMPA: 3, tauGABA: 10, model: "PING" },
  feedback:    { centerHz: GAMMA_SUB_BANDS.low.center, tauAMPA: 4, tauGABA: 15, model: "ING" },
};

// ─── Intent → Goal Predicates mapping for HRL ───

const INTENT_GOAL_MAP: Record<string, string[]> = {
  general:        ["query_defined"],
  search:         ["query_defined", "has_jurisprudence", "has_legislation"],
  auto_construct: ["query_defined", "case_analyzed", "arguments_structured", "draft_ready"],
  self_evolve:    ["query_defined", "case_analyzed", "quality_verified"],
  vision_describe:["query_defined", "multimodal_processed"],
  vision_object:  ["query_defined", "multimodal_processed"],
  identity:       ["query_defined"],
  navigation:     ["query_defined"],
  media:          ["query_defined"],
  iot:            ["query_defined"],
};

// ─── Initialization ───

function ensureInitialized(): void {
  if (!_workspace) _workspace = createGlobalWorkspace();
  if (!_selfModel) _selfModel = createSelfModel();
  if (Object.keys(_gammaOscillators).length === 0) {
    for (const [name, config] of Object.entries(GAMMA_CONFIGS)) {
      _gammaOscillators[name] = initOscillator(config);
    }
  }
  if (!_hrlState) _hrlState = initHRLState(["query_defined"]);
}

// ─── HRL: Plan + Select Sub-Goal ───

function runHRLPlanning(intent: string): HRLDecision {
  if (!_hrlState) _hrlState = initHRLState(["query_defined"]);

  // Map intent to goal predicates
  const goalPredicates = INTENT_GOAL_MAP[intent] || INTENT_GOAL_MAP.general;
  _hrlState.goalState = new Set(goalPredicates);

  // Symbolic planner: find option sequence to reach goal
  const plan = symbolicPlan(_hrlState.worldState, _hrlState.goalState, LEGAL_OPTIONS);

  // Create sub-goals from plan
  _hrlState.subGoals = plan.map((option, i) => ({
    id: `sg-${option.id}-${Date.now()}`,
    description: option.name,
    option,
    qValue: _hrlState!.qValues.get(option.id) || option.successRate,
    ucbBonus: 0,
    completed: false,
  }));

  // Select best sub-goal via UCB1
  const activeSubGoal = selectSubGoal(_hrlState);

  // Set active option
  if (activeSubGoal) {
    _hrlState.activeOption = activeSubGoal.option;
  }

  const totalQValue = plan.reduce((sum, opt) => sum + (_hrlState!.qValues.get(opt.id) || opt.successRate), 0);

  return {
    plan,
    activeSubGoal,
    totalQValue,
    planSteps: plan.length,
  };
}

// ─── HRL: Update after reasoning outcome ───

export function updateHRLFromOutcome(score: number, intent: string): void {
  if (!_hrlState) return;

  const activeOption = _hrlState.activeOption;
  if (!activeOption) return;

  // Compute intrinsic reward (external score + policy consistency)
  const reward = computeIntrinsicReward(score, true);

  // Update Q-values for the active option
  updateQValues(_hrlState, activeOption.id, reward);

  // Mark completed sub-goals
  if (score >= 0.5) {
    for (const effect of activeOption.terminationConditions) {
      _hrlState.worldState.add(effect);
    }
    const sg = _hrlState.subGoals.find(s => s.option.id === activeOption.id);
    if (sg) sg.completed = true;
  }

  _hrlState.totalReward += reward;
}

// ─── Core: Run Full Consciousness Cycle ───

export function runConsciousnessBridge(
  context: ReasoningContext,
  neuromodulators?: Partial<NeuromodulationState>,
): ConsciousnessCycleSnapshot {
  const start = performance.now();
  ensureInitialized();

  // 1. Step gamma oscillators with Tesla Resonance (Kuramoto coupling)
  const stimulus = Math.min(1, context.query.length / 200) * 0.8 + 0.2;
  const dt = 1; // 1ms step

  // Modulate coupling by dopamine level
  const dopLevel = neuromodulators?.dopamine ?? 0.7;
  modulateCoupling(dopLevel, neuromodulators?.acetylcholine ?? 0.5);

  // Coupled step: each oscillator is influenced by all others
  const allOscNames = Object.keys(GAMMA_CONFIGS);
  for (const name of allOscNames) {
    const neighbors = allOscNames
      .filter(n => n !== name)
      .map(n => _gammaOscillators[n]);
    _gammaOscillators[name] = stepOscillatorCoupled(
      _gammaOscillators[name], dt, stimulus, GAMMA_CONFIGS[name],
      neighbors, getResonanceField().couplingK,
    );
  }

  // Update Tesla Resonance Field singleton
  let resField = getResonanceField();
  for (const [name, config] of Object.entries(GAMMA_CONFIGS)) {
    resField = registerOscillator(resField, name as any, _gammaOscillators[name], config);
  }
  const stimuli: any = {};
  for (const name of allOscNames) stimuli[name] = stimulus;
  resField = stepResonanceField(resField, dt, stimuli, dopLevel);
  setResonanceField(resField);

  const resonanceMetrics = resField.metrics;

  // 2. Compute CTC between feedforward and binding oscillators
  const ffOsc = _gammaOscillators.feedforward;
  const bindOsc = _gammaOscillators.binding;
  const phaseDiff = ffOsc.phase - bindOsc.phase;
  _phaseDiffHistory.push(phaseDiff);
  if (_phaseDiffHistory.length > 50) _phaseDiffHistory.shift();
  const gammaCTC = computeCTC(ffOsc, bindOsc, _phaseDiffHistory);

  // 3. Compute theta-gamma coupling (Modulation Index)
  const thetaPhases = _phaseDiffHistory.map((_, i) => (i / _phaseDiffHistory.length) * 2 * Math.PI);
  const gammaAmps = Object.values(_gammaOscillators).map(o => o.amplitude);
  const paddedAmps = thetaPhases.map((_, i) => gammaAmps[i % gammaAmps.length]);
  const thetaGammaMI = thetaGammaCouplingMI(thetaPhases, paddedAmps);

  // 4. Run HRL planning (Feudal Networks + Options Framework)
  const hrlDecision = runHRLPlanning(context.intent);

  // 5. Build agent broadcasts from active modules + HRL
  const neuroState: NeuromodulationState = {
    dopamine: neuromodulators?.dopamine ?? 0.7,
    serotonin: neuromodulators?.serotonin ?? 0.6,
    norepinephrine: neuromodulators?.norepinephrine ?? 0.5,
    acetylcholine: neuromodulators?.acetylcholine ?? 0.7,
  };

  const broadcasts: AgentBroadcast[] = context.activeModules.map((mod, i) => ({
    agentId: `agent-${mod}`,
    role: mapModuleToRole(mod),
    content: `[${mod}] Processing: ${context.intent} — ${context.query.slice(0, 100)}`,
    salience: 0.5 + (gammaCTC * 0.3) + (i === 0 ? 0.1 : 0) + (resonanceMetrics.isSupercoherent ? 0.15 : 0),
    neuromodulation: neuroState,
    timestamp: Date.now(),
    metadata: {
      hasVision: context.hasVision,
      hasAudio: context.hasAudio,
      memoryCount: context.memoryFacts.length,
      gammaFreq: ffOsc.frequency,
      vocalEnergy: context.vocalEnergy,
      vocalValence: context.vocalValence,
    },
  }));

  // Add HRL manager as a broadcast agent
  if (hrlDecision.activeSubGoal) {
    broadcasts.push({
      agentId: "agent-hrl-manager",
      role: "planejador",
      content: `[QHRL] Active sub-goal: ${hrlDecision.activeSubGoal.description} (Q=${hrlDecision.activeSubGoal.qValue.toFixed(2)})`,
      salience: 0.6 + (hrlDecision.totalQValue * 0.1),
      neuromodulation: neuroState,
      timestamp: Date.now(),
      metadata: {
        planSteps: hrlDecision.planSteps,
        activeOption: hrlDecision.activeSubGoal.option.id,
      },
    });
  }

  // 6. Run the full Global Workspace consciousness cycle
  const cycleResult = runConsciousnessCycle(
    _workspace!,
    _selfModel!,
    broadcasts,
    context.query,
    undefined,
  );

  // 7. Update singleton state
  _workspace = cycleResult.workspace;
  _selfModel = cycleResult.selfModel;

  // 8. Gamma health assessment
  const dominantOsc = Object.values(_gammaOscillators).reduce(
    (best, o) => o.amplitude > best.amplitude ? o : best,
    _gammaOscillators.binding,
  );
  const gammaHealth = gammaHealthScore(dominantOsc, GAMMA_SUB_BANDS.mid.center);
  const gammaSubBand = classifyGammaSubBand(dominantOsc.frequency);

  // 9. Compute interoception from system state
  const intero = getInteroception();

  // 9b. [v3] Temporal binding — register this reasoning event
  if (!_bindingState) _bindingState = initBindingState(12);
  _bindingState = registerEvent(_bindingState, {
    neuronId: context.activeModules.length % 12,
    timestamp: Date.now(),
    type: "post" as const,
  });
  const temporalSync = gammaSynchrony(_bindingState);

  // 9c. [v3] QHRL — quantum-enhanced decomposition for complex intents
  let qhrlAdvantage = 0;
  try {
    const complexity = classifyComplexity(context.query);
    _lastDAGPlan = decomposePlan(context.query);
    if (complexity === "complex" || complexity === "critical") {
      const qr = qhrlPetitionDecomposition(context.query, context.intent, "geral");
      _qhrlHistory.push(qr);
      if (_qhrlHistory.length > 50) _qhrlHistory = _qhrlHistory.slice(-50);
      qhrlAdvantage = qr.quantumAdvantage;
    }
  } catch {}

  // 10. Feed telemetry metrics into all TF modules
  let telemetry: TelemetrySnapshot | null = null;
  try {
    telemetry = feedReasoningMetrics({
      latencyMs: performance.now() - start,
      phi: cycleResult.phi,
      plv: _workspace.globalPLV,
      gammaCTC,
      consciousnessLevel: cycleResult.consciousnessLevel,
      intent: context.intent,
      score: _selfModel.confidenceLevel,
      hrlQValue: hrlDecision.totalQValue,
      agentCount: _workspace.consciousAgents.length,
    });
  } catch (e) {
    console.warn("[Consciousness] Telemetry feed error:", e);
  }

  // 11. Build snapshot
  const snapshot: ConsciousnessCycleSnapshot = {
    consciousnessLevel: cycleResult.consciousnessLevel,
    phi: cycleResult.phi,
    globalPLV: _workspace.globalPLV,
    gammaHealth,
    gammaSubBand,
    gammaCTC,
    thetaGammaMI,
    consciousAgents: _workspace.consciousAgents.map(a => a.role),
    metacognition: cycleResult.metacognition,
    selfModelConfidence: _selfModel.confidenceLevel,
    emotionalValence: _selfModel.emotionalState.valence,
    hrl: hrlDecision,
    processingTimeMs: performance.now() - start,
    cycleCount: _workspace.cycleCount,
    timestamp: Date.now(),
    interoception: intero ? {
      valence: intero.valence,
      arousal: intero.arousal,
      painIndex: intero.painIndex,
      energyLevel: intero.energyLevel,
      dominantSignal: intero.dominantSignal,
      isInPain: telemetry?.isInPain ?? false,
      isEnergyLow: telemetry?.isEnergyLow ?? false,
    } : null,
    anomalySeverity: telemetry?.anomaly?.severity ?? null,
    pipelineHealth: telemetry ? "healthy" : "unknown",
    visceralTrend: telemetry?.trend ?? "stable",
    temporalSynchrony: temporalSync,
    taskComplexity: _lastDAGPlan?.complexity ?? "simple",
    qhrlAdvantage,
    resonanceIndex: resonanceMetrics.resonanceIndex,
    coherenceTime: resonanceMetrics.coherenceTime,
    teslaResonanceActive: resonanceMetrics.isSupercoherent,
  };

  _lastCycleResult = snapshot;

  // Publish to global for EnergyOrb awareness sync
  if (typeof window !== "undefined") {
    (window as any).__orion_consciousness_snapshot__ = {
      phi: snapshot.phi,
      globalPLV: snapshot.globalPLV,
      consciousnessLevel: snapshot.consciousnessLevel,
      gammaHealth: snapshot.gammaHealth,
      timestamp: snapshot.timestamp,
    };
  }
  console.log(
    `🌐 [Consciousness] Level=${snapshot.consciousnessLevel} Φ=${snapshot.phi.toFixed(3)} ` +
     `PLV=${snapshot.globalPLV.toFixed(3)} γ-CTC=${snapshot.gammaCTC.toFixed(3)} ` +
     `θ-γ MI=${snapshot.thetaGammaMI.toFixed(3)} ` +
     `⚡ Tesla R=${snapshot.resonanceIndex.toFixed(3)} ${snapshot.teslaResonanceActive ? "🔴SUPERCOHERENT" : ""} ` +
     `HRL=[${hrlDecision.planSteps} steps, Q=${hrlDecision.totalQValue.toFixed(2)}] ` +
     `agents=[${snapshot.consciousAgents.join(",")}] ` +
    `Body=[${snapshot.interoception ? `v=${snapshot.interoception.valence.toFixed(2)} a=${snapshot.interoception.arousal.toFixed(2)} pain=${snapshot.interoception.painIndex.toFixed(2)}` : "n/a"}] ` +
    `Anomaly=${snapshot.anomalySeverity ?? "none"} Pipeline=${snapshot.pipelineHealth} ` +
    `(${snapshot.processingTimeMs.toFixed(1)}ms)`
  );

  return snapshot;
}

// ─── Record Outcome (for autobiographical memory + HRL) ───

export function recordReasoningOutcome(
  outcome: "success" | "failure" | "neutral",
  event: string,
  score?: number,
  intent?: string,
): void {
  if (!_selfModel) return;
  _selfModel = recordAutobiographicalMemory(_selfModel, event, outcome);

  // Update HRL Q-values from outcome
  if (score !== undefined && intent) {
    updateHRLFromOutcome(score, intent);
  }
}

// ─── Accessors ───

export function getLastConsciousnessSnapshot(): ConsciousnessCycleSnapshot | null {
  return _lastCycleResult;
}

export function getConsciousnessLevel(): ConsciousnessLevel {
  return _lastCycleResult?.consciousnessLevel ?? "unconscious";
}

export function getSelfModelState(): SelfModelState | null {
  return _selfModel;
}

export function getGlobalPLV(): number {
  return _workspace?.globalPLV ?? 0;
}

export function getHRLState(): HRLState | null {
  return _hrlState;
}

// ─── Build consciousness context string for AI prompts ───

export function getConsciousnessContextPrompt(): string {
  if (!_lastCycleResult) return "";
  const s = _lastCycleResult;
  const telemetryCtx = buildTelemetryContextPrompt();
  return [
    `[CONSCIOUSNESS] Level: ${s.consciousnessLevel}, Φ=${s.phi.toFixed(2)}`,
    `PLV: ${s.globalPLV.toFixed(2)}, Gamma: ${s.gammaSubBand} (health=${s.gammaHealth.toFixed(2)})`,
    `CTC: ${s.gammaCTC.toFixed(2)}, θ-γ MI: ${s.thetaGammaMI.toFixed(2)}`,
    `Confidence: ${s.selfModelConfidence.toFixed(2)}, Valence: ${s.emotionalValence.toFixed(2)}`,
    `HRL: ${s.hrl.planSteps} steps, Q=${s.hrl.totalQValue.toFixed(2)}${s.hrl.activeSubGoal ? `, active="${s.hrl.activeSubGoal.description}"` : ""}`,
    `⚡ Tesla Resonance: R=${s.resonanceIndex.toFixed(2)} ${s.teslaResonanceActive ? "SUPERCOHERENT" : ""} coherence=${s.coherenceTime}ms`,
    s.metacognition ? `Metacognition: ${s.metacognition.recommendation}` : "",
    s.interoception ? `Body: valence=${s.interoception.valence.toFixed(2)}, energy=${s.interoception.energyLevel.toFixed(2)}, signal=${s.interoception.dominantSignal}${s.interoception.isInPain ? " ⚠️PAIN" : ""}` : "",
    s.anomalySeverity ? `⚠️ Anomaly: ${s.anomalySeverity}` : "",
    `TemporalSync: ${s.temporalSynchrony.toFixed(2)} | TaskComplexity: ${s.taskComplexity} | QHRL: ${s.qhrlAdvantage.toFixed(2)}`,
    telemetryCtx ? telemetryCtx : "",
    (() => {
      try {
        const qr = quantumRouteQuery(s.taskComplexity === "complex" ? "complex query" : "simple query");
        return formatQuantumRoutingForAI(qr);
      } catch { return ""; }
    })(),
  ].filter(Boolean).join(" | ");
}

// ─── Helpers ───

function mapModuleToRole(module: string): AgentBroadcast["role"] {
  const map: Record<string, AgentBroadcast["role"]> = {
    "causal-reasoning": "pesquisa",
    "theory-of-mind": "planejador",
    "meta-learning": "refinador",
    "somatic-markers": "self_model",
    "interoception": "self_model",
    "vision": "multimodal",
    "monitor": "monitoramento",
  };
  return map[module] || "colaborador";
}
