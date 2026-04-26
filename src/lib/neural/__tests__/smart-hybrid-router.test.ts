import { describe, it, expect, vi } from "vitest";
import { decideHybridRoute } from "../smart-hybrid-router";

// Mock dependencies
vi.mock("../slim-model-router", () => ({
  classifyQueryComplexity: vi.fn().mockReturnValue({ score: 0.5 })
}));

vi.mock("../neural-cognition-engine", () => ({
  getCognitionState: vi.fn().mockReturnValue({ lastQuantumEntropy: 0.2 })
}));

// Mock window/fetch
global.fetch = vi.fn();
global.navigator = { deviceMemory: 16, hardwareConcurrency: 8 } as any;

describe("Smart Hybrid Router", () => {
  it("should route sensitive tasks to local if available", async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: true }); // Ollama check

    const task = { prompt: "Sensitive data", isSensitive: true };
    const result = await decideHybridRoute(task);

    expect(result.target).toBe("local");
  });

  it("should route complex tasks to cloud", async () => {
    const { classifyQueryComplexity } = await import("../slim-model-router");
    (classifyQueryComplexity as any).mockReturnValueOnce({ score: 0.9 });

    const task = { prompt: "Complex logic" };
    const result = await decideHybridRoute(task);

    expect(result.target).toBe("cloud");
  });
});
