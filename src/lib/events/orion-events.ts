/**
 * Shared event names + payload types for Orion <-> Music Player communication.
 *
 * Single source of truth so the Orion brain, the floating player, and the
 * playlist bar never drift out of sync on event names or detail shape.
 *
 * Usage:
 *   import { OrionEvents, dispatchOrionEvent } from "@/lib/events/orion-events";
 *
 *   dispatchOrionEvent(OrionEvents.MusicCommand, {
 *     action: "search_and_play",
 *     query: "imagine dragons",
 *   });
 *
 *   window.addEventListener(OrionEvents.MusicCommand, (e) => {
 *     const detail = e.detail; // typed as OrionMusicCommandDetail
 *   });
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

// ── Event detail map (drives type inference) ─────────────────────
export interface OrionEventDetailMap {
  [OrionEvents.MusicCommand]: OrionMusicCommandDetail;
  [OrionEvents.MusicPlayerShow]: OrionMusicPlayerShowDetail;
  [OrionEvents.Speaking]: OrionSpeakingDetail;
  [OrionEvents.VolumeCommand]: OrionVolumeCommandDetail;
}

// Augment global WindowEventMap so addEventListener gets typed `e.detail`
declare global {
  interface WindowEventMap {
    [OrionEvents.MusicCommand]: CustomEvent<OrionMusicCommandDetail>;
    [OrionEvents.MusicPlayerShow]: CustomEvent<OrionMusicPlayerShowDetail>;
    [OrionEvents.Speaking]: CustomEvent<OrionSpeakingDetail>;
    [OrionEvents.VolumeCommand]: CustomEvent<OrionVolumeCommandDetail>;
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
