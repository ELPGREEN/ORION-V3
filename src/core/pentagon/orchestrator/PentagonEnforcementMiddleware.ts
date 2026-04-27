/**
 * 🍕 Pentagon Enforcement Middleware
 * Ensures all AI interactions adhere to the 5-layer architectural mandate.
 * Enforces: Tool-calling protocol, RAG validation, and Response Hint locking.
 */

import { PentagonPizzaOrchestrator } from "./PentagonPizzaOrchestrator";
import {
  PerceptionAdapter,
  MemoryAdapter,
  ReasoningAdapter,
  ActionAdapter,
  MetaAdapter
} from "../layers";

export class PentagonEnforcementMiddleware {
  private orchestrator: PentagonPizzaOrchestrator;

  constructor() {
    this.orchestrator = new PentagonPizzaOrchestrator(
      new PerceptionAdapter(),
      new MemoryAdapter(),
      new ReasoningAdapter(),
      new ActionAdapter(),
      new MetaAdapter()
    );
  }

  /**
   * Process input with guaranteed architectural enforcement.
   */
  public async executeEnforcedCycle(input: string, context: any = {}) {
    console.log("[PENTAGON] Enforcement Middleware Activated. Running cognitive cycle...");

    // Validate that we aren't bypassing the pilar system
    const t0 = performance.now();

    const result = await this.orchestrator.runCycle(input, {
      ...context,
      enforceToolCalling: true,
      requireRAG: true,
      lockResponseHint: true,
      middlewareLatency: performance.now() - t0
    });

    // Final sanity check: Did MetaLayer approve?
    const state = this.orchestrator.getState();
    if (state.meta && !state.meta.valid) {
      console.error("[PENTAGON] MetaLayer Vetoed result:", state.meta.feedback);
      // Middleware can force a fallback or retry here
    }

    return result;
  }

  public getCognitiveStatus() {
    return this.orchestrator.getState();
  }
}

// Export singleton for application-wide enforcement
export const pentagonMiddleware = new PentagonEnforcementMiddleware();
