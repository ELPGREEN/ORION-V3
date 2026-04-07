import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_KEYS = [
  Deno.env.get("GEMINI_API_KEY"),
  Deno.env.get("GEMINI_API_KEY_2"),
  Deno.env.get("GEMINI_API_KEY_3"),
  Deno.env.get("GEMINI_API_KEY_4"),
  Deno.env.get("GEMINI_API_KEY_5"),
  Deno.env.get("GEMINI_API_KEY_6"),
  Deno.env.get("GEMINI_API_KEY_7"),
].filter(Boolean) as string[];

function getGeminiKey(): string {
  return GEMINI_KEYS[Math.floor(Math.random() * GEMINI_KEYS.length)];
}

async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  const key = getGeminiKey();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();
    const SYSTEM = "Você é o Orion, assistente jurídico IA. Responda em português brasileiro, de forma concisa e profissional. Use markdown para formatação.";

    let result = "";

    switch (action) {
      case "case_summary": {
        const { client_profile_id } = params;
        const [clientRes, processosRes, docsRes, chatRes] = await Promise.all([
          supabaseAdmin.from("client_profiles").select("*").eq("id", client_profile_id).single(),
          supabaseAdmin.from("processos").select("titulo, status, tipo, area_direito, prazo_fatal, proxima_audiencia").eq("client_profile_id", client_profile_id).limit(10),
          supabaseAdmin.from("documents").select("titulo, tipo, created_at").eq("user_id", user.id).limit(20),
          supabaseAdmin.from("chat_conversations").select("id, ultima_mensagem, updated_at").or(`advogado_id.eq.${user.id},cliente_id.eq.${client_profile_id}`).limit(5),
        ]);

        const prompt = `Resuma o caso do cliente de forma estruturada:

**Cliente:** ${JSON.stringify(clientRes.data || {})}
**Processos:** ${JSON.stringify(processosRes.data || [])}
**Documentos recentes:** ${JSON.stringify(docsRes.data || [])}
**Conversas recentes:** ${JSON.stringify(chatRes.data || [])}

Gere: 1) Resumo do caso 2) Status atual 3) Próximos passos recomendados 4) Riscos identificados`;

        result = await callGemini(prompt, SYSTEM);
        break;
      }

      case "deadline_analysis": {
        const { data: processos } = await supabaseAdmin
          .from("processos")
          .select("titulo, status, prazo_fatal, proxima_audiencia, tipo, area_direito")
          .eq("user_id", user.id)
          .order("prazo_fatal", { ascending: true })
          .limit(30);

        const { data: consultas } = await supabaseAdmin
          .from("consultas")
          .select("data_hora, tipo, status")
          .eq("advogado_id", user.id)
          .eq("status", "pendente")
          .limit(10);

        const prompt = `Analise os prazos e compromissos do advogado e gere um resumo diário:

**Processos:** ${JSON.stringify(processos || [])}
**Consultas pendentes:** ${JSON.stringify(consultas || [])}
**Data atual:** ${new Date().toISOString()}

Gere: 1) Prazos urgentes (próximos 7 dias) 2) Audiências próximas 3) Consultas pendentes 4) Sugestões de priorização 5) Alertas importantes`;

        result = await callGemini(prompt, SYSTEM);
        break;
      }

      case "draft_response": {
        const { conversation_id, last_message } = params;
        const { data: messages } = await supabaseAdmin
          .from("chat_messages")
          .select("content, sender_role, created_at")
          .eq("conversation_id", conversation_id)
          .order("created_at", { ascending: false })
          .limit(15);

        const prompt = `Com base no histórico de conversa abaixo, sugira uma resposta profissional do advogado:

**Histórico (mais recente primeiro):**
${(messages || []).map((m: any) => `[${m.sender_role}]: ${m.content}`).join("\n")}

**Última mensagem do cliente:** ${last_message}

Gere uma resposta profissional, empática e útil. Mantenha tom formal mas acessível.`;

        result = await callGemini(prompt, SYSTEM);
        break;
      }

      case "strategy_suggestion": {
        const { processo_id } = params;
        const { data: processo } = await supabaseAdmin
          .from("processos")
          .select("*")
          .eq("id", processo_id)
          .single();

        const prompt = `Analise este processo e sugira estratégia jurídica:

**Processo:** ${JSON.stringify(processo || {})}

Gere: 1) Análise da situação 2) Estratégias possíveis 3) Riscos de cada estratégia 4) Recomendação principal 5) Próximos passos`;

        result = await callGemini(prompt, SYSTEM);
        break;
      }

      case "summarize_conversation": {
        const { conversation_id } = params;
        const { data: messages } = await supabaseAdmin
          .from("chat_messages")
          .select("content, sender_role, created_at")
          .eq("conversation_id", conversation_id)
          .order("created_at", { ascending: true })
          .limit(50);

        const prompt = `Resuma esta conversa entre advogado e cliente em 3-5 pontos principais:

**Mensagens:**
${(messages || []).map((m: any) => `[${m.sender_role}] ${m.content}`).join("\n")}

Gere um resumo estruturado com: pontos discutidos, decisões tomadas, pendências e próximos passos.`;

        result = await callGemini(prompt, SYSTEM);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("orion-advogado-ai error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
