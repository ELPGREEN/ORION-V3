import { describe, it, expect, vi } from "vitest";
import { MetaAdapter } from "../layers/meta/MetaAdapter";
import { FeynmanReasoner } from "../layers/reasoning/FeynmanReasoner";
import { estimateFisherMetric, boltzmannScore } from "@/lib/neural/tf-probability-ranking";

// Mock Supabase to avoid real network calls
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          success: true,
          simpleExplanation: "Explicação simplificada do Feynman.",
          detectedGaps: []
        },
        error: null
      })
    }
  }
}));

describe("Geometrical Metacognition & Feynman Loop", () => {
  it("should calculate Fisher Metric for knowledge stability", () => {
    const samples = [0.1, 0.2, 0.3, 0.4, 0.5];
    const dist = { logPdf: (x: number) => -Math.pow(x - 0.5, 2) } as any;
    const metric = estimateFisherMetric(dist, samples);
    expect(metric).toBeGreaterThan(0);
  });

  it("should calculate Boltzmann Score for consistency", () => {
    const highEnergy = 10;
    const lowEnergy = 1;
    const highStability = boltzmannScore(lowEnergy);
    const lowStability = boltzmannScore(highEnergy);
    expect(highStability).toBeGreaterThan(lowStability);
  });

  it("should validate reasoning using MetaAdapter geometric checks", async () => {
    const meta = new MetaAdapter();
    const stableReasoning = {
      confidence: 0.9,
      rationale: "Raciocínio sólido e completo.",
      plan: ["step1"]
    };

    const result = await meta.validateReasoning(stableReasoning);
    expect(result.valid).toBe(true);
    expect(result.feedback).toContain("geometricamente");
  });

  it("should trigger Feynman simplification loop", async () => {
    const original = {
      confidence: 0.8,
      rationale: "Complex legal rationale...",
      plan: ["respond"],
      subTasks: []
    };

    const refined = await FeynmanReasoner.refine(original, "test query");
    expect(refined.responseHint).toContain("[Feynman Simplification]");
    expect(refined.confidence).toBe(original.confidence);
  });
});
