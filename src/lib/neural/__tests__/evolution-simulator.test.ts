import { describe, it, expect, vi } from "vitest";
import { simulateImpact } from "../evolution-simulator";

// Mock orion-journal
vi.mock("../orion-journal", () => ({
  searchThoughtLogs: vi.fn().mockResolvedValue([
    { success: false, reasoningChain: "missing target keywords", conclusion: "fail" },
    { success: false, reasoningChain: "another failure", conclusion: "fail" }
  ])
}));

describe("Evolution Simulator", () => {
  it("should estimate positive improvement for relevant proposals", async () => {
    const result = await simulateImpact("test-user", "This proposal contains target keywords for simulation", "test-scope");
    expect(result.improvementFactor).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeGreaterThan(0.5);
    expect(result.predictedMetrics.groundedness).toBeGreaterThan(70);
  });

  it("should return baseline if no failures found", async () => {
    const { searchThoughtLogs } = await import("../orion-journal");
    (searchThoughtLogs as any).mockResolvedValueOnce([]);

    const result = await simulateImpact("test-user", "any", "none");
    expect(result.totalTested).toBe(0);
    expect(result.improvementFactor).toBe(0.5);
  });
});
