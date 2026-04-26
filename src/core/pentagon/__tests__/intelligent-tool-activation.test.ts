import { describe, it, expect, vi } from "vitest";
import { PentagonPizzaOrchestrator } from "../orchestrator/PentagonPizzaOrchestrator";
import { MetaAdapter } from "../layers/meta/MetaAdapter";

describe("Intelligent Tool Activation", () => {
  it("should veto action if user input is negative", async () => {
    const mockPerception = {
      process: vi.fn().mockResolvedValue({
        intent: "iot_light",
        rawInput: "Não ligue a luz agora",
        isNegation: true
      })
    };
    const mockMemory = { process: vi.fn().mockResolvedValue({ mergedContext: "sala" }), learn: vi.fn() };
    const mockReasoning = {
      process: vi.fn().mockResolvedValue({
        plan: ["ligar_luz"],
        confidence: 0.9,
        rationale: "Usuário falou sobre luz"
      })
    };
    const mockAction = { process: vi.fn() };

    const meta = new MetaAdapter();
    vi.spyOn(meta, 'validateInput').mockResolvedValue({ valid: true, score: 100, feedback: "ok" });
    vi.spyOn(meta, 'validateReasoning').mockResolvedValue({ valid: true, score: 90, feedback: "ok" });

    const orchestrator = new PentagonPizzaOrchestrator(
      mockPerception,
      mockMemory,
      mockReasoning,
      mockAction,
      meta
    );

    const result = await orchestrator.runCycle("Não ligue a luz agora");

    expect(result.success).toBe(false);
    expect(result.output).toContain("Veto por negação");
    expect(mockAction.process).not.toHaveBeenCalled();
  });

  it("should allow action if user input is positive", async () => {
    const mockPerception = {
      process: vi.fn().mockResolvedValue({
        intent: "iot_light",
        rawInput: "Ligue a luz",
        isNegation: false
      })
    };
    const mockMemory = { process: vi.fn().mockResolvedValue({ mergedContext: "sala" }), learn: vi.fn() };
    const mockReasoning = {
      process: vi.fn().mockResolvedValue({
        plan: ["ligar_luz"],
        confidence: 0.9,
        rationale: "Comando direto"
      })
    };
    const mockAction = {
      process: vi.fn().mockResolvedValue({ success: true, output: "Luz ligada" })
    };
    const mockMeta = new MetaAdapter();
    vi.spyOn(mockMeta, 'validateInput').mockResolvedValue({ valid: true, score: 100, feedback: "ok" });
    vi.spyOn(mockMeta, 'validateReasoning').mockResolvedValue({ valid: true, score: 90, feedback: "ok" });
    vi.spyOn(mockMeta, 'validateOutput').mockResolvedValue({ valid: true, score: 95, feedback: "ok" });
    vi.spyOn(mockMeta, 'validateToolActivation').mockResolvedValue({ valid: true, score: 100, feedback: "ok" });

    const orchestrator = new PentagonPizzaOrchestrator(
      mockPerception,
      mockMemory,
      mockReasoning,
      mockAction,
      mockMeta
    );

    const result = await orchestrator.runCycle("Ligue a luz");

    expect(result.success).toBe(true);
    expect(result.output).toBe("Luz ligada");
    expect(mockAction.process).toHaveBeenCalled();
  });
});
