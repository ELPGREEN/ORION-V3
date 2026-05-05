// Contrato por IA — gera contratos estruturados.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const KEYS = [1,2,3,4,5,6,7].map(i => Deno.env.get(i===1?"GEMINI_API_KEY":`GEMINI_API_KEY_${i}`)).filter(Boolean) as string[];
let _i = 0; const getKey = () => { if (!KEYS.length) throw new Error("No key"); _i = _i % KEYS.length; return KEYS[_i++]; };

const TOOL = { function_declarations: [{
  name: "deliver_contract", description: "Contrato estruturado padrão BR.",
  parameters: { type: "OBJECT", properties: {
    titulo: { type: "STRING" },
    preambulo: { type: "STRING", description: "Identificação completa das partes." },
    consideranda: { type: "STRING" },
    clausulas: { type: "ARRAY", items: { type: "OBJECT", properties: {
      numero: { type: "STRING", description: "Ex: CLÁUSULA PRIMEIRA" },
      titulo: { type: "STRING" }, conteudo: { type: "STRING" },
    }, required: ["numero","titulo","conteudo"] } },
    foro: { type: "STRING" },
    assinaturas: { type: "STRING", description: "Bloco de assinatura padrão." },
    pontos_revisao: { type: "ARRAY", items: { type: "STRING" }, description: "Pontos críticos para o advogado revisar." },
    riscos_legais: { type: "ARRAY", items: { type: "STRING" } },
  }, required: ["titulo","preambulo","clausulas","foro","assinaturas","pontos_revisao","riscos_legais"] }
}]};

const SYSTEM = `Você é o Orion Jurídico — redator contratual brasileiro (CC/CDC/CLT).
Regras:
- Sempre RASCUNHO. Sempre listar pontos_revisao.
- Cláusulas numeradas (PRIMEIRA, SEGUNDA...).
- Cite artigos do CC quando aplicável.
- Nunca invente nome de partes — use placeholders [CONTRATANTE] / [CONTRATADO] se faltar.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { tipo, partes, objeto, valor, prazo, observacoes } = await req.json();
    if (!tipo || tipo.length < 3) return new Response(JSON.stringify({ error: "tipo required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    const userPrompt = `Redija contrato:
TIPO: ${tipo}
PARTES: ${partes || "[CONTRATANTE] e [CONTRATADO]"}
OBJETO: ${objeto || "(detalhar)"}
VALOR: ${valor || "(a definir)"}
PRAZO: ${prazo || "(a definir)"}
OBSERVAÇÕES: ${observacoes || "(nenhuma)"}

Use deliver_contract.`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${getKey()}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [TOOL],
        tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["deliver_contract"] } },
        generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
      }), signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) { console.error("[contract]", res.status, await res.text()); return new Response(JSON.stringify({ error: "AI provider error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }}); }
    const data = await res.json();
    const fc = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    if (!fc?.args) return new Response(JSON.stringify({ error: "no structured contract" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    return new Response(JSON.stringify({ contract: fc.args }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (err) {
    console.error("[contract] fatal", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
  }
});
