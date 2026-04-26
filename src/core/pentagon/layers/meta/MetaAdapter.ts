import { MetaResult } from "../types";
import { gradeRetrieval } from "@/lib/neural/corrective-rag";
import { evaluateRAGResponse } from "@/lib/neural/rag-evaluator";
import { validateMLMCompleteness } from "@/lib/neural/neuro-realignment";

export class MetaAdapter {
  public async validateInput(input: string): Promise<MetaResult> {
    const maliciousPatterns = [/drop\s+table/i, /delete\s+from/i, /<script/i, /exec\(/i];
    const isMalicious = maliciousPatterns.some(p => p.test(input));
    if (isMalicious) return { valid: false, score: 0, feedback: "Intenção de injeção detectada.", guardrailBreach: "malicious_input" };
    if (input.length > 10000) return { valid: false, score: 30, feedback: "Input excessivamente longo.", guardrailBreach: "buffer_overflow_risk" };
    return { valid: true, score: 100, feedback: "Input validado e seguro." };
  }

  /**
   * Valida se uma ferramenta/ação deve realmente ser ativada baseado no contexto semântico.
   * Evita disparos por palavras-chave ignorantes.
   */
  public async validateToolActivation(actionPlan: string[], perception: any): Promise<MetaResult> {
    console.log("[META] Validating tool activation intent...");

    // Se a percepção detectou negação mas o plano inclui ações positivas, bloqueamos.
    if (perception.isNegation && actionPlan.some(task => !task.includes("cancel") && !task.includes("stop"))) {
      return {
        valid: false,
        score: 0,
        feedback: "Tentativa de ativação de ferramenta em contexto de negação detectada.",
        guardrailBreach: "negation_conflict"
      };
    }

    // Verifica se o plano de ação faz sentido para a intenção percebida
    const isCoherent = actionPlan.every(task => {
      if (perception.intent === "iot_light") return task.includes("luz") || task.includes("iot") || task.includes("verificar");
      if (perception.intent === "navigation") return task.includes("nav") || task.includes("abra") || task.includes("ir");
      return true;
    });

    if (!isCoherent) {
      return {
        valid: false,
        score: 30,
        feedback: "Incoerência entre intenção do usuário e plano de ferramentas gerado.",
        guardrailBreach: "intent_drift"
      };
    }

    return { valid: true, score: 100, feedback: "Ativação de ferramenta validada." };
  }

  public async validateReasoning(reasoning: any): Promise<MetaResult> {
    const { confidence, rationale } = reasoning;
    if (confidence < 0.6) return { valid: false, score: confidence * 100, feedback: "Baixa confiança no raciocínio.", guardrailBreach: "low_confidence" };
    const mlmScore = validateMLMCompleteness(rationale);
    if (mlmScore < 0.5) return { valid: false, score: mlmScore * 100, feedback: "Raciocínio incoerente.", guardrailBreach: "logical_inconsistency" };
    return { valid: true, score: ((confidence + mlmScore) / 2) * 100, feedback: "Raciocínio validado." };
  }

  public async validateOutput(action: any, originalContext: string, question: string): Promise<MetaResult> {
    if (!action.success) return { valid: false, score: 0, feedback: "Ação falhou." };
    const evalResult = evaluateRAGResponse({ response: action.output || "", question, context: originalContext });
    if (evalResult.groundedness.score < 4) return { valid: false, score: evalResult.groundedness.normalized, feedback: "Alucinação detectada.", guardrailBreach: "hallucination_detected" };
    return { valid: true, score: evalResult.overallScore, feedback: "ROI validado." };
  }
}
