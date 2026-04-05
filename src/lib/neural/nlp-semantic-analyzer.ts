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

// ─── Legal Entity Extraction ───

const ENTITY_PATTERNS: Array<{ type: LegalEntity["type"]; regex: RegExp; normalize: (m: RegExpExecArray) => string }> = [
  {
    type: "article",
    regex: /\b(?:art\.?|artigo)\s*(\d+(?:\s*,\s*§\s*\d+)?(?:\s*,?\s*(?:inciso|inc\.?)\s*[IVXLCDM]+)?)/gi,
    normalize: (m) => `Art. ${m[1].replace(/\s+/g, " ")}`,
  },
  {
    type: "law",
    regex: /\b(?:lei|decreto|resolução|portaria|medida\s+provisória|mp|código)\s*(?:n[.º°]?\s*)?[\d.\/]+(?:\/\d{2,4})?/gi,
    normalize: (m) => m[0].replace(/\s+/g, " ").trim(),
  },
  {
    type: "court",
    regex: /\b(STF|STJ|TST|TSE|TJ[A-Z]{2}|TRF\d?|TRT\d{1,2}|CNJ|CSJT|CNMP)\b/g,
    normalize: (m) => m[0].toUpperCase(),
  },
  {
    type: "tribunal_decision",
    regex: /\b(?:súmula|s[uú]mula\s+vinculante)\s*(?:n[.º°]?\s*)?\d+/gi,
    normalize: (m) => m[0].replace(/\s+/g, " ").trim(),
  },
  {
    type: "date",
    regex: /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g,
    normalize: (m) => m[1],
  },
  {
    type: "monetary",
    regex: /R\$\s*[\d.,]+(?:\s*(?:mil|milhões?|bilhões?))?/gi,
    normalize: (m) => m[0].replace(/\s+/g, " ").trim(),
  },
  {
    type: "party",
    regex: /\b(?:réu|ré|autor|autora|reclamante|reclamado|impetrante|impetrado|apelante|apelado|requerente|requerido)\b/gi,
    normalize: (m) => m[0].toLowerCase(),
  },
];

export function extractLegalEntities(text: string): LegalEntity[] {
  const entities: LegalEntity[] = [];
  for (const pattern of ENTITY_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      entities.push({
        type: pattern.type,
        value: match[0],
        normalized: pattern.normalize(match),
        position: match.index,
      });
    }
  }
  return entities.sort((a, b) => a.position - b.position);
}

// ─── Sentiment Analysis ───

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

function analyzeSentiment(text: string): SentimentResult {
  let bestMatch: SentimentResult["primary"] = "neutral";
  let bestScore = 0;
  const indicators: string[] = [];

  for (const [sentiment, patterns] of Object.entries(SENTIMENT_MARKERS) as [SentimentResult["primary"], RegExp[]][]) {
    if (sentiment === "neutral") continue;
    let matchCount = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        matchCount++;
        const m = text.match(pattern);
        if (m) indicators.push(m[0].slice(0, 20));
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

export function classifyLegalDomain(text: string): string {
  let bestDomain = "geral";
  let bestScore = 0;

  for (const [domain, pattern] of Object.entries(DOMAIN_PATTERNS)) {
    const matches = (text.match(pattern) || []).length;
    if (matches > bestScore) {
      bestScore = matches;
      bestDomain = domain;
    }
  }

  return bestDomain;
}

// ─── Discourse Type Detection ───

function detectDiscourseType(text: string): DiscourseType {
  const t = text.toLowerCase().trim();

  if (/^(?:o\s+que\s+[eé]|defin[ai]|conceit[ou]|signific)/i.test(t)) return "definition";
  if (/\b(?:diferen[çc]a|compar[ae]|versus|vs\.?|melhor\s+(?:entre|do\s+que))\b/i.test(t)) return "comparison";
  if (/^(?:como\s+(?:fazer|funciona|proceder|solicitar)|passo\s+a\s+passo|procediment|qual\s+o\s+(?:procedimento|processo\s+para))/i.test(t)) return "procedure";
  if (/\b(?:analis[ae]|avali[ae]|examin[ae]|verifiqu[ae]|coment[ae]\s+sobre)\b/i.test(t)) return "analysis";
  if (/\b(?:list[ae]|quais\s+são|enumere?|cit[ae]\s+(?:os|as)|diga\s+(?:os|as))\b/i.test(t)) return "listing";
  if (/\b(?:voc[eê]\s+acha|na\s+sua\s+opinião|o\s+que\s+voc[eê]\s+pensa|recomend[ae])\b/i.test(t)) return "opinion";
  if (/^(?:quando|onde|quem|qual|quanto)\b/i.test(t)) return "factual";

  return "conversational";
}

// ─── Coreference Resolution (basic) ───

export function resolveCoreferences(text: string, recentContext: string = ""): string {
  if (!recentContext) return text;

  // Extract main subject from recent context
  const contextSubject = recentContext.match(/\b(?:sobre\s+)?([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/)?.[1] || "";
  const contextTopic = recentContext.match(/\b(?:artigo|lei|decreto|contrato|processo|caso)\s+[\d.\/]+/i)?.[0] || "";

  let resolved = text;

  // Replace anaphoric pronouns
  if (contextSubject) {
    resolved = resolved.replace(/\b(isso|isto|aquilo|o\s+mesmo|a\s+mesma|ele|ela|esse|essa|desse|dessa|nesse|nessa)\b/gi, (match) => {
      return contextTopic || contextSubject || match;
    });
  }

  return resolved;
}

// ─── Complexity Assessment ───

function assessComplexity(text: string, entities: LegalEntity[]): "simple" | "medium" | "complex" {
  const wordCount = text.split(/\s+/).length;
  const entityCount = entities.length;
  const hasMultipleClauses = (text.match(/\b(?:e|ou|mas|porém|contudo|entretanto|todavia)\b/gi) || []).length;

  if (wordCount > 40 || entityCount > 3 || hasMultipleClauses > 3) return "complex";
  if (wordCount > 15 || entityCount > 1 || hasMultipleClauses > 1) return "medium";
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
