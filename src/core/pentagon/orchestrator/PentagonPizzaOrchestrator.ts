/**
 * 🧠 Pentagon Pizza Orchestrator (The Cortex)
 * Operates the cognitive loop: Perception -> Memory -> Reasoning -> Action -> Eval
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

  public async runCycle(input: string, context: any = {}): Promise<ActionResult> {
    try {
      // 1. Perception Layer
      await this.transition("perceiving");
      const preCheck = await this.meta.validateInput(input);
      if (!preCheck.valid) {
        return {
          success: false,
          output: `Falha de segurança/entrada: ${preCheck.feedback}`,
          data: { breach: preCheck.guardrailBreach }
        };
      }

      this.state.perception = await this.perception.process(input, context);

      // 2. Memory Layer (with CRAG integration)
      await this.transition("remembering");
      this.state.memory = await this.memory.process(this.state.perception, context);

      // 3. Reasoning Layer (with Strict Grounding)
      await this.transition("reasoning");
      this.state.reasoning = await this.reasoning.process(
        { perception: this.state.perception, memory: this.state.memory },
        context
      );

      const midCheck = await this.meta.validateReasoning(this.state.reasoning);
      if (!midCheck.valid) {
        console.warn(`[CORTEX] Logical consistency check failed: ${midCheck.feedback}`);
        // Se a coerência estiver baixa, tentamos uma rota de fallback ou pedimos esclarecimento
        if (midCheck.guardrailBreach === "hallucination_detected") {
          return {
            success: false,
            output: "Identifiquei uma possível inconsistência lógica no meu raciocínio. Poderia reformular ou fornecer mais detalhes?",
            data: { reason: midCheck.feedback }
          };
        }
      }

      // 4. Action Layer (The ROI)
      await this.transition("acting");
      this.state.action = await this.action.process(this.state.reasoning, context);

      // 5. Evaluation Layer (Post-Output Grounding)
      await this.transition("evaluating");
      const postCheck = await this.meta.validateOutput(
        this.state.action,
        this.state.memory?.mergedContext || "",
        input
      );
      this.state.meta = postCheck;

      if (!postCheck.valid) {
        console.error(`[CORTEX] Hallucination detected in final output! Blocking response.`);
        return {
          success: false,
          output: "Minha análise final detectou falta de fundamentação no contexto fornecido. Estou trabalhando para melhorar minha precisão.",
          data: { error: postCheck.feedback }
        };
      }

      // Aprendizado se a qualidade for alta
      if (postCheck.score > 85) {
        await this.memory.learn(this.state);
      }

      await this.transition("idle");
      return this.state.action;

    } catch (error: any) {
      console.error("[CORTEX] Critical Loop Failure:", error);
      await this.transition("idle");
      return {
        success: false,
        output: "Ocorreu uma falha no meu processamento lógico. Por favor, tente novamente.",
        data: { error: error.message }
      };
    }
  }

  public getState(): PentagonPizzaState {
    return { ...this.state };
  }
}
