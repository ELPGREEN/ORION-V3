import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Create Supabase client with user's JWT
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const userId = authError ? undefined : authData.user?.id;

    if (action === "config") {
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      return json({ configured: !!clientId, client_id: clientId || null });
    }

    if (action === "exchange_code") {
      if (!userId) return json({ error: "Authentication required" }, 401);
      return await handleExchangeCode(body, supabase, userId);
    }

    if (action === "status") {
      if (!userId) return json({ connected: false });
      return await handleStatus(supabase, userId);
    }

    if (action === "disconnect") {
      if (!userId) return json({ error: "Authentication required" }, 401);
      await supabase.from("user_integration_tokens").delete().eq("user_id", userId).eq("provider", "youtube_music");
      return json({ success: true });
    }

    // All other actions need a valid token from DB
    if (!userId) return json({ error: "Authentication required" }, 401);
    const accessToken = await getEffectiveToken(supabase, userId);
    if (!accessToken) return json({ error: "YouTube Music not connected. Please connect your account." }, 401);

    switch (action) {
      case "search":
        return await handleSearch(accessToken, body.query);
      case "playlists":
        return await handlePlaylists(accessToken);
      case "playlist_tracks":
        return await handlePlaylistTracks(accessToken, body.playlist_id);
      case "trending":
        return await handleTrending();
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("[youtube-music-api]", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});

// ── Token Management ──

async function getEffectiveToken(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("user_integration_tokens")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "youtube_music")
    .maybeSingle();

  if (!data) return null;

  // Check if token is expired
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
    if (data.refresh_token) {
      const refreshed = await tryRefreshToken(data.refresh_token);
      if (refreshed) {
        const expiresAt = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
        await supabase.from("user_integration_tokens").update({
          access_token: refreshed.access_token,
          token_expires_at: expiresAt,
        }).eq("user_id", userId).eq("provider", "youtube_music");
        return refreshed.access_token;
      }
    }
    return null;
  }

  return data.access_token;
}

async function handleStatus(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_integration_tokens")
    .select("connected_email, connected_name, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "youtube_music")
    .maybeSingle();

  if (!data) return json({ connected: false });

  const expired = data.token_expires_at && new Date(data.token_expires_at) < new Date();
  return json({
    connected: !expired,
    email: data.connected_email,
    name: data.connected_name,
  });
}

async function handleExchangeCode(body: any, supabase: any, userId: string) {
  const { code, redirect_uri } = body;
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return json({ error: "Google OAuth not configured" }, 500);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    return json({ error: tokenData.error_description || tokenData.error }, 400);
  }

  // Fetch user info
  let user: any = null;
  try {
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    user = await userRes.json();
  } catch (_) {}

  const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

  // Upsert token in DB
  const { error } = await supabase.from("user_integration_tokens").upsert({
    user_id: userId,
    provider: "youtube_music",
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || null,
    token_expires_at: expiresAt,
    connected_email: user?.email || null,
    connected_name: user?.name || null,
    scopes: "youtube.readonly youtube",
  }, { onConflict: "user_id,provider" });

  if (error) {
    console.error("[youtube-music-api] DB upsert error:", error);
    return json({ error: "Failed to save tokens" }, 500);
  }

  return json({
    success: true,
    user: user ? { name: user.name, email: user.email, picture: user.picture } : null,
  });
}

async function tryRefreshToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (data.access_token) return data;
    return null;
  } catch {
    return null;
  }
}

// ── API Handlers ──

async function handleSearch(accessToken: string, query: string) {
  if (!query) return json({ tracks: [] });
  const params = new URLSearchParams({
    part: "snippet", type: "video", videoCategoryId: "10",
    q: query, maxResults: "20", key: Deno.env.get("YOUTUBE_API_KEY") || "",
  });
  const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  const tracks = (data.items || []).map((item: any) => ({
    id: item.id?.videoId || item.id, title: item.snippet?.title || "",
    artist: item.snippet?.channelTitle || "", thumbnail: item.snippet?.thumbnails?.default?.url || "",
    duration: "", videoId: item.id?.videoId || "",
  }));
  return json({ tracks });
}

async function handlePlaylists(accessToken: string) {
  const params = new URLSearchParams({ part: "snippet,contentDetails", mine: "true", maxResults: "25" });
  const res = await fetch(`${YOUTUBE_API_BASE}/playlists?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  const playlists = (data.items || []).map((item: any) => ({
    id: item.id, title: item.snippet?.title || "",
    thumbnail: item.snippet?.thumbnails?.default?.url || "", itemCount: item.contentDetails?.itemCount || 0,
  }));
  return json({ playlists });
}

async function handlePlaylistTracks(accessToken: string, playlistId: string) {
  if (!playlistId) return json({ tracks: [] });
  const params = new URLSearchParams({ part: "snippet", playlistId, maxResults: "50" });
  const res = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  const tracks = (data.items || []).map((item: any) => ({
    id: item.snippet?.resourceId?.videoId || item.id, title: item.snippet?.title || "",
    artist: item.snippet?.channelTitle || "", thumbnail: item.snippet?.thumbnails?.default?.url || "",
    duration: "", videoId: item.snippet?.resourceId?.videoId || "",
  }));
  return json({ tracks });
}

async function handleTrending() {
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) return json({ tracks: [], error: "YouTube API key not configured" });
  const params = new URLSearchParams({
    part: "snippet", chart: "mostPopular", videoCategoryId: "10",
    regionCode: "BR", maxResults: "20", key: apiKey,
  });
  const res = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`);
  const data = await res.json();
  const tracks = (data.items || []).map((item: any) => ({
    id: item.id, title: item.snippet?.title || "",
    artist: item.snippet?.channelTitle || "", thumbnail: item.snippet?.thumbnails?.default?.url || "",
    duration: "", videoId: item.id,
  }));
  return json({ tracks });
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
