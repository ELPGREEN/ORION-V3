import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callClaude(systemPrompt: string, userPrompt: string, maxTokens = 16384): Promise<string> {
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
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(90000),
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

const DOCUMENT_TYPES: Record<string, string> = {
  peticao_inicial: "Petição Inicial",
  contestacao: "Contestação",
  recurso: "Recurso (Apelação/Agravo)",
  parecer: "Parecer Jurídico",
  contrato: "Contrato",
  notificacao: "Notificação Extrajudicial",
  habeas_corpus: "Habeas Corpus",
  mandado_seguranca: "Mandado de Segurança",
  acordo: "Acordo/Transação",
  procuracao: "Procuração",
  memorando: "Memorando Jurídico",
};

const SYSTEM_PROMPT = `Você é um advogado redator sênior com 20+ anos de experiência no sistema jurídico brasileiro.
Gere peças processuais e documentos jurídicos de alta qualidade.

REGRAS OBRIGATÓRIAS:
1. Use linguagem jurídica formal brasileira (culta, técnica, precisa)
2. Cite artigos de lei, súmulas e jurisprudência quando relevante
3. Estruture com formatação adequada (cabeçalho, qualificação, fatos, direito, pedidos)
4. Use caixa alta para termos processuais quando é praxe (EXCELENTÍSSIMO, REQUER, etc.)
5. Inclua fundamentação legal sólida com referências reais
6. Para contratos: use cláusulas numeradas, definições, foro competente
7. Adapte o tom conforme o tipo: petição (persuasiva), parecer (analítica), contrato (precisa)
8. Sempre inclua data e local para assinatura
9. Use formatação markdown

NUNCA invente números de processo, nomes de partes ou dados específicos — use placeholders [NOME], [CPF], [ENDEREÇO], etc.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
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

    const { document_type, context, area_direito, fatos, pedidos, reference_doc } = await req.json();

    if (!document_type || !DOCUMENT_TYPES[document_type]) {
      return new Response(JSON.stringify({
        error: "Tipo de documento inválido",
        valid_types: Object.keys(DOCUMENT_TYPES),
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!context || typeof context !== "string" || context.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Contexto muito curto (mín. 20 caracteres)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabel = DOCUMENT_TYPES[document_type];

    let userPrompt = `Gere uma ${typeLabel} completa.\n\n`;
    userPrompt += `ÁREA DO DIREITO: ${area_direito || "Geral"}\n\n`;
    userPrompt += `CONTEXTO/SITUAÇÃO:\n${context}\n\n`;

    if (fatos) userPrompt += `FATOS RELEVANTES:\n${fatos}\n\n`;
    if (pedidos) userPrompt += `PEDIDOS DESEJADOS:\n${pedidos}\n\n`;
    if (reference_doc) userPrompt += `DOCUMENTO DE REFERÊNCIA:\n${reference_doc.slice(0, 50000)}\n\n`;

    userPrompt += `Gere o documento completo, pronto para revisão e uso. Use placeholders para dados específicos.`;

    const document = await callClaude(SYSTEM_PROMPT, userPrompt);

    return new Response(JSON.stringify({
      document,
      document_type: typeLabel,
      model: "claude-sonnet-4",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[claude-legal-gen] Error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
