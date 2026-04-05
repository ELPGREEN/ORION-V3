/**
 * ═══ Orion Neural Network Registry ═══
 * Maps the 5 neural networks and 6 autonomous agents defined in Orion Protocols v1.0
 * to their concrete implementations in the codebase.
 */

// ─── Neural Network Definitions ───

export interface OrionNetwork {
  id: string;
  name: string;
  role: string;
  architecture: string;
  implementation: string[];
  status: "active" | "initializing" | "degraded" | "offline";
  lastHeartbeat: number;
}

export const ORION_NETWORKS: Record<string, OrionNetwork> = {
  core: {
    id: "NET-CORE-01",
    name: "Orion-Core",
    role: "Master predictive network. Market forecasting, opportunity scoring, proposal generation.",
    architecture: "Transformer + LSTM + Graph Neural Network",
    implementation: ["orion-agentic-loop.ts", "ai-orchestrator (edge function)"],
    status: "active",
    lastHeartbeat: Date.now(),
  },
  analysis: {
    id: "NET-ANAL-01",
    name: "Orion-Analysis",
    role: "Real-time data ingestion & feature extraction. Market feeds, news sentiment, on-chain data.",
    architecture: "CNN + RNN (time-series) + NLP (sentiment)",
    implementation: ["orion-api-orchestrator.ts", "pesquisa-unificada (edge function)"],
    status: "active",
    lastHeartbeat: Date.now(),
  },
  risk: {
    id: "NET-RISK-01",
    name: "Orion-Risk",
    role: "Specialized risk-assessment. VaR, Sharpe, drawdown, personalized risk tolerance.",
    architecture: "Monte Carlo + Bayesian Networks",
    implementation: ["orion-defense-system.ts", "orion-protocol-registry.ts"],
    status: "active",
    lastHeartbeat: Date.now(),
  },
  memory: {
    id: "NET-MEM-01",
    name: "Orion-Memory",
    role: "Vector embedding + long-term memory store (pgvector). Proposals, feedback, agent decisions.",
    architecture: "pgvector + FAISS Similarity Search",
    implementation: ["neural_knowledge_base (table)", "generate-embeddings (edge function)"],
    status: "active",
    lastHeartbeat: Date.now(),
  },
  presentation: {
    id: "NET-PRES-01",
    name: "Orion-Presentation",
    role: "Output formatting. Raw data → investor-ready UI documents and interactive dashboards.",
    architecture: "JSON Mapper → React Multimodal Pipeline",
    implementation: ["orion-consciousness.ts", "Dashboard components", "gerar-documento (edge function)"],
    status: "active",
    lastHeartbeat: Date.now(),
  },
};

// ─── Agent Definitions ───

export type AgentRole =
  | "analysis"
  | "risk_guardian"
  | "proposal_architect"
  | "presentation"
  | "operation_overseer"
  | "feedback_learner";

export interface OrionAgent {
  id: string;
  name: string;
  role: AgentRole;
  description: string;
  network: string; // which network it operates
  canBlock: boolean; // can block proposals?
  requiresAuth: boolean;
  implementation: string;
  status: "active" | "idle" | "blocked" | "offline";
  lastAction: number;
  actionsLogged: number;
}

export const ORION_AGENTS: Record<AgentRole, OrionAgent> = {
  analysis: {
    id: "AGT-ANAL-01",
    name: "Analysis Agent",
    role: "analysis",
    description: "Runs Orion-Analysis; ingests data and feeds Orion-Core.",
    network: "analysis",
    canBlock: false,
    requiresAuth: true,
    implementation: "orion-agentic-loop.ts planPhase",
    status: "active",
    lastAction: Date.now(),
    actionsLogged: 0,
  },
  risk_guardian: {
    id: "AGT-RISK-01",
    name: "Risk Guardian Agent",
    role: "risk_guardian",
    description: "Runs Orion-Risk; blocks any proposal that violates user risk profile.",
    network: "risk",
    canBlock: true,
    requiresAuth: true,
    implementation: "orion-defense-system.ts",
    status: "active",
    lastAction: Date.now(),
    actionsLogged: 0,
  },
  proposal_architect: {
    id: "AGT-PROP-01",
    name: "Proposal Architect Agent",
    role: "proposal_architect",
    description: "Builds complete investment proposals (structure, rationale, expected returns, risks, documents).",
    network: "core",
    canBlock: false,
    requiresAuth: true,
    implementation: "orion-agentic-loop.ts actPhase",
    status: "active",
    lastAction: Date.now(),
    actionsLogged: 0,
  },
  presentation: {
    id: "AGT-PRES-01",
    name: "Presentation Agent",
    role: "presentation",
    description: "Renders proposals in React (PDF export, interactive charts, one-click Accept & Invest).",
    network: "presentation",
    canBlock: false,
    requiresAuth: true,
    implementation: "Dashboard components + gerar-documento",
    status: "active",
    lastAction: Date.now(),
    actionsLogged: 0,
  },
  operation_overseer: {
    id: "AGT-OPS-01",
    name: "Operation Overseer Agent",
    role: "operation_overseer",
    description: "Monitors entire system health, logs every neural decision, ensures auditability and compliance.",
    network: "core",
    canBlock: true,
    requiresAuth: true,
    implementation: "system-health.ts + ai_metrics",
    status: "active",
    lastAction: Date.now(),
    actionsLogged: 0,
  },
  feedback_learner: {
    id: "AGT-FEED-01",
    name: "Feedback Learner Agent",
    role: "feedback_learner",
    description: "Collects user feedback and retrains Orion-Memory embeddings.",
    network: "memory",
    canBlock: false,
    requiresAuth: true,
    implementation: "meta-learning.ts + neural_learning_data",
    status: "active",
    lastAction: Date.now(),
    actionsLogged: 0,
  },
};

// ─── Agent Action Logger (Protocol: No agent can act without logging) ───

const ACTION_LOG_KEY = "orion_agent_actions";
const MAX_LOG_SIZE = 200;

interface AgentAction {
  agentId: string;
  agentRole: AgentRole;
  action: string;
  reasoning: string;
  timestamp: number;
  blocked: boolean;
  confidence: number;
}

let _actionLog: AgentAction[] = [];

function loadActionLog(): void {
  try {
    const raw = localStorage.getItem(ACTION_LOG_KEY);
    if (raw) _actionLog = JSON.parse(raw);
  } catch { _actionLog = []; }
}

function saveActionLog(): void {
  try {
    if (_actionLog.length > MAX_LOG_SIZE) {
      _actionLog = _actionLog.slice(-MAX_LOG_SIZE);
    }
    localStorage.setItem(ACTION_LOG_KEY, JSON.stringify(_actionLog));
  } catch {}
}

loadActionLog();

export function logAgentAction(
  role: AgentRole,
  action: string,
  reasoning: string,
  confidence: number = 1.0,
  blocked: boolean = false
): void {
  const agent = ORION_AGENTS[role];
  if (!agent) return;
  
  const entry: AgentAction = {
    agentId: agent.id,
    agentRole: role,
    action,
    reasoning,
    timestamp: Date.now(),
    blocked,
    confidence,
  };
  
  _actionLog.push(entry);
  agent.lastAction = Date.now();
  agent.actionsLogged++;
  saveActionLog();
}

export function getAgentActions(role?: AgentRole, limit: number = 20): AgentAction[] {
  const filtered = role ? _actionLog.filter(a => a.agentRole === role) : _actionLog;
  return filtered.slice(-limit);
}

// ─── Risk Guardian Gate (Protocol: No proposal without Risk Guardian approval) ───

export interface RiskValidation {
  approved: boolean;
  riskScore: number;
  reasons: string[];
  timestamp: number;
}

export function riskGuardianCheck(
  proposalData: { confidence: number; riskLevel?: string; amount?: number },
  userRiskTolerance: "low" | "medium" | "high" = "medium"
): RiskValidation {
  const thresholds: Record<string, number> = { low: 0.8, medium: 0.6, high: 0.4 };
  const threshold = thresholds[userRiskTolerance];
  const reasons: string[] = [];
  let riskScore = 0;

  // Check confidence
  if (proposalData.confidence < threshold) {
    reasons.push(`Confiança neural (${(proposalData.confidence * 100).toFixed(1)}%) abaixo do limiar do perfil ${userRiskTolerance} (${threshold * 100}%).`);
    riskScore += 0.4;
  }

  // Check risk level
  if (proposalData.riskLevel === "high" && userRiskTolerance === "low") {
    reasons.push("Nível de risco alto incompatível com perfil conservador.");
    riskScore += 0.5;
  }

  const approved = reasons.length === 0;

  logAgentAction(
    "risk_guardian",
    approved ? "APPROVED" : "BLOCKED",
    `Proposta ${approved ? "aprovada" : "bloqueada"}. Score: ${riskScore.toFixed(2)}. Razões: ${reasons.join("; ") || "Nenhuma restrição."}`,
    proposalData.confidence,
    !approved
  );

  return { approved, riskScore, reasons, timestamp: Date.now() };
}

// ─── Network Health Summary ───

export function getNetworkHealthSummary(): {
  totalNetworks: number;
  activeNetworks: number;
  totalAgents: number;
  activeAgents: number;
  totalActionsLogged: number;
  riskGuardianBlocks: number;
} {
  const networks = Object.values(ORION_NETWORKS);
  const agents = Object.values(ORION_AGENTS);
  const blocks = _actionLog.filter(a => a.agentRole === "risk_guardian" && a.blocked).length;

  return {
    totalNetworks: networks.length,
    activeNetworks: networks.filter(n => n.status === "active").length,
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === "active").length,
    totalActionsLogged: _actionLog.length,
    riskGuardianBlocks: blocks,
  };
}
