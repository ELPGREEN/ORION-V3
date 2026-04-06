/**
 * ─── Serverless Agent Runtime ───
 * 
 * Implements AWS Prescriptive Guidance: "Building serverless architectures
 * for agentic AI on AWS" (January 2026, Aaron Sempf).
 *
 * Key concepts integrated:
 *   1. 5-Layer Architecture (Event Trigger → Processing → Inference → Post-processing → Output)
 *   2. Event-Driven Architecture (EDA) with EventBus
 *   3. Dual Orchestration (Rule-based + AI-native)
 *   4. AgentCore Runtime (Memory, Gateway, Tools)
 *   5. 5 Architecture Patterns (ML Inference, Agentic Orchestration, Edge, Multi-stage, Grounded Agent)
 *   6. Guardrails (Content filters, denial topics, prompt inspection)
 *   7. Observability (Metrics, traces, structured logs per layer)
 *   8. Cost Optimization (Token budgets, model tiering, caching)
 *   9. Grounding & RAG integration
 *  10. Edge AI & global inference distribution
 *
 * Ref: AWS Prescriptive Guidance – Serverless Agentic AI (2026)
 */

// ═══════════════════════════════════════════════
// 1. EVENT-DRIVEN ARCHITECTURE (EDA)
// ═══════════════════════════════════════════════

export type EventType =
  | "user_input"
  | "document_upload"
  | "sensor_signal"
  | "model_inference_result"
  | "agent_action"
  | "workflow_trigger"
  | "system_event"
  | "feedback"
  | "error"
  | "custom";

export interface ServerlessEvent<T = unknown> {
  id: string;
  type: EventType;
  source: string;
  detail: T;
  timestamp: number;
  metadata: Record<string, unknown>;
  traceId?: string;           // For distributed tracing across layers
  tenantId?: string;          // Multi-tenant context propagation
}

export type EventHandler<T = unknown> = (event: ServerlessEvent<T>) => Promise<LayerResult>;

interface EventSubscription {
  id: string;
  eventType: EventType | "*";
  handler: EventHandler;
  filter?: (event: ServerlessEvent) => boolean;
  priority: number;
}

/** EventBus — the backbone of serverless AI (p4-6 of document) */
class EventBus {
  private subscriptions: EventSubscription[] = [];
  private eventLog: ServerlessEvent[] = [];
  private deadLetterQueue: { event: ServerlessEvent; error: string; attempts: number }[] = [];
  private maxRetries = 3;

  subscribe(
    eventType: EventType | "*",
    handler: EventHandler,
    options?: { filter?: (event: ServerlessEvent) => boolean; priority?: number }
  ): string {
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.subscriptions.push({
      id,
      eventType,
      handler,
      filter: options?.filter,
      priority: options?.priority ?? 0,
    });
    // Sort by priority (higher first)
    this.subscriptions.sort((a, b) => b.priority - a.priority);
    return id;
  }

  unsubscribe(subscriptionId: string): boolean {
    const idx = this.subscriptions.findIndex(s => s.id === subscriptionId);
    if (idx === -1) return false;
    this.subscriptions.splice(idx, 1);
    return true;
  }

  async emit<T>(event: ServerlessEvent<T>): Promise<LayerResult[]> {
    this.eventLog.push(event as ServerlessEvent);

    const matching = this.subscriptions.filter(s =>
      (s.eventType === "*" || s.eventType === event.type) &&
      (!s.filter || s.filter(event as ServerlessEvent))
    );

    const results: LayerResult[] = [];
    for (const sub of matching) {
      let attempts = 0;
      while (attempts < this.maxRetries) {
        try {
          const result = await sub.handler(event as ServerlessEvent);
          results.push(result);
          break;
        } catch (err) {
          attempts++;
          if (attempts >= this.maxRetries) {
            this.deadLetterQueue.push({
              event: event as ServerlessEvent,
              error: String(err),
              attempts,
            });
            results.push({
              layer: "event_bus",
              success: false,
              error: `DLQ: ${String(err)} after ${attempts} retries`,
              durationMs: 0,
              timestamp: Date.now(),
            });
          }
        }
      }
    }
    return results;
  }

  getEventLog(limit = 50): ServerlessEvent[] {
    return this.eventLog.slice(-limit);
  }

  getDeadLetterQueue(): typeof this.deadLetterQueue {
    return [...this.deadLetterQueue];
  }

  clear(): void {
    this.subscriptions = [];
    this.eventLog = [];
    this.deadLetterQueue = [];
  }
}

// Singleton EventBus
export const eventBus = new EventBus();

// ═══════════════════════════════════════════════
// 2. FIVE-LAYER ARCHITECTURE
// ═══════════════════════════════════════════════

export type ArchitectureLayer =
  | "event_trigger"
  | "processing"
  | "inference"
  | "post_processing"
  | "output"
  | "event_bus";

export interface LayerResult {
  layer: ArchitectureLayer | string;
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
  timestamp: number;
  metrics?: LayerMetrics;
}

export interface LayerMetrics {
  tokensUsed?: number;
  modelId?: string;
  cacheHit?: boolean;
  costEstimateCents?: number;
  inputSize?: number;
  outputSize?: number;
}

/** Event Trigger Layer (p29: entry point — captures user interactions, system events, data changes) */
export interface EventTriggerConfig {
  acceptedSources: string[];           // e.g., ["api_gateway", "s3_upload", "eventbridge"]
  inputValidation: boolean;
  rateLimitPerMinute: number;
  schemaRegistry?: Record<string, unknown>;
}

/** Processing Layer (p29-30: transforms/enriches data before AI inference) */
export interface ProcessingLayerConfig {
  enablePiiDetection: boolean;
  enableLanguageDetection: boolean;
  enableMetadataEnrichment: boolean;
  preprocessors: ServerlessPreprocessor[];
}

export interface ServerlessPreprocessor {
  id: string;
  name: string;
  fn: (input: unknown) => Promise<unknown>;
}

/** Inference Layer (p30: core AI — ML/FM inference, RAG) */
export interface InferenceLayerConfig {
  modelTier: ModelTier;
  enableRAG: boolean;
  enableGrounding: boolean;
  maxTokens: number;
  temperature: number;
  fallbackChain: ModelTier[];          // Fallback model chain for resilience
}

export type ModelTier = "micro" | "lite" | "pro" | "premier" | "custom_ml";

/** Post-Processing Layer (p31: refines/acts upon inference results) */
export interface PostProcessingConfig {
  enableConfidenceFilter: boolean;
  confidenceThreshold: number;
  enableFormatting: boolean;
  enableEventEmission: boolean;        // Emit downstream events
  decisioning: DecisioningRule[];
}

export interface DecisioningRule {
  condition: string;
  action: "escalate" | "log" | "emit_event" | "store" | "alert";
  params?: Record<string, unknown>;
}

/** Output Layer (p31-32: delivery of results, persistence) */
export interface OutputLayerConfig {
  persistResults: boolean;
  enableAuditLog: boolean;
  feedbackLoop: boolean;               // Feed results back into learning
  outputFormat: "json" | "markdown" | "html" | "raw";
}

// ═══════════════════════════════════════════════
// 3. AGENTCORE RUNTIME
// ═══════════════════════════════════════════════

/** AgentCore Memory (p7: persistent memory for conversation context, task results, agent state) */
export interface AgentCoreMemory {
  conversationHistory: MemoryEntry[];
  taskResults: MemoryEntry[];
  agentState: Record<string, unknown>;
  maxEntries: number;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: unknown;
  type: "conversation" | "task_result" | "state" | "knowledge";
  createdAt: number;
  expiresAt?: number;
  accessCount: number;
}

/** AgentCore Gateway (p7: managed integrations for external APIs, AWS services, data sources) */
export interface AgentCoreGateway {
  connectors: GatewayConnector[];
  activeConnections: number;
  maxConcurrentConnections: number;
}

export interface GatewayConnector {
  id: string;
  name: string;
  type: "aws_service" | "external_api" | "data_source" | "mcp";
  endpoint: string;
  isActive: boolean;
  authMethod: "iam" | "api_key" | "oauth2" | "mcp_auth";
  rateLimitPerMinute: number;
  lastUsed?: number;
}

/** AgentCore Built-in Tools (p7: code execution, web browsing within runtime) */
export interface AgentCoreTool {
  id: string;
  name: string;
  description: string;
  category: "code_execution" | "web_browsing" | "data_query" | "file_ops" | "custom";
  fn: (params: Record<string, unknown>) => Promise<unknown>;
  isEnabled: boolean;
  usageCount: number;
  avgLatencyMs: number;
}

export interface AgentCoreRuntime {
  agentId: string;
  memory: AgentCoreMemory;
  gateway: AgentCoreGateway;
  tools: AgentCoreTool[];
  status: "idle" | "running" | "paused" | "error";
  startedAt: number;
  cycleCount: number;
}

// ═══════════════════════════════════════════════
// 4. DUAL ORCHESTRATION
// ═══════════════════════════════════════════════

export type OrchestrationMode = "rule_based" | "ai_native" | "hybrid";

/** Rule-based orchestration (p7-8: deterministic, step-by-step like Step Functions) */
export interface WorkflowStep {
  id: string;
  name: string;
  type: "task" | "choice" | "parallel" | "wait" | "map";
  handler: (input: unknown) => Promise<unknown>;
  next?: string;                        // Next step ID
  errorHandler?: string;                // Error step ID
  retryPolicy?: { maxAttempts: number; intervalMs: number };
  choices?: WorkflowChoice[];           // For "choice" type
}

export interface WorkflowChoice {
  condition: (input: unknown) => boolean;
  next: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  startStep: string;
  steps: Map<string, WorkflowStep>;
  timeout: number;
}

/** AI-native orchestration (p9-12: agents decide what to do based on intent/context) */
export interface AINativeOrchestrator {
  agentId: string;
  modelTier: ModelTier;
  actionGroups: ActionGroup[];
  knowledgeBases: string[];
  enableMemory: boolean;
  enableGoalTracking: boolean;
}

export interface ActionGroup {
  name: string;
  description: string;
  tools: string[];                      // Tool IDs
  triggerPatterns: string[];            // Intent patterns
}

// ═══════════════════════════════════════════════
// 5. GUARDRAILS (p20: content filters, denial topics, prompt inspection)
// ═══════════════════════════════════════════════

export interface ServerlessGuardrails {
  contentFilters: ContentFilter[];
  denialTopics: string[];
  promptInspection: boolean;
  piiMasking: boolean;
  sessionConstraints: SessionConstraint[];
  maxOutputTokens: number;
}

export interface ContentFilter {
  id: string;
  type: "toxicity" | "hate_speech" | "violence" | "sexual" | "self_harm" | "pii" | "custom";
  threshold: number;                    // 0-1, above this = blocked
  action: "block" | "warn" | "mask";
}

export interface SessionConstraint {
  key: string;
  scope: string;                        // e.g., "legal_only", "support_agent"
  maxTurns?: number;
}

// ═══════════════════════════════════════════════
// 6. OBSERVABILITY (p62-67: metrics, traces, logs per layer)
// ═══════════════════════════════════════════════

export interface ObservabilityConfig {
  enableTracing: boolean;
  enableStructuredLogs: boolean;
  enableMetrics: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  retentionDays: number;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  layer: ArchitectureLayer;
  operation: string;
  startTime: number;
  endTime?: number;
  status: "ok" | "error" | "timeout";
  attributes: Record<string, unknown>;
}

export interface PipelineTrace {
  traceId: string;
  spans: TraceSpan[];
  totalDurationMs: number;
  layerDurations: Record<ArchitectureLayer, number>;
  success: boolean;
  modelCallCount: number;
  totalTokens: number;
  estimatedCostCents: number;
}

// ═══════════════════════════════════════════════
// 7. COST OPTIMIZATION (p76-80)
// ═══════════════════════════════════════════════

export interface CostOptimizationConfig {
  tokenBudgetPerRequest: number;
  tokenBudgetPerDay: number;
  enableResponseCaching: boolean;
  cacheTTLMs: number;
  modelTieringStrategy: ModelTieringStrategy;
  enablePromptCompression: boolean;
}

export interface ModelTieringStrategy {
  /** Route simple queries to cheaper models (p77: cost-aware assistant) */
  simpleQueryModel: ModelTier;         // "micro" or "lite"
  complexQueryModel: ModelTier;        // "pro"
  criticalQueryModel: ModelTier;       // "premier"
  complexityThreshold: number;         // Word count or complexity score
  criticalPatterns: string[];          // Patterns requiring premium model
}

interface ResponseCache {
  entries: Map<string, { response: unknown; expiresAt: number; hits: number }>;
  maxEntries: number;
}

// ═══════════════════════════════════════════════
// 8. ARCHITECTURE PATTERNS
// ═══════════════════════════════════════════════

export type ArchitecturePattern =
  | "ml_inference_pipeline"
  | "agentic_orchestration"
  | "edge_inference"
  | "multi_stage_workflow"
  | "grounded_agent";

export interface PatternConfig {
  pattern: ArchitecturePattern;
  layers: {
    eventTrigger: EventTriggerConfig;
    processing: ProcessingLayerConfig;
    inference: InferenceLayerConfig;
    postProcessing: PostProcessingConfig;
    output: OutputLayerConfig;
  };
  orchestration: OrchestrationMode;
  guardrails: ServerlessGuardrails;
  observability: ObservabilityConfig;
  costOptimization: CostOptimizationConfig;
}

// ═══════════════════════════════════════════════
// 9. SERVERLESS PIPELINE RUNTIME
// ═══════════════════════════════════════════════

export interface ServerlessPipelineState {
  runtime: AgentCoreRuntime;
  config: PatternConfig;
  traces: PipelineTrace[];
  responseCache: ResponseCache;
  currentTrace: PipelineTrace | null;
  tokenUsageToday: number;
  requestCountToday: number;
  lastResetDate: string;
}

let _pipeline: ServerlessPipelineState | null = null;

// ─── Factory: Create pipeline for a given pattern ───

export function createServerlessPipeline(
  pattern: ArchitecturePattern,
  agentId: string = "orion-serverless"
): ServerlessPipelineState {
  const config = getDefaultPatternConfig(pattern);

  const runtime: AgentCoreRuntime = {
    agentId,
    memory: {
      conversationHistory: [],
      taskResults: [],
      agentState: {},
      maxEntries: 1000,
    },
    gateway: {
      connectors: [],
      activeConnections: 0,
      maxConcurrentConnections: 10,
    },
    tools: [],
    status: "idle",
    startedAt: Date.now(),
    cycleCount: 0,
  };

  _pipeline = {
    runtime,
    config,
    traces: [],
    responseCache: { entries: new Map(), maxEntries: 500 },
    currentTrace: null,
    tokenUsageToday: 0,
    requestCountToday: 0,
    lastResetDate: new Date().toISOString().slice(0, 10),
  };

  return _pipeline;
}

function getDefaultPatternConfig(pattern: ArchitecturePattern): PatternConfig {
  const baseGuardrails: ServerlessGuardrails = {
    contentFilters: [
      { id: "toxicity", type: "toxicity", threshold: 0.8, action: "block" },
      { id: "pii", type: "pii", threshold: 0.5, action: "mask" },
    ],
    denialTopics: [],
    promptInspection: true,
    piiMasking: true,
    sessionConstraints: [],
    maxOutputTokens: 4096,
  };

  const baseObservability: ObservabilityConfig = {
    enableTracing: true,
    enableStructuredLogs: true,
    enableMetrics: true,
    logLevel: "info",
    retentionDays: 30,
  };

  const baseCost: CostOptimizationConfig = {
    tokenBudgetPerRequest: 8000,
    tokenBudgetPerDay: 500000,
    enableResponseCaching: true,
    cacheTTLMs: 300_000, // 5 min
    modelTieringStrategy: {
      simpleQueryModel: "lite",
      complexQueryModel: "pro",
      criticalQueryModel: "premier",
      complexityThreshold: 50,
      criticalPatterns: ["legal", "financial", "medical", "compliance"],
    },
    enablePromptCompression: true,
  };

  const inferenceByPattern: Record<ArchitecturePattern, InferenceLayerConfig> = {
    ml_inference_pipeline: {
      modelTier: "custom_ml", enableRAG: false, enableGrounding: false,
      maxTokens: 2048, temperature: 0, fallbackChain: ["lite"],
    },
    agentic_orchestration: {
      modelTier: "pro", enableRAG: true, enableGrounding: true,
      maxTokens: 8192, temperature: 0.7, fallbackChain: ["lite", "micro"],
    },
    edge_inference: {
      modelTier: "micro", enableRAG: false, enableGrounding: false,
      maxTokens: 1024, temperature: 0, fallbackChain: [],
    },
    multi_stage_workflow: {
      modelTier: "pro", enableRAG: true, enableGrounding: false,
      maxTokens: 8192, temperature: 0.3, fallbackChain: ["lite"],
    },
    grounded_agent: {
      modelTier: "premier", enableRAG: true, enableGrounding: true,
      maxTokens: 16384, temperature: 0.5, fallbackChain: ["pro", "lite"],
    },
  };

  return {
    pattern,
    layers: {
      eventTrigger: {
        acceptedSources: ["api_gateway", "eventbridge", "s3_upload", "websocket"],
        inputValidation: true,
        rateLimitPerMinute: 60,
      },
      processing: {
        enablePiiDetection: true,
        enableLanguageDetection: true,
        enableMetadataEnrichment: true,
        preprocessors: [],
      },
      inference: inferenceByPattern[pattern],
      postProcessing: {
        enableConfidenceFilter: true,
        confidenceThreshold: 0.7,
        enableFormatting: true,
        enableEventEmission: true,
        decisioning: [],
      },
      output: {
        persistResults: true,
        enableAuditLog: true,
        feedbackLoop: pattern === "grounded_agent" || pattern === "agentic_orchestration",
        outputFormat: "json",
      },
    },
    orchestration: pattern === "ml_inference_pipeline" || pattern === "multi_stage_workflow"
      ? "rule_based"
      : pattern === "agentic_orchestration" || pattern === "grounded_agent"
        ? "ai_native"
        : "hybrid",
    guardrails: baseGuardrails,
    observability: baseObservability,
    costOptimization: baseCost,
  };
}

// ─── Execute Pipeline (5-layer pass) ───

export async function executeServerlessPipeline(
  input: unknown,
  source: string = "api_gateway",
  tenantId?: string
): Promise<PipelineExecutionResult> {
  if (!_pipeline) {
    _pipeline = createServerlessPipeline("agentic_orchestration");
  }

  // Daily reset
  const today = new Date().toISOString().slice(0, 10);
  if (_pipeline.lastResetDate !== today) {
    _pipeline.tokenUsageToday = 0;
    _pipeline.requestCountToday = 0;
    _pipeline.lastResetDate = today;
  }

  const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pipelineStart = performance.now();
  const layerResults: LayerResult[] = [];
  const spans: TraceSpan[] = [];

  _pipeline.runtime.status = "running";
  _pipeline.runtime.cycleCount++;
  _pipeline.requestCountToday++;

  // ─── Layer 1: Event Trigger ───
  const l1Start = performance.now();
  const event: ServerlessEvent = {
    id: `evt-${Date.now()}`,
    type: "user_input",
    source,
    detail: input,
    timestamp: Date.now(),
    metadata: {},
    traceId,
    tenantId,
  };

  // Validate source
  const config = _pipeline.config;
  if (!config.layers.eventTrigger.acceptedSources.includes(source)) {
    return createErrorResult(traceId, "event_trigger", `Source '${source}' not accepted`, pipelineStart);
  }

  // Rate limit check
  if (_pipeline.requestCountToday > config.costOptimization.tokenBudgetPerDay / config.costOptimization.tokenBudgetPerRequest) {
    return createErrorResult(traceId, "event_trigger", "Daily request budget exceeded", pipelineStart);
  }

  layerResults.push({ layer: "event_trigger", success: true, data: event, durationMs: performance.now() - l1Start, timestamp: Date.now() });
  spans.push(createSpan(traceId, "event_trigger", "capture_event", l1Start));

  // ─── Layer 2: Processing ───
  const l2Start = performance.now();
  let processedInput = input;
  try {
    // PII detection
    if (config.layers.processing.enablePiiDetection && typeof processedInput === "string") {
      processedInput = applyPiiMasking(processedInput);
    }

    // Run custom preprocessors
    for (const pp of config.layers.processing.preprocessors) {
      processedInput = await pp.fn(processedInput);
    }

    // Prompt inspection guardrail
    if (config.guardrails.promptInspection && typeof processedInput === "string") {
      const denied = config.guardrails.denialTopics.find(topic =>
        (processedInput as string).toLowerCase().includes(topic.toLowerCase())
      );
      if (denied) {
        return createErrorResult(traceId, "processing", `Denied topic detected: ${denied}`, pipelineStart);
      }
    }

    layerResults.push({ layer: "processing", success: true, data: processedInput, durationMs: performance.now() - l2Start, timestamp: Date.now() });
    spans.push(createSpan(traceId, "processing", "preprocess", l2Start));
  } catch (err) {
    return createErrorResult(traceId, "processing", String(err), pipelineStart);
  }

  // ─── Layer 3: Inference ───
  const l3Start = performance.now();
  let inferenceResult: unknown;

  // Check cache first (cost optimization p77)
  const cacheKey = typeof processedInput === "string" ? processedInput : JSON.stringify(processedInput);
  const cached = _pipeline.responseCache.entries.get(cacheKey);
  let cacheHit = false;

  if (cached && cached.expiresAt > Date.now() && config.costOptimization.enableResponseCaching) {
    inferenceResult = cached.response;
    cached.hits++;
    cacheHit = true;
  } else {
    // Model tiering (p77: route simple → lite, complex → pro, critical → premier)
    const selectedTier = selectModelTier(processedInput, config.costOptimization.modelTieringStrategy);

    inferenceResult = {
      modelTier: selectedTier,
      input: processedInput,
      ragEnabled: config.layers.inference.enableRAG,
      groundingEnabled: config.layers.inference.enableGrounding,
      timestamp: Date.now(),
      // In production, this would call the actual LLM/ML endpoint
      output: `[Inference result from ${selectedTier} model]`,
    };

    const estimatedTokens = typeof processedInput === "string" ? Math.ceil(processedInput.length / 4) : 100;
    _pipeline.tokenUsageToday += estimatedTokens;

    // Cache the result
    if (config.costOptimization.enableResponseCaching) {
      _pipeline.responseCache.entries.set(cacheKey, {
        response: inferenceResult,
        expiresAt: Date.now() + config.costOptimization.cacheTTLMs,
        hits: 0,
      });
      // Evict oldest if over limit
      if (_pipeline.responseCache.entries.size > _pipeline.responseCache.maxEntries) {
        const firstKey = _pipeline.responseCache.entries.keys().next().value;
        if (firstKey) _pipeline.responseCache.entries.delete(firstKey);
      }
    }
  }

  layerResults.push({
    layer: "inference", success: true, data: inferenceResult,
    durationMs: performance.now() - l3Start, timestamp: Date.now(),
    metrics: { cacheHit, tokensUsed: cacheHit ? 0 : 100 },
  });
  spans.push(createSpan(traceId, "inference", cacheHit ? "cache_hit" : "model_invoke", l3Start));

  // ─── Layer 4: Post-Processing ───
  const l4Start = performance.now();
  let finalOutput = inferenceResult;
  try {
    // Content filter guardrails
    if (typeof finalOutput === "object" && finalOutput !== null) {
      const outputStr = JSON.stringify(finalOutput);
      for (const filter of config.guardrails.contentFilters) {
        if (filter.action === "block" && checkContentFilter(outputStr, filter)) {
          return createErrorResult(traceId, "post_processing", `Content blocked by ${filter.type} filter`, pipelineStart);
        }
      }
    }

    // Apply decisioning rules
    for (const rule of config.layers.postProcessing.decisioning) {
      // Simplified rule evaluation
      if (rule.action === "emit_event" && config.layers.postProcessing.enableEventEmission) {
        await eventBus.emit({
          id: `downstream-${Date.now()}`,
          type: "agent_action",
          source: "post_processing",
          detail: { rule: rule.condition, result: finalOutput },
          timestamp: Date.now(),
          metadata: {},
          traceId,
          tenantId,
        });
      }
    }

    layerResults.push({ layer: "post_processing", success: true, data: finalOutput, durationMs: performance.now() - l4Start, timestamp: Date.now() });
    spans.push(createSpan(traceId, "post_processing", "decisioning", l4Start));
  } catch (err) {
    return createErrorResult(traceId, "post_processing", String(err), pipelineStart);
  }

  // ─── Layer 5: Output ───
  const l5Start = performance.now();

  // Persist to memory
  if (config.layers.output.persistResults) {
    _pipeline.runtime.memory.taskResults.push({
      id: `result-${Date.now()}`,
      key: traceId,
      value: finalOutput,
      type: "task_result",
      createdAt: Date.now(),
      accessCount: 0,
    });
    // Evict if over limit
    while (_pipeline.runtime.memory.taskResults.length > _pipeline.runtime.memory.maxEntries) {
      _pipeline.runtime.memory.taskResults.shift();
    }
  }

  // Feedback loop
  if (config.layers.output.feedbackLoop) {
    await eventBus.emit({
      id: `feedback-${Date.now()}`,
      type: "feedback",
      source: "output_layer",
      detail: { traceId, result: finalOutput },
      timestamp: Date.now(),
      metadata: {},
      traceId,
      tenantId,
    });
  }

  layerResults.push({ layer: "output", success: true, data: finalOutput, durationMs: performance.now() - l5Start, timestamp: Date.now() });
  spans.push(createSpan(traceId, "output", "persist_and_deliver", l5Start));

  // ─── Build trace ───
  const totalDuration = Math.round(performance.now() - pipelineStart);
  const trace: PipelineTrace = {
    traceId,
    spans,
    totalDurationMs: totalDuration,
    layerDurations: {
      event_trigger: layerResults[0]?.durationMs ?? 0,
      processing: layerResults[1]?.durationMs ?? 0,
      inference: layerResults[2]?.durationMs ?? 0,
      post_processing: layerResults[3]?.durationMs ?? 0,
      output: layerResults[4]?.durationMs ?? 0,
      event_bus: 0,
    },
    success: true,
    modelCallCount: cacheHit ? 0 : 1,
    totalTokens: cacheHit ? 0 : 100,
    estimatedCostCents: cacheHit ? 0 : 1,
  };
  _pipeline.traces.push(trace);
  if (_pipeline.traces.length > 100) _pipeline.traces.shift();

  _pipeline.runtime.status = "idle";

  return {
    traceId,
    success: true,
    output: finalOutput,
    layerResults,
    trace,
    cacheHit,
    orchestrationMode: config.orchestration,
    pattern: config.pattern,
    totalDurationMs: totalDuration,
  };
}

export interface PipelineExecutionResult {
  traceId: string;
  success: boolean;
  output: unknown;
  error?: string;
  layerResults: LayerResult[];
  trace: PipelineTrace;
  cacheHit: boolean;
  orchestrationMode: OrchestrationMode;
  pattern: ArchitecturePattern;
  totalDurationMs: number;
}

// ─── Rule-Based Workflow Execution (Step Functions style) ───

export async function executeWorkflow(
  definition: WorkflowDefinition,
  initialInput: unknown
): Promise<{ success: boolean; output: unknown; stepsExecuted: string[]; durationMs: number }> {
  const start = performance.now();
  const stepsExecuted: string[] = [];
  let currentStepId: string | undefined = definition.startStep;
  let currentInput = initialInput;
  const startTime = Date.now();

  while (currentStepId) {
    if (Date.now() - startTime > definition.timeout) {
      return { success: false, output: { error: "Workflow timeout" }, stepsExecuted, durationMs: performance.now() - start };
    }

    const step = definition.steps.get(currentStepId);
    if (!step) break;

    stepsExecuted.push(step.name);

    try {
      if (step.type === "choice" && step.choices) {
        const matchedChoice = step.choices.find(c => c.condition(currentInput));
        currentStepId = matchedChoice?.next ?? step.next;
      } else {
        currentInput = await step.handler(currentInput);
        currentStepId = step.next;
      }
    } catch (err) {
      if (step.errorHandler) {
        currentStepId = step.errorHandler;
      } else if (step.retryPolicy) {
        let retried = false;
        for (let i = 0; i < step.retryPolicy.maxAttempts; i++) {
          await new Promise(r => setTimeout(r, step.retryPolicy!.intervalMs));
          try {
            currentInput = await step.handler(currentInput);
            currentStepId = step.next;
            retried = true;
            break;
          } catch { /* continue retry */ }
        }
        if (!retried) {
          return { success: false, output: { error: String(err), step: step.name }, stepsExecuted, durationMs: performance.now() - start };
        }
      } else {
        return { success: false, output: { error: String(err), step: step.name }, stepsExecuted, durationMs: performance.now() - start };
      }
    }
  }

  return { success: true, output: currentInput, stepsExecuted, durationMs: Math.round(performance.now() - start) };
}

// ═══════════════════════════════════════════════
// 10. UTILITY FUNCTIONS
// ═══════════════════════════════════════════════

function applyPiiMasking(text: string): string {
  return text
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "[CPF_MASKED]")
    .replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, "[CNPJ_MASKED]")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_MASKED]")
    .replace(/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)(?:9\s?)?\d{4}[-.\s]?\d{4}/g, "[PHONE_MASKED]");
}

function selectModelTier(input: unknown, strategy: ModelTieringStrategy): ModelTier {
  const text = typeof input === "string" ? input : JSON.stringify(input);
  const wordCount = text.split(/\s+/).length;

  // Check for critical patterns first
  for (const pattern of strategy.criticalPatterns) {
    if (text.toLowerCase().includes(pattern.toLowerCase())) {
      return strategy.criticalQueryModel;
    }
  }

  // Complexity-based routing
  return wordCount > strategy.complexityThreshold
    ? strategy.complexQueryModel
    : strategy.simpleQueryModel;
}

function checkContentFilter(text: string, filter: ContentFilter): boolean {
  // Simplified content checking — in production, would use ML-based classification
  const dangerousPatterns: Record<string, RegExp[]> = {
    toxicity: [/\b(idiot|stupid|moron)\b/gi],
    pii: [/\d{3}\.\d{3}\.\d{3}-\d{2}/, /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/],
  };
  const patterns = dangerousPatterns[filter.type] || [];
  return patterns.some(p => p.test(text));
}

function createSpan(traceId: string, layer: ArchitectureLayer, operation: string, startTime: number): TraceSpan {
  return {
    traceId,
    spanId: `span-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    layer,
    operation,
    startTime,
    endTime: performance.now(),
    status: "ok",
    attributes: {},
  };
}

function createErrorResult(traceId: string, failedLayer: string, error: string, pipelineStart: number): PipelineExecutionResult {
  return {
    traceId,
    success: false,
    output: null,
    error,
    layerResults: [{ layer: failedLayer, success: false, error, durationMs: performance.now() - pipelineStart, timestamp: Date.now() }],
    trace: {
      traceId,
      spans: [],
      totalDurationMs: Math.round(performance.now() - pipelineStart),
      layerDurations: { event_trigger: 0, processing: 0, inference: 0, post_processing: 0, output: 0, event_bus: 0 },
      success: false,
      modelCallCount: 0,
      totalTokens: 0,
      estimatedCostCents: 0,
    },
    cacheHit: false,
    orchestrationMode: "rule_based",
    pattern: "ml_inference_pipeline",
    totalDurationMs: Math.round(performance.now() - pipelineStart),
  };
}

// ─── Public API ───

export function getServerlessPipelineState(): ServerlessPipelineState | null {
  return _pipeline;
}

export function getPipelineTraces(limit = 20): PipelineTrace[] {
  return (_pipeline?.traces ?? []).slice(-limit);
}

export function getPipelineObservability(): {
  tokenUsageToday: number;
  requestCountToday: number;
  cacheSize: number;
  cacheHitRate: number;
  avgLatencyMs: number;
  errorRate: number;
} {
  if (!_pipeline) return { tokenUsageToday: 0, requestCountToday: 0, cacheSize: 0, cacheHitRate: 0, avgLatencyMs: 0, errorRate: 0 };

  const traces = _pipeline.traces;
  const totalTraces = traces.length;
  const errors = traces.filter(t => !t.success).length;
  const cacheHits = traces.filter(t => t.modelCallCount === 0).length;

  return {
    tokenUsageToday: _pipeline.tokenUsageToday,
    requestCountToday: _pipeline.requestCountToday,
    cacheSize: _pipeline.responseCache.entries.size,
    cacheHitRate: totalTraces > 0 ? cacheHits / totalTraces : 0,
    avgLatencyMs: totalTraces > 0 ? traces.reduce((sum, t) => sum + t.totalDurationMs, 0) / totalTraces : 0,
    errorRate: totalTraces > 0 ? errors / totalTraces : 0,
  };
}

export function registerGatewayConnector(connector: GatewayConnector): void {
  if (!_pipeline) return;
  _pipeline.runtime.gateway.connectors.push(connector);
}

export function registerAgentCoreTool(tool: AgentCoreTool): void {
  if (!_pipeline) return;
  _pipeline.runtime.tools.push(tool);
}

export function addPreprocessor(preprocessor: ServerlessPreprocessor): void {
  if (!_pipeline) return;
  _pipeline.config.layers.processing.preprocessors.push(preprocessor);
}

export function addDecisioningRule(rule: DecisioningRule): void {
  if (!_pipeline) return;
  _pipeline.config.layers.postProcessing.decisioning.push(rule);
}

export function resetServerlessPipeline(): void {
  _pipeline = null;
  eventBus.clear();
}

/**
 * Generate LLM context with serverless architecture awareness.
 */
export function formatServerlessContextForLLM(): string {
  if (!_pipeline) return "[SERVERLESS] No pipeline configured";

  const obs = getPipelineObservability();
  const config = _pipeline.config;

  return [
    `[SERVERLESS] Pattern: ${config.pattern} | Orchestration: ${config.orchestration}`,
    `[INFERENCE] Model tier: ${config.layers.inference.modelTier} | RAG: ${config.layers.inference.enableRAG} | Grounding: ${config.layers.inference.enableGrounding}`,
    `[GUARDRAILS] Filters: ${config.guardrails.contentFilters.length} | Denial topics: ${config.guardrails.denialTopics.length} | PII masking: ${config.guardrails.piiMasking}`,
    `[OBSERVABILITY] Requests today: ${obs.requestCountToday} | Tokens: ${obs.tokenUsageToday} | Cache hit rate: ${(obs.cacheHitRate * 100).toFixed(1)}%`,
    `[COST] Budget: ${config.costOptimization.tokenBudgetPerDay} tokens/day | Used: ${_pipeline.tokenUsageToday}`,
    `[AGENTCORE] Tools: ${_pipeline.runtime.tools.length} | Connectors: ${_pipeline.runtime.gateway.connectors.length} | Memory entries: ${_pipeline.runtime.memory.taskResults.length}`,
  ].join("\n");
}
