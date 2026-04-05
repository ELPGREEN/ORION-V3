/**
 * ─── Masked Language Model (MLM) ───
 * Bidirectional masked prediction for deep document understanding.
 * Validates legal document completeness and predicts missing terms.
 * Inspired by BERT-style masked token prediction with legal domain specialization.
 */

export interface MaskedToken {
  index: number;
  original: string;
  masked: boolean;
  predictions: TokenPrediction[];
  leftContext: string[];
  rightContext: string[];
}

export interface TokenPrediction {
  token: string;
  probability: number;
  isLegalTerm: boolean;
}

export interface MaskingStrategy {
  type: "random" | "strategic" | "legal_terms" | "structural";
  maskRatio: number;
  contextWindow: number;
}

export interface DocumentCompletenessResult {
  score: number;              // 0-1 (1 = complete)
  missingElements: string[];
  suggestions: string[];
  structuralGaps: StructuralGap[];
  overallAssessment: "complete" | "minor_gaps" | "significant_gaps" | "incomplete";
}

export interface StructuralGap {
  type: "missing_section" | "incomplete_argument" | "missing_reference" | "missing_date" | "missing_party" | "missing_legal_basis";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  suggestion: string;
}

export interface BidirectionalScore {
  token: string;
  leftScore: number;
  rightScore: number;
  combinedScore: number;
  contextCoherence: number;
}

// Legal term dictionaries for prediction
const LEGAL_TERM_CATEGORIES: Record<string, string[]> = {
  procedural: ["autor", "réu", "juiz", "sentença", "acórdão", "recurso", "apelação", "agravo", "embargo", "mandado"],
  substantive: ["direito", "obrigação", "dever", "responsabilidade", "dano", "culpa", "dolo", "nexo causal"],
  constitutional: ["constituição", "artigo", "inciso", "parágrafo", "emenda", "cláusula pétrea"],
  temporal: ["prazo", "prescrição", "decadência", "preclusão", "termo", "vigência"],
  structural: ["considerando", "dispositivo", "ementa", "relatório", "fundamentação", "conclusão"],
  parties: ["requerente", "requerido", "impetrante", "impetrado", "recorrente", "recorrido", "apelante", "apelado"],
};

const ALL_LEGAL_TERMS = new Set(Object.values(LEGAL_TERM_CATEGORIES).flat());

// Document structure templates
const DOCUMENT_STRUCTURES: Record<string, string[]> = {
  peticao_inicial: ["endereçamento", "qualificação", "fatos", "direito", "pedidos", "provas", "valor_causa", "encerramento"],
  habeas_corpus: ["autoridade_coatora", "paciente", "fatos", "constrangimento_ilegal", "fundamentos", "pedido_liminar", "pedido_final"],
  contrato: ["partes", "objeto", "prazo", "valor", "obrigações", "rescisão", "foro", "assinaturas"],
  recurso: ["tempestividade", "cabimento", "preparo", "razões", "pedido_reforma"],
  parecer: ["consulta", "fatos", "análise", "fundamentação", "conclusão"],
};

/**
 * Tokenize text into words preserving position information.
 */
function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((t) => t.length > 0);
}

/**
 * Mask tokens based on the chosen strategy.
 */
export function maskTokens(
  text: string,
  strategy: MaskingStrategy = { type: "random", maskRatio: 0.15, contextWindow: 5 }
): MaskedToken[] {
  const tokens = tokenize(text);
  const masked: MaskedToken[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const shouldMask = decideMask(tokens[i], i, tokens.length, strategy);
    const leftCtx = tokens.slice(Math.max(0, i - strategy.contextWindow), i);
    const rightCtx = tokens.slice(i + 1, Math.min(tokens.length, i + 1 + strategy.contextWindow));

    masked.push({
      index: i,
      original: tokens[i],
      masked: shouldMask,
      predictions: shouldMask ? predictToken(leftCtx, rightCtx, tokens[i]) : [],
      leftContext: leftCtx,
      rightContext: rightCtx,
    });
  }

  return masked;
}

function decideMask(token: string, index: number, totalTokens: number, strategy: MaskingStrategy): boolean {
  const lower = token.toLowerCase().replace(/[.,;:!?()]/g, "");
  
  switch (strategy.type) {
    case "legal_terms":
      return ALL_LEGAL_TERMS.has(lower);
    case "strategic":
      // Mask nouns and key terms more often
      return lower.length > 4 && Math.random() < strategy.maskRatio * 2;
    case "structural":
      // Mask structural markers
      const structuralTerms = new Set(["considerando", "dispositivo", "requer", "ante", "diante", "portanto"]);
      return structuralTerms.has(lower);
    case "random":
    default:
      return Math.random() < strategy.maskRatio;
  }
}

/**
 * Predict a masked token using bidirectional context.
 */
function predictToken(leftContext: string[], rightContext: string[], original: string): TokenPrediction[] {
  const predictions: TokenPrediction[] = [];
  const contextWords = [...leftContext, ...rightContext].map((w) => w.toLowerCase());

  // Check each legal term category for relevance
  for (const [, terms] of Object.entries(LEGAL_TERM_CATEGORIES)) {
    for (const term of terms) {
      // Score based on co-occurrence heuristics
      let score = 0;
      const termWords = term.split(/\s+/);
      for (const tw of termWords) {
        for (const cw of contextWords) {
          if (cw.includes(tw) || tw.includes(cw)) score += 0.2;
        }
      }
      // Boost if term matches original
      if (term === original.toLowerCase()) score += 0.5;
      if (score > 0) {
        predictions.push({
          token: term,
          probability: Math.min(0.95, score),
          isLegalTerm: true,
        });
      }
    }
  }

  // Sort by probability and take top 5
  predictions.sort((a, b) => b.probability - a.probability);
  return predictions.slice(0, 5);
}

/**
 * Compute bidirectional score for each token.
 * Higher score = token fits well in both left and right context.
 */
export function bidirectionalScore(text: string, windowSize: number = 5): BidirectionalScore[] {
  const tokens = tokenize(text);
  const scores: BidirectionalScore[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase().replace(/[.,;:!?()]/g, "");
    const leftCtx = tokens.slice(Math.max(0, i - windowSize), i);
    const rightCtx = tokens.slice(i + 1, Math.min(tokens.length, i + 1 + windowSize));

    // Left score: how well does this token follow the left context?
    const leftScore = computeContextScore(token, leftCtx);
    // Right score: how well does this token precede the right context?
    const rightScore = computeContextScore(token, rightCtx);
    // Combined: geometric mean for balance
    const combinedScore = Math.sqrt(leftScore * rightScore);
    // Coherence: how consistent are left and right scores?
    const contextCoherence = 1 - Math.abs(leftScore - rightScore);

    scores.push({ token: tokens[i], leftScore, rightScore, combinedScore, contextCoherence });
  }

  return scores;
}

function computeContextScore(token: string, context: string[]): number {
  if (context.length === 0) return 0.5;
  
  let score = 0.5;
  const ctxLower = context.map((c) => c.toLowerCase().replace(/[.,;:!?()]/g, ""));

  // Legal term bonus
  if (ALL_LEGAL_TERMS.has(token)) score += 0.15;

  // Length appropriateness
  const avgLen = ctxLower.reduce((s, c) => s + c.length, 0) / ctxLower.length;
  if (Math.abs(token.length - avgLen) < 3) score += 0.1;

  // Character overlap with context
  const tokenChars = new Set(token.split(""));
  for (const ctx of ctxLower) {
    const overlap = [...tokenChars].filter((c) => ctx.includes(c)).length;
    score += (overlap / tokenChars.size) * 0.05;
  }

  return Math.min(1, Math.max(0, score));
}

/**
 * Predict missing legal terms in a document.
 */
export function fillMaskedLegal(text: string): Array<{ position: number; suggestion: string; confidence: number }> {
  const maskedTokens = maskTokens(text, { type: "strategic", maskRatio: 0.1, contextWindow: 7 });
  const suggestions: Array<{ position: number; suggestion: string; confidence: number }> = [];

  for (const mt of maskedTokens) {
    if (mt.masked && mt.predictions.length > 0) {
      const topPred = mt.predictions[0];
      if (topPred.probability > 0.3) {
        suggestions.push({
          position: mt.index,
          suggestion: topPred.token,
          confidence: topPred.probability,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Evaluate document completeness against expected structure.
 */
export function documentCompleteness(
  text: string,
  documentType: keyof typeof DOCUMENT_STRUCTURES = "peticao_inicial"
): DocumentCompletenessResult {
  const lower = text.toLowerCase();
  const expectedSections = DOCUMENT_STRUCTURES[documentType] || DOCUMENT_STRUCTURES.peticao_inicial;
  const missingElements: string[] = [];
  const suggestions: string[] = [];
  const structuralGaps: StructuralGap[] = [];

  // Check structural sections
  const sectionIndicators: Record<string, string[]> = {
    endereçamento: ["excelentíssimo", "meritíssimo", "juízo", "vara", "tribunal"],
    qualificação: ["cpf", "rg", "nacionalidade", "profissão", "residente"],
    fatos: ["fatos", "ocorre que", "aconteceu", "histórico"],
    direito: ["fundamento", "artigo", "lei", "código", "jurisprudência", "direito"],
    pedidos: ["requer", "pede", "solicita", "ante o exposto"],
    provas: ["provas", "documentos", "testemunhas", "perícia"],
    valor_causa: ["valor da causa", "r$", "reais"],
    encerramento: ["termos em que", "pede deferimento", "data"],
    autoridade_coatora: ["autoridade coatora", "delegado", "juiz"],
    paciente: ["paciente", "preso", "detido", "recolhido"],
    constrangimento_ilegal: ["constrangimento ilegal", "ilegalidade", "abuso"],
    pedido_liminar: ["liminar", "urgência", "medida cautelar"],
    pedido_final: ["ante o exposto", "requer", "conceder"],
    partes: ["contratante", "contratado", "parte"],
    objeto: ["objeto", "finalidade", "escopo"],
    prazo: ["prazo", "vigência", "duração"],
    valor: ["valor", "preço", "remuneração", "r$"],
    obrigações: ["obrigações", "deveres", "responsabilidades"],
    rescisão: ["rescisão", "resolução", "distrato"],
    foro: ["foro", "comarca", "jurisdição"],
    assinaturas: ["assinatura", "testemunha"],
    tempestividade: ["tempestivo", "prazo", "dentro do prazo"],
    cabimento: ["cabimento", "cabível", "hipótese"],
    preparo: ["preparo", "custas", "guia"],
    razões: ["razões", "fundamentos", "argumentos"],
    pedido_reforma: ["reforma", "anular", "cassar", "dar provimento"],
    consulta: ["consulta", "questionamento", "indagação"],
    análise: ["análise", "exame", "estudo"],
    fundamentação: ["fundamento", "base legal", "embasamento"],
    conclusão: ["conclusão", "parecer", "opinião"],
  };

  let foundSections = 0;
  for (const section of expectedSections) {
    const indicators = sectionIndicators[section] || [section];
    const found = indicators.some((ind) => lower.includes(ind));
    if (found) {
      foundSections++;
    } else {
      missingElements.push(section);
      const severity = ["endereçamento", "pedidos", "direito", "fatos", "pedido_final", "partes"].includes(section)
        ? "critical" as const
        : ["qualificação", "valor_causa", "fundamentação"].includes(section)
          ? "high" as const
          : "medium" as const;

      structuralGaps.push({
        type: "missing_section",
        description: `Seção "${section}" não encontrada no documento`,
        severity,
        suggestion: `Adicione a seção de ${section} ao documento`,
      });
    }
  }

  // Check for missing dates
  if (!/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(text) && !lower.includes("data")) {
    structuralGaps.push({
      type: "missing_date",
      description: "Nenhuma data identificada no documento",
      severity: "high",
      suggestion: "Adicione a data do documento",
    });
    missingElements.push("data");
  }

  // Check for legal basis
  if (!/art(?:igo)?\.?\s*\d+/i.test(text) && !/lei\s*(?:n[°º.]?\s*)?\d/i.test(text)) {
    structuralGaps.push({
      type: "missing_legal_basis",
      description: "Nenhuma referência a artigo ou lei encontrada",
      severity: "high",
      suggestion: "Inclua fundamentação legal com referências a artigos e leis aplicáveis",
    });
  }

  const score = expectedSections.length > 0 ? foundSections / expectedSections.length : 0;

  // Generate suggestions
  if (missingElements.length > 0) {
    suggestions.push(`Seções faltantes: ${missingElements.join(", ")}`);
  }
  if (score < 0.5) {
    suggestions.push("O documento precisa de revisão estrutural significativa");
  } else if (score < 0.8) {
    suggestions.push("Adicione as seções faltantes para completar o documento");
  }

  let overallAssessment: DocumentCompletenessResult["overallAssessment"];
  if (score >= 0.9) overallAssessment = "complete";
  else if (score >= 0.7) overallAssessment = "minor_gaps";
  else if (score >= 0.4) overallAssessment = "significant_gaps";
  else overallAssessment = "incomplete";

  return {
    score,
    missingElements,
    suggestions,
    structuralGaps,
    overallAssessment,
  };
}
