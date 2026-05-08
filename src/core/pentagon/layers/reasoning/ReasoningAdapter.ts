import { supabase } from "@/integrations/supabase/client";
import { IPentagonLayer, PerceptionResult, MemoryResult, PentagonContext } from "../types";
import { FeynmanReasoner } from "./FeynmanReasoner";
import { ExtendedReasoningResult } from "./reasoning-types";

const SNIPPET_DELIMITER_RE = /\n{2,}|\[\d+\]|---+/;

interface ReasoningInput {
  perception: PerceptionResult;
  memory: MemoryResult;
}

export class ReasoningAdapter implements IPentagonLayer<ReasoningInput, ExtendedReasoningResult> {
  public async process(data: ReasoningInput, context: PentagonContext): Promise<ExtendedReasoningResult> {
    const { perception, memory } = data;

    const ragSnippets = this.extractSnippets(memory?.mergedContext ?? "");

    try {
      const { data: result, error } = await supabase.functions.invoke("pentagon-reasoner", {
        body: {
          query: perception?.rawInput ?? "",
          intent: perception?.intent,
          entities: perception?.entities,
          memoryContext: memory?.mergedContext?.slice(0, 4000),
          ragSnippets,
          domain: context?.domain,
          forceRag: context?.forceRag || false,
        },
      });

      if (error || !result?.success) {
        console.warn("[Reasoning] reasoner unavailable, falling back", error);
        return this.fallback(perception, memory);
      }

      const hasRag = ragSnippets.length > 0;
      const rationale = (result.rationale as string) || "";
      const isGeneric = rationale.length < 30 || /responder|pergunta|entendi/i.test(rationale);

      if (hasRag && isGeneric && !context?.forceRag) {
         console.warn("[Reasoning] ⚠️ Rationale too short/generic despite RAG available. Adding hint.");
         result.rationale = `[Usar contexto disponível] ${rationale}`;
         result.responseHint = "Considere os snippets RAG disponíveis para formular uma resposta mais específica.";
      }

      const baseResult: ExtendedReasoningResult = {
        plan: Array.isArray(result.plan) ? (result.plan as string[]) : ["responder"],
        rationale: rationale,
        confidence: typeof result.confidence === "number" ? result.confidence : 0.7,
        subTasks: Array.isArray(result.subTasks) ? (result.subTasks as string[]) : [],
        responseHint: (result.responseHint as string) ?? "",
        model: result.model as string | undefined,
      };

      context.sharedState.reasoningModel = result.model;

      if (baseResult.confidence > 0.6 && perception.complexity === "complex" && !context?.skipFeynman) {
        console.log("[Reasoning] 🔥 Firing async Feynman Loop (non-blocking)...");
        this.fireAsyncFeynman(baseResult, perception?.rawInput ?? "", context);
      }

      return baseResult;
    } catch (err) {
      console.error("[Reasoning] critical fail", err);
      return this.fallback(perception, memory);
    }
  }

  private extractSnippets(merged: string): string[] {
    if (!merged) return [];
    const parts = merged
      .split(SNIPPET_DELIMITER_RE)
      .map((s) => s.trim())
      .filter((s) => s.length > 80);
    return parts.slice(0, 6);
  }

  private fireAsyncFeynman(baseResult: ExtendedReasoningResult, query: string, _context: PentagonContext): void {
    FeynmanReasoner.refine(baseResult, query).then(refined => {
      console.log("[Reasoning] ✅ Async Feynman refinement complete, confidence:", refined.confidence);
      if (refined.responseHint?.includes("[Feynman")) {
        try {
          const sessionKey = `feynman:${query.slice(0, 50)}`;
          sessionStorage.setItem(sessionKey, JSON.stringify({
            simplified: refined.responseHint,
            gaps: refined.subTasks.filter(s => s.startsWith("Resolver lacuna")),
            ts: Date.now(),
          }));
        } catch { /* sessionStorage unavailable */ }
      }
    }).catch(err => {
      console.warn("[Reasoning] ⚠️ Async Feynman failed (non-fatal):", err);
    });
  }

  private fallback(perception: PerceptionResult, memory: MemoryResult): ExtendedReasoningResult {
    const intent = perception?.intent ?? "geral";
    const hasContext = (memory?.mergedContext?.length ?? 0) > 100;
    return {
      plan: hasContext
        ? ["recuperar_contexto", "sintetizar_resposta", "validar_fontes"]
        : ["interpretar_pergunta", "responder_com_conhecimento_geral"],
      rationale: hasContext
        ? `Fallback local — usando ${memory.mergedContext.length} chars de contexto para intent "${intent}"`
        : `Fallback local — sem contexto suficiente para intent "${intent}"`,
      confidence: hasContext ? 0.55 : 0.35,
      subTasks: [],
      responseHint: "",
    };
  }
}
