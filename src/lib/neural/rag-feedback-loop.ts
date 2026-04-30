/**
 * ─── RAG Feedback Loop ───
 * Closes the loop: evaluation scores → search weight adjustments.
 * 
 * After each RAG response, the evaluator scores it. This module:
 * 1. Tracks score trends per query type (legal, vision, general)
 * 2. Adjusts hybrid_search weights (semantic vs keyword vs authority vs recency)
 * 3. Persists learned weights in localStorage for cross-session learning
 * 
 * Inspired by Google Cloud "Optimizing RAG retrieval: Test, tune, succeed"
 */

import type { RAGEvalResult } from "./rag-evaluator";

// ─── Types ───

export interface SearchWeights {
  semantic: number;   // default 0.55
  keyword: number;    // default 0.25
  authority: number;  // default 0.10
  recency: number;    // default 0.10
}

export interface WeightProfile {
  weights: SearchWeights;
  sampleCount: number;
  avgScore: number;
  lastUpdated: string;
}

interface FeedbackEntry {
  queryType: string;
  evalResult: RAGEvalResult;
  weights: SearchWeights;
  timestamp: number;
}

// ─── Constants ───

const STORAGE_KEY = "orion_rag_weights";
const HISTORY_KEY = "orion_rag_feedback_history";
const MAX_HISTORY = 100;
const LEARNING_RATE = 0.02; // Small adjustments per feedback
const MIN_WEIGHT = 0.05;
const MAX_WEIGHT = 0.70;

const DEFAULT_WEIGHTS: SearchWeights = {
  semantic: 0.55,
  keyword: 0.25,
  authority: 0.10,
  recency: 0.10,
};

// ─── State ───

let _profiles: Record<string, WeightProfile> = {};
let _initialized = false;

function initialize(): void {
  if (_initialized || typeof window === "undefined") return;
  if (_initialized) return;
  try {
    const stored = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( STORAGE_KEY);
    if (stored) _profiles = JSON.parse(stored);
  } catch { /* empty */ }
  _initialized = true;
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(_profiles));
  } catch { /* quota exceeded */ }
}

// ─── Core ───

/**
 * Get current optimized weights for a query type.
 */
export function getOptimizedWeights(queryType: string = "general"): SearchWeights {
  initialize();
  const profile = _profiles[queryType];
  if (profile && profile.sampleCount >= 3) {
    return { ...profile.weights };
  }
  return { ...DEFAULT_WEIGHTS };
}

/**
 * Classify a query into a type for weight profiling.
 */
export function classifyQueryType(query: string): string {
  const lower = query.toLowerCase();
  if (/\b(art\.|lei\s|súmula|jurisprud|processo|tribunal|cpc|cpp|clt)\b/.test(lower)) return "legal";
  if (/\b(vejo|olho|camera|imagem|foto|tela|visual|detecta)\b/.test(lower)) return "vision";
  if (/\b(código|programa|function|class|import|api|endpoint)\b/.test(lower)) return "code";
  return "general";
}

/**
 * Feed evaluation results back into the weight optimization system.
 * This is the core of the feedback loop.
 */
export function submitRAGFeedback(
  query: string,
  evalResult: RAGEvalResult,
  currentWeights?: SearchWeights
): SearchWeights {
  initialize();

  const queryType = classifyQueryType(query);
  const weights = currentWeights || getOptimizedWeights(queryType);
  const profile = _profiles[queryType] || {
    weights: { ...DEFAULT_WEIGHTS },
    sampleCount: 0,
    avgScore: 50,
    lastUpdated: new Date().toISOString(),
  };

  // Calculate adjustment direction based on metric gaps
  const adjustments = calculateAdjustments(evalResult, weights);

  // Apply adjustments with learning rate
  const newWeights: SearchWeights = {
    semantic: clamp(weights.semantic + adjustments.semantic * LEARNING_RATE, MIN_WEIGHT, MAX_WEIGHT),
    keyword: clamp(weights.keyword + adjustments.keyword * LEARNING_RATE, MIN_WEIGHT, MAX_WEIGHT),
    authority: clamp(weights.authority + adjustments.authority * LEARNING_RATE, MIN_WEIGHT, MAX_WEIGHT),
    recency: clamp(weights.recency + adjustments.recency * LEARNING_RATE, MIN_WEIGHT, MAX_WEIGHT),
  };

  // Normalize to sum=1
  const sum = newWeights.semantic + newWeights.keyword + newWeights.authority + newWeights.recency;
  newWeights.semantic /= sum;
  newWeights.keyword /= sum;
  newWeights.authority /= sum;
  newWeights.recency /= sum;

  // Update profile with exponential moving average
  const alpha = 1 / (profile.sampleCount + 1);
  profile.avgScore = profile.avgScore * (1 - alpha) + evalResult.overallScore * alpha;
  profile.weights = newWeights;
  profile.sampleCount++;
  profile.lastUpdated = new Date().toISOString();

  _profiles[queryType] = profile;
  persist();

  // Store in history
  storeFeedbackHistory({ queryType, evalResult, weights: newWeights, timestamp: Date.now() });

  return newWeights;
}

/**
 * Calculate weight adjustment direction based on evaluation metrics.
 */
function calculateAdjustments(evalResult: RAGEvalResult, _current: SearchWeights): SearchWeights {
  const g = evalResult.groundedness.normalized;
  const r = evalResult.relevance.normalized;
  const rq = evalResult.retrievalQuality;

  // Low groundedness → boost semantic (better matching), reduce keyword (noisy matches)
  const groundednessGap = (80 - g) / 100;

  // Low coverage → boost keyword (more diverse retrieval)
  const coverageGap = (0.7 - rq.contextCoverage);

  // Low utilization → reduce match count or boost authority (fewer, better results)
  const utilizationGap = (0.6 - rq.contextUtilization);

  // Low relevance → boost semantic
  const relevanceGap = (80 - r) / 100;

  return {
    semantic: groundednessGap * 0.5 + relevanceGap * 0.5,
    keyword: coverageGap * 0.4 - groundednessGap * 0.2,
    authority: utilizationGap * 0.3,
    recency: -utilizationGap * 0.1, // Less recency when utilization is low
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function storeFeedbackHistory(entry: FeedbackEntry): void {
  if (typeof window === "undefined") return;
  try {
    const stored = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( HISTORY_KEY);
    const history: FeedbackEntry[] = stored ? JSON.parse(stored) : [];
    history.push(entry);
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    if (typeof window !== "undefined") localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* quota */ }
}

/**
 * Get all weight profiles for diagnostics.
 */
export function getAllWeightProfiles(): Record<string, WeightProfile> {
  initialize();
  return { ..._profiles };
}

/**
 * Reset weights to defaults for a query type.
 */
export function resetWeights(queryType?: string): void {
  if (typeof window === "undefined") return;
  initialize();
  if (queryType) {
    delete _profiles[queryType];
  } else {
    _profiles = {};
  }
  persist();
}
