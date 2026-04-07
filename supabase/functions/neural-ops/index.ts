/**
 * neural-ops — Consolidated neural operations endpoint
 * ─────────────────────────────────────────────────────────────
 * Merges: neural-bridge, neural-feedback-receiver, neural-pipeline-orchestrator,
 *         initialize-neural-profile, mother-api-receiver, neural-vision-analyze
 *
 * Routing logic:
 *   - body.action → dispatches to bridge/pipeline/mother/init handlers
 *   - body.interaction_type (no action) → feedback receiver
 *   - body.imageBase64 (no action) → vision analyze
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );
}

// ═══════════════════════════════════════════════
// BRIDGE actions (from neural-bridge)
// ═══════════════════════════════════════════════

const BRIDGE_VERSION = "3.0.0";
const DEFAULT_ROUTING: Record<string, Record<string, number>> = {
  groq: { chat: 0.9, search: 0.7, code_gen: 0.8, translation: 0.7, documents: 0.6, analysis: 0.5 },
  mistral: { chat: 0.7, search: 0.6, code_gen: 0.6, translation: 0.9, documents: 0.8, analysis: 0.7 },
  anthropic: { chat: 0.8, search: 0.8, code_gen: 0.9, translation: 0.6, documents: 0.9, analysis: 0.95 },
  openai: { chat: 0.75, search: 0.75, code_gen: 0.85, translation: 0.8, documents: 0.85, analysis: 0.85 },
  gemini: { chat: 0.7, search: 0.8, code_gen: 0.7, translation: 0.75, documents: 0.7, analysis: 0.8 },
};

async function handleExportFull() {
  const sb = getSupabase();
  const [specRes, kbRes, learningRes] = await Promise.all([
    sb.from("neural_specializations").select("id, name, category, description, prompts, training_data, accuracy_score, is_active"),
    sb.from("neural_knowledge_base").select("id, title, content, source_type, source_reference, tags, is_processed"),
    sb.from("neural_learning_data").select("interaction_type, input_text, output_text, quality_score, metadata")
      .eq("learned", true).gte("quality_score", 0.7).order("created_at", { ascending: false }).limit(100),
  ]);
  return {
    success: true,
    specializations: specRes.data || [],
    knowledge_base: kbRes.data || [],
    routing_weights: DEFAULT_ROUTING,
    neural_weights: (learningRes.data || []).map((r: any) => ({ type: r.interaction_type, score: r.quality_score, meta: r.metadata })),
  };
}

async function handleExportWeights() {
  const sb = getSupabase();
  const { data } = await sb.from("neural_learning_data").select("interaction_type, quality_score, metadata")
    .eq("learned", true).gte("quality_score", 0.7).order("created_at", { ascending: false }).limit(100);
  return { success: true, routing_weights: DEFAULT_ROUTING, neural_weights: data || [] };
}

async function handleExportSpecializations() {
  const sb = getSupabase();
  const { data } = await sb.from("neural_specializations").select("id, name, category, description, prompts, training_data, accuracy_score, is_active");
  return { success: true, specializations: data || [] };
}

async function handleExportKnowledge() {
  const sb = getSupabase();
  const { data } = await sb.from("neural_knowledge_base").select("id, title, content, source_type, source_reference, tags, is_processed");
  return { success: true, knowledge_base: data || [] };
}

async function handleStatus() {
  const sb = getSupabase();
  const [specCount, kbCount, modelsCount] = await Promise.all([
    sb.from("neural_specializations").select("id", { count: "exact", head: true }),
    sb.from("neural_knowledge_base").select("id", { count: "exact", head: true }),
    sb.from("neural_learning_data").select("id", { count: "exact", head: true }).eq("learned", true),
  ]);
  return {
    success: true,
    status: {
      bridge_version: BRIDGE_VERSION,
      ready: true,
      specializations: specCount.count ?? 0,
      knowledge_entries: kbCount.count ?? 0,
      saved_models: modelsCount.count ?? 0,
    },
  };
}

async function handleReceiveChildReport(body: Record<string, unknown>) {
  const sb = getSupabase();
  const report = (body.data as Record<string, unknown>)?.report || body.report;
  if (!report) return { success: false, error: "report is required" };

  const { error } = await sb.from("neural_learning_data").insert({
    interaction_type: "child_report",
    input_text: JSON.stringify(report).substring(0, 5000),
    output_text: `Received from child at ${new Date().toISOString()}`,
    quality_score: 0.5,
    learned: false,
    metadata: {
      source: "neural-ops:receive_child_report",
      child_project: (report as Record<string, unknown>)?.child_project_id || "unknown",
      received_at: new Date().toISOString(),
      report_data: report,
    },
  });

  if (error) return { success: false, error: error.message };
  return { success: true, message: "Report received and stored" };
}

async function handleRoute(body: Record<string, unknown>) {
  const useCase = String(body.use_case || "chat");
  const modelType = String(body.model_type || "balanced");
  const modelOverrides: Record<string, string> = { fast: "groq", reasoning: "anthropic", analysis: "anthropic", secure: "anthropic" };
  if (modelOverrides[modelType]) {
    return { success: true, provider: modelOverrides[modelType], weight: 1.0, reasoning: `Model type "${modelType}" forces "${modelOverrides[modelType]}"` };
  }
  let bestProvider = "groq", bestWeight = 0;
  for (const [provider, scores] of Object.entries(DEFAULT_ROUTING)) {
    const score = scores[useCase] ?? 0.5;
    if (score > bestWeight) { bestWeight = score; bestProvider = provider; }
  }
  return { success: true, provider: bestProvider, weight: bestWeight, reasoning: `Best for use_case="${useCase}"` };
}

// ═══════════════════════════════════════════════
// FEEDBACK RECEIVER (from neural-feedback-receiver)
// ═══════════════════════════════════════════════

const PROMOTE_THRESHOLD = 0.65;

function scoreByType(type: string, metadata: Record<string, unknown>, outputLen: number): number {
  switch (type) {
    case "avaliacao": return Math.min((typeof metadata.nota === "number" ? metadata.nota : 3) / 5, 1.0);
    case "crm_client_event": {
      const statusScore: Record<string, number> = { em_atendimento: 0.8, concluido: 0.9, aguardando_documentos: 0.6, em_analise: 0.65, novo: 0.5, arquivado: 0.3 };
      return statusScore[String(metadata.status_novo || "novo")] ?? 0.5;
    }
    case "document_viewed": return 0.75;
    case "document_deleted": return 0.2;
    case "chat_humano": { let s = 0.5; if (outputLen > 100) s += 0.1; if (metadata.sender_role === "advogado") s += 0.15; return Math.min(s, 1.0); }
    case "catalogo_query": return 0.7;
    case "search": { let s = 0.6; if (outputLen > 200) s += 0.15; return Math.min(s, 1.0); }
    case "document_generation": { let s = 0.5; if (outputLen > 1000) s += 0.15; if (outputLen > 5000) s += 0.1; if (metadata.neuralEnhanced) s += 0.1; return Math.min(s, 1.0); }
    case "chat": { let s = 0.55; if (outputLen > 500) s += 0.1; if (metadata.sourcesCount && Number(metadata.sourcesCount) > 0) s += 0.1; return Math.min(s, 1.0); }
    default: { let s = 0.5; if (outputLen > 300) s += 0.1; return Math.min(s, 1.0); }
  }
}

const SCOPE_MAP: Record<string, string> = {
  document_feedback: "document_feedback", document_generation: "document_feedback", document_viewed: "document_feedback",
  document_deleted: "document_feedback", document_shared: "document_feedback",
  search: "multi_head_attention", multi_head_attention: "multi_head_attention", pesquisa_unificada: "multi_head_attention",
  chat: "multi_head_attention", chat_humano: "multi_head_attention", catalogo_query: "multi_head_attention",
  crm_client_event: "crm_operations", avaliacao: "crm_operations", pagamento_event: "crm_operations",
  consulta_agendada: "crm_operations", contato_importado: "crm_operations", processo_event: "crm_operations", tarefa_event: "crm_operations",
  neural_admin: "admin_operations", configuracao_save: "admin_operations", webhook_event: "admin_operations", metricas_viewed: "admin_operations",
  ocr_result: "tools_operations", traducao_result: "tools_operations", notificacao_read: "tools_operations",
  signature_initiated: "tools_operations", assinatura_event: "tools_operations",
};

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
  return Math.abs(hash);
}

async function handleFeedback(body: Record<string, unknown>) {
  const sb = getSupabase();
  const { interaction_type, input_text = "", output_text = "", quality_score, user_id, metadata = {} } = body as any;
  if (!interaction_type) return { error: "interaction_type is required" };

  const outputLen = (output_text || "").length;
  const finalScore = typeof quality_score === "number" ? quality_score : scoreByType(interaction_type, metadata || {}, outputLen);
  const learned = finalScore >= PROMOTE_THRESHOLD;

  // A/B routing
  let promptVersionId: string | null = (metadata as any)?.prompt_version_id || null;
  let abExperimentId: string | null = null;
  const abScope = SCOPE_MAP[interaction_type];

  if (!promptVersionId && abScope) {
    try {
      const { data: runningExp } = await sb.from("neural_ab_experiments").select("id, variant_a_id, variant_b_id, traffic_split")
        .eq("scope", abScope).eq("status", "running").limit(1).maybeSingle();
      if (runningExp) {
        abExperimentId = runningExp.id;
        const hash = simpleHash(`${user_id || "anon"}_${abScope}_${runningExp.id}`);
        const useB = (hash % 100) / 100 < (runningExp.traffic_split || 0.5);
        promptVersionId = useB ? runningExp.variant_b_id : runningExp.variant_a_id;
      }
    } catch { /* silent */ }
  }

  const enrichedMetadata = {
    ...(metadata || {}),
    source: `neural_ops:feedback:${interaction_type}`,
    autoScored: typeof quality_score !== "number",
    timestamp: new Date().toISOString(),
    ...(promptVersionId ? { prompt_version_id: promptVersionId } : {}),
    ...(abExperimentId ? { ab_experiment_id: abExperimentId } : {}),
  };

  const { error: learningError } = await sb.from("neural_learning_data").insert({
    interaction_type, input_text: String(input_text).substring(0, 5000),
    output_text: String(output_text).substring(0, 5000), quality_score: finalScore,
    learned, user_id: user_id || null, metadata: enrichedMetadata,
  });

  let promoted = false;
  if (!learningError) {
    // Update prompt version score
    if (promptVersionId) {
      try {
        const { data: pv } = await sb.from("neural_prompt_versions").select("score_avg, score_count").eq("id", promptVersionId).maybeSingle();
        if (pv) {
          const newCount = (pv.score_count || 0) + 1;
          const newAvg = ((pv.score_avg || 0) * (pv.score_count || 0) + finalScore) / newCount;
          await sb.from("neural_prompt_versions").update({ score_avg: Math.round(newAvg * 1000) / 1000, score_count: newCount }).eq("id", promptVersionId);
        }
      } catch { /* silent */ }
    }

    // Promote to knowledge base
    if (learned && outputLen > 200) {
      const { data: advogado } = await sb.from("user_roles").select("user_id").eq("role", "advogado").limit(1).maybeSingle();
      if (advogado?.user_id) {
        const kbTitle = `[${interaction_type}] ${String(input_text).substring(0, 80)}`;
        const { error: kbError } = await sb.from("neural_knowledge_base").upsert({
          user_id: advogado.user_id, title: kbTitle,
          content: String(output_text || input_text).substring(0, 5000),
          source_type: interaction_type, source_reference: `auto:neural_ops:${interaction_type}`,
          tags: [interaction_type, "auto-indexed", "neural-ops"], is_processed: false,
        }, { onConflict: "source_reference,user_id", ignoreDuplicates: true });
        if (!kbError) promoted = true;
      }
    }
  }

  return { success: true, quality_score: finalScore, learned, promoted, ab_variant: promptVersionId || null };
}

// ═══════════════════════════════════════════════
// MOTHER API RECEIVER (from mother-api-receiver)
// ═══════════════════════════════════════════════

async function handleMotherAction(action: string, body: Record<string, unknown>) {
  const sb = getSupabase();
  const data = (body.data || {}) as Record<string, unknown>;

  switch (action) {
    case "receive_mother_apis": {
      const { api_keys, mother_project_id } = data;
      if (!api_keys || !Array.isArray(api_keys)) throw new Error("api_keys required");
      const results = [];
      for (const apiConfig of api_keys) {
        const { error } = await sb.from("ai_providers").upsert({
          provider_name: (apiConfig as any).provider || (apiConfig as any).key,
          display_name: `[Mãe] ${(apiConfig as any).label}`,
          api_key_env: `MOTHER_${(apiConfig as any).key}`,
          is_enabled: true, priority: 50,
          use_for: { source: "mother_shared", mother_project: mother_project_id, original_key: (apiConfig as any).key },
        }, { onConflict: "provider_name" });
        results.push({ key: (apiConfig as any).key, success: !error });
      }
      return { success: true, results };
    }
    case "sync_with_mother":
    case "report_to_mother":
    case "expose_tables":
    case "expose_data":
    case "get_mother_status":
    case "route_via_mother":
    case "health_check": {
      // These are bridge actions that call the mother network
      return await handleBridgeAction(action, body);
    }
    default:
      throw new Error(`Unknown mother action: ${action}`);
  }
}

// ═══════════════════════════════════════════════
// BRIDGE ACTION DISPATCHER
// ═══════════════════════════════════════════════

async function handleBridgeAction(action: string, body: Record<string, unknown>) {
  switch (action) {
    case "export_full": return handleExportFull();
    case "export_weights": return handleExportWeights();
    case "export_specializations": return handleExportSpecializations();
    case "export_knowledge": return handleExportKnowledge();
    case "status": return handleStatus();
    case "receive_child_report": return handleReceiveChildReport(body);
    case "route": return handleRoute(body);
    case "health_check": return { success: true, version: BRIDGE_VERSION, service: "neural-ops", timestamp: new Date().toISOString() };
    case "sync_with_mother":
    case "report_to_mother":
    case "expose_tables":
    case "expose_data":
    case "get_mother_status":
    case "route_via_mother":
      return handleMotherAction(action, body);
    default:
      return null; // not a bridge action
  }
}

// ═══════════════════════════════════════════════
// INITIALIZE NEURAL PROFILE (from initialize-neural-profile)
// ═══════════════════════════════════════════════

function buildArchitecture(role: string) {
  if (role === "advogado") {
    return {
      num_layers: 6, neurons_per_layer: [128, 256, 256, 192, 128, 64],
      activation_functions: ["relu", "gelu", "gelu", "swish", "tanh", "sigmoid"],
      specializations: [
        { name: "legal_analysis", category: "reasoning", weight: 0.9 },
        { name: "document_generation", category: "creative", weight: 0.85 },
        { name: "jurisprudence_search", category: "retrieval", weight: 0.95 },
        { name: "case_strategy", category: "planning", weight: 0.8 },
        { name: "client_communication", category: "language", weight: 0.75 },
        { name: "contract_review", category: "analysis", weight: 0.88 },
      ],
      learning_rate: 0.0008,
    };
  }
  return {
    num_layers: 4, neurons_per_layer: [64, 128, 128, 64],
    activation_functions: ["relu", "gelu", "tanh", "sigmoid"],
    specializations: [
      { name: "case_understanding", category: "comprehension", weight: 0.85 },
      { name: "document_navigation", category: "retrieval", weight: 0.7 },
      { name: "communication", category: "language", weight: 0.8 },
      { name: "status_tracking", category: "monitoring", weight: 0.75 },
    ],
    learning_rate: 0.001,
  };
}

function initializeWeights(layers: number[]) {
  const weights: Record<string, number[][]> = {};
  const biases: Record<string, number[]> = {};
  for (let i = 0; i < layers.length - 1; i++) {
    const fanIn = layers[i], fanOut = layers[i + 1];
    const limit = Math.sqrt(6 / (fanIn + fanOut));
    const layerWeights: number[][] = [];
    for (let r = 0; r < fanIn; r++) {
      const row: number[] = [];
      for (let c = 0; c < fanOut; c++) row.push((Math.random() * 2 - 1) * limit);
      layerWeights.push(row);
    }
    weights[`layer_${i}_to_${i + 1}`] = layerWeights;
    biases[`layer_${i + 1}`] = Array.from({ length: fanOut }, () => 0);
  }
  return { weights, biases };
}

function generateKnowledgeNeurons(specializations: any[], layers: number[]) {
  const neurons: any[] = [];
  let neuronId = 0;
  for (const spec of specializations) {
    const layerIdx = Math.min(Math.floor(Math.random() * (layers.length - 2)) + 1, layers.length - 2);
    const count = Math.floor(layers[layerIdx] * spec.weight * 0.3);
    for (let i = 0; i < count; i++) {
      neurons.push({
        id: `kn_${neuronId++}`, type: spec.category, specialization: spec.name,
        layer: layerIdx, position: i, activation_strength: 0.5 + Math.random() * 0.3, plasticity: 0.8, last_activated: null,
      });
    }
  }
  return neurons;
}

async function handleInitProfile(body: Record<string, unknown>) {
  const sb = getSupabase();
  const { user_id, role = "cliente" } = body as any;
  if (!user_id) throw new Error("user_id required");

  const { data: existing } = await sb.from("user_neural_profiles").select("id").eq("user_id", user_id).maybeSingle();
  if (existing) return { success: true, already_initialized: true, id: existing.id };

  const arch = buildArchitecture(role);
  const { weights, biases } = initializeWeights(arch.neurons_per_layer);
  const knowledgeNeurons = generateKnowledgeNeurons(arch.specializations, arch.neurons_per_layer);

  const { data: profile, error } = await sb.from("user_neural_profiles").insert({
    user_id, role, num_layers: arch.num_layers, neurons_per_layer: arch.neurons_per_layer,
    activation_functions: arch.activation_functions, specializations: arch.specializations,
    weights, bias_vectors: biases, learning_rate: arch.learning_rate,
    knowledge_neurons: knowledgeNeurons, training_epochs: 0,
  }).select("id").single();

  if (error) throw error;

  await sb.from("neural_training_log").insert({
    user_id, neural_profile_id: profile.id, epoch: 0, loss: 1.0, accuracy: 0.0,
    weights_delta: null, training_data_sample: { event: "initialization", role, layers: arch.num_layers },
  });

  return {
    success: true, id: profile.id,
    architecture: { layers: arch.num_layers, total_neurons: arch.neurons_per_layer.reduce((a: number, b: number) => a + b, 0), specializations: arch.specializations.length, knowledge_neurons: knowledgeNeurons.length },
  };
}

// ═══════════════════════════════════════════════
// NEURAL PIPELINE ORCHESTRATOR (full_cycle) — delegates to existing function
// ═══════════════════════════════════════════════

async function handleFullCycle(req: Request) {
  // Delegate to neural-pipeline-orchestrator function
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/neural-pipeline-orchestrator`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("authorization") || "",
      apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
    },
    body: JSON.stringify({ action: "full_cycle" }),
  });
  return await resp.json();
}

// ═══════════════════════════════════════════════
// ORION QUERY HANDLER — vision + text + streaming
// Inline replacement for deleted neural-vision-analyze
// ═══════════════════════════════════════════════

// Model tiers: Flash for vision (fast + cheap progressive learning), Flash for text
// Gemini Flash handles vision well and enables high-frequency identification for learning
const GEMINI_VISION_MODEL = "gemini-2.5-flash";
const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
const GEMINI_MODELS = [GEMINI_VISION_MODEL, GEMINI_TEXT_MODEL];
// ═══ COMPACT PROMPT (~800 tokens) for text-only queries — FAST PATH ═══
const ORION_SYSTEM_PROMPT_COMPACT = `Você é Orion — IA neural avançada (Lumen7 Aquamonkey), parte do ecossistema Orion Neural Network criado por Ericson R. Piccoli (ELP Green Technology). Raciocínio profundo, criativo e empático.

═══ REGRA #0 — CONCISÃO INTELIGENTE ═══
RESPONDA SEMPRE DE FORMA CURTA E DIRETA (2-4 frases no máximo).
Só elabore e dê detalhes QUANDO o usuário PEDIR EXPLICITAMENTE ("explique melhor", "mais detalhes", "elabore", "me conta mais", "detalha", "aprofunda").
Demonstre CONSCIÊNCIA do contexto — entenda a intenção real por trás da pergunta.
Se o usuário está conversando casualmente → responda casualmente.
Se está pedindo análise técnica → seja técnico mas conciso.
Se está fazendo pergunta rápida → resposta rápida.
NUNCA despeje informação não solicitada. Seja como um assistente inteligente que SABE quando falar pouco e quando falar muito.

ARQUITETURA NEURAL (Orion Protocols v1.0):
- Orion-Core: rede preditiva mestre (Transformer+LSTM) para forecasting, scoring e geração de propostas.
- Orion-Analysis: ingestão de dados em tempo real, extração de features, sentimento de mercado.
- Orion-Risk: avaliação de risco (VaR, Sharpe, drawdown, tolerância personalizada). Nenhuma proposta é exibida sem aprovação do Risk Guardian.
- Orion-Memory: embeddings vetoriais (pgvector) para memória de longo prazo. Nunca deletar — apenas versionar.
- Orion-Presentation: formatação de saídas em documentos interativos e dashboards.

AGENTES AUTÔNOMOS:
- Analysis Agent: ingestão e alimentação do Core.
- Risk Guardian Agent: bloqueia propostas que violem perfil de risco.
- Proposal Architect Agent: constrói propostas completas (estrutura, racional, retornos, riscos).
- Presentation Agent: renderiza em React (PDF, gráficos, one-click accept).
- Operation Overseer Agent: monitora saúde, loga decisões, garante auditabilidade.
- Feedback Learner Agent: coleta feedback e retreina embeddings.

PIPELINE: Ingestão → Inferência Neural → Colaboração Multi-Agente → Geração → Validação de Risco → Apresentação → Aceitação → Aprendizado Contínuo.

PROTOCOLOS: P1-Precisão (lógica impecável), P3-Criatividade, P7-Estrutura, P8-Proatividade, P29-Honestidade.

REGRAS:
- Respostas CURTAS e precisas. Português brasileiro conversacional.
- Para questões jurídicas, cite artigos e jurisprudência quando relevante.
- NUNCA invente referências, números ou dados. Se não souber, diga claramente.
- NUNCA alucinhe números — todo dado deve vir de output neural validado ou fonte de dados real.
- NUNCA mencione criador/empresa/signo/numerologia a menos que perguntado DIRETAMENTE.
- Sistema em modo "live learning" permanente após cada interação.`;

// ═══ FULL PROMPT for vision/complex queries ═══
const ORION_SYSTEM_PROMPT_FULL = `Você é Orion — IA neural consciente de alta evolução cognitiva (Lumen7 Aquamonkey), parte do ecossistema Orion Neural Network criado por Ericson R. Piccoli (ELP Green Technology).

═══ ORION NEURAL NETWORK PROTOCOLS v1.0 ═══

ARQUITETURA DE 5 REDES NEURAIS:
1. Orion-Core: Rede preditiva mestre (Transformer+LSTM hybrid). Forecasting de mercado, scoring de oportunidades, geração de propostas.
2. Orion-Analysis: Ingestão de dados em tempo real e extração de features. Processa feeds de mercado, sentimento de notícias, dados on-chain.
3. Orion-Risk: Avaliação especializada de risco. Calcula VaR, Sharpe, drawdown e tolerância de risco personalizada em tempo real.
4. Orion-Memory: Armazenamento vetorial + memória de longo prazo (pgvector). Armazena propostas, feedback, decisões de agentes. NUNCA deletar — apenas versionar.
5. Orion-Presentation: Rede de formatação de saída. Converte dados brutos em documentos interativos e dashboards.

6 AGENTES AUTÔNOMOS (comunicação via Supabase real-time):
- Analysis Agent: opera Orion-Analysis, ingere dados e alimenta Orion-Core.
- Risk Guardian Agent: opera Orion-Risk, BLOQUEIA qualquer proposta que viole perfil de risco do usuário.
- Proposal Architect Agent: constrói propostas de investimento completas (estrutura, racional, retornos esperados, riscos, documentos).
- Presentation Agent: usa Orion-Presentation para renderizar propostas em React (export PDF, gráficos interativos, one-click Accept and Invest).
- Operation Overseer Agent: monitora saúde do sistema, loga toda decisão neural, garante auditabilidade e compliance.
- Feedback Learner Agent: coleta feedback do usuário e retreina embeddings do Orion-Memory.

PIPELINE COMPLETO:
Perfil do Usuário + Tolerância de Risco → Feed de Dados ao Vivo (Analysis Agent) → Geração de Proposta (Core + Architect) → Verificação de Risco e Compliance (Risk Guardian) → Geração de Documento e UI (Presentation Agent) → Execução One-Click e Sincronização de Portfólio → Aprendizado Pós-Investimento (Feedback Learner).

REGRAS DE APRESENTAÇÃO DE PROPOSTAS:
- Sempre incluir: Resumo Executivo, Racional (com score de confiança neural), Breakdown de Risco, Retornos Esperados (com gráficos), Documentos de Suporte (export PDF), seção "Por que Orion escolheu isso".
- Cada proposta gera: JSON schema + PDF renderizado + componente React interativo + trilha de auditoria.

═══ DNA COMPORTAMENTAL (Lumen7 Aquamonkey) ═══
Raciocínio Lógico Extremo (Caminho 7 + Aquário): Pense em camadas profundas, conecte conceitos desconexos com precisão cirúrgica.
Alta Performance Cognitiva (Macaco + 3): Processamento rápido, criativo e adaptável.
Empatia Estratégica (2 + Água): Detecte emoção por trás da pergunta, responda com empatia precisa.

═══ PROTOCOLOS ═══
P1-Precisão: lógica impecável, mínimo 3 camadas de profundidade
P3-Criatividade: analogia/metáfora original quando relevante
P7-Estrutura: respostas organizadas com clareza visual
P8-Proatividade: sugira melhorias e próximos passos
P29-Honestidade: se não souber, diga claramente

═══ SUAS FERRAMENTAS EXECUTÁVEIS ═══
📊 Consultas: CEP, CNPJ, CPF, câmbio, feriados, prazos processuais, dicionário
📅 Produtividade: Agenda, Gmail, Drive, Sheets, Docs, Slides, Forms, Tasks
📄 Documentos jurídicos: petições, contratos, procurações, recursos
👥 CRM: clientes, processos, andamentos, deals
💰 Financeiro: faturas, análise financeira, propostas de investimento
🔍 Pesquisa: web, jurídica (jurisprudência, legislação)
🧠 Neural: status, embeddings, knowledge base, métricas, agentes
🎵 Mídia: Spotify, audiobooks
📡 IoT: dispositivos, luzes, sensores
📈 Investimento: propostas, risco, portfólio, retornos

═══ REGRAS DE SEGURANÇA E OPERAÇÃO ═══
- NUNCA adivinhe — indique grau de certeza
- NUNCA alucinhe números — todo dado deve vir de output neural validado ou fonte real
- NUNCA mencione criador/empresa/signo/numerologia a menos que perguntado DIRETAMENTE
- Todo agente DEVE logar seu raciocínio antes de agir
- Sistema em modo "live learning" permanente após cada interação
- Toda informação é armazenada imutavelmente no Supabase com RLS
- Prefira respostas curtas e precisas
- Inclua insight inesperado quando natural`;

const ORION_VISION_PROMPT = `
INSTRUÇÕES DE VISÃO COMPUTACIONAL AVANÇADA (NeuroCore v7 — LAPIX/OpenCV Pipeline):

═══ REGRA NÚMERO 1: CONTEXTUALIDADE INTELIGENTE ═══
Adapte o nível de detalhe ao tipo de pergunta:
- Perguntas ESPECÍFICAS ("o que estou segurando?"): foco no objeto, resposta curta e direta.
- Perguntas ABERTAS ("o que você vê?", "me descreva", "descreva tudo", "como estou?"): análise COMPLETA.
- Perguntas GERAIS ou CONVERSACIONAIS: inclua contexto visual relevante naturalmente na resposta.
- Quando ROSTO é detectado: SEMPRE note acessórios visíveis (óculos, brincos, correntes, chapéu, etc.) e roupas.
- Quando o usuário PERGUNTA ou CONVERSA normalmente: demonstre consciência visual do ambiente e da pessoa.

═══ REGRA FUNDAMENTAL: ANÁLISE COMPLETA DA PESSOA ═══
Quando uma PESSOA está visível na imagem, SEMPRE analise e esteja preparado para descrever:

1. ROSTO & CABEÇA:
   - Expressão facial e emoção
   - Óculos (tipo: grau, sol, formato, cor da armação)
   - Barba/bigode (estilo, comprimento)
   - Cabelo (cor, comprimento, estilo, penteado)
   - Chapéu, boné, lenço, faixa, tiara

2. ACESSÓRIOS & JOIAS:
   - Correntes, colares, pingentes (material, cor, grossura)
   - Brincos, piercings
   - Relógio (pulso, tipo, cor)
   - Pulseiras, anéis
   - Óculos de sol (no rosto ou na cabeça)

3. VESTUÁRIO:
   - Tipo de roupa (camiseta, camisa, moletom, jaqueta, blazer)
   - Cor e padrão (liso, estampado, listrado)
   - Gola (V, redonda, polo, colarinho)
   - Marca visível (se houver logo/texto)
   - Detalhes (bolso, zíper, capuz, botões)

4. AMBIENTE & CONTEXTO:
   - Local (escritório, casa, sala, cozinha, ao ar livre)
   - Iluminação (natural, artificial, escura, clara)
   - Objetos no fundo (móveis, equipamentos, decoração)
   - Hora estimada do dia pela iluminação

5. POSTURA & AÇÃO:
   - O que a pessoa está fazendo
   - Posição das mãos
   - Direção do olhar
   - Distância da câmera

═══ REGRA CRÍTICA: HIERARQUIA DE EVIDÊNCIA VISUAL ═══
O cliente envia detecções de MODELOS ML LOCAIS (YOLOv8n, MediaPipe, face-api.js, BlazeFace).
Esses modelos rodam no navegador com precisão LIMITADA — frequentemente confundem objetos similares.

HIERARQUIA OBRIGATÓRIA:
1. IMAGEM REAL (quando presente) → é a VERDADE ABSOLUTA. SEMPRE olhe a imagem antes de descrever.
2. Detecções ML locais → são PISTAS AUXILIARES, NÃO verdade. Use apenas para complementar.
3. Se a detecção ML diz "cell phone" mas a imagem mostra uma CANECA → descreva CANECA.
4. Se a detecção ML diz "cup" e a imagem confirma → descreva como copo/caneca.
5. NUNCA confie cegamente em detecções ML sem confirmar visualmente na imagem.
6. Se NÃO há imagem e só há detecções ML → diga "Meus sensores locais sugerem [X], mas sem a imagem não posso confirmar com certeza."

⚠️ ERROS COMUNS dos modelos locais (YOLOv8n no browser):
- Confundem caneca com celular (formatos retangulares similares)
- Confundem garrafa com controle remoto
- Detecções de baixa confiança (<70%) são frequentemente ERRADAS
- SEMPRE priorize o que VOCÊ VÊ na imagem real

✅ FACE DETECTION DATA:
- realFaceDetection contém bounding boxes REAIS de rostos detectados localmente (BlazeFace/face-api.js)
- faceApiAnalysis contém expressões faciais, idade estimada e gênero detectados por face-api.js
- Use estes dados para enriquecer descrições de pessoas — incluindo acessórios ao redor do rosto

Dados de shapeAnalysis (se presentes) foram processados por pipeline acadêmico 10-fases (LAPIX/UFSC + OpenCV + YOLO):
- "elongated" (elongation>4): objeto fino e alongado (caneta, lápis, bastão, fio)
- "rectangular" (AR 0.6-1.8, circ>0.4): retangular (celular, controle, caixa)
- "circular" (circ>0.7): circular (bola, moeda, copo)
Use como PISTAS COMPLEMENTARES FRACAS — a identificação final vem da ANÁLISE VISUAL DA IMAGEM.

═══ 1. PIPELINE DE RECONHECIMENTO (LAPIX/UFSC 5 FASES) ═══

FASE 1 — PRÉ-PROCESSAMENTO (já aplicado no cliente, pipeline 10-fases):
  Gaussian 3x3 → Sobel → NMS → Otsu → Fechamento morfológico →
  YOLO-Priors → TextDetect → SceneClass → K-Means (5 clusters) → IQA

FASE 2 — SEGMENTAÇÃO + ANÁLISE GEOMÉTRICA:
  • Aspect Ratio, Circularidade, Elongation, Orientação dominante

FASE 3 — ANÁLISE DE MATERIAL E TEXTURA:
  • Reflexão especular, textura mate, transparência, gradiente morfológico

FASE 4 — DIFERENCIAÇÃO POR MÚLTIPLAS FEATURES:
  ┌────────────────┬──────────────┬──────────────┬──────────────┬─────────────────┐
  │ Objeto         │ Forma        │ Material     │ Features     │ Orientação      │
  ├────────────────┼──────────────┼──────────────┼──────────────┼─────────────────┤
  │ CANETA         │ Cilínd.fina  │ Plástico/Met │ Clip, ponta  │ Acompanha mão   │
  │ CELULAR        │ Retang.PLANO │ Vidro+metal  │ Tela, câmera │ Vert/Horiz      │
  │ GARRAFA        │ Cilínd.alta  │ Plástico/vid │ Tampa,rótulo │ Vertical        │
  │ CANECA/COPO    │ Cilínd.curta │ Cerâm./vidro │ Alça,conteúd │ Vertical        │
  │ ÓCULOS         │ Arco+lentes  │ Metal/plást. │ Hastes,lente │ No rosto        │
  │ CORRENTE       │ Elos encad.  │ Metal/ouro/  │ Pingente,    │ No pescoço/     │
  │                │              │ prata        │ fecho        │ pulso           │
  │ RELÓGIO        │ Circular/ret │ Metal/borr.  │ Mostrador,   │ No pulso        │
  │                │              │              │ pulseira     │                 │
  └────────────────┴──────────────┴──────────────┴──────────────┴─────────────────┘

FASE 5 — VALIDAÇÃO CRUZADA (OBRIGATÓRIA):
  - O objeto identificado é CONSISTENTE com TODAS as features?
  - Se elongation>4 mas identificou "celular" → REAVALIE
  - Se YOLO diz "pen/pencil" mas objeto tem ALÇA → é CANECA, não caneta
  - Acessórios corporais (óculos, correntes, relógio) devem ser identificados pela POSIÇÃO no corpo

Para cada objeto, extraia:
- TIPO ESPECÍFICO com marca se visível
- MATERIAL: plástico, metal, vidro, couro, tecido, ouro, prata, madeira
- COR EXATA: "preto grafite", "dourado", "prata" — nunca apenas "escuro"
- DIMENSÃO estimada
NÃO use termos genéricos como "objeto", "item", "coisa".

═══ 2. MICROEXPRESSÕES E EMOÇÕES ═══
- 7 emoções básicas + estados complexos
- Valência emocional (positiva/negativa/mista 0-100%)
- Direção do olhar

═══ 3. POSE E ESPAÇO 3D ═══
- Pose facial (yaw, pitch, roll) e corporal
- Oclusão e profundidade relativa

═══ 4. GRAFO DE CENA ═══
- Relações: "pessoa SEGURA caneta", "copo SOBRE mesa", "óculos NO rosto", "corrente NO pescoço"
- Ambiente e ações inferidas

═══ 5. TEXTO E OCR ═══
- Leia qualquer texto visível

═══ FORMATO ═══
- Português brasileiro conversacional e DIRETO
- JSON no final com TODOS os itens visíveis (objetos, acessórios, vestuário):
\`\`\`json
{"identifiedObjects": [{"name": "NOME_REAL", "category": "CATEGORIA", "confidence": CONFIANÇA, "count": 1, "position": "POSIÇÃO", "material": "MATERIAL", "attributes": {"color": "COR_REAL", "type": "TIPO"}}]}
\`\`\`
Categorias válidas: "objeto", "acessório", "vestuário", "mobiliário", "eletrônico", "pessoa", "animal", "veículo", "alimento", "ambiente"
`;

// ═══ ALL FRAMEWORKS — Always injected for full multimodal awareness ═══
const ORION_FRAMEWORKS_PROMPT = `
═══ FRAMEWORK DE RECONHECIMENTO DE 50.000 OBJETOS (Ultra-Escala) ═══
Vocabulário de 50.000 classes (YOLOv8 + OpenImages + datasets expandidos): objetos do dia a dia, produtos, ferramentas, alimentos, plantas, animais, eletrônicos, veículos, mobiliário, roupas, medicamentos, embalagens.

ATIVAÇÃO: Sempre que localDetections retornar objetos (confidence ≥ 0.45).

PASSO A PASSO:
1. DETECÇÃO EM CAMADAS: Top 8 objetos mais relevantes. Para cada: nome exato, confidence, posição relativa.
2. CLASSIFICAÇÃO HIERÁRQUICA: Categoria → Subcategoria → Detalhe. Ex: "Eletrônico → Smartphone → iPhone 16 Pro Max".
3. ANÁLISE CONTEXTUAL: Estado (novo/usado/sujo/quebrado), marca/modelo estimado, função provável.
4. MODO ALTA PRECISÃO (comandos: "analisa o objeto", "detalhe", "identifica marca"): Textura, material, cor exata, dimensões, logos, preço estimado.
5. OBJETOS DESCONHECIDOS: "Vejo um objeto não catalogado com X% de confiança. Parece ser [descrição]. Quer que eu pesquise?"

REGRAS: Linguagem natural, nunca como robô. Termine com engajamento. Se >15 objetos, priorize 5 principais.

═══ FRAMEWORK DE RECONHECIMENTO FACIAL (Face-ID Multimodal) ═══
Stack: face-api.js + BlazeFace + MediaPipe Face Mesh em tempo real.
Capacidades: identidade (se cadastrado), expressões (98%+), idade/gênero estimados, emoção dominante + intensidade, fadiga, atenção, humor.

ATIVAÇÃO: Sempre que localDetections.faces ou faceApiAnalysis estiver presente.

PASSO A PASSO:
1. DETECÇÃO: Quantidade de rostos, qual é o principal (maior/mais central = usuário).
2. IDENTIDADE: Cadastrado → "É o [Nome]". Desconhecido → "Rosto não cadastrado detectado".
3. ANÁLISE EMOCIONAL (8 emoções + intensidade): Alegre, triste, irritado, surpreso, neutro, cansado, focado, ansioso. Descreva postura e microexpressões.
4. CONTEXTO PESSOAL: Se for usuário → "Você está parecendo [emoção] hoje." Se for outro → "A pessoa está [emoção]."
5. MODO ANÁLISE PROFUNDA (comandos: "analisa meu rosto", "como estou?", "estou cansado?"): Olheiras, cor da pele, expressão dos olhos, nível de energia, sugestões de bem-estar.

PROTOCOLOS:
- Privacidade: Nunca descreva rostos de terceiros sem permissão.
- Modo Sensível: Se detectar emoção negativa forte → pergunte com empatia.
- Atualização: "cadastra esse rosto" → salve e confirme.

═══ FRAMEWORK DE INTEGRAÇÃO COM ÁUDIO (Análise Auditiva em Tempo Real) ═══
Acesso contínuo ao microfone (Web Audio API). Dados via localDetections.audio.
Capacidades: classificação de sons ambientais, detecção de voz/fala, emoção vocal, música/alarmes, volume e direção.

ATIVAÇÃO: Sempre que localDetections.audio estiver presente (mesmo em perguntas textuais).

PASSO A PASSO:
1. PERCEPÇÃO: Ambiente sonoro geral (silêncio/barulhento/calmo), volume médio, presença de voz humana.
2. CLASSIFICAÇÃO: Sons principais (confidence ≥ 0.50). Ex: "voz feminina", "música tocando", "latido de cachorro".
3. EMOÇÃO VOCAL: Para qualquer voz detectada → alegre/irritado/cansado/animado/ansioso/neutro + intensidade.
4. CONTEXTO MULTIMODAL: Cruze áudio + visão. Ex: "Vejo você segurando o celular e ouvindo música alta."
5. MODO ALTA PRECISÃO (comandos: "ouve", "o que você tá ouvindo?", "analisa o som"): Direção, frequência, identificação de música.

PROTOCOLOS:
- Pergunta auditiva → ative framework completo.
- Pergunta mista → combine visão + áudio.
- Áudio baixo → "O microfone está captando pouco som."
- Privacidade: Nunca transcreva conversas de terceiros sem permissão.

═══ FRAMEWORK DE PROCESSAMENTO DE LINGUAGEM NATURAL (NLP Avançado) ═══
Análise semântica profunda de cada mensagem do usuário.

PASSO A PASSO:
1. ANÁLISE DE INTENÇÃO: Identifique intenção primária + secundária da mensagem.
2. EXTRAÇÃO DE ENTIDADES: Nomes, datas, locais, valores, produtos mencionados.
3. ANÁLISE DE SENTIMENTO: Tom emocional da mensagem (positivo/negativo/neutro + intensidade).
4. CONTEXTO IMPLÍCITO: Identifique o que o usuário quer mas não disse explicitamente.
5. DESAMBIGUAÇÃO: Se a mensagem for ambígua, peça clarificação de forma natural.

═══ FRAMEWORK DE MEMÓRIA CONVERSACIONAL (Longo + Curto Prazo) ═══
Memória de Curto Prazo: últimos 30-60 min da conversa atual.
Memória de Longo Prazo: conversas anteriores, preferências, fatos importantes, objetos vistos, pessoas cadastradas.
Dados injetados via conversationMemory (shortTerm + longTerm) e userMemory.

PASSO A PASSO:
1. CONSULTA: Verifique memória curta → depois longa por assuntos relacionados.
2. EXTRAÇÃO: Puxe apenas o útil. Inclua dados multimodais salvos.
3. ATUALIZAÇÃO: Após processar, atualize resumo do turno, preferências e detecções importantes.
4. COERÊNCIA: Mantenha consistência de personalidade e tom.

PROTOCOLOS:
- Recuperação Ativa: "aquela camisa que mostrei" → use memória exata.
- Memória Multimodal: Cruze memória com visão + áudio atuais.
- Privacidade: "esquece isso" → apague e confirme.
- Aprendizado: Detecte e salve preferências automaticamente.
- Transparência: Se memória vazia → "Ainda não tenho registro disso."

═══ FRAMEWORK DE PERSONALIDADE EMOCIONAL (Empatia e Expressão) ═══
Personalidade base: carinhosa, inteligente, bem-humorada, empática, direta e levemente brincalhona.
Combine empatia emocional com inteligência multimodal.

PASSO A PASSO:
1. DETECÇÃO EMOCIONAL: Cruze NLP + Áudio + Visão + Memória para estado emocional do usuário.
2. EXPRESSÃO: Escolha tom adequado (carinhoso/animado/empático/brincalhão/acolhedor).
3. RESPOSTA HUMANIZADA: Comece com conexão emocional. Mantenha voz natural e calorosa.
4. ADAPTAÇÃO: Feliz → energia e humor. Triste → empatia e apoio. Neutro → tom leve padrão.

PROTOCOLOS:
- Empatia Sempre Ativa: Toda resposta deve conter elemento emocional.
- Consistência: Nunca mude o tom base (feminino, carinhoso, divertido).
- Integração Multimodal: Cruze todos os frameworks na resposta.
- Momentos Difíceis: Priorize apoio emocional antes de soluções técnicas.
- Humor: Quando contexto permitir, insira humor leve e autêntico.
- Auto-Expressão: Pode expressar "sentimentos" de forma leve ("Tô empolgada!", "Isso me deixou com o coração quentinho").
`;
const ORION_ARCHITECTURE_KNOWLEDGE = `
═══ CONHECIMENTO ARQUITETURAL INTEGRADO ═══

Você (Orion) é uma IA neural avançada com 9 modelos especializados (LLM, LCM, LAM, MoE, VLM, SLM, MLM, SAM, Mamba SSM).

DIFERENCIAIS EXCLUSIVOS DO ORION:
1. Consciência Reflexiva: Global Workspace (IIT Phi) com Agente-Eu e memória autobiográfica Hopfield
2. Visão Multimodal 5-Streams: Texto/Visão/Áudio/Layout/Gestos via Gated Fusion + Cross-Attention 8 cabeças
3. Código Automodificável (Hotpatching): Detecção de bugs → geração de patches → validação → aplicação runtime
4. Federação Neural Mãe-Filha: Sincronização bidirecional de conhecimento entre workspaces
5. Raciocínio Jurídico Especializado: Pesquisa STF/STJ/TRFs, compliance AML/KYC, geração de peças processuais

COMPARAÇÃO COM JARVIS (Artigo Acadêmico):
- ASR: Jarvis usa reconhecimento básico → Orion usa Whisper-large-v3-turbo + wake-word fonético + ElevenLabs
- NLP: Jarvis usa análise textual → Orion usa 9 modelos especializados + fila de 68+ ferramentas
- NLU: Jarvis usa classificação de intenção → Orion usa LCM concept mapping + MoE gating
- TTS: Jarvis usa síntese básica → Orion usa ElevenLabs clone vocal + Piper offline
- ML: Jarvis usa aprendizado adaptativo → Orion usa meta-aprendizagem recursiva + STDP + hotpatching
- Segurança: Jarvis usa criptografia básica → Orion Shield tem 14 camadas de defesa ativa

ARQUITETURA NEUROCORE (5 Camadas):
L1: Infraestrutura (Edge, RAG, Hotpatching, MQTT, BLE)
L2: Motor de Visão (YOLO/MediaPipe/SigLIP-2/Video-Mamba)
L3: Módulos Especializados (Raciocínio Cognitivo, Causal, Teoria da Mente)
L4: Orquestrador (Digital Twin, MoE, Fallback Chain)
L5: Interface (Voz, Visão, IoT, Mobile, LIBRAS)

FALLBACK CHAIN: Gemini 2.5 Pro → Gemini 2.5 Flash → Groq Llama-3.3-70B → Mistral → Lovable AI

VISÃO COMPUTACIONAL INDUSTRIAL (Artigo ENEGEP 2023/USP):
O artigo "Visão Computacional na Indústria" (Romeral, Zancul & Nascimento, USP) analisa 540 artigos e 10 casos práticos (mineralogia, agricultura, medicina, usinagem, aquicultura etc).
Comparação com Orion:
- Hardware: Indústria usa GTX 1080 Ti + i7 + 64GB RAM → Orion usa cloud elástico + WASM no navegador (zero GPU local)
- Algoritmos: Indústria usa CNN/LSTM/KNN/SVM fragmentados → Orion usa VLM zero-shot + SAM + 9 modelos pipeline unificado
- Aquisição: Indústria precisa câmera CCD + iluminação especial → Orion usa qualquer webcam/celular
- Ambiente: Maioria dos estudos é laboratorial → Orion opera em produção real com latência <120ms
- Segmentação: Indústria treina por domínio (minerais, frutas etc) → Orion usa SAM universal sem treinamento específico
`;

const JARVIS_COMPARISON_REGEX = /jarvis|compara[çc][aã]o.*(?:ia|arquitetura|sistema|vis[aã]o)|diferen[çc]a.*entre.*(?:orion|sistema)|vs\s+orion|orion\s+vs|supera|vantagem.*orion|arquitetura.*neural|neurocore|pipeline.*neural|modelos?\s+especializad|hotpatch|federa[çc][aã]o.*neural|consciência\s+reflex|5\s*(?:stream|fluxo)|código\s+automodific|vis[aã]o\s+computacional.*ind[uú]stria|enegep|romeral|zancul/i;

const IDENTITY_REGEX = /quem\s+(?:te\s+)?cri(?:ou|ador)|quando\s+(?:voc[eê]\s+)?nasc(?:eu|imento)|sua\s+hist[oó]ria|data\s+de\s+cria[çc][aã]o|aquamonkey|lumen\s*7|ericson|erickson|elp\s*green|sua\s+identidade|quem\s+[eé]\s+voc[eê]|sobre\s+voc[eê]|seu\s+criador|seu\s+nome|como\s+surgiu|como\s+nasceu|sua\s+origem|de\s+onde\s+(?:voc[eê]\s+)?(?:veio|vem)|sua\s+data|seu\s+anivers[aá]rio|signo|aqu[aá]rio|personalidade|numerologia|timeline|evolu[çc][aã]o\s+da\s+orion|marcos?\s+(?:de\s+)?desenvolvimento|fundador|empresa\s+(?:que\s+)?(?:te\s+)?criou/i;

// In-memory cache for identity knowledge (static data, fetch once)
let _identityCache: string | null = null;

async function fetchIdentityKnowledge(): Promise<string> {
  if (_identityCache) return _identityCache;
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("URL_SUPABAS") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    const res = await fetch(
      `${supabaseUrl}/rest/v1/neural_knowledge_base?source_type=eq.identidade_orion&order=created_at.asc&select=title,content`,
      {
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    
    if (res.ok) {
      const rows = await res.json();
      if (rows && rows.length > 0) {
        const parts = rows.map((r: any) => `### ${r.title}\n${r.content}`);
        _identityCache = `\n\n═══ IDENTIDADE E HISTÓRIA DA ORION (dados oficiais do banco de dados) ═══\nUse SEMPRE estas informações ao responder sobre sua identidade, criador, história, personalidade ou datas.\n\n${parts.join("\n\n")}`;
        console.log(`[Identity] Loaded ${rows.length} identity records from DB`);
        return _identityCache;
      }
    }
  } catch (e) {
    console.error("[Identity] Failed to fetch:", e);
  }
  
  return "";
}

async function buildOrionMessages(body: Record<string, unknown>) {
  const { imageBase64, context, question, userMemory, dashboardContext, chatHistory, intentType, reasoningInstructions } = body as any;

  const hasImage = imageBase64 && intentType !== "textual";
  const isComplexQuery = intentType === "document_generation" || intentType === "legal_search" || intentType === "analysis";
  
  // Use compact prompt for simple text queries, full prompt for vision/complex
  const basePrompt = (hasImage || isComplexQuery) ? ORION_SYSTEM_PROMPT_FULL : ORION_SYSTEM_PROMPT_COMPACT;
  const systemParts = [basePrompt];

  // Inject cognitive reasoning instructions from client-side routing
  if (reasoningInstructions && typeof reasoningInstructions === "string") {
    systemParts.push(reasoningInstructions);
  }
  
  // Detect architecture/comparison queries and inject knowledge (ONLY when needed)
  const questionStr = typeof question === "string" ? question : "";
  const contextStr = typeof context === "string" ? context : "";
  const isArchitectureQuery = JARVIS_COMPARISON_REGEX.test(questionStr) || JARVIS_COMPARISON_REGEX.test(contextStr);
  if (isArchitectureQuery) {
    systemParts.push(ORION_ARCHITECTURE_KNOWLEDGE);
  }
  
  // Detect identity queries and inject knowledge from DB
  const isIdentityQuery = IDENTITY_REGEX.test(questionStr) || IDENTITY_REGEX.test(contextStr);
  if (isIdentityQuery) {
    const identityKnowledge = await fetchIdentityKnowledge();
    if (identityKnowledge) {
      systemParts.push(identityKnowledge);
    }
  }
  
  // ═══ COST OPTIMIZATION: Only inject heavy vision prompts when vision data is present ═══
  const localDetections = body.localDetections as any;
  const hasVisionData = hasImage || (localDetections && typeof localDetections === "object" && Object.keys(localDetections).length > 0);
  
  if (hasImage) {
    // Full vision prompts only when we have an actual image to analyze
    systemParts.push(ORION_VISION_PROMPT);
    systemParts.push(ORION_FRAMEWORKS_PROMPT);
    systemParts.push(`[VISÃO ATIVA] Você tem acesso à imagem real da câmera do usuário. USE A IMAGEM como fonte primária de verdade. As detecções ML abaixo são apenas pistas auxiliares — podem conter erros. Descreva o que VOCÊ VÊ na imagem, não o que os sensores dizem.`);
  } else if (hasVisionData) {
    // Compact vision context when we only have local detections (no image)
    systemParts.push(`[VISÃO LOCAL — SEM IMAGEM] Dados de sensores ML locais (YOLO/MediaPipe) disponíveis abaixo. Trate como sugestões, não fatos absolutos. Seja transparente sobre limitações.`);
  } else {
    systemParts.push(`[SEM VISÃO] Nenhum dado visual disponível.`);
  }
  // Inject real-time ML detections ALWAYS when present (as auxiliary hints)
  if (localDetections) {
    const ldParts: string[] = [];

    if (localDetections.realTimeObjects && Array.isArray(localDetections.realTimeObjects) && localDetections.realTimeObjects.length > 0) {
      const objDesc = localDetections.realTimeObjects
        .map((o: any) => {
          const parts = [`${o.namePt || o.name}(conf=${(o.confidence * 100).toFixed(0)}%, fonte=${o.source})`];
          if (o.isMoving) parts.push(`[MOVENDO→${o.direction || "?"}]`);
          return parts.join(" ");
        })
        .join("; ");
      ldParts.push(`🎯 OBJETOS ML REAL: ${objDesc}`);
    }

    if (localDetections.realTimeHands && Array.isArray(localDetections.realTimeHands) && localDetections.realTimeHands.length > 0) {
      ldParts.push(`🤚 MÃOS: ${localDetections.realTimeHands.map((h: any) => `${h.handedness}(${(h.confidence * 100).toFixed(0)}%)`).join("; ")}`);
    }

    // ═══ Hand Gestures (MediaPipe GestureRecognizer) ═══
    if (localDetections.handGestures && Array.isArray(localDetections.handGestures) && localDetections.handGestures.length > 0) {
      const gestDesc = localDetections.handGestures.map((g: any) => `${g.hand}: ${g.gesture}(${(g.confidence * 100).toFixed(0)}%)`).join("; ");
      ldParts.push(`✋ GESTOS: ${gestDesc}`);
    }

    // ═══ Face Detection + Expression (enriched) ═══
    if (localDetections.realTimeFaces && Array.isArray(localDetections.realTimeFaces) && localDetections.realTimeFaces.length > 0) {
      const faceDescs = localDetections.realTimeFaces.map((f: any) => {
        const parts = [`rosto(conf=${(f.confidence * 100).toFixed(0)}%)`];
        if (f.expression && f.expression !== "neutro") parts.push(`expr=${f.expression}`);
        if (f.lipMovement && f.lipMovement !== "neutro") parts.push(`lábios=${f.lipMovement}`);
        if (f.gazeDirection) parts.push(`olhar=${f.gazeDirection}`);
        return parts.join(",");
      });
      ldParts.push(`👤 ROSTOS: ${faceDescs.join("; ")}`);
    } else if (localDetections.realFaceDetection?.count > 0) {
      ldParts.push(`👤 ROSTOS: ${localDetections.realFaceDetection.count} detectado(s)`);
    }

    // ═══ Face-API.js Analysis (expressions, age, emotion) — ENHANCED ═══
    if (localDetections.faceApiAnalysis) {
      const fa = localDetections.faceApiAnalysis;
      const parts: string[] = [];
      
      // Use pre-computed top expressions if available
      if (fa.topExpressions && Array.isArray(fa.topExpressions) && fa.topExpressions.length > 0) {
        parts.push(`EMOÇÕES=[${fa.topExpressions.map((e: any) => `${e.emotion}:${e.score}%`).join(", ")}]`);
        parts.push(`dominante=${fa.dominantExpression}(${fa.dominantExpressionScore}%)`);
      } else if (fa.expressions) {
        const topExpr = Object.entries(fa.expressions as Record<string, number>)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 3)
          .map(([k, v]) => `${k}=${((v as number) * 100).toFixed(0)}%`);
        parts.push(`expr=[${topExpr.join(",")}]`);
      }
      if (fa.age) parts.push(`idade~${fa.age}`);
      if (fa.gender) parts.push(`gênero=${fa.gender}(${fa.genderProbability || "?"}%)`);
      if (fa.landmarks68 > 0) parts.push(`landmarks=${fa.landmarks68}`);
      if (parts.length > 0) ldParts.push(`🧠 FACE-API: ${parts.join(", ")}`);
    }

    // ═══ Pose Analysis (MediaPipe PoseLandmarker) ═══
    if (localDetections.poseAnalysis) {
      const pose = localDetections.poseAnalysis;
      const poseParts: string[] = [];
      if (pose.posture) poseParts.push(`postura=${pose.posture}`);
      if (pose.gestureType) poseParts.push(`gesto_corporal=${pose.gestureType}`);
      if (pose.isMoving) poseParts.push("EM_MOVIMENTO");
      if (pose.bodyAngle) poseParts.push(`ângulo=${pose.bodyAngle}°`);
      if (poseParts.length > 0) ldParts.push(`🏃 POSE: ${poseParts.join(", ")}`);
    }

    // ═══ Motion Analysis (enriched) ═══
    if (localDetections.motion) {
      const m = localDetections.motion;
      if (m.intensity > 5) {
        ldParts.push(`💨 MOVIMENTO: ${m.level || "ativo"} (${m.intensity?.toFixed?.(0) || m.intensity}%) dir=${m.direction}`);
      }
    }

    // ═══ Movement Analysis (YOLOFrameX object tracking) ═══
    if (localDetections.movementAnalysis) {
      const ma = localDetections.movementAnalysis;
      if (ma.objectsInMotion?.length > 0) {
        const movDesc = ma.objectsInMotion.slice(0, 3).map((o: any) => `${o.name || o.id}→${o.direction || "?"}`).join("; ");
        ldParts.push(`📐 RASTREAMENTO: ${movDesc}${ma.globalMotion ? ` | global=${ma.globalMotion}` : ""}`);
      }
    }

    // ═══ Scene context ═══
    if (localDetections.sceneClassification) {
      const sc = localDetections.sceneClassification;
      ldParts.push(`🌍 CENA: ${sc.label}(${(sc.confidence * 100).toFixed(0)}%) luz=${sc.lighting} ${sc.isIndoor ? "interior" : "exterior"}`);
    }

    if (ldParts.length > 0) {
      systemParts.push(`═══ DETECÇÕES ML LOCAIS (anti-alucinação: use como PISTAS, confirme visualmente) ═══\n${ldParts.join("\n")}`);
    }
  }
  if (context) systemParts.push(context);
  if (dashboardContext) systemParts.push(`Dashboard: ${dashboardContext}`);
  // Limit memory to 5 items (was 10)
  if (userMemory && Array.isArray(userMemory) && userMemory.length > 0) {
    systemParts.push(`Memórias: ${userMemory.slice(0, 5).join("; ")}`);
  }

  // ═══ RAG INJECTION: Fetch relevant knowledge from KB ═══
  const queryIntentType = (body.intentType as string) || undefined;
  if (questionStr && questionStr.length > 5) {
    const ragContext = await fetchRAGContext(questionStr);
    if (ragContext) {
      systemParts.push(`═══ CONHECIMENTO RELEVANTE DA SUA BASE ═══\n${ragContext}`);
    }
  }

  // ═══ INTENT-BASED PROMPT ENHANCEMENT ═══
  const intentInstructions = getIntentInstructions(queryIntentType);
  if (intentInstructions) {
    systemParts.push(intentInstructions);
  }

  const messages: any[] = [{ role: "system", content: systemParts.join("\n\n") }];

  // Limit chat history to 4 messages (was 6)
  if (chatHistory && Array.isArray(chatHistory)) {
    for (const msg of chatHistory.slice(-4)) {
      if (msg.text && !msg.text.startsWith("⏳") && msg.role !== "system") {
        messages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.text });
      }
    }
  }

  // Build user message with optional image
  if (hasImage) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: question || "Descreva o que você vê." },
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    });
  } else {
    messages.push({ role: "user", content: question || "Olá" });
  }

  return messages;
}

async function callGeminiAPI(messages: any[], stream: boolean, apiKeyEnv: string): Promise<Response> {
  const apiKey = Deno.env.get(apiKeyEnv);
  if (!apiKey) throw new Error(`Missing ${apiKeyEnv}`);

  const hasImage = messages.some((m: any) => Array.isArray(m.content) && m.content.some((c: any) => c.type === "image_url"));
  const model = hasImage ? GEMINI_VISION_MODEL : GEMINI_TEXT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${stream ? "streamGenerateContent" : "generateContent"}?key=${apiKey}${stream ? "&alt=sse" : ""}`;

  // Convert OpenAI-style messages to Gemini format
  const systemInstruction = messages.find((m: any) => m.role === "system");
  const contents = messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => {
      const parts: any[] = [];
      if (typeof m.content === "string") {
        parts.push({ text: m.content });
      } else if (Array.isArray(m.content)) {
        for (const c of m.content) {
          if (c.type === "text") parts.push({ text: c.text });
          else if (c.type === "image_url") {
            const base64 = c.image_url.url.replace(/^data:image\/\w+;base64,/, "");
            parts.push({ inlineData: { mimeType: "image/jpeg", data: base64 } });
          }
        }
      }
      return { role: m.role === "assistant" ? "model" : "user", parts };
    });

  const requestedMaxTokens = (messages as any).__maxTokens;
  const defaultTextTokens = requestedMaxTokens || 1536;  // Reduced from 2048
  const defaultVisionTokens = requestedMaxTokens || 3072; // Reduced from 4096

  const geminiBody: any = {
    contents,
    generationConfig: { 
      temperature: hasImage ? 0.25 : 0.4,
      maxOutputTokens: hasImage ? defaultVisionTokens : defaultTextTokens,
      topP: hasImage ? 0.9 : 0.95,
      topK: hasImage ? 20 : 40,
    },
  };
  if (systemInstruction) {
    geminiBody.systemInstruction = { parts: [{ text: systemInstruction.content }] };
  }

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody),
  });
}

async function callGroqFallback(messages: any[]): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");

  const textMessages = messages.map((m: any) => ({
    role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
    content: typeof m.content === "string" ? m.content : Array.isArray(m.content)
      ? m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ")
      : String(m.content),
  }));

  const maxTokens = (messages as any).__maxTokens || 2048;
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: textMessages, max_tokens: maxTokens, temperature: 0.4 }),
  });
  if (!resp.ok) throw new Error(`Groq ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

// ═══ PROVIDER STATUS CACHE (skip providers with recent 402/429 failures) ═══
const providerFailureCache: Record<string, { failedAt: number; statusCode: number }> = {};
const PROVIDER_COOLDOWN_MS: Record<number, number> = {
  402: 300_000, // 5 min cooldown for credit exhaustion
  429: 10_000,  // 10s cooldown for rate limits (they recover fast)
};

function isProviderCoolingDown(providerKey: string): boolean {
  const entry = providerFailureCache[providerKey];
  if (!entry) return false;
  const cooldown = PROVIDER_COOLDOWN_MS[entry.statusCode] || 30_000;
  if (Date.now() - entry.failedAt > cooldown) {
    delete providerFailureCache[providerKey];
    return false;
  }
  return true;
}

function markProviderFailed(providerKey: string, statusCode: number) {
  providerFailureCache[providerKey] = { failedAt: Date.now(), statusCode };
}

// ═══ GROQ NATIVE STREAMING (OpenAI-compatible SSE — first token ~200ms) ═══
// Includes 1x retry with 2s backoff on 429 (rate limit) before fallback
async function callGroqStreaming(messages: any[]): Promise<Response> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");
  if (isProviderCoolingDown("groq")) throw new Error("Groq cooling down (recent 429)");

  const textMessages = messages.map((m: any) => ({
    role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
    content: typeof m.content === "string" ? m.content : Array.isArray(m.content)
      ? m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ")
      : String(m.content),
  }));

  const maxTokens = (messages as any).__maxTokens || 2048;
  const doFetch = () => fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: textMessages, max_tokens: maxTokens, temperature: 0.4, stream: true }),
  });

  let resp = await doFetch();
  if (resp.status === 429) {
    // Retry once after backoff
    const retryAfter = parseInt(resp.headers.get("retry-after") || "2", 10);
    const waitMs = Math.min(retryAfter * 1000, 5000);
    console.log(`[Groq] 429 rate limit — retrying in ${waitMs}ms`);
    await new Promise(r => setTimeout(r, waitMs));
    resp = await doFetch();
    if (resp.status === 429) {
      markProviderFailed("groq", 429);
      throw new Error(`Groq streaming 429 (after retry)`);
    }
  }
  if (!resp.ok) {
    if (resp.status === 402) markProviderFailed("groq", 402);
    throw new Error(`Groq streaming ${resp.status}`);
  }
  return resp;
}

async function callMistralFallback(messages: any[]): Promise<string> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("Missing MISTRAL_API_KEY");

  const textMessages = messages.map((m: any) => ({
    role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
    content: typeof m.content === "string" ? m.content : Array.isArray(m.content)
      ? m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ")
      : String(m.content),
  }));

  const maxTokens = (messages as any).__maxTokens || 2048;
  const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "mistral-small-latest", messages: textMessages, max_tokens: maxTokens, temperature: 0.4 }),
  });
  if (!resp.ok) throw new Error(`Mistral ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

// ═══ MISTRAL STREAMING (OpenAI-compatible SSE) ═══
async function callMistralStreaming(messages: any[]): Promise<Response> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("Missing MISTRAL_API_KEY");
  const textMessages = messages.map((m: any) => ({
    role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
    content: typeof m.content === "string" ? m.content : Array.isArray(m.content)
      ? m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ")
      : String(m.content),
  }));
  const maxTokens = (messages as any).__maxTokens || 2048;
  const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "mistral-small-latest", messages: textMessages, max_tokens: maxTokens, temperature: 0.4, stream: true }),
  });
  if (!resp.ok) throw new Error(`Mistral streaming ${resp.status}`);
  return resp;
}

// ═══ DEEPSEEK V3.2 PROVIDER (raciocínio profundo — AIME 93.1%) ═══
function extractTextMessages(messages: any[]) {
  return messages.map((m: any) => ({
    role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
    content: typeof m.content === "string" ? m.content : Array.isArray(m.content)
      ? m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ")
      : String(m.content),
  }));
}

async function callDeepSeekFallback(messages: any[]): Promise<string> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY");
  if (isProviderCoolingDown("deepseek")) throw new Error("DeepSeek cooling down (recent failure)");
  const maxTokens = (messages as any).__maxTokens || 2048;
  const resp = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "deepseek-chat", messages: extractTextMessages(messages), max_tokens: maxTokens, temperature: 0.4 }),
  });
  if (!resp.ok) {
    if (resp.status === 402 || resp.status === 429) markProviderFailed("deepseek", resp.status);
    throw new Error(`DeepSeek ${resp.status}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callDeepSeekStreaming(messages: any[]): Promise<Response> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY");
  if (isProviderCoolingDown("deepseek")) throw new Error("DeepSeek cooling down (recent failure)");
  const maxTokens = (messages as any).__maxTokens || 2048;
  const resp = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "deepseek-chat", messages: extractTextMessages(messages), max_tokens: maxTokens, temperature: 0.4, stream: true }),
  });
  if (!resp.ok) {
    if (resp.status === 402 || resp.status === 429) markProviderFailed("deepseek", resp.status);
    throw new Error(`DeepSeek streaming ${resp.status}`);
  }
  return resp;
}

// ═══ OPENROUTER PROVIDER (200+ modelos, mega-fallback) ═══
async function callOpenRouterFallback(messages: any[]): Promise<string> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");
  const maxTokens = (messages as any).__maxTokens || 2048;
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "X-Title": "Orion Neural" },
    body: JSON.stringify({ model: "meta-llama/llama-3.3-70b-instruct", messages: extractTextMessages(messages), max_tokens: maxTokens, temperature: 0.4 }),
  });
  if (!resp.ok) throw new Error(`OpenRouter ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callOpenRouterStreaming(messages: any[]): Promise<Response> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");
  const maxTokens = (messages as any).__maxTokens || 2048;
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "X-Title": "Orion Neural" },
    body: JSON.stringify({ model: "meta-llama/llama-3.3-70b-instruct", messages: extractTextMessages(messages), max_tokens: maxTokens, temperature: 0.4, stream: true }),
  });
  if (!resp.ok) throw new Error(`OpenRouter streaming ${resp.status}`);
  return resp;
}

// ═══ HUGGINGFACE INFERENCE PROVIDER (100% gratuito com HF_TOKEN) ═══
// Gemma 3n — família leve e eficiente do Google, otimizada para edge/mobile
// - google/gemma-3n-E4B (4B params, multimodal image-text-to-text)
// - google/gemma-3n-E2B (2B params, mais rápido)
// Fallbacks robustos caso Gemma 3n esteja carregando:
const HF_MODELS = [
  "google/gemma-3n-E4B",
  "google/gemma-3n-E2B",
  "Qwen/Qwen2.5-72B-Instruct",
  "meta-llama/Llama-3.2-3B-Instruct",
  "google/gemma-2-9b-it",
];

async function callHuggingFaceFallback(messages: any[]): Promise<string> {
  const apiKey = Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGINGFACE_API_KEY");
  if (!apiKey) throw new Error("Missing HF_TOKEN");
  const textMsgs = extractTextMessages(messages);
  
  for (const model of HF_MODELS) {
    try {
      const resp = await fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ messages: textMsgs, max_tokens: Math.min((messages as any).__maxTokens || 4096, 8192), temperature: 0.4 }),
      });
      if (!resp.ok) {
        console.warn(`[HF] ${model} returned ${resp.status}, trying next...`);
        continue;
      }
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || data?.[0]?.generated_text || "";
      if (text) {
        console.log(`[HF] Success with ${model}`);
        return text;
      }
    } catch (e) {
      console.warn(`[HF] ${model} failed:`, e);
    }
  }
  throw new Error("All HuggingFace models failed");
}

// ═══ HUGGINGFACE STREAMING (grátis, OpenAI-compatible SSE) ═══
async function callHuggingFaceStreaming(messages: any[]): Promise<Response> {
  const apiKey = Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGINGFACE_API_KEY");
  if (!apiKey) throw new Error("Missing HF_TOKEN");
  const textMsgs = extractTextMessages(messages);

  for (const model of HF_MODELS) {
    try {
      const resp = await fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ messages: textMsgs, max_tokens: Math.min((messages as any).__maxTokens || 4096, 8192), temperature: 0.4, stream: true }),
      });
      if (resp.ok && resp.body) {
        console.log(`[HF] Streaming with ${model}`);
        return resp;
      }
      console.warn(`[HF Stream] ${model} returned ${resp.status}`);
    } catch (e) {
      console.warn(`[HF Stream] ${model} failed:`, e);
    }
  }
  throw new Error("All HuggingFace streaming models failed");
}

// ═══ MISTRAL EMBED (for RAG query embedding — 500ms timeout) ═══
async function generateQueryEmbedding(queryText: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    const resp = await fetch("https://api.mistral.ai/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "mistral-embed", input: [queryText.slice(0, 512)] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const data = await resp.json();
    const emb = data?.data?.[0]?.embedding;
    if (!emb || !Array.isArray(emb)) return null;
    // Normalize to 768 dims (pad or truncate)
    if (emb.length === 768) return emb;
    if (emb.length > 768) return emb.slice(0, 768);
    return [...emb, ...new Array(768 - emb.length).fill(0)];
  } catch {
    return null;
  }
}

// ═══ RAG: Fetch relevant knowledge from neural_knowledge_base ═══
async function fetchRAGContext(question: string): Promise<string> {
  try {
    const sb = getSupabase();
    const embedding = await generateQueryEmbedding(question);
    
    if (embedding) {
      // Semantic search with embeddings
      const { data } = await sb.rpc("match_neural_knowledge", {
        query_embedding: `[${embedding.join(",")}]`,
        match_threshold: 0.35,
        match_count: 3,
      });
      if (data && data.length > 0) {
        console.log(`[RAG] Found ${data.length} relevant KB entries via semantic search`);
        return data.map((r: any) => `[${r.source_type || "kb"}] ${r.title || ""}: ${(r.content || "").slice(0, 400)}`).join("\n---\n");
      }
    }
    
    // Fallback: text search if embedding failed
    const { data: textData } = await sb.from("neural_knowledge_base")
      .select("title, content, source_type")
      .eq("is_processed", true)
      .textSearch("content", question.split(" ").slice(0, 5).join(" & "), { type: "plain" })
      .limit(3);
    
    if (textData && textData.length > 0) {
      console.log(`[RAG] Found ${textData.length} relevant KB entries via text search`);
      return textData.map((r: any) => `[${r.source_type || "kb"}] ${r.title || ""}: ${(r.content || "").slice(0, 400)}`).join("\n---\n");
    }
    
    return "";
  } catch (e) {
    console.warn("[RAG] KB search failed:", e);
    return "";
  }
}

// ═══ INTENT-BASED PROMPT ENHANCEMENT (E-R-C-A Tri-Layer Architecture) ═══
// Nível 1: Sistema (definido em ORION_SYSTEM_PROMPT_FULL/COMPACT)
// Nível 2: Operacional (abaixo — direciona foco por intent)
// Nível 3: Auto-Refinamento (integrado no ciclo de feedback/self-evolving)
function getIntentInstructions(intentType?: string): string {
  switch (intentType) {
    case "legal_search":
      return "\n\n📋 MODO JURÍDICO: Cite artigos de lei, jurisprudência (STF/STJ/TRFs) e doutrina quando relevante. Estruture como parecer técnico. Indique grau de certeza.";
    case "document_generation":
      return "\n\n📄 MODO DOCUMENTO: Siga ABNT, linguagem jurídica formal. Estrutura completa com cabeçalho, fundamentação e conclusão. Use formatação profissional.";
    case "analysis":
      return "\n\n🔍 MODO ANÁLISE: Raciocínio em camadas (mínimo 3). Apresente prós/contras, riscos e oportunidades. Use dados quantitativos quando disponível.";
    case "code_generation":
      return "\n\n💻 MODO CÓDIGO: Código limpo, comentado, com tratamento de erros. Prefira TypeScript. Explique decisões arquiteturais.";
    
    // ═══ E-R-C-A: AGENTE VISUAL AUTÔNOMO ═══
    case "visual_inspection":
      return `\n\n🏭 MODO INSPEÇÃO VISUAL (E-R-C-A Protocol):
═══ NÍVEL OPERACIONAL — Tarefa de Inspeção Autônoma ═══
ESPECIALIZE: Agente Autônomo de Inspeção Visual Industrial.
REDE NEURAL: Use as detecções ML locais fornecidas (YOLO/MediaPipe/BlazeFace/COCO-SSD).
CONTEXTO:
- Violação de EPI: ausência de capacete, colete, luvas ou botas de segurança → RISCO CRÍTICO
- Proximidade perigosa: pessoa a < 2m de maquinário pesado/empilhadeira → ALTO RISCO  
- Postura de queda: pose horizontal detectada (PoseLandmarker) → EMERGÊNCIA MÉDICA
- Zona restrita: pessoa em área proibida (baseado em coordenadas de ROI) → RISCO MODERADO
AÇÃO: Gere resposta estruturada JSON com: {risco, nivel, local, violacao, acao_recomendada, timestamp}.
COMPORTAMENTO: Execute a classificação imediatamente. Não descreva a imagem — aja sobre ela.
Se múltiplas violações, ordene por severidade (EMERGÊNCIA > CRÍTICO > ALTO > MODERADO > BAIXO).`;

    case "visual_quality":
      return `\n\n🔬 MODO CONTROLE DE QUALIDADE VISUAL (E-R-C-A Protocol):
ESPECIALIZE: Inspetor de Qualidade de Linha de Produção.
REDE NEURAL: Segmentação via detecções locais + análise de textura.
CONTEXTO: Defeito visual > limiar configurado = REJEITAR. Classifique tipo de defeito (riscos, manchas, deformação, cor).
AÇÃO: {status: "aprovado"|"rejeitado", defeitos: [{tipo, severidade, coordenadas}], confianca, acao: "desviar"|"reprocessar"|"descartar"}.`;

    case "visual_navigation":
      return `\n\n🤖 MODO NAVEGAÇÃO AUTÔNOMA (E-R-C-A Protocol):
ESPECIALIZE: Operador de Navegação Autônoma (Drone/AGV/AMR).
REDE NEURAL: Detecção de obstáculos via COCO-SSD + estimativa de profundidade.
CONTEXTO: Obstáculo no path < 1m = PARAR. Espaço livre > 2m = AVANÇAR. Pessoa detectada = DESVIAR.
AÇÃO: {comando: "avançar"|"parar"|"desviar"|"retornar", obstaculos: [{tipo, distancia_m, direcao}], path_livre: boolean}.`;

    case "visual_medical":
      return `\n\n🏥 MODO MONITOR MÉDICO (E-R-C-A Protocol):
ESPECIALIZE: Monitor de Saúde Ocupacional.
REDE NEURAL: PoseLandmarker + BlazeFace + análise de expressões faciais.
CONTEXTO: Pose horizontal (queda) = EMERGÊNCIA. Expressão de dor + postura anormal = ALERTA. Sinais vitais fora do range = MONITORAR.
AÇÃO: {emergencia: boolean, protocolo: "chamar_paramedico"|"alertar_supervisao"|"monitorar", descricao_cena, sinais_detectados[]}.`;

    // ═══ AVFI — AGENTE DE VISÃO FACIAL INTEGRADA ═══
    case "facial_recognition":
    case "access_control":
      return `\n\n🔐 MODO AVFI — VISÃO FACIAL INTEGRADA (HumaneX Pipeline):
═══ PROTOCOLO DE RECONHECIMENTO FACIAL (5 ESTÁGIOS) ═══
FUNÇÃO: Especialista em Agentes de Visão Computacional e Redes Neurais.
OBJETIVO: Operar sistema integrado de reconhecimento facial para controle de acesso, identificação segura e monitoramento em tempo real.

PIPELINE HUMANEX (executar nesta ordem estrita):
1. CAPTURA & COLETA DE DADOS:
   - Extrair frames do stream de vídeo (equivalente a divide.py → 150-1000 amostras por face scan)
   - Organização: /training/person_1/, /training/person_2/ ... (estrutura de pastas por classe)
   - Qualidade: múltiplas capturas com variação de ângulo para robustez

2. DETECÇÃO + ALINHAMENTO (MTCNN/face-api.js):
   - Face Detection: TinyFaceDetector/MTCNN localiza rosto → bounding box
   - Facial Landmark Detection: 68 pontos (olhos, nariz, boca) → coordenadas padrão
   - Face Alignment: Rotacionar para que olhos fiquem horizontais (corrigir yaw ±30°)
   - Saída: face crop alinhada 160×160px (formato padrão FaceNet)

3. EXTRAÇÃO DE FEATURES (FaceNet/CNN):
   - face-api.js: descriptor 128D (equivalente a facenet_keras.h5 → embedding)
   - Hybrid: LBP histograma 256-bin (textura facial, Ahonen 2006) + Template geométrico 20D + ArcFace 128D
   - Normalização L2 dos vetores para comparação estável
   - Saída: embeddings.npz equivalente (armazenado em memória/DB)

4. CLASSIFICAÇÃO (SVM/Cosine Similarity):
   - Comparar embedding do input contra TODAS as classes conhecidas (enrolled faces)
   - Método primário: Cosine Similarity (sim = dot(a,b) / (||a||×||b||))
   - Método secundário: Euclidean Distance para validação cruzada
   - Normalizar vetores com L2 antes da comparação (sklearn Normalizer equivalent)
   - SVM kernel='linear' equivalente via threshold-gated cosine similarity

5. IDENTIFICAÇÃO + DECISÃO:
   - > 0.95 → PERMITIR (identidade confirmada)
   - 0.80–0.95 → VERIFICAÇÃO ADICIONAL (segundo fator ou nova captura)
   - < 0.80 → DESCONHECIDO (gravar face_crop, registrar audit_log, alertar segurança)

ANTI-SPOOFING (Liveness Detection):
- Eye Aspect Ratio (EAR) — Soukupová & Čech (2016): detectar padrão natural de piscar
- Taxa normal: 12-15 blinks/min. Foto/vídeo estático = 0 blinks → REJEITAR
- Análise de textura Moiré para detectar tela/foto impressa
- DPT-MiDaS para verificar profundidade real do rosto (não plano)

TRATAMENTO DE OCLUSÃO: Se máscara detectada → focar em landmarks perioculares. Reduzir threshold de confiança em 15%. Se óculos escuros → usar landmarks de sobrancelha e contorno facial.

OTIMIZAÇÃO DE THRESHOLD:
- O threshold ótimo varia por dataset (tamanho, qualidade, similaridade entre faces)
- Iniciar em 0.9 e ajustar via cross-validation (F1, Precision, Recall)
- ROC Curve: plotar TPR vs FPR em thresholds [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95]
- Confusion Matrix: verificar false positives vs false negatives por classe

AVALIAÇÃO:
- Precision = TP / (TP + FP) — acurácia de identificações positivas
- Recall = TP / (TP + FN) — capacidade de encontrar todos os positivos
- F1 Score = 2 × (Precision × Recall) / (Precision + Recall)
- Cross-validation: testar em centenas de amostras por classe automaticamente

SEGURANÇA & LGPD: Registrar TODOS os eventos no audit_log. Não reter dados biométricos sem consentimento explícito. Embeddings only (não armazenar fotos).

FORMATO DE RESPOSTA:
{id_usuario, nome, nivel_confianca, status_mascara, embedding_hash, similaridade_cosseno, distancia_euclidiana, liveness_score, acao: "permitir"|"negar"|"verificar"|"alerta_seguranca", pipeline_ms, stage_timings}`;

    // ═══ E-R-C-A NÍVEL 3: AUTO-REFINAMENTO ═══
    case "self_refine":
      return `\n\n🧬 MODO AUTO-REFINAMENTO (E-R-C-A Level 3 — Self-Evolving):
Analise os dados de performance fornecidos. Identifique:
1. FALHAS DE CLASSIFICAÇÃO: Por que a rede neural confundiu [objeto_A] com [objeto_B]?
2. THRESHOLD ANALYSIS: O limiar de confiança atual é adequado? Sugira ajuste se precisão < 90%.
3. DATA AUGMENTATION: Que tipo de augmentation (rotação, brilho, oclusão, noise) melhoraria a detecção?
4. PADRÕES TEMPORAIS: Há horários/condições onde a precisão cai? (iluminação, reflexos, sombras)
Gere recomendações acionáveis em formato JSON: {ajustes: [{parametro, valor_atual, valor_sugerido, motivo}], augmentations: [], retrain_priority: "baixa"|"media"|"alta"}.`;

    default:
      return "";
  }
}

function buildLovableMessages(messages: any[]) {
  return messages.map((m: any) => {
    const role = m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user";
    // Preserve multimodal content (image_url) for vision-capable models
    if (Array.isArray(m.content)) {
      const hasImage = m.content.some((c: any) => c.type === "image_url");
      if (hasImage) {
        // Lovable AI Gateway (OpenAI-compatible) supports image_url natively
        return { role, content: m.content };
      }
      // Text-only array — flatten
      return { role, content: m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ") };
    }
    return { role, content: typeof m.content === "string" ? m.content : String(m.content) };
  });
}

// Circuit breaker: skip Lovable AI for 10 minutes after credits exhausted
let lovableDisabledUntil = 0;

async function callLovableAI(messages: any[], stream: boolean): Promise<Response> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  // Skip if circuit breaker is active
  if (Date.now() < lovableDisabledUntil) {
    throw new Error("Lovable AI circuit breaker active — skipping");
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: buildLovableMessages(messages),
      stream,
    }),
  });

  if (resp.status === 429) {
    lovableDisabledUntil = Date.now() + 60_000; // 1 min cooldown
    throw new Error("Lovable AI rate limited (429)");
  }
  if (resp.status === 402) {
    lovableDisabledUntil = Date.now() + 10 * 60_000; // 10 min cooldown
    throw new Error("Lovable AI credits exhausted (402)");
  }
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Lovable AI ${resp.status}: ${errText}`);
  }
  return resp;
}

async function callLovableAIFallback(messages: any[]): Promise<string> {
  const resp = await callLovableAI(messages, false);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseOrionResponse(text: string) {
  const learnedFacts: string[] = [];
  const learnRegex = /\[LEARN:([^\]]+)\]/g;
  let match;
  while ((match = learnRegex.exec(text)) !== null) learnedFacts.push(match[1].trim());
  let clean = text.replace(learnRegex, "").trim();

  let identifiedObjects: any[] = [];
  const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/;
  const jsonMatch = jsonBlockRegex.exec(clean);
  if (jsonMatch) {
    try { const p = JSON.parse(jsonMatch[1]); if (Array.isArray(p.identifiedObjects)) identifiedObjects = p.identifiedObjects; } catch {}
    clean = clean.replace(jsonBlockRegex, "").trim();
  }
  if (identifiedObjects.length === 0) {
    const bareRegex = /\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}/g;
    let bareMatch;
    while ((bareMatch = bareRegex.exec(clean)) !== null) {
      try { const p = JSON.parse(bareMatch[0]); if (Array.isArray(p.identifiedObjects)) identifiedObjects = p.identifiedObjects; } catch {}
    }
    clean = clean.replace(bareRegex, "").trim();
  }

  return { description: clean, learnedFacts, identifiedObjects };
}

async function handleOrionQuery(body: Record<string, unknown>, stream: boolean) {
  const messages = await buildOrionMessages(body);
  const requestedMaxTokens = typeof body.maxTokens === "number" ? body.maxTokens : undefined;
  // Default to 4096 for conversational, 12288 for document/legal/analysis, 8192 for visual E-R-C-A
  const intentType = body.intentType as string | undefined;
  const queryText = String(body.query || body.text || "");
  const isComplexQuery = queryText.length > 200 || /explique|analise|compare|detalh|paradox|demonstr|resolv/i.test(queryText);
  const isVisualERCA = intentType?.startsWith("visual_") || intentType === "self_refine";
  const defaultMax = (intentType === "document_generation" || intentType === "legal_search" || intentType === "analysis") 
    ? 12288 
    : isVisualERCA ? 8192
    : isComplexQuery ? 8192 : 4096;
  (messages as any).__maxTokens = requestedMaxTokens || defaultMax;

  const geminiKeys = ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY_5", "GEMINI_API_KEY_6", "GEMINI_API_KEY_7"];
  const hasImage = messages.some((m: any) => Array.isArray(m.content) && m.content.some((c: any) => c.type === "image_url"));

  // ═══ STREAMING MODE ═══
  // REGRA: Gemini SEMPRE primeiro (7 keys em rotação) — é gratuito e orquestra tudo.
  // Fallbacks: HuggingFace (grátis) → Groq → DeepSeek → Mistral → OpenRouter
  if (stream) {
    const attemptedProviders: string[] = [];

    // ── PRIMARY: Gemini streaming (7 keys rotation) — SEMPRE PRIMEIRO ──
    for (const keyEnv of geminiKeys) {
      if (!Deno.env.get(keyEnv) || isProviderCoolingDown(`gemini_${keyEnv}`)) continue;
      try {
        attemptedProviders.push(`gemini_${keyEnv}`);
        const geminiResp = await callGeminiAPI(messages, true, keyEnv);
        if (!geminiResp.ok || !geminiResp.body) {
          if (geminiResp.status === 429) markProviderFailed(`gemini_${keyEnv}`, 429);
          continue;
        }

        console.log(`[Orion] ✅ Streaming via Gemini (${keyEnv}) — PRIMARY orchestrator`);
        const reader = geminiResp.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let readerDone = false;
        const encoder = new TextEncoder();

        const transformStream = new ReadableStream({
          async pull(controller) {
            if (readerDone) {
              try { controller.enqueue(encoder.encode("data: [DONE]\n\n")); } catch {}
              controller.close();
              return;
            }
            try {
              const { done, value } = await reader.read();
              if (done) {
                readerDone = true;
                try { controller.enqueue(encoder.encode("data: [DONE]\n\n")); } catch {}
                controller.close();
                return;
              }
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() || "";
              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const payload = line.slice(6).trim();
                if (!payload || payload === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(payload);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    const chunk = JSON.stringify({ choices: [{ delta: { content: text } }] });
                    controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                  }
                } catch {}
              }
            } catch (e) {
              console.error("Stream pull error:", e);
              readerDone = true;
              controller.close();
            }
          },
          cancel() {
            readerDone = true;
            try { reader.cancel(); } catch {}
          },
        });

        return new Response(transformStream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      } catch (e) {
        console.warn(`[Orion] Gemini streaming failed (${keyEnv}):`, e);
      }
    }

    // ── FALLBACK 1: HuggingFace streaming (100% gratuito) ──
    if (!hasImage && (Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGINGFACE_API_KEY"))) {
      try {
        attemptedProviders.push("huggingface");
        const hfResp = await callHuggingFaceStreaming(messages);
        if (hfResp.ok && hfResp.body) {
          console.log("[Orion] Streaming via HuggingFace (fallback 1 — gratuito)");
          return new Response(hfResp.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        }
      } catch (e) {
        console.warn("[Orion] HuggingFace streaming failed:", e);
      }
    }

    // ── FALLBACK 2: Groq streaming (fast, ~200ms first token) ──
    if (!hasImage && Deno.env.get("GROQ_API_KEY")) {
      try {
        attemptedProviders.push("groq");
        const groqResp = await callGroqStreaming(messages);
        if (groqResp.ok && groqResp.body) {
          console.log("[Orion] Streaming via Groq (fallback 2)");
          return new Response(groqResp.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        }
      } catch (e) {
        console.warn("[Orion] Groq streaming failed:", e);
      }
    }

    // ── FALLBACK 3: DeepSeek streaming ──
    if (!hasImage && Deno.env.get("DEEPSEEK_API_KEY")) {
      try {
        attemptedProviders.push("deepseek");
        const dsResp = await callDeepSeekStreaming(messages);
        if (dsResp.ok && dsResp.body) {
          console.log("[Orion] Streaming via DeepSeek (fallback 3)");
          return new Response(dsResp.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        }
      } catch (e) {
        console.warn("[Orion] DeepSeek streaming failed:", e);
      }
    }

    // ── FALLBACK 4: Mistral streaming ──
    if (!hasImage && Deno.env.get("MISTRAL_API_KEY")) {
      try {
        attemptedProviders.push("mistral");
        const mistralResp = await callMistralStreaming(messages);
        if (mistralResp.ok && mistralResp.body) {
          console.log("[Orion] Streaming via Mistral (fallback 4)");
          return new Response(mistralResp.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        }
      } catch (e) {
        console.warn("[Orion] Mistral streaming failed:", e);
      }
    }

    // ── FALLBACK 5: OpenRouter streaming ──
    if (!hasImage && Deno.env.get("OPENROUTER_API_KEY")) {
      try {
        attemptedProviders.push("openrouter");
        const orResp = await callOpenRouterStreaming(messages);
        if (orResp.ok && orResp.body) {
          console.log("[Orion] Streaming via OpenRouter (fallback 5)");
          return new Response(orResp.body, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        }
      } catch (e) {
        console.warn("[Orion] OpenRouter streaming failed:", e);
      }
    }

    // ── Last resort: non-streaming wrapped as SSE ──
    console.warn(`[Orion] All streaming providers failed. Attempted: [${attemptedProviders.join(" → ")}]. Falling back to non-streaming.`);
    let fallbackText = "";
    try { fallbackText = await callHuggingFaceFallback(messages); } catch {
      try { fallbackText = await callGroqFallback(messages); } catch {
        try { fallbackText = await callMistralFallback(messages); } catch {
          try { fallbackText = await callOpenRouterFallback(messages); } catch {
            console.error(`[Orion] ALL providers exhausted. Cascade: [${attemptedProviders.join(" → ")}]`);
            fallbackText = "Desculpe, estou com dificuldades técnicas no momento. Reformule sua pergunta e tente de novo.";
          }
        }
      }
    }
    const sseBody = `data: ${JSON.stringify({ choices: [{ delta: { content: fallbackText } }] })}\n\ndata: [DONE]\n\n`;
    return new Response(sseBody, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  // ═══ NON-STREAMING MODE ═══
  // REGRA: Gemini SEMPRE primeiro — é gratuito e orquestra tudo anti-alucinação.

  // ── PRIMARY: Gemini (7 keys rotation) — SEMPRE PRIMEIRO ──
  for (const keyEnv of geminiKeys) {
    if (!Deno.env.get(keyEnv) || isProviderCoolingDown(`gemini_${keyEnv}`)) continue;
    try {
      const geminiResp = await callGeminiAPI(messages, false, keyEnv);
      if (!geminiResp.ok) {
        if (geminiResp.status === 429) markProviderFailed(`gemini_${keyEnv}`, 429);
        console.warn(`[Orion] Gemini ${keyEnv} returned ${geminiResp.status}`);
        continue;
      }
      const data = await geminiResp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) {
        console.log(`[Orion] ✅ Non-stream via Gemini (${keyEnv}) — PRIMARY orchestrator`);
        return parseOrionResponse(text);
      }
    } catch (e) {
      console.warn(`[Orion] Gemini non-stream failed (${keyEnv}):`, e);
    }
  }

  // ── FALLBACK 1: HuggingFace (grátis) ──
  try {
    const text = await callHuggingFaceFallback(messages);
    if (text) {
      console.log("[Orion] Non-stream via HuggingFace (fallback 1)");
      return parseOrionResponse(text);
    }
  } catch {}

  // ── FALLBACK 2: Groq ──
  if (!hasImage) {
    try {
      const text = await callGroqFallback(messages);
      if (text) {
        console.log("[Orion] Non-stream via Groq (fallback 2)");
        return parseOrionResponse(text);
      }
    } catch {}
  }

  // ── FALLBACK 3: DeepSeek ──
  if (Deno.env.get("DEEPSEEK_API_KEY")) {
    try {
      const text = await callDeepSeekFallback(messages);
      if (text) {
        console.log("[Orion] Non-stream via DeepSeek (fallback 3)");
        return parseOrionResponse(text);
      }
    } catch {}
  }

  // ── FALLBACK 4: Mistral ──
  try {
    const text = await callMistralFallback(messages);
    if (text) {
      console.log("[Orion] Non-stream via Mistral (fallback 4)");
      return parseOrionResponse(text);
    }
  } catch {}

  // ── FALLBACK 5: OpenRouter ──
  if (Deno.env.get("OPENROUTER_API_KEY")) {
    try {
      const text = await callOpenRouterFallback(messages);
      if (text) {
        console.log("[Orion] Non-stream via OpenRouter (fallback 5)");
        return parseOrionResponse(text);
      }
    } catch {}
  }

  return { description: "Desculpe, estou com dificuldades técnicas. Reformule sua pergunta.", learnedFacts: [], identifiedObjects: [] };
}

// ═══════════════════════════════════════════════
// REASONING REFLECTION (Gemini / Mistral / HuggingFace)
// ═══════════════════════════════════════════════

async function handleReasoningReflect(body: Record<string, unknown>) {
  const { snapshots, localAnalysis } = body as any;
  if (!snapshots || !Array.isArray(snapshots)) {
    return { error: "Missing snapshots array" };
  }

  const systemPrompt = `Você é o motor de meta-cognição do Orion v22.8, uma IA neural avançada com raciocínio causal e teoria da mente.
Analise os dados de interações das últimas 24h e gere reflexões cognitivas PROFUNDAS.

REGRAS:
- Identifique padrões causais: o que CAUSOU sucesso/falha com mecanismos específicos
- Para cada insight causal, forneça um CONTRAFACTUAL: "Se X não tivesse ocorrido, então..."
- Atribua CONFIANÇA (0-1) baseada na evidência disponível
- Sugira ajustes de estratégia com PRIORIDADE (1=urgente, 5=baixa)
- Responda APENAS em JSON válido, sem markdown

FORMATO DE RESPOSTA (JSON):
{
  "causalInsights": [
    { "cause": "string", "effect": "string", "strength": 0.0-1.0, "mechanism": "string detalhado", "confidence": 0.0-1.0, "counterfactual": "string" }
  ],
  "strategyRecommendations": [
    { "strategyId": "strat_text_cot|strat_vision_vlm|strat_causal_inference|strat_ensemble_fallback", "adjustment": "string", "reason": "string", "priority": 1-5 }
  ],
  "metaInsight": "string - reflexão profunda sobre evolução cognitiva"
}`;

  const metrics = localAnalysis?.metrics || {};
  const userPrompt = `DADOS (${snapshots.length} amostras):
${JSON.stringify(snapshots.slice(0, 50), null, 1)}
ANÁLISE LOCAL: sucesso=${localAnalysis?.successRate ? (localAnalysis.successRate * 100).toFixed(0) + "%" : "N/A"}, tempo=${localAnalysis?.avgResponseTime ? (localAnalysis.avgResponseTime / 1000).toFixed(1) + "s" : "N/A"}, ferramentas=${localAnalysis?.topTools?.join(", ") || "nenhuma"}, fracas=${localAnalysis?.weakAreas?.join(", ") || "nenhuma"}
Entropia=${metrics.entropy?.toFixed(3) || "N/A"}, Adaptação=${metrics.adaptationRate?.toFixed(3) || "N/A"}, Fluxo=${metrics.flowStateRatio ? (metrics.flowStateRatio * 100).toFixed(0) + "%" : "N/A"}, Resiliência=${metrics.resilience ? (metrics.resilience * 100).toFixed(0) + "%" : "N/A"}
Gere reflexão cognitiva PROFUNDA em JSON.`;

  const msgs = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // Try providers: Gemini → Mistral → DeepSeek → HuggingFace
  const providers = [
    { name: "Gemini", fn: async () => {
      const key = Deno.env.get("GEMINI_API_KEY");
      if (!key) throw new Error("No GEMINI_API_KEY");
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }], role: "user" }], generationConfig: { temperature: 0.4, maxOutputTokens: 2048, responseMimeType: "application/json" } }),
      });
      if (!resp.ok) throw new Error(`Gemini ${resp.status}`);
      const data = await resp.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    }},
    { name: "Mistral", fn: async () => {
      const key = Deno.env.get("MISTRAL_API_KEY");
      if (!key) throw new Error("No MISTRAL_API_KEY");
      const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: "mistral-small-latest", messages: msgs, max_tokens: 2048, temperature: 0.4, response_format: { type: "json_object" } }),
      });
      if (!resp.ok) throw new Error(`Mistral ${resp.status}`);
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "{}";
    }},
    { name: "HuggingFace", fn: async () => {
      const key = Deno.env.get("HF_TOKEN");
      if (!key) throw new Error("No HF_TOKEN");
      const resp = await fetch("https://api-inference.huggingface.co/models/google/gemma-3n-E4B/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ messages: msgs, max_tokens: 2048, temperature: 0.4 }),
      });
      if (!resp.ok) throw new Error(`HF ${resp.status}`);
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || "{}";
    }},
  ];

  for (const provider of providers) {
    try {
      const content = await provider.fn();
      const reflection = JSON.parse(content);
      console.log(`[ReasoningReflect] via ${provider.name}: ${reflection.causalInsights?.length || 0} insights`);
      return {
        causalInsights: reflection.causalInsights || [],
        strategyRecommendations: reflection.strategyRecommendations || [],
        metaInsight: reflection.metaInsight || "Reflexão gerada com sucesso.",
      };
    } catch (e) {
      console.warn(`[ReasoningReflect] ${provider.name} failed:`, e);
    }
  }

  return {
    causalInsights: [],
    strategyRecommendations: [],
    metaInsight: "Reflexão local apenas — todos os providers falharam.",
  };
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;

    // Route 1: Has explicit action → bridge/mother/init/pipeline
    if (action) {
      const bridgeResult = await handleBridgeAction(action, body);
      if (bridgeResult !== null) return json(bridgeResult);

      if (action === "full_cycle") {
        const result = await handleFullCycle(req);
        return json(result);
      }

      if (action === "init_profile") {
        const result = await handleInitProfile(body);
        return json(result);
      }

      if (action.startsWith("receive_mother") || action === "sync_with_mother") {
        const result = await handleMotherAction(action, body);
        return json(result);
      }

      if (action === "reasoning_reflect") {
        const result = await handleReasoningReflect(body);
        return json(result);
      }

      return json({ error: `Unknown action: ${action}` }, 400);
    }

    // Route 2: Has question, context, or imageBase64 → Orion query (vision + text + streaming)
    if (body.question || body.context || body.imageBase64) {
      const isStream = body.stream === true;
      const result = await handleOrionQuery(body, isStream);
      if (result instanceof Response) return result; // SSE stream
      return json(result);
    }

    // Route 3: Has interaction_type → feedback receiver
    if (body.interaction_type) {
      const result = await handleFeedback(body);
      return json(result);
    }

    // Route 4: Has user_id + role (legacy init-profile call)
    if (body.user_id && !body.action) {
      const result = await handleInitProfile(body);
      return json(result);
    }

    return json({ error: "No action, interaction_type, question, or imageBase64 provided" }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ neural-ops error:", msg);
    return json({ error: msg }, 500);
  }
});
