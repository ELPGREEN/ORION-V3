import { IPentagonLayer, ReasoningResult, PerceptionResult, MemoryResult, PentagonContext, recordToolCall, completeToolCall } from "../types";

import { ExtendedReasoningResult } from "./reasoning-types";
export type { ExtendedReasoningResult };

export class ReasoningAdapter implements IPentagonLayer<PerceptionResult, ReasoningResult> {
  async execute(input: PerceptionResult, context: PentagonContext): Promise<ReasoningResult> {
    const toolId = recordToolCall(context, "ReasoningAdapter", "execute");
    const start = Date.now();

    const query = input.intent;
    const baseResult: ExtendedReasoningResult = {
      intent: input.intent,
      confidence: 0.85,
      rationale: "Reasoning based on perception.",
      plan: ["Analyze input", "Formulate response"],
      metadata: { durationMs: 0 }
    };

    // Async Feynman Loop (fire-and-forget) to break cycle and allow background refinement
    import("./FeynmanReasoner").then(({ FeynmanReasoner }) => {
      FeynmanReasoner.refine(baseResult, query).then(refined => {
        console.log("[ReasoningAdapter] Refined result received:", refined.intent);
      });
    });

    baseResult.metadata!.durationMs = Date.now() - start;
    completeToolCall(context, toolId, baseResult);
    return baseResult;
  }
}
