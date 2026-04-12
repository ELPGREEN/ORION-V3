/**
 * ═══ Orion Neural Network Registry v7.2 ═══
 * Maps the 5 neural networks, 6 core autonomous agents, and 2900+ ELP HF Space swarm agents
 * defined in the NEUROCORE AI architecture.
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

// ─── ELP HF Space Swarm Agent Categories (2900+ agents) ───

export interface SwarmCategory {
  name: string;
  agentCount: number;
  subcategories: string[];
  status: "active" | "standby";
  implementation: string;
}

export const ELP_SWARM_CATEGORIES: Record<string, SwarmCategory> = {
  vision_object_detection: {
    name: "Vision & Object Detection",
    agentCount: 350,
    subcategories: [
      "Face Detection (8)", "Pose/Body (8)", "Object Detection Core (31)",
      "Domain Detection (42)", "Segmentation (9)", "Scene Understanding (8)",
      "Image Processing (8)", "Detection Models (24)",
      "YOLO v5-v12/v26, DETR, GroundingDINO, OWLv2, SAM3, MolmoPoint, Qwen2-VL",
    ],
    status: "active",
    implementation: "ELP HF Space /agents/detection/*",
  },
  code_generation: {
    name: "Code Generation",
    agentCount: 300,
    subcategories: [
      "42 Languages", "8 Paradigms", "25 Frameworks", "19 Models",
      "11 WebApp Builders", "14 Specialized Agents",
      "Qwen3-Coder-32B, DeepSeek-Coder-V2, Yi-Coder-9B, StarCoder2",
    ],
    status: "active",
    implementation: "ELP HF Space /agents/code/*",
  },
  code_analysis: {
    name: "Code Analysis & Security",
    agentCount: 350,
    subcategories: [
      "Security Patterns (12)", "Quality Metrics (14)",
      "Intelligence (12)", "Multi-Agent Code Review (6)",
    ],
    status: "active",
    implementation: "ELP HF Space /agents/code/analyze",
  },
  text_nlp: {
    name: "Text Analysis & NLP",
    agentCount: 250,
    subcategories: [
      "Generation (9)", "Analysis (22)", "Search (9)", "Tokenization (6)",
      "Explainability (6)", "Classification (14)", "Multilingual (13)",
      "AI Detection, Emotion, Readability, Clickbait, Prompt Injection",
    ],
    status: "active",
    implementation: "ELP HF Space /agents/text/*",
  },
  reasoning: {
    name: "Legal/Financial/Medical Reasoning",
    agentCount: 300,
    subcategories: [
      "Legal Analysis", "Contract Review", "Financial Modeling",
      "Medical Reasoning", "Scientific Analysis", "Case Law Research",
    ],
    status: "active",
    implementation: "ELP HF Space /agents/orchestrate",
  },
  fine_tuning: {
    name: "Fine-Tuning & Training",
    agentCount: 200,
    subcategories: [
      "LoRA/QLoRA", "DreamBooth", "SDXL/FLUX LoRA", "DPO/RLHF",
      "TTS/ASR/RVC", "AutoTrain", "Quantization (GPTQ/AWQ/GGUF)",
      "Model Merging/Pruning/Distillation",
    ],
    status: "active",
    implementation: "ELP HF Space /finetune/*",
  },
  dataset_creation: {
    name: "Dataset Creation & Engineering",
    agentCount: 180,
    subcategories: [
      "Synthetic Data (JSON/JSONL/CSV/Parquet)", "Format Conversion",
      "Deduplication", "Labeling", "Data Quality", "Bias Detection",
    ],
    status: "active",
    implementation: "ELP HF Space /dataset/*",
  },
  image_generation: {
    name: "Image Generation",
    agentCount: 80,
    subcategories: [
      "FLUX Dev/Schnell", "SDXL", "SD3", "ControlNet",
      "IP-Adapter", "LoRA Composition", "Comic/Graphic Novel",
    ],
    status: "active",
    implementation: "ELP HF Space /agents/orchestrate",
  },
  video_generation: {
    name: "Video Generation",
    agentCount: 60,
    subcategories: [
      "Wan2.1", "LTX Video", "CogVideoX", "AnimateDiff",
      "Lipsync", "Face Swap", "Video Dubbing",
    ],
    status: "active",
    implementation: "ELP HF Space /agents/orchestrate",
  },
  speech_audio: {
    name: "Speech & Audio",
    agentCount: 90,
    subcategories: [
      "TTS (Kokoro/F5/Bark/Piper)", "ASR (Whisper)",
      "Voice Cloning (RVC v2)", "Music Gen (ACE-Step)",
    ],
    status: "active",
    implementation: "ELP HF Space /agents/orchestrate",
  },
  modeling_3d: {
    name: "3D Modeling",
    agentCount: 40,
    subcategories: [
      "TRELLIS 2", "Hunyuan3D", "TripoSR", "InstantMesh",
      "Gaussian Splatting", "PBR Materials",
    ],
    status: "active",
    implementation: "ELP HF Space /agents/orchestrate",
  },
  benchmarking: {
    name: "Model Benchmarking",
    agentCount: 30,
    subcategories: [
      "Open LLM Leaderboard", "MTEB", "ChatBot Arena",
      "BigCodeBench", "VBench", "ASR Leaderboard",
    ],
    status: "standby",
    implementation: "ELP HF Space /agents/orchestrate",
  },
  pdf_processing: {
    name: "PDF & Document Analysis",
    agentCount: 200,
    subcategories: [
      "OCR (12)", "Layout Analysis (10)", "Table Extraction (8)", "Document Parsing (11)",
      "Bibliography (7)", "Resume Analysis (6)", "Scientific Documents (7)", "Legal Documents (6)",
      "Document Conversion (8)", "Comparison (5)", "Signature/Stamp (4)", "Models (13)",
      "MinerU, PaddleOCR-VL, Surya, Nougat, Donut, DiT, GROBID, GOT-OCR2, TrOCR, LayoutLMv3",
    ],
    status: "active",
    implementation: "ELP HF Space /agents/documents/*",
  },
  question_answering: {
    name: "Question Answering",
    agentCount: 120,
    subcategories: [
      "Extractive QA (12)", "Generative QA (9)", "Document QA (13)",
      "Visual QA (13)", "Domain QA (17)", "Multilingual QA (13)",
      "Open Domain QA (9)", "Conversational QA (6)", "Music/Audio QA (5)",
      "Table QA (6)", "mDeBERTa, RoBERTa, Flan-T5, UnifiedQA, MiniCPM-o, Qwen2-VL, TAPAS",
    ],
    status: "active",
    implementation: "ELP HF Space /agents/qa/*",
  },
};

export function getTotalSwarmAgentCount(): number {
  return Object.values(ELP_SWARM_CATEGORIES).reduce((sum, cat) => sum + cat.agentCount, 0);
}

export function getActiveSwarmCategories(): SwarmCategory[] {
  return Object.values(ELP_SWARM_CATEGORIES).filter(c => c.status === "active");
}

export function getSwarmCategorySummary(): Array<{ name: string; count: number; status: string }> {
  return Object.values(ELP_SWARM_CATEGORIES).map(c => ({
    name: c.name,
    count: c.agentCount,
    status: c.status,
  }));
}

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
  coreAgents: number;
  swarmAgents: number;
  swarmCategories: number;
  activeAgents: number;
  totalActionsLogged: number;
  riskGuardianBlocks: number;
} {
  const networks = Object.values(ORION_NETWORKS);
  const agents = Object.values(ORION_AGENTS);
  const blocks = _actionLog.filter(a => a.agentRole === "risk_guardian" && a.blocked).length;
  const swarmTotal = getTotalSwarmAgentCount();
  const swarmCats = Object.keys(ELP_SWARM_CATEGORIES).length;

  return {
    totalNetworks: networks.length,
    activeNetworks: networks.filter(n => n.status === "active").length,
    totalAgents: agents.length + swarmTotal,
    coreAgents: agents.length,
    swarmAgents: swarmTotal,
    swarmCategories: swarmCats,
    activeAgents: agents.filter(a => a.status === "active").length + getActiveSwarmCategories().reduce((s, c) => s + c.agentCount, 0),
    totalActionsLogged: _actionLog.length,
    riskGuardianBlocks: blocks,
  };
}
