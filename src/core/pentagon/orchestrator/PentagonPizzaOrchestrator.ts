/**
 * 🧠 Pentagon Pizza Orchestrator (The Cortex) - Multimodal & Industrial Edition
 * Operates the cognitive loop: Perception -> Memory -> Reasoning -> Action -> Eval
 * Integrated with AquaMonkey Lumian7 & Algebraic Flow.
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
  multimodalData?: {
    visionDetections?: unknown[];
    telemetry?: unknown;
  };
}


interface IPerceptionLayer { process: (i: string, c: Record<string, any>) => Promise<PerceptionResult>; }
interface IMemoryLayer { process: (p: PerceptionResult, c: Record<string, any>) => Promise<MemoryResult>; learn: (s: PentagonPizzaState) => Promise<void>; }
interface IReasoningLayer { process: (d: { perception: PerceptionResult; memory: MemoryResult; multimodal: unknown }, c: Record<string, any>) => Promise<ReasoningResult>; }
interface IActionLayer { process: (r: ReasoningResult, c: Record<string, any>) => Promise<ActionResult>; }
interface IMetaLayer {
  validateInput: (i: string) => Promise<MetaResult>;
  validateMonetizationQuota: (u: string | undefined) => Promise<MetaResult>;
  validateReasoning: (r: ReasoningResult) => Promise<MetaResult>;
  validateToolActivation: (p: string[], i: PerceptionResult) => Promise<MetaResult>;
  validateOutput: (a: ActionResult, c: string, i: string) => Promise<MetaResult>;
}

export class PentagonPizzaOrchestrator {
  private state: PentagonPizzaState = {
    currentState: "idle",
    history: []
  };

  constructor(
    private perception: IPerceptionLayer,
    private memory: IMemoryLayer,
    private reasoning: IReasoningLayer,
    private action: { process: (r: unknown, c: Record<string, any>) => Promise<ActionResult> },
    private meta: IMetaLayer
  ) {}

  private async transition(newState: CognitiveState) {
    console.log(`[CORTEX] ${newState.toUpperCase()} phase...`);
    this.state.history.push(this.state.currentState);
    if (this.state.history.length > 50) this.state.history.shift();
    this.state.currentState = newState;
  }

  /**
   * Executa o ciclo cognitivo completo com suporte a fluxos algébricos e industriais.
   */
  public async runCycle(input: string, context: Record<string, any> = {}): Promise<ActionResult> {
    try {
      // 1. Perception Layer (Text + Vision + Identity)
      await this.transition("perceiving");

      // Pre-Input Guard (Security & Identity check)
      const preCheck: unknown = await this.meta.validateInput(input);
      if (!preCheck.valid) {
        return { success: false, output: `Acesso Negado: ${preCheck.feedback}`, data: { breach: preCheck.guardrailBreach } };
      }

      this.state.perception = await this.perception.process(input, context);
      const quotaCheck: unknown = await this.meta.validateMonetizationQuota(context?.userId as string);
      if (!quotaCheck.valid) console.warn("[CORTEX] User has low quota, but proceeding to action layer for payment handling...");
      this.state.multimodalData = { visionDetections: (context?.visionDetections as any[]) || [] };

      // 2. Memory Layer (Contextual & Episodic Retrieval)
      await this.transition("remembering");
      this.state.memory = await this.memory.process(this.state.perception, context);

      // 3. Reasoning Layer (Planning & Algebraic Flow)
      await this.transition("reasoning");
      this.state.reasoning = await this.reasoning.process(
        {
          perception: this.state.perception,
          memory: this.state.memory,
          multimodal: this.state.multimodalData
        },
        context
      );

      // Mid-Reasoning Logic Consistency check
      const midCheck: unknown = await this.meta.validateReasoning(this.state.reasoning as ReasoningResult);
      if (!midCheck.valid) {
        return { success: false, output: midCheck.feedback, data: { reason: midCheck.guardrailBreach } };
      }

      // ═══ NOVO: Veto de Ação e Monetização ═══
      const activationCheck: unknown = await this.meta.validateToolActivation(this.state.reasoning?.plan || [], this.state.perception as PerceptionResult);
      if (!activationCheck.valid) {
        return { success: false, output: activationCheck.feedback, data: { veto: activationCheck.guardrailBreach } };
      }

      // 4. Action Layer (Industrial Actuation & ROI Execution)
      await this.transition("acting");
      this.state.action = await this.action.process(this.state.reasoning, context);

      // 5. Evaluation Layer (Post-Output Grounding & Learning)
      await this.transition("evaluating");
      const postCheck: unknown = await this.meta.validateOutput(this.state.action as ActionResult, this.state.memory?.mergedContext || "", input);
      this.state.meta = postCheck;

      if (!postCheck.valid) {
        return { success: false, output: "Erro de ancoragem detectado. Resposta bloqueada por segurança.", data: { error: postCheck.feedback } };
      }

      // AquaMonkey Learning Phase
      if (postCheck.score > 85) {
        await this.memory.learn(this.state);
      }

      await this.transition("idle");
      return this.state.action;

    } catch (error: unknown) {
      console.error("[CORTEX] Loop Failure:", error);
      await this.transition("idle");
      return { success: false, output: "Falha interna no sistema de consciência Órion.", data: { error: (error as Error).message } };
    }
  }

  public getState(): PentagonPizzaState {
    return { ...this.state };
  }
}
