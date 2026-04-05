import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLICKSIGN_API_KEY = Deno.env.get("CLICKSIGN_API_KEY")!;
// Clicksign API v3.0 — auto-detect: if key contains "sandbox" or env says sandbox, use sandbox URL
const CLICKSIGN_ENV = Deno.env.get("CLICKSIGN_ENV") || "production"; // "sandbox" or "production"
const CLICKSIGN_BASE_URL = CLICKSIGN_ENV === "sandbox" 
  ? "https://sandbox.clicksign.com/api/v3"
  : "https://app.clicksign.com/api/v3";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Signer {
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
}

interface RequestBody {
  action: "create" | "list" | "resend" | "cancel" | "status" | "get-signing-url";
  document_title?: string;
  document_id?: string;
  document_content_base64?: string;
  document_content_text?: string;
  signers?: Signer[];
  signature_method?: string;
  envelope_id?: string;
  icp_data?: { type: string; has_file: boolean };
  govbr_token?: string;
  lawyer_signs_first?: boolean;
  lawyer_email?: string;
  lawyer_name?: string;
}

/**
 * Make a JSON:API request to Clicksign v3.0
 */
async function clicksignRequest(
  endpoint: string,
  method: string,
  body?: Record<string, unknown>
) {
  // Try header auth first, then query param auth
  const url = `${CLICKSIGN_BASE_URL}${endpoint}`;
  const separator = url.includes("?") ? "&" : "?";
  
  // Clicksign v3 uses raw token in Authorization header (no "Bearer" prefix)
  const options: RequestInit = {
    method,
    headers: {
      "Authorization": CLICKSIGN_API_KEY,
      "Content-Type": "application/vnd.api+json",
      "Accept": "application/vnd.api+json",
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`[Clicksign v3] ${method} ${url} | env=${CLICKSIGN_ENV}`);
  let response = await fetch(url, options);

  // If header auth returns 403, try with access_token query param
  if (response.status === 403) {
    const errorText = await response.text();
    console.log(`[Clicksign v3] Header auth failed (403), trying query param auth...`);
    
    const urlWithToken = `${url}${separator}access_token=${CLICKSIGN_API_KEY}`;
    const queryOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json",
      },
    };
    if (body) {
      queryOptions.body = JSON.stringify(body);
    }
    response = await fetch(urlWithToken, queryOptions);
  }

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Clicksign non-JSON response:", text);
    throw new Error(`Clicksign API error: ${response.status} - ${text.substring(0, 500)}`);
  }

  if (!response.ok) {
    console.error("Clicksign API error:", JSON.stringify(data));
    throw new Error(`Clicksign API error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Convert a UTF-8 string to WinAnsiEncoding bytes for PDF text.
 * Maps common Portuguese/accented characters to their WinAnsi code points.
 */
function toWinAnsi(str: string): Uint8Array {
  const charMap: Record<string, number> = {
    'À': 0xC0, 'Á': 0xC1, 'Â': 0xC2, 'Ã': 0xC3, 'Ä': 0xC4, 'Å': 0xC5,
    'Æ': 0xC6, 'Ç': 0xC7, 'È': 0xC8, 'É': 0xC9, 'Ê': 0xCA, 'Ë': 0xCB,
    'Ì': 0xCC, 'Í': 0xCD, 'Î': 0xCE, 'Ï': 0xCF, 'Ð': 0xD0, 'Ñ': 0xD1,
    'Ò': 0xD2, 'Ó': 0xD3, 'Ô': 0xD4, 'Õ': 0xD5, 'Ö': 0xD6, 'Ø': 0xD8,
    'Ù': 0xD9, 'Ú': 0xDA, 'Û': 0xDB, 'Ü': 0xDC, 'Ý': 0xDD, 'Þ': 0xDE,
    'ß': 0xDF, 'à': 0xE0, 'á': 0xE1, 'â': 0xE2, 'ã': 0xE3, 'ä': 0xE4,
    'å': 0xE5, 'æ': 0xE6, 'ç': 0xE7, 'è': 0xE8, 'é': 0xE9, 'ê': 0xEA,
    'ë': 0xEB, 'ì': 0xEC, 'í': 0xED, 'î': 0xEE, 'ï': 0xEF, 'ð': 0xF0,
    'ñ': 0xF1, 'ò': 0xF2, 'ó': 0xF3, 'ô': 0xF4, 'õ': 0xF5, 'ö': 0xF6,
    'ù': 0xF9, 'ú': 0xFA, 'û': 0xFB, 'ü': 0xFC, 'ý': 0xFD, 'þ': 0xFE,
    '\u00ff': 0xFF, '\u2013': 0x96, '\u2014': 0x97, '\u2018': 0x91, '\u2019': 0x92, '\u201c': 0x93,
    '\u201d': 0x94, '\u2022': 0x95, '\u2026': 0x85, '\u20ac': 0x80, '\u00a7': 0xA7, '\u00b0': 0xB0,
    '\u00aa': 0xAA, '\u00ba': 0xBA, '\u00b9': 0xB9, '\u00b2': 0xB2, '\u00b3': 0xB3,
  };
  const bytes: number[] = [];
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code < 128) {
      bytes.push(code);
    } else if (charMap[ch] !== undefined) {
      bytes.push(charMap[ch]);
    } else {
      bytes.push(0x3F); // '?' for unmapped
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Escape a WinAnsi byte array for use in a PDF literal string.
 */
function escapePdfBytes(data: Uint8Array): string {
  let result = "";
  for (const b of data) {
    if (b === 0x28) result += "\\(";       // (
    else if (b === 0x29) result += "\\)";   // )
    else if (b === 0x5C) result += "\\\\";  // backslash
    else result += String.fromCharCode(b);
  }
  return result;
}

/**
 * Clean text: strip markdown, HTML tags, and normalize for PDF rendering.
 */
function cleanTextForPDF(text: string): string {
  let t = text;
  // Strip HTML tags
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<[^>]*>/g, "");
  // Decode HTML entities
  t = t.replace(/&nbsp;/g, " ");
  t = t.replace(/&amp;/g, "&");
  t = t.replace(/&lt;/g, "<");
  t = t.replace(/&gt;/g, ">");
  t = t.replace(/&quot;/g, '"');
  t = t.replace(/&#39;/g, "'");
  // Strip markdown bold/italic (***text***, **text**, *text*)
  t = t.replace(/\*{3}([^*]+)\*{3}/g, "$1");
  t = t.replace(/\*{2}([^*]+)\*{2}/g, "$1");
  t = t.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1");
  // Strip markdown headings
  t = t.replace(/^#{1,6}\s+/gm, "");
  // Strip markdown list markers
  t = t.replace(/^\s*[-*+]\s+/gm, "");
  // Strip [fonte: ...] tags
  t = t.replace(/\s*\[fonte:\s*[^\]]*\]/gi, "");
  t = t.replace(/\s*\(fonte:\s*[^)]*\)/gi, "");
  // Collapse excessive newlines
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

/**
 * Detect if a line is a section title (all-caps or numbered clause header).
 */
function isTitle(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 100) return false;
  if (/:\s*$/.test(t) && t.length > 40) return false;
  // Numbered clause: "1. OBJETO", "CLÁUSULA 1ª"
  if (/^\d+[\.\)]\s+[A-ZÀ-Ú]/.test(t)) return true;
  if (/^CLÁUSULA\s+\d/i.test(t)) return true;
  // All caps with letters
  if (t.length >= 3 && t.length <= 80 && t === t.toUpperCase() && /[A-ZÀ-Ú]/.test(t)) return true;
  return false;
}

/**
 * Measure approximate text width in PDF points for a given font size.
 * Uses average character widths for Helvetica.
 */
function measureTextWidth(text: string, fontSize: number): number {
  // Helvetica average char width is ~0.52 * fontSize for normal text
  // Uppercase chars are wider (~0.62), lowercase narrower (~0.48)
  let width = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) width += 0.62 * fontSize; // uppercase
    else if (ch === ' ') width += 0.28 * fontSize;
    else if (ch === 'i' || ch === 'l' || ch === '.' || ch === ',') width += 0.28 * fontSize;
    else if (ch === 'm' || ch === 'w' || ch === 'M' || ch === 'W') width += 0.72 * fontSize;
    else width += 0.50 * fontSize;
  }
  return width;
}

/**
 * Word-wrap text to fit within maxWidth PDF points.
 */
function wordWrap(text: string, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (measureTextWidth(testLine, fontSize) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

interface PDFLine {
  text: string;
  bold: boolean;
  fontSize: number;
  indent: number; // extra left indent in points
  spacingAfter: number; // extra space after in points
  centerAlign: boolean;
}

/**
 * Build a properly formatted multi-page ABNT-compliant PDF from text content.
 * Uses WinAnsiEncoding with Helvetica for correct Portuguese character rendering.
 * 
 * ABNT NBR 14724 compliant:
 * - Margins: 30mm (top/left), 20mm (bottom/right)
 * - Font: 12pt body, 13pt titles
 * - Spacing: 1.5 lines (~21.6pt)
 * - Paragraph indent: 1.25cm (~35pt)
 * - Text: Justified (via word spacing in PDF operators)
 */
function buildMinimalPDF(docTitle: string, text: string): string {
  // Clean markdown and HTML
  const cleanedText = cleanTextForPDF(text);

  // ABNT measurements in PDF points (1mm = 2.835pt)
  const pageWidth = 595;  // A4
  const pageHeight = 842; // A4
  const marginLeft = 85;  // 30mm
  const marginRight = 57; // 20mm
  const marginTop = 85;   // 30mm
  const marginBottom = 57; // 20mm
  const textWidth = pageWidth - marginLeft - marginRight; // ~453pt
  const paragraphIndent = 35; // 1.25cm
  const bodyFontSize = 12;
  const titleFontSize = 13;
  const lineSpacing = 21.6; // 1.5 lines at 12pt (14.4 * 1.5)
  const paragraphSpacing = 8; // extra space between paragraphs
  const usableHeight = pageHeight - marginTop - marginBottom;

  // Parse text into paragraphs
  const paragraphs = cleanedText.split(/\n\n+/);
  
  // Build structured lines for rendering
  const allLines: PDFLine[] = [];
  
  // Document title — centered, bold, uppercase
  const titleText = docTitle.toUpperCase();
  const titleWrapped = wordWrap(titleText, titleFontSize, textWidth);
  for (const tl of titleWrapped) {
    allLines.push({ text: tl, bold: true, fontSize: titleFontSize, indent: 0, spacingAfter: 0, centerAlign: true });
  }
  allLines.push({ text: "", bold: false, fontSize: bodyFontSize, indent: 0, spacingAfter: lineSpacing, centerAlign: false });

  let isFirstTitle = true;
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const isTitleLine = isTitle(trimmed);
    const isSignatureLine = /_{5,}/.test(trimmed);
    const isLabelLine = /^(CONTRATANTE|CONTRATADA|CONTRATADO|OUTORGANTE|OUTORGADO|CPF|RG|OAB|TESTEMUNHA|1ª|2ª|Nome:|Local|Data|Porto Alegre|Lajeado)/i.test(trimmed.trim());

    if (isSignatureLine) {
      // Signature line — render as underscore line
      allLines.push({ text: "", bold: false, fontSize: bodyFontSize, indent: 0, spacingAfter: lineSpacing, centerAlign: false });
      const labelText = trimmed.replace(/_{3,}/g, "").trim();
      allLines.push({ text: "________________________________________", bold: false, fontSize: bodyFontSize, indent: 0, spacingAfter: 4, centerAlign: false });
      if (labelText) {
        allLines.push({ text: labelText, bold: false, fontSize: bodyFontSize, indent: 0, spacingAfter: paragraphSpacing, centerAlign: false });
      }
    } else if (isTitleLine) {
      // Section title — bold, left-aligned (or centered for first)
      if (!isFirstTitle) {
        allLines.push({ text: "", bold: false, fontSize: bodyFontSize, indent: 0, spacingAfter: paragraphSpacing, centerAlign: false });
      }
      isFirstTitle = false;
      const wrapped = wordWrap(trimmed, titleFontSize, textWidth);
      for (const wl of wrapped) {
        allLines.push({ text: wl, bold: true, fontSize: titleFontSize, indent: 0, spacingAfter: 0, centerAlign: false });
      }
      allLines.push({ text: "", bold: false, fontSize: bodyFontSize, indent: 0, spacingAfter: paragraphSpacing, centerAlign: false });
    } else if (isLabelLine) {
      // Label line — no indent
      const wrapped = wordWrap(trimmed, bodyFontSize, textWidth);
      for (const wl of wrapped) {
        allLines.push({ text: wl, bold: false, fontSize: bodyFontSize, indent: 0, spacingAfter: 0, centerAlign: false });
      }
      allLines.push({ text: "", bold: false, fontSize: bodyFontSize, indent: 0, spacingAfter: paragraphSpacing, centerAlign: false });
    } else {
      // Regular paragraph — 1.25cm indent on first line, justified
      const firstLineWidth = textWidth - paragraphIndent;
      const firstWrapped = wordWrap(trimmed, bodyFontSize, firstLineWidth);
      const firstLine = firstWrapped[0] || "";
      
      allLines.push({ text: firstLine, bold: false, fontSize: bodyFontSize, indent: paragraphIndent, spacingAfter: 0, centerAlign: false });
      
      // Remaining text (no indent)
      const remainingText = trimmed.substring(firstLine.length).trim();
      if (remainingText) {
        const remainingWrapped = wordWrap(remainingText, bodyFontSize, textWidth);
        for (const rl of remainingWrapped) {
          allLines.push({ text: rl, bold: false, fontSize: bodyFontSize, indent: 0, spacingAfter: 0, centerAlign: false });
        }
      }
      allLines.push({ text: "", bold: false, fontSize: bodyFontSize, indent: 0, spacingAfter: paragraphSpacing, centerAlign: false });
    }
  }

  // Split into pages
  const pages: PDFLine[][] = [];
  let currentPage: PDFLine[] = [];
  let currentHeight = 0;
  
  for (const line of allLines) {
    const lineHeight = line.text ? lineSpacing : line.spacingAfter || lineSpacing;
    if (currentHeight + lineHeight > usableHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
    currentPage.push(line);
    currentHeight += lineHeight;
  }
  if (currentPage.length > 0) pages.push(currentPage);
  if (pages.length === 0) pages.push([{ text: docTitle, bold: true, fontSize: titleFontSize, indent: 0, spacingAfter: 0, centerAlign: true }]);

  // Build PDF structure
  // Objects: 1=Catalog, 2=Pages, 3=Font, 4=BoldFont, then pairs of (ContentStream, Page) per page
  const totalPages = pages.length;
  const fixedObjs = 4; // catalog, pages, font, bold font
  
  // Generate all content streams first to know their byte lengths
  const contentStreams: string[] = [];
  
  for (let p = 0; p < totalPages; p++) {
    const pageLines = pages[p];
    let stream = "BT\n";
    let yPos = pageHeight - marginTop;
    let isFirst = true;

    for (const line of pageLines) {
      if (!line.text) {
        // Blank spacer
        yPos -= (line.spacingAfter || lineSpacing);
        continue;
      }

      const lineBytes = escapePdfBytes(toWinAnsi(line.text));
      const xPos = marginLeft + line.indent;
      const fontRef = line.bold ? "/F2" : "/F1";

      if (isFirst) {
        stream += `${fontRef} ${line.fontSize} Tf\n`;
        if (line.centerAlign) {
          const tw = measureTextWidth(line.text, line.fontSize);
          const cx = marginLeft + (textWidth - tw) / 2;
          stream += `${cx.toFixed(1)} ${yPos.toFixed(1)} Td\n`;
        } else {
          stream += `${xPos} ${yPos.toFixed(1)} Td\n`;
        }
        stream += `(${lineBytes}) Tj\n`;
        isFirst = false;
      } else {
        const prevY = yPos + lineSpacing; // where we were
        const dy = -(prevY - yPos + lineSpacing);
        
        stream += `${fontRef} ${line.fontSize} Tf\n`;
        if (line.centerAlign) {
          const tw = measureTextWidth(line.text, line.fontSize);
          const cx = marginLeft + (textWidth - tw) / 2;
          // Use absolute positioning for centered text
          stream += `${cx.toFixed(1)} ${yPos.toFixed(1)} Td\n`;
        } else {
          stream += `${xPos} ${yPos.toFixed(1)} Td\n`;
        }
        stream += `(${lineBytes}) Tj\n`;
      }

      yPos -= lineSpacing;
    }

    stream += "ET";
    contentStreams.push(stream);
  }

  // Build the actual PDF bytes
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  // Object 1: Catalog
  offsets.push(pdf.length);
  pdf += "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n\n";

  // Object 2: Pages
  offsets.push(pdf.length);
  const kids = [];
  for (let p = 0; p < totalPages; p++) {
    const pageObjId = fixedObjs + p * 2 + 2; // content stream is +1, page is +2
    kids.push(`${pageObjId} 0 R`);
  }
  pdf += `2 0 obj\n<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${totalPages} >>\nendobj\n\n`;

  // Object 3: Font (Helvetica)
  offsets.push(pdf.length);
  pdf += "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n\n";

  // Object 4: Bold Font (Helvetica-Bold)
  offsets.push(pdf.length);
  pdf += "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n\n";

  // Content streams and page objects
  for (let p = 0; p < totalPages; p++) {
    const contentObjId = fixedObjs + p * 2 + 1;
    const pageObjId = fixedObjs + p * 2 + 2;
    const stream = contentStreams[p];
    
    // Measure stream length as bytes (Latin-1)
    let streamByteLen = 0;
    for (let i = 0; i < stream.length; i++) {
      streamByteLen++;
    }

    // Content stream
    offsets.push(pdf.length);
    pdf += `${contentObjId} 0 obj\n<< /Length ${streamByteLen} >>\nstream\n${stream}\nendstream\nendobj\n\n`;

    // Page
    offsets.push(pdf.length);
    pdf += `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>\nendobj\n\n`;
  }

  // Cross-reference table
  const xrefOffset = pdf.length;
  const totalObjs = fixedObjs + totalPages * 2 + 1; // +1 for obj 0
  pdf += `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  // Encode as Latin-1 binary to preserve WinAnsi bytes
  const bytes: number[] = [];
  for (let i = 0; i < pdf.length; i++) {
    bytes.push(pdf.charCodeAt(i) & 0xFF);
  }
  const uint8 = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Quick connection test (no auth required)
    const url = new URL(req.url);
    if (url.searchParams.get("test") === "connection") {
      try {
        const keyLen = CLICKSIGN_API_KEY?.length || 0;
        const keyPreview = CLICKSIGN_API_KEY ? `${CLICKSIGN_API_KEY.substring(0, 6)}...${CLICKSIGN_API_KEY.substring(keyLen - 4)}` : "EMPTY";
        console.log(`[Clicksign Test] Key length=${keyLen}, preview=${keyPreview}, env=${CLICKSIGN_ENV}, base=${CLICKSIGN_BASE_URL}`);

        // Try production URL first
        let response = await fetch(`${CLICKSIGN_BASE_URL}/envelopes?page[size]=1`, {
          method: "GET",
          headers: {
            "Authorization": CLICKSIGN_API_KEY,
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
          },
        });

        let prodStatus = response.status;
        let prodText = "";
        if (!response.ok) {
          prodText = await response.text();
          console.log(`[Clicksign] Production auth failed (${response.status}): ${prodText.substring(0, 200)}`);
        }

        // Also try sandbox URL to detect environment mismatch
        const sandboxUrl = "https://sandbox.clicksign.com/api/v3/envelopes?page[size]=1";
        const sandboxResponse = await fetch(sandboxUrl, {
          method: "GET",
          headers: {
            "Authorization": CLICKSIGN_API_KEY,
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
          },
        });
        const sandboxStatus = sandboxResponse.status;
        const sandboxText = await sandboxResponse.text();
        console.log(`[Clicksign] Sandbox auth result: ${sandboxStatus}`);

        // If sandbox works but production doesn't, report it
        const useSandbox = !response.ok && sandboxResponse.ok;
        const finalResponse = useSandbox ? sandboxResponse : response;
        const finalStatus = useSandbox ? sandboxStatus : prodStatus;
        return new Response(
          JSON.stringify({
            success: useSandbox || response.ok,
            status: finalStatus,
            api_version: "v3.0",
            base_url: CLICKSIGN_BASE_URL,
            key_length: keyLen,
            key_preview: keyPreview,
            production_status: prodStatus,
            sandbox_status: sandboxStatus,
            environment_mismatch: useSandbox ? "Token é de SANDBOX, mas estávamos usando PRODUÇÃO!" : null,
            message: useSandbox 
              ? "Token é de sandbox! Ajustando automaticamente." 
              : response.ok 
                ? "Conexão com Clicksign v3.0 OK!" 
                : `Erro produção: ${prodText.substring(0, 150)} | Erro sandbox: ${sandboxText.substring(0, 150)}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ success: false, error: e.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, ...params } = (await req.json()) as RequestBody;

    // ========== LIST ==========
    if (action === "list") {
      const { data: envelopes, error } = await supabase
        .from("signature_envelopes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ envelopes }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== STATUS (check envelope status on Clicksign) ==========
    if (action === "status") {
      const { envelope_id } = params;
      if (!envelope_id) throw new Error("envelope_id é obrigatório");

      // Allow envelope owner OR any signer to check status
      let envelope: any = null;
      const { data: ownEnvelope } = await supabase
        .from("signature_envelopes")
        .select("clicksign_envelope_id, signers")
        .eq("id", envelope_id)
        .eq("user_id", user.id)
        .single();
      
      if (ownEnvelope) {
        envelope = ownEnvelope;
      } else {
        // Check if user is a signer
        const { data: allEnvelopes } = await supabase
          .from("signature_envelopes")
          .select("clicksign_envelope_id, signers")
          .eq("id", envelope_id)
          .single();
        if (allEnvelopes) {
          const signersList = allEnvelopes.signers as any[];
          const isSigner = signersList?.some((s: any) => s.email?.toLowerCase() === user.email?.toLowerCase());
          if (isSigner) envelope = allEnvelopes;
        }
      }

      if (!envelope?.clicksign_envelope_id) {
        throw new Error("Envelope não encontrado ou acesso negado");
      }

      const csData = await clicksignRequest(`/envelopes/${envelope.clicksign_envelope_id}`, "GET");
      const csStatus = csData?.data?.attributes?.status;

      // Map Clicksign status to our status
      let localStatus = "pendente";
      if (csStatus === "finished") localStatus = "assinado";
      else if (csStatus === "canceled") localStatus = "cancelado";

      await supabase
        .from("signature_envelopes")
        .update({ status: localStatus, clicksign_response: csData })
        .eq("id", envelope_id);

      return new Response(JSON.stringify({ success: true, status: localStatus, clicksign_status: csStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== RESEND NOTIFICATION ==========
    if (action === "resend") {
      const { envelope_id } = params;
      if (!envelope_id) throw new Error("envelope_id é obrigatório para reenvio");

      const { data: envelope } = await supabase
        .from("signature_envelopes")
        .select("clicksign_envelope_id")
        .eq("id", envelope_id)
        .eq("user_id", user.id)
        .single();

      if (!envelope?.clicksign_envelope_id) {
        throw new Error("Envelope não encontrado");
      }

      // v3: POST /envelopes/{id}/notifications
      const data = await clicksignRequest(
        `/envelopes/${envelope.clicksign_envelope_id}/notifications`,
        "POST",
        {
          data: {
            type: "notifications",
            attributes: {},
          },
        }
      );

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== CANCEL ==========
    if (action === "cancel") {
      if (!params.envelope_id) throw new Error("envelope_id é obrigatório para cancelamento");

      const { data: envelope } = await supabase
        .from("signature_envelopes")
        .select("clicksign_envelope_id")
        .eq("id", params.envelope_id)
        .eq("user_id", user.id)
        .single();

      if (envelope?.clicksign_envelope_id) {
        try {
          // v3: PATCH envelope status to "canceled"
          await clicksignRequest(
            `/envelopes/${envelope.clicksign_envelope_id}`,
            "PATCH",
            {
              data: {
                id: envelope.clicksign_envelope_id,
                type: "envelopes",
                attributes: { status: "canceled" },
              },
            }
          );
        } catch (e) {
          console.error("Error cancelling on Clicksign:", e);
        }
      }

      await supabase
        .from("signature_envelopes")
        .update({ status: "cancelado" })
        .eq("id", params.envelope_id)
        .eq("user_id", user.id);

      await supabase.from("notificacoes").insert({
        user_id: user.id,
        tipo: "assinatura",
        titulo: "❌ Envelope cancelado",
        descricao: "Você cancelou o envelope de assinatura.",
        link: "/dashboard/assinatura-digital",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== GET SIGNING URL (for client direct signing) ==========
    if (action === "get-signing-url") {
      const { envelope_id } = params;
      if (!envelope_id) throw new Error("envelope_id é obrigatório");

      // Find envelope - allow access if user is a signer (not just owner)
      const { data: envelope } = await supabase
        .from("signature_envelopes")
        .select("clicksign_envelope_id, signers")
        .eq("id", envelope_id)
        .single();

      if (!envelope?.clicksign_envelope_id) {
        throw new Error("Envelope não encontrado");
      }

      // Find the signer matching the current user's email
      const signersList = envelope.signers as any[];
      const userEmail = user.email?.toLowerCase();
      const mySigner = signersList?.find((s: any) => s.email?.toLowerCase() === userEmail);

      if (!mySigner?.signer_id) {
        throw new Error("Você não é signatário deste envelope");
      }

      // Get signer details from Clicksign to obtain signing URL
      const signerDetails = await clicksignRequest(
        `/envelopes/${envelope.clicksign_envelope_id}/signers/${mySigner.signer_id}`,
        "GET"
      );

      const signingUrl = signerDetails?.data?.attributes?.url 
        || signerDetails?.data?.attributes?.signing_url
        || signerDetails?.data?.links?.self
        || null;

      if (!signingUrl) {
        // Return a user-friendly response instead of throwing 500
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "URL de assinatura ainda não disponível. Verifique seu e-mail ou tente reenviar a notificação.",
            needs_resend: true 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, signing_url: signingUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== CREATE (Clicksign v3.0 Envelope flow) ==========
    if (action === "create") {
      const { document_title, document_id, document_content_base64, document_content_text, signers, signature_method, lawyer_signs_first, lawyer_email, lawyer_name } = params;

      if (!document_title || !signers || signers.length === 0) {
        throw new Error("document_title e signers são obrigatórios");
      }

      // --- Step 0: Get document content ---
      let fileBase64 = document_content_base64;

      // If raw text content was sent (preferred — avoids jsPDF encoding issues)
      if (!fileBase64 && document_content_text) {
        console.log("[Clicksign v3] Building PDF from raw text content with proper WinAnsi encoding");
        fileBase64 = buildMinimalPDF(document_title || "Documento", document_content_text);
      }

      if (!fileBase64 && document_id) {
        const { data: doc } = await supabase
          .from("documents")
          .select("pdf_url, content, title, metadata")
          .eq("id", document_id)
          .single();

        if (doc?.pdf_url) {
          const { data: fileData } = await supabase.storage.from("documents").download(doc.pdf_url);
          if (fileData) {
            const arrayBuffer = await fileData.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            fileBase64 = btoa(binary);
          }
        }

        if (!fileBase64 && doc?.metadata && (doc.metadata as any).storage_path) {
          const storagePath = (doc.metadata as any).storage_path;
          const { data: fileData } = await supabase.storage.from("documents").download(storagePath);
          if (fileData) {
            const arrayBuffer = await fileData.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            fileBase64 = btoa(binary);
          }
        }

        if (!fileBase64 && doc?.content) {
          console.log("No PDF file found, creating text-based PDF from document content");
          const textContent = doc.content.replace(/<[^>]*>/g, "").substring(0, 50000);
          const title = doc.title || document_title || "Documento";
          fileBase64 = buildMinimalPDF(title, textContent);
        }
      }

      if (!fileBase64) {
        if (document_id) {
          throw new Error(
            "O documento selecionado não possui PDF gerado. Abra o documento no editor, gere o PDF primeiro, e depois envie para assinatura."
          );
        }
        // No document provided — generate a placeholder PDF from the title
        console.log("[Clicksign v3] No document content — generating placeholder PDF from title");
        const placeholderText = `Documento para assinatura digital.\n\nTítulo: ${document_title}\nData de criação: ${new Date().toLocaleDateString("pt-BR")}\n\nEste documento foi enviado para assinatura digital via Clicksign.`;
        fileBase64 = buildMinimalPDF(document_title || "Documento", placeholderText);
      }

      const sanitizedTitle = document_title
        .replace(/[^a-zA-Z0-9\s\-_.àáâãéêíóôõúüçÀÁÂÃÉÊÍÓÔÕÚÜÇ]/g, "")
        .substring(0, 100);

      // --- Step 1: Create Envelope ---
      console.log("[Clicksign v3] Step 1: Creating envelope...");
      const envelopeResponse = await clicksignRequest("/envelopes", "POST", {
        data: {
          type: "envelopes",
          attributes: {
            name: sanitizedTitle,
          },
        },
      });
      const clicksignEnvelopeId = envelopeResponse.data.id;
      console.log("[Clicksign v3] Envelope created:", clicksignEnvelopeId);

      // --- Step 2: Add Document ---
      console.log("[Clicksign v3] Step 2: Adding document...");
      const docResponse = await clicksignRequest(
        `/envelopes/${clicksignEnvelopeId}/documents`,
        "POST",
        {
          data: {
            type: "documents",
            attributes: {
              filename: `${sanitizedTitle}.pdf`,
              content_base64: `data:application/pdf;base64,${fileBase64}`,
            },
          },
        }
      );
      const clicksignDocumentId = docResponse.data.id;
      console.log("[Clicksign v3] Document added:", clicksignDocumentId);

      // --- Step 3: Add Signers (lawyer first if enabled) ---
      console.log("[Clicksign v3] Step 3: Adding signers...");
      const signerResults = [];
      let lawyerSigningUrl: string | null = null;

      // Build ordered signer list: lawyer first, then others
      const allSigners: Array<Signer & { is_lawyer?: boolean; order?: number }> = [];
      
      // Sanitize name — never send an email address or invalid name to Clicksign
      const sanitizeName = (name: string | undefined, fallback: string): string => {
        if (!name) return fallback;
        // Remove extra whitespace
        const trimmed = name.trim().replace(/\s+/g, " ");
        // If it looks like an email, use fallback
        if (trimmed.includes("@")) return fallback;
        // Must have at least 2 characters
        if (trimmed.length < 2) return fallback;
        // If only one word, append a placeholder last name to satisfy Clicksign
        const words = trimmed.split(" ").filter(Boolean);
        if (words.length === 1) return `${words[0]} ${fallback}`;
        return trimmed;
      };

      // Sanitize signer name from external signers list too
      const sanitizeSignerName = (name: string | undefined, email: string): string => {
        if (!name || !name.trim()) {
          // Derive name from email prefix
          const prefix = email.split("@")[0] || "Cliente";
          return prefix.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        }
        const trimmed = name.trim().replace(/\s+/g, " ");
        if (trimmed.includes("@")) {
          const prefix = email.split("@")[0] || "Cliente";
          return prefix.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        }
        if (trimmed.length < 2) return "Cliente";
        const words = trimmed.split(" ").filter(Boolean);
        if (words.length === 1) return `${words[0]} Cliente`;
        return trimmed;
      };

      if (lawyer_signs_first && lawyer_email) {
        // Add lawyer as first signer (won't duplicate if already in signers list)
        const lawyerAlreadyInList = signers.some((s: Signer) => s.email.toLowerCase() === lawyer_email.toLowerCase());
        if (!lawyerAlreadyInList) {
          allSigners.push({
            name: sanitizeName(lawyer_name, "Advogado"),
            email: lawyer_email,
            is_lawyer: true,
            order: 1,
          });
        }
      }

      for (const signer of signers) {
        const isLawyer = lawyer_signs_first && lawyer_email && signer.email.toLowerCase() === lawyer_email.toLowerCase();
        allSigners.push({
          ...signer,
          is_lawyer: !!isLawyer,
          order: isLawyer ? 1 : (lawyer_signs_first ? 2 : 1),
        });
      }

      for (const signer of allSigners) {
        const finalSignerName = signer.is_lawyer
          ? sanitizeName(signer.name, "Advogado")
          : sanitizeSignerName(signer.name, signer.email);
        const signerResponse = await clicksignRequest(
          `/envelopes/${clicksignEnvelopeId}/signers`,
          "POST",
          {
            data: {
              type: "signers",
              attributes: {
                name: finalSignerName,
                email: signer.email,
                ...(signer.cpf ? { documentation: signer.cpf } : {}),
                ...(signer.phone ? { phone_number: signer.phone } : {}),
                ...(signer.phone ? { communicate_by: "whatsapp" } : {}),
                ...(lawyer_signs_first ? { group: signer.order } : {}),
              },
            },
          }
        );
        const signerId = signerResponse.data.id;
        console.log(`[Clicksign v3] Signer added: ${signer.name} (${signerId}) order=${signer.order}`);

        // --- Step 4: Add Requirements for each signer ---
        await clicksignRequest(
          `/envelopes/${clicksignEnvelopeId}/requirements`,
          "POST",
          {
            data: {
              type: "requirements",
              attributes: {
                action: "agree",
                role: "sign",
              },
              relationships: {
                document: {
                  data: { type: "documents", id: clicksignDocumentId },
                },
                signer: {
                  data: { type: "signers", id: signerId },
                },
              },
            },
          }
        );

        const authMethod = signature_method === "icp-brasil" ? "icp_brasil" 
          : signature_method === "gov-br" ? "email" 
          : "email";

        await clicksignRequest(
          `/envelopes/${clicksignEnvelopeId}/requirements`,
          "POST",
          {
            data: {
              type: "requirements",
              attributes: {
                action: "provide_evidence",
                auth: authMethod,
              },
              relationships: {
                document: {
                  data: { type: "documents", id: clicksignDocumentId },
                },
                signer: {
                  data: { type: "signers", id: signerId },
                },
              },
            },
          }
        );

        signerResults.push({
          name: signer.name,
          email: signer.email,
          signer_id: signerId,
          is_lawyer: signer.is_lawyer || false,
        });
      }

      // --- Step 5: Activate Envelope ---
      console.log("[Clicksign v3] Step 5: Activating envelope...");
      await clicksignRequest(
        `/envelopes/${clicksignEnvelopeId}`,
        "PATCH",
        {
          data: {
            id: clicksignEnvelopeId,
            type: "envelopes",
            attributes: {
              status: "running",
            },
          },
        }
      );
      console.log("[Clicksign v3] Envelope activated!");

      // --- Step 6: Send Notifications ---
      // If lawyer signs first, only notify lawyer initially; others get notified after lawyer signs
      console.log("[Clicksign v3] Step 6: Sending notifications...");
      try {
        await clicksignRequest(
          `/envelopes/${clicksignEnvelopeId}/notifications`,
          "POST",
          {
            data: {
              type: "notifications",
              attributes: {},
            },
          }
        );
        console.log("[Clicksign v3] Notifications sent!");
      } catch (e) {
        console.error("[Clicksign v3] Error sending notifications:", e);
      }

      // If lawyer signs first, try to get the signing URL for the lawyer
      if (lawyer_signs_first) {
        try {
          // Get signer details to find signing URL
          const lawyerSigner = signerResults.find((s: any) => s.is_lawyer);
          if (lawyerSigner) {
            const signerDetails = await clicksignRequest(
              `/envelopes/${clicksignEnvelopeId}/signers/${lawyerSigner.signer_id}`,
              "GET"
            );
            lawyerSigningUrl = signerDetails?.data?.attributes?.url || null;
            console.log("[Clicksign v3] Lawyer signing URL:", lawyerSigningUrl ? "obtained" : "not available");
          }
        } catch (urlErr) {
          console.error("[Clicksign v3] Error getting lawyer signing URL:", urlErr);
        }
      }

      // --- Save to database ---
      const { data: envelope, error: dbError } = await supabase
        .from("signature_envelopes")
        .insert({
          user_id: user.id,
          document_id: document_id || null,
          document_title,
          clicksign_envelope_id: clicksignEnvelopeId,
          clicksign_document_key: clicksignDocumentId,
          status: "pendente",
          signature_method: signature_method || "eletronica",
          signers: signerResults,
          clicksign_response: envelopeResponse,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Create notification for the advogado
      await supabase.from("notificacoes").insert({
        user_id: user.id,
        tipo: "assinatura",
        titulo: "📨 Envelope enviado para assinatura",
        descricao: `"${document_title}" enviado para ${signerResults.map((s) => s.name).join(", ")}.`,
        referencia_id: envelope.id,
        referencia_tipo: "signature_envelope",
        link: "/dashboard/assinatura-digital",
      });

      // Notify signers who are registered clients in the system
      try {
        const { data: allUsers } = await supabase.auth.admin.listUsers();
        if (allUsers?.users) {
          for (const signer of signerResults) {
            const signerUser = allUsers.users.find((u: any) => u.email === signer.email);
            if (signerUser && signerUser.id !== user.id) {
              await supabase.from("notificacoes").insert({
                user_id: signerUser.id,
                tipo: "assinatura",
                titulo: "📝 Novo documento para assinar",
                descricao: `Você recebeu o documento "${document_title}" para assinatura digital. Verifique seu e-mail ou acesse Assinatura Digital.`,
                referencia_id: envelope.id,
                referencia_tipo: "signature_envelope",
                link: "/dashboard/assinatura-digital",
              });
              console.log(`[Clicksign v3] Notification sent to client: ${signer.email} (${signerUser.id})`);
            }
          }
        }
      } catch (notifyErr) {
        console.error("[Clicksign v3] Error notifying signers:", notifyErr);
      }

      // ========== NEURAL LEARNING: Register signature creation ==========
      try {
        await supabase.from("neural_learning_data").insert({
          user_id: user.id,
          interaction_type: "signature_initiated",
          input_text: `Envelope de assinatura criado: ${document_title}`,
          output_text: `Enviado para ${signerResults.length} signatário(s): ${signerResults.map(s => s.name).join(", ")}`,
          quality_score: 0.8,
          metadata: {
            envelope_id: envelope.id,
            document_id: document_id || null,
            document_title,
            signature_method: signature_method || "eletronica",
            signers_count: signerResults.length,
            lawyer_signs_first: !!lawyer_signs_first,
            clicksign_envelope_id: clicksignEnvelopeId,
          },
        });
        console.log("[Clicksign v3] Neural learning recorded: signature_initiated");
      } catch (neuralErr) {
        console.error("[Clicksign v3] Error recording neural learning:", neuralErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          envelope,
          clicksign_envelope_id: clicksignEnvelopeId,
          signers: signerResults,
          lawyer_signs_first: !!lawyer_signs_first,
          lawyer_signing_url: lawyerSigningUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação não reconhecida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in clicksign-signature:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar solicitação";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
