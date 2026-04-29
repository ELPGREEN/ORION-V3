import { describe, it, expect, vi, beforeEach } from "vitest";
import { PentagonVisionAdapter } from "../layers/perception/PentagonVisionAdapter";
import { PentagonContext, createPentagonContext } from "../layers/types";

// Mock dependencies
vi.mock("@/lib/neural/nlp-semantic-analyzer", () => ({
  analyzeSemantics: vi.fn().mockReturnValue({
    domain: "legal",
    entities: [],
    sentiment: { primary: "neutral" },
    complexity: "simple"
  })
}));

vi.mock("@/lib/vision/openrouter-vision", () => ({
  analyzeFrameSmart: vi.fn().mockResolvedValue({
    description: "A legal document on a desk",
    source: "openrouter_fresh",
    latencyMs: 100
  }),
  analyzeFramesBatch: vi.fn().mockResolvedValue([
    { description: "Frame 1", source: "local_cache", latencyMs: 10 },
    { description: "Frame 2", source: "openrouter_fresh", latencyMs: 100 }
  ]),
  resetVisionCache: vi.fn()
}));

describe("PentagonVisionAdapter", () => {
  let adapter: PentagonVisionAdapter;
  let context: PentagonContext;

  beforeEach(() => {
    adapter = new PentagonVisionAdapter();
    context = createPentagonContext("test query");
    vi.clearAllMocks();
  });

  it("should process single frame vision input", async () => {
    const input = {
      frames: ["base64_frame"],
      query: "What is this?"
    };

    const result = await adapter.process(input, context);

    expect(result.visionDescription).toBe("A legal document on a desk");
    expect(result.intent).toBe("legal");
    expect(context.accumulatedCost).toBeGreaterThan(0);
    expect(context.toolCalls.length).toBe(1);
    expect(context.toolCalls[0].tool).toBe("vision_analysis"); // search_web is used as alias for vision
  });

  it("should process batch video stream input", async () => {
    const input = {
      frames: ["frame1", "frame2"],
      isVideoStream: true,
      question: "Analyze this video"
    };

    const result = await adapter.process(input, context);

    expect(result.visionDescription).toContain("Frame 1");
    expect(result.visionDescription).toContain("Frame 2");
    expect(result.frameResults?.length).toBe(2);
  });

  it("should fallback gracefully on vision failure", async () => {
    const { analyzeFrameSmart } = await import("@/lib/vision/openrouter-vision");
    (analyzeFrameSmart as any).mockRejectedValueOnce(new Error("Vision fail"));

    const input = {
      frames: ["frame1"]
    };

    const result = await adapter.process(input, context);

    expect(result.visionDescription).toBeNull();
    expect(result.rawInput).toBe("");
  });
});
