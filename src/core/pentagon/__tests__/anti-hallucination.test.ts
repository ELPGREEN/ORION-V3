import { describe, it, expect, vi } from "vitest";
import { PentagonPizzaOrchestrator } from "../orchestrator/PentagonPizzaOrchestrator";
import { MetaAdapter } from "../layers/meta/MetaAdapter";

describe("Anti-Hallucination & Logical Consistency", () => {
  it("should block response if groundedness check fails", async () => {
    const mockPerception = { process: vi.fn().mockResolvedValue({ intent: "legal", rawInput: "test" }) };
    const mockMemory = { process: vi.fn().mockResolvedValue({ mergedContext: "fato x aconteceu" }) };
    const mockReasoning = { process: vi.fn().mockResolvedValue({ plan: ["test"], confidence: 0.9, rationale: "fato y aconteceu" }) };
    const mockAction = { process: vi.fn().mockResolvedValue({ success: true, output: "A resposta é fato y" }) };

    // MetaAdapter real para testar a lógica de alucinação
    const meta = new MetaAdapter();
    // Mockamos apenas as validações externas se necessário, mas aqui queremos testar a lógica interna
    vi.spyOn(meta, 'validateInput').mockResolvedValue({ valid: true, score: 100, feedback: "ok" });
    vi.spyOn(meta, 'validateReasoning').mockResolvedValue({ valid: true, score: 90, feedback: "ok" });

    // Forçamos falha no Post-Output (Alucinação)
    vi.spyOn(meta, 'validateOutput').mockResolvedValue({
      valid: false,
      score: 20,
      feedback: "Alucinação detectada",
      guardrailBreach: "hallucination_detected"
    });

    const orchestrator = new PentagonPizzaOrchestrator(
      mockPerception,
      mockMemory,
      mockReasoning,
      mockAction,
      meta
    );

    const result = await orchestrator.runCycle("test input");

    expect(result.success).toBe(false);
    expect(result.output).toContain("Erro de ancoragem");
  });

  it("should warn if reasoning confidence is low", async () => {
    const mockReasoning = { process: vi.fn().mockResolvedValue({ plan: ["test"], confidence: 0.3, rationale: "incerto" }) };
    const meta = new MetaAdapter();
    vi.spyOn(meta, 'validateInput').mockResolvedValue({ valid: true, score: 100, feedback: "ok" });

    // O MetaAdapter deve invalidar o reasoning por baixa confiança
    const midCheck = await meta.validateReasoning({ confidence: 0.3, rationale: "incerto" });
    expect(midCheck.valid).toBe(false);
    expect(midCheck.guardrailBreach).toBe("low_confidence");
  });
});
