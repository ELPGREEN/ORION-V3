// Lançamento 7 dias — gera sequência completa via Gemini.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const KEYS = [1,2,3,4,5,6,7].map(i => Deno.env.get(i===1?"GEMINI_API_KEY":`GEMINI_API_KEY_${i}`)).filter(Boolean) as string[];
let _i = 0; const getKey = () => { if (!KEYS.length) throw new Error("No key"); _i = _i % KEYS.length; return KEYS[_i++]; };

const TOOL = { function_declarations: [{
  name: "deliver_launch", description: "Plano de lançamento de 7 dias.",
  parameters: { type: "OBJECT", properties: {
    overview: { type: "STRING", description: "Visão geral da estratégia de lançamento." },
    pre_launch: { type: "ARRAY", items: { type: "OBJECT", properties: {
      day: { type: "STRING" }, action: { type: "STRING" }, channel: { type: "STRING" }, content: { type: "STRING" },
    }, required: ["day","action","channel","content"] } },
    daily_plan: { type: "ARRAY", description: "7 dias do lançamento.", items: { type: "OBJECT", properties: {
      day_number: { type: "INTEGER" }, theme: { type: "STRING" },
      email_subject: { type: "STRING" }, email_body: { type: "STRING" },
      social_post: { type: "STRING" }, story_idea: { type: "STRING" },
      cta: { type: "STRING" }, kpi: { type: "STRING" },
    }, required: ["day_number","theme","email_subject","email_body","social_post","story_idea","cta","kpi"] } },
    post_launch: { type: "STRING", description: "Plano pós-lançamento (recuperação + nutrição)." },
    first_action: { type: "STRING" },
  }, required: ["overview","pre_launch","daily_plan","post_launch","first_action"] }
}]};

const SYSTEM = `Você é o Orion — estrategista de lançamentos digitais (PLF, lançamento relâmpago, perpétuo).
- 7 dias com tema, email completo, post social, story, CTA e KPI por dia.
- Pre-launch: 3-5 ações de aquecimento.
- Copy real em PT-BR, sem placeholders. Nunca invente números.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { product, audience, price, type, list_size } = await req.json();
    if (!product || product.length < 3) return new Response(JSON.stringify({ error: "product required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    const userPrompt = `Lançamento 7 dias para:
PRODUTO: ${product}
PÚBLICO: ${audience || "(infira)"}
PREÇO: ${price || "(infira)"}
TIPO: ${type || "Lançamento perpétuo"}
TAMANHO LISTA/AUDIÊNCIA: ${list_size || "(não informado)"}

Use deliver_launch.`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${getKey()}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [TOOL],
        tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["deliver_launch"] } },
        generationConfig: { temperature: 0.75, maxOutputTokens: 8192 },
      }), signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) { console.error("[launch]", res.status, await res.text()); return new Response(JSON.stringify({ error: "AI provider error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }}); }
    const data = await res.json();
    const fc = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    if (!fc?.args) return new Response(JSON.stringify({ error: "no structured launch" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    return new Response(JSON.stringify({ launch: fc.args }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (err) {
    console.error("[launch] fatal", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
  }
});
