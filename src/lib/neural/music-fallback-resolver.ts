/**
 * ─── YouTube Music Resolver ───
 * YouTube IS the only supported platform. Spotify/Amazon were removed.
 * This module is kept ONLY for backwards compatibility with existing call sites
 * (orion-browser-actions, etc.) and always resolves to YouTube.
 */

import { isMobileDevice, openYouTube } from "@/lib/utils/deep-link";
import { OrionEvents, dispatchOrionEvent } from "@/lib/events/orion-events";

export type MusicPlatform = "youtube";

interface PlatformStatus {
  platform: MusicPlatform;
  connected: boolean;
  label: string;
}

const YOUTUBE_STATUS: PlatformStatus = {
  platform: "youtube",
  connected: true,
  label: "YouTube",
};

/** Always returns YouTube — the only supported platform. */
export async function getMusicPlatformStatuses(): Promise<PlatformStatus[]> {
  return [YOUTUBE_STATUS];
}

/** Always YouTube. The optional preferred platform is ignored. */
export async function resolveMusicPlatform(
  _preferredPlatform?: MusicPlatform,
): Promise<PlatformStatus> {
  return YOUTUBE_STATUS;
}

/**
 * Play music on YouTube — the only supported platform.
 * On mobile opens the YouTube app via deep link; on desktop dispatches a
 * `MusicCommand` event so OrionPlaylistBar (YouTube IFrame controller) handles it.
 */
export async function playMusicWithFallback(
  query: string,
  _preferredPlatform?: MusicPlatform,
): Promise<{ platform: MusicPlatform; description: string; fallback: false }> {
  const description = `🎵 Tocando "${query}" no YouTube`;
  const detail = {
    query,
    requested: "youtube" as const,
    resolved: "youtube" as const,
    fallback: false,
    description,
    ts: Date.now(),
  };
  try {
    if (typeof window !== "undefined") localStorage.setItem("orion_last_music_resolved", JSON.stringify(detail));
  } catch {
    /* quota / private mode */
  }
  dispatchOrionEvent(OrionEvents.MusicResolved, detail);

  if (isMobileDevice()) {
    openYouTube(`${query} music`);
  } else {
    dispatchOrionEvent(OrionEvents.MusicCommand, {
      action: "search_and_play",
      query: `${query} music`,
    });
  }

  console.log("[music-resolver] YouTube only", { query });
  return { platform: "youtube", description, fallback: false };
}

/** No-op — kept for backwards compatibility with old callers. */
export function invalidateMusicCache(): void {
  /* nothing to invalidate — only one platform exists */
}
