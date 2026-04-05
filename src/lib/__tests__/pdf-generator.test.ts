import { describe, it, expect } from "vitest";
import { parseHtmlToRichSegments, normalizeColor, hexToRgb, parseFormattedText } from "../generators/pdf-generator";

describe("parseHtmlToRichSegments", () => {
  it("detecta negrito via <strong>", () => {
    const segs = parseHtmlToRichSegments("<strong>texto</strong>");
    expect(segs).toHaveLength(1);
    expect(segs[0].text).toBe("texto");
    expect(segs[0].bold).toBe(true);
  });

  it("detecta italico via <em>", () => {
    const segs = parseHtmlToRichSegments("<em>texto</em>");
    expect(segs).toHaveLength(1);
    expect(segs[0].text).toBe("texto");
    expect(segs[0].italic).toBe(true);
  });

  it("detecta sublinhado via <u>", () => {
    const segs = parseHtmlToRichSegments("<u>texto</u>");
    expect(segs).toHaveLength(1);
    expect(segs[0].text).toBe("texto");
    expect(segs[0].underline).toBe(true);
  });

  it("detecta riscado via <s>", () => {
    const segs = parseHtmlToRichSegments("<s>texto</s>");
    expect(segs).toHaveLength(1);
    expect(segs[0].text).toBe("texto");
    expect(segs[0].strikethrough).toBe(true);
  });

  it("detecta cor de texto via style color", () => {
    const segs = parseHtmlToRichSegments('<span style="color: #DC2626">texto</span>');
    expect(segs).toHaveLength(1);
    expect(segs[0].text).toBe("texto");
    expect(segs[0].color).toBe("#dc2626");
  });

  it("detecta destaque via <mark> com data-color", () => {
    const segs = parseHtmlToRichSegments('<mark data-color="#FEF08A">texto</mark>');
    expect(segs).toHaveLength(1);
    expect(segs[0].text).toBe("texto");
    expect(segs[0].highlight).toBe("#fef08a");
  });

  it("detecta font-size em pt", () => {
    const segs = parseHtmlToRichSegments('<span style="font-size: 18pt">texto</span>');
    expect(segs).toHaveLength(1);
    expect(segs[0].fontSize).toBe(18);
  });

  it("converte font-size de px para pt", () => {
    const segs = parseHtmlToRichSegments('<span style="font-size: 16px">texto</span>');
    expect(segs).toHaveLength(1);
    expect(segs[0].fontSize).toBe(12); // 16 * 0.75
  });

  it("detecta formatacao aninhada bold+italic+underline", () => {
    const segs = parseHtmlToRichSegments("<strong><em><u>texto</u></em></strong>");
    expect(segs).toHaveLength(1);
    expect(segs[0].bold).toBe(true);
    expect(segs[0].italic).toBe(true);
    expect(segs[0].underline).toBe(true);
  });

  it("separa texto misto em segmentos corretos", () => {
    const segs = parseHtmlToRichSegments("Normal <strong>bold</strong> normal");
    expect(segs.length).toBeGreaterThanOrEqual(3);
    const boldSeg = segs.find((s) => s.bold);
    expect(boldSeg).toBeDefined();
    expect(boldSeg!.text).toBe("bold");
    const plainSegs = segs.filter((s) => !s.bold);
    expect(plainSegs.some((s) => s.text.includes("Normal"))).toBe(true);
  });

  it("retorna array vazio para texto sem HTML", () => {
    const segs = parseHtmlToRichSegments("texto simples");
    expect(segs).toEqual([]);
  });

  it("retorna array vazio para string vazia", () => {
    const segs = parseHtmlToRichSegments("");
    expect(segs).toEqual([]);
  });
});

describe("normalizeColor", () => {
  it("converte rgb() para hex", () => {
    expect(normalizeColor("rgb(220, 38, 38)")).toBe("#dc2626");
  });

  it("retorna hex lowercase", () => {
    expect(normalizeColor("#FF0000")).toBe("#ff0000");
  });

  it("retorna vazio para string vazia", () => {
    expect(normalizeColor("")).toBe("");
  });
});

describe("hexToRgb", () => {
  it("converte hex para tuple RGB", () => {
    expect(hexToRgb("#DC2626")).toEqual([220, 38, 38]);
  });

  it("converte hex sem #", () => {
    expect(hexToRgb("FF0000")).toEqual([255, 0, 0]);
  });

  it("converte preto", () => {
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
  });
});

describe("parseFormattedText (markdown legado)", () => {
  it("detecta **bold**", () => {
    const segs = parseFormattedText("**negrito**");
    expect(segs).toHaveLength(1);
    expect(segs[0].bold).toBe(true);
    expect(segs[0].text).toBe("negrito");
  });

  it("detecta *italic*", () => {
    const segs = parseFormattedText("*italico*");
    expect(segs).toHaveLength(1);
    expect(segs[0].italic).toBe(true);
  });

  it("retorna texto plain como segmento unico", () => {
    const segs = parseFormattedText("texto normal");
    expect(segs).toHaveLength(1);
    expect(segs[0].bold).toBe(false);
  });
});
