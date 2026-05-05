// Petição em 1 clique — gera estrutura completa de petição via Gemini.
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
      name: "deliver_peticao",
      description: "Entrega petição estruturada em padrão CNJ.",
      parameters: {
        type: "OBJECT",
        properties: {
          tipo: { type: "STRING", description: "Inicial / Contestação / Recurso / Embargos..." },
          competencia: { type: "STRING", description: "Juízo competente sugerido." },
          enderecamento: { type: "STRING" },
          qualificacao: { type: "STRING", description: "Qualificação completa das partes." },
          dos_fatos: { type: "STRING", description: "Narrativa fática ordenada." },
          do_direito: {
            type: "ARRAY",
            description: "Fundamentos jurídicos com artigos e jurisprudência citável.",
            items: {
              type: "OBJECT",
              properties: {
                tese: { type: "STRING" },
                fundamento_legal: { type: "STRING", description: "Artigos / leis aplicáveis." },
                jurisprudencia: { type: "STRING", description: "Sugestão de tribunal/súmula a buscar (não invente julgado)." },
              },
              required: ["tese", "fundamento_legal", "jurisprudencia"],
            },
          },
          dos_pedidos: { type: "ARRAY", items: { type: "STRING" }, description: "Pedidos enumerados." },
          valor_da_causa: { type: "STRING" },
          provas: { type: "ARRAY", items: { type: "STRING" } },
          observacoes_advogado: { type: "ARRAY", items: { type: "STRING" }, description: "Pontos a revisar antes de protocolar." },
        },
        required: ["tipo", "enderecamento", "qualificacao", "dos_fatos", "do_direito", "dos_pedidos", "valor_da_causa", "provas", "observacoes_advogado"],
      },
    },
  ],
};

const SYSTEM_PROMPT = `Você é o Orion Jurídico — assistente de redação processual brasileira (CPC/CLT/CDC).
Regras absolutas:
- NUNCA invente jurisprudência específica. Sugira tribunal/súmula relevante e instrua o advogado a confirmar.
- Sempre indique que a peça é um RASCUNHO sujeito à revisão técnica.
- Linguagem formal forense, mas clara.
- Cite artigos de lei reais (CPC, CC, CLT, CDC, CF/88) com precisão.
- Estruture conforme padrão CNJ.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { tipo, fatos, pedido, area, partes } = await req.json();
    if (!fatos || typeof fatos !== "string" || fatos.length < 10) {
      return new Response(JSON.stringify({ error: "fatos is required (min 10 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userPrompt = `Redija RASCUNHO de petição:
TIPO: ${tipo || "Inicial"}
ÁREA: ${area || "(infira)"}
PARTES: ${partes || "(qualificar genericamente)"}
FATOS: ${fatos}
PEDIDO PRINCIPAL: ${pedido || "(infira do contexto)"}

Use a função deliver_peticao.`;

    const key = getKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [TOOL],
        tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["deliver_peticao"] } },
        generationConfig: { temperature: 0.4, maxOutputTokens: 6144 },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("[peticao] gemini error", res.status, txt);
      return new Response(JSON.stringify({ error: "AI provider error", status: res.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const fc = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    const peticao = fc?.args ?? null;
    if (!peticao) {
      return new Response(JSON.stringify({ error: "AI returned no structured peticao" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ peticao }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[peticao] fatal", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
