import { supabase } from "@/integrations/supabase/client";

// ─── v20: Transformer-Enhanced Neural Search ───

export interface NeuralSearchResult {
  id?: string;
  title: string;
  content: string;
  source: string;
  source_label: string;
  content_type: string;
  url?: string;
  published_date?: string;
  metadata?: Record<string, unknown>;
  // Scoring
  similarity?: number;
  semantic_score?: number;
  keyword_score?: number;
  authority_score?: number;
  recency_score?: number;
  combined_score?: number;
  // Multi-Head Attention
  multi_head_score?: number;
  attention_heads?: Record<string, number>;
  rerank_position?: number;
  // Quantum Neural Network
  quantum_compatibility?: number;
  quantum_category?: string;
  signal_flip_applied?: boolean;
  // Deep Learning
  loss?: number;
  // v17: SHAP Interpretability
  shap_explanation?: Record<string, { contribution: number; explanation: string }>;
  // v17: Privacy
  privacy_score?: number;
  // v19: Competitive Learning
  competitive_category?: string;
  competitive_confidence?: number;
  // v19: Hopfield Network
  hopfield_energy?: number;
  hopfield_recall_distance?: number;
  // v20: Transformer Extensions
  positional_encoding?: "sinusoidal" | "rope" | "alibi";
  self_attention_score?: number;
  cross_attention_score?: number;
  gnn_message_score?: number;
  // v20: GRU Session
  session_state?: number[];
}

export interface AttentionHead {
  name: string;
  weight: number;
  bias: number;
  description: string;
  // v20: Transformer params
  queryProjection?: number[];
  keyProjection?: number[];
  valueProjection?: number[];
}

export interface AttentionWeights {
  heads: AttentionHead[];
  version: string;
  globalBias: number;
  // v20: Layer info
  numLayers?: number;
  dModel?: number;
  dK?: number;
  dropoutRate?: number;
}

export interface NeuralSearchResponse {
  query: string;
  mode: string;
  results: NeuralSearchResult[];
  totalResults: number;
  indexed: number;
  cacheHit?: boolean;
  embeddingCacheHit?: boolean;
  expandedQueries?: string[];
  pipeline: string[];
  timings?: Record<string, number>;
  attentionWeights?: AttentionWeights;
  version?: string;
  timestamp: string;
  refinedQuery?: string;
  area?: string;
  queryType?: "process_number" | "exact_phrase" | "wildcard";
  // v20: Extended response
  hopfieldPatternsStored?: number;
  competitiveClusters?: Record<string, number>;
  qnnLayersUsed?: number;
  vonNeumannEntropy?: number;
  adversarialDetected?: boolean;
  sessionId?: string;
}

export type SearchMode = "search" | "index" | "hybrid" | "search_and_index" | "feedback" | "ab_test" | "neural_knowledge" | "dpo_feedback";

export async function neuralSearch(
  query: string,
  options: {
    mode?: SearchMode;
    hybrid?: boolean;
    rerank?: boolean;
    expandQueries?: boolean;
    matchThreshold?: number;
    matchCount?: number;
    filterSource?: string;
    filterType?: string;
    filterSources?: string[];
    filterDateFrom?: string;
    filterDateTo?: string;
    previousContext?: string;
    // v20: Extended options
    enableHopfield?: boolean;
    enableCompetitiveLearning?: boolean;
    enableGNN?: boolean;
    enableSelfAttention?: boolean;
    positionalEncoding?: "sinusoidal" | "rope" | "alibi";
    sessionId?: string;
  } = {}
): Promise<NeuralSearchResponse> {
  const {
    mode = "search_and_index",
    hybrid = true,
    rerank = true,
    expandQueries = true,
    matchThreshold = 0.25,
    matchCount = 15,
    filterSource,
    filterType,
    filterSources,
    filterDateFrom,
    filterDateTo,
    previousContext,
    enableHopfield,
    enableCompetitiveLearning,
    enableGNN,
    enableSelfAttention,
    positionalEncoding,
    sessionId,
  } = options;

  const safeQuery = query.length > 3500 ? query.substring(0, 3500) : query;
  const { data, error } = await supabase.functions.invoke("neural-search", {
    body: {
      query: safeQuery,
      mode,
      hybrid,
      rerank,
      expandQueries,
      matchThreshold,
      matchCount,
      filterSource,
      filterType,
      filterSources,
      filterDateFrom,
      filterDateTo,
      previousContext,
      enableHopfield,
      enableCompetitiveLearning,
      enableGNN,
      enableSelfAttention,
      positionalEncoding,
      sessionId,
    },
  });

  if (error) {
    throw new Error(error.message || "Erro na busca neural");
  }

  return data as NeuralSearchResponse;
}

// ─── Feedback for Auto-tuning ───
export async function submitSearchFeedback(
  feedbackData: {
    result_id: string;
    query: string;
    quantum_category: string;
    feedback: "positive" | "negative";
    attention_heads?: Record<string, number>;
  }
): Promise<{ success: boolean; weights_adjusted: boolean }> {
  const { data, error } = await supabase.functions.invoke("neural-search", {
    body: {
      mode: "feedback",
      feedbackData,
    },
  });

  if (error) {
    throw new Error(error.message || "Erro ao enviar feedback");
  }

  return data;
}

// ─── DPO Feedback (winner/loser pairs) ───
export async function submitDPOFeedback(
  dpoData: {
    query: string;
    winner_id: string;
    loser_id: string;
    context?: string;
  }
): Promise<{ success: boolean; dpo_applied: boolean }> {
  const { data, error } = await supabase.functions.invoke("neural-search", {
    body: {
      mode: "dpo_feedback",
      dpoData,
    },
  });

  if (error) {
    throw new Error(error.message || "Erro no feedback DPO");
  }

  return data;
}

// ─── A/B Testing ───
export async function runAbTest(query: string): Promise<{
  variant_a: NeuralSearchResponse;
  variant_b: NeuralSearchResponse;
  recommendation: "a" | "b";
}> {
  const { data, error } = await supabase.functions.invoke("neural-search", {
    body: { mode: "ab_test", query },
  });

  if (error) {
    throw new Error(error.message || "Erro no A/B test");
  }

  return data;
}

// ─── Knowledge Base Search ───
export async function searchNeuralKnowledge(
  query: string,
  sourceType?: string
): Promise<NeuralSearchResponse> {
  const { data, error } = await supabase.functions.invoke("neural-search", {
    body: {
      mode: "neural_knowledge",
      query,
      filterType: sourceType,
    },
  });

  if (error) {
    throw new Error(error.message || "Erro na busca de conhecimento");
  }

  return data as NeuralSearchResponse;
}

export async function indexDocuments(
  items: Array<{
    title: string;
    content: string;
    source: string;
    sourceLabel: string;
    contentType: string;
    url?: string;
    publishedDate?: string;
    metadata?: Record<string, unknown>;
  }>,
  queryOrigin: string
): Promise<{ indexed: number }> {
  const { data, error } = await supabase.functions.invoke("neural-search", {
    body: {
      mode: "index",
      query: queryOrigin,
      items,
    },
  });

  if (error) {
    throw new Error(error.message || "Erro ao indexar documentos");
  }

  return { indexed: data?.indexed || 0 };
}
