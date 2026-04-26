import { MetaResult } from "../types";
import { gradeRetrieval } from "@/lib/neural/corrective-rag";
import { evaluateRAGResponse } from "@/lib/neural/rag-evaluator";
import { validateMLMCompleteness } from "@/lib/neural/neuro-realignment";
import { RoboticsGuardProvider } from "../Providers";

export class MetaAdapter {
  public async validateInput(input: string): Promise<MetaResult> {
    const maliciousPatterns = [/drop\s+table/i, /delete\s+from/i, /<script/i, /exec\(/i];
    const isMalicious = maliciousPatterns.some(p => p.test(input));
    if (isMalicious) return { valid: false, score: 0, feedback: "Intenção maliciosa detectada.", guardrailBreach: "malicious_input" };
    return { valid: true, score: 100, feedback: "Input seguro." };
  }

  /**
   * Valida segurança física para comandos robóticos (Industrial Safety)
   */
  public async validateIndustrialSafety(plan: string[]): Promise<MetaResult> {
    const requiresRobotics = plan.some(task => /robot|agv|mover|executar_missao/i.test(task));

    if (requiresRobotics) {
      const isSafe = RoboticsGuardProvider.checkSafety(); // Interface com sensores reais (obstáculos, bateria)
      if (!isSafe) {
        return {
          valid: false,
          score: 0,
          feedback: "Operação robótica abortada: Violação de segurança física ou hardware crítico.",
          guardrailBreach: "physical_safety_violation"
        };
      }
    }
    return { valid: true, score: 100, feedback: "Segurança industrial validada." };
  }

  public async validateToolActivation(actionPlan: string[], perception: any): Promise<MetaResult> {
    if (perception.isNegation && actionPlan.some(task => !task.includes("cancel") && !task.includes("stop"))) {
      return { valid: false, score: 0, feedback: "Veto por negação detectada.", guardrailBreach: "negation_conflict" };
    }

    // Validação de Segurança Industrial Integrada
    const safetyCheck = await this.validateIndustrialSafety(actionPlan);
    if (!safetyCheck.valid) return safetyCheck;

    return { valid: true, score: 100, feedback: "Ativação validada." };
  }

  public async validateReasoning(reasoning: any): Promise<MetaResult> {
    const { confidence, rationale } = reasoning;
    if (confidence < 0.6) return { valid: false, score: confidence * 100, feedback: "Baixa confiança.", guardrailBreach: "low_confidence" };
    const mlmScore = validateMLMCompleteness(rationale);
    if (mlmScore < 0.5) return { valid: false, score: mlmScore * 100, feedback: "Incoerência lógica.", guardrailBreach: "logical_inconsistency" };
    return { valid: true, score: ((confidence + mlmScore) / 2) * 100, feedback: "Raciocínio válido." };
  }

  public async validateOutput(action: any, originalContext: string, question: string): Promise<MetaResult> {
    if (!action.success) return { valid: false, score: 0, feedback: "Ação falhou." };
    const evalResult = evaluateRAGResponse({ response: action.output || "", question, context: originalContext });
    return { valid: evalResult.groundedness.score >= 4, score: evalResult.overallScore, feedback: "Validado." };
  }
}
