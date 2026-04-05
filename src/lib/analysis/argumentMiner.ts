/**
 * argumentMiner.ts — Extract rhetorical argument structure from legal documents.
 * Identifies claims, premises, evidence, and conclusions using Brazilian legal writing patterns.
 */

export type ArgumentRole = "claim" | "premise" | "evidence" | "conclusion";

export interface ArgumentSegment {
  role: ArgumentRole;
  text: string;
  confidence: number;
  /** Sentence index in the document */
  index: number;
}

export interface ArgumentGap {
  type: "claim_without_evidence" | "evidence_without_claim" | "no_conclusion" | "no_premise";
  message: string;
}

export interface ArgumentAnalysis {
  segments: ArgumentSegment[];
  gaps: ArgumentGap[];
  summary: {
    claims: number;
    premises: number;
    evidence: number;
    conclusions: number;
  };
}

// ─── Marker patterns (Brazilian legal Portuguese) ───

const CLAIM_MARKERS: Array<{ regex: RegExp; weight: number }> = [
  { regex: /\brequer(?:\s+(?:a\s+)?(?:Vossa\s+Excelência|este\s+(?:Juízo|Tribunal)))?\b/i, weight: 0.95 },
  { regex: /\bpede\s+(?:deferimento|provimento|a\s+procedência)/i, weight: 0.95 },
  { regex: /\bpugna\s+pel[oa]/i, weight: 0.9 },
  { regex: /\bpretende\s+(?:a|o|demonstrar|comprovar)/i, weight: 0.8 },
  { regex: /\bpleite(?:ia|ando)\b/i, weight: 0.9 },
  { regex: /\bpostula\b/i, weight: 0.85 },
  { regex: /\brequer(?:er)?\s+(?:seja|que)\b/i, weight: 0.9 },
  { regex: /\bimpugna\b/i, weight: 0.8 },
  { regex: /\bsolicita\s+(?:seja|que|a)\b/i, weight: 0.75 },
];

const PREMISE_MARKERS: Array<{ regex: RegExp; weight: number }> = [
  { regex: /\bconsiderando\s+que\b/i, weight: 0.95 },
  { regex: /\btendo\s+em\s+vista\b/i, weight: 0.9 },
  { regex: /\bhaja\s+vista\b/i, weight: 0.9 },
  { regex: /\bporquanto\b/i, weight: 0.85 },
  { regex: /\buma\s+vez\s+que\b/i, weight: 0.7 },
  { regex: /\bvisto\s+que\b/i, weight: 0.75 },
  { regex: /\bna\s+medida\s+em\s+que\b/i, weight: 0.8 },
  { regex: /\bpois\b/i, weight: 0.5 },
  { regex: /\bem\s+razão\s+d[eoa]\b/i, weight: 0.8 },
  { regex: /\bisto\s+porque\b/i, weight: 0.85 },
  { regex: /\bé\s+certo\s+que\b/i, weight: 0.7 },
  { regex: /\bocorre\s+que\b/i, weight: 0.75 },
];

const EVIDENCE_MARKERS: Array<{ regex: RegExp; weight: number }> = [
  { regex: /\bconforme\s+doc\.?\b/i, weight: 0.95 },
  { regex: /\bprova\s+(?:documental|testemunhal|pericial)\b/i, weight: 0.9 },
  { regex: /\blaudo\s+(?:pericial|técnico|médico)\b/i, weight: 0.95 },
  { regex: /\bperícia\b/i, weight: 0.8 },
  { regex: /\bart\.?\s*\d+/i, weight: 0.85 },
  { regex: /\blei\s+(?:n[º°]?\s*)?\d/i, weight: 0.85 },
  { regex: /\bsúmula\s+(?:n[º°]?\s*)?\d/i, weight: 0.9 },
  { regex: /\bjurisprudência\b/i, weight: 0.8 },
  { regex: /\bSTF|STJ|TST|TRF|TJRS|TJSP|TJRJ\b/, weight: 0.85 },
  { regex: /\b(?:REsp|RE|HC|MS|AgRg|EDcl)\s+(?:n[º°]?\s*)?\d/i, weight: 0.9 },
  { regex: /\bfl[s.]?\s*\d+/i, weight: 0.75 },
  { regex: /\bdocumento\s+(?:de\s+)?(?:fls?\.?|anexo|juntado)/i, weight: 0.85 },
  { regex: /\bcódigo\s+(?:civil|penal|de\s+processo)/i, weight: 0.85 },
  { regex: /\bconstituição\s+federal/i, weight: 0.9 },
  { regex: /\bCF\/88\b/i, weight: 0.9 },
];

const CONCLUSION_MARKERS: Array<{ regex: RegExp; weight: number }> = [
  { regex: /\bante\s+o\s+exposto\b/i, weight: 0.95 },
  { regex: /\bdiante\s+d[oa]\s+exposto\b/i, weight: 0.95 },
  { regex: /\bpelo\s+exposto\b/i, weight: 0.9 },
  { regex: /\bportanto\b/i, weight: 0.6 },
  { regex: /\blogo\b/i, weight: 0.4 },
  { regex: /\bdessa?\s+forma\b/i, weight: 0.6 },
  { regex: /\bassim\s+sendo\b/i, weight: 0.7 },
  { regex: /\bem\s+face\s+d[oa]\s+exposto\b/i, weight: 0.9 },
  { regex: /\bpede\s+deferimento\b/i, weight: 0.95 },
  { regex: /\btermos\s+em\s+que\s+pede\s+deferimento\b/i, weight: 0.95 },
  { regex: /\bnestes\s+termos\b/i, weight: 0.7 },
  { regex: /\bà\s+vista\s+d[oa]\s+exposto\b/i, weight: 0.9 },
];

// ─── Core engine ───

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.;!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])|(?<=\n)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

function classifySentence(
  sentence: string,
  markers: Array<{ regex: RegExp; weight: number }>
): { matched: boolean; confidence: number } {
  let best = 0;
  for (const { regex, weight } of markers) {
    if (regex.test(sentence) && weight > best) {
      best = weight;
    }
  }
  return { matched: best > 0, confidence: best };
}

/**
 * Mine argument structure from a legal document.
 * @param text — plain text of the document (HTML tags should be stripped before calling)
 */
export function mineArguments(text: string): ArgumentAnalysis {
  const sentences = splitSentences(text);
  const segments: ArgumentSegment[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];

    // Test all four roles; pick the highest-confidence match
    const allResults = [
      { role: "claim" as ArgumentRole, ...classifySentence(s, CLAIM_MARKERS) },
      { role: "premise" as ArgumentRole, ...classifySentence(s, PREMISE_MARKERS) },
      { role: "evidence" as ArgumentRole, ...classifySentence(s, EVIDENCE_MARKERS) },
      { role: "conclusion" as ArgumentRole, ...classifySentence(s, CONCLUSION_MARKERS) },
    ];
    const results = allResults.filter((r) => r.confidence > 0);

    if (results.length === 0) continue;

    results.sort((a, b) => b.confidence - a.confidence);
    const winner = results[0];

    segments.push({
      role: winner.role,
      text: s.length > 300 ? s.slice(0, 300) + "…" : s,
      confidence: winner.confidence,
      index: i,
    });
  }

  // ─── Gap analysis ───
  const gaps: ArgumentGap[] = [];
  const hasClaim = segments.some((s) => s.role === "claim");
  const hasPremise = segments.some((s) => s.role === "premise");
  const hasEvidence = segments.some((s) => s.role === "evidence");
  const hasConclusion = segments.some((s) => s.role === "conclusion");

  if (hasClaim && !hasEvidence) {
    gaps.push({ type: "claim_without_evidence", message: "Pedido sem fundamentação probatória identificada" });
  }
  if (hasEvidence && !hasClaim) {
    gaps.push({ type: "evidence_without_claim", message: "Provas/citações sem pedido correspondente" });
  }
  if ((hasClaim || hasPremise) && !hasConclusion && sentences.length > 10) {
    gaps.push({ type: "no_conclusion", message: "Documento sem conclusão identificada" });
  }
  if (hasClaim && !hasPremise && sentences.length > 10) {
    gaps.push({ type: "no_premise", message: "Pedido sem premissas/fundamentação fática" });
  }

  return {
    segments,
    gaps,
    summary: {
      claims: segments.filter((s) => s.role === "claim").length,
      premises: segments.filter((s) => s.role === "premise").length,
      evidence: segments.filter((s) => s.role === "evidence").length,
      conclusions: segments.filter((s) => s.role === "conclusion").length,
    },
  };
}
