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
const MARKDOWN_CLEANUP_REGEX = /```json[\s\S]*?```|\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}|\[LEARN:[^\]]+\]|[\*_]{1,3}|^#{1,6}\s+|https?:\/\/\S+|\/\/[^\n]*|<[^>]*>|[─═╔╗╚╝║]|\uFE0F|(?:\uD83D\uDCBF|\u2B50|\u25FD|\uD83D\uDCCB|\uD83D\uDD04|\u2705|\u274C|\uD83D\uDCCC|\uD83D\uDD27|\u2699|\uD83D\uDEE1|\u26A0|\uD83D\uDCC3|\uD83D\uDCC8|\uD83D\uDCC9|\uD83D\uDD0D|\uD83D\uDD0E|\uD83D\uDCA1|\uD83D\uDD17|\uD83D\uDCC1|\uD83D\uDCC2|\uD83D\uDDC2|\uD83D\uDDC3)/gm;

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
