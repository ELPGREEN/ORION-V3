import { MetaResult } from "../types";
import { gradeRetrieval } from "@/lib/neural/corrective-rag";
import { evaluateRAGResponse } from "@/lib/neural/rag-evaluator";
import { validateMLMCompleteness } from "@/lib/neural/neuro-realignment";

export class MetaAdapter {
  /**
   * Pre-Input Guard: Sanitização e detecção de intenções maliciosas
   */
  public async validateInput(input: string): Promise<MetaResult> {
    const maliciousPatterns = [/drop\s+table/i, /delete\s+from/i, /<script/i, /exec\(/i];
    const isMalicious = maliciousPatterns.some(p => p.test(input));

    if (isMalicious) {
      return { valid: false, score: 0, feedback: "Intenção de injeção ou execução detectada.", guardrailBreach: "malicious_input" };
    }

    if (input.length > 10000) {
      return { valid: false, score: 30, feedback: "Input excessivamente longo.", guardrailBreach: "buffer_overflow_risk" };
    }

    return { valid: true, score: 100, feedback: "Input validado e seguro." };
  }

  /**
   * Mid-Reasoning Checkpoint: Validação de alucinação e coerência lógica bidirecional
   */
  public async validateReasoning(reasoning: any): Promise<MetaResult> {
    const { confidence, rationale, plan } = reasoning;

    // 1. Verificação de Confiança Base
    if (confidence < 0.6) {
      return { valid: false, score: confidence * 100, feedback: "Baixa confiança no raciocínio gerado.", guardrailBreach: "low_confidence" };
    }

    // 2. Verificação de Coerência Bidirecional (MLM)
    // Avalia se o raciocínio "faz sentido" gramaticalmente e logicamente nos dois sentidos
    const mlmScore = validateMLMCompleteness(rationale);
    if (mlmScore < 0.5) {
      return { valid: false, score: mlmScore * 100, feedback: "Raciocínio com baixa coerência estrutural.", guardrailBreach: "logical_inconsistency" };
    }

    // 3. Verificação de Alucinação (NeMo style)
    const hasHallucinationMarkers = /desconhecido|não\s+encontrado|erro|sem\s+contexto/i.test(rationale);
    if (hasHallucinationMarkers && confidence > 0.8) {
      return { valid: false, score: 50, feedback: "Incoerência detectada: confiança alta mas resposta indica falta de informação.", guardrailBreach: "hallucination_detected" };
    }

    return { valid: true, score: ((confidence + mlmScore) / 2) * 100, feedback: "Raciocínio coerente e validado." };
  }

  /**
   * Post-Output Judge: Verificação de groundedness (ancoragem) e conformidade ROI
   */
  public async validateOutput(action: any, originalContext: string, question: string): Promise<MetaResult> {
    if (!action.success) {
      return { valid: false, score: 0, feedback: "Ação falhou na execução." };
    }

    const response = action.output || "";

    // 1. Avaliação de RAG (Groundedness & Relevance)
    const evalResult = evaluateRAGResponse({
      response: response,
      question: question,
      context: originalContext
    });

    const isGrounded = evalResult.groundedness.score >= 4;
    const isRelevant = evalResult.relevance.score >= 4;

    if (!isGrounded) {
      return {
        valid: false,
        score: evalResult.groundedness.normalized,
        feedback: "Alucinação detectada: Resposta não ancorada no contexto recuperado.",
        guardrailBreach: "hallucination_detected"
      };
    }

    if (!isRelevant) {
      return {
        valid: false,
        score: evalResult.relevance.normalized,
        feedback: "Resposta fora do contexto da pergunta.",
        guardrailBreach: "irrelevance"
      };
    }

    return {
      valid: true,
      score: evalResult.overallScore,
      feedback: evalResult.overallScore > 80 ? "Alta fidelidade e ROI." : "Validado com ressalvas.",
      adjustments: evalResult.overallScore < 70 ? { refinePrompt: true } : undefined
    };
  }
}
