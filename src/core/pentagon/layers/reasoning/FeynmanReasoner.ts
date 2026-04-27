/**
 * 🎓 Feynman Reasoner — The "Genius" Loop
 * Implements the Feynman Technique: "If you can't explain it simply, you don't understand it well enough."
 */
import { supabase } from "@/integrations/supabase/client";
import { ExtendedReasoningResult } from "./ReasoningAdapter";

export class FeynmanReasoner {
  /**
   * Performs the Feynman Loop:
   * 1. Takes a complex rationale.
   * 2. Attempts to simplify it (Explain to a child).
   * 3. Identifies "Knowledge Gaps" where the simplification fails or becomes too vague.
   */
  public static async refine(original: ExtendedReasoningResult, query: string): Promise<ExtendedReasoningResult> {
    try {
      const { data: result, error } = await supabase.functions.invoke("pentagon-reasoner", {
        body: {
          query,
          originalRationale: original.rationale,
          mode: "feynman_simplification",
          intent: "refine_reasoning"
        },
      });

      if (error || !result?.success) {
        console.warn("[Feynman] Simplification unavailable, returning original.");
        return original;
      }

      // If the Feynman loop detected a significant gap, it might lower the confidence
      const detectedGaps = result.detectedGaps || [];
      const feynmanExplanation = result.simpleExplanation || "";

      const refinedConfidence = detectedGaps.length > 0
        ? Math.max(0.3, original.confidence - (detectedGaps.length * 0.15))
        : original.confidence;

      return {
        ...original,
        rationale: original.rationale, // Keep original
        responseHint: feynmanExplanation ? `[Feynman Simplification]: ${feynmanExplanation}\n\n${original.responseHint || ""}` : original.responseHint,
        confidence: refinedConfidence,
        subTasks: [...original.subTasks, ...detectedGaps.map((g: string) => `Resolver lacuna: ${g}`)]
      };
    } catch (err) {
      console.error("[Feynman] Critical fail", err);
      return original;
    }
  }
}
