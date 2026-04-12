/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  Voice Evolution Feedback Loop — DISABLED
 *  
 *  Absorção de mensagens removida por decisão do criador.
 *  Funções mantidas como no-ops para não quebrar imports existentes.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** @deprecated Absorption removed — no-op */
export function feedUserSpeech(_transcript: string): void {}

/** @deprecated Absorption removed — no-op */
export function feedAIResponse(_responseText: string): void {}

/** @deprecated Absorption removed — no-op */
export function feedSelfSynthesis(_spokenText: string): void {}

/** Returns empty stats since absorption is disabled */
export function getAbsorptionStats() {
  return { queueSize: 0, lastFlushTimestamp: 0, pendingTypes: {} };
}

/** No-op since absorption is disabled */
export function forceFlushAbsorption(): void {}
