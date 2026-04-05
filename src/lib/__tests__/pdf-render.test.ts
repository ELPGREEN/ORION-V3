import { describe, it, expect, vi, beforeEach } from "vitest";
import jsPDF from "jspdf";
import { renderRichSegment, parseHtmlToRichSegments, hasRichFormatting } from "../generators/pdf-generator";

describe("renderRichSegment - renderização no jsPDF", () => {
  let doc: jsPDF;

  beforeEach(() => {
    doc = new jsPDF({ unit: "mm", format: "a4" });
  });

  it("aplica negrito no PDF", () => {
    const spy = vi.spyOn(doc, "setFont");
    renderRichSegment(doc, { text: "teste", bold: true }, 30, 50, "times", 12);
    expect(spy).toHaveBeenCalledWith("times", "bold");
  });

  it("aplica itálico no PDF", () => {
    const spy = vi.spyOn(doc, "setFont");
    renderRichSegment(doc, { text: "teste", bold: false, italic: true }, 30, 50, "times", 12);
    expect(spy).toHaveBeenCalledWith("times", "italic");
  });

  it("aplica bold+italic no PDF", () => {
    const spy = vi.spyOn(doc, "setFont");
    renderRichSegment(doc, { text: "teste", bold: true, italic: true }, 30, 50, "times", 12);
    expect(spy).toHaveBeenCalledWith("times", "bolditalic");
  });

  it("desenha linha de sublinhado abaixo do texto", () => {
    const lineSpy = vi.spyOn(doc, "line");
    renderRichSegment(doc, { text: "teste", bold: false, underline: true }, 30, 50, "times", 12);
    expect(lineSpy).toHaveBeenCalled();
    const [x1, y1, x2, y2] = lineSpy.mock.calls[0];
    expect(y1).toBeGreaterThan(50); // underline is below baseline
    expect(x1).toBe(30);
    expect(y1).toBe(y2); // horizontal line
  });

  it("desenha linha de riscado no meio do texto", () => {
    const lineSpy = vi.spyOn(doc, "line");
    renderRichSegment(doc, { text: "teste", bold: false, strikethrough: true }, 30, 50, "times", 12);
    expect(lineSpy).toHaveBeenCalled();
    const [x1, y1, x2, y2] = lineSpy.mock.calls[0];
    expect(y1).toBeLessThan(50); // strikethrough is above baseline
    expect(y1).toBe(y2); // horizontal line
  });

  it("aplica cor de texto correta", () => {
    const spy = vi.spyOn(doc, "setTextColor");
    renderRichSegment(doc, { text: "teste", bold: false, color: "#DC2626" }, 30, 50, "times", 12);
    expect(spy).toHaveBeenCalledWith(220, 38, 38);
  });

  it("aplica destaque (highlight) com rect + fillColor", () => {
    const fillSpy = vi.spyOn(doc, "setFillColor");
    const rectSpy = vi.spyOn(doc, "rect");
    renderRichSegment(doc, { text: "teste", bold: false, highlight: "#FEF08A" }, 30, 50, "times", 12);
    expect(fillSpy).toHaveBeenCalledWith(254, 240, 138);
    expect(rectSpy).toHaveBeenCalled();
    // rect should be filled mode "F"
    const rectCall = rectSpy.mock.calls[0];
    expect(rectCall[4]).toBe("F");
  });

  it("aplica fontSize customizado", () => {
    const spy = vi.spyOn(doc, "setFontSize");
    renderRichSegment(doc, { text: "teste", bold: false, fontSize: 18 }, 30, 50, "times", 12);
    expect(spy).toHaveBeenCalledWith(18);
  });

  it("usa baseFontSize quando não tem fontSize custom", () => {
    const spy = vi.spyOn(doc, "setFontSize");
    renderRichSegment(doc, { text: "teste", bold: false }, 30, 50, "times", 14);
    expect(spy).toHaveBeenCalledWith(14);
  });

  it("retorna largura do texto (> 0)", () => {
    const width = renderRichSegment(doc, { text: "teste com texto", bold: false }, 30, 50, "times", 12);
    expect(width).toBeGreaterThan(0);
  });

  it("combinado bold + underline gera setFont(bold) e line()", () => {
    const fontSpy = vi.spyOn(doc, "setFont");
    const lineSpy = vi.spyOn(doc, "line");
    renderRichSegment(doc, { text: "teste", bold: true, underline: true }, 30, 50, "times", 12);
    expect(fontSpy).toHaveBeenCalledWith("times", "bold");
    expect(lineSpy).toHaveBeenCalled();
  });

  it("reseta cor e fonte ao final", () => {
    const colorSpy = vi.spyOn(doc, "setTextColor");
    const fontSpy = vi.spyOn(doc, "setFont");
    const sizeSpy = vi.spyOn(doc, "setFontSize");
    renderRichSegment(doc, { text: "teste", bold: true, color: "#FF0000", fontSize: 20 }, 30, 50, "times", 12);
    // Last calls should be resets
    const lastColorCall = colorSpy.mock.calls[colorSpy.mock.calls.length - 1];
    expect(lastColorCall).toEqual([0, 0, 0]);
    const lastFontCall = fontSpy.mock.calls[fontSpy.mock.calls.length - 1];
    expect(lastFontCall).toEqual(["times", "normal"]);
    const lastSizeCall = sizeSpy.mock.calls[sizeSpy.mock.calls.length - 1];
    expect(lastSizeCall).toEqual([12]); // reset to baseFontSize
  });
});

describe("hasRichFormatting", () => {
  it("retorna true para underline", () => {
    expect(hasRichFormatting([{ text: "t", bold: false, underline: true }])).toBe(true);
  });
  it("retorna true para cor", () => {
    expect(hasRichFormatting([{ text: "t", bold: false, color: "#f00" }])).toBe(true);
  });
  it("retorna true para apenas bold", () => {
    expect(hasRichFormatting([{ text: "t", bold: true }])).toBe(true);
  });
});

describe("Integração: HTML TipTap -> Parser -> jsPDF render", () => {
  it("HTML com bold+underline gera setFont(bold) + line()", () => {
    const segs = parseHtmlToRichSegments("<p><strong><u>texto</u></strong></p>");
    expect(segs.length).toBeGreaterThanOrEqual(1);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const fontSpy = vi.spyOn(doc, "setFont");
    const lineSpy = vi.spyOn(doc, "line");

    for (const seg of segs) {
      renderRichSegment(doc, seg, 30, 50, "times", 12);
    }

    expect(fontSpy).toHaveBeenCalledWith("times", "bold");
    expect(lineSpy).toHaveBeenCalled();
  });

  it("HTML com cor vermelha gera setTextColor correto", () => {
    const segs = parseHtmlToRichSegments('<p><span style="color: #DC2626">vermelho</span></p>');
    expect(segs.length).toBe(1);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const colorSpy = vi.spyOn(doc, "setTextColor");

    renderRichSegment(doc, segs[0], 30, 50, "times", 12);
    expect(colorSpy).toHaveBeenCalledWith(220, 38, 38);
  });

  it("HTML com destaque gera setFillColor + rect", () => {
    const segs = parseHtmlToRichSegments('<p><mark data-color="#FEF08A">destaque</mark></p>');
    expect(segs.length).toBe(1);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const fillSpy = vi.spyOn(doc, "setFillColor");
    const rectSpy = vi.spyOn(doc, "rect");

    renderRichSegment(doc, segs[0], 30, 50, "times", 12);
    expect(fillSpy).toHaveBeenCalledWith(254, 240, 138);
    expect(rectSpy).toHaveBeenCalled();
  });

  it("HTML com font-size 18pt gera setFontSize(18)", () => {
    const segs = parseHtmlToRichSegments('<p><span style="font-size: 18pt">grande</span></p>');
    expect(segs.length).toBe(1);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const sizeSpy = vi.spyOn(doc, "setFontSize");

    renderRichSegment(doc, segs[0], 30, 50, "times", 12);
    expect(sizeSpy).toHaveBeenCalledWith(18);
  });

  it("HTML complexo bold+italic+underline+cor gera todas as chamadas", () => {
    const segs = parseHtmlToRichSegments('<p><strong><em><u style="color: #DC2626">completo</u></em></strong></p>');
    expect(segs.length).toBeGreaterThanOrEqual(1);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const fontSpy = vi.spyOn(doc, "setFont");
    const colorSpy = vi.spyOn(doc, "setTextColor");
    const lineSpy = vi.spyOn(doc, "line");

    for (const seg of segs) {
      renderRichSegment(doc, seg, 30, 50, "times", 12);
    }

    expect(fontSpy).toHaveBeenCalledWith("times", "bolditalic");
    expect(colorSpy).toHaveBeenCalledWith(220, 38, 38);
    expect(lineSpy).toHaveBeenCalled(); // underline
  });
});
