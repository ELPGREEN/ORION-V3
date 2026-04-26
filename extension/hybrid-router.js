/**
 * Orion Hybrid Router — Local GPU vs Cloud Decision Core
 *
 * Scores and decides the optimal execution path based on:
 * - Privacy (Sensitive data -> Local)
 * - Complexity (High reasoning -> Cloud)
 * - Hardware (GPU availability -> Local)
 * - Cost & Performance
 */

import { SECURITY_POLICIES } from "./policies.js";

export const ROUTE_TARGETS = {
  LOCAL: "local",
  CLOUD: "cloud"
};

/**
 * Decides the best route for a given task.
 */
export async function decideRoute(task, systemState) {
  let scoreLocal = 0;
  let scoreCloud = 0;

  // 1. Privacy First (The Law of the Agent)
  if (task.isSensitive || containsPII(task.text)) {
    console.log("[Orion Router] Sensitive data detected. Forcing LOCAL route.");
    return ROUTE_TARGETS.LOCAL;
  }

  // 2. Task Complexity
  if (task.complexity === "high" || task.type === "reasoning") {
    scoreCloud += 4; // Cloud has bigger brains (DeepSeek R1, Gemini 2.0)
  } else if (task.type === "summarize" || task.type === "translation") {
    scoreLocal += 2; // Local models excel at simple context tasks
  }

  // 3. Hardware Capability
  if (systemState.hasGPU) {
    scoreLocal += 3;
  }
  if (systemState.ramGB > 8) {
    scoreLocal += 1;
  }

  // 4. Fallback Logic
  if (!systemState.ollamaRunning) {
    console.warn("[Orion Router] Ollama not detected. Routing to CLOUD.");
    return ROUTE_TARGETS.CLOUD;
  }

  const decision = scoreLocal >= scoreCloud ? ROUTE_TARGETS.LOCAL : ROUTE_TARGETS.CLOUD;
  console.log(`[Orion Router] Route Score - Local: ${scoreLocal}, Cloud: ${scoreCloud}. Decision: ${decision.toUpperCase()}`);

  return decision;
}

/**
 * Helper to check for PII patterns before routing.
 */
function containsPII(text) {
  if (!text) return false;
  for (const pattern of Object.values(SECURITY_POLICIES.piiPatterns)) {
    if (pattern.test(text)) return true;
  }
  return false;
}
