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
  agentContext?: Record<string, unknown>;
  parentTraceId?: string;
  ragMode?: "standard" | "agentic" | "corrective" | "self_rag";
  ragTopK?: number;
  ragRerank?: boolean;
  // Neural pipeline options
  documentContext?: string;
  documentType?: string;
  enableNeuralPipeline?: boolean;
  // DeepSeek V3.2 Thinking Mode
  thinkingEnabled?: boolean;
  tools?: Array<{ type: string; function: { name: string; description: string; parameters: Record<string, unknown> } }>;
}
