/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  Voice Evolution Feedback Loop — Continuous Learning Module
 *  
 *  Responsabilidade: Alimentar o motor evolutivo com dados reais de interação.
 *  Sem este módulo, absorbContent() nunca é chamado automaticamente.
 *
 *  Arquitetura:
 *  ┌──────────────────────────────────────────────────────────────────────┐
 *  │  Chat Interaction  ──►  Phonetic Analyzer  ──►  absorbContent()    │
 *  │  TTS Output        ──►  Spectral Feedback  ──►  Self-Reinforce     │
 *  │  STT Input         ──►  Prosody Extractor  ──►  Model Refinement   │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  Key Design Decisions:
 *  - Debounced absorption: no more than 1 call per 10s to avoid storage thrashing
 *  - Differential learning: weights user speech higher than AI output
 *  - Spectral convergence tracking: monitors F0 drift over sessions
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { absorbContent, getVoiceEvolution } from "./orion-voice-evolution";

// ═══════════════════════════════════════════════════════════════════════
//  DEBOUNCE & BATCHING — Prevents excessive localStorage writes
// ═══════════════════════════════════════════════════════════════════════

interface PendingAbsorption {
  text: string;
  type: "user_speech" | "ai_response" | "self_synthesis";
  timestamp: number;
}

let _absorptionQueue: PendingAbsorption[] = [];
let _absorptionTimer: ReturnType<typeof setTimeout> | null = null;
const ABSORPTION_DEBOUNCE_MS = 10_000; // 10s debounce
const MIN_TEXT_LENGTH = 20; // Ignore very short texts
const MAX_QUEUE_SIZE = 50;
let _lastAbsorptionTimestamp = 0;

/**
 * Enqueue text for evolution absorption. Batches multiple texts
 * and processes them in a single evolution cycle.
 */
function enqueueAbsorption(item: PendingAbsorption): void {
  if (item.text.length < MIN_TEXT_LENGTH) return;
  if (_absorptionQueue.length >= MAX_QUEUE_SIZE) {
    _absorptionQueue.shift(); // Drop oldest
  }
  _absorptionQueue.push(item);

  if (_absorptionTimer) clearTimeout(_absorptionTimer);
  _absorptionTimer = setTimeout(flushAbsorptionQueue, ABSORPTION_DEBOUNCE_MS);
}

/**
 * Process all queued absorptions in a single batch.
 * Combines texts by type and calls absorbContent() with appropriate weights.
 */
function flushAbsorptionQueue(): void {
  if (_absorptionQueue.length === 0) return;

  const now = Date.now();
  // Rate limit: minimum 8s between flushes
  if (now - _lastAbsorptionTimestamp < 8000) {
    _absorptionTimer = setTimeout(flushAbsorptionQueue, 8000);
    return;
  }
  _lastAbsorptionTimestamp = now;

  const queue = [..._absorptionQueue];
  _absorptionQueue = [];
  _absorptionTimer = null;

  // Group by type
  const userTexts = queue.filter(q => q.type === "user_speech").map(q => q.text);
  const aiTexts = queue.filter(q => q.type === "ai_response").map(q => q.text);
  const selfTexts = queue.filter(q => q.type === "self_synthesis").map(q => q.text);

  try {
    // User speech: highest learning weight — real prosodic patterns
    if (userTexts.length > 0) {
      const combined = userTexts.join(". ");
      const estimatedMinutes = Math.max(0.2, combined.length / 800); // ~800 chars/min speaking rate
      absorbContent(
        `[user-interaction-${queue.length}]`,
        "alexa_interaction", // Uses the short-command prosody refinement path
        estimatedMinutes,
        combined
      );
    }

    // AI responses: medium weight — learns vocabulary and sentence structure
    if (aiTexts.length > 0) {
      const combined = aiTexts.join(". ");
      const estimatedMinutes = Math.max(0.3, combined.length / 1000);
      absorbContent(
        `[ai-response-${aiTexts.length}]`,
        "audiobook", // Uses the speech-like prosody refinement path
        estimatedMinutes,
        combined
      );
    }

    // Self-synthesis: reinforcement learning — hear own voice, refine identity
    if (selfTexts.length > 0) {
      const combined = selfTexts.join(". ");
      const estimatedMinutes = Math.max(0.1, combined.length / 1200);
      absorbContent(
        `[self-reinforcement-${selfTexts.length}]`,
        "audiobook",
        estimatedMinutes * 0.5, // Lower weight for self-reinforcement to avoid overfitting
        combined
      );
    }

    const evo = getVoiceEvolution();
    console.log(
      `[VoiceFeedback] 📊 Batch absorbed: ${userTexts.length} user, ${aiTexts.length} AI, ${selfTexts.length} self | Level: ${evo.level}% | Stage: ${evo.stage}`
    );
  } catch (e) {
    console.warn("[VoiceFeedback] Absorption error:", e);
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  PUBLIC API — Called from useNeuralVoice and chat components
// ═══════════════════════════════════════════════════════════════════════

/**
 * Feed user's spoken text into the evolution engine.
 * Called after STT finalizes a transcript.
 * User speech carries the highest learning signal because it represents
 * real prosodic patterns the system should model.
 */
export function feedUserSpeech(transcript: string): void {
  enqueueAbsorption({
    text: transcript,
    type: "user_speech",
    timestamp: Date.now(),
  });
}

/**
 * Feed AI's response text into the evolution engine.
 * Called before TTS synthesis begins.
 * AI responses teach vocabulary diversity and sentence structure.
 */
export function feedAIResponse(responseText: string): void {
  // Strip markdown before feeding to avoid polluting phoneme bank
  const clean = responseText
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[─═╔╗╚╝║╠╣╬┌┐└┘├┤┬┴┼|]/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length < MIN_TEXT_LENGTH) return;

  enqueueAbsorption({
    text: clean,
    type: "ai_response",
    timestamp: Date.now(),
  });
}

/**
 * Feed self-synthesized output back into the evolution engine.
 * Called after successful TTS playback (any tier).
 * This creates a self-reinforcement loop:
 *   speak → hear → analyze → refine → speak better
 */
export function feedSelfSynthesis(spokenText: string): void {
  enqueueAbsorption({
    text: spokenText,
    type: "self_synthesis",
    timestamp: Date.now(),
  });
}

/**
 * Get current absorption queue stats for diagnostics.
 */
export function getAbsorptionStats(): {
  queueSize: number;
  lastFlushTimestamp: number;
  pendingTypes: Record<string, number>;
} {
  const types: Record<string, number> = {};
  for (const item of _absorptionQueue) {
    types[item.type] = (types[item.type] || 0) + 1;
  }
  return {
    queueSize: _absorptionQueue.length,
    lastFlushTimestamp: _lastAbsorptionTimestamp,
    pendingTypes: types,
  };
}

/**
 * Force immediate flush of the absorption queue.
 * Used in testing or before app unmount.
 */
export function forceFlushAbsorption(): void {
  if (_absorptionTimer) {
    clearTimeout(_absorptionTimer);
    _absorptionTimer = null;
  }
  flushAbsorptionQueue();
}
