/**
 * Neural Training API
 * Supabase edge function calls for knowledge, specializations, feedback, and learning pipeline
 */

import { supabase } from "@/integrations/supabase/client";

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
  const { data, error } = await supabase.functions.invoke("neural-training", {
    body: { action: "add_knowledge", userId, data: knowledge },
  });
  if (error) return { success: false, error: error.message };
  return data;
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
  const { data, error } = await supabase.functions.invoke("neural-training", {
    body: { action: "create_specialization", userId, data: specialization },
  });
  if (error) return { success: false, error: error.message };
  return data;
}

export async function submitNeuralFeedback(
  learningDataId: string,
  qualityScore: number,
  feedback?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("neural-training", {
    body: { action: "process_feedback", data: { learning_data_id: learningDataId, quality_score: qualityScore, feedback } },
  });
  if (error) return { success: false, error: error.message };
  return data;
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
  const { data, error } = await supabase.functions.invoke("neural-training", {
    body: {
      action: "neural_learn",
      data: {
        enable_rlvr: options.enableRLVR ?? true,
        enable_dpo: options.enableDPO ?? true,
        enable_hebbian: options.enableHebbian ?? true,
        enable_cross_validation: options.enableCrossValidation ?? true,
        enable_distillation: options.enableDistillation ?? false,
      },
    },
  });
  if (error) return { success: false, error: error.message };
  return data;
}

export async function getNeuralWeights(): Promise<{
  success: boolean;
  weights?: Record<string, number>;
  qnn_params?: number[];
  attention_heads?: Array<{ name: string; weight: number; bias: number }>;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke("neural-training", {
    body: { action: "get_weights" },
  });
  if (error) return { success: false, error: error.message };
  return data;
}
