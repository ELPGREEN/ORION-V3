/**
 * ─── NLP Semantic Analyzer (v1.0 — Local PNL Engine) ───
 * Extracts semantic features from user input in <10ms.
 * Inspired by OpenJarvis (composable layers) and Cortex
 * (knowledge representation). All processing is local —
 * no LLM calls or network requests.
 */

// ─── Types ───

export interface LegalEntity {
  type: "article" | "law" | "court" | "party" | "date" | "monetary" | "tribunal_decision";
  value: string;
  normalized: string;
  position: number;
}

export interface SemanticAnalysis {
  entities: LegalEntity[];
  sentiment: SentimentResult;
  domain: string;
  discourseType: DiscourseType;
  resolvedText: string;
  complexity: "simple" | "medium" | "complex";
  analysisTimeMs: number;
}

export interface SentimentResult {
  primary: "neutral" | "frustration" | "urgency" | "doubt" | "assertive" | "gratitude" | "confusion";
  intensity: number; // 0-1
  indicators: string[];
}

export type DiscourseType =
  | "definition"    // "o que é..."
  | "comparison"    // "qual a diferença..."
  | "procedure"     // "como fazer..."
  | "analysis"      // "analise...", "avalie..."
  | "listing"       // "liste...", "quais são..."
  | "opinion"       // "você acha...", "na sua opinião..."
  | "factual"       // "quando...", "onde...", "quem..."
  | "conversational"; // general chat

// ─── Constants & Pre-compiled RegExps ───

const ARTICLE_REGEX = /\b(?:art\.?|artigo)\s*(\d+(?:\s*,\s*§\s*\d+)?(?:\s*,?\s*(?:inciso|inc\.?)\s*[IVXLCDM]+)?)/gi;
const LAW_REGEX = /\b(?:lei|decreto|resolução|portaria|medida\s+provisória|mp|código)\s*(?:n[.º°]?\s*)?[\d.\/]+(?:\/\d{2,4})?/gi;
const COURT_REGEX = /\b(STF|STJ|TST|TSE|TJ[A-Z]{2}|TRF\d?|TRT\d{1,2}|CNJ|CSJT|CNMP)\b/g;
const TRIBUNAL_DECISION_REGEX = /\b(?:súmula|s[uú]mula\s+vinculante)\s*(?:n[.º°]?\s*)?\d+/gi;
const DATE_REGEX = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g;
const MONETARY_REGEX = /R\$\s*[\d.,]+(?:\s*(?:mil|milhões?|bilhões?))?/gi;
const PARTY_REGEX = /\b(?:réu|ré|autor|autora|reclamante|reclamado|impetrante|impetrado|apelante|apelado|requerente|requerido)\b/gi;

const ENTITY_PATTERNS: Array<{ type: LegalEntity["type"]; regex: RegExp; normalize: (m: RegExpExecArray | RegExpMatchArray) => string }> = [
  {
    type: "article",
    regex: ARTICLE_REGEX,
    normalize: (m) => `Art. ${m[1]!.replace(/\s+/g, " ")}`,
  },
  {
    type: "law",
    regex: LAW_REGEX,
    normalize: (m) => m[0].replace(/\s+/g, " ").trim(),
  },
  {
    type: "court",
    regex: COURT_REGEX,
    normalize: (m) => m[0].toUpperCase(),
  },
  {
    type: "tribunal_decision",
    regex: TRIBUNAL_DECISION_REGEX,
    normalize: (m) => m[0].replace(/\s+/g, " ").trim(),
  },
  {
    type: "date",
    regex: DATE_REGEX,
    normalize: (m) => m[1]!,
  },
  {
    type: "monetary",
    regex: MONETARY_REGEX,
    normalize: (m) => m[0].replace(/\s+/g, " ").trim(),
  },
  {
    type: "party",
    regex: PARTY_REGEX,
    normalize: (m) => m[0].toLowerCase(),
  },
];

const SENTIMENT_MARKERS: Record<SentimentResult["primary"], RegExp[]> = {
  frustration: [
    /\b(não\s+funciona|não\s+consigo|impossível|absurdo|ridículo|péssimo|horrível|inaceitável|frustrad)\b/i,
    /[!]{2,}|\?{2,}/,
  ],
  urgency: [
    /\b(urgente|urgência|imediato|agora|rápido|prazo|amanhã|hoje|emergência|socorro|help)\b/i,
    /\b(preciso\s+urgente|por\s+favor\s+rápido)\b/i,
  ],
  doubt: [
    /\b(será\s+que|não\s+sei|dúvida|incert|talvez|possivelmente|pode\s+ser|acho\s+que)\b/i,
    /\?\s*$/,
  ],
  assertive: [
    /\b(quero|preciso|necessito|exijo|demando|faça|execute|implemente|crie|gere)\b/i,
    /\b(obrigatoriamente|necessariamente|impreterivelmente)\b/i,
  ],
  gratitude: [
    /\b(obrigad[oa]|valeu|agradeço|gratidão|parabéns|excelente|ótimo|perfeito|maravilh)\b/i,
  ],
  confusion: [
    /\b(não\s+entendi|confus|perdid|como\s+assim|o\s+que\s+significa|explique\s+melhor|não\s+compreendi)\b/i,
  ],
  neutral: [],
};

const DOMAIN_PATTERNS: Record<string, RegExp> = {
  civil: /\b(contrato|obriga[çc]|responsabilidade\s+civil|dano|indeni|penhora|execu[çc]|cobran[çc]|consumidor|CDC|locação|despejo)\b/i,
  penal: /\b(crime|delito|pena|prisão|condenação|absolvição|inquérito|denúncia|furto|roubo|homicídio|lesão\s+corporal|tráfico|fraude|estelionato)\b/i,
  trabalhista: /\b(CLT|trabalhist|empregad|salário|hora\s+extra|rescisão|FGTS|férias|13[°º]|aviso\s+prévio|justa\s+causa|insalubridade|periculosidade)\b/i,
  tributario: /\b(tribut|imposto|ICMS|ISS|IRPF|IRPJ|contribui[çc]|fiscal|alíquota|isenção|imunidade|ITBI|IPTU|base\s+de\s+cálculo)\b/i,
  constitucional: /\b(constitui[çc]|fundamental|CF\/88|habeas|mandado\s+de\s+segurança|ADPF|ADI|ADC|controle\s+de\s+constitucionalidade|cláusula\s+pétrea)\b/i,
  administrativo: /\b(licitação|concurso\s+público|servidor|improbidade|pregão|edital|administra[çc]ão\s+pública|ato\s+administrativo|PAD)\b/i,
  familia: /\b(divórcio|guarda|pensão\s+aliment|alimentos|inventário|partilha|casamento|união\s+estável|adoção|tutela|curatela)\b/i,
  digital: /\b(LGPD|dados\s+pessoais|privacidade|Marco\s+Civil|internet|digital|cibernético|hacker|proteção\s+de\s+dados)\b/i,
  ambiental: /\b(ambiental|meio\s+ambiente|poluição|desmatamento|licenciamento|IBAMA|fauna|flora|sustentabilidade)\b/i,
  previdenciario: /\b(previdência|INSS|aposentadoria|benefício|auxílio|pensão\s+por\s+morte|BPC|LOAS|incapacidade)\b/i,
};

const DISCOURSE_DEFINITION_REGEX = /^(?:o\s+que\s+[eé]|defin[ai]|conceit[ou]|signific)/i;
const DISCOURSE_COMPARISON_REGEX = /\b(?:diferen[çc]a|compar[ae]|versus|vs\.?|melhor\s+(?:entre|do\s+que))\b/i;
const DISCOURSE_PROCEDURE_REGEX = /^(?:como\s+(?:fazer|funciona|proceder|solicitar)|passo\s+a\s+passo|procediment|qual\s+o\s+(?:procedimento|processo\s+para))/i;
const DISCOURSE_ANALYSIS_REGEX = /\b(?:analis[ae]|avali[ae]|examin[ae]|verifiqu[ae]|coment[ae]\s+sobre)\b/i;
const DISCOURSE_LISTING_REGEX = /\b(?:list[ae]|quais\s+são|enumere?|cit[ae]\s+(?:os|as)|diga\s+(?:os|as))\b/i;
const DISCOURSE_OPINION_REGEX = /\b(?:voc[eê]\s+acha|na\s+sua\s+opinião|o\s+que\s+voc[eê]\s+pensa|recomend[ae])\b/i;
const DISCOURSE_FACTUAL_REGEX = /^(?:quando|onde|quem|qual|quanto)\b/i;

const COREFERENCE_SUBJECT_REGEX = /\b(?:sobre\s+)?([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/;
const COREFERENCE_TOPIC_REGEX = /\b(?:artigo|lei|decreto|contrato|processo|caso)\s+[\d.\/]+/i;
const COREFERENCE_PRONOUN_REGEX = /\b(isso|isto|aquilo|o\s+mesmo|a\s+mesma|ele|ela|esse|essa|desse|dessa|nesse|nessa)\b/gi;

const COMPLEXITY_CLAUSE_REGEX = /\b(?:e|ou|mas|porém|contudo|entretanto|todavia)\b/gi;

// ─── Legal Entity Extraction ───

export function extractLegalEntities(text: string): LegalEntity[] {
  const entities: LegalEntity[] = [];
  for (const pattern of ENTITY_PATTERNS) {
    // Optimization: Pre-test before matchAll to avoid iterator allocation
    if (!pattern.regex.test(text)) continue;
    pattern.regex.lastIndex = 0;

    for (const match of text.matchAll(pattern.regex)) {
      entities.push({
        type: pattern.type,
        value: match[0],
        normalized: pattern.normalize(match),
        position: match.index!,
      });
    }
  }
  return entities.sort((a, b) => a.position - b.position);
}

// ─── Sentiment Analysis ───

function analyzeSentiment(text: string): SentimentResult {
  let bestMatch: SentimentResult["primary"] = "neutral";
  let bestScore = 0;
  const indicators: string[] = [];

  for (const [sentiment, patterns] of Object.entries(SENTIMENT_MARKERS) as [SentimentResult["primary"], RegExp[]][]) {
    if (sentiment === "neutral") continue;
    let matchCount = 0;
    for (const pattern of patterns) {
      // Optimization: Pre-test is faster for non-matching patterns (common case)
      if (!pattern.test(text)) continue;
      pattern.lastIndex = 0;

      const m = text.match(pattern);
      if (m) {
        matchCount++;
        indicators.push(m[0].slice(0, 20));
      }
    }
    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestMatch = sentiment;
    }
  }

  return {
    primary: bestMatch,
    intensity: Math.min(1, bestScore * 0.4 + (bestMatch !== "neutral" ? 0.3 : 0)),
    indicators,
  };
}

// ─── Legal Domain Classification ───

export function classifyLegalDomain(text: string): string {
  for (const [domain, pattern] of Object.entries(DOMAIN_PATTERNS)) {
    // Optimization: Domain classification early exit + pre-test
    if (pattern.test(text)) {
      pattern.lastIndex = 0;
      return domain;
    }
  }

  return "geral";
}

// ─── Discourse Type Detection ───

function detectDiscourseType(text: string): DiscourseType {
  const t = text.toLowerCase().trim();

  if (DISCOURSE_DEFINITION_REGEX.test(t)) return "definition";
  if (DISCOURSE_COMPARISON_REGEX.test(t)) return "comparison";
  if (DISCOURSE_PROCEDURE_REGEX.test(t)) return "procedure";
  if (DISCOURSE_ANALYSIS_REGEX.test(t)) return "analysis";
  if (DISCOURSE_LISTING_REGEX.test(t)) return "listing";
  if (DISCOURSE_OPINION_REGEX.test(t)) return "opinion";
  if (DISCOURSE_FACTUAL_REGEX.test(t)) return "factual";

  return "conversational";
}

// ─── Coreference Resolution (basic) ───

export function resolveCoreferences(text: string, recentContext: string = ""): string {
  if (!recentContext) return text;

  // Extract main subject from recent context
  const contextSubject = recentContext.match(COREFERENCE_SUBJECT_REGEX)?.[1] || "";
  const contextTopic = recentContext.match(COREFERENCE_TOPIC_REGEX)?.[0] || "";

  let resolved = text;

  // Replace anaphoric pronouns
  if (contextSubject) {
    resolved = resolved.replace(COREFERENCE_PRONOUN_REGEX, (match) => {
      return contextTopic || contextSubject || match;
    });
  }

  return resolved;
}

// ─── Complexity Assessment ───

function assessComplexity(text: string, entities: LegalEntity[]): "simple" | "medium" | "complex" {
  const entityCount = entities.length;
  if (entityCount > 3) return "complex";

  const words = text.trim().split(/\s+/);
  const wordCount = words.length;
  if (wordCount > 40) return "complex";

  // Optimization: use .test() for early clause detection or optimized match
  let clauseCount = 0;
  if (COMPLEXITY_CLAUSE_REGEX.test(text)) {
    COMPLEXITY_CLAUSE_REGEX.lastIndex = 0;
    const matches = text.match(COMPLEXITY_CLAUSE_REGEX);
    clauseCount = matches ? matches.length : 0;
  }

  if (clauseCount > 3) return "complex";
  if (wordCount > 15 || entityCount > 1 || clauseCount > 1) return "medium";
  return "simple";
}

// ─── Main: Full Semantic Analysis ───

export function analyzeSemantics(
  text: string,
  workingMemoryContext: string = ""
): SemanticAnalysis {
  const t0 = performance.now();

  const entities = extractLegalEntities(text);
  const sentiment = analyzeSentiment(text);
  const domain = classifyLegalDomain(text);
  const discourseType = detectDiscourseType(text);
  const resolvedText = resolveCoreferences(text, workingMemoryContext);
  const complexity = assessComplexity(text, entities);

  return {
    entities,
    sentiment,
    domain,
    discourseType,
    resolvedText,
    complexity,
    analysisTimeMs: performance.now() - t0,
  };
}
