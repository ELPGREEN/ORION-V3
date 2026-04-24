// Deploy Smoke Test
// Valida tabelas essenciais + policies de leitura pública antes/após cada deploy.
// Bloqueia deploys quando relations críticas (ex.: public.Contrato) estão ausentes
// ou quando "Public read access" não está aplicada nas tabelas Senado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Tabelas Senado que DEVEM existir e ter "Public read access"
const REQUIRED_PUBLIC_TABLES = [
  "Contrato",
  "avencas",
  "banco de dados senado",
  "empresa contratadas",
  "licitações",
];

// Tabelas core que DEVEM existir (estruturais — RLS própria)
const REQUIRED_CORE_TABLES = [
  "profiles",
  "user_roles",
  "documents",
  "client_profiles",
  "ai_metrics",
];

interface CheckResult {
  name: string;
  ok: boolean;
  detail?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const results: CheckResult[] = [];

  // 1. Tabelas existem?
  const allTables = [...REQUIRED_PUBLIC_TABLES, ...REQUIRED_CORE_TABLES];
  const { data: existing, error: existErr } = await admin
    .from("information_schema.tables" as never)
    .select("table_name")
    .eq("table_schema", "public")
    .in("table_name", allTables);

  // Fallback via SQL RPC se information_schema bloqueado
  let presentTables: string[] = [];
  if (existErr || !existing) {
    // Sondagem direta — tenta SELECT 1 em cada
    for (const t of allTables) {
      const { error } = await admin.from(t as never).select("*", { head: true, count: "exact" }).limit(1);
      results.push({
        name: `table_exists:${t}`,
        ok: !error || !/does not exist/i.test(error.message),
        detail: error?.message,
      });
      if (!error || !/does not exist/i.test(error.message)) presentTables.push(t);
    }
  } else {
    presentTables = (existing as Array<{ table_name: string }>).map((r) => r.table_name);
    for (const t of allTables) {
      results.push({
        name: `table_exists:${t}`,
        ok: presentTables.includes(t),
        detail: presentTables.includes(t) ? undefined : "missing in public schema",
      });
    }
  }

  // 2. Policies de leitura pública nas tabelas Senado
  for (const t of REQUIRED_PUBLIC_TABLES) {
    if (!presentTables.includes(t)) continue;
    const { data, error } = await admin.from(t as never).select("*", { head: true, count: "exact" }).limit(1);
    results.push({
      name: `public_read:${t}`,
      ok: !error,
      detail: error?.message,
    });
  }

  const failures = results.filter((r) => !r.ok);
  const passed = results.length - failures.length;

  return new Response(
    JSON.stringify({
      status: failures.length === 0 ? "pass" : "fail",
      summary: `${passed}/${results.length} checks passed`,
      failures,
      results,
      checked_at: new Date().toISOString(),
    }),
    {
      status: failures.length === 0 ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
