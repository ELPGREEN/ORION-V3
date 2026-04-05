/**
 * documentComparison.ts — LCS-based HTML diff engine for comparing document versions.
 */

export interface DiffSegment {
  type: "same" | "added" | "removed";
  text: string;
}

/** Split text into comparable tokens (words + punctuation, preserving whitespace) */
function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) || [];
}

/** Strip HTML for text comparison */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** LCS table computation */
function lcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

/** Compute diff segments using LCS backtracking */
export function computeDiff(originalHtml: string, modifiedHtml: string): DiffSegment[] {
  const origText = stripHtml(originalHtml);
  const modText = stripHtml(modifiedHtml);

  const a = tokenize(origText);
  const b = tokenize(modText);

  const dp = lcsTable(a, b);
  const segments: DiffSegment[] = [];

  let i = a.length;
  let j = b.length;

  const result: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: "same", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", text: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", text: a[i - 1] });
      i--;
    }
  }

  // Merge consecutive segments of same type
  for (const seg of result) {
    const last = segments[segments.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      segments.push({ ...seg });
    }
  }

  return segments;
}

/** Generate simple stats from diff */
export interface DiffStats {
  totalWords: number;
  addedWords: number;
  removedWords: number;
  unchangedWords: number;
  changePercentage: number;
}

export function getDiffStats(segments: DiffSegment[]): DiffStats {
  let added = 0, removed = 0, unchanged = 0;
  for (const seg of segments) {
    const words = seg.text.trim().split(/\s+/).filter(Boolean).length;
    if (seg.type === "added") added += words;
    else if (seg.type === "removed") removed += words;
    else unchanged += words;
  }
  const total = added + removed + unchanged;
  return {
    totalWords: total,
    addedWords: added,
    removedWords: removed,
    unchangedWords: unchanged,
    changePercentage: total > 0 ? ((added + removed) / total) * 100 : 0,
  };
}

// ─── Semantic Comparison (diff + similarity score) ───

import { textSimilarity, jaccardSimilarity, softCosineSimilarity } from "./textSimilarity";

export interface DocumentSimilarityResult {
  diff: DiffSegment[];
  stats: DiffStats;
  /** TF-IDF cosine similarity [0..1] */
  cosineSimilarity: number;
  /** Jaccard set similarity [0..1] */
  jaccardSimilarity: number;
  /** Soft cosine with legal term awareness [0..1] */
  softCosineSimilarity: number;
  /** Weighted ensemble score [0..1] */
  overallSimilarity: number;
}

/** Compare two documents: word-level diff + semantic similarity scores */
export function compareDocumentSimilarity(originalHtml: string, modifiedHtml: string): DocumentSimilarityResult {
  const diff = computeDiff(originalHtml, modifiedHtml);
  const stats = getDiffStats(diff);

  const origText = stripHtml(originalHtml);
  const modText = stripHtml(modifiedHtml);

  const cosine = textSimilarity(origText, modText);
  const jaccard = jaccardSimilarity(origText, modText);
  const softCosine = softCosineSimilarity(origText, modText);

  // Ensemble: 40% cosine, 30% soft cosine, 30% jaccard
  const overall = cosine * 0.4 + softCosine * 0.3 + jaccard * 0.3;

  return { diff, stats, cosineSimilarity: cosine, jaccardSimilarity: jaccard, softCosineSimilarity: softCosine, overallSimilarity: overall };
}
