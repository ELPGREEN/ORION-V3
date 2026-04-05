/**
 * nonDestructiveApply.ts — Protects documents from destructive AI replacements.
 * Uses text-based similarity (not HTML structure) to detect unsafe overwrites.
 */

export type ApplyMode = "edit" | "format" | "clause" | "create" | "improve";

export interface TextRetentionMetrics {
  originalWordCount: number;
  candidateWordCount: number;
  sharedWords: number;
  retentionRatio: number; // 0–1, how much of the original text is retained
  addedWords: number;
  removedWords: number;
  isSubstantiallyDifferent: boolean;
}

/** Strip HTML and normalize whitespace to extract pure text */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokenize text into normalized word set */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/** Calculate how much original text is retained in candidate */
export function getTextRetentionMetrics(originalHtml: string, candidateHtml: string): TextRetentionMetrics {
  const origText = stripHtml(originalHtml);
  const candText = stripHtml(candidateHtml);
  const origWords = tokenize(origText);
  const candWords = tokenize(candText);

  if (origWords.length === 0) {
    return {
      originalWordCount: 0,
      candidateWordCount: candWords.length,
      sharedWords: 0,
      retentionRatio: 1, // empty doc → any output is safe
      addedWords: candWords.length,
      removedWords: 0,
      isSubstantiallyDifferent: false,
    };
  }

  // Build frequency map for original
  const origFreq = new Map<string, number>();
  for (const w of origWords) origFreq.set(w, (origFreq.get(w) || 0) + 1);

  // Count shared words (respecting frequency)
  const candFreq = new Map<string, number>();
  for (const w of candWords) candFreq.set(w, (candFreq.get(w) || 0) + 1);

  let shared = 0;
  for (const [word, origCount] of origFreq) {
    shared += Math.min(origCount, candFreq.get(word) || 0);
  }

  const retentionRatio = shared / origWords.length;
  const removedWords = origWords.length - shared;
  const addedWords = Math.max(0, candWords.length - shared);

  return {
    originalWordCount: origWords.length,
    candidateWordCount: candWords.length,
    sharedWords: shared,
    retentionRatio,
    addedWords,
    removedWords,
    isSubstantiallyDifferent: retentionRatio < 0.3,
  };
}

/** Thresholds by mode — stricter for edit/format, looser for create/improve */
const MODE_THRESHOLDS: Record<ApplyMode, number> = {
  edit: 0.6,       // Must retain at least 60% of original text
  format: 0.75,    // Format changes should barely alter text
  clause: 0.85,    // Adding a clause should keep almost everything
  improve: 0.4,    // Improvement can be more aggressive
  create: 0.0,     // Creation mode allows full replacement
};

/** Check if a replacement would be destructive for the given mode */
export function isUnsafeReplacement(metrics: TextRetentionMetrics, mode: ApplyMode): boolean {
  if (mode === "create") return false;
  if (metrics.originalWordCount < 20) return false; // Too short to judge
  return metrics.retentionRatio < MODE_THRESHOLDS[mode];
}

/** Map intent strings to apply modes */
export function classifyApplyMode(intent: string | undefined): ApplyMode {
  if (!intent) return "improve";
  const i = intent.toLowerCase();
  if (["rewrite", "replace", "delete", "insert"].includes(i)) return "edit";
  if (["formatting", "format", "abnt"].includes(i)) return "format";
  if (["add_clause", "clause", "append"].includes(i)) return "clause";
  if (["create", "generate", "ementa", "summarize"].includes(i)) return "create";
  return "improve";
}

export interface SafeApplyResult {
  safe: boolean;
  output: string;
  metrics: TextRetentionMetrics;
  blockedReason?: string;
}

/** Main entry point: validates and returns safe output or blocks */
export function safeApplyAIResult({
  originalHtml,
  candidateHtml,
  mode,
}: {
  originalHtml: string;
  candidateHtml: string;
  mode: ApplyMode;
}): SafeApplyResult {
  const metrics = getTextRetentionMetrics(originalHtml, candidateHtml);

  if (isUnsafeReplacement(metrics, mode)) {
    return {
      safe: false,
      output: originalHtml,
      metrics,
      blockedReason: `A IA tentou substituir ${((1 - metrics.retentionRatio) * 100).toFixed(0)}% do texto original (modo: ${mode}, limite: ${((1 - MODE_THRESHOLDS[mode]) * 100).toFixed(0)}%). Operação bloqueada para proteger seu documento.`,
    };
  }

  return { safe: true, output: candidateHtml, metrics };
}
