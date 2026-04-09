import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getGeminiKeys(): string[] {
  const names = ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY_5", "GEMINI_API_KEY_6", "GEMINI_API_KEY_7", "GEMINI_API_KEY_GCP"];
  return names.map(n => Deno.env.get(n)).filter(Boolean) as string[];
}

let keyIndex = 0;
function getNextKey(): string {
  const keys = getGeminiKeys();
  if (!keys.length) throw new Error("No Gemini API keys");
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return key;
}

async function callGemini(prompt: string): Promise<string> {
  const key = getNextKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
    const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();

    // Gather data
    const [ordersRes, entriesRes, clientsRes, metricsRes] = await Promise.all([
      sb.from("orders").select("amount_cents, status, created_at").gte("created_at", d30),
      sb.from("orion_financial_entries").select("type, amount_cents, category").gte("date", d30.slice(0, 10)),
      sb.from("client_profiles").select("id, status, created_at").gte("created_at", d30),
      sb.from("ai_metrics").select("success, total_duration_ms").gte("created_at", d7),
    ]);

    const orders = ordersRes.data || [];
    const entries = entriesRes.data || [];
    const clients = clientsRes.data || [];
    const metrics = metricsRes.data || [];

    const revenue = orders.filter(o => o.status === "completed").reduce((s, o) => s + (o.amount_cents || 0), 0);
    const expenses = entries.filter(e => e.type === "saida").reduce((s, e) => s + e.amount_cents, 0);
    const errorRate = metrics.length > 0 ? (metrics.filter(m => !m.success).length / metrics.length * 100).toFixed(1) : "0";
    const avgDuration = metrics.length > 0 ? (metrics.reduce((s, m) => s + m.total_duration_ms, 0) / metrics.length / 1000).toFixed(1) : "0";

    const summary = `Relatório consolidado dos últimos 30 dias:
FINANCEIRO: Receita R$${(revenue / 100).toFixed(2)}, Despesas R$${(expenses / 100).toFixed(2)}, Resultado R$${((revenue - expenses) / 100).toFixed(2)}
COMERCIAL: ${clients.length} novos clientes, ${orders.filter(o => o.status === "completed").length} vendas concluídas
OPERACIONAL: Taxa de erro IA ${errorRate}%, Tempo médio ${avgDuration}s, ${metrics.length} tarefas processadas (7d)

Com base nestes dados, gere um relatório executivo curto (5-8 bullets) com:
1. Resumo financeiro (DRE simplificado)
2. Tendência comercial
3. Saúde operacional
4. 2-3 recomendações acionáveis
Responda em português.`;

    const aiReport = await callGemini(summary);

    const reportData = {
      financial: { revenue_cents: revenue, expenses_cents: expenses, result_cents: revenue - expenses },
      commercial: { new_clients: clients.length, completed_orders: orders.filter(o => o.status === "completed").length },
      operational: { error_rate: parseFloat(errorRate), avg_duration_s: parseFloat(avgDuration), tasks_7d: metrics.length },
      ai_analysis: aiReport,
      generated_at: now.toISOString(),
    };

    await sb.from("orion_reports").insert({
      report_type: "daily",
      data: reportData,
      period_start: d30.slice(0, 10),
      period_end: now.toISOString().slice(0, 10),
    });

    return new Response(JSON.stringify({ success: true, report: reportData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("orion-daily-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
