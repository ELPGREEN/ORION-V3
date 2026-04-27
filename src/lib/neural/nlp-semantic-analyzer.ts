/**
 * ─── NLP Semantic Analyzer (v1.1 — Bolt Optimized) ───
 * High-performance local PNL engine optimized for <2ms execution.
 * ⚡ Lightning Fast: Pre-compiled regex pool, single-pass matching, priority early-returns.
 */

// ─── Types ───

export interface LegalEntity {
  type: "article" | "law" | "court" | "party" | "date" | "monetary" | "tribunal_decision";
  value: string;
  normalized: string;
  position: number;
}

export interface SentimentResult {
  primary: "neutral" | "frustration" | "urgency" | "doubt" | "assertive" | "gratitude" | "confusion";
  intensity: number;
  indicators: string[];
}

export type DiscourseType =
  | "definition" | "comparison" | "procedure" | "analysis"
  | "listing" | "opinion" | "factual" | "conversational";

export interface SemanticAnalysis {
  entities: LegalEntity[];
  sentiment: SentimentResult;
  domain: string;
  discourseType: DiscourseType;
  resolvedText: string;
  complexity: "simple" | "medium" | "complex";
  analysisTimeMs: number;
}

// ─── ⚡ BOLT OPTIMIZATION: Pre-compiled Regex Pool ───

const ENTITY_RULES: Array<{ type: LegalEntity["type"]; regex: RegExp; normalize: (m: string[]) => string }> = [
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
    regex: /\b(STF|STJ|TST|TSE|TJ[A-Z]{2}|TRF\d?|TRT\d{1,2}|CNJ|CSJT|CNMP)\b/gi,
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
    regex: /R$\s*[\d.,]+(?:\s*(?:mil|milhões?|bilhões?))?/gi,
    normalize: (m) => m[0].replace(/\s+/g, " ").trim(),
  },
  {
    type: "party",
    regex: /\b(?:réu|ré|autor|autora|reclamante|reclamado|impetrante|impetrado|apelante|apelado|requerente|requerido)\b/gi,
    normalize: (m) => m[0].toLowerCase(),
  },
];

const SENTIMENT_RULES: Array<{ type: SentimentResult["primary"]; regex: RegExp }> = [
  { type: "frustration", regex: /\b(não\s+funciona|não\s+consigo|impossível|absurdo|ridículo|péssimo|horrível|inaceitável|frustrad)\b|[!]{2,}|\?{2,}/i },
  { type: "urgency", regex: /\b(urgente|urgência|imediato|agora|rápido|prazo|amanhã|hoje|emergência|socorro|help|preciso\s+urgente|por\s+favor\s+rápido)\b/i },
  { type: "doubt", regex: /\b(será\s+que|não\s+sei|dúvida|incert|talvez|possivelmente|pode\s+ser|acho\s+que)\b|\?\s*$/i },
  { type: "assertive", regex: /\b(quero|preciso|necessito|exijo|demando|faça|execute|implemente|crie|gere|obrigatoriamente|necessariamente|impreterivelmente)\b/i },
  { type: "gratitude", regex: /\b(obrigad[oa]|valeu|agradeço|gratidão|parabéns|excelente|ótimo|perfeito|maravilh)\b/i },
  { type: "confusion", regex: /\b(não\s+entendi|confus|perdid|como\s+assim|o\s+que\s+significa|explique\s+melhor|não\s+compreendi)\b/i },
];

const DOMAIN_RULES: Array<{ domain: string; regex: RegExp }> = [
  { domain: "penal", regex: /\b(crime|delito|pena|prisão|condenação|absolvição|inquérito|denúncia|furto|roubo|homicídio|lesão\s+corporal|tráfico|fraude|estelionato)\b/i },
  { domain: "trabalhista", regex: /\b(CLT|trabalhist|empregad|salário|hora\s+extra|rescisão|FGTS|férias|13[°º]|aviso\s+prévio|justa\s+causa|insalubridade|periculosidade)\b/i },
  { domain: "civil", regex: /\b(contrato|obriga[çc]|responsabilidade\s+civil|dano|indeni|penhora|execu[çc]|cobran[çc]|consumidor|CDC|locação|despejo)\b/i },
  { domain: "tributario", regex: /\b(tribut|imposto|ICMS|ISS|IRPF|IRPJ|contribui[çc]|fiscal|alíquota|isenção|imunidade|ITBI|IPTU|base\s+de\s+cálculo)\b/i },
  { domain: "constitucional", regex: /\b(constitui[çc]|fundamental|CF\/88|habeas|mandado\s+de\s+segurança|ADPF|ADI|ADC|controle\s+de\s+constitucionalidade|cláusula\s+pétrea)\b/i },
  { domain: "administrativo", regex: /\b(licitação|concurso\s+público|servidor|improbidade|pregão|edital|administra[çc]ão\s+pública|ato\s+administrativo|PAD)\b/i },
  { domain: "familia", regex: /\b(divórcio|guarda|pensão\s+aliment|alimentos|inventário|partilha|casamento|união\s+estável|adoção|tutela|curatela)\b/i },
  { domain: "digital", regex: /\b(LGPD|dados\s+pessoais|privacidade|Marco\s+Civil|internet|digital|cibernético|hacker|proteção\s+de\s+dados)\b/i },
  { domain: "previdenciario", regex: /\b(previdência|INSS|aposentadoria|benefício|auxílio|pensão\s+por\s+morte|BPC|LOAS|incapacidade)\b/i },
  { domain: "ambiental", regex: /\b(ambiental|meio\s+ambiente|poluição|desmatamento|licenciamento|IBAMA|fauna|flora|sustentabilidade)\b/i },
];

const DISCOURSE_PATTERNS = {
  definition: /^(?:o\s+que\s+[eé]|defin[ai]|conceit[ou]|signific)/i,
  comparison: /\b(?:diferen[çc]a|compar[ae]|versus|vs\.?|melhor\s+(?:entre|do\s+que))\b/i,
  procedure: /^(?:como\s+(?:fazer|funciona|proceder|solicitar)|passo\s+a\s+passo|procediment|qual\s+o\s+(?:procedimento|processo\s+para))/i,
  analysis: /\b(?:analis[ae]|avali[ae]|examin[ae]|verifiqu[ae]|coment[ae]\s+sobre)\b/i,
  listing: /\b(?:list[ae]|quais\s+são|enumere?|cit[ae]\s+(?:os|as)|diga\s+(?:os|as))\b/i,
  opinion: /\b(?:voc[eê]\s+acha|na\s+sua\s+opinião|o\s+que\s+voc[eê]\s+pensa|recomend[ae])\b/i,
  factual: /^(?:quando|onde|quem|qual|quanto)\b/i,
};

const COREFERENCE_REGEX = /\b(isso|isto|aquilo|o\s+mesmo|a\s+mesma|ele|ela|esse|essa|desse|dessa|nesse|nessa)\b/gi;
const TOPIC_EXTRACTOR = /\b(?:artigo|lei|decreto|contrato|processo|caso)\s+[\d.\/]+(?:\s+do\s+(?:c[oó]digo\s+penal|cpc|clt|cf|stf|stj))?/i;
const SUBJECT_EXTRACTOR = /([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/;

// ─── ⚡ Optimized Core Functions ───

export function extractLegalEntities(text: string): LegalEntity[] {
  const entities: LegalEntity[] = [];
  // Use a single loop over rules. Each rule's regex is pre-compiled.
  for (let i = 0; i < ENTITY_RULES.length; i++) {
    const rule = ENTITY_RULES[i];
    rule.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.regex.exec(text)) !== null) {
      entities.push({
        type: rule.type,
        value: match[0],
        normalized: rule.normalize(match as unknown as string[]),
        position: match.index,
      });
    }
  }
  return entities.length > 1 ? entities.sort((a, b) => a.position - b.position) : entities;
}

export function analyzeSentiment(text: string): SentimentResult {
  let indicators: string[] = [];
  let bestMatch: SentimentResult["primary"] = "neutral";
  let maxScore = 0;

  for (let i = 0; i < SENTIMENT_RULES.length; i++) {
    const rule = SENTIMENT_RULES[i];
    rule.regex.lastIndex = 0;
    const match = rule.regex.exec(text); // Single pass: test + capture (if needed)
    if (match) {
      const score = match[0].length; // Use match length as simple score
      if (score > maxScore) {
        maxScore = score;
        bestMatch = rule.type;
      }
      indicators.push(match[0].slice(0, 20));
    }
  }

  return {
    primary: bestMatch,
    intensity: Math.min(1, maxScore * 0.05 + (bestMatch !== "neutral" ? 0.3 : 0)),
    indicators,
  };
}

/** ⚡ BOLT: Early-return priority-based domain classification */
export function classifyLegalDomain(text: string): string {
  for (let i = 0; i < DOMAIN_RULES.length; i++) {
    if (DOMAIN_RULES[i].regex.test(text)) {
      return DOMAIN_RULES[i].domain;
    }
  }
  return "geral";
}

function detectDiscourseType(text: string): DiscourseType {
  if (DISCOURSE_PATTERNS.definition.test(text)) return "definition";
  if (DISCOURSE_PATTERNS.comparison.test(text)) return "comparison";
  if (DISCOURSE_PATTERNS.procedure.test(text)) return "procedure";
  if (DISCOURSE_PATTERNS.analysis.test(text)) return "analysis";
  if (DISCOURSE_PATTERNS.listing.test(text)) return "listing";
  if (DISCOURSE_PATTERNS.opinion.test(text)) return "opinion";
  if (DISCOURSE_PATTERNS.factual.test(text)) return "factual";
  return "conversational";
}

export function resolveCoreferences(text: string, recentContext: string = ""): string {
  if (!recentContext) return text;

  // Extract from context
  const topicMatch = TOPIC_EXTRACTOR.exec(recentContext);
  const subjectMatch = SUBJECT_EXTRACTOR.exec(recentContext);

  const contextTopic = topicMatch ? topicMatch[0] : "";
  const contextSubject = subjectMatch ? subjectMatch[1] : "";
  const replacement = contextTopic || contextSubject;

  if (!replacement) return text;

  return text.replace(COREFERENCE_REGEX, (match) => {
    // Basic heuristic: preserve case if first char is capitalized
    if (match[0] === match[0].toUpperCase()) {
      return replacement[0].toUpperCase() + replacement.slice(1);
    }
    return replacement;
  });
}

function assessComplexity(text: string, entities: LegalEntity[]): "simple" | "medium" | "complex" {
  const entityCount = entities.length;
  if (text.length > 300 || entityCount > 3) return "complex";
  if (text.length > 100 || entityCount > 1) return "medium";
  return "simple";
}

export function analyzeSemantics(text: string, workingMemoryContext: string = ""): SemanticAnalysis {
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
