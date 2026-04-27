import { IPentagonLayer, PerceptionResult } from "../types";
import { analyzeSemantics } from "@/lib/neural/nlp-semantic-analyzer";

export class PerceptionAdapter implements IPentagonLayer<string, PerceptionResult> {
  public async process(input: string, context: any): Promise<PerceptionResult> {
    // ⚡ Integrated with Bolt-optimized semantic engine
    const analysis = analyzeSemantics(input, context?.wmContext || "");

    return {
      intent: analysis.domain === "geral" ? "conversational" : analysis.domain,
      entities: analysis.entities,
      sentiment: analysis.sentiment.primary,
      rawInput: input,
      contextualMarkers: [
        analysis.discourseType,
        analysis.complexity,
        ...analysis.entities.map(e => e.normalized)
      ]
    };
  }
}
