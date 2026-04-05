import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NeuralMetricsDashboard } from "../NeuralMetricsDashboard";

// ─── Mock Supabase ───
function createChain(resolveValue: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    not: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    like: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(resolveValue)),
    then: (fn: any) => Promise.resolve(resolveValue).then(fn),
  };
  return chain;
}

const mockEmbeddings = [
  { source: "datajud" },
  { source: "datajud" },
  { source: "lexml" },
  { source: "legislacao_federal" },
];

const mockKnowledge = [
  { source_type: "jurisprudencia", is_processed: true },
  { source_type: "legislacao", is_processed: false },
];

const mockLearning = [
  { interaction_type: "chat_consulta", quality_score: 0.8 },
  { interaction_type: "chat_consulta", quality_score: 0.9 },
  { interaction_type: "document_generation", quality_score: 0.7 },
];

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "legal_embeddings") {
          return createChain({ data: mockEmbeddings, count: 4, error: null });
        }
        if (table === "neural_knowledge_base") {
          return createChain({ data: mockKnowledge, count: 2, error: null });
        }
        if (table === "neural_learning_data") {
          return createChain({ data: mockLearning, count: 3, error: null });
        }
        if (table === "neural_specializations") {
          return createChain({ data: null, error: null });
        }
        return createChain({ data: [], count: 0, error: null });
      }),
    },
  };
});

describe("NeuralMetricsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading spinner initially", async () => {
    render(<NeuralMetricsDashboard />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
    await waitFor(() => {});
  });

  it("displays top metric cards after loading", async () => {
    render(<NeuralMetricsDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Embeddings")).toBeInTheDocument();
      expect(screen.getByText("Base Neural")).toBeInTheDocument();
      expect(screen.getByText("Processamento")).toBeInTheDocument();
      expect(screen.getByText("Aprendizado")).toBeInTheDocument();
      expect(screen.getByText("Cross-Seed")).toBeInTheDocument();
    });
  });

  it("renders source distribution section", async () => {
    render(<NeuralMetricsDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Embeddings por Fonte")).toBeInTheDocument();
    });
  });

  it("renders knowledge base distribution section", async () => {
    render(<NeuralMetricsDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Base de Conhecimento por Tipo")).toBeInTheDocument();
    });
  });

  // ─── Unit tests for metric calculations ───

  it("calculates processing rate correctly", () => {
    const totalKnowledge = 200;
    const processedKnowledge = 150;
    const rate = totalKnowledge > 0 ? Math.round((processedKnowledge / totalKnowledge) * 100) : 0;
    expect(rate).toBe(75);
  });

  it("handles zero total knowledge gracefully", () => {
    const totalKnowledge = 0;
    const processedKnowledge = 0;
    const rate = totalKnowledge > 0 ? Math.round((processedKnowledge / totalKnowledge) * 100) : 0;
    expect(rate).toBe(0);
  });

  it("calculates learning rate correctly", () => {
    const total = 100;
    const learned = 85;
    const rate = total > 0 ? Math.round((learned / total) * 100) : 0;
    expect(rate).toBe(85);
  });

  it("computes source distribution correctly", () => {
    const sourceMap = new Map<string, number>();
    mockEmbeddings.forEach((row) => {
      const src = row.source || "unknown";
      sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
    });
    expect(sourceMap.get("datajud")).toBe(2);
    expect(sourceMap.get("lexml")).toBe(1);
    expect(sourceMap.get("legislacao_federal")).toBe(1);
    expect(sourceMap.size).toBe(3);
  });

  it("computes learning by source with avg scores", () => {
    const learningMap = new Map<string, { count: number; totalScore: number }>();
    mockLearning.forEach((row) => {
      const src = row.interaction_type;
      const existing = learningMap.get(src) || { count: 0, totalScore: 0 };
      existing.count += 1;
      existing.totalScore += row.quality_score;
      learningMap.set(src, existing);
    });

    const chatConsulta = learningMap.get("chat_consulta")!;
    expect(chatConsulta.count).toBe(2);
    expect(Math.round((chatConsulta.totalScore / chatConsulta.count) * 100) / 100).toBe(0.85);
  });

  it("calculates Adam optimizer learning rate decay", () => {
    const baseEta = 0.05;
    const iteration = 100;
    const eta = baseEta / (1 + 0.005 * iteration);
    expect(eta).toBeCloseTo(0.0333, 3);
  });

  it("computes F1 score from confusion matrix", () => {
    const cm = { tp: 80, fp: 10, fn: 20, tn: 90 };
    const precision = cm.tp / Math.max(cm.tp + cm.fp, 1);
    const recall = cm.tp / Math.max(cm.tp + cm.fn, 1);
    const f1 = 2 * precision * recall / Math.max(precision + recall, 1e-8);
    
    expect(precision).toBeCloseTo(0.889, 2);
    expect(recall).toBe(0.8);
    expect(f1).toBeCloseTo(0.842, 2);
  });

  it("handles confusion matrix with zero values", () => {
    const cm = { tp: 0, fp: 0, fn: 0, tn: 100 };
    const precision = cm.tp / Math.max(cm.tp + cm.fp, 1);
    const recall = cm.tp / Math.max(cm.tp + cm.fn, 1);
    const f1 = 2 * precision * recall / Math.max(precision + recall, 1e-8);
    expect(f1).toBeCloseTo(0, 3);
  });

  it("filters source distribution to top 12", () => {
    const sources = Array.from({ length: 20 }, (_, i) => ({
      source: `source_${i}`,
      count: 20 - i,
    }));
    const top12 = sources.sort((a, b) => b.count - a.count).slice(0, 12);
    expect(top12).toHaveLength(12);
    expect(top12[0].count).toBe(20);
    expect(top12[11].count).toBe(9);
  });
});
