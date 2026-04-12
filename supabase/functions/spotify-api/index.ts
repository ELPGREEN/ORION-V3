import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID") || "";
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET") || "";
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

// Get stored tokens for user
async function getTokens(userId: string) {
  const sb = getSupabase();
  const { data } = await sb
    .from("user_integration_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "spotify")
    .maybeSingle();
  return data;
}

// Save tokens
async function saveTokens(userId: string, tokens: Record<string, unknown>) {
  const sb = getSupabase();
  const row = {
    user_id: userId,
    provider: "spotify",
    access_token: tokens.access_token as string,
    refresh_token: tokens.refresh_token as string || undefined,
    expires_at: tokens.expires_in
      ? new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString()
      : undefined,
    scopes: tokens.scope ? (tokens.scope as string).split(" ") : [],
    updated_at: new Date().toISOString(),
  };

  const existing = await getTokens(userId);
  if (existing) {
    // Keep old refresh_token if new one not provided
    if (!row.refresh_token) row.refresh_token = existing.refresh_token;
    await sb.from("user_integration_tokens").update(row).eq("id", existing.id);
  } else {
    await sb.from("user_integration_tokens").insert(row);
  }
}

// Refresh access token
async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  await saveTokens(userId, { ...data, refresh_token: data.refresh_token || refreshToken });
  return data.access_token;
}

// Get valid access token (auto-refresh)
async function getValidToken(userId: string): Promise<string | null> {
  const tokens = await getTokens(userId);
  if (!tokens) return null;

  // Check if expired
  if (tokens.expires_at && new Date(tokens.expires_at) < new Date()) {
    if (tokens.refresh_token) {
      return await refreshAccessToken(userId, tokens.refresh_token);
    }
    return null;
  }
  return tokens.access_token;
}

// Proxy call to Spotify API
async function spotifyApi(token: string, endpoint: string, method = "GET", body?: unknown) {
  const opts: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  };
  if (body && method !== "GET") opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, opts);
  if (res.status === 204) return {};
  return res.json();
}

// ── SCOPES ──
const SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "user-read-recently-played",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "";
    const userId = await getUserId(req);
    let body: Record<string, unknown> = {};
    
    if (req.method === "POST") {
      try { body = await req.json(); } catch { body = {}; }
    }

    // ── Public actions (no auth needed) ──
    if (action === "search") {
      // Use client credentials for public search
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
        },
        body: "grant_type=client_credentials",
      });
      const tokenData = await tokenRes.json();
      const q = body.query as string || "";
      const types = body.types as string || "track,artist";
      const limit = body.limit as number || 10;
      const result = await spotifyApi(tokenData.access_token, `/search?q=${encodeURIComponent(q)}&type=${types}&limit=${limit}`);
      return json(result);
    }

    if (action === "available_genres") {
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
        },
        body: "grant_type=client_credentials",
      });
      const tokenData = await tokenRes.json();
      const result = await spotifyApi(tokenData.access_token, "/recommendations/available-genre-seeds");
      return json(result);
    }

    // ── Auth required from here ──
    if (!userId) return err("Not authenticated", 401);

    // ── OAuth Flow ──
    if (action === "auth_url") {
      const redirectUri = body.redirect_uri as string;
      const state = crypto.randomUUID();
      const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SCOPES)}&state=${state}`;
      return json({ auth_url: authUrl, state });
    }

    if (action === "exchange_code") {
      const code = body.code as string;
      const redirectUri = body.redirect_uri as string;
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });
      if (!res.ok) {
        const e = await res.text();
        return err(`Spotify token exchange failed: ${e}`, 400);
      }
      const tokens = await res.json();
      await saveTokens(userId, tokens);
      return json({ success: true });
    }

    if (action === "status") {
      const tokens = await getTokens(userId);
      return json({ connected: !!tokens?.access_token, expires_at: tokens?.expires_at });
    }

    if (action === "disconnect") {
      const sb = getSupabase();
      await sb.from("user_integration_tokens").delete().eq("user_id", userId).eq("provider", "spotify");
      return json({ success: true });
    }

    // ── User API actions (need valid token) ──
    const token = await getValidToken(userId);
    if (!token) return err("Spotify not connected or token expired", 401);

    const actionMap: Record<string, () => Promise<unknown>> = {
      top_tracks: () => spotifyApi(token, `/me/top/tracks?time_range=${body.time_range || "medium_term"}&limit=${body.limit || 20}`),
      top_artists: () => spotifyApi(token, `/me/top/artists?time_range=${body.time_range || "medium_term"}&limit=${body.limit || 20}`),
      recently_played: () => spotifyApi(token, `/me/player/recently-played?limit=${body.limit || 20}`),
      get_user_profile: () => spotifyApi(token, "/me"),
      get_playlists: () => spotifyApi(token, `/me/playlists?limit=${body.limit || 50}`),
      playback_state: () => spotifyApi(token, "/me/player"),
      artist_top_tracks: () => spotifyApi(token, `/artists/${body.artist_id}/top-tracks?market=BR`),
      track_features: () => spotifyApi(token, `/audio-features/${body.track_id}`),
      recommendations: async () => {
        const params = new URLSearchParams();
        if (body.seed_artists) params.set("seed_artists", body.seed_artists as string);
        if (body.seed_tracks) params.set("seed_tracks", body.seed_tracks as string);
        if (body.seed_genres) params.set("seed_genres", body.seed_genres as string);
        if (body.limit) params.set("limit", String(body.limit));
        if (body.target_energy) params.set("target_energy", body.target_energy as string);
        if (body.target_valence) params.set("target_valence", body.target_valence as string);
        if (body.target_tempo) params.set("target_tempo", body.target_tempo as string);
        return spotifyApi(token, `/recommendations?${params}`);
      },
      play: () => spotifyApi(token, "/me/player/play", "PUT", body.uris || body.context_uri ? { uris: body.uris, context_uri: body.context_uri } : undefined),
      pause: () => spotifyApi(token, "/me/player/pause", "PUT"),
      next: () => spotifyApi(token, "/me/player/next", "POST"),
      previous: () => spotifyApi(token, "/me/player/previous", "POST"),
      volume: () => spotifyApi(token, `/me/player/volume?volume_percent=${body.volume}`, "PUT"),
      create_playlist: () => spotifyApi(token, `/users/${body.user_id}/playlists`, "POST", { name: body.name, description: body.description, public: body.is_public }),
      add_to_playlist: () => spotifyApi(token, `/playlists/${body.playlist_id}/tracks`, "POST", { uris: body.uris }),
      get_playlist_tracks: () => spotifyApi(token, `/playlists/${body.playlist_id}/tracks?limit=${body.limit || 50}`),
    };

    const handler = actionMap[action];
    if (!handler) return err(`Unknown action: ${action}`, 400);

    const result = await handler();
    return json(result);
  } catch (e) {
    console.error("spotify-api error:", e);
    return err(e.message || "Internal error", 500);
  }
});
