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
      this.state.reasoning = await this.reasoning.process(
        { perception: this.state.perception, memory: this.state.memory },
        context
      );

      const midCheck = await this.meta.validateReasoning(this.state.reasoning);
      if (!midCheck.valid) {
        console.warn("[CORTEX] Mid-Reasoning warning, adjusting...");
        // Re-run reasoning with adjustments if possible
      }

      // 4. Action
      await this.transition("acting");
      this.state.action = await this.action.process(this.state.reasoning, context);

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
