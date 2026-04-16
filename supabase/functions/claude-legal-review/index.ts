import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callClaude(systemPrompt: string, userPrompt: string, maxTokens = 8192): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("ANTROPIC_API_KEY");
  if (!apiKey) throw new Error("No ANTHROPIC_API_KEY configured");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (resp.status === 429) throw new Error("Claude rate limited — tente novamente em alguns segundos");
  if (resp.status === 402) throw new Error("Claude sem créditos disponíveis");
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Claude ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json();
  return data.content?.[0]?.text || "Sem resposta do Claude.";
}

const SYSTEM_PROMPT = `Você é um advogado sênior especialista em análise de documentos jurídicos brasileiros.
Sua tarefa é fazer uma revisão profunda e detalhada do documento fornecido.

Analise os seguintes aspectos:

## 1. CONFORMIDADE LEGAL
- Verificar se cláusulas estão de acordo com a legislação brasileira vigente
- Identificar cláusulas abusivas ou nulas (CDC, CC, CLT conforme aplicável)
- Verificar prazos e requisitos formais

## 2. RISCOS CONTRATUAIS
- Cláusulas que geram risco para cada parte
- Ambiguidades que podem gerar litígio
- Lacunas contratuais importantes
- Multas e penalidades desproporcionais

## 3. REDAÇÃO E TÉCNICA
- Erros de redação jurídica
- Inconsistências internas entre cláusulas
- Referências incorretas a artigos/leis
- Termos vagos que precisam ser especificados

## 4. RECOMENDAÇÕES
- Alterações sugeridas (com redação proposta)
- Cláusulas que devem ser adicionadas
- Pontos que requerem negociação

## 5. SCORE DE RISCO
- Classificação geral: BAIXO / MÉDIO / ALTO / CRÍTICO
- Justificativa do score

Responda em português brasileiro, de forma técnica mas clara.
Use formatação markdown com headers, bullet points e tabelas quando apropriado.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { document_text, document_type, focus_areas } = await req.json();

    if (!document_text || typeof document_text !== "string" || document_text.trim().length < 50) {
      return new Response(JSON.stringify({ error: "Documento muito curto ou ausente (mín. 50 caracteres)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabel = document_type || "documento jurídico";
    const focusNote = focus_areas?.length
      ? `\n\nFOCO ESPECIAL: ${focus_areas.join(", ")}`
      : "";

    const userPrompt = `Analise o seguinte ${typeLabel}:${focusNote}\n\n---\n\n${document_text.slice(0, 100000)}`;

    const analysis = await callClaude(SYSTEM_PROMPT, userPrompt);

    return new Response(JSON.stringify({
      analysis,
      model: "claude-sonnet-4",
      document_type: typeLabel,
      chars_analyzed: document_text.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[claude-legal-review] Error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
