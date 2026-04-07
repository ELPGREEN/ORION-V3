import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeituraRequest {
  action:
    | "analyze_code"
    | "read_file"
    | "parse_logs"
    | "read_document"
    | "query_database"
    | "analyze_schema";
  params: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "Authorization required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ success: false, error: "Invalid token" }, 401);
    }

    const { action, params } = (await req.json()) as LeituraRequest;
    const startTime = Date.now();

    let result: Record<string, unknown>;

    switch (action) {
      case "analyze_code": {
        const { code, language, focus } = params as {
          code: string;
          language?: string;
          focus?: string;
        };
        if (!code) return json({ success: false, error: "code is required" }, 400);

        const prompt = buildCodeAnalysisPrompt(code, language, focus);
        result = await callLLM(prompt, "analyze_code");
        break;
      }

      case "read_document": {
        const { document_id } = params as { document_id: string };
        if (!document_id) return json({ success: false, error: "document_id required" }, 400);

        const { data: doc, error } = await supabase
          .from("documents")
          .select("title, content, document_type, metadata, tags, status, case_number, parties_author, parties_defendant")
          .eq("id", document_id)
          .eq("user_id", user.id)
          .single();

        if (error || !doc) {
          return json({ success: false, error: "Document not found or access denied" }, 404);
        }

        const plainContent = (doc.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

        const prompt = `Você é um ANALISTA JURÍDICO SÊNIOR. Analise o seguinte documento:

═══ METADADOS ═══
Título: ${doc.title}
Tipo: ${doc.document_type}
Status: ${doc.status}
Processo: ${doc.case_number || "N/A"}
Autor: ${doc.parties_author || "N/A"}
Réu: ${doc.parties_defendant || "N/A"}
Tags: ${(doc.tags || []).join(", ")}

═══ CONTEÚDO ═══
${plainContent.slice(0, 6000)}

═══ ANÁLISE REQUERIDA ═══
1. **Resumo executivo**: Síntese do documento em 3-5 linhas
2. **Tipo e classificação**: Identifique precisamente o tipo de peça jurídica
3. **Estrutura**: Avalie a organização (seções, argumentação, fundamentação)
4. **Fundamentação legal**: Liste artigos de lei, súmulas e jurisprudência citados
5. **Pontos fortes**: Argumentos sólidos e bem fundamentados
6. **Lacunas identificadas**: O que falta ou pode ser melhorado
7. **Riscos jurídicos**: Vulnerabilidades e pontos de ataque da parte adversa
8. **Recomendações**: Ações concretas para fortalecer o documento
9. **Nota de qualidade**: A (excelente), B (bom), C (regular), D (insuficiente)`;

        result = await callLLM(prompt, "read_document");
        result.document_metadata = {
          title: doc.title,
          type: doc.document_type,
          status: doc.status,
          case_number: doc.case_number,
        };
        break;
      }

      case "query_database": {
        const { table, filters, question } = params as {
          table: string;
          filters?: Record<string, unknown>;
          question?: string;
        };

        const allowedTables = [
          "documents", "processos", "client_profiles", "andamentos",
          "consultas", "invoices", "publicacoes"
        ];

        if (!allowedTables.includes(table)) {
          return json(
            { success: false, error: `Table '${table}' not allowed. Allowed: ${allowedTables.join(", ")}` },
            400
          );
        }

        let query = supabase.from(table).select("*").limit(50);

        const userIdTables = ["documents", "processos", "client_profiles", "consultas", "invoices", "publicacoes"];
        if (userIdTables.includes(table)) {
          query = query.eq("user_id", user.id);
        }

        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
              query = query.eq(key, value);
            }
          }
        }

        const { data: rows, error } = await query;
        if (error) {
          return json({ success: false, error: error.message }, 500);
        }

        if (question && rows && rows.length > 0) {
          const dataPreview = JSON.stringify(rows.slice(0, 10), null, 2);
          const prompt = `Dados da tabela '${table}' (${rows.length} registros, mostrando até 10):
${dataPreview}

Pergunta do usuário: ${question}

Responda de forma clara e objetiva em português. Se a pergunta envolve contagem, calcule com precisão. Se envolve filtragem, aplique os critérios aos dados. Forneça insights relevantes.`;

          result = await callLLM(prompt, "query_database");
          result.row_count = rows.length;
          result.raw_data = rows.slice(0, 5);
        } else {
          result = {
            analysis: `Encontrados ${(rows || []).length} registros na tabela '${table}'.`,
            row_count: (rows || []).length,
            raw_data: (rows || []).slice(0, 10),
          };
        }
        break;
      }

      case "analyze_schema": {
        const { table } = params as { table?: string };

        const schemaInfo = getSchemaInfo(table);
        const prompt = `Você é um DBA/Arquiteto de Software. Analise a seguinte estrutura de banco de dados Supabase:
${JSON.stringify(schemaInfo, null, 2)}

Forneça:
1. **Visão geral da arquitetura**: Como as tabelas se relacionam
2. **Relacionamentos**: FKs, dependências e integridade referencial
3. **Segurança (RLS)**: Avalie se as policies estão adequadas
4. **Performance**: Índices necessários e queries potencialmente lentas
5. **Otimizações sugeridas**: Melhorias concretas no schema`;

        result = await callLLM(prompt, "analyze_schema");
        result.schema = schemaInfo;
        break;
      }

      case "parse_logs": {
        const { logs, context } = params as { logs: string; context?: string };
        if (!logs) return json({ success: false, error: "logs is required" }, 400);

        const prompt = `Analise os seguintes logs${context ? ` (contexto: ${context})` : ""}:

${logs.slice(0, 4000)}

Forneça:
1. **Resumo**: O que aconteceu cronologicamente
2. **Erros/Warnings**: Listados com severidade
3. **Causa raiz**: Análise provável do problema
4. **Correção sugerida**: Passos concretos para resolver`;

        result = await callLLM(prompt, "parse_logs");
        break;
      }

      case "read_file": {
        const { content, filename, purpose } = params as {
          content: string;
          filename?: string;
          purpose?: string;
        };
        if (!content) return json({ success: false, error: "content is required" }, 400);

        const isLegalDoc = /\.(html|htm)$/i.test(filename || "") || /<(p|div|h[1-6])\b/i.test(content);
        const plainContent = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

        const prompt = isLegalDoc
          ? `Você é um JURISTA ESPECIALISTA. Analise o seguinte documento jurídico${filename ? ` (${filename})` : ""}${purpose ? `\n\nPERGUNTA/INSTRUÇÃO DO USUÁRIO: ${purpose}` : ""}:

${plainContent.slice(0, 8000)}

Forneça uma análise PROFISSIONAL e DETALHADA:
1. **Resumo executivo**: Síntese objetiva do documento
2. **Estrutura e organização**: Avalie seções, argumentos e fluxo lógico
3. **Fundamentação legal**: Artigos de lei, súmulas e jurisprudência presentes
4. **Pontos fortes**: Argumentos sólidos e bem construídos
5. **Lacunas e fragilidades**: O que precisa ser melhorado ou complementado
6. **Contra-argumentos possíveis**: Teses que a parte adversa pode usar
7. **Recomendações concretas**: Ações específicas para fortalecer o documento
${purpose ? `8. **Resposta direta**: Responda especificamente ao que foi perguntado/solicitado` : ""}

REGRAS:
- Use linguagem técnica jurídica formal
- Cite artigos de lei quando aplicável
- Seja objetivo e direto
- NÃO gere código React/TSX/JSX — apenas texto jurídico`
          : `Analise o seguinte arquivo${filename ? ` (${filename})` : ""}${purpose ? ` com foco em: ${purpose}` : ""}:

${content.slice(0, 6000)}

Forneça:
1. Tipo e propósito do arquivo
2. Estrutura e organização
3. Pontos relevantes
4. Observações e recomendações`;

        result = await callLLM(prompt, "read_file");
        break;
      }

      default:
        return json(
          {
            success: false,
            error: `Unknown action: ${action}. Available: analyze_code, read_file, parse_logs, read_document, query_database, analyze_schema`,
          },
          400
        );
    }

    const totalDuration = Date.now() - startTime;

    await supabase.from("ai_metrics").insert({
      provider: (result as Record<string, unknown>).provider as string || "groq",
      query: `agente-leitura:${action}`,
      total_duration_ms: totalDuration,
      success: true,
      complexity: action === "read_document" ? "complex" : "simple",
      cost_tier: 1,
      user_id: user.id,
      tools_used: ["agente-leitura"],
    });

    return json({ success: true, action, ...result, latencyMs: totalDuration });
  } catch (error) {
    console.error("Agente Leitura error:", error);
    return json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══ Multi-Provider LLM with Fallback ═══
async function callLLM(prompt: string, context: string) {
  const systemPrompt = `Você é um ANALISTA JURÍDICO e TÉCNICO de excelência. Seu papel é interpretar, analisar e extrair informações de documentos jurídicos, código, logs e dados com máxima precisão e profissionalismo.

REGRAS:
- Responda sempre em português brasileiro formal
- Use terminologia técnica adequada ao contexto
- Seja preciso, objetivo e completo
- Para documentos jurídicos: use linguagem forense profissional
- Para código: use linguagem técnica de engenharia de software
- NUNCA gere código React/JSX/TSX — apenas análise textual`;

  // Try Gemini first (larger context window, better analysis)
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    try {
      const geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
            generationConfig: { temperature: 0.15, maxOutputTokens: 8000 },
          }),
        }
      );

      if (geminiResp.ok) {
        const data = await geminiResp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          console.log(`[${context}] Used Gemini`);
          return { analysis: text, provider: "gemini" };
        }
      }
    } catch (e) {
      console.warn(`Gemini failed for ${context}:`, e);
    }
  }

  // Fallback to Groq
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.15,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "Sem resposta do modelo.";
    console.log(`[${context}] Used Groq`);
    return { analysis: text, provider: "groq" };
  }

  throw new Error("No LLM provider available");
}

function buildCodeAnalysisPrompt(code: string, language?: string, focus?: string): string {
  return `Analise o seguinte código${language ? ` (${language})` : ""}${focus ? ` com foco em: ${focus}` : ""}:

\`\`\`${language || ""}
${code.slice(0, 5000)}
\`\`\`

Forneça:
1. **O que faz**: Resumo funcional
2. **Qualidade**: Boas práticas, padrões seguidos
3. **Bugs/Vulnerabilidades**: Problemas potenciais
4. **Performance**: Complexidade e gargalos
5. **Melhorias**: Sugestões concretas`;
}

function getSchemaInfo(table?: string) {
  const tables: Record<string, string[]> = {
    documents: ["id", "title", "content", "document_type", "user_id", "folder_id", "status", "tags", "created_at", "case_number", "parties_author", "parties_defendant"],
    processos: ["id", "numero_processo", "cliente_nome", "tipo", "status", "comarca", "vara", "user_id", "client_profile_id", "valor_causa"],
    client_profiles: ["id", "nome", "email", "telefone", "cpf", "status", "tipo_caso", "user_id"],
    andamentos: ["id", "processo_id", "descricao", "tipo", "data_ocorrencia", "user_id"],
    consultas: ["id", "cliente_id", "advogado_id", "tipo", "status", "data_hora", "valor"],
    invoices: ["id", "amount", "status", "client_profile_id", "user_id", "due_date", "currency"],
    publicacoes: ["id", "titulo", "conteudo", "categoria", "publicado", "user_id"],
    legal_embeddings: ["id", "title", "content", "source", "source_label", "content_type", "embedding"],
    neural_knowledge_base: ["id", "title", "content", "source_type", "embedding", "is_processed", "user_id"],
  };

  if (table && tables[table]) {
    return { [table]: tables[table] };
  }
  return tables;
}
