import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AMAZON_CLIENT_ID = Deno.env.get("AMAZON_CLIENT_ID") || "";
const AMAZON_CLIENT_SECRET = Deno.env.get("AMAZON_CLIENT_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(msg: string, status = 400) {
  return json({ error: msg }, status);
}

async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!auth) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb.auth.getUser(auth);
  return data?.user?.id || null;
}

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function getTokens(userId: string) {
  const sb = getSupabase();
  const { data } = await sb
    .from("user_integration_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "amazon")
    .maybeSingle();
  return data;
}

async function saveTokens(userId: string, tokens: Record<string, unknown>) {
  const sb = getSupabase();
  const row = {
    user_id: userId,
    provider: "amazon",
    access_token: tokens.access_token as string,
    refresh_token: tokens.refresh_token as string || undefined,
    expires_at: tokens.expires_in
      ? new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString()
      : undefined,
    scopes: ["profile"],
    updated_at: new Date().toISOString(),
  };

  const existing = await getTokens(userId);
  if (existing) {
    if (!row.refresh_token) row.refresh_token = existing.refresh_token;
    await sb.from("user_integration_tokens").update(row).eq("id", existing.id);
  } else {
    await sb.from("user_integration_tokens").insert(row);
  }
}

const SCOPES = ["profile"];

// ─── Login with Amazon: exchange code → get profile → create/sign-in Supabase user ───
async function handleLogin(body: Record<string, unknown>) {
  const code = body.code as string;
  const redirectUri = body.redirect_uri as string;
  if (!code || !redirectUri) return err("Missing code or redirect_uri");

  // 1. Exchange authorization code for Amazon tokens
  const tokenRes = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: AMAZON_CLIENT_ID,
      client_secret: AMAZON_CLIENT_SECRET,
    }),
  });

  if (!tokenRes.ok) {
    const e = await tokenRes.text();
    return err(`Amazon token exchange failed: ${e}`, 400);
  }

  const tokens = await tokenRes.json();

  // 2. Get Amazon user profile
  const profileRes = await fetch("https://api.amazon.com/user/profile", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) {
    return err("Failed to get Amazon profile", 400);
  }

  const profile = await profileRes.json();
  const email = profile.email;
  const name = profile.name || profile.email?.split("@")[0] || "Amazon User";

  if (!email) return err("Amazon profile has no email", 400);

  const sb = getSupabase();

  // 3. Check if user already exists by email
  const { data: existingUsers } = await sb.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
  } else {
    // 4. Create new Supabase user (auto-confirmed, random password)
    const randomPassword = crypto.randomUUID() + "Aa1!";
    const { data: newUser, error: createError } = await sb.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        avatar_url: null,
        account_type: "cliente",
        provider: "amazon",
      },
    });

    if (createError || !newUser?.user) {
      return err(`Failed to create user: ${createError?.message || "unknown"}`, 500);
    }
    userId = newUser.user.id;
  }

  // 5. Save Amazon tokens for integration use
  await saveTokens(userId, tokens);

  // 6. Generate a Supabase session via magic link token
  // Use admin generateLink to create a sign-in link, then extract the token
  const { data: linkData, error: linkError } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData) {
    return err(`Failed to generate session: ${linkError?.message || "unknown"}`, 500);
  }

  // Return the hashed_token and verification_type for the client to use
  return json({
    success: true,
    email,
    name,
    user_id: userId,
    // The client will use verifyOtp with these values
    token_hash: linkData.properties?.hashed_token,
    verification_type: "magiclink",
    profile: { email, name, user_id: profile.user_id },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "";

    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { body = {}; }
    }

    // Login action does NOT require existing auth (user is logging in)
    if (action === "login") {
      return await handleLogin(body);
    }

    // Config action also doesn't require auth (needed before login)
    if (action === "config") {
      return json({ client_id: AMAZON_CLIENT_ID, scopes: SCOPES });
    }

    // All other actions require authentication
    const userId = await getUserId(req);
    if (!userId) return err("Not authenticated", 401);

    if (action === "status") {
      const tokens = await getTokens(userId);
      if (!tokens?.access_token) {
        return json({ connected: false, profile: null, scopes: [], expires_at: null, updated_at: null });
      }
      let profile = null;
      try {
        const res = await fetch("https://api.amazon.com/user/profile", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (res.ok) profile = await res.json();
      } catch { /* ignore */ }
      return json({
        connected: true,
        profile,
        scopes: tokens.scopes || [],
        expires_at: tokens.expires_at,
        updated_at: tokens.updated_at,
      });
    }

    if (action === "exchange") {
      const code = body.code as string;
      const redirectUri = body.redirect_uri as string;
      if (!code) return err("Missing code");

      const res = await fetch("https://api.amazon.com/auth/o2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: AMAZON_CLIENT_ID,
          client_secret: AMAZON_CLIENT_SECRET,
        }),
      });

      if (!res.ok) {
        const e = await res.text();
        return err(`Amazon token exchange failed: ${e}`, 400);
      }

      const tokens = await res.json();
      await saveTokens(userId, tokens);
      return json({ success: true });
    }

    if (action === "disconnect") {
      const sb = getSupabase();
      await sb.from("user_integration_tokens").delete().eq("user_id", userId).eq("provider", "amazon");
      return json({ success: true });
    }

    if (action === "api") {
      const tokens = await getTokens(userId);
      if (!tokens?.access_token) return err("Amazon not connected", 401);

      const endpoint = body.endpoint as string;
      const method = (body.method as string) || "GET";
      const payload = body.payload;

      const opts: RequestInit = {
        method,
        headers: { Authorization: `Bearer ${tokens.access_token}`, "Content-Type": "application/json" },
      };
      if (payload && method !== "GET") opts.body = JSON.stringify(payload);

      const res = await fetch(endpoint, opts);
      if (!res.ok) {
        if (res.status === 401) return err("Token expired", 401);
        return err(`Amazon API error: ${res.status}`, res.status);
      }
      const data = await res.json();
      return json(data);
    }

    return err(`Unknown action: ${action}`, 400);
  } catch (e: unknown) {
    console.error("amazon-auth error:", e);
    return err((e as Error).message || "Internal error", 500);
  }
});
