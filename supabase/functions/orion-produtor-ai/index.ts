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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    // Rate limit
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _user_id: user.id, _function_name: "orion-produtor-ai", _max_requests: 20, _window_minutes: 5,
    });
    if (!allowed) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: corsHeaders });

    const { action, product_title, product_description, product_category, product_type, context } = await req.json();

    let result = "";

    switch (action) {
      case "generate_description": {
        result = await callGemini(
          `Produto: "${product_title}"\nCategoria: ${product_category || "geral"}\nTipo: ${product_type || "digital_download"}\n\nGere uma descrição persuasiva de vendas para este produto digital em português do Brasil. Máximo 3 parágrafos.`,
          "Você é um copywriter expert em produtos digitais. Escreva descrições que convertem, destacando benefícios e valor. Sempre em PT-BR."
        );
        break;
      }
      case "suggest_price": {
        result = await callGemini(
          `Produto: "${product_title}"\nDescrição: ${product_description || "N/A"}\nCategoria: ${product_category || "geral"}\nTipo: ${product_type || "digital_download"}\n\nSugira 3 faixas de preço (econômico, padrão, premium) para este produto digital no mercado brasileiro. Justifique cada faixa brevemente.`,
          "Você é um consultor de pricing para produtos digitais no Brasil. Analise o mercado e sugira preços realistas em Reais (R$). Seja direto."
        );
        break;
      }
      case "generate_modules": {
        result = await callGemini(
          `Curso: "${product_title}"\nDescrição: ${product_description || "N/A"}\nCategoria: ${product_category || "geral"}\n\nCrie uma estrutura completa de módulos/aulas para este curso online. Inclua 4-6 módulos com 3-5 aulas cada. Formato:\n\nMódulo 1: [Título]\n- Aula 1.1: [Título]\n- Aula 1.2: [Título]\n...`,
          "Você é um designer instrucional expert. Crie estruturas de cursos online logicamente organizadas e progressivas. PT-BR."
        );
        break;
      }
      case "analyze_performance": {
        result = await callGemini(
          `Dados do produtor:\n${context || "Sem dados disponíveis"}\n\nAnalise a performance deste produtor digital e dê 3-5 sugestões práticas de melhoria. Seja específico e actionable.`,
          "Você é um consultor de negócios digitais. Analise dados de vendas/conversão e dê insights práticos em PT-BR. Seja conciso."
        );
        break;
      }
      case "generate_copy": {
        result = await callGemini(
          `Produto: "${product_title}"\nDescrição: ${product_description || "N/A"}\nPreço: ${context || "N/A"}\n\nGere 3 textos de promoção para redes sociais (Instagram, Twitter, WhatsApp). Cada um com no máximo 280 caracteres. Inclua emoji e call-to-action.`,
          "Você é um social media manager expert. Crie copies virais e persuasivas para produtos digitais. PT-BR."
        );
        break;
      }
      case "product_faq": {
        result = await callGemini(
          `Produto: "${product_title}"\nDescrição: ${product_description || "N/A"}\nPergunta do cliente: ${context || "O que este produto oferece?"}\n\nResponda a pergunta do cliente de forma clara e útil.`,
          "Você é um assistente de suporte ao cliente para produtos digitais. Responda de forma amigável e objetiva em PT-BR."
        );
        break;
      }
      case "affiliate_strategy": {
        result = await callGemini(
          `Dados do afiliado:\n${context || "Sem dados"}\n\nCrie uma estratégia completa de divulgação para este afiliado. Inclua: canais recomendados, tipo de conteúdo, frequência de postagens, e dicas de conversão. Seja prático e actionable.`,
          "Você é um consultor de marketing de afiliados expert. Crie estratégias práticas e detalhadas para maximizar vendas. PT-BR."
        );
        break;
      }
      case "best_products": {
        result = await callGemini(
          `Produtos disponíveis no marketplace:\n${context || "Sem dados"}\n\nRecomende os 3-5 melhores produtos para um afiliado promover, considerando potencial de conversão, comissão e demanda de mercado. Justifique cada escolha.`,
          "Você é um analista de marketplace de produtos digitais. Recomende produtos com maior potencial de vendas para afiliados. PT-BR."
        );
        break;
      }
      case "social_calendar": {
        result = await callGemini(
          `Produto: "${product_title}"\nDescrição: ${product_description || "N/A"}\nDados adicionais: ${context || "N/A"}\n\nCrie um calendário de postagens para 7 dias com:\n- Dia e horário sugerido\n- Plataforma (Instagram, Twitter, TikTok, WhatsApp)\n- Tipo de conteúdo (story, post, reels, thread)\n- Texto pronto para usar (com emoji e CTA)\n\nFormato claro e organizado.`,
          "Você é um social media manager expert em produtos digitais. Crie calendários editoriais práticos e eficazes. PT-BR."
        );
        break;
      }
      case "recommend_products": {
        result = await callGemini(
          `Dados do cliente:\n${context || "Sem dados"}\n\nCom base no histórico de compras e categorias disponíveis, recomende 3-5 produtos digitais que este cliente deveria explorar. Justifique cada sugestão com base no perfil. Seja prático e direto.`,
          "Você é um consultor de produtos digitais. Recomende produtos relevantes baseado no perfil e histórico do cliente. Seja persuasivo mas honesto. PT-BR."
        );
        break;
      }
      case "system_health": {
        result = await callGemini(
          `Sistema ORION — Status Report\nTimestamp: ${new Date().toISOString()}\nSubsistemas: LLM Gemini (7 keys), TTS Piper+Gemini, RAG Hybrid Search v3, ROSBridge WS, MQTT HiveMQ, Neural Knowledge Base\nContexto: ${context || "N/A"}\n\nGere um relatório de saúde do sistema com status de cada subsistema, recomendações de otimização e alertas potenciais.`,
          "Você é um engenheiro de sistemas sênior. Analise o status dos subsistemas e gere relatório técnico conciso com métricas e recomendações. PT-BR."
        );
        break;
      }
      case "global_analytics": {
        result = await callGemini(
          `Dados da plataforma ORION:\n${context || "Sem dados"}\n\nAnalise as métricas globais da plataforma (clientes, processos, vendas, produtos, afiliados) e forneça:\n1. Resumo executivo\n2. Top 3 métricas de crescimento\n3. Top 3 áreas de atenção\n4. Recomendações estratégicas`,
          "Você é um analista de dados executivo. Forneça insights acionáveis e métricas claras. Foco em crescimento e otimização. PT-BR."
        );
        break;
      }
      case "automation_command": {
        result = await callGemini(
          `Comando de automação solicitado:\n${context || "Sem comando"}\n\nInterprete este comando de automação para sistemas robóticos/IoT. Retorne:\n1. Dispositivos alvo\n2. Ações a executar\n3. Parâmetros de segurança\n4. Confirmação necessária (sim/não)\n5. Estimativa de tempo`,
          "Você é um engenheiro de automação industrial. Interprete comandos de forma segura, sempre priorizando safety-first. Valide parâmetros antes de confirmar execução. PT-BR."
        );
        break;
      }
      case "security_audit": {
        result = await callGemini(
          `Auditoria de segurança — ORION Platform\nTimestamp: ${new Date().toISOString()}\nContexto: ${context || "Auditoria geral"}\n\nRealize uma análise de segurança cobrindo:\n1. Autenticação e controle de acesso (RLS, JWT)\n2. Rate limiting e proteção contra abuso\n3. Exposição de dados sensíveis\n4. Integridade de edge functions\n5. Recomendações de hardening`,
          "Você é um especialista em segurança cibernética. Analise a postura de segurança e forneça recomendações práticas com prioridade. PT-BR."
        );
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("orion-produtor-ai error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
