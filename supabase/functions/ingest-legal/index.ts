/**
 * ingest-legal — Consolidated legal data ingestion endpoint
 * ─────────────────────────────────────────────────────────
 * Merges: scrape-univates, ingest-sumulas-bulk, ingest-jurisprudencia-stf,
 *         ingest-senado-api, ingest-senado-bulk, ingest-codigos-legais,
 *         ingest-doutrina-penal, ingest-aury-lopes, datajud-ingestion
 *
 * Routing:
 *   - body.action === "datajud" → datajud-ingestion
 *   - body.action === "senado_api" → ingest-senado-api
 *   - body.action === "senado_bulk" → ingest-senado-bulk
 *   - body.action === "sumulas" → ingest-sumulas-bulk
 *   - body.action === "jurisprudencia_stf" → ingest-jurisprudencia-stf
 *   - body.action === "codigos_legais" → ingest-codigos-legais
 *   - body.action === "doutrina_penal" → ingest-doutrina-penal
 *   - body.action === "aury_lopes" → ingest-aury-lopes
 *   - body.areas (no action) → scrape-univates (legacy compat)
 *   - body.text (no action) → raw text ingestion (generic bulk)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Map action names to existing edge function names
const ACTION_TO_FUNCTION: Record<string, string> = {
  datajud: "datajud-ingestion",
  senado_api: "ingest-senado-api",
  senado_bulk: "ingest-senado-bulk",
  sumulas: "ingest-sumulas-bulk",
  jurisprudencia_stf: "ingest-jurisprudencia-stf",
  codigos_legais: "ingest-codigos-legais",
  doutrina_penal: "ingest-doutrina-penal",
  aury_lopes: "ingest-aury-lopes",
  univates: "scrape-univates",
  smart: "smart-ingest",
  legislacao_federal: "legislacao-federal",
};

async function delegateToFunction(functionName: string, body: Record<string, unknown>, req: Request) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${functionName}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: req.headers.get("authorization") || "",
      apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`❌ Delegate to ${functionName} failed [${resp.status}]:`, errText);
    return { success: false, error: `${functionName} returned ${resp.status}: ${errText.substring(0, 200)}` };
  }

  return await resp.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action } = body;

    // Route 1: Explicit action → delegate to specific function
    if (action && ACTION_TO_FUNCTION[action]) {
      const result = await delegateToFunction(ACTION_TO_FUNCTION[action], body, req);
      return json(result);
    }

    // Route 2: Has areas → univates scraper (legacy compat)
    if (body.areas && Array.isArray(body.areas)) {
      const result = await delegateToFunction("scrape-univates", body, req);
      return json(result);
    }

    // Route 3: Has text → smart-ingest or direct bulk ingestion
    if (body.text) {
      const result = await delegateToFunction("smart-ingest", body, req);
      return json(result);
    }

    // Route 4: Has tribunal/tipo → datajud
    if (body.tribunal || body.tipo) {
      const result = await delegateToFunction("datajud-ingestion", body, req);
      return json(result);
    }

    // Route 5: Has fontes → dados gov style (senado-api)
    if (body.fontes) {
      const result = await delegateToFunction("ingest-senado-api", body, req);
      return json(result);
    }

    return json({ error: "No valid action, areas, text, or tribunal provided. Valid actions: " + Object.keys(ACTION_TO_FUNCTION).join(", ") }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ ingest-legal error:", msg);
    return json({ error: msg }, 500);
  }
});
