/**
 * Vision Layout Parser — Structured document understanding beyond raw OCR.
 * Detects document structure: headers, paragraphs, tables, lists, code blocks.
 * Uses heuristic analysis of OCR bounding boxes + visual cues.
 */

import type { OCRResult } from "./ocr-engine";

export interface LayoutElement {
  type: "heading" | "paragraph" | "table" | "list" | "code" | "caption" | "footer" | "header" | "image_region" | "separator";
  content: string;
  confidence: number;
  /** Bounding box in pixels */
  bounds: { x: number; y: number; width: number; height: number };
  /** Reading order index */
  order: number;
  /** For tables: parsed rows/columns */
  tableData?: string[][];
  /** Nesting level (for lists/headings) */
  level?: number;
}

export interface DocumentLayout {
  elements: LayoutElement[];
  /** Detected document type */
  documentType: "letter" | "report" | "invoice" | "form" | "article" | "presentation" | "unknown";
  /** Reading direction */
  direction: "ltr" | "rtl";
  /** Total text blocks found */
  blockCount: number;
  /** Structured markdown representation */
  markdown: string;
}

/**
 * Parse document layout from OCR result.
 * Uses text size, position, and spacing heuristics.
 */
export function parseDocumentLayout(
  ocrResult: OCRResult,
  frameWidth: number = 640,
  frameHeight: number = 480
): DocumentLayout {
  if (!ocrResult?.lines || ocrResult.lines.length === 0) {
    return {
      elements: [],
      documentType: "unknown",
      direction: "ltr",
      blockCount: 0,
      markdown: ""
    };
  }

  const elements: LayoutElement[] = [];
  let order = 0;

  // Analyze line heights to determine base font size
  const lineHeights = ocrResult.lines
    .filter((l: any) => l.bbox)
    .map((l: any) => l.bbox.height ?? (l.bbox.y2 - l.bbox.y1) ?? 16);
  const medianHeight = lineHeights.length > 0
    ? lineHeights.sort((a: number, b: number) => a - b)[Math.floor(lineHeights.length / 2)]
    : 16;

  // Group lines into blocks by vertical proximity
  const sortedLines = [...(ocrResult.lines || [])].sort((a: any, b: any) => {
    const ay = a.bbox?.y ?? a.bbox?.y1 ?? 0;
    const by = b.bbox?.y ?? b.bbox?.y1 ?? 0;
    return ay - by;
  });

  let currentBlock: any[] = [];
  let lastY = -999;

  for (const line of sortedLines) {
    const y = line.bbox?.y ?? line.bbox?.y1 ?? 0;
    const height = line.bbox?.height ?? (line.bbox?.y2 - line.bbox?.y1) ?? medianHeight;
    const text = (line.text || "").trim();
    if (!text) continue;

    const gap = y - lastY;
    const isNewBlock = gap > medianHeight * 1.8;

    if (isNewBlock && currentBlock.length > 0) {
      elements.push(classifyBlock(currentBlock, medianHeight, frameWidth, order++));
      currentBlock = [];
    }

    currentBlock.push({ text, y, height, x: line.bbox?.x ?? line.bbox?.x1 ?? 0, width: line.bbox?.width ?? (line.bbox?.x2 - line.bbox?.x1) ?? frameWidth });
    lastY = y + height;
  }

  // Last block
  if (currentBlock.length > 0) {
    elements.push(classifyBlock(currentBlock, medianHeight, frameWidth, order++));
  }

  // Detect document type
  const documentType = detectDocumentType(elements, ocrResult.text ?? "");

  // Generate structured markdown
  const markdown = generateMarkdown(elements);

  return {
    elements,
    documentType,
    direction: "ltr",
    blockCount: elements.length,
    markdown
  };
}

function classifyBlock(
  lines: Array<{ text: string; y: number; height: number; x: number; width: number }>,
  medianHeight: number,
  frameWidth: number,
  order: number
): LayoutElement {
  const fullText = lines.map(l => l.text).join(" ");
  const avgHeight = lines.reduce((s, l) => s + l.height, 0) / lines.length;
  const firstLine = lines[0];
  const bounds = {
    x: Math.min(...lines.map(l => l.x)),
    y: firstLine.y,
    width: Math.max(...lines.map(l => l.width)),
    height: lines[lines.length - 1].y + lines[lines.length - 1].height - firstLine.y
  };

  // Heading detection: larger text, short content, or ALL CAPS
  if (avgHeight > medianHeight * 1.3 && fullText.length < 100) {
    const level = avgHeight > medianHeight * 2 ? 1 : avgHeight > medianHeight * 1.5 ? 2 : 3;
    return { type: "heading", content: fullText, confidence: 0.8, bounds, order, level };
  }

  // ALL CAPS short text = likely heading
  if (fullText === fullText.toUpperCase() && fullText.length > 3 && fullText.length < 80 && /[A-Z]/.test(fullText)) {
    return { type: "heading", content: fullText, confidence: 0.7, bounds, order, level: 2 };
  }

  // List detection: lines starting with bullets, numbers, or dashes
  const listPattern = /^[\-\•\*\d]+[\.\)]\s/;
  if (lines.every(l => listPattern.test(l.text) || l.text.length < 5)) {
    return { type: "list", content: fullText, confidence: 0.75, bounds, order, level: 1 };
  }

  // Table detection: multiple columns aligned vertically
  if (lines.length >= 2) {
    const hasConsistentColumns = detectTablePattern(lines);
    if (hasConsistentColumns) {
      const tableData = lines.map(l => l.text.split(/\s{2,}|\t/).map(c => c.trim()).filter(Boolean));
      return { type: "table", content: fullText, confidence: 0.7, bounds, order, tableData };
    }
  }

  // Code detection: monospace-like patterns
  if (/[{}();=<>]/.test(fullText) && (fullText.includes("function") || fullText.includes("const ") || fullText.includes("import "))) {
    return { type: "code", content: fullText, confidence: 0.65, bounds, order };
  }

  // Footer/header detection: at extreme Y positions
  if (firstLine.y < medianHeight * 2) {
    return { type: "header", content: fullText, confidence: 0.5, bounds, order };
  }

  // Default: paragraph
  return { type: "paragraph", content: fullText, confidence: 0.8, bounds, order };
}

function detectTablePattern(lines: Array<{ text: string; x: number; width: number }>): boolean {
  if (lines.length < 2) return false;
  const columnCounts = lines.map(l => l.text.split(/\s{2,}|\t/).filter(Boolean).length);
  const firstCount = columnCounts[0];
  if (firstCount < 2) return false;
  return columnCounts.filter(c => c === firstCount).length >= lines.length * 0.6;
}

function detectDocumentType(elements: LayoutElement[], fullText: string): DocumentLayout["documentType"] {
  const lower = fullText.toLowerCase();
  if (/fatura|invoice|nf-?e|nota fiscal|total.*r\$/.test(lower)) return "invoice";
  if (/formulário|form|preencha|campo obrigatório/.test(lower)) return "form";
  if (/prezado|atenciosamente|cordialmente|dear/.test(lower)) return "letter";
  if (elements.filter(e => e.type === "heading").length >= 3) return "report";
  if (elements.length <= 5 && elements.filter(e => e.type === "heading").length >= 1) return "presentation";
  return elements.length > 2 ? "article" : "unknown";
}

function generateMarkdown(elements: LayoutElement[]): string {
  return elements.map(el => {
    switch (el.type) {
      case "heading": return `${"#".repeat(el.level ?? 1)} ${el.content}`;
      case "list": return el.content.split(/[\-\•\*]/).filter(Boolean).map(i => `- ${i.trim()}`).join("\n");
      case "table":
        if (!el.tableData?.length) return el.content;
        const header = el.tableData[0].join(" | ");
        const sep = el.tableData[0].map(() => "---").join(" | ");
        const rows = el.tableData.slice(1).map(r => r.join(" | ")).join("\n");
        return `${header}\n${sep}\n${rows}`;
      case "code": return `\`\`\`\n${el.content}\n\`\`\``;
      default: return el.content;
    }
  }).join("\n\n");
}

/**
 * Format layout for AI prompt.
 */
export function formatLayoutForAI(layout: DocumentLayout): string {
  if (layout.blockCount === 0) return "";
  
  const parts: string[] = [];
  parts.push(`LAYOUT DO DOCUMENTO: tipo=${layout.documentType}, ${layout.blockCount} blocos`);
  
  const structure = layout.elements.map(e => {
    const prefix = e.type === "heading" ? `H${e.level ?? 1}` : e.type.toUpperCase();
    return `[${prefix}] ${e.content.slice(0, 60)}${e.content.length > 60 ? "..." : ""}`;
  }).join(" → ");
  
  parts.push(`ESTRUTURA: ${structure}`);
  
  if (layout.elements.some(e => e.type === "table")) {
    const tables = layout.elements.filter(e => e.type === "table");
    parts.push(`TABELAS DETECTADAS: ${tables.length}`);
  }
  
  return parts.join("\n");
}
