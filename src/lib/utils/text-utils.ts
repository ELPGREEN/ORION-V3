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
const MARKDOWN_CLEANUP_REGEX = /```json[\s\S]*?```|\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}|\[LEARN:[^\]]+\]|[\*_]{1,3}|^#{1,6}\s+|https?:\/\/\S+|\/\/[^\n]*|<[^>]*>|[─═╔╗╚╝║]|[🔹⭐◽📋🔄✅❌📌🔧⚙️🛡️⚠️📊📈📉🔍🔎💡🔗📁📂🗂️🗃️]/gm;

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
 * Zero-allocation word counter for high-frequency neural loops.
 * Replaces .split(/\s+/).length to eliminate heap churn.
 */
export function countWords(text: string): number {
  let count = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // 32 = Space, 9-13 = \t \n \v \f \r
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
 * Efficiently extracts tokens from text without multiple split/filter passes.
 * @param text The text to tokenize
 * @param minLength Minimum length of tokens to include
 * @returns Set of unique lowercase tokens
 */
export function getTokensEfficiently(text: string, minLength: number = 0): Set<string> {
  const tokens = new Set<string>();
  const lower = text.toLowerCase();
  let start = -1;

  for (let i = 0; i < lower.length; i++) {
    const charCode = lower.charCodeAt(i);

    if (charCode <= 32) {
      if (start !== -1) {
        if (i - start > minLength) {
          tokens.add(lower.substring(start, i));
        }
        start = -1;
      }
    } else {
      if (start === -1) start = i;
    }
  }

  if (start !== -1 && lower.length - start > minLength) {
    tokens.add(lower.substring(start));
  }

  return tokens;
}
