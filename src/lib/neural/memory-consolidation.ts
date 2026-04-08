/**
 * ─── Sonho: Memory Consolidation (Experience Replay) ───
 * Periodically reviews episodic memory during idle time.
 * Compresses redundant memories, strengthens frequent ones,
 * prunes weak entries — like biological sleep consolidation.
 *
 * Ref: McClelland et al. (1995) "Complementary Learning Systems"
 *      Walker & Stickgold (2006) "Sleep, Memory, and Plasticity"
 *      Mnih et al. (2015) "Experience Replay in DQN"
 */

// ─── Types ───

export interface ConsolidationConfig {
  /** Similarity threshold for merging episodes (0-1) */
  mergeSimilarityThreshold: number;
  /** Minimum access count to be considered "strong" */
  strongAccessThreshold: number;
  /** Max age (ms) before weak memories are prunable */
  weakMemoryMaxAge: number;
  /** Minimum access count — below this + old = prunable */
  weakAccessThreshold: number;
  /** Max episodes to keep after consolidation */
  maxEpisodes: number;
  /** Priority boost factor for frequently accessed memories */
  frequencyBoostFactor: number;
}

export interface ConsolidationResult {
  /** Episodes before consolidation */
  episodesBefore: number;
  /** Episodes after consolidation */
  episodesAfter: number;
  /** Number merged */
  merged: number;
  /** Number pruned */
  pruned: number;
  /** Number strengthened */
  strengthened: number;
  /** Duration of consolidation (ms) */
  durationMs: number;
  /** Timestamp */
  completedAt: number;
}

interface MemoryEntry {
  id: string;
  summary: string;
  keyTopics: string[];
  messageCount: number;
  startTime: string;
  endTime: string;
  emotionalTone?: string;
  accessCount: number;
  priority: number;
  lastAccessed: number;
  merged?: boolean;
}

// ─── Constants ───

const CACHE_KEY = "orion_episodic_cache";
const CONSOLIDATION_LOG_KEY = "orion_consolidation_log";

export const DEFAULT_CONSOLIDATION_CONFIG: ConsolidationConfig = {
  mergeSimilarityThreshold: 0.75,
  strongAccessThreshold: 3,
  weakMemoryMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  weakAccessThreshold: 1,
  maxEpisodes: 50,
  frequencyBoostFactor: 1.2,
};

// ─── Utilities ───

function loadEpisodes(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Normalize: add accessCount/priority if missing
    return parsed.map((e: any) => ({
      ...e,
      accessCount: e.accessCount ?? 1,
      priority: e.priority ?? 0.5,
      lastAccessed: e.lastAccessed ?? (Date.parse(e.endTime) || Date.now()),
    }));
  } catch {
    return [];
  }
}

function saveEpisodes(episodes: MemoryEntry[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(episodes));
  } catch {
    // Storage full — prune aggressively
    const pruned = episodes.slice(-20);
    localStorage.setItem(CACHE_KEY, JSON.stringify(pruned));
  }
}

/**
 * Compute Jaccard similarity between two topic sets.
 */
function topicSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const setA = new Set(a.map(t => t.toLowerCase()));
  const setB = new Set(b.map(t => t.toLowerCase()));
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;

  return union > 0 ? intersection / union : 0;
}

/**
 * Compute text similarity via word overlap (lightweight).
 */
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Combined similarity (topics + summary text).
 */
function episodeSimilarity(a: MemoryEntry, b: MemoryEntry): number {
  const topicSim = topicSimilarity(a.keyTopics, b.keyTopics);
  const textSim = textSimilarity(a.summary, b.summary);
  return topicSim * 0.6 + textSim * 0.4;
}

// ─── Consolidation Operations ───

/**
 * Merge two similar episodes into one.
 */
function mergeEpisodes(a: MemoryEntry, b: MemoryEntry): MemoryEntry {
  const isANewer = (a.lastAccessed || 0) >= (b.lastAccessed || 0);
  const primary = isANewer ? a : b;
  const secondary = isANewer ? b : a;

  // Merge topics (union)
  const allTopics = [...new Set([...primary.keyTopics, ...secondary.keyTopics])];

  // Merge summaries
  const mergedSummary = primary.summary.length >= secondary.summary.length
    ? primary.summary
    : `${primary.summary} | ${secondary.summary}`.slice(0, 500);

  return {
    id: primary.id,
    summary: mergedSummary,
    keyTopics: allTopics.slice(0, 10),
    messageCount: primary.messageCount + secondary.messageCount,
    startTime: primary.startTime < secondary.startTime ? primary.startTime : secondary.startTime,
    endTime: primary.endTime > secondary.endTime ? primary.endTime : secondary.endTime,
    emotionalTone: primary.emotionalTone || secondary.emotionalTone,
    accessCount: primary.accessCount + secondary.accessCount,
    priority: Math.max(primary.priority, secondary.priority) * 1.1,
    lastAccessed: Math.max(primary.lastAccessed, secondary.lastAccessed),
    merged: true,
  };
}

// ─── Public API ───

/**
 * Run full memory consolidation cycle ("dream session").
 * Safe to call during idle time or via requestIdleCallback.
 */
export function consolidateMemories(
  config: ConsolidationConfig = DEFAULT_CONSOLIDATION_CONFIG
): ConsolidationResult {
  const start = performance.now();
  let episodes = loadEpisodes();
  const episodesBefore = episodes.length;
  let merged = 0;
  let pruned = 0;
  let strengthened = 0;

  // Phase 1: Strengthen frequently accessed memories
  for (const ep of episodes) {
    if (ep.accessCount >= config.strongAccessThreshold) {
      ep.priority = Math.min(1, ep.priority * config.frequencyBoostFactor);
      strengthened++;
    }
  }

  // Phase 2: Merge similar episodes
  const mergedIds = new Set<string>();
  for (let i = 0; i < episodes.length; i++) {
    if (mergedIds.has(episodes[i].id)) continue;
    for (let j = i + 1; j < episodes.length; j++) {
      if (mergedIds.has(episodes[j].id)) continue;
      const sim = episodeSimilarity(episodes[i], episodes[j]);
      if (sim >= config.mergeSimilarityThreshold) {
        episodes[i] = mergeEpisodes(episodes[i], episodes[j]);
        mergedIds.add(episodes[j].id);
        merged++;
      }
    }
  }
  episodes = episodes.filter(ep => !mergedIds.has(ep.id));

  // Phase 3: Prune weak old memories
  const now = Date.now();
  episodes = episodes.filter(ep => {
    const age = now - ep.lastAccessed;
    const isWeak = ep.accessCount <= config.weakAccessThreshold;
    const isOld = age > config.weakMemoryMaxAge;
    if (isWeak && isOld) {
      pruned++;
      return false;
    }
    return true;
  });

  // Phase 4: Cap total episodes (keep highest priority)
  if (episodes.length > config.maxEpisodes) {
    episodes.sort((a, b) => b.priority - a.priority);
    pruned += episodes.length - config.maxEpisodes;
    episodes = episodes.slice(0, config.maxEpisodes);
  }

  // Save consolidated memories
  saveEpisodes(episodes);

  const result: ConsolidationResult = {
    episodesBefore,
    episodesAfter: episodes.length,
    merged,
    pruned,
    strengthened,
    durationMs: Math.round(performance.now() - start),
    completedAt: Date.now(),
  };

  // Log consolidation
  try {
    const log = JSON.parse(localStorage.getItem(CONSOLIDATION_LOG_KEY) || "[]");
    log.push(result);
    // Keep only last 10 consolidation logs
    localStorage.setItem(CONSOLIDATION_LOG_KEY, JSON.stringify(log.slice(-10)));
  } catch { /* ignore */ }

  return result;
}

/**
 * Schedule consolidation during browser idle time.
 */
export function scheduleConsolidation(config?: ConsolidationConfig): void {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(() => {
      consolidateMemories(config);
    }, { timeout: 10000 });
  } else {
    // Fallback: run after 5s
    setTimeout(() => consolidateMemories(config), 5000);
  }
}

/**
 * Get last consolidation results.
 */
export function getConsolidationHistory(): ConsolidationResult[] {
  try {
    return JSON.parse(localStorage.getItem(CONSOLIDATION_LOG_KEY) || "[]");
  } catch {
    return [];
  }
}
