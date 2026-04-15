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
/**
 * Get API key from environment variables
 * Supports multiple providers
 */
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

/**
 * Check which providers have API keys configured
 */
export function getAvailableProviders(): LLMProvider[] {
  const providers = Object.keys(FREE_MODELS) as LLMProvider[];
  return providers.filter(p => getApiKey(p) !== null);
}

/**
 * Check if DeepSeek is available (has API key)
 */
export function isDeepSeekAvailable(): boolean {
  return getApiKey("deepseek") !== null;
}

/**
 * Quick chat with DeepSeek (simplified)
 */
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

/**
 * Quick chat with any provider (simplified)
 */
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