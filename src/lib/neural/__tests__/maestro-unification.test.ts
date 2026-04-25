import { describe, it, expect, vi, beforeEach } from "vitest";
import { processInteraction } from "../orion-ai-client";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user", email: "ericson@elp.green" } } }),
    },
    functions: {
      invoke: vi.fn().mockImplementation((fn: string) => {
        if (fn === "neural-ops") return Promise.resolve({ data: { content: "Test response" }, error: null });
        if (fn === "firecrawl-search") return Promise.resolve({ data: { results: [] }, error: null });
        return Promise.resolve({ data: {}, error: null });
      }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { full_name: "Ericson" } }),
    then: vi.fn().mockImplementation((callback) => callback({ data: [], error: null })),
  };
  return { supabase: mockSupabase };
});

describe("Maestro Unification Stress Test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process an interaction through the unified Maestro core", async () => {
    // Using a query that won't match local tools
    const response = await processInteraction({
      question: "EXECUTE_NEURAL_STRESS_TEST_ALPHA_99",
      chatHistory: [],
      context: "INTERNAL_CONTEXT_DEBUG",
    });

    expect(response).toBe("Test response");

    const neuralOpsCall = (supabase.functions.invoke as any).mock.calls.find(
      (call: any) => call[0] === "neural-ops"
    );

    expect(neuralOpsCall).toBeDefined();
    const body = neuralOpsCall[1].body;

    expect(body.context).toContain("COGNIÇÃO NEURAL");
    expect(body.context).toContain("INTERNAL_CONTEXT_DEBUG");
  });

  it("should trigger web search via Corrective RAG for web_search intent", async () => {
    await processInteraction({
      question: "BUSCA_WEB_SENSITIVA_TESTE",
      chatHistory: [],
      intent: "web_search"
    });

    const neuralOpsCall = (supabase.functions.invoke as any).mock.calls.find(
      (call: any) => call[0] === "neural-ops"
    );

    expect(neuralOpsCall).toBeDefined();
    expect(neuralOpsCall[1].body.intentType).toBe("web_search");
  });
});
