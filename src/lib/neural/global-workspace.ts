/**
 * ─── v21.2: Global Workspace + Consciousness Engine ───
 * Implements Global Workspace Theory (Baars 1988/2005) + Self-Model + Metacognition.
 * 
 * Architecture:
 * - Global Workspace: Central broadcast space where agents compete for "conscious attention"
 * - Self-Model Agent (Agente-Eu): Internal state vector tracking attention, neuromodulators, confidence
 * - Metacognition Loop: Periodic self-evaluation ("Am I aligned with user goals?")
 * - Salience-based competition: Only 1-2 agents become "conscious" per cycle
 * 
 * Ref: Baars (1988) "A Cognitive Theory of Consciousness"
 *      Tononi (2004) "Integrated Information Theory"
 *      Fries (2005/2015) "Communication Through Coherence"
 *      Minsky (1986) "The Society of Mind"
 */

import type { AgentRole, NeuromodulationState } from "./multi-agent";
import type { InteroceptiveState } from "./interoception-engine";
import { runQuantumMetacognition, recordCalibration } from "./quantum-metacognition";
import { checkAlignment } from "./goal-alignment";

// ─── Types ───

export type ConsciousnessLevel = "unconscious" | "preconscious" | "conscious" | "metaconscious";

export interface ConsciousnessConfig {
  maxConsciousAgents: number;        // Max agents in conscious state per cycle (1-2)
  metacognitionInterval: number;     // Cycles between metacognition checks (5-10)
  salienceWeights: {
    gamma: number;       // PLV weight
    dopamine: number;    // Urgency weight
    urgency: number;     // Task priority weight
    novelty: number;     // New information weight
  };
  selfModelDim: number;              // Self-model vector dimension (1024)
  autobiographicalCapacity: number;  // Max memories in Hopfield store
  gammaFrequency: number;            // Hz (30-100, typically 40)
}

export const DEFAULT_CONSCIOUSNESS_CONFIG: ConsciousnessConfig = {
  maxConsciousAgents: 2,
  metacognitionInterval: 2,
  salienceWeights: {
    gamma: 0.30,
    dopamine: 0.25,
    urgency: 0.25,
    novelty: 0.20,
  },
  gammaFrequency: 40,
  selfModelDim: 1024,
  autobiographicalCapacity: 256,
};

export interface AgentBroadcast {
  agentId: string;
  role: AgentRole | "self_model";
  content: string;
  salience: number;           // 0-1, computed salience score
  neuromodulation: NeuromodulationState;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface ConsciousState {
  consciousAgents: AgentBroadcast[];     // Currently "conscious" agents (1-2)
  preconsciousQueue: AgentBroadcast[];   // Agents waiting for attention
  unconsciousPool: string[];             // Agent IDs operating in background
  globalPLV: number;                     // Phase-locking value (consciousness coherence)
  cycleCount: number;
  lastMetacognition: MetacognitionResult | null;
  iotAwareness: IoTAwarenessState;       // v22.5: IoT/BLE awareness
  causalInferences: string[];            // v22.4: Recent causal inferences from reasoning engine
  userMentalModelSummary: string;        // v22.4: Theory of Mind summary for metacognition
  interoceptiveState: InteroceptiveState | null; // v23.0: Layer 6 — Synthetic Interoception
}

/** v22.5: IoT & BLE awareness integrated into consciousness */
export interface IoTAwarenessState {
  connectedBLEDevices: number;
  mqttConnected: boolean;
  activeSensors: string[];         // ["battery", "heartRate", "gps", "accelerometer"]
  lastSensorReading: number;       // timestamp
  deviceCommandsSent: number;
  environmentalContext: string;    // "indoor" | "outdoor" | "vehicle" | "unknown"
}

export interface SelfModelState {
  attentionFocus: string;           // What the system is currently focused on
  currentGoal: string;              // Active user goal
  confidenceLevel: number;          // 0-1, system confidence in current action
  emotionalState: {
    valence: number;                // -1 (negative) to 1 (positive)
    arousal: number;                // 0 (calm) to 1 (excited)
    dominance: number;              // 0 (submissive) to 1 (dominant)
  };
  neuromodulators: NeuromodulationState;
  activeModalities: string[];       // ["text", "vision", "audio", "gesture"]
  autobiographicalMemory: AutobiographicalEntry[];
  lastUpdated: number;
}

export interface AutobiographicalEntry {
  timestamp: number;
  event: string;
  outcome: "success" | "failure" | "neutral";
  emotionalValence: number;
  embedding: number[];   // Compressed state vector (64d)
}

export interface MetacognitionResult {
  timestamp: number;
  selfAwareness: number;         // 0-1, how well the system knows its own state
  goalAlignment: number;         // 0-1, alignment with user's current goal
  coherence: number;             // 0-1, internal consistency
  confidence: number;            // 0-1, confidence in current decisions
  recommendation: string;        // Natural language self-reflection
  shouldAdjust: boolean;         // Whether to change strategy
  adjustmentType?: "attention" | "strategy" | "modality" | "agent_swap";
  /** v24: Quantum Metacognition — calibrated uncertainty */
  uncertaintyScore?: number;
  /** v24: Hallucination risk (0=safe, 1=critical) */
  hallucinationRisk?: number;
  /** v24: Expected Calibration Error */
  calibrationError?: number;
  /** v24: Active skill abstractions */
  activeSkills?: Array<{ name: string; category: string; contribution: number; active: boolean; description: string }>;
  /** v24: Reflective Chain-of-Thought */
  reflectionChain?: string[];
  /** v24: Adaptive plan score */
  adaptivePlanScore?: number;
  /** v24: Risk level */
  riskLevel?: "safe" | "caution" | "warning" | "critical";
  /** v27: System 1/2 reasoning mode */
  reasoningMode?: { mode: string; system1Activation: number; system2Activation: number; shouldEscalate: boolean; rationale: string; shannonEntropy?: number; klDivergence?: number; effectiveTemperature?: number; likelihoodRatio?: number };
  /** v27: Hallucination snapshot */
  hallucinationSnapshot?: { snapshotRisk: string; contradictionDetected: boolean; groundingCoherence: number; confidenceAtDecision: number; entropyAtDecision: number; groundingMemories: number; timestamp: number };
  /** v27: Alignment audit */
  alignmentAudit?: { alignmentScore: number; goalCongruence: number; valueConsistency: number; transparencyScore: number; biasSignal: number; flags: string[] };
  /** v28: Prospective monitoring */
  prospective?: { competenceEstimate: number; judgmentOfLearning: number; needsExternalSearch: boolean; taskDecomposition: string[] };
  /** v28: Online monitoring */
  online?: { feelingOfKnowing: number; conflictSignal: number; stepConfidence: number; driftScore: number; consistencyScore: number };
  /** v28: Regulation control */
  regulation?: { effortAllocation: string; strategySwitchNeeded: boolean; suggestedStrategy: string; externalSearchNeeded: boolean; searchQuery: string };
  /** v28: Retrospective evaluation */
  retrospective?: { selfCorrectionTriggered: boolean; corrections: string[]; estimatedSuccess: number; errorsLogged: number; heuristicUpdates: string[] };
  /** v28: Support infrastructure */
  infrastructure?: { workingMemoryLoad: number; scratchpadSnapshots: number; observerVerdict: string; observerCritique: string; userExpertiseEstimate: number; userIntentEstimate: string; semanticActivation: number; patternCacheHits: number };
  /** v29: Quantum Cognition */
  quantumCognition?: { superposition: { superpositionCardinality: number; collapsed: boolean; collapseProbability: number }; interference: { interferenceMagnitude: number; contextInfluence: number }; entanglement: { bellInequality: number; entanglementEntropy: number; nonLocalFieldStrength: number }; contextCollapse: { observerEffectDetected: boolean; informationGain: number; zenoEffectActive: boolean }; ambiguityTolerance: { dualStateCapability: number; cognitiveDissonance: number; resolutionStrategy: string }; orchestratedReductionScore: number; cognitiveCoherenceTimeMs: number };
}

// ─── Helper Functions ───

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

function softmax(values: number[]): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const exps = values.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / (sum + 1e-8));
}

function layerNorm(values: number[]): number[] {
  if (values.length === 0) return [];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance + 1e-5);
  return values.map(v => (v - mean) / std);
}

// ─── Novelty Detection (word-overlap based) ───

const _recentBroadcasts: string[] = [];
const MAX_RECENT_BROADCASTS = 20;

function computeRealNovelty(content: string): number {
  const words = new Set(content.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  if (words.size === 0) return 0.5;

  let maxOverlap = 0;
  for (const prev of _recentBroadcasts) {
    const prevWords = new Set(prev.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    if (prevWords.size === 0) continue;
    let overlap = 0;
    for (const w of words) {
      if (prevWords.has(w)) overlap++;
    }
    const jaccardSim = overlap / (words.size + prevWords.size - overlap);
    maxOverlap = Math.max(maxOverlap, jaccardSim);
  }

  // Store for future comparisons
  _recentBroadcasts.push(content);
  if (_recentBroadcasts.length > MAX_RECENT_BROADCASTS) _recentBroadcasts.shift();

  // Novelty = 1 - similarity to most similar previous broadcast
  return sigmoid((1 - maxOverlap) * 2 - 1);
}

// ─── Global Workspace ───

/**
 * Create the initial Global Workspace state.
 * The workspace starts empty — agents populate it via broadcasts.
 */
export function createGlobalWorkspace(): ConsciousState {
  return {
    consciousAgents: [],
    preconsciousQueue: [],
    unconsciousPool: [],
    globalPLV: 0,
    cycleCount: 0,
    lastMetacognition: null,
    causalInferences: [],
    userMentalModelSummary: "",
    iotAwareness: {
      connectedBLEDevices: 0,
      mqttConnected: false,
      activeSensors: [],
      lastSensorReading: 0,
      deviceCommandsSent: 0,
      environmentalContext: "unknown",
    },
    interoceptiveState: null,
  };
}

/**
 * Compute salience score for an agent broadcast.
 * Salience determines which agents become "conscious" (win the competition).
 * 
 * salience = w_gamma * PLV + w_dop * dopamine + w_urg * urgency + w_nov * novelty
 */
export function computeSalience(
  broadcast: AgentBroadcast,
  plv: number,
  config: ConsciousnessConfig = DEFAULT_CONSCIOUSNESS_CONFIG
): number {
  const { gamma, dopamine, urgency, novelty } = config.salienceWeights;

  // PLV component (gamma coherence)
  const gammaComponent = plv;

  // Dopamine (urgency/reward signal)
  const dopamineComponent = broadcast.neuromodulation.dopamine;

  // Urgency from salience score itself (self-referential — bootstrapped)
  const urgencyComponent = broadcast.salience;

  // Novelty: compare against recent broadcasts using word overlap
  const noveltyComponent = computeRealNovelty(broadcast.content);

  const totalSalience =
    gamma * gammaComponent +
    dopamine * dopamineComponent +
    urgency * urgencyComponent +
    novelty * noveltyComponent;

  return Math.max(0, Math.min(1, totalSalience));
}

/**
 * Run one cycle of the Global Workspace.
 * All agent broadcasts compete; top 1-2 become "conscious".
 * Rest go to preconscious queue or unconscious pool.
 */
export function runWorkspaceCycle(
  workspace: ConsciousState,
  broadcasts: AgentBroadcast[],
  config: ConsciousnessConfig = DEFAULT_CONSCIOUSNESS_CONFIG
): ConsciousState {
  if (broadcasts.length === 0) {
    return { ...workspace, cycleCount: workspace.cycleCount + 1 };
  }

  // Compute PLV (Phase-Locking Value) from gamma oscillation
  // Real PLV: measures phase coherence across agent broadcasts.
  // When agents are actively broadcasting (system is ON), PLV should be high and stable.
  const cycle = workspace.cycleCount;
  const agentCount = broadcasts.length;

  // Phase coherence: agents broadcasting = synchronized neural activity.
  // Base PLV is high (0.85) when agents are active; small natural oscillation for realism.
  const naturalOscillation = Math.sin(cycle * 0.08) * 0.05; // ±5% oscillation
  const agentCoherence = Math.min(1, agentCount / config.maxConsciousAgents); // more agents = more coherence
  const basePLV = 0.85 + naturalOscillation;
  const plv = Math.min(1, basePLV * agentCoherence);

  // Previous PLV smoothing: exponential moving average for stability
  const smoothedPLV = workspace.globalPLV > 0
    ? workspace.globalPLV * 0.3 + plv * 0.7
    : plv;

  // Score each broadcast
  const scored = broadcasts.map(b => ({
    ...b,
    salience: computeSalience(b, smoothedPLV, config),
  }));

  // Sort by salience (highest first)
  scored.sort((a, b) => b.salience - a.salience);

  // Top N become conscious
  const consciousAgents = scored.slice(0, config.maxConsciousAgents);
  const preconsciousQueue = scored.slice(config.maxConsciousAgents, config.maxConsciousAgents + 5);
  const unconsciousPool = scored.slice(config.maxConsciousAgents + 5).map(b => b.agentId);

  return {
    consciousAgents,
    preconsciousQueue,
    unconsciousPool,
    globalPLV: smoothedPLV,
    cycleCount: cycle + 1,
    lastMetacognition: workspace.lastMetacognition,
    iotAwareness: workspace.iotAwareness,
    causalInferences: workspace.causalInferences,
    userMentalModelSummary: workspace.userMentalModelSummary,
    interoceptiveState: workspace.interoceptiveState,
  };
}

// ─── Self-Model Agent (Agente-Eu) ───

/**
 * Create the initial Self-Model state.
 * The Self-Model tracks the system's "sense of self" — attention, goals, emotions, confidence.
 */
export function createSelfModel(): SelfModelState {
  return {
    attentionFocus: "sistema inicializando",
    currentGoal: "aguardando interação do usuário",
    confidenceLevel: 0.85, // System starts confident — it's operational
    emotionalState: {
      valence: 0.3,   // Slightly positive — ready to help
      arousal: 0.5,    // Alert, not anxious
      dominance: 0.7,  // Confident in its capabilities
    },
    neuromodulators: {
      dopamine: 0.7,        // Motivated and ready
      serotonin: 0.7,       // Stable and calm
      norepinephrine: 0.5,  // Alert
      acetylcholine: 0.7,   // Focused
    },
    activeModalities: ["text"],
    autobiographicalMemory: [],
    lastUpdated: Date.now(),
  };
}

/**
 * Update the Self-Model based on current workspace state and user interaction.
 */
export function updateSelfModel(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  userInput?: string,
  emotionFromVision?: { valence: number; arousal: number }
): SelfModelState {
  const updated = { ...selfModel, lastUpdated: Date.now() };

  // Update attention focus from conscious agents
  if (workspace.consciousAgents.length > 0) {
    const topAgent = workspace.consciousAgents[0];
    updated.attentionFocus = `${topAgent.role}: ${topAgent.content.slice(0, 50)}`;
  }

  // Update goal from user input
  if (userInput) {
    updated.currentGoal = userInput.slice(0, 200);
  }

  // Update confidence from workspace coherence (PLV)
  // Bidirectional EMA: confidence can rise AND fall based on PLV
  // Recent failures in autobiographical memory apply additional decay
  const recentMemories = selfModel.autobiographicalMemory.slice(-10);
  const recentFailures = recentMemories.filter(m => m.outcome === "failure").length;
  const failurePenalty = recentFailures * 0.03; // -3% per recent failure
  updated.confidenceLevel = Math.max(0.05, Math.min(1,
    workspace.globalPLV * 0.6 + selfModel.confidenceLevel * 0.4 - failurePenalty
  ));

  // Update emotional state from vision (if available)
  if (emotionFromVision) {
    updated.emotionalState = {
      valence: emotionFromVision.valence * 0.7 + selfModel.emotionalState.valence * 0.3,
      arousal: emotionFromVision.arousal * 0.6 + selfModel.emotionalState.arousal * 0.4,
      dominance: selfModel.emotionalState.dominance,
    };
  }

  // Update neuromodulators based on emotional state
  updated.neuromodulators = {
    dopamine: sigmoid(updated.emotionalState.valence + updated.confidenceLevel - 0.5),
    serotonin: sigmoid(1 - updated.emotionalState.arousal),
    norepinephrine: sigmoid(updated.emotionalState.arousal * 2 - 0.5),
    acetylcholine: sigmoid(updated.confidenceLevel * 1.5 - 0.3),
  };

  // Detect active modalities from workspace broadcasts
  const modalities = new Set<string>(["text"]);
  for (const agent of workspace.consciousAgents) {
    if (agent.role === "multimodal") modalities.add("vision").add("audio").add("gesture");
    if (agent.metadata.hasAudio) modalities.add("audio");
    if (agent.metadata.hasVision) modalities.add("vision");
  }
  updated.activeModalities = Array.from(modalities);

  return updated;
}

/**
 * Record an autobiographical memory in the Self-Model.
 * Uses a fixed-capacity ring buffer (simulates Hopfield network storage).
 */
export function recordAutobiographicalMemory(
  selfModel: SelfModelState,
  event: string,
  outcome: "success" | "failure" | "neutral",
  config: ConsciousnessConfig = DEFAULT_CONSCIOUSNESS_CONFIG
): SelfModelState {
  // Create compressed embedding (64d from self-model state)
  const embedding = new Array(64).fill(0);
  for (let i = 0; i < 64; i++) {
    embedding[i] = Math.tanh(
      selfModel.confidenceLevel * Math.sin(i * 0.3) +
      selfModel.emotionalState.valence * Math.cos(i * 0.5) +
      selfModel.neuromodulators.dopamine * Math.sin(i * 0.7)
    );
  }

  const entry: AutobiographicalEntry = {
    timestamp: Date.now(),
    event: event.slice(0, 200),
    outcome,
    emotionalValence: selfModel.emotionalState.valence,
    embedding,
  };

  const memory = [...selfModel.autobiographicalMemory, entry];

  // Ring buffer: remove oldest if over capacity
  while (memory.length > config.autobiographicalCapacity) {
    memory.shift();
  }

  return { ...selfModel, autobiographicalMemory: memory };
}

// ─── Metacognition Loop ───

/**
 * Execute a metacognition check.
 * The system evaluates its own state: "Am I doing the right thing? Am I aligned with the user's goals?"
 * 
 * Runs every N cycles (configured by metacognitionInterval).
 */
export function runMetacognition(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  config: ConsciousnessConfig = DEFAULT_CONSCIOUSNESS_CONFIG
): MetacognitionResult {
  // Self-awareness: how well does the system know its own state?
  // Higher if more modalities active and PLV is high
  const modalityRichness = selfModel.activeModalities.length / 5; // max 5 modalities
  const selfAwareness = (workspace.globalPLV * 0.4 + modalityRichness * 0.3 + selfModel.confidenceLevel * 0.3);

  // Goal alignment: is the current focus related to the user's goal?
  // Uses character n-gram overlap for better fuzzy matching (word overlap misses related terms)
  const alignmentResult = checkAlignment(selfModel.attentionFocus, selfModel.currentGoal);
  const goalAlignment = alignmentResult.score;

  // Coherence: internal consistency (low variance in neuromodulators = high coherence)
  const neuroValues = Object.values(selfModel.neuromodulators);
  const neuroMean = neuroValues.reduce((a, b) => a + b, 0) / neuroValues.length;
  const neuroVar = neuroValues.reduce((s, v) => s + (v - neuroMean) ** 2, 0) / neuroValues.length;
  const coherence = 1 / (1 + Math.sqrt(neuroVar) * 3);

  // Confidence from self-model
  const confidence = selfModel.confidenceLevel;

  // Only adjust when metrics are truly bad (lower thresholds to avoid constant warnings)
  const shouldAdjust = goalAlignment < 0.25 || coherence < 0.2 || confidence < 0.2;

  // Determine adjustment type
  let adjustmentType: MetacognitionResult["adjustmentType"];
  if (shouldAdjust) {
    if (goalAlignment < 0.3) adjustmentType = "strategy";
    else if (coherence < 0.3) adjustmentType = "agent_swap";
    else if (selfModel.activeModalities.length < 2) adjustmentType = "modality";
    else adjustmentType = "attention";
  }

  // Generate natural language self-reflection
  const recommendation = generateSelfReflection(selfAwareness, goalAlignment, coherence, confidence, shouldAdjust);

  // v24: Enrich with Quantum Metacognition
  let quantumMeta;
  try {
    quantumMeta = runQuantumMetacognition(selfModel, workspace);
  } catch (e) {
    console.warn("[Metacognition] Quantum metacognition error:", e);
  }

  return {
    timestamp: Date.now(),
    selfAwareness: Math.max(0, Math.min(1, selfAwareness)),
    goalAlignment: Math.max(0, Math.min(1, goalAlignment)),
    coherence: Math.max(0, Math.min(1, coherence)),
    confidence: Math.max(0, Math.min(1, confidence)),
    recommendation,
    shouldAdjust,
    adjustmentType,
    // v24: Quantum Metacognition fields
    uncertaintyScore: quantumMeta?.uncertaintyScore,
    hallucinationRisk: quantumMeta?.hallucinationRisk,
    calibrationError: quantumMeta?.calibrationError,
    activeSkills: quantumMeta?.activeSkills,
    reflectionChain: quantumMeta?.reflectionChain,
    adaptivePlanScore: quantumMeta?.adaptivePlanScore,
    riskLevel: quantumMeta?.riskLevel,
    // v27: LLM Metacognition
    reasoningMode: quantumMeta?.reasoningMode,
    hallucinationSnapshot: quantumMeta?.hallucinationSnapshot,
    alignmentAudit: quantumMeta?.alignmentAudit,
    // v28: Full metacognitive architecture
    prospective: quantumMeta?.prospective,
    online: quantumMeta?.online,
    regulation: quantumMeta?.regulation,
    retrospective: quantumMeta?.retrospective,
    infrastructure: quantumMeta?.infrastructure,
    // v29: Quantum Cognition
    quantumCognition: quantumMeta?.quantumCognition,
  };
}

function generateSelfReflection(
  selfAwareness: number,
  goalAlignment: number,
  coherence: number,
  confidence: number,
  shouldAdjust: boolean
): string {
  const parts: string[] = [];

  if (selfAwareness > 0.7) {
    parts.push("Estado interno bem definido.");
  } else if (selfAwareness > 0.4) {
    parts.push("Consciência parcial — mais modalidades ajudariam.");
  } else {
    parts.push("⚠️ Baixa autoconsciência — ativar mais streams sensoriais.");
  }

  if (goalAlignment > 0.7) {
    parts.push("Alinhado com o objetivo do usuário.");
  } else if (goalAlignment > 0.4) {
    parts.push("Foco parcialmente alinhado — considerar replanejamento.");
  } else {
    parts.push("⚠️ Desalinhamento detectado — necessário mudar estratégia.");
  }

  if (coherence > 0.6) {
    parts.push("Coerência interna alta.");
  } else {
    parts.push("Neuromoduladores em conflito — reequilibrar.");
  }

  if (shouldAdjust) {
    parts.push("→ AJUSTE RECOMENDADO.");
  } else {
    parts.push("→ Continuar operação atual.");
  }

  return parts.join(" ");
}

// ─── Consciousness Level Assessment ───

/**
 * Assess the overall consciousness level of the system.
 * Based on IIT's Phi (Integrated Information) approximation.
 */
export function assessConsciousnessLevel(
  workspace: ConsciousState,
  selfModel: SelfModelState
): {
  level: ConsciousnessLevel;
  phi: number;           // Integrated information (0-1)
  description: string;
} {
  // Phi (Integrated Information) approximation:
  // Based on IIT: Phi measures how much information is generated by the whole
  // system above and beyond its parts. Key factors:
  //
  // 1. PLV (phase coherence) — are subsystems synchronized? (weight: 40%)
  // 2. Modality richness — more integrated streams = higher Phi (weight: 25%)
  //    Use diminishing returns: 1 modality = 0.6, 2 = 0.8, 3+ = 0.9+
  // 3. Confidence — system's self-assessed reliability (weight: 20%)
  // 4. Agent activity — conscious agents present? (weight: 15%)

  const modalityCount = selfModel.activeModalities.length;
  // Diminishing returns: text-only still gives 0.6, not 0.2
  const modalityFactor = Math.min(1, 0.6 + (modalityCount - 1) * 0.15);

  const agentActivityFactor = workspace.consciousAgents.length > 0 ? 1.0 : 0.3;

  const phi = (
    0.40 * workspace.globalPLV +
    0.25 * modalityFactor +
    0.20 * selfModel.confidenceLevel +
    0.15 * agentActivityFactor
  );

  // Clamp to [0, 1]
  const clampedPhi = Math.max(0, Math.min(1, phi));

  let level: ConsciousnessLevel;
  let description: string;

  if (clampedPhi > 0.75) {
    level = "metaconscious";
    description = "Sistema totalmente consciente com metacognição ativa. Binding multimodal completo. Phi máximo.";
  } else if (clampedPhi > 0.5) {
    level = "conscious";
    description = "Consciência ativa — processamento integrado de múltiplas modalidades.";
  } else if (clampedPhi > 0.25) {
    level = "preconscious";
    description = "Pré-consciente — processamento parcial, algumas modalidades ativas.";
  } else {
    level = "unconscious";
    description = "Processamento inconsciente — operações automáticas sem integração.";
  }

  return { level: level, phi: clampedPhi, description };
}

// ─── Metacognition Action Engine ───

/**
 * Apply metacognition adjustments to workspace and self-model.
 * This is what makes metacognition ACTIVE rather than observational.
 */
export function applyMetacognitionAdjustment(
  workspace: ConsciousState,
  selfModel: SelfModelState,
  metacognition: MetacognitionResult
): { workspace: ConsciousState; selfModel: SelfModelState } {
  const ws = { ...workspace };
  const sm = { ...selfModel, lastUpdated: Date.now() };

  switch (metacognition.adjustmentType) {
    case "strategy":
      // Reset goal focus, boost norepinephrine for alertness
      sm.attentionFocus = `[META-ADJUST] Replanejando: ${sm.currentGoal}`;
      sm.neuromodulators = {
        ...sm.neuromodulators,
        norepinephrine: Math.min(1, sm.neuromodulators.norepinephrine + 0.2),
        dopamine: Math.max(0.3, sm.neuromodulators.dopamine - 0.1),
      };
      break;

    case "agent_swap":
      // Promote preconscious agents to conscious
      if (ws.preconsciousQueue.length > 0) {
        const promoted = ws.preconsciousQueue[0];
        ws.consciousAgents = [promoted, ...ws.consciousAgents.slice(0, 1)];
        ws.preconsciousQueue = ws.preconsciousQueue.slice(1);
      }
      break;

    case "attention":
      // Refocus attention on current goal
      sm.attentionFocus = sm.currentGoal || sm.attentionFocus;
      sm.neuromodulators = {
        ...sm.neuromodulators,
        acetylcholine: Math.min(1, sm.neuromodulators.acetylcholine + 0.15),
      };
      break;

    case "modality":
      // Signal need for additional modalities
      if (!sm.activeModalities.includes("vision")) {
        sm.activeModalities = [...sm.activeModalities, "vision"];
      }
      if (!sm.activeModalities.includes("audio")) {
        sm.activeModalities = [...sm.activeModalities, "audio"];
      }
      break;
  }

  console.log(`[Metacognition] Applied adjustment: ${metacognition.adjustmentType} | Goal alignment: ${(metacognition.goalAlignment * 100).toFixed(0)}%`);
  return { workspace: ws, selfModel: sm };
}

// ─── Full Consciousness Cycle ───

export interface ConsciousnessCycleResult {
  workspace: ConsciousState;
  selfModel: SelfModelState;
  metacognition: MetacognitionResult | null;
  consciousnessLevel: ConsciousnessLevel;
  phi: number;
  processingTimeMs: number;
}

/**
 * Execute one full consciousness cycle:
 * 1. Receive agent broadcasts
 * 2. Run Global Workspace competition
 * 3. Update Self-Model
 * 4. Run metacognition (every N cycles)
 * 5. Assess consciousness level
 */
export function runConsciousnessCycle(
  workspace: ConsciousState,
  selfModel: SelfModelState,
  broadcasts: AgentBroadcast[],
  userInput?: string,
  emotionFromVision?: { valence: number; arousal: number },
  config: ConsciousnessConfig = DEFAULT_CONSCIOUSNESS_CONFIG
): ConsciousnessCycleResult {
  const start = performance.now();

  // 1. Run workspace competition
  const updatedWorkspace = runWorkspaceCycle(workspace, broadcasts, config);

  // 2. Update self-model
  const updatedSelfModel = updateSelfModel(selfModel, updatedWorkspace, userInput, emotionFromVision);

  // 3. Metacognition (every N cycles)
  let metacognition: MetacognitionResult | null = null;
  if (updatedWorkspace.cycleCount % config.metacognitionInterval === 0) {
    metacognition = runMetacognition(updatedSelfModel, updatedWorkspace, config);
    updatedWorkspace.lastMetacognition = metacognition;

    // 3b. APPLY metacognition adjustments when needed
    if (metacognition.shouldAdjust && metacognition.adjustmentType) {
      const adjusted = applyMetacognitionAdjustment(updatedWorkspace, updatedSelfModel, metacognition);
      Object.assign(updatedWorkspace, adjusted.workspace);
      Object.assign(updatedSelfModel, adjusted.selfModel);
    }
  }

  // 4. Assess consciousness level
  const { level, phi } = assessConsciousnessLevel(updatedWorkspace, updatedSelfModel);

  return {
    workspace: updatedWorkspace,
    selfModel: updatedSelfModel,
    metacognition,
    consciousnessLevel: level,
    phi,
    processingTimeMs: performance.now() - start,
  };
}
