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
      validateOutput: vi.fn().mockResolvedValue({ valid: true, score: 90 })
    };

    const orchestrator = new PentagonPizzaOrchestrator(
      mockPerception,
      mockMemory,
      mockReasoning,
      mockAction,
      mockMeta
    );

    const result = await orchestrator.runCycle("test input");

    expect(result.success).toBe(true);
    expect(result.output).toBe("done");
    expect(mockPerception.process).toHaveBeenCalled();
    expect(mockMemory.process).toHaveBeenCalled();
    expect(mockReasoning.process).toHaveBeenCalled();
    expect(mockAction.process).toHaveBeenCalled();
    expect(mockMeta.validateOutput).toHaveBeenCalled();
    expect(mockMemory.learn).toHaveBeenCalled();
  });

  it("should fail the cycle if meta validation fails", async () => {
    const mockMeta = {
      validateInput: vi.fn().mockResolvedValue({ valid: false, feedback: "malicious" }),
    };

    const orchestrator = new PentagonPizzaOrchestrator({}, {}, {}, {}, mockMeta);
    const result = await orchestrator.runCycle("bad input");

    expect(result.success).toBe(false);
    expect(result.data.error).toContain("Pre-Input Guard Breach");
  });
});
