// Plano de manutenção industrial preventiva.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const KEYS = [1,2,3,4,5,6,7].map(i => Deno.env.get(i===1?"GEMINI_API_KEY":`GEMINI_API_KEY_${i}`)).filter(Boolean) as string[];
let _i = 0; const getKey = () => { if (!KEYS.length) throw new Error("No key"); _i = _i % KEYS.length; return KEYS[_i++]; };

const TOOL = { function_declarations: [{
  name: "deliver_maintenance_plan", description: "Plano de manutenção preventiva/preditiva.",
  parameters: { type: "OBJECT", properties: {
    overview: { type: "STRING" },
    equipamentos: { type: "ARRAY", items: { type: "OBJECT", properties: {
      nome: { type: "STRING" }, criticidade: { type: "STRING", description: "alta/média/baixa" },
      mtbf_estimado: { type: "STRING" }, mttr_estimado: { type: "STRING" },
    }, required: ["nome","criticidade","mtbf_estimado","mttr_estimado"] } },
    rotinas: { type: "ARRAY", items: { type: "OBJECT", properties: {
      atividade: { type: "STRING" },
      frequencia: { type: "STRING", description: "Diária / Semanal / Mensal / Trimestral / Anual" },
      responsavel: { type: "STRING" },
      tempo_estimado: { type: "STRING" },
      checklist: { type: "ARRAY", items: { type: "STRING" } },
    }, required: ["atividade","frequencia","responsavel","tempo_estimado","checklist"] } },
    indicadores: { type: "ARRAY", items: { type: "STRING" }, description: "KPIs a monitorar (OEE, MTBF, MTTR, custo/h parada)." },
    estoque_pecas_criticas: { type: "ARRAY", items: { type: "STRING" } },
    sensores_recomendados: { type: "ARRAY", items: { type: "STRING" }, description: "Sensores IoT/preditivos sugeridos." },
    integracao_orion: { type: "ARRAY", items: { type: "STRING" } },
    roi_estimado: { type: "STRING" },
    first_action: { type: "STRING" },
  }, required: ["overview","equipamentos","rotinas","indicadores","estoque_pecas_criticas","sensores_recomendados","integracao_orion","roi_estimado","first_action"] }
}]};

const SYSTEM = `Você é o Orion Industrial — engenheiro de manutenção (TPM, RCM, ISO 55000).
- Indique frequências realistas baseadas no tipo de equipamento.
- Nunca invente MTBF/MTTR exato — sempre "estimado, validar com histórico".
- Inclua sensores IoT modernos (vibração, temperatura, corrente, ultrassom).
- ROI sempre com base de cálculo simples e transparente.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { setor, equipamentos, regime, problemas } = await req.json();
    if (!equipamentos || equipamentos.length < 3) return new Response(JSON.stringify({ error: "equipamentos required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    const userPrompt = `Plano de manutenção:
SETOR: ${setor || "(infira)"}
EQUIPAMENTOS: ${equipamentos}
REGIME DE OPERAÇÃO: ${regime || "(não informado)"}
PROBLEMAS RECENTES: ${problemas || "(nenhum)"}

Use deliver_maintenance_plan.`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${getKey()}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [TOOL],
        tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["deliver_maintenance_plan"] } },
        generationConfig: { temperature: 0.5, maxOutputTokens: 8192 },
      }), signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) { console.error("[maint]", res.status, await res.text()); return new Response(JSON.stringify({ error: "AI provider error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }}); }
    const data = await res.json();
    const fc = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    if (!fc?.args) return new Response(JSON.stringify({ error: "no structured plan" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    return new Response(JSON.stringify({ plan: fc.args }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (err) {
    console.error("[maint] fatal", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
  }
});
