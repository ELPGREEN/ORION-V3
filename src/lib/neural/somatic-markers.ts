/**
 * ─── Camada 9: Marcadores Somáticos ───
 * Implements Damasio's Somatic Marker Hypothesis for rapid, "gut-feeling"
 * decisions based on emotional valence of past experiences.
 *
 * Before each orchestrator decision, somatic markers are consulted:
 *   marker = hash(context) → emotional valence of similar past experiences
 *
 * Accelerates frequent decisions without full reasoning (Kahneman's System 1).
 *
 * Ref: Damasio (1994) "Descartes' Error"
 *      Kahneman (2011) "Thinking, Fast and Slow"
 *      Gazzola (2026) "Introdução à Cognição Incorporada"
 */

import type { InteroceptiveState } from "./interoception-engine";

// ─── Types ───

export type MarkerValence = "strongly_positive" | "positive" | "neutral" | "negative" | "strongly_negative";

export interface SomaticMarker {
  /** Hash of the decision context */
  contextHash: string;
  /** Human-readable context label */
  contextLabel: string;
  /** Emotional valence from past experience (-1 to 1) */
  valence: number;
  /** Arousal intensity (0-1) */
  arousal: number;
  /** Confidence in this marker (0-1, grows with repetition) */
  confidence: number;
  /** Number of experiences that formed this marker */
  experienceCount: number;
  /** Domain: provider, strategy, tool, topic */
  domain: string;
  /** Last time this marker was activated */
  lastActivated: number;
  /** Creation timestamp */
  createdAt: number;
  /** Outcome history: recent outcomes that shaped this marker */
  outcomes: MarkerOutcome[];
}

export interface MarkerOutcome {
  timestamp: number;
  success: boolean;
  emotionalImpact: number; // -1 to 1
  context: string;
}

export interface MarkerQuery {
  /** Context to look up */
  contextHash: string;
  /** Current interoceptive state (body context) */
  interoceptiveState?: InteroceptiveState;
  /** Domain filter */
  domain?: string;
}

export interface MarkerDecision {
  /** Should proceed? Based on somatic "gut feeling" */
  shouldProceed: boolean;
  /** Marker valence label */
  valence: MarkerValence;
  /** Raw valence score (-1 to 1) */
  valenceScore: number;
  /** Confidence in this gut feeling (0-1) */
  confidence: number;
  /** Reasoning for the decision */
  reasoning: string;
  /** Was this influenced by current body state? */
  bodyInfluenced: boolean;
  /** Time saved by not doing full reasoning (estimated ms) */
  estimatedTimeSaved: number;
}

export interface SomaticMarkerStore {
  markers: Map<string, SomaticMarker>;
  totalDecisions: number;
  fastDecisions: number;
  avgTimeSaved: number;
  lastPruned: number;
}

// ─── Constants ───

const MARKER_CACHE_KEY = "orion_somatic_markers";
const MAX_MARKERS = 500;
const MAX_OUTCOMES_PER_MARKER = 20;
const CONFIDENCE_THRESHOLD = 0.6; // Min confidence to use marker for fast decision
const VALENCE_THRESHOLD = 0.3; // Min |valence| to be considered significant
const LEARNING_RATE = 0.15;
const DECAY_RATE = 0.001; // Per day
const PRUNE_INTERVAL = 86400000; // 24h

// ─── Store ───

let _store: SomaticMarkerStore = loadStore();

function loadStore(): SomaticMarkerStore {
  if (typeof window === "undefined") return { markers: new Map(), totalDecisions: 0, fastDecisions: 0, avgTimeSaved: 0, lastPruned: Date.now() };
  try {
    const raw = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( MARKER_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        markers: new Map(Object.entries(parsed.markers || {})),
      };
    }
  } catch { /* silent */ }
  return {
    markers: new Map(),
    totalDecisions: 0,
    fastDecisions: 0,
    avgTimeSaved: 0,
    lastPruned: Date.now(),
  };
}

function persistStore(): void {
  if (typeof window === "undefined") return;
  try {
    const serializable = {
      ..._store,
      markers: Object.fromEntries(_store.markers),
    };
    if (typeof window !== "undefined") localStorage.setItem(MARKER_CACHE_KEY, JSON.stringify(serializable));
  } catch { /* silent */ }
}

// ─── Core Functions ───

/**
 * Generate a simple hash for a decision context.
 */
export function hashContext(domain: string, ...keys: string[]): string {
  const input = [domain, ...keys].join(":").toLowerCase();
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `sm_${Math.abs(hash).toString(36)}`;
}

/**
 * Record an outcome to create/update a somatic marker.
 * This is how the system "learns" gut feelings.
 */
export function recordSomaticOutcome(
  contextHash: string,
  contextLabel: string,
  domain: string,
  success: boolean,
  emotionalImpact: number, // -1 to 1
): SomaticMarker {
  const existing = _store.markers.get(contextHash);
  const now = Date.now();

  const outcome: MarkerOutcome = {
    timestamp: now,
    success,
    emotionalImpact: clamp(emotionalImpact, -1, 1),
    context: contextLabel,
  };

  if (existing) {
    // Update existing marker via exponential moving average
    existing.valence = existing.valence * (1 - LEARNING_RATE) + emotionalImpact * LEARNING_RATE;
    existing.arousal = clamp(Math.abs(existing.valence) * 0.8 + 0.1);
    existing.confidence = Math.min(1, existing.confidence + 0.05);
    existing.experienceCount++;
    existing.lastActivated = now;
    existing.outcomes.push(outcome);
    if (existing.outcomes.length > MAX_OUTCOMES_PER_MARKER) {
      existing.outcomes = existing.outcomes.slice(-MAX_OUTCOMES_PER_MARKER);
    }
    _store.markers.set(contextHash, existing);
  } else {
    // Create new marker
    const marker: SomaticMarker = {
      contextHash,
      contextLabel,
      valence: emotionalImpact,
      arousal: Math.abs(emotionalImpact) * 0.6,
      confidence: 0.3, // Low initial confidence
      experienceCount: 1,
      domain,
      lastActivated: now,
      createdAt: now,
      outcomes: [outcome],
    };
    _store.markers.set(contextHash, marker);
  }

  // Prune if needed
  if (_store.markers.size > MAX_MARKERS) pruneMarkers();
  if (now - _store.lastPruned > PRUNE_INTERVAL) decayAllMarkers();

  persistStore();
  return _store.markers.get(contextHash)!;
}

/**
 * Consult somatic markers for a fast "gut feeling" decision.
 * Returns null if no marker exists or confidence is too low.
 */
export function consultSomaticMarker(query: MarkerQuery): MarkerDecision | null {
  const marker = _store.markers.get(query.contextHash);
  _store.totalDecisions++;

  if (!marker || marker.confidence < CONFIDENCE_THRESHOLD) {
    persistStore();
    return null; // No gut feeling available — fall back to full reasoning
  }

  // Apply body state modulation (interoception influences markers)
  let adjustedValence = marker.valence;
  let bodyInfluenced = false;

  if (query.interoceptiveState) {
    const body = query.interoceptiveState;
    // When system is in pain, negative markers become more salient
    if (body.painIndex > 0.5 && marker.valence < 0) {
      adjustedValence *= (1 + body.painIndex * 0.3);
      bodyInfluenced = true;
    }
    // When energy is high, positive markers become more salient
    if (body.energyLevel > 0.7 && marker.valence > 0) {
      adjustedValence *= (1 + body.energyLevel * 0.2);
      bodyInfluenced = true;
    }
    adjustedValence = clamp(adjustedValence, -1, 1);
  }

  const valenceLabel = getValenceLabel(adjustedValence);
  const shouldProceed = adjustedValence > -VALENCE_THRESHOLD;
  const estimatedTimeSaved = marker.confidence > 0.8 ? 200 : 100; // ms

  _store.fastDecisions++;
  _store.avgTimeSaved = (_store.avgTimeSaved * (_store.fastDecisions - 1) + estimatedTimeSaved) / _store.fastDecisions;

  // Update activation time
  marker.lastActivated = Date.now();
  persistStore();

  return {
    shouldProceed,
    valence: valenceLabel,
    valenceScore: adjustedValence,
    confidence: marker.confidence,
    reasoning: generateReasoning(marker, adjustedValence, bodyInfluenced),
    bodyInfluenced,
    estimatedTimeSaved,
  };
}

/**
 * Get all markers for a domain.
 */
export function getMarkersByDomain(domain: string): SomaticMarker[] {
  return Array.from(_store.markers.values()).filter(m => m.domain === domain);
}

/**
 * Get somatic marker statistics.
 */
export function getSomaticMarkerStats() {
  return {
    totalMarkers: _store.markers.size,
    totalDecisions: _store.totalDecisions,
    fastDecisions: _store.fastDecisions,
    fastDecisionRate: _store.totalDecisions > 0 ? _store.fastDecisions / _store.totalDecisions : 0,
    avgTimeSavedMs: _store.avgTimeSaved,
    domainBreakdown: getDomainBreakdown(),
  };
}

/**
 * Reset all somatic markers (full memory wipe).
 */
export function resetSomaticMarkers(): void {
  _store = {
    markers: new Map(),
    totalDecisions: 0,
    fastDecisions: 0,
    avgTimeSaved: 0,
    lastPruned: Date.now(),
  };
  persistStore();
}

// ─── Internal Helpers ───

function getValenceLabel(v: number): MarkerValence {
  if (v > 0.6) return "strongly_positive";
  if (v > 0.2) return "positive";
  if (v > -0.2) return "neutral";
  if (v > -0.6) return "negative";
  return "strongly_negative";
}

function generateReasoning(marker: SomaticMarker, adjustedValence: number, bodyInfluenced: boolean): string {
  const label = getValenceLabel(adjustedValence);
  const exp = marker.experienceCount;
  const body = bodyInfluenced ? " (modulado pelo estado corporal)" : "";
  return `Marcador somático "${marker.contextLabel}" — ${label}${body}. ` +
    `Baseado em ${exp} experiência(s) passada(s), confiança ${(marker.confidence * 100).toFixed(0)}%.`;
}

function getDomainBreakdown(): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const m of _store.markers.values()) {
    breakdown[m.domain] = (breakdown[m.domain] || 0) + 1;
  }
  return breakdown;
}

function pruneMarkers(): void {
  const entries = Array.from(_store.markers.entries());
  entries.sort((a, b) => {
    // Keep high-confidence, recently-activated markers
    const scoreA = a[1].confidence * 0.5 + (1 - (Date.now() - a[1].lastActivated) / 86400000) * 0.5;
    const scoreB = b[1].confidence * 0.5 + (1 - (Date.now() - b[1].lastActivated) / 86400000) * 0.5;
    return scoreB - scoreA;
  });
  _store.markers = new Map(entries.slice(0, MAX_MARKERS * 0.8));
}

function decayAllMarkers(): void {
  const now = Date.now();
  for (const [key, marker] of _store.markers) {
    const daysSinceActivation = (now - marker.lastActivated) / 86400000;
    marker.confidence *= Math.max(0.5, 1 - DECAY_RATE * daysSinceActivation);
    if (marker.confidence < 0.1) {
      _store.markers.delete(key);
    }
  }
  _store.lastPruned = now;
}

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}
