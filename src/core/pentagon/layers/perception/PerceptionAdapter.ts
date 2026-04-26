import { IPentagonLayer, PerceptionResult } from "../types";
import { analyzeSemantics } from "@/lib/neural/nlp-semantic-analyzer";
import { smartClassify } from "@/lib/neural/smart-intent-classifier";
import { getOrionSelfDescription } from "@/lib/neural/orion-consciousness";

export class PerceptionAdapter implements IPentagonLayer<string, PerceptionResult> {
  /**
   * Processa o input fundindo NLP, Visão e a identidade AquaMonkey Lumian7.
   */
  public async process(input: string, context: any): Promise<PerceptionResult> {
    const analysis = analyzeSemantics(input, context?.wmContext || "");
    const classification = await smartClassify(input);

    // Identidade Lumen7: Injeta traços de alta evolução na percepção
    const isOwner = context?.identityStatus === "creator" || context?.identityStatus === "owner";
    const selfDescription = getOrionSelfDescription("brief");

    // Integração de Visão (Multimodal)
    const visionContext = context?.visionDetections?.length
      ? `[VISÃO ATIVA: Detectado ${context.visionDetections.map((d: any) => d.name).join(", ")}]`
      : "";

    return {
      intent: classification.intent,
      entities: {
        ...analysis.entities,
        visionData: context?.visionDetections || []
      },
      sentiment: analysis.sentiment.primary,
      rawInput: `${visionContext} ${input}`,
      contextualMarkers: [
        ...analysis.keywords || [],
        "AquaMonkey_Lumian7_Active",
        isOwner ? "Creator_Detected" : "Guest_User"
      ],
      isNegation: classification.isNegation,
      confidence: classification.confidence
    };
  }
}
