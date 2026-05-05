// Tráfego pago — gera ângulos + criativos Meta/Google.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const KEYS = [1,2,3,4,5,6,7].map(i => Deno.env.get(i===1?"GEMINI_API_KEY":`GEMINI_API_KEY_${i}`)).filter(Boolean) as string[];
let _i = 0; const getKey = () => { if (!KEYS.length) throw new Error("No key"); _i = _i % KEYS.length; return KEYS[_i++]; };

const TOOL = { function_declarations: [{
  name: "deliver_ads", description: "Pacote de campanhas Meta/Google Ads.",
  parameters: { type: "OBJECT", properties: {
    angles: { type: "ARRAY", description: "5-7 ângulos de venda diferentes.", items: { type: "OBJECT", properties: {
      angle_name: { type: "STRING" }, target: { type: "STRING" }, hook: { type: "STRING" },
    }, required: ["angle_name","target","hook"] } },
    meta_ads: { type: "ARRAY", description: "6+ criativos Meta (Facebook/Instagram).", items: { type: "OBJECT", properties: {
      format: { type: "STRING", description: "Reels / Stories / Carrossel / Imagem única" },
      hook_3s: { type: "STRING", description: "Primeiros 3 segundos." },
      body: { type: "STRING" }, cta: { type: "STRING" }, visual_brief: { type: "STRING" },
    }, required: ["format","hook_3s","body","cta","visual_brief"] } },
    google_ads: { type: "ARRAY", description: "Pesquisa Google: headlines + descrições.", items: { type: "OBJECT", properties: {
      campaign_type: { type: "STRING", description: "Search / Performance Max / YouTube" },
      headlines: { type: "ARRAY", items: { type: "STRING" }, description: "15 headlines (máx 30 chars cada)." },
      descriptions: { type: "ARRAY", items: { type: "STRING" }, description: "4 descrições (máx 90 chars)." },
      keywords: { type: "ARRAY", items: { type: "STRING" } },
    }, required: ["campaign_type","headlines","descriptions","keywords"] } },
    budget_split: { type: "STRING", description: "Sugestão de divisão de verba inicial." },
    metrics_to_watch: { type: "ARRAY", items: { type: "STRING" } },
    first_action: { type: "STRING" },
  }, required: ["angles","meta_ads","google_ads","budget_split","metrics_to_watch","first_action"] }
}]};

const SYSTEM = `Você é o Orion — media buyer sênior (Meta + Google).
- Headlines Google: máx 30 caracteres. Descrições: máx 90.
- Hook 3s no Meta: linguagem nativa de Reels, sem som obrigatório.
- 5-7 ângulos: dor, sonho, prova, urgência, autoridade, contra-intuitivo, comparação.
- Nunca invente CPC/CPL. Sempre diga "estimado, depende do nicho".`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { product, audience, offer, budget, platform } = await req.json();
    if (!product || product.length < 3) return new Response(JSON.stringify({ error: "product required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    const userPrompt = `Pacote de tráfego pago:
PRODUTO: ${product}
PÚBLICO: ${audience || "(infira)"}
OFERTA / PREÇO: ${offer || "(infira)"}
VERBA: ${budget || "R$ 50/dia"}
PLATAFORMAS: ${platform || "Meta + Google"}

Use deliver_ads.`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${getKey()}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        tools: [TOOL],
        tool_config: { function_calling_config: { mode: "ANY", allowed_function_names: ["deliver_ads"] } },
        generationConfig: { temperature: 0.85, maxOutputTokens: 8192 },
      }), signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) { console.error("[ads]", res.status, await res.text()); return new Response(JSON.stringify({ error: "AI provider error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }}); }
    const data = await res.json();
    const fc = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    if (!fc?.args) return new Response(JSON.stringify({ error: "no structured ads" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    return new Response(JSON.stringify({ ads: fc.args }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (err) {
    console.error("[ads] fatal", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
  }
});
