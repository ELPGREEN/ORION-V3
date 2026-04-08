/**
 * ═══ Vision-RAG Context Injector ═══
 * 
 * Cross-references real-time vision detections with the RAG knowledge base
 * in <100ms by:
 * 1. Building a compact query from vision detections (labels + scene context)
 * 2. Using cached embeddings for frequent visual patterns
 * 3. Injecting relevant knowledge into the AI prompt as grounded context
 * 
 * This bridges the gap between "what Orion sees" and "what Orion knows."
 */

import { supabase } from "@/integrations/supabase/client";
import type { RealTimeVisionResult, UnifiedDetection } from "./realtime-vision-engine";

// ─── Types ───

export interface VisionRAGContext {
  /** Relevant knowledge entries matched to current visual scene */
  facts: Array<{
    title: string;
    content: string;
    source: string;
    relevance: number;
  }>;
  /** Visual query that was used for RAG lookup */
  visualQuery: string;
  /** Total processing time */
  lookupMs: number;
  /** Whether cache was used */
  cached: boolean;
}

// ─── Cache ───

interface CacheEntry {
  key: string;
  result: VisionRAGContext;
  timestamp: number;
}

const CACHE_TTL_MS = 15_000; // 15s — scene doesn't change that fast
const MAX_CACHE_SIZE = 30;
const _cache: CacheEntry[] = [];

function getCached(key: string): VisionRAGContext | null {
  const now = Date.now();
  const idx = _cache.findIndex(e => e.key === key && now - e.timestamp < CACHE_TTL_MS);
  if (idx >= 0) return { ..._cache[idx].result, cached: true };
  return null;
}

function setCache(key: string, result: VisionRAGContext): void {
  _cache.push({ key, result, timestamp: Date.now() });
  if (_cache.length > MAX_CACHE_SIZE) _cache.splice(0, _cache.length - MAX_CACHE_SIZE);
}

// ─── Core ───

/**
 * Build a compact visual query from detections for RAG lookup.
 * Prioritizes: object labels > scene type > face count > OCR text
 */
function buildVisualQuery(detections: UnifiedDetection[], visionResult: RealTimeVisionResult): string {
  const parts: string[] = [];

  // Top 5 unique objects by confidence
  const seen = new Set<string>();
  for (const det of detections.slice(0, 8)) {
    const label = det.namePt || det.label;
    if (!seen.has(label)) {
      parts.push(label);
      seen.add(label);
    }
  }

  // Scene classification from FrameX
  if (visionResult.frameXResult?.scenario?.label && visionResult.frameXResult.scenario.label !== "outro") {
    parts.push(`cena:${visionResult.frameXResult.scenario.label}`);
  }

  // Face count for social context
  if (visionResult.faces.length > 0) {
    parts.push(`${visionResult.faces.length} pessoa(s)`);
  }

  // OCR text (first 50 chars)
  if (visionResult.ocrResult?.text) {
    const ocrText = visionResult.ocrResult.text.slice(0, 50);
    if (ocrText.length > 3) parts.push(`texto:"${ocrText}"`);
  }

  return parts.slice(0, 6).join(" ");
}

/**
 * Generate a cache key from the visual query.
 * Similar scenes should map to the same key for cache efficiency.
 */
function computeCacheKey(query: string): string {
  // Normalize and sort tokens for order-independent matching
  const tokens = query.toLowerCase().split(/\s+/).sort().join("|");
  return tokens.slice(0, 100);
}

/**
 * Cross-reference vision detections with the RAG knowledge base.
 * Budget: <100ms (cached: <1ms)
 */
export async function injectVisionContext(
  visionResult: RealTimeVisionResult,
  maxResults = 5
): Promise<VisionRAGContext> {
  const t0 = performance.now();

  const visualQuery = buildVisualQuery(visionResult.allObjects, visionResult);

  if (!visualQuery || visualQuery.length < 3) {
    return { facts: [], visualQuery: "", lookupMs: 0, cached: false };
  }

  // Check cache first
  const cacheKey = computeCacheKey(visualQuery);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Use neural-search edge function with text-only search (no embedding needed for speed)
    const { data, error } = await supabase.functions.invoke("neural-search", {
      body: {
        query: visualQuery,
        mode: "fast",           // text match only, skip embedding for <50ms
        max_results: maxResults,
        sources: ["neural", "legal"],
      },
    });

    if (error || !data?.results) {
      return { facts: [], visualQuery, lookupMs: Math.round(performance.now() - t0), cached: false };
    }

    const facts = (data.results as any[]).slice(0, maxResults).map((r: any) => ({
      title: r.title || "",
      content: (r.content || "").slice(0, 300),
      source: r.source || r.source_type || "knowledge",
      relevance: r.score || r.similarity || 0.5,
    }));

    const result: VisionRAGContext = {
      facts,
      visualQuery,
      lookupMs: Math.round(performance.now() - t0),
      cached: false,
    };

    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.warn("[VisionRAG] Lookup failed:", err);
    return { facts: [], visualQuery, lookupMs: Math.round(performance.now() - t0), cached: false };
  }
}

/**
 * Format vision-RAG context for AI prompt injection.
 * Designed to be appended to the system/context prompt.
 */
export function formatVisionRAGForPrompt(ctx: VisionRAGContext): string {
  if (ctx.facts.length === 0) return "";

  const lines = [`CONHECIMENTO RELEVANTE À CENA (${ctx.lookupMs}ms${ctx.cached ? " cache" : ""}):`];
  for (const fact of ctx.facts) {
    lines.push(`• [${fact.source}] ${fact.title}: ${fact.content}`);
  }
  return lines.join("\n");
}

/**
 * Clear the vision-RAG cache (useful when switching contexts).
 */
export function clearVisionRAGCache(): void {
  _cache.length = 0;
}
