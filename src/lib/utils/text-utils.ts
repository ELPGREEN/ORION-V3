/**
 * Text utility functions for Orion Neural processing
 */

// ═══ Pre-compiled Regexes for Performance ═══
const JSON_BLOCK_REGEX = /```json[\s\S]*?```/g;
const IDENTIFIED_OBJECTS_REGEX = /\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}/g;
const LEARN_REGEX = /\[LEARN:[^\]]+\]/g;
const BOLD_ITALIC_REGEX = /[\*_]{1,3}/g;
const HEADER_REGEX = /^#{1,6}\s+/gm;
const LINK_REGEX = /\[([^\]]+)\]\([^)]+\)/g;
const URL_REGEX = /https?:\/\/\S+/g;
const COMMENT_REGEX = /\/\/[^\n]*/g;
const TAG_REGEX = /<[^>]*>/g;
const BORDER_REGEX = /[─═╔╗╚╝║]/g;
const EMOJI_CLEAN_REGEX = /[🔹⭐◽📋🔄✅❌📌🔧⚙️🛡️⚠️📊📈📉🔍🔎💡🔗📁📂🗂️🗃️]/g;

/**
 * Strip markdown formatting, JSON blocks, and special characters from AI output.
 * Used for both display and TTS-ready text.
 * PERF: Uses pre-compiled regexes to avoid re-compilation.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(JSON_BLOCK_REGEX, "")
    .replace(IDENTIFIED_OBJECTS_REGEX, "")
    .replace(LEARN_REGEX, "")
    .replace(BOLD_ITALIC_REGEX, "")
    .replace(HEADER_REGEX, "")
    .replace(LINK_REGEX, "$1")
    .replace(URL_REGEX, "")
    .replace(COMMENT_REGEX, "")
    .replace(TAG_REGEX, "")
    .replace(BORDER_REGEX, "")
    .replace(EMOJI_CLEAN_REGEX, "")
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
