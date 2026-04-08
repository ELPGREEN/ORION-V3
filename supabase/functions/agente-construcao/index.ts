import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ConstrucaoRequest {
  action:
    | "generate_component"
    | "generate_edge_function"
    | "generate_sql"
    | "generate_document"
    | "propose_changes"
    | "review_proposal"
    | "supagent_construct"
    | "supagent_plan"
    | "supagent_status"
    | "supagent_rollback"
    | "supagent_learn_error"
    | "supagent_frontend_instruction";
  params: Record<string, unknown>;
}

interface Proposal {
  id: string;
  type: string;
  description: string;
  code: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
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

    const { action, params } = (await req.json()) as ConstrucaoRequest;
    const startTime = Date.now();

    let result: Record<string, unknown>;

    switch (action) {
      case "generate_component": {
        const { description, framework, style } = params as {
          description: string;
          framework?: string;
          style?: string;
        };
        if (!description) return json({ success: false, error: "description required" }, 400);

        const prompt = `Gere um componente React/TypeScript:
Descrição: ${description}
Framework: ${framework || "React + TypeScript + Tailwind CSS + shadcn/ui"}
Estilo: ${style || "Design system com tokens semânticos"}

Regras:
- Tokens semânticos (bg-background, text-foreground, text-primary)
- NÃO use cores diretas (bg-white, text-black)
- shadcn/ui components quando possível
- TypeScript estrito com interfaces
- Código limpo e reutilizável

Retorne APENAS o código TSX em bloco de código.`;

        const generated = await callLLM(prompt, "generate_component");
        result = {
          proposal: {
            id: crypto.randomUUID(),
            type: "component",
            description,
            code: generated.analysis,
            status: "pending",
            created_at: new Date().toISOString(),
          } as Proposal,
          message: "⚠️ Proposta gerada. Revise antes de aplicar.",
        };
        break;
      }

      case "generate_edge_function": {
        const { name, description, endpoints } = params as {
          name: string;
          description: string;
          endpoints?: string[];
        };
        if (!name || !description) {
          return json({ success: false, error: "name and description required" }, 400);
        }

        const prompt = `Gere Supabase Edge Function (Deno):
Nome: ${name}
Descrição: ${description}
Endpoints: ${(endpoints || ["POST"]).join(", ")}

Regras obrigatórias:
1. CORS headers completos do Supabase
2. JWT validation com supabase.auth.getUser()
3. import { createClient } from "npm:@supabase/supabase-js@2"
4. Error handling com try/catch
5. NUNCA executar SQL raw
6. Deno.serve() como entrypoint

Retorne APENAS o TypeScript em bloco de código.`;

        const generated = await callLLM(prompt, "generate_edge_function");
        result = {
          proposal: {
            id: crypto.randomUUID(),
            type: "edge_function",
            description: `Edge function: ${name}`,
            code: generated.analysis,
            status: "pending",
            created_at: new Date().toISOString(),
          } as Proposal,
          message: "⚠️ Edge Function gerada. Revise CUIDADOSAMENTE — acesso total ao banco.",
        };
        break;
      }

      case "generate_sql": {
        const { description, operation } = params as {
          description: string;
          operation?: "migration" | "query" | "function" | "policy";
        };
        if (!description) return json({ success: false, error: "description required" }, 400);

        const prompt = `Gere SQL para Supabase/PostgreSQL:
Descrição: ${description}
Operação: ${operation || "migration"}

Regras:
1. NUNCA modificar auth, storage, realtime, vault
2. Sempre incluir RLS policies
3. SECURITY DEFINER + SET search_path para functions
4. gen_random_uuid() para PKs
5. created_at/updated_at com defaults
6. Validation triggers ao invés de CHECK com now()

Retorne APENAS o SQL.`;

        const generated = await callLLM(prompt, "generate_sql");
        result = {
          proposal: {
            id: crypto.randomUUID(),
            type: "sql",
            description,
            code: generated.analysis,
            status: "pending",
            created_at: new Date().toISOString(),
          } as Proposal,
          message: "⚠️ SQL gerado. REVISE CUIDADOSAMENTE — mudanças irreversíveis.",
        };
        break;
      }

      case "generate_document": {
        const { document_type, title, context, area_juridica } = params as {
          document_type: string;
          title: string;
          context?: string;
          area_juridica?: string;
        };
        if (!document_type || !title) {
          return json({ success: false, error: "document_type and title required" }, 400);
        }

        // Fetch office config
        const { data: config } = await supabase
          .from("escritorio_config")
          .select("*")
          .eq("user_id", user.id)
          .single();

        const nomeEscritorio = config?.nome_escritorio || "Escritório";
        const oab = config?.oab || "";

        // Fetch user's style memory for this document type
        const { data: styleMemory } = await supabase
          .from("document_style_memory")
          .select("style_fingerprint")
          .eq("user_id", user.id)
          .eq("document_type", document_type)
          .single();

        const styleContext = styleMemory?.style_fingerprint
          ? `\n\n═══ ESTILO APRENDIDO DO USUÁRIO ═══\n${JSON.stringify(styleMemory.style_fingerprint, null, 2)}\nAplique este estilo ao documento gerado.`
          : "";

        const hasExistingContent = context && context.trim().length > 100;

        const prompt = hasExistingContent
          ? `Você é um JURISTA SÊNIOR especializado em ${area_juridica || "Direito"}.

Com base no documento existente, gere conteúdo COMPLEMENTAR conforme solicitado:

SOLICITAÇÃO: ${title}
Tipo: ${document_type}
Área: ${area_juridica || "Geral"}
Escritório: ${nomeEscritorio} | OAB: ${oab}
${styleContext}

═══ DOCUMENTO EXISTENTE ═══
${context!.substring(0, 4000)}

═══ REGRAS OBRIGATÓRIAS ═══
- NÃO repita conteúdo existente
- Gere APENAS o conteúdo novo solicitado
- HTML semântico: <h2>, <h3>, <p>, <strong>, <em>, <blockquote>
- Mantenha tom e estilo do documento existente
- Fundamentação legal com artigos REAIS
- NUNCA invente números de leis ou súmulas
- Citações jurisprudenciais com: Tribunal, nº do recurso, Relator, data
- Formato narrativo fluido, sem bullet points no corpo
- Citações longas (>3 linhas): <blockquote style="margin-left:4cm;font-size:11px;line-height:1.2">

A saída DEVE ser HTML puro — sem markdown, sem backticks, sem explicações.`
          : `Você é um JURISTA SÊNIOR especializado em ${area_juridica || "Direito"}.

Gere um documento jurídico COMPLETO e PROFISSIONAL:

Tipo: ${document_type}
Título/Descrição: ${title}
Área: ${area_juridica || "Geral"}
Escritório: ${nomeEscritorio} | OAB: ${oab}
${styleContext}

═══ ESTRUTURA OBRIGATÓRIA PARA ${document_type.toUpperCase()} ═══
${getDocumentStructure(document_type)}

═══ REGRAS DE FORMATAÇÃO ═══
- HTML semântico puro: <h1>, <h2>, <h3>, <p>, <strong>, <em>, <blockquote>, <ol>, <ul>, <li>
- <h1> centralizado, caixa alta para o título
- <h2> para seções principais com numeração (I, II, III...)
- <p> com text-align: justify
- Citações longas: <blockquote style="margin-left:4cm;font-size:11px;line-height:1.2">
- Campos pendentes: <span class="placeholder">[PREENCHER]</span>
- Fundamentação legal com artigos REAIS e números verificáveis
- NUNCA invente números de leis, súmulas ou processos
- Citações jurisprudenciais com formato completo: Tribunal, Turma/Câmara, Tipo e nº recurso, Relator, data julgamento, fonte publicação
- Formato narrativo fluido, sem bullet points no corpo principal

A saída DEVE começar diretamente com <h1> — sem markdown, sem backticks, sem explicações.`;

        const generated = await callLLM(prompt, "generate_document");
        result = {
          proposal: {
            id: crypto.randomUUID(),
            type: "document",
            description: `${document_type}: ${title}`,
            code: generated.analysis,
            status: "pending",
            created_at: new Date().toISOString(),
          } as Proposal,
          analysis: hasExistingContent
            ? "Conteúdo complementar gerado com base no documento existente."
            : "Documento completo gerado. Revise e aplique no editor.",
          message: "Documento gerado. Clique em Aplicar para inserir no editor.",
        };
        break;
      }

      case "propose_changes": {
        const { file_content, changes_description } = params as {
          file_content: string;
          changes_description: string;
        };
        if (!file_content || !changes_description) {
          return json({ success: false, error: "file_content and changes_description required" }, 400);
        }

        const prompt = `Dado o seguinte código:
\`\`\`
${file_content.slice(0, 5000)}
\`\`\`

Aplique: ${changes_description}

Regras:
- Mantenha estilo e convenções existentes
- Minimize mudanças
- Tokens semânticos do Tailwind
- Preserve imports e exports

Retorne o código COMPLETO modificado.`;

        const generated = await callLLM(prompt, "propose_changes");
        result = {
          proposal: {
            id: crypto.randomUUID(),
            type: "code_change",
            description: changes_description,
            code: generated.analysis,
            status: "pending",
            created_at: new Date().toISOString(),
          } as Proposal,
          message: "⚠️ Proposta de alteração gerada. Compare com o original.",
        };
        break;
      }

      case "review_proposal": {
        const { proposal_id, decision, notes } = params as {
          proposal_id: string;
          decision: "approved" | "rejected";
          notes?: string;
        };
        if (!proposal_id || !decision) {
          return json({ success: false, error: "proposal_id and decision required" }, 400);
        }

        result = {
          proposal_id,
          decision,
          notes: notes || "",
          message:
            decision === "approved"
              ? "✅ Proposta aprovada. Aplique as mudanças."
              : "❌ Proposta rejeitada. Gere nova proposta com instruções mais específicas.",
          timestamp: new Date().toISOString(),
        };
        break;
      }

      // ═══════════════════════════════════════════════════════════
      // SUPAGENT: Auto-construção inteligente do Orion
      // ═══════════════════════════════════════════════════════════
      case "supagent_construct": {
        const { intent, target_type, target_name, context, auto_apply, priority } = params as {
          intent: string; target_type?: string; target_name?: string; context?: string;
          auto_apply?: boolean; priority?: string;
        };
        if (!intent) return json({ success: false, error: "intent required" }, 400);

        console.log(`🏗️ SupAgent: Construindo — ${intent.substring(0, 100)}`);

        // Analyze risk
        const plan = analyzeRisk(intent, target_type || "auto", target_name);

        // Generate code via LLM
        const supagentPrompt = buildSupagentPrompt(intent, target_type || "auto", target_name, context);
        const generated = await callLLM(supagentPrompt, "supagent_construct");

        // Validate
        const validation = validateGeneratedCode(generated.analysis, target_type || "auto");

        // Save patch
        const shouldAutoApply = auto_apply !== false && validation.score >= 0.8 && plan.risk_level === "safe";
        const patchStatus = shouldAutoApply ? "applied" : validation.score >= 0.6 ? "validated" : "pending";

        await supabase.from("neural_code_patches").insert({
          target_function: target_name || plan.steps[0]?.target || "orion-auto",
          patch_type: target_type || "edge_function",
          patched_code: generated.analysis,
          validation_score: validation.score,
          validation_log: { intent, risk_level: plan.risk_level, validation_details: validation.details, provider: generated.provider, priority: priority || "medium" },
          status: patchStatus,
          ...(shouldAutoApply ? { applied_at: new Date().toISOString() } : {}),
          created_by: user.id,
        });

        // If auto-applied, save as runtime override
        if (shouldAutoApply) {
          await supabase.from("neural_specializations").insert({
            key: `supagent_${target_name || "auto"}_${Date.now()}`,
            name: `SupAgent: ${intent.substring(0, 80)}`,
            description: `Auto-construído. Risco: ${plan.risk_level}. Score: ${validation.score.toFixed(2)}`,
            prompts: { runtime_patch: generated.analysis, intent, applied_at: new Date().toISOString(), provider: generated.provider },
            is_active: true,
          });
        }

        // Learning record
        await supabase.from("neural_learning_data").insert({
          user_id: user.id, interaction_type: "supagent_construct",
          input_text: intent.substring(0, 500), output_text: generated.analysis.substring(0, 1000),
          quality_score: validation.score, learned: shouldAutoApply,
          metadata: { target_type, target_name, risk_level: plan.risk_level, auto_applied: shouldAutoApply, provider: generated.provider },
        });

        result = {
          plan, validation: { score: validation.score, details: validation.details },
          auto_applied: shouldAutoApply, status: patchStatus, provider: generated.provider,
        };
        break;
      }

      case "supagent_plan": {
        const { intent, target_type, target_name } = params as { intent: string; target_type?: string; target_name?: string };
        if (!intent) return json({ success: false, error: "intent required" }, 400);
        result = { plan: analyzeRisk(intent, target_type || "auto", target_name) };
        break;
      }

      case "supagent_status": {
        const { data: patches } = await supabase
          .from("neural_code_patches")
          .select("id, target_function, patch_type, validation_score, status, created_at, applied_at")
          .order("created_at", { ascending: false }).limit(20);
        const stats = {
          total_patches: patches?.length || 0,
          applied: patches?.filter((p: any) => p.status === "applied").length || 0,
          validated: patches?.filter((p: any) => p.status === "validated").length || 0,
          pending: patches?.filter((p: any) => p.status === "pending").length || 0,
          avg_score: patches?.length ? (patches.reduce((s: number, p: any) => s + (p.validation_score || 0), 0) / patches.length) : 0,
        };
        result = { stats, patches: patches || [] };
        break;
      }

      case "supagent_rollback": {
        const { target_name: rollTarget } = params as { target_name: string };
        if (!rollTarget) return json({ success: false, error: "target_name required" }, 400);
        const { data: patch } = await supabase.from("neural_code_patches")
          .select("id").eq("target_function", rollTarget).eq("status", "applied")
          .order("applied_at", { ascending: false }).limit(1).maybeSingle();
        if (!patch) return json({ success: false, error: "No applied patch to rollback" });
        await supabase.from("neural_code_patches").update({ status: "rolled_back", rolled_back_at: new Date().toISOString() }).eq("id", patch.id);
        await supabase.from("neural_specializations").update({ is_active: false }).like("key", `%${rollTarget}%`).eq("is_active", true);
        result = { rolled_back: patch.id, target: rollTarget };
        break;
      }

      case "supagent_learn_error": {
        const { error_message, stack_trace, function_name, intent: errIntent } = params as {
          error_message: string; stack_trace?: string; function_name?: string; intent?: string;
        };
        if (!error_message) return json({ success: false, error: "error_message required" }, 400);
        const fixPrompt = buildSupagentPrompt(
          `Corrigir erro: ${error_message}\nFunção: ${function_name || "desconhecida"}\nStack: ${stack_trace?.substring(0, 500) || "N/A"}`,
          "edge_function", function_name, `Erro: ${error_message}\nIntent: ${errIntent || "auto-fix"}`
        );
        const fixGen = await callLLM(fixPrompt, "supagent_error_fix");
        const fixVal = validateGeneratedCode(fixGen.analysis, "edge_function");
        await supabase.from("neural_code_patches").insert({
          target_function: function_name || "unknown", patch_type: "edge_function",
          patched_code: fixGen.analysis, validation_score: fixVal.score,
          validation_log: { error_message, stack_trace, auto_fix: true, provider: fixGen.provider },
          status: fixVal.score >= 0.85 ? "validated" : "pending", created_by: user.id,
        });
        await supabase.from("neural_learning_data").insert({
          user_id: user.id, interaction_type: "supagent_error_fix",
          input_text: `[ERROR] ${error_message}`.substring(0, 500), output_text: fixGen.analysis.substring(0, 1000),
          quality_score: fixVal.score, learned: true,
          metadata: { error_function: function_name, fix_score: fixVal.score, provider: fixGen.provider },
        });
        result = { fix_generated: true, validation_score: fixVal.score, status: fixVal.score >= 0.85 ? "validated" : "pending", provider: fixGen.provider };
        break;
      }

      // ═══ SUPAGENT: Frontend Instruction Generator ═══
      // Returns structured instructions for Orion to apply frontend changes
      case "supagent_frontend_instruction": {
        const { error_logs, console_errors, intent: feIntent, current_route } = params as {
          error_logs?: string[]; console_errors?: string[]; intent?: string; current_route?: string;
        };

        const errorContext = [
          ...(error_logs || []).map(e => `[LOG ERROR] ${e}`),
          ...(console_errors || []).map(e => `[CONSOLE] ${e}`)
        ].join("\n").substring(0, 3000);

        if (!errorContext && !feIntent) return json({ success: false, error: "error_logs, console_errors or intent required" }, 400);

        const fePrompt = `Você é o SupAgent-Frontend — analista de erros e arquiteto de correções do sistema Orion.

CONTEXTO DE ERROS:
${errorContext || "Nenhum erro detectado."}

INTENÇÃO DO ORION: ${feIntent || "Corrigir erros detectados automaticamente"}
ROTA ATUAL: ${current_route || "desconhecida"}

TAREFA: Analise os erros e gere um JSON de instruções de correção.
O Orion irá ler essas instruções e decidir se precisa solicitar ao seu criador (Lovable/desenvolvedor) para aplicar as mudanças.

Retorne APENAS JSON válido com esta estrutura:
{
  "diagnosis": "Descrição clara do problema",
  "severity": "low|medium|high|critical",
  "requires_frontend_change": true/false,
  "requires_backend_change": true/false,
  "instructions": [
    {
      "type": "fix_component|fix_hook|fix_import|fix_config|fix_edge_function|add_error_handler",
      "target": "caminho/do/arquivo.ts",
      "description": "O que deve ser feito",
      "suggested_code": "trecho de código sugerido (opcional)",
      "priority": 1
    }
  ],
  "can_self_heal": true/false,
  "self_heal_action": "Ação que o Orion pode executar autonomamente (config, prompt, specialization)",
  "learning_note": "O que o Orion deve aprender com este erro"
}`;

        const feGen = await callLLM(fePrompt, "supagent_frontend_instruction");

        // Try to parse the JSON response
        let instructions: Record<string, unknown> = {};
        try {
          const jsonMatch = feGen.analysis.match(/\{[\s\S]*\}/);
          if (jsonMatch) instructions = JSON.parse(jsonMatch[0]);
        } catch {
          instructions = { diagnosis: feGen.analysis, severity: "medium", requires_frontend_change: false, instructions: [], can_self_heal: false };
        }

        // If self-healable, apply config/prompt changes automatically
        if ((instructions as any).can_self_heal && (instructions as any).self_heal_action) {
          await supabase.from("neural_specializations").insert({
            key: `self_heal_${Date.now()}`,
            name: `Self-Heal: ${((instructions as any).diagnosis || "auto-fix").substring(0, 80)}`,
            description: (instructions as any).self_heal_action,
            prompts: { heal_action: (instructions as any).self_heal_action, errors: errorContext.substring(0, 500), applied_at: new Date().toISOString() },
            is_active: true,
          });
        }

        // Learning record
        await supabase.from("neural_learning_data").insert({
          user_id: user.id, interaction_type: "supagent_frontend_analysis",
          input_text: errorContext.substring(0, 500) || feIntent?.substring(0, 500) || "",
          output_text: JSON.stringify(instructions).substring(0, 1000),
          quality_score: 0.8, learned: true,
          metadata: { route: current_route, severity: (instructions as any).severity, can_self_heal: (instructions as any).can_self_heal, provider: feGen.provider },
        });

        result = { ...instructions, provider: feGen.provider };
        break;
      }

      default:
        return json(
          { success: false, error: `Unknown action: ${action}` },
          400
        );
    }

    const totalDuration = Date.now() - startTime;

    await supabase.from("ai_metrics").insert({
      provider: (result as Record<string, unknown>).provider as string || "groq",
      query: `agente-construcao:${action}`,
      total_duration_ms: totalDuration,
      success: true,
      complexity: "complex",
      cost_tier: 2,
      user_id: user.id,
      tools_used: ["agente-construcao"],
    });

    return json({ success: true, action, ...result, latencyMs: totalDuration });
  } catch (error) {
    console.error("Agente Construção error:", error);
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

// ═══ Document Structure Templates ═══
function getDocumentStructure(docType: string): string {
  const lower = docType.toLowerCase();

  if (/peti[çc][ãa]o\s*inicial/i.test(lower)) {
    return `1. Endereçamento (Juízo competente)
2. Qualificação das Partes (Autor e Réu)
3. DOS FATOS (narrativa fática detalhada)
4. DO DIREITO (fundamentação jurídica com artigos e jurisprudência)
5. DOS PEDIDOS (pedidos específicos, numerados)
6. DO VALOR DA CAUSA
7. DAS PROVAS (rol de provas requeridas)
8. Encerramento (termos, local, data, assinatura OAB)`;
  }

  if (/recurso|apela[çc][ãa]o|agravo|embargos/i.test(lower)) {
    return `1. Endereçamento (Tribunal competente)
2. Qualificação do Recorrente
3. DA TEMPESTIVIDADE
4. DO CABIMENTO
5. DOS FATOS E DO PROCESSO
6. DAS RAZÕES DO RECURSO (fundamentação detalhada)
7. DO PREQUESTIONAMENTO (se aplicável)
8. DOS PEDIDOS (reforma/anulação)
9. Encerramento`;
  }

  if (/contrato|acordo/i.test(lower)) {
    return `1. PREÂMBULO (identificação das partes)
2. CLÁUSULA PRIMEIRA — DO OBJETO
3. CLÁUSULA SEGUNDA — DO PRAZO
4. CLÁUSULA TERCEIRA — DO PREÇO E PAGAMENTO
5. CLÁUSULA QUARTA — DAS OBRIGAÇÕES DAS PARTES
6. CLÁUSULA QUINTA — DA RESCISÃO
7. CLÁUSULA SEXTA — DA CONFIDENCIALIDADE
8. CLÁUSULA SÉTIMA — DAS DISPOSIÇÕES GERAIS
9. CLÁUSULA OITAVA — DO FORO
10. Assinaturas e Testemunhas`;
  }

  if (/parecer/i.test(lower)) {
    return `1. EMENTA
2. RELATÓRIO (fatos e questão jurídica)
3. FUNDAMENTAÇÃO (análise jurídica detalhada)
4. CONCLUSÃO (opinião fundamentada)
5. Referências`;
  }

  if (/habeas\s*corpus/i.test(lower)) {
    return `1. Endereçamento (Tribunal competente)
2. Qualificação do Impetrante e Paciente
3. DA AUTORIDADE COATORA
4. DOS FATOS
5. DO CONSTRANGIMENTO ILEGAL (fundamentação)
6. DO FUMUS BONI IURIS E PERICULUM IN MORA
7. DOS PEDIDOS (concessão da ordem)
8. Encerramento`;
  }

  // Default
  return `1. Título/Cabeçalho
2. Introdução/Preâmbulo
3. Desenvolvimento/Fundamentação
4. Conclusão/Pedidos
5. Encerramento (local, data, assinatura)`;
}

// ═══ Multi-Provider LLM with Fallback ═══
async function callLLM(prompt: string, context: string) {
  const systemPrompt = `Você é um CONSTRUTOR JURÍDICO PROFISSIONAL especializado em gerar documentos, petições, contratos e peças processuais de alta qualidade.

REGRAS ABSOLUTAS:
- Produza APENAS HTML semântico puro (h1, h2, h3, p, strong, em, blockquote, ol, ul, li, br, span)
- NUNCA gere código React, JSX, TSX, import, export, interface, const, function
- NUNCA use tags <Container>, <Button>, <Heading>, <Text> ou componentes
- NUNCA use backticks ou blocos de código markdown
- A saída DEVE começar diretamente com uma tag HTML (<h1>, <h2>, <p>, etc.)
- Use linguagem jurídica formal brasileira
- Fundamentação com artigos de lei REAIS — NUNCA invente números
- Citações jurisprudenciais com formato forense completo
- Formato narrativo fluido e profissional`;

  // Try Groq first (fastest for drafts)
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    try {
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
          max_tokens: 8000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          console.log(`[${context}] Used Groq`);
          return { analysis: text, provider: "groq" };
        }
      }
    } catch (e) {
      console.warn(`Groq failed for ${context}:`, e);
    }
  }

  // Fallback to Mistral (excellent PT-BR for document construction)
  const mistralKey = Deno.env.get("MISTRAL_API_KEY");
  if (mistralKey) {
    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mistralKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.15,
          max_tokens: 8000,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          console.log(`[${context}] Used Mistral`);
          return { analysis: text, provider: "mistral" };
        }
      }
    } catch (e) {
      console.warn(`Mistral failed for ${context}:`, e);
    }
  }

  // Fallback to Gemini (7-key rotation)
  const keyNames = ["GEMINI_API_KEY_GCP", "GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY_5", "GEMINI_API_KEY_6", "GEMINI_API_KEY_7"];
  const geminiKeys = keyNames.map(n => Deno.env.get(n)).filter((k): k is string => !!k);
  for (let i = geminiKeys.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [geminiKeys[i], geminiKeys[j]] = [geminiKeys[j], geminiKeys[i]]; }
  for (const geminiKey of geminiKeys) {
    try {
      const geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
            generationConfig: { temperature: 0.15, maxOutputTokens: 12000 },
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
      console.warn(`Gemini key failed for ${context}:`, e);
      continue;
    }
  }

  throw new Error("No LLM provider available");
}

// ═══ SUPAGENT HELPERS ═══

function buildSupagentPrompt(intent: string, targetType: string, targetName?: string, context?: string): string {
  return `Você é o SUPAGENT — engenheiro de sistemas autônomo do Orion/ELP.
Gere código SEGURO, LIMPO e FUNCIONAL para Supabase Edge Functions (Deno) ou SQL PostgreSQL.

REGRAS:
1. NUNCA modifique schemas auth, storage, realtime, vault
2. SEMPRE inclua CORS headers e auth validation
3. NUNCA execute SQL raw ou aceite input não-validado
4. Deno.serve() como entrypoint, import npm:@supabase/supabase-js@2
5. Error handling completo, código produção-ready

TAREFA: ${intent}
TIPO: ${targetType}
${targetName ? `ALVO: ${targetName}` : ""}
${context ? `CONTEXTO:\n${context.substring(0, 3000)}` : ""}

Retorne APENAS o código, sem markdown, sem backticks.`;
}

function analyzeRisk(intent: string, targetType: string, targetName?: string) {
  const hasDB = /\b(create\s+table|alter|drop|delete|truncate|migration|sql|tabela)\b/i.test(intent);
  const hasAuth = /\b(auth|rls|policy|permission|role|security)\b/i.test(intent);
  const hasEdge = /\b(edge|fun[çc][ãa]o|endpoint|api)\b/i.test(intent) || targetType === "edge_function";
  const hasConfig = /\b(config|prompt|peso|weight)\b/i.test(intent) || targetType === "config" || targetType === "prompt";

  let risk_level: "safe" | "moderate" | "high" | "critical" = "safe";
  const steps: Array<{ order: number; action: string; target: string; description: string; reversible: boolean }> = [];

  if (hasDB || hasAuth) {
    risk_level = "critical";
    steps.push({ order: 1, action: "analyze_schema", target: "database", description: "Analisar schema", reversible: true });
    steps.push({ order: 2, action: "generate_migration", target: targetName || "db", description: "Gerar SQL", reversible: true });
    steps.push({ order: 3, action: "validate", target: "sql", description: "Validar SQL", reversible: true });
  } else if (hasEdge) {
    risk_level = "moderate";
    steps.push({ order: 1, action: "generate_code", target: targetName || "edge", description: "Gerar código", reversible: true });
    steps.push({ order: 2, action: "validate", target: "code", description: "Validar", reversible: true });
    steps.push({ order: 3, action: "save_patch", target: "patches", description: "Salvar patch", reversible: true });
  } else if (hasConfig) {
    steps.push({ order: 1, action: "update_config", target: targetName || "config", description: "Atualizar config", reversible: true });
  }

  return {
    id: crypto.randomUUID(), steps, risk_level,
    estimated_impact: risk_level === "critical" ? "Mudança de banco — requer aprovação" : risk_level === "moderate" ? "Mudança de lógica — reversível" : "Config — facilmente reversível",
    requires_approval: risk_level === "critical" || risk_level === "high",
  };
}

function validateGeneratedCode(code: string, targetType: string): { score: number; details: Record<string, boolean> } {
  const checks: Array<{ name: string; pattern: RegExp; weight: number }> = [];

  if (targetType === "edge_function" || targetType === "auto") {
    checks.push(
      { name: "has_imports", pattern: /import.*from/i, weight: 0.12 },
      { name: "has_deno_serve", pattern: /Deno\.serve|export\s+default/i, weight: 0.12 },
      { name: "has_cors", pattern: /Access-Control-Allow/i, weight: 0.12 },
      { name: "has_auth", pattern: /authorization|auth\.getUser|Bearer/i, weight: 0.12 },
      { name: "has_try_catch", pattern: /try\s*\{[\s\S]*catch/i, weight: 0.10 },
      { name: "has_error_response", pattern: /status:\s*(4|5)\d\d/i, weight: 0.08 },
      { name: "has_json", pattern: /JSON\.stringify|application\/json/i, weight: 0.08 },
      { name: "no_raw_sql", pattern: /^(?!.*\bexecute_sql\b).*$/s, weight: 0.10 },
      { name: "has_env", pattern: /Deno\.env\.get/i, weight: 0.08 },
      { name: "no_eval", pattern: /^(?!.*\beval\s*\().*$/s, weight: 0.08 },
    );
  } else if (targetType === "sql") {
    checks.push(
      { name: "has_ddl", pattern: /CREATE|ALTER|INSERT/i, weight: 0.15 },
      { name: "has_rls", pattern: /ROW\s+LEVEL\s+SECURITY|CREATE\s+POLICY/i, weight: 0.20 },
      { name: "no_auth_modify", pattern: /^(?!.*\bauth\.\w+\b(?!.*SELECT)).*$/s, weight: 0.15 },
      { name: "has_security_definer", pattern: /SECURITY\s+DEFINER/i, weight: 0.15 },
      { name: "has_uuid", pattern: /gen_random_uuid|uuid_generate/i, weight: 0.10 },
      { name: "has_timestamps", pattern: /created_at|updated_at/i, weight: 0.10 },
    );
  } else {
    return { score: 0.9, details: { auto_safe: true } };
  }

  let score = 0;
  const details: Record<string, boolean> = {};
  for (const c of checks) {
    const passed = c.pattern.test(code);
    details[c.name] = passed;
    if (passed) score += c.weight;
  }
  if (code.length > 100 && code.length < 50000) score = Math.min(1, score + 0.05);
  return { score: Math.min(1, Math.max(0, score)), details };
}
