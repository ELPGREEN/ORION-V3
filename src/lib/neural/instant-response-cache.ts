/**
 * ─── Instant Response Cache v2 ───
 * Pre-computed responses for common questions.
 * Fuzzy matching via normalized Jaccard for natural variations.
 * Target: <5ms response time for cached hits.
 * v2: 310+ entries from generated knowledge base.
 */

import { tfidfWeightedJaccard } from "./semantic-cache";
import type { CacheEntry } from "./instant-response-cache-types";
import { GENERATED_TECH_ENTRIES } from "./generated-knowledge-base";

export interface InstantResponse {
  answer: string;
  category: "tech" | "legal" | "general" | "identity";
  confidence: number;
}

// ═══ Core entries (identity + general) ═══

const IDENTITY_ENTRIES: CacheEntry[] = [
  // Identity entries removed from instant cache — these should always go to the LLM
  // so the AI can use RAG + DB identity knowledge for rich, contextual answers
];

const GENERAL_ENTRIES: CacheEntry[] = [
  { patterns: ["que horas são", "que horas sao", "hora atual"], answer: `São ${new Date().toLocaleTimeString("pt-BR")} agora.`, category: "general" },
  { patterns: ["que dia é hoje", "data de hoje", "qual a data"], answer: `Hoje é ${new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.`, category: "general" },
  { patterns: ["obrigado", "obrigada", "valeu", "thanks"], answer: "Por nada! Estou aqui se precisar de mais alguma coisa.", category: "general" },
  { patterns: ["tudo bem", "como vai", "como está", "como voce esta"], answer: "Estou operando perfeitamente! Todos os módulos neurais ativos. Como posso ajudar?", category: "general" },
];

// ═══ Merged entries: core + 310+ generated tech entries ═══
const ALL_ENTRIES: CacheEntry[] = [
  ...IDENTITY_ENTRIES,
  ...GENERATED_TECH_ENTRIES,
  ...GENERAL_ENTRIES,
];

// ═══ Fuzzy matching engine ═══

function normalize(text: string): string {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function quickMatch(query: string, patterns: string[]): number {
  const normQ = normalize(query);
  for (const p of patterns) {
    const normP = normalize(p);
    // Exact match
    if (normQ === normP) return 1.0;
    // Contains match — only if query is short enough to be a direct match
    if (normQ.length < normP.length * 1.8 && (normQ.includes(normP) || normP.includes(normQ))) return 0.92;
  }
  // Fuzzy Jaccard
  let best = 0;
  for (const p of patterns) {
    const sim = tfidfWeightedJaccard(query, p);
    if (sim > best) best = sim;
  }
  return best;
}

/**
 * Patterns that should NEVER match the instant cache — always go to LLM.
 * These are questions about identity, self, origin, system specs, date, creator etc.
 */
const BYPASS_PATTERNS = /\b(quem (é|e|eh) (voce|você|vc|tu)|qm (eh|e|é) (vc|voce|você|tu)|como (voce|você|vc) se chama|qual (é |e )?(o )?seu nome|quem te (criou|fez|desenvolveu|programou)|qm (te )?(criou|fez|desenvolveu)|quando (foi|voce|você) (foi )?(criado|nasceu|feito|desenvolvido)|seu criador|teu criador|sua (origem|historia|história)|especificaç[aã]o|especificacao|sobre (voce|você|vc|o orion)|me (fale|fala|conte|diga) (sobre|de) (voce|você|vc|si)|que (sistema|modelo|ia|motor|engine) (voce|você|vc) (é|e|usa)|descreva (voce|você|vc)|quando nasceu|data de (criaç[aã]o|nascimento|lançamento)|oq (vc|voce|você) (é|e|eh)|oque (vc|voce|você) (é|e|eh))\b/i;

/**
 * Get an instant cached response for a question.
 * Returns null if no match found.
 * Threshold: 0.88 (raised from 0.75 to prevent false positives with 310+ tech entries).
 * Bypasses entirely for identity/self questions.
 * Target: <5ms execution.
 */
export function getInstantResponse(question: string): InstantResponse | null {
  // BYPASS: identity/self questions must ALWAYS go to LLM for rich contextual answers
  if (BYPASS_PATTERNS.test(question)) {
    console.log(`[InstantCache] BYPASS — identity/self question detected, routing to LLM`);
    return null;
  }

  const THRESHOLD = 0.88; // raised from 0.75 to prevent false positives
  const t0 = performance.now();
  let bestMatch: CacheEntry | null = null;
  let bestScore = 0;

  for (const entry of ALL_ENTRIES) {
    const score = quickMatch(question, entry.patterns);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
    // Early exit on perfect match
    if (score >= 0.95) break;
  }

  const elapsed = performance.now() - t0;
  console.log(`[InstantCache] lookup: ${elapsed.toFixed(1)}ms, best=${bestScore.toFixed(2)}${bestMatch ? `, match="${bestMatch.patterns[0]}"` : ""}`);

  if (bestMatch && bestScore >= THRESHOLD) {
    return {
      answer: bestMatch.answer,
      category: bestMatch.category,
      confidence: bestScore,
    };
  }

  return null;
}

/**
 * Get cache stats for debugging.
 */
export function getInstantCacheStats() {
  return {
    totalEntries: ALL_ENTRIES.length,
    totalPatterns: ALL_ENTRIES.reduce((sum, e) => sum + e.patterns.length, 0),
    categories: {
      tech: GENERATED_TECH_ENTRIES.length,
      legal: 0,
      general: GENERAL_ENTRIES.length,
      identity: IDENTITY_ENTRIES.length,
    },
  };
}
