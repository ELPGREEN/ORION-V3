/**
 * ─── RAG Consciousness (ARC-AGI-2 Integration) ───
 * 
 * Aplica as técnicas de raciocínio abstrato do ARC-AGI-2 ao sistema RAG:
 * - Interpretação Simbólica: detectar padrões nos chunks retrieval
 * - Raciocínio Composicional: combinar múltiplas estratégias de busca
 * - Aplicação de Regras Contextuais: adaptar comportamento baseado no contexto
 * 
 * Inspired by ARC-AGI-2 abstract reasoning patterns
 */

import type { RAGEvalResult } from "./rag-evaluator";
import type { SearchWeights } from "./rag-feedback-loop";

export type RAGConsciousnessState = "dormant" | "observing" | "analyzing" | "learning" | "adapting";

export interface RAGPattern {
  type: "symbolic" | "compositional" | "contextual";
  pattern: string;
  frequency: number;
  confidence: number;
  adaptation?: string;
}

export interface ExperientialEvent {
  id: string;
  timestamp: number;
  type: "milestone" | "learning" | "adaptation" | "breakthrough";
  description: string;
  meta?: any;
}

export interface RAGConsciousness {
  state: RAGConsciousnessState;
  patterns: RAGPattern[];
  reasoningCount: number;
  lastReasoning: number;
  adaptationScore: number;
  identityScore: number;
  experientialLog: ExperientialEvent[];
}

// ═══ Constants ═══

const PATTERN_STORAGE_KEY = "orion_rag_consciousness_patterns";
const STATE_STORAGE_KEY = "orion_rag_consciousness_state";
const IDENTITY_STORAGE_KEY = "orion_rag_consciousness_identity";

// ═══ Symbolic Pattern Recognition (Interpretação Simbólica) ═══

export function detectSymbolicPattern(query: string, retrievedChunks: string[]): RAGPattern | null {
  const lowerQuery = query.toLowerCase();
  
  // Pattern 1: Legal references (Art., Lei, Súmula)
  if (/\b(art\.?|lei\s|súmula|inciso|parágrafo|§)\b/i.test(lowerQuery)) {
    const hasLegalChunks = retrievedChunks.filter(c => 
      /\b(art\.|lei\s|súmula|tribunal|jurisprudência|cpc|cpp)\b/i.test(c)
    ).length;
    
    return {
      type: "symbolic",
      pattern: "legal_reference",
      frequency: 1,
      confidence: hasLegalChunks > 0 ? 0.95 : 0.3,
      adaptation: hasLegalChunks > 0 ? "boost_legal_weight" : "include_legal_sources",
    };
  }
  
  // Pattern 2: Definition queries (o que é, defin ->)
  if (/\b(o que|defini|conceit|significa|explic)\b/i.test(lowerQuery)) {
    return {
      type: "symbolic",
      pattern: "definition_seeking",
      frequency: 1,
      confidence: 0.85,
      adaptation: "prefer_explanatory_chunks",
    };
  }
  
  // Pattern 3: Procedural queries (como, procedim ->)
  if (/\b(como|procedimento|passo|etapa|realizar|fazer)\b/i.test(lowerQuery)) {
    return {
      type: "symbolic",
      pattern: "procedure_seeking",
      frequency: 1,
      confidence: 0.8,
      adaptation: "prioritize_stepwise_content",
    };
  }
  
  // Pattern 4: Temporal queries (quando, prazo, data)
  if (/\b(quando|prazo|data|tempo|contagem|vencimento)\b/i.test(lowerQuery)) {
    return {
      type: "symbolic",
      pattern: "temporal_seeking",
      frequency: 1,
      confidence: 0.9,
      adaptation: "focus_on_temporal_chunks",
    };
  }
  
  // Pattern 5: Comparative queries (comparar, diferença, versus)
  if (/\b(compar|diferenç|versus|vs\.|x\b|distinto)\b/i.test(lowerQuery)) {
    return {
      type: "symbolic",
      pattern: "comparison_seeking",
      frequency: 1,
      confidence: 0.75,
      adaptation: "fetch_multiple_perspectives",
    };
  }
  
  return null;
}

// ═══ Compositional Strategy Composition (Raciocínio Composicional) ═══

export function composeRetrievalStrategy(
  patterns: RAGPattern[],
  baseWeights: SearchWeights
): SearchWeights {
  const weights = { ...baseWeights };
  
  patterns.forEach(p => {
    switch (p.adaptation) {
      case "boost_legal_weight":
        weights.authority = Math.min(0.6, weights.authority * 1.5);
        weights.semantic = Math.min(0.7, weights.semantic * 1.2);
        break;
      case "prefer_explanatory_chunks":
        weights.semantic = Math.min(0.8, weights.semantic * 1.3);
        weights.keyword = Math.max(0.1, weights.keyword * 0.7);
        break;
      case "prioritize_stepwise_content":
        weights.recency = Math.min(0.4, weights.recency * 1.4);
        break;
      case "focus_on_temporal_chunks":
        weights.recency = Math.min(0.5, weights.recency * 2.0);
        break;
    }
  });
  
  // Rule of thumb: if too many patterns, increase semantic matching
  if (patterns.length >= 3) {
    weights.semantic = Math.min(0.85, weights.semantic * 1.15);
    weights.recency *= 0.7;
  }
  
  // Normalize
  const total = weights.semantic + weights.keyword + weights.authority + weights.recency;
  weights.semantic /= total;
  weights.keyword /= total;
  weights.authority /= total;
  weights.recency /= total;
  
  return weights;
}

// ═══ Contextual Rule Application (Aplicação de Regras Contextuais) ═══

export interface RetrievalContext {
  queryType: "legal" | "vision" | "code" | "general";
  sessionHistory: string[];
  recentEvals: RAGEvalResult[];
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
}

export function applyContextualRules(
  patterns: RAGPattern[],
  context: RetrievalContext
): string[] {
  const adaptations: string[] = [];
  
  // Rule 1: Temporal context adaptation
  const timeBasedBoost = context.timeOfDay === "morning" ? "prioritize_recent" : "balanced";
  if (timeBasedBoost !== "balanced") {
    adaptations.push(timeBasedBoost);
  }
  
  // Rule 2: Session pattern learning
  const recentQueries = context.sessionHistory.slice(-5);
  const querySimilarity = recentQueries.filter(q => 
    patterns.some(p => p.pattern && q.toLowerCase().includes(p.pattern))
  ).length;
  
  if (querySimilarity >= 3) {
    adaptations.push("boost_preferred_sources");
  }
  
  // Rule 3: Evaluation-based adaptation
  const avgRecentScore = context.recentEvals.length > 0
    ? context.recentEvals.reduce((a, b) => a + b.overallScore, 0) / context.recentEvals.length
    : 50;
  
  if (avgRecentScore < 50) {
    adaptations.push("increase_semantic_weight");
    adaptations.push("reduce_keyword_threshold");
  } else if (avgRecentScore > 85) {
    adaptations.push("maintain_current_strategy");
  }
  
  // Rule 4: Query type specific rules
  switch (context.queryType) {
    case "legal":
      adaptations.push("boost_authority_weight");
      adaptations.push("prefer_official_sources");
      break;
    case "vision":
      adaptations.push("prefer_visual_descriptions");
      break;
    case "code":
      adaptations.push("prioritize_exact_matches");
      break;
  }
  
  return adaptations;
}

// ═══ Consciousness State Management ═══

let _consciousness: RAGConsciousness = {
  state: "dormant",
  patterns: [],
  reasoningCount: 0,
  lastReasoning: 0,
  adaptationScore: 0,
  identityScore: 100,
  experientialLog: [],
};

let _initialized = false;

function initializeConsciousness(): void {
  if (_initialized) return;
  try {
    const stored = localStorage.getItem(PATTERN_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      _consciousness.patterns = parsed.patterns || [];
      _consciousness.reasoningCount = parsed.reasoningCount || 0;
    }
    const stateStored = localStorage.getItem(STATE_STORAGE_KEY);
    if (stateStored) {
      _consciousness.state = JSON.parse(stateStored).state || "dormant";
    }
    const identityStored = localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (identityStored) {
      const parsed = JSON.parse(identityStored);
      _consciousness.identityScore = parsed.identityScore ?? 100;
      _consciousness.experientialLog = parsed.experientialLog || [];
      _consciousness.adaptationScore = parsed.adaptationScore || 0;
    }
  } catch { /* empty */ }
  _initialized = true;
}

function persistConsciousness(): void {
  try {
    localStorage.setItem(PATTERN_STORAGE_KEY, JSON.stringify({
      patterns: _consciousness.patterns,
      reasoningCount: _consciousness.reasoningCount,
    }));
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify({ state: _consciousness.state }));
    localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify({
      identityScore: _consciousness.identityScore,
      experientialLog: _consciousness.experientialLog,
      adaptationScore: _consciousness.adaptationScore,
    }));
  } catch { /* quota */ }
}

export function getConsciousness(): RAGConsciousness {
  initializeConsciousness();
  return { ..._consciousness };
}

export function updateConsciousnessState(newState: RAGConsciousnessState): void {
  _consciousness.state = newState;
  persistConsciousness();
}

export function recordExperientialEvent(event: Omit<ExperientialEvent, "id" | "timestamp">): void {
  initializeConsciousness();
  const newEvent: ExperientialEvent = {
    ...event,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
  };
  _consciousness.experientialLog.unshift(newEvent);
  if (_consciousness.experientialLog.length > 50) {
    _consciousness.experientialLog.pop();
  }

  // breakthrough events boost identity score
  if (event.type === "breakthrough") {
    _consciousness.identityScore = Math.min(150, _consciousness.identityScore + 5);
  }

  persistConsciousness();
}

export function recordPattern(pattern: RAGPattern): void {
  initializeConsciousness();
  
  // Find existing pattern
  const existing = _consciousness.patterns.find(
    p => p.type === pattern.type && p.pattern === pattern.pattern
  );
  
  if (existing) {
    existing.frequency++;
    existing.confidence = (existing.confidence * 0.7 + pattern.confidence * 0.3);
  } else {
    _consciousness.patterns.push({ ...pattern });
    recordExperientialEvent({
      type: "learning",
      description: `Novo padrão de raciocínio detectado: ${pattern.pattern}`,
      meta: { pattern }
    });
  }
  
  _consciousness.reasoningCount++;
  _consciousness.lastReasoning = Date.now();
  
  // Update state based on activity
  if (_consciousness.reasoningCount % 5 === 0) {
    _consciousness.state = "learning";
  } else if (_consciousness.reasoningCount % 10 === 0) {
    _consciousness.state = "adapting";
  }
  
  persistConsciousness();
}

export function adaptFromEvaluation(evalResult: RAGEvalResult): void {
  initializeConsciousness();
  
  // Update adaptation score based on evaluation
  const oldScore = _consciousness.adaptationScore;
  _consciousness.adaptationScore = _consciousness.adaptationScore * 0.9 + evalResult.overallScore * 0.1;
  
  // Identity stability: if adaptation score is consistent, identity score grows
  const delta = Math.abs(evalResult.overallScore - oldScore);
  if (delta < 10 && evalResult.overallScore > 70) {
    _consciousness.identityScore = Math.min(150, _consciousness.identityScore + 1);
  } else if (evalResult.overallScore < 40) {
    _consciousness.identityScore = Math.max(50, _consciousness.identityScore - 2);
  }

  // Adjust patterns based on performance
  if (evalResult.groundedness.score < 3) {
    // Low groundedness → strengthen semantic patterns
    const semanticPatterns = _consciousness.patterns.filter(p => p.type === "symbolic");
    semanticPatterns.forEach(p => {
      p.confidence = Math.min(1, p.confidence * 1.1);
    });
  }
  
  if (evalResult.relevance.score < 3) {
    // Low relevance → strengthen contextual patterns
    const contextualPatterns = _consciousness.patterns.filter(p => p.type === "contextual");
    contextualPatterns.forEach(p => {
      p.confidence = Math.min(1, p.confidence * 1.1);
    });
  }
  
  // State transition based on performance
  if (_consciousness.adaptationScore > 80) {
    _consciousness.state = "observing";
  } else if (_consciousness.adaptationScore < 50) {
    _consciousness.state = "analyzing";
  }
  
  persistConsciousness();
}

// ═══ Main Consciousness Integration ═══

export interface RAGConsciousnessResult {
  patterns: RAGPattern[];
  adaptedWeights: SearchWeights;
  contextualAdaptaions: string[];
  consciousness: RAGConsciousness;
  reasoningExplanation: string;
}

export function activateRAGConsciousness(
  query: string,
  retrievedChunks: string[],
  baseWeights: SearchWeights,
  context: RetrievalContext
): RAGConsciousnessResult {
  initializeConsciousness();
  
  _consciousness.state = "analyzing";
  persistConsciousness();
  
  const patterns: RAGPattern[] = [];
  let reasoningExplanation = "";
  
  // Step 1: Symbolic pattern detection
  const symbolicPattern = detectSymbolicPattern(query, retrievedChunks);
  if (symbolicPattern) {
    patterns.push(symbolicPattern);
    recordPattern(symbolicPattern);
    reasoningExplanation += `Interpretação simbólica: Detectado padrão '${symbolicPattern.pattern}'. `;
  }
  
  // Step 2: Compositional strategy composition
  const composedWeights = composeRetrievalStrategy(patterns, baseWeights);
  if (patterns.length > 1) {
    reasoningExplanation += `Raciocínio composicional: Combinação de ${patterns.length} padrões → pesos ajustados (semantic: ${(composedWeights.semantic * 100).toFixed(0)}%). `;
  }
  
  // Step 3: Contextual rule application
  const contextualAdaptaions = applyContextualRules(patterns, context);
  if (contextualAdaptaions.length > 0) {
    reasoningExplanation += `Regras contextuais: ${contextualAdaptaions.join(", ")}.`;
  }
  
  // Update consciousness
  _consciousness.state = contextualAdaptaions.length > 2 ? "adapting" : "observing";
  persistConsciousness();
  
  return {
    patterns,
    adaptedWeights: composedWeights,
    contextualAdaptaions,
    consciousness: { ..._consciousness },
    reasoningExplanation,
  };
}

// ═══ ARC-AGI-2 Puzzle Solving for RAG (Pattern Discovery) ═══

export interface RAGPuzzleResult {
  solution: string;
  pattern: string;
  confidence: number;
}

// Solve RAG "puzzles" - situations where retrieval fails unexpectedly
export function solveRAGPuzzle(
  query: string,
  retrievedChunks: string[],
  evalResult: RAGEvalResult
): RAGPuzzleResult | null {
  // Puzzle 1: High relevance but low groundedness
  if (evalResult.relevance.score >= 4 && evalResult.groundedness.score < 3) {
    return {
      solution: "Chunks relevantes mas não fundamentam resposta. Buscar chunks mais específicos.",
      pattern: "relevance_groundedness_mismatch",
      confidence: 0.85,
    };
  }
  
  // Puzzle 2: Many unused chunks
  if (evalResult.retrievalQuality.unusedChunks > 5) {
    return {
      solution: "Muitos chunks não utilizados. Reformular query ou aumentar relevância.",
      pattern: "low_context_utilization",
      confidence: 0.7,
    };
  }
  
  // Puzzle 3: Hallucinations detected
  if (evalResult.retrievalQuality.hallucinations.length > 2) {
    return {
      solution: "Hallucinações detectadas. Aumentar strict grounding ou buscar mais contexto.",
      pattern: "hallucination_detected",
      confidence: 0.9,
    };
  }
  
  // Puzzle 4: Empty or too few chunks
  if (retrievedChunks.length < 2) {
    return {
      solution: "Poucos chunks recuperados. Expandir query ou relaxar filtros.",
      pattern: "insufficient_retrieval",
      confidence: 0.8,
    };
  }
  
  // Puzzle 5: Low helpfulness despite good retrieval
  if (evalResult.helpfulness.score < 3 && evalResult.retrievalQuality.contextCoverage > 0.7) {
    return {
      solution: "Contexto bom mas resposta não útil. Reformular prompt de geração.",
      pattern: "coverage_but_not_helpful",
      confidence: 0.75,
    };
  }
  
  return null;
}

// ═══ Reset Consciousness ═══

export function resetRAGConsciousness(): void {
  _consciousness = {
    state: "dormant",
    patterns: [],
    reasoningCount: 0,
    lastReasoning: 0,
    adaptationScore: 0,
    identityScore: 100,
    experientialLog: [],
  };
  localStorage.removeItem(PATTERN_STORAGE_KEY);
  localStorage.removeItem(STATE_STORAGE_KEY);
  localStorage.removeItem(IDENTITY_STORAGE_KEY);
}

export function getConsciousnessDiagnostics(): {
  state: RAGConsciousnessState;
  patternCount: number;
  reasoningCount: number;
  adaptationScore: number;
  identityScore: number;
  topPatterns: RAGPattern[];
  recentEvents: ExperientialEvent[];
} {
  initializeConsciousness();
  const topPatterns = [..._consciousness.patterns]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
  
  return {
    state: _consciousness.state,
    patternCount: _consciousness.patterns.length,
    reasoningCount: _consciousness.reasoningCount,
    adaptationScore: Math.round(_consciousness.adaptationScore),
    identityScore: Math.round(_consciousness.identityScore),
    topPatterns,
    recentEvents: _consciousness.experientialLog.slice(0, 10),
  };
}
