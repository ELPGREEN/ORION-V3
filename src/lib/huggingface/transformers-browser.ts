/**
 * Transformers.js — In-Browser ML Inference
 * Roda modelos leves diretamente no navegador (WebAssembly/WebGPU)
 * Sem servidor, zero latência de rede
 * 
 * Tarefas suportadas no browser:
 * - Sentiment Analysis
 * - Text Classification
 * - Token Classification (NER)
 * - Feature Extraction (Embeddings)
 * - Fill Mask
 * - Translation
 * - Summarization
 * - Zero-shot Classification
 * - Question Answering
 */

type PipelineTask =
  | "sentiment-analysis"
  | "text-classification"
  | "token-classification"
  | "feature-extraction"
  | "fill-mask"
  | "translation"
  | "summarization"
  | "zero-shot-classification"
  | "question-answering";

interface PipelineResult {
  label?: string;
  score?: number;
  [key: string]: unknown;
}

// Pipeline cache to avoid reloading models
const pipelineCache = new Map<string, unknown>();
let transformersModule: typeof import("@huggingface/transformers") | null = null;

async function getTransformers() {
  if (!transformersModule) {
    try {
      // Dynamic import to avoid blocking initial load
      transformersModule = await import("@huggingface/transformers");
    } catch (e) {
      console.error("[Transformers.js] Failed to load:", e);
      throw new Error("Transformers.js not available. Install @huggingface/transformers.");
    }
  }
  return transformersModule;
}

async function getPipeline(task: PipelineTask, model?: string) {
  const cacheKey = `${task}:${model || "default"}`;
  if (pipelineCache.has(cacheKey)) {
    return pipelineCache.get(cacheKey);
  }

  const { pipeline } = await getTransformers();
  console.log(`[Transformers.js] Loading pipeline: ${task} (${model || "default model"})...`);
  
  const pipe = model ? await pipeline(task, model) : await pipeline(task);
  pipelineCache.set(cacheKey, pipe);
  console.log(`[Transformers.js] Pipeline ready: ${task}`);
  return pipe;
}

/**
 * Análise de sentimento no browser
 * Model default: Xenova/distilbert-base-uncased-finetuned-sst-2-english (~67MB)
 */
export async function analyzeSentiment(
  text: string,
  model?: string
): Promise<Array<{ label: string; score: number }>> {
  const classifier = await getPipeline("sentiment-analysis", model) as (text: string) => Promise<PipelineResult[]>;
  const result = await classifier(text);
  return result as Array<{ label: string; score: number }>;
}

/**
 * Extração de embeddings no browser
 * Model default: Xenova/all-MiniLM-L6-v2 (~23MB, 384d)
 * Use padTo768=true when embeddings will be compared against Gemini 768d vectors in DB
 */
export async function extractEmbeddings(
  text: string | string[],
  model?: string,
  padTo768 = false
): Promise<number[][]> {
  const extractor = await getPipeline("feature-extraction", model || "Xenova/all-MiniLM-L6-v2") as (text: string | string[], options?: Record<string, unknown>) => Promise<{ tolist: () => number[][] }>;
  const result = await extractor(text, { pooling: "mean", normalize: true });
  const vectors = result.tolist();
  if (padTo768) {
    return vectors.map(v => v.length >= 768 ? v.slice(0, 768) : [...v, ...new Array(768 - v.length).fill(0)]);
  }
  return vectors;
}

/**
 * NER (Named Entity Recognition) no browser
 * Model default: Xenova/bert-base-NER
 */
export async function extractEntities(
  text: string,
  model?: string
): Promise<Array<{ entity: string; word: string; score: number; start: number; end: number }>> {
  const ner = await getPipeline("token-classification", model || "Xenova/bert-base-NER") as (text: string) => Promise<PipelineResult[]>;
  const result = await ner(text);
  return result as Array<{ entity: string; word: string; score: number; start: number; end: number }>;
}

/**
 * Classificação zero-shot no browser
 */
export async function zeroShotClassify(
  text: string,
  labels: string[],
  model?: string
): Promise<{ labels: string[]; scores: number[] }> {
  const classifier = await getPipeline("zero-shot-classification", model || "Xenova/nli-deberta-v3-xsmall") as (text: string, labels: string[]) => Promise<{ labels: string[]; scores: number[] }>;
  const result = await classifier(text, labels);
  return result;
}

/**
 * Question Answering no browser
 */
export async function answerQuestion(
  question: string,
  context: string,
  model?: string
): Promise<{ answer: string; score: number }> {
  const qa = await getPipeline("question-answering", model || "Xenova/distilbert-base-cased-distilled-squad") as (input: { question: string; context: string }) => Promise<{ answer: string; score: number }>;
  const result = await qa({ question, context });
  return result;
}

/**
 * Sumarização no browser
 */
export async function summarizeText(
  text: string,
  model?: string,
  maxLength = 128
): Promise<string> {
  const summarizer = await getPipeline("summarization", model || "Xenova/distilbart-cnn-6-6") as (text: string, options?: Record<string, unknown>) => Promise<Array<{ summary_text: string }>>;
  const result = await summarizer(text, { max_length: maxLength });
  return result[0]?.summary_text || "";
}

/**
 * Verifica se Transformers.js está disponível
 */
export async function isAvailable(): Promise<boolean> {
  try {
    await getTransformers();
    return true;
  } catch {
    return false;
  }
}

/**
 * Limpa o cache de pipelines (libera memória)
 */
export function clearPipelineCache(): void {
  pipelineCache.clear();
  console.log("[Transformers.js] Pipeline cache cleared");
}

/**
 * Lista pipelines carregadas
 */
export function getLoadedPipelines(): string[] {
  return Array.from(pipelineCache.keys());
}
