/**
 * Shared OpenRouter Free Models Registry
 * Single source of truth for all provider/model lists across:
 *  - llm-providers.ts (chatWithCascade)
 *  - pentagon-reasoner (MODEL_CASCADE)
 *  - quantum-llm-router.ts (PROVIDER_REGISTRY)
 *
 * Updated 2026-05-01: Added web search support + open-weights focus (LLaMA, DeepSeek, Qwen)
 */

export interface FreeModelEntry {
  id: string;
  name: string;
  tier: "fast" | "balanced" | "reasoning" | "coding" | "heavy";
  timeoutMs: number;
  strengths: string[];
  reliabilityScore: number; // 0-1 historical uptime
  supportsWebSearch?: boolean; // true if model supports tool/plugin search
  contextWindow?: number; // context window in tokens (approx)
}

/**
 * Primary cascade order — open-weights first, fastest first.
 * Updated to prioritize models with web search capabilities.
 */
export const OPENROUTER_FREE_MODELS: FreeModelEntry[] = [
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 3.1",
    tier: "fast",
    timeoutMs: 3000,
    strengths: ["fast", "general"],
    reliabilityScore: 0.96,
    supportsWebSearch: false,
    contextWindow: 128_000,
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    name: "Nemotron Nano 9B",
    tier: "fast",
    timeoutMs: 3000,
    strengths: ["fast", "light"],
    reliabilityScore: 0.95,
    supportsWebSearch: false,
    contextWindow: 32_000,
  },
  {
    id: "qwen/qwen3-coder-480b:free",
    name: "Qwen3 Coder 480B",
    tier: "coding",
    timeoutMs: 4000,
    strengths: ["code", "agentic", "web_search_ready"],
    reliabilityScore: 0.95,
    supportsWebSearch: true, // can use OpenRouter plugins
    contextWindow: 128_000,
  },
  {
    id: "tencent/hy3-preview:free",
    name: "Tencent HY3 Preview",
    tier: "balanced",
    timeoutMs: 4000,
    strengths: ["reasoning", "feynman"],
    reliabilityScore: 0.94,
    supportsWebSearch: false,
    contextWindow: 128_000,
  },
  {
    id: "openrouter/free",
    name: "OpenRouter Auto-Router",
    tier: "balanced",
    timeoutMs: 5000,
    strengths: ["auto-select", "variety", "web_search"],
    reliabilityScore: 0.98,
    supportsWebSearch: true, // routes to models with web search
    contextWindow: 200_000,
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1",
    tier: "reasoning",
    timeoutMs: 6000,
    strengths: ["reasoning", "math", "web_search", "research"],
    reliabilityScore: 0.95,
    supportsWebSearch: true, // supports tool calling for search
    contextWindow: 64_000,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "LLaMA 3.3 70B",
    tier: "heavy",
    timeoutMs: 5000,
    strengths: ["general", "reasoning", "agentic"],
    reliabilityScore: 0.94,
    supportsWebSearch: true,
    contextWindow: 128_000,
  },
  // Open-source models with web search capability via OpenRouter plugins
  {
    id: "google/llama-3.3-70b:free",
    name: "Google LLamA 3.3 (Open Weights)",
    tier: "heavy",
    timeoutMs: 5500,
    strengths: ["general", "web_search", "open_source"],
    reliabilityScore: 0.93,
    supportsWebSearch: true,
    contextWindow: 128_000,
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
 * Models with web search capability
 */
export const WEB_SEARCH_MODELS = OPENROUTER_FREE_MODELS.filter(
  m => m.supportsWebSearch === true
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
export const CASCADE_DEADLINE_MS = 24000;

/**
 * Validate that cascade total fits within the deadline budget
 */
export function validateCascadeBudget(): { fits: boolean; totalMs: number; budgetMs: number; overflowMs: number } {
  const totalMs = CASCADE_TOTAL_TIMEOUT_MS;
  const budgetMs = CASCADE_DEADLINE_MS;
  return {
    fits: totalMs <= budgetMs,
    totalMs,
    budgetMs,
    overflowMs: Math.max(0, totalMs - budgetMs),
  };
}

/**
 * Get models with web search for a specific query type
 */
export function getWebSearchModels(queryType: "research" | "news" | "current_events" | "general" = "general"): FreeModelEntry[] {
  const webModels = WEB_SEARCH_MODELS;
  
  switch (queryType) {
    case "research":
      return webModels.filter(m => m.strengths.includes("research") || m.strengths.includes("reasoning"));
    case "news":
    case "current_events":
      return webModels.filter(m => m.strengths.includes("web_search") || m.id.includes("deepseek") || m.id.includes("qwen"));
    default:
      return webModels;
  }
}

/**
 * Check if a model supports web search via OpenRouter plugins
 * @see https://openrouter.ai/docs/guides/features/plugins/web-search
 */
export function supportsWebSearch(modelId: string): boolean {
  const model = getFreeModel(modelId);
  return model?.supportsWebSearch === true || modelId.includes("openrouter/free");
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
