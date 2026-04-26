import { MetaResult } from "../types";
import { gradeRetrieval } from "@/lib/neural/corrective-rag";

export class MetaAdapter {
  /**
   * Pre-Input Guard: Sanitização e detecção de intenções maliciosas
   */
  public async validateInput(input: string): Promise<MetaResult> {
    const maliciousPatterns = [/drop\s+table/i, /delete\s+from/i, /<script/i];
    const isMalicious = maliciousPatterns.some(p => p.test(input));

    if (isMalicious) {
      return { valid: false, score: 0, feedback: "Intenção de injeção detectada.", guardrailBreach: "malicious_input" };
    }

    if (input.length > 10000) {
      return { valid: false, score: 30, feedback: "Input excessivamente longo.", guardrailBreach: "buffer_overflow_risk" };
    }

    return { valid: true, score: 100, feedback: "Input validado e seguro." };
  }

  /**
   * Mid-Reasoning Checkpoint: Validação de alucinação e coerência jurídica
   */
  public async validateReasoning(reasoning: any): Promise<MetaResult> {
    const { confidence, rationale } = reasoning;

    if (confidence < 0.6) {
      return { valid: false, score: confidence * 100, feedback: "Baixa confiança no raciocínio gerado.", guardrailBreach: "low_confidence" };
    }

    // Verificação de alucinação simplificada (NeMo style)
    const hasHallucinationMarkers = /desconhecido|não\s+encontrado|erro/i.test(rationale);
    if (hasHallucinationMarkers && confidence > 0.9) {
      return { valid: false, score: 50, feedback: "Incoerência entre confiança e conteúdo (possível alucinação).", guardrailBreach: "hallucination_detected" };
    }

    return { valid: true, score: confidence * 100, feedback: "Raciocínio coerente." };
  }

  /**
   * Post-Output Judge: Verificação de qualidade, ROI e conformidade legal
   */
  public async validateOutput(action: any): Promise<MetaResult> {
    if (!action.success) {
      return { valid: false, score: 0, feedback: "Ação falhou na execução." };
    }

    // Simula a nota do Corrective RAG para o output
    const grade = gradeRetrieval(action.output || "", action.data?.contextUsed || "");
    const score = grade.confidence * 100;

    return {
      valid: score > 50,
      score: score,
      feedback: score > 80 ? "Alta qualidade jurídica." : "Qualidade média, revisão recomendada.",
      adjustments: score < 50 ? { retryWithModel: "deepseek-r1" } : undefined
    };
  }
}
