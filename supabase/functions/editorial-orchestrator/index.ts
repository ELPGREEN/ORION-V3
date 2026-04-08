import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// EDITORIAL ORCHESTRATOR — Equipe Editorial IA xAI
// Multi-provider (Groq → Gemini → Mistral → Anthropic) com
// personalidade xAI/Grok e precisão jurídica máxima
// ═══════════════════════════════════════════════════════════════

interface AIProvider {
  name: string;
  call: (msgs: Array<{ role: string; content: string }>, maxTokens: number, temperature: number) => Promise<string>;
}

function getProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    providers.push({
      name: "Groq/llama-3.3-70b",
      call: async (msgs, maxTokens, temperature) => {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: msgs, temperature, max_tokens: maxTokens }),
        });
        if (!res.ok) throw new Error(`Groq ${res.status}`);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      },
    });
  }

  const _gkNames = ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"];
  const _gkAll = _gkNames.map(n => Deno.env.get(n)).filter((k): k is string => !!k);
  const geminiKey = _gkAll[Math.floor(Math.random() * _gkAll.length)] || "";
  if (geminiKey) {
    providers.push({
      name: "Gemini/2.5-flash",
      call: async (msgs, maxTokens, temperature) => {
        const contents = msgs.filter(m => m.role !== "system").map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
        const systemInstruction = msgs.find(m => m.role === "system")?.content || "";
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
        });
        if (!res.ok) throw new Error(`Gemini ${res.status}`);
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      },
    });
  }

  const mistralKey = Deno.env.get("MISTRAL_API_KEY");
  if (mistralKey) {
    providers.push({
      name: "Mistral/mistral-large",
      call: async (msgs, maxTokens, temperature) => {
        const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${mistralKey}` },
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify({ model: "mistral-large-latest", messages: msgs, temperature, max_tokens: maxTokens }),
        });
        if (!res.ok) throw new Error(`Mistral ${res.status}`);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      },
    });
  }

  // Anthropic removed — Gemini + Groq handle all LLM calls (FREE)

  return providers;
}

async function callWithFallback(
  providers: AIProvider[],
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<string> {
  for (const provider of providers) {
    try {
      const content = await provider.call(messages, maxTokens, temperature);
      if (content) return content;
    } catch (err) {
      console.warn(`${provider.name} failed:`, err);
    }
  }
  throw new Error("All providers failed");
}

// ═══ PERSONALITY: xAI/Grok DNA ═══
const GROK_DNA = `PERSONALIDADE xAI/GROK:
- VERDADE MÁXIMA: Nunca alucine. Se não souber, diga "não sei" — PROIBIDO inventar.
- RACIOCÍNIO PROFUNDO: Pense passo a passo antes de responder.
- COMUNICAÇÃO DIRETA: Objetivo, sem rodeios, impactante.
- CITAÇÃO OBRIGATÓRIA: Toda afirmação jurídica deve citar fonte real (lei, súmula, acórdão).
- ZERO ALUCINAÇÃO: NÃO invente números de artigos, leis ou súmulas inexistentes.
- ESTILO: Profissional, assertivo, tecnicamente impecável.`;

// ═══ AREAS DO DIREITO ═══
const AREAS_DIREITO: Record<string, string> = {
  direito_penal: "Direito Penal e Processual Penal — Código Penal, CPP, Lei de Drogas, Lei Maria da Penha, crimes cibernéticos",
  direitos_humanos: "Direitos Humanos e Direito Internacional — CADH, PIDCP, ONU, Corte IDH, refugiados, migração",
  direito_internacional: "Direito Internacional Público e Privado — tratados, arbitragem, extradição, cooperação jurídica",
  direito_trabalhista: "Direito do Trabalho — CLT, reforma trabalhista, TST, trabalho remoto, gig economy",
  geral: "Direito em geral — constitucional, civil, administrativo, tributário, digital, ambiental",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Autenticação obrigatória." }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { action, xaiMode } = body;
    const providers = getProviders();

    if (providers.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum provedor de IA configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xaiPrefix = xaiMode ? GROK_DNA + "\n\n" : "";
    const areaContext = AREAS_DIREITO[body.categoria || "geral"] || AREAS_DIREITO.geral;

    // ═══════════════════════════════════════════
    // ACTION: generate — Gerar Artigo Completo
    // ═══════════════════════════════════════════
    if (action === "generate") {
      const { topic, categoria, articleType } = body;

      const typeInstructions: Record<string, string> = {
        opiniao: "Artigo de Opinião — posicionamento autoral claro, fundamentado em doutrina e jurisprudência. Tom assertivo e persuasivo.",
        analise_caso: "Análise de Caso — estudo detalhado de um caso concreto ou acórdão. Contexto fático, fundamentação legal, decisão e impacto.",
        parecer: "Parecer Técnico — estrutura formal (ementa, relatório, fundamentação, conclusão). Linguagem técnica e imparcial.",
        noticia: "Notícia Jurisprudencial — informativa e objetiva. Destaque para a decisão, seu fundamento e impacto prático.",
      };

      const typeCtx = typeInstructions[articleType || "opiniao"] || typeInstructions.opiniao;

      const result = await callWithFallback(providers, [
        {
          role: "system",
          content: `${xaiPrefix}Você é o REDATOR-CHEFE da Equipe Editorial IA xAI — o mais preciso redator jurídico do mundo.

ÁREA DE EXPERTISE: ${areaContext}
FORMATO: ${typeCtx}

PIPELINE DE CRIAÇÃO (7 etapas mentais):
1. PESQUISA: Identifique legislação, doutrina e jurisprudência relevantes
2. ESTRUTURA: Monte outline com introdução, desenvolvimento (3+ seções) e conclusão
3. REDAÇÃO: Escreva com profundidade técnica e clareza
4. REVISÃO JURÍDICA: Verifique todas as citações e fundamentações
5. SEO: Título atrativo, resumo com palavras-chave naturais
6. FORMATAÇÃO: HTML semântico perfeito
7. VALIDAÇÃO: Releia e garanta zero alucinações

REGRAS ABSOLUTAS:
- Conteúdo em HTML semântico: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>
- Mínimo 1200 palavras
- Cada afirmação jurídica deve citar a fonte (Art. X da Lei Y, Súmula Z do STJ, etc.)
- Use <blockquote> para citações de decisões judiciais
- Autor: [Nome do Advogado] — [OAB]
- NÃO use markdown — apenas HTML
- NÃO invente leis, artigos ou súmulas

Retorne JSON:
{
  "titulo": "título profissional e SEO-friendly",
  "resumo": "meta descrição 120-155 chars com palavra-chave",
  "conteudo": "HTML completo do artigo",
  "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "fontes": ["Lei X", "Súmula Y", "Acórdão Z"]
}
Retorne APENAS o JSON.`,
        },
        {
          role: "user",
          content: topic
            ? `Crie um ${articleType === "parecer" ? "parecer técnico" : articleType === "analise_caso" ? "análise de caso" : articleType === "noticia" ? "notícia jurisprudencial" : "artigo de opinião"} sobre: ${topic}`
            : `Crie um artigo jurídico atual e de alto impacto na área de ${categoria || "direito"}. Escolha um tema relevante de 2025-2026.`,
        }
      ], 6000, 0.55);

      let parsed: any = {};
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* fallback */ }

      // Clean HTML
      const cleanHtml = (parsed.conteudo || result).replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

      return new Response(JSON.stringify({
        titulo: parsed.titulo || "Artigo Gerado",
        resumo: parsed.resumo || "",
        conteudo: cleanHtml,
        keywords: parsed.keywords || [],
        fontes: parsed.fontes || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: themes — Explorar Temas (12 sugestões)
    // ═══════════════════════════════════════════
    if (action === "themes") {
      const { categoria, filter } = body;

      const filterCtx = filter
        ? `\nFILTRO ESPECÍFICO: "${filter}" — priorize temas relacionados a este filtro.`
        : "";

      const result = await callWithFallback(providers, [
        {
          role: "system",
          content: `${xaiPrefix}Você é o ESTRATEGISTA DE CONTEÚDO da Equipe Editorial IA xAI.

ÁREA: ${areaContext}
${filterCtx}

Sugira exatamente 10 pautas de artigos jurídicos com alta relevância atual.

Para cada pauta, forneça:
- titulo: título atrativo para blog jurídico
- resumo: 1 frase descritiva
- justificativa: por que publicar AGORA (cite evento, decisão ou tendência real)
- relevancia: "alta" | "media" | "urgente"
- keywords: 3 palavras-chave SEO
- tipo_sugerido: "opiniao" | "analise_caso" | "parecer" | "noticia"
- dificuldade: "iniciante" | "intermediario" | "avancado"

Retorne JSON: {"temas": [...]}

REGRAS:
- Baseie-se em tendências REAIS de 2025-2026 no direito brasileiro
- Cite decisões, projetos de lei ou eventos concretos na justificativa
- NÃO invente eventos ou decisões
- Diversifique entre diferentes sub-áreas
Retorne APENAS o JSON.`,
        },
        {
          role: "user",
          content: `Sugira 10 temas de artigos jurídicos atuais${categoria ? ` na área de ${categoria}` : ""}.`,
        }
      ], 4000, 0.7);

      let parsed: any = { temas: [] };
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* fallback */ }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: review — Refinar & Revisar (8 camadas)
    // ═══════════════════════════════════════════
    if (action === "review") {
      const { conteudo, titulo, reviewMode } = body;
      const plainText = (conteudo || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      if (plainText.length < 50) {
        return new Response(JSON.stringify({ error: "Texto muito curto." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isGrokRewrite = reviewMode === "grok";

      const result = await callWithFallback(providers, [
        {
          role: "system",
          content: `${xaiPrefix}Você é o EDITOR-CHEFE da Equipe Editorial IA xAI — ${isGrokRewrite ? "MODO GROK ATIVADO: reescreva com linguagem direta, impactante, objetiva e sem rodeios" : "revisão profissional completa"}.

${isGrokRewrite ? `MODO GROK:
- Elimine toda gordura textual — cada palavra deve ter propósito
- Frases curtas e impactantes — máximo 25 palavras por frase
- Assertividade máxima — posicione-se com confiança
- Dados e fatos > adjetivos e advérbios
- Tom: um advogado brilhante que respeita o tempo do leitor` : `REVISÃO PROFISSIONAL (8 CAMADAS):
1. GRAMÁTICA: Ortografia, pontuação, concordância, regência, crase
2. PRECISÃO JURÍDICA: Verifique cada citação legal — elimine alucinações
3. TOM: Profissional mas acessível — adequado para blog jurídico
4. ESTRUTURA: Introdução → argumentos → conclusão lógica
5. CITAÇÕES: Formate referências legais de forma padronizada
6. LEITURA: Otimize fluidez e clareza — parágrafos de 3-5 linhas
7. SEO: Garanta uso natural de palavras-chave no texto
8. IMPACTO: Reforce conclusão e call-to-action final`}

REGRAS:
- Preserve o sentido e ideias originais — melhore, não reescreva
- Mantenha todas as referências legais intactas
- Retorne o texto revisado em HTML semântico (<h2>, <h3>, <p>, <strong>, <em>, <blockquote>, <ul>, <li>)
- NÃO adicione conteúdo substantivo novo
- NÃO retorne markdown — apenas HTML
- Após o HTML, adicione um bloco separado com notas da revisão

Retorne JSON:
{
  "conteudo": "HTML revisado",
  "notas": [
    {"tipo": "correcao", "descricao": "O que foi corrigido"},
    {"tipo": "melhoria", "descricao": "O que foi melhorado"},
    {"tipo": "alerta", "descricao": "Pontos de atenção"}
  ],
  "scores": {
    "gramatica": 0-100,
    "precisao_juridica": 0-100,
    "clareza": 0-100,
    "estrutura": 0-100,
    "seo": 0-100,
    "geral": 0-100
  }
}
Retorne APENAS o JSON.`,
        },
        {
          role: "user",
          content: `${titulo ? `Título: ${titulo}\n\n` : ""}Revise este artigo:\n\n${conteudo}`,
        }
      ], 6000, isGrokRewrite ? 0.5 : 0.25);

      let parsed: any = {};
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // If JSON parse fails, treat as raw HTML
        const cleaned = result.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        parsed = { conteudo: cleaned, notas: [], scores: {} };
      }

      if (parsed.conteudo) {
        parsed.conteudo = parsed.conteudo.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: seo — SEO Jurídico Avançado
    // ═══════════════════════════════════════════
    if (action === "seo") {
      const { conteudo, titulo } = body;
      const plainText = (conteudo || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      if (plainText.length < 50) {
        return new Response(JSON.stringify({ error: "Texto muito curto." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await callWithFallback(providers, [
        {
          role: "system",
          content: `${xaiPrefix}Você é o ESPECIALISTA SEO da Equipe Editorial IA xAI.

ANÁLISE COMPLETA DE SEO JURÍDICO:

Retorne JSON:
{
  "meta_title": "título SEO até 60 chars com keyword principal no início",
  "meta_description": "descrição 120-155 chars convidativa com keywords naturais",
  "slug": "slug-curto-descritivo",
  "keywords_primary": ["3-5 keywords principais de alto volume"],
  "keywords_secondary": ["3-5 keywords secundárias"],
  "keywords_longtail": ["3-5 long-tail keywords"],
  "schema_type": "Article" | "LegalService" | "BlogPosting",
  "score_seo": 0-100,
  "analise": {
    "titulo_score": 0-100,
    "meta_score": 0-100,
    "keywords_score": 0-100,
    "estrutura_score": 0-100,
    "legibilidade_score": 0-100
  },
  "sugestoes": [
    "Sugestão 1 para melhorar SEO",
    "Sugestão 2",
    "Sugestão 3"
  ],
  "resumo_otimizado": "resumo de 120-155 chars otimizado para buscadores"
}

REGRAS:
- Keywords baseadas em termos jurídicos reais pesquisados no Google
- Score reflete práticas reais de SEO (não inflacione)
- Sugestões acionáveis e específicas
Retorne APENAS o JSON.`,
        },
        {
          role: "user",
          content: `${titulo ? `Título atual: ${titulo}\n\n` : ""}Analise o SEO deste artigo jurídico:\n\n${plainText.substring(0, 4000)}`,
        }
      ], 2000, 0.3);

      let parsed: any = {};
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* fallback */ }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: template — Templates Jurídicos
    // ═══════════════════════════════════════════
    if (action === "template") {
      const { templateId, topic } = body;

      const templates: Record<string, { name: string; structure: string }> = {
        opiniao_reforma: {
          name: "Artigo de Opinião sobre Reforma Legislativa",
          structure: "ementa → contexto da reforma → mudanças principais → impacto prático → posicionamento → conclusão",
        },
        analise_acordao: {
          name: "Análise de Acórdão",
          structure: "ementa do acórdão → relatório → voto condutor → fundamentos → impacto na jurisprudência → comentário crítico",
        },
        parecer_lgpd: {
          name: "Parecer sobre LGPD/Proteção de Dados",
          structure: "consulta → fundamentação (LGPD, GDPR, ANPD) → análise do caso → riscos → recomendações → conclusão",
        },
        noticia_stj: {
          name: "Notícia de Jurisprudência",
          structure: "lead (quem, o quê, quando) → contexto do caso → decisão → fundamentos → impacto → próximos passos",
        },
        thread_linkedin: {
          name: "Thread LinkedIn (5 posts)",
          structure: "hook impactante → contexto → análise → implicações práticas → CTA/conclusão (cada post máx 300 chars)",
        },
        artigo_constitucional: {
          name: "Artigo sobre Direito Constitucional",
          structure: "introdução → princípios constitucionais → análise dogmática → jurisprudência do STF → conclusão",
        },
        comentario_legislacao: {
          name: "Comentário de Nova Legislação",
          structure: "contexto legislativo → principais alterações → comparação com legislação anterior → impacto prático → recomendações",
        },
        guia_pratico: {
          name: "Guia Prático para Leigos",
          structure: "o que é → quem é afetado → passo a passo → direitos e deveres → quando buscar advogado → FAQ",
        },
      };

      const tmpl = templates[templateId];
      if (!tmpl) {
        return new Response(JSON.stringify({
          templates: Object.entries(templates).map(([id, t]) => ({ id, name: t.name })),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await callWithFallback(providers, [
        {
          role: "system",
          content: `${xaiPrefix}Você é o ARQUITETO DE CONTEÚDO da Equipe Editorial IA xAI.

TEMPLATE: ${tmpl.name}
ESTRUTURA: ${tmpl.structure}

Gere o conteúdo seguindo rigorosamente a estrutura do template.
${topic ? "" : "Escolha um tema atual e relevante de 2025-2026."}

REGRAS:
- HTML semântico: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>
- Mínimo 800 palavras (exceto thread LinkedIn — 5 posts de até 300 chars cada)
- Cite fontes reais (legislação, jurisprudência, doutrina)
- NÃO invente referências
- Para thread LinkedIn, retorne como array de posts no campo "posts"
- Autor: [Nome do Advogado] — [OAB]

Retorne JSON:
{
  "titulo": "...",
  "resumo": "meta descrição 120-155 chars",
  "conteudo": "HTML do artigo",
  "template_usado": "${templateId}",
  "fontes": ["fonte1", "fonte2"]
}
Retorne APENAS o JSON.`,
        },
        {
          role: "user",
          content: topic
            ? `Gere conteúdo usando o template "${tmpl.name}" sobre: ${topic}`
            : `Gere conteúdo usando o template "${tmpl.name}". Escolha um tema relevante e atual.`,
        }
      ], 5000, 0.5);

      let parsed: any = {};
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* fallback */ }

      if (parsed.conteudo) {
        parsed.conteudo = parsed.conteudo.replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      }

      return new Response(JSON.stringify({
        titulo: parsed.titulo || tmpl.name,
        resumo: parsed.resumo || "",
        conteudo: parsed.conteudo || result,
        template_usado: templateId,
        fontes: parsed.fontes || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════
    // ACTION: engagement — Análise de Engajamento
    // ═══════════════════════════════════════════
    if (action === "engagement") {
      const { titulo, resumo, conteudo, categoria } = body;
      const plainText = (conteudo || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      const result = await callWithFallback(providers, [
        {
          role: "system",
          content: `${xaiPrefix}Você é o ANALISTA DE ENGAJAMENTO da Equipe Editorial IA xAI.

Analise o potencial de engajamento deste artigo jurídico ANTES da publicação.

Retorne JSON:
{
  "score_engajamento": 0-100,
  "tempo_leitura_min": número estimado de minutos,
  "melhor_horario": "ex: terça-feira 9h ou quinta-feira 14h",
  "canais_recomendados": [
    {"canal": "LinkedIn", "score": 0-100, "motivo": "..."},
    {"canal": "Site/Blog", "score": 0-100, "motivo": "..."},
    {"canal": "Instagram", "score": 0-100, "motivo": "..."},
    {"canal": "Email Marketing", "score": 0-100, "motivo": "..."}
  ],
  "publico_alvo": "descrição do público ideal",
  "pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"],
  "pontos_fracos": ["ponto 1", "ponto 2"],
  "cta_sugerido": "sugestão de call-to-action",
  "titulo_alternativo": "sugestão de título mais engajante",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}

BASE DE ANÁLISE:
- Relevância do tema para o público jurídico
- Clareza e acessibilidade da linguagem
- Potencial de compartilhamento
- SEO e descoberta orgânica
- Apelo emocional e prático

Retorne APENAS o JSON.`,
        },
        {
          role: "user",
          content: `Analise o potencial de engajamento:\n\nTítulo: ${titulo || "Sem título"}\nResumo: ${resumo || "Sem resumo"}\nCategoria: ${categoria || "geral"}\n\nConteúdo:\n${plainText.substring(0, 3000)}`,
        }
      ], 2000, 0.4);

      let parsed: any = {};
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* fallback */ }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("editorial-orchestrator error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
