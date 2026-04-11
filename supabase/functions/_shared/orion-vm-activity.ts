type ActivityRow = {
  id?: string;
  created_at?: string | null;
  response_data?: {
    timestamp?: number | string | null;
  } | null;
};

const ACTIVITY_QUERY_HASH = "orion-vm-last-activity";
const ACTIVITY_QUERY_TEXT = "last-activity";
const ACTIVITY_TTL_MS = 86_400_000;

function getSupabaseAdminConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return { supabaseUrl, serviceKey };
}

function getActivityTimestamp(row: ActivityRow | null | undefined): number {
  const explicitTimestamp = Number(row?.response_data?.timestamp ?? 0);
  if (Number.isFinite(explicitTimestamp) && explicitTimestamp > 0) {
    return explicitTimestamp;
  }

  const createdAtTimestamp = Date.parse(row?.created_at ?? "");
  return Number.isFinite(createdAtTimestamp) ? createdAtTimestamp : 0;
}

async function fetchLatestActivityRow(): Promise<ActivityRow | null> {
  const config = getSupabaseAdminConfig();
  if (!config) return null;

  const { supabaseUrl, serviceKey } = config;
  const queryHash = encodeURIComponent(ACTIVITY_QUERY_HASH);
  const resp = await fetch(
    `${supabaseUrl}/rest/v1/api_cache?query_hash=eq.${queryHash}&select=id,created_at,response_data&order=created_at.desc&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    },
  );

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.warn(`[orion-vm-activity] Failed to read last activity: ${resp.status} ${errText.slice(0, 200)}`);
    return null;
  }

  const rows = await resp.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows.reduce<ActivityRow | null>((latest, row) => {
    if (!latest) return row as ActivityRow;
    return getActivityTimestamp(row as ActivityRow) > getActivityTimestamp(latest)
      ? (row as ActivityRow)
      : latest;
  }, null);
}

export async function recordVmActivity(source: string): Promise<void> {
  const config = getSupabaseAdminConfig();
  if (!config) return;

  const { supabaseUrl, serviceKey } = config;
  const now = Date.now();
  const payload = {
    query_hash: ACTIVITY_QUERY_HASH,
    query_text: ACTIVITY_QUERY_TEXT,
    source,
    response_data: { timestamp: now },
    expires_at: new Date(now + ACTIVITY_TTL_MS).toISOString(),
  };

  const latestRow = await fetchLatestActivityRow();
  if (latestRow?.id) {
    const updateResp = await fetch(`${supabaseUrl}/rest/v1/api_cache?id=eq.${latestRow.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });

    if (updateResp.ok) {
      return;
    }

    const errText = await updateResp.text().catch(() => "");
    console.warn(`[orion-vm-activity] Failed to update activity row ${latestRow.id}: ${updateResp.status} ${errText.slice(0, 200)}`);
  }

  const insertResp = await fetch(`${supabaseUrl}/rest/v1/api_cache`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!insertResp.ok) {
    const errText = await insertResp.text().catch(() => "");
    console.warn(`[orion-vm-activity] Failed to insert activity row: ${insertResp.status} ${errText.slice(0, 200)}`);
  }
}

export async function getLastVmActivity(): Promise<number> {
  const latestRow = await fetchLatestActivityRow();
  return getActivityTimestamp(latestRow);
}
