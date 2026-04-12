/**
 * ─── Drafter-Critic Loop (v1.0 — Reflexion-Inspired) ───
 * Local quality evaluator for LLM responses. Inspired by
 * LangGraph's Drafter-Critic and Grok 4.20 Debate Rounds.
 *
 * Runs in <50ms using heuristic scoring (no LLM calls).
 * Only triggers refinement for deep-mode queries with low scores.
 */

// ─── Types ───

export interface DraftCritique {
  shouldRefine: boolean;
  score: number;
  critique: string;
  dimensions: {
    completeness: number;
    coherence: number;
    relevance: number;
    legalAccuracy: number;
    conciseness: number;
  };
}

export interface RefinementPrompt {
  systemAddendum: string;
  userPrompt: string;
}

// ─── Scoring Weights by Intent ───

const INTENT_WEIGHTS: Record<string, Record<string, number>> = {
  legal_search: { completeness: 0.3, coherence: 0.2, relevance: 0.2, legalAccuracy: 0.25, conciseness: 0.05 },
  document_analysis: { completeness: 0.25, coherence: 0.25, relevance: 0.2, legalAccuracy: 0.2, conciseness: 0.1 },
  general: { completeness: 0.2, coherence: 0.3, relevance: 0.25, legalAccuracy: 0.05, conciseness: 0.2 },
  textual: { completeness: 0.2, coherence: 0.3, relevance: 0.25, legalAccuracy: 0.05, conciseness: 0.2 },
};

// ─── Dimension Scorers ───

function scoreCompleteness(response: string, question: string): number {
  if (response.length < 30) return 0.1;
  if (response.length < 80) return 0.3;

  // Check if question keywords appear in response
  const qWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const rLow = response.toLowerCase();
  const covered = qWords.filter(w => rLow.includes(w)).length;
  const coverage = qWords.length > 0 ? covered / qWords.length : 0.5;

  // Bonus for structured responses
  const hasStructure = /\d+[.)]\s|•|─|artigo|lei\s+\d|§/i.test(response);
  const structureBonus = hasStructure ? 0.1 : 0;

  return Math.min(1, 0.4 + coverage * 0.5 + structureBonus);
}

function scoreCoherence(response: string): number {
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length <= 1) return 0.7;

  // Check for contradictions
  const hasContradiction = /\bmas\s+(na verdade|na realidade|porém|contudo)\b.*\b(não|nunca|jamais)\b/i.test(response);
  const contradictionPenalty = hasContradiction ? -0.2 : 0;

  // Check for repetition
  const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase().slice(0, 50)));
  const repetitionRatio = uniqueSentences.size / sentences.length;

  // Check logical connectors
  const connectors = (response.match(/\b(portanto|assim|logo|dessa forma|consequentemente|por isso|além disso|entretanto|contudo)\b/gi) || []).length;
  const connectorBonus = Math.min(0.15, connectors * 0.03);

  return Math.min(1, Math.max(0.1, 0.5 + repetitionRatio * 0.3 + connectorBonus + contradictionPenalty));
}

function scoreRelevance(response: string, question: string): number {
  const qWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const rLow = response.toLowerCase();

  if (qWords.length === 0) return 0.6;

  const hits = qWords.filter(w => rLow.includes(w)).length;
  const ratio = hits / qWords.length;

  // Penalty for very long responses to short questions (rambling)
  const qLen = question.length;
  const rLen = response.length;
  const lengthRatio = rLen / Math.max(qLen, 1);
  const ramblingPenalty = lengthRatio > 50 ? -0.15 : 0;

  return Math.min(1, Math.max(0.1, ratio * 0.7 + 0.3 + ramblingPenalty));
}

function scoreLegalAccuracy(response: string): number {
  // Check for legal citations/references
  const hasArticles = /\bart\.?\s*\d+|artigo\s+\d+/i.test(response);
  const hasLaws = /\blei\s+n?[.º°]?\s*[\d.]+/i.test(response);
  const hasCourts = /\b(STF|STJ|TST|TSE|TJ|TRF|TRT)\b/.test(response);
  const hasJurisprudence = /\b(súmula|precedente|jurisprud[eê]ncia|entendimento|acórdão)\b/i.test(response);

  let score = 0.4; // base
  if (hasArticles) score += 0.2;
  if (hasLaws) score += 0.15;
  if (hasCourts) score += 0.15;
  if (hasJurisprudence) score += 0.1;

  return Math.min(1, score);
}

function scoreConciseness(response: string, question: string): number {
  const qLen = question.length;
  const rLen = response.length;

  // Ideal response is 3-15x the question length
  const ratio = rLen / Math.max(qLen, 10);
  if (ratio < 1) return 0.3; // Too short
  if (ratio <= 3) return 0.9; // Perfect for simple questions
  if (ratio <= 10) return 0.8;
  if (ratio <= 20) return 0.6;
  if (ratio <= 40) return 0.4;
  return 0.2; // Way too verbose
}

// ─── Main: Score a Draft Response ───

export function scoreDraft(
  response: string,
  intentType: string,
  question: string
): DraftCritique {
  const weights = INTENT_WEIGHTS[intentType] || INTENT_WEIGHTS.general;

  const dimensions = {
    completeness: scoreCompleteness(response, question),
    coherence: scoreCoherence(response),
    relevance: scoreRelevance(response, question),
    legalAccuracy: scoreLegalAccuracy(response),
    conciseness: scoreConciseness(response, question),
  };

  const score =
    dimensions.completeness * weights.completeness +
    dimensions.coherence * weights.coherence +
    dimensions.relevance * weights.relevance +
    dimensions.legalAccuracy * weights.legalAccuracy +
    dimensions.conciseness * weights.conciseness;

  // Build critique for low dimensions
  const critiqueParts: string[] = [];
  if (dimensions.completeness < 0.4) critiqueParts.push("Resposta incompleta — faltam informações sobre os pontos da pergunta");
  if (dimensions.coherence < 0.5) critiqueParts.push("Coerência baixa — possíveis contradições ou repetições");
  if (dimensions.relevance < 0.4) critiqueParts.push("Pouca relevância — a resposta não aborda diretamente a pergunta");
  if (dimensions.legalAccuracy < 0.3 && intentType === "legal_search") critiqueParts.push("Sem referências legais — cite artigos, leis ou jurisprudência");
  if (dimensions.conciseness < 0.3) critiqueParts.push("Resposta excessivamente longa ou curta para o contexto");

  const critique = critiqueParts.join("; ");

  return {
    shouldRefine: score < 0.55 && critiqueParts.length > 0,
    score,
    critique,
    dimensions,
  };
}

// ─── Build Refinement Prompt ───

export function buildRefinementPrompt(
  originalResponse: string,
  critique: string,
  question: string
): RefinementPrompt {
  return {
    systemAddendum: `IMPORTANTE: Sua resposta anterior foi avaliada e precisa de melhorias:\n${critique}\n\nReescreva a resposta corrigindo os pontos indicados. Seja mais preciso e completo.`,
    userPrompt: `Pergunta original: ${question}\n\nSua resposta anterior (para melhorar):\n${originalResponse.slice(0, 500)}\n\nCrítica: ${critique}\n\nReescreva a resposta melhorada:`,
  };
}

// ─── Convenience: Should Refine? ───

export function shouldRefine(
  question: string,
  response: string,
  intentType: string,
  mode: string = "fast"
): { refine: boolean; critique: DraftCritique } {
  // Only refine in deep mode — fast mode always passes
  if (mode !== "deep") {
    return { refine: false, critique: scoreDraft(response, intentType, question) };
  }

  const critique = scoreDraft(response, intentType, question);
  return { refine: critique.shouldRefine, critique };
}
