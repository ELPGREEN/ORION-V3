/**
 * Neural Training API
 * Supabase edge function calls for knowledge, specializations, feedback, and learning pipeline
 */

import { supabase } from "@/integrations/supabase/client";

// Timeout padrão para chamadas de função (30s)
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Wrapper para chamadas de edge function com timeout e retry
 */
async function invokeWithRetry<T>(
  functionName: string,
  body: Record<string, unknown>,
  maxRetries = 2,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<{ data: T | null; error: Error | null }> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        // @ts-ignore - signal not in types but works
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (error) {
        lastError = new Error(error.message);
        // Não retry em erros de validação
        if (error.message?.includes("validation") || error.message?.includes("invalid")) {
          break;
        }
        continue;
      }
      
      return { data, error: null };
    } catch (err: any) {
      lastError = err;
      // Não retry em abort
      if (err.name === "AbortError") {
        lastError = new Error("Timeout: operação demorou muito");
        break;
      }
    }
  }
  
  return { data: null, error: lastError };
}

export async function addNeuralKnowledge(
  userId: string,
  knowledge: {
    title: string;
    content: string;
    source_type: string;
    source_reference?: string;
    tags?: string[];
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  // Validação de entrada
  if (!userId || typeof userId !== "string") {
    return { success: false, error: "userId é obrigatório" };
  }
  if (!knowledge.title?.trim() || !knowledge.content?.trim()) {
    return { success: false, error: "título e conteúdo são obrigatórios" };
  }

  const sanitizedKnowledge = {
    title: knowledge.title.trim().substring(0, 200),
    content: knowledge.content.trim().substring(0, 50000),
    source_type: knowledge.source_type || "custom",
    source_reference: knowledge.source_reference?.trim().substring(0, 500),
    tags: (knowledge.tags || []).slice(0, 10).map(t => t.trim().toLowerCase().substring(0, 50)),
  };

  const { data, error } = await invokeWithRetry<{ success: boolean; id?: string }>(
    "neural-training",
    { action: "add_knowledge", userId, data: sanitizedKnowledge }
  );
  
  if (error) return { success: false, error: error.message };
  return data || { success: false, error: "Resposta vazia" };
}

export async function createNeuralSpecialization(
  userId: string,
  specialization: {
    name: string;
    description?: string;
    category: string;
    training_data?: Array<{ input: string; output: string }>;
    prompts?: Record<string, string>;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  // Validação
  if (!userId || typeof userId !== "string") {
    return { success: false, error: "userId é obrigatório" };
  }
  if (!specialization.name?.trim()) {
    return { success: false, error: "nome da especialização é obrigatório" };
  }

  const sanitizedSpec = {
    name: specialization.name.trim().substring(0, 100),
    description: specialization.description?.trim().substring(0, 500),
    category: specialization.category || "custom",
    training_data: (specialization.training_data || []).slice(0, 100).map(td => ({
      input: td.input?.substring(0, 2000) || "",
      output: td.output?.substring(0, 2000) || "",
    })),
    prompts: specialization.prompts,
  };

  const { data, error } = await invokeWithRetry<{ success: boolean; id?: string }>(
    "neural-training",
    { action: "create_specialization", userId, data: sanitizedSpec }
  );
  
  if (error) return { success: false, error: error.message };
  return data || { success: false, error: "Resposta vazia" };
}

export async function submitNeuralFeedback(
  learningDataId: string,
  qualityScore: number,
  feedback?: string
): Promise<{ success: boolean; error?: string }> {
  // Validação
  if (!learningDataId || typeof learningDataId !== "string") {
    return { success: false, error: "learningDataId é obrigatório" };
  }
  
  const sanitizedScore = Math.max(0, Math.min(1, qualityScore));
  const sanitizedFeedback = feedback?.trim().substring(0, 1000);

  const { data, error } = await invokeWithRetry<{ success: boolean }>(
    "neural-training",
    { 
      action: "process_feedback", 
      data: { 
        learning_data_id: learningDataId, 
        quality_score: sanitizedScore, 
        feedback: sanitizedFeedback 
      } 
    },
    1 // Apenas 1 retry para feedback
  );
  
  if (error) return { success: false, error: error.message };
  return data || { success: false, error: "Resposta vazia" };
}

export async function triggerNeuralLearn(
  options: {
    enableRLVR?: boolean;
    enableDPO?: boolean;
    enableHebbian?: boolean;
    enableCrossValidation?: boolean;
    enableDistillation?: boolean;
  } = {}
): Promise<{ success: boolean; pipeline_results?: Record<string, unknown>; error?: string }> {
  const { data, error } = await invokeWithRetry<{ success: boolean; pipeline_results?: Record<string, unknown> }>(
    "neural-training",
    {
      action: "neural_learn",
      data: {
        enable_rlvr: options.enableRLVR ?? true,
        enable_dpo: options.enableDPO ?? true,
        enable_hebbian: options.enableHebbian ?? true,
        enable_cross_validation: options.enableCrossValidation ?? true,
        enable_distillation: options.enableDistillation ?? false,
      },
    },
    1, // Apenas 1 retry
    60000 // Timeout maior para operações de aprendizado (60s)
  );
  
  if (error) return { success: false, error: error.message };
  return data || { success: false, error: "Resposta vazia" };
}

export async function getNeuralWeights(): Promise<{
  success: boolean;
  weights?: Record<string, number>;
  qnn_params?: number[];
  attention_heads?: Array<{ name: string; weight: number; bias: number }>;
  error?: string;
}> {
  const { data, error } = await invokeWithRetry<{
    success: boolean;
    weights?: Record<string, number>;
    qnn_params?: number[];
    attention_heads?: Array<{ name: string; weight: number; bias: number }>;
  }>(
    "neural-training",
    { action: "get_weights" },
    1,
    15000 // Timeout curto para leitura de pesos
  );
  
  if (error) return { success: false, error: error.message };
  return data || { success: false, error: "Resposta vazia" };
}
