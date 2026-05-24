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
// BOLT V2.0: Use non-capturing group with alternation for emojis to satisfy no-misleading-character-class
const MARKDOWN_CLEANUP_REGEX = /```json[\s\S]*?```|\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}|\[LEARN:[^\]]+\]|[\*_]{1,3}|^#{1,6}\s+|https?:\/\/\S+|\/\/[^\n]*|<[^>]*>|[─═╔╗╚╝║]|(?:🔹|⭐|◽|📋|🔄|✅|❌|📌|🔧|⚙️|🛡️|⚠️|📊|📈|📉|🔍|🔎|💡|🔗|📁|📂|🗂️|🗃️)/gu;

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
 * Count words in a string without creating arrays (zero-allocation).
 * BOLT V2.0: Replaces .split(/\s+/).length to minimize GC pressure.
 */
export function countWords(text: string): number {
  if (!text) return 0;
  let count = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // Consider characters > 32 as part of a word (simple but effective for Latin/Western text)
    if (charCode > 32) {
      if (!inWord) {
        count++;
        inWord = true;
      }
    } else {
      inWord = false;
    }
  }
  return count;
}

/**
 * Extract tokens efficiently into a Set for fast lookup.
 * BOLT V2.0: Minimizes temporary array allocations.
 */
export function getTokensEfficiently(text: string, minLength = 3): Set<string> {
  const tokens = new Set<string>();
  if (!text) return tokens;

  const lower = text.toLowerCase();
  let start = -1;

  for (let i = 0; i <= lower.length; i++) {
    const charCode = i < lower.length ? lower.charCodeAt(i) : 32;

    if (charCode > 32) {
      if (start === -1) start = i;
    } else {
      if (start !== -1) {
        const word = lower.substring(start, i);
        if (word.length >= minLength) {
          tokens.add(word);
        }
        start = -1;
      }
    }
  }
  return tokens;
}
