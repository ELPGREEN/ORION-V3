/**
 * ─── Orion System Health Monitor & Graceful Degradation ───
 * Periodic health checks for all providers and modules.
 * Graceful degradation: disables non-essential modules on failure.
 * 
 * Integrates with:
 * - provider-health.ts (provider-level health)
 * - task-orchestrator.ts (queue health)
 */

import { computeProviderHealth, type ProviderHealth, type ProviderStatus } from "./provider-health";
import { getOrchestratorStats, type OrchestratorStats } from "./task-orchestrator";

// ─── Types ───

export type ModuleStatus = "active" | "degraded" | "disabled" | "error";
export type SystemMode = "full" | "degraded" | "minimal" | "emergency";

export interface ModuleHealth {
  id: string;
  name: string;
  category: "core" | "enhancement" | "optional";
  status: ModuleStatus;
  lastCheckTime: number;
  errorCount: number;
  avgLatencyMs: number;
  essential: boolean; // If true, cannot be disabled in degraded mode
}

export interface SystemHealthSnapshot {
  timestamp: number;
  mode: SystemMode;
  modules: ModuleHealth[];
  providers: ProviderHealth[];
  orchestrator: OrchestratorStats;
  memoryUsage: { local: number; session: number };
  overallScore: number; // 0-100
  alerts: string[];
}

// ─── Constants ───

const HEALTH_KEY = "orion_system_health";
const CHECK_INTERVAL_MS = 30_000; // 30s
const ERROR_THRESHOLD = 5;
const DEGRADED_THRESHOLD = 60; // score below this → degraded mode
const MINIMAL_THRESHOLD = 30; // score below this → minimal mode

// ─── Module Registry ───

const MODULES: ModuleHealth[] = [
  { id: "nlp_core", name: "NLP Core (LLM)", category: "core", status: "active", lastCheckTime: 0, errorCount: 0, avgLatencyMs: 0, essential: true },
  { id: "memory_system", name: "Memory System", category: "core", status: "active", lastCheckTime: 0, errorCount: 0, avgLatencyMs: 0, essential: true },
  { id: "episodic_memory", name: "Episodic Memory", category: "enhancement", status: "active", lastCheckTime: 0, errorCount: 0, avgLatencyMs: 0, essential: false },
  { id: "vision", name: "Computer Vision (VLM)", category: "enhancement", status: "active", lastCheckTime: 0, errorCount: 0, avgLatencyMs: 0, essential: false },
  { id: "voice_io", name: "Voice I/O (STT/TTS)", category: "enhancement", status: "active", lastCheckTime: 0, errorCount: 0, avgLatencyMs: 0, essential: false },
  { id: "knowledge_base", name: "Knowledge Base (RAG)", category: "core", status: "active", lastCheckTime: 0, errorCount: 0, avgLatencyMs: 0, essential: true },
  { id: "task_orchestrator", name: "Task Orchestrator", category: "core", status: "active", lastCheckTime: 0, errorCount: 0, avgLatencyMs: 0, essential: true },
  { id: "security", name: "Security Layer", category: "core", status: "active", lastCheckTime: 0, errorCount: 0, avgLatencyMs: 0, essential: true },
  { id: "webhook_gateway", name: "Webhook Gateway", category: "optional", status: "active", lastCheckTime: 0, errorCount: 0, avgLatencyMs: 0, essential: false },
  { id: "tracing", name: "Distributed Tracing", category: "optional", status: "active", lastCheckTime: 0, errorCount: 0, avgLatencyMs: 0, essential: false },
  { id: "reward_loop", name: "Reward Feedback Loop", category: "enhancement", status: "active", lastCheckTime: 0, errorCount: 0, avgLatencyMs: 0, essential: false },
  { id: "journal", name: "Orion Journal (Thought Logs)", category: "optional", status: "active", lastCheckTime: 0, errorCount: 0, avgLatencyMs: 0, essential: false },
];

// ─── State ───

let currentMode: SystemMode = "full";
let modules = [...MODULES];
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

// ─── Health Check Functions ───

function checkLocalStorageHealth(): { local: number; session: number } {
  if (typeof window === "undefined") return { local: 0, session: 0 };
  try {
    let localSize = 0;
    if (typeof localStorage !== "undefined") for (let i = 0; i < localStorage.length; i++) {
      const key = typeof localStorage !== "undefined" ? localStorage.key(i) : null;
      if (key) localSize += ((typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( key) || "").length;
    }
    const sessionSize = (sessionStorage.length || 0) * 100; // rough estimate
    return { local: localSize, session: sessionSize };
  } catch {
    return { local: 0, session: 0 };
  }
}

function calculateOverallScore(mods: ModuleHealth[]): number {
  let score = 100;
  for (const m of mods) {
    const weight = m.essential ? 15 : 5;
    if (m.status === "error") score -= weight;
    else if (m.status === "degraded") score -= weight * 0.5;
    else if (m.status === "disabled") score -= weight * 0.3;
  }
  return Math.max(0, Math.min(100, score));
}

function determineMode(score: number): SystemMode {
  if (score >= DEGRADED_THRESHOLD) return "full";
  if (score >= MINIMAL_THRESHOLD) return "degraded";
  if (score > 0) return "minimal";
  return "emergency";
}

// ─── Module Status Reporting ───

export function reportModuleError(moduleId: string, error?: string): void {
  const mod = modules.find(m => m.id === moduleId);
  if (!mod) return;

  mod.errorCount++;
  mod.lastCheckTime = Date.now();

  if (mod.errorCount >= ERROR_THRESHOLD) {
    if (mod.essential) {
      mod.status = "degraded";
    } else {
      mod.status = "disabled";
      console.warn(`[SystemHealth] Module ${mod.name} DISABLED after ${mod.errorCount} errors: ${error}`);
    }
  } else if (mod.errorCount >= 2) {
    mod.status = "degraded";
  }

  // Re-evaluate system mode
  const score = calculateOverallScore(modules);
  currentMode = determineMode(score);
}

export function reportModuleSuccess(moduleId: string, latencyMs: number): void {
  const mod = modules.find(m => m.id === moduleId);
  if (!mod) return;

  mod.lastCheckTime = Date.now();
  mod.avgLatencyMs = mod.avgLatencyMs === 0 ? latencyMs : mod.avgLatencyMs * 0.8 + latencyMs * 0.2;

  // Recover from errors
  if (mod.errorCount > 0) {
    mod.errorCount = Math.max(0, mod.errorCount - 1);
    if (mod.errorCount === 0) {
      mod.status = "active";
    }
  }
}

// ─── Snapshot ───

export function getHealthSnapshot(): SystemHealthSnapshot {
  const memUsage = checkLocalStorageHealth();
  const score = calculateOverallScore(modules);
  currentMode = determineMode(score);

  const alerts: string[] = [];

  // ─── Scheduled Maintenance Alerts ───
  const MAINTENANCE_WINDOWS: Array<{ provider: string; start: string; end: string; message: string }> = [
    {
      provider: "Mistral",
      start: "2025-04-16T14:00:00Z", // 7:00 AM PDT
      end: "2025-04-16T16:00:00Z",   // 9:00 AM PDT
      message: "🔧 Mistral: manutenção programada (console dev). Alguns recursos temporariamente indisponíveis.",
    },
  ];

  const now = Date.now();
  for (const mw of MAINTENANCE_WINDOWS) {
    const start = new Date(mw.start).getTime();
    const end = new Date(mw.end).getTime();
    if (now >= start && now <= end) {
      alerts.push(mw.message);
    } else if (now < start && start - now < 3_600_000) {
      // Alert 1h before
      alerts.push(`⏰ ${mw.provider}: manutenção em breve (${new Date(start).toLocaleTimeString()})`);
    }
  }

  // ─── Rate Limit Advisories ───
  alerts.push("ℹ️ Mistral: rate limits temporariamente reduzidos para GLM4.7/GPT-OSS no free tier");

  for (const m of modules) {
    if (m.status === "error") alerts.push(`⛔ ${m.name}: em erro (${m.errorCount} falhas)`);
    if (m.status === "disabled") alerts.push(`🔇 ${m.name}: desativado`);
    if (m.status === "degraded") alerts.push(`⚠️ ${m.name}: degradado`);
    if (m.avgLatencyMs > 10000) alerts.push(`🐢 ${m.name}: latência alta (${m.avgLatencyMs.toFixed(0)}ms)`);
  }

  if (memUsage.local > 4_000_000) alerts.push("💾 localStorage acima de 4MB — considere limpeza");
  if (currentMode !== "full") alerts.push(`🔧 Modo do sistema: ${currentMode.toUpperCase()}`);

  let orchestratorStats: OrchestratorStats;
  try {
    orchestratorStats = getOrchestratorStats();
  } catch {
    orchestratorStats = { totalQueued: 0, totalRunning: 0, totalCompleted: 0, totalFailed: 0, avgWaitTimeMs: 0, avgExecutionTimeMs: 0, throughput: 0 };
  }

  return {
    timestamp: Date.now(),
    mode: currentMode,
    modules: [...modules],
    providers: [],
    orchestrator: orchestratorStats,
    memoryUsage: memUsage,
    overallScore: score,
    alerts,
  };
}

// ─── Graceful Degradation ───

export function isModuleAvailable(moduleId: string): boolean {
  const mod = modules.find(m => m.id === moduleId);
  if (!mod) return false;

  // In minimal mode, only essential modules
  if (currentMode === "minimal" || currentMode === "emergency") {
    return mod.essential && mod.status !== "error";
  }

  return mod.status === "active" || mod.status === "degraded";
}

export function getSystemMode(): SystemMode {
  return currentMode;
}

export function getActiveModules(): ModuleHealth[] {
  return modules.filter(m => m.status === "active" || m.status === "degraded");
}

export function getDisabledModules(): ModuleHealth[] {
  return modules.filter(m => m.status === "disabled" || m.status === "error");
}

// ─── Periodic Health Check ───

export function startHealthChecks(): void {
  if (healthCheckInterval) return;

  healthCheckInterval = setInterval(() => {
    const snapshot = getHealthSnapshot();
    if (snapshot.alerts.length > 0) {
      console.debug(`[SystemHealth] Mode: ${snapshot.mode} | Score: ${snapshot.overallScore} | Alerts: ${snapshot.alerts.length}`);
    }

    // Persist snapshot
    try {
      if (typeof window !== "undefined") localStorage.setItem(HEALTH_KEY, JSON.stringify(snapshot));
    } catch { /* storage full */ }
  }, CHECK_INTERVAL_MS);

  console.log("[SystemHealth] Health monitoring started (30s interval)");
}

export function stopHealthChecks(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

// ─── Manual Recovery ───

export function resetModule(moduleId: string): void {
  const mod = modules.find(m => m.id === moduleId);
  if (!mod) return;

  mod.status = "active";
  mod.errorCount = 0;
  mod.avgLatencyMs = 0;
  mod.lastCheckTime = Date.now();

  const score = calculateOverallScore(modules);
  currentMode = determineMode(score);

  console.log(`[SystemHealth] Module ${mod.name} manually reset to active`);
}

export function forceMode(mode: SystemMode): void {
  currentMode = mode;
  console.log(`[SystemHealth] System mode forced to: ${mode}`);
}

// ─── Build Health Context for AI ───

export function buildHealthContext(): string {
  const snapshot = getHealthSnapshot();
  if (snapshot.mode === "full" && snapshot.alerts.length === 0) return "";

  const parts: string[] = [`[SAÚDE DO SISTEMA] Modo: ${snapshot.mode.toUpperCase()} | Score: ${snapshot.overallScore}/100`];

  if (snapshot.alerts.length > 0) {
    parts.push(`Alertas: ${snapshot.alerts.join("; ")}`);
  }

  const disabled = getDisabledModules();
  if (disabled.length > 0) {
    parts.push(`Módulos desativados: ${disabled.map(m => m.name).join(", ")}`);
  }

  return parts.join("\n");
}
