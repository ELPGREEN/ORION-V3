/**
 * 🧠 Pentagon Pizza Orchestrator (The Cortex)
 * Operates the cognitive loop: Perception -> Memory -> Reasoning -> Action -> Eval
 * Enhanced with Geometric Metacognition & Feynman Loop
 */
import {
  CognitiveState,
  PerceptionResult,
  MemoryResult,
  ReasoningResult,
  ActionResult,
  MetaResult
} from "../layers/types";

export interface PentagonPizzaState {
  currentState: CognitiveState;
  perception?: PerceptionResult;
  memory?: MemoryResult;
  reasoning?: ReasoningResult;
  action?: ActionResult;
  meta?: MetaResult;
  history: CognitiveState[];
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

  /**
   * Fast Lane: Deterministic check for greetings and control commands.
   * Minimal cognitive overhead, bypassing the full Pentagon cycle for performance.
   */
  private isFastLane(input: string, intent?: string): boolean {
    const q = input.toLowerCase().trim();
    if (q.length < 2) return true;

    // Explicit control commands
    if (/^(pare|parar|stop|cancelar|sil[êe]ncio|shh|quieto|voltar|ajuda|help|ola|ol[aá]|oi|bom dia|boa tarde|boa noite|tchau|adeus)$/i.test(q)) {
      return true;
    }

    // High-confidence trivial intents from Fast Intent Classifier
    if (intent === "control" || intent === "greeting") return true;

    return false;
  }

  public async runCycle(input: string, context: any = {}): Promise<ActionResult> {
    try {
      // 0. Fast Lane Gate
      if (this.isFastLane(input, context.intent)) {
        console.log("[CORTEX] ⚡ Fast Lane hit. Bypassing full cycle.");
        return {
          success: true,
          output: "", // Let the final generator handle simple greetings if needed
          data: { fastLane: true }
        };
      }

      // 1. Perception
      await this.transition("perceiving");
      const preCheck = await this.meta.validateInput(input);
      if (!preCheck.valid) throw new Error(`Pre-Input Guard Breach: ${preCheck.feedback}`);

      this.state.perception = await this.perception.process(input, context);

      // 2. Memory
      await this.transition("remembering");
      this.state.memory = await this.memory.process(this.state.perception, context);

      // 3. Reasoning
      await this.transition("reasoning");

      let retryCount = 0;
      const MAX_RETRIES = 1;

      do {
        this.state.reasoning = await this.reasoning.process(
          { perception: this.state.perception, memory: this.state.memory },
          context
        );

        // 🍕 RAG Enforcement: If RAG is available but ignored, retry once
        const hasRag = (this.state.memory?.ragSnippets?.length ?? 0) > 0;
        const usesRag = this.state.reasoning?.rationale?.toLowerCase().includes("fonte") ||
                        this.state.reasoning?.rationale?.toLowerCase().includes("[") ||
                        (this.state.reasoning?.responseHint?.length ?? 0) > 100; // heuristic

        if (hasRag && !usesRag && retryCount < MAX_RETRIES) {
          console.warn("[CORTEX] ⚠️ Reasoning ignored RAG. Retrying with enforcement...");
          context.forceRag = true;
          retryCount++;
          continue;
        }
        break;
      } while (retryCount <= MAX_RETRIES);

      // 🍕 Metacognitive Checkpoint (Enhanced with Information Geometry)
      const midCheck = await this.meta.validateReasoning(this.state.reasoning, context);
      if (!midCheck.valid) {
        console.warn("[CORTEX] Mid-Reasoning warning/block:", midCheck.feedback);
        // If the geometric/energy check is very low, we could force a simpler model or a clarification
        if (midCheck.score < 50) {
           this.state.reasoning.responseHint = `[Aviso Metacognitivo]: ${midCheck.feedback}\n\n${this.state.reasoning.responseHint}`;
        }
      }

      // 4. Action (Tool Enforcement)
      await this.transition("acting");

      // 🍕 Tool Enforcement: If query involves current facts/external data, FORCE tools
      const isFactQuery = /(hoje|agora|atualmente|not[íi]cia|pre[çc]o|tempo|clima|evento|quem [eé]|o que [eé]|onde fica)/i.test(input);
      if (isFactQuery && (!this.state.reasoning?.plan?.some((p: string) => p.includes("tool") || p.includes("search") || p.includes("firecrawl")))) {
        console.log("[CORTEX] 🛠️ Fact query detected. Forcing tool execution.");
        context.forceTool = true;
      }

      this.state.action = await this.action.process(this.state.reasoning, { ...context, perception: this.state.perception });

      // 5. Evaluation (Post-Output)
      await this.transition("evaluating");
      this.state.meta = await this.meta.validateOutput(this.state.action);

      if (this.state.meta.score > 80) {
        await this.memory.learn(this.state);
      }

      await this.transition("idle");
      return this.state.action;

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

  public getState(): PentagonPizzaState {
    return { ...this.state };
  }
}
