/**
 * Shared event names + payload types for Orion <-> YouTube Player communication.
 *
 * YouTube is the only supported platform. Spotify/Amazon types were removed.
 */

// ── Event name constants ─────────────────────────────────────────
export const OrionEvents = {
  /** Orion → players: play / pause / stop / next / prev a query */
  MusicCommand: "orion-music-command",
  /** Anyone → FloatingMusicPlayer: force the player UI to appear */
  MusicPlayerShow: "orion-music-player-show",
  /** TTS engine → listeners: Orion is about to / is speaking this text */
  Speaking: "orion-speaking",
  /** Orion → players: volume up/down/set/mute/unmute */
  VolumeCommand: "orion-volume-command",
  /** Resolver → widget: a music platform was resolved (always YouTube now) */
  MusicResolved: "orion-music-resolved",
} as const;

export type OrionEventName = (typeof OrionEvents)[keyof typeof OrionEvents];

// ── Payload shapes ───────────────────────────────────────────────
export type OrionMusicAction =
  | "search_and_play"
  | "play"
  | "pause"
  | "resume"
  | "stop"
  | "next"
  | "prev"
  | "previous";

export interface OrionMusicCommandDetail {
  action: OrionMusicAction;
  /** Search query for "search_and_play"; empty/ignored for control actions */
  query?: string;
  /** Original raw user command, useful for logging / fallbacks */
  fullCommand?: string;
}

export interface OrionMusicPlayerShowDetail {
  /** Optional query to load; falls back to last persisted query */
  query?: string;
}

export interface OrionSpeakingDetail {
  /** Plain text Orion is about to speak (already cleaned) */
  text: string;
}

export type OrionVolumeAction = "up" | "down" | "set" | "mute" | "unmute";

export interface OrionVolumeCommandDetail {
  action: OrionVolumeAction;
  /** Required for "set" (0–100). Ignored otherwise. */
  value?: number;
}

/** YouTube is the only supported platform. */
export type ResolvedMusicPlatform = "youtube";

export interface OrionMusicResolvedDetail {
  query: string;
  /** Always "youtube" now */
  requested?: ResolvedMusicPlatform;
  resolved: ResolvedMusicPlatform;
  /** Always false — only one platform exists */
  fallback: boolean;
  description?: string;
  ts: number;
}

// ── Event detail map (drives type inference) ─────────────────────
export interface OrionEventDetailMap {
  [OrionEvents.MusicCommand]: OrionMusicCommandDetail;
  [OrionEvents.MusicPlayerShow]: OrionMusicPlayerShowDetail;
  [OrionEvents.Speaking]: OrionSpeakingDetail;
  [OrionEvents.VolumeCommand]: OrionVolumeCommandDetail;
  [OrionEvents.MusicResolved]: OrionMusicResolvedDetail;
}

declare global {
  interface WindowEventMap {
    [OrionEvents.MusicCommand]: CustomEvent<OrionMusicCommandDetail>;
    [OrionEvents.MusicPlayerShow]: CustomEvent<OrionMusicPlayerShowDetail>;
    [OrionEvents.Speaking]: CustomEvent<OrionSpeakingDetail>;
    [OrionEvents.VolumeCommand]: CustomEvent<OrionVolumeCommandDetail>;
    [OrionEvents.MusicResolved]: CustomEvent<OrionMusicResolvedDetail>;
  }
}

// ── Helpers ──────────────────────────────────────────────────────
export function dispatchOrionEvent<K extends keyof OrionEventDetailMap>(
  name: K,
  detail: OrionEventDetailMap[K],
): void {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    /* noop — SSR / no window */
  }
}

export function addOrionEventListener<K extends keyof OrionEventDetailMap>(
  name: K,
  handler: (detail: OrionEventDetailMap[K], event: CustomEvent<OrionEventDetailMap[K]>) => void,
): () => void {
  const wrapped = (e: Event) => {
    const ce = e as CustomEvent<OrionEventDetailMap[K]>;
    handler(ce.detail, ce);
  };
  window.addEventListener(name, wrapped as EventListener);
  return () => window.removeEventListener(name, wrapped as EventListener);
}
