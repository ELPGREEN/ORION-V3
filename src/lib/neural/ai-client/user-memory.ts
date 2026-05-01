/**
 * User Memory — getUserMemory, addUserMemory, fetchDashboardContext
 * Extracted from orion-ai-client.ts (lines 494-540)
 */

import { supabase } from "@/integrations/supabase/client";
import { wrapSupabase } from "@/lib/errors";
import { getMemoryFacts, addMemoryFacts } from "@/lib/neural/orion-memory";

// ═══ Dashboard context (cached 5 min) ═══
let _dashboardContextCache: { data: string; ts: number } | null = null;
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;

export function getUserMemory(): string[] {
  return getMemoryFacts();
}

export function addUserMemory(facts: string[]) {
  const entries = addMemoryFacts(facts, "fact", "chat");
  return entries.map(e => e.fact);
}

export async function fetchDashboardContext(): Promise<string> {
  if (_dashboardContextCache && Date.now() - _dashboardContextCache.ts < DASHBOARD_CACHE_TTL) {
    return _dashboardContextCache.data;
  }
  const parts: string[] = [];
  try {
    const user = await getCachedAuthUser();
    if (!user) return "";

    /**
     * PERF: Dashboard context optimization.
     * Use { count: "exact", head: true } to fetch total counts only via HTTP headers.
     * This avoids downloading full row data and eliminates body parsing overhead.
     * Removed redundant 'consultas' query as it was unused in the final prompt.
     * Expected impact: ~150ms reduction in context preparation latency.
     */
    const [processosRes, clientsRes, docsRes] = await Promise.all([
      wrapSupabase(supabase.from("processos").select("id", { count: "exact", head: true }).eq("user_id", user.id)),
      wrapSupabase(supabase.from("client_profiles").select("id", { count: "exact", head: true }).eq("user_id", user.id)),
      wrapSupabase(supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id)),
    ]);
    if (processosRes.count) parts.push(`${processosRes.count} processos.`);
    if (clientsRes.count) parts.push(`${clientsRes.count} clientes.`);
    if (docsRes.count) parts.push(`${docsRes.count} documentos.`);
    parts.push(`Data/hora: ${new Date().toLocaleString("pt-BR")}`);
  } catch (err) {
    console.warn("[Dashboard] Context fetch error:", err);
    if (_dashboardContextCache) return _dashboardContextCache.data;
    return "";
  }
  const result = parts.join("\n");
  _dashboardContextCache = { data: result, ts: Date.now() };
  return result;
}

// ═══ GLOBAL AUTH CACHE — avoids 3-6 supabase.auth.getUser() calls per interaction ═══
let _globalAuthCache: { user: { id: string; email?: string | null } | null; ts: number } = { user: null, ts: 0 };
const AUTH_CACHE_TTL = 60_000; // 60s

export async function getCachedAuthUser(): Promise<{ id: string; email?: string | null } | null> {
  if (_globalAuthCache.user && Date.now() - _globalAuthCache.ts < AUTH_CACHE_TTL) {
    return _globalAuthCache.user;
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    _globalAuthCache = { user: user ? { id: user.id, email: user.email } : null, ts: Date.now() };
    return _globalAuthCache.user;
  } catch {
    return _globalAuthCache.user; // return stale on error
  }
}
