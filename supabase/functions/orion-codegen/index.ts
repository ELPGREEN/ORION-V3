import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Gemini Helpers ───

function getGeminiKeys(): string[] {
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

async function generateEmbedding(text: string): Promise<number[]> {
  const keys = getGeminiKeys();
  for (const key of keys) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: text.slice(0, 4000) }] },
            outputDimensionality: 768,
          }),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const values = data?.embedding?.values;
      if (values?.length >= 768) return values.slice(0, 768);
    } catch { continue; }
  }
  // Fallback: HuggingFace all-MiniLM-L6-v2 (384d → 768d zero-padded)
  try {
    const hfKey = Deno.env.get("HUGGINGFACE_API_KEY") || Deno.env.get("HF_TOKEN") || Deno.env.get("CHAVE_API_HUGGINGFACE");
    if (!hfKey) throw new Error("No HF key");
    console.warn("⚠️ Gemini exhausted — HF fallback for codegen embedding");
    const res = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text.slice(0, 4000), options: { wait_for_model: true } }),
      }
    );
    if (!res.ok) throw new Error(`HF error ${res.status}`);
    const data = await res.json();
    const values = Array.isArray(data[0]) ? data[0] : data;
    if (!values?.length) throw new Error("No HF embedding");
    return values.length >= 768 ? values.slice(0, 768) : [...values, ...new Array(768 - values.length).fill(0)];
  } catch (hfErr) {
    console.error("❌ HF fallback failed:", hfErr);
  }
  throw new Error("All embedding providers failed (Gemini + HuggingFace)");
}

async function callAnthropicLLM(
  prompt: string,
  systemPrompt: string,
  maxTokens = 8192,
  temperature = 0.3
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data?.content?.[0]?.text || "";
}

async function callLLMWithFallback(
  prompt: string,
  systemPrompt: string,
  maxTokens = 8192,
  temperature = 0.3
): Promise<{ text: string; provider: string }> {
  // Try Gemini first (free tier)
  const geminiKeys = getGeminiKeys();
  // Try Gemini 2.5 Flash first (free tier, best quality)
  const geminiModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  for (const model of geminiModels) {
    for (const key of geminiKeys) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(120000),
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: maxTokens, temperature },
            }),
          }
        );
        if (!res.ok) { await res.text(); continue; }
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text) return { text, provider: model };
      } catch { continue; }
    }
    console.warn(`[orion-codegen] ${model} exhausted, trying next...`);
  }
  console.warn("[orion-codegen] All Gemini models exhausted, falling back to Anthropic");

  // Fallback: Anthropic Claude
  try {
    const text = await callAnthropicLLM(prompt, systemPrompt, maxTokens, temperature);
    return { text, provider: "claude-sonnet-4" };
  } catch (e) {
    console.error("[orion-codegen] Anthropic also failed:", e);
  }

  throw new Error("All LLM providers exhausted (Gemini + Anthropic)");
}

// ─── RAG Search ───

async function searchRAG(
  supabase: ReturnType<typeof createClient>,
  embedding: number[],
  queryText: string,
  maxResults = 15
): Promise<Array<{ title: string; content: string; source: string; score: number }>> {
  const results: Array<{ title: string; content: string; source: string; score: number }> = [];

  // 1. Search neural_knowledge_base (code snippets, docs, patterns)
  try {
    const { data: neuralData } = await supabase.rpc("search_neural_knowledge", {
      query_embedding: `[${embedding.join(",")}]`,
      query_text: queryText,
      match_count: Math.ceil(maxResults * 0.6),
      semantic_weight: 0.7,
      keyword_weight: 0.3,
    });
    if (neuralData) {
      for (const item of neuralData) {
        results.push({
          title: item.title || "Sem título",
          content: item.content?.slice(0, 3000) || "",
          source: `neural/${item.source_type || "unknown"}`,
          score: item.combined_score || 0,
        });
      }
    }
  } catch (e) {
    console.warn("[RAG] Neural search failed:", e);
  }

  // 2. Search legal_embeddings (legal code, regulations — useful for compliance-aware code)
  try {
    const { data: legalData } = await supabase.rpc("search_legal_embeddings", {
      query_embedding: `[${embedding.join(",")}]`,
      match_threshold: 0.4,
      match_count: Math.ceil(maxResults * 0.4),
    });
    if (legalData) {
      for (const item of legalData) {
        results.push({
          title: item.title || "Legal doc",
          content: item.content?.slice(0, 2000) || "",
          source: `legal/${item.source || "unknown"}`,
          score: item.similarity || 0,
        });
      }
    }
  } catch (e) {
    console.warn("[RAG] Legal search failed:", e);
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}

// ─── System Prompt ───

const CODEGEN_SYSTEM_PROMPT = `Você é o ORION, um engenheiro de software neural avançado especializado em:
- React 18 + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (Edge Functions, RLS, Realtime)
- Robótica industrial (ROS2, MQTT, WebRTC, AGV, braços robóticos, visão computacional)
- Integração com HuggingFace (Transformers.js, Gradio Spaces)

## Regras de geração de código:
1. SEMPRE gere código COMPLETO e funcional — nunca use "// TODO" ou placeholders
2. Use TypeScript estrito com tipos explícitos
3. Para React: componentes funcionais, hooks, design system com tokens semânticos (bg-background, text-foreground, etc.)
4. Para Edge Functions: inclua CORS headers, validação de input, tratamento de erros
5. Para robótica: use padrões ROS2 (topics, services, actions), MQTT QoS adequado
6. Documente com JSDoc em português
7. Se o contexto RAG contiver padrões ou snippets relevantes, ADAPTE-OS ao invés de inventar do zero
8. Priorize código production-ready: error handling, retry logic, rate limiting quando aplicável

## Formato de resposta:
Responda com blocos de código claramente delimitados. Para múltiplos arquivos, use:
\`\`\`typescript:caminho/do/arquivo.ts
// código aqui
\`\`\`

Se precisar explicar algo, seja BREVE — foque no código.`;

// ─── Main Handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    let userId: string | null = null;
    
    if (token === serviceKey) {
      userId = "service-role";
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Token inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = user.id;
    }

    // Rate limiting
    if (userId !== "service-role") {
      const { data: allowed } = await supabase.rpc("check_rate_limit", {
        _user_id: userId,
        _function_name: "orion-codegen",
        _max_requests: 20,
        _window_minutes: 10,
      });
      if (allowed === false) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Aguarde alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Parse request
    const body = await req.json();
    const { prompt, codeType, context: extraContext, maxTokens = 8192, temperature = 0.3 } = body;

    if (!prompt || typeof prompt !== "string" || prompt.length < 5) {
      return new Response(
        JSON.stringify({ error: "Prompt obrigatório (min 5 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🧠 [orion-codegen] User=${userId}, prompt="${prompt.slice(0, 100)}...", type=${codeType || "auto"}`);
    const startTime = performance.now();

    // Step 1: Generate embedding for the prompt
    const embedding = await generateEmbedding(prompt);
    const embeddingTime = Math.round(performance.now() - startTime);
    console.log(`  📐 Embedding: ${embeddingTime}ms`);

    // Step 2: RAG search
    const ragResults = await searchRAG(supabase, embedding, prompt);
    const ragTime = Math.round(performance.now() - startTime);
    console.log(`  🔍 RAG: ${ragResults.length} results in ${ragTime - embeddingTime}ms`);

    // Step 3: Build augmented prompt
    const ragContext = ragResults.length > 0
      ? ragResults.map((r, i) => 
          `### Referência ${i + 1} [${r.source}] (score: ${r.score.toFixed(3)})\n**${r.title}**\n${r.content}`
        ).join("\n\n---\n\n")
      : "Nenhum contexto relevante encontrado na base de conhecimento.";

    const codeTypeHint = codeType
      ? `\n\n**Tipo de código solicitado:** ${codeType}`
      : "";

    const extraCtx = extraContext
      ? `\n\n**Contexto adicional do usuário:**\n${extraContext}`
      : "";

    const augmentedPrompt = `## Contexto da Base de Conhecimento (RAG)

${ragContext}

---

## Solicitação do Usuário
${prompt}${codeTypeHint}${extraCtx}

---

Gere o código solicitado usando o contexto da base de conhecimento acima como referência. Adapte padrões encontrados quando relevante.`;

    // Step 4: Generate code via LLM (Gemini → Anthropic fallback)
    const { text: generatedCode, provider: usedProvider } = await callLLMWithFallback(
      augmentedPrompt,
      CODEGEN_SYSTEM_PROMPT,
      maxTokens,
      temperature
    );
    const totalTime = Math.round(performance.now() - startTime);
    console.log(`  ✅ Code generated via ${usedProvider} in ${totalTime}ms (${generatedCode.length} chars)`);

    // Step 5: Log metrics
    try {
      await supabase.from("ai_metrics").insert({
        provider: usedProvider,
        query: prompt.slice(0, 500),
        total_duration_ms: totalTime,
        phase1_duration_ms: embeddingTime,
        phase2_duration_ms: totalTime - embeddingTime,
        response_length: generatedCode.length,
        data_sources_used: ragResults.map(r => r.source),
        tools_used: ["rag-search", usedProvider],
        success: true,
        user_id: userId !== "service-role" ? userId : null,
      });
    } catch { /* non-critical */ }

    return new Response(
      JSON.stringify({
        code: generatedCode,
        provider: usedProvider,
        rag_sources: ragResults.map(r => ({
          title: r.title,
          source: r.source,
          score: r.score,
        })),
        metrics: {
          embedding_ms: embeddingTime,
          rag_results: ragResults.length,
          total_ms: totalTime,
          output_chars: generatedCode.length,
          provider: usedProvider,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[orion-codegen] Fatal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
