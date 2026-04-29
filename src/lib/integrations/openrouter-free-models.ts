/**
 * Shared OpenRouter Free Models Registry
 * Single source of truth for all provider/model lists across:
 * - llm-providers.ts (chatWithCascade)
 * - pentagon-reasoner (MODEL_CASCADE)
 * - quantum-llm-router.ts (PROVIDER_REGISTRY)
 */

export interface FreeModelEntry {
  id: string;
  name: string;
  tier: "fast" | "balanced" | "reasoning" | "coding" | "heavy";
  timeoutMs: number;
  strengths: string[];
  reliabilityScore: number; // 0-1 historical uptime
}

/**
 * Primary cascade order — fastest first, heaviest last.
 * Used by chatWithCascade and pentagon-reasoner.
 */
export const OPENROUTER_FREE_MODELS: FreeModelEntry[] = [
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 3.1",
    tier: "fast",
    timeoutMs: 3000,
    strengths: ["fast", "general"],
    reliabilityScore: 0.96,
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    name: "Nemotron Nano 9B V2",
    tier: "fast",
    timeoutMs: 3000,
    strengths: ["fast", "light"],
    reliabilityScore: 0.95,
  },
  {
    id: "tencent/hy3-preview:free",
    name: "Tencent HY3 Preview",
    tier: "balanced",
    timeoutMs: 4000,
    strengths: ["reasoning", "feynman"],
    reliabilityScore: 0.94,
  },
  {
    id: "openrouter/free",
    name: "OpenRouter Auto-Router",
    tier: "balanced",
    timeoutMs: 5000,
    strengths: ["auto-select", "variety"],
    reliabilityScore: 0.98,
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1",
    tier: "reasoning",
    timeoutMs: 6000,
    strengths: ["reasoning", "math"],
    reliabilityScore: 0.95,
  },
  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen3 Coder",
    tier: "coding",
    timeoutMs: 4000,
    strengths: ["code", "agentic"],
    reliabilityScore: 0.95,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    tier: "heavy",
    timeoutMs: 5000,
    strengths: ["general", "reasoning"],
    reliabilityScore: 0.94,
  },
];

/**
 * Fast-only subset for low-latency paths (quantum early exit, fast lane)
 */
export const FAST_MODELS = OPENROUTER_FREE_MODELS.filter(
  m => m.tier === "fast" || m.tier === "balanced"
);

/**
 * Reasoning-only subset for complex queries
 */
export const REASONING_MODELS = OPENROUTER_FREE_MODELS.filter(
  m => m.tier === "reasoning" || m.tier === "heavy"
);

/**
 * Convert to cascade format for llm-providers.ts
 */
export function toCascadeFormat(models: FreeModelEntry[] = OPENROUTER_FREE_MODELS) {
  return models.map(m => ({
    provider: "openrouter" as const,
    model: m.id,
  }));
}

/**
 * Get model by ID
 */
export function getFreeModel(id: string): FreeModelEntry | undefined {
  return OPENROUTER_FREE_MODELS.find(m => m.id === id);
}

/**
 * Get recommended model for a given complexity level
 */
export function getModelForComplexity(complexity: "simple" | "moderate" | "complex" | "critical"): FreeModelEntry[] {
  switch (complexity) {
    case "simple":
      return FAST_MODELS;
    case "moderate":
      return OPENROUTER_FREE_MODELS.slice(0, 4);
    case "complex":
      return OPENROUTER_FREE_MODELS.slice(2);
    case "critical":
      return REASONING_MODELS;
    default:
      return OPENROUTER_FREE_MODELS;
  }
}

/**
 * Total worst-case cascade timeout (sum of all model timeouts)
 * Used to validate that cascade fits within Pentagon maxDurationMs
 */
export const CASCADE_TOTAL_TIMEOUT_MS = OPENROUTER_FREE_MODELS.reduce((sum, m) => sum + m.timeoutMs, 0);

/**
 * Cascade timeout budget: 80% of Pentagon's 30s maxDuration = 24s hard limit
 */
export const CASCADE_DEADLINE_BUDGET_MS = 24000;

/**
 * Validate that cascade total fits within the deadline budget
 */
export function validateCascadeBudget(): { fits: boolean; totalMs: number; budgetMs: number; overflowMs: number } {
  const totalMs = CASCADE_TOTAL_TIMEOUT_MS;
  const budgetMs = CASCADE_DEADLINE_BUDGET_MS;
  return {
    fits: totalMs <= budgetMs,
    totalMs,
    budgetMs,
    overflowMs: Math.max(0, totalMs - budgetMs),
  };
}
