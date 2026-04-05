/**
 * MoE (Mixture of Experts) Gating Network v2
 * Softmax-based provider routing for AI requests
 * 
 * v2 Upgrades:
 * - Expert synergy bonus (+0.15 for complementary experts)
 * - Deep tier support: topK=6, computeBudget=5.0
 * - Full tier: topK=5, computeBudget=2.5
 * - Enhanced load balancing
 */

import type { AIProvider, AIUseCase } from "./ai-orchestrator";

export interface MoEConfig {
  experts: Array<{
    id: AIProvider;
    specialization: AIUseCase[];
    capacity: number;
    weight: number;
  }>;
  topK: number;
  loadBalancingLoss: number;
  noisyGating: boolean;
}

export const DEFAULT_MOE_CONFIG: MoEConfig = {
  experts: [
    { id: "groq", specialization: ["chat", "code_gen", "analysis", "search"], capacity: 1.0, weight: 0.40 },
    { id: "mistral", specialization: ["documents", "chat", "translation", "search"], capacity: 0.95, weight: 0.30 },
    { id: "anthropic", specialization: ["documents", "analysis"], capacity: 0.85, weight: 0.15 },
    { id: "openai", specialization: ["documents", "translation"], capacity: 0.80, weight: 0.05 },
    { id: "github_models", specialization: ["chat", "code_gen"], capacity: 0.7, weight: 0.05 },
  ],
  topK: 2,
  loadBalancingLoss: 0.01,
  noisyGating: true,
};

export function moeGating(
  useCase: AIUseCase,
  config: MoEConfig = DEFAULT_MOE_CONFIG
): AIProvider[] {
  const scores = config.experts.map((expert) => {
    const specializationBonus = expert.specialization.includes(useCase) ? 0.5 : 0;
    const noise = config.noisyGating ? (Math.random() - 0.5) * 0.1 : 0;
    return { id: expert.id, score: expert.weight + specializationBonus + noise };
  });

  const maxScore = Math.max(...scores.map((s) => s.score));
  const expScores = scores.map((s) => ({ ...s, expScore: Math.exp(s.score - maxScore) }));
  const sumExp = expScores.reduce((acc, s) => acc + s.expScore, 0);
  const normalized = expScores.map((s) => ({ ...s, probability: s.expScore / sumExp }));

  normalized.sort((a, b) => b.probability - a.probability);
  return normalized.slice(0, config.topK).map((s) => s.id);
}

/* ─── Internal MoE (Neural Module Routing) v2 ─── */

export type InternalExpertType =
  | "mamba_ssm"
  | "cross_attention"
  | "concept_model"
  | "kv_cache"
  | "slim_router"
  | "masked_prediction"
  | "multimodal_fusion"
  | "llm_judge"
  | "temporal_binding"
  | "hierarchical_rl"
  | "action_model"
  | "segment_anything";

export interface InternalExpert {
  id: InternalExpertType;
  specialization: string[];
  computeCost: number; // 0-1 (0=cheap, 1=expensive)
  weight: number;
  active: boolean;
}

export interface InternalRoutingResult {
  selectedExperts: InternalExpertType[];
  scores: Array<{ id: InternalExpertType; score: number; probability: number }>;
  totalComputeCost: number;
  loadBalancingLoss: number;
  synergyBonus: number;
}

// ─── Expert Synergy Matrix ───
// Complementary expert pairs that get a synergy bonus when co-selected
const SYNERGY_PAIRS: Array<[InternalExpertType, InternalExpertType, number]> = [
  ["masked_prediction", "llm_judge", 0.15],       // MLM validates → Judge scores
  ["mamba_ssm", "cross_attention", 0.12],          // Long-range + cross-modal
  ["concept_model", "masked_prediction", 0.10],    // Concept → completeness check
  ["action_model", "hierarchical_rl", 0.12],       // Action planning + RL strategy
  ["multimodal_fusion", "segment_anything", 0.10], // Vision fusion + segmentation
  ["mamba_ssm", "temporal_binding", 0.10],          // SSM + temporal awareness
  ["concept_model", "llm_judge", 0.08],            // Concept mapping → quality eval
  ["kv_cache", "slim_router", 0.06],               // Cache + routing optimization
];

const INTERNAL_EXPERTS: InternalExpert[] = [
  { id: "mamba_ssm", specialization: ["long_sequence", "document_analysis", "temporal", "deep"], computeCost: 0.6, weight: 0.15, active: true },
  { id: "cross_attention", specialization: ["multimodal", "comparison", "fusion", "deep"], computeCost: 0.7, weight: 0.12, active: true },
  { id: "concept_model", specialization: ["conceptual_search", "legal_classification", "pre_rag", "deep"], computeCost: 0.4, weight: 0.15, active: true },
  { id: "kv_cache", specialization: ["cached_context", "repeated_query", "fixed_documents"], computeCost: 0.05, weight: 0.18, active: true },
  { id: "slim_router", specialization: ["complexity_classification", "tier_routing", "optimization"], computeCost: 0.02, weight: 0.1, active: true },
  { id: "masked_prediction", specialization: ["document_validation", "completeness_check", "term_prediction", "deep"], computeCost: 0.3, weight: 0.1, active: true },
  { id: "multimodal_fusion", specialization: ["image_text", "vlm", "sam_segmentation"], computeCost: 0.8, weight: 0.05, active: true },
  { id: "llm_judge", specialization: ["quality_evaluation", "scoring", "ranking", "deep"], computeCost: 0.5, weight: 0.05, active: true },
  { id: "temporal_binding", specialization: ["timeline", "sequence_ordering", "chronological"], computeCost: 0.35, weight: 0.05, active: true },
  { id: "hierarchical_rl", specialization: ["planning", "multi_step", "strategy", "deep"], computeCost: 0.65, weight: 0.05, active: true },
  { id: "action_model", specialization: ["task_planning", "action_execution", "workflow", "intent_recognition", "deep"], computeCost: 0.5, weight: 0.08, active: true },
  { id: "segment_anything", specialization: ["segmentation", "mask_generation", "object_isolation", "document_layout"], computeCost: 0.55, weight: 0.06, active: true },
];

function computeSynergyBonus(selected: InternalExpertType[]): number {
  let bonus = 0;
  const selectedSet = new Set(selected);
  for (const [a, b, value] of SYNERGY_PAIRS) {
    if (selectedSet.has(a) && selectedSet.has(b)) {
      bonus += value;
    }
  }
  return bonus;
}

/**
 * Route a task to internal neural module experts using MoE gating.
 * v2: synergy bonuses, expanded budgets for deep tier.
 */
export function moeInternalGating(
  taskType: string,
  options: {
    topK?: number;
    computeBudget?: number;
    noisyGating?: boolean;
  } = {}
): InternalRoutingResult {
  const { topK = 3, computeBudget = 1.5, noisyGating = true } = options;
  const taskLower = taskType.toLowerCase();

  const scores = INTERNAL_EXPERTS.filter((e) => e.active).map((expert) => {
    const specBonus = expert.specialization.some((s) => taskLower.includes(s)) ? 0.5 : 0;
    const noise = noisyGating ? (Math.random() - 0.5) * 0.08 : 0;
    const costPenalty = expert.computeCost * 0.1;
    return {
      id: expert.id,
      score: expert.weight + specBonus - costPenalty + noise,
      computeCost: expert.computeCost,
    };
  });

  // Softmax normalization
  const maxScore = Math.max(...scores.map((s) => s.score));
  const expScores = scores.map((s) => ({ ...s, expScore: Math.exp(s.score - maxScore) }));
  const sumExp = expScores.reduce((acc, s) => acc + s.expScore, 0);
  const normalized = expScores.map((s) => ({ ...s, probability: s.expScore / sumExp }));
  normalized.sort((a, b) => b.probability - a.probability);

  // Select top-K within compute budget
  const selected: typeof normalized = [];
  let totalCost = 0;
  for (const expert of normalized) {
    if (selected.length >= topK) break;
    if (totalCost + expert.computeCost <= computeBudget) {
      selected.push(expert);
      totalCost += expert.computeCost;
    }
  }

  // Apply synergy bonus — if synergistic pair found, try to add missing partner
  const selectedIds = selected.map(s => s.id);
  const synergyBonus = computeSynergyBonus(selectedIds);

  // If budget allows and synergy partner available, add it
  if (selected.length < topK) {
    for (const [a, b] of SYNERGY_PAIRS) {
      if (selected.length >= topK) break;
      const hasA = selectedIds.includes(a);
      const hasB = selectedIds.includes(b);
      if (hasA && !hasB) {
        const partner = normalized.find(e => e.id === b);
        if (partner && totalCost + partner.computeCost <= computeBudget) {
          selected.push(partner);
          selectedIds.push(partner.id);
          totalCost += partner.computeCost;
        }
      } else if (hasB && !hasA) {
        const partner = normalized.find(e => e.id === a);
        if (partner && totalCost + partner.computeCost <= computeBudget) {
          selected.push(partner);
          selectedIds.push(partner.id);
          totalCost += partner.computeCost;
        }
      }
    }
  }

  // Load balancing loss
  const idealProb = 1 / normalized.length;
  const lbLoss = normalized.reduce((acc, e) => acc + (e.probability - idealProb) ** 2, 0) / normalized.length;

  return {
    selectedExperts: selected.map((s) => s.id),
    scores: normalized.map((s) => ({ id: s.id, score: s.score, probability: s.probability })),
    totalComputeCost: totalCost,
    loadBalancingLoss: lbLoss,
    synergyBonus,
  };
}
