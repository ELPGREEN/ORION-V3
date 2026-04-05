/**
 * ─── Provider Health Monitor ───
 * Circuit breaker pattern for AI provider health tracking.
 * Tracks error rates, latency, and recommends fallback chains.
 */

export type ProviderStatus = "healthy" | "degraded" | "down" | "unknown";

export interface ProviderHealth {
  provider: string;
  status: ProviderStatus;
  errorRate: number;
  avgLatency: number;
  sampleCount: number;
  lastChecked: string;
}

export interface HealthReport {
  providers: ProviderHealth[];
  recommendedProvider: string | null;
  fallbackChain: string[];
  timestamp: string;
}

interface MetricEntry {
  success: boolean;
  durationMs: number;
  timestamp: number;
}

export function calculateStatus(
  errorRate: number,
  avgLatency: number,
  sampleCount: number
): ProviderStatus {
  if (sampleCount < 3) return "unknown";
  if (errorRate >= 0.5 || avgLatency >= 20000) return "down";
  if (errorRate >= 0.15 || avgLatency >= 8000) return "degraded";
  return "healthy";
}

export function computeProviderHealth(
  provider: string,
  metrics: MetricEntry[]
): ProviderHealth {
  if (metrics.length === 0) {
    return {
      provider,
      status: "unknown",
      errorRate: 0,
      avgLatency: 0,
      sampleCount: 0,
      lastChecked: new Date().toISOString(),
    };
  }

  const errors = metrics.filter(m => !m.success).length;
  const errorRate = errors / metrics.length;
  const avgLatency = metrics.reduce((s, m) => s + m.durationMs, 0) / metrics.length;
  const status = calculateStatus(errorRate, avgLatency, metrics.length);

  return {
    provider,
    status,
    errorRate,
    avgLatency,
    sampleCount: metrics.length,
    lastChecked: new Date().toISOString(),
  };
}

export function buildFallbackChain(
  healthData: ProviderHealth[],
  defaultOrder: string[] = ["groq", "mistral", "anthropic", "openai", "github_models"]
): string[] {
  const available = healthData.filter(h => h.status !== "down");
  available.sort((a, b) => {
    const statusOrder: Record<ProviderStatus, number> = { healthy: 0, degraded: 1, unknown: 2, down: 3 };
    const sDiff = statusOrder[a.status] - statusOrder[b.status];
    if (sDiff !== 0) return sDiff;
    return a.errorRate - b.errorRate || a.avgLatency - b.avgLatency;
  });

  const ranked = available.map(h => h.provider);
  // Add any missing from default order
  for (const p of defaultOrder) {
    if (!ranked.includes(p)) ranked.push(p);
  }
  return ranked;
}

export function getRecommendedProvider(healthData: ProviderHealth[]): string | null {
  const chain = buildFallbackChain(healthData);
  return chain[0] || null;
}

export function generateHealthReport(healthData: ProviderHealth[]): HealthReport {
  return {
    providers: healthData,
    recommendedProvider: getRecommendedProvider(healthData),
    fallbackChain: buildFallbackChain(healthData),
    timestamp: new Date().toISOString(),
  };
}
