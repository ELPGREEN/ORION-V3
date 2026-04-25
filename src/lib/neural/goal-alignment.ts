/**
 * ─── Goal & Alignment Layer — Maestro Authority ───
 * Provides a central authority for system objectives, priority management,
 * and conflict resolution across cognitive modules.
 *
 * Inspired by:
 * - "Belief-Desire-Intention" (BDI) Software Model
 * - "The Society of Mind" (Minsky) — Goal Competition
 * - "The Alignment Problem" (Brian Christian)
 */

export interface Goal {
  id: string;
  description: string;
  priority: number; // 0.0 to 1.0
  type: "user" | "system" | "evolution";
  status: "active" | "completed" | "blocked" | "archived";
  createdAt: number;
  metadata?: Record<string, any>;
  constraints?: string[];
}

export interface GoalStack {
  activeGoals: Goal[];
  primaryGoalId: string | null;
  alignmentHistory: { timestamp: number; score: number; goalId: string }[];
}

// ─── State ───

let _goalStack: GoalStack = {
  activeGoals: [],
  primaryGoalId: null,
  alignmentHistory: [],
};

// ─── API ───

/**
 * Adds or updates a goal in the stack.
 */
export function setGoal(goal: Partial<Goal> & { description: string }): Goal {
  const newGoal: Goal = {
    id: goal.id || crypto.randomUUID(),
    description: goal.description,
    priority: goal.priority ?? 0.5,
    type: goal.type || "user",
    status: goal.status || "active",
    createdAt: Date.now(),
    metadata: goal.metadata,
    constraints: goal.constraints,
  };

  // Replace if exists, otherwise add
  const index = _goalStack.activeGoals.findIndex(g => g.id === newGoal.id);
  if (index >= 0) {
    _goalStack.activeGoals[index] = newGoal;
  } else {
    _goalStack.activeGoals.push(newGoal);
  }

  // Auto-promote primary goal based on priority
  _updatePrimaryGoal();
  return newGoal;
}

/**
 * Resolves which goal is the primary focus.
 */
function _updatePrimaryGoal(): void {
  const active = _goalStack.activeGoals.filter(g => g.status === "active");
  if (active.length === 0) {
    _goalStack.primaryGoalId = null;
    return;
  }
  // Sort by priority descending
  active.sort((a, b) => b.priority - a.priority);
  _goalStack.primaryGoalId = active[0].id;
}

/**
 * Gets the current primary goal.
 */
export function getPrimaryGoal(): Goal | null {
  if (!_goalStack.primaryGoalId) return null;
  return _goalStack.activeGoals.find(g => g.id === _goalStack.primaryGoalId) || null;
}

/**
 * Checks if a proposed intent or action aligns with the active goal stack.
 * Returns an alignment score (0-1) and optional reasoning.
 */
export function checkAlignment(intent: string, context: string): { score: number; reasoning: string } {
  const primary = getPrimaryGoal();
  if (!primary) return { score: 1.0, reasoning: "Nenhum objetivo ativo — livre exploração." };

  const score = _calculateSemanticOverlap(intent + " " + context, primary.description);

  let reasoning = "Alinhado com o objetivo principal.";
  if (score < 0.4) reasoning = `Desvio detectado: O foco parece estar fugindo de: "${primary.description}"`;

  _goalStack.alignmentHistory.push({ timestamp: Date.now(), score, goalId: primary.id });
  if (_goalStack.alignmentHistory.length > 50) _goalStack.alignmentHistory.shift();

  return { score, reasoning };
}

/**
 * Internal fuzzy overlap for alignment scoring.
 */
function _calculateSemanticOverlap(text: string, target: string): number {
  const t1 = text.toLowerCase();
  const t2 = target.toLowerCase();

  const getNgrams = (s: string, n: number) => {
    const grams = new Set<string>();
    for (let i = 0; i <= s.length - n; i++) grams.add(s.slice(i, i + n));
    return grams;
  };

  const g1 = getNgrams(t1, 3);
  const g2 = getNgrams(t2, 3);

  if (g1.size === 0 || g2.size === 0) return 0.5;

  let overlap = 0;
  for (const g of g2) { if (g1.has(g)) overlap++; }
  const jaccard = overlap / (g1.size + g2.size - overlap);

  return Math.min(1, jaccard * 4 + 0.2); // Boosted Jaccard
}

/**
 * Resolves conflicts between multiple high-priority goals.
 * "Winning" goal is returned.
 */
export function resolveConflict(goalIds: string[]): Goal | null {
  const candidates = _goalStack.activeGoals.filter(g => goalIds.includes(g.id));
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.priority - a.priority)[0];
}

export function getGoalStack(): GoalStack {
  return { ..._goalStack };
}

/**
 * Resets the goal stack. Primarily for testing or complete context shifts.
 */

// ─── Physical State & Embodied Safety ───

export interface PhysicalState {
  battery: number;           // 0-100
  obstacles: boolean;
  temperature: number;       // Celsius
  mobilityStatus: "ok" | "restricted" | "critical";
  lastCheck: number;
}

let _physicalState: PhysicalState = {
  battery: 100,
  obstacles: false,
  temperature: 25,
  mobilityStatus: "ok",
  lastCheck: Date.now(),
};

/**
 * Updates the system's embodied physical state.
 * If critical, overrides all goals to Safety Mode.
 */
export function updatePhysicalState(state: Partial<PhysicalState>): void {
  _physicalState = { ..._physicalState, ...state, lastCheck: Date.now() };

  if (_physicalState.mobilityStatus === "critical" || _physicalState.battery < 5) {
    console.log("[EmbodiedSafety] CRITICAL STATE DETECTED - Overriding goals");
    overrideAllGoals("SAFETY_MODE: Obstáculo crítico ou bateria insuficiente.", 1.0);
  } else if (_physicalState.battery < 20) {
    setGoal({
      id: "low_battery_warning",
      description: "Buscar carregamento (Bateria Baixa)",
      priority: 0.8,
      type: "system"
    });
  }
}

/**
 * Force-replaces all active goals with a single high-priority safety goal.
 */
export function overrideAllGoals(description: string, priority: number = 1.0): void {
  _goalStack.activeGoals.forEach(g => {
    if (g.status === "active") g.status = "blocked";
  });

  setGoal({
    id: "safety_override_" + Date.now(),
    description,
    priority,
    type: "system",
    status: "active"
  });
}

export function getPhysicalState(): PhysicalState {
  return { ..._physicalState };
}

export function clearGoals(): void {
  _goalStack = {
    activeGoals: [],
    primaryGoalId: null,
    alignmentHistory: [],
  };
}
