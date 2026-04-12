/**
 * ─── Agentic Patterns Engine ───
 *
 * Implements ALL 12 Agent Patterns + 5 LLM Workflows + 5 Agentic Workflow Patterns
 * from AWS Prescriptive Guidance: "Agentic AI patterns and workflows on AWS" (July 2025)
 *
 * Agent Patterns:
 *   1. Basic Reasoning Agent
 *   2. RAG Agent
 *   3. Tool-Based Agent (Function Calling)
 *   4. Tool-Based Agent (Servers/MCP)
 *   5. Computer-Use Agent
 *   6. Coding Agent
 *   7. Speech & Voice Agent
 *   8. Workflow Orchestration Agent
 *   9. Memory-Augmented Agent
 *  10. Simulation & Test-Bed Agent
 *  11. Observer & Monitoring Agent
 *  12. Multi-Agent Collaboration
 *
 * LLM Workflows:
 *   1. Prompt Chaining
 *   2. Routing (Dynamic Dispatch)
 *   3. Parallelization (Scatter-Gather)
 *   4. Orchestration (Saga)
 *   5. Evaluator / Reflect-Refine Loop
 *
 * Agentic Workflow Patterns:
 *   1. Saga Choreography → Agent Choreography
 *   2. Dynamic Dispatch → Agent Router
 *   3. Scatter-Gather → Agent Parallelization
 *   4. Event Orchestration → Supervisor
 *   5. Feedback Control → Evaluator
 *
 * Ref: AWS Prescriptive Guidance – Agentic AI Patterns (2025)
 */

// ═══════════════════════════════════════════════
// 1. AGENT PATTERN DEFINITIONS
// ═══════════════════════════════════════════════

export type AgentPatternType =
  | "basic_reasoning"
  | "rag"
  | "tool_function_calling"
  | "tool_server"
  | "computer_use"
  | "coding"
  | "speech_voice"
  | "workflow_orchestration"
  | "memory_augmented"
  | "simulation_testbed"
  | "observer_monitoring"
  | "multi_agent_collaboration";

export type LLMWorkflowType =
  | "prompt_chaining"
  | "routing"
  | "parallelization"
  | "orchestration"
  | "evaluator_reflect_refine";

export type AgenticWorkflowPattern =
  | "saga_choreography"
  | "dynamic_dispatch"
  | "scatter_gather"
  | "saga_orchestration"
  | "feedback_control_evaluator";

export interface AgentCapability {
  name: string;
  description: string;
  requires: string[];
}

export interface AgentPatternDefinition {
  type: AgentPatternType;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  limitations: string[];
  useCases: string[];
  requiresMemory: boolean;
  requiresTools: boolean;
  requiresVLM: boolean;
  supportedWorkflows: LLMWorkflowType[];
  composableWith: AgentPatternType[];
}

/**
 * Complete registry of all 12 Agent Patterns.
 * Each pattern follows the Perceive → Reason → Act model.
 */
export const AGENT_PATTERN_REGISTRY: Record<AgentPatternType, AgentPatternDefinition> = {
  basic_reasoning: {
    type: "basic_reasoning",
    name: "Basic Reasoning Agent",
    description: "Simplest form of agentic AI: accepts input, processes via structured prompts, generates responses. Stateless, lightweight, composable.",
    capabilities: [
      { name: "natural_language_input", description: "Accepts NL or structured input", requires: [] },
      { name: "prompt_engineering", description: "Uses prompt templates to guide behavior", requires: [] },
      { name: "stateless_scaling", description: "Stateless and horizontally scalable", requires: [] },
    ],
    limitations: ["No memory or historical awareness", "No external tool interaction", "Limited to pre-trained knowledge"],
    useCases: ["Conversational Q&A", "Policy explanations", "Classification/labeling/scoring", "Lightweight chatbot flows"],
    requiresMemory: false,
    requiresTools: false,
    requiresVLM: false,
    supportedWorkflows: ["prompt_chaining", "routing"],
    composableWith: ["rag", "tool_function_calling", "memory_augmented"],
  },

  rag: {
    type: "rag",
    name: "RAG Agent (Retrieval-Augmented Generation)",
    description: "Extends reasoning with external knowledge retrieval. Searches vector stores, databases, or document indexes before LLM inference for fact-grounded output.",
    capabilities: [
      { name: "semantic_search", description: "Queries knowledge sources via semantic/keyword matching", requires: ["knowledge_base"] },
      { name: "context_augmentation", description: "Augments LLM prompt with retrieved passages", requires: ["knowledge_base"] },
      { name: "fact_grounding", description: "Grounds output in domain-specific, up-to-date information", requires: ["knowledge_base"] },
    ],
    limitations: ["Quality depends on retrieval accuracy", "Retrieval latency", "Context window limits"],
    useCases: ["Enterprise knowledge assistants", "Regulatory compliance bots", "Customer support copilots", "Developer documentation agents"],
    requiresMemory: false,
    requiresTools: false,
    requiresVLM: false,
    supportedWorkflows: ["prompt_chaining", "routing", "evaluator_reflect_refine"],
    composableWith: ["basic_reasoning", "tool_function_calling", "memory_augmented"],
  },

  tool_function_calling: {
    type: "tool_function_calling",
    name: "Tool-Based Agent (Function Calling)",
    description: "Extends reasoning by invoking external functions/APIs. LLM decides which tool to use, generates call arguments, and incorporates tool output into reasoning loop.",
    capabilities: [
      { name: "dynamic_tool_selection", description: "LLM selects tools based on task context", requires: ["tool_registry"] },
      { name: "schema_prompting", description: "Uses OpenAPI/JSON schema for tool interfaces", requires: ["tool_registry"] },
      { name: "result_chaining", description: "Chains tool outputs into subsequent reasoning steps", requires: [] },
    ],
    limitations: ["Depends on tool availability", "May hallucinate tool arguments", "Latency from tool execution"],
    useCases: ["Virtual assistants with external data", "Financial calculators", "API-based knowledge workers"],
    requiresMemory: false,
    requiresTools: true,
    requiresVLM: false,
    supportedWorkflows: ["prompt_chaining", "routing", "orchestration"],
    composableWith: ["basic_reasoning", "rag", "tool_server", "memory_augmented"],
  },

  tool_server: {
    type: "tool_server",
    name: "Tool-Based Agent (Server/MCP)",
    description: "Delegates tool execution to external servers with dedicated runtimes. Supports multitool chaining, isolated execution, and specialized reasoning via MCP.",
    capabilities: [
      { name: "server_delegation", description: "Outsources tool logic to external server processes", requires: ["tool_server"] },
      { name: "subagent_execution", description: "Tool servers may run their own subagents with LLM reasoning", requires: ["tool_server"] },
      { name: "isolated_execution", description: "Tool logic runs in isolated, scalable environments", requires: ["tool_server"] },
      { name: "mcp_protocol", description: "Uses Model Context Protocol for standardized tool communication", requires: ["mcp_server"] },
    ],
    limitations: ["Network latency", "Server availability", "More complex deployment"],
    useCases: ["Model chains (LLM+vision+code)", "AI automation pipelines", "DevOps assistants", "Complex financial simulations"],
    requiresMemory: false,
    requiresTools: true,
    requiresVLM: false,
    supportedWorkflows: ["orchestration", "parallelization"],
    composableWith: ["tool_function_calling", "workflow_orchestration", "multi_agent_collaboration"],
  },

  computer_use: {
    type: "computer_use",
    name: "Computer-Use Agent",
    description: "Simulates or controls digital environments (browsers, terminals, file systems). Combines LLM reasoning with VLMs to interact with visual/text interfaces.",
    capabilities: [
      { name: "visual_reasoning", description: "VLM observes screen state and identifies actionable items", requires: ["vlm_model"] },
      { name: "tool_server_control", description: "Controls browsers, editors, CLIs via tool servers", requires: ["tool_server"] },
      { name: "memory_persistence", description: "Short-term and long-term memory for state tracking", requires: ["memory_store"] },
      { name: "multistep_autonomy", description: "Autonomously executes multi-step workflows", requires: [] },
    ],
    limitations: ["Requires VLM capability", "UI changes may break workflows", "Resource intensive"],
    useCases: ["AI developers in IDEs", "RPA enhanced with reasoning", "Software testing/QA", "Accessibility agents"],
    requiresMemory: true,
    requiresTools: true,
    requiresVLM: true,
    supportedWorkflows: ["prompt_chaining", "orchestration", "evaluator_reflect_refine"],
    composableWith: ["coding", "memory_augmented", "tool_server"],
  },

  coding: {
    type: "coding",
    name: "Coding Agent",
    description: "Reasons about programming tasks, generates/modifies code, and interacts with developer environments. Extracts IDE context (files, errors, syntax trees) for high-contextual reasoning.",
    capabilities: [
      { name: "ide_context_extraction", description: "Gathers active files, cursor position, symbol tables", requires: ["ide_bridge"] },
      { name: "code_generation", description: "Generates code from task descriptions", requires: [] },
      { name: "iterative_refinement", description: "Iterates on goals and feedback (plan → act)", requires: [] },
      { name: "test_generation", description: "Generates and runs test cases", requires: ["execution_sandbox"] },
    ],
    limitations: ["Context window limits for large codebases", "May introduce bugs", "Needs sandboxed execution"],
    useCases: ["Code generation", "Refactoring/optimization", "Test generation", "Debugging", "Documentation"],
    requiresMemory: false,
    requiresTools: true,
    requiresVLM: false,
    supportedWorkflows: ["prompt_chaining", "evaluator_reflect_refine"],
    composableWith: ["tool_function_calling", "computer_use", "memory_augmented"],
  },

  speech_voice: {
    type: "speech_voice",
    name: "Speech & Voice Agent",
    description: "Interacts through spoken dialogue, integrating STT, NLU, and TTS. Supports streaming, telephony (DTMF), and multilingual I/O.",
    capabilities: [
      { name: "speech_to_text", description: "Converts audio to text in real-time", requires: ["stt_engine"] },
      { name: "text_to_speech", description: "Converts response text to natural speech", requires: ["tts_engine"] },
      { name: "streaming_context", description: "Manages real-time audio I/O with session awareness", requires: ["streaming_interface"] },
      { name: "telephony_integration", description: "Handles DTMF, session routing, media transport", requires: ["telephony_bridge"] },
    ],
    limitations: ["Real-time latency requirements", "Accent/language challenges", "Background noise"],
    useCases: ["Conversational IVR systems", "Virtual receptionists", "Voice helpdesk agents", "Voice-driven smart home"],
    requiresMemory: false,
    requiresTools: false,
    requiresVLM: false,
    supportedWorkflows: ["prompt_chaining", "routing"],
    composableWith: ["basic_reasoning", "rag", "tool_function_calling", "memory_augmented"],
  },

  workflow_orchestration: {
    type: "workflow_orchestration",
    name: "Workflow Orchestration Agent",
    description: "Manages and coordinates multistep tasks across distributed systems. Delegates to subagents, maintains execution context, adapts based on intermediate results.",
    capabilities: [
      { name: "agent_composition", description: "Supervisors, collaborator agents, and tools", requires: ["agent_registry"] },
      { name: "event_driven_execution", description: "Triggers based on events or schedules", requires: ["event_bus"] },
      { name: "state_tracking", description: "Maintains state and memory over time", requires: ["state_store"] },
      { name: "dynamic_chaining", description: "Dynamic agent selection and chaining", requires: ["agent_registry"] },
    ],
    limitations: ["Complexity of state management", "Debugging multi-agent flows", "Latency from chaining"],
    useCases: ["Multistep automation", "Customer service routing", "Human-AI coordination", "Enterprise process automation"],
    requiresMemory: true,
    requiresTools: true,
    requiresVLM: false,
    supportedWorkflows: ["orchestration", "parallelization", "evaluator_reflect_refine"],
    composableWith: ["tool_server", "multi_agent_collaboration", "memory_augmented", "observer_monitoring"],
  },

  memory_augmented: {
    type: "memory_augmented",
    name: "Memory-Augmented Agent",
    description: "Enhanced with short-term and long-term memory for context continuity, personalization, and strategic reasoning across sessions.",
    capabilities: [
      { name: "short_term_memory", description: "Recent conversational history and task context", requires: ["memory_store"] },
      { name: "long_term_memory", description: "Historical insights, user preferences, learned concepts", requires: ["vector_store"] },
      { name: "memory_injection", description: "Injects memory context into LLM prompts", requires: [] },
      { name: "adaptive_learning", description: "Updates memory from action outcomes", requires: ["memory_store"] },
    ],
    limitations: ["Memory retrieval accuracy", "Storage costs", "Stale memory risks"],
    useCases: ["Copilots remembering preferences", "Coding agents tracking codebase", "Digital twins evolving from knowledge"],
    requiresMemory: true,
    requiresTools: false,
    requiresVLM: false,
    supportedWorkflows: ["prompt_chaining", "orchestration", "evaluator_reflect_refine"],
    composableWith: ["basic_reasoning", "rag", "coding", "workflow_orchestration"],
  },

  simulation_testbed: {
    type: "simulation_testbed",
    name: "Simulation & Test-Bed Agent",
    description: "Operates within virtualized environments to reason, act, and learn. Supports RL, autonomous decision evaluation, and emergent behavior testing.",
    capabilities: [
      { name: "environment_simulation", description: "Operates in 3D worlds, physics engines, or CLI sandboxes", requires: ["simulation_env"] },
      { name: "reinforcement_learning", description: "Trial-and-error learning with reward signals", requires: ["rl_framework"] },
      { name: "goal_memory", description: "Maintains long-term and short-term goals", requires: ["memory_store"] },
      { name: "closed_loop_control", description: "Receives environment feedback and adjusts behavior", requires: ["simulation_env"] },
    ],
    limitations: ["Simulation fidelity gap", "Compute intensive", "Transfer to real-world challenges"],
    useCases: ["Robotics/drone training", "Autonomous vehicle simulation", "DevOps test-bed scenarios", "Safety validation"],
    requiresMemory: true,
    requiresTools: true,
    requiresVLM: false,
    supportedWorkflows: ["orchestration", "evaluator_reflect_refine"],
    composableWith: ["memory_augmented", "observer_monitoring", "multi_agent_collaboration"],
  },

  observer_monitoring: {
    type: "observer_monitoring",
    name: "Observer & Monitoring Agent",
    description: "Passively observes systems and interactions to detect patterns, generate insights, and trigger actions. Non-invasive, event-driven, AI-augmented observability.",
    capabilities: [
      { name: "telemetry_ingestion", description: "Ingests logs, metrics, traces from multiple sources", requires: ["event_bus"] },
      { name: "context_parsing", description: "Parses and enriches raw input with metadata", requires: [] },
      { name: "anomaly_detection", description: "LLM-driven anomaly identification and correlation", requires: [] },
      { name: "alert_escalation", description: "Triggers alerts, reports, or automatic remediation", requires: ["alert_system"] },
      { name: "audit_logging", description: "Stores events for compliance and future learning", requires: ["audit_store"] },
    ],
    limitations: ["Passive only (doesn't act directly)", "False positive management", "High volume data processing"],
    useCases: ["AI-augmented observability", "Model drift detection", "Compliance monitoring", "Code review monitoring"],
    requiresMemory: true,
    requiresTools: false,
    requiresVLM: false,
    supportedWorkflows: ["routing", "evaluator_reflect_refine"],
    composableWith: ["workflow_orchestration", "multi_agent_collaboration"],
  },

  multi_agent_collaboration: {
    type: "multi_agent_collaboration",
    name: "Multi-Agent Collaboration",
    description: "Multiple autonomous agents with distinct roles negotiate and coordinate to solve complex tasks. Peer-to-peer or emergent coordination (vs centralized workflow orchestration).",
    capabilities: [
      { name: "role_assignment", description: "Agents self-assign or are delegated specialized roles", requires: ["agent_registry"] },
      { name: "inter_agent_communication", description: "Agents communicate via shared memory or messaging", requires: ["message_bus"] },
      { name: "parallel_reasoning", description: "Multiple agents reason simultaneously on subtasks", requires: [] },
      { name: "emergent_coordination", description: "Behavior emerges from agent interactions", requires: [] },
      { name: "supervisor_validation", description: "Optional supervising agent validates synthesized output", requires: [] },
    ],
    limitations: ["Coordination overhead", "Emergent behavior unpredictability", "Debugging complexity"],
    useCases: ["Autonomous research teams", "Software development (planner+coder+tester)", "Negotiation/bidding", "Multimodal tasks"],
    requiresMemory: true,
    requiresTools: true,
    requiresVLM: false,
    supportedWorkflows: ["parallelization", "orchestration", "evaluator_reflect_refine"],
    composableWith: ["workflow_orchestration", "tool_server", "memory_augmented", "observer_monitoring"],
  },
};

// ═══════════════════════════════════════════════
// 2. PATTERN SELECTION ENGINE
// ═══════════════════════════════════════════════

export interface PatternSelectionCriteria {
  requiresMemory?: boolean;
  requiresTools?: boolean;
  requiresVLM?: boolean;
  taskComplexity: "simple" | "moderate" | "complex" | "multi_domain";
  interactionSurface: "text" | "voice" | "visual" | "api" | "multi_modal";
  latencyTolerance: "real_time" | "near_real_time" | "batch";
  autonomyLevel: "human_in_loop" | "semi_autonomous" | "fully_autonomous";
}

/**
 * Recommends agent patterns based on selection criteria.
 * Returns ranked list with scores.
 */
export function selectAgentPattern(
  criteria: PatternSelectionCriteria
): { pattern: AgentPatternDefinition; score: number; reasoning: string }[] {
  const patterns = Object.values(AGENT_PATTERN_REGISTRY);
  const scored = patterns.map((p) => {
    let score = 0;
    const reasons: string[] = [];

    // Memory alignment
    if (criteria.requiresMemory && p.requiresMemory) { score += 20; reasons.push("memory-aligned"); }
    if (!criteria.requiresMemory && !p.requiresMemory) { score += 10; reasons.push("no-memory-overhead"); }

    // Tools alignment
    if (criteria.requiresTools && p.requiresTools) { score += 20; reasons.push("tool-capable"); }
    if (!criteria.requiresTools && !p.requiresTools) { score += 10; reasons.push("no-tool-dependency"); }

    // VLM alignment
    if (criteria.requiresVLM && p.requiresVLM) { score += 15; reasons.push("vlm-capable"); }

    // Complexity scoring
    switch (criteria.taskComplexity) {
      case "simple":
        if (["basic_reasoning", "rag"].includes(p.type)) { score += 25; reasons.push("suited-for-simple-tasks"); }
        break;
      case "moderate":
        if (["tool_function_calling", "memory_augmented", "coding"].includes(p.type)) { score += 25; reasons.push("suited-for-moderate-tasks"); }
        break;
      case "complex":
        if (["workflow_orchestration", "tool_server", "computer_use"].includes(p.type)) { score += 25; reasons.push("suited-for-complex-tasks"); }
        break;
      case "multi_domain":
        if (["multi_agent_collaboration", "workflow_orchestration"].includes(p.type)) { score += 30; reasons.push("suited-for-multi-domain"); }
        break;
    }

    // Interaction surface
    if (criteria.interactionSurface === "voice" && p.type === "speech_voice") { score += 30; reasons.push("voice-optimized"); }
    if (criteria.interactionSurface === "visual" && p.requiresVLM) { score += 25; reasons.push("visual-capable"); }
    if (criteria.interactionSurface === "api" && ["tool_function_calling", "tool_server"].includes(p.type)) { score += 20; reasons.push("api-oriented"); }

    // Latency
    if (criteria.latencyTolerance === "real_time" && ["basic_reasoning", "speech_voice"].includes(p.type)) { score += 15; reasons.push("low-latency"); }
    if (criteria.latencyTolerance === "batch" && ["simulation_testbed", "observer_monitoring"].includes(p.type)) { score += 15; reasons.push("batch-suitable"); }

    // Autonomy
    if (criteria.autonomyLevel === "fully_autonomous" && ["multi_agent_collaboration", "workflow_orchestration", "simulation_testbed"].includes(p.type)) {
      score += 20; reasons.push("full-autonomy");
    }

    return { pattern: p, score, reasoning: reasons.join(", ") };
  });

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Get composable patterns that can extend a given base pattern.
 */
export function getComposablePatterns(basePattern: AgentPatternType): AgentPatternDefinition[] {
  const base = AGENT_PATTERN_REGISTRY[basePattern];
  return base.composableWith.map((t) => AGENT_PATTERN_REGISTRY[t]);
}

// ═══════════════════════════════════════════════
// 3. LLM WORKFLOW ENGINE
// ═══════════════════════════════════════════════

export interface WorkflowStep {
  id: string;
  name: string;
  prompt: string;
  dependsOn: string[];
  timeout?: number;
}

export interface WorkflowResult<T = unknown> {
  stepId: string;
  output: T;
  durationMs: number;
  tokensUsed?: number;
  error?: string;
}

export interface ChainedWorkflowConfig {
  steps: WorkflowStep[];
  passOutputAsContext: boolean;
  earlyExit?: (result: WorkflowResult) => boolean;
}

/**
 * PROMPT CHAINING: Sequential decomposition of complex tasks.
 * Output of step N becomes context for step N+1.
 * Ref: AWS Patterns doc p46-47
 */
export async function runPromptChain(
  config: ChainedWorkflowConfig,
  executor: (prompt: string, context: string) => Promise<string>
): Promise<WorkflowResult[]> {
  const results: WorkflowResult[] = [];
  let accumulatedContext = "";

  for (const step of config.steps) {
    const start = Date.now();
    try {
      const prompt = config.passOutputAsContext
        ? `${step.prompt}\n\nPrevious context:\n${accumulatedContext}`
        : step.prompt;
      const output = await executor(prompt, accumulatedContext);
      const result: WorkflowResult = {
        stepId: step.id,
        output,
        durationMs: Date.now() - start,
      };
      results.push(result);
      accumulatedContext += `\n[${step.name}]: ${output}`;

      if (config.earlyExit?.(result)) break;
    } catch (e: any) {
      results.push({ stepId: step.id, output: null, durationMs: Date.now() - start, error: e.message });
      break;
    }
  }
  return results;
}

/**
 * ROUTING (Dynamic Dispatch): LLM-based classification routes input to specialized handlers.
 * Ref: AWS Patterns doc p48, p61-65
 */
export interface RoutingConfig {
  routes: { name: string; description: string; handler: (input: string) => Promise<string> }[];
  classifier: (input: string, routeDescriptions: string[]) => Promise<string>;
  fallback?: (input: string) => Promise<string>;
}

export async function runRouting(
  input: string,
  config: RoutingConfig
): Promise<{ route: string; output: string; durationMs: number }> {
  const start = Date.now();
  const descriptions = config.routes.map((r) => `${r.name}: ${r.description}`);
  const selectedRoute = await config.classifier(input, descriptions);

  const matched = config.routes.find((r) => r.name === selectedRoute);
  const handler = matched?.handler ?? config.fallback ?? (() => Promise.resolve("No route matched"));
  const output = await handler(input);

  return { route: matched?.name ?? "fallback", output, durationMs: Date.now() - start };
}

/**
 * PARALLELIZATION (Scatter-Gather): Fan-out to multiple workers, aggregate results.
 * Ref: AWS Patterns doc p50, p65-69
 */
export interface ParallelizationConfig {
  workers: { name: string; executor: (input: string) => Promise<string> }[];
  aggregator: (results: { worker: string; output: string }[]) => Promise<string>;
  timeoutMs?: number;
}

export async function runParallelization(
  input: string,
  config: ParallelizationConfig
): Promise<{ workerResults: { worker: string; output: string }[]; aggregated: string; durationMs: number }> {
  const start = Date.now();
  const timeout = config.timeoutMs ?? 30000;

  const workerPromises = config.workers.map(async (w) => {
    try {
      const output = await Promise.race([
        w.executor(input),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeout)),
      ]);
      return { worker: w.name, output };
    } catch {
      return { worker: w.name, output: `[error: worker ${w.name} failed]` };
    }
  });

  const workerResults = await Promise.all(workerPromises);
  const aggregated = await config.aggregator(workerResults);

  return { workerResults, aggregated, durationMs: Date.now() - start };
}

/**
 * ORCHESTRATION (Saga): Central orchestrator manages multi-step workflow with
 * conditional branching and compensation steps.
 * Ref: AWS Patterns doc p51, p69-73
 */
export interface OrchestrationStep {
  id: string;
  name: string;
  execute: (context: Record<string, unknown>) => Promise<unknown>;
  compensate?: (context: Record<string, unknown>) => Promise<void>;
  condition?: (context: Record<string, unknown>) => boolean;
  next: string | null;
  onError?: string;
}

export interface OrchestrationConfig {
  steps: OrchestrationStep[];
  entryPoint: string;
  maxSteps?: number;
}

export async function runOrchestration(
  config: OrchestrationConfig,
  initialContext: Record<string, unknown> = {}
): Promise<{ context: Record<string, unknown>; trace: string[]; success: boolean }> {
  const context = { ...initialContext };
  const trace: string[] = [];
  const executed: OrchestrationStep[] = [];
  let currentId: string | null = config.entryPoint;
  let stepCount = 0;
  const maxSteps = config.maxSteps ?? 50;

  while (currentId && stepCount < maxSteps) {
    const step = config.steps.find((s) => s.id === currentId);
    if (!step) { trace.push(`step_not_found:${currentId}`); break; }

    if (step.condition && !step.condition(context)) {
      trace.push(`skipped:${step.name}`);
      currentId = step.next;
      stepCount++;
      continue;
    }

    try {
      const result = await step.execute(context);
      context[step.id] = result;
      trace.push(`executed:${step.name}`);
      executed.push(step);
      currentId = step.next;
    } catch (e: any) {
      trace.push(`error:${step.name}:${e.message}`);
      // Compensate executed steps in reverse
      for (const s of executed.reverse()) {
        if (s.compensate) {
          try {
            await s.compensate(context);
            trace.push(`compensated:${s.name}`);
          } catch { trace.push(`compensation_failed:${s.name}`); }
        }
      }
      currentId = step.onError ?? null;
      if (!currentId) return { context, trace, success: false };
    }
    stepCount++;
  }

  return { context, trace, success: true };
}

/**
 * EVALUATOR / REFLECT-REFINE LOOP: LLM generates draft, evaluator scores it,
 * refiner improves iteratively until quality threshold met.
 * Ref: AWS Patterns doc p51-53, p73-76
 */
export interface EvaluatorConfig {
  maxIterations: number;
  qualityThreshold: number;
  drafter: (prompt: string, previousFeedback?: string) => Promise<string>;
  evaluator: (draft: string) => Promise<{ score: number; feedback: string }>;
  refiner?: (draft: string, feedback: string) => Promise<string>;
}

export interface EvaluatorResult {
  finalDraft: string;
  iterations: number;
  finalScore: number;
  history: { draft: string; score: number; feedback: string }[];
  durationMs: number;
}

export async function runEvaluatorLoop(
  prompt: string,
  config: EvaluatorConfig
): Promise<EvaluatorResult> {
  const start = Date.now();
  const history: EvaluatorResult["history"] = [];
  let currentDraft = await config.drafter(prompt);

  for (let i = 0; i < config.maxIterations; i++) {
    const evaluation = await config.evaluator(currentDraft);
    history.push({ draft: currentDraft, score: evaluation.score, feedback: evaluation.feedback });

    if (evaluation.score >= config.qualityThreshold) {
      return { finalDraft: currentDraft, iterations: i + 1, finalScore: evaluation.score, history, durationMs: Date.now() - start };
    }

    if (config.refiner) {
      currentDraft = await config.refiner(currentDraft, evaluation.feedback);
    } else {
      currentDraft = await config.drafter(prompt, evaluation.feedback);
    }
  }

  const lastScore = history[history.length - 1]?.score ?? 0;
  return { finalDraft: currentDraft, iterations: config.maxIterations, finalScore: lastScore, history, durationMs: Date.now() - start };
}

// ═══════════════════════════════════════════════
// 4. OBSERVER & MONITORING AGENT ENGINE
// ═══════════════════════════════════════════════

export type ObservationSeverity = "info" | "warning" | "critical" | "anomaly";

export interface TelemetryEvent {
  id: string;
  source: string;
  type: "log" | "metric" | "trace" | "security" | "custom";
  data: Record<string, unknown>;
  timestamp: number;
  traceId?: string;
}

export interface ObservationResult {
  eventId: string;
  severity: ObservationSeverity;
  summary: string;
  anomalyScore: number;
  suggestedAction?: string;
  correlatedEvents: string[];
}

export interface ObserverAgentConfig {
  anomalyThreshold: number;
  windowSizeMs: number;
  maxBufferSize: number;
  alertHandler?: (obs: ObservationResult) => void;
}

const DEFAULT_OBSERVER_CONFIG: ObserverAgentConfig = {
  anomalyThreshold: 0.7,
  windowSizeMs: 60_000,
  maxBufferSize: 1000,
};

/** In-memory observer state */
let observerBuffer: TelemetryEvent[] = [];
let observerConfig = { ...DEFAULT_OBSERVER_CONFIG };
let observationLog: ObservationResult[] = [];

export function configureObserver(config: Partial<ObserverAgentConfig>): void {
  observerConfig = { ...observerConfig, ...config };
}

/**
 * Ingest telemetry events. Performs anomaly scoring and context parsing.
 */
export function ingestTelemetry(event: TelemetryEvent): ObservationResult {
  observerBuffer.push(event);
  if (observerBuffer.length > observerConfig.maxBufferSize) {
    observerBuffer = observerBuffer.slice(-observerConfig.maxBufferSize);
  }

  // Simple anomaly scoring based on frequency and deviation
  const windowStart = Date.now() - observerConfig.windowSizeMs;
  const windowEvents = observerBuffer.filter(
    (e) => e.timestamp >= windowStart && e.source === event.source
  );

  const frequency = windowEvents.length;
  const anomalyScore = Math.min(1, frequency / (observerConfig.maxBufferSize * 0.1));

  const severity: ObservationSeverity =
    anomalyScore >= 0.9 ? "critical" :
    anomalyScore >= observerConfig.anomalyThreshold ? "anomaly" :
    anomalyScore >= 0.4 ? "warning" : "info";

  // Find correlated events (same trace or similar source)
  const correlated = windowEvents
    .filter((e) => e.id !== event.id && (e.traceId === event.traceId || e.type === event.type))
    .map((e) => e.id)
    .slice(0, 10);

  const observation: ObservationResult = {
    eventId: event.id,
    severity,
    summary: `[${event.type}] ${event.source}: ${severity} (score=${anomalyScore.toFixed(2)}, correlated=${correlated.length})`,
    anomalyScore,
    suggestedAction: severity === "critical" ? "escalate_immediately" : severity === "anomaly" ? "investigate" : undefined,
    correlatedEvents: correlated,
  };

  observationLog.push(observation);
  if (observationLog.length > 5000) observationLog = observationLog.slice(-2500);

  if (severity === "critical" || severity === "anomaly") {
    observerConfig.alertHandler?.(observation);
  }

  return observation;
}

export function getObservationLog(): ObservationResult[] {
  return [...observationLog];
}

export function getObserverStats(): {
  totalEvents: number;
  criticalCount: number;
  anomalyCount: number;
  warningCount: number;
  topSources: { source: string; count: number }[];
} {
  const sourceCounts = new Map<string, number>();
  for (const e of observerBuffer) {
    sourceCounts.set(e.source, (sourceCounts.get(e.source) ?? 0) + 1);
  }
  const topSources = [...sourceCounts.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalEvents: observerBuffer.length,
    criticalCount: observationLog.filter((o) => o.severity === "critical").length,
    anomalyCount: observationLog.filter((o) => o.severity === "anomaly").length,
    warningCount: observationLog.filter((o) => o.severity === "warning").length,
    topSources,
  };
}

export function resetObserver(): void {
  observerBuffer = [];
  observationLog = [];
  observerConfig = { ...DEFAULT_OBSERVER_CONFIG };
}

// ═══════════════════════════════════════════════
// 5. SIMULATION & TEST-BED ENGINE
// ═══════════════════════════════════════════════

export type SimulationStatus = "idle" | "running" | "paused" | "completed" | "failed";

export interface SimulationGoal {
  id: string;
  description: string;
  priority: number;
  successCriteria: (state: SimulationState) => boolean;
}

export interface SimulationAction {
  id: string;
  name: string;
  execute: (state: SimulationState) => Promise<SimulationState>;
}

export interface SimulationState {
  id: string;
  step: number;
  status: SimulationStatus;
  environment: Record<string, unknown>;
  goals: SimulationGoal[];
  memory: { shortTerm: unknown[]; longTerm: Record<string, unknown> };
  actionHistory: { step: number; action: string; reward: number }[];
  totalReward: number;
  startedAt: number;
}

export interface SimulationConfig {
  maxSteps: number;
  goals: SimulationGoal[];
  actions: SimulationAction[];
  initialEnvironment: Record<string, unknown>;
  rewardFunction: (prevState: SimulationState, action: string, nextState: SimulationState) => number;
  planner: (state: SimulationState) => Promise<string>;
}

/**
 * Run a simulation episode: Init → Perceive → Plan → Act → Evaluate → Learn
 * Ref: AWS Patterns doc p32-35
 */
export async function runSimulation(config: SimulationConfig): Promise<SimulationState> {
  let state: SimulationState = {
    id: `sim-${Date.now()}`,
    step: 0,
    status: "running",
    environment: { ...config.initialEnvironment },
    goals: config.goals,
    memory: { shortTerm: [], longTerm: {} },
    actionHistory: [],
    totalReward: 0,
    startedAt: Date.now(),
  };

  for (let i = 0; i < config.maxSteps; i++) {
    // Check goal completion
    const allGoalsMet = config.goals.every((g) => g.successCriteria(state));
    if (allGoalsMet) { state.status = "completed"; break; }

    // Plan: LLM or rule-based planner selects action
    const actionName = await config.planner(state);
    const action = config.actions.find((a) => a.name === actionName);
    if (!action) {
      state.memory.shortTerm.push({ step: i, error: `unknown_action:${actionName}` });
      continue;
    }

    // Act
    const prevState = { ...state };
    try {
      state = await action.execute(state);
      state.step = i + 1;
    } catch {
      state.status = "failed";
      break;
    }

    // Evaluate
    const reward = config.rewardFunction(prevState, actionName, state);
    state.totalReward += reward;
    state.actionHistory.push({ step: i, action: actionName, reward });

    // Learn (store in memory)
    state.memory.shortTerm.push({ step: i, action: actionName, reward });
    if (state.memory.shortTerm.length > 100) {
      state.memory.shortTerm = state.memory.shortTerm.slice(-50);
    }
  }

  if (state.status === "running") state.status = "completed";
  return state;
}

// ═══════════════════════════════════════════════
// 6. COMPOSITE PATTERN BUILDER
// ═══════════════════════════════════════════════

export interface CompositeAgentConfig {
  name: string;
  patterns: AgentPatternType[];
  workflow: LLMWorkflowType;
  agenticPattern?: AgenticWorkflowPattern;
}

/**
 * Validates that a composite agent configuration is coherent.
 * Checks composability constraints from the pattern registry.
 */
export function validateCompositeAgent(config: CompositeAgentConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.patterns.length < 1) errors.push("At least one pattern required");

  // Check composability
  for (let i = 0; i < config.patterns.length; i++) {
    for (let j = i + 1; j < config.patterns.length; j++) {
      const a = AGENT_PATTERN_REGISTRY[config.patterns[i]];
      const b = AGENT_PATTERN_REGISTRY[config.patterns[j]];
      if (!a.composableWith.includes(config.patterns[j]) && !b.composableWith.includes(config.patterns[i])) {
        warnings.push(`Patterns ${config.patterns[i]} and ${config.patterns[j]} are not explicitly composable`);
      }
    }
  }

  // Check workflow support
  for (const p of config.patterns) {
    const pattern = AGENT_PATTERN_REGISTRY[p];
    if (!pattern.supportedWorkflows.includes(config.workflow)) {
      warnings.push(`Pattern ${p} doesn't explicitly support workflow ${config.workflow}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Get summary statistics about the pattern registry.
 */
export function getPatternRegistryStats(): {
  totalPatterns: number;
  memoryRequired: number;
  toolRequired: number;
  vlmRequired: number;
  workflows: number;
  agenticPatterns: number;
} {
  const patterns = Object.values(AGENT_PATTERN_REGISTRY);
  return {
    totalPatterns: patterns.length,
    memoryRequired: patterns.filter((p) => p.requiresMemory).length,
    toolRequired: patterns.filter((p) => p.requiresTools).length,
    vlmRequired: patterns.filter((p) => p.requiresVLM).length,
    workflows: 5,
    agenticPatterns: 5,
  };
}

/**
 * Format pattern context for LLM consumption.
 */
export function formatPatternContextForLLM(
  selectedPatterns: AgentPatternType[],
  workflow?: LLMWorkflowType
): string {
  const lines: string[] = ["═══ ACTIVE AGENT PATTERNS ═══"];
  for (const pt of selectedPatterns) {
    const p = AGENT_PATTERN_REGISTRY[pt];
    lines.push(`\n▸ ${p.name}`);
    lines.push(`  ${p.description}`);
    lines.push(`  Capabilities: ${p.capabilities.map((c) => c.name).join(", ")}`);
    lines.push(`  Use cases: ${p.useCases.slice(0, 3).join("; ")}`);
  }
  if (workflow) {
    lines.push(`\n═══ ACTIVE WORKFLOW: ${workflow.toUpperCase()} ═══`);
  }
  return lines.join("\n");
}
