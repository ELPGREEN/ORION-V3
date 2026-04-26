/**
 * Orion Hybrid Router — Local GPU vs Cloud vs Flow Decision Core
 *
 * Scores and decides the optimal execution path based on:
 * - Privacy (Sensitive data -> Local)
 * - Complexity (Multi-step -> Langflow FLOW)
 * - Intelligence (High reasoning -> Cloud)
 * - Hardware (GPU availability -> Local)
 */

import { SECURITY_POLICIES } from "./policies.js";

export const ROUTE_TARGETS = {
  LOCAL: "local",
  CLOUD: "cloud",
  FLOW: "flow"
};

/**
 * Decides the best route for a given task.
 */
export async function decideRoute(task, systemState) {
  let scoreLocal = 0;
  let scoreCloud = 0;
  let scoreFlow = 0;

  // 1. Privacy First
  if (task.isSensitive || containsPII(task.text)) {
    return ROUTE_TARGETS.LOCAL;
  }

  // 2. Multi-step / Orchestration Complexity
  if (task.type === "deep_research" || task.type === "legal_advisor") {
    scoreFlow += 5; // Best handled by visual flows
  }

  // 3. Simple Complexity
  if (task.complexity === "high" && scoreFlow === 0) {
    scoreCloud += 4;
  } else if (task.type === "summarize") {
    scoreLocal += 2;
  }

  // 4. Hardware Capability
  if (systemState.hasGPU) scoreLocal += 3;

  // 5. Detection Logic
  if (scoreFlow >= 5 && systemState.langflowActive) return ROUTE_TARGETS.FLOW;

  const decision = scoreLocal >= scoreCloud ? ROUTE_TARGETS.LOCAL : ROUTE_TARGETS.CLOUD;
  return decision;
}

function containsPII(text) {
  if (!text) return false;
  for (const pattern of Object.values(SECURITY_POLICIES.piiPatterns)) {
    if (pattern.test(text)) return true;
  }
  return false;
}
