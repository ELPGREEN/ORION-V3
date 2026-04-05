/**
 * ─── Camada 8: Memória Incorporada (Embodied Memory) ───
 * Extends episodic memory with somatic associations and procedural patterns.
 *
 * - Somatic Memory: associates emotional/bodily responses to past events
 * - Procedural Memory: successful action patterns (muscular feedback loops)
 * - Integrates body-language detections as memory metadata
 *
 * Ref: Barsalou (2008) "Grounded Cognition"
 *      Glenberg (1997) "What memory is for"
 *      Gazzola (2026) "Introdução à Cognição Incorporada"
 */

import type { InteroceptiveState } from "./interoception-engine";
import type { BodyLanguageSignal } from "./body-language";

// ─── Types ───

export interface SomaticTag {
  /** Emotional valence at time of encoding (-1 to 1) */
  valence: number;
  /** Arousal at time of encoding (0-1) */
  arousal: number;
  /** Interoceptive state snapshot */
  painIndex: number;
  energyLevel: number;
  dominantVisceralSignal: string;
  /** Body language signals detected during event */
  bodyLanguageSignals: BodyLanguageSignal[];
}

export interface EmbodiedEpisode {
  id: string;
  /** Core content (what happened) */
  summary: string;
  /** Key topics/entities */
  topics: string[];
  /** Somatic tag — the "feeling" of the memory */
  somaticTag: SomaticTag;
  /** Procedural pattern ID (if this was a successful action) */
  proceduralPatternId?: string;
  /** Domain: legal, chat, vision, system, etc. */
  domain: string;
  /** Outcome of the episode */
  outcome: "success" | "failure" | "neutral";
  /** Strength of the memory (decays over time, boosted by recall) */
  strength: number;
  /** Recall count */
  recallCount: number;
  /** Timestamps */
  createdAt: number;
  lastRecalled: number;
}

export interface ProceduralPattern {
  id: string;
  /** What action/strategy this pattern represents */
  label: string;
  /** Sequence of steps */
  steps: string[];
  /** Domain */
  domain: string;
  /** Success rate (0-1) */
  successRate: number;
  /** Number of times executed */
  executionCount: number;
  /** Average somatic valence when this pattern succeeds */
  avgSuccessValence: number;
  /** Last used */
  lastUsed: number;
  createdAt: number;
}

export interface EmbodiedMemoryState {
  episodes: EmbodiedEpisode[];
  proceduralPatterns: ProceduralPattern[];
  totalRecalls: number;
  somaticRecalls: number;
}

// ─── Constants ───

const EMBODIED_CACHE_KEY = "orion_embodied_memory";
const MAX_EPISODES = 200;
const MAX_PATTERNS = 50;
const STRENGTH_DECAY_RATE = 0.005; // Per day
const RECALL_BOOST = 0.15;

// ─── State ───

let _state: EmbodiedMemoryState = loadState();

function loadState(): EmbodiedMemoryState {
  try {
    const raw = localStorage.getItem(EMBODIED_CACHE_KEY);
    return raw ? JSON.parse(raw) : defaultState();
  } catch {
    return defaultState();
  }
}

function defaultState(): EmbodiedMemoryState {
  return { episodes: [], proceduralPatterns: [], totalRecalls: 0, somaticRecalls: 0 };
}

function persist(): void {
  try {
    localStorage.setItem(EMBODIED_CACHE_KEY, JSON.stringify(_state));
  } catch { /* silent */ }
}

// ─── Episode Management ───

/**
 * Encode a new embodied episode — an experience with its somatic context.
 */
export function encodeEmbodiedEpisode(
  summary: string,
  topics: string[],
  domain: string,
  outcome: "success" | "failure" | "neutral",
  interoceptiveState: InteroceptiveState | null,
  bodyLanguageSignals: BodyLanguageSignal[] = [],
): EmbodiedEpisode {
  const somaticTag: SomaticTag = {
    valence: interoceptiveState?.valence ?? 0,
    arousal: interoceptiveState?.arousal ?? 0,
    painIndex: interoceptiveState?.painIndex ?? 0,
    energyLevel: interoceptiveState?.energyLevel ?? 1,
    dominantVisceralSignal: interoceptiveState?.dominantSignal ?? "homeostasis",
    bodyLanguageSignals,
  };

  const episode: EmbodiedEpisode = {
    id: `ee_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    summary,
    topics,
    somaticTag,
    domain,
    outcome,
    strength: 1.0,
    recallCount: 0,
    createdAt: Date.now(),
    lastRecalled: Date.now(),
  };

  _state.episodes.push(episode);
  if (_state.episodes.length > MAX_EPISODES) {
    pruneEpisodes();
  }
  persist();
  return episode;
}

/**
 * Recall episodes by somatic similarity — "what did it feel like?"
 * This is body-based memory retrieval (Barsalou's grounded cognition).
 */
export function recallBySomaticSimilarity(
  currentState: InteroceptiveState,
  domain?: string,
  limit = 5,
): EmbodiedEpisode[] {
  _state.totalRecalls++;
  _state.somaticRecalls++;

  let candidates = _state.episodes;
  if (domain) candidates = candidates.filter(e => e.domain === domain);

  const scored = candidates.map(episode => {
    const tag = episode.somaticTag;
    const valenceDiff = Math.abs(tag.valence - currentState.valence);
    const arousalDiff = Math.abs(tag.arousal - currentState.arousal);
    const painDiff = Math.abs(tag.painIndex - currentState.painIndex);
    const similarity = 1 - (valenceDiff * 0.4 + arousalDiff * 0.3 + painDiff * 0.3);
    return { episode, similarity: similarity * episode.strength };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  const results = scored.slice(0, limit).map(s => s.episode);

  // Boost recalled episodes
  for (const ep of results) {
    ep.recallCount++;
    ep.lastRecalled = Date.now();
    ep.strength = Math.min(1, ep.strength + RECALL_BOOST);
  }

  persist();
  return results;
}

/**
 * Recall episodes by topic keyword matching.
 */
export function recallByTopic(query: string, limit = 5): EmbodiedEpisode[] {
  _state.totalRecalls++;
  const q = query.toLowerCase();
  const scored = _state.episodes.map(ep => {
    const topicMatch = ep.topics.some(t => t.toLowerCase().includes(q)) ? 1 : 0;
    const summaryMatch = ep.summary.toLowerCase().includes(q) ? 0.5 : 0;
    return { episode: ep, score: (topicMatch + summaryMatch) * ep.strength };
  }).filter(s => s.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(s => s.episode);
}

// ─── Procedural Memory ───

/**
 * Register a successful action pattern as procedural memory.
 */
export function registerProceduralPattern(
  label: string,
  steps: string[],
  domain: string,
  successValence: number,
): ProceduralPattern {
  const existing = _state.proceduralPatterns.find(p => p.label === label && p.domain === domain);

  if (existing) {
    existing.executionCount++;
    existing.successRate = (existing.successRate * (existing.executionCount - 1) + 1) / existing.executionCount;
    existing.avgSuccessValence = (existing.avgSuccessValence * (existing.executionCount - 1) + successValence) / existing.executionCount;
    existing.lastUsed = Date.now();
    persist();
    return existing;
  }

  const pattern: ProceduralPattern = {
    id: `pp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label,
    steps,
    domain,
    successRate: 1.0,
    executionCount: 1,
    avgSuccessValence: successValence,
    lastUsed: Date.now(),
    createdAt: Date.now(),
  };

  _state.proceduralPatterns.push(pattern);
  if (_state.proceduralPatterns.length > MAX_PATTERNS) {
    _state.proceduralPatterns.sort((a, b) => b.successRate * b.executionCount - a.successRate * a.executionCount);
    _state.proceduralPatterns = _state.proceduralPatterns.slice(0, MAX_PATTERNS);
  }

  persist();
  return pattern;
}

/**
 * Get the best procedural pattern for a domain.
 */
export function getBestProceduralPattern(domain: string): ProceduralPattern | null {
  const candidates = _state.proceduralPatterns
    .filter(p => p.domain === domain && p.executionCount >= 2)
    .sort((a, b) => b.successRate * b.avgSuccessValence - a.successRate * a.avgSuccessValence);
  return candidates[0] || null;
}

/**
 * Get embodied memory statistics.
 */
export function getEmbodiedMemoryStats() {
  return {
    totalEpisodes: _state.episodes.length,
    proceduralPatterns: _state.proceduralPatterns.length,
    totalRecalls: _state.totalRecalls,
    somaticRecalls: _state.somaticRecalls,
    somaticRecallRate: _state.totalRecalls > 0 ? _state.somaticRecalls / _state.totalRecalls : 0,
    domainCoverage: [...new Set(_state.episodes.map(e => e.domain))],
    avgEpisodeStrength: _state.episodes.length > 0
      ? _state.episodes.reduce((s, e) => s + e.strength, 0) / _state.episodes.length
      : 0,
  };
}

/**
 * Apply temporal decay to all episodes.
 */
export function decayEmbodiedMemories(): void {
  const now = Date.now();
  for (const ep of _state.episodes) {
    const daysSinceRecall = (now - ep.lastRecalled) / 86400000;
    ep.strength *= Math.max(0.1, 1 - STRENGTH_DECAY_RATE * daysSinceRecall);
  }
  // Remove very weak memories
  _state.episodes = _state.episodes.filter(e => e.strength > 0.05);
  persist();
}

// ─── Internal ───

function pruneEpisodes(): void {
  _state.episodes.sort((a, b) => b.strength * b.recallCount - a.strength * a.recallCount);
  _state.episodes = _state.episodes.slice(0, MAX_EPISODES * 0.8);
}
