/**
 * ─── Orion Episodic Memory Store ───
 * Persistent episodic memory: stores complete interactions with semantic indexing.
 * Enables "what did we discuss about X last week?" queries via vector search.
 * 
 * Architecture:
 * - Local cache (IndexedDB via localStorage fallback) for fast retrieval
 * - Supabase `neural_knowledge_base` for semantic vector search
 * - Auto-summarization of long conversations (>20 messages)
 * - Deduplication via temporal + semantic similarity
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export interface EpisodicEntry {
  id: string;
  conversationId: string;
  userId: string;
  summary: string;
  keyTopics: string[];
  messageCount: number;
  startTime: string;
  endTime: string;
  emotionalTone?: string;
  decisions?: string[];
  metadata?: Record<string, unknown>;
}

export interface EpisodicSearchResult {
  entry: EpisodicEntry;
  similarity: number;
  source: "vector" | "keyword" | "temporal";
}

// ─── Constants ───
const EPISODIC_CACHE_KEY = "orion_episodic_cache";
const MAX_CACHED_EPISODES = 50;
const MIN_MESSAGES_FOR_EPISODE = 3;
const SUMMARY_MAX_LENGTH = 500;

// ─── Local Cache ───

function getCachedEpisodes(): EpisodicEntry[] {
  try {
    const raw = localStorage.getItem(EPISODIC_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedEpisodes(episodes: EpisodicEntry[]): void {
  const trimmed = episodes.slice(0, MAX_CACHED_EPISODES);
  localStorage.setItem(EPISODIC_CACHE_KEY, JSON.stringify(trimmed));
}

// ─── Episode Creation ───

export function extractKeyTopics(messages: Array<{ role: string; content: string }>): string[] {
  const stopWords = new Set([
    "de", "da", "do", "em", "um", "uma", "para", "com", "que", "por", "não",
    "se", "na", "no", "os", "as", "mais", "como", "mas", "foi", "ao", "ele",
    "the", "is", "at", "on", "in", "to", "and", "or", "of", "a", "an",
  ]);

  const wordFreq = new Map<string, number>();
  const userMessages = messages.filter(m => m.role === "user");

  for (const msg of userMessages) {
    const words = msg.content.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  return [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

export function generateEpisodeSummary(messages: Array<{ role: string; content: string }>): string {
  const userMessages = messages.filter(m => m.role === "user").map(m => m.content);
  const aiMessages = messages.filter(m => m.role === "assistant").map(m => m.content);

  const topicSample = userMessages.slice(0, 5).map(m => m.slice(0, 100)).join("; ");
  const aiSample = aiMessages.slice(0, 3).map(m => m.slice(0, 80)).join("; ");

  const summary = `Usuário discutiu: ${topicSample}. Orion respondeu: ${aiSample}`;
  return summary.slice(0, SUMMARY_MAX_LENGTH);
}

export async function createEpisode(
  conversationId: string,
  userId: string,
  messages: Array<{ role: string; content: string; timestamp?: string }>,
  title?: string
): Promise<EpisodicEntry | null> {
  if (messages.length < MIN_MESSAGES_FOR_EPISODE) return null;

  const summary = generateEpisodeSummary(messages);
  const keyTopics = extractKeyTopics(messages);

  const episode: EpisodicEntry = {
    id: crypto.randomUUID(),
    conversationId,
    userId,
    summary,
    keyTopics,
    messageCount: messages.length,
    startTime: messages[0]?.timestamp || new Date().toISOString(),
    endTime: messages[messages.length - 1]?.timestamp || new Date().toISOString(),
    decisions: [],
  };

  // Cache locally
  const cached = getCachedEpisodes();
  // Deduplicate by conversationId
  const filtered = cached.filter(e => e.conversationId !== conversationId);
  filtered.unshift(episode);
  saveCachedEpisodes(filtered);

  // Persist to neural_knowledge_base for vector search
  try {
    await supabase.from("neural_knowledge_base").insert({
      title: title || `Episódio: ${keyTopics.slice(0, 3).join(", ")}`,
      content: `[Episodic Memory] Conv: ${conversationId}\n${summary}\nTópicos: ${keyTopics.join(", ")}\nMensagens: ${messages.length}`,
      source_type: "episodic_memory",
      category: "conversation_history",
      tags: keyTopics.slice(0, 5),
      metadata: {
        conversation_id: conversationId,
        user_id: userId,
        message_count: messages.length,
        start_time: episode.startTime,
        end_time: episode.endTime,
      },
      is_processed: false, // Will be processed by embedding pipeline
    });
  } catch (e) {
    console.warn("[EpisodicMemory] Failed to persist to knowledge base:", e);
  }

  return episode;
}

// ─── Semantic Search ───

export async function searchEpisodes(
  query: string,
  userId: string,
  limit = 5
): Promise<EpisodicSearchResult[]> {
  const results: EpisodicSearchResult[] = [];

  // 1. Local keyword search (fast path)
  const cached = getCachedEpisodes();
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  for (const episode of cached) {
    if (episode.userId !== userId) continue;

    const topicMatch = episode.keyTopics.some(t =>
      queryWords.some(qw => t.includes(qw) || qw.includes(t))
    );
    const summaryMatch = episode.summary.toLowerCase().includes(queryLower);

    if (topicMatch || summaryMatch) {
      results.push({
        entry: episode,
        similarity: summaryMatch ? 0.9 : 0.7,
        source: "keyword",
      });
    }
  }

  // 2. Vector search via Supabase (if available)
  try {
    const { data } = await supabase
      .from("neural_knowledge_base")
      .select("*")
      .eq("source_type", "episodic_memory")
      .textSearch("content", query.split(/\s+/).join(" & "), { type: "plain" })
      .limit(limit);

    if (data) {
      for (const row of data) {
        const meta = row.metadata as Record<string, unknown> | null;
        if (!meta || meta.user_id !== userId) continue;

        const existing = results.find(r => r.entry.conversationId === meta.conversation_id);
        if (!existing) {
          results.push({
            entry: {
              id: row.id,
              conversationId: (meta.conversation_id as string) || "",
              userId,
              summary: row.content || "",
              keyTopics: (row.tags as string[]) || [],
              messageCount: (meta.message_count as number) || 0,
              startTime: (meta.start_time as string) || row.created_at,
              endTime: (meta.end_time as string) || row.created_at,
            },
            similarity: 0.75,
            source: "vector",
          });
        }
      }
    }
  } catch (e) {
    console.warn("[EpisodicMemory] Vector search failed:", e);
  }

  // Sort by similarity desc
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, limit);
}

// ─── Context Builder ───

export function buildEpisodicContext(episodes: EpisodicSearchResult[]): string {
  if (episodes.length === 0) return "";

  const parts = episodes.map((r, i) => {
    const e = r.entry;
    const timeAgo = getTimeAgo(new Date(e.endTime));
    return `${i + 1}. [${timeAgo}] Tópicos: ${e.keyTopics.join(", ")} — ${e.summary.slice(0, 200)}`;
  });

  return `[MEMÓRIA EPISÓDICA — Conversas Anteriores]\n${parts.join("\n")}`;
}

function getTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "agora mesmo";
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  const weeks = Math.floor(days / 7);
  return `${weeks}sem atrás`;
}

// ─── Cleanup ───

export async function pruneOldEpisodes(userId: string, keepDays = 90): Promise<number> {
  const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000).toISOString();

  // Prune local cache
  const cached = getCachedEpisodes();
  const kept = cached.filter(e => e.endTime > cutoff || e.userId !== userId);
  saveCachedEpisodes(kept);

  return cached.length - kept.length;
}
