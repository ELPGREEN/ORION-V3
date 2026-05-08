/**
 * ─── Orion LLM Provider Integration ───
 */

import { supabase } from "@/integrations/supabase/client";
import { OPENROUTER_FREE_MODELS, toCascadeFormat, CASCADE_DEADLINE_BUDGET_MS, getWebSearchModels, WEB_SEARCH_MODELS, FAST_MODELS } from "./openrouter-free-models";

export type LLMProvider =
  | "openai" | "anthropic" | "google" | "deepseek" | "groq" | "cohere" | "mistral"
  | "fireworks" | "together" | "ollama" | "lmstudio" | "llama-cpp" | "huggingface"
  | "openrouter" | "azure" | "vertex" | "gemini";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  usage?: { input: number; output: number; total: number; };
}

const PROVIDER_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  deepseek: "https://api.deepseek.com/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

const OPENROUTER_CASCADE = toCascadeFormat(OPENROUTER_FREE_MODELS);

export const FREE_MODELS: Record<string, string[]> = {
  openrouter: OPENROUTER_FREE_MODELS.map(m => m.id),
  google: ["gemini-2.0-flash-exp", "gemini-1.5-flash"],
  groq: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  mistral: ["mistral-small-latest"],
  anthropic: ["claude-3-haiku-20240307"],
  openai: ["gpt-4o-mini"],
};

export async function chatWithCascade(
  messages: Array<{ role: string; content: string }>,
  cascade: Array<{ provider: LLMProvider; model: string }> = OPENROUTER_CASCADE,
  maxTimeoutMs: number = 2000,
  options: { webSearch?: boolean; ttftTimeoutMs?: number; stream?: boolean } = {}
): Promise<LLMResponse> {
  const ttftTimeout = options.ttftTimeoutMs || 1500;
  let effectiveCascade = cascade;

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("orion_model_config");
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.chatModel) {
          effectiveCascade = [{ provider: "openrouter" as LLMProvider, model: config.chatModel }, ...effectiveCascade.filter(c => c.model !== config.chatModel)];
        }
      } catch {}
    }
  }

  const errors: string[] = [];
  for (const step of effectiveCascade) {
    const apiKey = getApiKey(step.provider);
    if (!apiKey) continue;

    const client = createLLMClient(step.provider, step.model, apiKey);
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("TTFT Timeout")), ttftTimeout));
      const response = await Promise.race([client.chat(messages, { stream: options.stream }), timeout]);
      return response;
    } catch (error: any) {
      errors.push(`${step.model}: ${error.message}`);
      if (error.message === "TTFT Timeout") {
        console.warn(`[Cascade] ${step.model} slow, switching...`);
      }
    }
  }
  throw new Error("All providers failed: " + errors.join(", "));
}

export class OrionLLMClient {
  constructor(private config: LLMConfig) {}
  setApiKey(key: string) { this.config.apiKey = key; }

  static getProviders(): LLMProvider[] {
    return ["openai", "anthropic", "google", "deepseek", "groq", "mistral", "openrouter", "gemini"] as LLMProvider[];
  }

  static getFreeModels(provider: string): string[] {
    return FREE_MODELS[provider] || [];
  }

  static hasFreeTier(provider: string): boolean {
    return !!FREE_MODELS[provider] && FREE_MODELS[provider].length > 0;
  }

  async chat(messages: any[], options: { stream?: boolean } = {}): Promise<LLMResponse> {
    const endpoint = PROVIDER_ENDPOINTS[this.config.provider] || PROVIDER_ENDPOINTS.openrouter;
    const body: any = {
      model: this.config.model,
      messages,
      temperature: 0.3,
      stream: options.stream || false,
    };

    const headers: any = { "Content-Type": "application/json", "Authorization": `Bearer ${this.config.apiKey}` };
    if (this.config.provider === "openrouter") { headers["HTTP-Referer"] = "https://iasofthub.com"; headers["X-Title"] = "Orion"; }

    const res = await fetch(`${endpoint}/chat/completions`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content || "",
      model: data.model || this.config.model,
      provider: this.config.provider,
    };
  }
}

export function createLLMClient(provider: LLMProvider, model: string, apiKey?: string) {
  return new OrionLLMClient({ provider, model, apiKey });
}

export function getApiKey(provider: LLMProvider): string | null {
  const keys: any = {
    google: import.meta.env.VITE_GOOGLE_API_KEY,
    gemini: import.meta.env.VITE_GOOGLE_API_KEY,
    groq: import.meta.env.VITE_GROQ_API_KEY,
    openrouter: import.meta.env.VITE_OPENROUTER_API_KEY,
    openai: import.meta.env.VITE_OPENAI_API_KEY,
  };
  return keys[provider] || null;
}

export { OPENROUTER_FREE_MODELS, toCascadeFormat };
