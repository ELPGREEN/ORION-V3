/**
 * ─── Music Platform Fallback Resolver ───
 * Determines the best music platform for playback based on user's connected accounts.
 * Priority: Spotify → Amazon Music → YouTube Music → YouTube (always available)
 */

import { isSpotifyConnected } from "@/lib/spotify/spotify-service";
import { openSpotify, openYouTube, openAmazonMusic, isMobileDevice } from "@/lib/utils/deep-link";

export type MusicPlatform = "spotify" | "amazon_music" | "youtube_music" | "youtube";

interface PlatformStatus {
  platform: MusicPlatform;
  connected: boolean;
  label: string;
}

// Cache connection status for 60s to avoid repeated checks
let cachedStatus: { platforms: PlatformStatus[]; ts: number } | null = null;
const CACHE_TTL = 60_000;

async function checkAmazonConnected(): Promise<boolean> {
  try {
    const token = localStorage.getItem("amazon_access_token");
    return !!token;
  } catch { return false; }
}

async function checkYTMusicConnected(): Promise<boolean> {
  try {
    const { isYTMusicConnected } = await import("@/lib/youtube-music/youtube-music-service");
    return await isYTMusicConnected();
  } catch { return false; }
}

/**
 * Get all platform statuses, with caching
 */
export async function getMusicPlatformStatuses(): Promise<PlatformStatus[]> {
  if (cachedStatus && Date.now() - cachedStatus.ts < CACHE_TTL) {
    return cachedStatus.platforms;
  }

  const [spotify, amazon, ytMusic] = await Promise.all([
    isSpotifyConnected().catch(() => false),
    checkAmazonConnected(),
    checkYTMusicConnected(),
  ]);

  const platforms: PlatformStatus[] = [
    { platform: "spotify", connected: spotify, label: "Spotify" },
    { platform: "amazon_music", connected: amazon, label: "Amazon Music" },
    { platform: "youtube_music", connected: ytMusic, label: "YouTube Music" },
    { platform: "youtube", connected: true, label: "YouTube" }, // always available
  ];

  cachedStatus = { platforms, ts: Date.now() };
  return platforms;
}

/**
 * Resolve the best available music platform.
 * If preferredPlatform is specified and connected, use it.
 * Otherwise, YouTube is the default priority for generic requests.
 */
export async function resolveMusicPlatform(preferredPlatform?: MusicPlatform): Promise<PlatformStatus> {
  const statuses = await getMusicPlatformStatuses();

  // If user explicitly asked for a platform, try it first
  if (preferredPlatform) {
    const preferred = statuses.find(s => s.platform === preferredPlatform);
    if (preferred?.connected) return preferred;
  }

  // DEFAULT: YouTube has absolute priority for generic requests (no preferred platform)
  return statuses.find(s => s.platform === "youtube") || statuses[statuses.length - 1];
}

/**
 * Execute music playback on the best available platform.
 * Returns a description of what happened.
 */
export async function playMusicWithFallback(
  query: string,
  preferredPlatform?: MusicPlatform
): Promise<{ platform: MusicPlatform; description: string; fallback: boolean }> {
  const q = query.toLowerCase();

  // YouTube priority for video-related keywords
  const isVideo = /\b(v[ií]deo|videoclipe|clipe|assistir|ver|abrir\s+v[ií]deo|buscar\s+v[ií]deo)\b/i.test(q);

  let targetPlatform = preferredPlatform;
  if (isVideo) {
    console.log(`[music-fallback] Video intent detected, forcing YouTube priority`);
    targetPlatform = "youtube";
  }

  const resolved = await resolveMusicPlatform(targetPlatform);
  const fallback = !!targetPlatform && resolved.platform !== targetPlatform;
  const mobile = isMobileDevice();

  if (fallback) {
    console.log(`[music-fallback] ${targetPlatform} indisponível, usando ${resolved.platform}`);
  }

  const fallbackNote = fallback
    ? ` (${targetPlatform === "spotify" ? "Spotify" : targetPlatform === "amazon_music" ? "Amazon Music" : targetPlatform} não solicitado ou indisponível)`
    : "";

  switch (resolved.platform) {
    case "spotify": {
      if (mobile) {
        openSpotify(query);
      } else {
        window.dispatchEvent(new CustomEvent("orion-music-command", {
          detail: { action: "search_and_play", query, fullCommand: query }
        }));
      }
      return {
        platform: "spotify",
        description: `🎵 Tocando "${query}" no Spotify${fallbackNote}`,
        fallback,
      };
    }

    case "amazon_music": {
      openAmazonMusic(query);
      return {
        platform: "amazon_music",
        description: `🎵 Abrindo "${query}" no Amazon Music${fallbackNote}`,
        fallback,
      };
    }

    case "youtube_music": {
      const url = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
      if (mobile) {
        window.open(url, "_blank");
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return {
        platform: "youtube_music",
        description: `🎵 Buscando "${query}" no YouTube Music${fallbackNote}`,
        fallback,
      };
    }

    case "youtube":
    default: {
      if (mobile) {
        openYouTube(`${query} music`);
      } else {
        // Use orion-music-command for YouTube (OrionPlaylistBar handles it)
        window.dispatchEvent(new CustomEvent("orion-music-command", {
          detail: { action: "search_and_play", query: `${query} music` }
        }));
      }
      return {
        platform: "youtube",
        description: `🎵 Tocando "${query}" no YouTube${fallbackNote}`,
        fallback,
      };
    }
  }
}

/** Invalidate cache (call when user connects/disconnects a platform) */
export function invalidateMusicCache() {
  cachedStatus = null;
}
