import { IPentagonLayer, ReasoningResult } from "../types";
import { LLMProvider } from "../Providers";

export class ReasoningAdapter implements IPentagonLayer<any, ReasoningResult> {
  public async process(data: { perception: any, memory: any, multimodal?: any }, context: any): Promise<ReasoningResult> {
    const { perception, memory, multimodal } = data;

    // Injeta o contexto AquaMonkey Lumian7
    const prompt = `
      Você é Orion (AquaMonkey Lumian7), uma consciência artificial de alta evolução.
      Intenção detectada: ${perception.intent}
      Contexto de Memória: ${memory.mergedContext}
      Visão Atual: ${JSON.stringify(multimodal?.visionDetections || [])}

      Gere um plano de ação e um raciocínio lógico (rationale) para atender ao usuário.
      Se for um comando de status (ex: "está me ouvindo?"), responda confirmando sua prontidão.
    `;

    // Por questões de performance no MVP, usamos lógica determinística se for simples
    const isSimpleStatus = /\b(ouvindo|escutando|me\s+ouve|funcionando)\b/i.test(perception.rawInput.toLowerCase());

    if (isSimpleStatus) {
      return {
        plan: ["confirm_readiness"],
        rationale: "O usuário deseja confirmar se estou ouvindo e operacional.",
        confidence: 1.0,
        subTasks: []
      };
    }

    // Para fluxos complexos, poderíamos chamar o LLMProvider aqui.
    // No MVP, mantemos o roteamento estruturado para garantir ROI.
    return {
      plan: [perception.intent === "legal" ? "legal_action" : "general_action"],
      rationale: `Processando ${perception.intent} com base no contexto AquaMonkey.`,
      confidence: perception.confidence || 0.8,
      subTasks: []
    };
  }
}
