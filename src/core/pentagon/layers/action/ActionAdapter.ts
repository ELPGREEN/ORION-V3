import { IPentagonLayer, ReasoningResult, ActionResult, PentagonContext, recordToolCall, completeToolCall } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { wrapEdgeFunction } from "@/lib/errors";

export class ActionAdapter implements IPentagonLayer<ReasoningResult, ActionResult> {
  public async process(reasoning: ReasoningResult, context: PentagonContext): Promise<ActionResult> {
    const plan = (reasoning.plan || []) as string[];

    const forceTool = context?.forceTool || false;
    const shouldSearch = forceTool || plan.some((p: string) =>
      /pesquisa|buscar|search|google|firecrawl|web|consultar/i.test(p)
    );

    if (shouldSearch) {
      console.log("[ACTION] Executing tool enforcement (Firecrawl/SerpAPI)...");
      try {
        const query = context?.query || reasoning.rationale || "";
        const toolCall = recordToolCall(context, "search_web", { query });
        const searchResult = await wrapEdgeFunction(
          supabase.functions.invoke("firecrawl-search", {
            body: { query }
          }),
          "firecrawl-search"
        );
        completeToolCall(toolCall, searchResult);

        if (searchResult?.success) {
          context.accumulatedCost += 0.1;
          return {
            success: true,
            output: searchResult.content || "Resultados de pesquisa integrados.",
            data: {
              planExecuted: plan,
              toolUsed: "firecrawl",
              externalData: searchResult.content
            },
            roiImpact: "Pesquisa em tempo real concluída (economia de 15 min)"
          };
        }
      } catch (e) {
        console.warn("[ACTION] Tool enforcement failed, falling back to knowledge.", e);
      }
    }

    return {
      success: true,
      output: reasoning.responseHint || "Ação realizada com sucesso baseada no seu pedido.",
      data: { planExecuted: plan },
      roiImpact: "Raciocínio processado em milissegundos (economia de 5 min)"
    };
  }
}
