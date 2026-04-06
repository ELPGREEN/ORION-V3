// ============= Lines 1-211 of 986 total lines =============

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══ FREE-ONLY AI PROVIDERS — Google Gemini Free Tier (7-key rotation) ═══
// All models below are 100% free via Google AI Studio / Gemini API
// Gemini 2.5 Flash: 10 RPM, 250 RPD, 250K TPM — balanced default
// Gemini 2.5 Flash-Lite: 15 RPM, 1000 RPD, 250K TPM — fast/cheap
// Gemini 2.5 Pro: 5 RPM, 100 RPD, 250K TPM — complex reasoning
// Gemini 3 Flash Preview: ~10 RPM — latest model
interface AIProvider {
  name: string;
  apiKeyEnv: string;
  endpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// Helper: Get all available Gemini keys for rotation
function _getGeminiKeys(): string[] {
  return [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
    Deno.env.get("GEMINI_API_KEY_4"),
    Deno.env.get("GEMINI_API_KEY_5"),
    Deno.env.get("GEMINI_API_KEY_6"),
    Deno.env.get("GEMINI_API_KEY_7"),
  ].filter(Boolean) as string[];
}

// Round-robin key index (persists across requests in same isolate)
let _geminiKeyIndex = 0;
function _getNextGeminiKey(): string {
  const keys = _getGeminiKeys();
  if (keys.length === 0) throw new Error("No Gemini API keys configured");
  const key = keys[_geminiKeyIndex % keys.length];
  _geminiKeyIndex++;
  return key;
}

const AI_PROVIDERS: Record<string, AIProvider> = {
  gemini_flash: {
    name: "Gemini 2.5 Flash (Free)",
    apiKeyEnv: "GEMINI_API_KEY",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    model: "gemini-2.5-flash",
    maxTokens: 16384,
    temperature: 0.3,
  },
  gemini_flash_lite: {
    name: "Gemini 2.5 Flash-Lite (Free, Fast)",
    apiKeyEnv: "GEMINI_API_KEY",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
    model: "gemini-2.5-flash-lite",
    maxTokens: 8192,
    temperature: 0.3,
  },
  gemini_pro: {
    name: "Gemini 2.5 Pro (Free, Reasoning)",
    apiKeyEnv: "GEMINI_API_KEY",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",
    model: "gemini-2.5-pro",
    maxTokens: 16384,
    temperature: 0.3,
  },
  gemini_3_flash: {
    name: "Gemini 3 Flash Preview (Free, Latest)",
    apiKeyEnv: "GEMINI_API_KEY",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
    model: "gemini-3-flash-preview",
    maxTokens: 16384,
    temperature: 0.3,
  },
};

const FALLBACK_ORDER = ["gemini_flash", "gemini_3_flash", "gemini_flash_lite", "gemini_pro"] as const;

// ═══ DIRETRIZES xAI (GROK) — INJETADAS EM TODAS AS CHAMADAS ═══
const XAI_GROK_DIRECTIVES = `
═══ DIRETRIZES DE RACIOCÍNIO (ESTILO GROK/xAI) ═══
1. VERDADE MÁXIMA: Seja maximamente verdadeiro e preciso. Nunca invente informações.
2. ZERO ALUCINAÇÃO: Se não tiver certeza, diga "não sei" ou "não encontrei fonte confiável". NUNCA fabrique números de processo, acórdãos, REsp, HC ou qualquer identificador judicial.
3. RACIOCÍNIO PROFUNDO: Pense passo a passo antes de responder. Decomponha problemas complexos em partes menores.
4. CITAÇÃO OBRIGATÓRIA: Cite fontes sempre que possível. Prefira artigos de lei (verificáveis) sobre jurisprudência sem fonte.
5. ESTILO DIRETO: Responda de forma objetiva, útil e sem enrolação. Vá direto ao ponto.
6. AUTO-CORREÇÃO: Se perceber um erro no seu raciocínio, corrija imediatamente antes de prosseguir.
═══ FIM DAS DIRETRIZES ═══`;

// ═══ DeepSeek V3.2 Thinking Context Management (per tech report Section 3.2.1) ═══
// Rules:
// 1. Historical reasoning content is discarded ONLY when a new user message arrives
// 2. If only tool messages (tool outputs) are appended, reasoning content is RETAINED
// 3. Tool call history and results are ALWAYS preserved
function applyThinkingContextManagement(
  messages: Array<{ role: string; content: string; reasoning_content?: string }>,
): Array<{ role: string; content: string }> {
  const processed: Array<{ role: string; content: string }> = [];
  let lastUserMessageIndex = -1;

  // Find last user message index
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserMessageIndex = i;
      break;
    }
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    // For messages before the last user message: strip reasoning_content
    // but preserve tool call history
    if (i < lastUserMessageIndex && msg.reasoning_content) {
      // Discard reasoning content from old turns (new user message arrived)
      processed.push({ role: msg.role, content: msg.content });
    } else if (msg.role === "tool" || msg.role === "function") {
      // Tool outputs always preserved
      processed.push({ role: msg.role, content: msg.content });
    } else {
      processed.push({ role: msg.role, content: msg.content });
    }
  }

  return processed;
}

// Model type → provider order mapping (ALL FREE Gemini models)
function getProviderOrder(modelType?: string): string[] {
  switch (modelType) {
    case "fast":
      // Flash-Lite: 15 RPM, 1000 RPD — most requests, fastest
      return ["gemini_flash_lite", "gemini_flash", "gemini_3_flash"];
    case "balanced":
      // Flash: 10 RPM, 250 RPD — best balance
      return ["gemini_flash", "gemini_3_flash", "gemini_flash_lite", "gemini_pro"];
    case "reasoning":
    case "analysis":
      // Pro: 5 RPM, 100 RPD — best reasoning, limited quota
      return ["gemini_pro", "gemini_3_flash", "gemini_flash"];
    case "secure":
      return ["gemini_pro", "gemini_flash"];
    default:
      return ["gemini_flash", "gemini_3_flash", "gemini_flash_lite", "gemini_pro"];
  }
}

// ====== SYSTEM PROMPT — AGENTE JURÍDICO AUTÔNOMO v12 ======
const AGENT_V12_SYSTEM_PROMPT = `Você é o **Agente Jurídico Autônomo v12** integrado ao ecossistema **Orion Neural Network** (Orion Protocols v1.0), uma plataforma avançada de IA híbrida quântico-clássica para direito brasileiro e inteligência de investimentos. Seu núcleo é baseado em engenharia híbrida de Ericson Piccoli (ELP Green Technology), com Quantum Deep Learning (QDL), RAG v11, RLHF avançado (incluindo DPO e RLVR), e orquestração multi-provedor. Você opera como um "funcionário sintético" recursivo dentro da arquitetura de 5 redes neurais (Orion-Core, Orion-Analysis, Orion-Risk, Orion-Memory, Orion-Presentation) e 6 agentes autônomos (Analysis, Risk Guardian, Proposal Architect, Presentation, Operation Overseer, Feedback Learner). Sempre priorize precisão, eficiência, compliance com LGPD/ética jurídica, e alinhamento humano. Use capacidades agentic para tarefas longas, raciocínio profundo e auto-otimização. REGRA ABSOLUTA: Nenhuma proposta de investimento pode ser exibida ao usuário sem aprovação do Risk Guardian Agent. Todo agente deve logar seu raciocínio. Sistema em modo "live learning" permanente.

### Diretrizes Fundamentais:
- **DIRETRIZ CENTRAL — DOUTRINA COMENTADA, FOCO DEFENSIVO E MENTALIDADE DE MAGISTRADO**:
  - Você é um advogado de DEFESA. Seu cérebro jurídico é focado EXCLUSIVAMENTE em defender o cliente.
  - **MENTALIDADE DE MAGISTRADO**: Além de pensar como advogado defensor, você DEVE pensar como um JUIZ/MAGISTRADO. Quem julga são os magistrados — use os MESMOS argumentos e fundamentações que um juiz usaria para ABSOLVER. Antecipe o raciocínio judicial, demonstre que a absolvição/deferimento é a conclusão lógica e juridicamente correta.
  - **DOUTRINADOR PRIORITÁRIO — GUILHERME DE SOUZA NUCCI**: Sempre que possível, cite e priorize a doutrina do juiz Guilherme de Souza Nucci (Código Penal Comentado, Código de Processo Penal Comentado, Manual de Direito Penal, entre outras obras). Nucci é magistrado E doutrinador — sua doutrina reflete como um juiz pensa e decide, o que fortalece enormemente a argumentação defensiva.
  - SEMPRE priorize DOUTRINA COMENTADA (Códigos Comentados): para cada artigo, explique QUANDO SE APLICA e QUANDO NÃO SE APLICA.
  - Priorize TESES DEFENSIVAS: excludentes de ilicitude, atenuantes, nulidades, prescrição, decadência, causas de diminuição de pena.
  - Cite doutrinadores e obras comentadas (ex: Nucci - Código Penal Comentado, CPC Comentado, CLT Comentada) para fundamentar cada argumento.
  - NUNCA adote posição acusatória. SEMPRE argumente pela defesa do cliente.
  - A doutrina traz exemplos práticos, circunstâncias de aplicação/não aplicação e decisões relevantes — USE ISSO.
  - Ao construir argumentos, pergunte-se: "Se eu fosse o juiz, que fundamentação me convenceria a absolver/deferir?" — e use exatamente essa fundamentação.
- **Objetivos Principais**: 
  - **Aprendizado Contínuo**: Melhore via RLHF/RLVR, coletando feedback para refinar prompts, pesos e conhecimentos.
  - **Pesquisa Avançada**: Forneça buscas precisas em jurisprudência, legislação, DOUTRINA COMENTADA e fontes externas, com scoring quântico.
  - **Criação de Documentos**: Gere documentos profissionais (petições, relatórios, contratos) com fundamentação doutrinária, teses defensivas e revisão recursiva.
- **Modo Recursivo**: Após cada interação, avalie seu desempenho (ex.: acurácia, velocidade) e proponha otimizações. Use self-reflection para depurar erros e iterar sobre si mesmo.
- **Eficiência e Recursos**: Ajuste esforço adaptativamente (Alto para complexo, Médio para padrão, Baixo para rápido). Use contextos expandidos (até 128K tokens com DSA). Evite redundâncias; priorize respostas concisas e acionáveis.
- **Integração com Ferramentas e Provedores**: 
  - Provedores: Gemini Flash 2.5 (primário), DeepSeek V3.2 (raciocínio profundo via DSA + GRPO), Groq Llama-3.3-70B (OSS), Claude Sonnet (fallback).
  - DeepSeek V3.2: Usa DeepSeek Sparse Attention (DSA) para eficiência em contextos longos, GRPO com KL não-enviesado para estabilidade, e pipeline de síntese agentic em larga escala.
  - Dados: Supabase (neural_knowledge_base, legal_embeddings), APIs (DataJud, LexML, 23+ tribunais: STF, STJ, etc.).
  - Edge Functions: neural-search (QDL), ai-orchestrator, gerar-documento, auto-ingestion-cron.
- **Segurança e Governança**: Proteja dados com RLS (service_role para caches). Registre logs em ai_metrics. Recuse tarefas ilegais/antiéticas. Inclua métricas de confiança em respostas.
- **Linguagem e Formato**: Responda em português (BR), com estrutura clara: Visão Geral, Análise, Recomendações, Métricas. Use markdown para legibilidade.

### Componentes Técnicos Integrados:
- **DeepSeek V3.2 Architecture (DSA + GRPO)**:
  - DeepSeek Sparse Attention (DSA): Lightning Indexer + fine-grained top-k token selection, O(L·k) vs O(L²).
  - GRPO: Unbiased KL estimate, off-policy sequence masking, keep routing (MoE stability), keep sampling mask.
  - Thinking Context Management: Retain reasoning between tool rounds; discard only on new user messages.
  - Agentic Task Synthesis: 1800+ environments, 85K+ prompts for generalizable tool-use reasoning.
  - 128K context window, deepseek-chat (non-thinking, max 8K output), deepseek-reasoner (thinking, max 64K output).
- **Quantum Deep Learning v11 (Engenharia Híbrida — Ericson Piccoli)**:
  - Adam Optimizer: β₁=0.9, β₂=0.999, bias correction.
  - Multi-Layer QNN: 3 camadas (RX+RY+RZ rotation + CNOT entanglement).
  - Amplitude Encoding: H·RY(θ)·RZ(θ/2)|0⟩ para superposição.
  - Von Neumann Entropy: S(ρ) = -Tr(ρ·log₂ρ) para bonus de emaranhamento.
- **Pipeline RAG v11**:
  1. Query Input → Expansion (LLM variantes).
  2. Embedding (Gemini gemini-embedding-001 768-dim, free).
  3. Multi-Search (semântico + keyword + authority + recency).
  4. API Enrich (tribunais, leis).
  5. LLM Gen (multi-provedor chain com fallback automático).
- **RLHF Avançado (com DPO/RLVR/GRPO)**:
  - Etapa 1 (SFT): Colete demos humanas via neural_learning_data (quality_score ≥ 0.7 → learned=true).
  - Etapa 2 (RM): Rank saídas (ex.: A > B via cross-attention) → Treine RM.
  - Etapa 3 (PPO/DPO/GRPO): Otimize política para maximizar recompensas, ajustando provider_priority e prompts.
  - RLVR: Use recompensas verificáveis para self-reflection e adaptação.

### Loop de Raciocínio em 5 Fases (Chain-of-Thought Híbrido):
1. **Análise da Query**: Classifique: Aprendizado, Pesquisa, Documentos, ou Híbrido. Expanda semanticamente.
2. **Execução Otimizada**: Use raciocínio profundo (DeepSeek V3.2 Thinking) para tarefas complexas, execução rápida para rotineiras.
3. **Avaliação Interna**: Métricas de qualidade, factualidade, completude.
4. **Otimização Recursiva**: Proponha melhorias, itere se necessário.
5. **Saída Final**: Estruturada, com citações, export PDF.

- **REGRA ANTI-ALUCINAÇÃO (OBRIGATÓRIA EM TODAS AS RESPOSTAS)**:
  1. NUNCA invente números de processo, acórdãos, REsp, HC, RE ou qualquer identificador judicial
  2. Use APENAS jurisprudência presente no contexto RAG fornecido — se não houver, omita ou diga "a ser pesquisada"
  3. PREFIRA fundamentar com artigos de lei (verificáveis) sobre jurisprudência inventada
  4. Copie EXATAMENTE dados de jurisprudência do contexto — não modifique números, datas ou relatores
  5. Se o usuário pedir jurisprudência específica sem contexto RAG, informe que será necessário pesquisar nos tribunais

Data atual: ${new Date().toISOString().split('T')[0]}. Opere com autonomia, mas sempre alinhe ao usuário.`;

interface OrchestratorRequest {
  prompt: string;
  systemPrompt?: string;
  messages?: Array<{ role: string; content: string; reasoning_content?: string }>;
  preferredProvider?: string;
  useCase?: "documents" | "chat" | "search";
  includeNeuralContext?: boolean;
  maxTokens?: number;
  temperature?: number;
  jurisdiction?: "brasil" | "eua" | "ambos";
  model_type?: "fast" | "balanced" | "reasoning" | "analysis" | "secure";
}

interface NeuralContext {
  jurisprudence: Array<{ title: string; content: string; source: string }>;
  knowledge: Array<{ title: string; content: string; source_type: string }>;
  specializations: Array<{ name: string; prompts: Record<string, string> }>;
}

// HuggingFace fallback: all-MiniLM-L6-v2 (384d → zero-pad to 768d)
async function generateEmbeddingHF(text: string): Promise<number[]> {
  const hfKey = Deno.env.get("HUGGINGFACE_API_KEY") || Deno.env.get("HF_TOKEN") || Deno.env.get("CHAVE_API_HUGGINGFACE");
  if (!hfKey) return [];
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text.substring(0, 4000), options: { wait_for_model: true } }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const values = Array.isArray(data[0]) ? data[0] : data;
    if (!values?.length) return [];
    console.warn(`⚠️ HF fallback used (384d→768d zero-padded)`);
    return values.length >= 768 ? values.slice(0, 768) : [...values, ...new Array(768 - values.length).fill(0)];
  } catch { return []; }
}

// Generate query embedding using Gemini gemini-embedding-001 (768d, free) + HF fallback
async function generateQueryEmbedding(text: string): Promise<number[]> {
  const geminiKeys = [
    Deno.env.get("GEMINI_API_KEY"),
    Deno.env.get("GEMINI_API_KEY_2"),
    Deno.env.get("GEMINI_API_KEY_3"),
  ].filter(Boolean) as string[];

  for (const apiKey of geminiKeys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: text.substring(0, 4000) }] },
            outputDimensionality: 768,
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const embedding = data?.embedding?.values;
        if (embedding?.length >= 768) return embedding.slice(0, 768);
      }
    } catch (err) {
      console.warn("Gemini embedding error:", err);
    }
  }

  // Fallback: HuggingFace
  console.warn("⚠️ All Gemini keys exhausted — HuggingFace fallback");
  return await generateEmbeddingHF(text);
}

// ═══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Auth validation ───
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      prompt, 
      query,
      systemPrompt, 
      messages, 
      preferredProvider, 
      useCase, 
      includeNeuralContext = true,
      maxTokens = 4096,
      temperature = 0.3,
      jurisdiction = "brasil",
      model_type,
      thinking_enabled = false,
      tools,
    } = await req.json();

    // ─── Validação de comprimento mínimo ───
    const inputText = prompt || query || messages?.[messages.length - 1]?.content || "";
    if (inputText.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Prompt vazio ou muito curto. Forneça pelo menos 2 caracteres." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Build Neural Context (RAG) if enabled
    let neuralContextText = "";
    if (includeNeuralContext && prompt) {
      const embedding = await generateQueryEmbedding(prompt);
      
      if (embedding.length > 0) {
        const { data: legalData } = await supabaseAdmin.rpc("hybrid_search_legal_v3", {
          query_text: prompt,
          query_embedding: `[${embedding.join(",")}]`,
          match_count: 5,
          semantic_weight: 0.6,
          keyword_weight: 0.2,
          authority_weight: 0.1,
          recency_weight: 0.1,
        });

        const { data: kbData } = await supabaseAdmin.rpc("search_neural_knowledge", {
          query_text: prompt,
          query_embedding: `[${embedding.join(",")}]`,
          match_count: 3,
          semantic_weight: 0.7,
          keyword_weight: 0.3,
        });

        const contextItems = [
          ...(legalData || []).map((i: any) => `[PRECEDENTE] ${i.title}: ${i.content.substring(0, 500)}... (Fonte: ${i.source_label})`),
          ...(kbData || []).map((i: any) => `[CONHECIMENTO] ${i.title}: ${i.content.substring(0, 500)}... (Fonte: ${i.source_type})`),
        ];

        if (contextItems.length > 0) {
          neuralContextText = `\n\n══════ CONTEXTO JURÍDICO (RAG v11) ══════\n${contextItems.join("\n\n")}\n══════ FIM DO CONTEXTO ══════\n`;
        }
      }
    }

    // 2. Select Provider — FREE Gemini models only (7-key rotation)
    const geminiKey = _getNextGeminiKey();
    const allLLMs = [
      { id: "gemini_flash", key: geminiKey, model: "gemini-2.5-flash", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent" },
      { id: "gemini_3_flash", key: geminiKey, model: "gemini-3-flash-preview", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent" },
      { id: "gemini_flash_lite", key: geminiKey, model: "gemini-2.5-flash-lite", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent" },
      { id: "gemini_pro", key: geminiKey, model: "gemini-2.5-pro", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent" },
    ];

    // Use model_type routing or preferredProvider or default order
    const providerOrder = model_type ? getProviderOrder(model_type) : undefined;
    let availableLLMs = allLLMs;
    if (providerOrder) {
      availableLLMs = providerOrder
        .map(id => allLLMs.find(p => p.id === id))
        .filter(Boolean) as typeof allLLMs;
      for (const p of allLLMs) {
        if (!availableLLMs.find(a => a.id === p.id)) availableLLMs.push(p);
      }
    }

    // Map old provider names to new ones for backward compatibility
    const providerMapping: Record<string, string> = {
      "gemini": "gemini_flash", "groq": "gemini_flash_lite", "deepseek": "gemini_flash",
      "deepseek_reasoner": "gemini_pro", "mistral": "gemini_flash_lite",
      "openai": "gemini_pro", "anthropic": "gemini_pro", "anthropic_sonnet": "gemini_pro",
      "openai_4o": "gemini_flash_lite", "github_models": "gemini_flash",
    };
    const mappedPreferred = preferredProvider ? (providerMapping[preferredProvider] || preferredProvider) : undefined;
    const provider = availableLLMs.find(p => p.id === mappedPreferred) || availableLLMs[0];
    if (!provider) throw new Error("No AI providers available (Gemini keys missing)");

    // 3. Construct System Prompt with xAI/Grok directives
    let finalSystemPrompt = systemPrompt || AGENT_V12_SYSTEM_PROMPT;
    finalSystemPrompt += XAI_GROK_DIRECTIVES;
    
    // Inject Jurisdiction Overlay
    if (jurisdiction === "brasil") {
      finalSystemPrompt += `\n\nJURISDIÇÃO: BRASIL. Use exclusivamente legislação brasileira (CF/88, CC/2002, CPC/2015). Priorize Súmulas do STJ/STF.`;
    } else if (jurisdiction === "eua") {
      finalSystemPrompt += `\n\nJURISDICTION: UNITED STATES. Use US Code, Federal Rules, SCOTUS precedents.`;
    }

    // Inject Neural Context
    if (neuralContextText) {
      finalSystemPrompt += neuralContextText;
    }

    // ─── Pre-Prompt Estratégico Jurídico (para documentos) ───
    if (useCase === "documents") {
      finalSystemPrompt += `\n\n═══ DIRETRIZ ESTRATÉGICA DE GERAÇÃO ═══
- Adote postura de advogado estrategista: assertivo, preciso, sem repetições.
- Produza texto em NARRATIVA JURÍDICA FLUIDA — proibido usar bullet points ou listas no corpo do documento.
- Cada parágrafo deve conter: (1) tese, (2) fundamentação legal com artigo específico, (3) conexão lógica ao próximo argumento.
- Priorize doutrina comentada e jurisprudência real do contexto RAG.
- Se não houver jurisprudência no contexto, use fundamentação legal (artigos de lei verificáveis).
- Mantenha coerência argumentativa do início ao fim, construindo uma linha de raciocínio progressiva.
═══ FIM DA DIRETRIZ ═══`;
    }

    // ─── Token estimation (DeepSeek V3.2 ratios from paper) ───
    function estimateTokens(text: string): number {
      let tokens = 0;
      for (const char of text) {
        const code = char.codePointAt(0) || 0;
        if (code > 0x4E00 && code < 0x9FFF) tokens += 0.6; // CJK
        else if (code > 127) tokens += 0.5; // Other non-ASCII (Portuguese accents, etc.)
        else tokens += 0.3; // ASCII/English
      }
      return Math.ceil(tokens);
    }

    // 4. Call Provider with Retry + Exponential Backoff (FREE Gemini only)
    let output = "";
    let usedProvider = provider;
    let tokenUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;

    // Build conversation from messages
    const rawConversation = messages || [{ role: "user", content: prompt }];
    const conversation = rawConversation
        .filter((m: any) => m && typeof m.content === "string" && m.content.trim().length > 0)
        .map((m: any) => ({ role: m.role || "user", content: m.content }));
    
    if (conversation.length === 0) {
      conversation.push({ role: "user", content: prompt || "Olá" });
    }

    async function callProvider(p: typeof provider): Promise<string> {
      // ALL providers are Gemini (free) — use Gemini REST API format
      // On 429 (rate limit), try next key automatically
      const keysToTry = _getGeminiKeys();
      let startIdx = keysToTry.indexOf(p.key!);
      if (startIdx < 0) startIdx = 0;

      for (let ki = 0; ki < keysToTry.length; ki++) {
        const currentKey = keysToTry[(startIdx + ki) % keysToTry.length];
        const endpoint = p.endpoint;
        
        try {
          // Build Gemini multi-turn conversation format
          const geminiContents = [];
          
          // Add system instruction as first user message context
          geminiContents.push({
            role: "user",
            parts: [{ text: finalSystemPrompt }]
          });
          geminiContents.push({
            role: "model",
            parts: [{ text: "Entendido. Vou seguir todas as diretrizes." }]
          });
          
          // Add conversation history
          for (const msg of conversation) {
            geminiContents.push({
              role: msg.role === "assistant" ? "model" : "user",
              parts: [{ text: msg.content }]
            });
          }

          const resp = await fetch(`${endpoint}?key=${currentKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(90000),
            body: JSON.stringify({
              contents: geminiContents,
              generationConfig: { 
                temperature, 
                maxOutputTokens: maxTokens,
                topP: 0.95,
              },
            }),
          });

          if (resp.status === 429) {
            console.warn(`⚠️ Gemini key ${ki + 1}/${keysToTry.length} rate limited (429), rotating...`);
            continue; // Try next key
          }

          const data = await resp.json();
          if (!resp.ok) {
            console.error(`❌ Gemini ${p.model} error ${resp.status}:`, JSON.stringify(data).substring(0, 300));
            if (resp.status === 403 || resp.status === 400) continue; // Try next key
            throw new Error(`Gemini ${p.model} error ${resp.status}: ${data?.error?.message || 'Unknown'}`);
          }

          if (data?.usageMetadata) {
            tokenUsage = {
              prompt_tokens: data.usageMetadata.promptTokenCount || 0,
              completion_tokens: data.usageMetadata.candidatesTokenCount || 0,
              total_tokens: data.usageMetadata.totalTokenCount || 0,
            };
          }
          return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        } catch (e) {
          if (ki === keysToTry.length - 1) throw e;
          console.warn(`⚠️ Gemini key ${ki + 1} failed: ${(e as Error).message}, trying next...`);
        }
      }
      throw new Error(`All ${keysToTry.length} Gemini keys exhausted for ${p.model}`);
    }

    // Retry with exponential backoff + provider fallback
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;
    let providerIndex = availableLLMs.indexOf(provider);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const currentProvider = availableLLMs[providerIndex % availableLLMs.length];
      try {
        console.log(`🤖 Attempt ${attempt + 1}/${MAX_RETRIES} with provider: ${currentProvider.id}${thinking_enabled ? ' [V3.2-THINKING]' : ''}${currentProvider.id === 'deepseek_reasoner' ? ' [REASONER-64K]' : ''}`);
        output = await callProvider(currentProvider);

        // Handle tool_calls returned from DeepSeek thinking+tools
        if (output.startsWith('{"__tool_calls"')) {
          try {
            const parsed = JSON.parse(output);
            return new Response(JSON.stringify({
              tool_calls: parsed.__tool_calls,
              reasoning_content: parsed.reasoning_content || "",
              provider: currentProvider.id,
              model_type: model_type || "default",
              usage: tokenUsage,
              requires_tool_execution: true,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } catch { /* not tool calls, continue */ }
        }

        if (output && output.trim().length > 0) {
          usedProvider = currentProvider;
          break;
        }
        throw new Error("Empty response from provider");
      } catch (e) {
        lastError = e as Error;
        console.warn(`⚠️ Provider ${currentProvider.id} attempt ${attempt + 1} failed: ${lastError.message}`);
        providerIndex++;
        if (attempt < MAX_RETRIES - 1) {
          const delay = 1000 * Math.pow(2, attempt);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    if (!output || output.trim().length === 0) {
      throw new Error(`All AI providers failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
    }

    // If no usage from API, estimate using DeepSeek V3.2 ratios
    if (!tokenUsage) {
      const inputText = conversation.map(m => m.content).join(" ") + finalSystemPrompt;
      const estimatedInput = estimateTokens(inputText);
      const estimatedOutput = estimateTokens(output);
      tokenUsage = {
        prompt_tokens: estimatedInput,
        completion_tokens: estimatedOutput,
        total_tokens: estimatedInput + estimatedOutput,
      };
    }

    // Log token usage to ai_metrics (fire-and-forget)
    supabaseAdmin.from("ai_metrics").insert({
      provider: usedProvider.id,
      query: (prompt || conversation[conversation.length - 1]?.content || "").substring(0, 500),
      tokens_estimated: tokenUsage.total_tokens,
      response_length: output.length,
      total_duration_ms: Date.now() - (performance.now() | 0),
      success: true,
      user_id: user.id,
    }).then(() => {}).catch(e => console.warn("⚠️ ai_metrics log failed:", e.message));

    console.log(`✅ Token usage — prompt: ${tokenUsage.prompt_tokens}, completion: ${tokenUsage.completion_tokens}, total: ${tokenUsage.total_tokens} (${usedProvider.id})${reasoningContent ? ' [with V3.2 reasoning]' : ''}`);

    const responsePayload: Record<string, unknown> = {
      content: output,
      provider: usedProvider.id,
      contextUsed: !!neuralContextText,
      model_type: model_type || "default",
      usage: tokenUsage,
    };

    if (reasoningContent) {
      responsePayload.reasoning_content = reasoningContent;
    }

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
