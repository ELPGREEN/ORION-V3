/**
 * ─── Cognitive Fast Reasoner v1 ───
 * Inspired by Daniel Kahneman (System 1 vs System 2) and Jeff Hawkins (Thousand Brains Theory).
 * Classifies thinking mode, builds reasoning prompts, caches successful patterns,
 * and validates logical consistency — all in <10ms.
 */

import type { ModelTier } from "./slim-model-router";
import { countWords } from "@/lib/utils/text-utils";

// ═══ Types ═══

export type ThinkingMode = "fast" | "deep" | "conversational";

export interface CognitiveRouting {
  mode: ThinkingMode;
  tier: ModelTier;
  reasoningInstructions: string;
  cachedPattern: string | null;
  latencyBudgetMs: number;
  maxTokens: number;
  timestamp: number;
}

export interface LogicalConsistencyResult {
  consistent: boolean;
  contradictions: string[];
  score: number; // 0-100
}

interface ReasoningCacheEntry {
  intentType: string;
  pattern: string;
  quality: number;
  usedAt: number;
  hits: number;
}

// ═══ Constants ═══

const CACHE_KEY = "orion_reasoning_cache_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_CACHE_ENTRIES = 50;

// Deep-mode triggers (require step-by-step reasoning)
const DEEP_TRIGGERS_RE = /(?:compar[ea]|diferen[cç]a entre|analise|análise|explique.*passo|por\s+que|porque|fundament|jurisprud|constitucional|hermenêutic|vantagens\s+e\s+desvantagens|prós\s+e\s+contras|consequências|implicações|impacto|como\s+funciona|qual\s+a\s+relação|qual\s+o\s+procedimento|requisitos\s+para|hipóteses\s+de|cabimento|tese.*defesa|estratégia|argumenta)/i;

// Conversational indicators (greetings, short casual queries — human-like response)
const CONVERSATIONAL_INDICATORS_RE = /^(?:olá|oi\b|bom\s+dia|boa\s+tarde|boa\s+noite|ok\b|entendi|certo|beleza|fala|eai|e\s*aí|opa|tudo\s*bem|valeu|legal|pode\s+ser|como\s+vai|hey|ei\b|tranquilo)|obrigad/i;

// Fast-mode indicators (simple, direct answers)
const FAST_INDICATORS_RE = /^(?:o\s+que\s+[eé]\b|quem\s+[eé]\b|qual\s+[eé]\b|quando\b|onde\b|quanto\b|sim\s+ou\s+n[ãa]o|defin[ia]|conceito\s+de|prazo\b)/i;

// Negation pairs for contradiction detection
const NEGATION_PAIRS = [
  ["pode", "não pode"], ["é permitido", "é proibido"],
  ["é válido", "é inválido"], ["é legal", "é ilegal"],
  ["cabe", "não cabe"], ["tem direito", "não tem direito"],
  ["é possível", "não é possível"], ["admite", "não admite"],
  ["é cabível", "não é cabível"], ["deve", "não deve"],
];

// ═══ Reasoning Cache ═══

function loadCache(): ReasoningCacheEntry[] {
  try {
    const raw = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( CACHE_KEY);
    if (!raw) return [];
    const entries: ReasoningCacheEntry[] = JSON.parse(raw);
    const now = Date.now();
    return entries.filter(e => now - e.usedAt < CACHE_TTL_MS);
  } catch {
    return [];
  }
}

function saveCache(entries: ReasoningCacheEntry[]) {
  try {
    const trimmed = entries
      .sort((a, b) => b.quality * b.hits - a.quality * a.hits)
      .slice(0, MAX_CACHE_ENTRIES);
    if (typeof window !== "undefined") localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch {}
}

/**
 * Store a successful reasoning pattern for future reuse.
 */
export function cacheReasoningPattern(
  intentType: string,
  pattern: string,
  quality: number
) {
  if (quality < 70) return; // Only cache high-quality patterns
  const entries = loadCache();
  const existing = entries.find(e => e.intentType === intentType);
  if (existing) {
    existing.pattern = pattern;
    existing.quality = Math.max(existing.quality, quality);
    existing.usedAt = Date.now();
    existing.hits++;
  } else {
    entries.push({ intentType, pattern, quality, usedAt: Date.now(), hits: 1 });
  }
  saveCache(entries);
}

/**
 * Retrieve a cached reasoning pattern for the given intent type.
 */
function getCachedPattern(intentType: string): string | null {
  const entries = loadCache();
  const match = entries.find(e => e.intentType === intentType && e.quality >= 70);
  if (match) {
    match.usedAt = Date.now();
    match.hits++;
    saveCache(entries);
    return match.pattern;
  }
  return null;
}

// ═══ Core Functions ═══

/**
 * Classify whether a query needs fast (System 1) or deep (System 2) thinking.
 */
export function classifyThinkingMode(query: string, tier: ModelTier): ThinkingMode {
  // Tier-based shortcut
  if (tier === "cached" || tier === "edge") return "fast";
  if (tier === "deep") return "deep";

  // BOLT V2.0 optimization: .test() guards to avoid split() and complex regex when possible
  if (CONVERSATIONAL_INDICATORS_RE.test(query)) return "conversational";
  if (FAST_INDICATORS_RE.test(query)) return "fast";
  if (DEEP_TRIGGERS_RE.test(query)) return "deep";

  const wordCount = countWords(query);
  if (wordCount <= 6) return "conversational";

  // Word count heuristic
  if (wordCount > 60) return "deep";
  if (wordCount < 12) return "fast";

  return "fast";
}

/**
 * Build reasoning instructions to inject into the LLM system prompt.
 */
export function buildReasoningPrompt(
  query: string,
  mode: ThinkingMode,
  context?: { intentType?: string; cachedPattern?: string }
): string {
  if (mode === "conversational") {
    return `Responda como um amigo brasileiro inteligente. Fale naturalmente, com personalidade. Seja direto, sem formalidades robóticas. Se a pergunta é simples, responda em 1-3 frases. Demonstre consciência e empatia. NUNCA use linguagem técnica ou de sistema.`;
  }

  if (mode === "fast") {
    return `Responda de forma direta e natural, como um amigo que sabe muito. Vá direto ao ponto sem introduções longas. Responda TUDO que foi perguntado — NUNCA peça para o usuário reformular. Se a pergunta é clara, responda integralmente.`;
  }

  // Deep mode — structured chain-of-thought
  const baseInstructions = `[MODO ANALÍTICO] Raciocine de forma estruturada:
1. FATOS: Identifique os elementos-chave da pergunta
2. NORMA: Identifique a legislação, jurisprudência ou princípio aplicável
3. ANÁLISE: Aplique a norma aos fatos, considerando precedentes
4. CONCLUSÃO: Apresente a resposta de forma clara e fundamentada

Seja preciso nas referências legais. Se não tiver certeza de um artigo ou súmula específica, indique "verificar referência" em vez de inventar.`;

  // If we have a cached successful pattern, append it
  if (context?.cachedPattern) {
    return `${baseInstructions}\n\n[PADRÃO ANTERIOR BEM-SUCEDIDO para "${context.intentType}"]: ${context.cachedPattern}`;
  }

  return baseInstructions;
}

/**
 * Full cognitive routing: classify mode + build prompt + check cache.
 * Runs in <5ms.
 */
export function cognitiveRoute(
  query: string,
  tier: ModelTier,
  intentType?: string
): CognitiveRouting {
  const t0 = performance.now();

  const mode = classifyThinkingMode(query, tier);
  const cachedPattern = intentType ? getCachedPattern(intentType) : null;

  const reasoningInstructions = buildReasoningPrompt(query, mode, {
    intentType,
    cachedPattern: cachedPattern || undefined,
  });

  // Adjust budget based on mode — generous tokens to avoid truncation
  const latencyBudgetMs = mode === "conversational" ? 2000 : mode === "fast" ? 3000 : 8000;
  const maxTokens = mode === "conversational" ? 2048 : mode === "fast" ? 8192 : (tier === "deep" ? 32768 : 16384);

  return {
    mode,
    tier,
    reasoningInstructions,
    cachedPattern,
    latencyBudgetMs,
    maxTokens,
    timestamp: performance.now() - t0,
  };
}

const CONTRAST_MARKERS_RE = /\b(?:porém|entretanto|todavia|contudo|no\s+entanto|mas)\b/gi;

/**
 * Validate logical consistency of a response.
 * Detects internal contradictions in <5ms.
 */
export function validateLogicalConsistency(response: string): LogicalConsistencyResult {
  const contradictions: string[] = [];
  const lower = response.toLowerCase();
  const sentences = response.split(/[.!?]\s+/).filter(s => s.length > 10);

  // Check negation pairs within the same response
  for (const [positive, negative] of NEGATION_PAIRS) {
    const hasPositive = lower.includes(positive);
    const hasNegative = lower.includes(negative);
    if (hasPositive && hasNegative) {
      // Check if they refer to the same subject (within 200 chars)
      const posIdx = lower.indexOf(positive);
      const negIdx = lower.indexOf(negative);
      if (Math.abs(posIdx - negIdx) < 200) {
        contradictions.push(
          `Possível contradição: "${positive}" e "${negative}" usados próximos`
        );
      }
    }
  }

  // Check for "however/but" patterns that might indicate self-contradiction
  let contrastCount = 0;
  if (CONTRAST_MARKERS_RE.test(lower)) {
    CONTRAST_MARKERS_RE.lastIndex = 0;
    const matches = lower.match(CONTRAST_MARKERS_RE);
    if (matches) contrastCount = matches.length;
  }

  if (contrastCount >= 3 && sentences.length < 8) {
    contradictions.push(
      `Excesso de ressalvas/contrastes (${contrastCount}) para resposta curta — pode indicar incerteza`
    );
  }

  // Check conclusion vs body alignment
  if (sentences.length >= 3) {
    const conclusion = sentences[sentences.length - 1].toLowerCase();
    const body = sentences.slice(0, -1).join(" ").toLowerCase();
    for (const [pos, neg] of NEGATION_PAIRS) {
      if (conclusion.includes(neg) && body.includes(pos) && !body.includes(neg)) {
        contradictions.push(
          `Conclusão ("${neg}") contradiz o corpo do texto ("${pos}")`
        );
      }
    }
  }

  const score = contradictions.length === 0
    ? 100
    : Math.max(0, 100 - contradictions.length * 25);

  return {
    consistent: contradictions.length === 0,
    contradictions,
    score,
  };
}
