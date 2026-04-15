/**
 * ─── Semantic Cache (RAG) v2 ───
 * SHA-256 hash + TF-IDF weighted Jaccard similarity for query result caching.
 * TTL: 7 days with hit counter.
 * 
 * v2 Upgrades:
 * - 7-day TTL (168h) for longer memory retention
 * - Similarity threshold 0.72 for broader semantic matching
 * - TF-IDF weighting for legal term prioritization
 */

export interface CacheEntry {
  queryHash: string;
  queryText: string;
  queryTokens?: Set<string>; // Pre-calculated tokens for fuzzy matching
  queryTotalWeight?: number; // Pre-calculated total TF-IDF weight
  source: string;
  responseData: unknown;
  resultCount: number;
  hitCount: number;
  createdAt: number;
  expiresAt: number;
}

export interface CacheResult {
  hit: boolean;
  data?: unknown;
  source?: string;
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

// Simple hash for client-side (SHA-256 would be used server-side)
export function generateQueryHash(query: string, source: string): string {
  const normalized = normalizeQuery(query);
  const input = `${source}:${normalized}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// ─── TF-IDF Legal Term Weighting ───

const RARE_LEGAL_TERMS = new Set([
  "jurisprudência", "hermenêutica", "antinomia", "derrogação", "ab-rogação",
  "ultra petita", "extra petita", "citra petita", "venire contra factum",
  "suppressio", "surrectio", "tu quoque", "nemo auditur", "exceptio",
  "rebus sic stantibus", "pacta sunt servanda", "lex posterior", "lex specialis",
  "erga omnes", "inter partes", "stare decisis", "obiter dictum", "ratio decidendi",
  "distinguishing", "overruling", "modulação", "repercussão geral",
  "IRDR", "IAC", "amicus curiae", "habeas corpus", "mandamus",
  "litisconsórcio", "denunciação", "chamamento", "desaforamento",
  "preclusão", "coisa julgada", "litispendência", "conexão", "continência",
]);

const STOP_WORDS = new Set([
  "o", "a", "os", "as", "de", "do", "da", "dos", "das", "em", "no", "na",
  "nos", "nas", "por", "para", "com", "sem", "sob", "sobre", "que", "e",
  "ou", "mas", "se", "um", "uma", "uns", "umas", "ao", "aos", "à", "às",
  "é", "são", "foi", "ser", "ter", "como", "mais", "não", "sim",
]);

/**
 * TF-IDF weight for a term.
 * Assumes term is already normalized (lowercase).
 */
function getTermWeight(term: string): number {
  if (STOP_WORDS.has(term)) return 0;
  if (RARE_LEGAL_TERMS.has(term)) return 3.0; // High IDF for rare legal terms
  if (term.length > 8) return 1.5; // Longer terms tend to be more specific
  return 1.0;
}

/**
 * Calculates total weight of a token set.
 */
export function calculateSetWeight(tokens: Set<string>): number {
  let total = 0;
  for (const t of tokens) {
    total += getTermWeight(t);
  }
  return total;
}

/**
 * Extract tokens from text, filtering stop words and converting to lowercase.
 * Optimized for reuse in similarity loops.
 */
export function getWeightedTokens(text: string): Set<string> {
  const tokens = text.toLowerCase().split(/\s+/).filter(t => !STOP_WORDS.has(t));
  return new Set(tokens);
}

/**
 * Calculates TF-IDF weighted Jaccard similarity between two pre-computed token sets.
 * Uses pre-calculated total weights to avoid expensive union creation.
 * Formula: intersectionWeight / (weightA + weightB - intersectionWeight)
 */
export function tfidfWeightedJaccardFromSets(
  setA: Set<string>,
  weightA: number,
  setB: Set<string>,
  weightB: number
): number {
  if (weightA === 0 || weightB === 0) return 0;

  let intersectionWeight = 0;

  // Always iterate over the smaller set to find intersection
  if (setA.size <= setB.size) {
    for (const term of setA) {
      if (setB.has(term)) {
        intersectionWeight += getTermWeight(term);
      }
    }
  } else {
    for (const term of setB) {
      if (setA.has(term)) {
        intersectionWeight += getTermWeight(term);
      }
    }
  }

  const unionWeight = weightA + weightB - intersectionWeight;
  return unionWeight === 0 ? 0 : intersectionWeight / unionWeight;
}

export function tfidfWeightedJaccard(a: string, b: string): number {
  const setA = getWeightedTokens(a);
  const setB = getWeightedTokens(b);
  return tfidfWeightedJaccardFromSets(
    setA,
    calculateSetWeight(setA),
    setB,
    calculateSetWeight(setB)
  );
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export class SemanticCache {
  private entries: Map<string, CacheEntry> = new Map();
  private ttlMs: number;
  private similarityThreshold: number;

  constructor(ttlHours: number = 168, similarityThreshold: number = 0.72) {
    this.ttlMs = ttlHours * 3600 * 1000;
    this.similarityThreshold = similarityThreshold;
  }

  set(query: string, source: string, data: unknown, resultCount: number): void {
    const hash = generateQueryHash(query, source);
    const now = Date.now();
    const queryText = normalizeQuery(query);
    const queryTokens = getWeightedTokens(queryText);
    const queryTotalWeight = calculateSetWeight(queryTokens);

    this.entries.set(hash, {
      queryHash: hash,
      queryText,
      queryTokens,
      queryTotalWeight,
      source,
      responseData: data,
      resultCount,
      hitCount: 0,
      createdAt: now,
      expiresAt: now + this.ttlMs,
    });
  }

  get(query: string, source: string): CacheResult {
    const now = Date.now();
    const hash = generateQueryHash(query, source);

    // 1. Exact match
    const exact = this.entries.get(hash);
    if (exact && exact.expiresAt > now && exact.source === source) {
      exact.hitCount++;
      return { hit: true, data: exact.responseData, source: "exact" };
    }

    // 2. TF-IDF weighted fuzzy match
    const normalized = normalizeQuery(query);
    const queryTokens = getWeightedTokens(normalized);
    const queryWeight = calculateSetWeight(queryTokens);

    for (const entry of this.entries.values()) {
      if (entry.source !== source || entry.expiresAt <= now) continue;
      
      // Use pre-calculated tokens/weights if available
      const entryTokens = entry.queryTokens || getWeightedTokens(entry.queryText);
      const entryWeight = entry.queryTotalWeight || calculateSetWeight(entryTokens);

      const similarity = tfidfWeightedJaccardFromSets(
        queryTokens,
        queryWeight,
        entryTokens,
        entryWeight
      );

      if (similarity >= this.similarityThreshold) {
        entry.hitCount++;
        return { hit: true, data: entry.responseData, source: "fuzzy" };
      }
    }

    return { hit: false };
  }

  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
        removed++;
      }
    }
    return removed;
  }

  size(): number {
    return this.entries.size;
  }
}
