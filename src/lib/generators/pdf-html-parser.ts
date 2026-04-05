// Extracted from pdf-generator.ts for maintainability
// HTML and rich text parsing utilities for PDF generation

export interface TextSegment {
  text: string;
  bold: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  highlight?: string;
}

const FONT_MAP: Record<string, string> = {
  "times new roman": "times",
  "times": "times",
  "arial": "helvetica",
  "helvetica": "helvetica",
  "courier new": "courier",
  "courier": "courier",
  "calibri": "helvetica",
  "garamond": "times",
  "georgia": "times",
  "verdana": "helvetica",
  "tahoma": "helvetica",
  "trebuchet ms": "helvetica",
  "palatino": "times",
  "book antiqua": "times",
  "cambria": "times",
  "consolas": "courier",
  "lucida console": "courier",
};

function mapFontFamily(fontFamily: string): string {
  if (!fontFamily) return "times";
  const normalized = fontFamily.toLowerCase().replace(/["']/g, "").trim();
  if (FONT_MAP[normalized]) return FONT_MAP[normalized];

  const first = normalized.split(",")[0]?.trim();
  if (first && FONT_MAP[first]) return FONT_MAP[first];

  if (normalized.includes("sans-serif") || normalized.includes("sans")) return "helvetica";
  if (normalized.includes("monospace") || normalized.includes("mono")) return "courier";
  return "times";
}

export function parseFormattedText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    if (match[2]) {
      segments.push({ text: match[2], bold: true });
    } else if (match[3]) {
      segments.push({ text: match[3], bold: false, italic: true });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }

  return segments.length > 0 ? segments : [{ text, bold: false }];
}

// R10: Reuse single DOMParser instance across calls
const sharedDomParser = new DOMParser();

/** Parse inner HTML from TipTap into rich TextSegment[] using DOMParser */
export function parseHtmlToRichSegments(html: string): TextSegment[] {
  if (!html || !html.includes("<")) return []; // not HTML, skip

  try {
    const doc = sharedDomParser.parseFromString(`<body>${html}</body>`, "text/html");
    const segments: TextSegment[] = [];

    function walkNode(node: Node, inherited: Omit<TextSegment, "text">) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (text) {
          segments.push({ text, ...inherited });
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Skip suggestion mark styling (green highlights from AI tools)
      if (el.hasAttribute("data-suggestion-id")) {
        for (const child of Array.from(el.childNodes)) {
          walkNode(child, inherited);
        }
        return;
      }

      // Build properties from this element
      const props: Omit<TextSegment, "text"> = { ...inherited };

      // Tag-based formatting
      if (tag === "strong" || tag === "b") props.bold = true;
      if (tag === "em" || tag === "i") props.italic = true;
      if (tag === "u") props.underline = true;
      if (tag === "s" || tag === "del" || tag === "strike") props.strikethrough = true;
      if (tag === "mark") {
        // TipTap highlight uses <mark> with data-color or style
        const bgColor = el.getAttribute("data-color") || el.style.backgroundColor;
        if (bgColor) props.highlight = normalizeColor(bgColor);
        else props.highlight = "#FEF08A"; // default yellow
      }

      // Style-based formatting
      const style = el.style;
      if (style.fontWeight === "bold" || parseInt(style.fontWeight) >= 700) props.bold = true;
      if (style.fontStyle === "italic") props.italic = true;
      if (style.textDecoration?.includes("underline")) props.underline = true;
      if (style.textDecoration?.includes("line-through")) props.strikethrough = true;
      if (style.color) {
        const c = normalizeColor(style.color);
        if (c && c !== "#000000") props.color = c;
      }
      if (style.backgroundColor && tag !== "mark") {
        props.highlight = normalizeColor(style.backgroundColor);
      }
      if (style.fontSize) {
        const ptMatch = style.fontSize.match(/([\d.]+)pt/);
        if (ptMatch) props.fontSize = parseFloat(ptMatch[1]);
        const pxMatch = style.fontSize.match(/([\d.]+)px/);
        if (pxMatch) props.fontSize = parseFloat(pxMatch[1]) * 0.75; // px to pt
      }
      if (style.fontFamily) {
        const mapped = mapFontFamily(style.fontFamily);
        if (mapped) props.fontFamily = mapped;
      }

      // Recurse into children
      for (const child of Array.from(el.childNodes)) {
        walkNode(child, props);
      }
    }

    walkNode(doc.body, { bold: false });
    return segments;
  } catch {
    return [];
  }
}

/** Normalize CSS color values to hex */
export function normalizeColor(color: string): string {
  if (!color) return "";
  // Already hex
  if (color.startsWith("#")) return color.toLowerCase();
  // rgb(r, g, b)
  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  // rgba
  const rgbaMatch = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, "0");
    const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, "0");
    const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  return color;
}

/** Parse hex color to RGB tuple */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) || 0,
    parseInt(h.substring(2, 4), 16) || 0,
    parseInt(h.substring(4, 6), 16) || 0,
  ];
}

// Alignment info extracted from HTML
interface TableCell {
  text: string;
  bold: boolean;
  align?: "left" | "center" | "right";
  colSpan?: number;
  rowSpan?: number;
  richSegments?: TextSegment[];
}

export interface TableData {
  rows: TableCell[][];
  colWidths?: number[]; // percentage-based widths from HTML
}

export interface ParagraphBlock {
  text: string;
  align?: "left" | "center" | "right" | "justify";
  fontFamily?: string; // extracted from HTML style
  fontSize?: number;   // pt size from HTML style
  lineHeight?: number; // line-height value (e.g. 1.5, 2.0)
  marginLeft?: number; // margin-left in px from HTML style
  textIndent?: number; // text-indent in px from HTML style (first-line only)
  paddingRight?: number; // margin-right / padding-right in px (ruler right indent)
  type?: "text" | "image" | "table";
  src?: string; // base64 data URI for images
  htmlContent?: string; // original inner HTML for rich segment parsing
  tableData?: TableData; // parsed table data
}

// Convert HTML to structured blocks preserving alignment and font-family
function stripSuggestionMarks(html: string): string {
  // Remove <span data-suggestion-id="..." ...>content</span> keeping inner content
  return html.replace(/<span[^>]*\bdata-suggestion-id\b[^>]*>([\s\S]*?)<\/span>/gi, "$1");
}

export function htmlToStructuredBlocks(html: string): ParagraphBlock[] {
  if (!html) return [];
  html = stripSuggestionMarks(html);
  const blocks: ParagraphBlock[] = [];

  // Extract <img> tags first, replacing with placeholders
  interface ExtractedImage { placeholder: string; src: string; }
  const extractedImages: ExtractedImage[] = [];
  let imgCounter = 0;
  let processedHtml = html.replace(/<img[^>]*src\s*=\s*["']([^"']+)["'][^>]*\/?>/gi, (_match, src) => {
    const placeholder = `[IMG_${String(imgCounter++).padStart(3, "0")}]`;
    extractedImages.push({ placeholder, src });
    return `<p>${placeholder}</p>`;
  });

  // ─── Extract <table> elements, replacing with placeholders ───
  interface ExtractedTable { placeholder: string; tableData: TableData; }
  const extractedTables: ExtractedTable[] = [];
  let tableCounter = 0;
  processedHtml = processedHtml.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, inner) => {
    const placeholder = `[TABLE_${String(tableCounter++).padStart(3, "0")}]`;
    const rows: TableCell[][] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(inner)) !== null) {
      const cells: TableCell[] = [];
      const cellRegex = /<(t[dh])([^>]*)>([\s\S]*?)<\/\1>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const isHeader = cellMatch[1].toLowerCase() === "th";
        const cellAttrs = cellMatch[2] || "";
        const cellContent = cellMatch[3] || "";
        let cellAlign: TableCell["align"] = undefined;
        const alignMatch = cellAttrs.match(/style\s*=\s*["'][^"']*text-align:\s*(left|center|right)/i);
        if (alignMatch) cellAlign = alignMatch[1].toLowerCase() as TableCell["align"];
        const colSpanMatch = cellAttrs.match(/colspan\s*=\s*["']?(\d+)/i);
        const rowSpanMatch = cellAttrs.match(/rowspan\s*=\s*["']?(\d+)/i);
        const richSegs = parseHtmlToRichSegments(cellContent);
        const cleanText = cellContent.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
        cells.push({
          text: cleanText,
          bold: isHeader,
          align: cellAlign,
          colSpan: colSpanMatch ? parseInt(colSpanMatch[1]) : undefined,
          rowSpan: rowSpanMatch ? parseInt(rowSpanMatch[1]) : undefined,
          richSegments: richSegs.length > 0 ? richSegs : undefined,
        });
      }
      if (cells.length > 0) rows.push(cells);
    }
    let colWidths: number[] | undefined;
    const colgroupMatch = inner.match(/<colgroup>([\s\S]*?)<\/colgroup>/i);
    if (colgroupMatch) {
      const widths: number[] = [];
      const colRegex = /<col[^>]*style\s*=\s*["'][^"']*width:\s*([\d.]+)(%|px)/gi;
      let colMatch;
      while ((colMatch = colRegex.exec(colgroupMatch[1])) !== null) {
        widths.push(parseFloat(colMatch[1]));
      }
      if (widths.length > 0) colWidths = widths;
    }
    extractedTables.push({ placeholder, tableData: { rows, colWidths } });
    return `<p>${placeholder}</p>`;
  });

  // ─── Convert <ul>/<ol> lists into individual <p> blocks BEFORE main parsing ───
  processedHtml = processedHtml.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, inner) => {
    let idx = 1;
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, content: string) => {
      return `<p>${idx++}. ${content.replace(/<[^>]*>/g, "").trim()}</p>`;
    });
  });
  processedHtml = processedHtml.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, inner) => {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    let idx = 0;
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, content: string) => {
      const letter = letters[idx % 26] || String(idx + 1);
      idx++;
      return `<p>${letter}) ${content.replace(/<[^>]*>/g, "").trim()}</p>`;
    });
  });

  // Match block elements with their text-align style
  const blockRegex = /<(h[1-6]|p|div|blockquote)([^>]*)>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(processedHtml)) !== null) {
    // Add any text between blocks
    if (match.index > lastIndex) {
      const between = processedHtml.slice(lastIndex, match.index).replace(/<[^>]*>/g, "").trim();
      if (between) blocks.push({ text: between });
    }

    const attrs = match[2] || "";
    const content = match[3] || "";

    // Extract text-align from style attribute
    let align: ParagraphBlock["align"] = undefined;
    const styleMatch = attrs.match(/style\s*=\s*["'][^"']*text-align:\s*(left|center|right|justify)/i);
    if (styleMatch) {
      align = styleMatch[1].toLowerCase() as ParagraphBlock["align"];
    }

    // Extract font-family from style attribute
    let fontFamily: string | undefined = undefined;
    const fontMatch = attrs.match(/style\s*=\s*["'][^"']*font-family:\s*([^;"']+)/i);
    if (fontMatch) {
      fontFamily = fontMatch[1].trim();
    }

    // Also check for font-family in inner span/strong/em tags
    if (!fontFamily) {
      const innerFontMatch = content.match(/style\s*=\s*["'][^"']*font-family:\s*([^;"']+)/i);
      if (innerFontMatch) {
        fontFamily = innerFontMatch[1].trim();
      }
    }

    // Extract font-size from style
    let fontSize: number | undefined = undefined;
    const fsMatch = attrs.match(/style\s*=\s*["'][^"']*font-size:\s*([\d.]+)(pt|px)/i);
    if (fsMatch) {
      fontSize = parseFloat(fsMatch[1]);
      if (fsMatch[2].toLowerCase() === "px") fontSize *= 0.75; // px to pt
    }
    if (!fontSize) {
      const innerFsMatch = content.match(/style\s*=\s*["'][^"']*font-size:\s*([\d.]+)(pt|px)/i);
      if (innerFsMatch) {
        fontSize = parseFloat(innerFsMatch[1]);
        if (innerFsMatch[2].toLowerCase() === "px") fontSize *= 0.75;
      }
    }

    // Extract line-height from style
    let lineHeight: number | undefined = undefined;
    const lhMatch = attrs.match(/style\s*=\s*["'][^"']*line-height:\s*([\d.]+)/i);
    if (lhMatch) {
      lineHeight = parseFloat(lhMatch[1]);
    }

    // Extract margin-left from style (for indentation)
    let marginLeft: number | undefined = undefined;
    const mlMatch = attrs.match(/style\s*=\s*["'][^"']*margin-left:\s*(-?[\d.]+)(px|cm|mm|pt)/i);
    if (mlMatch) {
      let val = parseFloat(mlMatch[1]);
      const unit = mlMatch[2].toLowerCase();
      if (unit === "cm") val = val * 37.8;
      else if (unit === "mm") val = val * 3.78;
      else if (unit === "pt") val = val * 1.333;
      marginLeft = val;
    }
    // Also check padding-left as alternative source (some DOCX converters use it)
    if (marginLeft === undefined) {
      const plMatch = attrs.match(/style\s*=\s*["'][^"']*padding-left:\s*(-?[\d.]+)(px|cm|mm|pt)/i);
      if (plMatch) {
        let val = parseFloat(plMatch[1]);
        const unit = plMatch[2].toLowerCase();
        if (unit === "cm") val = val * 37.8;
        else if (unit === "mm") val = val * 3.78;
        else if (unit === "pt") val = val * 1.333;
        marginLeft = val;
      }
    }

    // Extract text-indent from style (first-line indent from DOCX)
    let textIndent: number | undefined = undefined;
    const tiMatch = attrs.match(/style\s*=\s*["'][^"']*text-indent:\s*(-?[\d.]+)(px|cm|mm|pt)/i);
    if (tiMatch) {
      let val = parseFloat(tiMatch[1]);
      const unit = tiMatch[2].toLowerCase();
      if (unit === "cm") val = val * 37.8;
      else if (unit === "mm") val = val * 3.78;
      else if (unit === "pt") val = val * 1.333;
      textIndent = val;
    }
    // Extract margin-right (or legacy padding-right) from style (ruler right indent)
    let paddingRight: number | undefined = undefined;
    const prMatch = attrs.match(/style\s*=\s*["'][^"']*(?:margin-right|padding-right):\s*(-?[\d.]+)(px|cm|mm|pt)/i);
    if (prMatch) {
      let val = parseFloat(prMatch[1]);
      const unit = prMatch[2].toLowerCase();
      if (unit === "cm") val = val * 37.8;
      else if (unit === "mm") val = val * 3.78;
      else if (unit === "pt") val = val * 1.333;
      paddingRight = val;
    }

    // Check if this block is an image placeholder
    const imgPlaceholderMatch = content.trim().match(/^\[IMG_(\d{3})\]$/);
    if (imgPlaceholderMatch) {
      const img = extractedImages.find((i) => i.placeholder === content.trim());
      if (img) {
        blocks.push({ text: img.placeholder, type: "image", src: img.src });
        lastIndex = match.index + match[0].length;
        continue;
      }
    }

    // Check if this block is a table placeholder
    const tablePlaceholderMatch = content.trim().match(/^\[TABLE_(\d{3})\]$/);
    if (tablePlaceholderMatch) {
      const tbl = extractedTables.find((t) => t.placeholder === content.trim());
      if (tbl) {
        blocks.push({ text: tbl.placeholder, type: "table", tableData: tbl.tableData });
        lastIndex = match.index + match[0].length;
        continue;
      }
    }

    // Clean inner HTML — formatting comes from richSegs (htmlContent), not markdown markers
    let text = content;
    text = text.replace(/<br\s*\/?>/gi, "\n");
    // Do NOT convert <strong>/<em> to ** / * markers — rich segments handle formatting
    text = text.replace(/<[^>]*>/g, "");
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.trim();

    // Store original inner HTML for rich parsing
    const rawHtmlContent = content.trim();

    // Keep empty blocks — they represent intentional spacing from the editor
    blocks.push({ text, align, fontFamily, fontSize, lineHeight, marginLeft, textIndent, paddingRight, htmlContent: rawHtmlContent });

    lastIndex = match.index + match[0].length;
  }

  // Add trailing unmatched text (content outside block tags)
  if (lastIndex < processedHtml.length) {
    const trailing = processedHtml.slice(lastIndex).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    if (trailing) blocks.push({ text: trailing });
  }

  // If no blocks found (plain text or markdown), fall back to old method
  if (blocks.length === 0) {
    const fallbackText = htmlToStructuredTextFallback(html);
    if (fallbackText) return [{ text: fallbackText }];
    // Ultimate fallback: strip ALL tags and use raw text
    const rawText = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    if (rawText) return [{ text: rawText }];
    return [];
  }

  return blocks;
}

// Fallback: Convert HTML to structured plain text preserving headings & paragraphs
function htmlToStructuredTextFallback(html: string): string {
  if (!html) return "";
  let text = html;
  // Convert table cells to tab-separated values before stripping
  text = text.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi, "$1\t");
  text = text.replace(/<\/tr>/gi, "\n");
  text = text.replace(/<\/?(?:table|thead|tbody)[^>]*>/gi, "\n");
  // Add double newlines before/after block elements to preserve structure
  text = text.replace(/<\/(h[1-6]|p|div|li|blockquote|section|article)>/gi, "\n\n");
  text = text.replace(/<(h[1-6]|p|div|blockquote|section|article)[^>]*>/gi, "");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "");
  text = text.replace(/<\/?(?:ul|ol|tr)[^>]*>/gi, "\n");
  text = text.replace(/<hr\s*\/?>/gi, "\n\n");
  // Convert bold/italic to markdown markers before stripping tags
  text = text.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**");
  text = text.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
  // Strip remaining tags
  text = text.replace(/<[^>]*>/g, "");
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  // Collapse excessive newlines
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function htmlToStructuredText(html: string): string {
  return htmlToStructuredTextFallback(html);
}

export function cleanText(content: string): string {
  let text = htmlToStructuredText(content);
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^#{1,6}(?=[A-ZÀ-Ú])/gm, "");
  text = text.replace(/\*{3}([^*]+)\*{3}/g, "**$1**");
  text = text.replace(/~~([^~]+)~~/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/^[-*]{3,}\s*$/gm, "");
  text = text.replace(/^[\s]*[-*+]\s+(?![a-z]\))/gm, "");
  text = text.replace(/\s*\[fonte:\s*[^\]]*\]/gi, "");
  text = text.replace(/\s*\(fonte:\s*[^)]*\)/gi, "");
  text = text.replace(/^(Fonte|Font|Espaçamento|Margem|Recuo|Alinhamento):?\s*.+$/gim, "");
  text = text.replace(/\n(_{3,})/g, "\n\n$1");
  text = text.replace(/(_{3,})\n/g, "$1\n\n");
  text = text.replace(/;\s*([a-z]\)\s)/g, ";\n\n$1");
  text = text.replace(/\.\s+([a-z]\)\s)/g, ".\n\n$1");
  text = text.replace(/([^\n])\n([^\n])/g, (_, before, after) => {
    if (/^[a-z]\)/.test(after.trim())) return `${before}\n\n${after}`;
    if (/[A-ZÀ-Ú0-9\-—_(]/.test(after)) return `${before}\n\n${after}`;
    if (/[.:;]$/.test(before.trim())) return `${before}\n\n${after}`;
    return `${before} ${after}`;
  });
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}
