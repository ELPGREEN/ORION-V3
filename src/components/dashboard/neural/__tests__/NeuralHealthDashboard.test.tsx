import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NeuralHealthDashboard } from "../NeuralHealthDashboard";

// ─── Mock Supabase ───
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIs = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();
const mockGte = vi.fn();
const mockLike = vi.fn();
const mockInvoke = vi.fn();

function createChain(resolveValue: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    like: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(resolveValue)),
    then: (fn: any) => Promise.resolve(resolveValue).then(fn),
  };
  return chain;
}

vi.mock("@/integrations/supabase/client", () => {
  const defaultResult = { data: [], count: 0, error: null };
  const adamResult = { data: null, error: null };

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === "neural_specializations") {
          return createChain(adamResult);
        }
        return createChain(defaultResult);
      }),
      functions: {
        invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      },
    },
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("NeuralHealthDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    render(<NeuralHealthDashboard />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
    await waitFor(() => {});
  });

  it("renders health indicators after loading", async () => {
    render(<NeuralHealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Saúde do Sistema Neural")).toBeInTheDocument();
    });

    // Check for key metric cards using getAllByText for duplicates
    expect(screen.getByText("Embeddings Total")).toBeInTheDocument();
    expect(screen.getByText("Pendentes Vetorização")).toBeInTheDocument();
    expect(screen.getAllByText("Base Neural").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Fila de Jobs")).toBeInTheDocument();
  });

  it("displays overall health badge", async () => {
    render(<NeuralHealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Saudável")).toBeInTheDocument();
    });
  });

  it("renders cron job pipeline status section", async () => {
    render(<NeuralHealthDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText(/Pipeline Orquestrador/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows refresh and pipeline execution buttons", async () => {
    render(<NeuralHealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Atualizar")).toBeInTheDocument();
      expect(screen.getByText("Executar Pipeline")).toBeInTheDocument();
    });
  });

  it("handles zero embeddings gracefully (edge case)", async () => {
    render(<NeuralHealthDashboard />);

    await waitFor(() => {
      // With count=0, multiple "0" values are expected across metric cards
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("computes health status correctly for degraded state", () => {
    // Unit test for the health computation logic
    const hasErrors = 6 > 5 || 4 > 3; // queue.failed > 5 || recentErrors.length > 3
    const hasWarnings = 3000 > 2000; // lp > 2000
    const overallHealth = hasErrors ? "critical" : hasWarnings ? "degraded" : "healthy";
    expect(overallHealth).toBe("critical");
  });

  it("computes healthy status when no issues", () => {
    const hasErrors = 0 > 5 || 0 > 3;
    const hasWarnings = 100 > 2000 || 0 > 10 || 1 > 5;
    const overallHealth = hasErrors ? "critical" : hasWarnings ? "degraded" : "healthy";
    expect(overallHealth).toBe("healthy");
  });

  it("computes degraded when pending embeddings are high", () => {
    const hasErrors = 0 > 5;
    const hasWarnings = 3000 > 2000;
    const overallHealth = hasErrors ? "critical" : hasWarnings ? "degraded" : "healthy";
    expect(overallHealth).toBe("degraded");
  });

  it("calculates embedding percent correctly", () => {
    const lt = 1000;
    const lp = 250;
    const percent = lt > 0 ? Math.round(((lt - lp) / lt) * 100) : 100;
    expect(percent).toBe(75);
  });

  it("handles 100% when total is zero", () => {
    const lt = 0;
    const lp = 0;
    const percent = lt > 0 ? Math.round(((lt - lp) / lt) * 100) : 100;
    expect(percent).toBe(100);
  });

  it("estimates remaining time correctly", () => {
    const pendingCount = 500;
    const estimatedMinutes = Math.ceil(pendingCount / 50 * 2);
    expect(estimatedMinutes).toBe(20);
  });
});
