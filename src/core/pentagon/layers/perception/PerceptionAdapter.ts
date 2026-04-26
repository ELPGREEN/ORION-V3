import { IPentagonLayer, PerceptionResult } from "../types";
import { analyzeSemantics } from "@/lib/neural/nlp-semantic-analyzer";
import { smartClassify } from "@/lib/neural/smart-intent-classifier";

export class PerceptionAdapter implements IPentagonLayer<string, PerceptionResult> {
  public async process(input: string, context: any): Promise<PerceptionResult> {
    const analysis = analyzeSemantics(input, context?.wmContext || "");
    const classification = await smartClassify(input);

    return {
      intent: classification.intent,
      entities: analysis.entities || {},
      sentiment: analysis.sentiment.primary,
      rawInput: input,
      contextualMarkers: analysis.keywords || [],
      // Novos campos para governança de ferramentas
      isNegation: classification.isNegation,
      confidence: classification.confidence
    };
  }
}
