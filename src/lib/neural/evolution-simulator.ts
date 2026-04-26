/**
 * ─── Orion Evolution Simulator (v3) ───
 * Simulates the impact of architectural or prompt changes against
 * historical failures (thought_logs) before applying them.
 */

import { ThoughtEntry, searchThoughtLogs } from "./orion-journal";
import { evaluateRAGResponse, type RAGEvalResult } from "./rag-evaluator";

export interface SimulationResult {
  improvementFactor: number; // 0-1
  resolvedCount: number;
  totalTested: number;
  confidenceScore: number;
  predictedMetrics: {
    groundedness: number;
    relevance: number;
    helpfulness: number;
  };
}

/**
 * Run a dry-run simulation for a proposed change.
 * In a real environment, this would involve a specialized LLM "Judge"
 * running the new logic against a golden set of inputs.
 */
export async function simulateImpact(
  userId: string,
  proposedValue: string,
  scope: string
): Promise<SimulationResult> {
  // 1. Fetch historical failures related to this scope
  const failures = await searchThoughtLogs(userId, scope, 5);

  if (failures.length === 0) {
    return {
      improvementFactor: 0.5,
      resolvedCount: 0,
      totalTested: 0,
      confidenceScore: 0.3,
      predictedMetrics: { groundedness: 70, relevance: 70, helpfulness: 70 }
    };
  }

  // 2. Perform semantic simulation
  // Note: This is a heuristic approximation. In production, we'd call a dedicated
  // 'simulation-engine' Edge Function to run the actual inference.
  let totalImprovement = 0;
  let resolved = 0;

  for (const failure of failures) {
    const baseline = failure.success ? 0.7 : 0.3;

    // Heuristic: If proposal contains keywords that were missing in reasoning
    const reasoningKeywords = failure.reasoningChain.toLowerCase().split(" ");
    const proposalKeywords = proposedValue.toLowerCase().split(" ");
    const overlap = proposalKeywords.filter(k => k.length > 4 && !reasoningKeywords.includes(k)).length;

    const delta = Math.min(0.4, overlap * 0.1);
    const predicted = baseline + delta;

    if (predicted > 0.7 && baseline <= 0.5) resolved++;
    totalImprovement += delta;
  }

  const avgImprovement = totalImprovement / failures.length;

  return {
    improvementFactor: Math.min(1, avgImprovement * 2),
    resolvedCount: resolved,
    totalTested: failures.length,
    confidenceScore: 0.6 + (failures.length * 0.05),
    predictedMetrics: {
      groundedness: Math.round(75 + (avgImprovement * 50)),
      relevance: Math.round(80 + (avgImprovement * 40)),
      helpfulness: Math.round(70 + (avgImprovement * 60)),
    }
  };
}

/**
 * Format simulation results for UI display or RAG injection
 */
export function formatSimulation(res: SimulationResult): string {
  return [
    `Impacto: +${(res.improvementFactor * 100).toFixed(0)}%`,
    `Resolvibilidade: ${res.resolvedCount}/${res.totalTested} falhas`,
    `Confiança: ${(res.confidenceScore * 100).toFixed(0)}%`
  ].join(" | ");
}
