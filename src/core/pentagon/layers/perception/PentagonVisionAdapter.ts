import { IPentagonLayer, PerceptionResult, PentagonContext, recordToolCall, completeToolCall } from "../types";
import { analyzeSemantics } from "@/lib/neural/nlp-semantic-analyzer";
import { analyzeFrameSmart, analyzeFramesBatch, SmartVisionResult, resetVisionCache } from "@/lib/vision/openrouter-vision";

export interface VisionPerceptionInput {
  /** Text query accompanying the vision input */
  query?: string;
  /** Base64-encoded image frame(s) */
  frames: string[];
  /** Optional question to ask about the scene */
  question?: string;
  /** Whether this is a video stream (triggers batch mode) */
  isVideoStream?: boolean;
}

export interface VisionPerceptionResult extends PerceptionResult {
  /** Vision description from OpenRouter multimodal analysis */
  visionDescription: string | null;
  /** Individual frame results (for batch processing) */
  frameResults?: SmartVisionResult[];
  /** Number of frames skipped due to smart skip */
  framesSkipped: number;
  /** Vision processing latency in ms */
  visionLatencyMs: number;
}

export class PentagonVisionAdapter implements IPentagonLayer<VisionPerceptionInput, VisionPerceptionResult> {
  public async process(input: VisionPerceptionInput, context: PentagonContext): Promise<VisionPerceptionResult> {
    const t0 = performance.now();
    const visionToolCall = recordToolCall(context, "vision_analysis", {
      frames: input.frames.length,
      question: input.question,
    });

    let visionDescription: string | null = null;
    let frameResults: SmartVisionResult[] = [];
    let framesSkipped = 0;

    try {
      if (input.isVideoStream && input.frames.length > 1) {
        // Batch mode for video streams
        frameResults = await analyzeFramesBatch(input.frames, input.question);
        const validResults = frameResults.filter(r => r.source !== "skipped");
        framesSkipped = frameResults.length - validResults.length;

        if (validResults.length > 0) {
          // Combine valid frame descriptions
          visionDescription = validResults
            .map(r => r.description)
            .filter(Boolean)
            .join(" | ");
        }
      } else if (input.frames.length > 0) {
        // Single frame mode
        const result = await analyzeFrameSmart(input.frames[0], input.question);
        frameResults = [result];
        if (result.source !== "skipped") {
          visionDescription = result.description;
        } else {
          framesSkipped = 1;
        }
      }
    } catch (err) {
      console.warn("[VisionAdapter] Vision analysis failed, continuing with text-only perception:", err);
    }

    const visionLatencyMs = performance.now() - t0;

    // Merge vision description with query for semantic analysis
    const combinedInput = [
      input.query || "",
      visionDescription ? `CENA VISUAL: ${visionDescription}` : "",
    ].filter(Boolean).join(" ");

    // Run semantic analysis on combined input
    const analysis = analyzeSemantics(combinedInput, (context.sharedState?.wmContext as string) || "");

    // Enrich entities with vision metadata
    const entities = {
      ...(analysis.entities || {}),
      visionPresent: !!visionDescription,
      visionSource: frameResults[0]?.source || "none",
      framesAnalyzed: input.frames.length,
      framesSkipped,
    };

    completeToolCall(visionToolCall, {
      description: visionDescription,
      framesAnalyzed: input.frames.length,
      framesSkipped,
      latencyMs: visionLatencyMs,
    });

    // Track vision cost in context
    if (visionDescription && frameResults[0]?.source === "openrouter_fresh") {
      context.accumulatedCost += 0.05;
    }

    return {
      intent: analysis.domain === "geral" ? "vision_analysis" : analysis.domain,
      entities: entities as Record<string, unknown>,
      sentiment: analysis.sentiment.primary,
      rawInput: combinedInput,
      contextualMarkers: (((analysis.entities as unknown) as Array<Record<string, unknown>>) || []).map((e) => String(e?.text ?? e?.value ?? "")).filter(Boolean),
      complexity: analysis.complexity as "simple" | "medium" | "complex",
      visionDescription,
      frameResults,
      framesSkipped,
      visionLatencyMs,
    };
  }
}

/**
 * Reset all vision caches (useful for scene changes)
 */
export { resetVisionCache };

/**
 * Helper: Check if input contains vision data
 */
export function hasVisionInput(input: unknown): input is VisionPerceptionInput {
  return (
    typeof input === "object" &&
    input !== null &&
    "frames" in input &&
    Array.isArray((input as VisionPerceptionInput).frames) &&
    (input as VisionPerceptionInput).frames.length > 0
  );
}
