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

async function callGemini(prompt: string, systemPrompt?: string): Promise<string> {
  const key = getNextKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const contents: any[] = [];
  if (systemPrompt) {
    contents.push({ role: "user", parts: [{ text: systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: "Entendido." }] });
  }
  contents.push({ role: "user", parts: [{ text: prompt }] });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ─── ACTION: DRE ───
async function handleDre(days: number) {
  const sb = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [ordersRes, entriesRes] = await Promise.all([
    sb.from("orders").select("amount_cents, status, created_at").gte("created_at", since),
    sb.from("orion_financial_entries").select("type, amount_cents, category, date").gte("date", since.slice(0, 10)),
  ]);

  const orders = ordersRes.data || [];
  const entries = entriesRes.data || [];

  const receita = orders.filter(o => o.status === "completed").reduce((s, o) => s + (o.amount_cents || 0), 0);
  const entradasManuais = entries.filter(e => e.type === "entrada").reduce((s, e) => s + e.amount_cents, 0);
  const saidas = entries.filter(e => e.type === "saida").reduce((s, e) => s + e.amount_cents, 0);

  const receitaTotal = receita + entradasManuais;
  const resultado = receitaTotal - saidas;
  const margemBruta = receitaTotal > 0 ? ((receitaTotal - saidas) / receitaTotal * 100).toFixed(1) : "0";

  // Group expenses by category
  const byCategory: Record<string, number> = {};
  entries.filter(e => e.type === "saida").forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount_cents;
  });

  return {
    periodo_dias: days,
    receita_vendas_cents: receita,
    entradas_manuais_cents: entradasManuais,
    receita_amount_cents: receitaTotal,
    despesas_cents: saidas,
    resultado_cents: resultado,
    margem_bruta_percent: parseFloat(margemBruta),
    despesas_por_categoria: byCategory,
    total_orders: orders.length,
    orders_completed: orders.filter(o => o.status === "completed").length,
  };
}

// ─── ACTION: ANOMALIES ───
async function handleAnomalies() {
  const sb = getSupabaseAdmin();
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [orders7, orders30, metrics7, metrics30] = await Promise.all([
    sb.from("orders").select("amount_cents, status").gte("created_at", d7),
    sb.from("orders").select("amount_cents, status").gte("created_at", d30),
    sb.from("ai_metrics").select("success, total_duration_ms").gte("created_at", d7),
    sb.from("ai_metrics").select("success, total_duration_ms").gte("created_at", d30),
  ]);

  const rev7 = (orders7.data || []).filter(o => o.status === "completed").reduce((s, o) => s + (o.amount_cents || 0), 0);
  const rev30 = (orders30.data || []).filter(o => o.status === "completed").reduce((s, o) => s + (o.amount_cents || 0), 0);
  const avgRev30Daily = rev30 / 30;
  const avgRev7Daily = rev7 / 7;

  const err7 = (metrics7.data || []).filter(m => !m.success).length;
  const total7 = (metrics7.data || []).length;
  const err30 = (metrics30.data || []).filter(m => !m.success).length;
  const total30 = (metrics30.data || []).length;

  const errorRate7 = total7 > 0 ? err7 / total7 : 0;
  const errorRate30 = total30 > 0 ? err30 / total30 : 0;

  const anomalies: any[] = [];
  if (avgRev30Daily > 0) {
    const revenueChange = ((avgRev7Daily - avgRev30Daily) / avgRev30Daily) * 100;
    if (Math.abs(revenueChange) > 30) {
      anomalies.push({
        type: "revenue",
        metric: "Receita diária média",
        change_percent: parseFloat(revenueChange.toFixed(1)),
        severity: Math.abs(revenueChange) > 50 ? "critical" : "warning",
        message: `Receita ${revenueChange > 0 ? "subiu" : "caiu"} ${Math.abs(revenueChange).toFixed(0)}% nos últimos 7 dias vs média 30 dias`,
      });
    }
  }
  if (errorRate30 > 0) {
    const errChange = ((errorRate7 - errorRate30) / errorRate30) * 100;
    if (Math.abs(errChange) > 30) {
      anomalies.push({
        type: "error_rate",
        metric: "Taxa de erro IA",
        change_percent: parseFloat(errChange.toFixed(1)),
        severity: errChange > 50 ? "critical" : "warning",
        message: `Taxa de erro ${errChange > 0 ? "subiu" : "caiu"} ${Math.abs(errChange).toFixed(0)}%`,
      });
    }
  }

  return { anomalies, checked_at: new Date().toISOString() };
}

// ─── ACTION: PROJECTIONS ───
async function handleProjections() {
  const dre30 = await handleDre(30);
  const dre60 = await handleDre(60);
  const dre90 = await handleDre(90);

  const prompt = `Dados financeiros reais de uma empresa digital:
- Últimos 30 dias: Receita R$${(dre30.receita_amount_cents / 100).toFixed(2)}, Despesas R$${(dre30.despesas_cents / 100).toFixed(2)}, ${dre30.orders_completed} vendas
- Últimos 60 dias: Receita R$${(dre60.receita_amount_cents / 100).toFixed(2)}, Despesas R$${(dre60.despesas_cents / 100).toFixed(2)}, ${dre60.orders_completed} vendas
- Últimos 90 dias: Receita R$${(dre90.receita_amount_cents / 100).toFixed(2)}, Despesas R$${(dre90.despesas_cents / 100).toFixed(2)}, ${dre90.orders_completed} vendas

Gere projeções para os próximos 30, 60 e 90 dias. Responda APENAS em JSON válido com esta estrutura:
{"projections":[{"days":30,"receita_cents":0,"despesas_cents":0,"resultado_cents":0},{"days":60,...},{"days":90,...}],"insights":"texto curto com análise"}`;

  const result = await callGemini(prompt, "Você é um analista financeiro. Responda somente JSON válido.");
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { raw: result, error: "Failed to parse projection" };
  }
}

// ─── ACTION: LEAD SCORING ───
async function handleLeadScoring() {
  const sb = getSupabaseAdmin();
  const [clientsRes, convRes] = await Promise.all([
    sb.from("client_profiles").select("id, nome, email, status, tipo_caso, created_at").limit(50),
    sb.from("chat_conversations").select("cliente_id, updated_at").order("updated_at", { ascending: false }).limit(100),
  ]);

  const clients = clientsRes.data || [];
  const conversations = convRes.data || [];

  // Simple scoring without Gemini for speed
  const scored = clients.map(c => {
    let score = 50;
    if (c.status === "ativo") score += 20;
    if (c.tipo_caso) score += 10;
    const hasRecentChat = conversations.some(
      conv => conv.cliente_id === c.id && new Date(conv.updated_at) > new Date(Date.now() - 7 * 86400000)
    );
    if (hasRecentChat) score += 20;
    return { id: c.id, nome: c.nome, email: c.email, score: Math.min(score, 100), status: c.status };
  });

  scored.sort((a, b) => b.score - a.score);
  return { leads: scored, total: scored.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "dre";
    const days = parseInt(url.searchParams.get("days") || "30");

    let result: any;
    switch (action) {
      case "dre":
        result = await handleDre(days);
        break;
      case "anomalies":
        result = await handleAnomalies();
        break;
      case "projections":
        result = await handleProjections();
        break;
      case "lead-scoring":
        result = await handleLeadScoring();
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("orion-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
