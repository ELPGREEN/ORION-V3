// Spotify API Edge Function v2
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getClientToken(clientId: string, clientSecret: string) {
  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: "grant_type=client_credentials",
  });
  return res.json();
}

async function spotifyGet(path: string, token: string) {
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return { success: true };
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    if (!res.ok) throw new Error(`Spotify API ${res.status}: ${text.slice(0, 200)}`);
    return { success: true };
  }
  if (!res.ok) {
    throw new Error(`Spotify API ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function spotifyPut(path: string, token: string, body?: unknown) {
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return { success: true };
  try { return await res.json(); } catch { return { success: res.ok }; }
}

async function spotifyPost(path: string, token: string, body?: unknown) {
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return { success: true };
  try { return await res.json(); } catch { return { success: res.ok }; }
}

async function refreshSpotifyToken(refreshToken: string, clientId: string, clientSecret: string) {
  try {
    const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    });
    const data = await res.json();
    return data.access_token ? data : null;
  } catch { return null; }
}

async function resolveUserToken(
  supabase: ReturnType<typeof createClient>,
  userId: string | undefined,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  if (userId) {
    const { data } = await supabase
      .from("user_integration_tokens")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", userId)
      .eq("provider", "spotify")
      .maybeSingle();

    if (data) {
      if (
        data.token_expires_at &&
        new Date(data.token_expires_at) < new Date() &&
        data.refresh_token
      ) {
        const refreshed = await refreshSpotifyToken(data.refresh_token, clientId, clientSecret);
        if (refreshed?.access_token) {
          const expiresAt = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
          await supabase.from("user_integration_tokens").update({
            access_token: refreshed.access_token,
            token_expires_at: expiresAt,
            ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
          }).eq("user_id", userId).eq("provider", "spotify");
          return refreshed.access_token;
        }
      }
      if (data.access_token) return data.access_token;
    }
  }

  const cc = await getClientToken(clientId, clientSecret);
  if (cc.access_token) return cc.access_token;
  throw new Error("No valid Spotify token available");
}

// deno-lint-ignore no-explicit-any
async function handleApiAction(action: string, body: any, token: string) {
  switch (action) {
    case "top_tracks":
      return spotifyGet(`/me/top/tracks?time_range=${body.time_range || "medium_term"}&limit=${body.limit || 20}`, token);
    case "top_artists":
      return spotifyGet(`/me/top/artists?time_range=${body.time_range || "medium_term"}&limit=${body.limit || 20}`, token);
    case "recently_played":
      return spotifyGet(`/me/player/recently-played?limit=${body.limit || 20}`, token);
    case "search":
      return spotifyGet(`/search?q=${encodeURIComponent(body.query || "")}&type=${body.types || "track,artist"}&limit=${body.limit || 10}`, token);
    case "playback_state":
      return spotifyGet("/me/player", token);
    case "play": {
      // deno-lint-ignore no-explicit-any
      const playBody: any = {};
      if (body.uris) playBody.uris = body.uris;
      if (body.context_uri) playBody.context_uri = body.context_uri;
      const device = body.device_id ? `?device_id=${body.device_id}` : "";
      return spotifyPut(`/me/player/play${device}`, token, playBody);
    }
    case "pause":
      return spotifyPut("/me/player/pause", token);
    case "next":
      return spotifyPost("/me/player/next", token);
    case "previous":
      return spotifyPost("/me/player/previous", token);
    case "volume":
      return spotifyPut(`/me/player/volume?volume_percent=${body.volume || 50}`, token);
    case "get_user_profile":
      return spotifyGet("/me", token);
    case "get_playlists":
      return spotifyGet(`/me/playlists?limit=${body.limit || 50}`, token);
    case "recommendations": {
      const genres = (body.seed_genres || "pop").split(",").map((g: string) => g.trim());
      const energy = parseFloat(body.target_energy || "0.5");
      const valence = parseFloat(body.target_valence || "0.5");
      let moodKeyword = "vibes";
      if (energy < 0.3 && valence < 0.3) moodKeyword = "sad melancholy";
      else if (energy < 0.3) moodKeyword = "calm ambient chill";
      else if (energy > 0.7 && valence > 0.7) moodKeyword = "happy upbeat party";
      else if (energy > 0.7) moodKeyword = "energetic workout intense";
      else if (valence > 0.6) moodKeyword = "feel good positive";
      const searchQ = `genre:${genres[0]} ${moodKeyword}`;
      const searchData = await spotifyGet(`/search?q=${encodeURIComponent(searchQ)}&type=track&limit=${body.limit || 20}`, token);
      // deno-lint-ignore no-explicit-any
      return { tracks: (searchData as any)?.tracks?.items || [] };
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return jsonRes({ error: "Spotify credentials not configured" }, 500);
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "client_token";
    // deno-lint-ignore no-explicit-any
    let body: any = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { body = {}; }
    }

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    switch (action) {
      case "client_token":
        return jsonRes(await getClientToken(CLIENT_ID, CLIENT_SECRET));

      case "auth_url": {
        const redirectUri = body.redirect_uri || url.origin;
        const scopes = [
          "user-read-playback-state", "user-modify-playback-state",
          "user-read-currently-playing", "user-top-read",
          "user-read-recently-played", "streaming",
          "playlist-read-private", "playlist-read-collaborative",
          "playlist-modify-public", "playlist-modify-private"
        ].join(" ");
        const state = crypto.randomUUID();
        const authUrl = `${SPOTIFY_ACCOUNTS}/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
        return jsonRes({ auth_url: authUrl, state });
      }

      case "exchange_code": {
        if (!userId) return jsonRes({ error: "Authentication required" }, 401);
        const { code, redirect_uri } = body;
        if (!code || !redirect_uri) throw new Error("Missing code or redirect_uri");

        const tokenRes = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
          },
          body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

        let profile: { display_name?: string; email?: string; images?: { url: string }[] } | null = null;
        try {
          const profileRes = await fetch(`${SPOTIFY_API}/me`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          profile = await profileRes.json();
        } catch { /* ignore */ }

        const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
        await supabase.from("user_integration_tokens").upsert({
          user_id: userId,
          provider: "spotify",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: expiresAt,
          connected_email: profile?.email || null,
          connected_name: profile?.display_name || null,
          scopes: tokenData.scope || null,
        }, { onConflict: "user_id,provider" });

        return jsonRes({
          success: true,
          user: profile ? { name: profile.display_name, email: profile.email, image: profile.images?.[0]?.url } : null,
        });
      }

      case "status": {
        if (!userId) return jsonRes({ connected: false });
        const { data: tkn } = await supabase
          .from("user_integration_tokens")
          .select("connected_email, connected_name, token_expires_at")
          .eq("user_id", userId).eq("provider", "spotify").maybeSingle();
        if (!tkn) return jsonRes({ connected: false });
        const expired = tkn.token_expires_at && new Date(tkn.token_expires_at) < new Date();
        return jsonRes({ connected: !expired, email: tkn.connected_email, name: tkn.connected_name });
      }

      case "disconnect": {
        if (!userId) return jsonRes({ error: "Authentication required" }, 401);
        await supabase.from("user_integration_tokens").delete().eq("user_id", userId).eq("provider", "spotify");
        return jsonRes({ success: true });
      }

      case "search": {
        const cc = await getClientToken(CLIENT_ID, CLIENT_SECRET);
        if (!cc.access_token) throw new Error("Failed to get Spotify client token");
        return jsonRes(await handleApiAction("search", body, cc.access_token));
      }

      default: {
        const accessToken = await resolveUserToken(supabase, userId, CLIENT_ID, CLIENT_SECRET);
        return jsonRes(await handleApiAction(action, body, accessToken));
      }
    }
  } catch (error) {
    console.error("Spotify API error:", error);
    return jsonRes({ error: (error as Error).message }, 400);
  }
});
