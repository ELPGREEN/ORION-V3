// Análise de processo — recebe texto/resumo e devolve estratégia.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const KEYS = [1,2,3,4,5,6,7].map(i => Deno.env.get(i===1?"GEMINI_API_KEY":`GEMINI_API_KEY_${i}`)).filter(Boolean) as string[];
let _i = 0; const getKey = () => { if (!KEYS.length) throw new Error("No key"); _i = _i % KEYS.length; return KEYS[_i++]; };

const TOOL = { function_declarations: [{
  name: "deliver_case_analysis", description: "Análise estratégica de processo judicial.",
  parameters: { type: "OBJECT", properties: {
    sumario: { type: "STRING", description: "Resumo executivo do processo." },
    partes: { type: "ARRAY", items: { type: "STRING" } },
    pedidos_identificados: { type: "ARRAY", items: { type: "STRING" } },
    fase_processual: { type: "STRING" },
    pontos_fortes: { type: "ARRAY", items: { type: "STRING" } },
    pontos_fracos: { type: "ARRAY", items: { type: "STRING" } },
    riscos: { type: "ARRAY", items: { type: "OBJECT", properties: {
      risco: { type: "STRING" }, probabilidade: { type: "STRING" }, mitigacao: { type: "STRING" },
    }, required: ["risco","probabilidade","mitigacao"] } },
    estrategia_recomendada: { type: "STRING" },
    proximos_passos: { type: "ARRAY", items: { type: "OBJECT", properties: {
      passo: { type: "STRING" }, prazo: { type: "STRING" }, prioridade: { type: "STRING" },
    }, required: ["passo","prazo","prioridade"] } },
    jurisprudencia_buscar: { type: "ARRAY", items: { type: "STRING" }, description: "Súmulas/teses a confirmar — não inventar julgado." },
    estimativa_resultado: { type: "STRING", description: "Faixa de resultado esperado, sempre com 'estimado'." },
  }, required: ["sumario","partes","pedidos_identificados","fase_processual","pontos_fortes","pontos_fracos","riscos","estrategia_recomendada","proximos_passos","jurisprudencia_buscar","estimativa_resultado"] }
}]};

const SYSTEM = `Você é o Orion Jurídico — analista processual sênior.
Regras absolutas:
- NUNCA invente jurisprudência específica. Sugira súmula/tese e mande o advogado validar.
- Sempre indique "estimado" em probabilidades e resultados.
- Linguagem técnica forense.
- Identifique fase processual com base no texto. Se ambíguo, marque "indeterminado".`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { case_text, lado, area } = await req.json();
    if (!case_text || case_text.length < 30) return new Response(JSON.stringify({ error: "case_text required (min 30 chars)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    const userPrompt = `Analise este processo:
LADO QUE REPRESENTAMOS: ${lado || "(não informado — analise neutra)"}
ÁREA: ${area || "(infira)"}

CONTEÚDO DO PROCESSO:
${case_text.slice(0, 60000)}

Use deliver_case_analysis.`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${getKey()}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [TOOL],
        tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["deliver_case_analysis"] } },
        generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
      }), signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) { console.error("[case]", res.status, await res.text()); return new Response(JSON.stringify({ error: "AI provider error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }}); }
    const data = await res.json();
    const fc = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    if (!fc?.args) return new Response(JSON.stringify({ error: "no structured analysis" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    return new Response(JSON.stringify({ analysis: fc.args }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (err) {
    console.error("[case] fatal", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
  }
});
