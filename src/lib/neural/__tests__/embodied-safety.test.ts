import { describe, it, expect, beforeEach } from "vitest";
import { updatePhysicalState, getPrimaryGoal, getPhysicalState, clearGoals } from "../goal-alignment";
import { processInteraction } from "../orion-ai-client";

describe("Embodied Safety & Priority Engine", () => {
  beforeEach(() => {
    clearGoals();
  });

  it("should trigger safety override on critical battery", () => {
    updatePhysicalState({ battery: 3, mobilityStatus: "ok" });
    const primary = getPrimaryGoal();
    expect(primary?.description).toContain("SAFETY_MODE");
    expect(primary?.priority).toBe(1.0);
  });

  it("should trigger safety override on mobility failure", () => {
    updatePhysicalState({ battery: 80, mobilityStatus: "critical" });
    const primary = getPrimaryGoal();
    expect(primary?.description).toContain("SAFETY_MODE");
  });

  it("should interrupt Maestro processing on critical hardware state", async () => {
    updatePhysicalState({ battery: 2, mobilityStatus: "ok" });

    const response = await processInteraction({
      question: "Como está o tempo?",
      chatHistory: [],
    });

    expect(response).toContain("EMERGÊNCIA DE HARDWARE");
    expect(response).toContain("Bateria crítica");
  });
});
