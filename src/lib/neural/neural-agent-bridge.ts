/**
 * ─── Neural Agent Bridge (v25.0 — Super Agents Integration) ───
 * Singleton bridge connecting API agents to the neural society,
 * now with Super Agents, Tool Executor, and full integration.
 * 
 * Integrations:
 * - Super Agents: 11 ORION + 7 Legal agents with full prompts
 * - Tool Executor: OpenAI Function Calling format
 * - IoT/Robotics: ROS2, MQTT, BLE integration
 * - Platforms: Ollama, LM Studio, HuggingFace, OpenRouter
 */

import type { AgentRole, AgentSocietyState, AgentState } from "./multi-agent";
import {
  createAgentSociety,
  recordAgentCoActivation,
  evaluateAgent,
  getSuggestedPartners,
  getAgentBindingSummary,
} from "./multi-agent";
import { getAgenteEu } from "./agents/self-model-agent";
import { getCachedInteroceptiveState, type InteroceptiveState } from "./interoception-engine";
import { consultSomaticMarker, recordSomaticOutcome } from "./somatic-markers";
import { sendDirect, getP2PPartners, getP2PNetworkStatus, hasResonanceLink, type P2PNetworkMetrics } from "./tesla-wireless-p2p";
import { orionFactory, type AgentFactoryResult } from "./orion-autonomous-agent";
import { SUPER_AGENTS, LEGAL_SUPER_AGENTS, getSuperAgentPrompt, getLegalSuperPrompt, type SuperAgentPrompt, type LegalSuperPrompt } from "./super-prompts";
import { orionToolsToFunctionCalling, executeFunctionCall, getToolsForSuperAgent, type FunctionDefinition } from "./tool-executor";

// ═══ IoT/Robotics Integration ═══
import { iotBridge, type IoTDevice } from "./iot-device-bridge";
import { ros2Bridge, type ROSTopic } from "./ros2-protocol-bridge";

// ─── Singleton Society State ───

let _society: AgentSocietyState = createAgentSociety();

// ─── Broadcast Log (ring buffer for dashboard telemetry) ───

export interface AgentBroadcast {
  role: AgentRole;
  success: boolean;
  latencyMs: number;
  callerRole: AgentRole;
  timestamp: number;
  interoceptiveSnapshot?: { valence: number; arousal: number; painIndex: number } | null;
}

const MAX_BROADCASTS = 100;
let _broadcasts: AgentBroadcast[] = [];

// ─── API-to-Neural Role Mapping ───

const ENDPOINT_TO_ROLE: Record<string, AgentRole> = {
  "agente-leitura": "leitura",
  "agente-construcao": "construcao",
  "ai-orchestrator": "construcao",
  "agente-pesquisa": "pesquisa",
  leitura: "leitura",
  construcao: "construcao",
  pesquisa: "pesquisa",
};

/**
 * Called after every agent invocation (success or failure).
 * Now consults somatic markers before routing and records interoceptive snapshots.
 */
export function onAgentTaskComplete(
  roleOrEndpoint: string,
  success: boolean,
  latencyMs: number,
  callerRole: AgentRole = "supervisor"
): void {
  const role = ENDPOINT_TO_ROLE[roleOrEndpoint] || (roleOrEndpoint as AgentRole);

  // 1. STDP co-activation learning
  _society = recordAgentCoActivation(_society, callerRole, role, success);

  // 2. Evaluate & update agent quality/reliability
  const agentIdx = _society.agents.findIndex((a) => a.role === role);
  if (agentIdx !== -1) {
    const qualityDelta = success
      ? Math.min(0.1, 500 / Math.max(latencyMs, 1))
      : -0.05;
    const updated = evaluateAgent(_society.agents[agentIdx], success, qualityDelta);
    _society = {
      ..._society,
      agents: _society.agents.map((a, i) => (i === agentIdx ? updated : a)),
    };
  }

  // 3. Record in Agente-Eu autobiographical memory
  try {
    const eu = getAgenteEu();
    eu.recordMemory(
      `Agente ${role} ${success ? "completou" : "falhou"} tarefa em ${latencyMs}ms`,
      success ? "success" : "failure"
    );
  } catch (e) {
    console.warn("[NeuralBridge] Failed to record in Agente-Eu:", e);
  }

  // 4. Layer 6: Capture interoceptive snapshot for telemetry
  const interoState = getCachedInteroceptiveState();
  const interoSnap = interoState
    ? { valence: interoState.valence, arousal: interoState.arousal, painIndex: interoState.painIndex }
    : null;

  // 5. Layer 9: Record somatic outcome for this agent role
  const contextHash = `agent_${role}`;
  const emotionalImpact = success ? 0.6 : -0.5;
  recordSomaticOutcome(contextHash, `Agent ${role} task`, "agent_routing", success, emotionalImpact);

  // 6. Tesla Wireless P2P: try direct delivery to caller first
  let p2pDelivered = false;
  try {
    p2pDelivered = sendDirect(role, callerRole, "task_result", {
      success,
      latencyMs,
      timestamp: Date.now(),
    });
  } catch { /* P2P optional */ }

  // 7. Queue broadcast for telemetry (now with interoceptive + P2P data)
  _broadcasts = [
    ..._broadcasts.slice(-(MAX_BROADCASTS - 1)),
    { role, success, latencyMs, callerRole, timestamp: Date.now(), interoceptiveSnapshot: interoSnap },
  ];
}

/**
 * Get STDP-based routing suggestions, modulated by somatic markers (Layer 9).
 * Agents with negative somatic valence are deprioritized.
 */
export function getSmartRouting(
  role: AgentRole,
  topK: number = 3
): Array<{ role: AgentRole; weight: number }> {
  const partners = getSuggestedPartners(_society, role, topK + 2); // fetch extra for P2P boost

  // Layer 9: Modulate weights with somatic markers
  const interoState = getCachedInteroceptiveState();
  const modulated = partners.map((p) => {
    let w = p.weight;

    // Somatic marker modulation
    const marker = consultSomaticMarker({
      contextHash: `agent_${p.role}`,
      interoceptiveState: interoState ?? undefined,
    });
    if (marker && marker.confidence > 0.5) {
      w *= marker.shouldProceed ? 1.1 : 0.75;
    }

    // Tesla P2P boost: prioritize agents with active resonance links
    if (hasResonanceLink(role, p.role)) {
      w *= 1.25; // P2P-connected agents get a significant boost
    }

    return { ...p, weight: w };
  }).sort((a, b) => b.weight - a.weight);

  return modulated.slice(0, topK);
}

/**
 * Get a readonly snapshot of the neural society state.
 */
export function getSocietySnapshot(): Readonly<AgentSocietyState> {
  return _society;
}

/**
 * Get recent broadcasts (ring buffer).
 */
export function getRecentBroadcasts(): readonly AgentBroadcast[] {
  return _broadcasts;
}

/**
 * Get the STDP binding summary for telemetry/dashboard.
 */
export function getSocietyBindingSummary() {
  return getAgentBindingSummary(_society);
}

/**
 * Get a specific agent's current reliability and quality scores.
 */
export function getAgentMetrics(
  role: AgentRole
): { reliability: number; quality: number } | null {
  const agent = _society.agents.find((a) => a.role === role);
  if (!agent) return null;
  return {
    reliability: agent.reliabilityScore,
    quality: agent.qualityScore,
  };
}

/**
 * Generate a concise neural status string for Orion's reasoning context.
 * Now includes interoceptive state summary.
 */
export function getNeuralAgentContext(): string {
  const operational: AgentRole[] = ["leitura", "pesquisa", "construcao"];
  const agentStr = operational
    .map((role) => {
      const m = getAgentMetrics(role);
      if (!m) return `${role}(offline)`;
      return `${role}(R:${(m.reliability * 100).toFixed(0)}%,Q:${(m.quality * 100).toFixed(0)}%)`;
    })
    .join(" | ");

  // Layer 6: Append interoceptive summary
  const intero = getCachedInteroceptiveState();
  if (intero) {
    return `${agentStr} ║ corpo:V${intero.valence.toFixed(1)}/A${intero.arousal.toFixed(1)}/P${intero.painIndex.toFixed(1)}`;
  }
  return agentStr;
}

/**
 * Get P2P network status for telemetry/dashboard.
 */
export function getP2PStatus(): Readonly<P2PNetworkMetrics> {
  return getP2PNetworkStatus();
}

/**
 * Reset the society state (useful for testing).
 */
export function resetNeuralBridge(): void {
  _society = createAgentSociety();
  _broadcasts = [];
  try {
    const { resetP2PNetwork } = require("./tesla-wireless-p2p");
    resetP2PNetwork();
  } catch { /* optional */ }
}

/**
 * Autonomous agent creation: Orion creates a new agent when it
 * detects difficulty executing, thinking, or reasoning.
 */
export async function autoCreateAgentOnDifficulty(
  taskDescription: string,
  context: Record<string, unknown>,
  failedAttempts: number = 0
): Promise<AgentFactoryResult> {
  return orionFactory.autoCreateAgent(taskDescription, context, failedAttempts);
}

/**
 * Execute a task with auto-recovery: if the primary agent fails,
 * Orion creates a specialized agent and retries.
 */
export async function executeWithAutoRecovery(
  taskDescription: string,
  primaryAgentId?: string,
  maxRetries: number = 2
): Promise<AgentFactoryResult> {
  return orionFactory.executeWithAutoRecovery(taskDescription, primaryAgentId, maxRetries);
}

/**
 * Get the HF model registry summary (2900+ models).
 */
export async function getHFRegistry(): Promise<AgentFactoryResult> {
  return orionFactory.getRegistry();
}

/**
 * Analyze code line-by-line via Orion.
 */
export async function orionCodeAnalysis(
  path?: string,
  query?: string,
  mode: "scan" | "find_gaps" | "suggest_improvements" = "scan"
): Promise<AgentFactoryResult> {
  return orionFactory.analyzeCode(path, query, mode);
}

/**
 * Analyze Supabase schema via Orion.
 */
export async function orionSupabaseAnalysis(): Promise<AgentFactoryResult> {
  return orionFactory.analyzeSupabase();
}

/** ═══════════════════════════════════════════════════════════════
 * SUPER AGENTS INTEGRATION
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Get full prompt for any Super Agent
 */
export function getAgentPrompt(role: AgentRole): SuperAgentPrompt | undefined {
  return SUPER_AGENTS[role];
}

/**
 * Get full prompt for any Legal Super Agent  
 */
export function getLegalAgentPrompt(id: "orquestrador" | "planejamento" | "pesquisa" | "analise" | "sintese" | "redacao" | "citacao"): LegalSuperPrompt | undefined {
  return LEGAL_SUPER_AGENTS[id];
}

/**
 * Get all tools for a Super Agent in OpenAI Function format
 */
export function getAgentTools(role: AgentRole): FunctionDefinition[] {
  return getToolsForSuperAgent(role);
}

/**
 * Execute a tool call (for function calling response)
 */
export async function executeToolCall(
  functionName: string,
  arguments_: string
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const result = await executeFunctionCall({ name: functionName, arguments: arguments_ });
  return {
    success: result.success,
    result: result.result,
    error: result.error,
  };
}

/** ═══════════════════════════════════════════════════════════════
 * IOT/ROBOTICS INTEGRATION
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Get connected IoT devices
 */
export function getConnectedDevices(): IoTDevice[] {
  return iotBridge.getDevices();
}

/**
 * Get ROS2 topics
 */
export function getROSTopics(): ROSTopic[] {
  return ros2Bridge.getTopics();
}

/**
 * Execute command on IoT device
 */
export async function executeIoTCommand(
  deviceId: string,
  command: "on" | "off" | "toggle",
  value?: unknown
): Promise<boolean> {
  return iotBridge.sendCommand(deviceId, command, value);
}
