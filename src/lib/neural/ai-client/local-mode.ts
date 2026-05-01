/**
 * Local-first mode — extracted from orion-ai-client.ts (lines 237-248)
 * Default OFF: user has cloud APIs + VM active.
 * local SmolLM2 is too slow/imprecise for text.
 */

let _localFirstMode = false;

export function setLocalFirstMode(enabled: boolean) {
  _localFirstMode = enabled;
  console.log(`[OrionAI] Local-first mode: ${enabled ? "ON" : "OFF"}`);
}

export function isLocalFirstMode(): boolean {
  return _localFirstMode;
}
