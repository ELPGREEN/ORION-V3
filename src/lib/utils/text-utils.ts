/**
 * Text utility functions for Orion Neural processing
 */

/**
 * Strip markdown formatting, JSON blocks, and special characters from AI output.
 * Used for both display and TTS-ready text.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```json[\s\S]*?```/g, "")
    .replace(/\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}/g, "")
    .replace(/\[LEARN:[^\]]+\]/g, "")
    .replace(/\*{1,3}/g, "").replace(/_{1,3}/g, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[─═╔╗╚╝║]/g, "")
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
