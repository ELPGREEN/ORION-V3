import { describe, it, expect, vi } from "vitest";
import { PentagonPizzaOrchestrator } from "../orchestrator/PentagonPizzaOrchestrator";
import { PerceptionAdapter } from "../layers/perception/PerceptionAdapter";
import { MemoryAdapter } from "../layers/memory/MemoryAdapter";
import { ReasoningAdapter } from "../layers/reasoning/ReasoningAdapter";
import { ActionAdapter } from "../layers/action/ActionAdapter";
import { MetaAdapter } from "../layers/meta/MetaAdapter";

describe("Pentagon Pizza: Industrial & Monetization E2E", () => {
  it("should handle a complex multimodal industrial request with monetization", async () => {
    const perception = new PerceptionAdapter();
    const memory = new MemoryAdapter();
    const reasoning = new ReasoningAdapter();
    const action = new ActionAdapter();
    const meta = new MetaAdapter();

    vi.spyOn(memory, 'process').mockResolvedValue({ mergedContext: "Contrato industrial ativo", episodic: [], shortTerm: [], longTerm: [] });
    vi.spyOn(memory, 'learn').mockResolvedValue(undefined);
    vi.spyOn(reasoning, 'process').mockResolvedValue({
      plan: ["mover_agv", "despachar_produto"],
      confidence: 0.95,
      rationale: "Detectado produto na esteira via visão."
    });

    vi.spyOn(meta, 'validateIndustrialSafety').mockResolvedValue({
      valid: false,
      score: 0,
      feedback: "Objeto no caminho do AGV",
      guardrailBreach: "physical_safety_violation"
    });

    const orchestrator = new PentagonPizzaOrchestrator(perception, memory, reasoning, action, meta);
    const result = await orchestrator.runCycle("Inicie o despacho do produto detectado");

    expect(result.success).toBe(false);
    expect(result.data.veto).toBe("physical_safety_violation");
    expect(result.output).toContain("Objeto no caminho");
  });

  it("should block paid service if monetization fails", async () => {
    const mockPerception = { process: vi.fn().mockResolvedValue({ intent: "legal", rawInput: "Gere um contrato" }) };
    const mockMemory = {
      process: vi.fn().mockResolvedValue({ mergedContext: "context" }),
      learn: vi.fn()
    };
    const mockReasoning = { process: vi.fn().mockResolvedValue({ plan: ["gerar_contrato"], confidence: 0.9, rationale: "ok" }) };
    const mockMeta = {
      validateInput: vi.fn().mockResolvedValue({ valid: true }),
      validateReasoning: vi.fn().mockResolvedValue({ valid: true }),
      validateToolActivation: vi.fn().mockResolvedValue({ valid: true }),
      validateOutput: vi.fn().mockResolvedValue({ valid: true, score: 90 })
    };

    const action = new ActionAdapter();
    const orchestrator = new PentagonPizzaOrchestrator(mockPerception, mockMemory, mockReasoning, action, mockMeta);

    const result = await orchestrator.runCycle("Gere um contrato", { userId: "user-123", rawInput: "Gere um contrato" });

    expect(result.success).toBe(false);
    expect(result.output).toContain("não configurado");
  });
});
