/**
 * Orion YouTube Music Integration Service
 * Per-user OAuth2 — tokens stored server-side in user_integration_tokens table.
 */
import { supabase } from "@/integrations/supabase/client";

export interface YTMusicTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  videoId: string;
}

export interface YTMusicPlaylist {
  id: string;
  title: string;
  thumbnail: string;
  itemCount: number;
}

export interface YTMusicUser {
  name: string;
  email?: string;
  picture?: string;
}

// ── Connection Status ──

export async function isYTMusicConnected(): Promise<boolean> {
  try {
    const { data } = await supabase.functions.invoke("youtube-music-api", {
      body: { action: "status" },
    });
    return data?.connected === true;
  } catch {
    return false;
  }
}

export async function getYTMusicUser(): Promise<YTMusicUser | null> {
  try {
    const { data } = await supabase.functions.invoke("youtube-music-api", {
      body: { action: "status" },
    });
    if (data?.connected && data?.name) {
      return { name: data.name, email: data.email };
    }
    return null;
  } catch {
    return null;
  }
}

// ── OAuth Flow ──

export async function startYTMusicLogin() {
  const { data, error } = await supabase.functions.invoke("youtube-music-api", {
    body: { action: "config" },
  });

  if (error) throw new Error(error.message || "Falha ao carregar configuração do YouTube Music");

  const clientId = data?.client_id;
  if (!clientId) {
    throw new Error("Google Client ID não configurado para o YouTube Music");
  }

  const redirectUri = window.location.hostname === "localhost"
    ? `${window.location.origin}/callback/youtube-music`
    : "https://www.iasofthub.com/callback/youtube-music";
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube",
    "openid", "profile", "email",
  ].join(" ");

  const state = crypto.randomUUID();
  sessionStorage.setItem("ytmusic_oauth_state", state);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  window.location.href = url.toString();
}

export async function handleYTMusicCallback(code: string, state: string): Promise<boolean> {
  const savedState = sessionStorage.getItem("ytmusic_oauth_state");
  if (state !== savedState) {
    console.error("[YTMusic] State mismatch");
    return false;
  }
  sessionStorage.removeItem("ytmusic_oauth_state");

  try {
    const { data, error } = await supabase.functions.invoke("youtube-music-api", {
      body: {
        action: "exchange_code",
        code,
        redirect_uri: window.location.hostname === "localhost"
          ? `${window.location.origin}/callback/youtube-music`
          : "https://www.iasofthub.com/callback/youtube-music",
      },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data?.success === true;
  } catch (e) {
    console.error("[YTMusic] Callback error:", e);
    return false;
  }
}

export async function disconnectYTMusic() {
  await supabase.functions.invoke("youtube-music-api", {
    body: { action: "disconnect" },
  });
}

// ── API Calls ──

async function callYTMusic(action: string, params: Record<string, any> = {}): Promise<any> {
  const { data, error } = await supabase.functions.invoke("youtube-music-api", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "YouTube Music API error");
  if (data?.error) throw new Error(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
  return data;
}

export async function searchYTMusic(query: string): Promise<YTMusicTrack[]> {
  const data = await callYTMusic("search", { query });
  return data.tracks || [];
}

export async function getYTMusicPlaylists(): Promise<YTMusicPlaylist[]> {
  const data = await callYTMusic("playlists");
  return data.playlists || [];
}

export async function getPlaylistTracks(playlistId: string): Promise<YTMusicTrack[]> {
  const data = await callYTMusic("playlist_tracks", { playlist_id: playlistId });
  return data.tracks || [];
}

export async function getTrending(): Promise<YTMusicTrack[]> {
  const data = await callYTMusic("trending");
  return data.tracks || [];
}

/** Public search — uses only YOUTUBE_API_KEY, no OAuth required */
export async function searchYTMusicPublic(query: string): Promise<YTMusicTrack[]> {
  const data = await callYTMusic("search_public", { query });
  return data.tracks || [];
}
