import { describe, it, expect, vi } from "vitest";
import { PentagonPizzaOrchestrator } from "../orchestrator/PentagonPizzaOrchestrator";

describe("PentagonPizzaOrchestrator", () => {
  it("should run a full cognitive cycle successfully", async () => {
    const mockPerception = { process: vi.fn().mockResolvedValue({ intent: "legal", rawInput: "test" }) };
    const mockMemory = { process: vi.fn().mockResolvedValue({ mergedContext: "context" }), learn: vi.fn() };
    const mockReasoning = { process: vi.fn().mockResolvedValue({ plan: ["test"], confidence: 0.9, rationale: "ok" }) };
    const mockAction = { process: vi.fn().mockResolvedValue({ success: true, output: "done" }) };
    const mockMeta = {
      validateInput: vi.fn().mockResolvedValue({ valid: true }),
      validateReasoning: vi.fn().mockResolvedValue({ valid: true }),
      validateOutput: vi.fn().mockResolvedValue({ valid: true, score: 90 }),
      validateToolActivation: vi.fn().mockResolvedValue({ valid: true }),
      validateMonetizationQuota: vi.fn().mockResolvedValue({ valid: true })
    };

    const orchestrator = new PentagonPizzaOrchestrator(mockPerception, mockMemory, mockReasoning, mockAction, mockMeta);
    const result = await orchestrator.runCycle("test input");

    expect(result.success).toBe(true);
    expect(result.output).toBe("done");
  });
});
