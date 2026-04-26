import { describe, it, expect, vi } from "vitest";
import { PentagonPizzaOrchestrator } from "../orchestrator/PentagonPizzaOrchestrator";
import { PerceptionAdapter } from "../layers/perception/PerceptionAdapter";
import { MemoryAdapter } from "../layers/memory/MemoryAdapter";
import { ReasoningAdapter } from "../layers/reasoning/ReasoningAdapter";
import { ActionAdapter } from "../layers/action/ActionAdapter";
import { MetaAdapter } from "../layers/meta/MetaAdapter";

describe("Unified Orion: Behavior & Anti-YouTube Bug", () => {
  it("should answer status query correctly instead of playing music", async () => {
    const perception = new PerceptionAdapter();
    const memory = new MemoryAdapter();
    const reasoning = new ReasoningAdapter();
    const action = new ActionAdapter();
    const meta = new MetaAdapter();

    const orchestrator = new PentagonPizzaOrchestrator(perception, memory, reasoning, action, meta);

    // Simula a pergunta que estava dando erro
    const result = await orchestrator.runCycle("Você está me ouvindo?");

    expect(result.success).toBe(true);
    expect(result.output).toContain("estou te ouvindo perfeitamente");
    expect(result.output).not.toContain("YouTube");
    expect(result.output).not.toContain("música");
  });

  it("should correctly identify and handle global vision context", async () => {
    const perception = new PerceptionAdapter();
    const memory = new MemoryAdapter();
    const reasoning = new ReasoningAdapter();
    const action = new ActionAdapter();
    const meta = new MetaAdapter();

    const orchestrator = new PentagonPizzaOrchestrator(perception, memory, reasoning, action, meta);

    // Simula contexto visual global
    const visionData = [{ name: "Contrato de Aluguel", confidence: 0.95 }];
    const result = await orchestrator.runCycle("O que é isso?", { visionDetections: visionData });

    expect(result.success).toBe(true);
    expect(result.roiImpact).toBeDefined();
  });
});
