/**
 * Orion Spotify Integration Service
 * Per-user OAuth2 — tokens stored server-side in user_integration_tokens table.
 */
import { supabase } from "@/integrations/supabase/client";

export class SpotifyApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = "SpotifyApiError";
  }
  get isPremiumRequired() { return this.statusCode === 403 && this.message.includes("premium"); }
  get isNotRegistered() { return this.statusCode === 403 && this.message.includes("not be registered"); }
  get is403() { return this.statusCode === 403; }
}

export function getSpotifyFriendlyError(e: any): string {
  if (e instanceof SpotifyApiError) {
    if (e.isPremiumRequired) return "⚠️ O Spotify Premium é necessário para o dono do app. Aguarde se acabou de ativar.";
    if (e.isNotRegistered) return "⚠️ Usuário não registrado no app Spotify. Peça ao administrador para adicioná-lo.";
    if (e.is403) return "⚠️ Acesso negado pelo Spotify. Verifique as configurações do app.";
  }
  const msg = e?.message || String(e);
  if (msg.includes("403")) return "⚠️ Spotify indisponível no momento. O app está em modo de desenvolvimento.";
  return "Erro ao conectar com Spotify. Tente novamente.";
}

const FUNCTION_URL = `https://dlwafedtlvbvuoaopvsl.supabase.co/functions/v1/spotify-api`;
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2FmZWR0bHZidnVvYW9wdnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDI0MjEsImV4cCI6MjA4NDQ3ODQyMX0.ohz98f-MO3VNYoR6dth3zYhYqmviFs60ytJAQCwfJNk";

async function callSpotify(action: string, body: Record<string, any> = {}): Promise<any> {
  const session = (await supabase.auth.getSession()).data.session;
  const authToken = session?.access_token || "";

  const res = await fetch(`${FUNCTION_URL}?action=${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  const result = await res.json();

  if (result.error) {
    const msg = typeof result.error === "string" ? result.error : JSON.stringify(result.error);
    const statusMatch = msg.match(/(\d{3})/);
    const statusCode = statusMatch ? parseInt(statusMatch[1]) : 500;
    throw new SpotifyApiError(statusCode, msg);
  }
  return result;
}

// ── Connection Status ──

export async function isSpotifyConnected(): Promise<boolean> {
  try {
    const data = await callSpotify("status");
    return data?.connected === true;
  } catch {
    return false;
  }
}

export async function disconnectSpotify() {
  await callSpotify("disconnect");
}

// ── OAuth Flow ──

export async function startSpotifyLogin(redirectUri?: string) {
  const uri = redirectUri || `${window.location.origin}/spotify-callback`;
  const data = await callSpotify("auth_url", { redirect_uri: uri });
  if (data.state) sessionStorage.setItem("spotify_oauth_state", data.state);
  window.location.href = data.auth_url;
}

export async function handleSpotifyCallback(code: string, redirectUri?: string) {
  const uri = redirectUri || `${window.location.origin}/spotify-callback`;
  const data = await callSpotify("exchange_code", { code, redirect_uri: uri });
  if (data.success) return true;
  throw new Error(data.error || "Failed to exchange code");
}

// ── Public Data (no login needed) ──

export async function searchSpotify(query: string, types = "track,artist", limit = 10) {
  return callSpotify("search", { query, types, limit });
}

export async function getAvailableGenres() {
  return callSpotify("available_genres");
}

export async function getArtistTopTracks(artistId: string) {
  return callSpotify("artist_top_tracks", { artist_id: artistId });
}

export async function getTrackFeatures(trackId: string) {
  return callSpotify("track_features", { track_id: trackId });
}

// ── User Data (requires login) ──

export async function getTopTracks(timeRange = "medium_term", limit = 20) {
  return callSpotify("top_tracks", { time_range: timeRange, limit });
}

export async function getTopArtists(timeRange = "medium_term", limit = 20) {
  return callSpotify("top_artists", { time_range: timeRange, limit });
}

export async function getRecentlyPlayed(limit = 20) {
  return callSpotify("recently_played", { limit });
}

export async function getRecommendations(params: {
  seed_artists?: string; seed_tracks?: string; seed_genres?: string;
  limit?: number; target_energy?: string; target_valence?: string; target_tempo?: string;
}) {
  return callSpotify("recommendations", params);
}

// ── Playback Control ──

export async function getPlaybackState() {
  return callSpotify("playback_state");
}

export async function play(options?: { uris?: string[]; context_uri?: string; device_id?: string }) {
  return callSpotify("play", options || {});
}

export async function pause() { return callSpotify("pause"); }
export async function nextTrack() { return callSpotify("next"); }
export async function previousTrack() { return callSpotify("previous"); }
export async function setVolume(volume: number) { return callSpotify("volume", { volume }); }

// ── Playlist Management ──

export async function getUserProfile() { return callSpotify("get_user_profile"); }

export async function getPlaylists(limit = 50) {
  return callSpotify("get_playlists", { limit });
}

export async function createPlaylist(userId: string, name: string, description = "", isPublic = false) {
  return callSpotify("create_playlist", { user_id: userId, name, description, is_public: isPublic });
}

export async function addToPlaylist(playlistId: string, uris: string[]) {
  return callSpotify("add_to_playlist", { playlist_id: playlistId, uris });
}

export async function getPlaylistTracks(playlistId: string, limit = 50) {
  return callSpotify("get_playlist_tracks", { playlist_id: playlistId, limit });
}

// ── Mood Recommendations ──

export type OrionMood = "focus" | "relax" | "energy" | "melancholy" | "creative" | "ambient";

const MOOD_PARAMS: Record<OrionMood, { seed_genres: string; target_energy: string; target_valence: string; target_tempo?: string }> = {
  focus: { seed_genres: "ambient,classical,electronic", target_energy: "0.3", target_valence: "0.4", target_tempo: "100" },
  relax: { seed_genres: "chill,ambient,jazz", target_energy: "0.2", target_valence: "0.5" },
  energy: { seed_genres: "electronic,dance,pop", target_energy: "0.9", target_valence: "0.8", target_tempo: "140" },
  melancholy: { seed_genres: "indie,singer-songwriter,piano", target_energy: "0.2", target_valence: "0.15" },
  creative: { seed_genres: "alternative,art-rock,experimental", target_energy: "0.5", target_valence: "0.6" },
  ambient: { seed_genres: "ambient,new-age,soundtracks", target_energy: "0.1", target_valence: "0.3", target_tempo: "70" },
};

export async function getMoodRecommendations(mood: OrionMood, limit = 15) {
  const params = MOOD_PARAMS[mood];
  return getRecommendations({ ...params, limit });
}
