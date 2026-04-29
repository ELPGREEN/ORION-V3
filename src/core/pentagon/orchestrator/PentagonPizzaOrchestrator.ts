/**
 * 🧠 Pentagon Pizza Orchestrator (The Cortex)
 * Operates the cognitive loop: Perception -> Memory -> Reasoning -> Action -> Eval
 * Enhanced with Geometric Metacognition, Feynman Loop, Quantum Router Early Exit,
 * Shared Context State, Stop Conditions, and Structured Output.
 */
import {
  CognitiveState,
  PerceptionResult,
  MemoryResult,
  ReasoningResult,
  ActionResult,
  MetaResult,
  PentagonContext,
  PentagonStructuredOutput,
  createPentagonContext,
  checkStopConditions,
  recordToolCall,
  completeToolCall,
} from "../layers/types";
import { quantumRouteQuery } from "@/lib/neural/quantum-llm-router";

export interface PentagonPizzaState {
  currentState: CognitiveState;
  perception?: PerceptionResult;
  memory?: MemoryResult;
  reasoning?: ReasoningResult;
  action?: ActionResult;
  meta?: MetaResult;
  history: CognitiveState[];
}

interface QuantumEarlyExit {
  success: boolean;
  output: string;
  data: { quantumEarlyExit: true; provider: string; complexity: string; routingMs: number };
}

export class PentagonPizzaOrchestrator {
  private state: PentagonPizzaState = {
    currentState: "idle",
    history: []
  };

  constructor(
    private perception: any,
    private memory: any,
    private reasoning: any,
    private action: any,
    private meta: any
  ) {}

  private async transition(newState: CognitiveState) {
    console.log(`[CORTEX] Transitioning: ${this.state.currentState} -> ${newState}`);
    this.state.history.push(this.state.currentState);
    this.state.currentState = newState;
  }

  private isFastLane(input: string, intent?: string): boolean {
    const q = input.toLowerCase().trim();
    if (q.length < 2) return true;

    if (/^(pare|parar|stop|cancelar|sil[êe]ncio|shh|quieto|voltar|ajuda|help|ola|ol[aá]|oi|bom dia|boa tarde|boa noite|tchau|adeus)$|^(quem [eé]|o que [eé]|onde fica|qual [oa])\b/i.test(q)) {
      return true;
    }

    if (intent === "control" || intent === "greeting") return true;

    return false;
  }

  private async quantumEarlyExit(input: string, context: PentagonContext): Promise<QuantumEarlyExit | null> {
    const routing = quantumRouteQuery(input, { preferSpeed: true, modelType: "fast" });

    if (routing.complexity !== "simple") return null;
    if (routing.allScores.length === 0) return null;

    const topScore = routing.allScores[0].finalScore;
    if (topScore < 0.5) return null;

    console.log(
      `[CORTEX] ⚛️ Quantum early exit → ${routing.selectedProvider.id} ` +
      `(complexity=${routing.complexity}, score=${topScore}, ${routing.routingLatencyMs}ms)`
    );

    context.accumulatedCost += 0.01;
    recordToolCall(context, "search_web", { query: input });

    this.backgroundLearn(input, context);

    return {
      success: true,
      output: "",
      data: {
        quantumEarlyExit: true,
        provider: routing.selectedProvider.id,
        complexity: routing.complexity,
        routingMs: routing.routingLatencyMs,
      },
    };
  }

  private async backgroundLearn(input: string, context: PentagonContext): Promise<void> {
    try {
      const perception = await this.perception.process(input, context);
      const memory = await this.memory.process(perception, context);
      if (memory?.mergedContext) {
        console.log(`[CORTEX] 🧠 Background memory cached (${memory.mergedContext.length} chars)`);
      }
    } catch (err) {
      console.warn("[CORTEX] Background learn failed (non-fatal):", err);
    }
  }

  public async runCycle(input: string, contextOptions: any = {}): Promise<ActionResult> {
    const ctx = createPentagonContext(input, {
      maxSteps: contextOptions.maxSteps ?? 10,
      maxCost: contextOptions.maxCost ?? 5.0,
      maxDurationMs: contextOptions.maxDurationMs ?? 30000,
      domain: contextOptions.domain,
      forceTool: contextOptions.forceTool,
      forceRag: contextOptions.forceRag,
      skipFeynman: contextOptions.skipFeynman,
    });

    return this.executeCycle(input, ctx);
  }

  /**
   * Run cycle with structured output format
   */
  public async runCycleStructured(input: string, contextOptions: any = {}): Promise<PentagonStructuredOutput> {
    const ctx = createPentagonContext(input, {
      maxSteps: contextOptions.maxSteps ?? 10,
      maxCost: contextOptions.maxCost ?? 5.0,
      maxDurationMs: contextOptions.maxDurationMs ?? 30000,
      domain: contextOptions.domain,
      forceTool: contextOptions.forceTool,
      forceRag: contextOptions.forceRag,
      skipFeynman: contextOptions.skipFeynman,
    });

    const result = await this.executeCycle(input, ctx);
    const duration = Date.now() - ctx.startedAt;

    return {
      success: result.success,
      output: result.output,
      metadata: {
        cycleId: ctx.cycleId,
        cognitiveStates: this.state.history,
        stepsTaken: ctx.stepCount,
        totalCost: ctx.accumulatedCost,
        durationMs: duration,
        earlyExit: !!(result.data?.fastLane || result.data?.quantumEarlyExit),
        earlyExitType: result.data?.fastLane ? "fast_lane" : result.data?.quantumEarlyExit ? "quantum" : ctx.stopReason === "quality_threshold_met" ? "quality_met" : ctx.stopReason ? "stop_condition" : undefined,
      },
      toolCalls: ctx.toolCalls.map(tc => ({
        tool: tc.tool,
        args: tc.args,
        result: tc.result,
        durationMs: tc.completedAt ? tc.completedAt - tc.startedAt : undefined,
      })),
      confidence: this.state.reasoning?.confidence,
      error: result.data?.error,
      sourcesUsed: this.state.memory?.ragSnippets?.slice(0, 5),
    };
  }

  private async executeCycle(input: string, ctx: PentagonContext): Promise<ActionResult> {
    try {
      if (this.isFastLane(input, ctx.sharedState?.intent as string | undefined)) {
        console.log("[CORTEX] ⚡ Fast Lane hit. Bypassing full cycle.");
        return {
          success: true,
          output: "",
          data: { fastLane: true }
        };
      }

      const earlyExit = await this.quantumEarlyExit(input, ctx);
      if (earlyExit) {
        return earlyExit as unknown as ActionResult;
      }

      // 1. Perception
      ctx.stepCount++;
      if (checkStopConditions(ctx)) return this.stopResult(ctx);
      await this.transition("perceiving");

      const preCheck = await this.meta.validateInput(input);
      if (!preCheck.valid) throw new Error(`Pre-Input Guard Breach: ${preCheck.feedback}`);

      const preToolCall = recordToolCall(ctx, "search_web", { query: input });
      this.state.perception = await this.perception.process(input, ctx);
      completeToolCall(preToolCall, this.state.perception);

      // 2. Memory
      ctx.stepCount++;
      if (checkStopConditions(ctx)) return this.stopResult(ctx);
      await this.transition("remembering");

      const memToolCall = recordToolCall(ctx, "retrieve_memory", { query: input });
      this.state.memory = await this.memory.process(this.state.perception, ctx);
      completeToolCall(memToolCall, this.state.memory);

      // 3. Reasoning
      ctx.stepCount++;
      if (checkStopConditions(ctx)) return this.stopResult(ctx);
      await this.transition("reasoning");

      const reasonToolCall = recordToolCall(ctx, "emit_reasoning_plan", { query: input });
      this.state.reasoning = await this.reasoning.process(
        { perception: this.state.perception, memory: this.state.memory },
        ctx
      );
      completeToolCall(reasonToolCall, this.state.reasoning);
      ctx.accumulatedCost += 0.05;

      const midCheck = await this.meta.validateReasoning(this.state.reasoning, ctx);
      if (!midCheck.valid) {
        console.warn("[CORTEX] Mid-Reasoning warning/block:", midCheck.feedback);
        if (midCheck.score < 50) {
           this.state.reasoning.responseHint = `[Aviso Metacognitivo]: ${midCheck.feedback}\n\n${this.state.reasoning.responseHint}`;
        }
      }

      // 4. Action
      ctx.stepCount++;
      if (checkStopConditions(ctx)) return this.stopResult(ctx);
      await this.transition("acting");

      const isFactQuery = /(hoje|agora|atualmente|not[íi]cia|pre[çc]o|tempo|clima|evento|quem [eé]|o que [eé]|onde fica)/i.test(input);
      if (isFactQuery && (!this.state.reasoning?.plan?.some((p: string) => p.includes("tool") || p.includes("search") || p.includes("firecrawl")))) {
        console.log("[CORTEX] 🛠️ Fact query detected. Forcing tool execution.");
        ctx.forceTool = true;
      }

      this.state.action = await this.action.process(this.state.reasoning, ctx);

      const result = this.state.action;

      Promise.resolve().then(async () => {
        try {
          ctx.stepCount++;
          await this.transition("evaluating");

          const validateToolCall = recordToolCall(ctx, "validate_output", { output: result.output });
          this.state.meta = await this.meta.validateOutput(result);
          completeToolCall(validateToolCall, this.state.meta);

          if (this.state.meta.score > 80) {
            await this.memory.learn(this.state);
          }

          if (this.state.meta.score >= 90) {
            ctx.stopReason = "quality_threshold_met";
          }

          await this.transition("idle");
        } catch (err) {
          console.warn("[CORTEX] Background eval/learn failed (non-fatal):", err);
          await this.transition("idle");
        }
      });

      return result;

    } catch (error: any) {
      console.error("[CORTEX] Critical Loop Failure:", error);
      await this.transition("idle");
      return {
        success: false,
        output: "Desculpe, ocorreu uma falha no meu loop cognitivo.",
        data: { error: error.message }
      };
    }
  }

  private stopResult(ctx: PentagonContext): ActionResult {
    console.log(`[CORTEX] 🛑 Cycle stopped: ${ctx.stopReason} (step=${ctx.stepCount}, cost=${ctx.accumulatedCost.toFixed(2)})`);
    return {
      success: ctx.stopReason === "quality_threshold_met",
      output: ctx.stopReason === "timeout" ? "Tempo limite excedido." :
              ctx.stopReason === "max_steps" ? "Limite de passos atingido." :
              ctx.stopReason === "max_cost" ? "Limite de custo atingido." : "Ciclo interrompido.",
      data: { stopReason: ctx.stopReason, stepsTaken: ctx.stepCount, totalCost: ctx.accumulatedCost }
    };
  }

  public getState(): PentagonPizzaState {
    return { ...this.state };
  }
}
