import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateHTMLPDFBlob, printHTMLAsPDF, downloadHTMLAsPDF } from "@/lib/generators";
import { sanitizeStorageFileName } from "@/lib/utils";
import { learnDocumentStyle } from "@/lib/document";
import { autoShareDocumentWithFolderClient } from "@/hooks/useAutoShareDocument";
import { calculateQualityScore } from "@/lib/analysis";
import { cleanAIResponse } from "@/lib/document";
import { mergeAITextPreservingStyles, hasFormattingToPreserve } from "@/lib/mergeAIText";
import { detectContentType, getImprovePrompt, getReformulatePrompt } from "@/lib/analysis";
import { agentePesquisa } from "@/lib/api";
import { getRulerIndentRef, getRulerFirstLineIndentRef, getRulerRightIndentRef } from "@/components/dashboard/RichTextEditor";
import { safeApplyAIResult, classifyApplyMode } from "@/lib/document";
import { getLearnedStyle, styleToPromptContext } from "@/lib/document";
import { getUsableHeight } from "@/components/dashboard/editor/pageConstants";
import { isBrandedDocument } from "@/lib/generators";
import type { FormData, DocumentType } from "@/types/document-types";
import type { AIBubbleAction } from "@/components/dashboard/RichTextEditor";

/** Strip ALL AI artifacts from HTML for clean PDF/DOCX export */
export const stripSuggestionSpans = (html: string) =>
  html
    // Remove suggestion mark spans (keep inner text)
    .replace(/<span[^>]*\bdata-suggestion-id\b[^>]*>([\s\S]*?)<\/span>/gi, "$1")
    // Remove ghost text elements
    .replace(/<[^>]*\bdata-ghost\b[^>]*>[\s\S]*?<\/[^>]+>/gi, "")
    // Remove AI review highlight spans
    .replace(/<span[^>]*\bdata-ai-review\b[^>]*>([\s\S]*?)<\/span>/gi, "$1")
    // Remove autocomplete tooltip elements
    .replace(/<div[^>]*\bai-autocomplete\b[^>]*>[\s\S]*?<\/div>/gi, "")
    // Remove pipeline marker spans
    .replace(/<span[^>]*\bdata-pipeline\b[^>]*>([\s\S]*?)<\/span>/gi, "$1")
    // Remove agent badge elements
    .replace(/<span[^>]*\bagent-badge\b[^>]*>[\s\S]*?<\/span>/gi, "")
    // Clean up empty spans left behind
    .replace(/<span[^>]*>\s*<\/span>/gi, "")
    // Remove data-* attributes from remaining elements (UI-only attrs)
    .replace(/\s+data-(?:suggestion|ghost|ai-review|pipeline|agent)[^=]*="[^"]*"/gi, "");

export const ensureHtml = (text: string): string => {
  if (!text) return text;
  if (/<(p|div|h[1-6]|ul|ol|li|br|table)\b/i.test(text)) return text;
  return text.split(/\n{2,}/).filter(b => b.trim().length > 0).map(b => `<p>${b.replace(/\n/g, "<br>")}</p>`).join("");
};

/**
 * Sanitize HTML from file imports for TipTap compatibility.
 */
export function sanitizeHtmlForTiptap(html: string): string {
  let cleaned = (html || "")
    .replace(/```(?:tsx|jsx|typescript|javascript|react|html)?\s*([\s\S]*?)```/gi, "$1")
    .replace(/<hr[^>]*page-break[^>]*>/gi, "")
    .replace(/<div[^>]*class=["'][^"']*page-break-spacer[^"']*["'][^>]*>\s*<\/div>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/^\s*import\s.+$/gm, "")
    .replace(/^\s*export\s+default\s+\w+\s*;?\s*$/gm, "")
    .replace(/^\s*export\s+\{[^}]*\}\s*;?\s*$/gm, "")
    .replace(/interface\s+\w+\s*\{[\s\S]*?\}\s*/g, "")
    .replace(/type\s+\w+\s*=\s*\{[\s\S]*?\}\s*;?/g, "")
    .replace(/(?:const|let|var)\s+\w+\s*:\s*React\.FC[^\n]*\n?/g, "")
    .replace(/<\/?(?:Container|Heading|Text|Button|Documento)[^>]*>/g, "")
    .replace(/^\s*return\s*\(\s*$/gm, "")
    .replace(/^\s*\);?\s*$/gm, "")
    .replace(/^\s*\};?\s*$/gm, "")
    .replace(/\son\w+=(?:"[^"]*"|'[^']*')/gi, "");

  cleaned = cleaned.replace(/style="([^"]*)"/gi, (_match, styles: string) => {
    const keepStyles: string[] = [];
    const alignMatch = styles.match(/text-align:\s*(left|center|right|justify)/i);
    if (alignMatch) keepStyles.push(`text-align: ${alignMatch[1]}`);
    const lhMatch = styles.match(/line-height:\s*([^;]+)/i);
    if (lhMatch) keepStyles.push(`line-height: ${lhMatch[1].trim()}`);
    const fsMatch = styles.match(/font-size:\s*([^;]+)/i);
    if (fsMatch) keepStyles.push(`font-size: ${fsMatch[1].trim()}`);
    const ffMatch = styles.match(/font-family:\s*([^;]+)/i);
    if (ffMatch) keepStyles.push(`font-family: ${ffMatch[1].trim()}`);
    const colorMatch = styles.match(/(?:^|;)\s*color:\s*([^;]+)/i);
    if (colorMatch) keepStyles.push(`color: ${colorMatch[1].trim()}`);
    const mlMatch = styles.match(/margin-left:\s*([^;]+)/i);
    if (mlMatch) keepStyles.push(`margin-left: ${mlMatch[1].trim()}`);
    if (!mlMatch) {
      const tiMatch = styles.match(/text-indent:\s*([^;]+)/i);
      if (tiMatch) {
        const val = tiMatch[1].trim();
        let px = 0;
        if (val.includes("cm")) px = Math.round(parseFloat(val) * 37.8);
        else if (val.includes("mm")) px = Math.round(parseFloat(val) * 3.78);
        else if (val.includes("pt")) px = Math.round(parseFloat(val) * 1.333);
        else if (val.includes("in")) px = Math.round(parseFloat(val) * 96);
        else if (val.includes("px")) px = parseInt(val, 10);
        if (!isNaN(px) && px > 0) keepStyles.push(`margin-left: ${px}px`);
      }
    }
    if (keepStyles.length === 0) return "";
    return `style="${keepStyles.join("; ")}"`;
  });

  cleaned = cleaned.replace(/\s*style=""\s*/gi, " ").trim();
  return ensureHtml(cleaned);
}

interface UseEditorActionsParams {
  editedContent: string;
  setEditedContent: (v: string) => void;
  formData: FormData;
  selectedType: DocumentType | undefined;
  forceLetterhead?: boolean;
  marginTop?: number;
  marginBottom?: number;
  user: { id: string } | null;
  editorRef: React.MutableRefObject<any>;
  rulerSettersRef: React.MutableRefObject<{ setLeft: (v: number) => void; setFirstLine: (v: number) => void; setRight: (v: number) => void } | null>;
  toast: (opts: any) => void;
  logNeural?: (opts: any) => void;
  clearAllSuggestionMarks: (editor: any) => void;
  bubbleSelectionRef: React.MutableRefObject<{ from: number; to: number } | null>;
  bubbleNodeContextRef: React.MutableRefObject<{ nodeName: string; headingLevel?: number } | null>;
  initialSavedDocId?: string;
}

export function useEditorActions(params: UseEditorActionsParams) {
  const {
    editedContent, setEditedContent, formData, selectedType, forceLetterhead,
    marginTop, marginBottom, user, editorRef, rulerSettersRef, toast,
    clearAllSuggestionMarks, bubbleSelectionRef, bubbleNodeContextRef, initialSavedDocId,
  } = params;

  const [improving, setImproving] = useState(false);
  const [improvingMode, setImprovingMode] = useState<string | null>(null);
  const [improvingProgress, setImprovingProgress] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(initialSavedDocId || null);
  const [contentHistory, setContentHistory] = useState<string[]>([]);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [detectingGaps, setDetectingGaps] = useState(false);
  const [gapQuestions, setGapQuestions] = useState<string[]>([]);
  const [isAddingContent, setIsAddingContent] = useState(false);
  const [pdfImportLoading, setPdfImportLoading] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<string | null>(null);
  const [strategicAnalysis, setStrategicAnalysis] = useState<{
    positionamento: string; resumoEstrategico: string; pontosFortesDoc: string[];
    riscosIdentificados: string[]; alertaContraCliente: boolean; descricaoAlerta: string;
  } | null>(null);

  const pdfImportRef = useRef<HTMLInputElement>(null);

  const saveSnapshot = useCallback(() => {
    setContentHistory(prev => [...prev.slice(-4), editedContent]);
  }, [editedContent]);

  const handleUndoAI = useCallback(() => {
    if (contentHistory.length === 0) return;
    const previous = contentHistory[contentHistory.length - 1];
    setContentHistory(prev => prev.slice(0, -1));
    setEditedContent(previous);
    toast({ title: "Versão restaurada", description: "O conteúdo anterior à última operação de IA foi restaurado." });
  }, [contentHistory, setEditedContent, toast]);

  const reapplyRulerMargins = useCallback(() => {
    queueMicrotask(() => {
      const editor = editorRef.current;
      const setters = rulerSettersRef.current;
      if (editor && setters) {
        const leftIndent = getRulerIndentRef();
        const firstLineIndent = getRulerFirstLineIndentRef();
        const rightIndent = getRulerRightIndentRef();
        if (leftIndent > 0 || firstLineIndent > 0 || rightIndent > 0) {
          editor.state.doc.descendants((node: any, pos: number) => {
            if (node.type.name === "paragraph" || node.type.name === "heading") {
              editor.chain().setTextSelection(pos + 1).updateAttributes(node.type.name, {
                indent: leftIndent, textIndent: firstLineIndent, marginRight: rightIndent,
              }).run();
            }
          });
        }
      }
    });
  }, [editorRef, rulerSettersRef]);

  const injectEditorPageBreaks = useCallback((html: string) => {
    const editor = editorRef.current;
    const view = editor?.view;
    const dom = view?.dom as HTMLElement | undefined;

    if (!dom || typeof DOMParser === "undefined") return html;

    const blockNodes = Array.from(dom.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && !child.classList.contains("page-break-spacer")
    );

    if (blockNodes.length < 2) return html;

    let breakIndexes: number[] = [];

    // Prefer exact break positions already measured by PageBreakOverlay/PageBreakSpacer.
    const spacerExt = editor?.extensionManager?.extensions?.find(
      (e: any) => e.name === "pageBreakSpacer"
    ) as { storage?: { breakBlockPositions?: number[] } } | undefined;

    const storedBreakPositions = Array.isArray(spacerExt?.storage?.breakBlockPositions)
      ? spacerExt!.storage!.breakBlockPositions!
      : [];

    if (storedBreakPositions.length > 0 && typeof view.nodeDOM === "function") {
      breakIndexes = storedBreakPositions
        .map((pos) => {
          try {
            const nodeEl = view.nodeDOM(pos);
            return nodeEl instanceof HTMLElement ? blockNodes.indexOf(nodeEl) : -1;
          } catch {
            return -1;
          }
        })
        .filter((idx, i, arr) => idx > 0 && arr.indexOf(idx) === i)
        .sort((a, b) => a - b);
    }

    // Fallback: compute using virtual coordinates (subtracting accumulated spacer margins).
    if (breakIndexes.length === 0) {
      const branded = forceLetterhead || isBrandedDocument(selectedType?.id);
      const usableHeight = getUsableHeight(branded);
      const editorRect = dom.getBoundingClientRect();
      let pageBottom = usableHeight;
      let accumulatedSpacer = 0;

      for (let index = 0; index < blockNodes.length; index++) {
        const child = blockNodes[index];
        const range = document.createRange();

        try {
          range.selectNodeContents(child);
          const rects = Array.from(range.getClientRects())
            .map((rect) => ({
              top: rect.top - editorRect.top + dom.scrollTop,
              bottom: rect.bottom - editorRect.top + dom.scrollTop,
              height: rect.height,
              width: rect.width,
            }))
            .filter((rect) => rect.height > 0 && rect.width > 0)
            .sort((a, b) => a.top - b.top);

          const firstTopRaw = rects[0]?.top ?? (child.getBoundingClientRect().top - editorRect.top + dom.scrollTop);
          const lastBottomRaw = rects[rects.length - 1]?.bottom ?? (firstTopRaw + child.offsetHeight);

          const firstTop = firstTopRaw - accumulatedSpacer;
          const lastBottom = lastBottomRaw - accumulatedSpacer;

          if (lastBottom > pageBottom && firstTop > 0 && index > 0) {
            breakIndexes.push(index);
            pageBottom = firstTop + usableHeight;
          }

          const spacerAttr = child.getAttribute("data-spacer-margin");
          if (spacerAttr) {
            accumulatedSpacer += parseInt(spacerAttr, 10) || 0;
          }
        } finally {
          range.detach?.();
        }
      }
    }

    if (breakIndexes.length === 0) return html;

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div data-export-root="true">${html}</div>`, "text/html");
    const root = doc.body.firstElementChild as HTMLElement | null;
    if (!root) return html;

    const exportBlocks = Array.from(root.children);

    for (const breakIndex of [...breakIndexes].sort((a, b) => b - a)) {
      const target = exportBlocks[breakIndex];
      if (!target) continue;
      const marker = doc.createElement("div");
      marker.className = "forced-page-break";
      marker.setAttribute("data-page-break", "true");
      target.before(marker);
    }

    return root.innerHTML;
  }, [editorRef, forceLetterhead, selectedType?.id]);

  const prepareContentForPdf = useCallback((html: string) => {
    // WeasyPrint paginates natively via @page margins — forced page breaks
    // cause premature breaks with large white gaps. Only strip editor artifacts.
    // NOTE: Do NOT call injectEditorPageBreaks here — it causes duplicate pagination.
    return stripSuggestionSpans(html);
  }, []);

  const handleImprove = useCallback(async (mode: "legal" | "formatting" | "light", extraParams?: { userQuery?: string; formattingOptions?: string[] }) => {
    const plainContent = editedContent.replace(/<[^>]*>/g, "").trim();
    if (plainContent.length < 10) {
      toast({ title: "Documento vazio", description: "Escreva algum conteúdo antes de aprimorar.", variant: "destructive" });
      return;
    }
    saveSnapshot();
    setImproving(true);
    setImprovingMode(mode);
    setImprovingProgress(null);
    try {
      const isJudicial = selectedType?.category ? ["penal", "civil", "trabalhista"].includes(selectedType.category) : false;
      const plainText = editedContent.replace(/<[^>]*>/g, "");
      if (plainText.length > 6000) setImprovingProgress("Dividindo documento em seções...");

      // Pre-fetch legal context via agente-pesquisa when mode is "legal"
      let legalContext = "";
      if (mode === "legal") {
        setImprovingProgress("Buscando fundamentação legal...");
        try {
          const query = extraParams?.userQuery || `${selectedType?.label || formData.tipo} ${formData.parteAutora || ""}`.trim();
          const searchResult = await agentePesquisa.legalSearch(query, ["lexml", "datajud_stj", "stf"]);
          if (searchResult.success && searchResult.analysis) {
            legalContext = `\n\n═══ CONTEXTO LEGAL (RAG ELP) ═══\n${searchResult.analysis.substring(0, 3000)}\n═══ FIM ═══`;
          }
        } catch { /* fallback: proceed without pre-fetch */ }
        setImprovingProgress("Aplicando fundamentação...");
      }

      // Fetch user's style memory for consistency (full fingerprint)
      let styleContext = "";
      if (user?.id) {
        try {
          const docType = selectedType?.id || formData.tipo || "";
          const fp = await getLearnedStyle(user.id, docType);
          if (fp) {
            styleContext = `\n\n${styleToPromptContext(fp, docType)}`;
          }
        } catch { /* ignore */ }
      }

      // Strategic persona: narrative-only instruction
      const strategicPersona = `\nPERSONA ESTRATÉGICA: Gere narrativa fluida sem bullet points. Cada parágrafo conecta tese, fundamentação legal e lógica argumentativa. NÃO use listas no corpo do documento.`;

      const { data, error } = await supabase.functions.invoke("aprimorar-documento", {
        body: {
          currentText: editedContent, documentType: selectedType?.label || formData.tipo,
          documentTypeId: selectedType?.id || null, category: selectedType?.category || null,
          query: extraParams?.userQuery || `${selectedType?.label || formData.tipo} ${formData.parteAutora || ""} ${formData.fatos?.substring(0, 150) || ""}`.trim(),
          isJudicial, mode, jurisdicao: formData.jurisdicao || "brasil",
          directApply: true,
          ...(extraParams?.userQuery && { userQuery: extraParams.userQuery }),
          ...(extraParams?.formattingOptions && { formattingOptions: extraParams.formattingOptions }),
          ...(legalContext && { legalContext }),
          ...(styleContext && { styleContext: styleContext + strategicPersona }),
        },
      });
      if (error) throw error;
      const rawEnriched = data?.enrichedText || data?.content;
      const enrichedText = rawEnriched ? cleanAIResponse(rawEnriched) : null;
      const questions = data?.suggestedQuestions;
      // Compare plain text lengths (strip HTML from enriched) to avoid HTML vs plaintext mismatch
      const enrichedPlain = enrichedText ? enrichedText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "";
      if (enrichedText && enrichedPlain.length > plainText.length * 0.85) {
        const qResult = calculateQualityScore(enrichedText);
        setQualityScore(Math.round(qResult.qualityScore * 100));
        // Preserve original formatting — only update text
        const preserveFormatting = hasFormattingToPreserve(editedContent);
        const mergedContent = preserveFormatting
          ? mergeAITextPreservingStyles(editedContent, qResult.processed)
          : qResult.processed;

        // ── Extra validation: nonDestructiveApply guard ──
        const applyMode = classifyApplyMode(mode === "formatting" ? "format" : mode === "legal" ? "improve" : "edit");
        const safeResult = safeApplyAIResult({ originalHtml: editedContent, candidateHtml: mergedContent, mode: applyMode });
        if (!safeResult.safe) {
          toast({ title: "⚠️ Alteração bloqueada", description: safeResult.blockedReason, variant: "destructive" });
        } else {
          setEditedContent(safeResult.output);
          // Clear any lingering suggestion highlights for clean output
          const editor = editorRef.current;
          if (editor) queueMicrotask(() => clearAllSuggestionMarks(editor));
          reapplyRulerMargins();
          const citationCount = data?.citations?.length || 0;
          const validationScore = data?.validation?.score ? Math.round(data.validation.score * 100) : null;
          const modeLabels: Record<string, string> = { legal: "Leis e citações adicionadas com sucesso", formatting: "Formatação ABNT aplicada", light: "Gramática, ortografia e fluidez corrigidas" };
          toast({ title: modeLabels[mode] || "Documento aprimorado!", description: `Alterações aplicadas • ${citationCount} fontes${validationScore ? ` • Score: ${validationScore}%` : ""} • Retenção: ${Math.round(safeResult.metrics.retentionRatio * 100)}%` });
          if (questions?.length > 0) setSuggestedQuestions(questions);
        }
      } else if (enrichedText && enrichedText.length > plainText.length * 0.5) {
        setEditedContent(enrichedText);
        toast({ title: "⚠️ O documento pode estar incompleto", variant: "default" });
      } else {
        toast({ title: "Sem alterações", description: "O documento já está bem fundamentado.", variant: "default" });
      }
    } catch (err) {
      toast({ title: "Erro", description: "Não foi possível aprimorar o documento.", variant: "destructive" });
    } finally {
      setImproving(false); setImprovingMode(null); setImprovingProgress(null);
    }
  }, [editedContent, formData, selectedType, saveSnapshot, setEditedContent, toast, reapplyRulerMargins, editorRef, clearAllSuggestionMarks, user]);

  const handleRefinement = useCallback(async (responses: Record<string, string>) => {
    saveSnapshot(); setIsRefining(true);
    try {
      const isJudicial = selectedType?.category ? ["penal", "civil", "trabalhista"].includes(selectedType.category) : false;
      const plainContent = editedContent.replace(/<[^>]*>/g, "");
      const { data, error } = await supabase.functions.invoke("aprimorar-documento", { body: { currentText: editedContent, documentType: selectedType?.label || formData.tipo, documentTypeId: selectedType?.id || null, category: selectedType?.category || null, query: "", isJudicial, refinementMode: true, refinementResponses: responses, jurisdicao: formData.jurisdicao || "brasil" } });
      if (error) throw error;
      const rawEnriched = data?.enrichedText || data?.content;
      const enrichedText = rawEnriched ? cleanAIResponse(rawEnriched) : null;
      if (enrichedText && enrichedText.length > plainContent.length * 0.5) {
        // Preserve formatting + safety guard
        const preserveFormatting = hasFormattingToPreserve(editedContent);
        const mergedContent = preserveFormatting
          ? mergeAITextPreservingStyles(editedContent, ensureHtml(enrichedText))
          : ensureHtml(enrichedText);
        const safeResult = safeApplyAIResult({ originalHtml: editedContent, candidateHtml: mergedContent, mode: "improve" });
        if (!safeResult.safe) {
          toast({ title: "⚠️ Refinamento bloqueado", description: safeResult.blockedReason, variant: "destructive" });
        } else {
          setEditedContent(safeResult.output);
          const editor = editorRef.current;
          if (editor) queueMicrotask(() => clearAllSuggestionMarks(editor));
          reapplyRulerMargins();
          setSuggestedQuestions([]);
          toast({ title: "✅ Documento refinado!", description: `Retenção: ${Math.round(safeResult.metrics.retentionRatio * 100)}%` });
        }
      } else toast({ title: "Sem alterações", variant: "default" });
    } catch { toast({ title: "Erro", description: "Não foi possível refinar o documento.", variant: "destructive" }); }
    finally { setIsRefining(false); }
  }, [editedContent, formData, selectedType, saveSnapshot, setEditedContent, toast, editorRef, clearAllSuggestionMarks, reapplyRulerMargins]);

  const handleDetectGaps = useCallback(async (userInstruction?: string) => {
    setDetectingGaps(true); setStrategicAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("aprimorar-documento", { body: { currentText: editedContent, documentType: selectedType?.label || formData.tipo, documentTypeId: selectedType?.id || null, category: selectedType?.category || null, query: `${selectedType?.label || formData.tipo}`, isJudicial: selectedType?.category ? ["penal", "civil", "trabalhista"].includes(selectedType.category) : false, mode: "gaps", jurisdicao: formData.jurisdicao || "brasil", ...(userInstruction && { userInstruction }) } });
      if (error) throw error;
      const questions: string[] = data?.gapQuestions || data?.suggestedQuestions || [];
      if (data?.positionamento) setStrategicAnalysis({ positionamento: data.positionamento, resumoEstrategico: data.resumoEstrategico || "", pontosFortesDoc: data.pontosFortesDoc || [], riscosIdentificados: data.riscosIdentificados || [], alertaContraCliente: data.alertaContraCliente || false, descricaoAlerta: data.descricaoAlerta || "" });
      if (questions.length > 0) { setGapQuestions(questions); toast({ title: `${questions.length} lacunas foram identificadas` }); }
      else toast({ title: "✅ Documento bem fundamentado!" });
    } catch (err) { console.error("🔧 [handleDetectGaps] ERROR:", err); toast({ title: "Erro", variant: "destructive" }); }
    finally { setDetectingGaps(false); }
  }, [editedContent, formData, selectedType, toast]);

  const handleAggregateContent = useCallback(async (responses: Record<string, string>) => {
    saveSnapshot(); setIsAddingContent(true);
    const contentSnapshot = editedContent;
    try {
      const { data, error } = await supabase.functions.invoke("aprimorar-documento", { body: { currentText: editedContent, documentType: selectedType?.label || formData.tipo, documentTypeId: selectedType?.id || null, category: selectedType?.category || null, query: "", isJudicial: selectedType?.category ? ["penal", "civil", "trabalhista"].includes(selectedType.category) : false, mode: "aggregate", aggregateResponses: responses, jurisdicao: formData.jurisdicao || "brasil" } });
      if (error) throw error;
      const enrichedRaw = data?.enrichedText || data?.content;
      const enrichedText = enrichedRaw ? cleanAIResponse(enrichedRaw) : null;
      const plainContent = editedContent.replace(/<[^>]*>/g, "");
      if (enrichedText && enrichedText.replace(/<[^>]*>/g, "").length >= plainContent.length * 0.85) {
        const merged = hasFormattingToPreserve(editedContent)
          ? mergeAITextPreservingStyles(editedContent, ensureHtml(enrichedText))
          : ensureHtml(enrichedText);
        // Safety guard
        const safeResult = safeApplyAIResult({ originalHtml: editedContent, candidateHtml: merged, mode: "clause" });
        if (!safeResult.safe) {
          setEditedContent(contentSnapshot);
          toast({ title: "⚠️ Agregação bloqueada", description: safeResult.blockedReason, variant: "destructive" });
        } else {
          setEditedContent(safeResult.output);
          const editor = editorRef.current;
          if (editor) queueMicrotask(() => clearAllSuggestionMarks(editor));
          reapplyRulerMargins();
          setGapQuestions([]); setStrategicAnalysis(null);
          toast({ title: "✅ Documento fortalecido!", description: `Retenção: ${Math.round(safeResult.metrics.retentionRatio * 100)}%` });
        }
      } else if (enrichedText && enrichedText.replace(/<[^>]*>/g, "").length >= plainContent.length * 0.6) {
        const merged = hasFormattingToPreserve(editedContent)
          ? mergeAITextPreservingStyles(editedContent, ensureHtml(enrichedText))
          : ensureHtml(enrichedText);
        setEditedContent(merged);
        setGapQuestions([]); setStrategicAnalysis(null);
        toast({ title: "⚠️ Conteúdo agregado parcialmente" });
      } else {
        setEditedContent(contentSnapshot);
        toast({ title: "Sem alterações" });
      }
    } catch (err) { console.error("🔧 [handleAggregateContent] ERROR:", err); setEditedContent(contentSnapshot); toast({ title: "Erro", variant: "destructive" }); }
    finally { setIsAddingContent(false); }
  }, [editedContent, formData, selectedType, saveSnapshot, setEditedContent, toast, editorRef, clearAllSuggestionMarks, reapplyRulerMargins]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(editedContent.replace(/<[^>]*>/g, ""));
    toast({ title: "Copiado!" });
  }, [editedContent, toast]);

  const handlePrint = useCallback(async () => {
    const plainText = editedContent.replace(/<[^>]*>/g, "").trim();
    if (!plainText) { toast({ title: "Documento vazio", variant: "destructive" }); return; }
    try {
      const cleanContent = prepareContentForPdf(editedContent);
      await printHTMLAsPDF({ content: cleanContent, watermark: formData.watermark, documentType: selectedType?.id, forceLetterhead, customMarginTop: marginTop, customMarginBottom: marginBottom, rulerLeftIndent: getRulerIndentRef(), rulerFirstLineIndent: getRulerFirstLineIndentRef(), rulerRightIndent: getRulerRightIndentRef() });
    } catch (err) { console.error("Print error:", err); toast({ title: "Erro ao imprimir", variant: "destructive" }); }
  }, [editedContent, formData, selectedType, forceLetterhead, marginTop, marginBottom, toast, prepareContentForPdf]);

  const getDocumentTitle = useCallback(() =>
    `${selectedType?.label || "Documento"} - ${formData.parteAutora || "Sem parte"} ${formData.parteRe ? `x ${formData.parteRe}` : ""}`.trim(),
    [selectedType, formData]
  );

  const saveDocument = useCallback(async (folderId: string | null): Promise<string | null> => {
    if (!user) { toast({ title: "Faça login para salvar", variant: "destructive" }); return null; }
    setSaving(true);
    const cleanContent = stripSuggestionSpans(editedContent);
    const pdfContent = prepareContentForPdf(editedContent);
    try {
      const title = getDocumentTitle();
      let pdfStoragePath: string | null = null;
      try {
        const pdfBlob = await generateHTMLPDFBlob({
          content: pdfContent,
          watermark: formData.watermark,
          documentType: selectedType?.id,
          forceLetterhead,
          customMarginTop: marginTop,
          customMarginBottom: marginBottom,
          rulerLeftIndent: getRulerIndentRef(),
          rulerFirstLineIndent: getRulerFirstLineIndentRef(),
          rulerRightIndent: getRulerRightIndentRef(),
        });
        const pdfFN = `${user.id}/${Date.now()}-${sanitizeStorageFileName(title).substring(0, 50)}.pdf`;
        const { error: uploadError } = await supabase.storage.from("documents").upload(pdfFN, pdfBlob, { contentType: "application/pdf", upsert: true });
        if (!uploadError) pdfStoragePath = pdfFN;
      } catch (pdfErr) { console.warn("PDF generation failed:", pdfErr); }

      const metadata = { tom: formData.tom, tribunalId: formData.tribunalId || null, tribunal: formData.tribunalId || formData.tipoVara || null, comarca: formData.comarca || null, tipoVara: formData.tipoVara || null, numeroVara: formData.numeroVara || null, areaJuridica: formData.areaJuridica || null, valorCausa: formData.valorCausa, foroEleicao: formData.foroEleicao, letterhead: forceLetterhead, customMarginTop: marginTop, customMarginBottom: marginBottom, storage_path: pdfStoragePath };

      if (savedDocId) {
        const updateData: Record<string, any> = { content: cleanContent, watermark: formData.watermark, folder_id: folderId, updated_at: new Date().toISOString(), metadata };
        if (pdfStoragePath) updateData.pdf_url = pdfStoragePath;
        const { error } = await supabase.from("documents").update(updateData as any).eq("id", savedDocId);
        if (error) throw error;
        toast({ title: "Documento atualizado!" });
        learnDocumentStyle(user.id, formData.tipo, editedContent).catch(() => {});
        return savedDocId;
      }

      const { data: inserted, error } = await supabase.from("documents").insert({ user_id: user.id, document_type: formData.tipo, title, content: cleanContent, parties_author: formData.parteAutora || null, parties_defendant: formData.parteRe || null, case_number: formData.numeroProcesso || null, status: "rascunho", watermark: formData.watermark, signature_status: "pendente", folder_id: folderId, tags: [selectedType?.category || "geral"], pdf_url: pdfStoragePath, metadata }).select("id").single();
      if (error) throw error;
      const docId = inserted?.id || null;
      if (docId) { setSavedDocId(docId); await autoShareDocumentWithFolderClient(docId, folderId, user.id); }
      toast({ title: "Documento salvo!" });
      learnDocumentStyle(user.id, formData.tipo, editedContent).catch(() => {});
      return docId;
    } catch (err) { console.error("Error saving:", err); toast({ title: "Erro ao salvar", variant: "destructive" }); return null; }
    finally { setSaving(false); }
  }, [user, editedContent, formData, selectedType, savedDocId, forceLetterhead, marginTop, marginBottom, getDocumentTitle, toast, prepareContentForPdf]);

  const persistBeforeExport = useCallback(async (): Promise<string | null> => {
    // Mandatory save lock before any file export (PDF/DOCX)
    if (!user) return savedDocId;

    const startedAt = Date.now();
    const persistedDocId = await saveDocument(null);

    if (!persistedDocId) return null;

    // small lock window to ensure DB write visibility before generating buffer
    const elapsed = Date.now() - startedAt;
    if (elapsed < 120) {
      await new Promise((resolve) => setTimeout(resolve, 120 - elapsed));
    }

    return persistedDocId;
  }, [user, savedDocId, saveDocument]);

  const handleConfirmDownload = useCallback(async (pdfFileName: string) => {
    const plainText = editedContent.replace(/<[^>]*>/g, "").trim();
    if (!plainText) { toast({ title: "Documento vazio", variant: "destructive" }); return; }
    if (exporting) return;

    setExporting(true);
    try {
      const persistedDocId = await persistBeforeExport();
      if (user && !persistedDocId) {
        toast({ title: "Não foi possível salvar antes do download", variant: "destructive" });
        return;
      }

      const liveHtml = editorRef.current?.getHTML?.() || editedContent;
      const cleanContent = prepareContentForPdf(liveHtml);
      const safeName = pdfFileName || "documento";

      await downloadHTMLAsPDF({
        content: cleanContent,
        watermark: formData.watermark,
        documentType: selectedType?.id,
        forceLetterhead,
        customMarginTop: marginTop,
        customMarginBottom: marginBottom,
        rulerLeftIndent: getRulerIndentRef(),
        rulerFirstLineIndent: getRulerFirstLineIndentRef(),
        rulerRightIndent: getRulerRightIndentRef(),
        fileName: `${safeName}.pdf`,
      });
      toast({ title: "PDF baixado com sucesso!" });
    } catch (err) {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [editedContent, formData, selectedType, forceLetterhead, marginTop, marginBottom, toast, prepareContentForPdf, exporting, persistBeforeExport, user, editorRef]);

  const handleDownloadDocx = useCallback(async () => {
    const plainText = editedContent.replace(/<[^>]*>/g, "").trim();
    if (!plainText) { toast({ title: "Documento vazio", variant: "destructive" }); return; }
    if (exporting) return;

    setExporting(true);
    try {
      const persistedDocId = await persistBeforeExport();
      if (user && !persistedDocId) {
        toast({ title: "Não foi possível salvar antes da exportação", variant: "destructive" });
        return;
      }

      const { downloadDocx } = await import("@/lib/generators/docx-generator");
      const liveHtml = editorRef.current?.getHTML?.() || editedContent;
      const cleanContent = stripSuggestionSpans(liveHtml);
      const { details } = await downloadDocx({
        content: cleanContent,
        watermark: formData.watermark,
        documentType: selectedType?.id,
        documentCategory: selectedType?.category,
        documentLabel: selectedType?.label || "documento",
        forceLetterhead,
        rulerLeftIndent: getRulerIndentRef(),
        rulerFirstLineIndent: getRulerFirstLineIndentRef(),
        rulerRightIndent: getRulerRightIndentRef(),
      });
      toast({ title: "DOCX exportado!", description: `Inclui: ${details}` });
    } catch (err) {
      toast({ title: "Erro ao exportar DOCX", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [editedContent, formData, selectedType, forceLetterhead, toast, exporting, persistBeforeExport, user, editorRef]);

  const handleImportPdfLayout = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") { toast({ title: "Selecione um PDF", variant: "destructive" }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ title: "Arquivo muito grande (máx 10MB)", variant: "destructive" }); return; }
    setPdfImportLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const { data, error } = await supabase.functions.invoke("pdf-vision-local", {
        body: { pdfBase64: base64, mode: "html" },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      const htmlContent = data?.content;
      if (htmlContent) {
        saveSnapshot();
        const sanitized = sanitizeHtmlForTiptap(htmlContent);
        setEditedContent(sanitized);
        toast({ title: "PDF importado com layout!" });
      } else { toast({ title: "Sem conteúdo extraído", variant: "destructive" }); }
    } catch (err: any) {
      const msg = err?.message || JSON.stringify(err) || String(err);
      if (msg.includes("503") || msg.includes("not configured") || msg.includes("indisponível") || msg.includes("inativo")) {
        toast({ title: "Serviço de layout indisponível", variant: "destructive" });
      } else { toast({ title: "Erro na importação", description: msg, variant: "destructive" }); }
    } finally {
      setPdfImportLoading(false);
      if (pdfImportRef.current) pdfImportRef.current.value = "";
    }
  }, [saveSnapshot, setEditedContent, toast]);

  const handleBubbleImprove = useCallback(async (action: string, selectedText: string) => {
    const editor = editorRef.current;
    const sel = bubbleSelectionRef.current;
    const nodeCtx = bubbleNodeContextRef.current;
    if (!editor || !sel || !selectedText) {
      toast({ title: "Selecione um trecho de texto primeiro", variant: "destructive" });
      return;
    }
    saveSnapshot();
    setImproving(true);
    setImprovingMode("light");
    const detected = detectContentType(selectedText, nodeCtx || undefined);

    // Clear existing suggestion marks on selection
    try {
      const markType = editor.schema.marks.suggestion;
      if (markType) {
        const tr = editor.state.tr;
        tr.removeMark(sel.from, sel.to, markType);
        if (tr.docChanged) editor.view.dispatch(tr);
        editor.view.dispatch(editor.state.tr.setStoredMarks([]));
      }
    } catch { /* ignore */ }

    editor.chain().focus().setTextSelection({ from: sel.from, to: sel.to }).setHighlight({ color: "hsl(263, 70%, 80%)" }).run();
    try { (editor.view.dom as HTMLElement).classList.add("ai-bubble-processing"); } catch { /* */ }

    try {
      // ── Build action-specific prompt ──
      let actionPrompt: string;
      // Actions that APPEND content after the original
      const appendActions = new Set(["citacao", "fundamentar", "contra_argumentar", "nota_rodape"]);
      // Actions that REPLACE with improved version of similar length
      const replaceActions = new Set(["melhorar", "reformular", "expandir", "simplificar", "formalizar", "traduzir", "resumir"]);
      const isAppend = appendActions.has(action);

      // Different base rules for replace vs append actions
      const baseRules = isAppend
        ? `REGRAS ABSOLUTAS:
1. Mantenha o texto original INTEGRALMENTE e adicione conteúdo APÓS ele.
2. NUNCA altere formatação (tamanho de fonte, família de fonte, negrito, itálico, etc.).
3. Retorne SOMENTE o texto resultante, sem explicações, sem comentários, sem markdown.
4. PERSONA: Narrativa fluida sem bullet points — conecte tese, fundamentação e lógica.`
        : `REGRAS ABSOLUTAS:
1. Modifique APENAS o texto selecionado — NÃO adicione parágrafos extras, NÃO expanda além do necessário.
2. Mantenha comprimento SIMILAR ao original (±30%). O resultado deve ter extensão proporcional ao texto recebido.
3. NUNCA altere formatação (tamanho de fonte, família de fonte, negrito, itálico, etc.).
4. Retorne SOMENTE o texto resultante, sem explicações, sem comentários, sem markdown, sem prefixos como "Aqui está".
5. Se o texto selecionado é um título curto, retorne um título curto. Se é uma frase, retorne uma frase.
6. PERSONA: Narrativa fluida sem bullet points.`;

      switch (action) {
        case "melhorar":
          actionPrompt = getImprovePrompt(detected.type, selectedText);
          break;
        case "reformular":
          actionPrompt = `Reformule APENAS o texto abaixo, melhorando clareza, coesão e fluidez.

REGRAS OBRIGATÓRIAS:
1. Retorne SOMENTE o texto reformulado, sem explicações, sem prefixos como "Aqui está" ou "Texto reformulado:".
2. Mantenha o MESMO comprimento aproximado (±20%). NÃO expanda nem adicione parágrafos extras.
3. NÃO altere tamanho de fonte, família de fonte nem qualquer atributo style="...".
4. Identifique o formato do texto: se for título, subtítulo ou citação, PRESERVE essa estrutura exata.
5. Para títulos (H1/H2/H3): mantenha como título, apenas melhore a redação.
6. Para texto corrido: mantenha como parágrafo, apenas melhore a redação.
7. Preserve TODOS os termos jurídicos técnicos.
8. NÃO adicione fundamentação legal, artigos de lei ou jurisprudência — apenas reformule o que já existe.

Texto para reformular:
"${selectedText}"`;
          break;
        case "citacao":
          actionPrompt = `Mantenha o texto original INTEGRALMENTE e adicione ao final a fundamentação legal mais relevante: artigos de lei, súmulas e jurisprudência pertinentes em formato ABNT. Texto:\n\n"${selectedText}"`;
          break;
        case "expandir":
          actionPrompt = `Mantenha TODO o texto original e expanda com argumentos complementares, detalhes e fundamentação adicional. Estilo jurídico formal. Texto:\n\n"${selectedText}"`;
          break;
        case "simplificar":
          actionPrompt = `Reescreva em linguagem jurídica clara e acessível, sem perder a precisão técnica. Mantenha TODOS os argumentos e informações do original — apenas simplifique a estrutura. Texto:\n\n"${selectedText}"`;
          break;
        case "fundamentar":
          actionPrompt = `Mantenha o texto original INTEGRALMENTE e adicione ao final fundamentação legal robusta: artigos de lei, princípios constitucionais, súmulas e jurisprudência dos tribunais superiores (STF/STJ) em formato ABNT. Texto:\n\n"${selectedText}"`;
          break;
        case "formalizar":
          actionPrompt = `Reescreva em tom jurídico formal e técnico com terminologia processual adequada. Mantenha TODOS os argumentos, fatos e informações — apenas eleve o registro linguístico. Texto:\n\n"${selectedText}"`;
          break;
        case "contra_argumentar":
          actionPrompt = `Mantenha o texto original INTEGRALMENTE e adicione ao final: antecipação de contra-argumentos da parte contrária com respostas fundamentadas em base legal. Texto:\n\n"${selectedText}"`;
          break;
        case "nota_rodape":
          actionPrompt = `Mantenha o texto original INTEGRALMENTE e adicione ao final uma nota de rodapé acadêmica/jurídica com referência bibliográfica ou legal completa em formato ABNT. Texto:\n\n"${selectedText}"`;
          break;
        case "traduzir":
          actionPrompt = `Mantenha o texto original INTEGRALMENTE em português e adicione ao final a tradução para inglês e espanhol, com terminologia jurídica precisa. Texto:\n\n"${selectedText}"`;
          break;
        case "resumir":
          actionPrompt = `Mantenha o texto original INTEGRALMENTE e adicione ao final um resumo executivo conciso (máximo 3 parágrafos) com os pontos-chave e conclusões. Texto:\n\n"${selectedText}"`;
          break;
        case "verificar_referencia":
          actionPrompt = `Mantenha o texto original INTEGRALMENTE. Verifique as referências legais citadas (artigos, súmulas, leis) e, se encontrar erros, adicione ao final as correções necessárias. Se tudo estiver correto, retorne apenas o texto original. Texto:\n\n"${selectedText}"`;
          break;
        default:
          actionPrompt = getImprovePrompt(detected.type, selectedText);
      }

      // Fetch style memory
      let bubbleStyleCtx = "";
      if (user?.id) {
        try {
          const docType = selectedType?.id || formData.tipo || "";
          const fp = await getLearnedStyle(user.id, docType);
          if (fp) bubbleStyleCtx = `\n${styleToPromptContext(fp, docType)}`;
        } catch { /* ignore */ }
      }

      const { data, error } = await supabase.functions.invoke("aprimorar-documento", {
        body: {
          currentText: selectedText, documentType: selectedType?.label || formData.tipo,
          documentTypeId: selectedType?.id || null, category: selectedType?.category || null,
          mode: "light", userQuery: `${baseRules}\n\n${actionPrompt}`,
          userInstruction: baseRules, jurisdicao: formData.jurisdicao || "brasil",
          directApply: true,
          ...(bubbleStyleCtx && { styleContext: bubbleStyleCtx }),
        },
      });
      if (error) throw error;
      const rawResult = data?.enrichedText || data?.content || "";
      let improved = cleanAIResponse(rawResult);
      const outerPMatch = improved.match(/^\s*<p[^>]*>([\s\S]*)<\/p>\s*$/i);
      if (outerPMatch) improved = outerPMatch[1];
      // Strip any AI-introduced formatting tags to preserve original inline styles
      improved = improved.replace(/<\/?(?:span|strong|em|b|i|u)(?:\s[^>]*)?>/gi, (tag) => {
        // Keep semantic tags (bold, italic, underline) but strip style attributes
        const cleanTag = tag.replace(/\s+style="[^"]*"/gi, "");
        return cleanTag;
      });

      if (improved && improved.trim().length > 0 && improved.trim() !== selectedText.trim()) {
        // Generous limits — the AI often wraps content in HTML tags which inflates length
        const maxRatio = isAppend ? 8.0 : 2.5;
        const origLen = selectedText.replace(/<[^>]*>/g, "").trim().length;
        const newLen = improved.replace(/<[^>]*>/g, "").trim().length;
        const ratio = newLen / Math.max(origLen, 1);

        // For replace actions, verify original content is preserved
        const origPlain = selectedText.replace(/<[^>]*>/g, "").trim();
        const improvedPlain = improved.replace(/<[^>]*>/g, "").trim();
        const origWords = origPlain.split(/\s+/).filter(Boolean);
        const preservedWords = origWords.filter(w => improvedPlain.includes(w));
        const preservationRatio = preservedWords.length / Math.max(origWords.length, 1);

        if (ratio > maxRatio) {
          // Instead of rejecting, truncate and still apply with a warning
          editor.chain().focus().setTextSelection({ from: sel.from, to: sel.to }).unsetHighlight().deleteSelection().insertContent(improved).run();
          queueMicrotask(() => clearAllSuggestionMarks(editor));
        } else if (!isAppend && preservationRatio < 0.5) {
          editor.chain().focus().setTextSelection({ from: sel.from, to: sel.to }).unsetHighlight().run();
          toast({ title: "⚠️ Resultado rejeitado", description: "A IA removeu muito conteúdo original.", variant: "destructive" });
        } else {
          editor.chain().focus().setTextSelection({ from: sel.from, to: sel.to }).unsetHighlight().deleteSelection().insertContent(improved).run();
          queueMicrotask(() => clearAllSuggestionMarks(editor));
          const actionLabels: Record<string, string> = {
            melhorar: "Texto melhorado",
            reformular: "Texto reformulado",
            citacao: "Citação adicionada",
            expandir: "Texto expandido",
            simplificar: "Texto simplificado",
            fundamentar: "Fundamentação adicionada",
            formalizar: "Texto formalizado",
            contra_argumentar: "Contra-argumentos adicionados",
            nota_rodape: "Nota de rodapé adicionada",
            traduzir: "Tradução adicionada",
            resumir: "Resumo adicionado",
            verificar_referencia: "Referências verificadas",
          };
          toast({ title: `✅ ${actionLabels[action] || "Texto processado"}`, description: `${detected.label} — Aplicado diretamente. Use Ctrl+Z para desfazer.` });
        }
      } else {
        editor.chain().focus().setTextSelection({ from: sel.from, to: sel.to }).unsetHighlight().run();
        toast({ title: "Sem alterações", variant: "default" });
      }
    } catch (err) {
      try { editor.chain().focus().setTextSelection({ from: sel.from, to: sel.to }).unsetHighlight().run(); }
      catch {
        try {
          const { tr, doc } = editor.state;
          const highlightType = editor.schema.marks.highlight;
          if (highlightType) { tr.removeMark(0, doc.content.size, highlightType); if (tr.docChanged) editor.view.dispatch(tr); }
        } catch { /* */ }
      }
      toast({ title: "Erro ao processar trecho", variant: "destructive" });
    } finally {
      setImproving(false); setImprovingMode(null);
      try { (editor.view.dom as HTMLElement).classList.remove("ai-bubble-processing"); } catch { /* */ }
    }
  }, [editorRef, bubbleSelectionRef, bubbleNodeContextRef, formData, selectedType, saveSnapshot, toast, clearAllSuggestionMarks, user]);

  // ─── Planning Mode: AI analyzes document and creates action plan ───
  const [planningResult, setPlanningResult] = useState<string | null>(null);
  const [planningLoading, setPlanningLoading] = useState(false);

  const handlePlanning = useCallback(async () => {
    const plainContent = editedContent.replace(/<[^>]*>/g, "").trim();
    if (plainContent.length < 100) {
      toast({ title: "Documento muito curto", description: "Mínimo 100 caracteres para planejamento.", variant: "destructive" });
      return;
    }
    setPlanningLoading(true);
    setPlanningResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("aprimorar-documento", {
        body: {
          currentText: editedContent,
          documentType: selectedType?.label || formData.tipo,
          documentTypeId: selectedType?.id || null,
          category: selectedType?.category || null,
          mode: "planning",
          jurisdicao: formData.jurisdicao || "brasil",
        },
      });
      if (error) throw error;
      if (data?.plan) {
        setPlanningResult(data.plan);
        toast({ title: "🧠 Plano de ação gerado!", description: `Análise via ${data.provider || "IA"} em ${Math.round((data.elapsed || 0) / 1000)}s` });
      } else {
        toast({ title: "Sem resultado", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erro no planejamento", variant: "destructive" });
    } finally {
      setPlanningLoading(false);
    }
  }, [editedContent, formData, selectedType, toast]);

  // ── Summarize via Transformers.js (browser-side) ──
  const [summarizing, setSummarizing] = useState(false);
  const handleSummarize = useCallback(async () => {
    const plainText = editedContent.replace(/<[^>]*>/g, "").trim();
    if (plainText.length < 50) {
      toast({ title: "Texto muito curto", description: "O documento precisa ter pelo menos 50 caracteres para resumir.", variant: "destructive" });
      return;
    }
    setSummarizing(true);
    try {
      let summary: string;
      if (plainText.length <= 5000) {
        // Browser-side via Transformers.js WASM
        const { summarizeText } = await import("@/lib/huggingface/transformers-browser");
        summary = await summarizeText(plainText.slice(0, 3000));
      } else {
        // Large text: use server-side via hfClient
        const { hfClient } = await import("@/lib/huggingface/hf-inference-client");
        const result = await hfClient.inference<Array<{ summary_text: string }>>({
          task: "summarization",
          inputs: plainText.slice(0, 8000),
          parameters: { max_length: 256 },
        });
        summary = result.data?.[0]?.summary_text || "";
      }
      if (summary) {
        saveSnapshot();
        const summaryBlock = `<div style="background: hsl(var(--primary) / 0.05); border-left: 3px solid hsl(var(--primary)); padding: 12px 16px; margin-bottom: 16px; border-radius: 4px;"><p style="font-size: 11px; text-transform: uppercase; color: hsl(var(--muted-foreground)); margin-bottom: 4px;"><strong>📋 Resumo Automático (IA)</strong></p><p>${summary}</p></div>`;
        setEditedContent(summaryBlock + editedContent);
        toast({ title: "Resumo gerado!", description: "Inserido no topo do documento." });
      }
    } catch (err) {
      console.warn("[Summarize]", err);
      toast({ title: "Erro ao resumir", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  }, [editedContent, setEditedContent, saveSnapshot, toast]);

  return {
    // State
    improving, improvingMode, improvingProgress, saving: saving || exporting, savedDocId, setSavedDocId,
    contentHistory, qualityScore, suggestedQuestions, setSuggestedQuestions,
    isRefining, detectingGaps, gapQuestions, setGapQuestions, isAddingContent,
    pdfImportLoading, pdfImportRef, signatureStatus, setSignatureStatus,
    strategicAnalysis, setStrategicAnalysis,
    planningResult, setPlanningResult, planningLoading,
    summarizing,
    // Handlers
    saveSnapshot, handleUndoAI, handleImprove, handleRefinement, handleDetectGaps,
    handleAggregateContent, handleCopy, handlePrint, getDocumentTitle, saveDocument,
    handleConfirmDownload, handleDownloadDocx, handleImportPdfLayout, handleBubbleImprove,
    handlePlanning, handleSummarize, stripSuggestionSpans, prepareContentForPdf, reapplyRulerMargins,
  };
}
