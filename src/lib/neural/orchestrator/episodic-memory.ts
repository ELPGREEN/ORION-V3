/**
 * Orion Episodic Memory — long-term biographical memory.
 * Persists every meaningful interaction so Orion remembers "who he was yesterday".
 *
 * Used by:
 *  - Orchestrator boot (loads recent episodes into context before "Olá")
 *  - Auditor (logs failures + corrections as "trauma" to avoid)
 *  - Self-Healing (detects recurring failures via pattern match)
 */

import { supabase } from "@/integrations/supabase/client";

export type EpisodeType =
  | "interaction"
  | "failure"
  | "decision"
  | "reflection"
  | "milestone"
  | "correction";

export interface Episode {
  id?: string;
  episode_type: EpisodeType;
  agent?: "bolt" | "palette" | "harvester" | "orion" | "system";
  command?: string;
  response?: string;
  sentiment?: string;
  importance?: number; // 0..1
  tags?: string[];
  metadata?: Record<string, unknown>;
  occurred_at?: string;
}

/** Record an episode (fire-and-forget — never blocks the UI). */
export async function recordEpisode(ep: Episode): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return; // anonymous: skip

    await supabase.from("orion_episodic_memory").insert([
      {
        user_id: uid,
        episode_type: ep.episode_type,
        agent: ep.agent,
        command: ep.command?.slice(0, 4000),
        response: ep.response?.slice(0, 4000),
        sentiment: ep.sentiment,
        importance: ep.importance ?? 0.5,
        tags: ep.tags ?? [],
        metadata: (ep.metadata ?? {}) as any,
      },
    ]);
  } catch (err) {
    console.warn("[EpisodicMemory] record failed:", err);
  }
}

/** Recall recent + most-important episodes for boot context. */
export async function recallEpisodes(opts: {
  limit?: number;
  types?: EpisodeType[];
} = {}): Promise<Episode[]> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return [];

    const { data, error } = await supabase.rpc("get_recent_episodes", {
      p_user_id: uid,
      p_limit: opts.limit ?? 10,
      p_types: opts.types ?? null,
    });
    if (error) throw error;
    return (data ?? []) as Episode[];
  } catch (err) {
    console.warn("[EpisodicMemory] recall failed:", err);
    return [];
  }
}

/** Build a context block from recalled episodes (for system prompts). */
export function episodesToContext(episodes: Episode[]): string {
  if (!episodes.length) return "";
  const lines = episodes.map((e) => {
    const when = e.occurred_at ? new Date(e.occurred_at).toLocaleString("pt-BR") : "";
    const tag = e.episode_type.toUpperCase();
    const who = e.agent ? `[${e.agent}]` : "";
    const cmd = e.command ? `«${e.command.slice(0, 120)}»` : "";
    return `• ${when} ${tag} ${who} ${cmd}`;
  });
  return `MEMÓRIA EPISÓDICA (últimas interações):\n${lines.join("\n")}`;
}

/** Detect recurring failures (same intent failed N+ times recently). */
export async function detectRecurringFailures(
  intent: string,
  threshold = 3,
): Promise<Episode[]> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return [];
    const { data } = await supabase
      .from("orion_episodic_memory")
      .select("*")
      .eq("user_id", uid)
      .eq("episode_type", "failure")
      .contains("tags", [intent])
      .gte(
        "occurred_at",
        new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      )
      .order("occurred_at", { ascending: false })
      .limit(20);
    const fails = (data ?? []) as Episode[];
    return fails.length >= threshold ? fails : [];
  } catch (err) {
    console.warn("[EpisodicMemory] detectRecurringFailures failed:", err);
    return [];
  }
}
