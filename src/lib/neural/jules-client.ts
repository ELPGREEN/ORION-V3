/**
 * Jules API Client for Orion Self-Improvement
 * ─────────────────────────────────────────────
 * With DB persistence, rate limiting, and follow-up support.
 */

import { supabase } from "@/integrations/supabase/client";
import { isOwnerEmail } from "./orion-consciousness";
import type { IdentityStatus } from "@/hooks/useVoiceIdentityGuard";

// ─── Creator Identity Guard ───

/**
 * Verifies if the caller is the creator (Ericson).
 * Accepts email OR voice identity status — either is sufficient.
 * Used to protect all Jules/self-improvement entry points.
 */
export function isCreatorVerified(opts: {
  email?: string | null;
  identityStatus?: IdentityStatus;
}): boolean {
  if (opts.email && isOwnerEmail(opts.email)) return true;
  if (opts.identityStatus === "creator" || opts.identityStatus === "owner") return true;
  return false;
}

// ─── Types ───

export interface JulesSource {
  name: string;
  id: string;
  githubRepo?: { owner: string; repo: string };
}

export interface JulesSession {
  name: string;
  id: string;
  title: string;
  prompt: string;
  sourceContext?: {
    source: string;
    githubRepoContext?: { startingBranch: string };
  };
  outputs?: Array<{
    pullRequest?: { url: string; title: string; description: string };
  }>;
}

export interface JulesActivity {
  name: string;
  content?: string;
  role?: string;
}

export interface JulesDBSession {
  id: string;
  session_id: string;
  subsystem: string | null;
  prompt: string;
  title: string | null;
  branch: string | null;
  status: string;
  pr_url: string | null;
  pr_title: string | null;
  resolved: boolean | null;
  follow_up_count: number;
  error_snapshot: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  resolved_at: string | null;
}

interface JulesResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Rate Limiting ───

const MAX_SESSIONS_PER_HOUR = 3;

// ─── Branch Validation ───

const GITHUB_REPO_OWNER = "ELPGREEN";
const GITHUB_REPO_NAME = "ORION-V3";

/**
 * Verifies if a branch exists on the GitHub remote.
 * Returns true if the branch exists, false otherwise.
 * Falls back to true on network errors to avoid blocking on transient issues.
 */
export async function branchExistsOnGitHub(branch: string): Promise<boolean> {
  if (!branch || branch === "main") return true; // main always exists
  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/branches/${encodeURIComponent(branch)}`;
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
    if (res.status === 404) return false;
    if (res.ok) return true;
    // On rate-limit (403) or other errors, fail-open to avoid blocking
    console.warn(`[Jules] Branch check returned ${res.status}, assuming branch exists`);
    return true;
  } catch (err) {
    console.warn("[Jules] Branch check failed (network), assuming branch exists:", err);
    return true;
  }
}

export async function checkJulesRateLimit(): Promise<{ allowed: boolean; current: number }> {
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count, error } = await supabase
    .from("jules_sessions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", oneHourAgo);

  const current = error ? 0 : (count ?? 0);
  return { allowed: current < MAX_SESSIONS_PER_HOUR, current };
}

// ─── Client ───

async function julesCall<T>(action: string, params: Record<string, unknown> = {}): Promise<JulesResult<T>> {
  const { data, error } = await supabase.functions.invoke("jules-proxy", {
    body: { action, ...params },
  });
  if (error) return { success: false, error: error.message };
  return data as JulesResult<T>;
}

export const julesClient = {
  listSources: (pageToken?: string) =>
    julesCall<{ sources: JulesSource[]; nextPageToken?: string }>("list_sources", { page_token: pageToken }),

  createSession: (opts: {
    prompt: string;
    source: string;
    branch?: string;
    title?: string;
    autoPR?: boolean;
    requireApproval?: boolean;
  }) => julesCall<JulesSession>("create_session", {
    prompt: opts.prompt,
    source: opts.source,
    branch: opts.branch,
    title: opts.title,
    auto_pr: opts.autoPR ?? true,
    require_approval: opts.requireApproval ?? false,
  }),

  getSession: (sessionId: string) => julesCall<JulesSession>("get_session", { session_id: sessionId }),

  listSessions: (pageSize = 10, pageToken?: string) =>
    julesCall<{ sessions: JulesSession[]; nextPageToken?: string }>("list_sessions", { page_size: pageSize, page_token: pageToken }),

  approvePlan: (sessionId: string) => julesCall("approve_plan", { session_id: sessionId }),

  sendMessage: (sessionId: string, prompt: string) => julesCall("send_message", { session_id: sessionId, prompt }),

  listActivities: (sessionId: string, pageSize = 30) =>
    julesCall<{ activities: JulesActivity[] }>("list_activities", { session_id: sessionId, page_size: pageSize }),
};

// ─── DB Persistence ───

async function persistSession(opts: {
  sessionId: string;
  prompt: string;
  title?: string;
  branch?: string;
  subsystem?: string;
  errorSnapshot?: string;
}): Promise<void> {
  await supabase.from("jules_sessions").insert({
    session_id: opts.sessionId,
    prompt: opts.prompt,
    title: opts.title || null,
    branch: opts.branch || "main",
    subsystem: opts.subsystem || null,
    error_snapshot: opts.errorSnapshot || null,
    status: "pending",
  });
}

export async function updateJulesSessionStatus(
  sessionId: string,
  updates: {
    status?: string;
    pr_url?: string;
    pr_title?: string;
    completed_at?: string;
    resolved?: boolean;
    resolved_at?: string;
    follow_up_count?: number;
  },
): Promise<void> {
  await supabase
    .from("jules_sessions")
    .update(updates)
    .eq("session_id", sessionId);
}

export async function getJulesDBSessions(limit = 20): Promise<JulesDBSession[]> {
  const { data } = await supabase
    .from("jules_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as JulesDBSession[] | null) ?? [];
}

export async function getPendingJulesSessions(): Promise<JulesDBSession[]> {
  const { data } = await supabase
    .from("jules_sessions")
    .select("*")
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false });
  return (data as JulesDBSession[] | null) ?? [];
}

// ─── Follow-up ───

export async function julesFollowUp(
  sessionId: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  const result = await julesClient.sendMessage(sessionId, message);
  if (result.success) {
    // Increment follow_up_count
    const { data } = await supabase
      .from("jules_sessions")
      .select("follow_up_count")
      .eq("session_id", sessionId)
      .single();
    const current = (data as { follow_up_count: number } | null)?.follow_up_count ?? 0;
    await updateJulesSessionStatus(sessionId, { follow_up_count: current + 1 });
  }
  return { success: result.success, error: result.error };
}

// ─── Orion Self-Improvement Interface ───

const DEFAULT_SOURCE = "sources/github/ELPGREEN/ORION-V3";

export async function orionSelfImprove(opts: {
  task: string;
  context?: string;
  branch?: string;
  autoPR?: boolean;
  subsystem?: string;
  /** Caller identity — required for manual triggers. Omit only for internal auto-triggers. */
  callerIdentity?: { email?: string | null; identityStatus?: IdentityStatus };
  /** Set to true for internal auto-triggers (subsystem failures) that bypass identity check */
  _internalAutoTrigger?: boolean;
}): Promise<{ sessionId: string; success: boolean; error?: string; rateLimited?: boolean }> {
  // Identity guard: block non-creator manual triggers
  if (!opts._internalAutoTrigger) {
    if (!opts.callerIdentity || !isCreatorVerified(opts.callerIdentity)) {
      console.warn("[Orion→Jules] ❌ Blocked: caller is not the creator");
      return { sessionId: "", success: false, error: "Apenas o criador pode acionar auto-evolução" };
    }
  }
  // Rate limit check
  const { allowed, current } = await checkJulesRateLimit();
  if (!allowed) {
    console.warn(`[Orion→Jules] Rate limited: ${current}/${MAX_SESSIONS_PER_HOUR} sessions/hour`);
    return { sessionId: "", success: false, error: `Rate limited (${current}/${MAX_SESSIONS_PER_HOUR}/h)`, rateLimited: true };
  }

  const branchPrefix = opts.subsystem ? `fix/jules-${opts.subsystem}-${Date.now()}` : undefined;
  const branch = opts.branch || branchPrefix || "main";

  const prompt = opts.context
    ? `${opts.task}\n\nContext:\n${opts.context}`
    : opts.task;

  const result = await julesClient.createSession({
    prompt,
    source: DEFAULT_SOURCE,
    branch,
    title: `Orion: ${opts.task.slice(0, 60)}`,
    autoPR: opts.autoPR ?? true,
    requireApproval: false,
  });

  if (result.success && result.data) {
    console.log(`[Orion→Jules] Session created: ${result.data.id}`);
    // Persist to DB
    await persistSession({
      sessionId: result.data.id,
      prompt,
      title: `Orion: ${opts.task.slice(0, 60)}`,
      branch,
      subsystem: opts.subsystem,
      errorSnapshot: opts.context?.slice(0, 500),
    });
    return { sessionId: result.data.id, success: true };
  }

  return { sessionId: "", success: false, error: result.error };
}

/**
 * Poll a Jules session until it produces a PR or completes.
 */
export async function pollJulesSession(
  sessionId: string,
  maxAttempts = 30,
  intervalMs = 10000,
): Promise<{ prUrl?: string; completed: boolean; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await julesClient.getSession(sessionId);
    if (!result.success) return { completed: false, error: result.error };

    // Update status to running
    if (i === 0) {
      await updateJulesSessionStatus(sessionId, { status: "running" });
    }

    const session = result.data;
    const pr = session?.outputs?.find((o) => o.pullRequest);
    if (pr?.pullRequest) {
      await updateJulesSessionStatus(sessionId, {
        status: "completed",
        pr_url: pr.pullRequest.url,
        pr_title: pr.pullRequest.title,
        completed_at: new Date().toISOString(),
      });
      return { prUrl: pr.pullRequest.url, completed: true };
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
  await updateJulesSessionStatus(sessionId, { status: "failed" });
  return { completed: false, error: "Timeout waiting for Jules to complete" };
}
