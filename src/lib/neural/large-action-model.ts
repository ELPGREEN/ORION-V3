/**
 * ─── LAM: Large Action Model ───
 * Intent Recognition → Task Decomposition → Action Planning → Execution → Feedback
 * Neuro-symbolic integration for legal domain workflows.
 */

// ─── Types ───

export type ActionIntent =
  | "draft_document"
  | "analyze_document"
  | "legal_research"
  | "calculate"
  | "translate"
  | "summarize"
  | "compare"
  | "classify"
  | "ocr_extract"
  | "schedule"
  | "communicate"
  | "unknown";

export type ActionStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface PerceptionResult {
  rawInput: string;
  inputType: "question" | "command" | "document" | "multimodal";
  domain: "legal" | "administrative" | "financial" | "general";
  urgency: number;       // 0-1
  complexity: number;    // 0-1
  entities: string[];
  keywords: string[];
  timestamp: number;
}

export interface IntentResult {
  primary: ActionIntent;
  secondary: ActionIntent | null;
  confidence: number;
  reasoning: string;
  requiresContext: boolean;
  requiresVision: boolean;
}

export interface SubTask {
  id: string;
  action: ActionIntent;
  description: string;
  dependencies: string[];  // IDs of tasks this depends on
  priority: number;        // 0-1
  estimatedCostMs: number;
  module: string;          // target neural module
  params: Record<string, unknown>;
  status: ActionStatus;
  result?: unknown;
}

export interface ActionPlan {
  id: string;
  intent: IntentResult;
  tasks: SubTask[];
  executionOrder: string[];  // Task IDs in order
  totalEstimatedMs: number;
  parallelizable: string[][]; // Groups of tasks that can run in parallel
  constraints: NeuroSymbolicConstraint[];
}

export interface NeuroSymbolicConstraint {
  rule: string;
  source: string;       // e.g., "CPC Art. 319", "CLT Art. 840"
  type: "required" | "prohibited" | "conditional";
  appliesTo: ActionIntent[];
}

export interface ExecutionResult {
  planId: string;
  completedTasks: number;
  totalTasks: number;
  successRate: number;
  outputs: Record<string, unknown>;
  feedback: FeedbackEntry;
  durationMs: number;
}

export interface FeedbackEntry {
  success: boolean;
  qualityScore: number;  // 0-1
  adjustments: string[];
  learnedPatterns: string[];
}

export interface ActionMemory {
  recentActions: Array<{ intent: ActionIntent; success: boolean; timestamp: number }>;
  frequentPatterns: Map<string, number>;
  failureReasons: Map<string, string[]>;
}

// ─── Intent Recognition Patterns ───

const INTENT_PATTERNS: Record<ActionIntent, RegExp> = {
  draft_document: /\b(redig|escrev|cri[ae]|elabor|mont|faz|gerar?\b.*\b(petiç|contrat|parecer|procuraç|recurso|defesa|contestaç|réplica|doc|minuta|acordo|cláusula))/i,
  analyze_document: /\b(analis|revis|verific|examin|avali|chec|conferir|audit)\b/i,
  legal_research: /\b(pesquis|busca|encontr|jurisprud|súmula|legislaç|lei\b|artigo\b|CPC|CLT|CF|STF|STJ|precedent)/i,
  calculate: /\b(calcul|comput|soma|total|valor|multa|juro|correç|honor|cust|prazo.*dias)/i,
  translate: /\b(traduz|translat|inglês|english|espanhol|spanish|francês|french|idioma|língua)/i,
  summarize: /\b(resum|sintetiz|resuma|breve|síntese|extrat|pontos.*princip|TL;?DR)/i,
  compare: /\b(compar|diferenç|versus|vs\.?|confronta|cotej|entre.*e\b)/i,
  classify: /\b(classific|categoriz|tipo|natureza|espécie|modal|enquadr)/i,
  ocr_extract: /\b(OCR|extrair.*texto|ler.*imagem|digitaliz|escane|scan|foto.*document)/i,
  schedule: /\b(agend|marc|lembr|prazo|audiência|reunião|data.*limit|calendário|compromiss)/i,
  communicate: /\b(envi|email|notific|mensag|comunic|respond|cliente|contato)/i,
  unknown: /(?!)/,  // never matches
};

const DOMAIN_PATTERNS: Record<string, RegExp> = {
  legal: /\b(petiç|processo|juiz|tribunal|audiência|ré[ou]|autor|advogad|CPC|CLT|OAB|foro|comarca|jur)/i,
  financial: /\b(pag|valor|honor|cust|fat|recib|nota.*fiscal|cobranç|financ)/i,
  administrative: /\b(client|agend|document|pasta|arquiv|organiz|cadastr|config)/i,
};

// ─── Neuro-Symbolic Rules ───

const LEGAL_CONSTRAINTS: NeuroSymbolicConstraint[] = [
  {
    rule: "Petição inicial deve conter: fatos, fundamentos jurídicos, pedido e valor da causa",
    source: "CPC Art. 319",
    type: "required",
    appliesTo: ["draft_document"],
  },
  {
    rule: "Prazos processuais contam em dias úteis",
    source: "CPC Art. 219",
    type: "required",
    appliesTo: ["calculate", "schedule"],
  },
  {
    rule: "Recurso deve indicar vícios da decisão recorrida",
    source: "CPC Art. 1.010",
    type: "required",
    appliesTo: ["draft_document", "analyze_document"],
  },
  {
    rule: "Não é permitido inovar matéria em sede recursal",
    source: "CPC Art. 1.014",
    type: "prohibited",
    appliesTo: ["draft_document"],
  },
  {
    rule: "Citações de jurisprudência devem incluir número do processo e órgão julgador",
    source: "Boas práticas",
    type: "required",
    appliesTo: ["legal_research", "draft_document"],
  },
  {
    rule: "Cálculos trabalhistas devem usar índice IPCA-E ou TR conforme decisão",
    source: "CLT + TST",
    type: "conditional",
    appliesTo: ["calculate"],
  },
];

// ─── Module Mapping ───

const MODULE_MAP: Record<ActionIntent, string> = {
  draft_document: "document_editor",
  analyze_document: "llm_judge",
  legal_research: "semantic_search",
  calculate: "calculator",
  translate: "translator",
  summarize: "slim_router",
  compare: "cross_attention",
  classify: "concept_model",
  ocr_extract: "vision_ocr",
  schedule: "calendar",
  communicate: "messaging",
  unknown: "general_llm",
};

// ─── Core Functions ───

let _actionMemory: ActionMemory = {
  recentActions: [],
  frequentPatterns: new Map(),
  failureReasons: new Map(),
};

/**
 * Stage 1: Perceive and classify the raw input
 */
export function perceiveInput(query: string, context?: string): PerceptionResult {
  const words = query.toLowerCase().split(/\s+/);
  const entities: string[] = [];
  const keywords: string[] = [];

  // Extract capitalized words as potential entities
  const entityRx = /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}/g;
  let m: RegExpExecArray | null;
  while ((m = entityRx.exec(query)) !== null) entities.push(m[0]);

  // Extract legal-specific keywords
  const legalKws = /\b(petição|recurso|contrato|processo|audiência|prazo|honorários|cliente|documento|sentença|acórdão)\b/gi;
  while ((m = legalKws.exec(query)) !== null) keywords.push(m[0].toLowerCase());

  // Determine domain
  let domain: PerceptionResult["domain"] = "general";
  for (const [d, rx] of Object.entries(DOMAIN_PATTERNS)) {
    if (rx.test(query)) { domain = d as any; break; }
  }

  // Complexity heuristic
  const complexity = Math.min(1, (words.length / 50) + (keywords.length * 0.1) + (context ? 0.2 : 0));

  // Urgency heuristic
  const urgencyRx = /\b(urgent|urgente|hoje|agora|imediato|rápido|prazo.*venc|amanhã)\b/i;
  const urgency = urgencyRx.test(query) ? 0.9 : 0.3;

  const inputType = context && context.length > 500 ? "document" : words.length < 5 ? "command" : "question";

  return {
    rawInput: query,
    inputType,
    domain,
    urgency,
    complexity,
    entities,
    keywords,
    timestamp: Date.now(),
  };
}

/**
 * Stage 2: Recognize the user's intent from perception
 */
export function recognizeIntent(perception: PerceptionResult): IntentResult {
  const q = perception.rawInput;
  let bestIntent: ActionIntent = "unknown";
  let bestScore = 0;
  let secondIntent: ActionIntent | null = null;

  for (const [intent, rx] of Object.entries(INTENT_PATTERNS)) {
    if (intent === "unknown") continue;
    const match = rx.exec(q);
    if (match) {
      const score = match[0].length / q.length + (perception.keywords.length * 0.05);
      if (score > bestScore) {
        secondIntent = bestIntent !== "unknown" ? bestIntent : null;
        bestIntent = intent as ActionIntent;
        bestScore = score;
      }
    }
  }

  // Boost from memory patterns
  const patternKey = `${perception.domain}:${bestIntent}`;
  const frequency = _actionMemory.frequentPatterns.get(patternKey) || 0;
  const memoryBoost = Math.min(0.15, frequency * 0.02);

  const confidence = Math.min(1, bestScore + memoryBoost + (bestIntent !== "unknown" ? 0.3 : 0));

  return {
    primary: bestIntent,
    secondary: secondIntent,
    confidence,
    reasoning: bestIntent === "unknown"
      ? "Não foi possível determinar a intenção com clareza"
      : `Intenção "${bestIntent}" detectada com confiança ${(confidence * 100).toFixed(0)}%`,
    requiresContext: ["analyze_document", "summarize", "compare", "classify"].includes(bestIntent),
    requiresVision: ["ocr_extract"].includes(bestIntent),
  };
}

/**
 * Stage 3: Decompose intent into atomic subtasks
 */
export function decomposeTask(intent: IntentResult, perception: PerceptionResult): SubTask[] {
  const tasks: SubTask[] = [];
  let taskIdx = 0;
  const mkId = () => `task_${taskIdx++}_${Date.now()}`;

  switch (intent.primary) {
    case "draft_document": {
      const researchId = mkId();
      const analyzeId = mkId();
      const draftId = mkId();
      const reviewId = mkId();
      tasks.push(
        { id: researchId, action: "legal_research", description: "Pesquisar fundamentos jurídicos", dependencies: [], priority: 0.9, estimatedCostMs: 2000, module: "semantic_search", params: { query: perception.rawInput }, status: "pending" },
        { id: analyzeId, action: "classify", description: "Classificar tipo documental", dependencies: [], priority: 0.8, estimatedCostMs: 500, module: "concept_model", params: { input: perception.rawInput }, status: "pending" },
        { id: draftId, action: "draft_document", description: "Redigir documento", dependencies: [researchId, analyzeId], priority: 1.0, estimatedCostMs: 5000, module: "document_editor", params: { type: "auto" }, status: "pending" },
        { id: reviewId, action: "analyze_document", description: "Revisar completude", dependencies: [draftId], priority: 0.7, estimatedCostMs: 1500, module: "llm_judge", params: {}, status: "pending" },
      );
      break;
    }
    case "legal_research": {
      const searchId = mkId();
      const rankId = mkId();
      tasks.push(
        { id: searchId, action: "legal_research", description: "Buscar fontes jurídicas", dependencies: [], priority: 1.0, estimatedCostMs: 3000, module: "semantic_search", params: { query: perception.rawInput }, status: "pending" },
        { id: rankId, action: "classify", description: "Rankear resultados por relevância", dependencies: [searchId], priority: 0.8, estimatedCostMs: 800, module: "llm_judge", params: {}, status: "pending" },
      );
      break;
    }
    case "analyze_document": {
      const classifyId = mkId();
      const completenessId = mkId();
      const judgeId = mkId();
      tasks.push(
        { id: classifyId, action: "classify", description: "Identificar tipo documental", dependencies: [], priority: 0.9, estimatedCostMs: 400, module: "concept_model", params: {}, status: "pending" },
        { id: completenessId, action: "analyze_document", description: "Verificar completude estrutural", dependencies: [classifyId], priority: 1.0, estimatedCostMs: 1200, module: "masked_prediction", params: {}, status: "pending" },
        { id: judgeId, action: "analyze_document", description: "Avaliar qualidade jurídica", dependencies: [completenessId], priority: 0.8, estimatedCostMs: 1500, module: "llm_judge", params: {}, status: "pending" },
      );
      break;
    }
    default: {
      tasks.push({
        id: mkId(),
        action: intent.primary,
        description: `Executar: ${intent.primary}`,
        dependencies: [],
        priority: 1.0,
        estimatedCostMs: 2000,
        module: MODULE_MAP[intent.primary] || "general_llm",
        params: { query: perception.rawInput },
        status: "pending",
      });
    }
  }

  return tasks;
}

/**
 * Stage 4: Plan execution order with dependency resolution and constraints
 */
export function planActions(tasks: SubTask[], intent: IntentResult): ActionPlan {
  // Topological sort for execution order
  const order: string[] = [];
  const visited = new Set<string>();
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const task = taskMap.get(id);
    if (!task) return;
    for (const dep of task.dependencies) visit(dep);
    order.push(id);
  }
  tasks.forEach(t => visit(t.id));

  // Find parallelizable groups (tasks with same or no dependencies)
  const parallelizable: string[][] = [];
  const depSets = new Map<string, string>();
  for (const t of tasks) {
    const key = t.dependencies.sort().join(",") || "root";
    depSets.set(key, (depSets.get(key) || "") + "," + t.id);
  }
  for (const ids of depSets.values()) {
    const group = ids.split(",").filter(Boolean);
    if (group.length > 1) parallelizable.push(group);
  }

  // Select applicable constraints
  const constraints = LEGAL_CONSTRAINTS.filter(c =>
    c.appliesTo.some(a => a === intent.primary || tasks.some(t => t.action === a))
  );

  const totalEstimatedMs = tasks.reduce((sum, t) => sum + t.estimatedCostMs, 0);

  return {
    id: `plan_${Date.now()}`,
    intent,
    tasks,
    executionOrder: order,
    totalEstimatedMs,
    parallelizable,
    constraints,
  };
}

/**
 * Stage 5: Simulate execution (dispatches to module references)
 */
export function executeAction(plan: ActionPlan): ExecutionResult {
  const start = performance.now();
  const outputs: Record<string, unknown> = {};
  let completed = 0;

  for (const taskId of plan.executionOrder) {
    const task = plan.tasks.find(t => t.id === taskId);
    if (!task) continue;

    // Check dependencies completed
    const depsOk = task.dependencies.every(d => {
      const dep = plan.tasks.find(t => t.id === d);
      return dep?.status === "completed";
    });

    if (!depsOk) {
      task.status = "skipped";
      continue;
    }

    task.status = "running";

    // Simulate execution (real dispatch would call actual modules)
    task.result = {
      module: task.module,
      action: task.action,
      simulated: true,
      timestamp: Date.now(),
    };
    task.status = "completed";
    completed++;
    outputs[taskId] = task.result;
  }

  const durationMs = performance.now() - start;
  const successRate = plan.tasks.length > 0 ? completed / plan.tasks.length : 0;

  const feedback = feedbackLoop(
    { planId: plan.id, completedTasks: completed, totalTasks: plan.tasks.length, successRate, outputs, durationMs },
    plan
  );

  return {
    planId: plan.id,
    completedTasks: completed,
    totalTasks: plan.tasks.length,
    successRate,
    outputs,
    feedback,
    durationMs,
  };
}

/**
 * Stage 6: Feedback loop — evaluate and learn
 */
export function feedbackLoop(result: Omit<ExecutionResult, "feedback">, plan: ActionPlan): FeedbackEntry {
  const adjustments: string[] = [];
  const learnedPatterns: string[] = [];

  // Quality assessment
  let qualityScore = result.successRate;

  // Check constraint satisfaction
  for (const c of plan.constraints) {
    if (c.type === "required") {
      qualityScore *= 0.95; // Slight penalty if we can't verify
      adjustments.push(`Verificar: ${c.rule} (${c.source})`);
    }
  }

  // Record in memory
  _actionMemory.recentActions.push({
    intent: plan.intent.primary,
    success: result.successRate > 0.7,
    timestamp: Date.now(),
  });

  // Keep memory bounded
  if (_actionMemory.recentActions.length > 100) {
    _actionMemory.recentActions = _actionMemory.recentActions.slice(-50);
  }

  // Update frequency patterns
  const patternKey = `${plan.intent.primary}`;
  _actionMemory.frequentPatterns.set(patternKey, (_actionMemory.frequentPatterns.get(patternKey) || 0) + 1);

  // Learn from failures
  const failedTasks = plan.tasks.filter(t => t.status === "failed" || t.status === "skipped");
  if (failedTasks.length > 0) {
    const reasons = failedTasks.map(t => `${t.action}: ${t.status}`);
    _actionMemory.failureReasons.set(plan.id, reasons);
    adjustments.push(`${failedTasks.length} tarefa(s) falharam — ajustar dependências`);
  }

  if (result.successRate === 1) {
    learnedPatterns.push(`Pipeline ${plan.intent.primary} executado com 100% sucesso`);
  }

  return {
    success: result.successRate > 0.7,
    qualityScore: Math.max(0, Math.min(1, qualityScore)),
    adjustments,
    learnedPatterns,
  };
}

/**
 * Full LAM pipeline: perceive → recognize → decompose → plan → execute → feedback
 */
export function runLAMPipeline(query: string, context?: string): ExecutionResult {
  const perception = perceiveInput(query, context);
  const intent = recognizeIntent(perception);
  const subtasks = decomposeTask(intent, perception);
  const plan = planActions(subtasks, intent);
  return executeAction(plan);
}

/**
 * Get action memory statistics
 */
export function getActionMemoryStats(): {
  totalActions: number;
  successRate: number;
  topPatterns: Array<{ pattern: string; count: number }>;
} {
  const total = _actionMemory.recentActions.length;
  const successes = _actionMemory.recentActions.filter(a => a.success).length;

  const topPatterns = Array.from(_actionMemory.frequentPatterns.entries())
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalActions: total,
    successRate: total > 0 ? successes / total : 0,
    topPatterns,
  };
}
