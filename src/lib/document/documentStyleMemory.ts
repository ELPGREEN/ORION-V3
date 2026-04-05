/**
 * documentStyleMemory.ts — Extracts, stores, and retrieves document style patterns
 * so the AI can learn the lawyer's preferred formatting and structure over time.
 */
import { supabase } from "@/integrations/supabase/client";

export interface StyleFingerprint {
  /** Average paragraph length in words */
  avgParagraphLength: number;
  /** Whether headings are typically used */
  usesHeadings: boolean;
  /** Heading styles found (h1, h2, h3) */
  headingLevels: string[];
  /** Whether numbered lists are common */
  usesNumberedLists: boolean;
  /** Whether bullet lists are common */
  usesBulletLists: boolean;
  /** Typical fonts detected */
  fonts: string[];
  /** Typical font sizes detected */
  fontSizes: string[];
  /** Whether bold is used frequently */
  usesBoldFrequently: boolean;
  /** Whether italic is used frequently */
  usesItalicFrequently: boolean;
  /** Text alignment preference */
  dominantAlignment: "left" | "center" | "right" | "justify";
  /** Average indentation level */
  avgIndentLevel: number;
  /** Typical section structure (ordered headings) */
  sectionStructure: string[];
  /** Common legal phrases/patterns the lawyer uses */
  signaturePhrases: string[];
  /** Whether the lawyer uses ABNT formatting */
  usesABNT: boolean;
  /** Line spacing preference */
  lineSpacing: string;
  /** Whether tables are common */
  usesTables: boolean;
  /** Sample opening paragraph style (first 200 chars of first paragraph) */
  openingStyle: string;
  /** Sample closing paragraph style (last 200 chars) */
  closingStyle: string;
}

/** Extract style fingerprint from HTML document content */
export function extractStyleFingerprint(html: string): StyleFingerprint {
  const plainText = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

  // Paragraphs
  const paragraphs = html.split(/<\/p>/i).map(p => p.replace(/<[^>]*>/g, "").trim()).filter(p => p.length > 10);
  const avgParagraphLength = paragraphs.length > 0
    ? Math.round(paragraphs.reduce((s, p) => s + p.split(/\s+/).length, 0) / paragraphs.length)
    : 0;

  // Headings
  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  const h2s = (html.match(/<h2[\s>]/gi) || []).length;
  const h3s = (html.match(/<h3[\s>]/gi) || []).length;
  const headingLevels: string[] = [];
  if (h1s > 0) headingLevels.push("h1");
  if (h2s > 0) headingLevels.push("h2");
  if (h3s > 0) headingLevels.push("h3");

  // Section structure from headings
  const headingMatches = html.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi) || [];
  const sectionStructure = headingMatches
    .map(h => h.replace(/<[^>]*>/g, "").trim())
    .filter(Boolean)
    .slice(0, 15);

  // Lists
  const usesNumberedLists = /<ol[\s>]/i.test(html);
  const usesBulletLists = /<ul[\s>]/i.test(html);

  // Fonts
  const fontMatches = html.match(/font-family:\s*([^;"]+)/gi) || [];
  const fonts = [...new Set(fontMatches.map(f => f.replace(/font-family:\s*/i, "").trim()))].slice(0, 5);

  // Font sizes
  const sizeMatches = html.match(/font-size:\s*([^;"]+)/gi) || [];
  const fontSizes = [...new Set(sizeMatches.map(s => s.replace(/font-size:\s*/i, "").trim()))].slice(0, 5);

  // Bold/Italic frequency
  const boldCount = (html.match(/<(strong|b)[\s>]/gi) || []).length + (html.match(/font-weight:\s*bold/gi) || []).length;
  const italicCount = (html.match(/<(em|i)[\s>]/gi) || []).length + (html.match(/font-style:\s*italic/gi) || []).length;
  const totalElements = paragraphs.length || 1;
  const usesBoldFrequently = boldCount / totalElements > 0.3;
  const usesItalicFrequently = italicCount / totalElements > 0.2;

  // Alignment
  const alignLeft = (html.match(/text-align:\s*left/gi) || []).length;
  const alignCenter = (html.match(/text-align:\s*center/gi) || []).length;
  const alignRight = (html.match(/text-align:\s*right/gi) || []).length;
  const alignJustify = (html.match(/text-align:\s*justify/gi) || []).length;
  const alignments = { left: alignLeft, center: alignCenter, right: alignRight, justify: alignJustify };
  const dominantAlignment = (Object.entries(alignments).sort((a, b) => b[1] - a[1])[0]?.[0] || "left") as any;

  // Indentation
  const indentMatches: string[] = html.match(/margin-left:\s*(\d+)/gi) || [];
  const avgIndentLevel = indentMatches.length > 0
    ? Math.round(indentMatches.reduce((s: number, m: string) => s + parseInt(m.replace(/\D/g, ""), 10), 0) / indentMatches.length / 40)
    : 0;

  // Signature phrases (common legal closings/openings)
  const signaturePhrases: string[] = [];
  const closingPatterns = [
    /nestes termos[^.]*\./i,
    /termos em que[^.]*\./i,
    /pede deferimento/i,
    /respeitosamente/i,
    /ante o exposto[^.]*\./i,
    /pelo exposto[^.]*\./i,
    /diante do exposto[^.]*\./i,
    /por todo o exposto[^.]*\./i,
  ];
  for (const pat of closingPatterns) {
    const match = plainText.match(pat);
    if (match) signaturePhrases.push(match[0].substring(0, 100));
  }

  // ABNT
  const usesABNT = /times new roman/i.test(html) && /font-size:\s*12/i.test(html);

  // Line spacing
  const lineSpacingMatch = html.match(/line-height:\s*([^;"]+)/i);
  const lineSpacing = lineSpacingMatch ? lineSpacingMatch[1].trim() : "normal";

  // Tables
  const usesTables = /<table[\s>]/i.test(html);

  // Opening and closing styles
  const openingStyle = paragraphs[0]?.substring(0, 200) || "";
  const closingStyle = paragraphs[paragraphs.length - 1]?.substring(0, 200) || "";

  return {
    avgParagraphLength,
    usesHeadings: headingLevels.length > 0,
    headingLevels,
    usesNumberedLists,
    usesBulletLists,
    fonts,
    fontSizes,
    usesBoldFrequently,
    usesItalicFrequently,
    dominantAlignment,
    avgIndentLevel,
    sectionStructure,
    signaturePhrases,
    usesABNT,
    lineSpacing,
    usesTables,
    openingStyle,
    closingStyle,
  };
}

/** Merge a new fingerprint with an existing one (weighted average) */
function mergeFingerprints(existing: StyleFingerprint, incoming: StyleFingerprint, existingWeight: number): StyleFingerprint {
  const w = existingWeight;
  const wavg = (a: number, b: number) => Math.round((a * w + b) / (w + 1));

  return {
    avgParagraphLength: wavg(existing.avgParagraphLength, incoming.avgParagraphLength),
    usesHeadings: existing.usesHeadings || incoming.usesHeadings,
    headingLevels: [...new Set([...existing.headingLevels, ...incoming.headingLevels])],
    usesNumberedLists: existing.usesNumberedLists || incoming.usesNumberedLists,
    usesBulletLists: existing.usesBulletLists || incoming.usesBulletLists,
    fonts: [...new Set([...existing.fonts, ...incoming.fonts])].slice(0, 5),
    fontSizes: [...new Set([...existing.fontSizes, ...incoming.fontSizes])].slice(0, 5),
    usesBoldFrequently: w > 2 ? existing.usesBoldFrequently : incoming.usesBoldFrequently,
    usesItalicFrequently: w > 2 ? existing.usesItalicFrequently : incoming.usesItalicFrequently,
    dominantAlignment: w > 2 ? existing.dominantAlignment : incoming.dominantAlignment,
    avgIndentLevel: wavg(existing.avgIndentLevel, incoming.avgIndentLevel),
    sectionStructure: incoming.sectionStructure.length > existing.sectionStructure.length
      ? incoming.sectionStructure : existing.sectionStructure,
    signaturePhrases: [...new Set([...existing.signaturePhrases, ...incoming.signaturePhrases])].slice(0, 10),
    usesABNT: existing.usesABNT || incoming.usesABNT,
    lineSpacing: incoming.lineSpacing !== "normal" ? incoming.lineSpacing : existing.lineSpacing,
    usesTables: existing.usesTables || incoming.usesTables,
    openingStyle: incoming.openingStyle || existing.openingStyle,
    closingStyle: incoming.closingStyle || existing.closingStyle,
  };
}

/** Save/update style memory for a document type */
export async function learnDocumentStyle(userId: string, documentType: string, html: string): Promise<void> {
  if (!html || html.length < 200) return; // Too short to learn from

  const fingerprint = extractStyleFingerprint(html);

  // Check existing
  const { data: existing } = await supabase
    .from("document_style_memory")
    .select("*")
    .eq("user_id", userId)
    .eq("document_type", documentType)
    .maybeSingle();

  if (existing) {
    const existingFp = existing.style_fingerprint as unknown as StyleFingerprint;
    const merged = mergeFingerprints(existingFp, fingerprint, existing.sample_count);
    await supabase
      .from("document_style_memory")
      .update({
        style_fingerprint: merged as any,
        sample_count: existing.sample_count + 1,
      })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("document_style_memory")
      .insert({
        user_id: userId,
        document_type: documentType,
        style_fingerprint: fingerprint as any,
        sample_count: 1,
      });
  }
}

/** Retrieve learned style for a document type */
export async function getLearnedStyle(userId: string, documentType: string): Promise<StyleFingerprint | null> {
  const { data } = await supabase
    .from("document_style_memory")
    .select("style_fingerprint, sample_count")
    .eq("user_id", userId)
    .eq("document_type", documentType)
    .maybeSingle();

  if (!data) return null;
  return data.style_fingerprint as unknown as StyleFingerprint;
}

/** Convert style fingerprint to a prompt-friendly description */
export function styleToPromptContext(fp: StyleFingerprint, docType: string, sampleCount?: number): string {
  const lines: string[] = [
    `═══ ESTILO MEMORIZADO (${docType}) — ${sampleCount || "?"} documentos analisados ═══`,
  ];

  if (fp.fonts.length > 0) lines.push(`Fontes: ${fp.fonts.join(", ")}`);
  if (fp.fontSizes.length > 0) lines.push(`Tamanhos: ${fp.fontSizes.join(", ")}`);
  lines.push(`Alinhamento: ${fp.dominantAlignment}`);
  lines.push(`Parágrafos: ~${fp.avgParagraphLength} palavras em média`);
  if (fp.usesABNT) lines.push(`Formato: ABNT`);
  if (fp.lineSpacing !== "normal") lines.push(`Espaçamento: ${fp.lineSpacing}`);
  if (fp.usesHeadings) lines.push(`Títulos: ${fp.headingLevels.join(", ")}`);
  if (fp.sectionStructure.length > 0) lines.push(`Estrutura típica: ${fp.sectionStructure.join(" → ")}`);
  if (fp.usesBoldFrequently) lines.push(`Usa negrito com frequência`);
  if (fp.usesItalicFrequently) lines.push(`Usa itálico com frequência`);
  if (fp.usesNumberedLists) lines.push(`Usa listas numeradas`);
  if (fp.usesBulletLists) lines.push(`Usa listas com marcadores`);
  if (fp.usesTables) lines.push(`Usa tabelas`);
  if (fp.signaturePhrases.length > 0) lines.push(`Frases de fechamento: "${fp.signaturePhrases[0]}"`);
  if (fp.openingStyle) lines.push(`Estilo de abertura: "${fp.openingStyle.substring(0, 120)}..."`);
  if (fp.closingStyle) lines.push(`Estilo de fechamento: "${fp.closingStyle.substring(0, 120)}..."`);

  lines.push(`\nINSTRUÇÃO: Replique este estilo ao gerar/editar documentos deste tipo. Mantenha consistência de formatação, estrutura e tom.`);
  return lines.join("\n");
}
