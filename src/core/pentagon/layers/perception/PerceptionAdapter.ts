import { IPentagonLayer, PerceptionResult, PentagonContext } from "../types";
import { analyzeSemantics } from "@/lib/neural/nlp-semantic-analyzer";

export class PerceptionAdapter implements IPentagonLayer<string, PerceptionResult> {
  public async process(input: string, context: PentagonContext): Promise<PerceptionResult> {
    const analysis = analyzeSemantics(input, (context.sharedState?.wmContext as string) || "");

    return {
      intent: analysis.domain === "geral" ? "conversational" : analysis.domain,
      entities: (analysis.entities || {}) as Record<string, unknown>,
      sentiment: analysis.sentiment.primary,
      rawInput: input,
      contextualMarkers: (analysis.entities || []).map((e: Record<string, unknown>) => e?.text ?? e?.value ?? "").filter(Boolean),
      complexity: analysis.complexity as "simple" | "medium" | "complex"
    };
  }
}
