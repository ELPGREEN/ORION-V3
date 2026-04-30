/**
 * ─── Orion Distributed Tracing ───
 * Propagates trace IDs across all calls (Edge Functions, agents, pipeline).
 * OpenTelemetry-inspired spans with explainability support.
 * 
 * Features:
 * - Trace ID propagation across modules
 * - Span tree with parent-child relationships
 * - Debug mode: returns full pipeline trace
 * - Explainability: "why did you say X?" reconstruction
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export interface TraceSpan {
  spanId: string;
  parentId: string | null;
  operation: string;
  module: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  status: "ok" | "error" | "timeout";
  tags: Record<string, string>;
  logs: string[];
}

export interface Trace {
  traceId: string;
  rootOperation: string;
  spans: TraceSpan[];
  totalDurationMs: number;
  status: "ok" | "error" | "partial";
  userId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ─── Constants ───

const TRACE_CACHE_KEY = "orion_traces_cache";
const MAX_CACHED_TRACES = 30;
const MAX_SPANS_PER_TRACE = 50;

// ─── Active Trace Management ───

const activeTraces = new Map<string, Trace>();

export function startTrace(operation: string, userId?: string): Trace {
  const trace: Trace = {
    traceId: crypto.randomUUID(),
    rootOperation: operation,
    spans: [],
    totalDurationMs: 0,
    status: "ok",
    userId,
    timestamp: Date.now(),
  };

  activeTraces.set(trace.traceId, trace);
  return trace;
}

export function startSpan(
  traceId: string,
  operation: string,
  module: string,
  parentSpanId: string | null = null,
  tags: Record<string, string> = {}
): TraceSpan {
  const span: TraceSpan = {
    spanId: crypto.randomUUID(),
    parentId: parentSpanId,
    operation,
    module,
    startTime: Date.now(),
    endTime: 0,
    durationMs: 0,
    status: "ok",
    tags,
    logs: [],
  };

  const trace = activeTraces.get(traceId);
  if (trace && trace.spans.length < MAX_SPANS_PER_TRACE) {
    trace.spans.push(span);
  }

  return span;
}

export function endSpan(span: TraceSpan, status: "ok" | "error" | "timeout" = "ok"): void {
  span.endTime = Date.now();
  span.durationMs = span.endTime - span.startTime;
  span.status = status;
}

export function addSpanLog(span: TraceSpan, log: string): void {
  if (span.logs.length < 20) {
    span.logs.push(`[${new Date().toISOString()}] ${log}`);
  }
}

export function endTrace(traceId: string): Trace | null {
  const trace = activeTraces.get(traceId);
  if (!trace) return null;

  trace.totalDurationMs = Date.now() - trace.timestamp;
  trace.status = trace.spans.some(s => s.status === "error") ? "error" :
                 trace.spans.some(s => s.status === "timeout") ? "partial" : "ok";

  // Cache locally
  cacheTrace(trace);

  activeTraces.delete(traceId);
  return trace;
}

// ─── Local Cache ───

function getCachedTraces(): Trace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( TRACE_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function cacheTrace(trace: Trace): void {
  if (typeof window === "undefined") return;
  const cached = getCachedTraces();
  cached.unshift(trace);
  const trimmed = cached.slice(0, MAX_CACHED_TRACES);
  if (typeof window !== "undefined") localStorage.setItem(TRACE_CACHE_KEY, JSON.stringify(trimmed));
}

// ─── Persistence ───

export async function persistTrace(trace: Trace): Promise<void> {
  if (!trace.userId) return;

  try {
    await supabase.from("orion_traces").insert([{
      trace_id: trace.traceId,
      user_id: trace.userId,
      operation: trace.rootOperation,
      spans: JSON.parse(JSON.stringify(trace.spans)),
      total_duration_ms: trace.totalDurationMs,
      status: trace.status,
      metadata: trace.metadata ? JSON.parse(JSON.stringify(trace.metadata)) : {},
    }]);
  } catch (e) {
    console.warn("[OrionTracing] Persist failed:", e);
  }
}

// ─── Query ───

export function getRecentTraces(count = 10): Trace[] {
  return getCachedTraces().slice(0, count);
}

export function getTraceById(traceId: string): Trace | null {
  return activeTraces.get(traceId) || getCachedTraces().find(t => t.traceId === traceId) || null;
}

export async function searchTraces(
  userId: string,
  operation?: string,
  limit = 10
): Promise<Trace[]> {
  try {
    let query = supabase
      .from("orion_traces")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (operation) {
      query = query.ilike("operation", `%${operation}%`);
    }

    const { data } = await query;
    if (!data) return [];

    return data.map((row: Record<string, unknown>) => ({
      traceId: row.trace_id as string,
      rootOperation: row.operation as string,
      spans: (row.spans as TraceSpan[]) || [],
      totalDurationMs: (row.total_duration_ms as number) || 0,
      status: (row.status as "ok" | "error" | "partial") || "ok",
      userId: row.user_id as string,
      timestamp: new Date(row.created_at as string).getTime(),
      metadata: (row.metadata as Record<string, unknown>) || {},
    }));
  } catch (e) {
    console.warn("[OrionTracing] Search failed:", e);
    return [];
  }
}

// ─── Explainability ───

export function explainTrace(trace: Trace): string {
  const lines: string[] = [
    `🔍 Trace: ${trace.rootOperation}`,
    `   ID: ${trace.traceId.slice(0, 8)}...`,
    `   Duração: ${trace.totalDurationMs}ms | Status: ${trace.status}`,
    `   Spans: ${trace.spans.length}`,
    "",
  ];

  // Build span tree
  const rootSpans = trace.spans.filter(s => !s.parentId);
  const childMap = new Map<string, TraceSpan[]>();
  for (const s of trace.spans) {
    if (s.parentId) {
      const children = childMap.get(s.parentId) || [];
      children.push(s);
      childMap.set(s.parentId, children);
    }
  }

  function printSpan(span: TraceSpan, depth: number): void {
    const indent = "  ".repeat(depth + 1);
    const statusIcon = span.status === "ok" ? "✅" : span.status === "error" ? "❌" : "⏰";
    lines.push(`${indent}${statusIcon} [${span.module}] ${span.operation} (${span.durationMs}ms)`);

    if (span.tags && Object.keys(span.tags).length > 0) {
      lines.push(`${indent}   Tags: ${Object.entries(span.tags).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    }

    const children = childMap.get(span.spanId) || [];
    for (const child of children) {
      printSpan(child, depth + 1);
    }
  }

  for (const root of rootSpans) {
    printSpan(root, 0);
  }

  return lines.join("\n");
}

// ─── Build Context for AI ───

export function buildTracingContext(trace: Trace): string {
  if (trace.spans.length === 0) return "";

  const summary = trace.spans.map(s =>
    `[${s.module}] ${s.operation}: ${s.status} (${s.durationMs}ms)`
  ).join(" → ");

  return `[TRACE ${trace.traceId.slice(0, 8)}] ${trace.rootOperation}: ${summary}`;
}

// ─── Utility: Quick trace wrapper ───

export async function withTrace<T>(
  operation: string,
  module: string,
  userId: string | undefined,
  fn: (traceId: string, spanId: string) => Promise<T>
): Promise<{ result: T; trace: Trace }> {
  const trace = startTrace(operation, userId);
  const span = startSpan(trace.traceId, operation, module);

  try {
    const result = await fn(trace.traceId, span.spanId);
    endSpan(span, "ok");
    const finalTrace = endTrace(trace.traceId)!;

    // Fire-and-forget persist
    if (userId) persistTrace(finalTrace).catch(() => {});

    return { result, trace: finalTrace };
  } catch (e) {
    addSpanLog(span, `Error: ${e instanceof Error ? e.message : String(e)}`);
    endSpan(span, "error");
    const finalTrace = endTrace(trace.traceId)!;
    if (userId) persistTrace(finalTrace).catch(() => {});
    throw e;
  }
}
