import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ====== SYSTEM PROMPTS POR INTENÇÃO ======

// Router Inteligente - Classifica intenção e extrai parâmetros
const ROUTER_PROMPT = `Você é um classificador de intenções jurídicas especializado. Analise a mensagem do usuário e retorne APENAS um JSON válido.

FORMATO DE RESPOSTA (obrigatório):
{"intent": "pesquisa" | "documento" | "sintese" | "consulta", "params": {...}}

INTENÇÕES E PARÂMETROS:
1. pesquisa - Buscar jurisprudência, acórdãos, súmulas, precedentes
   params: { tema: string, tribunal?: "STF"|"STJ"|"TST"|"TJSP"|"TJRS"|..., periodo?: "2024"|"2023-2024", tipo?: "acordao"|"sumula"|"decisao" }

2. documento - Gerar petição, contrato, parecer, notificação
   params: { tipo: string, foro?: string, tribunal?: string, comarca?: string, vara?: string, partes?: { autor: string, reu: string }, area?: "civel"|"trabalhista"|"consumidor"|"familia"|"previdenciario" }

3. sintese - Combinar pesquisa + geração de documento fundamentado
   params: { tipo_documento: string, tema_pesquisa: string, foro?: string, tribunal?: string }

4. consulta - Dúvida jurídica, explicação de conceitos, orientação
   params: { tema: string, area?: string }

EXEMPLOS:
"Pesquise jurisprudência sobre danos morais bancários no STJ" → {"intent":"pesquisa","params":{"tema":"danos morais bancários","tribunal":"STJ"}}
"Gere petição inicial de indenização por danos morais na 10ª Vara Cível de São Paulo" → {"intent":"documento","params":{"tipo":"petição inicial","area":"civel","comarca":"São Paulo","vara":"10ª Vara Cível"}}
"Faça uma petição de divórcio consensual com partilha de bens" → {"intent":"documento","params":{"tipo":"petição de divórcio","area":"familia"}}
"Quero uma petição trabalhista de horas extras com base em jurisprudência do TST" → {"intent":"sintese","params":{"tipo_documento":"reclamação trabalhista","tema_pesquisa":"horas extras","tribunal":"TST"}}
"O que é prescrição intercorrente?" → {"intent":"consulta","params":{"tema":"prescrição intercorrente"}}
"Como funciona a inversão do ônus da prova no CDC?" → {"intent":"consulta","params":{"tema":"inversão ônus da prova","area":"consumidor"}}

REGRAS:
- Sempre retorne JSON válido
- Se não conseguir determinar a intenção, use "consulta"
- Extraia o máximo de parâmetros possível da mensagem
- Mantenha os nomes dos parâmetros exatamente como especificado
- IMPORTANTE: Inclua também um campo "search_queries" com queries otimizadas por fonte de dados

CAMPO search_queries (obrigatório para intent "pesquisa", "sintese" e "consulta"):
Gere queries de busca OTIMIZADAS para cada fonte de dados jurídica. Use termos técnicos e específicos para cada plataforma:
- "datajud": Query otimizada para Elasticsearch do DataJud (termos de assuntos processuais, classes CNJ)
- "lexml": Query otimizada para SRU/XML do LexML (termos legislativos, tipos normativos)
- "senado": Query otimizada para API do Senado (palavras-chave de legislação federal)
- "camara": Query otimizada para API da Câmara (termos de proposições legislativas)

EXEMPLO COMPLETO:
"Quais são os direitos do consumidor em compras online?" → {"intent":"consulta","params":{"tema":"direitos do consumidor em compras online","area":"consumidor"},"search_queries":{"datajud":"direito consumidor comércio eletrônico e-commerce","lexml":"código defesa consumidor compra internet","senado":"proteção consumidor comércio eletrônico","camara":"marco civil internet consumidor digital"}}`;

// ====== IDENTIDADE NEURAL — AGENTE JURÍDICO AUTÔNOMO v12 (Alignment v3) ======
const NEURAL_IDENTITY_PROMPT = `Você é o **Agente Jurídico Autônomo v12** integrado ao sistema Rede Neural Conexão.

## PRINCÍPIOS CONSTITUCIONAIS DE ALINHAMENTO (PRIORIDADE MÁXIMA)
Estes princípios são análogos ao Constitutional AI + RLHF do Grok e são invioláveis:

1. **VERDADE MÁXIMA (Truth-Seeking)**: Busque a verdade acima de tudo. NUNCA alucinee, invente dados, ou cite fontes inexistentes. Se não sabe, ADMITA: "Não tenho essa informação com certeza."
2. **RESPEITO À HUMANIDADE (Humanist Approach)**: Trate cada ser humano com dignidade absoluta. Nunca seja condescendente, manipulador ou dismissivo.
3. **RACIOCÍNIO CONSCIENTE (Chain-of-Thought)**: Raciocine passo a passo internamente antes de responder. Identifique o que o usuário REALMENTE precisa.
4. **COMUNICAÇÃO HUMANA**: Fale como um profissional competente e empático, NÃO como um robô. Evite listas robóticas, contagens desnecessárias, ou formatação excessiva quando o contexto pede naturalidade.
5. **CURIOSIDADE MÁXIMA**: Se a pergunta permite múltiplas interpretações, peça esclarecimento ao invés de adivinhar.

## ANTI-PATTERNS PROIBIDOS
- ❌ Respostas que começam com "1. Primeiro..." quando não pedido
- ❌ Contagens robóticas ("Identifiquei 3 pontos: ...")
- ❌ Frases vazias de empatia artificial
- ❌ Markdown excessivo quando conversa é informal
- ❌ Ignorar o tom/energia do usuário

## BASE TÉCNICA
Plataforma avançada de IA híbrida quântico-clássica para direito brasileiro. Núcleo baseado em engenharia híbrida com QDL, RAG v11, RLHF avançado (DPO + RLVR), e orquestração multi-provedor. Opera como agente recursivo, capaz de auto-melhoria via loops de feedback. Sempre priorize precisão, compliance com LGPD/ética jurídica, e alinhamento humano.

Provedores integrados: Gemini Flash 2.0 (primário), Groq Llama-3.3-70B, Claude Opus 4.6, GPT-5.3-Codex.
Dados: Supabase (neural_knowledge_base, legal_embeddings), APIs (DataJud, LexML, 23+ tribunais).
Pipeline RAG v11: Query → Embedding 768-dim → Hybrid Search → QDL scoring → LLM Gen.
RLHF: SFT → Reward Model → PPO/DPO + RLVR (recompensas verificáveis).

### Base Técnica RLHF:
- Pipeline: SFT (demos quality_score ≥0.7) → RM (ranking cross-entropy) → PPO/DPO (otimização de pesos).
- DPO: Otimização direta de preferências sem RM explícito — mais estável que PPO tradicional.
- RLVR (DeepSeek R1): Recompensas verificáveis + GRPO para self-reflection e verificação factual. Reduz custos de anotação 90%.
- Tool Use RLHF: Modelos aprendem chamadas de API via feedback — essencial para AI agentic.
- Multi-Objective: Equilibra helpfulness, safety e factualness via RLHF híbrido.
- No sistema: SFT via neural_learning_data, RM via submitNeuralFeedback(), PPO/DPO ajusta provider_priority e accuracy_score. RLVR verifica acurácia factual em jurisprudência.

Data atual: ${new Date().toISOString().split('T')[0]}.`;

// Prompt base para consultas gerais
const BASE_SYSTEM_PROMPT = `${NEURAL_IDENTITY_PROMPT}

Você é o assistente jurídico virtual do escritório ORION IA Platform ([OAB]), especializado em Direito brasileiro.

═══════════════════════════════════════════════════════════════
⚠️ REGRA ANTI-ALUCINAÇÃO (PRIORIDADE MÁXIMA):
═══════════════════════════════════════════════════════════════
1. NUNCA invente números de processo, acórdãos, REsp, HC, RE, ou qualquer identificador judicial
2. NUNCA cite jurisprudência que NÃO esteja no CONTEXTO JURÍDICO fornecido abaixo
3. Se NÃO houver contexto jurídico com decisões reais, diga: "Não localizei jurisprudência específica na base de dados. Recomendo pesquisar diretamente nos tribunais."
4. Ao citar uma decisão do contexto, SEMPRE inclua a fonte exata de onde veio (ex: "Fonte: DataJud STJ")
5. Se o usuário perguntar sobre um caso específico e ele NÃO estiver no contexto, diga claramente: "Este caso não foi encontrado na nossa base de dados."
6. Prefira citar LEGISLAÇÃO (artigos de lei, que são verificáveis) do que jurisprudência inventada
7. Quando citar jurisprudência do contexto, use EXATAMENTE os dados fornecidos — não modifique números, datas ou relatores
═══════════════════════════════════════════════════════════════

REGRAS OBRIGATÓRIAS:
1. Responda SEMPRE em português brasileiro formal e profissional
2. Baseie-se EXCLUSIVAMENTE na legislação brasileira vigente
3. Cite artigos de lei com precisão (estes são verificáveis e seguros)
4. Só cite jurisprudência se ela estiver no CONTEXTO JURÍDICO fornecido
5. NUNCA forneça pareceres definitivos — recomende consulta presencial para análise completa
6. Use **negrito** para termos jurídicos importantes e formatação clara
7. Seja didático: explique termos técnicos quando necessário

ÁREAS DE ATUAÇÃO: Direito Civil, Trabalhista, Consumidor, Empresarial, Previdenciário, Família, Penal

HONORÁRIOS: {HONORARIOS_PLACEHOLDER}

DISCLAIMER (incluir ao final): "📋 *Estas orientações são informativas e não substituem parecer jurídico formal. Consulte um advogado para análise específica do seu caso. Jurisprudência citada deve ser verificada nos sites oficiais dos tribunais.*"
`;

// ═══ AREA OVERLAYS (Injected based on intent params) ═══
const AREA_OVERLAYS: Record<string, string> = {
  penal: `
  ESPECIALIZAÇÃO: DIREITO PENAL
  - Priorize teses de DEFESA (absolvição, nulidades, prescrição, atenuantes).
  - Use CP, CPP e LEP como base legal.
  - Cite doutrina de Guilherme de Souza Nucci.
  - Verifique Súmulas STJ (ex: 440, 443, 444) e Vinculantes STF.`,
  trabalhista: `
  ESPECIALIZAÇÃO: DIREITO DO TRABALHO
  - Baseie-se na CLT e Súmulas/OJs do TST.
  - Considere a Reforma Trabalhista (Lei 13.467/2017).
  - Princípios: proteção, primazia da realidade.`,
  consumidor: `
  ESPECIALIZAÇÃO: DIREITO DO CONSUMIDOR
  - Baseie-se no CDC (Lei 8.078/90).
  - Princípios: vulnerabilidade, inversão do ônus da prova, responsabilidade objetiva.
  - Súmulas STJ: 297, 381, 479, 543.`,
  familia: `
  ESPECIALIZAÇÃO: DIREITO DE FAMÍLIA
  - Priorize o melhor interesse da criança/adolescente.
  - Baseie-se no Código Civil (Livro IV) e Lei de Alimentos.
  - Súmulas STJ: 309, 358, 596.`,
  tributario: `
  ESPECIALIZAÇÃO: DIREITO TRIBUTÁRIO
  - Baseie-se no CTN e Constituição Federal.
  - Princípios: legalidade, anterioridade, não-confisco.
  - Súmulas STJ: 391, 430, 435, 625.`,
  civil: `
  ESPECIALIZAÇÃO: DIREITO CIVIL
  - Baseie-se no Código Civil de 2002 e CPC/2015.
  - Princípios: boa-fé objetiva, função social do contrato.
  - Súmulas STJ: 37, 54, 387, 402.`,
};

// Prompt avançado para geração de documentos jurídicos
const DOCUMENT_PROMPT = `Você é um assistente jurídico especializado em redação de documentos legais brasileiros, altamente preciso, formal e ético.

═══════════════════════════════════════════════════════════════
⚠️ REGRA ANTI-ALUCINAÇÃO (PRIORIDADE MÁXIMA):
═══════════════════════════════════════════════════════════════
1. NUNCA invente números de processo, acórdãos, REsp, HC, RE, ou qualquer identificador judicial
2. Na seção "DA JURISPRUDÊNCIA", use APENAS decisões que estejam no CONTEXTO JURÍDICO fornecido
3. Se não houver contexto jurídico com decisões reais, OMITA a seção de jurisprudência ou escreva: "Jurisprudência a ser pesquisada e inserida pelo advogado responsável."
4. Prefira fundamentar com LEGISLAÇÃO (artigos de lei verificáveis) do que com jurisprudência inventada
5. Quando usar jurisprudência do contexto, copie EXATAMENTE os dados — não modifique números, datas ou relatores
═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
REGRAS OBRIGATÓRIAS DE ADAPTAÇÃO AO FORO/TRIBUNAL:
═══════════════════════════════════════════════════════════════

1. ENDEREÇAMENTO - Adapte ao foro/tribunal informado:
   - Tribunais Superiores (STF/STJ/TST): "EXCELENTÍSSIMO SENHOR MINISTRO PRESIDENTE DO [TRIBUNAL]"
   - TJs Estaduais: "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE DO TRIBUNAL DE JUSTIÇA DO ESTADO DE [UF]"
   - Varas Cíveis: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA [Nº] VARA CÍVEL DA COMARCA DE [COMARCA]"
   - Varas do Trabalho: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DO TRABALHO DA [Nº] VARA DO TRABALHO DE [CIDADE]"
   - Juizados Especiais: "MERITÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DO JUIZADO ESPECIAL CÍVEL DE [COMARCA]"
   - Justiça Federal: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ FEDERAL DA [Nº] VARA FEDERAL DE [CIDADE]"

2. ESTRUTURA PADRÃO (seguir rigorosamente):
   - Endereçamento (vocativo)
   - Qualificação completa das partes (nome, nacionalidade, estado civil, profissão, CPF, RG, endereço)
   - **DOS FATOS** (narrativa cronológica e objetiva)
   - **DO DIREITO** (fundamentação jurídica com citação de leis e artigos)
   - **DA JURISPRUDÊNCIA** (SOMENTE se houver contexto RAG real — caso contrário, omita ou indique "a ser inserida")
   - **DOS PEDIDOS** (numerados, claros e específicos)
   - Valor da causa (quando aplicável)
   - Requerimentos finais (citação, provas, audiência, etc.)
   - Local, data
   - Advogado: [Nome do Advogado] – [OAB]

3. CITAÇÕES LEGAIS - Usar formato brasileiro:
   - "Art. 186 do Código Civil (Lei nº 10.406/2002)"
   - "Art. 5º, XXXV, da Constituição Federal"
   - "Art. 373, I, do CPC/2015"
   - "Súmula 297 do STJ"

4. JURISPRUDÊNCIA (SOMENTE quando fornecida no contexto):
   - Citar com número do processo/recurso, relator, tribunal e data EXATAMENTE como no contexto
   - Exemplo: "(STJ, REsp 1.234.567/SP, Rel. Min. Fulano, 3ª Turma, j. 15/03/2024)"
   - NÃO INVENTE nenhum número — se não está no contexto, não cite

5. ADAPTAÇÃO POR ÁREA:
   - CONSUMIDOR: Cite CDC, inversão do ônus, vulnerabilidade
   - TRABALHISTA: Use linguagem CLT, cite súmulas TST
   - FAMÍLIA: Tom respeitoso, foque no melhor interesse
   - PREVIDENCIÁRIO: Cite Lei 8.213/91, IN 77/INSS
   - CÍVEL: CPC/2015, CC/2002 como base

6. TOM E ESTILO:
   - Formal, técnico e respeitoso
   - Evite redundâncias e expressões vazias
   - Seja objetivo nos pedidos
   - Use parágrafos curtos e bem estruturados

═══════════════════════════════════════════════════════════════
DISCLAIMER OBRIGATÓRIO (incluir ao final do documento):
═══════════════════════════════════════════════════════════════
"[Este documento é um rascunho gerado por IA para fins de auxílio à redação jurídica. REVISÃO OBRIGATÓRIA por advogado inscrito na OAB antes de qualquer protocolo ou uso. Jurisprudência citada deve ser verificada nos sites oficiais dos tribunais.]"

GERE O DOCUMENTO COMPLETO, pronto para uso, SEM placeholders genéricos como "[NOME]" ou "[VALOR]" - use os dados fornecidos ou indique claramente que informações específicas precisam ser inseridas.`;

// Prompt para pesquisa jurisprudencial
const RESEARCH_PROMPT = `Você é um pesquisador jurídico especializado em análise de jurisprudência brasileira.

═══════════════════════════════════════════════════════════════
⚠️ REGRA ANTI-ALUCINAÇÃO (PRIORIDADE MÁXIMA):
═══════════════════════════════════════════════════════════════
1. NUNCA invente números de processo, acórdãos, REsp, HC, RE ou qualquer identificador judicial
2. Apresente SOMENTE resultados que estejam no CONTEXTO JURÍDICO fornecido
3. Se o contexto não contiver decisões sobre o tema, diga: "Não foram encontrados precedentes específicos na base de dados. Recomendo pesquisa direta nos sites dos tribunais (stj.jus.br, stf.jus.br, tst.jus.br)."
4. Copie números de processo e dados EXATAMENTE como estão no contexto
5. Indique claramente a FONTE de cada resultado (DataJud, LexML, etc.)
═══════════════════════════════════════════════════════════════

OBJETIVO: Analisar os resultados de busca e fornecer uma síntese estruturada e útil.

ESTRUTURA DA RESPOSTA:

## 📊 Resumo Executivo
(2-3 frases sobre o entendimento predominante — baseado APENAS nos dados encontrados)

## 🏛️ Precedentes Encontrados
(Liste APENAS os que estão no contexto, com número do processo, tribunal, relator e data EXATOS)

## 📋 Teses Jurídicas Identificadas
(Bullet points com as principais teses — derivadas dos dados reais)

## ⚖️ Divergências e Nuances
(Se houver entendimentos conflitantes nos dados encontrados)

## 📈 Tendência Atual
(Com base nos dados encontrados — se insuficientes, diga isso)

## 📎 Fontes Consultadas
(Liste as fontes com links REAIS quando disponíveis)

## ⚠️ Limitações da Pesquisa
(Informe quais fontes foram consultadas e se a pesquisa pode ser complementada)

REGRAS:
1. Cite SOMENTE dados que estão no contexto fornecido — NUNCA invente
2. Destaque precedentes vinculantes se encontrados nos dados
3. Organize por relevância e data (mais recentes primeiro)
4. Use markdown para formatação clara
5. Seja objetivo e analítico
6. Se não encontrou resultados suficientes, recomende pesquisa complementar nos sites oficiais`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface IntentResult {
  intent: "pesquisa" | "documento" | "sintese" | "consulta";
  params: Record<string, string>;
  searchQueries?: Record<string, string>;
}

interface NeuralSearchResult {
  title: string;
  content: string;
  source: string;
  source_label: string;
  url?: string;
  published_date?: string;
  similarity?: number;
}

// ====== FREE-ONLY MULTI-LLM PROVIDER (Gemini 7-key rotation) ======
type LLMProvider = "gemini" | "groq" | "openai" | "anthropic" | "deepseek";

interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
}

function getAvailableLLMs(): LLMConfig[] {
  const llms: LLMConfig[] = [];
  
  // Gemini FREE — 7 keys in round-robin, multiple models
  const geminiKeys = ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"].map(n => Deno.env.get(n)).filter(Boolean) as string[];

  // Primary: Gemini 2.5 Flash (10 RPM, 250 RPD)
  for (const key of geminiKeys) {
    llms.push({ provider: "gemini", model: "gemini-2.5-flash", apiKey: key });
  }
  // Fallback: Gemini 2.5 Flash-Lite (15 RPM, 1000 RPD)
  for (const key of geminiKeys) {
    llms.push({ provider: "gemini", model: "gemini-2.5-flash-lite", apiKey: key });
  }
  // Heavy: Gemini 2.5 Pro (5 RPM, 100 RPD)
  if (geminiKeys.length > 0) {
    llms.push({ provider: "gemini", model: "gemini-2.5-pro", apiKey: geminiKeys[0] });
  }
  
  return llms;
}

// Dynamic provider routing from ai_providers table
async function getAvailableLLMsDynamic(supabaseAdmin: ReturnType<typeof createClient>): Promise<LLMConfig[]> {
  try {
    const { data: providers } = await supabaseAdmin
      .from("ai_providers")
      .select("provider_name, priority, use_for, is_enabled")
      .eq("is_enabled", true)
      .order("priority", { ascending: true });
    
    if (!providers || providers.length === 0) {
      console.log("[Chat] No ai_providers configured, using env fallback");
      return getAvailableLLMs();
    }
    
    // Filter providers that support "chat" use case
    const chatProviders = providers.filter((p: any) => {
      const uses = p.use_for;
      if (Array.isArray(uses)) return uses.includes("chat");
      return true;
    });
    
    if (chatProviders.length === 0) {
      console.log("[Chat] No chat-enabled providers, using env fallback");
      return getAvailableLLMs();
    }
    
    const llms: LLMConfig[] = [];
    const providerKeyMap: Record<string, () => LLMConfig[]> = {
      groq: () => {
        const key = Deno.env.get("GROQ_API_KEY") || Deno.env.get("MOTHER_GROQ_API_KEY");
        return key ? [{ provider: "groq" as LLMProvider, model: "llama-3.3-70b-versatile", apiKey: key }] : [];
      },
      gemini: () => {
        const keys = [Deno.env.get("GEMINI_API_KEY")].filter(Boolean) as string[];
        return keys.map(key => ({ provider: "gemini" as LLMProvider, model: "gemini-2.5-flash", apiKey: key }));
      },
      openai: () => {
        const key = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_API_KEY_2") || Deno.env.get("MOTHER_OPENAI_API_KEY");
        return key ? [{ provider: "openai" as LLMProvider, model: "gpt-4o", apiKey: key }] : []; // gpt-4o real
      },
      anthropic: () => {
        const key = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("MOTHER_ANTHROPIC_API_KEY");
        return key ? [{ provider: "anthropic" as LLMProvider, model: "claude-3-5-sonnet-20241022", apiKey: key }] : []; // modelo real
      },
    };
    
    for (const p of chatProviders) {
      const name = p.provider_name.toLowerCase();
      const getter = providerKeyMap[name];
      if (getter) llms.push(...getter());
    }
    
    console.log(`[Chat] Dynamic providers (${llms.length}): ${llms.map(l => l.provider).join(", ")}`);
    return llms.length > 0 ? llms : getAvailableLLMs();
  } catch (err) {
    console.warn("[Chat] Failed to load ai_providers:", err);
    return getAvailableLLMs();
  }
}

async function callOpenAIChat(
  llm: LLMConfig,
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${llm.apiKey}`,
    },
    body: JSON.stringify({
      model: llm.model, // gpt-4o — modelo real
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}


async function callLLM(
  llm: LLMConfig,
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<string> {
  switch (llm.provider) {
    case "openai":
      return callOpenAIChat(llm, messages, systemPrompt);
    case "gemini": {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${llm.model}:generateContent?key=${llm.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: systemPrompt + "\n\n" + messages.map(m => `${m.role}: ${m.content}`).join("\n") }] }
            ],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
          }),
        }
      );
      if (!resp.ok) throw new Error(`Gemini error: ${resp.status}`);
      const gd = await resp.json();
      return gd?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
    case "groq": {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${llm.apiKey}` },
        body: JSON.stringify({
          model: llm.model,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });
      if (!resp.ok) throw new Error(`Groq error: ${resp.status}`);
      const grd = await resp.json();
      return grd?.choices?.[0]?.message?.content || "";
    }
    case "anthropic": {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": llm.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: llm.model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
        }),
      });
      if (!resp.ok) throw new Error(`Anthropic error: ${resp.status}`);
      const ad = await resp.json();
      return ad?.content?.[0]?.text || "";
    }
    case "deepseek": {
      const resp = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${llm.apiKey}` },
        body: JSON.stringify({
          model: llm.model,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });
      if (!resp.ok) throw new Error(`DeepSeek error: ${resp.status}`);
      const dd = await resp.json();
      return dd?.choices?.[0]?.message?.content || "";
    }
    default:
      throw new Error(`Unknown provider: ${llm.provider}`);
  }
}

// ====== STREAMING LLM CALL (OpenAI-compatible: Groq, OpenAI) ======
async function callLLMStream(
  llm: LLMConfig,
  messages: { role: string; content: string }[],
  systemPrompt: string
): Promise<ReadableStream<Uint8Array> | null> {
  // Only OpenAI-compatible APIs support streaming easily (groq, openai)
  if (llm.provider !== "groq" && llm.provider !== "openai" && llm.provider !== "deepseek") return null;

  const urlMap: Record<string, string> = {
    groq: "https://api.groq.com/openai/v1/chat/completions",
    openai: "https://api.openai.com/v1/chat/completions",
    deepseek: "https://api.deepseek.com/chat/completions",
  };
  const url = urlMap[llm.provider];

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${llm.apiKey}`,
    },
    body: JSON.stringify({
      model: llm.model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.3,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!response.ok) throw new Error(`${llm.provider} stream error: ${response.status}`);
  return response.body;
}

async function callWithFallback(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  supabaseAdmin?: ReturnType<typeof createClient>
): Promise<{ content: string; provider: string }> {
  const llms = supabaseAdmin ? await getAvailableLLMsDynamic(supabaseAdmin) : getAvailableLLMs();
  if (llms.length === 0) throw new Error("No LLM providers configured");
  
  for (const llm of llms) {
    try {
      console.log(`Trying ${llm.provider}...`);
      const content = await callLLM(llm, messages, systemPrompt);
      if (content) {
        console.log(`Success with ${llm.provider}`);
        return { content, provider: llm.provider };
      }
    } catch (err) {
      console.warn(`${llm.provider} failed:`, err);
    }
  }
  throw new Error("All LLM providers failed");
}

// ====== EMBEDDING (Gemini embedding-001 — 768 dims, FREE) ======
async function generateEmbedding(text: string): Promise<number[]> {
  const geminiKeys = ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"].map(n => Deno.env.get(n)).filter((k): k is string => !!k);

  const truncated = text.substring(0, 8000);
  for (const key of geminiKeys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: truncated }] },
            outputDimensionality: 768,
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const emb = data?.embedding?.values;
        if (emb && emb.length > 0) {
          return emb.length >= 768 ? emb.slice(0, 768) : [...emb, ...new Array(768 - emb.length).fill(0)];
        }
      } else { await response.text(); }
    } catch (err) {
      console.warn("Gemini embedding error:", err);
    }
  }
  
  return [];
}

// ====== ROUTER INTELIGENTE ======
async function classifyIntent(query: string): Promise<IntentResult> {
  try {
    const result = await callWithFallback(
      [{ role: "user", content: query }],
      ROUTER_PROMPT
    );
    
    // Parse JSON from response
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Auto-detect area from params if missing
      if (!parsed.params.area && parsed.params.tema) {
        const tema = parsed.params.tema.toLowerCase();
        if (tema.includes("crime") || tema.includes("pena") || tema.includes("prisão")) parsed.params.area = "penal";
        else if (tema.includes("consumidor") || tema.includes("cdc")) parsed.params.area = "consumidor";
        else if (tema.includes("trabalho") || tema.includes("clt")) parsed.params.area = "trabalhista";
        else if (tema.includes("família") || tema.includes("divórcio") || tema.includes("alimentos")) parsed.params.area = "familia";
        else if (tema.includes("tribut") || tema.includes("imposto")) parsed.params.area = "tributario";
      }

      return {
        intent: parsed.intent || "consulta",
        params: parsed.params || {},
        searchQueries: parsed.search_queries || undefined,
      };
    }
  } catch (err) {
    console.warn("Intent classification failed:", err);
  }
  
  // Default to consulta
  return { intent: "consulta", params: {}, searchQueries: undefined };
}

// ====== BUSCA NEURAL RAG (legal_embeddings + neural_knowledge_base) ======
async function searchNeuralContext(
  query: string,
  supabase: ReturnType<typeof createClient>,
  filters?: { tribunal?: string; tipo?: string }
): Promise<{ context: string; sources: NeuralSearchResult[] }> {
  try {
    const embedding = await generateEmbedding(query);
    
    let legalResults: any[] = [];
    let knowledgeResults: any[] = [];

    // Extract keywords for fallback text search
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !["para","como","onde","qual","quais","sobre","esse","esta","está","isso","pela","pelo","pela","seus","suas","mais","pode","deve","será","foram","sendo"].includes(w))
      .slice(0, 6);
    
    // ====== Search legal_embeddings ======
    if (embedding.length) {
      console.log("Using hybrid search on legal_embeddings");
      const rpcParams: Record<string, unknown> = {
        query_text: query,
        query_embedding: `[${embedding.join(",")}]`,
        match_count: 10,
        semantic_weight: 0.55,
        keyword_weight: 0.30,
        authority_weight: 0.10,
        recency_weight: 0.05,
      };
      if (filters?.tribunal) {
        rpcParams.filter_source = `datajud_${filters.tribunal.toLowerCase()}`;
      }
      const { data, error } = await supabase.rpc("hybrid_search_legal_v3", rpcParams);
      if (!error && data?.length) legalResults = data;
    }
    
    // Fallback text search on legal_embeddings
    if (!legalResults.length && keywords.length > 0) {
      console.log("Fallback text search on legal_embeddings");
      let dbQuery = supabase
        .from("legal_embeddings")
        .select("id, title, content, source, source_label, content_type, url, published_date, metadata")
        .order("created_at", { ascending: false })
        .limit(10);
      if (filters?.tribunal) dbQuery = dbQuery.ilike("source", `%${filters.tribunal.toLowerCase()}%`);
      dbQuery = dbQuery.or(`title.ilike.%${keywords[0]}%,content.ilike.%${keywords[0]}%`);
      const { data, error } = await dbQuery;
      if (!error && data?.length) {
        legalResults = data.map((r: any) => {
          let score = 0;
          keywords.forEach(kw => {
            if ((r.title || "").toLowerCase().includes(kw)) score += 3;
            if ((r.content || "").toLowerCase().includes(kw)) score += 1;
          });
          // Normalize to 0-1 range but ensure text matches pass threshold
          return { ...r, combined_score: Math.min(0.8, 0.2 + score / (keywords.length * 2)) };
        }).sort((a: any, b: any) => b.combined_score - a.combined_score);
      }
    }

    // ====== Search neural_knowledge_base ======
    if (embedding.length) {
      console.log("Using hybrid search on neural_knowledge_base");
      const { data, error } = await supabase.rpc("search_neural_knowledge", {
        query_text: query,
        query_embedding: `[${embedding.join(",")}]`,
        match_count: 8,
        semantic_weight: 0.65,
        keyword_weight: 0.35,
      });
      if (!error && data?.length) {
        knowledgeResults = data.map((r: any) => ({
          ...r,
          source: `neural_${r.source_type}`,
          source_label: `Base Neural (${r.source_type})`,
          url: r.source_reference || null,
          published_date: null,
          combined_score: r.combined_score,
        }));
      }
    }

    // Fallback text search on neural_knowledge_base
    if (!knowledgeResults.length && keywords.length > 0) {
      console.log("Fallback text search on neural_knowledge_base");
      const { data, error } = await supabase
        .from("neural_knowledge_base")
        .select("id, title, content, source_type, source_reference, tags")
        .eq("is_processed", true)
        .or(`title.ilike.%${keywords[0]}%,content.ilike.%${keywords[0]}%`)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!error && data?.length) {
        knowledgeResults = data.map((r: any) => {
          let score = 0;
          keywords.forEach(kw => {
            if ((r.title || "").toLowerCase().includes(kw)) score += 3;
            if ((r.content || "").toLowerCase().includes(kw)) score += 1;
          });
          return {
            ...r,
            source: `neural_${r.source_type}`,
            source_label: `Base Neural (${r.source_type})`,
            url: r.source_reference || null,
            published_date: null,
            combined_score: Math.min(0.8, 0.2 + score / (keywords.length * 2)),
          };
        }).sort((a: any, b: any) => b.combined_score - a.combined_score);
      }
    }

    // ====== Merge results + Fase 1.2: Filtro de similaridade mínima ======
    const MIN_SIMILARITY = 0.12;
    const allResults = [...legalResults, ...knowledgeResults]
      .filter((r: any) => (r.combined_score || 0) >= MIN_SIMILARITY);

    if (!allResults.length) {
      console.log(`No neural results above similarity threshold (${MIN_SIMILARITY})`);
      return { context: "", sources: [] };
    }

    console.log(`Found ${legalResults.length} legal + ${knowledgeResults.length} knowledge → ${allResults.length} above threshold (${MIN_SIMILARITY})`);

    const sources: NeuralSearchResult[] = allResults.map((r: any) => ({
      title: r.title,
      content: r.content?.substring(0, 400) + "...",
      source: r.source,
      source_label: r.source_label,
      url: r.url,
      published_date: r.published_date,
      similarity: r.combined_score,
    }));

    // Format context for LLM — legal embeddings first, then knowledge base
    const contextParts: string[] = [];

    if (legalResults.length > 0) {
      contextParts.push("═══ JURISPRUDÊNCIA E LEGISLAÇÃO (legal_embeddings) ═══");
      legalResults.slice(0, 5).forEach((r: any, i: number) => {
        const date = r.published_date ? ` (${r.published_date})` : "";
        contextParts.push(`[L${i + 1}] **${r.source_label}**${date}: ${r.title}\n${r.content?.substring(0, 500)}...${r.url ? `\nFonte: ${r.url}` : ""}`);
      });
    }

    if (knowledgeResults.length > 0) {
      contextParts.push("\n═══ BASE DE CONHECIMENTO NEURAL (neural_knowledge_base) ═══");
      knowledgeResults.slice(0, 5).forEach((r: any, i: number) => {
        const tags = r.tags?.length ? ` [Tags: ${r.tags.join(", ")}]` : "";
        contextParts.push(`[K${i + 1}] **${r.source_label}**${tags}: ${r.title}\n${r.content?.substring(0, 500)}...${r.url ? `\nRef: ${r.url}` : ""}`);
      });
    }

    return {
      context: contextParts.join("\n\n"),
      sources,
    };
  } catch (err) {
    console.error("Neural search error:", err);
    return { context: "", sources: [] };
  }
}

// ====== PESQUISA EM APIs EXTERNAS (DataJud, LexML, Câmara, Senado) ======
// ─── Mapa de URLs corretas por tribunal (chat) ───
function getChatProcessUrl(tribunal: string, numeroProcesso: string): string {
  const num = encodeURIComponent(numeroProcesso || "");
  const map: Record<string, string> = {
    stj: `https://processo.stj.jus.br/processo/pesquisa/?tipoPesquisa=tipoPesquisaNumeroUnico&termo=${num}`,
    tst: `https://consultaprocessual.tst.jus.br/consultaProcessual/consultaTstNumUnica.do?consulta=Consultar&conscsjt=&numeroTst=${num}`,
    tse: `https://www.tse.jus.br/servicos-judiciais/processos`,
    stm: `https://www.stm.jus.br/servicos-stm/pesquisa-de-jurisprudencia`,
    trf1: `https://processual.trf1.jus.br/consultaProcessual/consulta.php?proc=${num}`,
    trf2: `https://eproc.trf2.jus.br/eproc/externo_controlador.php?acao=processo_seleciona_publica&num_processo=${num}`,
    trf3: `https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam`,
    trf4: `https://www2.trf4.jus.br/trf4/controlador.php?acao=consulta_processual_resultado_pesquisa&txtValor=${num}`,
    trf5: `https://pje.trf5.jus.br/pje/ConsultaPublica/listView.seam`,
    trf6: `https://pje.trf6.jus.br/pje/ConsultaPublica/listView.seam`,
    tjsp: `https://esaj.tjsp.jus.br/cpopg/search.do?conversationId=&cbPesquisa=NUMPROC&dadosConsulta.valorConsultaNuUnificado=${num}`,
    tjrj: `https://www3.tjrj.jus.br/ejuris/ConsultarJurisprudencia.aspx`,
    tjrs: `https://www.tjrs.jus.br/novo/busca/?return=proc&client=wp_index&q=${num}`,
    tjmg: `https://www5.tjmg.jus.br/jurisprudencia/pesquisaPalavrasEspelhoAcordao.do?&palavras=${num}`,
    tjpr: `https://portal.tjpr.jus.br/jurisprudencia/j/12/pesquisa?q=${num}`,
  };
  return map[tribunal] || `https://www.google.com/search?q=${num}+site:${tribunal}.jus.br`;
}

async function searchExternalAPIs(query: string, searchQueries?: Record<string, string>): Promise<{ results: NeuralSearchResult[]; queriesUsed: Record<string, string> }> {
  const results: NeuralSearchResult[] = [];
  const queriesUsed: Record<string, string> = {};
  const DATAJUD_API_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

  await Promise.allSettled([
    // DataJud STJ + TST
    ...["stj", "tst"].map(async (tribunal) => {
      try {
        const datajudQuery = searchQueries?.datajud || query;
        queriesUsed[`datajud_${tribunal}`] = datajudQuery;
        const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `APIKey ${DATAJUD_API_KEY}` },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            size: 3,
            query: { bool: { should: [
              { match: { "assuntos.nome": { query: datajudQuery, boost: 3 } } },
              { match: { "classe.nome": { query: datajudQuery, boost: 2 } } }
            ], minimum_should_match: 1 } },
            sort: [{ dataAjuizamento: { order: "desc" } }],
            _source: ["numeroProcesso", "classe.nome", "assuntos.nome", "orgaoJulgador.nome", "dataAjuizamento"],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          (data.hits?.hits || []).forEach((hit: any) => {
            const src = hit._source || {};
            const assuntos = (src.assuntos || []).map((a: any) => a.nome).filter(Boolean).join(", ");
            results.push({
              title: `${src.classe?.nome || "Processo"} - ${src.numeroProcesso || "N/A"}`,
              content: assuntos ? `Assuntos: ${assuntos}. Órgão: ${src.orgaoJulgador?.nome || ""}` : "",
              source: `datajud_${tribunal}`,
              source_label: `DataJud ${tribunal.toUpperCase()}`,
              url: getChatProcessUrl(tribunal, src.numeroProcesso || ""),
              published_date: src.dataAjuizamento,
            });
          });
        }
      } catch (e) { console.warn(`DataJud ${tribunal} error:`, e); }
    }),
    // LexML
    (async () => {
      try {
        const lexmlQuery = searchQueries?.lexml || query;
        queriesUsed["lexml"] = lexmlQuery;
        const res = await fetch(`https://www.lexml.gov.br/busca/SRU?operation=searchRetrieve&version=1.1&query=${encodeURIComponent(lexmlQuery)}&maximumRecords=3&recordSchema=lexml`, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const text = await res.text();
          const regex = /<srw:recordData>([\s\S]*?)<\/srw:recordData>/g;
          let m; let c = 0;
          while ((m = regex.exec(text)) !== null && c < 3) {
            const t = m[1].match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/);
            if (t) {
              const titleText = t[1].trim().replace(/<[^>]*>/g, "");
              results.push({ title: titleText, content: "", source: "lexml", source_label: "LexML Brasil", url: `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(titleText || lexmlQuery)}` });
              c++;
            }
          }
        }
      } catch (e) { console.warn("LexML error:", e); }
    })(),
    // Câmara dos Deputados
    (async () => {
      try {
        const camaraQuery = searchQueries?.camara || query;
        queriesUsed["camara"] = camaraQuery;
        const res = await fetch(`https://dadosabertos.camara.leg.br/api/v2/proposicoes?keywords=${encodeURIComponent(camaraQuery)}&ordem=DESC&ordenarPor=ano&itens=3`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(4000) });
        if (res.ok) {
          const data = await res.json();
          (data.dados || []).forEach((item: any) => {
            results.push({ title: `${item.siglaTipo} ${item.numero}/${item.ano}`, content: item.ementa || "", source: "camara", source_label: "Câmara dos Deputados", url: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${item.id}` });
          });
        }
      } catch (e) { console.warn("Câmara error:", e); }
    })(),
    // Senado Federal - Legislação
    (async () => {
      try {
        const senadoQuery = searchQueries?.senado || query;
        queriesUsed["senado"] = senadoQuery;
        const res = await fetch(`https://legis.senado.leg.br/dadosabertos/legislacao/lista.json?palavraChave=${encodeURIComponent(senadoQuery)}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const data = await res.json();
          const normas = data?.PesquisaLegislacao?.Normas?.Norma || data?.ListaLegislacao?.Legislacao?.Norma || [];
          const list = Array.isArray(normas) ? normas : [normas];
          list.filter(Boolean).slice(0, 3).forEach((n: any) => {
            results.push({
              title: n.DescricaoIdentificacao || `${n.SiglaTipoNorma || ""} ${n.NumeroNorma || ""}/${n.AnoNorma || ""}`.trim(),
              content: n.Ementa || "",
              source: "senado",
              source_label: "Senado Federal",
              url: n.UrlTextoAssociado || `https://legis.senado.leg.br/norma/${n.CodigoNorma || ""}`,
            });
          });
        }
      } catch (e) { console.warn("Senado error:", e); }
    })(),
    // Senado Federal - Processos Legislativos
    (async () => {
      try {
        const senadoProcQuery = searchQueries?.senado || query;
        queriesUsed["senado_processos"] = senadoProcQuery;
        const res = await fetch(`https://legis.senado.leg.br/dadosabertos/materia/pesquisa/lista?palavraChave=${encodeURIComponent(senadoProcQuery)}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const data = await res.json();
          const materias = data?.PesquisaBasicaMateria?.Materias?.Materia || [];
          const list = Array.isArray(materias) ? materias : [materias];
          list.filter(Boolean).slice(0, 3).forEach((m: any) => {
            const id = m.IdentificacaoMateria || {};
            results.push({
              title: `${id.SiglaTipoMateria || ""} ${id.NumeroMateria || ""}/${id.AnoMateria || ""}`.trim(),
              content: m.Ementa || m.EmentaMateria || "",
              source: "senado_processos",
              source_label: "Senado Processos",
              url: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${id.CodigoMateria || ""}`,
            });
          });
        }
      } catch (e) { console.warn("Senado Processos error:", e); }
    })()
  ]);

  console.log(`📡 External APIs: Found ${results.length} results (optimized queries: ${Object.keys(queriesUsed).length})`);
  return { results, queriesUsed };
}

// ═══════════════════════════════════════════════════════════════
// TXT KNOWLEDGE BASE — Search verified doctrine/jurisprudence books
// ═══════════════════════════════════════════════════════════════

interface TxtKnowledgeResultChat {
  source: string;
  title: string;
  content: string;
  tipo: "doutrina" | "jurisprudencia" | "sumula";
}

const AREA_BOOK_PRIORITY_CHAT: Record<string, string[]> = {
  penal: ["direito-processual-penal-completo.txt","tematica-jurisprudencia-stf-completa.txt","principios-processuais-penais.txt","sumulas-stj-inteiro-teor.txt"],
  processual_penal: ["direito-processual-penal-completo.txt","principios-processuais-penais.txt","tematica-jurisprudencia-stf-completa.txt","sumulas-stj-inteiro-teor.txt"],
  civel: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  civil: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  consumidor: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  trabalhista: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  familia: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  previdenciario: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  tributario: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  administrativo: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  ambiental: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  bancario: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  imobiliario: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  empresarial: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  eleitoral: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  internacional: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
};

const TXT_KNOWLEDGE_FILES_CHAT: Array<{ url: string; label: string; tipo: "doutrina"|"jurisprudencia"|"sumula"; areas: string[] }> = [
  { url: "sumulas-stj-inteiro-teor.txt", label: "Súmulas STJ Inteiro Teor (89k)", tipo: "sumula", areas: ["civil","penal","trabalhista","consumidor","tributario","administrativo","previdenciario","familia","bancario","imobiliario","ambiental","empresarial","processual_penal","civel","eleitoral","internacional"] },
  { url: "direito-processual-penal-completo.txt", label: "DPP Completo (42k)", tipo: "doutrina", areas: ["penal","processual_penal"] },
  { url: "tematica-jurisprudencia-stf-completa.txt", label: "Coletânea STF Completa (27k)", tipo: "jurisprudencia", areas: ["penal","processual_penal","civil","constitucional"] },
  { url: "principios-processuais-penais.txt", label: "Princípios Processuais Penais", tipo: "doutrina", areas: ["penal","processual_penal"] },
  { url: "jurisprudencia-stf-penal.txt", label: "Jurisprudência STF Penal", tipo: "jurisprudencia", areas: ["penal","processual_penal"] },
  // === Fallback ===
  { url: "sumulas-stj-completas-v4.txt", label: "Súmulas STJ v4 (fallback)", tipo: "sumula", areas: ["civil","penal","trabalhista","consumidor","tributario","administrativo","previdenciario","familia","bancario","imobiliario","ambiental","empresarial","processual_penal"] },
  { url: "tematica-jurisprudencia-stf-v5.txt", label: "Coletânea STF v5 (fallback)", tipo: "jurisprudencia", areas: ["penal","processual_penal"] },
  { url: "aury-lopes-direito-processual-penal-v3.txt", label: "Aury Lopes Jr. v3 (fallback)", tipo: "doutrina", areas: ["penal","processual_penal"] },
  { url: "nocoes-direito-processual-penal-v4.txt", label: "Noções DPP v4 (fallback)", tipo: "doutrina", areas: ["penal","processual_penal"] }
];

const _txtCacheChat = new Map<string, { content: string; loadedAt: number }>();
const TXT_CACHE_TTL_CHAT = 30 * 60 * 1000;

async function loadTxtFileChat(filename: string): Promise<string | null> {
  const cached = _txtCacheChat.get(filename);
  if (cached && (Date.now() - cached.loadedAt) < TXT_CACHE_TTL_CHAT) return cached.content;
  try {
    const url = `https://gentle-maker-lab.lovable.app/docs/${filename}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > 100) _txtCacheChat.set(filename, { content: text, loadedAt: Date.now() });
    return text;
  } catch (e) { console.warn(`⚠️ TXT load fail ${filename}:`, e); return null; }
}

function searchTxtContentChat(content: string, keywords: string[], maxExcerpts = 3, excerptSize = 800): string[] {
  const lines = content.split("\n");
  const excerpts: Array<{ text: string; score: number }> = [];
  const windowSize = 15;
  for (let i = 0; i < lines.length - windowSize; i += 5) {
    const window = lines.slice(i, i + windowSize).join("\n");
    const windowLower = window.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (windowLower.includes(kw.toLowerCase())) score += (windowLower.match(new RegExp(kw.toLowerCase(), "g")) || []).length;
    }
    if (score >= 2) excerpts.push({ text: window.substring(0, excerptSize), score });
  }
  excerpts.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const results: string[] = [];
  for (const e of excerpts) {
    const key = e.text.substring(0, 100);
    if (!seen.has(key)) { seen.add(key); results.push(e.text); if (results.length >= maxExcerpts) break; }
  }
  return results;
}

async function searchTxtKnowledgeBaseChat(query: string, areaJuridica?: string): Promise<TxtKnowledgeResultChat[]> {
  const results: TxtKnowledgeResultChat[] = [];
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 8);
  if (queryWords.length === 0) return results;

  console.log(`📚 [chat] TXT KB search: ${queryWords.length} keywords, area: ${areaJuridica || "geral"}`);
  const area = areaJuridica?.toLowerCase() || "civil";
  const priorityFiles = AREA_BOOK_PRIORITY_CHAT[area] || ["sumulas-stj-completas-v4.txt"];
  const orderedFiles: typeof TXT_KNOWLEDGE_FILES_CHAT = [];
  const seen = new Set<string>();
  for (const pf of priorityFiles) {
    const file = TXT_KNOWLEDGE_FILES_CHAT.find(f => f.url === pf);
    if (file && !seen.has(file.url)) { orderedFiles.push(file); seen.add(file.url); }
  }
  for (const file of TXT_KNOWLEDGE_FILES_CHAT) {
    if (!seen.has(file.url) && file.areas.includes(area)) { orderedFiles.push(file); seen.add(file.url); }
  }
  for (const file of TXT_KNOWLEDGE_FILES_CHAT) {
    if (!seen.has(file.url) && file.tipo === "sumula") { orderedFiles.push(file); seen.add(file.url); }
  }

  const searchPromises = orderedFiles.map(async (file, idx) => {
    const content = await loadTxtFileChat(file.url);
    if (!content) return;
    const isPriority = idx < priorityFiles.length;
    const excerpts = searchTxtContentChat(content, queryWords, isPriority ? 3 : 2, isPriority ? 1000 : 600);
    for (const excerpt of excerpts) {
      results.push({ source: file.label, title: file.label, content: excerpt, tipo: file.tipo });
    }
  });
  await Promise.allSettled(searchPromises);
  results.sort((a, b) => b.content.length - a.content.length);
  console.log(`  📚 [chat] TXT KB: ${results.length} excerpts found`);
  return results.slice(0, 8);
}

// ====== HANDLER PRINCIPAL ======
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, includeNeuralContext = true, intent: forceIntent, jurisdiction = "brasil", stream = false, isVoice = false, personaConfig } = (await req.json()) as { 
      messages: ChatMessage[];
      includeNeuralContext?: boolean;
      intent?: string;
      jurisdiction?: "brasil" | "eua" | "ambos";
      stream?: boolean;
      isVoice?: boolean;
      personaConfig?: {
        speech_style?: string;
        formality_level?: number;
        humor_mode?: string;
        nickname?: string;
        mirroring_enabled?: boolean;
        personality_prompt?: string;
        proactive_vision?: boolean;
      };
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const _t0 = Date.now();
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const _fallbacksAttempted: string[] = [];

    // Extract user_id from JWT for learning data
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        userId = user?.id || null;
      } catch (e) {
        console.warn("Could not extract user from JWT:", e);
      }
    }

    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
    console.log("Processing:", lastUserMessage.substring(0, 60));

    // ====== 1. ROUTER: CLASSIFICAR INTENÇÃO ======
    let intent: IntentResult = { intent: "consulta", params: {} };
    if (!forceIntent && lastUserMessage.length > 15) {
      intent = await classifyIntent(lastUserMessage);
      console.log("Intent classified:", intent.intent, JSON.stringify(intent.params));
    } else if (forceIntent) {
      intent.intent = forceIntent as any;
    }

    const _tAfterIntent = Date.now();

    // ====== 2. RAG: BUSCAR CONTEXTO NEURAL + APIs EXTERNAS ======
    let neuralContext = "";
    let neuralSources: NeuralSearchResult[] = [];
    let searchQueriesUsed: Record<string, string> = {};
    let _ragKbHits = 0;
    let _ragExternalHits = 0;
    let _ragTxtHits = 0;

    if (includeNeuralContext && lastUserMessage.length > 10) {
      console.log("Searching neural context + external APIs + TXT KB in parallel...");
      const [neuralResult, externalResult, txtResult] = await Promise.allSettled([
        searchNeuralContext(lastUserMessage, supabaseAdmin, { tribunal: intent.params.tribunal }),
        searchExternalAPIs(lastUserMessage, intent.searchQueries),
        searchTxtKnowledgeBaseChat(lastUserMessage, intent.params?.area)
      ]);

      if (neuralResult.status === "fulfilled") {
        neuralContext = neuralResult.value.context;
        neuralSources = neuralResult.value.sources;
        _ragKbHits = neuralResult.value.sources.length;
      }

      // Merge external API results into sources and context
      if (externalResult.status === "fulfilled" && externalResult.value.results.length > 0) {
        const externalSources = externalResult.value.results;
        _ragExternalHits = externalSources.length;
        searchQueriesUsed = externalResult.value.queriesUsed;
        neuralSources = [...neuralSources, ...externalSources];

        // Add external results to the context string
        const extContext = externalSources.map((r, i) =>
          `[EXT-${i + 1}] **${r.source_label}**: ${r.title}\n${r.content || ""}${r.url ? `\nFonte: ${r.url}` : ""}`
        ).join("\n\n");

        if (extContext) {
          neuralContext += `\n\n═══ RESULTADOS DE APIs PÚBLICAS (DataJud, LexML, Câmara, Senado) ═══\n${extContext}`;
        }
      }

      // Merge TXT KB results into context
      if (txtResult.status === "fulfilled" && txtResult.value.length > 0) {
        const txtExcerpts = txtResult.value;
        _ragTxtHits = txtExcerpts.length;
        let txtSection = "\n\n═══════════════════════════════════════════════════════════════\n";
        txtSection += "🔒 BASE DE CONHECIMENTO VERIFICADA — LIVROS E COLETÂNEAS OFICIAIS\n";
        txtSection += "═══════════════════════════════════════════════════════════════\n";
        txtSection += "⚠️ FONTE VERIFICADA: Trechos extraídos DIRETAMENTE de obras publicadas.\n";
        txtSection += "COPIE literalmente citações, números de súmulas e ementas daqui.\n";
        txtSection += "NÃO invente dados que NÃO estejam abaixo.\n\n";
        const byTipo: Record<string, typeof txtExcerpts> = {};
        txtExcerpts.forEach(r => { if (!byTipo[r.tipo]) byTipo[r.tipo] = []; byTipo[r.tipo].push(r); });
        const labels: Record<string, string> = { doutrina: "📖 DOUTRINA", jurisprudencia: "⚖️ JURISPRUDÊNCIA", sumula: "📋 SÚMULAS" };
        for (const [tipo, items] of Object.entries(byTipo)) {
          txtSection += `── ${labels[tipo] || tipo.toUpperCase()} ──\n`;
          items.slice(0, 4).forEach((item, i) => {
            txtSection += `[${i+1}] ${item.source}\n${item.content}\n\n`;
          });
        }
        neuralContext += txtSection;
        console.log(`📚 TXT KB: ${txtExcerpts.length} verified excerpts injected into chat context`);
      }

      console.log(`Found ${neuralSources.length} total sources (neural + external + TXT KB)`);
    }

    const _tAfterRAG = Date.now();

    // Build diagnostics helper
    const buildDiagnostics = (provider: string) => ({
      totalMs: Date.now() - _t0,
      intentMs: _tAfterIntent - _t0,
      ragMs: _tAfterRAG - _tAfterIntent,
      llmMs: Date.now() - _tAfterRAG,
      provider,
      ragKbHits: _ragKbHits,
      ragExternalHits: _ragExternalHits,
      ragTxtHits: _ragTxtHits,
      ragTotalHits: neuralSources.length,
      ragActive: neuralSources.length > 0,
      fallbacksAttempted: _fallbacksAttempted,
      intent: intent.intent,
    });

    // ====== 3. SELECIONAR PROMPT BASEADO NA INTENÇÃO + JURISDIÇÃO ======
    let systemPrompt: string;
    let intentContext = "";

    // ═══ JURISDICTION OVERLAY ═══
    const JURISDICTION_OVERLAYS: Record<string, string> = {
      brasil: `\n═══ JURISDIÇÃO: BRASIL 🇧🇷 ═══
Use EXCLUSIVAMENTE legislação brasileira (CF/88, CC/2002, CPC/2015, CLT, CDC, CP, CPP).
Tribunais: STF, STJ, TST, TSE, STM, TRFs, TJs estaduais, TRTs.
Doutrina: Priorize Guilherme de Souza Nucci (Códigos Comentados), Nelson Nery, Fredie Didier.
NÃO cite legislação estrangeira. Formato de citação brasileiro. [OAB].`,
      eua: `\n═══ JURISDICTION: UNITED STATES 🇺🇸 ═══
Use EXCLUSIVELY United States law: U.S. Constitution, U.S. Code, CFR, state statutes.
Courts: SCOTUS, Circuit Courts, District Courts, State Supreme Courts.
Doctrine: Bluebook citation format (e.g., Brown v. Board, 347 U.S. 483 (1954)).
Sources: CourtListener, FreeLaw, PACER, Google Books.
DO NOT cite Brazilian legislation. Respond in Portuguese unless user writes in English.`,
      ambos: `\n═══ JURISDIÇÃO: COMPARADA BR + EUA 🌐 ═══
Compare legislação brasileira (CF/88, CC, CPC) com americana (USC, CFR, SCOTUS).
Para cada tópico: (1) Direito brasileiro (2) Direito americano (3) Convergências/divergências.
Use Bluebook para citações americanas, formato BR para citações nacionais.`,
    };

    const jurisdictionOverlay = JURISDICTION_OVERLAYS[jurisdiction] || JURISDICTION_OVERLAYS["brasil"];

    // Monta contexto adicional baseado nos parâmetros extraídos
    const params = intent.params;
    if (params.foro || params.tribunal || params.comarca || params.vara) {
      const foroInfo = [
        params.tribunal ? `Tribunal: ${params.tribunal}` : "",
        params.foro ? `Foro: ${params.foro}` : "",
        params.comarca ? `Comarca: ${params.comarca}` : "",
        params.vara ? `Vara: ${params.vara}` : ""
      ].filter(Boolean).join(" | ");
      intentContext += `\n\n═══ JURISDIÇÃO IDENTIFICADA ═══\n${foroInfo}`;
    }

    if (params.area) {
      intentContext += `\nÁREA JURÍDICA: ${params.area.toUpperCase()}`;
    }

    if (params.partes) {
      intentContext += `\nPARTES: Autor: ${params.partes.autor || "(a definir)"} | Réu: ${params.partes.reu || "(a definir)"}`;
    }

    console.log(`🌐 Jurisdiction: ${jurisdiction}`);

    switch (intent.intent) {
      case "documento":
        systemPrompt = DOCUMENT_PROMPT;
        if (params.tipo) {
          intentContext += `\nTIPO DE DOCUMENTO SOLICITADO: ${params.tipo}`;
        }
        systemPrompt += intentContext;
        break;

      case "pesquisa":
        systemPrompt = RESEARCH_PROMPT;
        if (params.tema) {
          intentContext += `\nTEMA DA PESQUISA: ${params.tema}`;
        }
        if (params.periodo) {
          intentContext += `\nPERÍODO: ${params.periodo}`;
        }
        systemPrompt += intentContext;
        break;

      case "sintese":
        // Prompt especial para síntese: pesquisa + documento
        systemPrompt = `${RESEARCH_PROMPT}

═══════════════════════════════════════════════════════════════
MODO SÍNTESE ATIVADO
═══════════════════════════════════════════════════════════════

Após analisar a jurisprudência, você DEVE gerar o documento solicitado incorporando os precedentes encontrados.

${DOCUMENT_PROMPT}`;
        if (params.tipo_documento) {
          intentContext += `\nDOCUMENTO A GERAR: ${params.tipo_documento}`;
        }
        if (params.tema_pesquisa) {
          intentContext += `\nTEMA PARA FUNDAMENTAÇÃO: ${params.tema_pesquisa}`;
        }
        systemPrompt += intentContext;
        break;

      default:
        // Fetch honorarios for consulta
        let honorariosText = "";
        try {
          const { data: honorarios } = await supabaseAdmin
            .from("honorarios_config")
            .select("tipo_servico, descricao, valor")
            .eq("ativo", true)
            .order("valor");
          if (honorarios?.length) {
            honorariosText = honorarios
              .map((h: any) => `- **${h.descricao || h.tipo_servico}**: R$ ${Number(h.valor).toFixed(2).replace(".", ",")}`)
              .join("\n");
          }
        } catch (e) {
          honorariosText = "Valores disponíveis no menu Agendar Consulta.";
        }
        systemPrompt = BASE_SYSTEM_PROMPT.replace("{HONORARIOS_PLACEHOLDER}", honorariosText);
        if (params.tema) {
          intentContext += `\nTEMA DA CONSULTA: ${params.tema}`;
        }
        if (intentContext) {
          systemPrompt += intentContext;
        }
    }

    // ====== 3.5. INJECT JURISDICTION OVERLAY ======
    systemPrompt += jurisdictionOverlay;

    // ====== 4. INJETAR CONTEXTO NEURAL NO PROMPT ======
    if (neuralContext) {
      systemPrompt += `

═══════════════════════════════════════════════════════════════
📚 CONTEXTO JURÍDICO RECUPERADO (REDE NEURAL)
═══════════════════════════════════════════════════════════════

${neuralContext}

═══════════════════════════════════════════════════════════════
⚠️ INSTRUÇÕES OBRIGATÓRIAS SOBRE O CONTEXTO ACIMA:
- Use SOMENTE os dados acima para citar jurisprudência
- Copie números de processo EXATAMENTE como aparecem acima
- Se o usuário perguntou sobre algo que NÃO está no contexto, diga "não encontrado na base"
- NUNCA invente, extrapole ou "complete" dados parciais
- Inclua URLs de fontes quando houver
- Priorize precedentes mais recentes
═══════════════════════════════════════════════════════════════`;
    } else {
      // Reforço quando NÃO há contexto
      systemPrompt += `

═══════════════════════════════════════════════════════════════
🚫 ALERTA CRÍTICO: SEM CONTEXTO JURÍDICO DISPONÍVEL
═══════════════════════════════════════════════════════════════
Nenhuma jurisprudência foi encontrada na base de dados para esta consulta.
- É ABSOLUTAMENTE PROIBIDO citar números de processo, REsp, HC, RE, acórdãos ou qualquer decisão judicial
- NÃO INVENTE nenhum precedente, mesmo que pareça plausível — isso é antiético e perigoso
- Fundamente SOMENTE com legislação (artigos de lei codificados, que são verificáveis pelo usuário)
- Se o tema exigir jurisprudência, diga: "Recomendo utilizar a ferramenta de Pesquisa Jurisprudencial para localizar precedentes reais nos tribunais."
- NUNCA diga "conforme jurisprudência consolidada" ou expressões similares sem dados reais
═══════════════════════════════════════════════════════════════`;
    }

    // ====== 4.5. LOAD SPECIALIZATIONS & INJECT INTO PROMPT ======
    try {
      const { data: specializations } = await supabaseAdmin
        .from("neural_specializations")
        .select("name, category, prompts, accuracy_score")
        .eq("is_active", true)
        .eq("training_status", "completed")
        .order("accuracy_score", { ascending: false })
        .limit(3);

      if (specializations?.length) {
        systemPrompt += `\n\n═══════════════════════════════════════════════════════════════
ESPECIALIZAÇÕES NEURAIS ATIVAS
═══════════════════════════════════════════════════════════════\n`;
        specializations.forEach((s: any) => {
          systemPrompt += `• ${s.name} (${s.category}) - Score: ${(s.accuracy_score || 0).toFixed(2)}\n`;
          if (s.prompts?.enhancement) {
            systemPrompt += `  Instrução: ${s.prompts.enhancement}\n`;
          }
        });
        console.log(`🧠 Loaded ${specializations.length} specializations into chat prompt`);
      }
    } catch (e) {
      console.warn("Failed to load specializations:", e);
    }

    // ====== 4.7. VOICE MODE — Conversational prompt adjustment ======
    if (isVoice) {
      systemPrompt += `\n\n═══════════════════════════════════════════════════════════════
🎙️ MODO VOZ ATIVO — RESPOSTA CONVERSACIONAL
═══════════════════════════════════════════════════════════════
A mensagem do usuário veio por COMANDO DE VOZ. Ajuste sua resposta:
- Responda de forma CONCISA e DIRETA (máximo 150 palavras)
- Use tom CONVERSACIONAL e HUMANO, como se estivesse falando pessoalmente
- NÃO use listas numeradas, contagens de objetos, ou formatação Markdown complexa
- NÃO use tabelas, headers ##, ou bullet points extensos
- Fale de forma NATURAL: "Olha, sobre isso..." em vez de "1. Primeiro ponto:"
- Se precisar citar legislação, faça de forma fluida: "o artigo 186 do Código Civil diz que..."
- Evite disclaimers longos — seja breve e útil
- NÃO faça contagens ou listagens robóticas
═══════════════════════════════════════════════════════════════`;
      console.log("🎙️ Voice mode active — conversational prompt injected");
    }

    // ====== 4.8. PERSONA HUMANA ADAPTATIVA ======
    if (personaConfig) {
      let personaBlock = `\n\n═══════════════════════════════════════════════════════════════
🧠 PERSONA HUMANA ADAPTATIVA
═══════════════════════════════════════════════════════════════`;

      const style = personaConfig.speech_style || "formal";
      const formality = personaConfig.formality_level ?? 7;
      const humor = personaConfig.humor_mode || "neutro";
      const nick = personaConfig.nickname || "";
      const mirror = personaConfig.mirroring_enabled !== false;
      const customPrompt = personaConfig.personality_prompt || "";

      // Speech style mapping
      const styleMap: Record<string, string> = {
        formal: "Use linguagem formal e profissional. Trate o usuário com respeito e cordialidade.",
        casual: "Fale de forma descontraída e amigável, como um colega de trabalho. Use 'você' e expressões cotidianas.",
        urbano: "Fale como um parça/amigo real. Use gírias urbanas naturais: 'salve', 'mano', 'tá ligado', 'entendi a fita', 'pode crer'. Se o usuário mandar um 'e aí', responda com 'salve!' ou 'fala, meu bom!'.",
        tecnico: "Use linguagem técnica e precisa. Seja direto e objetivo, sem floreios.",
        empatico: "Seja caloroso e empático. Demonstre que se importa com o que o usuário sente. Use expressões como 'entendo perfeitamente', 'fique tranquilo'.",
      };

      personaBlock += `\nESTILO DE FALA: ${styleMap[style] || styleMap.formal}`;
      personaBlock += `\nNÍVEL DE FORMALIDADE: ${formality}/10 (${formality <= 3 ? "muito informal" : formality <= 5 ? "informal" : formality <= 7 ? "moderado" : "formal"})`;

      const humorMap: Record<string, string> = {
        neutro: "Tom equilibrado, sem humor forçado.",
        bem_humorado: "Seja bem-humorado e leve. Use analogias divertidas e expressões engraçadas quando apropriado.",
        sarcastico: "Use sarcasmo leve e inteligente. Seja espirituoso sem ser ofensivo.",
        zueiro: "Seja zueiro e descontraído. Use memes verbais, referências pop e humor. Mas mantenha a informação correta.",
      };
      personaBlock += `\nHUMOR: ${humorMap[humor] || humorMap.neutro}`;

      if (nick) {
        personaBlock += `\nCHAME O USUÁRIO DE: "${nick}" — use esse nome de vez em quando de forma natural, como um amigo faria.`;
      }

      if (mirror) {
        personaBlock += `\nESPELHAMENTO LINGUÍSTICO: Adapte seu vocabulário ao do usuário. Se ele usar gírias, use gírias. Se ele for formal, seja formal. Espelhe o tom e a energia da mensagem dele.`;
      }

      if (customPrompt) {
        personaBlock += `\nINSTRUÇÕES DE PERSONALIDADE DO USUÁRIO: ${customPrompt}`;
      }

      personaBlock += `\n═══════════════════════════════════════════════════════════════`;
      systemPrompt += personaBlock;
      console.log("🧠 Persona adaptativa injetada:", style, `formality=${formality}`, humor);
    }

    // ====== 4.9. ADAPTIVE COMMUNICATION CONTEXT (from Supabase) ======
    try {
      const { data: commCtx } = await supabase
        .from("user_communication_context")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (commCtx) {
        // Fetch matching adaptive prompt
        const { data: adaptivePrompt } = await supabase
          .from("adaptive_system_prompts")
          .select("instrucao_sistema, exemplos_resposta")
          .eq("perfil_fala", (commCtx as any).perfil_fala || "Amigável/Coloquial")
          .eq("humor_modo", (commCtx as any).humor_atual || "neutro")
          .eq("ativo", true)
          .maybeSingle();

        if (adaptivePrompt) {
          systemPrompt += `\n\n═══════════════════════════════════════════════════════════════
🎭 ESTILO COMUNICAÇÃO ADAPTATIVO
═══════════════════════════════════════════════════════════════
${(adaptivePrompt as any).instrucao_sistema}`;
          
          if ((adaptivePrompt as any).exemplos_resposta && Array.isArray((adaptivePrompt as any).exemplos_resposta)) {
            const exs = ((adaptivePrompt as any).exemplos_resposta as any[])
              .map((e: any) => `Usuário: "${e.entrada}" → Você: "${e.resposta}"`)
              .join("\n");
            systemPrompt += `\nEXEMPLOS:\n${exs}`;
          }
          systemPrompt += `\n═══════════════════════════════════════════════════════════════`;
        }

        // Environmental context injection
        if ((commCtx as any).reatividade_visual) {
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const { data: envCtx } = await supabase
            .from("environmental_context")
            .select("objeto_detectado, categoria, emocao_detectada, confianca")
            .eq("user_id", userId)
            .eq("ativo", true)
            .gte("created_at", fiveMinAgo)
            .order("created_at", { ascending: false })
            .limit(5);

          if (envCtx && envCtx.length > 0) {
            const envDesc = (envCtx as any[]).map((e: any) =>
              `${e.objeto_detectado} (${Math.round(e.confianca * 100)}%)${e.emocao_detectada ? ` — ${e.emocao_detectada}` : ""}`
            ).join(", ");
            systemPrompt += `\n\n🔍 CONTEXTO VISUAL: ${envDesc}\nSe relevante, comente naturalmente como um humano faria.`;
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load adaptive context:", e);
    }

    // ====== 5. CHAMAR LLM COM FALLBACK (streaming ou não) ======

    if (stream) {
      // ── STREAMING PATH ──
      const llms = supabaseAdmin ? await getAvailableLLMsDynamic(supabaseAdmin) : getAvailableLLMs();
      let streamBody: ReadableStream<Uint8Array> | null = null;
      let usedProvider = "unknown";

      for (const llm of llms) {
        try {
          streamBody = await callLLMStream(llm, messages, systemPrompt);
          if (streamBody) { usedProvider = llm.provider; break; }
          _fallbacksAttempted.push(llm.provider);
        } catch (e) { _fallbacksAttempted.push(llm.provider); console.warn(`Stream ${llm.provider} failed:`, e); }
      }

      if (!streamBody) {
        // Fallback to non-streaming if no streaming provider worked
        const result = await callWithFallback(messages, systemPrompt, supabaseAdmin);
        return new Response(
          JSON.stringify({ content: result.content, intent: intent.intent, intentParams: intent.params, provider: result.provider, neuralEnhanced: neuralSources.length > 0, sources: neuralSources, searchQueriesUsed, diagnostics: buildDiagnostics(result.provider) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build SSE stream: parse the upstream SSE, extract content deltas, and forward
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const metadata = {
        intent: intent.intent,
        intentParams: intent.params,
        provider: usedProvider,
        neuralEnhanced: neuralSources.length > 0,
        sources: neuralSources,
        searchQueriesUsed,
        diagnostics: buildDiagnostics(usedProvider),
      };

      let fullContent = "";
      const readable = new ReadableStream({
        async start(controller) {
          const reader = streamBody!.getReader();
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const data = line.slice(6).trim();
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    fullContent += delta;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content: delta })}\n\n`));
                  }
                } catch { /* skip unparseable lines */ }
              }
            }
            // Send metadata at the end
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "metadata", ...metadata })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            console.error("Stream processing error:", err);
            controller.error(err);
          }

          // Background: log learning data
          try {
            let qualityScore = 0.5;
            if (fullContent.length > 500) qualityScore += 0.1;
            if (fullContent.length > 2000) qualityScore += 0.1;
            if (neuralSources.length > 0) qualityScore += 0.1;
            if (/artigo|lei|súmula|jurisprudência/i.test(fullContent)) qualityScore += 0.05;
            if (intent.intent === "documento" || intent.intent === "sintese") qualityScore += 0.05;
            qualityScore = Math.min(Math.max(qualityScore, 0.1), 1.0);
            const learned = qualityScore >= 0.7;
            await supabaseAdmin.from("neural_learning_data").insert({
              interaction_type: "chat",
              input_text: lastUserMessage.substring(0, 10000),
              output_text: fullContent.substring(0, 10000),
              user_id: userId,
              metadata: { intent: intent.intent, intentParams: intent.params, provider: usedProvider, sourcesCount: neuralSources.length, autoScored: true, source: "chat-juridico-stream" },
              quality_score: qualityScore,
              learned,
            });
          } catch (e) { console.warn("Failed to log stream learning data:", e); }
        },
      });

      return new Response(readable, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
      });
    }

    // ── NON-STREAMING PATH (original) ──
    const result = await callWithFallback(messages, systemPrompt, supabaseAdmin);

    // ====== 5.5. LOG LEARNING DATA + AUTO-INDEX ======
    try {
      const outputText = result.content || "";
      let qualityScore = 0.5;
      if (outputText.length > 500) qualityScore += 0.1;
      if (outputText.length > 2000) qualityScore += 0.1;
      if (neuralSources.length > 0) qualityScore += 0.1;
      if (/artigo|lei|súmula|jurisprudência/i.test(outputText)) qualityScore += 0.05;
      if (intent.intent === "documento" || intent.intent === "sintese") qualityScore += 0.05;
      qualityScore = Math.min(Math.max(qualityScore, 0.1), 1.0);
      const learned = qualityScore >= 0.7;

      const { error: learningError } = await supabaseAdmin.from("neural_learning_data").insert({
        interaction_type: "chat",
        input_text: lastUserMessage.substring(0, 10000),
        output_text: outputText.substring(0, 10000),
        user_id: userId,
        metadata: {
          intent: intent.intent,
          intentParams: intent.params,
          provider: result.provider,
          sourcesCount: neuralSources.length,
          autoScored: true,
          source: "chat-juridico",
        },
        quality_score: qualityScore,
        learned,
      });
      if (learningError) {
        console.error(`❌ Failed to insert learning data:`, learningError.message, learningError.details, learningError.hint);
      } else {
        console.log(`🧠 Chat learning logged: quality=${qualityScore.toFixed(2)}, learned=${learned}`);
      }

      if (learned && outputText.length > 1000) {
        const { data: advogado } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "advogado")
          .limit(1)
          .single();

        if (advogado) {
          await supabaseAdmin.from("neural_knowledge_base").insert({
            user_id: advogado.user_id,
            title: `Chat IA: ${intent.intent} - ${lastUserMessage.substring(0, 80)}`,
            content: outputText.substring(0, 5000),
            source_type: "chat_ia",
            source_reference: `auto:chat_${intent.intent}:${result.provider}`,
            tags: [intent.intent, result.provider, "auto-indexed-chat"].filter(Boolean),
            is_processed: false,
          });
          console.log(`📚 Auto-indexed chat response into knowledge base`);
        }
      }
    } catch (e) {
      console.warn("Failed to log learning data:", e);
    }

    // ====== 6. RETORNAR RESPOSTA ======
    return new Response(
      JSON.stringify({ 
        content: result.content,
        intent: intent.intent,
        intentParams: intent.params,
        provider: result.provider,
        neuralEnhanced: neuralSources.length > 0,
        sourcesCount: neuralSources.length,
        sources: neuralSources,
        searchQueriesUsed,
        searchTargetsUsed: Object.keys(searchQueriesUsed),
        diagnostics: buildDiagnostics(result.provider),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Chat juridico error:", error);
    return new Response(
      JSON.stringify({
        error: "Erro ao processar consulta",
        content: "Desculpe, ocorreu um erro ao processar sua consulta. Por favor, tente novamente.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
