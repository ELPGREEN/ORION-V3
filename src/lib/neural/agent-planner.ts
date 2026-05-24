/**
 * ─── v21.2: Agent Planner (DLPFC-Inspired Task Decomposition) ───
 * Cortex pre-frontal dorsolateral analogy.
 * Decomposes complex legal tasks into DAG-structured sub-tasks.
 * 
 * Ref: Minsky (1986) Society of Mind, Sutton et al. (1999) Options Framework
 */

export type ComplexityLevel = "simple" | "moderate" | "complex" | "critical";

export interface SubTask {
  id: string;
  description: string;
  assignedRole: string;
  dependsOn: string[];
  priority: number;
  requiresApproval: boolean;
  status: "pending" | "running" | "done" | "failed";
  result?: unknown;
}

export interface DAGPlan {
  id: string;
  query: string;
  complexity: ComplexityLevel;
  subTasks: SubTask[];
  executionLayers: string[][];
  criticalPath: string[];
  checkpoints: Array<{ afterSubTask: string; reason: string }>;
  estimatedDuration: number;
}

// BOLT V2.0: Consolidate patterns into single-pass RegExps to avoid O(N) loops
const COMPLEX_REGEX = /(?:habeas corpus|mandado de segurança|ação direta|recurso extraordinário|recurso especial)/gi;
const MODERATE_REGEX = /(?:petição inicial|recurso|parecer|contestação|apelação)/gi;
const MULTI_STEP_REGEX = /(?:e depois|em seguida|primeiro|segundo|além disso)/gi;

export function classifyComplexity(query: string): ComplexityLevel {
  let score = 0;

  COMPLEX_REGEX.lastIndex = 0;
  while (COMPLEX_REGEX.exec(query) !== null) score += 2;

  MODERATE_REGEX.lastIndex = 0;
  while (MODERATE_REGEX.exec(query) !== null) score += 1;

  MULTI_STEP_REGEX.lastIndex = 0;
  while (MULTI_STEP_REGEX.exec(query) !== null) score += 1.5;

  if (score >= 5) return "critical";
  if (score >= 3) return "complex";
  if (score >= 2) return "moderate";
  return "simple";
}

interface DecompositionTemplate {
  pattern: RegExp;
  roles: string[];
  dependencies: Array<[number, number]>;
}

const TEMPLATES: DecompositionTemplate[] = [
  {
    pattern: /peti[çc][aã]o\s+inicial/i,
    roles: ["pesquisa", "pesquisa", "leitura", "construcao", "critico", "refinador"],
    dependencies: [[2, 0], [2, 1], [3, 2], [4, 3], [5, 4]],
  },
  {
    pattern: /recurso\s+(especial|extraordin[áa]rio)/i,
    roles: ["pesquisa", "pesquisa", "leitura", "construcao", "critico", "refinador"],
    dependencies: [[2, 0], [2, 1], [3, 2], [4, 3], [5, 4]],
  },
  {
    pattern: /an[áa]lis(e|ar)\s+documento/i,
    roles: ["leitura", "multimodal", "pesquisa", "construcao", "critico"],
    dependencies: [[1, 0], [2, 0], [3, 1], [3, 2], [4, 3]],
  },
  {
    pattern: /relat[óo]rio|parecer/i,
    roles: ["pesquisa", "leitura", "construcao", "critico", "refinador"],
    dependencies: [[2, 0], [2, 1], [3, 2], [4, 3]],
  },
];

const GENERIC_TEMPLATE: DecompositionTemplate = {
  pattern: /.*/,
  roles: ["pesquisa", "leitura", "construcao", "critico"],
  dependencies: [[2, 0], [2, 1], [3, 2]],
};

function findTemplate(query: string): DecompositionTemplate {
  return TEMPLATES.find(t => t.pattern.test(query)) || GENERIC_TEMPLATE;
}

export function decomposePlan(query: string): DAGPlan {
  const complexity = classifyComplexity(query);
  const template = findTemplate(query);

  const subTasks: SubTask[] = template.roles.map((role, i) => ({
    id: `subtask-${i}`,
    description: `${role} step for: ${query.slice(0, 80)}`,
    assignedRole: role,
    dependsOn: template.dependencies
      .filter(([target]) => target === i)
      .map(([, dep]) => `subtask-${dep}`),
    priority: 0.5 + (complexity === "critical" ? 0.3 : 0),
    requiresApproval: complexity === "critical" && role === "construcao",
    status: "pending",
  }));

  const executionLayers = planDAGExecution(subTasks);
  const criticalPath = computeCriticalPath(subTasks);

  const checkpoints: Array<{ afterSubTask: string; reason: string }> = [];
  if (complexity === "critical") {
    const leituraTask = subTasks.find(t => t.assignedRole === "leitura");
    if (leituraTask) {
      checkpoints.push({ afterSubTask: leituraTask.id, reason: "Aprovação humana necessária" });
    }
  }

  return {
    id: `plan-${Date.now()}`,
    query,
    complexity,
    subTasks,
    executionLayers,
    criticalPath,
    checkpoints,
    estimatedDuration: subTasks.length * 2000,
  };
}

function planDAGExecution(subTasks: SubTask[]): string[][] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const t of subTasks) {
    inDegree.set(t.id, t.dependsOn.length);
    for (const dep of t.dependsOn) {
      if (!adj.has(dep)) adj.set(dep, []);
      adj.get(dep)!.push(t.id);
    }
  }

  const layers: string[][] = [];
  let queue = subTasks.filter(t => (inDegree.get(t.id) || 0) === 0).map(t => t.id);

  while (queue.length > 0) {
    layers.push([...queue]);
    const next: string[] = [];
    for (const node of queue) {
      for (const neighbor of adj.get(node) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) next.push(neighbor);
      }
    }
    queue = next;
  }

  return layers;
}

function computeCriticalPath(subTasks: SubTask[]): string[] {
  const taskMap = new Map(subTasks.map(t => [t.id, t]));
  const memo = new Map<string, string[]>();

  function longestPath(taskId: string): string[] {
    if (memo.has(taskId)) return memo.get(taskId)!;
    const task = taskMap.get(taskId);
    if (!task || task.dependsOn.length === 0) {
      memo.set(taskId, [taskId]);
      return [taskId];
    }
    let longest: string[] = [];
    for (const dep of task.dependsOn) {
      const path = longestPath(dep);
      if (path.length > longest.length) longest = path;
    }
    const result = [...longest, taskId];
    memo.set(taskId, result);
    return result;
  }

  let criticalPath: string[] = [];
  for (const t of subTasks) {
    const path = longestPath(t.id);
    if (path.length > criticalPath.length) criticalPath = path;
  }
  return criticalPath;
}
