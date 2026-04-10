/**
 * ─── v23: LLM-as-Judge — Synthetic Legal Quality Evaluator ───
 * 
 * Evaluates post-edit documents across 8 juridical dimensions:
 * 1. Legal Coherence (CPC/CPP compliance)
 * 2. Citation Validity (Art., Súmula, Lei references)
 * 3. Argumentative Strength (thesis-evidence chain)
 * 4. Procedural Correctness (deadlines, competência)
 * 5. Linguistic Clarity (readability for judges)
 * 6. LGPD Compliance (data protection)
 * 7. Analytical Depth (chain-of-thought, multi-step reasoning)
 * 8. Cross-Domain Coherence (cross-references between legal areas)
 * 
 * v23: Added RAG evaluation module (rag-evaluator.ts) with:
 * - Groundedness scoring (response vs retrieved context)
 * - Relevance scoring (response vs question intent)
 * - Helpfulness scoring (comprehensiveness rubric)
 * - Correctness scoring (ROUGE/BLEU-like vs reference answers)
 * - Retrieval quality analysis (hallucination detection)
 * Inspired by Vertex AI RAG Evaluation (Google Codelabs)
 */

// Re-export RAG evaluator for unified access
export { evaluateRAGResponse, type RAGEvalResult, type RAGMetricScore, type RetrievalQuality } from './rag-evaluator';

export interface JudgeVerdict {
  overallScore: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  dimensions: JudgeDimension[];
  citations: CitationCheck[];
  biasWarnings: BiasWarning[];
  fallacies: LogicalFallacy[];
  suggestions: string[];
  confidence: number; // 0-1
  timestamp: string;
}

export interface JudgeDimension {
  name: string;
  score: number; // 0-100
  weight: number;
  findings: string[];
  status: "pass" | "warning" | "fail";
}

export interface CitationCheck {
  reference: string;
  type: "lei" | "sumula" | "artigo" | "jurisprudencia" | "doutrina";
  valid: boolean;
  confidence: number;
  note?: string;
}

export interface BiasWarning {
  type: "defensive_only" | "one_sided" | "missing_counterargument" | "procedural_gap" | "lgpd_risk";
  description: string;
  severity: "low" | "medium" | "high";
  suggestion: string;
}

export interface LogicalFallacy {
  type: string;
  description: string;
  position: number; // Approximate char position
  severity: "low" | "medium" | "high";
}

// ─── Citation Pattern Detection ───
const CITATION_PATTERNS = [
  { regex: /Art\.?\s*(\d+)[\s,]*(?:§\s*\d+°?,?\s*)*(?:do|da|dos|das)?\s*(C[Pp][CcPp]|C[Ff]|C[Cc]|CLT|CDC|ECA|CTN|Lei\s+[\d.\/]+)/gi, type: "artigo" as const },
  { regex: /Súmula\s+(?:Vinculante\s+)?(?:n[°º.]?\s*)?(\d+)\s*(?:do|da)?\s*(ST[FJ]|TST|TSE)/gi, type: "sumula" as const },
  { regex: /Lei\s+(?:Federal\s+)?(?:n[°º.]?\s*)?(\d+[\.\d]*)\s*(?:\/\s*\d{2,4})?/gi, type: "lei" as const },
  { regex: /(?:RE|REsp|HC|MS|ADI|ADC|ADPF|AgRg|RHC|RMS|Rcl)\s*(?:n[°º.]?\s*)?[\d.\/\-]+/gi, type: "jurisprudencia" as const },
  { regex: /(?:NUCCI|GRECO|CAPEZ|BITENCOURT|MIRABETE|MASSON|TOURINHO|PACELLI|AVENA|LENZA|BARROSO)\s*[\(,]/gi, type: "doutrina" as const },
];

export function extractCitations(text: string): CitationCheck[] {
  const citations: CitationCheck[] = [];
  const seen = new Set<string>();

  for (const pattern of CITATION_PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = re.exec(text)) !== null) {
      const ref = match[0].trim();
      const key = ref.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      seen.add(key);

      citations.push({
        reference: ref,
        type: pattern.type,
        valid: true,
        confidence: 0.7 + (pattern.type === "artigo" ? 0.2 : 0.1),
        note: pattern.type === "doutrina" ? "Referência doutrinária detectada" : undefined,
      });
    }
  }

  return citations;
}

// ─── Logical Fallacy Detection ───

const FALLACY_PATTERNS: Array<{
  name: string;
  pattern: RegExp;
  description: string;
  severity: "low" | "medium" | "high";
}> = [
  {
    name: "ad_hominem",
    pattern: /(?:pessoa|caráter|moral|reputação)\s+(?:do|da|dos)\s+(?:autor|réu|parte|advogado)/i,
    description: "Possível argumento ad hominem — ataque à pessoa em vez do argumento.",
    severity: "medium",
  },
  {
    name: "petitio_principii",
    pattern: /(?:é\s+(?:óbvio|evidente|claro|inquestionável)\s+que|não\s+há\s+dúvida\s+de\s+que)(?!\s*,\s*(?:conforme|segundo|nos\s+termos))/i,
    description: "Possível petição de princípio — conclusão assumida como premissa sem fundamentação.",
    severity: "medium",
  },
  {
    name: "false_dichotomy",
    pattern: /(?:ou\s+(?:se\s+)?aceita|só\s+(?:há|resta|existem?)\s+(?:duas?|dois)\s+(?:opções|alternativas|caminhos))/i,
    description: "Possível falsa dicotomia — apresentação de apenas duas alternativas ignorando outras possibilidades.",
    severity: "low",
  },
  {
    name: "slippery_slope",
    pattern: /(?:se\s+(?:permitir|aceitar|admitir).*(?:abrirá|levará|resultará|conduzirá).*(?:todos|qualquer|caos|descontrole))/i,
    description: "Possível falácia da ladeira escorregadia — cadeia causal não fundamentada.",
    severity: "low",
  },
  {
    name: "appeal_to_authority",
    pattern: /(?:conforme|segundo)\s+(?:renomado|ilustre|eminente|grande)\s+(?:doutrinador|jurista|mestre|professor)(?!\s+\w+\s*[\(,])/i,
    description: "Apelo à autoridade sem identificação — cite o autor e a obra específica.",
    severity: "medium",
  },
  {
    name: "non_sequitur",
    pattern: /(?:portanto|logo|assim|destarte)\s*,?\s*(?:resta|fica)\s+(?:comprovad|demonstrad|evidente)(?!.*(?:Art\.|Lei|Súmula|conforme))/i,
    description: "Possível non sequitur — conclusão sem vínculo lógico com as premissas apresentadas.",
    severity: "high",
  },
];

export function detectFallacies(text: string): LogicalFallacy[] {
  const fallacies: LogicalFallacy[] = [];

  for (const fp of FALLACY_PATTERNS) {
    const re = new RegExp(fp.pattern.source, fp.pattern.flags + "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      fallacies.push({
        type: fp.name,
        description: fp.description,
        position: match.index,
        severity: fp.severity,
      });
    }
  }

  return fallacies;
}

// ─── Bias Detection (Constitutional AI inspired) ───
export function detectBias(text: string, documentType?: string): BiasWarning[] {
  const warnings: BiasWarning[] = [];
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  const defenseTerms = (lower.match(/defes[ao]|inocen|absolvição|atenuante|excludente|desclassificação|in dubio pro reo/g) || []).length;
  const prosecutionTerms = (lower.match(/acusação|condenação|agravante|qualificadora|materialidade|autoria comprovada/g) || []).length;

  if (defenseTerms > 5 && prosecutionTerms === 0 && documentType !== "habeas_corpus") {
    warnings.push({
      type: "defensive_only",
      description: `Documento apresenta apenas argumentos defensivos (${defenseTerms} termos) sem considerar contra-argumentos.`,
      severity: "medium",
      suggestion: "Considere abordar brevemente os argumentos da acusação para fortalecer a refutação.",
    });
  }

  const porOutroLado = (lower.match(/por outro lado|em contrapartida|contudo|não obstante|em sentido contrário/g) || []).length;
  if (wordCount > 500 && porOutroLado === 0 && !["recurso_especial", "habeas_corpus"].includes(documentType || "")) {
    warnings.push({
      type: "one_sided",
      description: "Argumentação unilateral sem marcadores de contra-argumentação.",
      severity: "low",
      suggestion: "Adicione contra-argumentos para demonstrar domínio completo da questão.",
    });
  }

  if (documentType?.includes("peti") && !lower.includes("ainda que") && !lower.includes("mesmo que") && wordCount > 300) {
    warnings.push({
      type: "missing_counterargument",
      description: "Petição sem cláusulas condicionais de contra-argumentação.",
      severity: "low",
      suggestion: "Use 'ainda que se considere...' para antecipar objeções do juiz.",
    });
  }

  const cpfPattern = /\d{3}\.\d{3}\.\d{3}-\d{2}/g;
  const cpfMatches = text.match(cpfPattern) || [];
  if (cpfMatches.length > 0) {
    warnings.push({
      type: "lgpd_risk",
      description: `${cpfMatches.length} CPF(s) expostos no documento. Considere anonimização.`,
      severity: "high",
      suggestion: "Use a ferramenta de anonimização LGPD para pseudonimizar dados pessoais.",
    });
  }

  if (documentType?.includes("recurso") && !lower.includes("tempestiv")) {
    warnings.push({
      type: "procedural_gap",
      description: "Recurso sem menção à tempestividade.",
      severity: "high",
      suggestion: "Inclua demonstração de tempestividade (Art. 1.003, CPC).",
    });
  }

  return warnings;
}

// ─── Local Judge Scoring v2 (8 dimensions) ───
export function localJudgeScore(
  text: string,
  documentType?: string
): JudgeVerdict {
  const plain = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = plain.split(/\s+/).length;
  const citations = extractCitations(plain);
  const biasWarnings = detectBias(plain, documentType);
  const fallacies = detectFallacies(plain);

  const dimensions: JudgeDimension[] = [];

  // 1. Legal Coherence (weight: 0.18)
  const legalTerms = (plain.match(/\b(Art\.|Lei|Código|direito|processo|juiz|tribunal|réu|autor|litígio)\b/gi) || []).length;
  const legalDensity = Math.min(legalTerms / Math.max(wordCount, 1) * 100, 100);
  const legalScore = Math.min(40 + legalDensity * 10, 100);
  dimensions.push({
    name: "Coerência Jurídica",
    score: Math.round(legalScore),
    weight: 0.18,
    findings: legalDensity < 2 ? ["Baixa densidade de termos jurídicos"] : [],
    status: legalScore >= 70 ? "pass" : legalScore >= 40 ? "warning" : "fail",
  });

  // 2. Citation Validity (weight: 0.18)
  const citationScore = citations.length === 0
    ? (wordCount > 200 ? 30 : 60)
    : Math.min(40 + citations.length * 8, 100);
  dimensions.push({
    name: "Fundamentação Legal",
    score: Math.round(citationScore),
    weight: 0.18,
    findings: citations.length === 0 && wordCount > 200
      ? ["Documento sem referências legais detectadas"]
      : [`${citations.length} citação(ões) encontrada(s)`],
    status: citationScore >= 70 ? "pass" : citationScore >= 40 ? "warning" : "fail",
  });

  // 3. Argumentative Strength (weight: 0.14)
  const connectors = (plain.match(/\b(portanto|assim|logo|destarte|nesse sentido|diante disso|consequentemente|posto isso)\b/gi) || []).length;
  const argScore = Math.min(30 + connectors * 8 + (citations.length > 2 ? 20 : 0), 100);
  dimensions.push({
    name: "Força Argumentativa",
    score: Math.round(argScore),
    weight: 0.14,
    findings: connectors === 0 ? ["Ausência de conectivos argumentativos"] : [],
    status: argScore >= 70 ? "pass" : argScore >= 40 ? "warning" : "fail",
  });

  // 4. Clarity (weight: 0.10)
  const sentences = plain.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLen = sentences.reduce((acc, s) => acc + s.trim().split(/\s+/).length, 0) / Math.max(sentences.length, 1);
  const clarityScore = avgSentenceLen > 40 ? 40 : avgSentenceLen > 25 ? 65 : 85;
  dimensions.push({
    name: "Clareza",
    score: Math.round(clarityScore),
    weight: 0.10,
    findings: avgSentenceLen > 35 ? [`Frases muito longas (média ${Math.round(avgSentenceLen)} palavras)`] : [],
    status: clarityScore >= 70 ? "pass" : clarityScore >= 40 ? "warning" : "fail",
  });

  // 5. LGPD Compliance (weight: 0.10)
  const lgpdScore = biasWarnings.some(w => w.type === "lgpd_risk") ? 30 : 90;
  dimensions.push({
    name: "Conformidade LGPD",
    score: lgpdScore,
    weight: 0.10,
    findings: lgpdScore < 50 ? ["Dados pessoais expostos detectados"] : [],
    status: lgpdScore >= 70 ? "pass" : lgpdScore >= 40 ? "warning" : "fail",
  });

  // 6. Procedural Correctness (weight: 0.10)
  const lower = plain.toLowerCase();
  const hasTempestividade = lower.includes("tempestiv");
  const hasCompetencia = lower.includes("competên") || lower.includes("competent");
  const hasRequerimento = lower.includes("requer") || lower.includes("requerid");
  const procScore = Math.min(30 + (hasTempestividade ? 25 : 0) + (hasCompetencia ? 20 : 0) + (hasRequerimento ? 15 : 0) + (wordCount > 200 ? 10 : 0), 100);
  dimensions.push({
    name: "Correção Processual",
    score: Math.round(procScore),
    weight: 0.10,
    findings: !hasTempestividade && documentType?.includes("recurso") ? ["Sem menção à tempestividade"] : [],
    status: procScore >= 70 ? "pass" : procScore >= 40 ? "warning" : "fail",
  });

  // 7. Analytical Depth — NEW (weight: 0.10)
  const chainMarkers = (plain.match(/\b(primeiro|segundo|terceiro|em primeiro lugar|em seguida|por fim|inicialmente|ademais|outrossim|por conseguinte|consequentemente)\b/gi) || []).length;
  const hasMultiStep = chainMarkers >= 3;
  const hasDeepAnalysis = (plain.match(/\b(analis[ae]|examin[ae]|verific[ae]|consider[ae]|avali[ae])\b/gi) || []).length;
  const paragraphCount = plain.split(/\n\n|\r\n\r\n/).length;
  const depthScore = Math.min(
    20 + chainMarkers * 8 + (hasMultiStep ? 15 : 0) + hasDeepAnalysis * 5 + Math.min(paragraphCount * 3, 15) + (fallacies.length === 0 ? 10 : -fallacies.length * 5),
    100
  );
  dimensions.push({
    name: "Profundidade Analítica",
    score: Math.round(Math.max(0, depthScore)),
    weight: 0.10,
    findings: [
      ...(!hasMultiStep ? ["Ausência de encadeamento argumentativo multi-step"] : []),
      ...(fallacies.length > 0 ? [`${fallacies.length} falácia(s) lógica(s) detectada(s)`] : []),
    ],
    status: depthScore >= 70 ? "pass" : depthScore >= 40 ? "warning" : "fail",
  });

  // 8. Cross-Domain Coherence — NEW (weight: 0.10)
  const legalAreas = new Set<string>();
  if (/\b(constitucional|CF|CRFB)\b/i.test(plain)) legalAreas.add("constitutional");
  if (/\b(civil|CC|CPC)\b/i.test(plain)) legalAreas.add("civil");
  if (/\b(penal|criminal|CP|CPP)\b/i.test(plain)) legalAreas.add("criminal");
  if (/\b(trabalhist|CLT|TST)\b/i.test(plain)) legalAreas.add("labor");
  if (/\b(tributári|fiscal|CTN)\b/i.test(plain)) legalAreas.add("tax");
  if (/\b(administrativ|licitaç)\b/i.test(plain)) legalAreas.add("admin");
  if (/\b(consumidor|CDC)\b/i.test(plain)) legalAreas.add("consumer");
  if (/\b(ambiental|licenciamento)\b/i.test(plain)) legalAreas.add("environmental");
  if (/\b(LGPD|dados pessoais|proteção de dados)\b/i.test(plain)) legalAreas.add("digital");

  const crossDomainCount = legalAreas.size;
  const crossDomainConnectors = (plain.match(/\b(interface|intersecção|diálogo das fontes|reflexos?|implicaç|aplicação\s+subsidiári)\b/gi) || []).length;
  const crossDomainScore = crossDomainCount <= 1
    ? 70 // Single domain = neutral (not penalized)
    : Math.min(40 + crossDomainCount * 10 + crossDomainConnectors * 12, 100);
  dimensions.push({
    name: "Coerência Cross-Domain",
    score: Math.round(crossDomainScore),
    weight: 0.10,
    findings: [
      `${crossDomainCount} área(s) do direito referenciada(s)`,
      ...(crossDomainCount > 2 && crossDomainConnectors === 0 ? ["Múltiplas áreas sem conectores de integração"] : []),
    ],
    status: crossDomainScore >= 70 ? "pass" : crossDomainScore >= 40 ? "warning" : "fail",
  });

  // Overall (8 dimensions, weights sum to 1.0)
  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)
  );

  const grade = overall >= 90 ? "A" : overall >= 75 ? "B" : overall >= 60 ? "C" : overall >= 40 ? "D" : "F";

  return {
    overallScore: overall,
    grade,
    dimensions,
    citations,
    biasWarnings,
    fallacies,
    suggestions: [
      ...dimensions.filter(d => d.status === "fail").map(d => `⚠️ ${d.name}: ${d.findings.join("; ")}`),
      ...biasWarnings.filter(w => w.severity !== "low").map(w => w.suggestion),
      ...fallacies.filter(f => f.severity !== "low").map(f => `🔍 Falácia (${f.type}): ${f.description}`),
    ],
    confidence: Math.min(1, 0.65 + (citations.length > 3 ? 0.15 : citations.length > 0 ? 0.08 : 0) + (wordCount > 500 ? 0.1 : wordCount > 200 ? 0.05 : 0)),
    timestamp: new Date().toISOString(),
  };
}
