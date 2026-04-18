/**
 * Text utility functions for Orion Neural processing
 */

// ═══ Pre-compiled Regex for stripMarkdown (v2.2) ═══
const JSON_BLOCK_REGEX = /```json[\s\S]*?```/g;
const IDENTIFIED_OBJECTS_REGEX = /\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}/g;
const LEARN_FACTS_REGEX = /\[LEARN:[^\]]+\]/g;
const BOLD_ITALIC_REGEX = /\*{1,3}/g;
const UNDERSCORE_REGEX = /_{1,3}/g;
const HEADER_REGEX = /#{1,6}\s*/gm;
const LINK_REGEX = /\[([^\]]+)\]\([^)]+\)/g;
const URL_REGEX = /https?:\/\/\S+/g;
const COMMENT_REGEX = /\/\/[^\n]*/g;
const HTML_TAG_REGEX = /<[^>]*>/g;
const BOX_CHARS_REGEX = /[─═╔╗╚╝║]/g;

/**
 * Strip markdown formatting, JSON blocks, and special characters from AI output.
 * Used for both display and TTS-ready text.
 * Optimized with pre-compiled regex for high-frequency streaming paths.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(JSON_BLOCK_REGEX, "")
    .replace(IDENTIFIED_OBJECTS_REGEX, "")
    .replace(LEARN_FACTS_REGEX, "")
    .replace(BOLD_ITALIC_REGEX, "")
    .replace(UNDERSCORE_REGEX, "")
    .replace(HEADER_REGEX, "")
    .replace(LINK_REGEX, "$1")
    .replace(URL_REGEX, "")
    .replace(COMMENT_REGEX, "")
    .replace(HTML_TAG_REGEX, "")
    .replace(BOX_CHARS_REGEX, "")
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
