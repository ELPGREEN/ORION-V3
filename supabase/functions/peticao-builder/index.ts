import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { tipo, area, partes, fatos, pedido } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabaseAdmin.functions.invoke("ai-orchestrator", {
      body: {
        useCase: "documents",
        prompt: `Gere uma petição judicial completa do tipo "${tipo}" na área "${area}".
Partes: ${partes}
Fatos: ${fatos}
Pedido: ${pedido}

Retorne APENAS um JSON válido seguindo esta estrutura:
{
  "peticao": {
    "tipo": "${tipo}",
    "enderecamento": "...",
    "qualificacao": "...",
    "dos_fatos": "...",
    "do_direito": [
      { "tese": "...", "fundamentacao": "..." }
    ],
    "dos_pedidos": ["...", "..."],
    "valor_causa": "...",
    "fechamento": "..."
  }
}`,
      },
    });

    if (error) throw error;

    let content = data.content;
    if (typeof content === "string") {
      content = content.replace(/```json\n?|\n?```/g, "").trim();
      const petData = JSON.parse(content);
      return new Response(JSON.stringify(petData), {
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
