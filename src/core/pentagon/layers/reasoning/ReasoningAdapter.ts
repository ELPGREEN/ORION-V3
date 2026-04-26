import { IPentagonLayer, ReasoningResult } from "../types";
import { validateMLMCompleteness } from "@/lib/neural/neuro-realignment";

export class ReasoningAdapter implements IPentagonLayer<any, ReasoningResult> {
  public async process(data: { perception: any, memory: any }, context: any): Promise<ReasoningResult> {
    console.log("[REASONING] Applying Strict Grounding Protocol...");

    const { perception, memory } = data;
    const contextUsed = memory.mergedContext;

    // Simula a lógica de decisão do LLM com foco em grounding
    const rationale = `Processando demanda '${perception.intent}' com base nos fatos recuperados: ${contextUsed.substring(0, 50)}...`;

    // Verificação de segurança: se não houver contexto, a confiança cai drasticamente (Anti-Alucinação)
    let baseConfidence = contextUsed.length > 100 ? 0.95 : 0.4;

    // Ajuste por coerência bidirecional
    const coherence = validateMLMCompleteness(rationale);
    const finalConfidence = baseConfidence * 0.7 + coherence * 0.3;

    return {
      plan: ["verificar_grounding", perception.intent === "legal" ? "gerar_draft_juridico" : "responder_geral"],
      rationale: rationale,
      confidence: finalConfidence,
      subTasks: []
    };
  }
}
