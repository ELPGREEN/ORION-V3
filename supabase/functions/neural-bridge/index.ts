/**
 * neural-bridge v2
 * ─────────────────────────────────────────────────────────────
 * Hub neural local — exporta estrutura, recebe reports de filhos,
 * e faz roteamento inteligente de IA.
 *
 * Actions:
 *   export_full              — Exporta especializações, knowledge, pesos
 *   export_weights           — Exporta apenas pesos neurais
 *   export_specializations   — Exporta apenas especializações
 *   export_knowledge         — Exporta apenas knowledge base
 *   status                   — Status do hub neural
 *   receive_child_report     — Recebe métricas de projetos filhos
 *   route                    — Decisão de roteamento de IA
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRIDGE_VERSION = "2.0.0";

// ─── Routing weights: provider → use_case scores ───
const DEFAULT_ROUTING: Record<string, Record<string, number>> = {
  groq: { chat: 0.9, search: 0.7, code_gen: 0.8, translation: 0.7, documents: 0.6, analysis: 0.5 },
  mistral: { chat: 0.7, search: 0.6, code_gen: 0.6, translation: 0.9, documents: 0.8, analysis: 0.7 },
  anthropic: { chat: 0.8, search: 0.8, code_gen: 0.9, translation: 0.6, documents: 0.9, analysis: 0.95 },
  openai: { chat: 0.75, search: 0.75, code_gen: 0.85, translation: 0.8, documents: 0.85, analysis: 0.85 },
  gemini: { chat: 0.7, search: 0.8, code_gen: 0.7, translation: 0.75, documents: 0.7, analysis: 0.8 },
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );
}

// ─── export_full ───
async function handleExportFull() {
  const sb = getSupabase();

  const [specRes, kbRes, learningRes] = await Promise.all([
    sb.from("neural_specializations").select("id, name, category, description, prompts, training_data, accuracy_score, is_active"),
    sb.from("neural_knowledge_base").select("id, title, content, source_type, source_reference, tags, is_processed"),
    sb.from("neural_learning_data")
      .select("interaction_type, input_text, output_text, quality_score, metadata")
      .eq("learned", true)
      .gte("quality_score", 0.7)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return {
    success: true,
    specializations: specRes.data || [],
    knowledge_base: kbRes.data || [],
    routing_weights: DEFAULT_ROUTING,
    neural_weights: (learningRes.data || []).map((r) => ({
      type: r.interaction_type,
      score: r.quality_score,
      meta: r.metadata,
    })),
  };
}

// ─── export_weights ───
async function handleExportWeights() {
  const sb = getSupabase();
  const { data } = await sb
    .from("neural_learning_data")
    .select("interaction_type, quality_score, metadata")
    .eq("learned", true)
    .gte("quality_score", 0.7)
    .order("created_at", { ascending: false })
    .limit(100);

  return { success: true, routing_weights: DEFAULT_ROUTING, neural_weights: data || [] };
}

// ─── export_specializations ───
async function handleExportSpecializations() {
  const sb = getSupabase();
  const { data } = await sb
    .from("neural_specializations")
    .select("id, name, category, description, prompts, training_data, accuracy_score, is_active");
  return { success: true, specializations: data || [] };
}

// ─── export_knowledge ───
async function handleExportKnowledge() {
  const sb = getSupabase();
  const { data } = await sb
    .from("neural_knowledge_base")
    .select("id, title, content, source_type, source_reference, tags, is_processed");
  return { success: true, knowledge_base: data || [] };
}

// ─── status ───
async function handleStatus() {
  const sb = getSupabase();
  const [specCount, kbCount, modelsCount] = await Promise.all([
    sb.from("neural_specializations").select("id", { count: "exact", head: true }),
    sb.from("neural_knowledge_base").select("id", { count: "exact", head: true }),
    sb.from("neural_learning_data").select("id", { count: "exact", head: true }).eq("learned", true),
  ]);

  return {
    success: true,
    status: {
      bridge_version: BRIDGE_VERSION,
      ready: true,
      specializations: specCount.count ?? 0,
      knowledge_entries: kbCount.count ?? 0,
      saved_models: modelsCount.count ?? 0,
    },
  };
}

// ─── receive_child_report ───
async function handleReceiveChildReport(body: Record<string, unknown>) {
  const sb = getSupabase();
  const report = (body.data as Record<string, unknown>)?.report || body.report;

  if (!report) {
    return { success: false, error: "report is required in body.data.report or body.report" };
  }

  const reportStr = JSON.stringify(report);

  const { error } = await sb.from("neural_learning_data").insert({
    interaction_type: "child_report",
    input_text: reportStr.substring(0, 5000),
    output_text: `Received from child at ${new Date().toISOString()}`,
    quality_score: 0.5,
    learned: false,
    metadata: {
      source: "neural-bridge:receive_child_report",
      child_project: (report as Record<string, unknown>)?.child_project_id || "unknown",
      received_at: new Date().toISOString(),
      report_data: report,
    },
  });

  if (error) {
    console.error("❌ Failed to store child report:", error.message);
    return { success: false, error: error.message };
  }

  console.log(`📥 Child report received and stored`);
  return { success: true, message: "Report received and stored for processing" };
}

// ─── route ───
async function handleRoute(body: Record<string, unknown>) {
  const useCase = String(body.use_case || "chat");
  const modelType = String(body.model_type || "balanced");

  // Model type overrides
  const modelOverrides: Record<string, string> = {
    fast: "groq",
    reasoning: "anthropic",
    analysis: "anthropic",
    secure: "anthropic",
  };

  if (modelOverrides[modelType]) {
    const provider = modelOverrides[modelType];
    return {
      success: true,
      provider,
      weight: 1.0,
      reasoning: `Model type "${modelType}" forces provider "${provider}"`,
    };
  }

  // Use routing weights for balanced selection
  let bestProvider = "groq";
  let bestWeight = 0;

  for (const [provider, scores] of Object.entries(DEFAULT_ROUTING)) {
    const score = scores[useCase] ?? 0.5;
    if (score > bestWeight) {
      bestWeight = score;
      bestProvider = provider;
    }
  }

  return {
    success: true,
    provider: bestProvider,
    weight: bestWeight,
    reasoning: `Best provider for use_case="${useCase}" with model_type="${modelType}"`,
  };
}

// ─── Main handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "action is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, unknown>;

    switch (action) {
      case "export_full":
        result = await handleExportFull();
        break;
      case "export_weights":
        result = await handleExportWeights();
        break;
      case "export_specializations":
        result = await handleExportSpecializations();
        break;
      case "export_knowledge":
        result = await handleExportKnowledge();
        break;
      case "status":
        result = await handleStatus();
        break;
      case "receive_child_report":
        result = await handleReceiveChildReport(body);
        break;
      case "route":
        result = await handleRoute(body);
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ neural-bridge error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
