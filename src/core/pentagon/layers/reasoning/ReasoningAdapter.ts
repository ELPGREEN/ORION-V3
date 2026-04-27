import { IPentagonLayer, ReasoningResult } from "../types";
import { cognitiveRoute, validateLogicalConsistency } from "@/lib/neural/cognitive-fast-reasoner";
import { supabase } from "@/integrations/supabase/client";

export class ReasoningAdapter implements IPentagonLayer<any, ReasoningResult> {
  public async process(data: { perception: any, memory: any }, context: any): Promise<ReasoningResult> {
    console.log("[REASONING] Strategic planning phase...");

    // 1. Determine cognitive route
    const route = cognitiveRoute(data.perception.rawInput, context?.tier || "standard", data.perception.intent);

    // 2. Build instructions
    const systemInstructions = `
      ${route.reasoningInstructions}
      Use the following context: ${data.memory.mergedContext.substring(0, 1000)}
    `;

    // 3. Execution (Neural Ops)
    let output = "";
    let confidence = 0.85;

    try {
      const { data: response, error } = await supabase.functions.invoke("neural-ops", {
        body: {
          question: data.perception.rawInput,
          context: systemInstructions,
          intentType: data.perception.intent,
          mode: route.mode
        }
      });

      if (error) throw error;
      output = response.content || "";
    } catch (e) {
      console.error("[REASONING] LLM Call failed:", e);
      output = "Erro ao processar raciocínio.";
      confidence = 0.1;
    }

    // 4. Consistency Check
    const consistency = validateLogicalConsistency(output);

    return {
      plan: ["respond_to_user"],
      rationale: `Modo: ${route.mode}. Consistência: ${consistency.score}%`,
      confidence: confidence * (consistency.score / 100),
      subTasks: [],
      data: { output, route }
    };
  }
}
