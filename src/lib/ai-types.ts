export type AIProvider = "gemini" | "groq" | "github_models" | "anthropic" | "openai" | "mistral" | "deepseek" | "deepseek_reasoner";
export type AIUseCase = "documents" | "chat" | "search" | "analysis" | "code_gen" | "translation";
export type RoutingStrategy = "priority" | "round_robin" | "least_cost" | "moe_gating";

export interface AIRequestOptions {
  prompt: string;
  systemPrompt?: string;
  messages?: Array<{ role: string; content: string }>;
  preferredProvider?: AIProvider;
  useCase?: AIUseCase;
  includeNeuralContext?: boolean;
  maxTokens?: number;
  temperature?: number;
  routingStrategy?: RoutingStrategy;
  modelType?: "fast" | "balanced" | "reasoning" | "analysis" | "secure";
  enableMoE?: boolean;
  topKExperts?: number;
  enableCoT?: boolean;
  enableRoPE?: boolean;
  agentId?: string;
}

export interface AIResponse {
  text: string;
  provider: AIProvider;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  cached: boolean;
}
