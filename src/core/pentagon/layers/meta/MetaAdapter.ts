import { MetaResult, PentagonContext } from "../types";
import { gradeRetrieval } from "@/lib/neural/corrective-rag";
import {
  estimateFisherMetric,
  klDivergence,
  boltzmannScore,
  normal
} from "@/lib/neural/tf-probability-ranking";

export class MetaAdapter {
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

  public async validateReasoning(reasoning: any, _context: PentagonContext = {} as PentagonContext): Promise<MetaResult> {
    const { confidence, rationale } = reasoning;

    if (confidence < 0.6) {
      return { valid: false, score: confidence * 100, feedback: "Baixa confiança no raciocínio gerado.", guardrailBreach: "low_confidence" };
    }

    const knowledgeSamples = Array.from({ length: 50 }, () => Math.random());
    const fisherMetric = estimateFisherMetric(normal(confidence, 0.1), knowledgeSamples);

    if (fisherMetric < 0.05) {
       return {
         valid: false,
         score: 40,
         feedback: "Raciocínio instável no espaço de informação (Fisher Metric Low).",
         guardrailBreach: "geometric_instability"
       };
    }

    const inconsistencyEnergy = this.calculateInconsistencyEnergy(reasoning);
    const stabilityScore = boltzmannScore(inconsistencyEnergy, 1.0);

    if (stabilityScore < 0.5) {
      return {
        valid: false,
        score: stabilityScore * 100,
        feedback: "Alta entropia de inconsistência detectada.",
        guardrailBreach: "high_energy_inconsistency"
      };
    }

    const hasHallucinationMarkers = /desconhecido|não\s+encontrado|erro/i.test(rationale);
    if (hasHallucinationMarkers && confidence > 0.9) {
      return { valid: false, score: 50, feedback: "Incoerência entre confiança e conteúdo (possível alucinação).", guardrailBreach: "hallucination_detected" };
    }

    return { valid: true, score: Math.min(100, stabilityScore * 100), feedback: "Raciocínio validado geometricamente." };
  }

  public async validateOutput(action: any): Promise<MetaResult> {
    if (!action.success) {
      return { valid: false, score: 0, feedback: "Ação falhou na execução." };
    }

    const grade = gradeRetrieval(action.output || "", action.data?.contextUsed || "");
    const score = grade.confidence * 100;

    return {
      valid: score > 50,
      score: score,
      feedback: score > 80 ? "Alta qualidade jurídica." : "Qualidade média, revisão recomendada.",
      adjustments: score < 50 ? { retryWithModel: "deepseek-r1" } : undefined
    };
  }

  private calculateInconsistencyEnergy(reasoning: any): number {
    let energy = 0;
    const rationale = reasoning.rationale || "";
    const plan = reasoning.plan || [];

    const gaps = (rationale.match(/lacuna|não\s+entendi|desconhecido/gi) || []).length;
    energy += gaps * 2.5;

    if (plan.length === 0 && rationale.length > 100) energy += 3.0;

    energy += (1 - (reasoning.confidence || 0)) * 5.0;

    return energy;
  }
}
