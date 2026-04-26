import { describe, it, expect, vi } from "vitest";
import { PentagonPizzaOrchestrator } from "../orchestrator/PentagonPizzaOrchestrator";
import { ActionAdapter } from "../layers/action/ActionAdapter";

describe("Pentagon Pizza: Industrial & Monetization E2E", () => {
  it("should block paid service if monetization fails", async () => {
    const mockPerception = { process: vi.fn().mockResolvedValue({ intent: "legal", rawInput: "Gere um contrato" }) };
    const mockMemory = { process: vi.fn().mockResolvedValue({ mergedContext: "context" }), learn: vi.fn() };
    const mockReasoning = { process: vi.fn().mockResolvedValue({ plan: ["gerar_contrato"], confidence: 0.9, rationale: "ok" }) };
    const mockMeta = {
      validateInput: vi.fn().mockResolvedValue({ valid: true }),
      validateReasoning: vi.fn().mockResolvedValue({ valid: true }),
      validateToolActivation: vi.fn().mockResolvedValue({ valid: true }),
      validateOutput: vi.fn().mockResolvedValue({ valid: true, score: 90 }),
      validateMonetizationQuota: vi.fn().mockResolvedValue({ valid: true })
    };

    const action = new ActionAdapter();
    const orchestrator = new PentagonPizzaOrchestrator(mockPerception, mockMemory, mockReasoning, action, mockMeta);
    const result = await orchestrator.runCycle("Gere um contrato", { userId: "user-123", rawInput: "Gere um contrato" });

    expect(result.success).toBe(false);
    expect(result.output).toContain("não configurado");
  });
});
