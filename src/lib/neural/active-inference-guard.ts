/**
 * Active Inference Guard — Anti-Hallucination Layer 4.0 (Quantum-Enhanced)
 * Inspired by Karl Friston's Free Energy Principle & Active Inference.
 * Now with Quantum Wave Function backbone: prediction errors are qubits,
 * Free Energy is von Neumann entropy, severity determined by collapse.
 * Runs locally in <15ms — no network calls.
 */

import { detectHallucinations, type HallucinationWarning } from "@/lib/analysis/hallucinationDetector";
import { checkResponseQuality, type QualityResult } from "@/lib/analysis/responseQualityChecker";
import { countWords, getTokensEfficiently } from "@/lib/utils/text-utils";

// ═══ Types ═══

export interface PredictionError {
  source: string;
  delta: number; // 0-1, higher = more surprise
  detail: string;
}

export interface ActiveInferenceResult {
  passed: boolean;
  freeEnergy: number; // 0-100, lower = better
  severity: "none" | "low" | "high";
  errors: PredictionError[];
  hallucinations: HallucinationWarning[];
  quality: QualityResult | null;
  disclaimer: string | null;
  timestamp: number;
}

// ═══ Constants - OPTIMIZED FOR LESS HALLUCINATIONS ═══

const FREE_ENERGY_THRESHOLD_LOW = 25;  // OPTIMIZED: was 35 - more sensitive
const FREE_ENERGY_THRESHOLD_HIGH = 50; // OPTIMIZED: was 60 - correct more often
const BLOCK_THRESHOLD = 75;           // NEW: block responses above this

// PERF: Pre-compiled RegExps for O(N) single-pass detection
const HALLUCINATION_REGEX = /\b(como modelo de linguagem|não tenho acesso a informações em tempo real|não posso fornecer consultoria jurídica|peço desculpas pelo erro|me desculpe, mas não|infelizmente não tenho como verificar|baseado no meu treinamento|até minha data de corte|é importante consultar um advogado|não posso garantir a precisão|não tenho capacidade de visão|não consigo ver imagens|não tenho acesso a imagens|não posso ver o que você|como um modelo de texto|sou um assistente de texto|não possuo visão|não tenho olhos|incapaz de processar imagens)\b/gi;

const FABRICATION_PATTERNS = [
  /Lei\s+n[°º.]?\s*\d{5,}\/\d{4}/i, // Leis com números absurdamente altos
  /Art(?:igo)?\.?\s*\d{4,}/i, // Artigos com 4+ dígitos (improvável)
  /Súmula\s+(?:Vinculante\s+)?\d{3,}/i, // Súmulas com 3+ dígitos
  /(?:RE|REsp)\s+\d{10,}/i, // Processos com números excessivamente longos
  /(?:20[3-9]\d|21\d{2})\/\d{2}\/\d{2}/i, // Datas futuras impossíveis (2030+)
  /\d{5}[-.\s]?\d{4}/i, // Telefones fabricados
];

// NEW: Uncertainty phrases that penalize responses
const UNCERTAINTY_REGEX = /\b(não tenho certeza|pode ser que|talvez|provavelmente|creio que|acredito que|na minha opinião|não posso confirmar|não tenho informações|falha ao|não encontrei)\b/gi;

// ═══ Core Functions ═══

/**
 * Compute semantic overlap between query intent keywords and response.
 */
function computeSemanticCoherence(query: string, response: string): number {
  const queryWords = getTokensEfficiently(query, 4);
  if (queryWords.size === 0) return 1;

  const responseWords = getTokensEfficiently(response, 4);

  let overlap = 0;
  for (const w of queryWords) {
    if (responseWords.has(w)) overlap++;
  }
  return overlap / queryWords.size;
}

/**
 * Detect hedging/fabrication language patterns.
 */
function detectFabricationSignals(response: string): PredictionError[] {
  const errors: PredictionError[] = [];

  // Check hallucination phrases (OPTIMIZED: single-pass regex)
  HALLUCINATION_REGEX.lastIndex = 0;
  const matchedPhrases = response.match(HALLUCINATION_REGEX);
  if (matchedPhrases && matchedPhrases.length > 0) {
    errors.push({
      source: "hedging_language",
      delta: Math.min(matchedPhrases.length * 0.15, 0.6),
      detail: `${matchedPhrases.length} frase(s) evasiva(s) detectada(s)`,
    });
  }

  // Check fabrication patterns
  const fabrications = FABRICATION_PATTERNS.filter(p => p.test(response));
  if (fabrications.length > 0) {
    errors.push({
      source: "fabrication_pattern",
      delta: fabrications.length * 0.25,
      detail: `${fabrications.length} referência(s) com formato suspeito`,
    });
  }

  return errors;
}

/**
 * Check response length proportionality to query complexity.
 */
function checkProportionality(query: string, response: string): PredictionError | null {
  const queryWords = countWords(query);
  const responseWords = countWords(response);

  // Very short response to complex query = suspicious
  if (queryWords > 10 && responseWords < 15) {
    return {
      source: "proportionality",
      delta: 0.3,
      detail: `Resposta curta (${responseWords} palavras) para pergunta complexa (${queryWords} palavras)`,
    };
  }

  // Extremely long response to simple query = possible rambling/hallucination
  if (queryWords < 5 && responseWords > 500) {
    return {
      source: "proportionality",
      delta: 0.15,
      detail: `Resposta excessivamente longa (${responseWords} palavras) para pergunta simples`,
    };
  }

  return null;
}

/**
 * Main function: compute Free Energy (surprise) of an LLM response.
 * Lower energy = more aligned with expectations. Higher = more surprising/suspicious.
 */
export function computeFreeEnergy(
  query: string,
  response: string,
  amplifiedIntent?: string,
  intentConfidence?: number
): ActiveInferenceResult {
  const t0 = performance.now();
  const errors: PredictionError[] = [];

  // 1. Semantic coherence with query (and amplified intent if available)
  const coherence = computeSemanticCoherence(
    amplifiedIntent || query, response
  );
  if (coherence < 0.2) {
    errors.push({
      source: "semantic_drift",
      delta: (1 - coherence) * 0.4,
      detail: `Baixa coerência semântica (${(coherence * 100).toFixed(0)}%) com a intenção`,
    });
  }

  // 2. Fabrication/hedging detection
  errors.push(...detectFabricationSignals(response));

  // 3. Hallucination detection (reuse existing module)
  const hallucinations = detectHallucinations(response);
  const highSeverity = hallucinations.filter(h => h.severity === "high");
  if (highSeverity.length > 0) {
    errors.push({
      source: "hallucination_detector",
      delta: Math.min(highSeverity.length * 0.2, 0.8),
      detail: `${highSeverity.length} referência(s) jurídica(s) suspeita(s): ${highSeverity.map(h => h.entity).join(", ")}`,
    });
  }

  // 4. Proportionality check
  const propError = checkProportionality(query, response);
  if (propError) errors.push(propError);

  // 5. Quality check (reuse existing module)
  let quality: QualityResult | null = null;
  try {
    quality = checkResponseQuality(response, "", amplifiedIntent);
    if (quality.score < 40) {
      errors.push({
        source: "quality_gate",
        delta: (100 - quality.score) / 200,
        detail: `Score de qualidade baixo: ${quality.score}/100 (${quality.label})`,
      });
    }
  } catch {
    // Quality check is best-effort
  }

  // 6. Intent confidence penalty
  if (intentConfidence !== undefined && intentConfidence < 0.3) {
    errors.push({
      source: "low_intent_confidence",
      delta: 0.15,
      detail: `Confiança da intenção muito baixa (${(intentConfidence * 100).toFixed(0)}%)`,
    });
  }

  // 7. Uncertainty phrases penalty (OPTIMIZED: single-pass regex)
  UNCERTAINTY_REGEX.lastIndex = 0;
  const uncertaintyMatches = response.match(UNCERTAINTY_REGEX);
  if (uncertaintyMatches && uncertaintyMatches.length > 2) {
    errors.push({
      source: "uncertainty_excessive",
      delta: 0.1,
      detail: `Excesso de expressões de incerteza (${uncertaintyMatches.length}): ${uncertaintyMatches.slice(0, 3).join(", ")}`,
    });
  }

  // ═══ Compute total Free Energy ═══
  const totalDelta = errors.reduce((sum, e) => sum + e.delta, 0);
  const freeEnergy = Math.min(100, Math.round(totalDelta * 100));

  // Determine severity
  let severity: ActiveInferenceResult["severity"] = "none";
  if (freeEnergy >= FREE_ENERGY_THRESHOLD_HIGH) severity = "high";
  else if (freeEnergy >= FREE_ENERGY_THRESHOLD_LOW) severity = "low";

  // Generate disclaimer if needed
  let disclaimer: string | null = null;
  if (severity === "high") {
    disclaimer = "⚠️ Alerta: esta resposta contém referências que não puderam ser verificadas. Recomenda-se conferir as citações legais antes de utilizar.";
  } else if (severity === "low") {
    disclaimer = "ℹ️ Algumas referências desta resposta podem necessitar de verificação adicional.";
  }

  const elapsed = performance.now() - t0;

  return {
    passed: severity === "none",
    freeEnergy,
    severity,
    errors,
    hallucinations,
    quality,
    disclaimer,
    timestamp: elapsed,
  };
}

/**
 * Quick check: should the system attempt correction?
 * OPTIMIZED: Also correct low severity to prevent hallucinations
 */
export function shouldCorrect(result: ActiveInferenceResult): boolean {
  return result.severity === "high" || result.severity === "low";
}

/**
 * Should block the response entirely?
 * NEW: Responses with high FE or hallucinations should be blocked
 */
export function shouldBlockResponse(result: ActiveInferenceResult): boolean {
  return result.freeEnergy > BLOCK_THRESHOLD || 
         result.hallucinations.some(h => h.severity === "high");
}

/**
 * Generate a correction prompt for the LLM to re-process.
 */
export function generateCorrectionPrompt(
  query: string,
  _response: string,
  errors: PredictionError[]
): string {
  const issues = errors.map(e => `- ${e.detail}`).join("\n");
  return `A resposta anterior apresentou os seguintes problemas de verificação:
${issues}

Pergunta original: "${query}"

Por favor, reformule a resposta corrigindo as referências incorretas e sendo mais preciso. Se não tiver certeza sobre uma referência legal, indique explicitamente.`;
}

// ═══ Quantum Free Energy (Wave Function backbone) ═══

import {
  createWaveFunction,
  entropy as wfEntropy,
  normalizedEntropy,
  collapse as wfCollapse,
  decohere,
  getMetrics,
  type WaveFunction,
  type WaveFunctionMetrics,
} from "./quantum-wave-function";

export interface QuantumFreeEnergyResult extends ActiveInferenceResult {
  /** Quantum metrics from the wave function */
  quantumMetrics: WaveFunctionMetrics;
  /** Pre-collapse entropy (raw uncertainty) */
  quantumEntropy: number;
  /** Post-collapse bit string */
  collapsedState: string;
  /** Which error dimensions "activated" (collapsed to |1⟩) */
  activatedErrors: string[];
}

/**
 * Quantum-enhanced Free Energy computation.
 * 
 * Each prediction error signal becomes a qubit in a wave function register.
 * Free Energy = von Neumann entropy of the combined state.
 * Severity is determined by collapsing the register and observing results.
 * Decoherence models confidence degradation over response length.
 * 
 * Advantage over classical: captures interference between error signals,
 * models uncertainty more faithfully, and allows partial measurement.
 */
export function computeQuantumFreeEnergy(
  query: string,
  response: string,
  amplifiedIntent?: string,
  intentConfidence?: number
): QuantumFreeEnergyResult {
  const t0 = performance.now();
  const classicalErrors: PredictionError[] = [];

  // 1. Compute classical error signals (reuse existing detectors)
  const coherence = computeSemanticCoherence(amplifiedIntent || query, response);
  const semanticDelta = coherence < 0.2 ? (1 - coherence) * 0.4 : 0;
  if (semanticDelta > 0) {
    classicalErrors.push({
      source: "semantic_drift",
      delta: semanticDelta,
      detail: `Baixa coerência semântica (${(coherence * 100).toFixed(0)}%)`,
    });
  }

  const fabErrors = detectFabricationSignals(response);
  classicalErrors.push(...fabErrors);

  const hallucinations = detectHallucinations(response);
  const highSev = hallucinations.filter(h => h.severity === "high");
  const hallucinationDelta = highSev.length > 0 ? Math.min(highSev.length * 0.2, 0.8) : 0;
  if (hallucinationDelta > 0) {
    classicalErrors.push({
      source: "hallucination_detector",
      delta: hallucinationDelta,
      detail: `${highSev.length} referência(s) suspeita(s)`,
    });
  }

  const propError = checkProportionality(query, response);
  if (propError) classicalErrors.push(propError);

  let quality: QualityResult | null = null;
  let qualityDelta = 0;
  try {
    quality = checkResponseQuality(response, "", amplifiedIntent);
    if (quality.score < 40) {
      qualityDelta = (100 - quality.score) / 200;
      classicalErrors.push({
        source: "quality_gate",
        delta: qualityDelta,
        detail: `Score qualidade: ${quality.score}/100`,
      });
    }
  } catch { /* best-effort */ }

  const intentDelta = (intentConfidence !== undefined && intentConfidence < 0.3) ? 0.15 : 0;
  if (intentDelta > 0) {
    classicalErrors.push({
      source: "low_intent_confidence",
      delta: intentDelta,
      detail: `Confiança intenção: ${((intentConfidence ?? 0) * 100).toFixed(0)}%`,
    });
  }

  // 2. Build quantum wave function from error signals
  const dimensions: Record<string, number> = {
    semantic: Math.min(1, semanticDelta * 2.5),
    fabrication: Math.min(1, fabErrors.reduce((s, e) => s + e.delta, 0)),
    hallucination: Math.min(1, hallucinationDelta),
    proportionality: propError ? propError.delta : 0,
    quality: Math.min(1, qualityDelta * 2),
    intent: intentDelta > 0 ? 0.7 : 0,
  };

  let wf = createWaveFunction("free_energy", dimensions);

  // 3. Apply decoherence based on response length (longer → more noise)
  const responseLength = countWords(response);
  const noiseLevel = Math.min(0.15, responseLength / 10000);
  wf = decohere(wf, noiseLevel);

  // 4. Compute quantum metrics
  const qEntropy = wfEntropy(wf);
  const metrics = getMetrics(wf);

  // 5. Collapse to determine severity
  const collapseResult = wfCollapse(wf);
  const activatedErrors = collapseResult.outcomes
    .map((o, i) => o === 1 ? wf.basisLabels[i] : null)
    .filter((l): l is string => l !== null);

  // 6. Quantum Free Energy = normalized entropy × 100
  const quantumFE = Math.round(metrics.normalizedEntropy * 100);

  // Combine with classical for robustness
  const classicalDelta = classicalErrors.reduce((s, e) => s + e.delta, 0);
  const classicalFE = Math.min(100, Math.round(classicalDelta * 100));
  const freeEnergy = Math.round(quantumFE * 0.6 + classicalFE * 0.4);

  // Severity from activated error count + entropy
  let severity: ActiveInferenceResult["severity"] = "none";
  if (freeEnergy >= FREE_ENERGY_THRESHOLD_HIGH || activatedErrors.length >= 3) {
    severity = "high";
  } else if (freeEnergy >= FREE_ENERGY_THRESHOLD_LOW || activatedErrors.length >= 2) {
    severity = "low";
  }

  let disclaimer: string | null = null;
  if (severity === "high") {
    disclaimer = "⚠️ Alerta: esta resposta contém referências que não puderam ser verificadas. Recomenda-se conferir as citações legais antes de utilizar.";
  } else if (severity === "low") {
    disclaimer = "ℹ️ Algumas referências desta resposta podem necessitar de verificação adicional.";
  }

  return {
    passed: severity === "none",
    freeEnergy,
    severity,
    errors: classicalErrors,
    hallucinations,
    quality,
    disclaimer,
    timestamp: performance.now() - t0,
    quantumMetrics: metrics,
    quantumEntropy: qEntropy,
    collapsedState: collapseResult.bitString,
    activatedErrors,
  };
}
