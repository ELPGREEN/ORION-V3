/**
 * 🍕 Pentagon Pizza Core Types & Interfaces
 */

export type CognitiveState = "idle" | "perceiving" | "remembering" | "reasoning" | "acting" | "evaluating";

export type PentagonToolName = "emit_reasoning_plan" | "emit_feynman_refinement" | "search_web" | "retrieve_memory" | "validate_output";

export interface PentagonToolCall {
  tool: PentagonToolName;
  args: Record<string, unknown>;
  result?: unknown;
  startedAt: number;
  completedAt?: number;
  cost?: number;
}

export interface PentagonContext {
  /** Unique cycle identifier */
  cycleId: string;
  /** Original user input */
  query: string;
  /** Current step count in the cognitive loop */
  stepCount: number;
  /** Maximum allowed steps before forced stop */
  maxSteps: number;
  /** Accumulated cost (tokens * estimated price) */
  accumulatedCost: number;
  /** Maximum cost threshold before forced stop */
  maxCost: number;
  /** Start timestamp in ms */
  startedAt: number;
  /** Maximum duration in ms before timeout */
  maxDurationMs: number;
  /** Stop signal flag — set by external abort or stop condition */
  shouldStop: boolean;
  /** Stop reason if cycle was interrupted */
  stopReason?: "max_steps" | "max_cost" | "timeout" | "abort" | "quality_threshold_met" | "tool_error";
  /** Shared data bag passed between all layers */
  sharedState: Record<string, unknown>;
  /** Tool calls executed during this cycle */
  toolCalls: PentagonToolCall[];
  /** Domain context (e.g., "legal", "medical", "general") */
  domain?: string;
  /** Force tool usage flag */
  forceTool?: boolean;
  /** Force RAG usage flag */
  forceRag?: boolean;
  /** Skip Feynman refinement */
  skipFeynman?: boolean;
}

export interface PentagonStructuredOutput {
  /** Whether the cycle succeeded */
  success: boolean;
  /** Final response text */
  output: string;
  /** Cycle metadata */
  metadata: {
    cycleId: string;
    cognitiveStates: CognitiveState[];
    stepsTaken: number;
    totalCost: number;
    durationMs: number;
    provider?: string;
    model?: string;
    earlyExit?: boolean;
    earlyExitType?: "fast_lane" | "quantum" | "quality_met" | "stop_condition";
  };
  /** Tool calls made during the cycle */
  toolCalls: Array<{
    tool: string;
    args: Record<string, unknown>;
    result?: unknown;
    durationMs?: number;
  }>;
  /** Confidence score from reasoning layer */
  confidence?: number;
  /** Error details if failed */
  error?: string;
  /** RAG snippets used (for citation) */
  sourcesUsed?: string[];
}

export interface PerceptionResult {
  intent: string;
  entities: Record<string, any>;
  sentiment: string;
  rawInput: string;
  contextualMarkers: string[];
  complexity: "simple" | "medium" | "complex";
}

export interface MemoryResult {
  shortTerm: any[];
  longTerm: any[];
  episodic: any[];
  mergedContext: string;
  /** Snippets brutos extraídos do RAG/CRAG para citação direta no LLM final */
  ragSnippets?: string[];
}

export interface ReasoningResult {
  plan: string[];
  rationale: string;
  confidence: number;
  subTasks: string[];
  /** Rascunho da resposta gerado pelo lobo frontal (DeepSeek R1 / Nemotron) */
  responseHint?: string;
  /** Modelo OpenRouter usado no raciocínio */
  model?: string;
}

export interface ActionResult {
  success: boolean;
  data: any;
  output: string;
  roiImpact?: string;
}

export interface MetaResult {
  valid: boolean;
  score: number;
  feedback: string;
  adjustments?: Record<string, any>;
  guardrailBreach?: string;
}

export interface IPentagonLayer<TInput, TOutput> {
  process(input: TInput, context: PentagonContext): Promise<TOutput>;
}

export interface IMemoryBackend {
  store(key: string, data: any): Promise<void>;
  retrieve(query: string, limit: number): Promise<any[]>;
  relate(nodeA: string, nodeB: string, relation: string): Promise<void>;
}

/**
 * Check if a PentagonContext has hit any stop condition
 */
export function checkStopConditions(ctx: PentagonContext): boolean {
  if (ctx.shouldStop) {
    ctx.stopReason = ctx.stopReason ?? "abort";
    return true;
  }
  if (ctx.stepCount >= ctx.maxSteps) {
    ctx.shouldStop = true;
    ctx.stopReason = "max_steps";
    return true;
  }
  if (ctx.accumulatedCost >= ctx.maxCost) {
    ctx.shouldStop = true;
    ctx.stopReason = "max_cost";
    return true;
  }
  const elapsed = Date.now() - ctx.startedAt;
  if (elapsed >= ctx.maxDurationMs) {
    ctx.shouldStop = true;
    ctx.stopReason = "timeout";
    return true;
  }
  return false;
}

/**
 * Create a fresh PentagonContext for a new cycle
 */
export function createPentagonContext(query: string, options?: Partial<PentagonContext>): PentagonContext {
  return {
    cycleId: `cycle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    query,
    stepCount: 0,
    maxSteps: 10,
    accumulatedCost: 0,
    maxCost: 5.0,
    startedAt: Date.now(),
    maxDurationMs: 30000,
    shouldStop: false,
    sharedState: {},
    toolCalls: [],
    ...options,
  };
}

/**
 * Record a tool call in the context for tracking and auditing
 */
export function recordToolCall(
  ctx: PentagonContext,
  tool: PentagonToolName,
  args: Record<string, unknown>,
): PentagonToolCall {
  const call: PentagonToolCall = { tool, args, startedAt: Date.now() };
  ctx.toolCalls.push(call);
  return call;
}

/**
 * Complete a tool call with result and cost
 */
export function completeToolCall(
  call: PentagonToolCall,
  result: unknown,
  cost: number = 0,
): void {
  call.result = result;
  call.completedAt = Date.now();
  call.cost = cost;
}
