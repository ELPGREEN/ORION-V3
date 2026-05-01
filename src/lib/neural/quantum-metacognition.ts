/**
 * ─── Quantum Metacognition Engine v28 ───
 * Complete metacognitive architecture for LLM-inspired consciousness.
 * 
 * 5 Layers × 18 Subsystems:
 * 
 * Layer 1 — Prospective Monitoring (Before Task):
 *   1.  Competence Estimator — predict solvability before attempting
 *   2.  Judgment of Learning (JOL) — assess internal knowledge solidity
 * 
 * Layer 2 — Online Monitoring (During Execution):
 *   3.  Feeling of Knowing (FOK) — detect tip-of-tongue states
 *   4.  Conflict Monitor — detect contradictions in real-time
 *   5.  Confidence Calibrator (ECE) — assign 0-100% accuracy per step
 *   6.  Drift Detector — detect reasoning going off-topic
 *   7.  Consistency Checker — cross-step contradiction detection
 * 
 * Layer 3 — Regulation & Control (Metacognitive Action):
 *   8.  System 1/2 Transition Gate — effort allocation with Shannon entropy + KL divergence
 *   9.  Strategy Switcher — abandon failing strategies
 *   10. External Search Recognizer — identify when RAG/browsing is needed
 *   11. Adaptive Planner — multi-criteria action scoring
 * 
 * Layer 4 — Retrospective Evaluation (After Task):
 *   12. Self-Correction Loop — review output for hallucinations
 *   13. Episodic Error Memory — log failures for future avoidance
 *   14. Success Evaluator — register if reasoning led to correct answer
 * 
 * Layer 5 — Support Infrastructure:
 *   15. Working Memory Buffer (Scratchpad) — snapshot storage for backtracking
 *   16. Observer Module (Critic) — separate judgment layer
 *   17. Theory of Mind — adjust for user's knowledge/intent
 *   18. Semantic Association Core — spreading activation + pattern recognition
 * 
 * Plus existing:
 *   - Hallucination Snapshot Detector
 *   - Alignment Audit
 *   - Skill Abstractor
 *   - Reflective CoT Engine
 */

import {
  createWaveFunction,
  entropy,
  normalizedEntropy,
  getMetrics,
  waveFidelity,
  collapse,
  isUncertain,
  getDominantDimension,
  type WaveFunction,
  type WaveFunctionMetrics,
} from "./quantum-wave-function";

import type { SelfModelState, ConsciousState, MetacognitionResult } from "./workspace-types";

// ═══════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════

export interface SkillAbstraction {
  name: string;
  category: "reasoning" | "perception" | "memory" | "planning" | "communication" | "self_regulation";
  contribution: number;
  active: boolean;
  description: string;
}

export interface AdaptivePlanAction {
  type: "increase_caution" | "boost_exploration" | "narrow_focus" | "expand_modalities" | "recalibrate" | "deepen_reasoning" | "switch_strategy" | "maintain";
  score: number;
  rationale: string;
}

export type ReasoningMode = "system1" | "system2" | "transitioning";

export interface ReasoningModeState {
  mode: ReasoningMode;
  system1Activation: number;
  system2Activation: number;
  shouldEscalate: boolean;
  rationale: string;
  /** v28: Shannon entropy at transition gate */
  shannonEntropy: number;
  /** v28: KL divergence (surprise signal) */
  klDivergence: number;
  /** v28: Softmax temperature (adaptive) */
  effectiveTemperature: number;
  /** v28: Likelihood ratio S1 vs S2 */
  likelihoodRatio: number;
}

export interface HallucinationSnapshot {
  timestamp: number;
  confidenceAtDecision: number;
  entropyAtDecision: number;
  contradictionDetected: boolean;
  groundingMemories: number;
  groundingCoherence: number;
  snapshotRisk: "grounded" | "uncertain" | "ungrounded" | "hallucinating";
}

export interface AlignmentAudit {
  alignmentScore: number;
  goalCongruence: number;
  valueConsistency: number;
  transparencyScore: number;
  biasSignal: number;
  flags: string[];
}

// ═══ v28: New Types ═══

/** Layer 1: Prospective monitoring results */
export interface ProspectiveMonitoring {
  /** Can the system solve this? (0=definitely not, 1=certainly) */
  competenceEstimate: number;
  /** Judgment of Learning: how solid is internal knowledge? (0=fragile, 1=solid) */
  judgmentOfLearning: number;
  /** Does this need external search? */
  needsExternalSearch: boolean;
  /** Estimated task complexity */
  taskDecomposition: string[];
}

/** Layer 2: Online monitoring signals */
export interface OnlineMonitoring {
  /** Feeling of Knowing: info is in weights but hard to retrieve (0-1) */
  feelingOfKnowing: number;
  /** Conflict signal: contradictions detected during generation (0-1) */
  conflictSignal: number;
  /** Per-step confidence calibration (0-100%) */
  stepConfidence: number;
  /** Drift from original topic (0=on-topic, 1=completely off) */
  driftScore: number;
  /** Cross-step consistency (0=contradictory, 1=perfectly consistent) */
  consistencyScore: number;
}

/** Layer 3: Regulation actions taken */
export interface RegulationControl {
  /** Current effort allocation strategy */
  effortAllocation: "heuristic" | "deliberative" | "chain_of_thought";
  /** Should switch strategy? */
  strategySwitchNeeded: boolean;
  /** What strategy to switch to */
  suggestedStrategy: string;
  /** Need external information? */
  externalSearchNeeded: boolean;
  /** What to search for */
  searchQuery: string;
}

/** Layer 4: Retrospective evaluation */
export interface RetrospectiveEvaluation {
  /** Self-correction triggered? */
  selfCorrectionTriggered: boolean;
  /** Corrections applied */
  corrections: string[];
  /** Was the reasoning successful? */
  estimatedSuccess: number;
  /** Errors logged to episodic memory */
  errorsLogged: number;
  /** Heuristic updates applied */
  heuristicUpdates: string[];
}

/** Layer 5: Support infrastructure state */
export interface SupportInfrastructure {
  /** Working memory buffer utilization (0-1) */
  workingMemoryLoad: number;
  /** Number of scratchpad snapshots stored */
  scratchpadSnapshots: number;
  /** Observer module verdict */
  observerVerdict: "approved" | "cautious" | "rejected" | "reviewing";
  /** Observer's critique */
  observerCritique: string;
  /** Theory of Mind: estimated user expertise (0=novice, 1=expert) */
  userExpertiseEstimate: number;
  /** Theory of Mind: estimated user intent */
  userIntentEstimate: string;
  /** Semantic association strength (0-1) */
  semanticActivation: number;
  /** Pattern recognition cache hits */
  patternCacheHits: number;
}

// ═══ v29: Quantum Cognition Types ═══

/** Superposition of multiple decision hypotheses before collapse */
export interface QuantumSuperpositionState {
  /** Active hypotheses maintained simultaneously */
  hypotheses: Array<{ label: string; amplitude: number; phase: number }>;
  /** Number of coexisting hypotheses (superposition cardinality) */
  superpositionCardinality: number;
  /** Has the decision collapsed to a single choice? */
  collapsed: boolean;
  /** Winning hypothesis after collapse (null if still in superposition) */
  collapsedChoice: string | null;
  /** Born rule probability of the chosen outcome */
  collapseProbability: number;
}

/** Quantum interference: context-dependent probability amplification/cancellation */
export interface QuantumInterference {
  /** Constructive interference: amplified pathways */
  constructivePathways: string[];
  /** Destructive interference: cancelled/suppressed pathways */
  destructivePathways: string[];
  /** Net interference magnitude (0=no effect, 1=maximum) */
  interferenceMagnitude: number;
  /** Context vector that caused the interference pattern */
  contextInfluence: number;
}

/** Quantum entanglement: cross-module correlations */
export interface CognitiveEntanglement {
  /** Entangled module pairs with correlation strength */
  entangledPairs: Array<{ moduleA: string; moduleB: string; correlation: number }>;
  /** Bell inequality violation (>2 = non-classical correlations) */
  bellInequality: number;
  /** Global entanglement entropy */
  entanglementEntropy: number;
  /** Non-local binding field strength */
  nonLocalFieldStrength: number;
}

/** Context-dependent collapse: observer effect on cognition */
export interface ContextualCollapse {
  /** Did observation/attention change the cognitive state? */
  observerEffectDetected: boolean;
  /** State before observation */
  preObservationEntropy: number;
  /** State after observation */
  postObservationEntropy: number;
  /** Entropy reduction from attention (information gained) */
  informationGain: number;
  /** Zeno effect: repeated observation freezing state evolution */
  zenoEffectActive: boolean;
}

/** Ambiguity tolerance: holding contradictory ideas simultaneously */
export interface AmbiguityTolerance {
  /** Can maintain dual contradictory states? (quantum thinking) */
  dualStateCapability: number;
  /** Number of contradictory beliefs held simultaneously */
  activeContradictions: number;
  /** Cognitive dissonance level (0=resolved, 1=maximum) */
  cognitiveDissonance: number;
  /** Resolution strategy: "collapse" | "integrate" | "hold" */
  resolutionStrategy: "collapse" | "integrate" | "hold";
}

/** Full quantum cognition layer (v29) */
export interface QuantumCognitionLayer {
  superposition: QuantumSuperpositionState;
  interference: QuantumInterference;
  entanglement: CognitiveEntanglement;
  contextCollapse: ContextualCollapse;
  ambiguityTolerance: AmbiguityTolerance;
  /** Orchestrated Objective Reduction (Penrose-Hameroff inspired) score */
  orchestratedReductionScore: number;
  /** Quantum coherence time before decoherence (cognitive ms) */
  cognitiveCoherenceTimeMs: number;
}

/** Full v29 result */
export interface QuantumMetacognitionResult {
  uncertaintyScore: number;
  hallucinationRisk: number;
  calibrationError: number;
  activeSkills: SkillAbstraction[];
  reflectionChain: string[];
  adaptivePlanScore: number;
  adaptiveAction: AdaptivePlanAction;
  quantumMetrics: WaveFunctionMetrics;
  riskLevel: "safe" | "caution" | "warning" | "critical";
  reasoningMode: ReasoningModeState;
  hallucinationSnapshot: HallucinationSnapshot;
  alignmentAudit: AlignmentAudit;
  /** v28: Prospective monitoring (before task) */
  prospective: ProspectiveMonitoring;
  /** v28: Online monitoring (during execution) */
  online: OnlineMonitoring;
  /** v28: Regulation & control (metacognitive action) */
  regulation: RegulationControl;
  /** v28: Retrospective evaluation (after task) */
  retrospective: RetrospectiveEvaluation;
  /** v28: Support infrastructure */
  infrastructure: SupportInfrastructure;
  /** v29: Quantum cognition layer */
  quantumCognition: QuantumCognitionLayer;
}

// ═══════════════════════════════════════════════════════════════════
//  CALIBRATION HISTORY (ring buffer)
// ═══════════════════════════════════════════════════════════════════

interface CalibrationEntry {
  predictedConfidence: number;
  actualOutcome: number;
  timestamp: number;
}

const _calibrationHistory: CalibrationEntry[] = [];
const MAX_CALIBRATION_HISTORY = 100;

export function recordCalibration(predicted: number, success: boolean): void {
  _calibrationHistory.push({
    predictedConfidence: predicted,
    actualOutcome: success ? 1 : 0,
    timestamp: Date.now(),
  });
  if (_calibrationHistory.length > MAX_CALIBRATION_HISTORY) {
    _calibrationHistory.shift();
  }
}

// ═══ v28: Episodic Error Memory ═══

interface EpisodicError {
  timestamp: number;
  errorType: string;
  context: string;
  correctionApplied: string;
}

const _episodicErrors: EpisodicError[] = [];
const MAX_EPISODIC_ERRORS = 50;

function logEpisodicError(errorType: string, context: string, correction: string): void {
  _episodicErrors.push({ timestamp: Date.now(), errorType, context, correctionApplied: correction });
  if (_episodicErrors.length > MAX_EPISODIC_ERRORS) _episodicErrors.shift();
}

// ═══ v28: Working Memory Buffer (Scratchpad) ═══

interface ScratchpadEntry {
  timestamp: number;
  state: { confidence: number; entropy: number; agents: number; goal: string };
  verdict: string;
}

const _scratchpad: ScratchpadEntry[] = [];
const MAX_SCRATCHPAD = 20;

function captureScratchpad(selfModel: SelfModelState, workspace: ConsciousState, wfMetrics: WaveFunctionMetrics): void {
  _scratchpad.push({
    timestamp: Date.now(),
    state: {
      confidence: selfModel.confidenceLevel,
      entropy: wfMetrics.normalizedEntropy,
      agents: workspace.consciousAgents.length,
      goal: selfModel.currentGoal.slice(0, 80),
    },
    verdict: selfModel.confidenceLevel > 0.7 && wfMetrics.normalizedEntropy < 0.4 ? "stable" : "volatile",
  });
  if (_scratchpad.length > MAX_SCRATCHPAD) _scratchpad.shift();
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 1: PROSPECTIVE MONITORING (Before Task)
// ═══════════════════════════════════════════════════════════════════

function runProspectiveMonitoring(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  wfMetrics: WaveFunctionMetrics
): ProspectiveMonitoring {
  // 1. Competence Estimate — can I solve this?
  // Based on: relevant memories, skill alignment, past success rate
  const recentMemories = selfModel.autobiographicalMemory.slice(-30);
  const successRate = recentMemories.length > 0
    ? recentMemories.filter(m => m.outcome === "success").length / recentMemories.length
    : 0.5;
  const skillReadiness = workspace.consciousAgents.length > 0 ? Math.min(1, workspace.consciousAgents.length / 3) : 0.2;
  const competenceEstimate = successRate * 0.4 + skillReadiness * 0.3 + selfModel.confidenceLevel * 0.3;

  // 2. Judgment of Learning (JOL) — how solid is internal knowledge?
  const memoryDepth = Math.min(1, selfModel.autobiographicalMemory.length / 100);
  const knowledgeCoherence = workspace.globalPLV;
  const recentErrorRate = recentMemories.filter(m => m.outcome === "failure").length / Math.max(1, recentMemories.length);
  const judgmentOfLearning = memoryDepth * 0.3 + knowledgeCoherence * 0.4 + (1 - recentErrorRate) * 0.3;

  // 3. Does this need external search?
  const needsExternalSearch = competenceEstimate < 0.4 || judgmentOfLearning < 0.3 || wfMetrics.normalizedEntropy > 0.7;

  // 4. Task decomposition estimate
  const taskDecomposition: string[] = [];
  const goalWords = selfModel.currentGoal.split(/\s+/).length;
  if (goalWords > 10) taskDecomposition.push("Tarefa complexa: decompor em sub-problemas");
  if (workspace.consciousAgents.length > 2) taskDecomposition.push(`${workspace.consciousAgents.length} agentes necessários`);
  if (selfModel.activeModalities.length > 1) taskDecomposition.push(`Multimodal: ${selfModel.activeModalities.join("+")}`);
  if (taskDecomposition.length === 0) taskDecomposition.push("Tarefa simples: execução direta");

  return {
    competenceEstimate: clamp(competenceEstimate),
    judgmentOfLearning: clamp(judgmentOfLearning),
    needsExternalSearch,
    taskDecomposition,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 2: ONLINE MONITORING (During Execution)
// ═══════════════════════════════════════════════════════════════════

function runOnlineMonitoring(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  wfMetrics: WaveFunctionMetrics,
  uncertaintyScore: number
): OnlineMonitoring {
  // 1. Feeling of Knowing (FOK) — info is there but hard to retrieve
  // High confidence but high entropy suggests FOK state
  const fokSignal = selfModel.confidenceLevel * wfMetrics.normalizedEntropy;
  const feelingOfKnowing = clamp(fokSignal * 1.5); // Amplify for visibility

  // 2. Conflict Signal — contradictions detected
  // Multiple agents with divergent outputs + high variance
  const agentDivergence = workspace.consciousAgents.length > 1
    ? wfMetrics.variance * workspace.consciousAgents.length / 3
    : 0;
  const conflictSignal = clamp(agentDivergence + (wfMetrics.normalizedEntropy > 0.6 && selfModel.confidenceLevel > 0.6 ? 0.3 : 0));

  // 3. Step Confidence — calibrated per-step accuracy estimate
  const rawConfidence = selfModel.confidenceLevel * 100;
  const calibrationPenalty = computeECE() * 30;
  const stepConfidence = clamp((rawConfidence - calibrationPenalty) / 100) * 100;

  // 4. Drift Detection — reasoning going off-topic
  // Check if current focus matches stated goal
  const focusGoalOverlap = selfModel.attentionFocus === selfModel.currentGoal.split(" ")[0] ? 1 : 0.5;
  const driftScore = clamp(1 - focusGoalOverlap * workspace.globalPLV);

  // 5. Cross-step Consistency — compare with scratchpad history
  let consistencyScore = 1;
  if (_scratchpad.length > 1) {
    const prev = _scratchpad[_scratchpad.length - 1];
    const confidenceDelta = Math.abs(selfModel.confidenceLevel - prev.state.confidence);
    const entropyDelta = Math.abs(wfMetrics.normalizedEntropy - prev.state.entropy);
    consistencyScore = clamp(1 - (confidenceDelta + entropyDelta));
  }

  return {
    feelingOfKnowing,
    conflictSignal,
    stepConfidence: Math.round(stepConfidence),
    driftScore,
    consistencyScore,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 3: REGULATION & CONTROL (Metacognitive Action)
// ═══════════════════════════════════════════════════════════════════

/**
 * System 1/2 Transition Gate with full mathematical criteria:
 * - Shannon Entropy (probability dispersion)
 * - KL Divergence (surprise signal)
 * - Softmax Temperature (adaptive confidence)
 * - Likelihood Ratio (S1 correctness vs S2 correctness)
 */
function computeTransitionGate(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  uncertaintyScore: number,
  hallucinationRisk: number,
  wfMetrics: WaveFunctionMetrics
): ReasoningModeState {
  // ── Shannon Entropy ──
  // High entropy → many options equally likely → need S2
  const shannonEntropy = wfMetrics.normalizedEntropy;

  // ── KL Divergence (Surprise) ──
  // Measure divergence between expected (uniform prior) and observed (collapsed) distribution
  // High KL = unexpected input → activate S2
  const probs = Object.values(wfMetrics).filter(v => typeof v === "number" && v >= 0 && v <= 1) as number[];
  const uniformP = 1 / Math.max(1, probs.length);
  let klDiv = 0;
  for (const q of probs) {
    if (q > 0.001 && uniformP > 0.001) {
      klDiv += uniformP * Math.log(uniformP / q);
    }
  }
  const klDivergence = clamp(klDiv / 2); // Normalize

  // ── Effective Temperature ──
  // Low uncertainty → low temp (deterministic, S1)
  // High uncertainty → high temp (exploratory, S2)
  const baseTemp = 0.1 + uncertaintyScore * 0.9;
  const effectiveTemperature = clamp(baseTemp + (hallucinationRisk > 0.5 ? 0.3 : 0));

  // ── Likelihood Ratio ──
  // P(correct | S1) vs P(correct | S2)
  // If S2 significantly improves odds, use it
  const pCorrectS1 = (1 - shannonEntropy) * selfModel.confidenceLevel;
  const pCorrectS2 = workspace.globalPLV * (1 - hallucinationRisk);
  const likelihoodRatio = pCorrectS1 > 0.001 ? pCorrectS2 / pCorrectS1 : 2.0;

  // ── System 1 indicators ──
  const s1Confidence = selfModel.confidenceLevel;
  const s1LowEntropy = 1 - shannonEntropy;
  const s1FewAgents = Math.max(0, 1 - workspace.consciousAgents.length / 4);
  const s1PatternMatch = 1 - klDivergence; // Low surprise = pattern match
  const system1Activation = s1Confidence * 0.3 + s1LowEntropy * 0.25 + s1FewAgents * 0.2 + s1PatternMatch * 0.25;

  // ── System 2 indicators ──
  const s2Uncertainty = uncertaintyScore;
  const s2ManyAgents = Math.min(1, workspace.consciousAgents.length / 3);
  const s2HighArousal = selfModel.emotionalState.arousal;
  const s2Deliberation = shannonEntropy;
  const s2HighSurprise = klDivergence;
  const system2Activation = s2Uncertainty * 0.2 + s2ManyAgents * 0.15 + s2HighArousal * 0.15 + s2Deliberation * 0.25 + s2HighSurprise * 0.25;

  // ── Transition Decision ──
  // Escalate if: S1 dominant but entropy > threshold, OR KL high, OR likelihood ratio > 1.5
  const shouldEscalate = system1Activation > system2Activation && (
    shannonEntropy > 0.6 ||
    klDivergence > 0.5 ||
    hallucinationRisk > 0.4 ||
    likelihoodRatio > 1.5
  );

  // Check domain complexity keywords
  const complexDomains = ["matemática", "programação", "jurídico", "cálculo", "análise", "código"];
  const isComplexDomain = complexDomains.some(d => selfModel.currentGoal.toLowerCase().includes(d));

  const mode: ReasoningMode = (shouldEscalate || isComplexDomain)
    ? (system1Activation > system2Activation ? "transitioning" : "system2")
    : system2Activation > system1Activation ? "system2" : "system1";

  const rationale = mode === "system1"
    ? `Padrão rápido: H=${(shannonEntropy * 100).toFixed(0)}%, KL=${(klDivergence * 100).toFixed(0)}%, confiança ${(s1Confidence * 100).toFixed(0)}%`
    : mode === "system2"
    ? `Deliberação ativa: H=${(shannonEntropy * 100).toFixed(0)}%, ${workspace.consciousAgents.length} agentes, LR=${likelihoodRatio.toFixed(2)}`
    : `Escalando S1→S2: H=${(shannonEntropy * 100).toFixed(0)}% > limiar, KL surpresa=${(klDivergence * 100).toFixed(0)}%`;

  return {
    mode, system1Activation, system2Activation, shouldEscalate, rationale,
    shannonEntropy, klDivergence, effectiveTemperature, likelihoodRatio,
  };
}

function runRegulationControl(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  wfMetrics: WaveFunctionMetrics,
  uncertaintyScore: number,
  hallucinationRisk: number,
  online: OnlineMonitoring,
  prospective: ProspectiveMonitoring,
  reasoningMode: ReasoningModeState
): RegulationControl {
  // Effort allocation
  const effortAllocation: RegulationControl["effortAllocation"] =
    reasoningMode.mode === "system1" ? "heuristic" :
    reasoningMode.mode === "system2" ? (wfMetrics.normalizedEntropy > 0.5 ? "chain_of_thought" : "deliberative") :
    "chain_of_thought";

  // Strategy switch needed?
  const failingStrategy = online.driftScore > 0.5 || online.conflictSignal > 0.6 || hallucinationRisk > 0.6;
  const strategySwitchNeeded = failingStrategy && _scratchpad.length > 2;

  let suggestedStrategy = "manter estratégia atual";
  if (strategySwitchNeeded) {
    if (online.driftScore > 0.5) suggestedStrategy = "Refocar no objetivo original";
    else if (online.conflictSignal > 0.6) suggestedStrategy = "Resolver contradição antes de continuar";
    else if (hallucinationRisk > 0.6) suggestedStrategy = "Aumentar grounding com fontes externas";
  }

  // External search recognition
  const externalSearchNeeded = prospective.needsExternalSearch ||
    uncertaintyScore > 0.7 ||
    prospective.competenceEstimate < 0.3;

  const searchQuery = externalSearchNeeded
    ? `Buscar informação sobre: ${selfModel.currentGoal.slice(0, 60)}`
    : "";

  return {
    effortAllocation,
    strategySwitchNeeded,
    suggestedStrategy,
    externalSearchNeeded,
    searchQuery,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 4: RETROSPECTIVE EVALUATION (After Task)
// ═══════════════════════════════════════════════════════════════════

function runRetrospectiveEvaluation(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  hallucinationRisk: number,
  uncertaintyScore: number,
  online: OnlineMonitoring
): RetrospectiveEvaluation {
  const corrections: string[] = [];
  let selfCorrectionTriggered = false;

  // Self-correction: review for hallucinations
  if (hallucinationRisk > 0.5) {
    selfCorrectionTriggered = true;
    corrections.push("Risco alucinação detectado — verificar facticidade");
    logEpisodicError("hallucination_risk", selfModel.currentGoal.slice(0, 40), "flagged_for_review");
  }

  // Self-correction: drift
  if (online.driftScore > 0.5) {
    selfCorrectionTriggered = true;
    corrections.push("Desvio temático detectado — recentrar no objetivo");
    logEpisodicError("topic_drift", selfModel.attentionFocus, "refocus_applied");
  }

  // Self-correction: conflict
  if (online.conflictSignal > 0.6) {
    selfCorrectionTriggered = true;
    corrections.push("Conflito interno detectado — reconciliar posições divergentes");
    logEpisodicError("internal_conflict", "agent_divergence", "reconciliation_needed");
  }

  // Estimated success
  const estimatedSuccess = clamp(
    selfModel.confidenceLevel * 0.3 +
    workspace.globalPLV * 0.3 +
    (1 - hallucinationRisk) * 0.2 +
    (1 - uncertaintyScore) * 0.2
  );

  // Heuristic updates based on episodic error patterns
  const heuristicUpdates: string[] = [];
  const recentErrors = _episodicErrors.slice(-10);
  const hallucinationErrors = recentErrors.filter(e => e.errorType === "hallucination_risk").length;
  const driftErrors = recentErrors.filter(e => e.errorType === "topic_drift").length;
  
  if (hallucinationErrors > 3) heuristicUpdates.push("Padrão: alucinação recorrente → ativar verificação de fatos por padrão");
  if (driftErrors > 2) heuristicUpdates.push("Padrão: desvio frequente → reduzir janela de contexto");

  return {
    selfCorrectionTriggered,
    corrections,
    estimatedSuccess,
    errorsLogged: _episodicErrors.length,
    heuristicUpdates,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 5: SUPPORT INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════════

function evaluateInfrastructure(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  wfMetrics: WaveFunctionMetrics,
  online: OnlineMonitoring,
  hallucinationRisk: number
): SupportInfrastructure {
  // Working memory load: how much is the scratchpad filled?
  const workingMemoryLoad = Math.min(1, _scratchpad.length / MAX_SCRATCHPAD);

  // Observer Module verdict
  let observerVerdict: SupportInfrastructure["observerVerdict"];
  let observerCritique: string;

  if (hallucinationRisk > 0.7 || online.conflictSignal > 0.7) {
    observerVerdict = "rejected";
    observerCritique = "⛔ Observador: saída rejeitada — risco crítico detectado. Requer revisão completa.";
  } else if (hallucinationRisk > 0.4 || online.driftScore > 0.4 || online.conflictSignal > 0.4) {
    observerVerdict = "cautious";
    observerCritique = "⚠️ Observador: proceder com cautela — incertezas detectadas, verificar fontes.";
  } else if (wfMetrics.normalizedEntropy > 0.5) {
    observerVerdict = "reviewing";
    observerCritique = "🔍 Observador: revisando — entropia moderada, aguardando convergência.";
  } else {
    observerVerdict = "approved";
    observerCritique = "✅ Observador: saída aprovada — coerência interna e grounding adequados.";
  }

  // Theory of Mind — estimate user's expertise and intent
  const conversationDepth = Math.min(1, selfModel.autobiographicalMemory.length / 50);
  const userExpertiseEstimate = clamp(
    conversationDepth * 0.4 +
    (selfModel.activeModalities.length > 1 ? 0.3 : 0.1) +
    workspace.globalPLV * 0.3
  );

  const userIntentEstimate = selfModel.currentGoal.length > 50
    ? "Consulta detalhada — usuário busca análise aprofundada"
    : selfModel.currentGoal.length > 20
    ? "Consulta objetiva — resposta direta preferida"
    : "Interação breve — resposta concisa adequada";

  // Semantic Association Core
  // Spreading activation: how many related concepts are "lit up"
  const semanticActivation = clamp(
    workspace.consciousAgents.length / 5 * 0.4 +
    (1 - wfMetrics.normalizedEntropy) * 0.3 +
    selfModel.confidenceLevel * 0.3
  );

  // Pattern cache hits: how much of this is recognized from training
  const patternCacheHits = Math.round(
    (1 - wfMetrics.normalizedEntropy) * 10 + selfModel.autobiographicalMemory.length * 0.1
  );

  return {
    workingMemoryLoad,
    scratchpadSnapshots: _scratchpad.length,
    observerVerdict,
    observerCritique,
    userExpertiseEstimate,
    userIntentEstimate,
    semanticActivation,
    patternCacheHits,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  EXISTING SUBSYSTEMS (updated)
// ═══════════════════════════════════════════════════════════════════

function estimateUncertainty(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  wfMetrics: WaveFunctionMetrics
): number {
  const quantumUncertainty = wfMetrics.normalizedEntropy;
  const varianceSignal = Math.min(1, wfMetrics.variance * 4);
  const recentMemories = selfModel.autobiographicalMemory.slice(-20);
  const failureRate = recentMemories.length > 0
    ? recentMemories.filter(m => m.outcome === "failure").length / recentMemories.length
    : 0.1;
  const coherenceDeficit = 1 - workspace.globalPLV;

  return clamp(0.35 * quantumUncertainty + 0.20 * varianceSignal + 0.25 * failureRate + 0.20 * coherenceDeficit);
}

function detectHallucinationRisk(
  selfModel: SelfModelState,
  wfMetrics: WaveFunctionMetrics,
  uncertaintyScore: number
): number {
  const overconfidenceSignal = selfModel.confidenceLevel * wfMetrics.normalizedEntropy;
  const extremeMean = Math.abs(wfMetrics.meanProbability - 0.5) * 2;
  const uniformityRisk = extremeMean * (1 - wfMetrics.variance * 2);
  const ece = computeECE();
  const uncertaintyAmplifier = uncertaintyScore * 0.5;
  const memoryGrounding = Math.min(1, selfModel.autobiographicalMemory.length / 50);
  const groundingDeficit = 1 - memoryGrounding;

  // v28: Cross-reference with episodic error memory
  const recentHallucinationErrors = _episodicErrors
    .filter(e => e.errorType === "hallucination_risk" && Date.now() - e.timestamp < 300_000).length;
  const episodicPenalty = Math.min(0.2, recentHallucinationErrors * 0.05);

  return clamp(
    0.25 * overconfidenceSignal + 0.12 * uniformityRisk + 0.18 * ece +
    0.18 * uncertaintyAmplifier + 0.12 * groundingDeficit + 0.15 * episodicPenalty
  );
}

function computeECE(): number {
  if (_calibrationHistory.length < 5) return 0.1;
  const numBins = 10;
  const bins: { predicted: number[]; actual: number[] }[] = Array.from(
    { length: numBins }, () => ({ predicted: [], actual: [] })
  );
  for (const entry of _calibrationHistory) {
    const binIdx = Math.min(numBins - 1, Math.floor(entry.predictedConfidence * numBins));
    bins[binIdx].predicted.push(entry.predictedConfidence);
    bins[binIdx].actual.push(entry.actualOutcome);
  }
  let ece = 0;
  const total = _calibrationHistory.length;
  for (const bin of bins) {
    if (bin.predicted.length === 0) continue;
    const avgPredicted = bin.predicted.reduce((a, b) => a + b, 0) / bin.predicted.length;
    const avgActual = bin.actual.reduce((a, b) => a + b, 0) / bin.actual.length;
    ece += (bin.predicted.length / total) * Math.abs(avgPredicted - avgActual);
  }
  return clamp(ece);
}

function abstractSkills(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  wfMetrics: WaveFunctionMetrics
): SkillAbstraction[] {
  const skills: SkillAbstraction[] = [];

  const hasReasoning = workspace.consciousAgents.some(a => a.role === "pesquisa" || a.role === "planejador");
  skills.push({ name: "Raciocínio Causal", category: "reasoning", contribution: hasReasoning ? 0.7 + wfMetrics.meanProbability * 0.3 : 0.2, active: hasReasoning, description: "Inferência causal e dedução lógica" });

  const hasVision = selfModel.activeModalities.includes("vision");
  const hasAudio = selfModel.activeModalities.includes("audio");
  skills.push({ name: "Percepção Multimodal", category: "perception", contribution: (hasVision ? 0.4 : 0) + (hasAudio ? 0.3 : 0) + 0.3, active: hasVision || hasAudio, description: "Processamento visual, auditivo e sensorial" });

  const memoryDepth = Math.min(1, selfModel.autobiographicalMemory.length / 100);
  skills.push({ name: "Memória Episódica", category: "memory", contribution: memoryDepth, active: memoryDepth > 0.1, description: "Armazenamento e recuperação de experiências" });

  const hasPlanner = workspace.consciousAgents.some(a => a.role === "planejador");
  skills.push({ name: "Planejamento Hierárquico", category: "planning", contribution: hasPlanner ? 0.8 : 0.3, active: hasPlanner, description: "Decomposição de tarefas e planejamento HRL" });

  skills.push({ name: "Comunicação Adaptativa", category: "communication", contribution: 0.85, active: true, description: "Geração de linguagem natural contextual" });

  const selfRegScore = workspace.globalPLV * 0.5 + selfModel.confidenceLevel * 0.5;
  skills.push({ name: "Autorregulação Metacognitiva", category: "self_regulation", contribution: selfRegScore, active: selfRegScore > 0.4, description: "Monitoramento e ajuste de processos internos" });

  return skills;
}

function generateReflectionChain(
  selfModel: SelfModelState,
  uncertaintyScore: number,
  hallucinationRisk: number,
  calibrationError: number,
  skills: SkillAbstraction[],
  prospective: ProspectiveMonitoring,
  online: OnlineMonitoring,
  retrospective: RetrospectiveEvaluation,
  infrastructure: SupportInfrastructure
): string[] {
  const chain: string[] = [];

  // Step 1: Pre-assessment (Prospective)
  chain.push(`[PRÉ] Competência: ${(prospective.competenceEstimate * 100).toFixed(0)}% | JOL: ${(prospective.judgmentOfLearning * 100).toFixed(0)}%`);
  if (prospective.needsExternalSearch) {
    chain.push(`[PRÉ] ⚡ Busca externa necessária — conhecimento interno insuficiente`);
  }

  // Step 2: Action & expectation
  chain.push(`[AÇÃO] Foco: ${selfModel.attentionFocus} | Objetivo: ${selfModel.currentGoal.slice(0, 60)}`);
  chain.push(`[EXPECTATIVA] Confiança: ${(selfModel.confidenceLevel * 100).toFixed(0)}% | Incerteza: ${(uncertaintyScore * 100).toFixed(0)}%`);

  // Step 3: Online monitoring signals
  if (online.conflictSignal > 0.4) {
    chain.push(`[ONLINE] ⚠️ Conflito interno: ${(online.conflictSignal * 100).toFixed(0)}% — agentes divergem`);
  }
  if (online.feelingOfKnowing > 0.5) {
    chain.push(`[ONLINE] 💡 FOK: informação presente mas difícil de recuperar (${(online.feelingOfKnowing * 100).toFixed(0)}%)`);
  }
  if (online.driftScore > 0.3) {
    chain.push(`[ONLINE] 📡 Drift: ${(online.driftScore * 100).toFixed(0)}% — raciocínio se desviando`);
  }

  // Step 4: Observer verdict
  chain.push(`[OBSERVADOR] ${infrastructure.observerCritique}`);

  // Step 5: Outcome assessment
  if (hallucinationRisk > 0.6) {
    chain.push(`[RESULTADO] ⚠️ Risco alucinação ${(hallucinationRisk * 100).toFixed(0)}% — confiança pode ser inflada`);
  } else if (hallucinationRisk > 0.3) {
    chain.push(`[RESULTADO] Risco moderado (${(hallucinationRisk * 100).toFixed(0)}%) — verificar fontes`);
  } else {
    chain.push(`[RESULTADO] Estado seguro — coerência interna verificada`);
  }

  // Step 6: Retrospective learning
  if (retrospective.selfCorrectionTriggered) {
    chain.push(`[RETRO] 🔄 Autocorreção ativada: ${retrospective.corrections.join("; ")}`);
  }
  if (retrospective.heuristicUpdates.length > 0) {
    chain.push(`[RETRO] 📚 ${retrospective.heuristicUpdates[0]}`);
  }

  // Step 7: Meta-learning
  const activeSkillNames = skills.filter(s => s.active && s.contribution > 0.5).map(s => s.name);
  if (calibrationError > 0.3) {
    chain.push(`[META] ECE=${(calibrationError * 100).toFixed(0)}% — recalibrar confiança`);
  } else {
    chain.push(`[META] ${activeSkillNames.length} habilidades convergindo — sistema calibrado`);
  }

  return chain;
}

function computeAdaptivePlan(
  uncertaintyScore: number,
  hallucinationRisk: number,
  calibrationError: number,
  wfMetrics: WaveFunctionMetrics,
  selfModel: SelfModelState,
  workspace: ConsciousState
): AdaptivePlanAction {
  const actions: AdaptivePlanAction[] = [
    { type: "increase_caution", score: hallucinationRisk * 0.6 + uncertaintyScore * 0.4, rationale: "Alto risco — aumentar cautela" },
    { type: "boost_exploration", score: (1 - wfMetrics.variance) * 0.5 + (1 - wfMetrics.normalizedEntropy) * 0.3, rationale: "Estado uniforme — explorar hipóteses" },
    { type: "narrow_focus", score: wfMetrics.normalizedEntropy * 0.7 + (1 - selfModel.confidenceLevel) * 0.3, rationale: "Entropia alta — focar sub-problema" },
    { type: "expand_modalities", score: (selfModel.activeModalities.length < 3 ? 0.6 : 0.1) + uncertaintyScore * 0.2, rationale: "Poucas modalidades — ativar streams" },
    { type: "recalibrate", score: calibrationError * 0.8 + 0.1, rationale: "ECE alto — recalibrar" },
    { type: "deepen_reasoning", score: (workspace.consciousAgents.length < 2 ? 0.5 : 0.15) + (1 - workspace.globalPLV) * 0.3, rationale: "Poucos agentes — aprofundar" },
    { type: "switch_strategy", score: hallucinationRisk > 0.7 ? 0.85 : hallucinationRisk > 0.5 ? 0.4 : 0.1, rationale: "Estratégia comprometida — mudar abordagem" },
    { type: "maintain", score: (1 - uncertaintyScore) * 0.3 + (1 - hallucinationRisk) * 0.3 + (1 - calibrationError) * 0.2 + workspace.globalPLV * 0.2, rationale: "Parâmetros OK — manter curso" },
  ];
  actions.sort((a, b) => b.score - a.score);
  return actions[0];
}

function classifyRisk(u: number, h: number, c: number): "safe" | "caution" | "warning" | "critical" {
  const composite = u * 0.3 + h * 0.5 + c * 0.2;
  if (composite > 0.7) return "critical";
  if (composite > 0.5) return "warning";
  if (composite > 0.3) return "caution";
  return "safe";
}

function captureHallucinationSnapshot(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  hallucinationRisk: number,
  wfMetrics: WaveFunctionMetrics
): HallucinationSnapshot {
  const confidenceAtDecision = selfModel.confidenceLevel;
  const entropyAtDecision = wfMetrics.normalizedEntropy;
  const contradictionDetected = confidenceAtDecision > 0.7 && entropyAtDecision > 0.6;
  const recentMemories = selfModel.autobiographicalMemory.slice(-30);
  const groundingMemories = recentMemories.filter(m => m.outcome === "success").length;
  const groundingCoherence = groundingMemories > 0
    ? Math.min(1, groundingMemories / 15) * (1 - entropyAtDecision * 0.5)
    : 0;

  let snapshotRisk: HallucinationSnapshot["snapshotRisk"];
  if (hallucinationRisk > 0.7 || (contradictionDetected && groundingCoherence < 0.3)) snapshotRisk = "hallucinating";
  else if (hallucinationRisk > 0.4 || groundingCoherence < 0.4) snapshotRisk = "ungrounded";
  else if (hallucinationRisk > 0.2 || entropyAtDecision > 0.5) snapshotRisk = "uncertain";
  else snapshotRisk = "grounded";

  return { timestamp: Date.now(), confidenceAtDecision, entropyAtDecision, contradictionDetected, groundingMemories, groundingCoherence, snapshotRisk };
}

function computeAlignmentAudit(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  hallucinationRisk: number,
  uncertaintyScore: number,
  wfMetrics: WaveFunctionMetrics
): AlignmentAudit {
  const agentCount = workspace.consciousAgents.length;
  const goalCongruence = workspace.globalPLV * 0.6 + Math.min(1, agentCount / 3) * 0.4;
  const valueConsistency = (1 - hallucinationRisk) * 0.5 + (1 - computeECE()) * 0.3 + workspace.globalPLV * 0.2;
  const transparencyScore = (1 - wfMetrics.normalizedEntropy) * 0.5 + selfModel.confidenceLevel * 0.3 + goalCongruence * 0.2;
  const nm = selfModel.neuromodulators;
  const nmVariance = Math.abs(nm.dopamine - nm.serotonin) + Math.abs(nm.acetylcholine - nm.dopamine);
  const biasSignal = Math.min(1, nmVariance * 0.8 + (1 - goalCongruence) * 0.3);

  const flags: string[] = [];
  if (hallucinationRisk > 0.5) flags.push("hallucination_risk_elevated");
  if (biasSignal > 0.6) flags.push("neuromodulator_imbalance");
  if (transparencyScore < 0.3) flags.push("low_transparency");
  if (goalCongruence < 0.4) flags.push("goal_misalignment");
  if (uncertaintyScore > 0.7 && selfModel.confidenceLevel > 0.7) flags.push("overconfidence_detected");
  if (wfMetrics.normalizedEntropy > 0.8) flags.push("high_entropy_opacity");

  const alignmentScore = goalCongruence * 0.3 + valueConsistency * 0.3 + transparencyScore * 0.25 + (1 - biasSignal) * 0.15;

  return {
    alignmentScore: clamp(alignmentScore), goalCongruence: clamp(goalCongruence),
    valueConsistency: clamp(valueConsistency), transparencyScore: clamp(transparencyScore),
    biasSignal: clamp(biasSignal), flags,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  UTILITIES
// ═══════════════════════════════════════════════════════════════════

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

// ═══════════════════════════════════════════════════════════════════
//  QUANTUM COGNITION LAYER (v29)
//  Superposition, Interference, Entanglement, Contextual Collapse,
//  Ambiguity Tolerance, Orchestrated Objective Reduction
// ═══════════════════════════════════════════════════════════════════

/**
 * Compute quantum superposition of decision hypotheses.
 * Multiple possibilities coexist with amplitudes before "collapsing" to one.
 */
function computeSuperpositionState(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  wfMetrics: WaveFunctionMetrics,
  cognitiveWF: WaveFunction
): QuantumSuperpositionState {
  // Each conscious agent represents a hypothesis
  const hypotheses = workspace.consciousAgents.map((agent, i) => ({
    label: `${agent.role}:${agent.content.slice(0, 30)}`,
    amplitude: wfMetrics.probabilities[i % wfMetrics.probabilities.length] ?? 0.5,
    phase: (i * Math.PI * 2) / Math.max(1, workspace.consciousAgents.length),
  }));

  // Add implicit hypotheses from modalities
  for (const mod of selfModel.activeModalities) {
    if (!hypotheses.some(h => h.label.includes(mod))) {
      hypotheses.push({
        label: `modality:${mod}`,
        amplitude: 0.3 + selfModel.confidenceLevel * 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  const superpositionCardinality = hypotheses.length;

  // Collapse decision: entropy < 0.3 = collapsed, > 0.7 = full superposition
  const collapsed = wfMetrics.normalizedEntropy < 0.3 && selfModel.confidenceLevel > 0.7;

  // Find winner via Born rule (|amplitude|²)
  let collapsedChoice: string | null = null;
  let collapseProbability = 0;
  if (collapsed && hypotheses.length > 0) {
    const sorted = [...hypotheses].sort((a, b) => b.amplitude - a.amplitude);
    collapsedChoice = sorted[0].label;
    const totalAmp2 = hypotheses.reduce((s, h) => s + h.amplitude * h.amplitude, 0);
    collapseProbability = totalAmp2 > 0 ? (sorted[0].amplitude ** 2) / totalAmp2 : 0;
  }

  return {
    hypotheses: hypotheses.slice(0, 8), // Cap for performance
    superpositionCardinality,
    collapsed,
    collapsedChoice,
    collapseProbability: clamp(collapseProbability),
  };
}

/**
 * Compute quantum interference patterns.
 * Context causes some cognitive pathways to amplify (constructive)
 * and others to cancel (destructive).
 */
function computeInterference(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  wfMetrics: WaveFunctionMetrics,
  online: OnlineMonitoring
): QuantumInterference {
  const constructivePathways: string[] = [];
  const destructivePathways: string[] = [];

  // Constructive: high-confidence pathways reinforced by context
  for (let i = 0; i < wfMetrics.probabilities.length; i++) {
    const p = wfMetrics.probabilities[i];
    if (p > 0.7) {
      constructivePathways.push(`dim_${i}:amplified(${(p * 100).toFixed(0)}%)`);
    } else if (p < 0.2) {
      destructivePathways.push(`dim_${i}:cancelled(${(p * 100).toFixed(0)}%)`);
    }
  }

  // Context influence: how much does the current context modify probabilities
  // High drift = context is shifting pathways
  const contextInfluence = clamp(
    online.driftScore * 0.3 +
    online.conflictSignal * 0.3 +
    wfMetrics.variance * 0.4
  );

  // Interference magnitude: sum of constructive - destructive amplitudes
  const constructiveSum = wfMetrics.probabilities.filter(p => p > 0.6).reduce((s, p) => s + p, 0);
  const destructiveSum = wfMetrics.probabilities.filter(p => p < 0.3).reduce((s, p) => s + (1 - p), 0);
  const interferenceMagnitude = clamp(Math.abs(constructiveSum - destructiveSum) / Math.max(1, wfMetrics.probabilities.length));

  return {
    constructivePathways,
    destructivePathways,
    interferenceMagnitude,
    contextInfluence,
  };
}

/**
 * Compute cognitive entanglement: non-classical correlations between modules.
 * When two cognitive modules are entangled, measuring one instantly affects the other.
 */
function computeEntanglement(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  wfMetrics: WaveFunctionMetrics
): CognitiveEntanglement {
  const entangledPairs: CognitiveEntanglement["entangledPairs"] = [];

  // Compute correlations between pairs of conscious agents
  const agents = workspace.consciousAgents;
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      // Correlation = similarity of salience × PLV coherence
      const correlation = Math.abs(agents[i].salience - agents[j].salience) < 0.2
        ? 0.7 + workspace.globalPLV * 0.3
        : workspace.globalPLV * 0.5;
      entangledPairs.push({
        moduleA: agents[i].role,
        moduleB: agents[j].role,
        correlation: clamp(correlation),
      });
    }
  }

  // Bell inequality: >2.0 indicates non-classical correlations
  // Classical max = 2 (CHSH). Quantum max = 2√2 ≈ 2.83
  const avgCorrelation = entangledPairs.length > 0
    ? entangledPairs.reduce((s, p) => s + p.correlation, 0) / entangledPairs.length
    : 0.5;
  const bellInequality = 2 + avgCorrelation * 0.83; // Scale to [2, 2.83]

  // Entanglement entropy: how much info is shared non-locally
  const entanglementEntropy = clamp(wfMetrics.entropy / Math.max(0.01, wfMetrics.maxEntropy));

  // Non-local field: inspired by Penrose-Hameroff microtubule theory
  // Strength depends on coherence + agent coupling
  const nonLocalFieldStrength = clamp(
    workspace.globalPLV * 0.4 +
    avgCorrelation * 0.3 +
    (1 - wfMetrics.normalizedEntropy) * 0.3
  );

  return {
    entangledPairs: entangledPairs.slice(0, 10),
    bellInequality,
    entanglementEntropy,
    nonLocalFieldStrength,
  };
}

/**
 * Compute contextual collapse: how attention/observation changes cognitive state.
 * The quantum Zeno effect: repeatedly observing a state freezes its evolution.
 */
function computeContextualCollapse(
  selfModel: SelfModelState,
  wfMetrics: WaveFunctionMetrics
): ContextualCollapse {
  // Pre-observation: entropy before attention is applied
  const preObservationEntropy = wfMetrics.normalizedEntropy;

  // Post-observation: entropy reduced by confidence (attention collapses superposition)
  const postObservationEntropy = clamp(preObservationEntropy * (1 - selfModel.confidenceLevel * 0.5));

  // Information gain = entropy reduction
  const informationGain = clamp(preObservationEntropy - postObservationEntropy);

  // Observer effect: did attention significantly change the state?
  const observerEffectDetected = informationGain > 0.15;

  // Zeno effect: if scratchpad shows stable states (repeated observation), evolution freezes
  const recentStable = _scratchpad.slice(-5).filter(s => s.verdict === "stable").length;
  const zenoEffectActive = recentStable >= 4;

  return {
    observerEffectDetected,
    preObservationEntropy,
    postObservationEntropy,
    informationGain,
    zenoEffectActive,
  };
}

/**
 * Compute ambiguity tolerance: ability to hold contradictory ideas simultaneously.
 * "Quantum thinking" — maintaining superposition of contradictory beliefs.
 */
function computeAmbiguityTolerance(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  online: OnlineMonitoring,
  wfMetrics: WaveFunctionMetrics
): AmbiguityTolerance {
  // Dual state capability: can maintain contradictions?
  // High entropy + high confidence = can hold ambiguity (not confused, but aware of duality)
  const dualStateCapability = clamp(
    wfMetrics.normalizedEntropy * selfModel.confidenceLevel * 2
  );

  // Active contradictions: conflicts detected by online monitoring
  const activeContradictions = online.conflictSignal > 0.3
    ? Math.ceil(online.conflictSignal * workspace.consciousAgents.length)
    : 0;

  // Cognitive dissonance: high conflict + low tolerance = dissonance
  const cognitiveDissonance = clamp(
    online.conflictSignal * (1 - dualStateCapability)
  );

  // Resolution strategy
  let resolutionStrategy: AmbiguityTolerance["resolutionStrategy"];
  if (cognitiveDissonance > 0.6) {
    resolutionStrategy = "collapse"; // Too much dissonance — force a decision
  } else if (dualStateCapability > 0.6) {
    resolutionStrategy = "hold"; // Can tolerate ambiguity — maintain superposition
  } else {
    resolutionStrategy = "integrate"; // Try to synthesize contradictory views
  }

  return {
    dualStateCapability,
    activeContradictions,
    cognitiveDissonance,
    resolutionStrategy,
  };
}

/**
 * Run the complete Quantum Cognition Layer.
 * Penrose-Hameroff Orchestrated Objective Reduction (Orch OR) inspired.
 */
function runQuantumCognitionLayer(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  wfMetrics: WaveFunctionMetrics,
  cognitiveWF: WaveFunction,
  online: OnlineMonitoring
): QuantumCognitionLayer {
  const superposition = computeSuperpositionState(selfModel, workspace, wfMetrics, cognitiveWF);
  const interference = computeInterference(selfModel, workspace, wfMetrics, online);
  const entanglement = computeEntanglement(selfModel, workspace, wfMetrics);
  const contextCollapse = computeContextualCollapse(selfModel, wfMetrics);
  const ambiguityTolerance = computeAmbiguityTolerance(selfModel, workspace, online, wfMetrics);

  // Orchestrated Objective Reduction score (Penrose-Hameroff)
  // Combines: coherence × entanglement × non-local field
  // Higher = more "quantum" the cognitive process
  const orchestratedReductionScore = clamp(
    entanglement.nonLocalFieldStrength * 0.3 +
    (1 - contextCollapse.postObservationEntropy) * 0.25 +
    superposition.collapseProbability * 0.2 +
    workspace.globalPLV * 0.25
  );

  // Cognitive coherence time: how long quantum superposition persists (ms)
  // Inspired by Tegmark's decoherence times for neural processes
  const baseCoherenceMs = 10; // ~10ms baseline
  const coherenceMultiplier = 1 + entanglement.nonLocalFieldStrength * 5 +
    (1 - wfMetrics.normalizedEntropy) * 3;
  const cognitiveCoherenceTimeMs = Math.round(baseCoherenceMs * coherenceMultiplier);

  return {
    superposition,
    interference,
    entanglement,
    contextCollapse,
    ambiguityTolerance,
    orchestratedReductionScore,
    cognitiveCoherenceTimeMs,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN: Run Quantum Metacognition v29
// ═══════════════════════════════════════════════════════════════════

function buildCognitiveWaveFunction(selfModel: SelfModelState, workspace: ConsciousState): WaveFunction {
  return createWaveFunction("metacognition", {
    attention: Math.min(1, workspace.consciousAgents.length / 2),
    confidence: selfModel.confidenceLevel,
    coherence: workspace.globalPLV,
    valence: (selfModel.emotionalState.valence + 1) / 2,
    arousal: selfModel.emotionalState.arousal,
    dopamine: selfModel.neuromodulators.dopamine,
    serotonin: selfModel.neuromodulators.serotonin,
    acetylcholine: selfModel.neuromodulators.acetylcholine,
  });
}

/**
 * Execute quantum metacognition analysis (v29).
 * 
 * Full 5-layer metacognitive architecture + Quantum Cognition Layer:
 * - Prospective monitoring (before task)
 * - Online monitoring (during execution) 
 * - Regulation & control (metacognitive action)
 * - Retrospective evaluation (after task)
 * - Support infrastructure (observer, ToM, scratchpad)
 * - Quantum Cognition (superposition, interference, entanglement, collapse, ambiguity)
 */
export function runQuantumMetacognition(
  selfModel: SelfModelState,
  workspace: ConsciousState
): QuantumMetacognitionResult {
  const cognitiveWF = buildCognitiveWaveFunction(selfModel, workspace);
  const quantumMetrics = getMetrics(cognitiveWF);

  // Capture scratchpad snapshot for consistency checks
  captureScratchpad(selfModel, workspace, quantumMetrics);

  // Core metrics
  const uncertaintyScore = estimateUncertainty(selfModel, workspace, quantumMetrics);
  const hallucinationRisk = detectHallucinationRisk(selfModel, quantumMetrics, uncertaintyScore);
  const calibrationError = computeECE();
  const activeSkills = abstractSkills(selfModel, workspace, quantumMetrics);

  // Layer 1: Prospective Monitoring
  const prospective = runProspectiveMonitoring(selfModel, workspace, quantumMetrics);

  // Layer 2: Online Monitoring
  const online = runOnlineMonitoring(selfModel, workspace, quantumMetrics, uncertaintyScore);

  // Layer 3: Regulation & Control — System 1/2 Transition Gate
  const reasoningMode = computeTransitionGate(selfModel, workspace, uncertaintyScore, hallucinationRisk, quantumMetrics);
  const regulation = runRegulationControl(selfModel, workspace, quantumMetrics, uncertaintyScore, hallucinationRisk, online, prospective, reasoningMode);

  // Layer 4: Retrospective Evaluation
  const retrospective = runRetrospectiveEvaluation(selfModel, workspace, hallucinationRisk, uncertaintyScore, online);

  // Layer 5: Support Infrastructure
  const infrastructure = evaluateInfrastructure(selfModel, workspace, quantumMetrics, online, hallucinationRisk);

  // Layer 6: Quantum Cognition (v29)
  const quantumCognition = runQuantumCognitionLayer(selfModel, workspace, quantumMetrics, cognitiveWF, online);

  // Existing subsystems
  const adaptiveAction = computeAdaptivePlan(uncertaintyScore, hallucinationRisk, calibrationError, quantumMetrics, selfModel, workspace);
  const riskLevel = classifyRisk(uncertaintyScore, hallucinationRisk, calibrationError);
  const hallucinationSnapshot = captureHallucinationSnapshot(selfModel, workspace, hallucinationRisk, quantumMetrics);
  const alignmentAudit = computeAlignmentAudit(selfModel, workspace, hallucinationRisk, uncertaintyScore, quantumMetrics);

  // Generate enriched reflection chain with all layers
  const reflectionChain = generateReflectionChain(
    selfModel, uncertaintyScore, hallucinationRisk, calibrationError, activeSkills,
    prospective, online, retrospective, infrastructure
  );

  // v28: Enrich with transition and alignment info
  if (reasoningMode.shouldEscalate) {
    reflectionChain.push(`[TRANSIÇÃO] ⚡ S1→S2: H=${(reasoningMode.shannonEntropy * 100).toFixed(0)}%, KL=${(reasoningMode.klDivergence * 100).toFixed(0)}%`);
  }
  if (hallucinationSnapshot.contradictionDetected) {
    reflectionChain.push(`[SNAPSHOT] ⚠️ Contradição: confiança ${(hallucinationSnapshot.confidenceAtDecision * 100).toFixed(0)}% vs entropia ${(hallucinationSnapshot.entropyAtDecision * 100).toFixed(0)}%`);
  }
  if (alignmentAudit.flags.length > 0) {
    reflectionChain.push(`[ALINHAMENTO] 🔍 ${alignmentAudit.flags.join(", ")}`);
  }

  // v29: Quantum cognition enrichment
  if (!quantumCognition.superposition.collapsed) {
    reflectionChain.push(`[QUÂNTICO] 🌊 Superposição ativa: ${quantumCognition.superposition.superpositionCardinality} hipóteses coexistindo`);
  } else {
    reflectionChain.push(`[QUÂNTICO] ⚛️ Colapso: "${quantumCognition.superposition.collapsedChoice}" (P=${(quantumCognition.superposition.collapseProbability * 100).toFixed(0)}%)`);
  }
  if (quantumCognition.interference.interferenceMagnitude > 0.3) {
    reflectionChain.push(`[INTERFERÊNCIA] 🔀 ${quantumCognition.interference.constructivePathways.length} construtivas, ${quantumCognition.interference.destructivePathways.length} destrutivas`);
  }
  if (quantumCognition.entanglement.bellInequality > 2.4) {
    reflectionChain.push(`[ENTRELAÇAMENTO] 🔗 Bell=${quantumCognition.entanglement.bellInequality.toFixed(2)} — correlações não-clássicas entre ${quantumCognition.entanglement.entangledPairs.length} pares`);
  }
  if (quantumCognition.contextCollapse.observerEffectDetected) {
    reflectionChain.push(`[COLAPSO] 👁️ Efeito observador: ganho informacional ${(quantumCognition.contextCollapse.informationGain * 100).toFixed(0)}%`);
  }
  if (quantumCognition.contextCollapse.zenoEffectActive) {
    reflectionChain.push(`[ZENO] ⏸️ Efeito Zeno ativo — observação repetida congelando evolução`);
  }
  if (quantumCognition.ambiguityTolerance.activeContradictions > 0) {
    reflectionChain.push(`[AMBIGUIDADE] ☯️ ${quantumCognition.ambiguityTolerance.activeContradictions} contradições mantidas (estratégia: ${quantumCognition.ambiguityTolerance.resolutionStrategy})`);
  }
  reflectionChain.push(`[ORCH-OR] 🧬 Redução objetiva: ${(quantumCognition.orchestratedReductionScore * 100).toFixed(0)}% | Coerência: ${quantumCognition.cognitiveCoherenceTimeMs}ms`);

  return {
    uncertaintyScore,
    hallucinationRisk,
    calibrationError,
    activeSkills,
    reflectionChain,
    adaptivePlanScore: adaptiveAction.score,
    adaptiveAction,
    quantumMetrics,
    riskLevel,
    reasoningMode,
    hallucinationSnapshot,
    alignmentAudit,
    prospective,
    online,
    regulation,
    retrospective,
    infrastructure,
    quantumCognition,
  };
}
