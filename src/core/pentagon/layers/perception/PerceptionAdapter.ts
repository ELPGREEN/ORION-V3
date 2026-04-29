import { IPentagonLayer, PerceptionResult } from "../types";
import { analyzeSemantics } from "@/lib/neural/nlp-semantic-analyzer";

export class PerceptionAdapter implements IPentagonLayer<string, PerceptionResult> {
  public async process(input: string, context: any): Promise<PerceptionResult> {
    // Integra com o analisador semântico existente
    const analysis = analyzeSemantics(input, context?.wmContext || "");

    return {
      intent: analysis.domain === "geral" ? "conversational" : analysis.domain,
      entities: (analysis.entities || {}) as any,
      sentiment: analysis.sentiment.primary,
      rawInput: input,
      contextualMarkers: (analysis.entities || []).map((e: any) => e?.text ?? e?.value ?? "").filter(Boolean),
      complexity: analysis.complexity
    };
  }
}
