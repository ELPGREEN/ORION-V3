/**
 * ─── v21: Multimodal Search (Vision + Text) ───
 * Combined search across text embeddings and visual features.
 */

import { cosineSimilarity, l2Normalize } from "./cross-modal-embeddings";

export interface MultimodalSearchResult {
  id: string;
  title: string;
  textScore: number;
  visionScore: number;
  combinedScore: number;
  modality: "text" | "vision" | "both";
}

export interface SearchCandidate {
  id: string;
  title: string;
  textEmbedding?: number[];
  visionEmbedding?: number[];
}

export function multimodalSearch(
  queryText: number[],
  queryVision: number[] | null,
  candidates: SearchCandidate[],
  textWeight: number = 0.6,
  visionWeight: number = 0.4,
  topK: number = 10
): MultimodalSearchResult[] {
  const results: MultimodalSearchResult[] = candidates.map(c => {
    const textScore = c.textEmbedding
      ? cosineSimilarity(l2Normalize(queryText), l2Normalize(c.textEmbedding))
      : 0;

    const visionScore = queryVision && c.visionEmbedding
      ? cosineSimilarity(l2Normalize(queryVision), l2Normalize(c.visionEmbedding))
      : 0;

    const hasText = !!c.textEmbedding;
    const hasVision = !!c.visionEmbedding && !!queryVision;
    const modality: "text" | "vision" | "both" =
      hasText && hasVision ? "both" : hasVision ? "vision" : "text";

    const combinedScore = textWeight * textScore + visionWeight * visionScore;

    return { id: c.id, title: c.title, textScore, visionScore, combinedScore, modality };
  });

  return results.sort((a, b) => b.combinedScore - a.combinedScore).slice(0, topK);
}
