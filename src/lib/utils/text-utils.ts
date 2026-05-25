/**
 * Text utility functions for Orion Neural processing
 */

// ═══ Pre-compiled Regexes for Performance ═══
const LINK_REGEX = /\[([^\]]+)\]\([^)]+\)/g;

// PERF: Combined cleanup regex to perform multiple replacements in a single pass.
// Consolidates JSON blocks, identified objects, LEARN facts, bold/italic, headers,
// URLs, comments, tags, borders, and specific emojis.
// This reduces string allocations and CPU cycles in the hot-path AI streaming response loop.
// Note: LINK_REGEX is handled separately because it uses a capture group for replacement.
const MARKDOWN_CLEANUP_REGEX = /```json[\s\S]*?```|\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}|\[LEARN:[^\]]+\]|[\*_]{1,3}|^#{1,6}\s+|https?:\/\/\S+|\/\/[^\n]*|<[^>]*>|[─═╔╗╚╝║]|(?:\uD83D\uDCBF|\u2B50|\u25AB|\uD83D\uDCCB|\uD83D\uDD04|\u2705|\u274C|\uD83D\uDCCC|\uD83D\uDD27|\u2699\uFE0F|\uD83D\uDEE1\uFE0F|\u26A0\uFE0F|\uD83D\uDCCA|\uD83D\uDCC8|\uD83D\uDCC9|\uD83D\uDD0D|\uD83D\uDD0E|\uD83D\uDCA1|\uD83D\uDD17|\uD83D\uDCC1|\uD83D\uDCC2|\uD83D\uDDC2|\uD83D\uDDC3)/gmu;

/**
 * Strip markdown formatting, JSON blocks, and special characters from AI output.
 * Used for both display and TTS-ready text.
 * PERF: Uses a combined pre-compiled regex for O(N) single-pass cleanup.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(LINK_REGEX, "$1") // Handle links first to preserve labels before URL_REGEX eats them
    .replace(MARKDOWN_CLEANUP_REGEX, "")
    .trim();
}

/**
 * Extract text-only content from OpenAI-style messages (strip images).
 * Shared utility for LLM provider calls.
 */
export function extractTextFromMessages(messages: any[]): any[] {
  return messages.map((m: any) => ({
    role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
    content: typeof m.content === "string" ? m.content : Array.isArray(m.content)
      ? m.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ")
      : String(m.content),
  }));
}

/**
 * Count words in a string without creating intermediate arrays.
 * BOLT V2.0: Manual character iteration for zero-allocation.
 */
export function countWords(text: string): number {
  if (!text) return 0;
  let count = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // Basic whitespace check: space, tab, newline, carriage return (charCode <= 32)
    if (charCode <= 32) {
      inWord = false;
    } else if (!inWord) {
      count++;
      inWord = true;
    }
  }
  return count;
}

/**
 * Extract tokens (words > 3 chars, lowercase) as a Set.
 * BOLT V2.0: Minimizes intermediate array allocations.
 */
export function getTokensEfficiently(text: string): Set<string> {
  const tokens = new Set<string>();
  if (!text) return tokens;

  let start = -1;
  const lowerText = text.toLowerCase();

  for (let i = 0; i < lowerText.length; i++) {
    const charCode = lowerText.charCodeAt(i);
    const isBoundary = charCode <= 32;

    if (isBoundary) {
      if (start !== -1) {
        const word = lowerText.substring(start, i);
        if (word.length > 3) tokens.add(word);
        start = -1;
      }
    } else if (start === -1) {
      start = i;
    }
  }

  if (start !== -1) {
    const word = lowerText.substring(start);
    if (word.length > 3) tokens.add(word);
  }

  return tokens;
}
