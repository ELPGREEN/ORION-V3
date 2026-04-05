/**
 * HuggingFace Inference Client
 * Frontend wrapper para a Edge Function hf-inference
 * Suporta todas as tarefas: texto, visão, áudio, embeddings
 */

import { supabase } from "@/integrations/supabase/client";

export type HFTask =
  | "text-generation" | "text-classification" | "summarization" | "translation"
  | "fill-mask" | "question-answering" | "feature-extraction" | "sentence-similarity"
  | "image-classification" | "object-detection" | "image-segmentation"
  | "text-to-image" | "image-to-text"
  | "automatic-speech-recognition" | "text-to-speech"
  | "zero-shot-classification" | "token-classification"
  | "table-question-answering" | "document-question-answering";

export interface HFInferenceOptions {
  task: HFTask;
  model?: string;
  inputs: unknown;
  parameters?: Record<string, unknown>;
  waitForModel?: boolean;
}

export interface HFInferenceResult<T = unknown> {
  data: T;
  model: string;
  task: string;
}

export interface HFModelInfo {
  modelId: string;
  downloads: number;
  likes: number;
  pipeline_tag: string;
  tags: string[];
}

export interface HFDatasetInfo {
  id: string;
  downloads: number;
  likes: number;
  tags: string[];
  description?: string;
}

class HuggingFaceClient {
  /** Run inference on any HF model */
  async inference<T = unknown>(options: HFInferenceOptions): Promise<HFInferenceResult<T>> {
    const { data, error } = await supabase.functions.invoke("hf-inference", {
      body: {
        action: "inference",
        task: options.task,
        model: options.model,
        inputs: options.inputs,
        parameters: options.parameters,
        options: { wait_for_model: options.waitForModel ?? true },
      },
    });

    if (error) throw new Error(`HF Inference error: ${error.message}`);
    if (data?.error) throw new Error(data.error);
    if (data?.status === "loading") {
      throw new Error(`Model loading, retry in ${data.estimated_time}s`);
    }
    return data as HFInferenceResult<T>;
  }

  // ── Text Tasks ──

  async generateText(prompt: string, model?: string, params?: Record<string, unknown>) {
    return this.inference<Array<{ generated_text: string }>>({
      task: "text-generation",
      model,
      inputs: prompt,
      parameters: { max_new_tokens: 512, temperature: 0.7, ...params },
    });
  }

  async classifyText(text: string, model?: string) {
    return this.inference<Array<Array<{ label: string; score: number }>>>({
      task: "text-classification",
      model,
      inputs: text,
    });
  }

  async summarize(text: string, model?: string) {
    return this.inference<Array<{ summary_text: string }>>({
      task: "summarization",
      model,
      inputs: text,
      parameters: { max_length: 300, min_length: 30 },
    });
  }

  async translate(text: string, model?: string) {
    return this.inference<Array<{ translation_text: string }>>({
      task: "translation",
      model,
      inputs: text,
    });
  }

  async answerQuestion(question: string, context: string, model?: string) {
    return this.inference<{ answer: string; score: number; start: number; end: number }>({
      task: "question-answering",
      model,
      inputs: { question, context },
    });
  }

  async zeroShotClassify(text: string, candidateLabels: string[], model?: string) {
    return this.inference<{ labels: string[]; scores: number[]; sequence: string }>({
      task: "zero-shot-classification",
      model,
      inputs: text,
      parameters: { candidate_labels: candidateLabels },
    });
  }

  async extractEntities(text: string, model?: string) {
    return this.inference<Array<{ entity_group: string; word: string; score: number; start: number; end: number }>>({
      task: "token-classification",
      model,
      inputs: text,
    });
  }

  // ── Embeddings ──

  async getEmbeddings(texts: string | string[], model?: string) {
    return this.inference<number[][] | number[]>({
      task: "feature-extraction",
      model: model || "sentence-transformers/all-MiniLM-L6-v2",
      inputs: texts,
    });
  }

  async computeSimilarity(source: string, sentences: string[], model?: string) {
    return this.inference<number[]>({
      task: "sentence-similarity",
      model,
      inputs: { source_sentence: source, sentences },
    });
  }

  // ── Vision Tasks ──

  async classifyImage(imageBase64: string, model?: string) {
    return this.inference<Array<{ label: string; score: number }>>({
      task: "image-classification",
      model,
      inputs: imageBase64,
    });
  }

  async detectObjects(imageBase64: string, model?: string) {
    return this.inference<Array<{ label: string; score: number; box: { xmin: number; ymin: number; xmax: number; ymax: number } }>>({
      task: "object-detection",
      model,
      inputs: imageBase64,
    });
  }

  async captionImage(imageBase64: string, model?: string) {
    return this.inference<Array<{ generated_text: string }>>({
      task: "image-to-text",
      model,
      inputs: imageBase64,
    });
  }

  async generateImage(prompt: string, model?: string) {
    return this.inference<string>({
      task: "text-to-image",
      model,
      inputs: prompt,
    });
  }

  async documentQA(imageBase64: string, question: string, model?: string) {
    return this.inference<{ answer: string; score: number }>({
      task: "document-question-answering",
      model,
      inputs: { image: imageBase64, question },
    });
  }

  // ── Audio Tasks ──

  async transcribeAudio(audioBase64: string, model?: string, language?: string) {
    return this.inference<{ text: string }>({
      task: "automatic-speech-recognition",
      model,
      inputs: audioBase64,
      parameters: language ? { language } : undefined,
    });
  }

  async textToSpeech(text: string, model?: string) {
    return this.inference<string>({
      task: "text-to-speech",
      model: model || "facebook/mms-tts-por",
      inputs: text,
    });
  }

  // ── Hub API ──

  async listModels(task: HFTask, limit = 10): Promise<HFModelInfo[]> {
    const { data, error } = await supabase.functions.invoke("hf-inference", {
      body: { action: "list-models", task, limit },
    });
    if (error) throw new Error(error.message);
    return data?.data || [];
  }

  async searchDatasets(query: string, limit = 10): Promise<HFDatasetInfo[]> {
    const { data, error } = await supabase.functions.invoke("hf-inference", {
      body: { action: "search-datasets", query, limit },
    });
    if (error) throw new Error(error.message);
    return data?.data || [];
  }

  async listAvailableTasks(): Promise<Array<{ task: string; default_model: string }>> {
    const { data, error } = await supabase.functions.invoke("hf-inference", {
      body: { action: "list-tasks" },
    });
    if (error) throw new Error(error.message);
    return data?.data || [];
  }
}

export const hfClient = new HuggingFaceClient();
export default hfClient;
