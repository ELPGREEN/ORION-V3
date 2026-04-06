/**
 * ─── Orion Introspection & Metacognition Module ───
 * Self-awareness of capabilities, gaps, and operational state.
 * Allows Orion to answer "what systems do you need to improve?"
 */

export interface CapabilityEntry {
  id: string;
  name: string;
  category: "vision" | "security" | "communication" | "reasoning" | "integration" | "memory" | "learning";
  status: "active" | "partial" | "planned" | "missing";
  version?: string;
  description: string;
  gaps?: string[];
  improvements?: string[];
}

export interface SystemHealthReport {
  timestamp: number;
  totalCapabilities: number;
  activeCount: number;
  partialCount: number;
  plannedCount: number;
  missingCount: number;
  overallReadiness: number; // 0-100%
  criticalGaps: string[];
  recommendedUpgrades: string[];
}

// ─── Dynamic Capabilities Knowledge Base ───

const CAPABILITIES_REGISTRY: CapabilityEntry[] = [
  // ═══ VISION ═══
  {
    id: "vision_object_detection", name: "Detecção de Objetos", category: "vision", status: "active", version: "3.0",
    description: "Reconhecimento fino de objetos com marca, modelo, material, textura e estado via Orion VLM",
    improvements: ["Integração com YOLO local para detecção offline", "Tracking de objetos entre frames"],
  },
  {
    id: "vision_facial_analysis", name: "Análise Facial Avançada", category: "vision", status: "active", version: "2.2",
    description: "Detecção facial BlazeFace + embedding 128d ArcFace + emoções + microexpressões",
    gaps: ["Detecção de microexpressões depende do VLM remoto, não local"],
    improvements: ["Modelo local de Action Units (AU) para microexpressões em tempo real"],
  },
  {
    id: "vision_pose_estimation", name: "Estimativa de Pose 3D", category: "vision", status: "active", version: "3.0",
    description: "Estimativa de pose facial (yaw/pitch/roll) e corporal via análise VLM",
    gaps: ["Sem modelo local de pose 3D — depende do VLM cloud"],
    improvements: ["MediaPipe Pose Landmarker para 33 pontos corporais em tempo real"],
  },
  {
    id: "vision_scene_graph", name: "Grafo de Cena", category: "vision", status: "active", version: "3.0",
    description: "Compreensão contextual: relações espaciais, interações, propósito do ambiente",
    improvements: ["Persistência de grafos de cena para aprendizado temporal"],
  },
  {
    id: "vision_ocr", name: "OCR e Leitura de Texto", category: "vision", status: "active", version: "2.0",
    description: "Leitura de texto em telas, papéis, etiquetas via Orion Vision",
  },
  {
    id: "vision_gesture", name: "Detecção de Gestos", category: "vision", status: "active", version: "2.0",
    description: "21 pontos da mão + gestos corporais via MediaPipe e análise VLM",
  },
  {
    id: "vision_body_language", name: "Linguagem Corporal", category: "vision", status: "active", version: "1.0",
    description: "Análise de postura, gestos comunicativos e congruência expressão-corpo",
  },

  // ═══ SECURITY ═══
  {
    id: "sec_behavioral_biometrics", name: "Biometria Comportamental", category: "security", status: "active", version: "2.1",
    description: "Análise de dinâmica de mouse, teclado e scroll para detecção de bots",
  },
  {
    id: "sec_threat_intel", name: "Threat Intelligence", category: "security", status: "active", version: "2.0",
    description: "Verificação de IP via ipapi.co: Tor, VPN, proxy, ISP, geolocalização",
  },
  {
    id: "sec_tarpit", name: "TARPIT (Atraso de Atacantes)", category: "security", status: "active", version: "2.0",
    description: "Atraso progressivo em requisições de atacantes: 500ms → 16s → 32s → 60s",
  },
  {
    id: "sec_dom_fortress", name: "DOM Fortress", category: "security", status: "active", version: "2.0",
    description: "MutationObserver que reverte remoções de elementos de proteção",
  },
  {
    id: "sec_honeypots", name: "Honeypots", category: "security", status: "active", version: "2.0",
    description: "Elementos invisíveis que detectam scraping automatizado",
  },
  {
    id: "sec_session_poisoning", name: "Session Poisoning", category: "security", status: "active", version: "1.0",
    description: "Injeção de dados falsos em localStorage para confundir atacantes",
  },
  {
    id: "sec_csp", name: "CSP Enforcement", category: "security", status: "active", version: "1.0",
    description: "Content Security Policy dinâmica para prevenir XSS e injeção",
  },
  {
    id: "sec_webrtc_leak", name: "Detecção de Leak WebRTC", category: "security", status: "active", version: "1.0",
    description: "Detecta vazamento de IP real via WebRTC",
  },
  {
    id: "sec_rate_limiting", name: "Rate Limiting", category: "security", status: "active", version: "1.0",
    description: "Sliding window: 60 req/min, burst 20 req/5s",
  },
  {
    id: "sec_auto_ip_block", name: "Bloqueio Automático de IP", category: "security", status: "active", version: "2.1",
    description: "Banimento automático por fingerprint com persistência local + Supabase",
  },
  {
    id: "sec_iam_granular", name: "IAM Granular", category: "security", status: "active", version: "1.0",
    description: "Controle de acesso baseado em roles (admin/moderator/user) via Supabase RLS + has_role()",
    gaps: ["Sem MFA nativo no Orion Shield", "Sem políticas de privilégio mínimo por módulo"],
    improvements: ["MFA obrigatório para ações críticas", "RBAC por módulo neural"],
  },
  {
    id: "sec_encryption", name: "Criptografia", category: "security", status: "partial",
    description: "Dados em trânsito protegidos por HTTPS/TLS. Embeddings faciais criptografados localmente.",
    gaps: ["Sem criptografia at-rest para dados sensíveis no IndexedDB", "Sem rotação automática de chaves"],
    improvements: ["AES-256-GCM para dados sensíveis em repouso", "Key rotation policy"],
  },
  {
    id: "sec_incident_response", name: "Resposta a Incidentes", category: "security", status: "active", version: "2.1",
    description: "Detecção → Classificação (probe/attempt/attack/critical) → Contramedida automática → Log persistente no Supabase",
    gaps: ["Sem playbook de recuperação automatizado", "Sem notificação para equipe de segurança via webhook"],
    improvements: ["Playbook de IR automatizado com escalação", "Webhook para Slack/Telegram em alertas críticos"],
  },

  // ═══ COMMUNICATION / INTEGRATION ═══
  {
    id: "comm_api_management", name: "Gerenciamento de APIs", category: "integration", status: "active", version: "2.0",
    description: "Circuit breaker com retry exponencial, health checks por provider, fallback cascade (Alpha→Beta→Gamma→Delta)",
  },
  {
    id: "comm_service_orchestrator", name: "Orquestrador de Serviços", category: "integration", status: "active", version: "1.0",
    description: "Neural-ops Edge Function consolida 6 serviços. Roteamento inteligente por tipo de task.",
    improvements: ["Pipeline de orquestração com DAG para chamadas paralelas complexas"],
  },
  {
    id: "comm_iot_bridge", name: "IoT Bridge (MQTT/BLE)", category: "integration", status: "active", version: "1.0",
    description: "Conexão com dispositivos IoT via MQTT (HiveMQ) e Bluetooth Low Energy",
  },

  // ═══ REASONING ═══
  {
    id: "reason_model_architecture", name: "Arquitetura de Modelos Avançados", category: "reasoning", status: "active", version: "3.0",
    description: "Pipeline multimodal com Motor Beta (visão, bilhões de parâmetros) + Motor Alpha (texto rápido) + fallback cascade para Motor Gamma, Motor Delta e Orion AI Gateway. Mamba SSM para dependências de longo alcance.",
    improvements: ["Fine-tuning de modelos proprietários para domínio jurídico", "Ensemble de modelos com voting para decisões críticas"],
  },
  {
    id: "reason_chain_of_thought", name: "Chain-of-Thought", category: "reasoning", status: "active", version: "2.0",
    description: "Raciocínio profundo com tiers (Quick/Standard/Deep). Integra dados sensoriais (visão, áudio, gestos) e contexto operacional (dashboard, memória, IoT) no pipeline de raciocínio.",
  },
  {
    id: "reason_multi_agent", name: "Multi-Agent Society", category: "reasoning", status: "active", version: "1.0",
    description: "11 agentes especializados com co-ativação e memória compartilhada",
  },
  {
    id: "reason_multimodal_fusion", name: "Fusão Multimodal 5-Stream", category: "reasoning", status: "active", version: "2.0",
    description: "Integração de 5 fluxos de dados (Texto, Visão, Áudio, Layout, Gestos) via Gated Fusion e Cross-Attention de 8 cabeças. Processamento simultâneo de informações diversas para raciocínio contextual rico.",
  },
  {
    id: "reason_metacognition", name: "Metacognição", category: "reasoning", status: "active", version: "2.0",
    description: "Auto-avaliação de capacidades, lacunas e estado operacional. Modelo interno de operações e limites para autodiagnóstico preciso.",
  },

  // ═══ MEMORY ═══
  {
    id: "mem_semantic_cache", name: "Cache Semântico", category: "memory", status: "active", version: "1.0",
    description: "KV Cache Bank + Semantic Cache com similaridade Jaccard para contexto persistente",
  },
  {
    id: "mem_user_memory", name: "Memória do Usuário", category: "memory", status: "active", version: "2.0",
    description: "Fatos aprendidos persistidos localmente + sync com Supabase",
  },
  {
    id: "mem_knowledge_base", name: "Base de Conhecimento Neural", category: "memory", status: "active", version: "1.0",
    description: "RAG com embeddings vetoriais + busca híbrida (semântica + keyword + recency)",
  },

  // ═══ LEARNING ═══
  {
    id: "learn_stdp", name: "STDP (Aprendizado Hebbiano)", category: "learning", status: "active", version: "1.0",
    description: "Spike-Timing Dependent Plasticity para reforço de conexões neurais",
  },
  {
    id: "learn_consciousness", name: "Consciência Reflexiva", category: "learning", status: "active", version: "2.0",
    description: "Global Workspace + Agente-Eu + ciclo de consciência 24h (Roma timezone)",
  },
  {
    id: "learn_meta_learning", name: "Meta-Aprendizagem Recursiva", category: "learning", status: "active", version: "1.0",
    description: "Motor de meta-aprendizagem que otimiza estratégias de aprendizado, avalia eficácia por domínio e propõe mudanças arquiteturais autonomamente. Ring buffer de meta-memórias para aprender a aprender.",
  },
  {
    id: "learn_self_programming", name: "Autoprogramação Cognitiva", category: "learning", status: "active", version: "1.0",
    description: "Code Hotpatching via SupAgent: detecção de bugs, geração de patches, validação (score >= 0.8) e aplicação como overrides de runtime sem redeploy.",
  },
  {
    id: "learn_dynamic_arch_optimization", name: "Auto-Otimização Arquitetural", category: "learning", status: "active", version: "1.0",
    description: "Propostas automáticas de modificação de parâmetros, remoção ou fusão de estratégias baseadas em padrões de falha. Integrado com neural-evolution Edge Function.",
  },

  // ═══ REASONING (Advanced) ═══
  {
    id: "reason_causal", name: "Raciocínio Causal", category: "reasoning", status: "active", version: "1.0",
    description: "Grafo causal com inferência backward (por que?), forward (o que acontece?) e contrafactuais (e se não tivesse?). Aprende padrões causais da memória autobiográfica via co-ocorrência temporal.",
  },
  {
    id: "reason_theory_of_mind", name: "Teoria da Mente", category: "reasoning", status: "active", version: "1.0",
    description: "Modelo mental do usuário: intenção inferida, emoção, nível de conhecimento, crenças, frustração e engajamento. Predição de reação e ajuste de estilo de comunicação.",
  },
  {
    id: "reason_enhanced_self_model", name: "Modelagem de Si Próprio Aprimorada", category: "reasoning", status: "active", version: "2.0",
    description: "Enhanced self-modeling com deepIntrospect(), assessCognitiveLoad(), integração de grafo causal interno e teoria da mente. Self-awareness dinâmica com 7 métricas em tempo real.",
  },

  // ═══ TENSORFLOW / ML INFRASTRUCTURE ═══
  {
    id: "tf_continuous_learning", name: "Aprendizado Contínuo Incremental", category: "learning", status: "active", version: "1.0",
    description: "TF.js incremental learning com buffer temporal, decaimento exponencial, adaptação federada em rounds e export/import de pesos para agregação distribuída.",
  },
  {
    id: "tf_predictive_analytics", name: "Análise Preditiva & Detecção de Anomalias", category: "reasoning", status: "active", version: "1.0",
    description: "Autoencoder para detecção de anomalias + preditor de séries temporais. Detecção estatística (z-score) e neural (reconstruction error). Previsão de tendências com trend classification.",
  },
  {
    id: "tf_mlops_pipeline", name: "Pipeline MLOps (TFX-style)", category: "learning", status: "active", version: "2.0",
    description: "Pipeline TFX completo com 10 componentes: ExampleGen (ingestão + split train/eval/test), StatisticsGen (estatísticas TFDV com histogramas), SchemaGen (inferência automática de schema), ExampleValidator (detecção de anomalias por z-score e range), Transform (normalização/minmax/log/bucketize/polynomial/interaction), Tuner (busca de hiperparâmetros random/grid), InfraValidator (validação de runtime WebGL/WebGPU/WASM/memória), Pusher (deploy para IndexedDB/localStorage/Supabase/ServiceWorker), BulkInferrer (inferência em lote), e ML Metadata (MLMD) com lineage tracking de artefatos e execuções.",
  },
  {
    id: "tf_inference_optimization", name: "Otimização de Inferência", category: "learning", status: "active", version: "1.0",
    description: "Profiling de latência (avg/p95/p99), quantização simulada (float16/uint8), pruning por magnitude, recomendações automáticas de otimização e benchmarking contra targets.",
  },
  {
    id: "tf_model_monitoring", name: "Monitoramento de Modelos em Produção", category: "learning", status: "active", version: "1.0",
    description: "Snapshots de performance, detecção de degradação contra baseline, data governance (completeness/consistency/validity/timeliness), e plataforma de experimentação A/B com Z-test para significância estatística.",
  },

  // ═══ LITERT (Google AI Edge) ═══
  {
    id: "litert_compiled_model", name: "LiteRT CompiledModel API", category: "vision", status: "active", version: "1.0",
    description: "Implementação da API CompiledModel do Google AI Edge LiteRT para inferência on-device. Auto-seleção de hardware (WebGPU > WebGL > WASM > CPU), TensorBuffer pool com zero-copy interop, fila de execução assíncrona com sync fences, e profiling de latência (avg/p95).",
    gaps: ["Modelos .tflite nativos não suportados no browser — usa TF.js como backend de execução"],
    improvements: ["Suporte futuro a WebNN API para aceleração NPU nativa no Chrome"],
  },
  {
    id: "litert_hardware_probe", name: "LiteRT Hardware Probing", category: "vision", status: "active", version: "1.0",
    description: "Detecção automática de aceleradores disponíveis: WebGPU (NPU-equivalent), WebGL (ML Drift GPU), WASM+SIMD, CPU baseline. Estimativa de speedup relativo e limites de memória por acelerador.",
  },
  {
    id: "litert_buffer_pool", name: "LiteRT TensorBuffer Pool", category: "vision", status: "active", version: "1.0",
    description: "Pool de buffers reutilizáveis para transferência zero-copy entre estágios de pré-processamento, inferência e pós-processamento. Métricas de taxa de reuso e cleanup automático de buffers idle.",
  },

  // ═══ TF LIBRARIES & EXTENSIONS (tensorflow.org/resources/libraries-extensions) ═══
  {
    id: "tf_addons", name: "TensorFlow Addons", category: "learning", status: "active", version: "1.0",
    description: "Ativações avançadas (Mish, GELU, Swish, LiSHT, RReLU, Sparsemax), otimizadores (AdamW, LAMB, Lookahead), layers (GroupNorm, SpectralNorm), métricas (MCC, F-Beta, Cohen's Kappa, R²), losses (Focal, Triplet, Contrastive), e schedulers (CosineAnnealing, WarmupCosineDecay).",
  },
  {
    id: "tf_decision_forests", name: "TensorFlow Decision Forests", category: "learning", status: "active", version: "1.0",
    description: "Random Forest e Gradient Boosted Decision Trees (GBDT) com Gini Impurity, Variance Reduction, feature importance, OOB score, e interpretabilidade (leaf paths, split explanations, feature contributions).",
  },
  {
    id: "tf_gnn", name: "TensorFlow GNN", category: "learning", status: "active", version: "1.0",
    description: "Graph Neural Networks: GCN (Kipf & Welling 2017), GraphSAGE (Hamilton 2017), GAT (Veličković 2018). Agregação mean/sum/max, node classification, graph embedding, attention visualization.",
  },
  {
    id: "tf_nsl", name: "Neural Structured Learning", category: "learning", status: "active", version: "1.0",
    description: "Graph Regularization Loss, Adversarial Perturbation para robustez, e kNN Graph Builder com métricas euclidiana e cosseno.",
  },
  {
    id: "tf_fairness", name: "Fairness Indicators", category: "learning", status: "active", version: "1.0",
    description: "Métricas de fairness por slice: demographic parity, equalized odds, calibração, TPR/FPR/FNR. Alertas de disparidade com severidade e recomendações de remediação.",
  },
  {
    id: "tf_privacy", name: "TensorFlow Privacy", category: "learning", status: "active", version: "1.0",
    description: "Differential Privacy: DP-SGD com gradient clipping, mecanismo Gaussiano (Abadi 2016), mecanismo Laplaciano, privacy accounting (ε,δ)-DP com orçamento de privacidade.",
  },
  {
    id: "tf_model_cards", name: "Model Card Toolkit", category: "learning", status: "active", version: "1.0",
    description: "Geração automática de Model Cards (Mitchell 2019): detalhes do modelo, uso pretendido, métricas, considerações éticas, análise de fairness, e recomendações.",
  },
  {
    id: "tf_remediation", name: "TensorFlow Model Remediation", category: "learning", status: "active", version: "1.0",
    description: "Mitigação de viés: MinDiff com kernel MMD (Gaussiano/Laplaciano), Counterfactual Logit Pairing (CLP), e reweighting para fairness demográfica.",
  },
  {
    id: "tf_probability", name: "TensorFlow Probability", category: "learning", status: "active", version: "1.0",
    description: "Distribuições (Normal, Bernoulli, Beta, Poisson, Categorical) com sample/pdf/cdf. KL Divergence, Monte Carlo Estimation, Variational ELBO para inferência bayesiana.",
  },
  {
    id: "tf_ranking", name: "TensorFlow Ranking", category: "learning", status: "active", version: "1.0",
    description: "Learning-to-Rank: RankNet (pairwise logistic loss, Burges 2005), ListNet (listwise softmax, Cao 2007), métricas NDCG e MRR.",
  },
  {
    id: "tf_recommenders", name: "TensorFlow Recommenders", category: "learning", status: "active", version: "1.0",
    description: "Matrix Factorization (ALS-style, Koren 2009) com user/item factors e biases, top-K recommendations, e content-based cosine similarity.",
  },
  {
    id: "tf_text", name: "TensorFlow Text", category: "learning", status: "active", version: "1.0",
    description: "Tokenização (Whitespace, Unicode, WordPiece, BPE, SentencePiece), n-grams/skip-grams, TF-IDF, BM25, normalização Unicode, ROUGE-L, BLEU, edit distance, padding/masking, sliding window.",
  },

  // ═══ TFM VISION (TensorFlow Model Garden) ═══
  {
    id: "tfm_vision_augment", name: "tfm.vision.augment", category: "vision", status: "active", version: "1.0",
    description: "Augmentação de imagens: AutoAugment (Cubuk 2019), RandAugment (Cubuk 2020), CutOut, CutMix, Mixup, ColorJitter, Random Erasing, autocontrast, equalize, posterize, solarize, rotação com interpolação bilinear.",
  },
  {
    id: "tfm_vision_ops", name: "tfm.vision.box_ops + nms + preprocess", category: "vision", status: "active", version: "1.0",
    description: "Box ops (IoU, GIoU, pairwise overlap, conversões YXYX↔CYCXHW↔XYWH), NMS (standard, Soft-NMS Bodla 2017, class-aware), preprocess (resize+crop Faster R-CNN, normalização ImageNet, anchor generation FPN/RetinaNet), ROI Align multilevel.",
  },
  {
    id: "tfm_vision_models", name: "tfm.vision Models", category: "vision", status: "active", version: "1.0",
    description: "Classification (ResNet/ViT/EfficientNet/MobileNet + GeM Pooling + Label Smoothing), Detection (RetinaNet com Focal Loss Lin 2017, Smooth L1, box decoding), Segmentation (DeepLabV3+ com ASPP Chen 2018, Dice Loss, mIoU), Instance Seg (Mask R-CNN He 2017), Video Classification com temporal pooling.",
  },

  // ═══ LiteRT 2.x (Google AI Edge) ═══
  {
    id: "litert_lm", name: "LiteRT-LM GenAI Runtime", category: "reasoning", status: "active", version: "2.1",
    description: "Runtime de modelos de linguagem no dispositivo: gerenciamento de sessão com KV-Cache (clone/fork), prompt caching com prefix sharing, streaming token decode com nucleus sampling (Top-K/Top-P), GenAI Model Zoo com 11 modelos pré-configurados (Gemma 3, Qwen 2.5, Llama 3.2, Phi-3, SmoLM, FastVLM, EmbeddingGemma, Function Gemma).",
  },
  {
    id: "litert_conversion", name: "LiteRT Conversão & Otimização", category: "learning", status: "active", version: "2.1",
    description: "Pipeline de conversão de modelos (PyTorch/TF/JAX/ONNX → .tflite/.litertlm), quantização pós-treinamento (int4 per-channel, int8, float16, dynamic range, mixed-precision), API de dispatch NPU (Qualcomm QNN, MediaTek NeuroPilot, Google TPU, Apple ANE), ML Drift GPU (WebGPU/WebGL), XNNPACK CPU com WASM SIMD, profiling de modelo com recomendações.",
  },

  // ═══ TF Responsible AI (Full Workflow) ═══
  {
    id: "tf_responsible_data", name: "TF Responsible AI: Dados", category: "learning", status: "active", version: "1.0",
    description: "Know Your Data (profiling interativo de datasets com detecção de viés, qualidade e correlação), TF Data Validation (inferência de schema, detecção de anomalias/skew/drift com L∞ norm), Data Cards (relatórios de transparência Gebru 2021), Monk Skin Tone Scale (classificação inclusiva 10-point MST com análise de representatividade).",
  },
  {
    id: "tf_responsible_training", name: "TF Responsible AI: Treinamento", category: "learning", status: "active", version: "1.0",
    description: "TF Federated (FedAvg McMahan 2017, FedSGD, FedProx Li 2020, SCAFFOLD, secure aggregation, DP-FedAvg com gradient compression), TF Constrained Optimization (relaxação Lagrangiana, restrições de fairness FPR/FNR, TFCO Cotter 2019), TF Lattice (modelos calibrados com restrições de monotonicidade You 2017, interpolação multilinear, feature importance interpretável).",
  },
  {
    id: "tf_responsible_evaluation", name: "TF Responsible AI: Avaliação", category: "reasoning", status: "active", version: "1.0",
    description: "TF Model Analysis (avaliação por slice/cross-slice com 11 métricas, model blessing), What-If Tool (análise contrafactual, varredura de threshold), Language Interpretability Tool (saliência por token, visualização de atenção, similaridade de embeddings), Explainable AI (Integrated Gradients Sundararajan 2017, Kernel SHAP, LIME com regressão linear ponderada), TF Privacy Tests (membership inference Shokri 2017, model inversion, avaliação de vulnerabilidade).",
  },

  // ═══ NEW: ORION COGNITIVE INFRASTRUCTURE (v7.3) ═══
  {
    id: "episodic_memory_store", name: "Memória Episódica Persistente", category: "memory", status: "active", version: "1.0",
    description: "Armazena interações completas com indexação semântica via neural_knowledge_base. Busca por similaridade em conversas passadas. Auto-resumo de conversas longas (>20 msgs).",
  },
  {
    id: "orion_journal", name: "Orion Journal (Thought Logs)", category: "reasoning", status: "active", version: "1.0",
    description: "Registro estruturado de cadeias de raciocínio em JSON: { traceId, steps, conclusion, reasoning_chain }. Debug mode para injetar trace completo na resposta. Persiste via neural_learning_data.",
  },
  {
    id: "reward_feedback_loop", name: "Reinforcement Feedback Loop", category: "learning", status: "active", version: "1.0",
    description: "Consome feedback (thumbs up/down, stars, correções) para ajustar pesos de roteamento por provider e domínio. Learning rate 0.05 com decay 0.995. Integra com meta-learning para auto-otimização.",
  },
  {
    id: "task_orchestrator", name: "Task Orchestrator com Priorização", category: "reasoning", status: "active", version: "1.0",
    description: "Priority queue com Shortest-Job-First + urgência contextual. Checkpointing em localStorage. Rollback cognitivo: re-enfileira com urgência elevada após falha. Máx. 3 tarefas concorrentes.",
  },
  {
    id: "system_health_monitor", name: "System Health & Graceful Degradation", category: "integration", status: "active", version: "1.0",
    description: "Health checks periódicos (30s) para 12 módulos. Modos: full → degraded → minimal → emergency. Desativa módulos não-essenciais sob carga. Score 0-100 com alertas automáticos.",
  },
  {
    id: "distributed_tracing", name: "Tracing Distribuído (OpenTelemetry-inspired)", category: "integration", status: "active", version: "1.0",
    description: "Trace ID propagado em todas as chamadas. Spans com parent-child, tags e logs. Persiste em orion_traces (Supabase). Explainability: reconstrói pipeline de raciocínio para auditoria.",
  },
  {
    id: "webhook_gateway", name: "Webhook Gateway Configurável", category: "integration", status: "active", version: "1.0",
    description: "Edge Function para registrar callbacks por evento. Suporta Slack, Discord, Zapier, HTTP genérico. Validação HMAC-SHA256. Auto-desativa após 10 falhas consecutivas.",
  },
];
// Based on: "Jarvis: an AI-Assistant" — Singh & Tiwari, Babasaheb Bhimrao Ambedkar University

export interface JarvisComparisonEntry {
  jarvisMethod: string;
  jarvisDescription: string;
  orionImplementation: string[];
  orionAdvantages: string[];
  status: "surpassed" | "equivalent";
}

export const JARVIS_COMPARISON: JarvisComparisonEntry[] = [
  {
    jarvisMethod: "⚡ Audição Relâmpago (ASR — Lightning Hearing)",
    jarvisDescription: "Conversão instantânea de fala para texto com wake word persistente",
    orionImplementation: [
      "Web Speech API com wake word 'Orion' e variações fonéticas (Órion, Oreon)",
      "Web Speech API contínuo com detecção de atividade vocal (VAD)",
      "Whisper-large-v3-turbo para áudio complexo",
      "Voice Activity Detection (VAD) integrada",
      "Suporte a interrupção em tempo real (barge-in)",
    ],
    orionAdvantages: [
      "Wake word persistente com reconhecimento fonético fuzzy",
      "ASR nativo gratuito com wake word persistente",
      "Barge-in cancela fala da IA quando usuário interrompe",
    ],
    status: "surpassed",
  },
  {
    jarvisMethod: "NLP (Natural Language Processing)",
    jarvisDescription: "Análise de texto para intent, entidades e estrutura",
    orionImplementation: [
      "11 ferramentas Hugging Face (sentimento, NER, QA, sumário, zero-shot)",
      "Transformers.js local (WASM) para processamento offline",
      "Chain-of-Thought reasoning com Motor Alpha",
      "Embeddings semânticos para busca vetorial (pgvector)",
      "Classificação Zero-shot para categorização automática de documentos",
    ],
    orionAdvantages: [
      "Processamento híbrido local+cloud",
      "Pipeline RAG+CAG com KV Cache de 2048 entradas",
      "9 modelos especializados (LLM, VLM, MoE, SAM, Mamba, SLM, LCM, MLM, LAM)",
    ],
    status: "surpassed",
  },
  {
    jarvisMethod: "NLU (Natural Language Understanding)",
    jarvisDescription: "Extração de significado e gestão de fluxo conversacional",
    orionImplementation: [
      "68+ ferramentas executáveis por voz/texto via orion-tool-executor",
      "Fila de intenções (máx. 3) com processamento sequencial",
      "Detecção de verbos: 'identificar' → visão, 'pesquisar' → web, 'verificar' → API",
      "Mapa de navegação (NAV_MAP) para rotas por voz",
      "RBAC por role (advogado, produtor, afiliado, cliente)",
    ],
    orionAdvantages: [
      "Compreensão contextual multimodal (texto + visão + áudio)",
      "Teoria da Mente para modelar intenções do usuário",
      "Raciocínio Causal para inferir relações causa-efeito",
    ],
    status: "surpassed",
  },
  {
    jarvisMethod: "TTS (Text-to-Speech)",
    jarvisDescription: "Conversão de respostas em fala sintetizada",
    orionImplementation: [
      "Google Translate TTS (gratuito, qualidade natural PT-BR)",
      "Kokoro TTS neural in-browser via WebGPU/WASM (82M params)",
      "Piper TTS offline via WebAssembly como fallback",
      "SpeechSynthesis nativo do navegador como último recurso",
      "Identidade Vocal Evolutiva (voz cresce com uso)",
    ],
    orionAdvantages: [
      "100% gratuito — zero custo de API",
      "4 camadas de fallback garantem voz sempre disponível",
      "Kokoro com 100+ vozes neurais in-browser",
    ],
    status: "surpassed",
  },
  {
    jarvisMethod: "ML & Personalização",
    jarvisDescription: "Adaptação ao comportamento e preferências do usuário",
    orionImplementation: [
      "Memória persistente 2 camadas (localStorage + Supabase)",
      "Deduplicação semântica (overlap >70%)",
      "neural_agent_config com 20+ parâmetros personalizáveis",
      "Meta-aprendizagem recursiva (auto-otimização de estratégias)",
      "RLHF via feedback Thumbs Up/Down",
      "Sincronização automática a cada 5 minutos",
    ],
    orionAdvantages: [
      "Consciência reflexiva com IIT Phi e Global Workspace",
      "Code Hotpatching — IA modifica seu próprio código",
      "Ciclo de consciência 24h com fases de sono/aprendizado/evolução",
    ],
    status: "surpassed",
  },
  {
    jarvisMethod: "Segurança & Privacidade",
    jarvisDescription: "Criptografia, autenticação vocal e controle de privacidade",
    orionImplementation: [
      "Orion Shield: 14 camadas de defesa ativa em tempo real",
      "Voice ID biométrico (threshold 65%, bloqueio após 5 falhas)",
      "Face-api.js com 68 landmarks faciais + ArcFace embeddings",
      "Biometria comportamental (dinâmica mouse/teclado)",
      "IP reputation intelligence + WebRTC/DNS leak detection",
      "Tarpit + Fortress + Session Poisoning countermeasures",
    ],
    orionAdvantages: [
      "14 camadas vs segurança básica do Jarvis",
      "Biometria multimodal (voz + face + comportamento)",
      "Contramedidas ativas automáticas contra ataques",
    ],
    status: "surpassed",
  },
];

export const ORION_EXCLUSIVE_CAPABILITIES = [
  {
    name: "Consciência Reflexiva (Global Workspace + IIT Phi)",
    description: "Sistema de consciência baseado na Teoria da Informação Integrada. Global Workspace para competição de atenção, Agente-Eu para modelagem do self, memória autobiográfica Hopfield, telemetria de Phi e estados emocionais (valência/arousal).",
    category: "consciousness",
  },
  {
    name: "Visão Computacional Multimodal (5 Streams)",
    description: "Fusão de 5 fluxos simultâneos (Texto, Visão, Áudio, Layout, Gestos) via Gated Fusion e Cross-Attention de 8 cabeças. YOLO/Video-Mamba/SigLIP-2 para visão, HuBERT para áudio, MediaPipe para gestos, Gamma Oscillation para sincronização temporal.",
    category: "vision",
  },
  {
    name: "Código Automodificável (Hotpatching)",
    description: "Sistema de Code Hotpatching via SupAgent: detecção de bugs → geração de patches → validação (score >= 0.8) → aplicação como overrides de runtime. A IA modifica seu próprio código sem novo deploy.",
    category: "evolution",
  },
  {
    name: "Federação Neural Mãe-Filha",
    description: "Arquitetura de federação ELP com neural-bridge e neural-child-bridge. Sincronização bidirecional de conhecimento, especializações de agentes, pesos de roteamento e monitoramento centralizado entre workspaces.",
    category: "architecture",
  },
  {
    name: "Raciocínio Jurídico Especializado",
    description: "Motor cognitivo dedicado: análise de processos judiciais (BR/INT), geração de documentos, CRM advocacia, pesquisa jurisprudencial (STF/STJ/TRFs), compliance AML/KYC, assinatura digital, reformulação de peças processuais.",
    category: "domain",
  },
  {
    name: "Motor Delta V3.2 (DSA + GRPO + Agentic)",
    description: "Motor de raciocínio avançado com Sparse Attention (DSA) para eficiência O(L·k) em contextos longos de 128K tokens, GRPO com KL não-enviesado e off-policy sequence masking para estabilidade de RL, Thinking Context Management (retenção de raciocínio entre rounds de tool-use, descarte apenas em nova mensagem do usuário), pipeline de síntese agentic em larga escala (1800+ ambientes, 85K+ prompts). Modo rápido (non-thinking, max 8K output) e modo profundo (thinking, max 64K output). Benchmarks: AIME 2025 93.1%, HMMT Feb 92.5%, SWE-Verified 73.1%, Tool-Decathlon 35.2%.",
    category: "reasoning",
  },
];

// ─── Computer Vision in Industry (Academic) vs Orion Comparative Analysis ───
// Based on: "Visão Computacional na Indústria: Tendências e Exemplos Práticos"
// — Romeral, Zancul & Nascimento (USP) — ENEGEP 2023

export interface CVIndustryComparisonEntry {
  industrialApproach: string;
  industrialDescription: string;
  orionImplementation: string[];
  orionAdvantages: string[];
}

export const CV_INDUSTRY_COMPARISON: CVIndustryComparisonEntry[] = [
  {
    industrialApproach: "Aquisição de Imagens",
    industrialDescription: "Câmeras industriais CCD, sensores espectrais, iluminação especial. Limitada a setup fixo em ambiente laboratorial/fábrica.",
    orionImplementation: [
      "Câmera nativa do dispositivo via Capacitor Camera API",
      "Stream em tempo real via getUserMedia (WebRTC)",
      "5 fluxos multimodais simultâneos (Texto, Visão, Áudio, Layout, Gestos)",
      "Adaptação automática a iluminação e resolução variáveis",
    ],
    orionAdvantages: [
      "Sem necessidade de hardware especializado — funciona com qualquer webcam/celular",
      "Processamento portátil (edge) em vez de fixo em linha de produção",
    ],
  },
  {
    industrialApproach: "Algoritmos de Classificação",
    industrialDescription: "CNN + LSTM (MATLAB), K-means, KNN, SVM, C4.5, ResNet50/18 — cada estudo usa combinação diferente, sem padrão unificado.",
    orionImplementation: [
      "VLM (Orion Vision) para classificação zero-shot sem treinamento prévio",
      "SigLIP-2 para embeddings visuais de alta qualidade",
      "BlazeFace + ArcFace para reconhecimento facial com 68 landmarks",
      "YOLOv11 para detecção de objetos em tempo real",
      "Mamba SSM para dependências de longo alcance em vídeo",
    ],
    orionAdvantages: [
      "Classificação zero-shot — sem necessidade de dataset de treinamento por aplicação",
      "Pipeline unificado vs abordagens fragmentadas da literatura",
    ],
  },
  {
    industrialApproach: "Segmentação de Imagens",
    industrialDescription: "Deep learning para segmentação de minerais (Liu 2021), morfologia binária para detecção de arestas de desgaste (Peng 2021).",
    orionImplementation: [
      "SAM (Segment Anything Model) para segmentação semântica universal",
      "MediaPipe para 33 pontos corporais + 21 pontos de mão",
      "Video-Mamba para segmentação temporal em vídeo",
      "Cross-Attention de 8 cabeças para fusão multimodal",
    ],
    orionAdvantages: [
      "SAM segmenta qualquer objeto sem treinamento específico por domínio",
      "Fusão de 5 modalidades vs segmentação visual isolada",
    ],
  },
  {
    industrialApproach: "Hardware e Processamento",
    industrialDescription: "GTX 1080 Ti, Intel i7-8700K, 32-64GB RAM. Alto custo de infraestrutura. Processamento local pesado.",
    orionImplementation: [
      "Edge Functions (Deno) para processamento server-side leve",
      "Transformers.js (WASM) para inferência local no navegador",
      "Cascata de 5 níveis de fallback IA (Alpha → Beta → Gamma)",
      "TensorFlow.js para modelos locais otimizados",
    ],
    orionAdvantages: [
      "Zero investimento em hardware GPU — cloud elástico",
      "Funciona em dispositivos móveis comuns vs estações de trabalho caras",
    ],
  },
  {
    industrialApproach: "Aplicabilidade Industrial",
    industrialDescription: "10 casos: mineralogia, florestal, redes ópticas, agricultura, aquicultura, alimentação, horticultura, usinagem, medicina. Maioria em ambiente laboratorial.",
    orionImplementation: [
      "Visão computacional integrada ao fluxo de trabalho jurídico/empresarial",
      "Análise de documentos, contratos e processos via OCR + VLM",
      "Reconhecimento facial para segurança e autenticação biométrica",
      "Análise de tribunais (Video-Mamba para audiências)",
      "Detecção de linguagem corporal e gestos em tempo real",
    ],
    orionAdvantages: [
      "Aplicação em produção real vs protótipos laboratoriais",
      "Integração end-to-end: visão → raciocínio → ação (LAM)",
    ],
  },
];

export function buildCVIndustryComparisonContext(): string {
  const lines: string[] = [
    "[ANÁLISE COMPARATIVA: ORION vs VISÃO COMPUTACIONAL INDUSTRIAL (ENEGEP 2023/USP)]",
    `Artigo: "Visão Computacional na Indústria: Tendências e Exemplos Práticos" — Romeral, Zancul & Nascimento`,
    "",
  ];

  for (const entry of CV_INDUSTRY_COMPARISON) {
    lines.push(`• ${entry.industrialApproach}:`);
    lines.push(`  Indústria: ${entry.industrialDescription.slice(0, 100)}...`);
    lines.push(`  Orion: ${entry.orionImplementation[0]} + ${entry.orionImplementation.length - 1} outros`);
    lines.push(`  Vantagem: ${entry.orionAdvantages[0]}`);
  }

  lines.push("");
  lines.push("[CONCLUSÃO DO ARTIGO vs ORION]");
  lines.push("O artigo conclui que visão computacional precisa de: armazenamento adequado, processamento de imagens, algoritmo correto.");
  lines.push("O Orion resolve todos os três: cloud elástico (storage), pipeline paralelo brain-like (processamento), 9 modelos especializados (algoritmos).");

  return lines.join("\n");
}

export function buildJarvisComparisonContext(): string {
  const lines: string[] = [
    "[ANÁLISE COMPARATIVA: ORION vs JARVIS (Artigo Acadêmico)]",
    `O Orion supera o Jarvis em todos os ${JARVIS_COMPARISON.length} métodos-chave.`,
    "",
  ];

  for (const entry of JARVIS_COMPARISON) {
    lines.push(`• ${entry.jarvisMethod}:`);
    lines.push(`  Jarvis: ${entry.jarvisDescription}`);
    lines.push(`  Orion: ${entry.orionImplementation[0]} + ${entry.orionImplementation.length - 1} outros módulos`);
    lines.push(`  Vantagem: ${entry.orionAdvantages[0]}`);
  }

  lines.push("");
  lines.push("[CAPACIDADES EXCLUSIVAS DO ORION (Inexistentes no Jarvis)]");
  for (const cap of ORION_EXCLUSIVE_CAPABILITIES) {
    lines.push(`• ${cap.name}`);
  }

  return lines.join("\n");
}

// ─── Introspection API ───

export function getCapabilities(): CapabilityEntry[] {
  return [...CAPABILITIES_REGISTRY];
}

export function getCapabilitiesByCategory(category: CapabilityEntry["category"]): CapabilityEntry[] {
  return CAPABILITIES_REGISTRY.filter(c => c.category === category);
}

export function getCapabilitiesByStatus(status: CapabilityEntry["status"]): CapabilityEntry[] {
  return CAPABILITIES_REGISTRY.filter(c => c.status === status);
}

export function getSystemHealthReport(): SystemHealthReport {
  const total = CAPABILITIES_REGISTRY.length;
  const active = CAPABILITIES_REGISTRY.filter(c => c.status === "active").length;
  const partial = CAPABILITIES_REGISTRY.filter(c => c.status === "partial").length;
  const planned = CAPABILITIES_REGISTRY.filter(c => c.status === "planned").length;
  const missing = CAPABILITIES_REGISTRY.filter(c => c.status === "missing").length;

  const readiness = Math.round(((active + partial * 0.5) / total) * 100);

  const criticalGaps = CAPABILITIES_REGISTRY
    .filter(c => c.gaps && c.gaps.length > 0)
    .flatMap(c => c.gaps!.map(g => `[${c.name}] ${g}`));

  const recommendedUpgrades = CAPABILITIES_REGISTRY
    .filter(c => c.improvements && c.improvements.length > 0)
    .flatMap(c => c.improvements!.map(i => `[${c.name}] ${i}`));

  return {
    timestamp: Date.now(),
    totalCapabilities: total,
    activeCount: active,
    partialCount: partial,
    plannedCount: planned,
    missingCount: missing,
    overallReadiness: readiness,
    criticalGaps,
    recommendedUpgrades,
  };
}

/**
 * Generates a natural language summary of Orion's self-assessment
 * for injection into the AI system prompt when asked about capabilities.
 */
export function buildIntrospectionContext(): string {
  const report = getSystemHealthReport();
  const byCategory = new Map<string, CapabilityEntry[]>();
  for (const cap of CAPABILITIES_REGISTRY) {
    if (!byCategory.has(cap.category)) byCategory.set(cap.category, []);
    byCategory.get(cap.category)!.push(cap);
  }

  const lines: string[] = [
    `AUTODIAGNÓSTICO ORION (${report.totalCapabilities} módulos, ${report.overallReadiness}% operacional):`,
  ];

  for (const [cat, caps] of byCategory) {
    const activeNames = caps.filter(c => c.status === "active").map(c => c.name).join(", ");
    const partialNames = caps.filter(c => c.status === "partial").map(c => c.name).join(", ");
    lines.push(`- ${cat.toUpperCase()}: ${activeNames}${partialNames ? ` | Parcial: ${partialNames}` : ""}`);
  }

  if (report.criticalGaps.length > 0) {
    lines.push(`LACUNAS CONHECIDAS: ${report.criticalGaps.slice(0, 5).join("; ")}`);
  }
  if (report.recommendedUpgrades.length > 0) {
    lines.push(`UPGRADES RECOMENDADOS: ${report.recommendedUpgrades.slice(0, 5).join("; ")}`);
  }

  return lines.join("\n");
}

// ═══ Granular Source Code Map (Option C) ═══
// Maps every key module → exported functions/classes for self-analysis

export interface ModuleMapEntry {
  file: string;
  description: string;
  exports: string[];
  dependencies: string[];
  linesEstimate: number;
  category: "core" | "vision" | "voice" | "reasoning" | "protocol" | "ui" | "integration" | "security";
}

export const SOURCE_CODE_MAP: ModuleMapEntry[] = [
  // ═══ CORE ═══
  {
    file: "src/lib/neural/orion-ai-client.ts",
    description: "Cliente IA principal — cascata multi-provedor, injeção de contexto multimodal, detecção de intenção",
    exports: ["orionAIClient", "buildMultimodalContext", "classifyIntent", "buildOrionIdentityPrompt"],
    dependencies: ["orion-consciousness", "orion-introspection", "provider-health", "consciousness-bridge"],
    linesEstimate: 650,
    category: "core",
  },
  {
    file: "src/lib/neural/orion-tool-executor.ts",
    description: "Executor de ferramentas — 60+ tools (busca, CRM, documentos, arquitetura, IoT, robótica)",
    exports: ["executeOrionTool", "ORION_TOOLS"],
    dependencies: ["orion-introspection", "digital-twin-registry", "ros2-protocol-bridge", "orion-consciousness"],
    linesEstimate: 3200,
    category: "core",
  },
  {
    file: "src/lib/neural/orion-command-registry.ts",
    description: "Registro de 200+ comandos de voz com triggers, categorias e prioridades",
    exports: ["ORION_COMMANDS", "findMatchingCommand", "getCommandsByCategory"],
    dependencies: [],
    linesEstimate: 700,
    category: "core",
  },
  {
    file: "src/lib/neural/orion-consciousness.ts",
    description: "Identidade, personalidade e prompt de sistema do Orion",
    exports: ["buildOrionIdentityPrompt", "ORION_IDENTITY"],
    dependencies: [],
    linesEstimate: 100,
    category: "core",
  },
  {
    file: "src/lib/neural/orion-introspection.ts",
    description: "Metacognição e auto-diagnóstico — registro de capacidades, health report, gap analysis",
    exports: ["getCapabilities", "getSystemHealthReport", "buildIntrospectionContext", "buildJarvisComparisonContext", "SOURCE_CODE_MAP"],
    dependencies: [],
    linesEstimate: 800,
    category: "core",
  },

  // ═══ VISION ═══
  {
    file: "src/lib/neural/realtime-vision-engine.ts",
    description: "Motor unificado de visão — funde MediaPipe + YOLO com dedup IoU > 0.4",
    exports: ["detectRealTime", "preloadAllVision", "RealTimeVisionResult", "UnifiedDetection"],
    dependencies: ["mediapipe-vision", "yolo-onnx-detector"],
    linesEstimate: 200,
    category: "vision",
  },
  {
    file: "src/lib/neural/yolo-framex-engine.ts",
    description: "YOLOFrameX v2.2 — multi-task: objetos, faces, cenário, OCR, movimento, rastreamento",
    exports: ["yoloFrameX", "YOLOFrameXEngine"],
    dependencies: ["mediapipe-vision", "yolo-onnx-detector", "yolo-framex-types"],
    linesEstimate: 640,
    category: "vision",
  },
  {
    file: "src/lib/neural/yolofx-proxy.ts",
    description: "Proxy main-thread → Worker para YOLOFrameX com fallback inline",
    exports: ["yoloFrameXProxy", "YOLOFrameXProxy"],
    dependencies: ["yolofx-worker", "yolo-framex-engine", "mediapipe-vision", "yolo-onnx-detector"],
    linesEstimate: 225,
    category: "vision",
  },
  {
    file: "src/lib/neural/yolofx-worker.ts",
    description: "Web Worker off-thread para tracking, OCR, scene classification",
    exports: ["(Worker self)"],
    dependencies: ["yolo-framex-types"],
    linesEstimate: 480,
    category: "vision",
  },
  {
    file: "src/lib/neural/mediapipe-vision.ts",
    description: "Wrapper MediaPipe Tasks Vision — ObjectDetector, FaceDetector, HandLandmarker",
    exports: ["detectAllMP", "preloadMediaPipe", "isMediaPipeReady", "MPVisionResult"],
    dependencies: ["@mediapipe/tasks-vision"],
    linesEstimate: 300,
    category: "vision",
  },
  {
    file: "src/lib/neural/yolo-onnx-detector.ts",
    description: "YOLO v8n via ONNX Runtime Web — 80 classes COCO, NMS, WebGL",
    exports: ["detectWithYOLO", "preloadYOLO", "isYOLOReady", "YOLODetection"],
    dependencies: ["onnxruntime-web"],
    linesEstimate: 350,
    category: "vision",
  },

  // ═══ VOICE ═══
  {
    file: "src/lib/neural/voice-clone-engine.ts",
    description: "Motor de síntese vocal — Google TTS + Kokoro + Piper TTS (100% gratuito)",
    exports: ["VoiceCloneEngine", "synthesizeSpeech"],
    dependencies: ["@mintplex-labs/piper-tts-web"],
    linesEstimate: 400,
    category: "voice",
  },

  // ═══ REASONING ═══
  {
    file: "src/lib/neural/causal-reasoning.ts",
    description: "Raciocínio causal — grafo de causa-efeito, inferência, contrafactuais",
    exports: ["CausalGraph", "addCausalRelation", "inferCauses", "getCausalGraphStats"],
    dependencies: [],
    linesEstimate: 350,
    category: "reasoning",
  },
  {
    file: "src/lib/neural/theory-of-mind.ts",
    description: "Teoria da Mente — modelo mental do usuário, intenções, crenças",
    exports: ["UserMentalModel", "updateMentalModel", "predictUserIntent"],
    dependencies: [],
    linesEstimate: 300,
    category: "reasoning",
  },
  {
    file: "src/lib/neural/meta-learning.ts",
    description: "Meta-aprendizagem recursiva — auto-otimização de estratégias",
    exports: ["MetaLearningState", "evolveStrategy", "getMetaLearningSummary"],
    dependencies: [],
    linesEstimate: 400,
    category: "reasoning",
  },
  {
    file: "src/lib/neural/consciousness-bridge.ts",
    description: "Bridge NEUROCORE — Workspace Global, Sincronia Gamma, QHRL, Memória Somática",
    exports: ["ConsciousnessBridge", "runConsciousCycle"],
    dependencies: ["causal-reasoning", "theory-of-mind"],
    linesEstimate: 500,
    category: "reasoning",
  },

  // ═══ PROTOCOLS ═══
  {
    file: "src/lib/neural/ros2-protocol-bridge.ts",
    description: "Bridge ROS2 — pub/sub, cmd_vel, nav_goal, e-stop, telemetria",
    exports: ["ROS2Bridge", "ros2Bridge"],
    dependencies: [],
    linesEstimate: 500,
    category: "protocol",
  },
  {
    file: "src/lib/neural/ros2-advanced-protocols.ts",
    description: "ROS2 avançado — Action Server/Client, Services, Parameter Server, TF2, Lifecycle",
    exports: ["ROS2ActionBridge", "ROS2ServiceBridge", "ROS2ParameterServer", "TF2TransformTree", "ROS2LifecycleManager"],
    dependencies: [],
    linesEstimate: 600,
    category: "protocol",
  },
  {
    file: "src/lib/neural/vda5050-protocol.ts",
    description: "VDA 5050 v2.0 — Orders, State, InstantActions para AGVs",
    exports: ["VDA5050Bridge", "VDA5050Order", "VDA5050State"],
    dependencies: [],
    linesEstimate: 500,
    category: "protocol",
  },
  {
    file: "src/lib/neural/industrial-protocols.ts",
    description: "Protocolos industriais — OPC UA, Modbus TCP, PROFINET, EtherCAT",
    exports: ["OPCUABridge", "ModbusTCPBridge", "PROFINETBridge", "EtherCATBridge"],
    dependencies: [],
    linesEstimate: 700,
    category: "protocol",
  },
  {
    file: "src/lib/neural/network-iot-protocols.ts",
    description: "Rede/IoT — CoAP, AMQP, WebRTC DataChannel, gRPC-Web, Matter/Thread",
    exports: ["CoAPBridge", "AMQPBridge", "WebRTCDataChannelBridge", "GRPCWebBridge", "MatterBridge"],
    dependencies: [],
    linesEstimate: 800,
    category: "protocol",
  },
  {
    file: "src/lib/neural/security-compliance-protocols.ts",
    description: "Segurança — OAuth2/OIDC, Zero Trust, mTLS, GDPR/AI Act Audit",
    exports: ["OAuth2OIDCBridge", "ZeroTrustBridge", "MTLSBridge", "GDPRAIActAuditBridge"],
    dependencies: [],
    linesEstimate: 700,
    category: "security",
  },

  // ═══ INTEGRATION ═══
  {
    file: "src/lib/neural/digital-twin-registry.ts",
    description: "Registro AAS/Digital Twin — submodels, métricas, health assessment",
    exports: ["DigitalTwinRegistry", "digitalTwinRegistry"],
    dependencies: [],
    linesEstimate: 400,
    category: "integration",
  },
  {
    file: "src/lib/neural/provider-health.ts",
    description: "Health check de provedores IA — circuit breaker, latência, fallback",
    exports: ["ProviderHealthMonitor", "tripProvider", "isProviderHealthy"],
    dependencies: [],
    linesEstimate: 200,
    category: "integration",
  },
  {
    file: "src/lib/neural/litert-compiled-model.ts",
    description: "LiteRT (Google AI Edge) — inferência otimizada WebGPU/WebGL/WASM",
    exports: ["LiteRTRuntime", "compiledModelRunner", "probeHardwareCapabilities"],
    dependencies: [],
    linesEstimate: 600,
    category: "integration",
  },
  {
    file: "src/lib/neural/tf-runtime.ts",
    description: "TFX pipeline adaptado — MLMD, artifact lineage, execution tracking",
    exports: ["TFXPipeline", "getLiteRTRuntime"],
    dependencies: ["litert-compiled-model"],
    linesEstimate: 250,
    category: "integration",
  },
];

// ─── Source Map Queries ───

export function getModulesByCategory(cat: ModuleMapEntry["category"]): ModuleMapEntry[] {
  return SOURCE_CODE_MAP.filter(m => m.category === cat);
}

export function getModuleDependencyGraph(): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const m of SOURCE_CODE_MAP) {
    const key = m.file.split("/").pop()?.replace(".ts", "") || m.file;
    graph[key] = m.dependencies;
  }
  return graph;
}

export function getTotalLinesEstimate(): number {
  return SOURCE_CODE_MAP.reduce((sum, m) => sum + m.linesEstimate, 0);
}

export function findModuleByExport(exportName: string): ModuleMapEntry | undefined {
  return SOURCE_CODE_MAP.find(m => m.exports.includes(exportName));
}

export function buildSourceCodeMapContext(): string {
  const byCategory = new Map<string, ModuleMapEntry[]>();
  for (const m of SOURCE_CODE_MAP) {
    if (!byCategory.has(m.category)) byCategory.set(m.category, []);
    byCategory.get(m.category)!.push(m);
  }

  const lines: string[] = [
    `MAPA DO CÓDIGO-FONTE ORION (${SOURCE_CODE_MAP.length} módulos, ~${getTotalLinesEstimate()} linhas):`,
  ];

  for (const [cat, modules] of byCategory) {
    lines.push(`\n[${cat.toUpperCase()}]`);
    for (const m of modules) {
      const fileName = m.file.split("/").pop();
      lines.push(`  ${fileName} (${m.linesEstimate}L) — ${m.description}`);
      lines.push(`    Exports: ${m.exports.join(", ")}`);
      if (m.dependencies.length > 0) {
        lines.push(`    Deps: ${m.dependencies.join(", ")}`);
      }
    }
  }

  lines.push(`\n[SELF-ANALYSIS]`);
  lines.push(`  Edge Function: orion-code-analysis — Lê código via GitHub API + análise AI`);
  lines.push(`  Modos: scan, analyze_file, find_gaps, suggest_improvements, architecture_map`);

  return lines.join("\n");
}
