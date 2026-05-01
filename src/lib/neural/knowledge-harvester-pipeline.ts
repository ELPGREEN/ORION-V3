/**
 * ─── Knowledge Harvester Pipeline ───
 * Pipeline de estudo sequencial multi-LLM com autoavaliação,
 * consenso entre modelos e integração com memória persistente.
 *
 * Orquestra os 10 prompts autocognitivos em sequências configuráveis.
 */

import { supabase } from "@/integrations/supabase/client";
import { getApiKey, createLLMClient, type LLMProvider } from "@/lib/integrations/llm-providers";
import {
  AUTOCOGNITIVE_PROMPTS,
  KNOWLEDGE_TOPICS,
  type AutocognitivePrompt,
  getPromptById,
  getRandomTopic,
} from "./knowledge-harvester-prompts";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface HarvestResult {
  promptId: string;
  topic: string;
  content: string;
  model: string;
  provider: string;
  confidence: number;
  clarity: number;
  depth: number;
  uncertainty: number;
  timestamp: number;
  executionTimeMs: number;
  tokensUsed?: { input: number; output: number; total: number };
}

export interface HarvestSession {
  id: string;
  topic: string;
  results: HarvestResult[];
  consensusAnswer: string;
  overallConfidence: number;
  startedAt: number;
  completedAt: number;
}

export interface PipelineConfig {
  prompts: string[];
  models: { provider: LLMProvider; model: string }[];
  enableConsensus: boolean;
  enableSelfEval: boolean;
  enableAntiHallucination: boolean;
  maxRetries: number;
  saveToMemory: boolean;
}

export type PipelineStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface PipelineState {
  status: PipelineStatus;
  currentPrompt: string | null;
  currentModel: string | null;
  progress: number;
  totalSteps: number;
  results: HarvestResult[];
  error: string | null;
}

// ═══════════════════════════════════════════════
// Default Configurations
// ═══════════════════════════════════════════════

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  prompts: ["master_study", "probability_uncertainty", "anti_hallucination", "self_test"],
  models: [
    { provider: "openrouter", model: "openrouter/free" },
    { provider: "openrouter", model: "deepseek/deepseek-r1" },
    { provider: "openrouter", model: "tencent/hy3-preview:free" },
  ],
  enableConsensus: true,
  enableSelfEval: true,
  enableAntiHallucination: true,
  maxRetries: 2,
  saveToMemory: true,
};

export const QUICK_PIPELINE: PipelineConfig = {
  prompts: ["master_study", "anti_hallucination"],
  models: [{ provider: "openrouter", model: "openrouter/free" }],
  enableConsensus: false,
  enableSelfEval: true,
  enableAntiHallucination: true,
  maxRetries: 1,
  saveToMemory: true,
};

export const FULL_PIPELINE: PipelineConfig = {
  prompts: AUTOCOGNITIVE_PROMPTS.map((p) => p.id),
  models: [
    { provider: "openrouter", model: "openrouter/free" },
    { provider: "openrouter", model: "deepseek/deepseek-r1" },
    { provider: "openrouter", model: "qwen/qwen3-coder" },
    { provider: "openrouter", model: "tencent/hy3-preview:free" },
  ],
  enableConsensus: true,
  enableSelfEval: true,
  enableAntiHallucination: true,
  maxRetries: 3,
  saveToMemory: true,
};

// ═══════════════════════════════════════════════
// Knowledge Harvester Pipeline Class
// ═══════════════════════════════════════════════

export class KnowledgeHarvesterPipeline {
  private config: PipelineConfig;
  private state: PipelineState;
  private callbacks: {
    onStep?: (step: number, total: number, promptId: string, model: string) => void;
    onResult?: (result: HarvestResult) => void;
    onComplete?: (session: HarvestSession) => void;
    onError?: (error: string) => void;
    onStatusChange?: (status: PipelineStatus) => void;
  } = {};

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    this.state = {
      status: "idle",
      currentPrompt: null,
      currentModel: null,
      progress: 0,
      totalSteps: 0,
      results: [],
      error: null,
    };
  }

  on(callbacks: typeof this.callbacks): this {
    this.callbacks = { ...this.callbacks, ...callbacks };
    return this;
  }

  getState(): PipelineState {
    return { ...this.state };
  }

  cancel(): void {
    this.updateStatus("cancelled");
  }

  async run(topic: string): Promise<HarvestSession> {
    this.updateStatus("running");
    const startedAt = Date.now();
    const sessionId = `harvest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const results: HarvestResult[] = [];

    const totalSteps =
      this.config.prompts.length *
      (this.config.enableConsensus ? this.config.models.length : 1) +
      (this.config.enableAntiHallucination ? this.config.prompts.length : 0);

    this.state = { ...this.state, totalSteps, progress: 0, results: [] };

    try {
      let step = 0;

      for (const promptId of this.config.prompts) {
        if (this.state.status === "cancelled") break;

        const promptDef = getPromptById(promptId);
        if (!promptDef) {
          console.warn(`[Harvester] Unknown prompt: ${promptId}`);
          continue;
        }

        const formattedPrompt = promptDef.buildPrompt(topic);

        if (this.config.enableConsensus && this.config.models.length > 1) {
          const modelResponses: HarvestResult[] = [];

          for (const modelConfig of this.config.models) {
            if ((this.state.status as string) === "cancelled") break;

            step++;
            this.updateProgress(step, totalSteps, promptId, modelConfig.model);

            const result = await this.executePrompt(
              formattedPrompt,
              modelConfig.provider,
              modelConfig.model,
              topic,
              promptId
            );

            if (result) {
              modelResponses.push(result);
              results.push(result);
              this.callbacks.onResult?.(result);
            }
          }

          if (modelResponses.length > 1) {
            const consensus = await this.computeConsensus(modelResponses, topic, promptId);
            if (consensus) {
              results.push(consensus);
              this.callbacks.onResult?.(consensus);
            }
          }
        } else {
          step++;
          const modelConfig = this.config.models[0];
          this.updateProgress(step, totalSteps, promptId, modelConfig.model);

          const result = await this.executePrompt(
            formattedPrompt,
            modelConfig.provider,
            modelConfig.model,
            topic,
            promptId
          );

          if (result) {
            results.push(result);
            this.callbacks.onResult?.(result);
          }
        }
      }

      const completedAt = Date.now();

      const session: HarvestSession = {
        id: sessionId,
        topic,
        results,
        consensusAnswer: this.extractConsensusAnswer(results),
        overallConfidence: this.computeOverallConfidence(results),
        startedAt,
        completedAt,
      };

      if (this.config.saveToMemory) {
        await this.saveToMemory(session);
      }

      this.state = { ...this.state, status: "completed", results, progress: totalSteps };
      this.callbacks.onComplete?.(session);

      return session;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.state = { ...this.state, status: "failed", error: errorMsg };
      this.callbacks.onError?.(errorMsg);
      throw error;
    }
  }

  private async executePrompt(
    prompt: string,
    provider: LLMProvider,
    model: string,
    topic: string,
    promptId: string
  ): Promise<HarvestResult | null> {
    const apiKey = getApiKey(provider);
    if (!apiKey) return null;

    const startTime = Date.now();
    const client = createLLMClient(provider, model, apiKey);

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await client.chat([{ role: "user", content: prompt }]);

        const evalMetrics = this.config.enableSelfEval
          ? this.extractSelfEvalMetrics(response.content)
          : { confidence: 0.7, clarity: 0.7, depth: 0.7, uncertainty: 0.3 };

        return {
          promptId,
          topic,
          content: response.content,
          model: response.model,
          provider,
          confidence: evalMetrics.confidence,
          clarity: evalMetrics.clarity,
          depth: evalMetrics.depth,
          uncertainty: evalMetrics.uncertainty,
          timestamp: Date.now(),
          executionTimeMs: Date.now() - startTime,
          tokensUsed: response.usage,
        };
      } catch (error) {
        console.warn(`[Harvester] Attempt ${attempt + 1} failed for ${model}:`, error);
        if (attempt === this.config.maxRetries) {
          return null;
        }
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    return null;
  }

  private async computeConsensus(
    responses: HarvestResult[],
    topic: string,
    promptId: string
  ): Promise<HarvestResult | null> {
    if (responses.length < 2) return null;

    const consensusPrompt = `Com base nas respostas de múltiplos modelos sobre "${topic}", gere uma resposta consolidada.

MODELO 1 (${responses[0].model}):
${responses[0].content.slice(0, 2000)}

MODELO 2 (${responses[1].model}):
${responses[1].content.slice(0, 2000)}

${responses.length > 2 ? `MODELO 3 (${responses[2].model}):\n${responses[2].content.slice(0, 2000)}` : ""}

TAREFA:
1. Identifique pontos de concordância entre os modelos
2. Identifique conflitos e resolva-os
3. Gere uma resposta consolidada que combina o melhor de cada modelo
4. Atribua nível de confiança (0-1) à resposta final

SAÍDA: Resposta consolidada + análise de consenso + confiança.`;

    const modelConfig = this.config.models[0];
    const apiKey = getApiKey(modelConfig.provider);
    if (!apiKey) return null;

    try {
      const client = createLLMClient(modelConfig.provider, modelConfig.model, apiKey);
      const response = await client.chat([{ role: "user", content: consensusPrompt }]);

      const metrics = this.extractSelfEvalMetrics(response.content);
      const avgConfidence = responses.reduce((s, r) => s + r.confidence, 0) / responses.length;

      return {
        promptId,
        topic,
        content: response.content,
        model: `consensus(${responses.map((r) => r.model).join(",")})`,
        provider: "consensus",
        confidence: Math.min(1, avgConfidence * 1.1),
        clarity: metrics.clarity,
        depth: metrics.depth,
        uncertainty: Math.max(0, metrics.uncertainty * 0.8),
        timestamp: Date.now(),
        executionTimeMs: Date.now() - (responses[0]?.timestamp || Date.now()),
      };
    } catch {
      return null;
    }
  }

  private extractSelfEvalMetrics(content: string): {
    confidence: number;
    clarity: number;
    depth: number;
    uncertainty: number;
  } {
    const extractNumber = (pattern: RegExp): number | null => {
      const match = content.match(pattern);
      if (!match) return null;
      const num = parseFloat(match[1]);
      return isNaN(num) ? null : Math.max(0, Math.min(1, num));
    };

    const confidence = extractNumber(/confian[çc]a.*?([\d.]+)/i) ?? 0.7;
    const clarity = extractNumber(/clareza.*?([\d.]+)/i) ?? 0.7;
    const depth = extractNumber(/profundidade.*?([\d.]+)/i) ?? 0.7;
    const uncertainty = extractNumber(/incerteza.*?([\d.]+)/i) ?? 0.3;

    return { confidence, clarity, depth, uncertainty };
  }

  private extractConsensusAnswer(results: HarvestResult[]): string {
    const consensus = results.find((r) => r.provider === "consensus");
    if (consensus) return consensus.content;
    const sorted = [...results].sort((a, b) => b.confidence - a.confidence);
    return sorted[0]?.content || "";
  }

  private computeOverallConfidence(results: HarvestResult[]): number {
    if (results.length === 0) return 0;
    const consensus = results.find((r) => r.provider === "consensus");
    if (consensus) return consensus.confidence;
    return results.reduce((s, r) => s + r.confidence, 0) / results.length;
  }

  private async saveToMemory(session: HarvestSession): Promise<void> {
    try {
      const sb = supabase as unknown as { from: (t: string) => { insert: (v: unknown) => Promise<unknown> } };
      await sb.from("harvester_sessions").insert({
        id: session.id,
        topic: session.topic,
        results_count: session.results.length,
        overall_confidence: session.overallConfidence,
        started_at: new Date(session.startedAt).toISOString(),
        completed_at: new Date(session.completedAt).toISOString(),
      });

      for (const result of session.results) {
        await sb.from("harvester_results").insert({
          session_id: session.id,
          prompt_id: result.promptId,
          topic: result.topic,
          content: result.content.slice(0, 50000),
          model: result.model,
          provider: result.provider,
          confidence: result.confidence,
          clarity: result.clarity,
          depth: result.depth,
          uncertainty: result.uncertainty,
          execution_time_ms: result.executionTimeMs,
        });
      }
    } catch (error) {
      console.warn("[Harvester] Failed to save to memory:", error);
    }
  }

  private updateProgress(step: number, total: number, promptId: string, model: string): void {
    this.state = { ...this.state, progress: step, currentPrompt: promptId, currentModel: model };
    this.callbacks.onStep?.(step, total, promptId, model);
  }

  private updateStatus(status: PipelineStatus): void {
    this.state = { ...this.state, status };
    this.callbacks.onStatusChange?.(status);
  }
}

// ═══════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════

export function createQuickHarvester(topic?: string): KnowledgeHarvesterPipeline {
  return new KnowledgeHarvesterPipeline(QUICK_PIPELINE);
}

export function createFullHarvester(topic?: string): KnowledgeHarvesterPipeline {
  return new KnowledgeHarvesterPipeline(FULL_PIPELINE);
}

export function createCustomHarvester(config: Partial<PipelineConfig>): KnowledgeHarvesterPipeline {
  return new KnowledgeHarvesterPipeline(config);
}
