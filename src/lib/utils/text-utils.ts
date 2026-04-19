/**
 * Text utility functions for Orion Neural processing
 */

// Pre-compiled regexes for performance
const STRIP_JSON_BLOCK = /```json[\s\S]*?```/g;
const STRIP_IDENTIFIED_OBJECTS = /\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}/g;
const STRIP_LEARN_FACTS = /\[LEARN:[^\]]+\]/g;
const STRIP_MARKDOWN_STYLE = /\*{1,3}/g;
const STRIP_UNDERSCORES = /_{1,3}/g;
const STRIP_HEADERS = /#{1,6}\s*/g;
const STRIP_LINKS = /\[([^\]]+)\]\([^)]+\)/g;
const STRIP_URLS = /https?:\/\/\S+/g;
const STRIP_COMMENTS = /\/\/[^\n]*/g;
const STRIP_HTML = /<[^>]*>/g;
const STRIP_SPECIAL_CHARS = /[─═╔╗╚╝║]/g;

/**
 * Strip markdown formatting, JSON blocks, and special characters from AI output.
 * Used for both display and TTS-ready text.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(STRIP_JSON_BLOCK, "")
    .replace(STRIP_IDENTIFIED_OBJECTS, "")
    .replace(STRIP_LEARN_FACTS, "")
    .replace(STRIP_MARKDOWN_STYLE, "")
    .replace(STRIP_UNDERSCORES, "")
    .replace(STRIP_HEADERS, "")
    .replace(STRIP_LINKS, "$1")
    .replace(STRIP_URLS, "")
    .replace(STRIP_COMMENTS, "")
    .replace(STRIP_HTML, "")
    .replace(STRIP_SPECIAL_CHARS, "")
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
