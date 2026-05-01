/**
 * ─── Orion Journal — Structured Thought Logs ───
 * Records reasoning chains in structured JSON for auditability,
 * debugging, and continuous improvement.
 * 
 * Structure: { traceId, steps: [{ module, input, output, duration, confidence }], conclusion }
 * Persists via `neural_learning_data` with interaction_type "thought_log"
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export interface ThoughtStep {
  module: string;
  operation: string;
  input: string;
  output: string;
  durationMs: number;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface ThoughtEntry {
  traceId: string;
  query: string;
  steps: ThoughtStep[];
  conclusion: string;
  reasoningChain: string;
  totalDurationMs: number;
  provider: string;
  success: boolean;
  timestamp: number;
}

// ─── State ───

const JOURNAL_KEY = "orion_journal";
const MAX_LOCAL_ENTRIES = 100;
let debugMode = false;

// ─── Debug Mode ───

export function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
  console.log(`[OrionJournal] Debug mode ${enabled ? "ENABLED" : "DISABLED"}`);
}

export function isDebugMode(): boolean {
  return debugMode;
}

// ─── Local Storage ───

function getLocalJournal(): ThoughtEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalJournal(entries: ThoughtEntry[]): void {
  if (typeof window === "undefined") return;
  const trimmed = entries.slice(0, MAX_LOCAL_ENTRIES);
  if (typeof window !== "undefined") localStorage.setItem(JOURNAL_KEY, JSON.stringify(trimmed));
}

// ─── Recording ───

export function createThoughtEntry(query: string, provider: string): ThoughtEntry {
  return {
    traceId: crypto.randomUUID(),
    query,
    steps: [],
    conclusion: "",
    reasoningChain: "",
    totalDurationMs: 0,
    provider,
    success: false,
    timestamp: Date.now(),
  };
}

export function addThoughtStep(
  entry: ThoughtEntry,
  step: Omit<ThoughtStep, "durationMs"> & { startTime: number }
): ThoughtEntry {
  const durationMs = Date.now() - step.startTime;
  entry.steps.push({
    module: step.module,
    operation: step.operation,
    input: step.input.slice(0, 500),
    output: step.output.slice(0, 500),
    durationMs,
    confidence: step.confidence,
    metadata: step.metadata,
  });
  entry.totalDurationMs = entry.steps.reduce((sum, s) => sum + s.durationMs, 0);
  return entry;
}

export function finalizeThoughtEntry(
  entry: ThoughtEntry,
  conclusion: string,
  success: boolean
): ThoughtEntry {
  entry.conclusion = conclusion.slice(0, 1000);
  entry.success = success;
  entry.reasoningChain = entry.steps
    .map((s, i) => `${i + 1}. [${s.module}] ${s.operation}: ${s.output.slice(0, 100)}`)
    .join(" → ");

  // Save locally
  const journal = getLocalJournal();
  journal.unshift(entry);
  saveLocalJournal(journal);

  if (debugMode) {
    console.group(`[OrionJournal] Thought Log: ${entry.traceId}`);
    console.log("Query:", entry.query);
    entry.steps.forEach((s, i) => {
      console.log(`  Step ${i + 1}: [${s.module}] ${s.operation} (${s.durationMs}ms, conf: ${s.confidence})`);
    });
    console.log("Conclusion:", entry.conclusion);
    console.log("Total Duration:", entry.totalDurationMs, "ms");
    console.groupEnd();
  }

  return entry;
}

// ─── Persistence ───

export async function persistThoughtLog(
  entry: ThoughtEntry,
  userId: string
): Promise<void> {
  try {
    await supabase.from("neural_learning_data").insert({
      user_id: userId,
      input_text: `[thought_log] ${entry.query}`,
      output_text: entry.conclusion,
      interaction_type: "thought_log",
      quality_score: entry.success ? 0.8 : 0.3,
      learned: entry.success,
      metadata: {
        trace_id: entry.traceId,
        steps_count: entry.steps.length,
        total_duration_ms: entry.totalDurationMs,
        provider: entry.provider,
        reasoning_chain: entry.reasoningChain,
        steps: entry.steps.map(s => ({
          module: s.module,
          operation: s.operation,
          duration_ms: s.durationMs,
          confidence: s.confidence,
        })),
      },
    });
  } catch (e) {
    console.warn("[OrionJournal] Failed to persist:", e);
  }
}

// ─── Query ───

export function getRecentThoughts(count = 10): ThoughtEntry[] {
  return getLocalJournal().slice(0, count);
}

export function getThoughtByTraceId(traceId: string): ThoughtEntry | null {
  return getLocalJournal().find(e => e.traceId === traceId) || null;
}

export async function searchThoughtLogs(
  userId: string,
  query: string,
  limit = 10
): Promise<ThoughtEntry[]> {
  try {
    const { data } = await supabase
      .from("neural_learning_data")
      .select("input_text, output_text, metadata, created_at")
      .eq("user_id", userId)
      .eq("interaction_type", "thought_log")
      .ilike("input_text", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!data) return [];

    return data.map(row => {
      const meta = row.metadata as Record<string, unknown> | null;
      return {
        traceId: (meta?.trace_id as string) || "",
        query: (row.input_text || "").replace("[thought_log] ", ""),
        steps: ((meta?.steps as ThoughtStep[]) || []),
        conclusion: row.output_text || "",
        reasoningChain: (meta?.reasoning_chain as string) || "",
        totalDurationMs: (meta?.total_duration_ms as number) || 0,
        provider: (meta?.provider as string) || "",
        success: !!row.output_text,
        timestamp: new Date(row.created_at).getTime(),
      };
    });
  } catch (e) {
    console.warn("[OrionJournal] Search failed:", e);
    return [];
  }
}

// ─── Debug Output Builder ───

export function buildDebugOutput(entry: ThoughtEntry): string {
  if (!debugMode) return "";

  const lines = [
    `\n──── ORION DEBUG TRACE [${entry.traceId.slice(0, 8)}] ────`,
    `Query: ${entry.query}`,
    `Provider: ${entry.provider}`,
    `Steps: ${entry.steps.length}`,
    "",
  ];

  entry.steps.forEach((s, i) => {
    lines.push(`  ${i + 1}. [${s.module}] ${s.operation}`);
    lines.push(`     Input: ${s.input.slice(0, 120)}`);
    lines.push(`     Output: ${s.output.slice(0, 120)}`);
    lines.push(`     Duration: ${s.durationMs}ms | Confidence: ${(s.confidence * 100).toFixed(0)}%`);
  });

  lines.push("");
  lines.push(`Conclusion: ${entry.conclusion.slice(0, 200)}`);
  lines.push(`Total: ${entry.totalDurationMs}ms | Success: ${entry.success}`);
  lines.push(`────────────────────────────────────`);

  return lines.join("\n");
}
