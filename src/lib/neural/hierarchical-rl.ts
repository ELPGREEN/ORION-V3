/**
 * ─── v21.2: Hierarchical RL + Options Framework ───
 * Feudal Networks (Dayan & Hinton 1993) + Options (Sutton et al. 1999)
 * Two-level hierarchy: Manager (sub-goals) → Worker (primitive actions)
 * 
 * Ref: Yang et al. (2018) PEORL, Vezhnevets et al. (2017) FeUdal
 */

export interface Option {
  id: string;
  name: string;
  initiationSet: string[];  // preconditions
  policy: string[];          // sequence of actions
  terminationConditions: string[];
  expectedSteps: number;
  successRate: number;
}

export interface SubGoal {
  id: string;
  description: string;
  option: Option;
  qValue: number;
  ucbBonus: number;
  completed: boolean;
}

export interface HRLState {
  worldState: Set<string>;
  goalState: Set<string>;
  activeOption: Option | null;
  subGoals: SubGoal[];
  qValues: Map<string, number>;
  visitCounts: Map<string, number>;
  totalReward: number;
}

export const LEGAL_OPTIONS: Option[] = [
  {
    id: "opt-pesquisa-jurisp",
    name: "Pesquisar Jurisprudência",
    initiationSet: ["query_defined"],
    policy: ["embed_query", "search_legal_db", "rank_results"],
    terminationConditions: ["has_jurisprudence"],
    expectedSteps: 3,
    successRate: 0.9,
  },
  {
    id: "opt-pesquisa-legis",
    name: "Pesquisar Legislação",
    initiationSet: ["query_defined"],
    policy: ["identify_area", "search_legislation", "extract_articles"],
    terminationConditions: ["has_legislation"],
    expectedSteps: 3,
    successRate: 0.92,
  },
  {
    id: "opt-analisar-fatos",
    name: "Analisar Fatos",
    initiationSet: ["has_jurisprudence", "has_legislation"],
    policy: ["extract_facts", "map_to_law", "identify_thesis", "evaluate_strength"],
    terminationConditions: ["case_analyzed"],
    expectedSteps: 4,
    successRate: 0.85,
  },
  {
    id: "opt-estruturar-args",
    name: "Estruturar Argumentação",
    initiationSet: ["case_analyzed"],
    policy: ["define_thesis", "organize_evidence", "build_chain", "add_citations"],
    terminationConditions: ["arguments_structured"],
    expectedSteps: 4,
    successRate: 0.82,
  },
  {
    id: "opt-redigir",
    name: "Redigir Documento",
    initiationSet: ["arguments_structured"],
    policy: ["create_structure", "write_intro", "write_body", "write_conclusion", "format"],
    terminationConditions: ["draft_ready"],
    expectedSteps: 5,
    successRate: 0.88,
  },
  {
    id: "opt-revisar",
    name: "Revisar Qualidade",
    initiationSet: ["draft_ready"],
    policy: ["check_citations", "check_structure", "check_language", "score_quality"],
    terminationConditions: ["quality_verified"],
    expectedSteps: 4,
    successRate: 0.9,
  },
  {
    id: "opt-multimodal",
    name: "Análise Multimodal",
    initiationSet: ["query_defined"],
    policy: ["extract_text", "extract_vision", "fuse_modalities", "analyze"],
    terminationConditions: ["multimodal_processed"],
    expectedSteps: 4,
    successRate: 0.75,
  },
];

export function initHRLState(goalPredicates: string[]): HRLState {
  return {
    worldState: new Set(["query_defined"]),
    goalState: new Set(goalPredicates),
    activeOption: null,
    subGoals: [],
    qValues: new Map(),
    visitCounts: new Map(),
    totalReward: 0,
  };
}

export function symbolicPlan(
  worldState: Set<string>,
  goalState: Set<string>,
  options: Option[] = LEGAL_OPTIONS
): Option[] {
  const plan: Option[] = [];
  const current = new Set(worldState);

  let maxIter = 20;
  while (maxIter-- > 0) {
    const goalMet = [...goalState].every(g => current.has(g));
    if (goalMet) break;

    const applicable = options.filter(op =>
      op.initiationSet.every(pre => current.has(pre))
    );
    if (applicable.length === 0) break;

    // Greedy: pick option that adds most goal predicates (corrected comparison)
    const best = applicable.reduce((bestSoFar, candidate) => {
      const bestGain = bestSoFar.terminationConditions.filter(e => goalState.has(e) && !current.has(e)).length;
      const candidateGain = candidate.terminationConditions.filter(e => goalState.has(e) && !current.has(e)).length;
      return candidateGain > bestGain ? candidate : bestSoFar;
    });

    plan.push(best);
    for (const effect of best.terminationConditions) {
      current.add(effect);
    }
  }

  return plan;
}

export function selectSubGoal(
  state: HRLState,
  explorationConstant: number = 1.414
): SubGoal | null {
  const pending = state.subGoals.filter(sg => !sg.completed);
  if (pending.length === 0) return null;

  // UCB1 selection
  const totalVisits = [...state.visitCounts.values()].reduce((a, b) => a + b, 1);

  let best: SubGoal | null = null;
  let bestScore = -Infinity;
  for (const sg of pending) {
    const visits = state.visitCounts.get(sg.id) || 1;
    const ucb = sg.qValue + explorationConstant * Math.sqrt(Math.log(totalVisits) / visits);
    if (ucb > bestScore) {
      bestScore = ucb;
      best = sg;
    }
  }
  return best;
}

export function computeIntrinsicReward(
  externalReward: number,
  actionInPolicy: boolean
): number {
  const consistency = actionInPolicy ? 0.5 : -0.3;
  return externalReward * 0.7 + consistency * 0.3;
}

export function updateQValues(
  state: HRLState,
  subGoalId: string,
  reward: number,
  alpha: number = 0.1,
  gamma: number = 0.9
): void {
  const current = state.qValues.get(subGoalId) || 0;
  const maxFuture = Math.max(0, ...[...state.qValues.values()]);
  const newQ = current + alpha * (reward + gamma * maxFuture - current);
  state.qValues.set(subGoalId, newQ);
  state.visitCounts.set(subGoalId, (state.visitCounts.get(subGoalId) || 0) + 1);
}
