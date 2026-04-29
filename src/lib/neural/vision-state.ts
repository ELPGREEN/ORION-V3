/**
 * Vision State — Lazy getter to break circular dependency
 * between lib/neural/ and components/dashboard/neural/
 *
 * Circular chain broken:
 *   orion-ai-client.ts (lib)  --X-->  useVisionProcessing.ts (components)
 *
 * Instead: NeuralVision.tsx injects VS at mount time via setVSGetter().
 */

let _vsGetter: (() => any) | null = null;

/** Register the VS store at component mount time */
export function setVSGetter(fn: (() => any) | null) {
  _vsGetter = fn;
}

/** Lazy access — returns undefined if not yet registered */
export function getVS() {
  return _vsGetter?.();
}
