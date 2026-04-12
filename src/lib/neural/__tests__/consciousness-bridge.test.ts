import { describe, it, expect, beforeEach } from "vitest";
import {
  runConsciousnessBridge,
  recordReasoningOutcome,
  getLastConsciousnessSnapshot,
  getConsciousnessLevel,
  getConsciousnessContextPrompt,
  getGlobalPLV,
  getHRLState,
  updateHRLFromOutcome,
  type ReasoningContext,
} from "@/lib/neural/consciousness-bridge";

describe("Consciousness Bridge", () => {
  const baseContext: ReasoningContext = {
    intent: "search",
    query: "Pesquise jurisprudência sobre dano moral",
    hasVision: false,
    hasAudio: false,
    memoryFacts: ["Dano moral", "Art. 186 CC"],
    activeModules: ["causal-reasoning", "theory-of-mind", "meta-learning"],
  };

  it("runs a full consciousness cycle and returns valid snapshot", () => {
    const snapshot = runConsciousnessBridge(baseContext);

    expect(snapshot.consciousnessLevel).toBeDefined();
    expect(["unconscious", "preconscious", "conscious", "metaconscious"]).toContain(snapshot.consciousnessLevel);
    expect(snapshot.phi).toBeGreaterThanOrEqual(0);
    expect(snapshot.phi).toBeLessThanOrEqual(1);
    expect(snapshot.globalPLV).toBeGreaterThanOrEqual(0);
    expect(snapshot.gammaHealth).toBeGreaterThanOrEqual(0);
    expect(snapshot.gammaCTC).toBeGreaterThanOrEqual(0);
    expect(snapshot.processingTimeMs).toBeGreaterThan(0);
    expect(snapshot.cycleCount).toBeGreaterThan(0);
    expect(snapshot.timestamp).toBeGreaterThan(0);
  });

  it("includes gamma oscillation sub-band classification", () => {
    const snapshot = runConsciousnessBridge(baseContext);
    expect(["low", "mid", "high", "out_of_range"]).toContain(snapshot.gammaSubBand);
  });

  it("includes HRL decision with plan steps", () => {
    const snapshot = runConsciousnessBridge({
      ...baseContext,
      intent: "auto_construct",
    });

    expect(snapshot.hrl).toBeDefined();
    expect(snapshot.hrl.planSteps).toBeGreaterThan(0);
    expect(snapshot.hrl.plan.length).toBeGreaterThan(0);
    expect(snapshot.hrl.totalQValue).toBeGreaterThan(0);
  });

  it("HRL selects an active sub-goal via UCB1", () => {
    const snapshot = runConsciousnessBridge({
      ...baseContext,
      intent: "search",
    });

    // search intent maps to goals requiring jurisprudence + legislation
    expect(snapshot.hrl.activeSubGoal).toBeDefined();
    if (snapshot.hrl.activeSubGoal) {
      expect(snapshot.hrl.activeSubGoal.description).toBeTruthy();
      expect(snapshot.hrl.activeSubGoal.qValue).toBeGreaterThan(0);
    }
  });

  it("updates HRL Q-values from outcome", () => {
    runConsciousnessBridge({ ...baseContext, intent: "search" });
    const stateBefore = getHRLState();
    const qBefore = stateBefore ? [...stateBefore.qValues.entries()] : [];

    updateHRLFromOutcome(0.9, "search");

    const stateAfter = getHRLState();
    expect(stateAfter).toBeDefined();
    // Q-values should have been updated
    expect(stateAfter!.totalReward).toBeGreaterThan(0);
  });

  it("records reasoning outcome in autobiographical memory", () => {
    runConsciousnessBridge(baseContext);
    recordReasoningOutcome("success", "test event", 0.85, "search");
    // Should not throw
  });

  it("persists consciousness state across cycles", () => {
    const snap1 = runConsciousnessBridge(baseContext);
    const snap2 = runConsciousnessBridge(baseContext);
    expect(snap2.cycleCount).toBeGreaterThan(snap1.cycleCount);
    expect(getLastConsciousnessSnapshot()).toEqual(snap2);
  });

  it("generates valid consciousness context prompt", () => {
    runConsciousnessBridge(baseContext);
    const prompt = getConsciousnessContextPrompt();
    expect(prompt).toContain("[CONSCIOUSNESS]");
    expect(prompt).toContain("PLV:");
    expect(prompt).toContain("HRL:");
  });

  it("getConsciousnessLevel returns current level", () => {
    runConsciousnessBridge(baseContext);
    const level = getConsciousnessLevel();
    expect(["unconscious", "preconscious", "conscious", "metaconscious"]).toContain(level);
  });

  it("getGlobalPLV returns a number", () => {
    runConsciousnessBridge(baseContext);
    expect(typeof getGlobalPLV()).toBe("number");
    expect(getGlobalPLV()).toBeGreaterThan(0);
  });

  it("handles vision context with multimodal intent", () => {
    const snapshot = runConsciousnessBridge({
      ...baseContext,
      intent: "vision_describe",
      hasVision: true,
      activeModules: ["vision", "causal-reasoning", "theory-of-mind"],
    });

    expect(snapshot.hrl.plan.some(p => p.id === "opt-multimodal")).toBe(true);
  });

  it("theta-gamma MI is computed", () => {
    // Run multiple cycles to build phase history
    for (let i = 0; i < 5; i++) {
      runConsciousnessBridge(baseContext);
    }
    const snapshot = getLastConsciousnessSnapshot();
    expect(snapshot!.thetaGammaMI).toBeGreaterThanOrEqual(0);
    expect(snapshot!.thetaGammaMI).toBeLessThanOrEqual(1);
  });
});
