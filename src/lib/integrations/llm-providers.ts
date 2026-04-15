/**
 * ─── Orion LLM Provider Integration ───
 * Supports multiple LLM providers like OpenCode
 * Uses AI SDK and Models.dev for 75+ providers
 */

import { supabase } from "@/integrations/supabase/client";

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

// Free tier models configuration
export const FREE_MODELS: Record<LLMProvider, string[]> = {
  openai: ["gpt-4o-mini", "gpt-4o"],
  anthropic: ["claude-3-haiku-20240307", "claude-3-5-sonnet-20241022"],
  google: ["gemini-1.5-flash", "gemini-2.0-flash-exp"],
  deepseek: ["deepseek-chat", "deepseek-coder"],
  groq: ["llama-3.1-70b-versatile", "mixtral-8x7b-32768"],
  cohere: ["command-r-plus", "command-r"],
  mistral: ["mistral-large-latest", "codestral-latest"],
  fireworks: ["accounts/fireworks/models/llama-v3-70b-instruct"],
  together: ["togetherai/llama-3.1-70b-instruct", "togetherai/llama-3-8b-chat"],
  ollama: ["llama3", "codellama", "mistral"],
  "lmstudio": ["llama3", "codellama"],
  "llama-cpp": ["llama-3-70b", "codellama-70b"],
  huggingface: ["meta-llama/Llama-3.1-70B-Instruct", "Qwen/Qwen2.5-Coder-32B-Instruct"],
  openrouter: ["anthropic/claude-3.5-sonnet", "google/gemini-1.5-flash", "deepseek/deepseek-chat"],
  azure: [],
  vertex: [],
};

// Provider API endpoints
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

export class OrionLLMClient {
  private config: LLMConfig;
  private apiKey: string | null = null;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Set API key for the provider
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Get available free models for a provider
   */
  static getFreeModels(provider: LLMProvider): string[] {
    return FREE_MODELS[provider] || [];
  }

  /**
   * Get all supported providers
   */
  static getProviders(): LLMProvider[] {
    return Object.keys(FREE_MODELS) as LLMProvider[];
  }

  /**
   * Check if provider has free models
   */
  static hasFreeTier(provider: LLMProvider): boolean {
    return (FREE_MODELS[provider] || []).length > 0;
  }

  /**
   * Get the API endpoint for a provider
   */
  getEndpoint(): string {
    return this.config.baseURL || PROVIDER_ENDPOINTS[this.config.provider];
  }

  /**
   * Execute a chat completion request
   */
  async chat(messages: Array<{ role: string; content: string }>): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error("API key not set. Use setApiKey() first.");
    }

    const endpoint = this.getEndpoint();
    const model = this.config.model;

    // Build request based on provider
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

    // Provider-specific adjustments
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
        return {
          ...base,
          // OpenRouter specific headers handled separately
        };
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

    return {
      content: choice?.message?.content || "",
      model: this.config.model,
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

/**
 * Get provider display name
 */
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