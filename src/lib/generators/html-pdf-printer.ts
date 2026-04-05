/**
 * html-pdf-printer.ts — PDF generation via server-side rendering (WeasyPrint)
 * and browser print dialog fallback.
 * Server-side: HTML → WeasyPrint on HF Space → PDF blob download
 * Fallback: HTML → browser print dialog → user saves as PDF
 */

import { fetchEscritorioConfig, loadLetterheadImage, isBrandedDocument, type EscritorioConfig } from "./pdf-generator";
import {
  BRANDED_FOOTER_HEIGHT_MM,
  BRANDED_MARGIN_BOTTOM_MM,
} from "@/components/dashboard/editor/pageConstants";

interface PrintPDFOptions {
  content: string;
  watermark?: string;
  documentType?: string;
  forceLetterhead?: boolean;
  customMarginTop?: number;
  customMarginBottom?: number;
  /** Ruler: left indent in px */
  rulerLeftIndent?: number;
  /** Ruler: first-line indent in px (text-indent) */
  rulerFirstLineIndent?: number;
  /** Ruler: right indent in px */
  rulerRightIndent?: number;
}

/**
 * Build the full HTML document for printing with ABNT formatting.
 */
function buildPrintHTML(
  content: string,
  config: EscritorioConfig,
  letterheadBase64: string | null,
  branded: boolean,
  watermark?: string,
  customMarginTop?: number,
  customMarginBottom?: number,
  rulerLeftIndent?: number,
  rulerFirstLineIndent?: number,
  rulerRightIndent?: number
): string {
  const mTop = customMarginTop ?? 25;
  const mBottom = customMarginBottom ?? 20;

  const watermarkCSS = watermark && watermark !== "none" ? `
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 60pt;
      font-weight: bold;
      color: rgba(200, 200, 200, 0.15);
      font-family: "Times New Roman", Times, serif;
      pointer-events: none;
      z-index: 0;
      white-space: nowrap;
    }
  ` : "";

  const watermarkLabels: Record<string, string> = {
    confidencial: "CONFIDENCIAL",
    rascunho: "RASCUNHO",
    oficial: "OFICIAL",
  };
  const watermarkHTML = watermark && watermark !== "none" && watermarkLabels[watermark]
    ? `<div class="watermark">${watermarkLabels[watermark]}</div>`
    : "";

  /* For branded (letterhead) documents:
   * The footer zone is 20mm high, filling the entire bottom margin.
   * @page bottom margin = 20mm prevents content overlap with footer.
   */
  const topMargin = customMarginTop ?? 25;
  // Bottom margin must match --m-bottom: 20mm for WYSIWYG consistency
  const bottomMargin = customMarginBottom ?? 20;

  const footerBg = "rgb(236, 232, 225)";
  const footerBorder = "0.8mm solid rgb(160, 130, 70)";

  const SIDE_MM = 20;

  const letterheadCSS = branded ? `
    /* ── Print / WeasyPrint: fixed + negative offsets ── */
    @page {
      size: A4;
      margin: ${topMargin}mm ${SIDE_MM}mm ${bottomMargin}mm ${SIDE_MM}mm;

      @bottom-right {
        content: "Página " counter(page) " de " counter(pages);
        font-family: "Times New Roman", Times, serif;
        font-size: 8pt;
        color: rgb(107, 92, 62);
        vertical-align: middle;
      }
    }
    /* Disable WeasyPrint Pyphen hyphenation */
    * {
      hyphens: none !important;
      -webkit-hyphens: none !important;
    }
    .a4-page {
      position: relative;
      width: 100%;
      max-width: 210mm;
      background: white;
    }
    .page-content {
      position: relative;
      z-index: 1;
    }
    .letterhead-bg {
      position: fixed;
      top: -${topMargin}mm;
      left: -${SIDE_MM}mm;
      width: 210mm;
      height: ${topMargin}mm;
      z-index: -1;
      pointer-events: none;
      object-fit: cover;
      object-position: top;
    }
    .footer-bg-bar {
      position: fixed;
      bottom: -${bottomMargin}mm;
      left: -${SIDE_MM}mm;
      width: 210mm;
      height: ${bottomMargin}mm;
      background: ${footerBg};
      border-top: ${footerBorder};
      z-index: 0;
      pointer-events: none;
    }
    .branded-footer {
      position: fixed;
      bottom: -${bottomMargin}mm;
      left: -${SIDE_MM}mm;
      width: 210mm;
      height: ${bottomMargin}mm;
      z-index: 2;
      pointer-events: none;
      font-family: "Times New Roman", Times, serif;
      text-align: center;
      overflow: hidden;
      box-sizing: border-box;
    }
    .branded-footer .name-line,
    .branded-footer .contact-line,
    .branded-footer .address-line {
      position: absolute;
      left: 10mm;
      right: 10mm;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.1;
    }
    .branded-footer .name-line {
      top: 3.0mm;
      font-size: 9pt;
      font-weight: bold;
      color: rgb(30, 20, 10);
      letter-spacing: 0.3px;
    }
    .branded-footer .contact-line {
      top: 8.6mm;
      font-size: 8pt;
      color: rgb(107, 92, 62);
    }
    .branded-footer .address-line {
      top: 13.1mm;
      font-size: 8pt;
      color: rgb(139, 122, 94);
    }
  ` : `
    @page {
      size: A4;
      margin: ${mTop}mm ${SIDE_MM}mm ${mBottom}mm ${SIDE_MM}mm;

      @bottom-right {
        content: "Página " counter(page) " de " counter(pages);
        font-family: "Times New Roman", Times, serif;
        font-size: 8pt;
        color: #999;
        vertical-align: middle;
      }
    }
    * {
      hyphens: none !important;
      -webkit-hyphens: none !important;
    }
    .a4-page {
      position: relative;
      width: 100%;
      max-width: 210mm;
      background: white;
    }
    .page-content {
      position: relative;
    }
  `;

  const letterheadHTML = branded && letterheadBase64
    ? `<img class="letterhead-bg" src="${letterheadBase64}" />`
    : "";

  // Full-width beige bar (visual background, position:fixed = repeats every page)
  // Only show footer background and content if the attorney has configured their info
  const hasFooterContent = !!(config.nome_escritorio || config.oab || config.timbre_contatos || config.telefone || config.email_contato);
  const footerBgHTML = branded && hasFooterContent ? `<div class="footer-bg-bar"></div>` : "";

  // Build footer lines dynamically from config fields
  const footerContactParts = [config.telefone, config.email_contato, config.website].filter(Boolean);
  const footerContactLine = config.timbre_contatos || footerContactParts.join("  |  ");
  const footerAddressLine = config.endereco || config.timbre_endereco || "";

  // Name line: only show separator if both parts exist
  const nameParts = [config.nome_escritorio, config.oab].filter(Boolean);
  const nameLineContent = nameParts.join(" | ");

  const footerHTML = branded && hasFooterContent ? `
    <div class="branded-footer">
      ${nameLineContent ? `<div class="name-line">${nameLineContent}</div>` : ""}
      ${footerContactLine ? `<div class="contact-line">${footerContactLine}</div>` : ""}
      ${footerAddressLine ? `<div class="address-line">${footerAddressLine}</div>` : ""}
    </div>
  ` : "";

  /* ──────────────────────────────────────────────────────────────
   * CSS below is a 1:1 copy of the editor styles from index.css
   * (.editor-canvas-a4 .ProseMirror) so the PDF matches exactly.
   * ────────────────────────────────────────────────────────────── */
  // Sanitize content to prevent XSS in generated PDFs
  const sanitizedContent = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Documento Jurídico</title>
  <style>
    ${letterheadCSS}
    ${watermarkCSS}

    /* Reset — exact match with editor rendering */
    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* ── Base: exact copy of .editor-canvas-a4 .ProseMirror ── */
    body {
      font-family: "Times New Roman", "Times", serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #1a1a1a;
      text-align: justify;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow-wrap: break-word;
      word-wrap: break-word;
      word-break: normal;
      hyphens: none;
      -webkit-hyphens: none;
    }

    /* ─────────────────────────────────────────────────────────
     * CRITICAL: TipTap inline styles on <span> elements.
     * TipTap applies font-family, font-size, color, background
     * via <span style="...">. We must NOT override these with
     * higher-specificity CSS. Use low-specificity defaults.
     * ───────────────────────────────────────────────────────── */

    /* Ensure all inline styles from TipTap spans are preserved */
    .document-body span[style] {
      /* Inline styles have highest specificity — this just ensures
         the span elements aren't collapsed or hidden */
      display: inline;
    }

    /* Font family changes from toolbar */
    .document-body span[style*="font-family"] {
      font-family: inherit; /* Let inline style win */
    }

    /* ── Paragraphs: ruler-aware indents ── */
    .document-body p {
      color: #1a1a1a;
      font-size: 12pt;
      text-indent: ${rulerFirstLineIndent != null ? `${(rulerFirstLineIndent / 3.7795).toFixed(1)}mm` : "12.5mm"};
      text-align: justify;
      line-height: 1.5;
      margin: 0;
      margin-bottom: 0.5mm;
      padding: 0;
      ${rulerLeftIndent != null && rulerLeftIndent > 0 ? `margin-left: ${(rulerLeftIndent / 3.7795).toFixed(1)}mm;` : ""}
      ${rulerRightIndent != null && rulerRightIndent > 0 ? `margin-right: ${(rulerRightIndent / 3.7795).toFixed(1)}mm;` : ""}
      orphans: 2;
      widows: 2;
    }

    /* Paragraphs with inline font-size/font-family from TipTap — don't override */
    .document-body p[style*="font-size"] {
      font-size: unset; /* Let inline style win */
    }
    .document-body p[style*="font-family"] {
      font-family: unset;
    }

    /* Empty paragraphs (line breaks) — preserve height like editor */
    .document-body p:empty, .document-body p br:only-child {
      min-height: 1.5em;
    }
    .document-body p br {
      display: block;
      content: "";
    }

    /* Remove indent for first paragraph after heading */
    .document-body h1 + p, .document-body h2 + p, .document-body h3 + p {
      text-indent: 0;
    }

    /* ── Respect inline text-align from TipTap toolbar ── */
    .document-body p[style*="text-align: left"],
    .document-body p[style*="text-align:left"] { text-align: left !important; }
    .document-body p[style*="text-align: center"],
    .document-body p[style*="text-align:center"] { text-align: center !important; text-indent: 0 !important; }
    .document-body p[style*="text-align: right"],
    .document-body p[style*="text-align:right"] { text-align: right !important; text-indent: 0 !important; }

    /* ── Headings: exact copy of .editor-canvas-a4 .ProseMirror h1/h2/h3 ── */
    h1, h2, h3, h4, h5, h6 {
      color: #1a1a1a;
      font-weight: 700;
      text-align: center;
      text-indent: 0;
      margin-top: 1.5em;
      margin-bottom: 0.8em;
      line-height: 1.5;
      page-break-after: avoid;
      break-after: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    h1 {
      font-size: 14pt;
      text-transform: uppercase;
    }
    h2 {
      font-size: 13pt;
    }
    h3 {
      font-size: 12pt;
    }

    /* Headings with inline overrides from toolbar */
    h1[style*="text-align: left"], h1[style*="text-align:left"],
    h2[style*="text-align: left"], h2[style*="text-align:left"],
    h3[style*="text-align: left"], h3[style*="text-align:left"] {
      text-align: left !important;
    }
    h1[style*="text-align: right"], h1[style*="text-align:right"],
    h2[style*="text-align: right"], h2[style*="text-align:right"],
    h3[style*="text-align: right"], h3[style*="text-align:right"] {
      text-align: right !important;
    }

    /* ── Lists: exact copy of editor ── */
    ul, ol {
      padding-left: 1.5em;
      margin-bottom: 0.5em;
      font-size: 12pt;
      line-height: 1.5;
    }
    li {
      color: #1a1a1a;
      text-indent: 0;
      line-height: 1.5;
    }
    li p {
      text-indent: 0;
      margin-bottom: 0;
    }

    /* ── Blockquotes — ABNT: exact copy of editor ── */
    blockquote {
      margin-left: 4cm;
      margin-right: 0;
      padding: 0;
      border: none;
      border-left: none;
      font-size: 10pt;
      line-height: 1.0;
      text-indent: 0;
      color: #1a1a1a;
    }
    blockquote p {
      text-indent: 0;
      font-size: 10pt;
      line-height: 1.0;
      margin-bottom: 0;
    }

    /* ── Tables: exact copy of editor ── */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
      table-layout: fixed;
      font-size: 12pt;
    }
    td, th {
      border: 1px solid #999;
      padding: 6px 8px;
      vertical-align: top;
      min-width: 60px;
      color: #1a1a1a;
      text-indent: 0;
      text-align: left;
      line-height: 1.5;
    }
    td p, th p {
      text-indent: 0;
      margin: 0;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: 700;
    }

    /* ── Images ── */
    img:not(.letterhead-bg) {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0.5rem auto;
    }

    /* ── Inline styles: keep consistent ── */
    strong { color: inherit; font-weight: 700; }
    em { font-style: italic; }
    u { text-decoration: underline; }
    s { text-decoration: line-through; }
    sub { vertical-align: sub; font-size: 0.8em; }
    sup { vertical-align: super; font-size: 0.8em; }
    mark { background-color: #FEF08A; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* ── Highlight colors from TipTap ── */
    mark[data-color], span[data-highlight], span[style*="background-color"] {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Color from TipTap Color extension ── */
    span[style*="color:"], span[style*="color :"] {
      color: inherit; /* inline wins, this is just a safety net */
    }

    /* ── Code Blocks ── */
    pre {
      background: #f8f9fa;
      border: 1px solid #e2e4e8;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 0.5em 0;
      overflow-x: auto;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a1a;
      text-indent: 0;
      text-align: left;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    pre code {
      background: none;
      padding: 0;
      font-family: inherit;
      font-size: inherit;
      color: inherit;
    }

    /* ── Horizontal rule ── */
    hr {
      border: none;
      border-top: 1px solid #ccc;
      margin: 1em 0;
    }

    /* ── Forced page breaks from editor pagination ── */
    .forced-page-break {
      display: block;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      page-break-before: always;
      break-before: page;
    }

    /* ── Stamp / Timbre — z-index layering, fixed DPI ── */
    .stamp-container,
    .document-stamp {
      position: absolute;
      top: 25mm;
      right: 20mm;
      z-index: 100;
      pointer-events: none;
      width: 40mm;
    }
    .stamp-container img,
    .document-stamp img {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      max-width: 60mm;
      width: 100%;
      height: auto;
    }

    /* ── TipTap specific: remove spacer/decoration artifacts ── */
    .page-break-spacer { display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important; }
    .ProseMirror-separator { display: none !important; }

    /* ── Avoid orphan headings without creating large blank areas ── */
    h1 + p, h2 + p, h3 + p, h4 + p {
      page-break-before: auto;
      break-before: auto;
    }

    /* ── Avoid large gaps at top of pages 2+ ── */
    .page-content > *:first-child {
      margin-top: 0;
    }

    /* ── Screen: preview in iframe — scale .a4-page, not body ── */
    @media screen {
      html {
        background: #e5e5e5;
        overflow-y: auto;
        overflow-x: hidden;
      }
      body {
        margin: 0;
        padding: 0;
        background: transparent;
      }
      .a4-page {
        width: 210mm;
        margin: 30px auto;
        box-shadow: 0 2px 16px rgba(0,0,0,0.15);
        overflow: hidden;
      }
      /* On screen, position:fixed doesn't repeat — convert to absolute relative to .a4-page */
      .letterhead-bg {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 210mm !important;
        height: auto !important;
        max-height: ${topMargin}mm;
        z-index: 0 !important;
        object-fit: cover;
        object-position: top;
      }
      .footer-bg-bar {
        position: absolute !important;
        bottom: 0 !important;
        top: auto !important;
        left: 0 !important;
        width: 210mm !important;
        overflow: hidden;
      }
      .branded-footer {
        position: absolute !important;
        bottom: 0 !important;
        top: auto !important;
        left: 0 !important;
        width: 210mm !important;
        overflow: hidden;
      }
      .watermark {
        position: absolute !important;
      }
      .stamp-container {
        position: absolute;
        top: ${branded ? topMargin : mTop}mm;
        right: 20mm;
        z-index: 10;
        pointer-events: none;
      }
      .stamp-container img {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
        max-width: 60mm;
        width: auto;
        height: auto;
      }
      .page-content {
        position: relative;
        z-index: 1;
        padding: ${branded ? topMargin : mTop}mm 20mm ${branded ? bottomMargin : mBottom}mm 20mm;
        min-height: 297mm;
      }
    }

    /* ── Print ── */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .a4-page { transform: none !important; margin: 0; box-shadow: none; }
      .no-print { display: none !important; }
    }
  </style>
  <script>
    // Auto-scale .a4-page wrapper to fit iframe width (not body)
    (function() {
      function fit() {
        var vw = window.innerWidth;
        var page = document.querySelector('.a4-page');
        if (!page) return;
        var pageW = page.offsetWidth;
        if (pageW > vw && pageW > 0) {
          var s = vw / pageW;
          page.style.transform = 'scale(' + s + ')';
          page.style.transformOrigin = 'top left';
          document.documentElement.style.height = (page.scrollHeight * s) + 'px';
          document.documentElement.style.overflowY = 'auto';
          document.documentElement.style.overflowX = 'hidden';
        }
      }
      window.addEventListener('load', fit);
      window.addEventListener('resize', fit);
    })();
  </script>
</head>
<body>
  <div class="a4-page">
    ${letterheadHTML}
    ${footerBgHTML}
    ${watermarkHTML}
    ${footerHTML}
    <div class="page-content document-body">
      ${sanitizedContent}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Download PDF via browser print dialog.
 * Opens the print dialog with the document rendered exactly as the editor shows it.
 */
export async function printHTMLAsPDF(options: PrintPDFOptions): Promise<void> {
  const branded = options.forceLetterhead || isBrandedDocument(options.documentType);

  const [letterheadBase64, config] = await Promise.all([
    branded ? loadLetterheadImage() : Promise.resolve(null),
    fetchEscritorioConfig()
  ]);

  const html = buildPrintHTML(
    options.content,
    config,
    letterheadBase64,
    branded,
    options.watermark,
    options.customMarginTop,
    options.customMarginBottom,
    options.rulerLeftIndent,
    options.rulerFirstLineIndent,
    options.rulerRightIndent
  );

  // Create a hidden iframe for printing
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-10000px";
  iframe.style.left = "-10000px";
  iframe.style.width = "210mm";
  iframe.style.height = "297mm";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error("Não foi possível criar o iframe para impressão");
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for content to render (including images)
  await new Promise<void>((resolve) => {
    const checkReady = () => {
      const images = iframeDoc.querySelectorAll("img");
      const allLoaded = Array.from(images).every((img) => img.complete);
      if (allLoaded) {
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };
    // Give a minimum render time
    setTimeout(checkReady, 300);
  });

  // Trigger print dialog — user selects "Save as PDF"
  iframe.contentWindow?.print();

  // Clean up after a delay (user needs time to interact with print dialog)
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 60000);
}

/**
 * Last-resort fallback: extract text from HTML and create a basic PDF with jsPDF.
 * Only used when server is down AND we need a blob (e.g., for storage upload).
 */
async function generatePDFBlobFallback(html: string): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");

  const tempDiv = document.createElement("div");
  tempDiv.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;";
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  tempDiv.innerHTML = bodyMatch ? bodyMatch[1] : html;
  document.body.appendChild(tempDiv);

  const textContent = tempDiv.innerText || "";
  document.body.removeChild(tempDiv);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 25;
  const usableWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("times", "normal");
  doc.setFontSize(12);

  const lines = doc.splitTextToSize(textContent, usableWidth);
  let y = margin;

  for (const line of lines) {
    if (y + 6 > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 6;
  }

  return doc.output("blob");
}

async function requestPDFBlobFromServer(html: string): Promise<Blob> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No session");

  const { data, error } = await supabase.functions.invoke("generate-pdf", {
    body: { html },
  });
  if (error) throw error;
  if (!data?.pdfBase64) throw new Error("No PDF data returned");

  const binaryStr = atob(data.pdfBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: "application/pdf" });
}

export async function generateHTMLPDFBlob(options: PrintPDFOptions): Promise<Blob> {
  const branded = options.forceLetterhead || isBrandedDocument(options.documentType);

  const [letterheadBase64, config] = await Promise.all([
    branded ? loadLetterheadImage() : Promise.resolve(null),
    fetchEscritorioConfig()
  ]);

  const html = buildPrintHTML(
    options.content,
    config,
    letterheadBase64,
    branded,
    options.watermark,
    options.customMarginTop,
    options.customMarginBottom,
    options.rulerLeftIndent,
    options.rulerFirstLineIndent,
    options.rulerRightIndent
  );

  // Try server-side WeasyPrint first (best quality with letterhead/footer)
  try {
    return await requestPDFBlobFromServer(html);
  } catch (serverErr) {
    console.warn("[PDF] Server unavailable, using jsPDF fallback:", serverErr);
    return await generatePDFBlobFallback(html);
  }
}

/**
 * Download PDF — tries server-side WeasyPrint first (with letterhead/footer).
 * If server is down, falls back to browser print dialog which correctly
 * renders @page CSS, position:fixed headers/footers.
 */
export async function downloadHTMLAsPDF(options: PrintPDFOptions & { fileName?: string }): Promise<void> {
  const fileName = options.fileName || "documento.pdf";

  try {
    const blob = await generateHTMLPDFBlob(options);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.warn("[PDF] Download failed, falling back to print dialog:", err);
    const { toast } = await import("@/hooks/use-toast");
    toast({
      title: "Servidor de PDF indisponível",
      description: "Selecione 'Salvar como PDF' na impressora para baixar.",
      duration: 8000,
    });
    await printHTMLAsPDF(options);
  }
}

/**
 * Generate a preview URL for the document.
 * Uses server-side PDF generation (WeasyPrint) so the preview is the ACTUAL PDF
 * — exactly what the user will download. Falls back to HTML preview if server unavailable.
 */
export async function generatePrintPreviewURL(options: PrintPDFOptions): Promise<string> {
  try {
    const blob = await generateHTMLPDFBlob(options);
    return URL.createObjectURL(blob);
  } catch (err) {
    // Fallback: generate HTML blob preview
    const branded = options.forceLetterhead || isBrandedDocument(options.documentType);
    const [letterheadBase64, config] = await Promise.all([
      branded ? loadLetterheadImage() : Promise.resolve(null),
      fetchEscritorioConfig()
    ]);
    const html = buildPrintHTML(
      options.content,
      config,
      letterheadBase64,
      branded,
      options.watermark,
      options.customMarginTop,
      options.customMarginBottom
    );
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    return URL.createObjectURL(blob);
  }
}
