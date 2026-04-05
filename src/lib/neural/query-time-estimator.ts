/**
 * ─── Query Time Estimator v1 ───
 * Estimates response time based on query complexity and historical latencies.
 * Provides user-facing messages for deep queries.
 */

import type { ThinkingMode } from "./cognitive-fast-reasoner";

export interface TimeEstimate {
  estimatedMs: number;
  isDeep: boolean;
  message: string;
  spokenMessage: string;
  complexity: "trivial" | "simple" | "moderate" | "complex" | "deep";
}

interface LatencyRecord {
  intentType: string;
  mode: ThinkingMode;
  latencyMs: number;
  timestamp: number;
}

const STORAGE_KEY = "orion_latency_history_v1";
const MAX_RECORDS = 100;
const RECORD_TTL_MS = 7 * 24 * 3600 * 1000; // 7 days

// ═══ Default latency estimates (ms) ═══
const DEFAULT_ESTIMATES: Record<string, number> = {
  "trivial": 500,
  "simple": 2000,
  "moderate": 5000,
  "complex": 10000,
  "deep": 20000,
};

// ═══ Deep analysis triggers ═══
const DEEP_ANALYSIS_PATTERNS = [
  /\b(analis[ae]|analise|audit[ae]|verifi[cq]|diagnostic)/i,
  /\b(sistema|arquitetura|infraestrutura|pipeline|backend)\b/i,
  /\b(lacunas?|gaps?|falhas?|vulnerabilidade)/i,
  /\b(complet[ao]|profund[ao]|detalhad[ao]|minucios[ao])/i,
  /\b(evolutivo|auto.?evol|self.?evol)/i,
  /\b(compar[ae]|diferen[cç]a\s+entre)/i,
  /\b(jurisprud[eê]ncia|constitucional|hermenêutic)/i,
  /\b(consequências|implicações|impacto)/i,
  /\b(tese.*defesa|estratégia|argumenta)/i,
  /\b(relatório|report|sumário\s+executivo)/i,
];

const MODERATE_PATTERNS = [
  /\b(expliq|como\s+funciona|qual\s+o\s+procedimento)/i,
  /\b(requisitos|hipóteses|cabimento)/i,
  /\b(vantagens|desvantagens|prós|contras)/i,
  /\b(passo\s+a\s+passo|etapas|fases)/i,
];

// ═══ Latency History ═══

function loadHistory(): LatencyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const records: LatencyRecord[] = JSON.parse(raw);
    const cutoff = Date.now() - RECORD_TTL_MS;
    return records.filter(r => r.timestamp > cutoff);
  } catch {
    return [];
  }
}

function saveHistory(records: LatencyRecord[]) {
  try {
    const trimmed = records
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
}

/**
 * Record actual latency for calibration.
 */
export function recordLatency(intentType: string, mode: ThinkingMode, latencyMs: number) {
  const records = loadHistory();
  records.push({ intentType, mode, latencyMs, timestamp: Date.now() });
  saveHistory(records);
}

/**
 * Get average latency for a mode from history.
 */
function getHistoricalAverage(mode: ThinkingMode): number | null {
  const records = loadHistory().filter(r => r.mode === mode);
  if (records.length < 3) return null; // Not enough data
  const avg = records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length;
  return Math.round(avg);
}

/**
 * Classify query complexity.
 */
function classifyComplexity(question: string): TimeEstimate["complexity"] {
  const wordCount = question.split(/\s+/).length;
  
  // Deep analysis patterns
  if (DEEP_ANALYSIS_PATTERNS.some(p => p.test(question))) return "deep";
  
  // Moderate patterns
  if (MODERATE_PATTERNS.some(p => p.test(question))) return "moderate";
  
  // Word count heuristics
  if (wordCount > 30) return "complex";
  if (wordCount > 15) return "moderate";
  if (wordCount < 5) return "trivial";
  
  return "simple";
}

/**
 * Format time for user display.
 */
function formatTime(ms: number): string {
  if (ms < 1000) return "menos de 1 segundo";
  const seconds = Math.ceil(ms / 1000);
  if (seconds <= 5) return `${seconds} segundos`;
  if (seconds <= 15) return `cerca de ${Math.ceil(seconds / 5) * 5} segundos`;
  if (seconds <= 30) return "cerca de 20 segundos";
  return "até 30 segundos";
}

/**
 * Estimate response time and generate user feedback.
 */
export function estimateResponseTime(
  question: string,
  mode: ThinkingMode,
  intentType?: string,
): TimeEstimate {
  const complexity = classifyComplexity(question);
  const isDeep = mode === "deep" || complexity === "deep" || complexity === "complex";
  
  // Get estimated time
  let estimatedMs: number;
  const historicalAvg = getHistoricalAverage(mode);
  if (historicalAvg) {
    // Blend historical with default (70% historical, 30% default)
    const defaultMs = DEFAULT_ESTIMATES[complexity] || 5000;
    estimatedMs = Math.round(historicalAvg * 0.7 + defaultMs * 0.3);
  } else {
    estimatedMs = DEFAULT_ESTIMATES[complexity] || 5000;
  }
  
  // Build user-facing messages
  let message: string;
  let spokenMessage: string;
  
  if (!isDeep) {
    message = "";
    spokenMessage = "";
  } else {
    const timeStr = formatTime(estimatedMs);
    
    // Contextual messages based on what's being analyzed
    if (/sistema|arquitetura|pipeline/i.test(question)) {
      message = `🔍 Análise de sistema solicitada. Verificando arquitetura e módulos. Tempo estimado: ${timeStr}.`;
      spokenMessage = `Análise profunda do sistema iniciada. Aguarde aproximadamente ${timeStr}.`;
    } else if (/lacunas?|gaps?|falhas?/i.test(question)) {
      message = `🔍 Verificação de lacunas iniciada. Escaneando todos os módulos. Tempo estimado: ${timeStr}.`;
      spokenMessage = `Verificação profunda de lacunas iniciada. Tempo estimado: ${timeStr}.`;
    } else if (/jurisprud|constitucional|legal/i.test(question)) {
      message = `⚖️ Análise jurídica profunda. Consultando bases de dados. Tempo estimado: ${timeStr}.`;
      spokenMessage = `Análise jurídica profunda em andamento. Aguarde ${timeStr}.`;
    } else if (/compara|diferen[cç]a/i.test(question)) {
      message = `📊 Análise comparativa solicitada. Tempo estimado: ${timeStr}.`;
      spokenMessage = `Iniciando análise comparativa. Tempo estimado: ${timeStr}.`;
    } else {
      message = `🧠 Análise profunda solicitada. Tempo estimado: ${timeStr}.`;
      spokenMessage = `Isso requer análise profunda. Aguarde aproximadamente ${timeStr}.`;
    }
  }
  
  return {
    estimatedMs,
    isDeep,
    message,
    spokenMessage,
    complexity,
  };
}

/**
 * Get estimator stats for debugging.
 */
export function getEstimatorStats() {
  const records = loadHistory();
  const byMode: Record<string, { count: number; avgMs: number }> = {};
  
  for (const r of records) {
    if (!byMode[r.mode]) byMode[r.mode] = { count: 0, avgMs: 0 };
    byMode[r.mode].count++;
    byMode[r.mode].avgMs += r.latencyMs;
  }
  
  for (const mode of Object.keys(byMode)) {
    byMode[mode].avgMs = Math.round(byMode[mode].avgMs / byMode[mode].count);
  }
  
  return { totalRecords: records.length, byMode };
}
