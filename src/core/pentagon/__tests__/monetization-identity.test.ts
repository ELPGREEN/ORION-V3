import { describe, it, expect, vi } from "vitest";
import { PentagonPizzaOrchestrator } from "../orchestrator/PentagonPizzaOrchestrator";
import { ActionAdapter } from "../layers/action/ActionAdapter";

describe("Pentagon Pizza: Monetization & Identity", () => {
  it("should bypass charge for creator identity", async () => {
    const mockPerception = { process: vi.fn().mockResolvedValue({ intent: "legal", rawInput: "Pesquisa" }) };
    const mockMemory = { process: vi.fn().mockResolvedValue({ mergedContext: "context" }), learn: vi.fn() };
    const mockReasoning = { process: vi.fn().mockResolvedValue({ plan: ["search"], confidence: 0.9, rationale: "ok" }) };
    const mockMeta = {
      validateInput: vi.fn().mockResolvedValue({ valid: true }),
      validateReasoning: vi.fn().mockResolvedValue({ valid: true }),
      validateToolActivation: vi.fn().mockResolvedValue({ valid: true }),
      validateOutput: vi.fn().mockResolvedValue({ valid: true, score: 90 }),
      validateMonetizationQuota: vi.fn().mockResolvedValue({ valid: true })
    };

    // Action layer real para testar se bypassa cobrança se for owner
    const action = new ActionAdapter();
    const orchestrator = new PentagonPizzaOrchestrator(mockPerception, mockMemory, mockReasoning, action, mockMeta);

    // Contexto com usuário criador (deve ser free via arc-auto-charge)
    // Nota: depends on real implementation of shouldServiceBeFree which checks DB.
    // Here we'll mock the check in ActionAdapter if it was a real dependency but let's test the flow.
    const result = await orchestrator.runCycle("Pesquisa legal", { userId: "creator-id", identityStatus: "creator" });

    // Se o orquestrador completou, significa que não parou no prompt de pagamento
    expect(result.success).toBe(true);
    expect(result.output).toContain("Entendido");
  });
});
