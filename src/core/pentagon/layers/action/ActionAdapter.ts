import { IPentagonLayer, ActionResult } from "../types";
import { stripMarkdown } from "@/lib/utils/text-utils";

export class ActionAdapter implements IPentagonLayer<any, ActionResult> {
  public async process(reasoning: any, context: any): Promise<ActionResult> {
    console.log("[ACTION] ROI delivery phase...");

    const rawOutput = reasoning.data?.output || "Sem resposta.";
    const cleanOutput = stripMarkdown(rawOutput);

    // ROI Calculation logic would go here
    const estimatedTimeSaved = cleanOutput.length > 200 ? 120 : 15;

    return {
      success: true,
      output: cleanOutput,
      data: {
        planExecuted: reasoning.plan,
        originalOutput: rawOutput,
        cognitiveRoute: reasoning.data?.route
      },
      roiImpact: `Economia estimada: ${estimatedTimeSaved} min`
    };
  }
}
