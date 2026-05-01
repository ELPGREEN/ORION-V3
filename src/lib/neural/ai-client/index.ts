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
export { processInteraction } from "./interaction";

// Frame analysis
export {
  analyzeFrameWithAI,
  analyzeFrameStreaming,
  buildLocalDetections,
  shouldUseVoiceFastShortcut,
} from "./frame-analysis";

// Intent classification
export { classifyIntent } from "./intent-router";

// Image generation
export { generateImageWithOrion } from "./image-gen";

// Voice identity
export {
  initVoiceIdentityListener,
  getCachedVoiceIdentity,
} from "./voice-identity";

// Local mode
export {
  setLocalFirstMode,
  isLocalFirstMode,
} from "./local-mode";

// User memory
export {
  getUserMemory,
  addUserMemory,
  fetchDashboardContext,
  getCachedAuthUser,
} from "./user-memory";

// Vision state (lazy getter pattern — breaks circular dependency)
export {
  setVSGetter,
  getVS,
} from "../vision-state";

// Re-export types
export type { AIAnalysisResult } from "./frame-analysis";
