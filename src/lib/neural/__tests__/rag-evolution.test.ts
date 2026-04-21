import { describe, it, expect, vi } from "vitest";
import { gradeRetrieval } from "../corrective-rag";
import { SearchAgent } from "../agents/search-agent";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { content: "Resposta simulada do agente", results: [] },
        error: null,
      }),
    },
  },
}));

describe("RAG Evolution - Corrective RAG", () => {
  it("should grade high similarity as correct", () => {
    const query = "o que é habeas corpus";
    const context = "O habeas corpus é um remédio constitucional que visa garantir a liberdade de locomoção.";
    const result = gradeRetrieval(query, context);
    expect(result.grade).toBe("correct");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("should grade low similarity as incorrect", () => {
    const query = "preço do bitcoin hoje";
    const context = "O sol nasce no leste e se põe no oeste todos os dias.";
    const result = gradeRetrieval(query, context);
    expect(result.grade).toBe("incorrect");
  });
});

describe("RAG Evolution - Agentic Search Agent", () => {
  it("should initialize with default parameters", () => {
    const agent = new SearchAgent();
    expect(agent).toBeDefined();
  });

  it("should attempt a search and record reasoning", async () => {
    const agent = new SearchAgent(1, 0.5);
    const result = await agent.search("teste complexo", "contexto inicial");

    expect(result.iterations).toBeGreaterThan(0);
    expect(result.reasoningChain.length).toBeGreaterThan(0);
    expect(result.content).toBe("Resposta simulada do agente");
  });
});
