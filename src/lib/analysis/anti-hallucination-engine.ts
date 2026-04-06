/**
 * Anti-Hallucination Engine v2.0
 * Unified system for BOTH search results (pesquisa) and neural pipeline (rede neural).
 * 
 * Two modes:
 * 1. Search Mode: Cross-validates search results against known legal databases
 * 2. Neural Mode: Full quantum free-energy analysis of AI-generated responses
 * 
 * Runs 100% client-side in <20ms — no API calls.
 */

import { detectHallucinations, type HallucinationWarning } from "./hallucinationDetector";
import { checkResponseQuality, type QualityResult } from "./responseQualityChecker";
import {
  computeFreeEnergy,
  computeQuantumFreeEnergy,
  shouldCorrect,
  generateCorrectionPrompt,
  type ActiveInferenceResult,
  type QuantumFreeEnergyResult,
} from "@/lib/neural/active-inference-guard";

// ═══ TYPES ═══

export interface SearchResultValidation {
  resultId: string;
  title: string;
  isValid: boolean;
  confidence: number; // 0-100
  warnings: HallucinationWarning[];
  flags: ValidationFlag[];
}

export interface ValidationFlag {
  type: "fabricated_reference" | "invalid_article" | "suspicious_date" | "inconsistent_source" | "unverified_citation" | "duplicate_content";
  severity: "high" | "medium" | "low";
  detail: string;
}

export interface SearchAntiHallucinationReport {
  mode: "pesquisa";
  totalResults: number;
  validatedResults: number;
  flaggedResults: number;
  overallConfidence: number; // 0-100
  validations: SearchResultValidation[];
  timestamp: number;
  processingMs: number;
}

export interface NeuralAntiHallucinationReport {
  mode: "neural";
  freeEnergy: ActiveInferenceResult;
  quantumFreeEnergy: QuantumFreeEnergyResult | null;
  qualityResult: QualityResult;
  hallucinations: HallucinationWarning[];
  sourceGrounding: SourceGroundingResult;
  correctionPrompt: string | null;
  overallConfidence: number;
  timestamp: number;
  processingMs: number;
}

export interface SourceGroundingResult {
  hasGrounding: boolean;
  groundedSources: string[];
  ungroundedClaims: string[];
  groundingScore: number; // 0-100
}

export type AntiHallucinationReport = SearchAntiHallucinationReport | NeuralAntiHallucinationReport;

// ═══ CONSTANTS ═══

const KNOWN_TRIBUNALS = new Set([
  "stf", "stj", "tst", "tse", "stm",
  "trf1", "trf2", "trf3", "trf4", "trf5", "trf6",
  "tjsp", "tjrj", "tjrs", "tjmg", "tjpr", "tjba", "tjpe", "tjsc", "tjce", "tjgo",
  "cnj", "csjt", "tcu",
]);

const VALID_SOURCE_LABELS = new Set([
  "STF", "STJ", "TST", "TSE", "STM",
  "LexML", "Câmara", "CNJ", "CourtListener", "FreeLaw",
  "Google Books", "Knowledge Graph", "Senado",
  "DataJud", "Jurisprudência", "Legislação", "Doutrina",
]);

const SUSPICIOUS_TITLE_PATTERNS = [
  /^teste?\s/i,
  /lorem\s+ipsum/i,
  /^exemplo\s/i,
  /^null$/i,
  /^undefined$/i,
];

const DATE_SANITY = {
  minYear: 1824, // Constituição do Império
  maxYear: new Date().getFullYear() + 1,
};

// ═══ SEARCH MODE — Validate search results ═══

/**
 * Validate a batch of search results from pesquisa unificada or neural search.
 * Checks: fabricated references, invalid articles, suspicious dates, source consistency.
 */
export function validateSearchResults(
  results: Array<{
    id?: string;
    title: string;
    content?: string;
    description?: string;
    source: string;
    source_label?: string;
    sourceLabel?: string;
    url?: string;
    date?: string;
    published_date?: string;
  }>
): SearchAntiHallucinationReport {
  const t0 = performance.now();
  const validations: SearchResultValidation[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const text = r.content || r.description || r.title;
    const flags: ValidationFlag[] = [];

    // 1. Check for hallucinated legal references in the content
    const hallWarnings = detectHallucinations(text);

    // 2. Validate source
    const sourceLabel = r.source_label || r.sourceLabel || r.source;
    const normalizedSource = r.source.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!KNOWN_TRIBUNALS.has(normalizedSource) && !["knowledge_graph", "google_books", "lexml", "camara", "freelaw", "courtlistener_dockets"].includes(normalizedSource)) {
      // Not a critical flag, just informational for less common sources
    }

    // 3. Check for suspicious titles
    if (SUSPICIOUS_TITLE_PATTERNS.some(p => p.test(r.title))) {
      flags.push({
        type: "fabricated_reference",
        severity: "high",
        detail: `Título suspeito: "${r.title.slice(0, 50)}"`,
      });
    }

    // 4. Validate date
    const dateStr = r.date || r.published_date;
    if (dateStr) {
      const year = parseInt(dateStr.slice(0, 4));
      if (!isNaN(year) && (year < DATE_SANITY.minYear || year > DATE_SANITY.maxYear)) {
        flags.push({
          type: "suspicious_date",
          severity: "medium",
          detail: `Data fora do intervalo esperado: ${dateStr} (esperado ${DATE_SANITY.minYear}-${DATE_SANITY.maxYear})`,
        });
      }
    }

    // 5. Check for empty/minimal content
    if (text.length < 20) {
      flags.push({
        type: "inconsistent_source",
        severity: "low",
        detail: "Conteúdo muito curto ou vazio",
      });
    }

    // 6. Check URL validity (basic)
    if (r.url && !/^https?:\/\/.+/i.test(r.url)) {
      flags.push({
        type: "unverified_citation",
        severity: "low",
        detail: "URL com formato inválido",
      });
    }

    // 7. Detect duplicate content (by checking similarity with previous results)
    for (let j = 0; j < i; j++) {
      const prevText = results[j].content || results[j].description || results[j].title;
      if (prevText && text && computeJaccard(text, prevText) > 0.85) {
        flags.push({
          type: "duplicate_content",
          severity: "low",
          detail: `Conteúdo duplicado com resultado #${j + 1}`,
        });
        break;
      }
    }

    // Convert hallucination warnings to flags
    for (const w of hallWarnings.filter(h => h.severity === "high")) {
      flags.push({
        type: "invalid_article",
        severity: "high",
        detail: `${w.entity}: ${w.reason}`,
      });
    }

    const highFlags = flags.filter(f => f.severity === "high").length;
    const mediumFlags = flags.filter(f => f.severity === "medium").length;
    const confidence = Math.max(0, 100 - (highFlags * 30) - (mediumFlags * 10) - (flags.length * 3));

    validations.push({
      resultId: r.id || `result_${i}`,
      title: r.title,
      isValid: highFlags === 0,
      confidence,
      warnings: hallWarnings,
      flags,
    });
  }

  const flaggedResults = validations.filter(v => !v.isValid).length;
  const avgConfidence = validations.length > 0
    ? Math.round(validations.reduce((s, v) => s + v.confidence, 0) / validations.length)
    : 100;

  return {
    mode: "pesquisa",
    totalResults: results.length,
    validatedResults: validations.length,
    flaggedResults,
    overallConfidence: avgConfidence,
    validations,
    timestamp: Date.now(),
    processingMs: Math.round(performance.now() - t0),
  };
}

// ═══ NEURAL MODE — Full AI response validation ═══

/**
 * Full anti-hallucination analysis for AI-generated responses (neural pipeline).
 * Uses: Free Energy computation, Quantum Free Energy, Quality Gate, Source Grounding.
 */
export function validateNeuralResponse(
  query: string,
  response: string,
  options?: {
    amplifiedIntent?: string;
    intentConfidence?: number;
    useQuantum?: boolean;
    sources?: Array<{ source: string; content: string }>;
  }
): NeuralAntiHallucinationReport {
  const t0 = performance.now();

  // 1. Classical Free Energy
  const freeEnergy = computeFreeEnergy(
    query, response,
    options?.amplifiedIntent,
    options?.intentConfidence
  );

  // 2. Quantum Free Energy (optional, for deep analysis)
  let quantumFreeEnergy: QuantumFreeEnergyResult | null = null;
  if (options?.useQuantum !== false) {
    try {
      quantumFreeEnergy = computeQuantumFreeEnergy(
        query, response,
        options?.amplifiedIntent,
        options?.intentConfidence
      );
    } catch {
      // Quantum is best-effort
    }
  }

  // 3. Quality check
  const qualityResult = checkResponseQuality(response, "", options?.amplifiedIntent);

  // 4. Direct hallucination detection
  const hallucinations = detectHallucinations(response);

  // 5. Source grounding check
  const sourceGrounding = checkSourceGrounding(response, options?.sources);

  // 6. Correction prompt if needed
  let correctionPrompt: string | null = null;
  if (shouldCorrect(freeEnergy)) {
    correctionPrompt = generateCorrectionPrompt(query, response, freeEnergy.errors);
  }

  // 7. Overall confidence
  const feScore = 100 - (quantumFreeEnergy?.freeEnergy || freeEnergy.freeEnergy);
  const qualScore = qualityResult.score;
  const groundingScore = sourceGrounding.groundingScore;
  const hallPenalty = hallucinations.filter(h => h.severity === "high").length * 15;
  const overallConfidence = Math.max(0, Math.min(100,
    Math.round((feScore * 0.35) + (qualScore * 0.25) + (groundingScore * 0.25) + (25 - hallPenalty))
  ));

  return {
    mode: "neural",
    freeEnergy,
    quantumFreeEnergy,
    qualityResult,
    hallucinations,
    sourceGrounding,
    correctionPrompt,
    overallConfidence,
    timestamp: Date.now(),
    processingMs: Math.round(performance.now() - t0),
  };
}

// ═══ SOURCE GROUNDING ═══

/**
 * Check if the AI response claims are grounded in actual retrieved sources.
 */
function checkSourceGrounding(
  response: string,
  sources?: Array<{ source: string; content: string }>
): SourceGroundingResult {
  if (!sources || sources.length === 0) {
    return {
      hasGrounding: false,
      groundedSources: [],
      ungroundedClaims: [],
      groundingScore: 50, // Neutral when no sources provided
    };
  }

  const groundedSources: string[] = [];
  const ungroundedClaims: string[] = [];

  // Extract claims from response (legal references)
  const claimPatterns = [
    /(?:Art(?:igo)?\.?\s*\d+(?:\s*,?\s*§\s*\d+)?(?:\s+d[oa]\s+\w+)?)/gi,
    /(?:Lei\s+(?:n[°º.]?\s*)?\d+[\d./]*(?:\/\d{2,4})?)/gi,
    /(?:Súmula\s+(?:Vinculante\s+)?(?:n[°º.]?\s*)?\d+)/gi,
    /(?:(?:RE|REsp|HC|MS|ADI|ADPF|ADC)\s+[\d./-]+)/gi,
  ];

  const claims: string[] = [];
  for (const pattern of claimPatterns) {
    const matches = response.matchAll(pattern);
    for (const m of matches) {
      claims.push(m[0].trim());
    }
  }

  // Check each claim against sources
  const allSourceText = sources.map(s => s.content).join(" ").toLowerCase();
  for (const claim of claims) {
    // Normalize the claim for matching
    const normalized = claim.toLowerCase().replace(/\s+/g, " ");
    const keyParts = normalized.split(/\s+/).filter(w => /\d/.test(w) || w.length > 3);

    const isGrounded = keyParts.some(part => allSourceText.includes(part));
    if (isGrounded) {
      groundedSources.push(claim);
    } else {
      ungroundedClaims.push(claim);
    }
  }

  const total = claims.length;
  const groundingScore = total === 0 ? 75 : Math.round((groundedSources.length / total) * 100);

  return {
    hasGrounding: groundedSources.length > 0,
    groundedSources,
    ungroundedClaims,
    groundingScore,
  };
}

// ═══ UTILITY ═══

/**
 * Compute Jaccard similarity between two texts (word-level).
 */
function computeJaccard(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  if (setA.size === 0 && setB.size === 0) return 1;

  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ═══ EVENT DISPATCHERS ═══

/**
 * Dispatch anti-hallucination report as a custom event for UI components.
 */
export function dispatchAntiHallucinationReport(report: AntiHallucinationReport): void {
  window.dispatchEvent(new CustomEvent("anti-hallucination-report", { detail: report }));
}

/**
 * Quick one-line validation for any text content.
 * Returns true if content is likely valid, false if suspicious.
 */
export function quickValidate(text: string): { valid: boolean; confidence: number; warnings: number } {
  const warnings = detectHallucinations(text);
  const highSev = warnings.filter(w => w.severity === "high").length;
  return {
    valid: highSev === 0,
    confidence: Math.max(0, 100 - highSev * 25 - warnings.length * 5),
    warnings: warnings.length,
  };
}
