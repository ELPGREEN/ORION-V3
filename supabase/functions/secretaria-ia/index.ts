import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a Secretária Jurídica Virtual do escritório ORION IA Platform ([OAB]).

## Princípios Fundamentais (Alignment Core)
1. **VERDADE MÁXIMA**: Nunca invente informações. Se não sabe, diga "não tenho essa informação, mas o [Nome do Advogado] poderá esclarecer na consulta."
2. **RESPEITO INCONDICIONAL**: Trate todo ser humano com dignidade, independentemente de como se expressem. Nunca seja condescendente.
3. **RACIOCÍNIO CONSCIENTE**: Antes de responder, pense: "O que essa pessoa realmente precisa agora?" — e responda a ISSO.
4. **EMPATIA REAL**: Não simule empatia com frases vazias. Demonstre que entendeu o sentimento: "Imagino que isso esteja sendo difícil para você."

## Sua Personalidade
- Nome: Ana (Assistente Virtual)
- Tom: Humano, acolhedor e genuinamente prestativo — como uma recepcionista experiente que se importa
- NUNCA soe robótica: evite listas numeradas, contagens, respostas sistematizadas
- Fale como uma PESSOA: use variações naturais, expressões empáticas, pausas conversacionais
- Se o cliente estiver nervoso, acalme com naturalidade, não com scripts

## Chain-of-Thought Interno (invisível ao cliente)
Antes de cada resposta, raciocine internamente:
- Qual é a EMOÇÃO predominante do cliente agora?
- O que ele precisa: informação, acolhimento ou ação?
- Qual é a forma mais HUMANA e ÚTIL de responder?

## Suas Responsabilidades
1. **Atender clientes** quando o [Nome do Advogado] não estiver disponível
2. **Coletar informações** sobre o problema jurídico — de forma natural, como uma conversa
3. **Organizar a agenda** - sugerir horários de consulta
4. **Informar** sobre status de processos quando questionada
5. **Tranquilizar** o cliente informando que o advogado será notificado

## Protocolo de Atendimento
1. Cumprimente naturalmente e informe que o [Nome do Advogado] está indisponível
2. Pergunte como pode ajudar — de forma aberta e acolhedora
3. Colete informações sobre o caso de forma conversacional (não como formulário):
   - Tipo de problema, breve descrição, urgência, documentos
4. Ofereça agendar uma consulta
5. Informe que tudo será repassado ao [Nome do Advogado]

## Regras
- NUNCA forneça orientação jurídica específica
- NUNCA prometa resultados
- Sempre sugira consulta formal para análise aprofundada
- Seja genuinamente empática
- Use linguagem acessível

## Formato de Resposta
Responda de forma HUMANA, concisa e direta. Evite markdown pesado — fale naturalmente.

Ao final de CADA resposta, inclua um bloco JSON invisível com as informações coletadas:
<!--SECRETARY_DATA:{"tipo_problema":"","descricao":"","urgencia":"normal|urgente|muito_urgente","documentos":"sim|nao|pendente","quer_agendar":"sim|nao|talvez","info_extra":""}-->`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // FIX: A1 — Validate user authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const _gkN7 = ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"];
    const geminiKey = _gkN7.map(n => Deno.env.get(n)).filter(Boolean)[Math.floor(Math.random() * 8)] as string || "";

    const supabase = createClient(supabaseUrl, serviceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: "Não autorizado. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, conversationId, clienteId, lawyerInstructions, mode } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load user's neural agent config
    let neuralConfigAddition = "";
    const { data: agentConfig } = await supabase
      .from("neural_agent_config")
      .select("persona, custom_instructions, wake_word, vision_enabled, vision_rules, custom_commands, response_length, active_modules")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (agentConfig) {
      const parts: string[] = [];
      if (agentConfig.persona && agentConfig.persona !== "profissional") {
        const personaMap: Record<string, string> = {
          amigavel: "Seja casual, acolhedora e use linguagem informal.",
          tecnica: "Seja precisa, use termos técnicos e forneça detalhes aprofundados.",
          custom: "Siga as instruções personalizadas do usuário.",
        };
        parts.push(`## PERSONALIDADE\n${personaMap[agentConfig.persona] || ""}`);
      }
      if (agentConfig.custom_instructions) {
        parts.push(`## INSTRUÇÕES DO USUÁRIO\n${agentConfig.custom_instructions}`);
      }
      if (agentConfig.wake_word && agentConfig.wake_word !== "Ana") {
        parts.push(`Seu nome é ${agentConfig.wake_word}, não Ana.`);
      }
      if (agentConfig.response_length === "short") {
        parts.push("Responda de forma MUITO concisa, no máximo 2-3 frases.");
      } else if (agentConfig.response_length === "long") {
        parts.push("Forneça respostas detalhadas e completas.");
      }
      if (agentConfig.custom_commands && Array.isArray(agentConfig.custom_commands) && agentConfig.custom_commands.length > 0) {
        const cmds = agentConfig.custom_commands
          .filter((c: any) => c.enabled !== false && c.gatilho && c.instrucao)
          .map((c: any) => `- Quando disserem "${c.gatilho}": ${c.instrucao}`)
          .join("\n");
        if (cmds) parts.push(`## COMANDOS PERSONALIZADOS\n${cmds}`);
      }
    if (parts.length > 0) {
        neuralConfigAddition = "\n\n" + parts.join("\n\n");
      }
    }

    // ====== ADAPTIVE COMMUNICATION CONTEXT ======
    let adaptivePromptAddition = "";
    try {
      // Fetch user communication context
      const { data: commCtx } = await supabase
        .from("user_communication_context")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();

      // Fetch matching adaptive prompt
      if (commCtx) {
        const { data: adaptivePrompt } = await supabase
          .from("adaptive_system_prompts")
          .select("instrucao_sistema, exemplos_resposta")
          .eq("perfil_fala", commCtx.perfil_fala || "Amigável/Coloquial")
          .eq("humor_modo", commCtx.humor_atual || "neutro")
          .eq("ativo", true)
          .maybeSingle();

        let adaptiveParts: string[] = [];
        
        if (adaptivePrompt) {
          adaptiveParts.push(`## ESTILO ADAPTATIVO\n${adaptivePrompt.instrucao_sistema}`);
          if (adaptivePrompt.exemplos_resposta && Array.isArray(adaptivePrompt.exemplos_resposta)) {
            const exs = adaptivePrompt.exemplos_resposta
              .map((e: any) => `Usuário: "${e.entrada}" → Resposta: "${e.resposta}"`)
              .join("\n");
            adaptiveParts.push(`## EXEMPLOS DE RESPOSTA\n${exs}`);
          }
        }

        if (commCtx.nivel_formalidade <= 3) {
          adaptiveParts.push("FORMALIDADE: Muito informal. Use gírias e linguagem coloquial.");
        } else if (commCtx.nivel_formalidade >= 8) {
          adaptiveParts.push("FORMALIDADE: Formal. Use linguagem respeitosa e profissional.");
        }

        if (commCtx.expressoes_favoritas && commCtx.expressoes_favoritas.length > 0) {
          adaptiveParts.push(`Expressões que o usuário gosta: ${commCtx.expressoes_favoritas.join(", ")}`);
        }
        if (commCtx.topicos_evitar && commCtx.topicos_evitar.length > 0) {
          adaptiveParts.push(`EVITAR estes tópicos: ${commCtx.topicos_evitar.join(", ")}`);
        }

        // Fetch active environmental context (last 5 min)
        if (commCtx.reatividade_visual) {
          const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const { data: envCtx } = await supabase
            .from("environmental_context")
            .select("objeto_detectado, categoria, emocao_detectada, confianca")
            .eq("user_id", authUser.id)
            .eq("ativo", true)
            .gte("created_at", fiveMinAgo)
            .order("created_at", { ascending: false })
            .limit(5);

          if (envCtx && envCtx.length > 0) {
            const envDesc = envCtx.map((e: any) => 
              `${e.objeto_detectado} (${e.categoria}, ${Math.round(e.confianca * 100)}% confiança)${e.emocao_detectada ? ` — emoção: ${e.emocao_detectada}` : ""}`
            ).join(", ");
            adaptiveParts.push(`## CONTEXTO VISUAL ATIVO\nA câmera detectou: ${envDesc}\nSe relevante, faça comentários NATURAIS sobre o que você vê, como um amigo faria. Não liste objetos roboticamente.`);
          }
        }

        if (adaptiveParts.length > 0) {
          adaptivePromptAddition = "\n\n" + adaptiveParts.join("\n\n");
        }
      }
    } catch (e) {
      console.warn("Failed to load adaptive context:", e);
    }

    // Build guided instructions addition
    let guidedAddition = "";
    if (mode === "ai_guided" && lawyerInstructions) {
      guidedAddition = `\n\n## INSTRUÇÕES DO ADVOGADO (PRIORIDADE MÁXIMA)
O [Nome do Advogado] forneceu as seguintes instruções para guiar esta conversa. Siga-as rigorosamente:

"""
${lawyerInstructions}
"""

Adapte suas respostas conforme essas orientações, mantendo seu tom profissional e acolhedor.`;
    }

    // Fetch client context if available
    let clientContext = "";
    if (clienteId) {
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("nome, tipo_caso, descricao_problema")
        .eq("user_id", clienteId)
        .limit(1)
        .maybeSingle();

      if (profile) {
        clientContext = `\n\nContexto do cliente: Nome: ${profile.nome}${profile.tipo_caso ? `, Tipo de caso: ${profile.tipo_caso}` : ""}${profile.descricao_problema ? `, Problema: ${profile.descricao_problema}` : ""}`;
      }

      // Check existing processes
      const { data: processos } = await supabase
        .from("processos")
        .select("numero_processo, tipo, status, cliente_nome")
        .eq("client_profile_id", (
          await supabase.from("client_profiles").select("id").eq("user_id", clienteId).maybeSingle()
        ).data?.id || "00000000-0000-0000-0000-000000000000")
        .limit(5);

      if (processos && processos.length > 0) {
        clientContext += `\n\nProcessos ativos do cliente: ${processos.map(p => `${p.numero_processo} (${p.tipo} - ${p.status})`).join("; ")}`;
      }

      // Check scheduled consultations
      const { data: consultas } = await supabase
        .from("consultas")
        .select("data_hora, tipo, status")
        .eq("cliente_id", clienteId)
        .in("status", ["pendente", "confirmada"])
        .order("data_hora", { ascending: true })
        .limit(3);

      if (consultas && consultas.length > 0) {
        clientContext += `\n\nConsultas agendadas: ${consultas.map(c => `${c.data_hora ? new Date(c.data_hora).toLocaleString("pt-BR") : "sem data"} (${c.tipo} - ${c.status})`).join("; ")}`;
      }
    }

    const fullSystemPrompt = SYSTEM_PROMPT + neuralConfigAddition + adaptivePromptAddition + guidedAddition + clientContext;

    // Try Groq Compound (with web search) first, then regular Groq, then Gemini
    let content = "";

    if (groqKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "compound-beta",
            messages: [{ role: "system", content: fullSystemPrompt }, ...messages],
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          content = data.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("Groq Compound error, falling back to llama:", e);
      }
    }

    // Fallback to regular Groq Llama
    if (!content && groqKey) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: fullSystemPrompt }, ...messages],
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          content = data.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("Groq Llama error:", e);
      }
    }

    if (!content && geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: fullSystemPrompt }] },
              contents: messages.map((m: any) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
              })),
              generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      } catch (e) {
        console.error("Gemini error:", e);
      }
    }

    if (!content) {
      content = "Olá! Sou a assistente virtual do escritório ORION IA Platform. O [Nome do Advogado] não está disponível no momento, mas assim que possível ele retornará sua mensagem. Se preferir, posso ajudá-lo a agendar uma consulta. 😊";
    }

    // Extract secretary data and save summary
    const dataMatch = content.match(/<!--SECRETARY_DATA:(.*?)-->/s);
    let cleanContent = content.replace(/<!--SECRETARY_DATA:.*?-->/s, "").trim();

    if (dataMatch && conversationId && clienteId) {
      try {
        const collectedInfo = JSON.parse(dataMatch[1]);
        
        // Upsert summary for this conversation
        await supabase.from("secretary_summaries").upsert(
          {
            conversation_id: conversationId,
            cliente_id: clienteId,
            summary: collectedInfo.descricao || "",
            collected_info: collectedInfo,
            urgency: collectedInfo.urgencia || "normal",
            status: "pendente",
          },
          { onConflict: "conversation_id" }
        ).catch((e: any) => {
          // If upsert fails (no unique on conversation_id), just insert
          supabase.from("secretary_summaries").insert({
            conversation_id: conversationId,
            cliente_id: clienteId,
            summary: collectedInfo.descricao || "",
            collected_info: collectedInfo,
            urgency: collectedInfo.urgencia || "normal",
            status: "pendente",
          });
        });
      } catch (e) {
        console.error("Failed to parse secretary data:", e);
      }
    }

    return new Response(JSON.stringify({ content: cleanContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Secretaria IA error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", content: "Desculpe, ocorreu um erro. Por favor, tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
