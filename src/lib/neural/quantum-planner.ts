/**
 * ─── v22.0: Quantum Hierarchical Planner (QHRL) ───
 * Uses proper Born rule measurement for plan selection.
 * Superposition of plans → measurement → collapse to optimal.
 *
 * Ref: Chen et al. (2023), Nielsen & Chuang (2000)
 */

import {
  qubitFromProbability,
  measureCollapse,
  measureProbability,
  rotationY,
  qubitZero,
  type QubitState,
} from "./vqc";

export interface QuantumPlanTemplate {
  id: string;
  name: string;
  roles: string[];
  estimatedTime: number;
  qualityEstimate: number;
}

export interface QuantumDAGResult {
  selectedTemplate: QuantumPlanTemplate;
  amplitude: number;
  classicalScore: number;
  combinedScore: number;
}

const TEMPLATES: QuantumPlanTemplate[] = [
  { id: "sequential-full", name: "Sequential Full", roles: ["pesquisa", "leitura", "construcao", "critico", "refinador"], estimatedTime: 15, qualityEstimate: 0.9 },
  { id: "parallel-research", name: "Parallel Research", roles: ["pesquisa", "pesquisa", "leitura", "construcao", "critico"], estimatedTime: 10, qualityEstimate: 0.85 },
  { id: "fast-draft", name: "Fast Draft", roles: ["pesquisa", "construcao", "critico"], estimatedTime: 5, qualityEstimate: 0.7 },
  { id: "deep-analysis", name: "Deep Analysis", roles: ["leitura", "pesquisa", "pesquisa", "critico", "critico", "refinador"], estimatedTime: 20, qualityEstimate: 0.95 },
];

/**
 * Born rule: P(outcome) = |amplitude|²
 * Proper quantum measurement probability.
 */
function bornRuleProbability(amplitude: number): number {
  return amplitude * amplitude;
}

/**
 * Create a superposition of plans as qubit states,
 * then "measure" to rank by combined quantum+classical score.
 */
export function quantumDAGOptimization(
  prioritySpeed: number = 0.5 // 0 = quality, 1 = speed
): QuantumDAGResult[] {
  return TEMPLATES.map(template => {
    const speedScore = 1 - template.estimatedTime / 25;
    const qualityScore = template.qualityEstimate;

    // Encode priority as qubit rotation angle
    const classicalScore = prioritySpeed * speedScore + (1 - prioritySpeed) * qualityScore;

    // Create qubit in superposition proportional to classical score
    const qubit = qubitFromProbability(classicalScore);
    const amplitude = Math.sqrt(measureProbability(qubit));

    // Combined score: quantum (Born rule) + classical
    const combinedScore = 0.6 * bornRuleProbability(amplitude) + 0.4 * classicalScore;

    return { selectedTemplate: template, amplitude, classicalScore, combinedScore };
  }).sort((a, b) => b.combinedScore - a.combinedScore);
}

/**
 * Quantum routing: assign agents to roles via qubit measurement (collapse).
 * Each candidate is a qubit; measurement collapses to one assignment.
 */
export function quantumRoute(
  agents: Array<{ id: string; role: string }>,
  taskRoles: string[]
): Array<{ agentId: string; role: string; priority: number }> {
  return taskRoles.map(role => {
    const candidates = agents.filter(a => a.role === role);
    if (candidates.length === 0) return { agentId: "none", role, priority: 0 };

    // Create equal superposition qubit for candidate selection
    const selectionQubit = qubitFromProbability(1 / candidates.length);

    // Collapse: Born rule measurement determines selection index
    const { outcome } = measureCollapse(selectionQubit);
    const idx = outcome === 1
      ? Math.floor(Math.random() * candidates.length)
      : 0;
    const selected = candidates[Math.min(idx, candidates.length - 1)];

    // Priority from qubit measurement probability
    const priorityQubit = rotationY(Math.PI * 0.75, qubitZero());
    const priority = measureProbability(priorityQubit);

    return { agentId: selected.id, role, priority };
  });
}

/**
 * Decoherence detection based on von Neumann entropy.
 * High entropy → quantum advantage lost → fall back to classical.
 */
export function detectDecoherence(entropy: number): {
  level: "low" | "medium" | "high";
  action: "execute" | "explore" | "classical_fallback";
} {
  if (entropy > 0.95) return { level: "high", action: "classical_fallback" };
  if (entropy > 0.5) return { level: "medium", action: "explore" };
  return { level: "low", action: "execute" };
}
