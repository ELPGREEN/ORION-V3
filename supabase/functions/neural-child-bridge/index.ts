/**
 * neural-child-bridge v3
 * ─────────────────────────────────────────────────────────────
 * Ponte completa entre este projeto (filho) e a rede neural mãe ELP.
 *
 * Actions:
 *   sync_with_mother   — puxa export_full da mãe e importa localmente
 *   report_to_mother   — envia métricas completas (tabelas, registros, schema)
 *   expose_tables      — expõe schema completo do banco para a mãe
 *   expose_data        — permite a mãe consultar dados de qualquer tabela
 *   get_mother_status  — consulta status da rede mãe
 *   route_via_mother   — pede decisão de roteamento à mãe
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MOTHER_URL = "https://dlwafedtlvbvuoaopvsl.supabase.co/functions/v1/neural-bridge";
const MOTHER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk";

const CHILD_VERSION = "3.0.0";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );
}

async function callMother(action: string, payload: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch(MOTHER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MOTHER_ANON_KEY}`,
      apikey: MOTHER_ANON_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mother network error [${res.status}]: ${text}`);
  }
  return res.json();
}

// ─── 1. sync_with_mother ───
async function syncWithMother(): Promise<Record<string, unknown>> {
  console.log("🔄 Syncing with mother network...");
  const sb = getSupabase();
  const motherData = (await callMother("export_full")) as Record<string, unknown>;

  let specsImported = 0;
  let kbImported = 0;

  if (Array.isArray(motherData.specializations)) {
    for (const spec of motherData.specializations) {
      const { error } = await sb.from("neural_knowledge_base").upsert({
        title: `[mother:spec] ${spec.name || spec.id}`,
        content: JSON.stringify(spec),
        source_type: "mother_specialization",
        source_reference: `mother:spec:${spec.id || spec.name}`,
        tags: ["mother-network", "specialization", "auto-sync"],
        is_processed: true,
        user_id: spec.user_id || "00000000-0000-0000-0000-000000000000",
      }, { onConflict: "source_reference,user_id", ignoreDuplicates: false });
      if (!error) specsImported++;
    }
  }

  if (Array.isArray(motherData.knowledge_base)) {
    for (const kb of motherData.knowledge_base) {
      const { error } = await sb.from("neural_knowledge_base").upsert({
        title: kb.title || `[mother:kb] ${kb.id}`,
        content: typeof kb.content === "string" ? kb.content : JSON.stringify(kb.content),
        source_type: "mother_knowledge",
        source_reference: `mother:kb:${kb.id || kb.title}`,
        tags: ["mother-network", "knowledge", "auto-sync"],
        is_processed: true,
        user_id: kb.user_id || "00000000-0000-0000-0000-000000000000",
      }, { onConflict: "source_reference,user_id", ignoreDuplicates: false });
      if (!error) kbImported++;
    }
  }

  // Store routing weights
  await sb.from("neural_knowledge_base").upsert({
    title: "[mother:weights] Neural Routing Weights",
    content: JSON.stringify({
      routing_weights: motherData.routing_weights ?? null,
      neural_weights: motherData.neural_weights ?? null,
      synced_at: new Date().toISOString(),
    }),
    source_type: "mother_weights",
    source_reference: "mother:weights:latest",
    tags: ["mother-network", "weights", "routing"],
    is_processed: true,
    user_id: "00000000-0000-0000-0000-000000000000",
  }, { onConflict: "source_reference,user_id", ignoreDuplicates: false });

  // Log sync
  await sb.from("neural_learning_data").insert({
    interaction_type: "mother_sync",
    input_text: "sync_with_mother",
    output_text: JSON.stringify({ specsImported, kbImported }).substring(0, 5000),
    quality_score: 1.0,
    learned: true,
    metadata: { source: "neural-child-bridge", version: CHILD_VERSION, timestamp: new Date().toISOString() },
  });

  console.log(`✅ Sync complete: ${specsImported} specs, ${kbImported} kb, weights stored`);
  return { success: true, specializations_imported: specsImported, knowledge_imported: kbImported, weights_synced: true, synced_at: new Date().toISOString() };
}

// ─── 2. report_to_mother (enhanced with full DB info) ───
async function reportToMother(): Promise<Record<string, unknown>> {
  console.log("📤 Reporting to mother network...");
  const sb = getSupabase();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "unknown";

  // Get table list via information_schema
  const { data: tablesData } = await sb.rpc("get_public_tables") // FIXME(jules-audit): RPC inexistente.maybeSingle() as { data: unknown };
  
  // Fallback: query known tables for counts
  const mainTables = [
    "neural_learning_data", "neural_knowledge_base", "neural_specializations",
    "documents", "client_profiles", "processos", "chat_ia_messages",
    "legal_embeddings", "ai_metrics", "blooms"
  ];

  const tableCounts: Record<string, number> = {};
  let totalRecords = 0;

  for (const table of mainTables) {
    try {
      const { count } = await sb.from(table).select("id", { count: "exact", head: true });
      tableCounts[table] = count ?? 0;
      totalRecords += count ?? 0;
    } catch { /* table may not exist */ }
  }

  // Get recent avg score
  const { data: recentLearning } = await sb
    .from("neural_learning_data")
    .select("quality_score")
    .order("created_at", { ascending: false })
    .limit(50);

  const avgScore = recentLearning && recentLearning.length > 0
    ? recentLearning.reduce((s, r) => s + (r.quality_score || 0), 0) / recentLearning.length
    : 0;

  const report = {
    child_project: supabaseUrl,
    child_version: CHILD_VERSION,
    tables: Object.keys(tableCounts),
    table_counts: tableCounts,
    total_records: totalRecords,
    recent_avg_score: Math.round(avgScore * 1000) / 1000,
    timestamp: new Date().toISOString(),
  };

  const motherResponse = await callMother("receive_child_report", { data: { report } });

  console.log(`✅ Report sent: ${totalRecords} total records across ${Object.keys(tableCounts).length} tables`);
  return { success: true, report_summary: report, mother_response: motherResponse };
}

// ─── 3. expose_tables (full schema via REST SQL) ───
async function exposeTables(): Promise<Record<string, unknown>> {
  console.log("📋 Exposing table schema...");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  try {
    // Use REST /rest/v1/rpc or direct pg_catalog query via PostgREST
    // Since information_schema isn't exposed via PostgREST, use known tables with service role
    const sb = createClient(supabaseUrl, serviceKey);

    const mainTables = [
      "neural_learning_data", "neural_knowledge_base", "neural_specializations",
      "documents", "client_profiles", "processos", "chat_ia_messages", "chat_ia_conversations",
      "legal_embeddings", "ai_metrics", "ai_providers", "blooms", "bloom_shares",
      "contacts", "consultas", "invoices", "andamentos", "avaliacoes",
      "document_folders", "document_drafts", "document_locks", "document_style_memory",
      "escritorio_config", "honorarios_config", "notificacoes", "generation_queue",
      "api_cache", "chat_conversations", "chat_messages", "client_documents",
      "contact_documents", "processo_documents", "google_doc_links",
      "neural_ab_experiments", "neural_prompt_versions", "neural_evolution_proposals",
      "pro_bono_requests", "lawyer_presence", "courtlistener_webhook_events",
      "user_roles", "shared_documents", "rate_limits", "query_embedding_cache",
      "catalogo_dados_senado", "Contrato", "avencas", "banco de dados senado",
      "empresa contratadas", "licitações", "lovable_events", "lovable_users",
      "lovable_webhook_requests"
    ];

    const schema: Record<string, { count: number; sample_columns: string[] }> = {};
    for (const table of mainTables) {
      try {
        const { count } = await sb.from(table).select("*", { count: "exact", head: true });
        // Get column names from a single row
        const { data: sample } = await sb.from(table).select("*").limit(1);
        const columns = sample && sample.length > 0 ? Object.keys(sample[0]) : [];
        schema[table] = { count: count ?? 0, sample_columns: columns };
      } catch { /* table may not exist */ }
    }

    return {
      success: true,
      method: "service_role_enumeration",
      tables_count: Object.keys(schema).length,
      schema,
      child_project: supabaseUrl,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── 4. expose_data (service role for full access) ───
async function exposeData(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const tableName = String(body.table_name || "");
  const limit = Math.min(Number(body.limit) || 50, 500);

  if (!tableName) {
    return { success: false, error: "table_name is required" };
  }

  if (!/^[a-zA-Z_À-ú][a-zA-Z0-9_ À-ú]*$/.test(tableName)) {
    return { success: false, error: "Invalid table_name" };
  }

  console.log(`📦 Exposing data from "${tableName}" (limit: ${limit})`);
  const sb = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  const { data, error, count } = await sb
    .from(tableName)
    .select("*", { count: "exact" })
    .limit(limit);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    table: tableName,
    total_count: count ?? 0,
    returned_count: data?.length ?? 0,
    limit,
    data: data || [],
  };
}

// ─── 5. get_mother_status ───
async function getMotherStatus(): Promise<Record<string, unknown>> {
  console.log("🔍 Querying mother status...");
  const result = await callMother("status");
  return { success: true, mother_status: result };
}

// ─── 6. route_via_mother ───
async function routeViaMother(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  console.log("🧭 Routing via mother...");
  const result = await callMother("route", {
    use_case: body.use_case || "chat",
    model_type: body.model_type || "balanced",
    prompt_preview: String(body.prompt_preview || body.prompt || "").substring(0, 200),
    child_project: Deno.env.get("SUPABASE_URL") || "unknown",
  });
  return { success: true, routing_decision: result };
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

    // Health check
    if (action === "health_check" || action === "ping") {
      return new Response(JSON.stringify({
        success: true,
        version: CHILD_VERSION,
        mother_url: MOTHER_URL,
        child_project: Deno.env.get("SUPABASE_URL") || "unknown",
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let result: Record<string, unknown>;

    switch (action) {
      case "sync_with_mother":
        result = await syncWithMother();
        break;
      case "report_to_mother":
        result = await reportToMother();
        break;
      case "expose_tables":
        result = await exposeTables();
        break;
      case "expose_data":
        result = await exposeData(body);
        break;
      case "get_mother_status":
        result = await getMotherStatus();
        break;
      case "route_via_mother":
        result = await routeViaMother(body);
        break;
      case "report_registration": {
        console.log("📊 Processing registration report...");
        const sb = getSupabase();
        const regData = (body.data || {}) as Record<string, unknown>;
        
        // Get analytics
        const { data: analytics } = await sb.rpc("get_registration_analytics") // FIXME(jules-audit): RPC inexistente;
        
        // Report to mother network
        const motherReport = await callMother("receive_child_report", {
          data: {
            report: {
              child_project: Deno.env.get("SUPABASE_URL") || "unknown",
              event_type: "client_registration",
              tipo_caso: regData.tipo_caso,
              region: regData.region,
              channel: regData.channel,
              analytics_snapshot: analytics,
              timestamp: new Date().toISOString(),
            },
          },
        });
        
        result = { success: true, mother_response: motherReport, analytics };
        break;
      }
      case "receive_mother_apis": {
        const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/neural-ops`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ action: "receive_mother_apis", data: body.data }),
        });
        result = await resp.json() as Record<string, unknown>;
        break;
      }
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
    console.error("❌ neural-child-bridge error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
