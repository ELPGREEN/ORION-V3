/**
 * AI Orchestrator — Core request routing
 * Now integrates the full neural pipeline: SLM→CAG→LCM→MoE→MLM→LLM-Judge
 * + Circuit breaker & retry for resilience
 */

import { supabase } from "@/integrations/supabase/client";
import { moeGating } from "./moe-gating";
import { executeNeuralPipeline, postProcessResponse, cacheResponse, type PipelineOutput } from "./neural-pipeline";
import { withCircuitBreaker } from "./circuit-breaker";
import { computeProviderHealth, buildFallbackChain, type ProviderHealth } from "./neural/provider-health";
import { detectHallucinations } from "./analysis/hallucinationDetector";
import { validateNeuralResponse, dispatchAntiHallucinationReport } from "./analysis/anti-hallucination-engine";
import { getProviderWeight } from "./neural/reward-loop";
import { decideHybridRoute, callLocalInference } from "./neural/smart-hybrid-router";
import { executeCorrectiveRAG } from "./neural/corrective-rag";
import { SearchAgent } from "./neural/agents/search-agent";

// Re-export split modules for backwards compatibility
export { moeGating, DEFAULT_MOE_CONFIG, type MoEConfig } from "./moe-gating";
export {
  addNeuralKnowledge,
  createNeuralSpecialization,
  submitNeuralFeedback,
  triggerNeuralLearn,
  getNeuralWeights,
} from "./neural-training";
export { parseClientRequirements } from "./client-parser";

// ─── Types ───

export type AIProvider = "gemini" | "groq" | "github_models" | "anthropic" | "openai" | "mistral" | "deepseek" | "deepseek_reasoner";
export type AIUseCase = "documents" | "chat" | "search" | "analysis" | "code_gen" | "translation";
export type RoutingStrategy = "priority" | "round_robin" | "least_cost" | "moe_gating";

export interface AIRequestOptions {
  prompt: string;
  systemPrompt?: string;
  messages?: Array<{ role: string; content: string }>;
  preferredProvider?: AIProvider;
  useCase?: AIUseCase;
  includeNeuralContext?: boolean;
  maxTokens?: number;
  temperature?: number;
  routingStrategy?: RoutingStrategy;
  modelType?: "fast" | "balanced" | "reasoning" | "analysis" | "secure";
  enableMoE?: boolean;
  topKExperts?: number;
  enableCoT?: boolean;
  enableRoPE?: boolean;
  agentId?: string;
  agentContext?: Record<string, unknown>;
  parentTraceId?: string;
  ragMode?: "standard" | "agentic" | "corrective" | "self_rag";
  ragTopK?: number;
  ragRerank?: boolean;
  // Neural pipeline options
  documentContext?: string;
  documentType?: string;
  enableNeuralPipeline?: boolean;
  // DeepSeek V3.2 Thinking Mode
  thinkingEnabled?: boolean;
  tools?: Array<{ type: string; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
}

export interface AIResponse {
  content: string;
  provider: string;
  fallback: boolean;
  neuralEnhanced: boolean;
  // DeepSeek V3.2 Thinking Mode
  reasoningContent?: string;
  toolCalls?: Array<{ id: string; function: { name: string; arguments: string }; type: string }>;
  requiresToolExecution?: boolean;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  metadata: {
    jurisprudenceCount: number;
    knowledgeCount: number;
    specializationsCount: number;
    routingStrategy?: RoutingStrategy;
    moeExpertsUsed?: string[];
    chainOfThoughtSteps?: number;
    ragSourcesUsed?: number;
    traceId?: string;
    latencyMs?: number;
    tokenEstimate?: number;
    costTier?: number;
    // Neural pipeline metadata
    pipelineDurationMs?: number;
    pipelineTier?: string;
    pipelineModules?: string[];
    pipelineConceptCategory?: string;
    pipelineCompletenessScore?: number;
    pipelineJudgeGrade?: string;
    pipelineCacheHit?: boolean;
    antiHallucinationConfidence?: number;
    antiHallucinationFE?: number;
    antiHallucinationGrounding?: number;
  };
  // Full pipeline output for components that need it
  pipelineOutput?: PipelineOutput;
}

// ─── Architecture Knowledge Detection ───

const ARCHITECTURE_QUERY_REGEX = /jarvis|neurocore|pipeline.*neural|modelos?\s+especializad|hotpatch|federa[çc][aã]o.*neural|consciência\s+reflex|5\s*(?:stream|fluxo)|código\s+automodific|compara[çc][aã]o.*(?:ia|arquitetura|vis[aã]o)|orion\s+vs|vs\s+orion|arquitetura.*neural|vis[aã]o\s+computacional.*ind[uú]stria|enegep|romeral|zancul/i;

function detectArchitectureQuery(prompt: string): boolean {
  return ARCHITECTURE_QUERY_REGEX.test(prompt);
}

// ─── Core Orchestrator ───

export async function callAIOrchestrator(options: AIRequestOptions): Promise<AIResponse> {
  const startTime = Date.now();

  const effectiveOptions = { ...options };
  let pipelineOutput: PipelineOutput | undefined;

  // ═══ Detect architecture/comparison queries and enrich context ═══
  if (detectArchitectureQuery(options.prompt)) {
    try {
      const { buildJarvisComparisonContext, buildIntrospectionContext, buildCVIndustryComparisonContext } = await import("./neural/orion-introspection");
      const archContext = `${buildJarvisComparisonContext()}\n\n${buildCVIndustryComparisonContext()}\n\n${buildIntrospectionContext()}`;
      effectiveOptions.systemPrompt = (effectiveOptions.systemPrompt || "") + `\n\n${archContext}`;
      effectiveOptions.documentContext = (effectiveOptions.documentContext || "") + `\n[Contexto Arquitetural Orion ativado automaticamente]`;
    } catch (e) {
      console.warn("[Orchestrator] Architecture context injection failed:", e);
    }
  }

  // ═══ RAG Evolution: Corrective & Agentic Modes ═══
  if (options.ragMode === "corrective" || options.ragMode === "agentic") {
    try {
      if (options.ragMode === "agentic") {
        console.log("[Orchestrator] Entering Agentic RAG Mode...");
        const agent = new SearchAgent(3, 0.8);
        const result = await agent.search(options.prompt, options.documentContext || "");

        return {
          content: result.content,
          provider: "agentic-search",
          fallback: false,
          neuralEnhanced: true,
          metadata: {
            jurisprudenceCount: 0,
            knowledgeCount: 0,
            specializationsCount: 0,
            latencyMs: Date.now() - startTime,
            pipelineTier: "agentic",
            pipelineModules: ["AgenticSearch", "SelfRAG"],
            ragSourcesUsed: result.sources.length,
          }
        };
      } else if (options.ragMode === "corrective") {
        console.log("[Orchestrator] Entering Corrective RAG Mode...");
        const crag = await executeCorrectiveRAG({
          query: options.prompt,
          context: options.documentContext || "",
        });
        effectiveOptions.documentContext = crag.finalContext;
        if (crag.webSearchUsed) {
            effectiveOptions.systemPrompt = (effectiveOptions.systemPrompt || "") + "\n[AVISO: Contexto expandido com busca externa corretiva]";
        }
      }
    } catch (e) {
      console.warn("[Orchestrator] RAG Evolution failed, falling back to standard:", e);
    }
  }

  // ═══ Run Neural Pipeline (real processing) ═══
  const shouldRunPipeline = options.enableNeuralPipeline !== false; // Default: enabled
  
  if (shouldRunPipeline) {
    try {
      pipelineOutput = executeNeuralPipeline({
        query: options.prompt,
        context: effectiveOptions.documentContext || effectiveOptions.systemPrompt,
        documentType: effectiveOptions.documentType,
        useCase: effectiveOptions.useCase,
        forceFullPipeline: options.modelType === "reasoning" || options.modelType === "analysis",
        latencyBudgetMs: options.modelType === "fast" ? 100 : undefined,
      });

      // Use pipeline routing decisions
      if (!options.preferredProvider && pipelineOutput.preferredProvider) {
        effectiveOptions.preferredProvider = pipelineOutput.preferredProvider as AIProvider;
      }

      // Enrich system prompt with neural context
      if (pipelineOutput.systemContext) {
        const neuralContext = `\n\n--- Neural Context (auto-generated) ---\n${pipelineOutput.systemContext}\n--- End Neural Context ---`;
        effectiveOptions.systemPrompt = (effectiveOptions.systemPrompt || "") + neuralContext;
      }

      // If cache hit and we have a cached response, return it directly
      if (pipelineOutput.cacheHit && pipelineOutput.cachedResponse && typeof pipelineOutput.cachedResponse === "string") {
        console.log(`[NeuralPipeline] Cache hit (${pipelineOutput.cagResult.source || "semantic"}), returning cached response`);
        return {
          content: pipelineOutput.cachedResponse as string,
          provider: "cache",
          fallback: false,
          neuralEnhanced: true,
          metadata: {
            jurisprudenceCount: 0,
            knowledgeCount: 0,
            specializationsCount: 0,
            latencyMs: Date.now() - startTime,
            pipelineDurationMs: pipelineOutput.totalDurationMs,
            pipelineTier: pipelineOutput.tier,
            pipelineModules: pipelineOutput.modulesActivated,
            pipelineConceptCategory: pipelineOutput.conceptCategory,
            pipelineCacheHit: true,
          },
          pipelineOutput,
        };
      }
    } catch (pipelineError) {
      console.warn("[NeuralPipeline] Pipeline error (non-fatal, proceeding with standard routing):", pipelineError);
    }
  }

  // ═══ MoE External Gating (with reward-loop integration) ═══
  if (!effectiveOptions.preferredProvider) {
    // Check reward loop for preferred provider based on past feedback
    // NOTE: Gemini reserved exclusively for neural vision — NOT used for text/voice
    const domain = options.useCase || "general";
    const groqWeight = getProviderWeight("groq", domain);
    const mistralWeight = getProviderWeight("mistral", domain);
    const deepseekWeight = getProviderWeight("deepseek", domain);
    
    // If reward loop has strong preference (>0.7), use it — Groq/Mistral priority
    const bestReward = [
      { provider: "groq" as AIProvider, weight: groqWeight },
      { provider: "mistral" as AIProvider, weight: mistralWeight },
      { provider: "deepseek" as AIProvider, weight: deepseekWeight },
    ].sort((a, b) => b.weight - a.weight)[0];
    
    if (bestReward.weight > 0.7) {
      effectiveOptions.preferredProvider = bestReward.provider;
    } else if (options.enableMoE && options.useCase) {
      const selectedExperts = moeGating(options.useCase);
      effectiveOptions.preferredProvider = selectedExperts[0];
    }
  }

  // ═══ v3: Smart Hybrid Routing (Local vs Cloud) ═══
  const hybridRoute = await decideHybridRoute({
    prompt: options.prompt,
    isSensitive: options.useCase === "documents" || options.modelType === "secure",
    priority: options.modelType === "fast" ? "speed" : "quality"
  });

  if (hybridRoute.target === "local") {
    try {
      console.log(`[HybridRouter] Local Route Triggered: ${hybridRoute.rationale}`);
      const localResponse = await callLocalInference(options.prompt);
      return {
        content: localResponse,
        provider: "local_ollama",
        fallback: false,
        neuralEnhanced: true,
        metadata: {
          jurisprudenceCount: 0, knowledgeCount: 0, specializationsCount: 0,
          latencyMs: Date.now() - startTime,
          pipelineTier: "local_v3"
        }
      } as AIResponse;
    } catch (e) {
      console.warn("[HybridRouter] Local inference failed, falling back to Cloud Orchestrator.");
    }
  }

  // ═══ Call AI Provider (with circuit breaker + retry) ═══
  const data = await withCircuitBreaker(
    "ai-orchestrator",
    async () => {
      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
          body: {
            ...effectiveOptions,
            model_type: effectiveOptions.modelType,
            thinking_enabled: effectiveOptions.thinkingEnabled || false,
            tools: effectiveOptions.tools,
          },
        });
        if (error) throw new Error(error.message || "Erro ao chamar orquestrador de IA");
        return data;
      },
      2,
      500,
    );

    const response = data as AIResponse;
    
    // Handle DeepSeek V3.2 tool_calls response
    if ((data as any).requires_tool_execution) {
      return {
        content: "",
        provider: (data as any).provider || "deepseek",
        fallback: false,
        neuralEnhanced: false,
        reasoningContent: (data as any).reasoning_content,
        toolCalls: (data as any).tool_calls,
        requiresToolExecution: true,
        usage: (data as any).usage,
        metadata: { jurisprudenceCount: 0, knowledgeCount: 0, specializationsCount: 0, latencyMs: Date.now() - startTime },
      };
    }

    if (!response.metadata) {
      response.metadata = { jurisprudenceCount: 0, knowledgeCount: 0, specializationsCount: 0 };
    }
    response.metadata.latencyMs = Date.now() - startTime;
    response.reasoningContent = (data as any).reasoning_content;
    response.usage = (data as any).usage;

  // ═══ Post-Process Response through LLM Judge ═══
  if (shouldRunPipeline && response.content) {
    try {
      const postProcess = postProcessResponse(response.content, options.documentType);
      response.metadata.pipelineJudgeGrade = postProcess.verdict.grade;

      // Cache successful responses
      if (postProcess.verdict.overallScore >= 60) {
        cacheResponse(options.prompt, options.useCase || "general", response.content);
      }
    } catch (e) {
      console.warn("[NeuralPipeline] Post-processing error (non-fatal):", e);
    }
  }

  // ═══ Anti-Hallucination Check (Quantum-Enhanced v2.0) ═══
  if (response.content) {
    try {
      const antiHalReport = validateNeuralResponse(
        options.prompt,
        response.content,
        {
          useQuantum: true,
          sources: pipelineOutput?.systemContext
            ? [{ source: "neural_context", content: pipelineOutput.systemContext }]
            : undefined,
        }
      );

      // Dispatch for UI
      dispatchAntiHallucinationReport(antiHalReport);

      // Add disclaimer for low-confidence responses
      if (antiHalReport.freeEnergy.severity === "high") {
        const warningText = antiHalReport.hallucinations
          .filter(w => w.severity === "high")
          .map(w => `⚠️ ${w.entity}: ${w.reason}`)
          .join("\n");
        
        response.content += `\n\n---\n**⚠️ Alertas de verificação (confiança: ${antiHalReport.overallConfidence}%):**\n${warningText}`;
        
        if (antiHalReport.sourceGrounding.ungroundedClaims.length > 0) {
          response.content += `\n**📌 Citações não verificadas:** ${antiHalReport.sourceGrounding.ungroundedClaims.join(", ")}`;
        }
        
        console.warn(`[AntiHallucination:Neural] FE=${antiHalReport.freeEnergy.freeEnergy}, QFE=${antiHalReport.quantumFreeEnergy?.freeEnergy ?? "N/A"}, confidence=${antiHalReport.overallConfidence}%, grounding=${antiHalReport.sourceGrounding.groundingScore}%`);
      } else if (antiHalReport.freeEnergy.severity === "low" && antiHalReport.freeEnergy.disclaimer) {
        response.content += `\n\n${antiHalReport.freeEnergy.disclaimer}`;
      }

      // Store correction prompt for potential use
      if (antiHalReport.correctionPrompt) {
        (response as any)._correctionPrompt = antiHalReport.correctionPrompt;
      }

      response.metadata.antiHallucinationConfidence = antiHalReport.overallConfidence;
      response.metadata.antiHallucinationFE = antiHalReport.quantumFreeEnergy?.freeEnergy ?? antiHalReport.freeEnergy.freeEnergy;
      response.metadata.antiHallucinationGrounding = antiHalReport.sourceGrounding.groundingScore;

      console.log(`[AntiHallucination:Neural] confidence=${antiHalReport.overallConfidence}%, ${antiHalReport.processingMs}ms`);
    } catch (e) {
      console.warn("[AntiHallucination] Check error (non-fatal):", e);
    }
  }

  // ═══ Feed Theory of Mind with real interaction ═══
  try {
    const { getAgenteEu } = await import("./neural/agents/self-model-agent");
    getAgenteEu().processChat(options.prompt, response.content || "", response.provider);
  } catch (e) {
    console.warn("[Orchestrator] ToM feed error (non-fatal):", e);
  }

  // ═══ Attach pipeline metadata ═══
  if (pipelineOutput) {
    response.metadata.pipelineDurationMs = pipelineOutput.totalDurationMs;
    response.metadata.pipelineTier = pipelineOutput.tier;
    response.metadata.pipelineModules = pipelineOutput.modulesActivated;
    response.metadata.pipelineConceptCategory = pipelineOutput.conceptCategory;
    response.metadata.pipelineCompletenessScore = pipelineOutput.completeness?.score;
    response.metadata.pipelineCacheHit = pipelineOutput.cacheHit;
    response.neuralEnhanced = true;
    response.pipelineOutput = pipelineOutput;
  }

  return response;
}
