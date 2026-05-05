// Funnel Builder — gera funil de vendas completo (estratégia + copy + estrutura) via Gemini.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

let _rrIdx = 0;
function getKey() {
  if (!GEMINI_KEYS.length) throw new Error("No Gemini key configured");
  _rrIdx = _rrIdx % GEMINI_KEYS.length;
  return GEMINI_KEYS[_rrIdx++];
}

const FUNNEL_TOOL = {
  function_declarations: [
    {
      name: "deliver_funnel",
      description: "Entrega um funil de vendas completo e executável.",
      parameters: {
        type: "OBJECT",
        properties: {
          strategy: {
            type: "OBJECT",
            properties: {
              avatar: { type: "STRING", description: "Avatar do cliente ideal (1 parágrafo)." },
              big_idea: { type: "STRING", description: "Grande ideia / mecanismo único de venda." },
              objection_handling: {
                type: "ARRAY",
                items: { type: "STRING" },
                description: "Top 5 objeções e como quebrá-las",
              },
            },
            required: ["avatar", "big_idea", "objection_handling"],
          },
          stages: {
            type: "ARRAY",
            description: "Etapas do funil em ordem (topo → fundo).",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                goal: { type: "STRING" },
                channel: { type: "STRING", description: "Ex: Instagram Ads, e-mail, WhatsApp, página de vendas." },
                copy_headline: { type: "STRING" },
                copy_body: { type: "STRING" },
                cta: { type: "STRING" },
                metric: { type: "STRING", description: "KPI principal desta etapa." },
              },
              required: ["name", "goal", "channel", "copy_headline", "copy_body", "cta", "metric"],
            },
          },
          automations: {
            type: "ARRAY",
            description: "Automações recomendadas (e-mail, tags, webhooks).",
            items: {
              type: "OBJECT",
              properties: {
                trigger: { type: "STRING" },
                action: { type: "STRING" },
                tool: { type: "STRING" },
              },
              required: ["trigger", "action", "tool"],
            },
          },
          first_action: {
            type: "STRING",
            description: "A PRIMEIRA ação concreta que o usuário deve fazer hoje.",
          },
        },
        required: ["strategy", "stages", "automations", "first_action"],
      },
    },
  ],
};

const SYSTEM_PROMPT = `Você é o Orion — copiloto vertical de marketing digital.
Sua missão: receber o contexto do produto/oferta e ENTREGAR um funil de vendas completo, executável e factual.
Regras:
- Linguagem direta, brasileira, sem jargão de IA.
- Nunca invente números/cases. Se faltar dado, diga "depende de teste" no campo metric.
- 4 a 6 stages no funil (topo, meio, fundo, pós-venda).
- Copy real, não placeholders.
- first_action sempre acionável em <60 minutos.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { product, audience, price, goal, channel } = body ?? {};

    if (!product || typeof product !== "string" || product.length < 3) {
      return new Response(JSON.stringify({ error: "product is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Monte um funil de vendas completo para:

PRODUTO/OFERTA: ${product}
PÚBLICO ALVO: ${audience || "(não especificado — infira do produto)"}
TICKET / PREÇO: ${price || "(não informado)"}
OBJETIVO PRINCIPAL: ${goal || "Aumentar vendas"}
CANAL PREFERIDO: ${channel || "(sugira o melhor)"}

Use a função deliver_funnel para entregar a resposta estruturada.`;

    const key = getKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [FUNNEL_TOOL],
        tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["deliver_funnel"] } },
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("[funnel-builder] gemini error", res.status, txt);
      return new Response(JSON.stringify({ error: "AI provider error", status: res.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const fc = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    const funnel = fc?.args ?? null;

    if (!funnel) {
      console.error("[funnel-builder] no functionCall in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI returned no structured funnel" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ funnel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[funnel-builder] fatal", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
