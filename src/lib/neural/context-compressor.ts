/**
 * ─── Context Compressor ───
 * 
 * Compresses retrieved RAG chunks before injecting into the LLM prompt.
 * Maximizes information density per token by:
 * 1. Removing duplicate/overlapping content between chunks
 * 2. Extracting key sentences (extractive summarization)
 * 3. Ordering by relevance to query
 * 4. Enforcing a token budget
 * 
 * Budget: <5ms for up to 20 chunks.
 */

import { setRetrievedChunks } from "./rag-retrieval-tracker";

// ─── Types ───

export interface RAGChunk {
  id?: string;
  title: string;
  content: string;
  source: string;
  score: number;
}

export interface CompressedContext {
  text: string;
  originalChunks: number;
  compressedChunks: number;
  compressionRatio: number;
  tokenEstimate: number;
  processingMs: number;
}

// ─── Constants ───

const DEFAULT_TOKEN_BUDGET = 3000;
const CHARS_PER_TOKEN = 4; // rough estimate for Portuguese

// ─── Core ───

/**
 * Compress RAG chunks into a dense, non-redundant context string.
 */
export function compressContext(
  chunks: RAGChunk[],
  query: string,
  tokenBudget: number = DEFAULT_TOKEN_BUDGET
): CompressedContext {
  const t0 = performance.now();

  if (chunks.length === 0) {
    return { text: "", originalChunks: 0, compressedChunks: 0, compressionRatio: 1, tokenEstimate: 0, processingMs: 0 };
  }

  // Step 1: Deduplicate overlapping content
  const deduped = deduplicateChunks(chunks);

  // Step 2: Extract key sentences from each chunk, scored by query relevance
  const queryWords = new Set(
    query.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  );
  const scoredSentences: Array<{ text: string; score: number; source: string }> = [];

  for (const chunk of deduped) {
    const sentences = chunk.content
      .split(/[.!?\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 15);

    for (const sentence of sentences) {
      const words = sentence.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const queryOverlap = words.filter(w => queryWords.has(w)).length / Math.max(queryWords.size, 1);
      
      // Score = chunk relevance * 0.6 + sentence-query overlap * 0.4
      const sentenceScore = chunk.score * 0.6 + queryOverlap * 0.4;
      
      scoredSentences.push({
        text: sentence,
        score: sentenceScore,
        source: chunk.source || chunk.title,
      });
    }
  }

  // Step 3: Sort by score and select within budget
  scoredSentences.sort((a, b) => b.score - a.score);

  const charBudget = tokenBudget * CHARS_PER_TOKEN;
  let totalChars = 0;
  const selectedSentences: Array<{ text: string; source: string }> = [];
  const seenFingerprints = new Set<string>();

  for (const sent of scoredSentences) {
    if (totalChars + sent.text.length > charBudget) break;

    // Skip near-duplicate sentences
    const fingerprint = sent.text.toLowerCase().replace(/\s+/g, "").slice(0, 50);
    if (seenFingerprints.has(fingerprint)) continue;
    seenFingerprints.add(fingerprint);

    selectedSentences.push({ text: sent.text, source: sent.source });
    totalChars += sent.text.length;
  }

  // Step 4: Group by source for readability
  const grouped = new Map<string, string[]>();
  for (const s of selectedSentences) {
    if (!grouped.has(s.source)) grouped.set(s.source, []);
    grouped.get(s.source)!.push(s.text);
  }

  // Build final text
  const parts: string[] = [];
  for (const [source, sentences] of grouped) {
    parts.push(`[${source}] ${sentences.join(". ")}.`);
  }
  const text = parts.join("\n");

  const originalLength = chunks.reduce((acc, c) => acc + c.content.length, 0);

  return {
    text,
    originalChunks: chunks.length,
    compressedChunks: grouped.size,
    compressionRatio: originalLength > 0 ? text.length / originalLength : 1,
    tokenEstimate: Math.ceil(text.length / CHARS_PER_TOKEN),
    processingMs: Math.round(performance.now() - t0),
  };
}

// (RAG consciousness chunk tracking is performed inside compressContextChunks before return)

/**
 * Remove chunks with >60% content overlap.
 */
function deduplicateChunks(chunks: RAGChunk[]): RAGChunk[] {
  const result: RAGChunk[] = [];

  for (const chunk of chunks) {
    const chunkWords = new Set(
      chunk.content.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );

    let isDuplicate = false;
    for (const existing of result) {
      const existingWords = new Set(
        existing.content.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      );
      const overlap = [...chunkWords].filter(w => existingWords.has(w)).length;
      const overlapRatio = overlap / Math.max(Math.min(chunkWords.size, existingWords.size), 1);

      if (overlapRatio > 0.6) {
        isDuplicate = true;
        // Keep the one with higher score
        if (chunk.score > existing.score) {
          const idx = result.indexOf(existing);
          result[idx] = chunk;
        }
        break;
      }
    }

    if (!isDuplicate) {
      result.push(chunk);
    }
  }

  return result;
}

/**
 * Estimate token count for a string.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
