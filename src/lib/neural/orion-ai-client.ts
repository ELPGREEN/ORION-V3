/**
 * Orion AI Client — Façade (kept for backward-compatible imports)
 *
 * The original 1298-line monolith was split into ./ai-client/*.
 * This file is now a thin re-export that delegates to the split package.
 * All existing `from "@/lib/neural/orion-ai-client"` imports continue to work.
 *
 * For new code, prefer importing directly from the split modules:
 *   - "@/lib/neural/ai-client/interaction"
 *   - "@/lib/neural/ai-client/frame-analysis"
 *   - "@/lib/neural/ai-client/intent-router"
 *   - "@/lib/neural/ai-client/voice-identity"
 *   - "@/lib/neural/ai-client/local-mode"
 *   - "@/lib/neural/ai-client/user-memory"
 *   - "@/lib/neural/ai-client/image-gen"
 */

export * from "./ai-client/index";
