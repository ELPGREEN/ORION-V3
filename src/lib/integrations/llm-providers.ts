/**
 * ─── Orion LLM Provider Integration ───
 * Supports multiple LLM providers like OpenCode
 * Uses AI SDK and Models.dev for 75+ providers
 *
 * Phase 1: Circuit Breaker + Provider Cascade
 * Phase 2: Unified provider registry via openrouter-free-models
 */

import { supabase } from "@/integrations/supabase/client";
import { OPENROUTER_FREE_MODELS, toCascadeFormat } from "./openrouter-free-models";

export type LLMProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "deepseek"
  | "groq"
  | "cohere"
  | "mistral"
  | "fireworks"
  | "together"
  | "ollama"
  | "lmstudio"
  | "llama-cpp"
  | "huggingface"
  | "openrouter"
  | "azure"
  | "vertex";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  usage?: {
    input: number;
    output: number;
    total: number;
  };
}

// Free tier models configuration - COMPLETO 2026
export const FREE_MODELS: Record<LLMProvider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-5-high"],
  anthropic: ["claude-3-haiku-20240307", "claude-3-5-sonnet-20241022", "claude-opus-4-1-20250805-thinking"],
  google: ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-2.5-pro-exp-03-25"],
  deepseek: ["deepseek-chat", "deepseek-coder", "deepseek/deepseek-r1", "deepseek/deepseek-r1-0528", "deepseek/deepseek-v3-0324"],
  groq: ["llama-3.1-70b-versatile", "mixtral-8x7b-32768"],
  cohere: ["command-r-plus", "command-r"],
  mistral: ["mistral-small-3.1-24b-instruct", "mistral-large-latest", "codestral-latest"],
  fireworks: ["accounts/fireworks/models/llama-v3-70b-instruct"],
  together: ["togetherai/llama-3.1-70b-instruct", "togetherai/llama-3-8b-chat", "togetherai/qwen3-next-80b-a3b-instruct"],
  ollama: ["llama3", "codellama", "mistral"],
  "lmstudio": ["llama3", "codellama"],
  "llama-cpp": ["llama-3-70b", "codellama-70b", "llama-4-scout"],
  huggingface: ["meta-llama/Llama-3.1-70B-Instruct", "Qwen/Qwen2.5-Coder-32B-Instruct"],
  openrouter: [
    "openrouter/free",
    "meta-llama/llama-3.2-11b-vision-instruct:free",
    "qwen/qwen2.5-vl-32b-instruct:free",
    "moonshotai/kimi-vl-a3b-thinking:free",
    "qwen/qwen2.5-vl-3b-instruct:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "deepseek/deepseek-r1",
    "deepseek/deepseek-r1-0528",
    "qwen/qwen3-235b-thinking",
    "qwen/qwen3-next-80b-a3b-instruct",
    "qwen/qwen3-coder-480b",
    "mistralai/devstral-2",
    "qwen/qwen2.5-coder-32b",
    "meta-llama/llama-3.3-70b-instruct",
    "meta-llama/llama-4-scout:free",
    "meta-llama/llama-4-maverick:free",
    "mistralai/mistral-small-3.1-24b-instruct",
    "grok/grok-4",
    "minimax/minimax-m2.5-free",
    "aethernether/llama-3-8b-instruct-thinking:free",
    "google/gemma-3-27b-it:free",
    "tencent/hy3-preview:free",
  ],
  azure: [],
  vertex: [],
};

const PROVIDER_ENDPOINTS: Record<LLMProvider, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  deepseek: "https://api.deepseek.com/v1",
  groq: "https://api.groq.com/openai/v1",
  cohere: "https://api.cohere.ai/v1",
  mistral: "https://api.mistral.ai/v1",
  fireworks: "https://api.fireworks.ai/v1",
  together: "https://api.together.ai/v1",
  ollama: "http://localhost:11434",
  lmstudio: "http://localhost:1234/v1",
  "llama-cpp": "http://localhost:8080/v1",
  huggingface: "https://api-inference.huggingface.co",
  openrouter: "https://openrouter.ai/api/v1",
  azure: "",
  vertex: "",
};

// ═══════════════════════════════════════════════
// Circuit Breaker — Provider Health Tracking
// ═══════════════════════════════════════════════

interface CircuitState {
  failures: number;
  lastFailure: number;
  isTripped: boolean;
  totalRequests: number;
  totalSuccesses: number;
}

const circuitStates: Map<string, CircuitState> = new Map();

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_RECOVERY_TIMEOUT_MS = 30_000;
const CIRCUIT_WINDOW_MS = 60_000;

function getCircuitKey(provider: LLMProvider, model: string): string {
  return `${provider}:${model}`;
}

function getCircuitState(key: string): CircuitState {
  const existing = circuitStates.get(key);
  if (existing) return existing;
  const fresh: CircuitState = { failures: 0, lastFailure: 0, isTripped: false, totalRequests: 0, totalSuccesses: 0 };
  circuitStates.set(key, fresh);
  return fresh;
}

function recordSuccess(provider: LLMProvider, model: string): void {
  const key = getCircuitKey(provider, model);
  const state = getCircuitState(key);
  state.totalRequests++;
  state.totalSuccesses++;
  if (state.failures > 0) {
    state.failures = Math.max(0, state.failures - 1);
  }
  if (state.failures === 0 && state.isTripped) {
    state.isTripped = false;
    console.log(`[CircuitBreaker] ${key} recovered`);
  }
  // Decay old failures outside window
  const now = Date.now();
  if (now - state.lastFailure > CIRCUIT_WINDOW_MS) {
    state.failures = 0;
  }
}

function recordFailure(provider: LLMProvider, model: string): void {
  const key = getCircuitKey(provider, model);
  const state = getCircuitState(key);
  state.totalRequests++;
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    state.isTripped = true;
    console.warn(`[CircuitBreaker] ${key} tripped (${state.failures} failures)`);
  }
}

function isCircuitOpen(provider: LLMProvider, model: string): boolean {
  const key = getCircuitKey(provider, model);
  const state = getCircuitState(key);
  if (!state.isTripped) return false;
  // Check if recovery timeout has passed
  if (Date.now() - state.lastFailure > CIRCUIT_RECOVERY_TIMEOUT_MS) {
    state.isTripped = false;
    state.failures = 0;
    return false;
  }
  return true;
}

function getCircuitStats(): Record<string, { failures: number; isTripped: boolean; successRate: number }> {
  const stats: Record<string, any> = {};
  for (const [key, state] of circuitStates.entries()) {
    stats[key] = {
      failures: state.failures,
      isTripped: state.isTripped,
      successRate: state.totalRequests > 0 ? (state.totalSuccesses / state.totalRequests) : 0,
    };
  }
  return stats;
}

// ═══════════════════════════════════════════════
// Provider Cascade — Automatic Fallback Chain
// Phase 2: Uses shared openrouter-free-models registry
// Phase 4: LRU cache to avoid duplicate network calls
// ═══════════════════════════════════════════════

const OPENROUTER_CASCADE = toCascadeFormat(OPENROUTER_FREE_MODELS);

// LRU cache: up to 50 entries, 60s TTL
const responseCache = new Map<string, { response: LLMResponse; ts: number }>();
const CACHE_MAX_SIZE = 50;
const CACHE_TTL_MS = 60_000;

function cacheKey(messages: Array<{ role: string; content: string }>): string {
  const last = messages[messages.length - 1];
  return `${last?.role}:${last?.content?.slice(0, 200)}`;
}

function getCached(key: string): LLMResponse | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.response;
}

function setCache(key: string, response: LLMResponse): void {
  if (responseCache.size >= CACHE_MAX_SIZE) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) responseCache.delete(firstKey);
  }
  responseCache.set(key, { response, ts: Date.now() });
}

export async function chatWithCascade(
  messages: Array<{ role: string; content: string }>,
  cascade: Array<{ provider: LLMProvider; model: string }> = OPENROUTER_CASCADE,
  maxTimeoutMs: number = 8000
): Promise<LLMResponse> {
  const key = cacheKey(messages);
  const cached = getCached(key);
  if (cached) {
    console.log(`[Cascade] Cache hit (${key.slice(0, 60)}...)`);
    return cached;
  }

  const errors: string[] = [];

  for (const step of cascade) {
    // Skip if circuit is open
    if (isCircuitOpen(step.provider, step.model)) {
      errors.push(`${step.provider}:${step.model} circuit open`);
      continue;
    }

    const apiKey = getApiKey(step.provider);
    if (!apiKey) {
      errors.push(`${step.provider}:${step.model} no API key`);
      continue;
    }

    const client = createLLMClient(step.provider, step.model, apiKey);
    const startTime = Date.now();

    try {
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout ${maxTimeoutMs}ms`)), maxTimeoutMs);
      });

      const response = await Promise.race([client.chat(messages), timeout]);

      recordSuccess(step.provider, step.model);
      const elapsed = Date.now() - startTime;
      if (elapsed > 2000) {
        console.warn(`[Cascade] ${step.model} slow (${elapsed}ms)`);
      }
      setCache(key, response);
      return response;
    } catch (error) {
      recordFailure(step.provider, step.model);
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${step.provider}:${step.model} → ${msg}`);
      console.warn(`[Cascade] ${step.provider}:${step.model} failed: ${msg}`);
    }
  }

  throw new Error(`All providers in cascade failed:\n${errors.join("\n")}`);
}

// ═══════════════════════════════════════════════
// Main Client
// ═══════════════════════════════════════════════

export class OrionLLMClient {
  private config: LLMConfig;
  private apiKey: string | null = null;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  static getFreeModels(provider: LLMProvider): string[] {
    return FREE_MODELS[provider] || [];
  }

  static getProviders(): LLMProvider[] {
    return Object.keys(FREE_MODELS) as LLMProvider[];
  }

  static hasFreeTier(provider: LLMProvider): boolean {
    return (FREE_MODELS[provider] || []).length > 0;
  }

  getEndpoint(): string {
    return this.config.baseURL || PROVIDER_ENDPOINTS[this.config.provider];
  }

  async chat(messages: Array<{ role: string; content: string }>): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error("API key not set. Use setApiKey() first.");
    }

    const endpoint = this.getEndpoint();
    const model = this.config.model;

    const requestBody = this.buildRequestBody(messages);

    try {
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          ...this.getProviderHeaders(),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM request failed: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error("[OrionLLM] Request failed:", error);
      throw error;
    }
  }

  private buildRequestBody(messages: Array<{ role: string; content: string }>): Record<string, unknown> {
    const base = {
      model: this.config.model,
      messages,
      max_tokens: this.config.maxTokens || 4096,
      temperature: this.config.temperature || 0.7,
    };

    switch (this.config.provider) {
      case "anthropic":
        return {
          ...base,
          system: messages.find(m => m.role === "system")?.content,
          messages: messages.filter(m => m.role !== "system"),
        };
      case "google":
        return {
          contents: messages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            temperature: base.temperature,
            maxOutputTokens: base.max_tokens,
          },
        };
      case "openrouter":
        return { ...base };
      default:
        return base;
    }
  }

  private getProviderHeaders(): Record<string, string> {
    switch (this.config.provider) {
      case "anthropic":
        return { "anthropic-version": "2023-06-01" };
      case "google":
        return {};
      case "openrouter":
        return { "HTTP-Referer": "https://orion-ai.com", "X-Title": "Orion AI" };
      default:
        return {};
    }
  }

  private parseResponse(data: Record<string, unknown>): LLMResponse {
    const choice = (data.choices as Array<{ message: { content: string } }>)?.[0];
    const usage = data.usage as { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;
    const actualModel = data.model as string | undefined;

    return {
      content: choice?.message?.content || "",
      model: actualModel || this.config.model,
      provider: this.config.provider,
      usage: usage ? {
        input: usage.prompt_tokens || 0,
        output: usage.completion_tokens || 0,
        total: usage.total_tokens || 0,
      } : undefined,
    };
  }
}

/**
 * Factory to create LLM clients based on provider
 */
export function createLLMClient(
  provider: LLMProvider,
  model?: string,
  apiKey?: string,
  baseURL?: string
): OrionLLMClient {
  const config: LLMConfig = {
    provider,
    model: model || FREE_MODELS[provider]?.[0] || "default",
    apiKey,
    baseURL,
  };

  const client = new OrionLLMClient(config);
  if (apiKey) {
    client.setApiKey(apiKey);
  }

  return client;
}

export function getApiKey(provider: LLMProvider): string | null {
  const envKeys: Record<LLMProvider, string> = {
    openai: import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY,
    anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY,
    google: import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.GOOGLE_API_KEY,
    deepseek: import.meta.env.VITE_DEEPSEEK_API_KEY || import.meta.env.DEEPSEEK_API_KEY,
    groq: import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY,
    cohere: import.meta.env.VITE_COHERE_API_KEY || import.meta.env.COHERE_API_KEY,
    mistral: import.meta.env.VITE_MISTRAL_API_KEY || import.meta.env.MISTRAL_API_KEY,
    fireworks: import.meta.env.VITE_FIREWORKS_API_KEY || import.meta.env.FIREWORKS_API_KEY,
    together: import.meta.env.VITE_TOGETHER_API_KEY || import.meta.env.TOGETHER_API_KEY,
    ollama: import.meta.env.VITE_OLLAMA_API_KEY,
    lmstudio: import.meta.env.VITE_LMSTUDIO_API_KEY,
    "llama-cpp": import.meta.env.VITE_LLAMA_CPP_API_KEY,
    huggingface: import.meta.env.VITE_HUGGINGFACE_API_KEY || import.meta.env.HUGGINGFACE_API_KEY,
    openrouter: import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.OPENROUTER_API_KEY,
    azure: import.meta.env.VITE_AZURE_API_KEY || import.meta.env.AZURE_API_KEY,
    vertex: import.meta.env.VITE_VERTEX_API_KEY || import.meta.env.VERTEX_API_KEY,
  };

  return envKeys[provider] || null;
}

export function getAvailableProviders(): LLMProvider[] {
  const providers = Object.keys(FREE_MODELS) as LLMProvider[];
  return providers.filter(p => getApiKey(p) !== null);
}

export function isDeepSeekAvailable(): boolean {
  return getApiKey("deepseek") !== null;
}

export async function chatWithDeepSeek(
  messages: Array<{ role: string; content: string }>,
  model: string = "deepseek-chat"
): Promise<LLMResponse> {
  const apiKey = getApiKey("deepseek");

  if (!apiKey) {
    throw new Error("DeepSeek API key not configured. Add VITE_DEEPSEEK_API_KEY to your .env file.");
  }

  const client = createLLMClient("deepseek", model, apiKey);
  return client.chat(messages);
}

export async function chatWithProvider(
  provider: LLMProvider,
  messages: Array<{ role: string; content: string }>,
  model?: string
): Promise<LLMResponse> {
  const apiKey = getApiKey(provider);

  if (!apiKey) {
    throw new Error(`${provider} API key not configured. Add VITE_${provider.toUpperCase()}_API_KEY to your .env file.`);
  }

  const client = createLLMClient(provider, model, apiKey);
  return client.chat(messages);
}

export function getProviderName(provider: LLMProvider): string {
  const names: Record<LLMProvider, string> = {
    openai: "OpenAI (GPT)",
    anthropic: "Anthropic (Claude)",
    google: "Google (Gemini)",
    deepseek: "DeepSeek",
    groq: "Groq",
    cohere: "Cohere",
    mistral: "Mistral AI",
    fireworks: "Fireworks AI",
    together: "Together AI",
    ollama: "Ollama (Local)",
    lmstudio: "LM Studio (Local)",
    "llama-cpp": "llama.cpp (Local)",
    huggingface: "Hugging Face",
    openrouter: "OpenRouter",
    azure: "Azure OpenAI",
    vertex: "Google Vertex",
  };

  return names[provider] || provider;
}

// Export circuit breaker utilities
export { getCircuitStats, OPENROUTER_CASCADE };
export { OPENROUTER_FREE_MODELS, FAST_MODELS, REASONING_MODELS, toCascadeFormat, getFreeModel, getModelForComplexity } from "./openrouter-free-models";
