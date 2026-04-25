/**
 * ─── Orion Maestro Unification ───
 */
import { getCognitionState } from "./neural-cognition-engine";
import { getConsciousnessDiagnostics } from "./rag-consciousness";
import { orionSelfImprove } from "./jules-client";
import { analyzeSemantics } from "./nlp-semantic-analyzer";
import { recordSubsystemFailure } from "./jules-auto-triggers";
import { createProposal } from "./evolution-sandbox";

export async function monitorMaestroPulse() {
  const cognition = getCognitionState();
  const consciousness = getConsciousnessDiagnostics();
  if (cognition.lastQuantumEntropy > 0.8 && cognition.lastConsciousnessLevel < 0.3) {
    await recordSubsystemFailure("core_state", "High quantum entropy detected.");
    return { type: "cognitive_degradation", severity: "high" };
  }
  return null;
}

export async function dispatchMaestroEvolution(signal: any) {
  // Instead of direct AutoPR, we create a Sandbox Proposal
  const proposal = createProposal({
    type: signal.type,
    description: `Maestro detected ${signal.type}. Suggesting automated fix.`,
    riskLevel: signal.severity === "high" ? "moderate" : "safe",
    subsystem: "core_state",
    suggestedChanges: "[Auto-Construction Strategy: Self-Heal Core]"
  });

  if (signal.severity === "high") {
    // For high severity, we still trigger Jules but with autoPR=false to keep it in Sandbox
    await orionSelfImprove({
      task: `Maestro detected ${signal.type}. Fix the underlying logic.`,
      autoPR: false, // Wait for human/sandbox review
      subsystem: "core_state",
      branch: `maestro/proposal-${Date.now()}`,
      _internalAutoTrigger: true
    });
  }
  return true;
}

export function getAdaptiveNeurolinguisticHead(text: string, wmContext: string): string {
  const analysis = analyzeSemantics(text, wmContext);
  const rules = [];
  if (analysis.sentiment.primary === "frustration") rules.push("Seja extremamente direto e empático.");
  if (analysis.domain !== "geral") rules.push(`Alique expertise em Direito ${analysis.domain.toUpperCase()}.`);
  return rules.length > 0 ? `[ADAPTIVE PNL HEAD]\n${rules.join("\n")}` : "";
}
