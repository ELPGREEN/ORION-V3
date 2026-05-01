import type { AgentRole, NeuromodulationState } from "./multi-agent";
import type { InteroceptiveState } from "./interoception-engine";

export type ConsciousnessLevel = "unconscious" | "preconscious" | "conscious" | "metaconscious";

export interface ConsciousnessConfig {
  maxConsciousAgents: number;
  metacognitionInterval: number;
  salienceWeights: {
    gamma: number;
    dopamine: number;
    persistence: number;
  };
}

export interface AgentBroadcast {
  agentId: string;
  role: AgentRole;
  content: string;
  salience: number;
  timestamp: number;
  metadata?: Record<string, any>;
  novelty?: number;
  persistence?: number;
}

export interface ConsciousState {
  level: ConsciousnessLevel;
  activeAgents: string[];
  broadcasts: AgentBroadcast[];
  timestamp: number;
  cycleCount: number;
  globalPLV: number;
  preconsciousQueue: AgentBroadcast[];
  consciousAgents: AgentBroadcast[];
  lastMetacognition: MetacognitionResult | null;
}

export interface IoTAwarenessState {
  lastEvent?: string;
  deviceConfidence: Record<string, number>;
  activeSensors: string[];
}

export interface SelfModelState {
  identity: string;
  attentionFocus: string | string[];
  neuromodulators: NeuromodulationState;
  interoception: InteroceptiveState;
  iotAwareness?: IoTAwarenessState;
  confidence: number;
  confidenceLevel: number;
  lastUpdate: number;
  lastUpdated?: number;
  currentGoal?: string;
  activeModalities: string[];
  emotionalState: {
    valence: number;
    arousal: number;
  };
}

export interface AutobiographicalEntry {
  timestamp: number;
  event: string;
  outcome: "success" | "failure" | "neutral";
  emotionalValence: number;
  embedding: number[];
  significance?: number;
  context?: string;
}

export interface MetacognitionResult {
  timestamp: number;
  selfAwareness: number;
  goalAlignment: number;
  coherence: number;
  confidence: number;
  recommendation: string;
  shouldAdjust: boolean;
  adjustmentType?: "attention" | "strategy" | "modality" | "agent_swap";
  suggestedAction?: string;
  rationale?: string;
  uncertaintyScore?: number;
  hallucinationRisk?: number;
  calibrationError?: number;
  activeSkills?: Array<{ name: string; category: string; contribution: number; active: boolean; description: string }>;
  reflectionChain?: string[];
  adaptivePlanScore?: number;
  riskLevel?: "safe" | "caution" | "warning" | "critical";
  reasoningMode?: { mode: string; system1Activation: number; system2Activation: number; shouldEscalate: boolean; rationale: string; shannonEntropy?: number; klDivergence?: number; effectiveTemperature?: number; likelihoodRatio?: number };
  hallucinationSnapshot?: { snapshotRisk: string; contradictionDetected: boolean; groundingCoherence: number; confidenceAtDecision: number; entropyAtDecision: number; groundingMemories: number; timestamp: number };
  alignmentAudit?: { alignmentScore: number; goalCongruence: number; valueConsistency: number; transparencyScore: number; biasSignal: number; flags: string[] };
  prospective?: { competenceEstimate: number; judgmentOfLearning: number; needsExternalSearch: boolean; taskDecomposition: string[] };
  online?: { feelingOfKnowing: number; conflictSignal: number; stepConfidence: number; driftScore: number; consistencyScore: number };
  regulation?: { effortAllocation: string; strategySwitchNeeded: boolean; suggestedStrategy: string; externalSearchNeeded: boolean; searchQuery: string };
  retrospective?: { selfCorrectionTriggered: boolean; corrections: string[]; estimatedSuccess: number; errorsLogged: number; heuristicUpdates: string[] };
  infrastructure?: { workingMemoryLoad: number; scratchpadSnapshots: number; observerVerdict: string; observerCritique: string; userExpertiseEstimate: number; userIntentEstimate: string; semanticActivation: number; patternCacheHits: number };
  quantumCognition?: { superposition: { superpositionCardinality: number; collapsed: boolean; collapseProbability: number }; interference: { interferenceMagnitude: number; contextInfluence: number }; entanglement: { bellInequality: number; entanglementEntropy: number; nonLocalFieldStrength: number }; contextCollapse: { observerEffectDetected: boolean; informationGain: number; zenoEffectActive: boolean }; ambiguityTolerance: { dualStateCapability: number; cognitiveDissonance: number; resolutionStrategy: string }; orchestratedReductionScore: number; cognitiveCoherenceTimeMs: number };
}

export interface ConsciousnessCycleResult {
  workspace: ConsciousState;
  selfModel: SelfModelState;
  metacognition: MetacognitionResult | null;
  consciousnessLevel: ConsciousnessLevel;
  phi: number;
  processingTimeMs: number;
  durationMs?: number;
}
