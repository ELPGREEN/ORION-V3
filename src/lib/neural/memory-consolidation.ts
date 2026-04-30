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

/**
 * Optimized intersection count for Sets.
 * PERF: Iterates over the smaller set to minimize O(N) operations and eliminates array spreads.
 */
function countIntersection(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  if (setA.size <= setB.size) {
    for (const x of setA) {
      if (setB.has(x)) intersection++;
    }
  } else {
    for (const x of setB) {
      if (setA.has(x)) intersection++;
    }
  }
  return intersection;
}

function loadEpisodes(): MemoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( CACHE_KEY);
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
  if (typeof window === "undefined") return;
  try {
    if (typeof window !== "undefined") localStorage.setItem(CACHE_KEY, JSON.stringify(episodes));
  } catch {
    // Storage full — prune aggressively
    const pruned = episodes.slice(-20);
    if (typeof window !== "undefined") localStorage.setItem(CACHE_KEY, JSON.stringify(pruned));
  }
}

/**
 * Compute Jaccard similarity between two topic sets.
 * PERF: Optimized with pre-calculated Sets and loop-based intersection.
 */
function topicSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = countIntersection(setA, setB);
  const unionSize = setA.size + setB.size - intersection;

  return unionSize > 0 ? intersection / unionSize : 0;
}

/**
 * Compute text similarity via word overlap (lightweight).
 * PERF: Optimized with pre-calculated Sets and loop-based intersection.
 */
function textSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = countIntersection(setA, setB);
  const unionSize = setA.size + setB.size - intersection;

  return unionSize > 0 ? intersection / unionSize : 0;
}

/**
 * Combined similarity (topics + summary text).
 */
function episodeSimilarity(
  aTopics: Set<string>, bTopics: Set<string>,
  aWords: Set<string>, bWords: Set<string>
): number {
  const topicSim = topicSimilarity(aTopics, bTopics);
  const textSim = textSimilarity(aWords, bWords);
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
  // PERF: Pre-tokenize all episodes once (O(N)) before entering the O(N^2) comparison loop.
  // This avoids redundant regex splits and Set allocations in the inner loop.
  const tokenized = episodes.map(ep => ({
    topics: new Set(ep.keyTopics.map(t => t.toLowerCase())),
    words: new Set(ep.summary.toLowerCase().split(/\s+/).filter(w => w.length > 3))
  }));

  const mergedIds = new Set<string>();
  for (let i = 0; i < episodes.length; i++) {
    if (mergedIds.has(episodes[i].id)) continue;
    for (let j = i + 1; j < episodes.length; j++) {
      if (mergedIds.has(episodes[j].id)) continue;

      const sim = episodeSimilarity(
        tokenized[i].topics, tokenized[j].topics,
        tokenized[i].words, tokenized[j].words
      );

      if (sim >= config.mergeSimilarityThreshold) {
        episodes[i] = mergeEpisodes(episodes[i], episodes[j]);
        // Update tokenized[i] to reflect merged state if necessary,
        // but since episodes[i] is updated, we keep it simple here.
        // Re-tokenizing the merged result for episodes[i] to maintain consistency.
        tokenized[i] = {
          topics: new Set(episodes[i].keyTopics.map(t => t.toLowerCase())),
          words: new Set(episodes[i].summary.toLowerCase().split(/\s+/).filter(w => w.length > 3))
        };
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
    if (typeof window === "undefined") return;
    const log = JSON.parse((typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( CONSOLIDATION_LOG_KEY) || "[]");
    log.push(result);
    // Keep only last 10 consolidation logs
    if (typeof window !== "undefined") localStorage.setItem(CONSOLIDATION_LOG_KEY, JSON.stringify(log.slice(-10)));
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
    if (typeof window === "undefined") return [];
    return JSON.parse((typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( CONSOLIDATION_LOG_KEY) || "[]");
  } catch {
    return [];
  }
}
