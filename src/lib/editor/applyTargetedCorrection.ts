/**
 * Targeted Correction Engine
 * Applies AI-suggested fixes to exact document positions
 * Priority: Exact match > Normalized match > Fuzzy match
 * Detects ambiguity (multiple occurrences) and refuses if unsafe
 */

export interface CorrectionIssue {
  id: string;
  excerpt: string;
  replacementText: string;
  autoApplicable: boolean;
}

export interface CorrectionResult {
  success: boolean;
  reason?: "applied" | "ambiguous" | "not_found" | "empty_excerpt" | "not_applicable";
  matchType?: "exact" | "normalized" | "fuzzy";
}

const normalizeWs = (s: string) => s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

interface TextChunk {
  text: string;
  from: number;
  fullStart: number;
  fullEnd: number;
}

interface DocTextIndex {
  fullText: string;
  chunks: TextChunk[];
}

function buildDocTextIndex(doc: any): DocTextIndex {
  const chunks: TextChunk[] = [];
  let fullText = "";

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;
    const text = node.text || "";
    if (!text) return;

    const fullStart = fullText.length;
    fullText += text;
    chunks.push({
      text,
      from: pos,
      fullStart,
      fullEnd: fullText.length,
    });
  });

  return { fullText, chunks };
}

function mapFullIndexToEditorPosition(index: DocTextIndex, fullIdx: number, preferEnd = false): number {
  for (const chunk of index.chunks) {
    if (fullIdx >= chunk.fullStart && fullIdx < chunk.fullEnd) {
      return chunk.from + (fullIdx - chunk.fullStart);
    }
    if (preferEnd && fullIdx === chunk.fullEnd) {
      return chunk.from + chunk.text.length;
    }
  }

  if (preferEnd && index.chunks.length > 0) {
    const last = index.chunks[index.chunks.length - 1];
    if (fullIdx === last.fullEnd) {
      return last.from + last.text.length;
    }
  }

  return -1;
}

/**
 * Count occurrences of a normalized substring in the whole document text
 */
function countOccurrences(doc: any, needle: string): number {
  const normalizedNeedle = normalizeWs(needle);
  if (!normalizedNeedle) return 0;

  const { fullText } = buildDocTextIndex(doc);
  const normalizedHaystack = normalizeWs(fullText);
  let count = 0;
  let startIdx = 0;

  while (true) {
    const idx = normalizedHaystack.indexOf(normalizedNeedle, startIdx);
    if (idx === -1) break;
    count++;
    startIdx = idx + 1;
  }

  return count;
}

/**
 * Find the first text position matching the excerpt
 * Returns { from, to } in editor coordinates or null
 */
function findExcerptPosition(
  doc: any,
  excerpt: string
): { from: number; to: number; matchType: "exact" | "normalized" | "fuzzy" } | null {
  if (!excerpt) return null;

  const normalizedExcerpt = normalizeWs(excerpt);
  if (!normalizedExcerpt) return null;

  const index = buildDocTextIndex(doc);
  if (!index.fullText) return null;

  // 1) Exact match on full concatenated text (works across marked text nodes)
  const exactIdx = index.fullText.indexOf(excerpt);
  if (exactIdx !== -1) {
    const from = mapFullIndexToEditorPosition(index, exactIdx);
    const to = mapFullIndexToEditorPosition(index, exactIdx + excerpt.length, true);
    if (from !== -1 && to !== -1) {
      return { from, to, matchType: "exact" };
    }
  }

  // 2) Normalized whitespace match
  const normalizedText = normalizeWs(index.fullText);
  const normIdx = normalizedText.indexOf(normalizedExcerpt);
  if (normIdx !== -1) {
    const origFrom = mapNormalizedIndexToOriginal(index.fullText, normIdx);
    const origTo = mapNormalizedIndexToOriginal(index.fullText, normIdx + normalizedExcerpt.length);
    if (origFrom !== -1 && origTo !== -1) {
      const from = mapFullIndexToEditorPosition(index, origFrom);
      const to = mapFullIndexToEditorPosition(index, origTo, true);
      if (from !== -1 && to !== -1) {
        return { from, to, matchType: "normalized" };
      }
    }
  }

  // 3) Fuzzy: first 25 chars prefix match
  if (normalizedExcerpt.length >= 15) {
    const prefix = normalizedExcerpt.substring(0, Math.min(25, normalizedExcerpt.length));
    const fuzzyIdx = normalizedText.indexOf(prefix);
    if (fuzzyIdx !== -1) {
      const origFrom = mapNormalizedIndexToOriginal(index.fullText, fuzzyIdx);
      if (origFrom !== -1) {
        const endGuess = Math.min(index.fullText.length, origFrom + excerpt.length + 10);
        const from = mapFullIndexToEditorPosition(index, origFrom);
        const to = mapFullIndexToEditorPosition(index, endGuess, true);
        if (from !== -1 && to !== -1) {
          return { from, to, matchType: "fuzzy" };
        }
      }
    }
  }

  return null;
}

/**
 * Map an index in normalized text back to the original text position
 */
function mapNormalizedIndexToOriginal(original: string, normalizedIdx: number): number {
  let ni = 0;
  let inWhitespace = false;
  // skip leading whitespace in normalized (it's trimmed)
  let oi = 0;
  while (oi < original.length && /\s/.test(original[oi])) oi++;

  for (; oi < original.length && ni < normalizedIdx; oi++) {
    if (/\s/.test(original[oi])) {
      if (!inWhitespace) {
        ni++; // one space in normalized
        inWhitespace = true;
      }
    } else {
      ni++;
      inWhitespace = false;
    }
  }
  return ni >= normalizedIdx ? oi : -1;
}

/**
 * Apply a targeted correction to a TipTap editor instance
 */
export function applyTargetedCorrection(
  editor: any,
  issue: CorrectionIssue
): CorrectionResult {
  if (!issue.excerpt || issue.excerpt.trim().length === 0) {
    return { success: false, reason: "empty_excerpt" };
  }
  if (!issue.autoApplicable) {
    return { success: false, reason: "not_applicable" };
  }

  const { doc } = editor.state;

  // Check for ambiguity: multiple occurrences
  const occurrences = countOccurrences(doc, issue.excerpt);
  if (occurrences > 1) {
    return { success: false, reason: "ambiguous" };
  }
  if (occurrences === 0) {
    // Try finding with fuzzy
    const pos = findExcerptPosition(doc, issue.excerpt);
    if (!pos) {
      return { success: false, reason: "not_found" };
    }
    // Apply at found position
    editor.chain().focus()
      .insertContentAt({ from: pos.from, to: pos.to }, issue.replacementText, { updateSelection: false })
      .run();
    return { success: true, reason: "applied", matchType: pos.matchType };
  }

  // Single occurrence — safe to apply
  const pos = findExcerptPosition(doc, issue.excerpt);
  if (!pos) {
    return { success: false, reason: "not_found" };
  }

  editor.chain().focus()
    .insertContentAt({ from: pos.from, to: pos.to }, issue.replacementText, { updateSelection: false })
    .run();
  return { success: true, reason: "applied", matchType: pos.matchType };
}

/**
 * Apply a correction via HTML fallback (when editor instance not available)
 */
export function applyHtmlCorrection(
  html: string,
  excerpt: string,
  replacement: string
): { result: string; applied: boolean } {
  if (!excerpt || !excerpt.trim()) return { result: html, applied: false };

  // Exact match first
  if (html.includes(excerpt)) {
    const idx = html.indexOf(excerpt);
    const lastIdx = html.lastIndexOf(excerpt);
    if (idx !== lastIdx) {
      // Ambiguous — multiple occurrences in HTML
      return { result: html, applied: false };
    }
    return { result: html.replace(excerpt, replacement), applied: true };
  }

  // Normalized regex match
  const escaped = excerpt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped.replace(/\s+/g, "\\s+"), "i");
  const match = html.match(regex);
  if (match) {
    // Check uniqueness
    const allMatches = html.match(new RegExp(escaped.replace(/\s+/g, "\\s+"), "gi"));
    if (allMatches && allMatches.length > 1) {
      return { result: html, applied: false };
    }
    return { result: html.replace(regex, replacement), applied: true };
  }

  return { result: html, applied: false };
}
