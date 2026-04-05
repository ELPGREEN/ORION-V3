/**
 * ─── v22.8: Lovable AI Reasoning Capture Engine (Enhanced) ───
 * Captura e sintetiza padrões de raciocínio das últimas 24h
 * usando a Lovable AI Gateway para enriquecer o grafo causal,
 * meta-aprendizagem e teoria da mente do Orion.
 *
 * v22.8 Improvements:
 *  - Deeper pattern analysis (temporal trends, provider efficiency, tool co-occurrence)
 *  - Expanded cognitive profile (entropy, adaptation rate, cognitive load, flow states)
 *  - Enhanced causal graph integration (confidence decay, counterfactual reasoning)
 *  - Optimized multi-tier cache with LRU eviction and invalidation signals
 *
 * Ref: Kahneman (2011) "Thinking, Fast and Slow" — System 2 reflection
 *      Schacter et al. (2007) "Constructive Memory and the Simulation of Future Events"
 *      Friston (2010) "The Free-Energy Principle" — Active Inference
 */

import { supabase } from "@/integrations/supabase/client";
import {
  addCausalNode,
  addCausalLink,
  learnCausalPatterns,
  type CausalGraph,
  type CausalNode,
} from "./causal-reasoning";
import {
  recordLearningOutcome,
  type MetaLearningState,
} from "./meta-learning";
import {
  updateFromInteraction,
  type UserMentalModel,
} from "./theory-of-mind";

// ─── Types ───

export interface ReasoningSnapshot {
  timestamp: number;
  query: string;
  provider: string;
  success: boolean;
  durationMs: number;
  complexity: string;
  qualityScore: number | null;
  toolsUsed: string[];
  dataSources: string[];
  neuroModulator: string | null;
  explorationRate: number | null;
}

export interface TemporalTrend {
  period: string;
  successRate: number;
  avgDuration: number;
  volumeChange: number; // % change vs previous period
  dominantComplexity: string;
}

export interface ToolCoOccurrence {
  toolA: string;
  toolB: string;
  frequency: number;
  avgQualityWhenPaired: number;
}

export interface ProviderEfficiency {
  provider: string;
  avgDuration: number;
  successRate: number;
  avgQuality: number;
  costEfficiency: number; // quality / duration ratio
  bestForComplexity: string;
}

export interface CognitiveMetrics {
  entropy: number; // decision randomness (0=deterministic, 1=random)
  adaptationRate: number; // how fast strategies change (0-1)
  cognitiveLoad: number; // avg complexity-weighted processing burden (0-1)
  flowStateRatio: number; // % of interactions in "flow" (fast + high quality)
  explorationExploitationBalance: number; // 0=pure exploit, 1=pure explore
  metacognitiveAccuracy: number; // how well predictions match outcomes
  attentionalFocus: number; // concentration on dominant task types (0-1)
  resilience: number; // recovery rate from failures (0-1)
}

export interface ReasoningReflection {
  patterns: string[];
  causalInsights: Array<{ cause: string; effect: string; strength: number; mechanism: string; confidence: number; counterfactual: string }>;
  strategyRecommendations: Array<{ strategyId: string; adjustment: string; reason: string; priority: number }>;
  cognitiveProfile: {
    dominantMode: "analytical" | "creative" | "retrieval" | "mixed";
    avgComplexity: string;
    successRate: number;
    avgResponseTime: number;
    topTools: string[];
    weakAreas: string[];
    metrics: CognitiveMetrics;
    temporalTrends: TemporalTrend[];
    providerEfficiency: ProviderEfficiency[];
    toolCoOccurrences: ToolCoOccurrence[];
  };
  metaInsight: string;
  generatedAt: number;
  analysisDepth: "shallow" | "standard" | "deep";
  version: string;
}

// ─── Cache System (Multi-tier with LRU) ───

const REFLECTION_CACHE_KEY = "orion_reasoning_reflection_v2";
const REFLECTION_INDEX_KEY = "orion_reflection_index";
const CACHE_MAX_ENTRIES = 5;
const CACHE_TIERS = {
  hot: 1 * 60 * 60 * 1000,    // 1h — return immediately
  warm: 4 * 60 * 60 * 1000,   // 4h — return but refresh in background
  cold: 12 * 60 * 60 * 1000,  // 12h — stale, force refresh
} as const;

interface CacheEntry {
  data: ReasoningReflection;
  storedAt: number;
  accessCount: number;
  lastAccessed: number;
  dataHash: string;
}

function computeDataHash(snapshots: ReasoningSnapshot[]): string {
  const key = snapshots.slice(0, 10).map(s => `${s.timestamp}:${s.success}:${s.provider}`).join("|");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

function getCachedReflection(dataHash: string): { reflection: ReasoningReflection | null; tier: "hot" | "warm" | "cold" | "miss" } {
  try {
    const raw = localStorage.getItem(REFLECTION_CACHE_KEY);
    if (!raw) return { reflection: null, tier: "miss" };

    const entries: CacheEntry[] = JSON.parse(raw);
    const entry = entries.find(e => e.dataHash === dataHash);
    if (!entry) return { reflection: null, tier: "miss" };

    const age = Date.now() - entry.storedAt;
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    localStorage.setItem(REFLECTION_CACHE_KEY, JSON.stringify(entries));

    if (age < CACHE_TIERS.hot) return { reflection: entry.data, tier: "hot" };
    if (age < CACHE_TIERS.warm) return { reflection: entry.data, tier: "warm" };
    if (age < CACHE_TIERS.cold) return { reflection: entry.data, tier: "cold" };
    return { reflection: null, tier: "miss" };
  } catch {
    return { reflection: null, tier: "miss" };
  }
}

function setCachedReflection(reflection: ReasoningReflection, dataHash: string): void {
  try {
    const raw = localStorage.getItem(REFLECTION_CACHE_KEY);
    let entries: CacheEntry[] = raw ? JSON.parse(raw) : [];

    // Remove existing entry with same hash
    entries = entries.filter(e => e.dataHash !== dataHash);

    // LRU eviction
    if (entries.length >= CACHE_MAX_ENTRIES) {
      entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
      entries = entries.slice(1);
    }

    entries.push({
      data: reflection,
      storedAt: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      dataHash,
    });

    localStorage.setItem(REFLECTION_CACHE_KEY, JSON.stringify(entries));
  } catch {}
}

// ─── Fetch 24h Reasoning Data ───

export async function fetch24hReasoningData(): Promise<ReasoningSnapshot[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("ai_metrics")
    .select("created_at, query, provider, success, total_duration_ms, complexity, overall_quality_score, tools_used, data_sources_used, neuro_dominant_modulator, neuro_exploration_rate")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200); // Increased from 100 for deeper analysis

  if (error || !data) {
    console.warn("[ReasoningEngine] Failed to fetch metrics:", error?.message);
    return [];
  }

  return data.map((row) => ({
    timestamp: new Date(row.created_at).getTime(),
    query: row.query || "",
    provider: row.provider,
    success: row.success ?? true,
    durationMs: row.total_duration_ms,
    complexity: row.complexity || "medium",
    qualityScore: row.overall_quality_score,
    toolsUsed: row.tools_used || [],
    dataSources: row.data_sources_used || [],
    neuroModulator: row.neuro_dominant_modulator,
    explorationRate: row.neuro_exploration_rate,
  }));
}

// ─── Deep Pattern Analysis ───

function analyzeTemporalTrends(snapshots: ReasoningSnapshot[]): TemporalTrend[] {
  if (snapshots.length < 2) return [];

  const now = Date.now();
  const periods = [
    { label: "0-6h", start: now - 6 * 3600000, end: now },
    { label: "6-12h", start: now - 12 * 3600000, end: now - 6 * 3600000 },
    { label: "12-18h", start: now - 18 * 3600000, end: now - 12 * 3600000 },
    { label: "18-24h", start: now - 24 * 3600000, end: now - 18 * 3600000 },
  ];

  const trends: TemporalTrend[] = [];
  let prevVolume = 0;

  for (const p of periods.reverse()) {
    const inPeriod = snapshots.filter(s => s.timestamp >= p.start && s.timestamp < p.end);
    if (inPeriod.length === 0) {
      prevVolume = 0;
      continue;
    }

    const successRate = inPeriod.filter(s => s.success).length / inPeriod.length;
    const avgDuration = inPeriod.reduce((s, x) => s + x.durationMs, 0) / inPeriod.length;
    const volumeChange = prevVolume > 0 ? ((inPeriod.length - prevVolume) / prevVolume) * 100 : 0;

    const complexityCounts = new Map<string, number>();
    for (const s of inPeriod) {
      complexityCounts.set(s.complexity, (complexityCounts.get(s.complexity) || 0) + 1);
    }
    const dominantComplexity = [...complexityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "medium";

    trends.push({ period: p.label, successRate, avgDuration, volumeChange, dominantComplexity });
    prevVolume = inPeriod.length;
  }

  return trends;
}

function analyzeToolCoOccurrences(snapshots: ReasoningSnapshot[]): ToolCoOccurrence[] {
  const pairCounts = new Map<string, { count: number; qualitySum: number }>();

  for (const s of snapshots) {
    const tools = s.toolsUsed;
    for (let i = 0; i < tools.length; i++) {
      for (let j = i + 1; j < tools.length; j++) {
        const key = [tools[i], tools[j]].sort().join("⊗");
        const existing = pairCounts.get(key) || { count: 0, qualitySum: 0 };
        existing.count++;
        existing.qualitySum += s.qualityScore || 0.5;
        pairCounts.set(key, existing);
      }
    }
  }

  return [...pairCounts.entries()]
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([key, val]) => {
      const [toolA, toolB] = key.split("⊗");
      return { toolA, toolB, frequency: val.count, avgQualityWhenPaired: val.qualitySum / val.count };
    });
}

function analyzeProviderEfficiency(snapshots: ReasoningSnapshot[]): ProviderEfficiency[] {
  const providerData = new Map<string, { durations: number[]; successes: number; total: number; qualities: number[]; complexities: string[] }>();

  for (const s of snapshots) {
    const d = providerData.get(s.provider) || { durations: [], successes: 0, total: 0, qualities: [], complexities: [] };
    d.durations.push(s.durationMs);
    if (s.success) d.successes++;
    d.total++;
    if (s.qualityScore != null) d.qualities.push(s.qualityScore);
    d.complexities.push(s.complexity);
    providerData.set(s.provider, d);
  }

  return [...providerData.entries()].map(([provider, d]) => {
    const avgDuration = d.durations.reduce((a, b) => a + b, 0) / d.durations.length;
    const avgQuality = d.qualities.length > 0 ? d.qualities.reduce((a, b) => a + b, 0) / d.qualities.length : 0.5;
    const successRate = d.successes / d.total;

    // Best complexity = complexity with highest success rate
    const cxMap = new Map<string, { ok: number; total: number }>();
    d.complexities.forEach((cx, i) => {
      const e = cxMap.get(cx) || { ok: 0, total: 0 };
      e.total++;
      if (i < d.durations.length && d.durations[i] < avgDuration * 1.5) e.ok++;
      cxMap.set(cx, e);
    });
    const bestForComplexity = [...cxMap.entries()].sort((a, b) => (b[1].ok / b[1].total) - (a[1].ok / a[1].total))[0]?.[0] || "medium";

    return {
      provider,
      avgDuration,
      successRate,
      avgQuality,
      costEfficiency: avgDuration > 0 ? (avgQuality * 1000) / avgDuration : 0,
      bestForComplexity,
    };
  });
}

function computeCognitiveMetrics(snapshots: ReasoningSnapshot[]): CognitiveMetrics {
  if (snapshots.length === 0) {
    return { entropy: 0, adaptationRate: 0, cognitiveLoad: 0, flowStateRatio: 0, explorationExploitationBalance: 0.5, metacognitiveAccuracy: 0, attentionalFocus: 0, resilience: 0 };
  }

  // Entropy: Shannon entropy of provider distribution
  const providerFreqs = new Map<string, number>();
  for (const s of snapshots) providerFreqs.set(s.provider, (providerFreqs.get(s.provider) || 0) + 1);
  const total = snapshots.length;
  let entropy = 0;
  for (const [, count] of providerFreqs) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(Math.max(providerFreqs.size, 1));
  entropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

  // Adaptation rate: how much tool/provider usage changed across halves
  const mid = Math.floor(snapshots.length / 2);
  const firstHalf = snapshots.slice(mid);
  const secondHalf = snapshots.slice(0, mid);
  const firstProviders = new Set(firstHalf.map(s => s.provider));
  const secondProviders = new Set(secondHalf.map(s => s.provider));
  const newProviders = [...secondProviders].filter(p => !firstProviders.has(p)).length;
  const adaptationRate = Math.min(1, newProviders / Math.max(firstProviders.size, 1));

  // Cognitive load: complexity-weighted burden
  const complexityWeights: Record<string, number> = { simple: 0.2, medium: 0.5, high: 0.8, expert: 1.0 };
  const cognitiveLoad = snapshots.reduce((sum, s) => sum + (complexityWeights[s.complexity] || 0.5), 0) / snapshots.length;

  // Flow state: fast responses + high quality
  const medianDuration = [...snapshots.map(s => s.durationMs)].sort((a, b) => a - b)[Math.floor(snapshots.length / 2)];
  const flowCount = snapshots.filter(s => s.success && s.durationMs < medianDuration && (s.qualityScore || 0) > 0.7).length;
  const flowStateRatio = flowCount / snapshots.length;

  // Exploration-exploitation balance
  const avgExploration = snapshots.reduce((sum, s) => sum + (s.explorationRate || 0.5), 0) / snapshots.length;

  // Metacognitive accuracy: does complexity prediction match actual difficulty?
  const highComplexity = snapshots.filter(s => s.complexity === "high" || s.complexity === "expert");
  const highSuccess = highComplexity.filter(s => s.success).length;
  const metacognitiveAccuracy = highComplexity.length > 0 ? highSuccess / highComplexity.length : 0.5;

  // Attentional focus: concentration of tool usage
  const toolFreqs = new Map<string, number>();
  let totalTools = 0;
  for (const s of snapshots) {
    for (const t of s.toolsUsed) {
      toolFreqs.set(t, (toolFreqs.get(t) || 0) + 1);
      totalTools++;
    }
  }
  const topToolFreq = toolFreqs.size > 0 ? Math.max(...toolFreqs.values()) : 0;
  const attentionalFocus = totalTools > 0 ? topToolFreq / totalTools : 0;

  // Resilience: recovery after failure
  let recoveries = 0, failuresSeen = 0;
  for (let i = 1; i < snapshots.length; i++) {
    if (!snapshots[i].success) {
      failuresSeen++;
    } else if (failuresSeen > 0 && snapshots[i].success) {
      recoveries++;
      failuresSeen = 0;
    }
  }
  const totalFailures = snapshots.filter(s => !s.success).length;
  const resilience = totalFailures > 0 ? Math.min(1, recoveries / totalFailures) : 1;

  return { entropy, adaptationRate, cognitiveLoad, flowStateRatio, explorationExploitationBalance: avgExploration, metacognitiveAccuracy, attentionalFocus, resilience };
}

// ─── Local Analysis (Enhanced) ───

function analyzeLocally(snapshots: ReasoningSnapshot[]): Partial<ReasoningReflection> {
  if (snapshots.length === 0) {
    return {
      patterns: ["Sem interações nas últimas 24h"],
      cognitiveProfile: {
        dominantMode: "mixed",
        avgComplexity: "N/A",
        successRate: 0,
        avgResponseTime: 0,
        topTools: [],
        weakAreas: [],
        metrics: computeCognitiveMetrics([]),
        temporalTrends: [],
        providerEfficiency: [],
        toolCoOccurrences: [],
      },
      analysisDepth: "shallow",
    };
  }

  const successCount = snapshots.filter((s) => s.success).length;
  const successRate = successCount / snapshots.length;
  const avgDuration = snapshots.reduce((sum, s) => sum + s.durationMs, 0) / snapshots.length;

  // Tool frequency
  const toolCounts = new Map<string, number>();
  for (const s of snapshots) {
    for (const t of s.toolsUsed) {
      toolCounts.set(t, (toolCounts.get(t) || 0) + 1);
    }
  }
  const topTools = [...toolCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);

  // Complexity distribution
  const complexityCounts = new Map<string, number>();
  for (const s of snapshots) {
    complexityCounts.set(s.complexity, (complexityCounts.get(s.complexity) || 0) + 1);
  }
  const avgComplexity = [...complexityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "medium";

  // Failure analysis
  const failures = snapshots.filter((s) => !s.success);
  const weakAreas = failures.length > 0 ? [...new Set(failures.map((f) => f.complexity))] : [];

  // Dominant cognitive mode
  const hasVision = snapshots.some((s) => s.toolsUsed.some((t) => t.includes("vision") || t.includes("image")));
  const hasSearch = snapshots.some((s) => s.dataSources.some((d) => d.includes("search") || d.includes("web")));
  const hasAnalysis = snapshots.some((s) => s.complexity === "high" || s.complexity === "expert");
  const dominantMode: ReasoningReflection["cognitiveProfile"]["dominantMode"] =
    hasAnalysis ? "analytical" : hasSearch ? "retrieval" : hasVision ? "creative" : "mixed";

  // Deep analysis
  const metrics = computeCognitiveMetrics(snapshots);
  const temporalTrends = analyzeTemporalTrends(snapshots);
  const providerEfficiency = analyzeProviderEfficiency(snapshots);
  const toolCoOccurrences = analyzeToolCoOccurrences(snapshots);

  // Patterns (enriched)
  const patterns: string[] = [];
  patterns.push(`${snapshots.length} interações processadas nas últimas 24h`);
  patterns.push(`Taxa de sucesso: ${(successRate * 100).toFixed(0)}%`);
  patterns.push(`Tempo médio de resposta: ${(avgDuration / 1000).toFixed(1)}s`);
  if (topTools.length > 0) patterns.push(`Ferramentas mais usadas: ${topTools.join(", ")}`);

  // Temporal insight
  if (temporalTrends.length >= 2) {
    const recent = temporalTrends[temporalTrends.length - 1];
    const older = temporalTrends[0];
    if (recent.successRate > older.successRate + 0.1) {
      patterns.push(`📈 Tendência positiva: taxa de sucesso subindo (${(older.successRate * 100).toFixed(0)}% → ${(recent.successRate * 100).toFixed(0)}%)`);
    } else if (recent.successRate < older.successRate - 0.1) {
      patterns.push(`📉 Alerta: taxa de sucesso em declínio (${(older.successRate * 100).toFixed(0)}% → ${(recent.successRate * 100).toFixed(0)}%)`);
    }
  }

  // Cognitive metrics insights
  if (metrics.flowStateRatio > 0.5) patterns.push(`🌊 Alto estado de fluxo: ${(metrics.flowStateRatio * 100).toFixed(0)}% das interações em modo ótimo`);
  if (metrics.entropy > 0.8) patterns.push(`🔄 Alta diversidade de providers — exploração ativa`);
  if (metrics.resilience > 0.8) patterns.push(`💪 Boa resiliência: recuperação rápida após falhas`);
  if (metrics.cognitiveLoad > 0.7) patterns.push(`⚠️ Carga cognitiva elevada — considerar simplificação`);

  // Provider efficiency insight
  if (providerEfficiency.length > 1) {
    const best = providerEfficiency.sort((a, b) => b.costEfficiency - a.costEfficiency)[0];
    patterns.push(`⚡ Provider mais eficiente: ${best.provider} (custo-benefício: ${best.costEfficiency.toFixed(2)})`);
  }

  // Tool synergies
  if (toolCoOccurrences.length > 0) {
    const best = toolCoOccurrences[0];
    patterns.push(`🔗 Melhor sinergia: ${best.toolA} + ${best.toolB} (qualidade: ${best.avgQualityWhenPaired.toFixed(2)})`);
  }

  const depth = snapshots.length >= 50 ? "deep" : snapshots.length >= 10 ? "standard" : "shallow";

  return {
    patterns,
    cognitiveProfile: {
      dominantMode,
      avgComplexity,
      successRate,
      avgResponseTime: avgDuration,
      topTools,
      weakAreas,
      metrics,
      temporalTrends,
      providerEfficiency,
      toolCoOccurrences,
    },
    analysisDepth: depth,
  };
}

// ─── AI-Enhanced Reflection via Lovable Gateway ───

export async function generateReasoningReflection(
  snapshots: ReasoningSnapshot[]
): Promise<ReasoningReflection> {
  const dataHash = computeDataHash(snapshots);

  // Multi-tier cache check
  const { reflection: cached, tier } = getCachedReflection(dataHash);
  if (cached && tier === "hot") {
    console.log("[ReasoningEngine] Cache HIT (hot tier)");
    return cached;
  }

  const localAnalysis = analyzeLocally(snapshots);

  if (snapshots.length < 3) {
    const reflection: ReasoningReflection = {
      patterns: localAnalysis.patterns || [],
      causalInsights: [],
      strategyRecommendations: [],
      cognitiveProfile: localAnalysis.cognitiveProfile!,
      metaInsight: "Dados insuficientes para reflexão profunda. Continuar coletando interações.",
      generatedAt: Date.now(),
      analysisDepth: "shallow",
      version: "22.8",
    };
    return reflection;
  }

  // If warm cache, return cached but trigger background refresh
  if (cached && tier === "warm") {
    console.log("[ReasoningEngine] Cache HIT (warm tier) — background refresh triggered");
    refreshReflectionInBackground(snapshots, localAnalysis, dataHash);
    return cached;
  }

  return await generateFreshReflection(snapshots, localAnalysis, dataHash);
}

async function refreshReflectionInBackground(
  snapshots: ReasoningSnapshot[],
  localAnalysis: Partial<ReasoningReflection>,
  dataHash: string
): Promise<void> {
  // Fire-and-forget background refresh
  generateFreshReflection(snapshots, localAnalysis, dataHash).catch(e => {
    console.warn("[ReasoningEngine] Background refresh failed:", e);
  });
}

async function generateFreshReflection(
  snapshots: ReasoningSnapshot[],
  localAnalysis: Partial<ReasoningReflection>,
  dataHash: string
): Promise<ReasoningReflection> {
  // Prepare condensed summary with deeper data
  const summary = snapshots.slice(0, 50).map((s) => ({
    q: s.query?.slice(0, 80) || "?",
    ok: s.success,
    ms: s.durationMs,
    cx: s.complexity,
    qs: s.qualityScore,
    tools: s.toolsUsed.slice(0, 3),
    mod: s.neuroModulator,
    src: s.dataSources.slice(0, 2),
  }));

  const profile = localAnalysis.cognitiveProfile!;

  try {
    const { data, error } = await supabase.functions.invoke("neural-ops", {
      body: {
        action: "reasoning_reflect",
        snapshots: summary,
        localAnalysis: {
          successRate: profile.successRate,
          avgResponseTime: profile.avgResponseTime,
          topTools: profile.topTools,
          weakAreas: profile.weakAreas,
          dominantMode: profile.dominantMode,
          metrics: profile.metrics,
          temporalTrends: profile.temporalTrends,
          providerEfficiency: profile.providerEfficiency,
          toolCoOccurrences: profile.toolCoOccurrences,
        },
      },
    });

    if (error) throw error;

    const reflection: ReasoningReflection = {
      patterns: localAnalysis.patterns || [],
      causalInsights: (data?.causalInsights || []).map((ci: any) => ({
        ...ci,
        confidence: ci.confidence ?? ci.strength ?? 0.5,
        counterfactual: ci.counterfactual ?? `Sem ${ci.cause}, ${ci.effect} não ocorreria`,
      })),
      strategyRecommendations: (data?.strategyRecommendations || []).map((sr: any, i: number) => ({
        ...sr,
        priority: sr.priority ?? (i + 1),
      })),
      cognitiveProfile: profile,
      metaInsight: data?.metaInsight || "Reflexão gerada com sucesso.",
      generatedAt: Date.now(),
      analysisDepth: localAnalysis.analysisDepth || "standard",
      version: "22.8",
    };

    setCachedReflection(reflection, dataHash);
    return reflection;
  } catch (e) {
    console.warn("[ReasoningEngine] AI reflection failed, using local analysis:", e);
    const fallback: ReasoningReflection = {
      patterns: localAnalysis.patterns || [],
      causalInsights: [],
      strategyRecommendations: [],
      cognitiveProfile: profile,
      metaInsight: "Reflexão local (sem IA). " + (localAnalysis.patterns?.join(". ") || ""),
      generatedAt: Date.now(),
      analysisDepth: localAnalysis.analysisDepth || "shallow",
      version: "22.8",
    };
    setCachedReflection(fallback, dataHash);
    return fallback;
  }
}

// ─── Integrate Reflection into Cognitive Systems ───

/**
 * Feed reflection insights into the causal graph (enhanced).
 * Adds causal nodes with confidence decay and counterfactual annotations.
 */
export function integrateIntoCausalGraph(
  graph: CausalGraph,
  reflection: ReasoningReflection
): CausalGraph {
  let updated = graph;

  for (const insight of reflection.causalInsights) {
    const causeId = `reflect_${insight.cause.replace(/\s+/g, "_").slice(0, 30)}`;
    const effectId = `reflect_${insight.effect.replace(/\s+/g, "_").slice(0, 30)}`;

    // Apply confidence decay to existing nodes (older insights lose weight)
    const decayFactor = Math.max(0.3, insight.confidence || insight.strength);

    if (!updated.nodes.has(causeId)) {
      updated = addCausalNode(updated, {
        id: causeId,
        label: `${insight.cause} [cf: ${insight.counterfactual?.slice(0, 50) || "N/A"}]`,
        type: "observation",
        domain: "reasoning_reflection",
        timestamp: Date.now(),
      });
    }
    if (!updated.nodes.has(effectId)) {
      updated = addCausalNode(updated, {
        id: effectId,
        label: insight.effect,
        type: "observation",
        domain: "reasoning_reflection",
        timestamp: Date.now(),
      });
    }

    updated = addCausalLink(updated, causeId, effectId, insight.strength * decayFactor, insight.mechanism);
  }

  // Also integrate provider efficiency as causal nodes
  for (const pe of reflection.cognitiveProfile.providerEfficiency) {
    if (pe.costEfficiency > 0.5) {
      const nodeId = `provider_eff_${pe.provider}`;
      if (!updated.nodes.has(nodeId)) {
        updated = addCausalNode(updated, {
          id: nodeId,
          label: `Provider ${pe.provider}: eficiência ${pe.costEfficiency.toFixed(2)}`,
          type: "observation",
          domain: "provider_analysis",
          timestamp: Date.now(),
        });
      }
    }
  }

  return updated;
}

/**
 * Feed reflection into meta-learning system (enhanced).
 * Records strategy effectiveness with priority-weighted outcomes.
 */
export function integrateIntoMetaLearning(
  state: MetaLearningState,
  reflection: ReasoningReflection
): MetaLearningState {
  let updated = state;

  const profile = reflection.cognitiveProfile;
  const mainStrategy = profile.dominantMode === "analytical"
    ? "strat_causal_inference"
    : profile.dominantMode === "creative"
    ? "strat_vision_vlm"
    : "strat_text_cot";

  const outcome = profile.successRate > 0.8 ? "success" : profile.successRate > 0.5 ? "partial" : "failure";

  const metricsNote = `Entropia: ${profile.metrics.entropy.toFixed(2)}, Fluxo: ${(profile.metrics.flowStateRatio * 100).toFixed(0)}%, Resiliência: ${(profile.metrics.resilience * 100).toFixed(0)}%`;

  updated = recordLearningOutcome(
    updated,
    mainStrategy,
    "reasoning_reflection_24h_v2",
    outcome,
    profile.avgResponseTime,
    `Reflexão 24h v22.8: ${(profile.successRate * 100).toFixed(0)}% sucesso, modo ${profile.dominantMode}, ${reflection.patterns.length} padrões. ${metricsNote}`
  );

  // Apply strategy recommendations sorted by priority
  const sortedRecs = [...reflection.strategyRecommendations].sort((a, b) => (a.priority || 99) - (b.priority || 99));
  for (const rec of sortedRecs) {
    if (state.strategies.some((s) => s.id === rec.strategyId)) {
      updated = recordLearningOutcome(
        updated,
        rec.strategyId,
        "ai_reflection_recommendation_v2",
        "partial",
        0,
        `[AI Reflection P${rec.priority || "?"}] ${rec.adjustment}: ${rec.reason}`
      );
    }
  }

  return updated;
}

/**
 * Feed reflection into theory of mind (enhanced).
 * Uses cognitive metrics to infer user satisfaction with more precision.
 */
export function integrateIntoTheoryOfMind(
  model: UserMentalModel,
  reflection: ReasoningReflection
): UserMentalModel {
  const profile = reflection.cognitiveProfile;

  // Richer summary with cognitive metrics
  const summaryInput = `[Reflection 24h v22.8] ${reflection.patterns.slice(0, 3).join("; ")} | Flow: ${(profile.metrics.flowStateRatio * 100).toFixed(0)}%, Resilience: ${(profile.metrics.resilience * 100).toFixed(0)}%`;

  // More nuanced satisfaction based on multiple signals
  const satisfaction = profile.successRate > 0.7 && profile.metrics.flowStateRatio > 0.3;

  return updateFromInteraction(
    model,
    summaryInput,
    undefined,
    satisfaction
  );
}

// ─── Main Orchestrator ───

/**
 * Run the full reasoning capture cycle:
 * 1. Fetch 24h data from ai_metrics
 * 2. Generate AI-enhanced reflection via Lovable Gateway
 * 3. Return reflection (caller integrates into cognitive systems)
 */
export async function runReasoningCaptureCycle(): Promise<ReasoningReflection> {
  console.log("[ReasoningEngine v22.8] Starting enhanced 24h reasoning capture cycle...");

  const snapshots = await fetch24hReasoningData();
  console.log(`[ReasoningEngine] Fetched ${snapshots.length} interactions from last 24h`);

  const reflection = await generateReasoningReflection(snapshots);
  console.log(`[ReasoningEngine] Reflection generated: ${reflection.patterns.length} patterns, ${reflection.causalInsights.length} causal insights, depth: ${reflection.analysisDepth}`);

  return reflection;
}

// ─── Protocol Audit & Creation ───

/**
 * Audits last 24h reasoning data and creates optimized agentic protocols.
 * Groups by intent/complexity, calculates success rates, generates strategy recommendations.
 * Returns the number of protocols created/updated.
 */
export async function auditAndCreateProtocols(): Promise<number> {
  console.log("[ReasoningEngine] Starting protocol audit...");

  const snapshots = await fetch24hReasoningData();
  if (snapshots.length < 3) {
    console.log("[ReasoningEngine] Insufficient data for protocol audit");
    return 0;
  }

  // Group by intent-like patterns (using query keywords)
  const intentGroups = new Map<string, { successes: number; total: number; avgQuality: number; avgDuration: number }>();

  for (const s of snapshots) {
    const qLow = (s.query || "").toLowerCase();
    let intent = "general";
    if (/o\s+que\s+(voc[eê]|vc)\s+(v[eê]|enxerga)/i.test(qLow)) intent = "vision_describe";
    else if (/quem|reconhec|identific/i.test(qLow)) intent = "identity";
    else if (/segurando|objeto|mão/i.test(qLow)) intent = "vision_object";
    else if (/procur|busc|encontr/i.test(qLow)) intent = "search";
    else if (/constru|cri[ae]|implement/i.test(qLow)) intent = "auto_construct";
    else if (/evolu|aprend|melhore/i.test(qLow)) intent = "self_evolve";

    const group = intentGroups.get(intent) || { successes: 0, total: 0, avgQuality: 0, avgDuration: 0 };
    group.total++;
    if (s.success) group.successes++;
    group.avgQuality += (s.qualityScore || 0.5);
    group.avgDuration += s.durationMs;
    intentGroups.set(intent, group);
  }

  // Generate protocols
  interface AuditProtocol {
    intent: string;
    recommendedStrategy: string;
    avgQuality: number;
    sampleSize: number;
    successRate: number;
  }

  const protocols: AuditProtocol[] = [];
  for (const [intent, group] of intentGroups) {
    if (group.total < 2) continue;

    const successRate = group.successes / group.total;
    const avgQuality = group.avgQuality / group.total;
    const avgDuration = group.avgDuration / group.total;

    let strategy = "balanced";
    if (successRate > 0.85 && avgDuration < 3000) strategy = "fast_confident";
    else if (successRate > 0.85) strategy = "quality_first";
    else if (successRate < 0.5) strategy = "cautious_with_fallback";
    else if (avgDuration > 8000) strategy = "optimize_speed";

    protocols.push({
      intent,
      recommendedStrategy: strategy,
      avgQuality,
      sampleSize: group.total,
      successRate,
    });
  }

  // Save to localStorage
  try {
    const existing = JSON.parse(localStorage.getItem("orion_agentic_protocols") || "{}");
    for (const p of protocols) {
      existing[p.intent] = {
        ...existing[p.intent],
        intent: p.intent,
        recommendedStrategy: p.recommendedStrategy,
        avgQuality: p.avgQuality,
        sampleSize: p.sampleSize,
        lastUpdated: Date.now(),
        regressionCount: existing[p.intent]?.regressionCount || 0,
      };
    }
    localStorage.setItem("orion_agentic_protocols", JSON.stringify(existing));
  } catch {}

  // Save to Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && protocols.length > 0) {
      await supabase.from("neural_learning_data").insert({
        user_id: user.id,
        interaction_type: "protocol_audit",
        input_text: `Audit: ${snapshots.length} snapshots, ${protocols.length} protocols`,
        output_text: protocols.map(p => `${p.intent}: ${p.recommendedStrategy} (${(p.successRate * 100).toFixed(0)}%, n=${p.sampleSize})`).join("; ").slice(0, 1000),
        quality_score: 0.9,
        metadata: { protocols, snapshot_count: snapshots.length, audit_timestamp: Date.now() },
      } as any);
    }
  } catch (e) {
    console.warn("[ReasoningEngine] Protocol audit save failed:", e);
  }

  console.log(`[ReasoningEngine] Protocol audit complete: ${protocols.length} protocols created/updated`);
  return protocols.length;
}
