import { describe, it, expect, vi } from "vitest";
import { processInteraction } from "../orion-ai-client";

// Mock supabase invoke
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "test-user" } } }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: {
          content: "Maestro response",
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode("Hello ") })
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode("world! ") })
                .mockResolvedValueOnce({ done: true }),
              releaseLock: vi.fn(),
              cancel: vi.fn(),
            })
          }
        },
        error: null
      }),
    },
  },
}));

describe("Dual-Path Voice Reasoning", () => {
  it("should support streaming in processInteraction", async () => {
    let tokens = "";
    let sentences: string[] = [];

    await processInteraction({
      question: "Test question",
      chatHistory: [],
      onToken: (t) => { tokens = t; },
      onSentence: (s) => { sentences.push(s); }
    });

    expect(tokens).toContain("Hello world!");
    expect(sentences.length).toBeGreaterThan(0);
    expect(sentences[0]).toBe("Hello world!");
  });
});
