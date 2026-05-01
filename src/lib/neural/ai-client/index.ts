/**
 * NEUROCORE AI — Orion AI Analysis Client
 * Barrel export for backward compatibility.
 *
 * The original orion-ai-client.ts (1309 lines) has been split into:
 *   - ai-client/voice-identity.ts
 *   - ai-client/local-mode.ts
 *   - ai-client/user-memory.ts
 *   - ai-client/frame-analysis.ts
 *   - ai-client/intent-router.ts
 *   - ai-client/image-gen.ts
 *   - ai-client/interaction.ts
 *
 * This file re-exports everything so existing imports continue to work.
 */

// Core exports (from interaction.ts — the Maestro)
export { processInteraction } from "./ai-client/interaction";

// Frame analysis
export {
  analyzeFrameWithAI,
  analyzeFrameStreaming,
  buildLocalDetections,
  shouldUseVoiceFastShortcut,
  AIAnalysisResult,
} from "./ai-client/frame-analysis";

// Intent classification
export { classifyIntent } from "./ai-client/intent-router";

// Image generation
export { generateImageWithOrion } from "./ai-client/image-gen";

// Voice identity
export {
  initVoiceIdentityListener,
  getCachedVoiceIdentity,
} from "./ai-client/voice-identity";

// Local mode
export {
  setLocalFirstMode,
  isLocalFirstMode,
} from "./ai-client/local-mode";

// User memory
export {
  getUserMemory,
  addUserMemory,
  fetchDashboardContext,
  getCachedAuthUser,
} from "./ai-client/user-memory";

// Vision state (lazy getter pattern — breaks circular dependency)
export {
  setVSGetter,
  getVS,
} from "../vision-state";

// Re-export types
export type { AIAnalysisResult } from "./ai-client/frame-analysis";
