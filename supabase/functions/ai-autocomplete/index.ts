import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// AI-AUTOCOMPLETE — Fast inline completion for the legal editor
// Also handles "review" mode for real-time document analysis
// ═══════════════════════════════════════════════════════════════

interface AIProvider {
  name: string;
  call: (msgs: Array<{ role: string; content: string }>, maxTokens: number, temperature: number) => Promise<string>;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function getProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  // Groq first (fastest for autocomplete)
  const groqKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("MOTHER_GROQ_API_KEY");
  if (groqKey) {
    providers.push({
      name: "Groq/llama-3.3-70b-versatile",
      call: async (msgs, maxTokens, temperature) => {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: msgs, temperature, max_tokens: maxTokens }),
        });
        if (!res.ok) { const t = await res.text(); throw new Error(`Groq ${res.status}: ${t.substring(0, 100)}`); }
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      },
    });
  }

  // (Lovable AI Gateway removed — using direct Gemini keys below for free usage)

  // Multiple Gemini keys for rate limit resilience
  const geminiKeys = ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"].map(n => Deno.env.get(n)).filter(Boolean) as string[];

  for (let i = 0; i < geminiKeys.length; i++) {
    const geminiKey = geminiKeys[i];
    providers.push({
      name: `Gemini/2.5-flash-key${i + 1}`,
      call: async (msgs, maxTokens, temperature) => {
        const contents = msgs.filter(m => m.role !== "system").map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
        const systemInstruction = msgs.find(m => m.role === "system")?.content || "";
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(20000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
        });
        if (!res.ok) { const t = await res.text(); throw new Error(`Gemini ${res.status}: ${t.substring(0, 100)}`); }
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      },
    });
  }

  // DeepSeek as ultimate fallback
  const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (deepseekKey) {
    providers.push({
      name: "DeepSeek/chat",
      call: async (msgs, maxTokens, temperature) => {
        const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({ model: "deepseek-chat", messages: msgs, temperature, max_tokens: maxTokens }),
        });
        if (!res.ok) { const t = await res.text(); throw new Error(`DeepSeek ${res.status}: ${t.substring(0, 100)}`); }
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      },
    });
  }

  // OpenAI as last resort
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (openaiKey) {
    providers.push({
      name: "OpenAI/gpt-4o-mini",
      call: async (msgs, maxTokens, temperature) => {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({ model: "gpt-4o-mini", messages: msgs, temperature, max_tokens: maxTokens }),
        });
        if (!res.ok) { const t = await res.text(); throw new Error(`OpenAI ${res.status}: ${t.substring(0, 100)}`); }
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      },
    });
  }

  return providers;
}

async function callWithFallback(
  providers: AIProvider[],
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const content = await provider.call(messages, maxTokens, temperature);
      if (content) return content;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.name}: ${msg}`);
      // If rate limited (429), add small delay before next provider
      if (msg.includes("429")) {
        await sleep(300);
      }
      console.warn(`${provider.name} failed:`, err);
    }
  }
  throw new Error(`All providers failed (${providers.length} tried): ${errors.slice(0, 3).join(" | ")}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate authentication
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Autenticação obrigatória." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { mode, context, cursorText, documentType, fullText } = body;
    const providers = getProviders();
    if (providers.length === 0) {
      return new Response(JSON.stringify({ error: "No AI providers configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "autocomplete") {
      // ── AUTOCOMPLETE MODE (v21: Neural-Enhanced) ──
      // Uses neuromodulation-inspired temperature adjustment
      // and hierarchical context analysis for better completions
      const contextWindow = (context || "").slice(-1200);
      const hasLegalTerms = /artigo|lei|súmula|jurisprudência|código|constitui/i.test(contextWindow);
      const hasStructure = /DOS FATOS|DO DIREITO|DOS PEDIDOS|REQUERIMENTO/i.test(contextWindow);
      
      // Adaptive temperature: lower for structured legal sections (exploitation)
      // higher for creative sections (exploration) — inspired by serotonin modulation
      const adaptiveTemp = hasStructure ? 0.15 : hasLegalTerms ? 0.25 : 0.35;
      
      const completion = await callWithFallback(providers, [
        {
          role: "system",
          content: `Você é um assistente neural de redação jurídica com expertise em ${documentType || "documentos jurídicos"}.

CONTEXTO NEURAL:
- Modo: Autocompletar inteligente com plasticidade adaptativa
- Ativação: Mish (gradiente suave para continuações naturais)
- Exploração: ${hasStructure ? "Baixa (seção estruturada detectada)" : "Moderada (seção criativa)"}

REGRAS ESTRITAS:
- Retorne APENAS a continuação do texto (máximo 1-2 frases curtas)
- NÃO repita o texto já escrito
- NÃO adicione explicações, comentários ou formatação
- Mantenha o tom jurídico formal e a coerência argumentativa
- Para seções estruturadas (FATOS, DIREITO, PEDIDOS), mantenha a formalidade máxima
- Para fundamentação, priorize citações legais precisas
- Se não conseguir completar com confiança, retorne string vazia`,
        },
        {
          role: "user",
          content: `Contexto do documento:\n"""${contextWindow}"""\n\nComplete a partir de: "${cursorText}"`,
        }
      ], 180, adaptiveTemp);

      // Clean the completion
      let cleaned = completion.trim();
      // Remove if it starts by repeating the cursor text
      if (cursorText && cleaned.toLowerCase().startsWith(cursorText.toLowerCase())) {
        cleaned = cleaned.slice(cursorText.length).trim();
      }
      // Remove markdown
      cleaned = cleaned.replace(/^[#*`\-]+\s*/g, "").replace(/[*`]+/g, "");

      return new Response(JSON.stringify({ completion: cleaned }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (mode === "rewrite") {
      // ── REWRITE MODE (v21: Neural Contextual Reformulation) ──
      // Uses hierarchical task decomposition: analyze → reformulate → validate
      const { selectedText, rewriteStyle = "formal", fullContext } = body;
      const text = selectedText || cursorText || "";
      
      if (text.length < 10) {
        return new Response(JSON.stringify({ rewritten: text }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stylePrompts: Record<string, string> = {
        formal: "tom formal, técnico e respeitoso, adequado para petições e peças processuais",
        persuasive: "tom persuasivo e assertivo, com ênfase retórica para convencer o magistrado",
        simplified: "linguagem clara e acessível, mantendo precisão jurídica mas simplificando jargões",
        academic: "tom acadêmico-doutrinário, com rigor teórico e referências conceituais",
      };

      const rewritten = await callWithFallback(providers, [
        {
          role: "system",
          content: `Você é um especialista neural em reformulação jurídica.

PIPELINE DE REFORMULAÇÃO (Hierárquico):
1. ANÁLISE: Identifique a intenção, termos-chave e estrutura do trecho
2. REFORMULAÇÃO: Reescreva com ${stylePrompts[rewriteStyle] || stylePrompts.formal}
3. VALIDAÇÃO: Garanta que o sentido jurídico foi preservado

REGRAS:
- Retorne APENAS o texto reformulado
- Preserve todas as referências legais (artigos, leis, súmulas)
- Mantenha a mesma extensão aproximada
- NÃO adicione conteúdo novo que não estava implícito no original`,
        },
        {
          role: "user",
          content: `${fullContext ? `Contexto do documento:\n"""${fullContext.substring(0, 2000)}"""\n\n` : ""}Reformule este trecho:\n\n"${text}"`,
        }
      ], 1024, 0.4);

      let cleaned = rewritten.trim().replace(/^["']|["']$/g, "");
      return new Response(JSON.stringify({ rewritten: cleaned }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (mode === "review") {
      // ── REVIEW MODE — ORCHESTRATED MULTI-AGENT ──
      // 3 specialized agents run in parallel, results merged by orchestrator
      const plainText = (fullText || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (plainText.length < 100) {
        return new Response(JSON.stringify({ issues: [], neuralMetrics: {} }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const docSnippet = plainText.substring(0, 6000);
      const docTypeLabel = documentType || "documento jurídico";

      const coreRules = `REGRAS CRÍTICAS:
- "excerpt" DEVE ser uma cópia LITERAL de um trecho do documento (copiar e colar exato).
- "replacementText" DEVE ser o texto corrigido pronto para substituição direta.
- Se NÃO for substituição textual direta (ex: "adicionar seção"), marque "autoApplicable": false.
- Se for substituição direta (ex: trocar "constiuição" por "constituição"), marque "autoApplicable": true.
- Retorne APENAS um array JSON de issues. Máximo 5 por agente.
- Cada issue: {"type":"error"|"warning"|"suggestion","category":"<CAT>","message":"descrição","excerpt":"trecho literal","fix":"descrição","replacementText":"texto corrigido","autoApplicable":true|false,"confidence":0.0-1.0,"headSource":"<AGENT>"}`;

      // ─── AGENT 1: REVISOR (grammar, style) ───
      const agentRevisor = callWithFallback(providers, [
        { role: "system", content: `═══ AGENTE: REVISOR ═══\nFUNÇÃO: Revisar gramática, ortografia, pontuação, concordância, regência, crase e estilo formal jurídico.\nPara cada erro, forneça o trecho literal e a correção exata.\nNUNCA altere conteúdo substantivo — corrija apenas a forma.\n\n${coreRules}\n\nCategorias: "grammar" ou "style". headSource: "revisor"\nRetorne APENAS: [...]` },
        { role: "user", content: `Tipo: ${docTypeLabel}\n\nDocumento:\n${docSnippet}` }
      ], 2000, 0.1);

      // ─── AGENT 2: PESQUISADOR JURÍDICO (legal, consistency) ───
      const agentLegal = callWithFallback(providers, [
        { role: "system", content: `═══ AGENTE: PESQUISADOR JURÍDICO ═══\nFUNÇÃO: Verificar fundamentação legal, citações de artigos/leis/súmulas e consistência.\nIdentifique: artigos citados incorretamente, leis inexistentes, contradições entre argumentos.\nPROIBIDO inventar números de leis ou súmulas.\n\n${coreRules}\n\nCategorias: "legal" ou "consistency". headSource: "pesquisador"\nRetorne APENAS: [...]` },
        { role: "user", content: `Tipo: ${docTypeLabel}\n\nDocumento:\n${docSnippet}` }
      ], 2000, 0.1);

      // ─── AGENT 3: FORMATADOR (structure) ───
      const agentFormato = callWithFallback(providers, [
        { role: "system", content: `═══ AGENTE: FORMATADOR ═══\nFUNÇÃO: Avaliar estrutura, organização e completude do documento.\nVerifique: hierarquia de seções, numeração, seções obrigatórias, ordem lógica.\nPara seções faltantes, marque autoApplicable=false.\n\n${coreRules}\n\nCategoria: "structure". headSource: "formatador"\nRetorne APENAS: [...]` },
        { role: "user", content: `Tipo: ${docTypeLabel}\n\nDocumento:\n${docSnippet}` }
      ], 1500, 0.15);

      // ─── ORCHESTRATOR: Run all agents in parallel, merge ───
      const [r1, r2, r3] = await Promise.allSettled([agentRevisor, agentLegal, agentFormato]);

      const parseAgent = (r: PromiseSettledResult<string>): any[] => {
        if (r.status !== "fulfilled") return [];
        try {
          const arr = r.value.match(/\[[\s\S]*\]/);
          if (arr) return JSON.parse(arr[0]);
          const obj = r.value.match(/\{[\s\S]*\}/);
          if (obj) { const o = JSON.parse(obj[0]); return o.issues || [o]; }
        } catch { /* skip */ }
        return [];
      };

      const allIssues = [...parseAgent(r1), ...parseAgent(r2), ...parseAgent(r3)].slice(0, 12);

      // Compute metrics from agent findings
      const countByCat = (cat: string) => allIssues.filter(i => i.category === cat).length;
      const sc = (n: number, w: number) => Math.max(0, Math.round(100 - n * w));
      const neuralMetrics = {
        grammarScore: sc(countByCat("grammar") + countByCat("style"), 12),
        legalScore: sc(countByCat("legal"), 15),
        structureScore: sc(countByCat("structure"), 18),
        consistencyScore: sc(countByCat("consistency"), 20),
        styleScore: sc(countByCat("style"), 10),
        overallScore: 0,
      };
      neuralMetrics.overallScore = Math.round(
        neuralMetrics.grammarScore * 0.20 + neuralMetrics.legalScore * 0.25 +
        neuralMetrics.structureScore * 0.20 + neuralMetrics.consistencyScore * 0.20 +
        neuralMetrics.styleScore * 0.15
      );

      return new Response(JSON.stringify({ issues: allIssues, neuralMetrics }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (mode === "structural") {
      // ── STRUCTURAL ANALYSIS MODE ──
      const plainText = (fullText || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      const structResult = await callWithFallback(providers, [
        {
          role: "system",
          content: `Você é um especialista em estrutura de documentos jurídicos.
Analise a completude estrutural do documento e retorne um JSON:
{
  "score": 0-100,
  "missingSections": [{"name": "Nome da Seção", "importance": "critical" | "recommended" | "optional", "suggestion": "texto sugerido para a seção"}],
  "presentSections": ["nome1", "nome2"],
  "summary": "resumo da análise em 1-2 frases",
  "elements": [
    {"type": "title", "text": "exemplo do título encontrado", "count": 1},
    {"type": "citation", "text": "Art. 5º, CF/88", "count": 3}
  ]
}

TIPOS DE ELEMENTOS para detectar:
- "title": títulos e cabeçalhos principais
- "subtitle": subtítulos
- "paragraph": parágrafos de corpo de texto
- "citation": citações legais
- "jurisprudence": referências a jurisprudência
- "article": referências a artigos específicos
- "signature": blocos de assinatura
- "date": datas mencionadas
- "list": listas enumeradas
- "header": cabeçalhos de seção
- "clause": cláusulas contratuais

Para ${documentType || "documento jurídico"}, verifique seções obrigatórias.
Retorne APENAS o JSON.`,
        },
        {
          role: "user",
          content: `Analise a estrutura deste documento:\n\n${plainText.substring(0, 5000)}`,
        }
      ], 3000, 0.2);

      let analysis: any = { score: 0, missingSections: [], presentSections: [], summary: "" };
      try {
        const jsonMatch = structResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.warn("Failed to parse structural JSON");
      }

      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (mode === "pub_generate") {
      // ── PUBLICATION: GENERATE FULL ARTICLE ──
      const { topic, categoria } = body;
      const result = await callWithFallback(providers, [
        {
          role: "system",
          content: `Você é um redator jurídico especialista. Gere um artigo completo e profissional para publicação em blog jurídico.

O artigo deve ter:
- Título atrativo e profissional
- Resumo de 1-2 frases (máximo 160 caracteres) para SEO
- Conteúdo estruturado com introdução, desenvolvimento com fundamentação legal, e conclusão
- Tom profissional, acessível ao público leigo mas tecnicamente preciso
- Referências a legislação e jurisprudência quando pertinente

Retorne um JSON com: {"titulo": "...", "resumo": "...", "conteudo": "conteúdo em HTML com <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>"}

REGRAS:
- Conteúdo em HTML semântico limpo (NÃO markdown)
- Mínimo 800 palavras de conteúdo
- Autor: ORION IA — ELP Green Technology
- Categoria: ${categoria || "geral"}
- NÃO invente números de leis ou súmulas — use referências reais ou genéricas
Retorne APENAS o JSON.`,
        },
        {
          role: "user",
          content: topic
            ? `Gere um artigo jurídico sobre: ${topic}`
            : `Gere um artigo jurídico atual e relevante na área de ${categoria || "direito"}. Escolha um tema em alta.`,
        }
      ], 4000, 0.6);

      let parsed: any = {};
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* fallback below */ }

      return new Response(JSON.stringify({
        titulo: parsed.titulo || "Artigo Gerado pela IA",
        resumo: parsed.resumo || "",
        conteudo: parsed.conteudo || result,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (mode === "pub_themes") {
      // ── PUBLICATION: SUGGEST THEMES ──
      const { categoria } = body;
      const result = await callWithFallback(providers, [
        {
          role: "system",
          content: `Você é um estrategista de conteúdo jurídico. Sugira 5 temas de artigos relevantes e atuais.

Para cada tema, forneça:
- Título sugerido (atrativo para blog)
- Resumo breve (1 frase)
- Justificativa de relevância (por que publicar agora)
- Categoria jurídica

Retorne JSON: {"temas": [{"titulo": "...", "resumo": "...", "justificativa": "...", "categoria": "..."}]}
Baseie-se em tendências reais de 2024-2025 no direito brasileiro.
${categoria ? `Foque na área: ${categoria}` : "Diversifique entre diferentes áreas do direito."}
Retorne APENAS o JSON.`,
        },
        {
          role: "user",
          content: "Sugira 5 temas de artigos jurídicos atuais e relevantes para publicação.",
        }
      ], 2000, 0.7);

      let parsed: any = { temas: [] };
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* fallback */ }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (mode === "pub_improve") {
      // ── PUBLICATION: IMPROVE EXISTING TEXT ──
      const { conteudo, titulo } = body;
      const plainText = (conteudo || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      if (plainText.length < 50) {
        return new Response(JSON.stringify({ error: "Texto muito curto para melhorar." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await callWithFallback(providers, [
        {
          role: "system",
          content: `Você é um editor jurídico especialista. Melhore o texto fornecido para publicação profissional.

TAREFAS:
1. Corrija erros de gramática, ortografia e pontuação
2. Melhore clareza e fluidez
3. Reforce a fundamentação jurídica onde necessário
4. Aprimore o tom profissional mantendo acessibilidade
5. Melhore a estrutura e transições entre parágrafos

REGRAS:
- Preserve o sentido e as ideias originais
- Mantenha todas as referências legais
- Retorne o texto melhorado em HTML semântico (<h2>, <h3>, <p>, <strong>, <em>, <blockquote>, <ul>, <li>)
- NÃO adicione conteúdo substancial novo
- NÃO retorne markdown, apenas HTML
Retorne APENAS o HTML do texto melhorado.`,
        },
        {
          role: "user",
          content: `${titulo ? `Título: ${titulo}\n\n` : ""}Melhore este artigo:\n\n${conteudo}`,
        }
      ], 4000, 0.3);

      // Strip code fences if AI wrapped response in ```html ... ```
      const cleaned = result.trim().replace(/^```(?:html)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

      return new Response(JSON.stringify({ conteudo: cleaned }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (mode === "pub_seo") {
      // ── PUBLICATION: GENERATE SEO SUMMARY ──
      const { conteudo, titulo } = body;
      const plainText = (conteudo || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

      const result = await callWithFallback(providers, [
        {
          role: "system",
          content: `Você é um especialista em SEO para conteúdo jurídico. Gere um resumo otimizado para mecanismos de busca.

Retorne JSON:
{
  "resumo": "meta descrição de até 160 caracteres, com palavras-chave naturais",
  "slug": "slug-otimizado-para-url",
  "keywords": ["palavra-chave-1", "palavra-chave-2", "palavra-chave-3"]
}

REGRAS:
- Resumo entre 120-160 caracteres
- Inclua a palavra-chave principal no início
- Tom informativo e convidativo
- Slug curto e descritivo (máximo 5 palavras separadas por hífen)
- 3-5 palavras-chave relevantes
Retorne APENAS o JSON.`,
        },
        {
          role: "user",
          content: `${titulo ? `Título: ${titulo}\n\n` : ""}Gere SEO para:\n\n${plainText.substring(0, 3000)}`,
        }
      ], 500, 0.3);

      let parsed: any = {};
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* fallback */ }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("ai-autocomplete error:", err);
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    const isRateLimit = errorMsg.includes("429") || errorMsg.includes("rate limit") || errorMsg.includes("Rate limit") || errorMsg.includes("All providers failed");
    const status = isRateLimit ? 429 : 500;
    const userMessage = isRateLimit 
      ? "Todos os provedores de IA estão temporariamente sobrecarregados. Aguarde alguns segundos e tente novamente."
      : errorMsg;
    return new Response(JSON.stringify({ error: userMessage, retryable: isRateLimit }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
