/**
 * Turn Detection — STUB (removed for performance)
 * Simplified: always returns "finished" so Orion responds immediately.
 */

export type TurnState = "finished" | "unfinished" | "wait";

export function detectTurnState(_buffer: string[], _lang?: string): TurnState {
  return "finished";
}

export function getOptimalSilenceDuration(_state: TurnState): number {
  return 800;
}
