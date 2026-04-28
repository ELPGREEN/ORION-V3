/**
 * docx-generator.ts
 * Professional DOCX export engine with full formatting preservation:
 * - Letterhead logo (base64 embedded)
 * - Branded vs official document detection
 * - Escritorio config header/footer
 * - Word-compatible watermarks (rotated text, not CSS position:fixed)
 * - ABNT formatting (font, spacing, indents, alignment)
 * - Ruler settings integration
 */

import {
  fetchEscritorioConfig,
  loadLetterheadImage,
  isBrandedDocument,
  defaultEscritorioConfig,
  type EscritorioConfig,
} from "./pdf-generator";
import { getDocumentFormatConfig, type DocumentFormatConfig } from "@/lib/templates";
import { sanitizeStorageFileName } from "@/lib/utils";
import { toDocx } from "docshift";

export interface DocxExportOptions {
  /** Editor HTML content */
  content: string;
  /** Watermark setting from formData: "none" | "rascunho" | "confidencial" | "oficial" */
  watermark?: string;
  /** Document type id (e.g. "contrato-servicos") */
  documentType?: string;
  /** Document category (e.g. "contrato", "penal") */
  documentCategory?: string;
  /** Display label for file name */
  documentLabel?: string;
  /** Whether letterhead is forced on */
  forceLetterhead?: boolean;
  /** Ruler: left indent in px */
  rulerLeftIndent?: number;
  /** Ruler: first-line indent in px */
  rulerFirstLineIndent?: number;
  /** Ruler: right indent in px */
  rulerRightIndent?: number;
}

// Convert px to mm (editor A4 at 96dpi: 1px ≈ 0.2646mm)
function pxToMm(px: number): number {
  return Math.round(px * 0.2646 * 10) / 10;
}

function resolveWatermarkText(watermark?: string): string {
  if (!watermark || watermark === "none") return "";
  switch (watermark) {
    case "rascunho": return "RASCUNHO";
    case "confidencial": return "CONFIDENCIAL";
    case "oficial": return "OFICIAL";
    default: return "";
  }
}

function buildHeaderHtml(config: EscritorioConfig, logoBase64: string | null): string {
  const logoImg = logoBase64
    ? `<img src="${logoBase64}" style="max-height:60px; margin-bottom:8px; display:block; margin-left:auto; margin-right:auto;" />`
    : "";

  return `
    <div style="text-align:center; border-bottom:2px solid #d4a418; padding-bottom:12px; margin-bottom:24px;">
      ${logoImg}
      <div style="font-family:'Times New Roman',serif; font-size:14pt; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">
        ${config.nome_escritorio || ""}
      </div>
      ${config.oab ? `<div style="font-family:'Times New Roman',serif; font-size:10pt; color:#555;">${config.oab}</div>` : ""}
      ${config.timbre_endereco
        ? `<div style="font-family:'Times New Roman',serif; font-size:9pt; color:#777;">${config.timbre_endereco}</div>`
        : config.endereco
          ? `<div style="font-family:'Times New Roman',serif; font-size:9pt; color:#777;">${config.endereco}</div>`
          : ""
      }
    </div>`;
}

function buildFooterHtml(config: EscritorioConfig): string {
  const contactLine = config.timbre_contatos
    || [config.telefone, config.email_contato, config.website].filter(Boolean).join(" · ");

  return `
    <div style="border-top:1px solid #d4a418; margin-top:40px; padding-top:10px; text-align:center; font-family:'Times New Roman',serif; font-size:8pt; color:#888;">
      ${contactLine}
      ${config.endereco ? `<br/>${config.endereco}` : ""}
    </div>`;
}

/**
 * Word-compatible watermark: repeated rotated text blocks.
 * CSS position:fixed is ignored by Word, so we use visible rotated text
 * with very low opacity in a table-based layout that docshift preserves.
 */
function buildWatermarkHtml(text: string): string {
  if (!text) return "";

  // Use a centered div with transform rotation — docshift converts this to a WordprocessingML text element
  return `
    <div style="text-align:center; margin:40px 0; overflow:hidden; height:100px;">
      <div style="font-family:'Times New Roman',serif; font-size:54pt; color:rgba(0,0,0,0.06); font-weight:bold; text-transform:uppercase; letter-spacing:8px; transform:rotate(-35deg); -webkit-transform:rotate(-35deg); white-space:nowrap;">
        ${text}
      </div>
    </div>`;
}

function buildStyles(format: DocumentFormatConfig, opts: DocxExportOptions): string {
  // Calculate indents: prefer ruler settings over format config
  const leftIndentMm = opts.rulerLeftIndent != null && opts.rulerLeftIndent > 0
    ? pxToMm(opts.rulerLeftIndent)
    : 0;
  const firstLineIndentMm = opts.rulerFirstLineIndent != null
    ? pxToMm(opts.rulerFirstLineIndent)
    : format.rulerFirstLineIndent > 0
      ? pxToMm(format.rulerFirstLineIndent)
      : 12.5; // ABNT default 1.25cm
  const rightIndentMm = opts.rulerRightIndent != null && opts.rulerRightIndent > 0
    ? pxToMm(opts.rulerRightIndent)
    : 0;

  /* Margens jurídicos padrão brasileiro: 3cm esq, 2cm dir/sup/inf */
  return `
    body {
      font-family: '${format.fontFamily}', sans-serif;
      font-size: ${format.fontSize};
      line-height: ${format.lineHeight};
      text-align: ${format.textAlign};
      margin: 20mm 20mm 20mm 30mm;
    }
    p {
      text-indent: ${firstLineIndentMm}mm;
      margin: 0 0 6pt 0;
      ${leftIndentMm > 0 ? `margin-left: ${leftIndentMm}mm;` : ""}
      ${rightIndentMm > 0 ? `margin-right: ${rightIndentMm}mm;` : ""}
    }
    h1 {
      text-align: center;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 14pt;
      margin: 18pt 0 12pt 0;
      text-indent: 0;
    }
    h2 {
      font-weight: bold;
      font-size: 13pt;
      margin: 14pt 0 8pt 0;
      text-indent: 0;
    }
    h3 {
      font-weight: bold;
      font-size: 12pt;
      margin: 12pt 0 6pt 0;
      text-indent: 0;
    }
    blockquote {
      margin-left: 40mm;
      margin-right: 0;
      font-size: 10pt;
      line-height: 1.0;
      padding: 0;
      text-indent: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12pt 0;
    }
    td, th {
      border: 1px solid #333;
      padding: 4pt 6pt;
      font-size: 11pt;
    }
    ul, ol {
      text-indent: 0;
      margin-left: 20mm;
    }
    li {
      text-indent: 0;
    }
  `;
}

/**
 * Generate a professional DOCX blob with full formatting preservation.
 */
export async function generateDocxBlob(opts: DocxExportOptions): Promise<Blob> {
  const format = getDocumentFormatConfig(opts.documentType || "", opts.documentCategory);
  const branded = opts.forceLetterhead || isBrandedDocument(opts.documentType);

  // Fetch config and logo in parallel
  const [config, logoBase64] = await Promise.all([
    fetchEscritorioConfig(),
    branded ? loadLetterheadImage() : Promise.resolve(null),
  ]);

  const watermarkText = resolveWatermarkText(opts.watermark);
  const showWatermark = branded && !!watermarkText;

  const headerHtml = branded ? buildHeaderHtml(config, logoBase64) : "";
  const footerHtml = branded ? buildFooterHtml(config) : "";
  const watermarkHtml = showWatermark ? buildWatermarkHtml(watermarkText) : "";
  const styles = buildStyles(format, opts);

  const fullHtml = `<html><head><meta charset="utf-8"><style>${styles}</style></head><body>
    ${watermarkHtml}
    ${headerHtml}
    <div>${opts.content}</div>
    ${footerHtml}
  </body></html>`;

  return toDocx(fullHtml);
}

/**
 * Generate and trigger download of a DOCX file.
 */
export async function downloadDocx(opts: DocxExportOptions): Promise<{ fileName: string; details: string }> {
  const blob = await generateDocxBlob(opts);

  const label = opts.documentLabel || "documento";
  const fileName = `${sanitizeStorageFileName(label.toLowerCase()).replace(/_/g, "-")}-${new Date().toISOString().slice(0, 10)}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);

  const branded = opts.forceLetterhead || isBrandedDocument(opts.documentType);
  const watermarkText = resolveWatermarkText(opts.watermark);
  const details = [
    branded && "cabeçalho com logo",
    branded && "rodapé",
    branded && !!watermarkText && `marca d'água (${watermarkText})`,
    "estilos ABNT",
  ].filter(Boolean).join(", ");

  return { fileName, details };
}
