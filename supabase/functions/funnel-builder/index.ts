import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { product, audience, price, goal, channel } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Delegate to ai-orchestrator with specific funnel instructions
    const { data, error } = await supabaseAdmin.functions.invoke("ai-orchestrator", {
      body: {
        useCase: "marketing",
        prompt: `Gere um funil de vendas completo para:
Produto: ${product}
Público: ${audience}
Preço: ${price}
Objetivo: ${goal}
Canal: ${channel}

Retorne APENAS um JSON válido seguindo exatamente esta estrutura:
{
  "funnel": {
    "strategy": {
      "avatar": "...",
      "big_idea": "...",
      "objection_handling": ["...", "..."]
    },
    "stages": [
      {
        "name": "Anúncio",
        "channel": "Instagram",
        "goal": "...",
        "metric": "CTR",
        "copy_headline": "...",
        "copy_body": "...",
        "cta": "..."
      }
    ],
    "automations": [
      { "trigger": "...", "action": "...", "tool": "..." }
    ],
    "first_action": "..."
  }
}`,
      },
    });

    if (error) throw error;

    // The orchestrator returns { content: "..." } which is the stringified JSON
    let content = data.content;
    if (typeof content === "string") {
      // Remove markdown blocks if present
      content = content.replace(/```json\n?|\n?```/g, "").trim();
      const funnelData = JSON.parse(content);
      return new Response(JSON.stringify(funnelData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
