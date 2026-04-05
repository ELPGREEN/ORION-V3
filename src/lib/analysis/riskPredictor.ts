// ─── Legal Risk Predictor ───
// Inspired by JusDataPredict: classifies document risk level based on
// structural completeness, legal grounding, and citation quality.

import { tokenize, termFrequency } from "./textSimilarity";
import { detectThemes } from "./keywordExtractor";

export type RiskLevel = "baixo" | "medio" | "alto";

export interface RiskFactor {
  id: string;
  label: string;
  status: "positive" | "negative" | "neutral";
  weight: number;
  detail?: string;
}

export interface RiskResult {
  score: number;          // 0-100, higher = better (probability of success)
  level: RiskLevel;
  factors: RiskFactor[];
  themes: string[];
  wordCount: number;
}

// ─── Structural zone detection ───

function hasPreambulo(text: string): boolean {
  return /excelentíssim[oa]|meritíssim[oa]|juí[zs]|vara|comarca|tribunal|foro/i.test(text);
}

function hasFatos(text: string): boolean {
  return /dos?\s+fatos|da\s+narrativa|relat[oó]ri[oa]|trata-se\s+de/i.test(text);
}

function hasFundamentacao(text: string): boolean {
  return /d[oa]\s+direito|fundamenta[çc][ãa]o|d[oa]\s+mérito|é\s+o\s+relatório/i.test(text);
}

function hasPedido(text: string): boolean {
  return /d[oa]s?\s+pedidos?|requer|ante\s+o\s+exposto|diante\s+d[oa]\s+exposto|pede\s+deferimento|termos\s+em\s+que/i.test(text);
}

function hasFecho(text: string): boolean {
  return /nestes\s+termos|pede\s+deferimento|respeitosamente|data\s+supra|advogad[oa]|oab/i.test(text);
}

// ─── Citation quality ───

function countLegalReferences(text: string) {
  const articles = (text.match(/art\.?\s*\d+/gi) || []).length;
  const laws = (text.match(/lei\s+(?:n[°º.]?\s*)?[\d.]+/gi) || []).length;
  const sumulas = (text.match(/súmula\s+(?:vinculante\s+)?(?:n[°º.]?\s*)?\d+/gi) || []).length;
  const jurisprudencia = (text.match(/(?:RE|REsp|HC|MS|ADI|ADC|ADPF|AgRg|RHC)\s+(?:n[°º.]?\s*)?[\d.]+/gi) || []).length;
  const codigos = (text.match(/código\s+(?:civil|penal|processo|trabalho|defesa|tributário)/gi) || []).length;
  const cf = (text.match(/constituição\s+federal|CF\/88/gi) || []).length;

  const qualifiedArticles = (text.match(/art\.?\s*\d+.*?(lei|código|cf|constituição|cpc|cpp|clt|cdc|cc|cp)/gi) || []).length;
  const bareArticles = Math.max(0, articles - qualifiedArticles);

  return { articles, laws, sumulas, jurisprudencia, codigos, cf, qualifiedArticles, bareArticles, total: articles + laws + sumulas + jurisprudencia + codigos + cf };
}

function hasDoutrina(text: string): boolean {
  return /(doutr|segundo\s+\w+\s+(ensina|leciona|afirma|destaca|sustenta)|apud|in:|op\.\s*cit)/i.test(text);
}

// ─── Main risk calculation ───

export function calculateRisk(html: string, documentCategory?: string): RiskResult {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const factors: RiskFactor[] = [];
  const themes = detectThemes(text).map((t) => t.label);

  if (wordCount < 30) {
    return { score: 0, level: "alto", factors: [], themes, wordCount };
  }

  const isJudicial = documentCategory === "Judicial" || !documentCategory;

  // 1. Structural completeness (max 25 pts)
  const zones = [
    { name: "Preâmbulo/Endereçamento", fn: hasPreambulo },
    { name: "Fatos/Relatório", fn: hasFatos },
    { name: "Fundamentação Jurídica", fn: hasFundamentacao },
    { name: "Pedido/Dispositivo", fn: hasPedido },
    { name: "Fecho/Assinatura", fn: hasFecho },
  ];

  let structureScore = 0;
  for (const zone of zones) {
    const found = zone.fn(text);
    factors.push({
      id: `zone-${zone.name}`,
      label: zone.name,
      status: found ? "positive" : "negative",
      weight: 5,
      detail: found ? "Detectado no documento" : "Não encontrado",
    });
    if (found) structureScore += 5;
  }

  // 2. Legal grounding (max 30 pts)
  const refs = countLegalReferences(text);
  
  if (refs.total === 0 && isJudicial) {
    factors.push({ id: "no-refs", label: "Fundamentação Legal", status: "negative", weight: 30, detail: "Nenhuma referência legal encontrada" });
  } else {
    const refScore = Math.min(30, refs.total * 3);
    factors.push({
      id: "legal-refs",
      label: "Fundamentação Legal",
      status: refs.total >= 3 ? "positive" : "neutral",
      weight: refScore,
      detail: `${refs.total} referência(s): ${refs.articles} artigos, ${refs.laws} leis, ${refs.sumulas} súmulas, ${refs.jurisprudencia} jurisprudência`,
    });
    structureScore += refScore;
  }

  // 3. Citation quality (max 10 pts)
  if (refs.bareArticles > 2) {
    factors.push({
      id: "bare-citations",
      label: "Citações Qualificadas",
      status: "negative",
      weight: 0,
      detail: `${refs.bareArticles} artigos citados sem referência à legislação`,
    });
  } else if (refs.articles > 0) {
    const citQuality = Math.min(10, refs.qualifiedArticles * 2);
    factors.push({
      id: "qualified-citations",
      label: "Citações Qualificadas",
      status: "positive",
      weight: citQuality,
      detail: `${refs.qualifiedArticles}/${refs.articles} artigos com legislação identificada`,
    });
    structureScore += citQuality;
  }

  // 4. Jurisprudence (max 15 pts)
  if (refs.jurisprudencia > 0) {
    const jurispScore = Math.min(15, refs.jurisprudencia * 5);
    factors.push({
      id: "jurisprudencia",
      label: "Jurisprudência",
      status: "positive",
      weight: jurispScore,
      detail: `${refs.jurisprudencia} precedente(s) citado(s)`,
    });
    structureScore += jurispScore;
  } else if (isJudicial && wordCount > 300) {
    factors.push({
      id: "no-jurisprudencia",
      label: "Jurisprudência",
      status: "neutral",
      weight: 0,
      detail: "Nenhum precedente judicial citado",
    });
  }

  // 5. Doctrine (max 10 pts)
  if (hasDoutrina(text)) {
    factors.push({ id: "doutrina", label: "Doutrina", status: "positive", weight: 10, detail: "Citação doutrinária detectada" });
    structureScore += 10;
  }

  // 6. Document length adequacy (max 10 pts)
  if (wordCount >= 200 && wordCount <= 5000) {
    factors.push({ id: "length", label: "Extensão Adequada", status: "positive", weight: 10, detail: `${wordCount} palavras` });
    structureScore += 10;
  } else if (wordCount < 200) {
    factors.push({ id: "length", label: "Extensão Adequada", status: "negative", weight: 0, detail: `Documento curto: ${wordCount} palavras` });
  } else {
    factors.push({ id: "length", label: "Extensão Adequada", status: "neutral", weight: 5, detail: `Documento extenso: ${wordCount} palavras` });
    structureScore += 5;
  }

  // Normalize to 0-100
  const maxPossible = 100;
  const score = Math.min(100, Math.round((structureScore / maxPossible) * 100));

  const level: RiskLevel = score >= 65 ? "baixo" : score >= 35 ? "medio" : "alto";

  return { score, level, factors, themes, wordCount };
}

// ─── Per-Clause Risk Analysis (CUAD-inspired) ───

export interface ClauseRiskDetail {
  clauseNumber: number;
  clauseTitle: string;
  text: string;
  riskScore: number; // 0-100, higher = riskier
  level: RiskLevel;
  warnings: string[];
}

const UNILATERAL_PATTERNS: { regex: RegExp; warning: string }[] = [
  { regex: /a\s+crit[eé]rio\s+exclusivo/i, warning: "Decisão unilateral sem critérios objetivos" },
  { regex: /a\s+qualquer\s+(?:tempo|momento)\s+(?:sem|e\s+sem)\s+(?:justa\s+)?causa/i, warning: "Rescisão unilateral sem justa causa" },
  { regex: /poder[aá]\s+(?:alterar|modificar)\s+unilateralmente/i, warning: "Alteração unilateral de condições" },
  { regex: /ren[uú]ncia?\s+(?:a\s+)?todos?\s+(?:os?\s+)?direitos?/i, warning: "Renúncia ampla e genérica a direitos" },
  { regex: /(?:isen[çc][aã]o|exclus[aã]o)\s+total\s+(?:de\s+)?responsabilidade/i, warning: "Isenção total de responsabilidade" },
  { regex: /perda\s+(?:total\s+)?(?:de\s+todos?\s+)?(?:os?\s+)?valores?\s+pagos?/i, warning: "Perda total de valores pagos" },
  { regex: /irrevog[aá]vel\s+e\s+irretrat[aá]vel/i, warning: "Cláusula irrevogável e irretratável" },
  { regex: /sem\s+direito\s+a\s+(?:qualquer\s+)?indeniza[çc][aã]o/i, warning: "Exclusão de direito a indenização" },
  { regex: /multa\s+(?:de\s+)?(?:\d{2,3})\s*%/i, warning: "Multa com percentual potencialmente excessivo" },
];

/**
 * Split a document into clauses and analyze risk for each one individually.
 */
export function analyzeClauseRisks(html: string): ClauseRiskDetail[] {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

  // Split by "CLÁUSULA" boundaries
  const clauseRegex = /(?:CL[AÁ]USULA\s+(\d+[ªaº.]?)\s*[-–:.]?\s*(.{0,80}?)(?:\n|(?=CL[AÁ]USULA)))/gi;
  const parts = text.split(/CL[AÁ]USULA\s+\d+[ªaº.]?\s*[-–:.]/i);

  if (parts.length <= 1) return []; // Not a clause-based document

  const results: ClauseRiskDetail[] = [];
  const titleMatches = [...text.matchAll(/CL[AÁ]USULA\s+(\d+[ªaº.]?)\s*[-–:.]?\s*([^\n]{0,80})/gi)];

  for (let i = 0; i < titleMatches.length; i++) {
    const clauseText = parts[i + 1] || "";
    if (clauseText.trim().length < 10) continue;

    const warnings: string[] = [];
    let riskScore = 0;

    for (const pattern of UNILATERAL_PATTERNS) {
      if (pattern.regex.test(clauseText)) {
        warnings.push(pattern.warning);
        riskScore += 15;
      }
    }

    riskScore = Math.min(100, riskScore);
    const level: RiskLevel = riskScore >= 40 ? "alto" : riskScore >= 15 ? "medio" : "baixo";

    results.push({
      clauseNumber: i + 1,
      clauseTitle: (titleMatches[i]?.[2] || "").trim(),
      text: clauseText.substring(0, 300),
      riskScore,
      level,
      warnings,
    });
  }

  return results;
}
