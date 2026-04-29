/**
 * 🧠 Reasoning Adapter — Lobo frontal real
 * Substitui o mock por um chamado real à edge function pentagon-reasoner
 * (Lovable AI Gateway → Gemini 2.5 Flash com tool calling estruturado).
 */
import { supabase } from "@/integrations/supabase/client";
import { IPentagonLayer, ReasoningResult, PerceptionResult, MemoryResult } from "../types";
import { FeynmanReasoner } from "./FeynmanReasoner";

interface ReasoningInput {
  perception: PerceptionResult;
  memory: MemoryResult;
}

export interface ExtendedReasoningResult extends ReasoningResult {
  responseHint?: string;
  model?: string;
  feynmanExplanation?: string;
}

export class ReasoningAdapter implements IPentagonLayer<ReasoningInput, ExtendedReasoningResult> {
  public async process(data: ReasoningInput, context: any = {}): Promise<ExtendedReasoningResult> {
    const { perception, memory } = data;

    // Extract RAG snippets from merged context (split by markers, fallback to chunks)
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
          // 🍕 Force RAG instruction if retry was triggered
          forceRag: context?.forceRag || false,
        },
      });

      if (error || !result?.success) {
        console.warn("[Reasoning] reasoner unavailable, falling back", error);
        return this.fallback(perception, memory);
      }

      // 🍕 Validation: Penalize (throw internally for Orchestrator retry) if RAG is available but rationale is too short/generic
      const hasRag = ragSnippets.length > 0;
      const rationale = result.rationale || "";
      const isGeneric = rationale.length < 30 || /responder|pergunta|entendi/i.test(rationale);

      if (hasRag && isGeneric && !context?.forceRag) {
         console.warn("[Reasoning] ⚠️ Rationale too short/generic despite RAG available. Adding hint.");
         result.rationale = `[Usar contexto disponível] ${rationale}`;
         result.responseHint = "Considere os snippets RAG disponíveis para formular uma resposta mais específica.";
      }

      let baseResult: ExtendedReasoningResult = {
        plan: Array.isArray(result.plan) ? result.plan : ["responder"],
        rationale: rationale,
        confidence: typeof result.confidence === "number" ? result.confidence : 0.7,
        subTasks: Array.isArray(result.subTasks) ? result.subTasks : [],
        responseHint: result.responseHint ?? "",
        model: result.model,
      };

      // 🎓 Async non-blocking Feynman Loop — returns immediately, refines in background
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
    // Split by common RAG separators or chunk into ~600 char pieces
    const parts = merged
      .split(/\n{2,}|\[\d+\]|---+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 80);
    return parts.slice(0, 6);
  }

  /**
   * Fire-and-forget Feynman refinement — runs in background, updates memory/cache
   */
  private fireAsyncFeynman(baseResult: ExtendedReasoningResult, query: string, context: any): void {
    FeynmanReasoner.refine(baseResult, query).then(refined => {
      console.log("[Reasoning] ✅ Async Feynman refinement complete, confidence:", refined.confidence);
      // Store refined explanation in session memory for next turn
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
