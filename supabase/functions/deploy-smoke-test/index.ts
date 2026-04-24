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

// Tabelas Senado que DEVEM existir e ter "Public read access" (anon SELECT).
const REQUIRED_PUBLIC_TABLES = [
  "Contrato",
  "avencas",
  "banco de dados senado",
  "empresa contratadas",
  "licitações",
];

// Tabelas core que DEVEM existir (RLS própria, não testamos leitura anon).
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

function isMissingRelation(msg?: string): boolean {
  if (!msg) return false;
  return /does not exist|relation .* does not exist|PGRST205/i.test(msg);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });

  const results: CheckResult[] = [];

  // 1. Existência de tabela (via service role — bypassa RLS)
  for (const t of [...REQUIRED_PUBLIC_TABLES, ...REQUIRED_CORE_TABLES]) {
    const { error } = await (admin as any)
      .from(t)
      .select("*", { head: true, count: "exact" })
      .limit(1);

    const exists = !error || !isMissingRelation(error.message);
    results.push({
      name: `table_exists:${t}`,
      ok: exists,
      detail: exists ? undefined : error?.message,
    });
  }

  // 2. Public read policy (via anon — deve conseguir SELECT)
  for (const t of REQUIRED_PUBLIC_TABLES) {
    const { error } = await (anon as any)
      .from(t)
      .select("*", { head: true, count: "exact" })
      .limit(1);

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
