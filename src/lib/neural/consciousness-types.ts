export type ConsciousnessLevel = "unconscious" | "preconscious" | "conscious" | "metaconscious";

export interface ConsciousnessConfig {
  maxConsciousAgents: number;
  metacognitionInterval: number;
  salienceWeights: {
    gamma: number;
    dopamine: number;
    urgency: number;
    novelty: number;
  };
  selfModelDim: number;
  autobiographicalCapacity: number;
  gammaFrequency: number;
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
  role: string; // Simplified from AgentRole to avoid complex imports
  content: string;
  salience: number;
  neuromodulation: {
    dopamine: number;
    serotonin: number;
    norepinephrine: number;
    acetylcholine: number;
  };
  timestamp: number;
  metadata: Record<string, unknown>;
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
  uncertaintyScore?: number;
  hallucinationRisk?: number;
  calibrationError?: number;
  activeSkills?: any[];
  reflectionChain?: string[];
  adaptivePlanScore?: number;
  riskLevel?: "safe" | "caution" | "warning" | "critical";
  reasoningMode?: any;
  hallucinationSnapshot?: any;
  alignmentAudit?: any;
  prospective?: any;
  online?: any;
  regulation?: any;
  retrospective?: any;
  infrastructure?: any;
  quantumCognition?: any;
}

export interface ConsciousState {
  consciousAgents: AgentBroadcast[];
  preconsciousQueue: AgentBroadcast[];
  unconsciousPool: string[];
  globalPLV: number;
  cycleCount: number;
  lastMetacognition: MetacognitionResult | null;
  iotAwareness: any;
  causalInferences: string[];
  userMentalModelSummary: string;
  interoceptiveState: any;
}

export interface SelfModelState {
  attentionFocus: string;
  currentGoal: string;
  confidenceLevel: number;
  emotionalState: {
    valence: number;
    arousal: number;
    dominance: number;
  };
  neuromodulators: {
    dopamine: number;
    serotonin: number;
    norepinephrine: number;
    acetylcholine: number;
  };
  activeModalities: string[];
  autobiographicalMemory: any[];
  lastUpdated: number;
}
