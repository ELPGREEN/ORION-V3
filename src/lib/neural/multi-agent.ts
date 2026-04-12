/**
 * ─── v21.5: Multi-Agent Society (Society of Mind) + STDP ───
 * 10 specialized agents as "cortical columns" with temporal
 * co-activation learning via STDP binding.
 * 
 * Ref: Minsky (1986) Society of Mind, Bi & Poo (1998) STDP
 */

import { detectHallucinations } from "../analysis/hallucinationDetector";
import { checkResponseQuality } from "../analysis/responseQualityChecker";

import {
  initBindingState,
  registerEvent,
  getBindingSummary,
  type BindingState,
} from "./temporal-binding";
import type { SpikeEvent } from "./stdp";

export type AgentRole =
  | "leitura" | "pesquisa" | "construcao" | "planejador"
  | "supervisor" | "critico" | "refinador" | "monitoramento"
  | "colaborador" | "multimodal" | "self_model";

export type A2AMessageType =
  | "task_request" | "task_result" | "status_update"
  | "feedback" | "coordination" | "memory_share" | "priority_signal";

export type ExecutionMode = "sequential" | "parallel" | "swarm" | "dag";
export type MemoryLevel = "workspace" | "working" | "episodic" | "long_term";

export interface NeuromodulationState {
  dopamine: number;
  serotonin: number;
  norepinephrine: number;
  acetylcholine: number;
}

export interface AgentState {
  id: string;
  role: AgentRole;
  status: "idle" | "busy" | "error";
  reliabilityScore: number;
  qualityScore: number;
  neuromodulation: NeuromodulationState;
  tools: string[];
}

export interface A2AMessage {
  id: string;
  from: string;
  to: string | "*";
  type: A2AMessageType;
  payload: Record<string, unknown>;
  timestamp: number;
  priority: number;
  traceId?: string;
}

export interface SharedMemoryEntry {
  key: string;
  value: unknown;
  level: MemoryLevel;
  createdAt: number;
  accessCount: number;
}

// ─── STDP-enhanced agent coordination state ───

export interface AgentSocietyState {
  agents: AgentState[];
  binding: BindingState;
  coActivationLog: Array<{ fromRole: AgentRole; toRole: AgentRole; timestamp: number }>;
}

const ROLE_TO_NEURON: Record<AgentRole, number> = {
  leitura: 0, pesquisa: 1, construcao: 2, planejador: 3,
  supervisor: 4, critico: 5, refinador: 6, monitoramento: 7,
  colaborador: 8, multimodal: 9, self_model: 10,
};

const MEMORY_TTL: Record<MemoryLevel, number> = {
  workspace: 60_000,
  working: 300_000,
  episodic: 3_600_000,
  long_term: 86_400_000,
};

export function createDefaultAgents(): AgentState[] {
  const roles: Array<{ role: AgentRole; tools: string[] }> = [
    { role: "leitura", tools: ["read_code", "read_docs", "read_logs"] },
    { role: "pesquisa", tools: ["web_search", "legal_search", "neural_search", "kb_search"] },
    { role: "construcao", tools: ["generate_code", "generate_sql", "generate_doc", "generate_edge_fn"] },
    { role: "planejador", tools: ["decompose_task", "create_dag"] },
    { role: "supervisor", tools: ["orchestrate", "route", "merge", "escalate"] },
    { role: "critico", tools: ["verify_facts", "hallucination_check", "quality_gate"] },
    { role: "refinador", tools: ["iterate", "improve", "polish"] },
    { role: "monitoramento", tools: ["track_metrics", "detect_anomaly"] },
    { role: "colaborador", tools: ["request_human", "await_approval"] },
    { role: "multimodal", tools: ["transcribe", "clip_embed", "stdp_bind"] },
    { role: "self_model", tools: ["reflect", "metacognition", "autobiographical_memory", "emotion_update"] },
  ];

  return roles.map((r, i) => ({
    id: `agent-${r.role}-${i}`,
    role: r.role,
    status: "idle",
    reliabilityScore: 0.8,
    qualityScore: 0.7,
    neuromodulation: { dopamine: 0.5, serotonin: 0.5, norepinephrine: 0.3, acetylcholine: 0.4 },
    tools: r.tools,
  }));
}

/** Initialize society state with STDP binding for 10 agent neurons */
export function createAgentSociety(): AgentSocietyState {
  return {
    agents: createDefaultAgents(),
    binding: initBindingState(10),
    coActivationLog: [],
  };
}

/**
 * Record agent co-activation via STDP.
 * When agent A triggers agent B, this strengthens their temporal binding.
 */
export function recordAgentCoActivation(
  society: AgentSocietyState,
  fromRole: AgentRole,
  toRole: AgentRole,
  success: boolean
): AgentSocietyState {
  const now = Date.now();
  const fromNeuron = ROLE_TO_NEURON[fromRole];
  const toNeuron = ROLE_TO_NEURON[toRole];

  // Pre-synaptic spike from the triggering agent
  let binding = registerEvent(society.binding, {
    neuronId: fromNeuron,
    timestamp: now - 50,
    type: "pre",
  });

  // Post-synaptic spike on the receiving agent (reward if successful)
  binding = registerEvent(binding, {
    neuronId: toNeuron,
    timestamp: now,
    type: success ? "reward" : "post",
    dopamineLevel: success ? 1.3 : 0.4,
  });

  const updatedSociety: AgentSocietyState = {
    ...society,
    binding,
    coActivationLog: [
      ...society.coActivationLog.slice(-99),
      { fromRole, toRole, timestamp: now },
    ],
  };

  // Refresh P2P resonance links based on updated STDP weights
  try {
    const { refreshResonanceLinks } = require("./tesla-wireless-p2p");
    refreshResonanceLinks(updatedSociety);
  } catch { /* P2P module optional */ }

  return updatedSociety;
}

/**
 * Get the strongest co-activation partners for a given agent role.
 * Uses STDP-learned weights to suggest which agent to invoke next.
 */
export function getSuggestedPartners(
  society: AgentSocietyState,
  role: AgentRole,
  topK: number = 3
): Array<{ role: AgentRole; weight: number }> {
  const neuron = ROLE_TO_NEURON[role];
  const weights = society.binding.weights[neuron] || [];

  const roles = Object.entries(ROLE_TO_NEURON)
    .filter(([r]) => r !== role)
    .map(([r, n]) => ({ role: r as AgentRole, weight: weights[n] || 0 }))
    .sort((a, b) => b.weight - a.weight);

  return roles.slice(0, topK);
}

/** Get STDP binding summary for the agent society */
export function getAgentBindingSummary(society: AgentSocietyState) {
  return getBindingSummary(society.binding);
}

export function computeAgentPriority(neuro: NeuromodulationState): number {
  return (
    neuro.dopamine * 0.4 +
    neuro.norepinephrine * 0.3 +
    neuro.acetylcholine * 0.2 -
    neuro.serotonin * 0.1
  );
}

export function routeTask(
  agents: AgentState[],
  requiredRole: AgentRole,
  society?: AgentSocietyState
): AgentState | null {
  const candidates = agents.filter(a => a.role === requiredRole && a.status === "idle");
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    let scoreA = computeAgentPriority(a.neuromodulation) * 0.3 + a.reliabilityScore * 0.35 + a.qualityScore * 0.35;
    let scoreB = computeAgentPriority(b.neuromodulation) * 0.3 + b.reliabilityScore * 0.35 + b.qualityScore * 0.35;

    // Boost based on STDP binding strength if society context available
    if (society) {
      const nA = ROLE_TO_NEURON[a.role];
      const nB = ROLE_TO_NEURON[b.role];
      const avgWeightA = society.binding.weights[nA]?.reduce((s, w) => s + w, 0) || 0;
      const avgWeightB = society.binding.weights[nB]?.reduce((s, w) => s + w, 0) || 0;
      scoreA += avgWeightA * 0.05;
      scoreB += avgWeightB * 0.05;
    }

    return scoreB - scoreA;
  });

  return candidates[0];
}

export function createSharedMemory(): Map<string, SharedMemoryEntry> {
  return new Map();
}

export function setMemory(
  memory: Map<string, SharedMemoryEntry>,
  key: string,
  value: unknown,
  level: MemoryLevel
): void {
  memory.set(key, { key, value, level, createdAt: Date.now(), accessCount: 0 });
}

export function getMemory(
  memory: Map<string, SharedMemoryEntry>,
  key: string
): unknown | null {
  const entry = memory.get(key);
  if (!entry) return null;
  const ttl = MEMORY_TTL[entry.level];
  if (Date.now() - entry.createdAt > ttl) {
    memory.delete(key);
    return null;
  }
  entry.accessCount++;
  return entry.value;
}

export function evictExpiredMemory(memory: Map<string, SharedMemoryEntry>): number {
  let evicted = 0;
  const now = Date.now();
  for (const [key, entry] of memory) {
    if (now - entry.createdAt > MEMORY_TTL[entry.level]) {
      memory.delete(key);
      evicted++;
    }
  }
  return evicted;
}

export function evaluateAgent(
  agent: AgentState,
  taskSuccess: boolean,
  qualityDelta: number
): AgentState {
  const lr = modulateLearningRate(0.1, agent.neuromodulation);
  const delta = taskSuccess ? Math.abs(qualityDelta) : -Math.abs(qualityDelta);
  return {
    ...agent,
    qualityScore: Math.max(0, Math.min(1, agent.qualityScore + delta * lr)),
    reliabilityScore: Math.max(0, Math.min(1,
      agent.reliabilityScore + (taskSuccess ? 0.02 : -0.05)
    )),
  };
}

function modulateLearningRate(baseLR: number, neuro: NeuromodulationState): number {
  const gain = 1.0 + neuro.dopamine * 0.5 + neuro.acetylcholine * 0.3 - neuro.serotonin * 0.2;
  return baseLR * Math.max(0.1, Math.min(3.0, gain));
}

// ─── Quality Gate (Real Implementation for Agente Crítico) ───

export interface QualityGateResult {
  passed: boolean;
  warnings: string[];
  score: number;
  hallucinationCount: number;
}

/**
 * Execute a real quality gate check on AI-generated content.
 * Calls hallucinationDetector + responseQualityChecker.
 * This is the REAL tool behind the "critico" agent's quality_gate capability.
 */
export function executeQualityGate(content: string, documentContext: string = ""): QualityGateResult {
  const hallucinations = detectHallucinations(content);
  const quality = checkResponseQuality(content, documentContext);
  const highSeverity = hallucinations.filter((h: any) => h.severity === "high");

  const warnings: string[] = [];
  for (const h of highSeverity) {
    warnings.push(`⚠️ Alucinação: ${h.entity} — ${h.reason}`);
  }
  for (const check of quality.checks) {
    if (!check.passed) {
      warnings.push(`❌ ${check.name}: ${check.detail || "falhou"}`);
    }
  }

  return {
    passed: highSeverity.length === 0 && quality.score >= 40,
    warnings,
    score: quality.score,
    hallucinationCount: highSeverity.length,
  };
}
