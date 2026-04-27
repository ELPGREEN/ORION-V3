/**
 * Response Quality Checker
 * Inspired by LegalNexus RAG pipeline — validates AI responses locally
 */

import { detectHallucinations } from "./hallucinationDetector";

export interface QualityResult {
  score: number; // 0-100
  level: "alta" | "media" | "baixa";
  label: string;
  color: string;
  checks: QualityCheck[];
}

interface QualityCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

// Known valid legal references patterns
const VALID_LAW_PATTERNS = [
  /Lei\s+(?:n[°º.]?\s*)?[\d.]+(?:\/\d{2,4})?/i,
  /Art(?:igo)?\.?\s*\d+/i,
  /Súmula\s+(?:Vinculante\s+)?(?:n[°º.]?\s*)?\d+/i,
  /(?:RE|REsp|HC|MS|ADI)\s+[\d.]+/i,
  /CF\/88/i,
  /Constituição\s+Federal/i,
  /Código\s+(?:Civil|Penal|de\s+Processo)/i,
];

const GENERIC_PHRASES = [
  "de acordo com a legislação vigente",
  "conforme entendimento majoritário",
  "segundo a doutrina",
  "a jurisprudência é pacífica",
  "em regra",
  "via de regra",
  "é importante ressaltar que",
  "cabe destacar que",
  "nesse sentido",
  "com base na legislação",
];

export function checkResponseQuality(
  responseText: string,
  documentContext: string,
  intent?: string
): QualityResult {
  const checks: QualityCheck[] = [];
  let score = 50; // base

  // 1. Check if response has legal citations
  const hasCitations = VALID_LAW_PATTERNS.some(p => p.test(responseText));
  checks.push({
    name: "Citações legais",
    passed: hasCitations,
    detail: hasCitations ? "Referências legais encontradas" : "Sem citações de leis ou artigos",
  });
  if (hasCitations) score += 15;

  // 2. Check for generic/vague language
  const genericCount = GENERIC_PHRASES.filter(p =>
    responseText.toLowerCase().includes(p)
  ).length;
  const isGeneric = genericCount >= 3;
  checks.push({
    name: "Especificidade",
    passed: !isGeneric,
    detail: isGeneric
      ? `${genericCount} expressões genéricas detectadas`
      : "Resposta específica",
  });
  if (!isGeneric) score += 10;
  else score -= 10;

  // 3. Check response length (too short = likely incomplete)
  const wordCount = responseText.split(/\s+/).length;
  const isSubstantial = wordCount > 30;
  checks.push({
    name: "Substância",
    passed: isSubstantial,
    detail: `${wordCount} palavras`,
  });
  if (isSubstantial) score += 10;

  // 4. Cross-reference with document context
  if (documentContext) {
    const docLaws = documentContext.match(/(?:Lei|Art|Súmula|CF|Código)\s+[\w\d./°º]+/gi) || [];
    const responseLaws = responseText.match(/(?:Lei|Art|Súmula|CF|Código)\s+[\w\d./°º]+/gi) || [];
    const hasContextAlignment = responseLaws.some(rl =>
      docLaws.some((dl: any) => (dl as string).toLowerCase().includes((rl as any).toLowerCase().slice(0, 10)))
    );
    if (responseLaws.length > 0) {
      checks.push({
        name: "Alinhamento contextual",
        passed: hasContextAlignment || docLaws.length === 0,
        detail: hasContextAlignment ? "Citações compatíveis com o documento" : "Citações não confirmadas no contexto",
      });
      if (hasContextAlignment) score += 15;
    }
  }

  // 5. Check for sources/attribution
  const hasSources = /(?:fonte|source|referência|conforme|segundo)\s*:/i.test(responseText) ||
    /STF|STJ|TST|TRF|TJ[A-Z]{2}/i.test(responseText);
  checks.push({
    name: "Fontes",
    passed: hasSources,
    detail: hasSources ? "Fontes identificadas" : "Sem fontes explícitas",
  });
  if (hasSources) score += 10;

  // 6. Hallucination detection
  const hallucinations = detectHallucinations(responseText);
  const highSeverity = hallucinations.filter(h => h.severity === "high");
  const hasHallucinations = highSeverity.length > 0;
  checks.push({
    name: "Verificação de alucinação",
    passed: !hasHallucinations,
    detail: hasHallucinations
      ? `${highSeverity.length} referência(s) suspeita(s): ${highSeverity.map(h => h.entity).join(", ")}`
      : hallucinations.length > 0
        ? `${hallucinations.length} referência(s) com baixa certeza`
        : "Nenhuma alucinação detectada",
  });
  if (hasHallucinations) score -= 20;
  else if (hallucinations.length === 0 && hasCitations) score += 5;

  // Clamp score
  score = Math.max(10, Math.min(100, score));

  // Determine level
  let level: QualityResult["level"];
  let label: string;
  let color: string;
  if (score >= 70) {
    level = "alta";
    label = "Alta confiança";
    color = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  } else if (score >= 40) {
    level = "media";
    label = "Confiança média";
    color = "text-amber-400 border-amber-500/30 bg-amber-500/10";
  } else {
    level = "baixa";
    label = "Baixa confiança";
    color = "text-red-400 border-red-500/30 bg-red-500/10";
  }

  return { score, level, label, color, checks };
}
