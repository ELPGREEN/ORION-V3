// Diagnóstico Industrial — analisa dados de linha de produção via Gemini.
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
      name: "deliver_diagnosis",
      description: "Diagnóstico de linha de produção industrial.",
      parameters: {
        type: "OBJECT",
        properties: {
          oee_estimado: { type: "STRING", description: "OEE estimado (Disp x Perf x Qual)." },
          gargalos: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                etapa: { type: "STRING" },
                impacto: { type: "STRING", description: "alto / médio / baixo" },
                causa_provavel: { type: "STRING" },
                evidencia: { type: "STRING", description: "Trecho dos dados que sustenta o diagnóstico." },
              },
              required: ["etapa", "impacto", "causa_provavel", "evidencia"],
            },
          },
          riscos: { type: "ARRAY", items: { type: "STRING" } },
          recomendacoes: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                acao: { type: "STRING" },
                prioridade: { type: "STRING", description: "alta / média / baixa" },
                roi_estimado: { type: "STRING" },
                prazo: { type: "STRING" },
              },
              required: ["acao", "prioridade", "roi_estimado", "prazo"],
            },
          },
          integracoes_orion: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Quais módulos Orion (ROS2/MQTT/Visão/CRM) habilitar.",
          },
          first_action: { type: "STRING" },
        },
        required: ["oee_estimado", "gargalos", "riscos", "recomendacoes", "integracoes_orion", "first_action"],
      },
    },
  ],
};

const SYSTEM_PROMPT = `Você é o Orion Industrial — engenheiro de produção sênior.
Analise os dados/contexto fornecidos e entregue diagnóstico factual.
- Nunca invente números. Se faltar dado, indique no campo evidencia: "estimado, requer medição".
- Use padrões: OEE, MTBF, MTTR, takt time, lean/TPM.
- Recomendações sempre com ROI estimado e prazo.
- Integre o stack Orion (ROS2, MQTT, visão computacional, CRM B2B) onde fizer sentido.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { setor, processo, problema, dados, capacidade, equipe } = await req.json();
    if (!processo || typeof processo !== "string" || processo.length < 3) {
      return new Response(JSON.stringify({ error: "processo is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userPrompt = `Diagnóstico industrial:
SETOR: ${setor || "(não informado)"}
PROCESSO: ${processo}
PROBLEMA REPORTADO: ${problema || "(infira dos dados)"}
DADOS / KPIs: ${dados || "(não fornecidos — diagnostique qualitativamente)"}
CAPACIDADE INSTALADA: ${capacidade || "(não informada)"}
EQUIPE: ${equipe || "(não informada)"}

Use a função deliver_diagnosis.`;

    const key = getKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [TOOL],
        tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["deliver_diagnosis"] } },
        generationConfig: { temperature: 0.5, maxOutputTokens: 6144 },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("[industrial] gemini error", res.status, txt);
      return new Response(JSON.stringify({ error: "AI provider error", status: res.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const fc = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    const diagnosis = fc?.args ?? null;
    if (!diagnosis) {
      return new Response(JSON.stringify({ error: "AI returned no structured diagnosis" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ diagnosis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[industrial] fatal", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
