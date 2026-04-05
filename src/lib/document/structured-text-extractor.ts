/**
 * structured-text-extractor.ts
 * Extracts text from HTML while preserving structural markers:
 * - Headings → [TÍTULO], [SUBTÍTULO], [SEÇÃO]
 * - Bold/Strong → **text**
 * - Italic → _text_
 * - Alignment → (centralizado), (justificado), (direita)
 * - Indentation → preserved via markers
 * - Lists → numbered/bulleted
 * - Blockquotes → > quoted text
 * - Tables → | col1 | col2 |
 *
 * This structured text is better for AI prompts than plain text
 * because it preserves document hierarchy and emphasis.
 */

/**
 * Convert HTML to structured text preserving formatting markers.
 */
export function htmlToStructuredText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  const lines: string[] = [];

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const style = el.getAttribute("style") || "";
    const children = Array.from(el.childNodes).map(processNode).join("");

    // Skip empty elements
    if (!children.trim()) return "";

    // Headings
    if (tag === "h1") return `\n[TÍTULO] ${children.trim()}\n`;
    if (tag === "h2") return `\n[SUBTÍTULO] ${children.trim()}\n`;
    if (tag === "h3") return `\n[SEÇÃO] ${children.trim()}\n`;
    if (tag === "h4" || tag === "h5" || tag === "h6") return `\n[SUBSEÇÃO] ${children.trim()}\n`;

    // Bold / Strong
    if (tag === "strong" || tag === "b") return `**${children.trim()}**`;

    // Italic / Emphasis
    if (tag === "em" || tag === "i") return `_${children.trim()}_`;

    // Underline
    if (tag === "u") return `__${children.trim()}__`;

    // Strikethrough
    if (tag === "s" || tag === "del" || tag === "strike") return `~~${children.trim()}~~`;

    // Superscript / Subscript
    if (tag === "sup") return `^${children.trim()}`;
    if (tag === "sub") return `_${children.trim()}`;

    // Blockquote
    if (tag === "blockquote") {
      const quotedLines = children.trim().split("\n").map(l => `> ${l}`).join("\n");
      return `\n${quotedLines}\n`;
    }

    // Lists
    if (tag === "ul" || tag === "ol") {
      return `\n${children}\n`;
    }
    if (tag === "li") {
      const parent = el.parentElement;
      const isOrdered = parent?.tagName.toLowerCase() === "ol";
      const index = Array.from(parent?.children || []).indexOf(el) + 1;
      const bullet = isOrdered ? `${index}.` : "•";
      return `${bullet} ${children.trim()}\n`;
    }

    // Tables
    if (tag === "table") {
      const rows: string[] = [];
      el.querySelectorAll("tr").forEach((tr) => {
        const cells: string[] = [];
        tr.querySelectorAll("td, th").forEach((cell) => {
          cells.push((cell.textContent || "").trim());
        });
        rows.push(`| ${cells.join(" | ")} |`);
      });
      return `\n${rows.join("\n")}\n`;
    }
    if (tag === "tr" || tag === "td" || tag === "th" || tag === "thead" || tag === "tbody") {
      return children; // handled by table
    }

    // Paragraphs — detect alignment and indentation
    if (tag === "p" || tag === "div") {
      const alignment = extractAlignment(style);
      const indent = extractIndent(style);
      const lineSpacing = extractLineSpacing(style);

      const markers: string[] = [];
      if (alignment && alignment !== "justify" && alignment !== "left") {
        markers.push(`(${alignment === "center" ? "centralizado" : alignment === "right" ? "direita" : alignment})`);
      }
      if (indent) markers.push(`[recuo: ${indent}]`);
      if (lineSpacing && lineSpacing !== "1.5") markers.push(`[espaçamento: ${lineSpacing}]`);

      const prefix = markers.length > 0 ? `${markers.join(" ")} ` : "";
      return `${prefix}${children.trim()}\n`;
    }

    // Line break
    if (tag === "br") return "\n";

    // Horizontal rule
    if (tag === "hr") return "\n---\n";

    // Span with styles
    if (tag === "span") {
      // Check for bold via font-weight
      if (/font-weight:\s*(bold|[6-9]\d{2})/i.test(style)) {
        return `**${children.trim()}**`;
      }
      // Check for italic via font-style
      if (/font-style:\s*italic/i.test(style)) {
        return `_${children.trim()}_`;
      }
      return children;
    }

    return children;
  }

  const result = processNode(div);

  // Clean up excessive newlines
  return result
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractAlignment(style: string): string | null {
  const match = style.match(/text-align:\s*(left|center|right|justify)/i);
  return match ? match[1].toLowerCase() : null;
}

function extractIndent(style: string): string | null {
  const textIndent = style.match(/text-indent:\s*([^;]+)/i);
  const marginLeft = style.match(/margin-left:\s*([^;]+)/i);
  if (textIndent && textIndent[1].trim() !== "0" && textIndent[1].trim() !== "0px") {
    return textIndent[1].trim();
  }
  if (marginLeft && marginLeft[1].trim() !== "0" && marginLeft[1].trim() !== "0px") {
    return marginLeft[1].trim();
  }
  return null;
}

function extractLineSpacing(style: string): string | null {
  const match = style.match(/line-height:\s*([^;]+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract structured text from a DOCX file using docshift (with mammoth fallback).
 */
export async function extractStructuredTextFromDocx(file: File): Promise<{ structured: string; plain: string; wordCount: number }> {
  let html = "";
  try {
    const { toHtml } = await import("docshift");
    html = await toHtml(file);
  } catch {
    const mammoth = await import("mammoth");
    const ab = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer: ab });
    html = result.value;
  }

  const structured = htmlToStructuredText(html);
  const div = document.createElement("div");
  div.innerHTML = html;
  const plain = (div.textContent || "").trim();
  const wordCount = plain.split(/\s+/).filter(Boolean).length;

  return { structured, plain, wordCount };
}

/**
 * Extract structured text from a PDF file using pdfjs-dist.
 * Returns null if the PDF appears to be scanned (< 20 words).
 */
export async function extractStructuredTextFromPdf(file: File): Promise<{ structured: string; plain: string; wordCount: number } | null> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const ab = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    const lines: string[] = [];
    let allPlain = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items.filter((it: any) => "str" in it && it.str) as any[];

      if (items.length === 0) continue;

      // Determine dominant font size
      const sizeFreq = new Map<number, number>();
      for (const it of items) {
        const h = Math.round(it.transform[0]);
        sizeFreq.set(h, (sizeFreq.get(h) || 0) + it.str.length);
      }
      let normalSize = 12;
      let maxChars = 0;
      for (const [sz, cnt] of sizeFreq) {
        if (cnt > maxChars) { maxChars = cnt; normalSize = sz; }
      }

      // Group items by Y coordinate (same line)
      type LineGroup = { y: number; items: any[] };
      const lineGroups: LineGroup[] = [];
      for (const it of items) {
        const y = Math.round(it.transform[5]);
        const existing = lineGroups.find(l => Math.abs(l.y - y) < 3);
        if (existing) existing.items.push(it);
        else lineGroups.push({ y, items: [it] });
      }
      lineGroups.sort((a, b) => b.y - a.y);

      for (const line of lineGroups) {
        line.items.sort((a: any, b: any) => a.transform[4] - b.transform[4]);
        const fontSize = Math.round(line.items[0].transform[0]);
        const isBold = line.items.some((it: any) => (it.fontName || "").toLowerCase().includes("bold"));
        const isItalic = line.items.some((it: any) => (it.fontName || "").toLowerCase().includes("italic"));
        const lineText = line.items.map((it: any) => it.str).join(" ").trim();
        if (!lineText) continue;

        allPlain += lineText + "\n";

        const sizeRatio = fontSize / normalSize;
        let prefix = "";
        if (sizeRatio >= 1.6) prefix = "[TÍTULO] ";
        else if (sizeRatio >= 1.3) prefix = "[SUBTÍTULO] ";
        else if (sizeRatio >= 1.1 && isBold) prefix = "[SEÇÃO] ";

        let formattedText = lineText;
        if (isBold && !prefix) formattedText = `**${lineText}**`;
        else if (isItalic) formattedText = `_${lineText}_`;

        lines.push(`${prefix}${formattedText}`);
      }

      if (pageNum < pdf.numPages) {
        lines.push("---");
      }
    }

    const plain = allPlain.trim();
    const wordCount = plain.split(/\s+/).filter(Boolean).length;
    if (wordCount < 20) return null;

    return { structured: lines.join("\n"), plain, wordCount };
  } catch (err) {
    return null;
  }
}
