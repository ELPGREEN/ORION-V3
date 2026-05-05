// Copy/VSL Builder — entrega carta de vendas + roteiro VSL via Gemini.
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

const TOOL = {
  function_declarations: [
    {
      name: "deliver_copy",
      description: "Entrega carta de vendas + roteiro VSL completo.",
      parameters: {
        type: "OBJECT",
        properties: {
          big_idea: { type: "STRING", description: "Mecanismo único / grande promessa." },
          headline_options: { type: "ARRAY", items: { type: "STRING" }, description: "5 headlines testáveis." },
          sales_letter: {
            type: "OBJECT",
            properties: {
              hook: { type: "STRING" },
              problem: { type: "STRING" },
              agitation: { type: "STRING" },
              solution: { type: "STRING" },
              proof: { type: "STRING" },
              offer: { type: "STRING" },
              guarantee: { type: "STRING" },
              urgency: { type: "STRING" },
              cta: { type: "STRING" },
            },
            required: ["hook", "problem", "agitation", "solution", "proof", "offer", "guarantee", "urgency", "cta"],
          },
          vsl_script: {
            type: "ARRAY",
            description: "Roteiro de VSL em blocos cronológicos (8-12 blocos).",
            items: {
              type: "OBJECT",
              properties: {
                timestamp: { type: "STRING", description: "Ex: 0:00-0:15" },
                section: { type: "STRING", description: "Hook / Story / Pain / Reveal / Offer / CTA..." },
                script: { type: "STRING", description: "Texto exato a falar." },
                visual: { type: "STRING", description: "Sugestão de cena/visual." },
              },
              required: ["timestamp", "section", "script", "visual"],
            },
          },
          first_action: { type: "STRING" },
        },
        required: ["big_idea", "headline_options", "sales_letter", "vsl_script", "first_action"],
      },
    },
  ],
};

const SYSTEM_PROMPT = `Você é o Orion — copywriter direto-resposta vertical.
Entregue copy real (não placeholder), em português BR, tom humano e acionável.
- Headlines: específicas, com promessa + diferencial + tempo.
- VSL: 8-12 blocos com timestamps em minutos.
- Nunca invente cases ou números. Use placeholder genérico se faltar.
- first_action sempre executável em <60 minutos.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { product, audience, price, promise, format } = await req.json();
    if (!product || typeof product !== "string" || product.length < 3) {
      return new Response(JSON.stringify({ error: "product is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userPrompt = `Crie copy de alta conversão para:
PRODUTO: ${product}
PÚBLICO: ${audience || "(infira)"}
PREÇO: ${price || "(não informado)"}
GRANDE PROMESSA: ${promise || "(infira)"}
FORMATO PREFERIDO: ${format || "VSL + carta"}

Use a função deliver_copy.`;

    const key = getKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [TOOL],
        tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["deliver_copy"] } },
        generationConfig: { temperature: 0.8, maxOutputTokens: 6144 },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("[copy-vsl] gemini error", res.status, txt);
      return new Response(JSON.stringify({ error: "AI provider error", status: res.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const fc = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    const copy = fc?.args ?? null;
    if (!copy) {
      return new Response(JSON.stringify({ error: "AI returned no structured copy" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ copy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[copy-vsl] fatal", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
