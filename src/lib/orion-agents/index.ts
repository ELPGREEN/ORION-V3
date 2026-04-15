/**
 * ═══ Orion Multi-Agent System ═══
 * Similar to OpenCode agents with specialized capabilities
 */

export type AgentType = 
  | "general"    // General conversation
  | "plan"       // Planning and analysis
  | "build"      // Code execution and building
  | "code"       // Code generation and editing
  | "research"   // Web research and information
  | "review"     // Code review
  | "security"   // Security analysis
  | "vision"     // Vision and image analysis
  | "voice"      // Voice processing
  | "robotics"   // Robot control
  | "evolution"; // Auto-evolution (creator only)

export interface Agent {
  id: AgentType;
  name: string;
  description: string;
  tools: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  specializedFor?: string[];
}

// ═══ Agent Definitions ═══
export const ORION_AGENTS: Agent[] = [
  {
    id: "general",
    name: "Orion Assistant",
    description: "General purpose assistant for all tasks",
    tools: ["chat", "search", "vision", "shell"],
    model: "claude-3.5-sonnet",
    temperature: 0.7,
  },
  {
    id: "plan",
    name: "Orion Planner",
    description: "Analyzes requirements and creates implementation plans",
    tools: ["search", "read", "analyze", "plan"],
    model: "claude-3.5-sonnet",
    temperature: 0.5,
  },
  {
    id: "build",
    name: "Orion Builder",
    description: "Executes code, runs tests, builds projects",
    tools: ["shell", "git", "write", "edit", "test", "build", "lint"],
    model: "claude-3.5-sonnet",
    temperature: 0.3,
  },
  {
    id: "code",
    name: "Orion Coder",
    description: "Generates and edits code with precision",
    tools: ["read", "write", "edit", "search", "format"],
    model: "claude-3.5-sonnet",
    temperature: 0.4,
  },
  {
    id: "research",
    name: "Orion Researcher",
    description: "Researches topics on the web and provides information",
    tools: ["web_search", "web_fetch", "analyze"],
    model: "claude-3.5-sonnet",
    temperature: 0.6,
  },
  {
    id: "review",
    name: "Orion Reviewer",
    description: "Reviews code for issues, bugs, and improvements",
    tools: ["read", "search", "analyze", "lint"],
    model: "claude-3.5-sonnet",
    temperature: 0.2,
  },
  {
    id: "security",
    name: "Orion Security",
    description: "Analyzes code for security vulnerabilities",
    tools: ["read", "search", "analyze", "scan"],
    model: "claude-3.5-sonnet",
    temperature: 0.1,
  },
  {
    id: "vision",
    name: "Orion Vision",
    description: "Analyzes images and video feeds",
    tools: ["vision_analyze", "detect_objects", "detect_faces", "ocr"],
    model: "gemini-1.5-flash",
    temperature: 0.5,
  },
  {
    id: "voice",
    name: "Orion Voice",
    description: "Processes voice commands and audio",
    tools: ["stt", "tts", "voice_analyze"],
    model: "claude-3.5-sonnet",
    temperature: 0.7,
  },
  {
    id: "robotics",
    name: "Orion Robotics",
    description: "Controls robots and IoT devices",
    tools: ["ros_connect", "send_cmd", "telemetry", "nav2"],
    model: "claude-3.5-sonnet",
    temperature: 0.3,
  },
  {
    id: "evolution",
    name: "Orion Evolution",
    description: "Auto-evolves and improves the system (Creator only)",
    tools: ["read", "write", "edit", "shell", "git", "deploy", "test", "build"],
    model: "claude-3.5-sonnet",
    temperature: 0.4,
    specializedFor: ["auto-evolve", "refactor", "optimize", "self-improve"],
  },
];

// ═══ Agent Selection Helper ═══
export function getAgent(type: AgentType): Agent | undefined {
  return ORION_AGENTS.find(a => a.id === type);
}

export function getAgentForTask(task: string): Agent {
  const taskMap: Record<string, AgentType> = {
    "build": "build",
    "criar": "code",
    "gerar": "code",
    "escrever": "code",
    "editar": "code",
    "corrigir": "review",
    "debug": "review",
    "revisar": "review",
    "analisar": "plan",
    "planejar": "plan",
    "pesquisar": "research",
    "buscar": "research",
    "segurança": "security",
    "security": "security",
    "visão": "vision",
    "vision": "vision",
    "voz": "voice",
    "voice": "voice",
    "robô": "robotics",
    "robot": "robotics",
    "evoluir": "evolution",
    "auto": "evolution",
    "otimizar": "evolution",
  };
  
  const agentType = taskMap[task.toLowerCase()] || "general";
  return getAgent(agentType) || ORION_AGENTS[0];
}

export function getAllAgents(): Agent[] {
  return ORION_AGENTS;
}