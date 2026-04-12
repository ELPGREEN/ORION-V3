/**
 * ─── Orion Task Orchestrator ───
 * Priority queue with Shortest-Job-First + contextual urgency.
 * Checkpointing, rollback cognitivo, and dynamic prioritization.
 * 
 * Integrates with:
 * - multi-agent.ts (agent routing)
 * - orion-working-memory.ts (cognitive load)
 * - theory-of-mind.ts (emotional urgency)
 */

// ─── Types ───

export type TaskStatus = "queued" | "running" | "completed" | "failed" | "rolled_back";
export type TaskPriority = "critical" | "high" | "normal" | "low" | "background";

export interface OrionTask {
  id: string;
  type: string;
  description: string;
  priority: TaskPriority;
  urgencyScore: number; // 0-1, dynamic
  estimatedDurationMs: number;
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: unknown;
  error?: string;
  retryCount: number;
  maxRetries: number;
  checkpointData?: unknown;
  parentTaskId?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskCheckpoint {
  taskId: string;
  timestamp: number;
  state: unknown;
  step: number;
}

export interface OrchestratorStats {
  totalQueued: number;
  totalRunning: number;
  totalCompleted: number;
  totalFailed: number;
  avgWaitTimeMs: number;
  avgExecutionTimeMs: number;
  throughput: number; // tasks/minute
}

// ─── Constants ───

const ORCHESTRATOR_KEY = "orion_task_orchestrator";
const CHECKPOINT_KEY = "orion_task_checkpoints";
const MAX_QUEUE_SIZE = 50;
const MAX_CONCURRENT = 3;
const MAX_CHECKPOINTS = 20;

const PRIORITY_SCORES: Record<TaskPriority, number> = {
  critical: 1.0,
  high: 0.75,
  normal: 0.5,
  low: 0.25,
  background: 0.1,
};

// ─── State ───

interface OrchestratorState {
  queue: OrionTask[];
  running: OrionTask[];
  completed: OrionTask[];
  failed: OrionTask[];
}

function loadState(): OrchestratorState {
  try {
    const raw = localStorage.getItem(ORCHESTRATOR_KEY);
    return raw ? JSON.parse(raw) : { queue: [], running: [], completed: [], failed: [] };
  } catch {
    return { queue: [], running: [], completed: [], failed: [] };
  }
}

function saveState(state: OrchestratorState): void {
  // Trim completed/failed
  state.completed = state.completed.slice(0, 50);
  state.failed = state.failed.slice(0, 20);
  localStorage.setItem(ORCHESTRATOR_KEY, JSON.stringify(state));
}

// ─── Checkpointing ───

function getCheckpoints(): TaskCheckpoint[] {
  try {
    const raw = localStorage.getItem(CHECKPOINT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCheckpoint(checkpoint: TaskCheckpoint): void {
  const all = getCheckpoints();
  // Replace existing checkpoint for same task
  const idx = all.findIndex(c => c.taskId === checkpoint.taskId);
  if (idx >= 0) all[idx] = checkpoint;
  else all.push(checkpoint);
  
  const trimmed = all.slice(-MAX_CHECKPOINTS);
  localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(trimmed));
}

export function getTaskCheckpoint(taskId: string): TaskCheckpoint | null {
  return getCheckpoints().find(c => c.taskId === taskId) || null;
}

// ─── Priority Calculation ───

function calculateEffectivePriority(task: OrionTask): number {
  const basePriority = PRIORITY_SCORES[task.priority];
  const waitTime = (Date.now() - task.createdAt) / 60000; // minutes
  const waitBoost = Math.min(0.3, waitTime * 0.02); // +0.02 per minute, max +0.3
  const sjfBonus = 1 / (1 + task.estimatedDurationMs / 1000); // Shorter jobs get higher priority
  
  return basePriority * 0.5 + task.urgencyScore * 0.2 + sjfBonus * 0.15 + waitBoost * 0.15;
}

// ─── Queue Management ───

export function enqueueTask(task: Omit<OrionTask, "id" | "status" | "createdAt" | "retryCount">): OrionTask {
  const state = loadState();

  const newTask: OrionTask = {
    ...task,
    id: crypto.randomUUID(),
    status: "queued",
    createdAt: Date.now(),
    retryCount: 0,
    maxRetries: task.maxRetries ?? 2,
  };

  state.queue.push(newTask);

  // Sort queue by effective priority (descending)
  state.queue.sort((a, b) => calculateEffectivePriority(b) - calculateEffectivePriority(a));

  // Trim overflow
  if (state.queue.length > MAX_QUEUE_SIZE) {
    state.queue = state.queue.slice(0, MAX_QUEUE_SIZE);
  }

  saveState(state);
  console.debug(`[TaskOrchestrator] Enqueued: ${newTask.type} (priority: ${newTask.priority}, urgency: ${newTask.urgencyScore})`);

  return newTask;
}

export function dequeueNext(): OrionTask | null {
  const state = loadState();
  
  if (state.running.length >= MAX_CONCURRENT || state.queue.length === 0) return null;

  // Re-sort before dequeuing
  state.queue.sort((a, b) => calculateEffectivePriority(b) - calculateEffectivePriority(a));

  const task = state.queue.shift()!;
  task.status = "running";
  task.startedAt = Date.now();
  state.running.push(task);

  saveState(state);
  return task;
}

export function completeTask(taskId: string, result: unknown): void {
  const state = loadState();
  const idx = state.running.findIndex(t => t.id === taskId);
  if (idx < 0) return;

  const task = state.running.splice(idx, 1)[0];
  task.status = "completed";
  task.completedAt = Date.now();
  task.result = result;
  state.completed.unshift(task);

  saveState(state);

  // Save completion checkpoint
  saveCheckpoint({
    taskId,
    timestamp: Date.now(),
    state: result,
    step: -1, // Final
  });
}

export function failTask(taskId: string, error: string): boolean {
  const state = loadState();
  const idx = state.running.findIndex(t => t.id === taskId);
  if (idx < 0) return false;

  const task = state.running[idx];
  task.retryCount++;

  if (task.retryCount < task.maxRetries) {
    // Rollback: re-queue with higher urgency
    task.status = "queued";
    task.urgencyScore = Math.min(1.0, task.urgencyScore + 0.2);
    task.error = error;
    state.running.splice(idx, 1);
    state.queue.unshift(task);
    console.debug(`[TaskOrchestrator] Rollback: ${task.type} → re-queued (attempt ${task.retryCount}/${task.maxRetries})`);
    saveState(state);
    return true; // Will retry
  }

  // Max retries exhausted
  task.status = "failed";
  task.completedAt = Date.now();
  task.error = error;
  state.running.splice(idx, 1);
  state.failed.unshift(task);

  saveState(state);
  return false; // No more retries
}

// ─── Task Checkpointing (mid-execution) ───

export function checkpointTask(taskId: string, stepState: unknown, step: number): void {
  saveCheckpoint({
    taskId,
    timestamp: Date.now(),
    state: stepState,
    step,
  });
}

// ─── Cognitive Rollback ───

export function rollbackToCheckpoint(taskId: string): TaskCheckpoint | null {
  const checkpoint = getTaskCheckpoint(taskId);
  if (!checkpoint) return null;

  console.debug(`[TaskOrchestrator] Rolling back task ${taskId} to step ${checkpoint.step}`);
  return checkpoint;
}

// ─── Stats ───

export function getOrchestratorStats(): OrchestratorStats {
  const state = loadState();
  const completed = state.completed;

  const waitTimes = completed
    .filter(t => t.startedAt)
    .map(t => (t.startedAt! - t.createdAt));
  const execTimes = completed
    .filter(t => t.completedAt && t.startedAt)
    .map(t => (t.completedAt! - t.startedAt!));

  const now = Date.now();
  const recentCompleted = completed.filter(t => t.completedAt && (now - t.completedAt) < 60000);

  return {
    totalQueued: state.queue.length,
    totalRunning: state.running.length,
    totalCompleted: completed.length,
    totalFailed: state.failed.length,
    avgWaitTimeMs: waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0,
    avgExecutionTimeMs: execTimes.length > 0 ? execTimes.reduce((a, b) => a + b, 0) / execTimes.length : 0,
    throughput: recentCompleted.length,
  };
}

export function getQueueSnapshot(): OrionTask[] {
  return loadState().queue;
}

export function getRunningTasks(): OrionTask[] {
  return loadState().running;
}

// ─── Cleanup ───

export function clearOrchestrator(): void {
  localStorage.removeItem(ORCHESTRATOR_KEY);
  localStorage.removeItem(CHECKPOINT_KEY);
}
