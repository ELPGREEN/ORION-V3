/**
 * ─── v22.4: Meta-Learning & Recursive Self-Optimization Engine ───
 * Sistema de meta-aprendizagem: "aprender a aprender".
 * Otimiza algoritmos, propõe mudanças arquiteturais e gera novas estratégias.
 *
 * Ref: Schmidhuber (1987) "Evolutionary Principles in Self-Referential Learning"
 *      Finn et al. (2017) "Model-Agnostic Meta-Learning (MAML)"
 *      Clune (2019) "AI-Generating Algorithm"
 */

// ─── Types ───

export interface LearningStrategy {
  id: string;
  name: string;
  domain: string;                  // e.g., "text_generation", "vision", "reasoning"
  algorithm: "correlation" | "causal" | "heuristic" | "pattern_matching" | "ensemble";
  successRate: number;             // 0-1
  totalAttempts: number;
  avgLatencyMs: number;
  adaptations: number;            // how many times modified
  parameters: Record<string, number>;  // tunable hyperparameters
  createdAt: number;
  lastUsedAt: number;
}

export interface MetaMemoryEntry {
  timestamp: number;
  strategyId: string;
  taskType: string;
  outcome: "success" | "failure" | "partial";
  latencyMs: number;
  reflection: string;             // what was learned about learning
}

export interface ArchitecturalProposal {
  id: string;
  type: "add_module" | "remove_module" | "modify_params" | "merge_strategies" | "split_strategy";
  description: string;
  rationale: string;
  estimatedImprovement: number;   // 0-1
  risk: "low" | "medium" | "high";
  targetModule: string;
  proposedChanges: Record<string, unknown>;
  createdAt: number;
}

export interface MetaLearningState {
  strategies: LearningStrategy[];
  metaMemories: MetaMemoryEntry[];
  proposals: ArchitecturalProposal[];
  globalLearningRate: number;     // current meta-learning rate
  adaptationCount: number;
  lastOptimization: number;
}

// ─── Constants ───

const MAX_META_MEMORIES = 200;
const MAX_PROPOSALS = 20;
const DEFAULT_LEARNING_RATE = 0.01;

// ─── Default Strategies ───

const DEFAULT_STRATEGIES: LearningStrategy[] = [
  {
    id: "strat_text_cot",
    name: "Chain-of-Thought Textual",
    domain: "text_generation",
    algorithm: "heuristic",
    successRate: 0.75,
    totalAttempts: 0,
    avgLatencyMs: 1200,
    adaptations: 0,
    parameters: { depth: 3, temperature: 0.7, maxTokens: 2048 },
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  },
  {
    id: "strat_vision_vlm",
    name: "Análise Visual Multimodal",
    domain: "vision",
    algorithm: "pattern_matching",
    successRate: 0.70,
    totalAttempts: 0,
    avgLatencyMs: 2500,
    adaptations: 0,
    parameters: { temperature: 0.4, topK: 32, maxTokens: 4096 },
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  },
  {
    id: "strat_causal_inference",
    name: "Inferência Causal",
    domain: "reasoning",
    algorithm: "causal",
    successRate: 0.60,
    totalAttempts: 0,
    avgLatencyMs: 800,
    adaptations: 0,
    parameters: { maxDepth: 3, minStrength: 0.3, evidenceThreshold: 2 },
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  },
  {
    id: "strat_ensemble_fallback",
    name: "Ensemble com Fallback",
    domain: "text_generation",
    algorithm: "ensemble",
    successRate: 0.85,
    totalAttempts: 0,
    avgLatencyMs: 3000,
    adaptations: 0,
    parameters: { providers: 4, votingThreshold: 0.6, timeoutMs: 30000 },
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
  },
];

// ─── Meta-Learning Engine ───

export function createMetaLearningState(): MetaLearningState {
  return {
    strategies: [...DEFAULT_STRATEGIES],
    metaMemories: [],
    proposals: [],
    globalLearningRate: DEFAULT_LEARNING_RATE,
    adaptationCount: 0,
    lastOptimization: Date.now(),
  };
}

/**
 * Record a learning outcome and update strategy effectiveness.
 */
export function recordLearningOutcome(
  state: MetaLearningState,
  strategyId: string,
  taskType: string,
  outcome: "success" | "failure" | "partial",
  latencyMs: number,
  reflection?: string
): MetaLearningState {
  const strategies = state.strategies.map(s => {
    if (s.id !== strategyId) return s;

    const newAttempts = s.totalAttempts + 1;
    const successDelta = outcome === "success" ? 1 : outcome === "partial" ? 0.5 : 0;
    // Exponential moving average for success rate
    const newSuccessRate = s.successRate * 0.9 + (successDelta / 1) * 0.1;
    // Running average for latency
    const newLatency = (s.avgLatencyMs * s.totalAttempts + latencyMs) / newAttempts;

    return {
      ...s,
      successRate: Math.max(0, Math.min(1, newSuccessRate)),
      totalAttempts: newAttempts,
      avgLatencyMs: newLatency,
      lastUsedAt: Date.now(),
    };
  });

  const entry: MetaMemoryEntry = {
    timestamp: Date.now(),
    strategyId,
    taskType,
    outcome,
    latencyMs,
    reflection: reflection ?? `Strategy ${strategyId}: ${outcome} em ${latencyMs}ms para ${taskType}`,
  };

  const metaMemories = [...state.metaMemories, entry].slice(-MAX_META_MEMORIES);

  return { ...state, strategies, metaMemories };
}

/**
 * Optimize the global learning rate based on recent performance.
 * Adaptive learning: increase rate when learning is effective, decrease when not.
 */
export function optimizeLearningRate(state: MetaLearningState): MetaLearningState {
  const recentMemories = state.metaMemories.slice(-20);
  if (recentMemories.length < 5) return state;

  const recentSuccessRate = recentMemories.filter(m => m.outcome === "success").length / recentMemories.length;
  const olderMemories = state.metaMemories.slice(-40, -20);
  const olderSuccessRate = olderMemories.length > 0
    ? olderMemories.filter(m => m.outcome === "success").length / olderMemories.length
    : 0.5;

  // If improving → increase learning rate; if degrading → decrease
  const trend = recentSuccessRate - olderSuccessRate;
  const newRate = Math.max(0.001, Math.min(0.1,
    state.globalLearningRate * (1 + trend * 2)
  ));

  return {
    ...state,
    globalLearningRate: newRate,
    lastOptimization: Date.now(),
  };
}

/**
 * Evaluate which strategy is best for a given task type.
 * Returns strategies ranked by expected performance.
 */
export function evaluateStrategyEffectiveness(
  state: MetaLearningState,
  taskType: string
): Array<{ strategy: LearningStrategy; score: number; reasoning: string }> {
  return state.strategies
    .map(s => {
      // Domain match bonus
      const domainMatch = s.domain === taskType ? 0.3 : 0;

      // Recent performance for this task type
      const relevantMemories = state.metaMemories
        .filter(m => m.strategyId === s.id && m.taskType === taskType)
        .slice(-10);

      const taskSpecificSuccess = relevantMemories.length > 0
        ? relevantMemories.filter(m => m.outcome === "success").length / relevantMemories.length
        : s.successRate * 0.8; // discount if no task-specific data

      // Speed factor (normalize: <1s = 1.0, >5s = 0.5)
      const speedFactor = Math.max(0.5, 1 - s.avgLatencyMs / 10000);

      const score = taskSpecificSuccess * 0.5 + domainMatch + speedFactor * 0.2;

      return {
        strategy: s,
        score: Math.max(0, Math.min(1, score)),
        reasoning: `Success: ${(taskSpecificSuccess * 100).toFixed(0)}%, Domain match: ${domainMatch > 0 ? "sim" : "não"}, Latência: ${s.avgLatencyMs.toFixed(0)}ms`,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Propose architectural changes based on meta-learning patterns.
 * This is the "self-programming" capability — the system suggests its own improvements.
 */
export function proposeArchitecturalChange(state: MetaLearningState): ArchitecturalProposal | null {
  // Analyze failure patterns
  const recentFailures = state.metaMemories
    .filter(m => m.outcome === "failure")
    .slice(-20);

  if (recentFailures.length < 3) return null;

  // Find most failing strategy
  const failureCounts = new Map<string, number>();
  for (const f of recentFailures) {
    failureCounts.set(f.strategyId, (failureCounts.get(f.strategyId) || 0) + 1);
  }

  const worstStrategy = Array.from(failureCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (!worstStrategy) return null;

  const strategy = state.strategies.find(s => s.id === worstStrategy[0]);
  if (!strategy) return null;

  // Find most failing task type
  const failingTasks = recentFailures
    .filter(m => m.strategyId === worstStrategy[0])
    .map(m => m.taskType);
  const taskCounts = new Map<string, number>();
  for (const t of failingTasks) {
    taskCounts.set(t, (taskCounts.get(t) || 0) + 1);
  }
  const worstTask = Array.from(taskCounts.entries()).sort((a, b) => b[1] - a[1])[0];

  const proposal: ArchitecturalProposal = {
    id: `prop_${Date.now()}`,
    type: strategy.successRate < 0.3 ? "remove_module" : "modify_params",
    description: strategy.successRate < 0.3
      ? `Remover ou substituir estratégia "${strategy.name}" (taxa de sucesso: ${(strategy.successRate * 100).toFixed(0)}%)`
      : `Ajustar parâmetros de "${strategy.name}" para melhorar performance em "${worstTask?.[0] ?? "geral"}"`,
    rationale: `${worstStrategy[1]} falhas recentes. Task mais afetada: ${worstTask?.[0] ?? "diversas"}. Success rate global: ${(strategy.successRate * 100).toFixed(0)}%.`,
    estimatedImprovement: Math.min(0.3, worstStrategy[1] * 0.05),
    risk: strategy.successRate < 0.3 ? "medium" : "low",
    targetModule: strategy.id,
    proposedChanges: {
      currentSuccessRate: strategy.successRate,
      suggestedParameters: {
        ...strategy.parameters,
        // Adjust the most impactful parameters
        ...(strategy.parameters.temperature !== undefined
          ? { temperature: Math.max(0.1, strategy.parameters.temperature * 0.9) }
          : {}),
        ...(strategy.parameters.depth !== undefined
          ? { depth: Math.min(5, (strategy.parameters.depth as number) + 1) }
          : {}),
      },
    },
    createdAt: Date.now(),
  };

  const proposals = [...state.proposals, proposal].slice(-MAX_PROPOSALS);

  return proposal;
}

/**
 * Apply an approved architectural proposal.
 */
export function applyProposal(
  state: MetaLearningState,
  proposalId: string
): MetaLearningState {
  const proposal = state.proposals.find(p => p.id === proposalId);
  if (!proposal) return state;

  let strategies = [...state.strategies];

  if (proposal.type === "modify_params") {
    strategies = strategies.map(s => {
      if (s.id !== proposal.targetModule) return s;
      const suggestedParams = (proposal.proposedChanges.suggestedParameters as Record<string, number>) || {};
      return {
        ...s,
        parameters: { ...s.parameters, ...suggestedParams },
        adaptations: s.adaptations + 1,
      };
    });
  } else if (proposal.type === "remove_module") {
    strategies = strategies.filter(s => s.id !== proposal.targetModule);
  }

  // Remove applied proposal
  const proposals = state.proposals.filter(p => p.id !== proposalId);

  return {
    ...state,
    strategies,
    proposals,
    adaptationCount: state.adaptationCount + 1,
  };
}

/**
 * Auto-execute low-risk proposals with high estimated improvement.
 * Called during optimization cycles to apply safe self-improvements.
 */
export function autoExecuteProposals(state: MetaLearningState): MetaLearningState {
  let updated = state;
  const safeProposals = state.proposals.filter(
    p => p.risk === "low" && p.estimatedImprovement > 0.15
  );
  for (const proposal of safeProposals) {
    updated = applyProposal(updated, proposal.id);
    console.log(`[MetaLearning] Auto-executed proposal: ${proposal.description}`);
  }
  return updated;
}

/**
 * Get a summary for introspection / AI system prompt.
 */
export function getMetaLearningSummary(state: MetaLearningState): string {
  const bestStrategy = [...state.strategies].sort((a, b) => b.successRate - a.successRate)[0];
  const worstStrategy = [...state.strategies].sort((a, b) => a.successRate - b.successRate)[0];
  const recentSuccess = state.metaMemories.slice(-10).filter(m => m.outcome === "success").length;

  return [
    `[MetaLearning] Estratégias: ${state.strategies.length}`,
    `Taxa de aprendizado: ${(state.globalLearningRate * 1000).toFixed(1)}‰`,
    `Adaptações: ${state.adaptationCount}`,
    bestStrategy ? `Melhor: ${bestStrategy.name} (${(bestStrategy.successRate * 100).toFixed(0)}%)` : "",
    worstStrategy ? `Pior: ${worstStrategy.name} (${(worstStrategy.successRate * 100).toFixed(0)}%)` : "",
    `Últimas 10: ${recentSuccess}/10 sucesso`,
    `Propostas pendentes: ${state.proposals.length}`,
  ].filter(Boolean).join(" | ");
}
