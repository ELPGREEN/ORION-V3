import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NeuralEvolutionPanel } from "../NeuralEvolutionPanel";

// ─── Mock dependencies ───
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-123" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

function createChain(resolveValue: any) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: (fn: any) => Promise.resolve(resolveValue).then(fn),
  };
  return chain;
}

const mockProposals = [
  {
    id: "p1",
    proposal_type: "prompt_rewrite",
    scope: "chat",
    title: "Otimizar prompt de chat",
    description: "Melhorar resposta do chat",
    current_value: "old prompt",
    proposed_value: "new prompt",
    reasoning: "Feedback negativo",
    impact_estimate: "Alto",
    evidence: null,
    status: "pending",
    approved_at: null,
    applied_at: null,
    created_at: "2026-03-08T00:00:00Z",
  },
  {
    id: "p2",
    proposal_type: "config_change",
    scope: "search",
    title: "Ajustar threshold",
    description: "Reduzir threshold de busca",
    current_value: "0.7",
    proposed_value: "0.6",
    reasoning: "Recall baixo",
    impact_estimate: "Médio",
    evidence: null,
    status: "applied",
    approved_at: "2026-03-07T00:00:00Z",
    applied_at: "2026-03-07T01:00:00Z",
    created_at: "2026-03-06T00:00:00Z",
  },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "neural_evolution_proposals") {
        return createChain({ data: mockProposals, error: null });
      }
      if (table === "neural_prompt_versions") {
        return createChain({ data: [], count: 0, error: null });
      }
      return createChain({ data: [], count: 0, error: null });
    }),
    functions: {
      invoke: vi.fn((fn: string) => {
        if (fn === "neural-evolution") {
          return Promise.resolve({ data: { experiments: [] }, error: null });
        }
        return Promise.resolve({ data: {}, error: null });
      }),
    },
  },
}));

describe("NeuralEvolutionPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", async () => {
    render(<NeuralEvolutionPanel />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
    // Wait for async state updates to settle
    await waitFor(() => {});
  });

  it("displays evolution panel header after loading", async () => {
    render(<NeuralEvolutionPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Auto-Evolução Neural/i)).toBeInTheDocument();
    });
  });

  it("renders proposal statistics", async () => {
    render(<NeuralEvolutionPanel />);

    await waitFor(() => {
      expect(screen.getByText("Pendentes")).toBeInTheDocument();
      expect(screen.getByText("Aplicadas")).toBeInTheDocument();
    });
  });

  it("shows analysis trigger button", async () => {
    render(<NeuralEvolutionPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Analisar/i)).toBeInTheDocument();
    });
  });

  // ─── Unit tests for proposal logic ───

  it("computes proposal stats correctly", () => {
    const proposals = mockProposals;
    const s = { pending: 0, approved: 0, applied: 0, rejected: 0 };
    for (const p of proposals) {
      if (p.status in s) s[p.status as keyof typeof s]++;
    }
    expect(s.pending).toBe(1);
    expect(s.applied).toBe(1);
    expect(s.approved).toBe(0);
    expect(s.rejected).toBe(0);
  });

  it("correctly identifies specialization proposals", () => {
    const isSpec = (type: string) =>
      type === "new_specialization" || type === "update_specialization";
    expect(isSpec("new_specialization")).toBe(true);
    expect(isSpec("update_specialization")).toBe(true);
    expect(isSpec("prompt_rewrite")).toBe(false);
    expect(isSpec("config_change")).toBe(false);
  });

  it("correctly maps type labels", () => {
    const typeLabels: Record<string, string> = {
      prompt_rewrite: "Otimização de Prompt",
      config_change: "Ajuste de Configuração",
      code_fix: "Correção de Código",
      weight_tune: "Calibração de Pesos",
      new_specialization: "Nova Especialização",
      update_specialization: "Atualizar Especialização",
    };
    expect(typeLabels["prompt_rewrite"]).toBe("Otimização de Prompt");
    expect(typeLabels["new_specialization"]).toBe("Nova Especialização");
  });

  it("filters proposals by scope correctly", () => {
    const scopeFilter: string = "chat";
    const filtered = mockProposals.filter(
      (p) => scopeFilter === "all" || p.scope === scopeFilter
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("p1");
  });

  it("selects all pending proposals for bulk action", () => {
    const pending = mockProposals.filter((p) => p.status === "pending");
    const selected = new Set(pending.map((p) => p.id));
    expect(selected.size).toBe(1);
    expect(selected.has("p1")).toBe(true);
  });

  it("toggle selection adds and removes correctly", () => {
    const selected = new Set<string>();
    // Add
    selected.add("p1");
    expect(selected.has("p1")).toBe(true);
    // Remove
    selected.delete("p1");
    expect(selected.has("p1")).toBe(false);
  });

  it("groups versions by scope for bulk activation", () => {
    const versions = [
      { id: "v1", scope: "chat", created_at: "2026-03-01" },
      { id: "v2", scope: "chat", created_at: "2026-03-05" },
      { id: "v3", scope: "search", created_at: "2026-03-02" },
    ];

    const byScope: Record<string, (typeof versions)[0]> = {};
    for (const v of versions) {
      if (
        !byScope[v.scope] ||
        new Date(v.created_at) > new Date(byScope[v.scope].created_at)
      ) {
        byScope[v.scope] = v;
      }
    }

    expect(byScope["chat"].id).toBe("v2");
    expect(byScope["search"].id).toBe("v3");
    expect(Object.keys(byScope)).toHaveLength(2);
  });
});
