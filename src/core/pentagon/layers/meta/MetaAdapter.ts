import { MetaResult } from "../types";
import { gradeRetrieval } from "@/lib/neural/corrective-rag";
import { evaluateRAGResponse } from "@/lib/neural/rag-evaluator";
import { validateMLMCompleteness } from "@/lib/neural/neuro-realignment";
import { RoboticsGuardProvider } from "../Providers";
import { getUserServiceStats } from "@/lib/neural/arc-auto-charge";

export class MetaAdapter {
  public async validateInput(input: string): Promise<MetaResult> {
    const maliciousPatterns = [/drop\s+table/i, /delete\s+from/i, /<script/i, /exec\(/i];
    const isMalicious = maliciousPatterns.some(p => p.test(input));
    if (isMalicious) return { valid: false, score: 0, feedback: "Intenção maliciosa.", guardrailBreach: "malicious_input" };
    return { valid: true, score: 100, feedback: "Input OK." };
  }

  /**
   * Verifica se o usuário tem saldo ou quota para a ação proposta.
   */
  public async validateMonetizationQuota(userId?: string): Promise<MetaResult> {
    if (!userId) return { valid: true, score: 100, feedback: "Usuário não identificado, seguindo fluxo padrão." };

    try {
      const stats = await getUserServiceStats(userId);
      if (stats.creditsRemaining <= 0 && stats.trialRemaining <= 0) {
        return {
          valid: false,
          score: 10,
          feedback: "Saldo insuficiente na carteira Órion.",
          guardrailBreach: "insufficient_funds"
        };
      }
      return { valid: true, score: 100, feedback: `Usuário possui saldo: R$ ${stats.creditsRemaining.toFixed(2)}` };
    } catch {
      return { valid: true, score: 50, feedback: "Erro ao validar quota, permitindo tentativa." };
    }
  }

  public async validateToolActivation(actionPlan: string[], perception: any): Promise<MetaResult> {
    if (perception.isNegation && actionPlan.some(task => !task.includes("cancel") && !task.includes("stop"))) {
      return { valid: false, score: 0, feedback: "Veto por negação.", guardrailBreach: "negation_conflict" };
    }
    const requiresRobotics = actionPlan.some(task => /robot|agv|mover/i.test(task));
    if (requiresRobotics && !RoboticsGuardProvider.checkSafety()) {
      return { valid: false, score: 0, feedback: "Risco físico detectado.", guardrailBreach: "physical_safety_violation" };
    }
    return { valid: true, score: 100, feedback: "Ativação OK." };
  }

  public async validateReasoning(reasoning: any): Promise<MetaResult> {
    const { confidence, rationale } = reasoning;
    if (confidence < 0.6) return { valid: false, score: confidence * 100, feedback: "Baixa confiança.", guardrailBreach: "low_confidence" };
    const mlmScore = validateMLMCompleteness(rationale);
    if (mlmScore < 0.5) return { valid: false, score: mlmScore * 100, feedback: "Incoerência lógica.", guardrailBreach: "logical_inconsistency" };
    return { valid: true, score: ((confidence + mlmScore) / 2) * 100, feedback: "Raciocínio OK." };
  }

  public async validateOutput(action: any, originalContext: string, question: string): Promise<MetaResult> {
    if (!action.success) return { valid: false, score: 0, feedback: "Ação falhou." };
    const evalResult = evaluateRAGResponse({ response: action.output || "", question, context: originalContext });
    return { valid: evalResult.groundedness.score >= 4, score: evalResult.overallScore, feedback: "ROI OK." };
  }
}
