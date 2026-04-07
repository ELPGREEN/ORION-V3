/**
 * HuggingFace Unified Integration
 * 
 * Três camadas de acesso:
 * 1. hfClient — Inference API via Edge Function (200k+ modelos, server-side)
 * 2. transformersBrowser — Modelos leves no browser (zero latência, offline)
 * 3. gradioClient — Conexão com HF Spaces (Gradio apps)
 */

// Server-side inference (via Edge Function)
export { hfClient, default as HuggingFaceClient } from "./hf-inference-client";
export type { HFTask, HFInferenceOptions, HFInferenceResult, HFModelInfo, HFDatasetInfo } from "./hf-inference-client";

// Browser-side inference (Transformers.js)
export {
  analyzeSentiment,
  extractEmbeddings,
  extractEntities,
  zeroShotClassify,
  answerQuestion,
  summarizeText,
  isAvailable as isTransformersAvailable,
  clearPipelineCache,
  getLoadedPipelines,
} from "./transformers-browser";

// Browser-side Vision (Transformers.js — 100% free, offline)
export {
  classifyImage,
  detectObjects,
  classifyImageZeroShot,
  captionImage,
  estimateDepth,
  clearVisionCache,
} from "./transformers-vision";

// Browser-side Audio (Transformers.js — 100% free, offline)
export {
  transcribeAudio,
  classifyAudio,
  recordMicrophoneAudio,
  clearAudioCache,
} from "./transformers-audio";

// Gradio Space client
export {
  checkSpaceHealth,
  callSpace,
  analyzePDFViaSpace,
  listSpaceEndpoints,
  clearConnectionCache,
} from "./gradio-client";
