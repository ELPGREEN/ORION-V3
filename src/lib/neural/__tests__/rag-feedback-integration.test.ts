import { describe, it, expect, vi, beforeEach } from "vitest";
import { postCognitionLearn } from "../neural-cognition-engine";
import * as ragEvaluator from "../rag-evaluator";
import * as ragFeedback from "../rag-feedback-loop";

vi.mock("../rag-evaluator", () => ({
  evaluateRAGResponse: vi.fn().mockResolvedValue({
    overallScore: 85,
    grade: "B",
    retrievalQuality: "good"
  })
}));

vi.mock("../rag-feedback-loop", () => ({
  submitRAGFeedback: vi.fn(),
  classifyQueryType: vi.fn().mockReturnValue("general"),
  getOptimizedWeights: vi.fn().mockReturnValue({ semantic: 0.5, keyword: 0.5, authority: 0, recency: 0 })
}));

describe("RAG Feedback Integration", () => {
  it("should trigger RAG feedback during postCognitionLearn", async () => {
    await postCognitionLearn("test query", "test response", 100, "textual", false, "test context");

    // Since it is fire-and-forget with Promise.allSettled inside, we might need a small wait
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(ragEvaluator.evaluateRAGResponse).toHaveBeenCalledWith(expect.objectContaining({
      query: "test query",
      response: "test response",
      context: "test context"
    }));

    expect(ragFeedback.submitRAGFeedback).toHaveBeenCalled();
  });
});
