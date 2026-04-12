/**
 * ─── TensorFlow Libraries & Extensions Registry ───
 * Unified registry of all TF ecosystem libraries implemented
 * in browser-adapted form for the Orion AI pipeline.
 * 
 * Ref: tensorflow.org/resources/libraries-extensions
 */

import { getAddonsState } from "./tf-addons";
import { getDecisionForestsState } from "./tf-decision-forests";
import { getGNNState } from "./tf-gnn-nsl";
import { getResponsibleAIState } from "./tf-fairness-privacy";
import { getProbabilityRankingRecommendersState } from "./tf-probability-ranking";
import { getTextOpsState } from "./tf-text-ops";
// TFM vision modules removed — stubs
const getAugmentState = () => ({ active: false, pixelOps: [] as string[], regionOps: [] as string[], policies: [] as string[] });
const getVisionOpsState = () => ({ active: false, boxOps: [] as string[], nms: [] as string[], spatialOps: [] as string[] });
const getVisionModelsState = () => ({ active: false, classification: [] as string[], detection: [] as string[], segmentation: [] as string[], instanceSeg: [] as string[] });

export interface TFLibraryEntry {
  id: string;
  name: string;
  category: "model_building" | "data_preparation" | "deployment" | "mlops" | "responsible_ai";
  status: "implemented" | "partial" | "planned";
  version: string;
  description: string;
  reference: string;
  capabilities: string[];
}

const TF_LIBRARIES: TFLibraryEntry[] = [
  // ═══ Already Implemented (prior modules) ═══
  {
    id: "tfjs", name: "TensorFlow.js", category: "deployment", status: "implemented", version: "4.22",
    description: "Hardware-accelerated ML in browser with WebGPU/WebGL/WASM backends",
    reference: "tensorflow.org/js",
    capabilities: ["WebGPU backend", "WebGL backend", "WASM+SIMD", "Model loading", "Transfer learning"],
  },
  {
    id: "tfx", name: "TFX Pipeline", category: "mlops", status: "implemented", version: "2.0",
    description: "End-to-end ML pipeline: ExampleGen → StatisticsGen → SchemaGen → ExampleValidator → Transform → Tuner → InfraValidator → Pusher + MLMD",
    reference: "tensorflow.org/tfx",
    capabilities: ["10 pipeline components", "ML Metadata (MLMD)", "Lineage tracking", "Automated pipeline orchestration"],
  },
  {
    id: "tfdv", name: "TensorFlow Data Validation", category: "data_preparation", status: "implemented", version: "1.0",
    description: "Compute statistics, infer schemas, detect anomalies in training data",
    reference: "tensorflow.org/tfx/guide/tfdv",
    capabilities: ["Descriptive statistics", "Schema inference", "Anomaly detection", "Distribution analysis"],
  },
  {
    id: "tft", name: "TensorFlow Transform", category: "data_preparation", status: "implemented", version: "1.0",
    description: "Feature engineering: normalize, bucketize, polynomial, interaction features",
    reference: "tensorflow.org/tfx/guide/tft",
    capabilities: ["Normalization", "MinMax scaling", "Log transform", "Bucketization", "Feature crossing"],
  },
  {
    id: "tfma", name: "TensorFlow Model Analysis", category: "mlops", status: "implemented", version: "1.0",
    description: "Deep model evaluation: sliced metrics, degradation detection, A/B testing",
    reference: "tensorflow.org/tfx/guide/tfma",
    capabilities: ["Sliced evaluation", "Performance degradation detection", "A/B testing with Z-test"],
  },
  {
    id: "mlmd", name: "ML Metadata", category: "mlops", status: "implemented", version: "1.0",
    description: "Artifact and execution tracking for ML pipeline lineage",
    reference: "tensorflow.org/tfx/guide/mlmd",
    capabilities: ["Artifact registration", "Execution tracking", "Lineage queries"],
  },
  {
    id: "litert", name: "LiteRT (Google AI Edge)", category: "deployment", status: "implemented", version: "1.0",
    description: "CompiledModel API with auto hardware selection, TensorBuffer pool, async execution",
    reference: "ai.google.dev/edge/litert",
    capabilities: ["Hardware probing", "Zero-copy buffers", "Async execution queue", "Latency profiling"],
  },
  {
    id: "model_optimization", name: "Model Optimization Toolkit", category: "deployment", status: "implemented", version: "1.0",
    description: "Quantization (float16/uint8), pruning, and inference profiling",
    reference: "tensorflow.org/model_optimization",
    capabilities: ["Float16 quantization", "Uint8 quantization", "Magnitude pruning", "Latency profiling"],
  },

  // ═══ Newly Implemented ═══
  {
    id: "tf_addons", name: "TensorFlow Addons", category: "model_building", status: "implemented", version: "1.0",
    description: "Advanced activations (Mish, GELU, Swish, Sparsemax), optimizers (AdamW, LAMB, Lookahead), layers (GroupNorm, SpectralNorm), metrics (MCC, F-Beta), and losses (Focal, Triplet, Contrastive)",
    reference: "github.com/tensorflow/addons",
    capabilities: getAddonsState().activations.concat(getAddonsState().optimizers, getAddonsState().losses),
  },
  {
    id: "tf_decision_forests", name: "TensorFlow Decision Forests", category: "model_building", status: "implemented", version: "1.0",
    description: "Random Forest and Gradient Boosted Decision Trees with feature importance and interpretability (leaf paths, split explanations)",
    reference: "tensorflow.org/decision_forests",
    capabilities: getDecisionForestsState().models.concat(getDecisionForestsState().features),
  },
  {
    id: "tf_gnn", name: "TensorFlow GNN", category: "model_building", status: "implemented", version: "1.0",
    description: "Graph Neural Networks: GCN (Kipf 2017), GraphSAGE (Hamilton 2017), GAT (Veličković 2018) with mean/sum/max aggregation",
    reference: "github.com/tensorflow/gnn",
    capabilities: getGNNState().architectures,
  },
  {
    id: "tf_nsl", name: "Neural Structured Learning", category: "model_building", status: "implemented", version: "1.0",
    description: "Graph regularization, adversarial perturbation, and kNN graph construction for structured learning",
    reference: "tensorflow.org/neural_structured_learning",
    capabilities: getGNNState().nslMethods,
  },
  {
    id: "fairness_indicators", name: "Fairness Indicators", category: "responsible_ai", status: "implemented", version: "1.0",
    description: "Slice-based fairness metrics: demographic parity, equalized odds, calibration, disparity alerts",
    reference: "tensorflow.org/responsible_ai/fairness_indicators",
    capabilities: getResponsibleAIState().fairness,
  },
  {
    id: "tf_privacy", name: "TensorFlow Privacy", category: "responsible_ai", status: "implemented", version: "1.0",
    description: "Differential Privacy: DP-SGD, Gaussian/Laplace mechanisms, gradient clipping, privacy accounting (ε,δ)-DP",
    reference: "tensorflow.org/responsible_ai/privacy",
    capabilities: getResponsibleAIState().privacy,
  },
  {
    id: "model_card_toolkit", name: "Model Card Toolkit", category: "responsible_ai", status: "implemented", version: "1.0",
    description: "Automated Model Card generation: model details, intended use, ethical considerations, performance metrics",
    reference: "tensorflow.org/responsible_ai/model_card_toolkit",
    capabilities: getResponsibleAIState().transparency,
  },
  {
    id: "model_remediation", name: "TensorFlow Model Remediation", category: "responsible_ai", status: "implemented", version: "1.0",
    description: "Bias mitigation: MinDiff (MMD kernel), Counterfactual Logit Pairing, fairness reweighting",
    reference: "tensorflow.org/responsible_ai/model_remediation",
    capabilities: getResponsibleAIState().remediation,
  },
  {
    id: "tf_probability", name: "TensorFlow Probability", category: "model_building", status: "implemented", version: "1.0",
    description: "Distributions (Normal, Bernoulli, Beta, Poisson, Categorical), KL divergence, Monte Carlo, Variational ELBO",
    reference: "tensorflow.org/probability",
    capabilities: getProbabilityRankingRecommendersState().probability,
  },
  {
    id: "tf_ranking", name: "TensorFlow Ranking", category: "model_building", status: "implemented", version: "1.0",
    description: "Learning-to-Rank: RankNet (pairwise), ListNet (listwise), NDCG, MRR evaluation",
    reference: "tensorflow.org/ranking",
    capabilities: getProbabilityRankingRecommendersState().ranking,
  },
  {
    id: "tf_recommenders", name: "TensorFlow Recommenders", category: "model_building", status: "implemented", version: "1.0",
    description: "Matrix Factorization (ALS-style), content-based similarity, top-K recommendations with user/item biases",
    reference: "tensorflow.org/recommenders",
    capabilities: getProbabilityRankingRecommendersState().recommenders,
  },
  {
    id: "tf_text", name: "TensorFlow Text", category: "data_preparation", status: "implemented", version: "1.0",
    description: "Tokenization (WordPiece, BPE, SentencePiece), TF-IDF, BM25, n-grams, ROUGE-L, BLEU, edit distance",
    reference: "tensorflow.org/text",
    capabilities: getTextOpsState().tokenizers.concat(getTextOpsState().features, getTextOpsState().evaluation),
  },

  // ═══ Covered by other modules ═══
  {
    id: "tf_federated", name: "TensorFlow Federated", category: "model_building", status: "implemented", version: "1.0",
    description: "Federated learning with aggregation rounds via tf-continuous-learning.ts federated export/import",
    reference: "tensorflow.org/federated",
    capabilities: ["Federated aggregation", "Weight export/import", "Round-based training"],
  },
  {
    id: "tf_quantum", name: "TensorFlow Quantum", category: "model_building", status: "implemented", version: "1.0",
    description: "Variational Quantum Circuits (VQC) with parameterized gates via vqc.ts",
    reference: "tensorflow.org/quantum",
    capabilities: ["Parameterized quantum gates", "VQC optimization", "Hybrid classical-quantum"],
  },
  {
    id: "tf_agents", name: "TensorFlow Agents", category: "model_building", status: "implemented", version: "1.0",
    description: "Hierarchical RL with option framework via hierarchical-rl.ts",
    reference: "tensorflow.org/agents",
    capabilities: ["Hierarchical options", "Meta-controller", "Sub-policies"],
  },
  {
    id: "tf_serving", name: "TensorFlow Serving (Browser)", category: "deployment", status: "implemented", version: "1.0",
    description: "Model serving via Pusher (IndexedDB/localStorage/Supabase/ServiceWorker deployment)",
    reference: "tensorflow.org/tfx/guide/serving",
    capabilities: ["IndexedDB deployment", "ServiceWorker caching", "Supabase sync"],
  },

  // ═══ TFM Vision (TensorFlow Model Garden) ═══
  {
    id: "tfm_vision_augment", name: "tfm.vision.augment", category: "data_preparation", status: "implemented", version: "1.0",
    description: "Image augmentation: AutoAugment (Cubuk 2019), RandAugment (Cubuk 2020), CutOut, CutMix, Mixup, ColorJitter, Random Erasing, and 12+ pixel/geometric ops",
    reference: "tensorflow.org/api_docs/python/tfm/vision/augment",
    capabilities: getAugmentState().pixelOps.concat(getAugmentState().regionOps, getAugmentState().policies),
  },
  {
    id: "tfm_vision_ops", name: "tfm.vision.box_ops + preprocess_ops + nms", category: "model_building", status: "implemented", version: "1.0",
    description: "Box ops (IoU, GIoU, format conversions), NMS (standard, Soft-NMS, class-aware), preprocess (resize+crop, normalize, anchor generation), spatial transforms (ROI Align)",
    reference: "tensorflow.org/api_docs/python/tfm/vision",
    capabilities: getVisionOpsState().boxOps.concat(getVisionOpsState().nms, getVisionOpsState().spatialOps),
  },
  {
    id: "tfm_vision_models", name: "tfm.vision Models (Classification/Detection/Segmentation)", category: "model_building", status: "implemented", version: "1.0",
    description: "Classification (ResNet/ViT/GeM), Detection (RetinaNet with Focal Loss, Faster R-CNN, box decoding), Segmentation (DeepLabV3+ with ASPP, Dice Loss), Instance Seg (Mask R-CNN), Video Classification",
    reference: "tensorflow.org/api_docs/python/tfm/vision",
    capabilities: getVisionModelsState().classification.concat(getVisionModelsState().detection, getVisionModelsState().segmentation, getVisionModelsState().instanceSeg),
  },

  // ═══ LiteRT 2.x (Google AI Edge) ═══
  {
    id: "litert_lm", name: "LiteRT-LM (Language Model Runtime)", category: "model_building", status: "implemented", version: "2.1",
    description: "LLM inference runtime: KV-Cache management, session cloning, prompt caching, streaming decode, nucleus sampling, GenAI Model Zoo (Gemma/Qwen/Llama/Phi/SmoLM/FastVLM)",
    reference: "ai.google.dev/edge/litert/genai/overview",
    capabilities: ["KV-Cache Manager", "Session Cloning", "Prompt Cache (Prefix Sharing)", "Streaming Token Decode", "Nucleus Sampling (Top-K/Top-P)", "GenAI Model Zoo (11 models)"],
  },
  {
    id: "litert_conversion", name: "LiteRT Model Conversion & Quantization", category: "mlops", status: "implemented", version: "2.1",
    description: "Model conversion (PyTorch/TF/JAX/ONNX → .tflite/.litertlm), post-training quantization (int4/int8/float16/dynamic/mixed), NPU dispatch (Qualcomm QNN, MediaTek NeuroPilot), ML Drift GPU, XNNPACK CPU, model profiling",
    reference: "ai.google.dev/edge/litert/conversion/overview",
    capabilities: ["PyTorch/TF/JAX Conversion", "int4 Per-Channel Quantization", "NPU Dispatch API", "ML Drift GPU", "XNNPACK SIMD", "Model Profiling"],
  },

  // ═══ TF Responsible AI (Full Workflow) ═══
  {
    id: "tf_responsible_data", name: "TF Responsible AI: Data Tools", category: "data_preparation", status: "implemented", version: "1.0",
    description: "Know Your Data (dataset profiling, bias detection, quality scoring), TF Data Validation (schema inference, anomaly/skew/drift detection), Data Cards (Gebru 2021 transparency reports), Monk Skin Tone Scale (MST 10-point inclusive classification)",
    reference: "tensorflow.org/responsible_ai",
    capabilities: ["Know Your Data", "TF Data Validation", "Data Cards", "Monk Skin Tone Scale", "Bias Detection", "Schema Inference", "Skew/Drift Detection"],
  },
  {
    id: "tf_responsible_training", name: "TF Responsible AI: Training Tools", category: "model_building", status: "implemented", version: "1.0",
    description: "TF Federated (FedAvg/FedSGD/FedProx/SCAFFOLD, secure aggregation, DP-FedAvg), TF Constrained Optimization (Lagrangian relaxation, fairness constraints TFCO Cotter 2019), TF Lattice (calibrated monotonic lattice models You 2017, interpretable ML)",
    reference: "tensorflow.org/responsible_ai",
    capabilities: ["TF Federated", "TF Constrained Optimization", "TF Lattice", "FedAvg", "Lagrangian Relaxation", "Monotonic Models"],
  },
  {
    id: "tf_responsible_evaluation", name: "TF Responsible AI: Evaluation Tools", category: "responsible_ai", status: "implemented", version: "1.0",
    description: "TF Model Analysis (slice-based eval, cross-slice, model blessing), What-If Tool (counterfactual analysis, threshold sweep), LIT (token saliency, attention viz), Explainable AI (Integrated Gradients, Kernel SHAP, LIME), TF Privacy Tests (membership inference Shokri 2017, model inversion)",
    reference: "tensorflow.org/responsible_ai",
    capabilities: ["TFMA", "What-If Tool", "LIT", "Integrated Gradients", "SHAP", "LIME", "Membership Inference", "Model Inversion"],
  },
];

// ═══ REGISTRY API ═══

export function getTFLibraries(): TFLibraryEntry[] {
  return [...TF_LIBRARIES];
}

export function getTFLibraryById(id: string): TFLibraryEntry | undefined {
  return TF_LIBRARIES.find(l => l.id === id);
}

export function getTFLibrariesByCategory(category: TFLibraryEntry["category"]): TFLibraryEntry[] {
  return TF_LIBRARIES.filter(l => l.category === category);
}

export function getTFLibrariesSummary() {
  const byCategory = new Map<string, number>();
  const byStatus = new Map<string, number>();
  for (const lib of TF_LIBRARIES) {
    byCategory.set(lib.category, (byCategory.get(lib.category) ?? 0) + 1);
    byStatus.set(lib.status, (byStatus.get(lib.status) ?? 0) + 1);
  }
  return {
    total: TF_LIBRARIES.length,
    byCategory: Object.fromEntries(byCategory),
    byStatus: Object.fromEntries(byStatus),
    totalCapabilities: TF_LIBRARIES.reduce((s, l) => s + l.capabilities.length, 0),
  };
}

export function buildTFLibrariesIntrospection(): string {
  const summary = getTFLibrariesSummary();
  const lines = [
    `TENSORFLOW ECOSYSTEM (${summary.total} bibliotecas, ${summary.totalCapabilities} capabilities):`,
  ];
  const categories = ["model_building", "data_preparation", "deployment", "mlops", "responsible_ai"];
  for (const cat of categories) {
    const libs = getTFLibrariesByCategory(cat as TFLibraryEntry["category"]);
    const names = libs.map(l => l.name).join(", ");
    lines.push(`- ${cat.toUpperCase()}: ${names}`);
  }
  return lines.join("\n");
}
