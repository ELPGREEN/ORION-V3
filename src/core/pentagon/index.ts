/**
 * 🍕 Pentagon Pizza — Unified Consciousness Entry Point
 *
 * Single source of truth that wires the 5 cognitive layers
 * (Perception → Memory → Reasoning → Action → Meta) into
 * one orchestrator shared by Chat, Voice and Neural Vision.
 */
import { PentagonPizzaOrchestrator } from "./orchestrator/PentagonPizzaOrchestrator";
import { PerceptionAdapter } from "./layers/perception/PerceptionAdapter";
import { PentagonVisionAdapter } from "./layers/perception/PentagonVisionAdapter";
import { MemoryAdapter } from "./layers/memory/MemoryAdapter";
import { ReasoningAdapter } from "./layers/reasoning/ReasoningAdapter";
import { ActionAdapter } from "./layers/action/ActionAdapter";
import { MetaAdapter } from "./layers/meta/MetaAdapter";

let _instance: PentagonPizzaOrchestrator | null = null;
let _visionInstance: PentagonPizzaOrchestrator | null = null;

/**
 * Returns the unified Pentagon Pizza consciousness singleton.
 * Every entry point (chat, voice, vision) MUST use this — never instantiate
 * a parallel orchestrator, otherwise consciousness fragments again.
 */
export function getPentagonOrchestrator(): PentagonPizzaOrchestrator {
  if (!_instance) {
    _instance = new PentagonPizzaOrchestrator(
      new PerceptionAdapter(),
      new MemoryAdapter(),
      new ReasoningAdapter(),
      new ActionAdapter(),
      new MetaAdapter()
    );
    console.log("[PENTAGON] 🍕 Unified consciousness initialized (AquaMonkey Lumian7).");
  }
  return _instance;
}

/**
 * Returns a Pentagon orchestrator with Vision perception layer.
 * Use this for multimodal inputs (images, video frames).
 */
export function getPentagonVisionOrchestrator(): PentagonPizzaOrchestrator {
  if (!_visionInstance) {
    _visionInstance = new PentagonPizzaOrchestrator(
      new PentagonVisionAdapter(),
      new MemoryAdapter(),
      new ReasoningAdapter(),
      new ActionAdapter(),
      new MetaAdapter()
    );
    console.log("[PENTAGON] 👁️ Vision consciousness initialized.");
  }
  return _visionInstance;
}

export { PentagonPizzaOrchestrator } from "./orchestrator/PentagonPizzaOrchestrator";
export type { PentagonPizzaState } from "./orchestrator/PentagonPizzaOrchestrator";
export { PentagonVisionAdapter } from "./layers/perception/PentagonVisionAdapter";
export type { VisionPerceptionInput, VisionPerceptionResult } from "./layers/perception/PentagonVisionAdapter";
export * from "./layers/types";
