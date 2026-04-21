import { describe, it, expect } from "vitest";
import { stripMarkdown } from "../../utils/text-utils";

describe("Voice and Text Optimizations", () => {
  describe("stripMarkdown", () => {
    it("should strip complex markdown and JSON blocks", () => {
      const input = "Texto **negrito** e [link](https://exemplo.com). ```json\n{\"id\": 1}\n``` [LEARN: algo novo]";
      const output = stripMarkdown(input);
      expect(output).toBe("Texto negrito e link.");
    });

    it("should remove headers and borders", () => {
      const input = "# Título\n───\nConteúdo ║ lateral";
      const output = stripMarkdown(input);
      expect(output).toBe("Título\n\nConteúdo  lateral");
    });

    it("should handle empty or plain text", () => {
      expect(stripMarkdown("")).toBe("");
      expect(stripMarkdown("Simples")).toBe("Simples");
    });
  });

  describe("Streaming Sentence Detection (Sticky Regex Logic)", () => {
    // We replicate the logic from orion-ai-client.ts to test it in isolation
    const SENTENCE_END_REGEX = /.*?[.!?…;]+\s/ys;

    it("should detect sentences using sticky regex and lastIndex", () => {
      const accumulated = "Primeira frase. Segunda frase! Terceira frase? Quarta com ellipsis... Quinta com múltiplo!!";
      let spokenUpTo = 0;
      const detected: string[] = [];

      // Simulating the loop in analyzeFrameStreaming
      while (spokenUpTo < accumulated.length) {
        SENTENCE_END_REGEX.lastIndex = spokenUpTo;
        const match = SENTENCE_END_REGEX.exec(accumulated + " "); // Add space to match the \s
        if (match) {
          detected.push(match[0].trim());
          spokenUpTo = SENTENCE_END_REGEX.lastIndex;
        } else {
          break;
        }
      }

      expect(detected).toEqual([
        "Primeira frase.",
        "Segunda frase!",
        "Terceira frase?",
        "Quarta com ellipsis...",
        "Quinta com múltiplo!!"
      ]);
    });

    it("should not match incomplete sentences", () => {
      const accumulated = "Esta frase não terminou";
      SENTENCE_END_REGEX.lastIndex = 0;
      const match = SENTENCE_END_REGEX.exec(accumulated);
      expect(match).toBeNull();
    });
  });
});
