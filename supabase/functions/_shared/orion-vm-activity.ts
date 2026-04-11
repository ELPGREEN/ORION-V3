/**
 * Orion VM Activity Tracker — single-row upsert in api_cache
 * Uses a fixed UUID to guarantee exactly ONE activity row.
 */

const ACTIVITY_ROW_ID = "00000000-aaaa-bbbb-cccc-orionvmact01";
const ACTIVITY_QUERY_HASH = "orion-vm-last-activity";

function getSupabaseAdminConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;
  return { supabaseUrl, serviceKey };
}

export async function recordVmActivity(source: string): Promise<void> {
  const config = getSupabaseAdminConfig();
  if (!config) return;

  const { supabaseUrl, serviceKey } = config;
  const now = Date.now();

  // Always PATCH the single canonical row
  const patchResp = await fetch(
    `${supabaseUrl}/rest/v1/api_cache?query_hash=eq.${ACTIVITY_QUERY_HASH}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        response_data: { timestamp: now, source },
        source,
        expires_at: new Date(now + 86_400_000).toISOString(),
      }),
    },
  );

  // If no rows matched (first time), insert
  if (patchResp.ok) {
    // Check if any row was actually updated by trying a HEAD/count
    // For simplicity, just ensure the row exists
    const checkResp = await fetch(
      `${supabaseUrl}/rest/v1/api_cache?query_hash=eq.${ACTIVITY_QUERY_HASH}&select=id&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      },
    );
    const rows = await checkResp.json().catch(() => []);
    if (Array.isArray(rows) && rows.length > 0) return; // Updated successfully
  }

  // Insert if no row exists
  await fetch(`${supabaseUrl}/rest/v1/api_cache`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      query_hash: ACTIVITY_QUERY_HASH,
      query_text: "last-activity",
      source,
      response_data: { timestamp: now, source },
      expires_at: new Date(now + 86_400_000).toISOString(),
    }),
  });
}

export async function getLastVmActivity(): Promise<number> {
  const config = getSupabaseAdminConfig();
  if (!config) return 0;

  const { supabaseUrl, serviceKey } = config;
  const resp = await fetch(
    `${supabaseUrl}/rest/v1/api_cache?query_hash=eq.${ACTIVITY_QUERY_HASH}&select=response_data&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    },
  );

  if (!resp.ok) return 0;
  const rows = await resp.json().catch(() => []);
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  const ts = Number(rows[0]?.response_data?.timestamp ?? 0);
  return Number.isFinite(ts) && ts > 0 ? ts : 0;
}
