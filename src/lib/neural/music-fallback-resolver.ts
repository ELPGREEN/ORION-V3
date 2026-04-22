/**
 * ─── Music Platform Fallback Resolver ───
 * Determines the best music platform for playback based on user's connected accounts.
 * Priority: Spotify → Amazon Music → YouTube Music → YouTube (always available)
 */

import { isSpotifyConnected } from "@/lib/spotify/spotify-service";
import { openSpotify, openYouTube, openAmazonMusic, isMobileDevice } from "@/lib/utils/deep-link";
import { OrionEvents, dispatchOrionEvent } from "@/lib/events/orion-events";

// Lightweight toast notifier — lazy import to keep this module side-effect free for tests
async function notifyFallback(message: string) {
  try {
    const { toast } = await import("sonner");
    toast.info(message);
  } catch { /* noop in non-browser env */ }
}

const PLATFORM_LABEL: Record<MusicPlatform, string> = {
  spotify: "Spotify",
  amazon_music: "Amazon Music",
  youtube_music: "YouTube Music",
  youtube: "YouTube",
};

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
 * Default behavior: YouTube is ALWAYS the default unless the user
 * explicitly requested Spotify or Amazon Music. This avoids surprising
 * the user by opening Spotify just because it's connected.
 */
export async function resolveMusicPlatform(preferredPlatform?: MusicPlatform): Promise<PlatformStatus> {
  const statuses = await getMusicPlatformStatuses();

  // Explicit request: honor only if connected; otherwise still fall back to YouTube.
  if (preferredPlatform && preferredPlatform !== "youtube") {
    const preferred = statuses.find(s => s.platform === preferredPlatform);
    if (preferred?.connected) return preferred;
  }

  // Default: YouTube (always available, no surprise opens of other apps).
  const youtube = statuses.find(s => s.platform === "youtube");
  return youtube || statuses[statuses.length - 1];
}

/**
 * Execute music playback on the best available platform.
 * Returns a description of what happened.
 */
export async function playMusicWithFallback(
  query: string,
  preferredPlatform?: MusicPlatform
): Promise<{ platform: MusicPlatform; description: string; fallback: boolean }> {
  const resolved = await resolveMusicPlatform(preferredPlatform);
  const fallback = !!preferredPlatform && resolved.platform !== preferredPlatform;
  const mobile = isMobileDevice();

  if (fallback) {
    console.log(`[music-fallback] ${preferredPlatform} não conectado, usando ${resolved.platform}`);
  }

  const fallbackNote = fallback
    ? ` (${preferredPlatform === "spotify" ? "Spotify" : preferredPlatform === "amazon_music" ? "Amazon Music" : preferredPlatform} não conectado)`
    : "";

  switch (resolved.platform) {
    case "spotify": {
      if (mobile) {
        openSpotify(query);
      } else {
        dispatchOrionEvent(OrionEvents.MusicCommand, {
          action: "search_and_play",
          query,
          fullCommand: query,
        });
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
        dispatchOrionEvent(OrionEvents.MusicCommand, {
          action: "search_and_play",
          query: `${query} music`,
        });
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
