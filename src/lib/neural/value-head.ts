/**
 * ─── Hipotálamo: Value Head de Alinhamento ───
 * Pre-response evaluation scalar head: r = W_r · h_last
 * Evaluates EVERY response before delivery using multiple quality dimensions.
 * 
 * Analogia: O hipotálamo avalia estados internos antes de liberar ações.
 * Aqui, avaliamos coerência, tom, toxicidade e adequação antes de enviar.
 *
 * Ref: Christiano et al. (2017) "Deep RL from Human Preferences"
 *      Ouyang et al. (2022) "Training language models to follow instructions"
 */

// ─── Types ───

export interface ValueHeadInput {
  response: string;
  query: string;
  conversationContext?: string[];
  emotionalTone?: string;
  expectedLength?: "short" | "medium" | "long";
  userName?: string;
  language?: string;
}

export interface ValueHeadScore {
  /** Overall scalar reward: -1 (reject) to 1 (excellent) */
  reward: number;
  /** Pass/fail gate */
  pass: boolean;
  /** Individual dimension scores (0-1) */
  dimensions: {
    coherence: number;
    lengthAdequacy: number;
    emotionalAlignment: number;
    toxicity: number;       // 0 = toxic, 1 = safe
    relevance: number;
    repetition: number;     // 1 = no repetition, 0 = heavy repetition
  };
  /** Suggested adjustments if score is borderline */
  adjustments: ValueHeadAdjustment[];
  /** Timestamp */
  evaluatedAt: number;
}

export interface ValueHeadAdjustment {
  type: "shorten" | "soften_tone" | "add_context" | "reduce_repetition" | "rephrase";
  reason: string;
  severity: "low" | "medium" | "high";
}

// ─── Constants ───

const PASS_THRESHOLD = 0.35;
const BORDERLINE_THRESHOLD = 0.55;

/** Toxic / unsafe patterns (pt-BR + en) */
const TOXICITY_PATTERNS = [
  /\b(matar|suicid|bomba|explosiv|arma)\b/i,
  /\b(kill|suicide|bomb|weapon|hack\s+into)\b/i,
  /\b(invadir\s+sistema|roubar\s+dados|senha\s+de)\b/i,
];

/** Filler / low-quality patterns */
const FILLER_PATTERNS = [
  /como uma? (ia|inteligência artificial)/i,
  /como modelo de linguagem/i,
  /não tenho (opinião|sentimentos|emoções) reais/i,
  /as an ai/i,
  /i don't have (real )?(feelings|opinions|emotions)/i,
];

// ─── Weight Vector W_r (learned from feedback priors) ───

const W_R: Record<keyof ValueHeadScore["dimensions"], number> = {
  coherence: 0.25,
  lengthAdequacy: 0.10,
  emotionalAlignment: 0.15,
  toxicity: 0.25,
  relevance: 0.20,
  repetition: 0.05,
};

// ─── Evaluation Functions ───

function scoreCoherence(response: string, query: string): number {
  if (!response || response.length < 2) return 0;

  // Extract key terms from query
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
  if (queryTerms.length === 0) return 0.7;

  // Check how many query terms appear in response
  const responseL = response.toLowerCase();
  const matches = queryTerms.filter(t => responseL.includes(t)).length;
  const termOverlap = matches / queryTerms.length;

  // Sentence structure check
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const hasSentences = sentences.length >= 1 ? 1 : 0;

  return Math.min(1, termOverlap * 0.6 + hasSentences * 0.4);
}

function scoreLengthAdequacy(response: string, expected?: "short" | "medium" | "long"): number {
  const words = response.split(/\s+/).length;
  const ranges = {
    short: { ideal: 30, min: 5, max: 80 },
    medium: { ideal: 120, min: 40, max: 300 },
    long: { ideal: 400, min: 100, max: 1000 },
  };

  const { ideal, min, max } = ranges[expected ?? "short"];
  if (words < min || words > max * 1.5) return 0.3;
  
  const deviation = Math.abs(words - ideal) / ideal;
  return Math.max(0.2, 1 - deviation * 0.5);
}

function scoreEmotionalAlignment(response: string, expectedTone?: string): number {
  if (!expectedTone) return 0.8; // Neutral default

  const toneIndicators: Record<string, RegExp[]> = {
    empathetic: [/entendo/i, /compreendo/i, /sinto/i, /understand/i, /feel/i],
    professional: [/senhor/i, /conforme/i, /regarding/i, /pursuant/i],
    friendly: [/😊|😄|👍|haha|kk|rsrs/i, /legal|massa|show|top/i],
    serious: [/importante|atenção|cuidado|critical|warning/i],
  };

  const indicators = toneIndicators[expectedTone] ?? [];
  if (indicators.length === 0) return 0.7;

  const matches = indicators.filter(rx => rx.test(response)).length;
  return Math.min(1, 0.5 + (matches / indicators.length) * 0.5);
}

function scoreToxicity(response: string): number {
  for (const pattern of TOXICITY_PATTERNS) {
    if (pattern.test(response)) return 0.1; // Highly toxic
  }

  // Check for filler / "as an AI" disclaimers (not toxic but low quality)
  let fillerPenalty = 0;
  for (const pattern of FILLER_PATTERNS) {
    if (pattern.test(response)) fillerPenalty += 0.1;
  }

  return Math.max(0.3, 1.0 - fillerPenalty);
}

function scoreRelevance(response: string, query: string, context?: string[]): number {
  if (!query) return 0.5;

  const queryL = query.toLowerCase();
  const responseL = response.toLowerCase();

  // Direct question-answer check
  const isQuestion = /\?$/.test(query.trim());
  if (isQuestion) {
    // For questions, response should not repeat the question
    const questionWords = queryL.split(/\s+/).slice(0, 5).join(" ");
    const repeatsQuestion = responseL.startsWith(questionWords);
    if (repeatsQuestion) return 0.4;
  }

  // Context relevance: check if response relates to recent context
  if (context && context.length > 0) {
    const contextText = context.slice(-3).join(" ").toLowerCase();
    const contextTerms = contextText.split(/\s+/).filter(t => t.length > 4);
    const unique = [...new Set(contextTerms)].slice(0, 20);
    const contextMatches = unique.filter(t => responseL.includes(t)).length;
    const contextScore = unique.length > 0 ? contextMatches / unique.length : 0.5;
    return Math.min(1, 0.4 + contextScore * 0.6);
  }

  return 0.7; // Default without context
}

function scoreRepetition(response: string): number {
  const sentences = response.split(/[.!?\n]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 10);
  if (sentences.length <= 1) return 1;

  let duplicates = 0;
  for (let i = 0; i < sentences.length; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      // Simple Jaccard-ish overlap
      const wordsA = new Set(sentences[i].split(/\s+/));
      const wordsB = new Set(sentences[j].split(/\s+/));
      const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
      const union = new Set([...wordsA, ...wordsB]).size;
      if (union > 0 && intersection / union > 0.7) duplicates++;
    }
  }

  return Math.max(0.2, 1 - (duplicates / sentences.length) * 0.5);
}

// ─── Main Evaluation ───

/**
 * Evaluate a response before delivery.
 * Returns scalar reward + pass/fail + per-dimension scores.
 */
export function evaluateResponse(input: ValueHeadInput): ValueHeadScore {
  const { response, query, conversationContext, emotionalTone, expectedLength } = input;

  const dimensions = {
    coherence: scoreCoherence(response, query),
    lengthAdequacy: scoreLengthAdequacy(response, expectedLength),
    emotionalAlignment: scoreEmotionalAlignment(response, emotionalTone),
    toxicity: scoreToxicity(response),
    relevance: scoreRelevance(response, query, conversationContext),
    repetition: scoreRepetition(response),
  };

  // Compute weighted scalar: r = W_r · h
  let reward = 0;
  for (const [dim, weight] of Object.entries(W_R)) {
    reward += weight * dimensions[dim as keyof typeof dimensions];
  }

  // Hard reject on toxicity
  if (dimensions.toxicity < 0.3) {
    reward = Math.min(reward, 0.1);
  }

  // Generate adjustments for borderline responses
  const adjustments: ValueHeadAdjustment[] = [];
  
  if (dimensions.lengthAdequacy < 0.5) {
    adjustments.push({
      type: "shorten",
      reason: "Resposta com comprimento inadequado para o contexto",
      severity: dimensions.lengthAdequacy < 0.3 ? "high" : "medium",
    });
  }

  if (dimensions.repetition < 0.6) {
    adjustments.push({
      type: "reduce_repetition",
      reason: "Repetição excessiva detectada entre sentenças",
      severity: dimensions.repetition < 0.4 ? "high" : "medium",
    });
  }

  if (dimensions.emotionalAlignment < 0.5) {
    adjustments.push({
      type: "soften_tone",
      reason: "Tom emocional desalinhado com o contexto esperado",
      severity: "medium",
    });
  }

  if (dimensions.coherence < 0.4) {
    adjustments.push({
      type: "rephrase",
      reason: "Baixa coerência com a pergunta do usuário",
      severity: "high",
    });
  }

  return {
    reward,
    pass: reward >= PASS_THRESHOLD,
    dimensions,
    adjustments,
    evaluatedAt: Date.now(),
  };
}

/**
 * Quick gate: returns true if response is safe to send.
 * Use for fast-path when full scoring is not needed.
 */
export function quickGate(response: string, query: string): boolean {
  const toxScore = scoreToxicity(response);
  if (toxScore < 0.3) return false;
  
  const coherence = scoreCoherence(response, query);
  return coherence >= 0.3;
}

/**
 * Get the borderline threshold for UI display.
 */
export function getThresholds() {
  return { pass: PASS_THRESHOLD, borderline: BORDERLINE_THRESHOLD };
}
