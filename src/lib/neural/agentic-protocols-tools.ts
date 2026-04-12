/**
 * ─── Agentic Protocols, Platforms & Tools ───
 *
 * Implements concepts from AWS Prescriptive Guidance:
 * "Agentic AI frameworks, platforms, protocols, and tools on AWS" (January 2026)
 *
 * Modules:
 *   1. A2A Protocol (Agent2Agent) — Capability manifests, peer discovery, negotiation
 *   2. MCP Protocol Bridge — Model Context Protocol tool integration layer
 *   3. AgentCore Abstractions — Runtime, Memory, Gateway, Identity, Observability
 *   4. Tool Categories — Protocol-based, Framework-native, Meta-tools
 *   5. Framework Selector — Compare and recommend agentic AI frameworks
 *
 * Ref: AWS Prescriptive Guidance – Agentic AI Frameworks (2026)
 */

// ═══════════════════════════════════════════════
// 1. A2A PROTOCOL (Agent2Agent)
// ═══════════════════════════════════════════════

export interface A2ACapabilityManifest {
  agentId: string;
  agentName: string;
  can: string[];               // e.g., ["summarize.text", "extract.keywords"]
  needs: string[];             // e.g., ["document.input"]
  meta: {
    version: string;
    latencyMs: number;
    maxConcurrency: number;
    model?: string;
    framework?: string;
  };
  endpoints?: { protocol: "http" | "ws" | "event_bus"; url: string }[];
  security?: { authType: "oauth2" | "api_key" | "mtls" | "none"; scopes?: string[] };
  registeredAt: number;
  lastHeartbeat: number;
}

export type A2ANegotiationStatus = "pending" | "offered" | "accepted" | "rejected" | "completed" | "failed";

export interface A2ATaskNegotiation {
  id: string;
  requestorId: string;
  responderId: string;
  capability: string;
  input: unknown;
  status: A2ANegotiationStatus;
  offer?: { estimatedLatencyMs: number; confidence: number };
  result?: unknown;
  createdAt: number;
  updatedAt: number;
}

/** In-memory A2A registry */
let a2aRegistry: Map<string, A2ACapabilityManifest> = new Map();
let a2aNegotiations: A2ATaskNegotiation[] = [];

/**
 * Register an agent's capability manifest in the A2A registry.
 */
export function registerA2AAgent(manifest: A2ACapabilityManifest): void {
  a2aRegistry.set(manifest.agentId, { ...manifest, registeredAt: Date.now(), lastHeartbeat: Date.now() });
}

/**
 * Discover agents that can handle a specific capability.
 */
export function discoverAgents(capability: string): A2ACapabilityManifest[] {
  const now = Date.now();
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  return [...a2aRegistry.values()]
    .filter((m) => m.can.some((c) => c === capability || capability.startsWith(c.split(".")[0]))
      && (now - m.lastHeartbeat) < staleThreshold);
}

/**
 * Select the best agent for a capability based on latency and concurrency.
 */
export function matchAgent(capability: string): A2ACapabilityManifest | null {
  const candidates = discoverAgents(capability);
  if (candidates.length === 0) return null;
  // Sort by latency (lower is better)
  candidates.sort((a, b) => a.meta.latencyMs - b.meta.latencyMs);
  return candidates[0];
}

/**
 * Initiate a task negotiation between two agents.
 */
export function negotiateTask(
  requestorId: string,
  capability: string,
  input: unknown
): A2ATaskNegotiation | null {
  const agent = matchAgent(capability);
  if (!agent) return null;

  const negotiation: A2ATaskNegotiation = {
    id: `neg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    requestorId,
    responderId: agent.agentId,
    capability,
    input,
    status: "offered",
    offer: { estimatedLatencyMs: agent.meta.latencyMs, confidence: 0.9 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  a2aNegotiations.push(negotiation);
  return negotiation;
}

/**
 * Accept a negotiation and produce result.
 */
export function resolveNegotiation(
  negotiationId: string,
  accepted: boolean,
  result?: unknown
): A2ATaskNegotiation | null {
  const neg = a2aNegotiations.find((n) => n.id === negotiationId);
  if (!neg) return null;

  neg.status = accepted ? (result !== undefined ? "completed" : "accepted") : "rejected";
  neg.result = result;
  neg.updatedAt = Date.now();
  return neg;
}

export function heartbeatA2AAgent(agentId: string): void {
  const manifest = a2aRegistry.get(agentId);
  if (manifest) manifest.lastHeartbeat = Date.now();
}

export function getA2ARegistrySnapshot(): A2ACapabilityManifest[] {
  return [...a2aRegistry.values()];
}

export function getA2ANegotiationHistory(): A2ATaskNegotiation[] {
  return [...a2aNegotiations];
}

export function resetA2ARegistry(): void {
  a2aRegistry = new Map();
  a2aNegotiations = [];
}

// ═══════════════════════════════════════════════
// 2. MCP PROTOCOL BRIDGE
// ═══════════════════════════════════════════════

export type MCPTransport = "stdio" | "sse" | "http_remote";

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;  // JSON Schema
  outputSchema?: Record<string, unknown>;
  transport: MCPTransport;
  endpoint?: string;
  auth?: { type: "oauth2" | "api_key"; scope?: string };
  tags?: string[];
}

export interface MCPToolResult {
  toolName: string;
  output: unknown;
  durationMs: number;
  error?: string;
  traceId?: string;
}

/** In-memory MCP tool registry */
let mcpToolRegistry: Map<string, MCPToolDefinition> = new Map();

/**
 * Register an MCP-compatible tool.
 */
export function registerMCPTool(tool: MCPToolDefinition): void {
  mcpToolRegistry.set(tool.name, tool);
}

/**
 * Discover available MCP tools, optionally filtered by tags.
 */
export function discoverMCPTools(tags?: string[]): MCPToolDefinition[] {
  const all = [...mcpToolRegistry.values()];
  if (!tags || tags.length === 0) return all;
  return all.filter((t) => t.tags?.some((tag) => tags.includes(tag)));
}

/**
 * Generate tool context for LLM function calling.
 * Returns JSON schemas in the format expected by LLMs.
 */
export function generateMCPToolContext(): {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}[] {
  return [...mcpToolRegistry.values()].map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.inputSchema,
  }));
}

/**
 * Execute an MCP tool (simulation — actual execution would call real endpoints).
 */
export async function invokeMCPTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<MCPToolResult> {
  const start = Date.now();
  const tool = mcpToolRegistry.get(toolName);
  if (!tool) {
    return { toolName, output: null, durationMs: Date.now() - start, error: `Tool '${toolName}' not found` };
  }

  // In a real implementation, this would make HTTP/stdio/SSE calls
  // For browser runtime, we simulate the invocation
  const traceId = `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    toolName,
    output: { simulated: true, input, tool: tool.name, transport: tool.transport },
    durationMs: Date.now() - start,
    traceId,
  };
}

export function resetMCPRegistry(): void {
  mcpToolRegistry = new Map();
}

// ═══════════════════════════════════════════════
// 3. AGENTCORE ABSTRACTIONS
// ═══════════════════════════════════════════════

/**
 * AgentCore Runtime — Serverless, scalable agent hosting environment.
 * Models the key services from Amazon Bedrock AgentCore.
 */
export interface AgentCoreRuntimeConfig {
  agentId: string;
  framework: AgenticFramework;
  modelProvider: string;
  modelId: string;
  maxSessionDurationMs: number;
  sessionIsolation: boolean;
  mcpToolsEnabled: boolean;
}

export interface AgentCoreSession {
  sessionId: string;
  agentId: string;
  startedAt: number;
  lastActiveAt: number;
  status: "active" | "idle" | "terminated";
  memoryNamespace: string;
  turnCount: number;
}

let agentCoreSessions: Map<string, AgentCoreSession> = new Map();

export function createAgentCoreSession(config: AgentCoreRuntimeConfig): AgentCoreSession {
  const session: AgentCoreSession = {
    sessionId: `acs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    agentId: config.agentId,
    startedAt: Date.now(),
    lastActiveAt: Date.now(),
    status: "active",
    memoryNamespace: `agent:${config.agentId}:session`,
    turnCount: 0,
  };
  agentCoreSessions.set(session.sessionId, session);
  return session;
}

export function getAgentCoreSession(sessionId: string): AgentCoreSession | undefined {
  return agentCoreSessions.get(sessionId);
}

export function terminateAgentCoreSession(sessionId: string): void {
  const session = agentCoreSessions.get(sessionId);
  if (session) session.status = "terminated";
}

/**
 * AgentCore Memory — Short-term and long-term memory management.
 */
export interface AgentCoreMemoryEntry {
  key: string;
  value: unknown;
  namespace: string;
  type: "short_term" | "long_term" | "semantic";
  createdAt: number;
  accessCount: number;
  ttlMs?: number;
}

let agentCoreMemory: Map<string, AgentCoreMemoryEntry> = new Map();

export function setAgentCoreMemory(
  namespace: string,
  key: string,
  value: unknown,
  type: "short_term" | "long_term" | "semantic" = "short_term",
  ttlMs?: number
): void {
  const fullKey = `${namespace}:${key}`;
  agentCoreMemory.set(fullKey, {
    key, value, namespace, type, createdAt: Date.now(), accessCount: 0, ttlMs,
  });
}

export function getAgentCoreMemory(namespace: string, key: string): unknown | undefined {
  const fullKey = `${namespace}:${key}`;
  const entry = agentCoreMemory.get(fullKey);
  if (!entry) return undefined;
  if (entry.ttlMs && Date.now() - entry.createdAt > entry.ttlMs) {
    agentCoreMemory.delete(fullKey);
    return undefined;
  }
  entry.accessCount++;
  return entry.value;
}

export function listAgentCoreMemory(namespace: string): AgentCoreMemoryEntry[] {
  const now = Date.now();
  return [...agentCoreMemory.values()]
    .filter((e) => e.namespace === namespace && (!e.ttlMs || now - e.createdAt <= e.ttlMs));
}

export function evictAgentCoreMemory(namespace: string): number {
  const now = Date.now();
  let evicted = 0;
  for (const [key, entry] of agentCoreMemory.entries()) {
    if (entry.namespace === namespace && entry.ttlMs && now - entry.createdAt > entry.ttlMs) {
      agentCoreMemory.delete(key);
      evicted++;
    }
  }
  return evicted;
}

/**
 * AgentCore Gateway — Tool discovery and MCP-compatible tool serving.
 */
export interface AgentCoreGatewayConfig {
  gatewayId: string;
  mcpEndpoint: string;
  authType: "oauth2" | "api_key" | "iam";
  registeredTools: string[];
}

let agentCoreGateways: Map<string, AgentCoreGatewayConfig> = new Map();

export function registerAgentCoreGateway(config: AgentCoreGatewayConfig): void {
  agentCoreGateways.set(config.gatewayId, config);
}

export function discoverGatewayTools(gatewayId: string): MCPToolDefinition[] {
  const gw = agentCoreGateways.get(gatewayId);
  if (!gw) return [];
  return gw.registeredTools
    .map((name) => mcpToolRegistry.get(name))
    .filter((t): t is MCPToolDefinition => !!t);
}

/**
 * AgentCore Identity — Agent identity and access management.
 */
export interface AgentIdentity {
  agentId: string;
  name: string;
  roles: string[];
  permissions: string[];
  createdAt: number;
  isVerified: boolean;
}

let agentIdentities: Map<string, AgentIdentity> = new Map();

export function registerAgentIdentity(identity: AgentIdentity): void {
  agentIdentities.set(identity.agentId, identity);
}

export function verifyAgentPermission(agentId: string, permission: string): boolean {
  const identity = agentIdentities.get(agentId);
  if (!identity || !identity.isVerified) return false;
  return identity.permissions.includes(permission) || identity.permissions.includes("*");
}

export function getAgentIdentity(agentId: string): AgentIdentity | undefined {
  return agentIdentities.get(agentId);
}

/**
 * AgentCore Observability — Tracing, metrics, and structured logging.
 */
export interface AgentCoreTrace {
  traceId: string;
  agentId: string;
  sessionId?: string;
  spans: AgentCoreSpan[];
  startedAt: number;
  completedAt?: number;
  status: "active" | "completed" | "error";
}

export interface AgentCoreSpan {
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  attributes: Record<string, unknown>;
  events: { name: string; timestamp: number; attributes?: Record<string, unknown> }[];
  status: "ok" | "error";
}

let agentCoreTraces: AgentCoreTrace[] = [];

export function startAgentCoreTrace(agentId: string, sessionId?: string): AgentCoreTrace {
  const trace: AgentCoreTrace = {
    traceId: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    agentId,
    sessionId,
    spans: [],
    startedAt: Date.now(),
    status: "active",
  };
  agentCoreTraces.push(trace);
  if (agentCoreTraces.length > 1000) agentCoreTraces = agentCoreTraces.slice(-500);
  return trace;
}

export function addAgentCoreSpan(
  traceId: string,
  operation: string,
  attributes: Record<string, unknown> = {},
  parentSpanId?: string
): AgentCoreSpan {
  const span: AgentCoreSpan = {
    spanId: `span-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    parentSpanId,
    operation,
    startedAt: Date.now(),
    attributes,
    events: [],
    status: "ok",
  };
  const trace = agentCoreTraces.find((t) => t.traceId === traceId);
  trace?.spans.push(span);
  return span;
}

export function completeAgentCoreSpan(traceId: string, spanId: string, status: "ok" | "error" = "ok"): void {
  const trace = agentCoreTraces.find((t) => t.traceId === traceId);
  const span = trace?.spans.find((s) => s.spanId === spanId);
  if (span) {
    span.endedAt = Date.now();
    span.durationMs = span.endedAt - span.startedAt;
    span.status = status;
  }
}

export function completeAgentCoreTrace(traceId: string): void {
  const trace = agentCoreTraces.find((t) => t.traceId === traceId);
  if (trace) {
    trace.completedAt = Date.now();
    trace.status = trace.spans.some((s) => s.status === "error") ? "error" : "completed";
  }
}

export function getAgentCoreTraces(agentId?: string): AgentCoreTrace[] {
  if (agentId) return agentCoreTraces.filter((t) => t.agentId === agentId);
  return [...agentCoreTraces];
}

// ═══════════════════════════════════════════════
// 4. META-TOOLS
// ═══════════════════════════════════════════════

export type MetaToolType = "workflow" | "agent_graph" | "memory" | "reflection";

export interface MetaToolDefinition {
  name: string;
  type: MetaToolType;
  description: string;
  execute: (input: unknown) => Promise<unknown>;
}

let metaToolRegistry: Map<string, MetaToolDefinition> = new Map();

export function registerMetaTool(tool: MetaToolDefinition): void {
  metaToolRegistry.set(tool.name, tool);
}

export function getMetaTools(type?: MetaToolType): MetaToolDefinition[] {
  const all = [...metaToolRegistry.values()];
  if (type) return all.filter((t) => t.type === type);
  return all;
}

export async function invokeMetaTool(name: string, input: unknown): Promise<unknown> {
  const tool = metaToolRegistry.get(name);
  if (!tool) throw new Error(`Meta-tool '${name}' not found`);
  return tool.execute(input);
}

// Register built-in meta-tools
registerMetaTool({
  name: "state_manager",
  type: "workflow",
  description: "Manages workflow state across multiple agent interactions",
  execute: async (input) => ({ managed: true, state: input }),
});

registerMetaTool({
  name: "task_delegator",
  type: "agent_graph",
  description: "Assigns subtasks to specialized agents based on capabilities",
  execute: async (input) => ({ delegated: true, task: input }),
});

registerMetaTool({
  name: "result_aggregator",
  type: "agent_graph",
  description: "Combines outputs from multiple agents with conflict resolution",
  execute: async (input) => ({ aggregated: true, inputs: input }),
});

registerMetaTool({
  name: "conversation_history",
  type: "memory",
  description: "Maintains conversation context across sessions",
  execute: async (input) => ({ stored: true, context: input }),
});

registerMetaTool({
  name: "self_reflection",
  type: "reflection",
  description: "Enables agents to analyze and improve their own performance",
  execute: async (input) => ({ reflected: true, analysis: input }),
});

// ═══════════════════════════════════════════════
// 5. FRAMEWORK SELECTOR
// ═══════════════════════════════════════════════

export type AgenticFramework =
  | "strands_agents"
  | "langchain_langgraph"
  | "crewai"
  | "autogen"
  | "llamaindex"
  | "custom";

export interface FrameworkProfile {
  framework: AgenticFramework;
  name: string;
  description: string;
  strengths: string[];
  idealFor: string[];
  awsIntegration: "strongest" | "strong" | "adequate" | "weak";
  multimodalSupport: "strongest" | "strong" | "adequate" | "weak";
  learningCurve: "low" | "moderate" | "steep";
  deploymentModel: "managed" | "platform" | "diy";
  protocols: ("mcp" | "a2a" | "openai_fc" | "anthropic_tools")[];
}

export const FRAMEWORK_PROFILES: Record<AgenticFramework, FrameworkProfile> = {
  strands_agents: {
    framework: "strands_agents",
    name: "Strands Agents (AWS)",
    description: "Model-first, open-source SDK by AWS with native MCP integration and multi-agent patterns (Swarm, Graph, Workflow).",
    strengths: ["AWS-native integration", "MCP built-in", "Multi-agent patterns", "Model-first design"],
    idealFor: ["AWS-heavy organizations", "Enterprise-grade security", "Flexible model selection"],
    awsIntegration: "strongest",
    multimodalSupport: "strongest",
    learningCurve: "moderate",
    deploymentModel: "diy",
    protocols: ["mcp", "a2a"],
  },
  langchain_langgraph: {
    framework: "langchain_langgraph",
    name: "LangChain + LangGraph",
    description: "Established framework with graph-based workflows, extensive component ecosystem, and rich tool integrations.",
    strengths: ["Large ecosystem", "Graph-based state machines", "Multiple LLM providers", "Memory abstractions"],
    idealFor: ["Complex multi-step reasoning", "Python-based ML teams", "Complex state management"],
    awsIntegration: "adequate",
    multimodalSupport: "strong",
    learningCurve: "steep",
    deploymentModel: "platform",
    protocols: ["mcp", "openai_fc", "anthropic_tools"],
  },
  crewai: {
    framework: "crewai",
    name: "CrewAI",
    description: "Open-source framework focused on role-based multi-agent orchestration with task delegation and team collaboration.",
    strengths: ["Role-based agent design", "Task delegation", "Inter-agent collaboration", "Process management"],
    idealFor: ["Specialized role-based expertise", "Explicit agent collaboration", "Team-based problem decomposition"],
    awsIntegration: "weak",
    multimodalSupport: "weak",
    learningCurve: "moderate",
    deploymentModel: "diy",
    protocols: ["mcp"],
  },
  autogen: {
    framework: "autogen",
    name: "AutoGen (Microsoft)",
    description: "Conversational multi-agent framework with async, event-driven interactions and human-in-the-loop support.",
    strengths: ["Conversational agents", "Async architecture", "Human-in-the-loop", "Code generation/execution"],
    idealFor: ["Natural conversational flows", "Mixed autonomous/human oversight", "Code-focused agents"],
    awsIntegration: "weak",
    multimodalSupport: "adequate",
    learningCurve: "steep",
    deploymentModel: "diy",
    protocols: ["a2a", "openai_fc"],
  },
  llamaindex: {
    framework: "llamaindex",
    name: "LlamaIndex",
    description: "Data-centric framework for RAG and agentic AI with advanced document processing and retrieval capabilities.",
    strengths: ["Data-centric architecture", "100+ data format support", "Advanced document processing", "Agentic retrieval"],
    idealFor: ["Document-heavy applications", "RAG-first architectures", "Enterprise data workflows"],
    awsIntegration: "adequate",
    multimodalSupport: "strong",
    learningCurve: "moderate",
    deploymentModel: "diy",
    protocols: ["mcp", "openai_fc"],
  },
  custom: {
    framework: "custom",
    name: "Custom Framework",
    description: "Custom-built agentic framework tailored to specific organizational requirements.",
    strengths: ["Full control", "Domain-specific optimization", "No external dependencies"],
    idealFor: ["Unique requirements", "Deep customization needs", "Proprietary architectures"],
    awsIntegration: "adequate",
    multimodalSupport: "adequate",
    learningCurve: "steep",
    deploymentModel: "diy",
    protocols: ["mcp", "a2a"],
  },
};

export interface FrameworkSelectionCriteria {
  awsIntegrationNeeded: boolean;
  multimodalRequired: boolean;
  multiAgentRequired: boolean;
  ragFocused: boolean;
  preferManagedDeployment: boolean;
  teamExpertise: "beginner" | "intermediate" | "advanced";
}

/**
 * Recommend frameworks based on selection criteria.
 */
export function selectFramework(
  criteria: FrameworkSelectionCriteria
): { framework: FrameworkProfile; score: number; reasoning: string }[] {
  const profiles = Object.values(FRAMEWORK_PROFILES);
  const scored = profiles.map((p) => {
    let score = 0;
    const reasons: string[] = [];

    if (criteria.awsIntegrationNeeded) {
      const awsScores = { strongest: 30, strong: 20, adequate: 10, weak: 0 };
      score += awsScores[p.awsIntegration];
      if (p.awsIntegration === "strongest") reasons.push("best-aws-integration");
    }

    if (criteria.multimodalRequired) {
      const mmScores = { strongest: 25, strong: 15, adequate: 5, weak: 0 };
      score += mmScores[p.multimodalSupport];
    }

    if (criteria.multiAgentRequired && ["crewai", "autogen", "strands_agents"].includes(p.framework)) {
      score += 20;
      reasons.push("multi-agent-capable");
    }

    if (criteria.ragFocused && p.framework === "llamaindex") {
      score += 30;
      reasons.push("rag-specialized");
    }

    if (criteria.preferManagedDeployment && p.deploymentModel === "platform") {
      score += 15;
      reasons.push("managed-deployment");
    }

    const curveMatch = { beginner: { low: 20, moderate: 10, steep: 0 }, intermediate: { low: 15, moderate: 20, steep: 10 }, advanced: { low: 5, moderate: 10, steep: 15 } };
    score += curveMatch[criteria.teamExpertise][p.learningCurve];

    return { framework: p, score, reasoning: reasons.join(", ") || "baseline" };
  });

  return scored.sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════
// 6. SECURITY BEST PRACTICES
// ═══════════════════════════════════════════════

export interface ToolSecurityPolicy {
  authentication: "oauth2" | "api_key" | "mtls" | "iam";
  permissionScoping: boolean;
  inputValidation: boolean;
  outputSanitization: boolean;
  auditLogging: boolean;
  dataEncryption: boolean;
  rateLimiting: boolean;
}

export const DEFAULT_TOOL_SECURITY: ToolSecurityPolicy = {
  authentication: "oauth2",
  permissionScoping: true,
  inputValidation: true,
  outputSanitization: true,
  auditLogging: true,
  dataEncryption: true,
  rateLimiting: true,
};

/**
 * Validate that a tool configuration meets security requirements.
 */
export function validateToolSecurity(
  tool: MCPToolDefinition,
  policy: ToolSecurityPolicy = DEFAULT_TOOL_SECURITY
): { compliant: boolean; violations: string[] } {
  const violations: string[] = [];

  if (policy.authentication !== "api_key" && !tool.auth) {
    violations.push("Missing authentication configuration");
  }

  if (policy.inputValidation && (!tool.inputSchema || Object.keys(tool.inputSchema).length === 0)) {
    violations.push("Input schema required for validation");
  }

  if (tool.transport === "http_remote" && !tool.endpoint) {
    violations.push("Remote tools require endpoint URL");
  }

  return { compliant: violations.length === 0, violations };
}

// ═══════════════════════════════════════════════
// 7. UNIFIED CONTEXT FOR LLM
// ═══════════════════════════════════════════════

/**
 * Format complete agentic context for LLM consumption.
 * Includes active protocols, tools, framework info, and security posture.
 */
export function formatAgenticContextForLLM(): string {
  const lines: string[] = ["═══ AGENTIC INFRASTRUCTURE CONTEXT ═══"];

  // A2A registry
  const agents = getA2ARegistrySnapshot();
  if (agents.length > 0) {
    lines.push(`\n▸ A2A Registry: ${agents.length} agents`);
    for (const a of agents.slice(0, 5)) {
      lines.push(`  - ${a.agentName}: can=[${a.can.join(",")}] latency=${a.meta.latencyMs}ms`);
    }
  }

  // MCP tools
  const tools = discoverMCPTools();
  if (tools.length > 0) {
    lines.push(`\n▸ MCP Tools: ${tools.length} registered`);
    for (const t of tools.slice(0, 5)) {
      lines.push(`  - ${t.name}: ${t.description} (${t.transport})`);
    }
  }

  // Meta-tools
  const metas = getMetaTools();
  if (metas.length > 0) {
    lines.push(`\n▸ Meta-Tools: ${metas.length} (${[...new Set(metas.map((m) => m.type))].join(", ")})`);
  }

  // Active sessions
  const sessions = [...agentCoreSessions.values()].filter((s) => s.status === "active");
  if (sessions.length > 0) {
    lines.push(`\n▸ AgentCore Sessions: ${sessions.length} active`);
  }

  return lines.join("\n");
}

/**
 * Reset all registries (for testing).
 */
export function resetAllAgenticState(): void {
  resetA2ARegistry();
  resetMCPRegistry();
  agentCoreSessions = new Map();
  agentCoreMemory = new Map();
  agentCoreGateways = new Map();
  agentIdentities = new Map();
  agentCoreTraces = [];
  metaToolRegistry = new Map();
}
