import { describe, it, expect, vi } from "vitest";
import { PentagonPizzaOrchestrator } from "../orchestrator/PentagonPizzaOrchestrator";
import { ActionAdapter } from "../layers/action/ActionAdapter";

describe("Pentagon Pizza: Full Monetization & ROI Cycle", () => {
  it("should communicate ROI before and after execution", async () => {
    const mockPerception = { process: vi.fn().mockResolvedValue({ intent: "legal_research", rawInput: "pesquisar jurisprudência" }) };
    const mockMemory = { process: vi.fn().mockResolvedValue({ mergedContext: "context" }), learn: vi.fn() };
    const mockReasoning = { process: vi.fn().mockResolvedValue({ plan: ["search"], confidence: 0.9, rationale: "ok" }) };
    const mockMeta = {
      validateInput: vi.fn().mockResolvedValue({ valid: true }),
      validateReasoning: vi.fn().mockResolvedValue({ valid: true }),
      validateToolActivation: vi.fn().mockResolvedValue({ valid: true }),
      validateOutput: vi.fn().mockResolvedValue({ valid: true, score: 95 }),
      validateMonetizationQuota: vi.fn().mockResolvedValue({ valid: true })
    };

    // Usamos um mock controlado do ActionAdapter
    const action = new ActionAdapter();
    const orchestrator = new PentagonPizzaOrchestrator(mockPerception, mockMemory, mockReasoning, action, mockMeta);

    const result = await orchestrator.runCycle("pesquisar jurisprudência", { userId: "user-123", rawInput: "pesquisar jurisprudência" });

    expect(result.output).toContain("Economia estimada");
    expect(result.data.roiInfo).toBeDefined();
  });
});
