/**
 * ─── v21.2: Global Workspace + Consciousness Engine ───
 */

import { runQuantumMetacognition, recordCalibration } from "./quantum-metacognition";
import {
  type ConsciousnessLevel,
  type ConsciousnessConfig,
  type AgentBroadcast,
  type ConsciousState,
  type IoTAwarenessState,
  type SelfModelState,
  type AutobiographicalEntry,
  type MetacognitionResult,
  type ConsciousnessCycleResult
} from "./workspace-types";

export type {
  ConsciousnessLevel,
  ConsciousnessConfig,
  AgentBroadcast,
  ConsciousState,
  IoTAwarenessState,
  SelfModelState,
  AutobiographicalEntry,
  MetacognitionResult,
  ConsciousnessCycleResult
};

// ─── Constants ───

export const DEFAULT_CONSCIOUSNESS_CONFIG: ConsciousnessConfig = {
  maxConsciousAgents: 2,
  metacognitionInterval: 5,
  salienceWeights: {
    gamma: 0.4,
    dopamine: 0.4,
    persistence: 0.2
  }
};

// ─── Initializers ───

export function createGlobalWorkspace(): ConsciousState {
  return {
    level: "unconscious",
    activeAgents: [],
    broadcasts: [],
    timestamp: Date.now(),
    cycleCount: 0,
    globalPLV: 0.5,
    preconsciousQueue: [],
    consciousAgents: [],
    lastMetacognition: null,
  };
}

export function createSelfModel(): SelfModelState {
  return {
    identity: "ORION",
    attentionFocus: [],
    neuromodulators: {
      dopamine: 0.5,
      serotonin: 0.5,
      norepinephrine: 0.5,
      acetylcholine: 0.5,
    },
    interoception: {
      heartRate: 70,
      stressLevel: 0.2,
      batteryLevel: 0.9,
      temperature: 36.5,
      timestamp: Date.now(),
    },
    confidence: 0.8,
    confidenceLevel: 0.8,
    lastUpdate: Date.now(),
    lastUpdated: Date.now(),
    currentGoal: "Assist user",
    activeModalities: ["text"],
    emotionalState: {
      valence: 0.5,
      arousal: 0.5,
    },
  };
}

// ─── Helper Functions ───

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
}

// ─── Global State ───
let _workspace = createGlobalWorkspace();
let _selfModel = createSelfModel();

// ─── Core Functions ───

export function broadcastToWorkspace(broadcast: AgentBroadcast) {
  _workspace.broadcasts.push(broadcast);
  if (_workspace.broadcasts.length > 50) _workspace.broadcasts.shift();
}

export function updateSelfModel(update: Partial<SelfModelState>) {
  _selfModel = { ..._selfModel, ...update, lastUpdate: Date.now(), lastUpdated: Date.now() };
}

export function recordAutobiographicalMemory(event: string, significance: number): void {
  console.log("[GlobalWorkspace] Recorded event:", event, significance);
}

export function runMetacognition(
  selfModel: SelfModelState,
  workspace: ConsciousState,
  config: ConsciousnessConfig = DEFAULT_CONSCIOUSNESS_CONFIG
): MetacognitionResult {
  const neuroValues = Object.values(selfModel.neuromodulators);
  const neuroMean = neuroValues.reduce((a, b) => a + b, 0) / neuroValues.length;
  const neuroVar = neuroValues.reduce((s, v) => s + (v - neuroMean) ** 2, 0) / neuroValues.length;
  const coherence = 1 / (1 + Math.sqrt(neuroVar) * 3);

  const goalAlignment = 0.8;
  const selfAwareness = 0.8;
  const confidence = selfModel.confidenceLevel;

  const shouldAdjust = goalAlignment < 0.25 || coherence < 0.2 || confidence < 0.2;

  let adjustmentType: MetacognitionResult["adjustmentType"];
  if (shouldAdjust) {
    adjustmentType = "strategy";
  }

  return {
    timestamp: Date.now(),
    selfAwareness: Math.max(0, Math.min(1, selfAwareness)),
    goalAlignment: Math.max(0, Math.min(1, goalAlignment)),
    coherence: Math.max(0, Math.min(1, coherence)),
    confidence: Math.max(0, Math.min(1, confidence)),
    recommendation: "Operação normal.",
    shouldAdjust,
    adjustmentType,
  };
}

export function assessConsciousnessLevel(
  workspace: ConsciousState,
  selfModel: SelfModelState
): {
  level: ConsciousnessLevel;
  phi: number;
  description: string;
} {
  const modalityCount = selfModel.activeModalities.length;
  const modalityFactor = Math.min(1, 0.6 + (modalityCount - 1) * 0.15);
  const agentActivityFactor = workspace.consciousAgents.length > 0 ? 1.0 : 0.3;

  const phi = (
    0.40 * workspace.globalPLV +
    0.25 * modalityFactor +
    0.20 * selfModel.confidenceLevel +
    0.15 * agentActivityFactor
  );

  const clampedPhi = Math.max(0, Math.min(1, phi));
  let level: ConsciousnessLevel = "unconscious";
  if (clampedPhi > 0.75) level = "metaconscious";
  else if (clampedPhi > 0.5) level = "conscious";
  else if (clampedPhi > 0.25) level = "preconscious";

  return { level, phi: clampedPhi, description: "Phi assessment" };
}

export function applyMetacognitionAdjustment(
  workspace: ConsciousState,
  selfModel: SelfModelState,
  metacognition: MetacognitionResult
): { workspace: ConsciousState; selfModel: SelfModelState } {
  return { workspace: { ...workspace }, selfModel: { ...selfModel, lastUpdated: Date.now() } };
}

export function runWorkspaceCycle(
  workspace: ConsciousState,
  broadcasts: AgentBroadcast[],
  config: ConsciousnessConfig
): ConsciousState {
  const updated = { ...workspace, cycleCount: workspace.cycleCount + 1 };
  const sorted = [...broadcasts].sort((a, b) => b.salience - a.salience);
  updated.consciousAgents = sorted.slice(0, config.maxConsciousAgents);
  updated.preconsciousQueue = sorted.slice(config.maxConsciousAgents);
  updated.activeAgents = updated.consciousAgents.map(a => a.agentId);
  return updated;
}

export function runConsciousnessCycle(
  workspace: ConsciousState,
  selfModel: SelfModelState,
  broadcasts: AgentBroadcast[],
  userInput?: string,
  emotionFromVision?: { valence: number; arousal: number },
  config: ConsciousnessConfig = DEFAULT_CONSCIOUSNESS_CONFIG
): ConsciousnessCycleResult {
  const start = performance.now();
  const updatedWorkspace = runWorkspaceCycle(workspace, broadcasts, config);
  const updatedSelfModel = { ...selfModel, lastUpdate: Date.now() };

  if (emotionFromVision) {
    updatedSelfModel.emotionalState = { ...emotionFromVision };
  }

  let metacognition: MetacognitionResult | null = null;
  if (updatedWorkspace.cycleCount % config.metacognitionInterval === 0) {
    metacognition = runMetacognition(updatedSelfModel, updatedWorkspace, config);
  }

  const { level, phi } = assessConsciousnessLevel(updatedWorkspace, updatedSelfModel);

  return {
    workspace: updatedWorkspace,
    selfModel: updatedSelfModel,
    metacognition,
    consciousnessLevel: level,
    phi,
    processingTimeMs: performance.now() - start,
    durationMs: performance.now() - start,
  };
}

export function getConsciousState() { return _workspace; }
export function getSelfModel() { return _selfModel; }
