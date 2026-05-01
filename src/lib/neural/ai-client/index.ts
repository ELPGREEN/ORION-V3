/**
 * NEUROCORE AI — Orion AI Analysis Client
 * Barrel export for backward compatibility.
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
