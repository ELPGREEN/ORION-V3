import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import {
  parseFormattedText,
  parseHtmlToRichSegments,
  normalizeColor,
  hexToRgb,
  htmlToStructuredBlocks,
  cleanText,
} from "./pdf-html-parser";
import type { ParagraphBlock, TableData } from "./pdf-html-parser";
import {
  BRANDED_MARGIN_TOP_MM,
  BRANDED_FOOTER_HEIGHT_MM,
  BRANDED_MARGIN_BOTTOM_MM,
  BRANDED_RESERVED_BOTTOM_MM,
} from "@/components/dashboard/editor/pageConstants";

// ============================================================
// Formatação de Documentos — Margens unificadas
// Papel: A4 (210 x 297 mm)
// Margens: Superior=25mm, Esquerda=20mm, Inferior=20mm, Direita=20mm
// (Alinhadas com as CSS vars em index.css — single source of truth)
// Fonte: Times New Roman ou Arial, 12pt texto geral, 10pt notas/citações
// Espaçamento: 1,5 texto geral (≈7.6mm Word-compat), simples para citações/notas
// Recuo de parágrafo: 12.5mm (1,25 cm) na primeira linha
// Alinhamento: Justificado
// Metadados: Título, Autor, Data de criação (Decreto 10.278)
// ============================================================

// Measurements (mm) — unified with editor CSS vars
// Word "1,5 linhas": single=14.4pt(1.2×12), 1.5=21.6pt(14.4×1.5)=7.62mm
const ABNT = {
  marginTop: 25,          // 25mm superior (matches --m-top: 25mm)
  marginLeft: 20,         // 20mm esquerda (matches --m-left: 20mm)
  marginBottom: 20,       // 20mm inferior (matches --m-bottom: 20mm)
  marginRight: 20,        // 20mm direita (matches --m-right: 20mm)
  fontSize: 12,           // 12pt corpo do texto
  fontSizeSmall: 10,      // 10pt notas/citações
  lineSpacing: 7.6,       // 1,5 linhas Word = 21.6pt = 7.62mm
  lineSpacingSingle: 5,   // simples Word = 14.4pt ≈ 5mm (notas/citações)
  paragraphIndent: 12.5,  // 1,25cm recuo 1ª linha
  citationIndent: 40,     // 4cm recuo citações longas
  paragraphSpacing: 2,    // pequeno espaço extra entre parágrafos
} as const;

// ─── Robust overflow protection constants ───
// Maximum font size (pt) allowed in PDF rendering — prevents absurd sizes from editor
const MAX_PDF_FONT_SIZE = 36;
// Safety margin (mm) subtracted from splitTextToSize width when rich segments are present
// Bold glyphs are ~5-10% wider than normal — 2mm margin compensates without over-shrinking
const SPLIT_SAFETY_MARGIN = 2;

// ─── Font Mapping: Editor fonts → jsPDF native fonts ───
// jsPDF supports only 3 built-in fonts: times, helvetica, courier
const FONT_MAP: Record<string, string> = {
  "times new roman": "times",
  "times": "times",
  "arial": "helvetica",
  "helvetica": "helvetica",
  "courier new": "courier",
  "courier": "courier",
  "calibri": "helvetica",    // closest sans-serif
  "garamond": "times",       // closest serif
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
  const normalized = fontFamily.toLowerCase().replace(/['"]/g, "").trim();
  // Try direct match
  if (FONT_MAP[normalized]) return FONT_MAP[normalized];
  // Try first font in comma-separated list
  const first = normalized.split(",")[0].trim();
  if (FONT_MAP[first]) return FONT_MAP[first];
  // Fallback by generic family
  if (normalized.includes("sans-serif") || normalized.includes("sans")) return "helvetica";
  if (normalized.includes("monospace") || normalized.includes("mono")) return "courier";
  return "times";
}

interface GeneratePDFOptions {
  content: string;
  watermark: string;
  fileName: string;
  documentType?: string;
  documentTitle?: string;
  forceLetterhead?: boolean;
  customMarginTop?: number;
  customMarginBottom?: number;
}

// Set CONARQ/Decreto 10.278 metadata for document integrity and authenticity
function setDocumentMetadata(doc: jsPDF, options: {
  title?: string;
  documentType?: string;
  authorName?: string;
}) {
  const now = new Date();
  const isoDate = now.toISOString();
  
  doc.setDocumentProperties({
    title: options.title || "Documento Jurídico",
    subject: `Tipo: ${options.documentType || "geral"} | Gerado em: ${isoDate}`,
    author: options.authorName || "ORION IA Platform",
    creator: "Sistema Jurídico IA — ABNT NBR 14724 / CONARQ Res. 48/2021",
    keywords: "documento jurídico, ABNT, CONARQ, Decreto 10.278/2020, nato-digital",
  });
}

// Document types that use branded letterhead (escritório timbre + footer)
// All others use pure ABNT official formatting
const BRANDED_DOCUMENT_TYPES = new Set([
  "contrato-servicos", "contrato-honorarios", "contrato-locacao", "contrato-modelo",
  "revisar-contrato", "analise-contrato-parecer", "comparar-contratos",
  "aditivo-contratual", "termo-encerramento", "termo-confidencialidade", "termos-uso",
  "procuracao-ad-judicia", "procuracao-ad-negotia",
]);

// Categories handled via BRANDED_DOCUMENT_TYPES set above

export function isBrandedDocument(documentType?: string): boolean {
  if (!documentType) return true; // default to branded for backwards compat
  if (BRANDED_DOCUMENT_TYPES.has(documentType)) return true;
  // Check if starts with "procuracao"
  if (documentType.startsWith("procuracao")) return true;
  return false;
}

export interface EscritorioConfig {
  nome_escritorio: string;
  oab: string;
  telefone: string;
  endereco: string;
  email_contato: string;
  website: string;
  timbre_endereco: string;
  timbre_contatos: string;
  timbre_url: string;
}

let letterheadImageCache: string | null = null;
let escritorioConfigCache: EscritorioConfig | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 5000; // 5s — short TTL to pick up DB changes quickly

export const defaultEscritorioConfig: EscritorioConfig = {
  nome_escritorio: "",
  oab: "",
  telefone: "",
  endereco: "",
  email_contato: "",
  website: "",
  timbre_endereco: "",
  timbre_contatos: "",
  timbre_url: "",
};

/** Clear cached config and letterhead — call after user saves settings */
export function invalidateEscritorioCache(): void {
  escritorioConfigCache = null;
  letterheadImageCache = null;
  configCacheTime = 0;
}

export async function fetchEscritorioConfig(): Promise<EscritorioConfig> {
  const now = Date.now();
  if (escritorioConfigCache && now - configCacheTime < CONFIG_CACHE_TTL) {
    return escritorioConfigCache;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return defaultEscritorioConfig;

    const { data, error } = await supabase
      .from("escritorio_config")
      .select("nome_escritorio, oab, telefone, endereco, email_contato, website, timbre_endereco, timbre_contatos, timbre_url")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error || !data) return defaultEscritorioConfig;

    escritorioConfigCache = {
      nome_escritorio: data.nome_escritorio || "",
      oab: data.oab || "",
      telefone: data.telefone || "",
      endereco: data.endereco || "",
      email_contato: data.email_contato || "",
      website: data.website || "",
      timbre_endereco: data.timbre_endereco || "",
      timbre_contatos: data.timbre_contatos || "",
      timbre_url: data.timbre_url || "",
    };
    configCacheTime = now;
    return escritorioConfigCache;
  } catch {
    return defaultEscritorioConfig;
  }
}

export async function loadLetterheadImage(): Promise<string | null> {
  if (letterheadImageCache) return letterheadImageCache;

  try {
    const config = await fetchEscritorioConfig();
    const timbreUrl = config.timbre_url;
    
    // If no custom timbre uploaded, return null (clean ABNT document)
    if (!timbreUrl) return null;

    const response = await fetch(timbreUrl);
    if (!response.ok) {
      console.warn("[Timbre] Failed to load letterhead image:", response.status, timbreUrl);
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      console.warn("[Timbre] URL returned non-image content-type:", contentType);
      return null;
    }

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        letterheadImageCache = reader.result as string;
        resolve(letterheadImageCache);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("[Timbre] Error loading letterhead:", err);
    return null;
  }
}

function addLetterheadBackground(doc: jsPDF, letterheadBase64: string, pageWidth: number, _pageHeight: number) {
  try {
    doc.addImage(letterheadBase64, "PNG", 0, 0, pageWidth, BRANDED_MARGIN_TOP_MM, undefined, "FAST");
  } catch {
    // Fallback silently
  }
}

function addBrandedFooter(doc: jsPDF, config: EscritorioConfig, pageWidth: number, pageHeight: number, pageNumber?: number, docFont = "times") {
  // Footer bar: fills the entire bottom margin (using constant from pageConstants)
  const footerBarHeight = BRANDED_FOOTER_HEIGHT_MM;
  const footerY = pageHeight - footerBarHeight;

  // Light gray background — matches the header band of the new letterhead
  doc.setFillColor(236, 232, 225); // warm light gray, same tone as header
  doc.rect(0, footerY, pageWidth, footerBarHeight, "F");

  // Top thin golden separator line — same as header accent
  doc.setDrawColor(160, 130, 70); // muted gold matching letterhead logo tones
  doc.setLineWidth(0.35);
  doc.line(0, footerY, pageWidth, footerY);

  // Name + OAB — dark text, bold, centered
  doc.setFontSize(7.5);
  doc.setFont(docFont, "bold");
  doc.setTextColor(30, 20, 10); // near-black dark brown, matches letterhead text
  doc.text(`${config.nome_escritorio}  |  ${config.oab}`, pageWidth / 2, footerY + 5.5, { align: "center" });

  // Contact line — medium gray, normal weight
  doc.setFont(docFont, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(80, 70, 60); // warm medium gray

  const contactsLine = config.timbre_contatos ||
    [config.telefone, config.email_contato, config.website].filter(Boolean).join("  |  ");
  if (contactsLine) {
    doc.text(contactsLine, pageWidth / 2, footerY + 10, { align: "center" });
  }

  // Address line
  const addressLine = config.endereco || config.timbre_endereco || "";
  if (addressLine) {
    doc.text(addressLine, pageWidth / 2, footerY + 14, { align: "center" });
  }

  // Page number — right-aligned, subtle
  if (pageNumber !== undefined && pageNumber >= 2) {
    doc.setFontSize(5.5);
    doc.setTextColor(130, 115, 100);
    doc.text(String(pageNumber), pageWidth - ABNT.marginRight, footerY + 14, { align: "right" });
  }
}

// ABNT official footer — clean, page number only (centered, from page 2)
function addOfficialFooter(doc: jsPDF, pageWidth: number, pageHeight: number, pageNumber: number, docFont = "times") {
  if (pageNumber >= 2) {
    doc.setFontSize(ABNT.fontSizeSmall);
    doc.setFont(docFont, "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(String(pageNumber), pageWidth / 2, pageHeight - ABNT.marginBottom + 10, { align: "center" });
  }
}

function addFooter(doc: jsPDF, config: EscritorioConfig, pageWidth: number, pageHeight: number, pageNumber: number, branded: boolean, docFont = "times") {
  if (branded) {
    addBrandedFooter(doc, config, pageWidth, pageHeight, pageNumber, docFont);
  } else {
    addOfficialFooter(doc, pageWidth, pageHeight, pageNumber, docFont);
  }
  // CRITICAL: Always reset text color to black after footer rendering
  doc.setTextColor(0, 0, 0);
  doc.setFont(docFont, "normal");
  doc.setFontSize(ABNT.fontSize);
}

// --- Text parsing ---

interface TextSegment {
  text: string;
  bold: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;       // pt size (e.g. 14)
  fontFamily?: string;     // jsPDF font name (e.g. "helvetica", "courier")
  color?: string;          // hex color e.g. "#DC2626"
  highlight?: string;      // highlight background color e.g. "#FEF08A"
}

/** Strip all formatting markers from text (for width calculation) */
function stripMarkers(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
}

/**
 * Given clean lines (from splitTextToSize) and the original formatted text,
 * reconstruct each line with its original **bold** and *italic* markers.
 */
function remapLinesToFormatted(cleanLines: string[], originalFormatted: string): string[] {
  if (!originalFormatted.includes("*")) return cleanLines;
  
  const result: string[] = [];
  let remaining = originalFormatted;
  
  for (const cleanLine of cleanLines) {
    const cleanWords = cleanLine.split(/\s+/).filter(Boolean);
    const formattedWords: string[] = [];
    
    for (const cleanWord of cleanWords) {
      // Find next word in remaining formatted text
      const stripped = stripMarkers(remaining);
      const wordIdx = stripped.indexOf(cleanWord.split(/\s/)[0]);
      
      if (wordIdx >= 0) {
        // Find corresponding position in formatted text
        let cleanPos = 0;
        let fmtPos = 0;
        while (cleanPos < wordIdx && fmtPos < remaining.length) {
          if (remaining[fmtPos] === '*') {
            fmtPos++;
          } else {
            cleanPos++;
            fmtPos++;
          }
        }
        // Extract the formatted word
        let endFmtPos = fmtPos;
        let cCount = 0;
        while (cCount < cleanWord.length && endFmtPos < remaining.length) {
          if (remaining[endFmtPos] === '*') {
            endFmtPos++;
          } else {
            cCount++;
            endFmtPos++;
          }
        }
        // Include trailing *
        while (endFmtPos < remaining.length && remaining[endFmtPos] === '*') endFmtPos++;
        
        formattedWords.push(remaining.substring(fmtPos, endFmtPos));
        remaining = remaining.substring(endFmtPos).trimStart();
      } else {
        formattedWords.push(cleanWord);
      }
    }
    
    result.push(formattedWords.join(" "));
  }
  
  return result;
}

/** Find position in formatted text that corresponds to N clean characters consumed */
function findFormattedEndIndex(formatted: string, cleanCharsConsumed: number): number {
  let cleanCount = 0;
  let i = 0;
  while (cleanCount < cleanCharsConsumed && i < formatted.length) {
    if (formatted[i] === '*') {
      i++;
    } else {
      cleanCount++;
      i++;
    }
  }
  // Skip trailing whitespace
  while (i < formatted.length && /\s/.test(formatted[i])) i++;
  return i;
}

// Re-export for consumers
export { parseFormattedText, parseHtmlToRichSegments, normalizeColor, hexToRgb };

// Detect judicial addressing blocks (should NOT be treated as titles)
function isJudicialAddressing(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Common addressing patterns in Brazilian judicial petitions
  return /^(AO\s+JU[IÍ]Z|AO\s+JU[IÍ]ZO|A\(?O\)?\s+EXCEL|EXCEL[EÊ]NT[IÍ]SSIM|AO\s+MERITÍSSIMO|MERITÍSSIMO|AO\s+DOUTOR|AO\s+SENHOR)/i.test(trimmed);
}

// Detect if a line is a section title (standalone all-caps header, not data lines)
function isSectionTitle(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Judicial addressing is NOT a title — it's a special block
  if (isJudicialAddressing(trimmed)) return false;
  // Case law keywords are NEVER section titles — they are ementas/citations
  if (/^(APELA[CÇ][AÃ]O|RECURSO|AGRAVO|MANDADO DE SEGURAN[CÇ]A|HABEAS\s+CORPUS|EMBARGOS|ABSOLVI[CÇ][AÃ]O|ACUSADO|CONDENA[CÇ][AÃ]O|DEN[UÚ]NCIA|RECLAMA[CÇ][AÃ]O|SENTEN[CÇ]A|AC[OÓ]RD[AÃ]O|VOTO|I{1,4}V?\.\s)/i.test(trimmed)) return false;
  // Lines ending with colon are LABELS, not titles (e.g., "OUTORGANTE:", "TESTEMUNHAS:", "1ª TESTEMUNHA:")
  if (/:\s*$/.test(trimmed)) return false;
  // Lines containing colons with data after them are NOT titles (e.g., "OUTORGANTE: João...")
  if (/^[A-ZÀ-Ú\s]+:/.test(trimmed) && trimmed.length > 40) return false;
  // Pure numbers, legal references, or article numbers are NOT titles (e.g. "3.689/1941", "137.608")
  if (/^\d[\d.,/\-()]+$/.test(trimmed)) return false;
  // Short fragments that are clearly continuation text (< 3 words, has numbers) are not titles
  if (trimmed.split(/\s+/).length <= 2 && /\d/.test(trimmed) && !/^(CLÁUSULA|ARTIGO|SEÇÃO|CAPÍTULO|TÍTULO)/i.test(trimmed)) return false;
  // All caps line with at least 3 chars, max ~80 chars (true headers are short)
  if (trimmed.length >= 3 && trimmed.length <= 80 && trimmed === trimmed.toUpperCase() && /[A-ZÀ-Ú]/.test(trimmed)) return true;
  // Numbered title: "1. TÍTULO" or "1.1 Título" or "4.1. DA APLICAÇÃO" or "CLÁUSULA 1ª"
  if (/^\d+(\.\d+)*\.?\s+[A-ZÀ-Ú]/.test(trimmed)) return true;
  if (/^CLÁUSULA\s+\d/i.test(trimmed)) return true;
  return false;
}

// Detect long citation (indented block, starts with specific markers, or jurisprudential ementas)
function isLongCitation(paragraph: string): boolean {
  const trimmed = paragraph.trim();
  // Citation markers
  if (trimmed.startsWith(">") || trimmed.startsWith("    ")) return true;
  if (trimmed.startsWith('"') && trimmed.length > 200) return true;
  // Jurisprudential ementas (ABNT NBR 10520 — long citations with 4cm indent, 10pt)
  if (/^EMENTA\s*:/i.test(trimmed) && trimmed.length > 100) return true;
  // All-caps case law headings (APELAÇÃO CÍVEL, RECURSO ESPECIAL, AGRAVO DE INSTRUMENTO, etc.)
  if (/^(APELA[CÇ][AÃ]O|RECURSO|AGRAVO|MANDADO|HABEAS|EMBARGOS|ABSOLVI|ACUSAD|CONDENA|DEN[UÚ]NCIA|RECLAMA|SENTEN[CÇ]A|AC[OÓ]RD[AÃ]O)\s/i.test(trimmed) && trimmed === trimmed.toUpperCase() && trimmed.length > 60) return true;
  // Starts with (grifei) followed by all-caps case law
  if (/^\(grif(?:ei|os?)\)\s*\.?\s*(APELA[CÇ][AÃ]O|RECURSO|AGRAVO|HABEAS|EMBARGOS)/i.test(trimmed) && trimmed.length > 60) return true;
  // Roman numeral case law sub-headings (II. RECURSO NÃO PROVIDO, IV. APELAÇÃO DESPROVIDA)
  if (/^I{1,4}V?\.\s+(RECURSO|APELA|AGRAVO|SENTENÇA|ABSOLVIÇÃO|CONDENAÇÃO|DENÚNCIA)/i.test(trimmed)) return true;
  // Contains typical case law metadata markers (Relator, Tribunal de Justiça, Órgão Julgador, etc.)
  if ((/Relator\(?a?\)?:/i.test(trimmed) || /Data de Julgamento:/i.test(trimmed)) && trimmed.length > 80) return true;
  // Contains TJRS/STJ/STF citation metadata with process number
  if (/\(TJRS|TJ[A-Z]{2},\s*Apela[çc][aã]o/i.test(trimmed) && /\d{7,}/.test(trimmed) && trimmed.length > 100) return true;
  // Paragraph that ends with (grifei) or (grifos nossos) — typically case law citation
  if (/\(grif(?:ei|os?\s+nossos?)\)\s*\.?\s*$/i.test(trimmed) && trimmed.length > 80) return true;
  // Contains "Apelação Criminal" or "Recurso Especial" with "Câmara Criminal" or "Turma" — case law reference block
  if (/Apela[çc][aã]o\s+Crim/i.test(trimmed) && /C[aâ]mara\s+Criminal/i.test(trimmed) && trimmed.length > 80) return true;
  // Numbered case summary items (3. O acórdão recorrido...)
  if (/^\d+\.\s+O\s+(acórdão|tribunal|juízo|réu|autor|apelante|recorrente)/i.test(trimmed) && trimmed.length > 80) return true;
  return false;
}

/** Render a single rich segment with decorations (underline, strikethrough, highlight, color) */
export function renderRichSegment(doc: jsPDF, seg: TextSegment, x: number, y: number, df: string, baseFontSize: number): number {
  const segFontSize = Math.min(seg.fontSize || baseFontSize, MAX_PDF_FONT_SIZE);
  doc.setFontSize(segFontSize);
  
  const segFont = seg.fontFamily || df;
  const style = seg.bold && seg.italic ? "bolditalic" : seg.bold ? "bold" : seg.italic ? "italic" : "normal";
  doc.setFont(segFont, style);
  
  const textWidth = doc.getTextWidth(seg.text);
  
  // Draw highlight background
  if (seg.highlight) {
    const [hr, hg, hb] = hexToRgb(seg.highlight);
    doc.setFillColor(hr, hg, hb);
    // Approximate text height from font size (pt to mm ≈ 0.353)
    const textHeightMm = segFontSize * 0.353;
    doc.rect(x, y - textHeightMm + 0.5, textWidth, textHeightMm + 1, "F");
  }
  
  // Set text color
  if (seg.color) {
    const [cr, cg, cb] = hexToRgb(seg.color);
    doc.setTextColor(cr, cg, cb);
  } else {
    doc.setTextColor(0, 0, 0);
  }
  
  // Draw text
  doc.text(seg.text, x, y);
  
  // Draw underline
  if (seg.underline) {
    const lineColor = seg.color ? hexToRgb(seg.color) : [0, 0, 0] as [number, number, number];
    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.setLineWidth(0.25);
    doc.line(x, y + 0.8, x + textWidth, y + 0.8);
  }
  
  // Draw strikethrough
  if (seg.strikethrough) {
    const lineColor = seg.color ? hexToRgb(seg.color) : [0, 0, 0] as [number, number, number];
    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.setLineWidth(0.25);
    const strikeMm = segFontSize * 0.353 * 0.35;
    doc.line(x, y - strikeMm, x + textWidth, y - strikeMm);
  }
  
  // Reset
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(baseFontSize);
  doc.setFont(df, "normal");
  
  return textWidth;
}

/** Check if segments have any rich formatting beyond bold/italic */
export function hasRichFormatting(segments: TextSegment[]): boolean {
  return segments.some(s => s.bold || s.underline || s.strikethrough || s.color || s.highlight || s.fontSize || s.fontFamily);
}

/**
 * Slice a paragraph's rich segments to match a specific wrapped line's text.
 * When a paragraph wraps to multiple lines, each line needs only the segments
 * that correspond to its character range within the full paragraph text.
 */
function sliceRichSegmentsForLine(allSegments: TextSegment[], lineText: string, charOffset: number): TextSegment[] {
  if (!allSegments.length || !lineText) return [];
  
  const lineLen = lineText.length;
  const result: TextSegment[] = [];
  let segStart = 0; // cumulative character position across all segments
  
  for (const seg of allSegments) {
    const segEnd = segStart + seg.text.length;
    
    // Check if this segment overlaps with the line's character range [charOffset, charOffset + lineLen)
    const overlapStart = Math.max(segStart, charOffset);
    const overlapEnd = Math.min(segEnd, charOffset + lineLen);
    
    if (overlapStart < overlapEnd) {
      // Calculate which part of this segment's text to include
      const textStart = overlapStart - segStart;
      const textEnd = overlapEnd - segStart;
      const slicedText = seg.text.substring(textStart, textEnd);
      
      if (slicedText) {
        result.push({ ...seg, text: slicedText });
      }
    }
    
    segStart = segEnd;
    
    // Optimization: stop if we're past the line's range
    if (segStart >= charOffset + lineLen) break;
  }
  
  return result;
}

/**
 * Given full paragraph rich segments and an array of wrapped clean lines,
 * return an array of per-line rich segments.
 */
function splitRichSegmentsByLines(allSegments: TextSegment[], cleanLines: string[]): TextSegment[][] {
  if (!allSegments.length) return cleanLines.map(() => []);
  
  // Build the full clean text from segments
  const fullSegText = allSegments.map(s => s.text).join("");
  
  const result: TextSegment[][] = [];
  let charOffset = 0;
  
  for (const line of cleanLines) {
    // Sequential cursor advance: find where this line starts in the full text
    // Skip whitespace gaps between wrapped lines (including \u00A0 from TipTap)
    if (charOffset > 0) {
      while (charOffset < fullSegText.length && /[\s\u00A0]/.test(fullSegText[charOffset])) {
        charOffset++;
      }
    }
    
    // If the line doesn't start where we expect, try to find it via substring match
    // This prevents drift when splitTextToSize trims or normalizes whitespace
    if (charOffset < fullSegText.length && line.length > 0) {
      const expectedChar = line[0];
      const actualChar = fullSegText[charOffset];
      if (expectedChar !== actualChar) {
        // Search nearby (within 5 chars) for the line start
        for (let delta = 1; delta <= 5; delta++) {
          if (charOffset + delta < fullSegText.length && fullSegText[charOffset + delta] === expectedChar) {
            charOffset += delta;
            break;
          }
        }
      }
    }
    
    const lineSegs = sliceRichSegmentsForLine(allSegments, line, charOffset);
    result.push(lineSegs);
    charOffset += line.length;
  }
  
  return result;
}

/**
 * Word-level line wrapper for rich segments.
 * Instead of using splitTextToSize (which loses formatting context),
 * this measures each word with its actual font/bold/size and builds lines manually.
 * Returns per-line segments that are guaranteed to match the rendered text.
 *
 * @param firstLineMaxWidth — if provided, the first line uses this narrower width (for paragraph indent)
 */
function wrapRichSegmentsToLines(
  doc: jsPDF,
  allSegments: TextSegment[],
  maxWidth: number,
  docFont: string,
  baseFontSize: number,
  firstLineMaxWidth?: number
): { lines: string[]; perLineSegs: TextSegment[][] } {
  if (!allSegments.length) return { lines: [], perLineSegs: [] };

  // 1. Tokenize segments into word-level tokens, each carrying formatting
  interface WordToken {
    text: string;
    seg: TextSegment;
  }

  const tokens: WordToken[] = [];
  for (const seg of allSegments) {
    const parts = seg.text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        // skip whitespace — it's implicit between tokens
      } else {
        tokens.push({ text: part, seg });
      }
    }
  }

  if (tokens.length === 0) return { lines: [], perLineSegs: [] };

  // 2. Measure each token's width using its actual formatting
  const tokenWidths: number[] = [];
  for (const tok of tokens) {
    const fs = Math.min(tok.seg.fontSize || baseFontSize, MAX_PDF_FONT_SIZE);
    doc.setFontSize(fs);
    const segFont = tok.seg.fontFamily || docFont;
    const style = (tok.seg.bold && tok.seg.italic) ? "bolditalic" : tok.seg.bold ? "bold" : tok.seg.italic ? "italic" : "normal";
    doc.setFont(segFont, style);
    tokenWidths.push(doc.getTextWidth(tok.text));
  }

  // Measure space width in normal font
  doc.setFont(docFont, "normal");
  doc.setFontSize(baseFontSize);
  const spaceWidth = doc.getTextWidth(" ");

  // 3. Build lines by accumulating tokens
  const lines: string[] = [];
  const perLineSegs: TextSegment[][] = [];

  let lineTokens: number[] = [];
  let lineWidth = 0;
  let lineIndex = 0;

  const flushLine = () => {
    if (lineTokens.length === 0) return;
    const lineStr = lineTokens.map(i => tokens[i].text).join(" ");
    const lineSegs: TextSegment[] = [];
    for (let j = 0; j < lineTokens.length; j++) {
      const tok = tokens[lineTokens[j]];
      const prefix = j > 0 ? " " : "";
      lineSegs.push({ ...tok.seg, text: prefix + tok.text });
    }
    lines.push(lineStr);
    perLineSegs.push(lineSegs);
    lineTokens = [];
    lineWidth = 0;
    lineIndex++;
  };

  for (let i = 0; i < tokens.length; i++) {
    const tokW = tokenWidths[i];
    const extraSpace = lineTokens.length > 0 ? spaceWidth : 0;
    // First line may have a different (narrower) max width due to paragraph indent
    const currentMaxWidth = (lineIndex === 0 && firstLineMaxWidth !== undefined) ? firstLineMaxWidth : maxWidth;

    if (lineTokens.length > 0 && lineWidth + extraSpace + tokW > currentMaxWidth + 0.5) {
      flushLine();
    }

    if (lineTokens.length > 0) {
      lineWidth += spaceWidth;
    }
    lineTokens.push(i);
    lineWidth += tokW;
  }
  flushLine();

  // Reset font
  doc.setFont(docFont, "normal");
  doc.setFontSize(baseFontSize);

  return { lines, perLineSegs };
}

// Render a line with mixed formatting segments
function renderFormattedLine(doc: jsPDF, line: string, x: number, y: number, options?: { fontSize?: number; isCitation?: boolean; align?: "left" | "center" | "right" | "justify"; maxWidth?: number; pageWidth?: number; docFont?: string; richSegments?: TextSegment[] }) {
  const segments = options?.richSegments || parseFormattedText(line);
  const fontSize = options?.fontSize || ABNT.fontSize;
  const df = options?.docFont || "times";
  doc.setFontSize(fontSize);
  const useRich = hasRichFormatting(segments);

  const align = options?.align;

  // Calculate total width helper
  const calcTotalWidth = () => {
    let total = 0;
    for (const seg of segments) {
      if (useRich && seg.fontSize) doc.setFontSize(seg.fontSize);
      else doc.setFontSize(fontSize);
      const segFont = seg.fontFamily || df;
      const style = (seg.bold && seg.italic) ? "bolditalic" : seg.bold ? "bold" : seg.italic ? "italic" : "normal";
      doc.setFont(segFont, style);
      total += doc.getTextWidth(seg.text);
    }
    doc.setFont(df, "normal");
    doc.setFontSize(fontSize);
    return total;
  };

  if (align === "center" && options?.pageWidth) {
    const totalWidth = calcTotalWidth();
    let currentX = (options.pageWidth - totalWidth) / 2;
    const rightBound = options.pageWidth - ABNT.marginRight;
    for (const seg of segments) {
      if (currentX >= rightBound) break;
      currentX += renderRichSegment(doc, seg, currentX, y, df, fontSize);
    }
  } else if (align === "right" && options?.pageWidth) {
    const totalWidth = calcTotalWidth();
    let currentX = options.pageWidth - ABNT.marginRight - totalWidth;
    const rightBound = options.pageWidth - ABNT.marginRight;
    for (const seg of segments) {
      if (currentX >= rightBound) break;
      currentX += renderRichSegment(doc, seg, currentX, y, df, fontSize);
    }
  } else {
    // Default left-aligned rendering with overflow protection
    const rightBoundary = options?.pageWidth ? (options.pageWidth - ABNT.marginRight) : (x + 160);
    let currentX = x;
    for (const segment of segments) {
      const segFontSize = segment.fontSize || fontSize;
      doc.setFontSize(segFontSize);
      const segFont = segment.fontFamily || df;
      const style = (segment.bold && segment.italic) ? "bolditalic" : segment.bold ? "bold" : segment.italic ? "italic" : "normal";
      doc.setFont(segFont, style);
      const segWidth = doc.getTextWidth(segment.text);
      doc.setFontSize(fontSize);
      doc.setFont(df, "normal");
      
      if (currentX + segWidth > rightBoundary + 1) {
        const availableWidth = rightBoundary - currentX;
        if (availableWidth > 0) {
          let fitText = "";
          doc.setFontSize(segFontSize);
          doc.setFont(df, style);
          for (const ch of segment.text) {
            if (doc.getTextWidth(fitText + ch) > availableWidth) break;
            fitText += ch;
          }
          if (fitText) {
            const clipped = { ...segment, text: fitText };
            renderRichSegment(doc, clipped, currentX, y, df, fontSize);
          }
          doc.setFontSize(fontSize);
          doc.setFont(df, "normal");
        }
        break;
      }
      currentX += renderRichSegment(doc, segment, currentX, y, df, fontSize);
    }
  }

  doc.setFont(df, "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(fontSize);
}

// Parse a word for inline bold/italic markers and render with correct font
function renderWord(doc: jsPDF, word: string, xPos: number, y: number, docFont = "times"): number {
  const segments = parseFormattedText(word);
  let cx = xPos;
  for (const seg of segments) {
    cx += renderRichSegment(doc, seg, cx, y, docFont, ABNT.fontSize);
  }
  return cx - xPos;
}

// Render a justified line — supports both markdown-formatted text and rich segments
function renderJustifiedLine(doc: jsPDF, line: string, x: number, y: number, maxWidth: number, isLastLine: boolean, docFont = "times", richSegments?: TextSegment[], baseFontSize?: number) {
  const fontSize = Math.min(baseFontSize || ABNT.fontSize, MAX_PDF_FONT_SIZE);
  doc.setFontSize(fontSize);
  doc.setFont(docFont, "normal");

  // If rich segments are available, use rich rendering path
  if (richSegments && richSegments.length > 0) {
    // Last line: render left-aligned (standard typographic practice)
    if (isLastLine) {
      const rightBoundary = x + maxWidth;
      let cx = x;
      for (const seg of richSegments) {
        if (cx >= rightBoundary) break;
        cx += renderRichSegment(doc, seg, cx, y, docFont, fontSize);
      }
      return;
    }
    
    // Build word-level groups from rich segments for justification.
    // Each "word" is one or more contiguous non-whitespace segments.
    // CRITICAL: Segments from wrapRichSegmentsToLines may have leading spaces
    // (e.g. " word") — we must strip those and treat them as word boundaries.
    const wordGroups: TextSegment[][] = [];
    let currentGroup: TextSegment[] = [];
    
    for (const seg of richSegments) {
      // Split this segment's text by whitespace
      const parts = seg.text.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          // Whitespace boundary — flush current group
          if (currentGroup.length > 0) {
            wordGroups.push(currentGroup);
            currentGroup = [];
          }
        } else {
          currentGroup.push({ ...seg, text: part });
        }
      }
    }
    if (currentGroup.length > 0) wordGroups.push(currentGroup);

    if (wordGroups.length <= 1) {
      // Single word or empty — render left-aligned
      let cx = x;
      for (const seg of richSegments) {
        cx += renderRichSegment(doc, seg, cx, y, docFont, fontSize);
      }
      return;
    }
    
    // Calculate total word width with actual formatting
    let totalWordsWidth = 0;
    for (const group of wordGroups) {
      for (const seg of group) {
        const fs = Math.min(seg.fontSize || fontSize, MAX_PDF_FONT_SIZE);
        doc.setFontSize(fs);
        const style = (seg.bold && seg.italic) ? "bolditalic" : seg.bold ? "bold" : seg.italic ? "italic" : "normal";
        const segFont = seg.fontFamily || docFont;
        doc.setFont(segFont, style);
        totalWordsWidth += doc.getTextWidth(seg.text);
      }
    }
    doc.setFont(docFont, "normal");
    doc.setFontSize(fontSize);
    
    const remainingSpace = maxWidth - totalWordsWidth;
    const gapCount = wordGroups.length - 1;
    const spaceBetween = gapCount > 0 ? remainingSpace / gapCount : 0;
    const normalSpace = doc.getTextWidth(" ");
    
    // If spacing is negative or too tight, render left-aligned
    if (spaceBetween < normalSpace * 0.15) {
      let cx = x;
      for (const seg of richSegments) {
        cx += renderRichSegment(doc, seg, cx, y, docFont, fontSize);
      }
      return;
    }
    
    // Use calculated spacing directly — wrapping and rendering now use identical
    // measurements so spacing is naturally close to normal word spacing.
    // No cap needed: the only case with large spacing is unavoidable long-word breaks.
    let currentX = x;
    for (let i = 0; i < wordGroups.length; i++) {
      for (const seg of wordGroups[i]) {
        currentX += renderRichSegment(doc, seg, currentX, y, docFont, fontSize);
      }
      if (i < wordGroups.length - 1) {
        currentX += spaceBetween;
      }
    }
    doc.setFont(docFont, "normal");
    doc.setTextColor(0, 0, 0);
    return;
  }

  // Fallback: markdown-based rendering
  const hasBold = line.includes("**") || line.includes("*");

  if (isLastLine) {
    if (hasBold) { renderFormattedLine(doc, line, x, y, { docFont }); } else { doc.text(stripMarkers(line), x, y); }
    return;
  }

  const words = line.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    if (hasBold) { renderFormattedLine(doc, line, x, y, { docFont }); } else { doc.text(stripMarkers(line), x, y); }
    return;
  }

  let totalWordsWidth = 0;
  for (const word of words) {
    if (hasBold && (word.includes("**") || word.includes("*"))) {
      const segs = parseFormattedText(word);
      for (const seg of segs) {
        doc.setFont(docFont, seg.bold ? "bold" : seg.italic ? "italic" : "normal");
        totalWordsWidth += doc.getTextWidth(seg.text);
      }
      doc.setFont(docFont, "normal");
    } else {
      totalWordsWidth += doc.getTextWidth(stripMarkers(word));
    }
  }

  const remainingSpace = maxWidth - totalWordsWidth;
  const spaceBetween = remainingSpace / (words.length - 1);
  const normalSpace = doc.getTextWidth(" ");

  if (spaceBetween < normalSpace * 0.15) {
    if (hasBold) { renderFormattedLine(doc, line, x, y, { docFont }); } else { doc.text(stripMarkers(line), x, y); }
    return;
  }

  // Use calculated spacing directly — no cap needed with unified measurement
  let currentX = x;
  for (let i = 0; i < words.length; i++) {
    if (hasBold && (words[i].includes("**") || words[i].includes("*"))) {
      const w = renderWord(doc, words[i], currentX, y, docFont);
      currentX += w;
    } else {
      const clean = stripMarkers(words[i]);
      doc.text(clean, currentX, y);
      currentX += doc.getTextWidth(clean);
    }
    if (i < words.length - 1) {
      currentX += spaceBetween;
    }
  }
  doc.setFont(docFont, "normal");
}

// --- Core PDF rendering with ABNT formatting ---

interface RenderContext {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  letterheadBase64: string | null;
  escritorioConfig: EscritorioConfig;
  watermark: string;
  pageNumber: number;
  branded: boolean;
  customMarginTop?: number;
  customMarginBottom?: number;
  docFont: string; // dominant font for the document
  lastPageHasContent: boolean; // tracks if current page has rendered body content
}

function newPage(ctx: RenderContext): number {
  ctx.doc.addPage();
  ctx.pageNumber++;
  ctx.lastPageHasContent = false; // new page starts empty

  if (ctx.branded && ctx.letterheadBase64) {
    addLetterheadBackground(ctx.doc, ctx.letterheadBase64, ctx.pageWidth, ctx.pageHeight);
  }

  addFooter(ctx.doc, ctx.escritorioConfig, ctx.pageWidth, ctx.pageHeight, ctx.pageNumber, ctx.branded, ctx.docFont);

  if (ctx.watermark && ctx.watermark !== "none") {
    addWatermark(ctx.doc, ctx.watermark, ctx.pageWidth, ctx.pageHeight);
  }

  // CRITICAL: Force reset after footer+watermark to prevent color/opacity leak
  ctx.doc.setFontSize(ABNT.fontSize);
  ctx.doc.setFont(ctx.docFont, "normal");
  ctx.doc.setTextColor(0, 0, 0);

  // Branded: 25mm top margin (matching pageConstants BRANDED_MARGIN_TOP_MM)
  // Non-branded: 25mm top margin (matching --m-top: 25mm)
  return ctx.branded ? (ctx.customMarginTop ?? BRANDED_MARGIN_TOP_MM) : (ctx.customMarginTop ?? ABNT.marginTop);
}

/** Detect the dominant font from HTML blocks */
function detectDominantFont(blocks: ParagraphBlock[]): string {
  const fontCounts: Record<string, number> = {};
  for (const block of blocks) {
    if (block.fontFamily) {
      const mapped = mapFontFamily(block.fontFamily);
      fontCounts[mapped] = (fontCounts[mapped] || 0) + block.text.length;
    }
  }
  // Return the font with the most text, or "times" as default
  let maxFont = "times";
  let maxCount = 0;
  for (const [font, count] of Object.entries(fontCounts)) {
    if (count > maxCount) {
      maxFont = font;
      maxCount = count;
    }
  }
  return maxFont;
}

function renderContent(ctx: RenderContext, content: string): void {
  const mTop = ctx.customMarginTop ?? ABNT.marginTop;
  const mBottom = ctx.customMarginBottom ?? ABNT.marginBottom;
  const maxWidth = ctx.pageWidth - ABNT.marginLeft - ABNT.marginRight;
  const citationMaxWidth = ctx.pageWidth - ABNT.marginLeft - ABNT.citationIndent - ABNT.marginRight;
  // For branded: total reserved bottom = 20mm footer, matching pageConstants BRANDED_RESERVED_BOTTOM_MM
  // For non-branded: use bottom margin (20mm)
  const effectiveBottom = ctx.branded ? BRANDED_RESERVED_BOTTOM_MM : mBottom;
  const bottomLimit = ctx.pageHeight - effectiveBottom;

  const df = ctx.docFont;

  // CRITICAL: Force reset all text properties before rendering content
  ctx.doc.setFontSize(ABNT.fontSize);
  ctx.doc.setFont(df, "normal");
  ctx.doc.setTextColor(0, 0, 0);

  // Extract alignment and image info from HTML blocks
  const htmlBlocks = htmlToStructuredBlocks(content);
  
  // Detect dominant font from HTML blocks and update context
  const detectedFont = detectDominantFont(htmlBlocks);
  if (detectedFont !== "times") {
    ctx.docFont = detectedFont;
  }
  const docFont = ctx.docFont;
  
  const blockAlignments = new Map<number, "left" | "center" | "right" | "justify">();
  const blockFontOverrides = new Map<number, string>();
  const blockRichSegments = new Map<number, TextSegment[]>();
  const blockLineHeights = new Map<number, number>();   // line-height multiplier from HTML
  const blockMarginLefts = new Map<number, number>();   // margin-left in mm from HTML
  const blockTextIndents = new Map<number, number>();   // text-indent in mm from HTML (first-line)
  const blockFontSizes = new Map<number, number>();     // font-size in pt from HTML
  const blockPaddingRights = new Map<number, number>(); // padding-right in mm from HTML (ruler right indent)
  const imageBlocks = new Map<string, string>(); // placeholder text -> base64 src
  const tableBlocks = new Map<string, TableData>(); // placeholder text -> table data

  // Detect if document has imported formatting (from DOCX) — if so, respect it
  const hasImportedFormatting = htmlBlocks.some(b => b.lineHeight || b.marginLeft || b.fontSize || b.textIndent);
  
  // Build paragraphs directly from HTML blocks — eliminates fragile content-matching
  // that previously caused editor formatting to be lost in the PDF
  let paragraphs: string[];
  
  const hasStructuredBlocks = htmlBlocks.length > 1 || 
    (htmlBlocks.length === 1 && (htmlBlocks[0].align || htmlBlocks[0].fontFamily || htmlBlocks[0].htmlContent));
  
  if (hasStructuredBlocks) {
    paragraphs = [];
    for (const block of htmlBlocks) {
      // Collect image sources
      if (block.type === "image" && block.src) {
        imageBlocks.set(block.text, block.src);
        paragraphs.push(block.text);
        continue;
      }
      // Collect table data
      if (block.type === "table" && block.tableData) {
        tableBlocks.set(block.text, block.tableData);
        paragraphs.push(block.text);
        continue;
      }
      
      const cleanedText = block.text.trim();
      
      // Preserve empty blocks as empty paragraphs (for spacing from editor)
      const pIdx = paragraphs.length;
      paragraphs.push(cleanedText); // may be empty string — handled in render loop
      
      // Map formatting directly by paragraph index — no fuzzy matching needed
      if (block.align) blockAlignments.set(pIdx, block.align);
      if (block.fontFamily) blockFontOverrides.set(pIdx, mapFontFamily(block.fontFamily));
      if (block.lineHeight) blockLineHeights.set(pIdx, block.lineHeight);
      if (block.marginLeft) blockMarginLefts.set(pIdx, block.marginLeft * 0.264); // px to mm
      if (block.textIndent !== undefined) blockTextIndents.set(pIdx, block.textIndent * 0.264); // px to mm
      if (block.fontSize) blockFontSizes.set(pIdx, block.fontSize);
      if (block.paddingRight) blockPaddingRights.set(pIdx, block.paddingRight * 0.264); // px to mm
      
      // Parse rich segments from raw HTML for ALL blocks with inner HTML
      if (block.htmlContent) {
        const richSegs = parseHtmlToRichSegments(block.htmlContent);
        if (richSegs.length > 0) {
          blockRichSegments.set(pIdx, richSegs);
        }
      }
    }
  } else {
    // Fallback: plain text or single unformatted block
    let contentForText = content;
    let imgIdx = 0;
    contentForText = contentForText.replace(/<img[^>]*src\s*=\s*["']([^"']+)["'][^>]*\/?>/gi, (_match, src) => {
      const placeholder = `[IMG_${String(imgIdx++).padStart(3, "0")}]`;
      imageBlocks.set(placeholder, src);
      return `</p><p>${placeholder}</p><p>`;
    });
    const plainText = cleanText(contentForText);
    paragraphs = plainText.split(/\n\n+/);
  }

  // For branded docs, start at branded top margin (25mm); for non-branded, start at 25mm
  // Both use same top margin, matching editor CSS --m-top: 25mm
  let y = ctx.branded ? (ctx.customMarginTop ?? BRANDED_MARGIN_TOP_MM) : mTop;

  // Track whether we've rendered the document title block yet
  let documentTitleRendered = false;

  // Helper: compute effective line spacing for a block in mm
  // DOCX line-height=1.5 with 12pt ≈ 18pt ≈ 6.35mm; ABNT default ≈ 7.6mm
  const getLineSpacing = (pIdx: number, fontSize: number): number => {
    const lh = blockLineHeights.get(pIdx);
    if (lh && hasImportedFormatting) {
      return lh * fontSize * 0.353; // lineHeight * fontSize(pt) * pt-to-mm
    }
    return ABNT.lineSpacing;
  };

  // Helper: compute effective paragraph LEFT MARGIN for ALL lines
  // Respects margin-left from BOTH DOCX imports and editor ruler (inline styles)
  const getBlockMarginLeft = (pIdx: number): number => {
    const ml = blockMarginLefts.get(pIdx);
    if (ml !== undefined) return ml;
    return 0; // no extra margin by default
  };

  // Helper: compute effective FIRST-LINE indent (text-indent / ABNT recuo)
  // Respects text-indent from BOTH DOCX imports and editor ruler.
  // When margin-left is set but no text-indent, don't double-indent.
  const getFirstLineIndent = (pIdx: number): number => {
    const ti = blockTextIndents.get(pIdx);
    if (ti !== undefined) return ti; // explicit text-indent from editor/DOCX
    const ml = blockMarginLefts.get(pIdx);
    if (ml !== undefined) return 0; // margin-left only, no extra first-line indent
    return ABNT.paragraphIndent; // default ABNT first-line indent
  };

  // Helper: compute effective RIGHT padding (ruler right indent) in mm
  const getBlockPaddingRight = (pIdx: number): number => {
    const pr = blockPaddingRights.get(pIdx);
    if (pr !== undefined) return pr;
    return 0;
  };

  // Helper: compute effective font size for a block (capped)
  const getBlockFontSize = (pIdx: number): number => {
    const fs = blockFontSizes.get(pIdx);
    if (fs && hasImportedFormatting) return Math.min(fs, MAX_PDF_FONT_SIZE);
    return ABNT.fontSize;
  };

  // Helper: safe width for splitTextToSize when rich segments are present
  // Subtracts a safety margin to account for bold glyphs being wider
  const safeWidth = (width: number, hasRich: boolean): number => {
    return hasRich ? Math.max(width - SPLIT_SAFETY_MARGIN, width * 0.92) : width;
  };

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const trimmed = paragraphs[pIdx].trim();
    
    // Preserve empty paragraphs from the editor as vertical spacing
    if (!trimmed) {
      y += getLineSpacing(pIdx, ABNT.fontSize);
      continue;
    }
    
    // Mark that this page has body content
    ctx.lastPageHasContent = true;

    // --- Image block ---
    const imgMatch = trimmed.match(/^\[IMG_(\d{3})\]$/);
    if (imgMatch) {
      const imgSrc = imageBlocks.get(trimmed);
      if (imgSrc) {
        try {
          // Determine image format
          const formatMatch = imgSrc.match(/^data:image\/(png|jpeg|jpg|gif|webp)/i);
          const imgFormat = formatMatch ? formatMatch[1].toUpperCase().replace("JPG", "JPEG") : "PNG";
          
          // Calculate dimensions: max width = content area, max height = 200mm
          const imgMaxWidth = maxWidth;
          const imgMaxHeight = 200;
          
          // Create a temporary image to get dimensions
          const imgProps = ctx.doc.getImageProperties(imgSrc);
          let imgW = imgProps.width;
          let imgH = imgProps.height;
          
          // Scale to fit
          const scaleW = imgMaxWidth / imgW;
          const scaleH = imgMaxHeight / imgH;
          const scale = Math.min(scaleW, scaleH, 1); // don't upscale
          imgW *= scale;
          imgH *= scale;
          
          // Convert px to mm (approximate: 1px ≈ 0.264mm at 96dpi)
          const imgWidthMm = imgW * 0.264;
          const imgHeightMm = imgH * 0.264;
          
          // Clamp to max
          const finalW = Math.min(imgWidthMm, imgMaxWidth);
          const finalH = imgHeightMm * (finalW / imgWidthMm);
          
          // Page break if needed
          if (y + finalH > bottomLimit) y = newPage(ctx);
          
          // Center the image
          const imgX = ABNT.marginLeft + (maxWidth - finalW) / 2;
          ctx.doc.addImage(imgSrc, imgFormat, imgX, y, finalW, finalH, undefined, "FAST");
          y += finalH + ABNT.paragraphSpacing * 2;
        } catch {
          // If image fails, skip silently
        }
      }
      continue;
    }

    // --- Table block ---
    const tableMatch = trimmed.match(/^\[TABLE_(\d{3})\]$/);
    if (tableMatch) {
      const tblData = tableBlocks.get(trimmed);
      if (tblData && tblData.rows.length > 0) {
        const tableFontSize = ABNT.fontSize - 1; // 11pt for table text
        const cellPadding = 2; // mm padding inside cells
        const lineWidthPx = 0.3;
        const tableLeft = ABNT.marginLeft;

        // Determine number of columns from the row with most cells
        const numCols = Math.max(...tblData.rows.map(r => {
          let span = 0;
          for (const c of r) span += c.colSpan || 1;
          return span;
        }));

        // Calculate column widths in mm
        let colWidths: number[];
        if (tblData.colWidths && tblData.colWidths.length === numCols) {
          const totalPct = tblData.colWidths.reduce((a, b) => a + b, 0);
          colWidths = tblData.colWidths.map(w => (w / totalPct) * maxWidth);
        } else {
          colWidths = Array(numCols).fill(maxWidth / numCols);
        }

        ctx.doc.setFontSize(tableFontSize);
        ctx.doc.setFont(docFont, "normal");

        // Render each row
        for (const row of tblData.rows) {
          // Calculate row height: wrap each cell's text and find max lines
          const cellWrapped: string[][] = [];
          let maxCellHeight = 0;
          let colIdx = 0;
          for (const cell of row) {
            const span = cell.colSpan || 1;
            let cellW = 0;
            for (let s = 0; s < span && colIdx + s < colWidths.length; s++) cellW += colWidths[colIdx + s];
            const innerW = cellW - cellPadding * 2;
            ctx.doc.setFont(docFont, cell.bold ? "bold" : "normal");
            const lines = innerW > 0 ? ctx.doc.splitTextToSize(cell.text, innerW) : [cell.text];
            cellWrapped.push(lines);
            const cellH = lines.length * (tableFontSize * 0.353 + 1.5) + cellPadding * 2;
            if (cellH > maxCellHeight) maxCellHeight = cellH;
            colIdx += span;
          }

          // Page break if row doesn't fit
          if (y + maxCellHeight > bottomLimit) y = newPage(ctx);

          // Draw cell borders and content
          ctx.doc.setDrawColor(0, 0, 0);
          ctx.doc.setLineWidth(lineWidthPx);
          colIdx = 0;
          for (let ci = 0; ci < row.length; ci++) {
            const cell = row[ci];
            const span = cell.colSpan || 1;
            let cellW = 0;
            for (let s = 0; s < span && colIdx + s < colWidths.length; s++) cellW += colWidths[colIdx + s];
            const cellX = tableLeft + colWidths.slice(0, colIdx).reduce((a, b) => a + b, 0);

            // Draw cell rectangle
            ctx.doc.rect(cellX, y, cellW, maxCellHeight);

            // Fill header background
            if (cell.bold) {
              ctx.doc.setFillColor(240, 240, 240);
              ctx.doc.rect(cellX, y, cellW, maxCellHeight, "F");
              ctx.doc.rect(cellX, y, cellW, maxCellHeight, "S"); // re-draw border on top
            }

            // Render text lines
            ctx.doc.setFont(docFont, cell.bold ? "bold" : "normal");
            ctx.doc.setTextColor(0, 0, 0);
            const lines = cellWrapped[ci] || [];
            const lineH = tableFontSize * 0.353 + 1.5;
            for (let li = 0; li < lines.length; li++) {
              const textY = y + cellPadding + (li + 1) * lineH - 0.5;
              const textX = cell.align === "center" ? cellX + cellW / 2
                          : cell.align === "right" ? cellX + cellW - cellPadding
                          : cellX + cellPadding;
              const jAlign = cell.align === "center" ? "center" as const
                           : cell.align === "right" ? "right" as const
                           : undefined;
              if (jAlign) {
                ctx.doc.text(lines[li], textX, textY, { align: jAlign });
              } else {
                // Render with rich segments if available
                if (cell.richSegments && cell.richSegments.length > 0) {
                  const lineSegs = splitRichSegmentsByLines(cell.richSegments, lines);
                  if (lineSegs[li] && hasRichFormatting(lineSegs[li])) {
                    const cellRightBound = cellX + cellW - cellPadding;
                    let rx = textX;
                    for (const seg of lineSegs[li]) {
                      if (rx >= cellRightBound) break;
                      rx += renderRichSegment(ctx.doc, seg, rx, textY, docFont, tableFontSize);
                    }
                  } else {
                    ctx.doc.text(lines[li], textX, textY);
                  }
                } else {
                  ctx.doc.text(lines[li], textX, textY);
                }
              }
            }

            colIdx += span;
          }

          y += maxCellHeight;
        }

        // Reset after table
        y += ABNT.paragraphSpacing * 2;
        ctx.doc.setFont(docFont, "normal");
        ctx.doc.setFontSize(ABNT.fontSize);
        ctx.doc.setTextColor(0, 0, 0);
      }
      continue;
    }

    const isCitation = isLongCitation(trimmed);
    const isTitle = isCitation ? false : isSectionTitle(trimmed);
    const isSignatureLine = /_{5,}/.test(trimmed);
    const isLabelLine = !isTitle && !isSignatureLine && (
      /^(CPF|RG|OAB|OUTORGANTE|OUTORGADO|CONTRATANTE|CONTRATADA|CONTRATADO|TESTEMUNHA|1ª|2ª|3ª|ADVOGADO|IMPETRANTE|PACIENTE|AUTORIDADE|PODERES|SUBSTABELECIMENTO|PRAZO|Nome:|E-?mail:|Tel|Local|Data|Porto Alegre|Lajeado|Nestes termos|Termos em que|Pede deferimento|Assinatura|Tabelião|Reconheço)/i.test(trimmed.trim())
    );
    // Expanded list detection: a), b), c.1), c.2), i), ii), iii), iv)
    const isListItem = !isTitle && !isSignatureLine && !isLabelLine && /^([a-z]\)|[a-z]\.\d+\)|[ivxlc]+\))\s/i.test(trimmed.trim());
    
    // Get explicit alignment from editor, if any
    const explicitAlign = blockAlignments.get(pIdx);
    // Get per-block font override (from editor font-family selection)
    const blockFont = blockFontOverrides.get(pIdx);
    const activeFont = blockFont || docFont;
    // Get rich segments for this paragraph (if available)
    const richSegs = blockRichSegments.get(pIdx);
    // Per-block effective values (respects DOCX formatting if imported)
    const effFontSize = getBlockFontSize(pIdx);
    const effLineSpacing = getLineSpacing(pIdx, effFontSize);
    const effMarginLeft = getBlockMarginLeft(pIdx);   // ruler margin — ALL lines
    const effFirstIndent = getFirstLineIndent(pIdx);  // first-line indent only
    const effPaddingRight = getBlockPaddingRight(pIdx); // ruler right indent

    // ─── CRITICAL: If the editor set an EXPLICIT alignment, always honor it ───
    // This ensures center/right/left from the toolbar overrides any auto-detection
    // (judicial addressing, section titles, etc.)
    if (explicitAlign) {
      ctx.doc.setFontSize(effFontSize);
      const isTitleStyle = isTitle || isJudicialAddressing(trimmed);
      if (isTitleStyle) {
        ctx.doc.setFont(activeFont, "bold");
      } else {
        ctx.doc.setFont(activeFont, "normal");
      }

      if (explicitAlign === "justify") {
        // Justified — use word-level wrapping with rich segments if available
        ctx.doc.setFont(activeFont, "normal");
        const blockMaxWidth = maxWidth - effMarginLeft - effPaddingRight;
        const hasRich = !!(richSegs && hasRichFormatting(richSegs));
        const actualFirstLineWidth = blockMaxWidth - effFirstIndent;

        if (hasRich && richSegs) {
          // Use wrapRichSegmentsToLines with firstLineMaxWidth for paragraph indent
          const wrapped = wrapRichSegmentsToLines(ctx.doc, richSegs, blockMaxWidth, activeFont, effFontSize, actualFirstLineWidth);
          
          for (let li = 0; li < wrapped.lines.length; li++) {
            if (y > bottomLimit) y = newPage(ctx);
            const lineX = li === 0
              ? ABNT.marginLeft + effMarginLeft + effFirstIndent
              : ABNT.marginLeft + effMarginLeft;
            const lineMaxW = li === 0 ? actualFirstLineWidth : blockMaxWidth;
            const isLast = li === wrapped.lines.length - 1;
            renderJustifiedLine(ctx.doc, wrapped.lines[li], lineX, y, lineMaxW, isLast, activeFont, wrapped.perLineSegs[li], effFontSize);
            y += effLineSpacing;
          }
        } else {
          // Plain text path — convert to simple segments and use word-level wrapping
          // to ensure wrapping matches rendering measurement exactly (no gaps)
          const cleanTrimmed = stripMarkers(trimmed);
          const plainSegs: TextSegment[] = [{ text: cleanTrimmed, bold: false }];
          const wrapped = wrapRichSegmentsToLines(ctx.doc, plainSegs, blockMaxWidth, activeFont, effFontSize, actualFirstLineWidth);

          for (let li = 0; li < wrapped.lines.length; li++) {
            if (y > bottomLimit) y = newPage(ctx);
            const lineX = li === 0
              ? ABNT.marginLeft + effMarginLeft + effFirstIndent
              : ABNT.marginLeft + effMarginLeft;
            const lineMaxW = li === 0 ? actualFirstLineWidth : blockMaxWidth;
            const isLast = li === wrapped.lines.length - 1;
            renderJustifiedLine(ctx.doc, wrapped.lines[li], lineX, y, lineMaxW, isLast, activeFont, wrapped.perLineSegs[li], effFontSize);
            y += effLineSpacing;
          }
        }
      } else {
        // Center, right, or left — render with alignment
        const cleanTrimmed = stripMarkers(trimmed);
        const lines = ctx.doc.splitTextToSize(cleanTrimmed, maxWidth);
        const formattedLines = remapLinesToFormatted(lines, trimmed);
        
        // Split rich segments per wrapped line
        const perLineSegs = richSegs ? splitRichSegmentsByLines(richSegs, lines) : [];
        
        for (let li = 0; li < formattedLines.length; li++) {
          if (y > bottomLimit) y = newPage(ctx);
          renderFormattedLine(ctx.doc, formattedLines[li], ABNT.marginLeft, y, { fontSize: effFontSize, align: explicitAlign, pageWidth: ctx.pageWidth, docFont: activeFont, richSegments: perLineSegs[li] });
          y += effLineSpacing;
        }
      }

      y += ABNT.paragraphSpacing;
      ctx.doc.setFont(docFont, "normal");
      ctx.doc.setFontSize(ABNT.fontSize);
      continue;
    }

    if (isJudicialAddressing(trimmed)) {
      ctx.doc.setFontSize(ABNT.fontSize);
      ctx.doc.setFont(docFont, "bold");
      const lines = ctx.doc.splitTextToSize(trimmed, maxWidth);
      for (const line of lines) {
        if (y > bottomLimit) y = newPage(ctx);
        ctx.doc.text(line, ABNT.marginLeft, y);
        y += ABNT.lineSpacing;
      }
      y += ABNT.paragraphSpacing;
      ctx.doc.setFont(docFont, "normal");
      continue;
    }

    // --- Document Title Block ---
    if (!documentTitleRendered && isTitle && !isSignatureLine) {
      documentTitleRendered = true;
      const titleFontSize = ABNT.fontSize;
      ctx.doc.setFontSize(titleFontSize);
      ctx.doc.setFont(docFont, "bold");

      const titleText = trimmed.replace(/^>+\s*/, "").toUpperCase();
      const titleLines = ctx.doc.splitTextToSize(titleText, maxWidth);

      for (const line of titleLines) {
        if (y > bottomLimit) y = newPage(ctx);
        ctx.doc.text(line, ctx.pageWidth / 2, y, { align: "center" });
        y += ABNT.lineSpacing;
      }

      y += ABNT.paragraphSpacing;
      ctx.doc.setFont(docFont, "normal");
      ctx.doc.setFontSize(ABNT.fontSize);
      continue;
    }

    if (isSignatureLine) {
      ctx.doc.setFontSize(ABNT.fontSize);
      ctx.doc.setFont(docFont, "normal");
      y += ABNT.lineSpacing;
      if (y > bottomLimit) y = newPage(ctx);
      const lineWidth = 80;
      const lineX = ABNT.marginLeft;
      ctx.doc.setDrawColor(0, 0, 0);
      ctx.doc.setLineWidth(0.3);
      ctx.doc.line(lineX, y, lineX + lineWidth, y);
      y += ABNT.lineSpacingSingle;
      const labelText = trimmed.replace(/_{3,}/g, "").trim();
      if (labelText) {
        if (y > bottomLimit) y = newPage(ctx);
        ctx.doc.text(labelText, ABNT.marginLeft, y);
        y += ABNT.lineSpacing;
      }
      y += ABNT.paragraphSpacing;
    } else if (isTitle) {
      ctx.doc.setFontSize(ABNT.fontSize);
      ctx.doc.setFont(docFont, "bold");
      const titleText = trimmed.replace(/^>+\s*/, "");
      const lines = ctx.doc.splitTextToSize(titleText, maxWidth);
      y += 1.5; // espaço compacto antes do título de seção (1.5mm)
      // Keep-with-next: ensure title + at least 2 body lines fit on current page
      const titleHeight = lines.length * ABNT.lineSpacing + ABNT.paragraphSpacing;
      const minKeepWithNext = titleHeight + 2 * ABNT.lineSpacing;
      if (y + minKeepWithNext > bottomLimit + ABNT.lineSpacing) y = newPage(ctx);
      for (const line of lines) {
        if (y > bottomLimit) y = newPage(ctx);
        ctx.doc.text(line, ABNT.marginLeft, y);
        y += ABNT.lineSpacing;
      }
      y += ABNT.paragraphSpacing;
      ctx.doc.setFont(docFont, "normal");
    } else if (isCitation) {
      ctx.doc.setFontSize(ABNT.fontSizeSmall);
      ctx.doc.setFont(docFont, "normal");
      const citationText = trimmed.replace(/^[>"]+\s*/, "").replace(/[""]$/g, "");
      const citationSegs: TextSegment[] = [{ text: citationText, bold: false }];
      const wrappedCite = wrapRichSegmentsToLines(ctx.doc, citationSegs, citationMaxWidth, docFont, ABNT.fontSizeSmall);
      y += ABNT.paragraphSpacing;
      for (let li = 0; li < wrappedCite.lines.length; li++) {
        if (y > bottomLimit) y = newPage(ctx);
        renderJustifiedLine(ctx.doc, wrappedCite.lines[li], ABNT.marginLeft + ABNT.citationIndent, y, citationMaxWidth, li === wrappedCite.lines.length - 1, docFont, wrappedCite.perLineSegs[li], ABNT.fontSizeSmall);
        y += ABNT.lineSpacingSingle;
      }
      y += ABNT.paragraphSpacing;
      ctx.doc.setFontSize(ABNT.fontSize);
    } else if (isListItem) {
      ctx.doc.setFontSize(ABNT.fontSize);
      ctx.doc.setFont(docFont, "normal");
      const cleanTrimmed = stripMarkers(trimmed);
      const listMarginLeft = ABNT.marginLeft + effMarginLeft;
      const listMaxWidth = maxWidth - effMarginLeft - effPaddingRight;
      // Rich segments path — preserves bold/italic/underline from HTML
      if (richSegs && hasRichFormatting(richSegs)) {
        const wrapped = wrapRichSegmentsToLines(ctx.doc, richSegs, listMaxWidth, docFont, ABNT.fontSize);
        for (let li = 0; li < wrapped.lines.length; li++) {
          if (y > bottomLimit) y = newPage(ctx);
          renderJustifiedLine(ctx.doc, wrapped.lines[li], listMarginLeft, y, listMaxWidth, li === wrapped.lines.length - 1, docFont, wrapped.perLineSegs[li]);
          y += ABNT.lineSpacing;
        }
      } else {
        // Fallback: convert to plain segments and use word-level wrapping
        const plainSegs: TextSegment[] = [{ text: cleanTrimmed, bold: false }];
        const wrapped = wrapRichSegmentsToLines(ctx.doc, plainSegs, listMaxWidth, docFont, ABNT.fontSize);
        for (let li = 0; li < wrapped.lines.length; li++) {
          if (y > bottomLimit) y = newPage(ctx);
          renderJustifiedLine(ctx.doc, wrapped.lines[li], listMarginLeft, y, listMaxWidth, li === wrapped.lines.length - 1, docFont, wrapped.perLineSegs[li]);
          y += ABNT.lineSpacing;
        }
      }
      y += ABNT.paragraphSpacing;
    } else {
      // Regular paragraph — use imported formatting if available, otherwise ABNT defaults
      ctx.doc.setFontSize(effFontSize);
      ctx.doc.setFont(activeFont, "normal");

      if (isLabelLine) {
        // Label/data line — no indent, justified
        const cleanTrimmed = stripMarkers(trimmed);
        const labelMarginLeft = ABNT.marginLeft + effMarginLeft;
        const labelMaxWidth = maxWidth - effMarginLeft - effPaddingRight;
        // Rich segments path — preserves bold/italic/underline from HTML
        if (richSegs && hasRichFormatting(richSegs)) {
          const wrapped = wrapRichSegmentsToLines(ctx.doc, richSegs, labelMaxWidth, activeFont, effFontSize);
          for (let li = 0; li < wrapped.lines.length; li++) {
            if (y > bottomLimit) y = newPage(ctx);
            renderJustifiedLine(ctx.doc, wrapped.lines[li], labelMarginLeft, y, labelMaxWidth, li === wrapped.lines.length - 1, activeFont, wrapped.perLineSegs[li], effFontSize);
            y += effLineSpacing;
          }
        } else {
          // Fallback: convert to plain segments and use word-level wrapping
          const plainSegs: TextSegment[] = [{ text: cleanTrimmed, bold: false }];
          const wrapped = wrapRichSegmentsToLines(ctx.doc, plainSegs, labelMaxWidth, activeFont, effFontSize);
          for (let li = 0; li < wrapped.lines.length; li++) {
            if (y > bottomLimit) y = newPage(ctx);
            renderJustifiedLine(ctx.doc, wrapped.lines[li], labelMarginLeft, y, labelMaxWidth, li === wrapped.lines.length - 1, activeFont, wrapped.perLineSegs[li], effFontSize);
            y += effLineSpacing;
          }
        }
        y += ABNT.paragraphSpacing;
      } else {
        // Regular paragraphs — marginLeft for ALL lines, firstIndent for first line only
        const blockMaxWidth = maxWidth - effMarginLeft - effPaddingRight;
        if (richSegs && hasRichFormatting(richSegs)) {
          ctx.doc.setFont(activeFont, "normal");
          const actualFirstLineWidth = blockMaxWidth - effFirstIndent;

          // Use wrapRichSegmentsToLines with firstLineMaxWidth for paragraph indent
          const wrapped = wrapRichSegmentsToLines(ctx.doc, richSegs, blockMaxWidth, activeFont, effFontSize, actualFirstLineWidth);

          for (let li = 0; li < wrapped.lines.length; li++) {
            if (y > bottomLimit) y = newPage(ctx);
            const lineX = li === 0
              ? ABNT.marginLeft + effMarginLeft + effFirstIndent
              : ABNT.marginLeft + effMarginLeft;
            const lineMaxW = li === 0 ? actualFirstLineWidth : blockMaxWidth;
            const isLast = li === wrapped.lines.length - 1;
            renderJustifiedLine(ctx.doc, wrapped.lines[li], lineX, y, lineMaxW, isLast, activeFont, wrapped.perLineSegs[li], effFontSize);
            y += effLineSpacing;
          }
        } else {
          // No rich segments — convert to plain segments and use word-level wrapping
          const cleanTrimmed = trimmed;
          const plainSegs: TextSegment[] = [{ text: cleanTrimmed, bold: false }];
          const actualFirstLineWidth = blockMaxWidth - effFirstIndent;
          const wrapped = wrapRichSegmentsToLines(ctx.doc, plainSegs, blockMaxWidth, activeFont, effFontSize, actualFirstLineWidth);

          for (let li = 0; li < wrapped.lines.length; li++) {
            if (y > bottomLimit) y = newPage(ctx);
            const lineX = li === 0
              ? ABNT.marginLeft + effMarginLeft + effFirstIndent
              : ABNT.marginLeft + effMarginLeft;
            const lineMaxW = li === 0 ? actualFirstLineWidth : blockMaxWidth;
            const isLast = li === wrapped.lines.length - 1;
            renderJustifiedLine(ctx.doc, wrapped.lines[li], lineX, y, lineMaxW, isLast, activeFont, wrapped.perLineSegs[li], effFontSize);
            y += effLineSpacing;
          }
        }
        y += ABNT.paragraphSpacing;
      }
    }
  }
}

/** Remove trailing blank pages (pages with only letterhead/footer, no body content) */
function removeTrailingBlankPages(ctx: RenderContext) {
  if (ctx.lastPageHasContent) return; // last page has content, keep it
  const totalPages = ctx.doc.getNumberOfPages();
  if (totalPages <= 1) return;
  try {
    ctx.doc.deletePage(totalPages);
  } catch {
    // Silently fail if deletePage is not supported
  }
}

/** Detect if renderContent produced a blank PDF and fall back to raw text */
function applyBlankPdfFallback(doc: jsPDF, content: string, branded: boolean, customMarginTop?: number, customMarginBottom?: number) {
  const pageCount = doc.getNumberOfPages();
  if (pageCount > 1) return; // multi-page = content was rendered

  const rawText = content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
  if (!rawText) return;

  // A blank A4 PDF with just letterhead/footer is typically < 3KB
  const testOutput = doc.output("arraybuffer");
  if (testOutput.byteLength >= 3000) return; // has real content

  const mTop = customMarginTop ?? ABNT.marginTop;
  let y = branded ? (customMarginTop ?? BRANDED_MARGIN_TOP_MM) : mTop;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - ABNT.marginLeft - ABNT.marginRight;
  const mBottom = customMarginBottom ?? ABNT.marginBottom;
  const bottomLimit = pageHeight - (branded ? BRANDED_RESERVED_BOTTOM_MM : mBottom);

  doc.setFontSize(ABNT.fontSize);
  doc.setFont("times", "normal");
  doc.setTextColor(0, 0, 0);

  const lines = doc.splitTextToSize(rawText, maxWidth);
  let fallbackPage = 1;
  for (const line of lines) {
    if (y > bottomLimit) {
      doc.addPage();
      fallbackPage++;
      y = branded ? (customMarginTop ?? BRANDED_MARGIN_TOP_MM) : mTop;
      // Replicate page setup (letterhead + footer) on fallback pages
      // Use a simple ABNT page number footer for fallback
      if (fallbackPage >= 2) {
        doc.setFontSize(ABNT.fontSizeSmall);
        doc.setFont("times", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(String(fallbackPage), pageWidth / 2, pageHeight - mBottom + 10, { align: "center" });
        // Reset after footer
        doc.setFontSize(ABNT.fontSize);
        doc.setFont("times", "normal");
        doc.setTextColor(0, 0, 0);
      }
    }
    doc.text(line, ABNT.marginLeft, y);
    y += ABNT.lineSpacing;
  }
}

/** @deprecated Use generateHTMLPDFBlob from html-pdf-printer.ts for WYSIWYG parity with editor */
export async function generatePDFBase64(content: string, watermark: string, documentType?: string, forceLetterhead?: boolean, customMarginTop?: number, customMarginBottom?: number): Promise<string> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const branded = forceLetterhead || isBrandedDocument(documentType);

  const [letterheadBase64, escritorioConfig] = await Promise.all([
    branded ? loadLetterheadImage() : Promise.resolve(null),
    fetchEscritorioConfig()
  ]);

  if (branded && letterheadBase64) addLetterheadBackground(doc, letterheadBase64, pageWidth, pageHeight);
  addFooter(doc, escritorioConfig, pageWidth, pageHeight, 1, branded);
  if (watermark && watermark !== "none") addWatermark(doc, watermark, pageWidth, pageHeight);

  const ctx: RenderContext = {
    doc, pageWidth, pageHeight, letterheadBase64, escritorioConfig, watermark, pageNumber: 1, branded, customMarginTop, customMarginBottom, docFont: "times", lastPageHasContent: true,
  };

  setDocumentMetadata(doc, { documentType, authorName: escritorioConfig.nome_escritorio });
  renderContent(ctx, content);
  removeTrailingBlankPages(ctx);
  applyBlankPdfFallback(doc, content, branded, customMarginTop, customMarginBottom);
  
  // Use arraybuffer output for reliable binary-to-base64 conversion
  // (avoids encoding issues with datauristring for accented characters)
  const arrayBuffer = doc.output("arraybuffer");
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

/** @deprecated Use generateHTMLPDFBlob from html-pdf-printer.ts for WYSIWYG parity with editor */
export async function generatePDFBlob(content: string, watermark: string, documentType?: string, forceLetterhead?: boolean, customMarginTop?: number, customMarginBottom?: number): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const branded = forceLetterhead || isBrandedDocument(documentType);

  const [letterheadBase64, escritorioConfig] = await Promise.all([
    branded ? loadLetterheadImage() : Promise.resolve(null),
    fetchEscritorioConfig()
  ]);

  if (branded && letterheadBase64) addLetterheadBackground(doc, letterheadBase64, pageWidth, pageHeight);
  addFooter(doc, escritorioConfig, pageWidth, pageHeight, 1, branded);
  if (watermark && watermark !== "none") addWatermark(doc, watermark, pageWidth, pageHeight);

  const ctx: RenderContext = {
    doc, pageWidth, pageHeight, letterheadBase64, escritorioConfig, watermark, pageNumber: 1, branded, customMarginTop, customMarginBottom, docFont: "times", lastPageHasContent: true,
  };

  setDocumentMetadata(doc, { documentType, authorName: escritorioConfig.nome_escritorio });
  renderContent(ctx, content);
  removeTrailingBlankPages(ctx);
  applyBlankPdfFallback(doc, content, branded, customMarginTop, customMarginBottom);
  return doc.output("blob");
}

/** @deprecated Use downloadHTMLAsPDF from html-pdf-printer.ts for WYSIWYG parity with editor */
export async function generatePDF({ content, watermark, fileName, documentType, documentTitle, forceLetterhead, customMarginTop, customMarginBottom }: GeneratePDFOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const branded = forceLetterhead || isBrandedDocument(documentType);

  const [letterheadBase64, escritorioConfig] = await Promise.all([
    branded ? loadLetterheadImage() : Promise.resolve(null),
    fetchEscritorioConfig()
  ]);

  if (branded && letterheadBase64) addLetterheadBackground(doc, letterheadBase64, pageWidth, pageHeight);
  addFooter(doc, escritorioConfig, pageWidth, pageHeight, 1, branded);
  if (watermark && watermark !== "none") addWatermark(doc, watermark, pageWidth, pageHeight);

  const ctx: RenderContext = {
    doc, pageWidth, pageHeight, letterheadBase64, escritorioConfig, watermark, pageNumber: 1, branded, customMarginTop, customMarginBottom, docFont: "times", lastPageHasContent: true,
  };

  setDocumentMetadata(doc, { title: documentTitle || fileName, documentType, authorName: escritorioConfig.nome_escritorio });
  renderContent(ctx, content);
  removeTrailingBlankPages(ctx);
  applyBlankPdfFallback(doc, content, branded, customMarginTop, customMarginBottom);
  doc.save(fileName);
}

function addWatermark(doc: jsPDF, watermark: string, pageWidth: number, pageHeight: number) {
  const labels: Record<string, string> = {
    confidencial: "CONFIDENCIAL",
    rascunho: "RASCUNHO",
    oficial: "OFICIAL",
  };

  const label = labels[watermark];
  if (!label) return;

  // Save current state
  const currentFontSize = doc.getFontSize();
  const currentFont = doc.getFont();

  doc.setFontSize(45);
  doc.setFont("times", "bold");

  // Use very light color instead of GState opacity to avoid opacity leak
  // GState opacity persists and makes ALL subsequent text nearly invisible
  const colorMap: Record<string, [number, number, number]> = {
    confidencial: [252, 235, 235],  // very light red
    rascunho: [240, 240, 240],      // very light gray
    oficial: [235, 240, 252],       // very light blue
  };
  const color = colorMap[watermark] || [240, 240, 240];
  doc.setTextColor(color[0], color[1], color[2]);

  doc.text(label, pageWidth / 2, pageHeight / 2, { align: "center", angle: 45 });

  // Restore state — CRITICAL: reset text color to black
  doc.setFontSize(currentFontSize);
  doc.setFont(currentFont.fontName, currentFont.fontStyle);
  doc.setTextColor(0, 0, 0);
}

export function clearEscritorioConfigCache() {
  escritorioConfigCache = null;
  configCacheTime = 0;
}
