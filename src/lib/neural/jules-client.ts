/**
 * Jules API Client for Orion Self-Improvement
 * ─────────────────────────────────────────────
 * Enables Orion to autonomously create coding sessions via Jules
 * to fix bugs, optimize performance, and integrate new features.
 */

import { supabase } from "@/integrations/supabase/client";

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

interface JulesResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
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
  /** List all GitHub repos connected to Jules */
  listSources: () => julesCall<{ sources: JulesSource[] }>("list_sources"),

  /** Create a new coding session */
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

  /** Get session status (poll for completion/PR) */
  getSession: (sessionId: string) => julesCall<JulesSession>("get_session", { session_id: sessionId }),

  /** List recent sessions */
  listSessions: (pageSize = 10) => julesCall<{ sessions: JulesSession[] }>("list_sessions", { page_size: pageSize }),

  /** Approve a session's plan */
  approvePlan: (sessionId: string) => julesCall("approve_plan", { session_id: sessionId }),

  /** Send follow-up message to session */
  sendMessage: (sessionId: string, prompt: string) => julesCall("send_message", { session_id: sessionId, prompt }),

  /** List activities in a session */
  listActivities: (sessionId: string, pageSize = 30) =>
    julesCall<{ activities: JulesActivity[] }>("list_activities", { session_id: sessionId, page_size: pageSize }),
};

// ─── Orion Self-Improvement Interface ───

/** Cached source name */
let _cachedSource: string | null = null;

async function getDefaultSource(): Promise<string | null> {
  if (_cachedSource) return _cachedSource;
  const result = await julesClient.listSources();
  if (result.success && result.data?.sources?.length) {
    _cachedSource = result.data.sources[0].name;
    return _cachedSource;
  }
  return null;
}

/**
 * High-level: Orion asks Jules to fix/improve something in the codebase.
 * Returns the session ID for polling.
 */
export async function orionSelfImprove(opts: {
  task: string;
  context?: string;
  branch?: string;
  autoPR?: boolean;
}): Promise<{ sessionId: string; success: boolean; error?: string }> {
  const source = await getDefaultSource();
  if (!source) return { sessionId: "", success: false, error: "No Jules source available" };

  const prompt = opts.context
    ? `${opts.task}\n\nContext:\n${opts.context}`
    : opts.task;

  const result = await julesClient.createSession({
    prompt,
    source,
    branch: opts.branch || "main",
    title: `Orion: ${opts.task.slice(0, 60)}`,
    autoPR: opts.autoPR ?? true,
    requireApproval: false,
  });

  if (result.success && result.data) {
    console.log(`[Orion→Jules] Session created: ${result.data.id}`);
    return { sessionId: result.data.id, success: true };
  }

  return { sessionId: "", success: false, error: result.error };
}

/**
 * Poll a Jules session until it produces a PR or completes.
 * Returns the PR URL if available.
 */
export async function pollJulesSession(
  sessionId: string,
  maxAttempts = 30,
  intervalMs = 10000,
): Promise<{ prUrl?: string; completed: boolean; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await julesClient.getSession(sessionId);
    if (!result.success) return { completed: false, error: result.error };

    const session = result.data;
    const pr = session?.outputs?.find((o) => o.pullRequest);
    if (pr?.pullRequest) {
      return { prUrl: pr.pullRequest.url, completed: true };
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return { completed: false, error: "Timeout waiting for Jules to complete" };
}
