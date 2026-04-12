import { useState, useEffect, useRef, useCallback } from "react";
import {
  Loader2, Minimize, Brain, PanelRightClose, PanelRightOpen, Layers, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeStorageFileName } from "@/lib/utils";
import { RichTextEditor, type AIBubbleAction, getRulerIndentRef, getRulerFirstLineIndentRef, getRulerRightIndentRef } from "@/components/dashboard/RichTextEditor";
import { DocumentPreview } from "@/components/dashboard/DocumentPreview";
import { useAuth } from "@/contexts/AuthContext";
import { DocumentSettings } from "@/components/dashboard/DocumentSettings";
import type { FormData, DocumentType } from "@/types/document-types";
import { isJudicialCategory } from "@/types/document-types";
import { DocumentAIChatPanel } from "@/components/dashboard/editor/DocumentAIChatPanel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDocumentFormatConfig } from "@/lib/document-format-config";
import { SuggestionsPanel } from "@/components/dashboard/editor/SuggestionsPanel";
import { useEditorActions, sanitizeHtmlForTiptap } from "@/components/dashboard/editor/useEditorActions";
import { mergeAITextPreservingStyles, hasFormattingToPreserve } from "@/lib/mergeAIText";
import { useEditorSuggestions } from "@/components/dashboard/editor/useEditorSuggestions";
import { EditorDialogs } from "@/components/dashboard/editor/EditorDialogs";
import { EditorBottomPanels } from "@/components/dashboard/editor/EditorBottomPanels";
import { DocumentCompletenessGauge } from "@/components/dashboard/editor/DocumentCompletenessGauge";
import { RewriteVariationsPanel } from "@/components/dashboard/editor/RewriteVariationsPanel";
import { AIReviewPanel } from "@/components/dashboard/editor/AIReviewPanel";
import { AIStructuralPanel } from "@/components/dashboard/editor/AIStructuralPanel";
import { useAIAutocomplete } from "@/hooks/useAIAutocomplete";
// [REMOVED] import { useAIRealtimeReview } from "@/hooks/useAIRealtimeReview";
import { LegalPipelinePanel } from "@/components/dashboard/editor/LegalPipelinePanel";
import { PipelineIntakeDialog } from "@/components/dashboard/editor/PipelineIntakeDialog";
import { createInitialPipelineState, runLegalPipeline, type PipelineExecutionContext } from "@/lib/legal-pipeline";
import { applyTargetedCorrection, applyHtmlCorrection } from "@/lib/editor/applyTargetedCorrection";
import { useGoogleDocsSync } from "@/hooks/useGoogleDocsSync";
import { GoogleDocsSyncBar } from "@/components/dashboard/editor/GoogleDocsSyncBar";

interface DocumentEditorProps {
  editedContent: string;
  setEditedContent: (v: string) => void;
  formData: FormData;
  selectedType: DocumentType | undefined;
  forceLetterhead?: boolean;
  onLetterheadChange?: (v: boolean) => void;
  onWatermarkChange?: (v: string) => void;
  initialSavedDocId?: string;
  marginTop?: number;
  marginBottom?: number;
  onMarginTopChange?: (v: number) => void;
  onMarginBottomChange?: (v: number) => void;
}

export function DocumentEditor({
  editedContent, setEditedContent, formData, selectedType, forceLetterhead,
  onLetterheadChange, onWatermarkChange, initialSavedDocId,
  marginTop, marginBottom, onMarginTopChange, onMarginBottomChange,
}: DocumentEditorProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { logNeural } = useNeuralFeedback();
  const editorRef = useRef<any>(null);
  const rulerSettersRef = useRef<{ setLeft: (v: number) => void; setFirstLine: (v: number) => void; setRight: (v: number) => void } | null>(null);
  const bubbleSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const bubbleNodeContextRef = useRef<{ nodeName: string; headingLevel?: number } | null>(null);

  // ─── Suggestions ───
  const suggestions = useEditorSuggestions(editorRef, () => actions.saveSnapshot(), toast);

  // ─── Actions ───
  const actions = useEditorActions({
    editedContent, setEditedContent, formData, selectedType, forceLetterhead,
    marginTop, marginBottom, user, editorRef, rulerSettersRef, toast, logNeural,
    clearAllSuggestionMarks: suggestions.clearAllSuggestionMarks,
    bubbleSelectionRef, bubbleNodeContextRef, initialSavedDocId,
  });

  // ─── Local UI state ───
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pdfNameDialogOpen, setPdfNameDialogOpen] = useState(false);
  const [pdfFileName, setPdfFileName] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [redactionOpen, setRedactionOpen] = useState(false);
  const [templateVarsOpen, setTemplateVarsOpen] = useState(false);
  const [isDocProtected, setIsDocProtected] = useState(false);
  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [formattingDialogOpen, setFormattingDialogOpen] = useState(false);
  const [aggregateDialogOpen, setAggregateDialogOpen] = useState(false);
  const [bubbleSelectedText, setBubbleSelectedText] = useState("");
  const [editorSelection, setEditorSelection] = useState("");
  const [activePromptVersionId, setActivePromptVersionId] = useState<string | null>(null);
  const [rewriteVariationsText, setRewriteVariationsText] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [pipelineState, setPipelineState] = useState(() => createInitialPipelineState());
  const [pipelineIntakeOpen, setPipelineIntakeOpen] = useState(false);

  const isMobile = useIsMobile();
  const [chatPanelOpen, setChatPanelOpen] = useState(!isMobile);

  // ─── Google Docs Sync ───
  const gSync = useGoogleDocsSync();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [externalChatMessage, setExternalChatMessage] = useState<string | null>(null);
  const [bar1Container, setBar1Container] = useState<HTMLDivElement | null>(null);

  // ─── AI Autocomplete ───
  const autocomplete = useAIAutocomplete({
    enabled: aiEnabled && !isDocProtected,
    documentType: selectedType?.label || formData.tipo,
  });

  // ─── AI Real-time Review ───
  const aiReview = useAIRealtimeReview({
    enabled: aiEnabled,
    documentType: selectedType?.label || formData.tipo,
  });

  // Auto-run review + structural analysis on document open (first meaningful content)
  const initialReviewDoneRef = useRef(false);
  useEffect(() => {
    if (aiEnabled && editedContent && !initialReviewDoneRef.current) {
      initialReviewDoneRef.current = true;
      aiReview.triggerInitialReview(editedContent);
    }
  }, [aiEnabled, editedContent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Schedule review on subsequent content changes (debounced inside hook)
  const prevContentRef = useRef(editedContent);
  useEffect(() => {
    if (!aiEnabled || !editedContent) return;
    if (editedContent === prevContentRef.current) return;
    prevContentRef.current = editedContent;
    aiReview.scheduleReview(editedContent);
  }, [editedContent, aiEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-save debounce: capture every edit to database ───
  // Guards: skip while AI review is in-flight to avoid saving mid-analysis content
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingSaveRef = useRef(false);
  useEffect(() => {
    if (!user || !actions.savedDocId) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (aiReview.reviewLoading) {
        // Review in progress — defer save until review finishes
        pendingSaveRef.current = true;
        return;
      }
      actions.saveDocument(null).catch(() => {});
    }, 5000); // 5s debounce auto-save
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [editedContent, user, actions.savedDocId]); // removed aiReview.reviewLoading to prevent re-scheduling loops

  // Flush deferred save once review completes
  useEffect(() => {
    if (!aiReview.reviewLoading && pendingSaveRef.current && actions.savedDocId) {
      pendingSaveRef.current = false;
      const t = setTimeout(() => actions.saveDocument(null).catch(() => {}), 2000);
      return () => clearTimeout(t);
    }
  }, [aiReview.reviewLoading, actions.savedDocId]);

  const handleRulerChange = useCallback((left: number, firstLine: number, right: number) => {
    if (rulerSettersRef.current) {
      rulerSettersRef.current.setLeft(left);
      rulerSettersRef.current.setFirstLine(firstLine);
      rulerSettersRef.current.setRight(right);
    }
  }, []);

  // ─── Auto-apply format preset + ruler when editor first loads ───
  const formatAppliedRef = useRef(false);
  useEffect(() => {
    if (formatAppliedRef.current) return;
    const editor = editorRef.current;
    const setters = rulerSettersRef.current;
    if (!editor || !setters) return;
    const typeId = selectedType?.id || formData.tipo || "";
    const category = selectedType?.category;
    if (!typeId) return;
    const config = getDocumentFormatConfig(typeId, category);
    formatAppliedRef.current = true;
    try {
      (editor.chain().focus() as any).setFontFamily(config.fontFamily).run();
      editor.chain().focus().setMark("textStyle", { fontSize: config.fontSize }).run();
      editor.chain().focus().selectAll().setTextAlign(config.textAlign as any).run();
      editor.chain().focus().selectAll().updateAttributes("paragraph", { lineHeight: config.lineHeight }).run();
      editor.chain().focus().selectAll().updateAttributes("heading", { lineHeight: config.lineHeight }).run();
      editor.commands.setTextSelection(0);
    } catch (e) { console.warn("Auto-format apply failed:", e); }
    setters.setLeft(config.rulerLeftIndent);
    setters.setFirstLine(config.rulerFirstLineIndent);
    setters.setRight(config.rulerRightIndent);
    suggestions.clearAllSuggestionMarks(editor);
  }, [selectedType, formData.tipo]);

  // Fetch active prompt version
  useEffect(() => {
    const fetchActiveVersion = async () => {
      try {
        const { data } = await supabase.from("neural_prompt_versions").select("id").eq("scope", "document_feedback").eq("is_active", true).maybeSingle();
        if (data) setActivePromptVersionId(data.id);
      } catch (e) { console.warn("[DocEditor] Failed to fetch active prompt version:", e); }
    };
    fetchActiveVersion();
  }, []);

  // Fetch signature status
  useEffect(() => {
    if (!actions.savedDocId) { actions.setSignatureStatus(null); return; }
    const fetchStatus = async () => {
      const { data } = await supabase.from("documents").select("signature_status").eq("id", actions.savedDocId!).maybeSingle();
      if (data?.signature_status) actions.setSignatureStatus(data.signature_status);
    };
    fetchStatus();
  }, [actions.savedDocId]);

  // ESC to exit fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add("editor-fullscreen-active");
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFullscreen(false); };
      window.addEventListener("keydown", onKey);
      return () => { document.body.classList.remove("editor-fullscreen-active"); window.removeEventListener("keydown", onKey); };
    } else { document.body.classList.remove("editor-fullscreen-active"); }
  }, [isFullscreen]);

  // Tab key to accept autocomplete
  useEffect(() => {
    const handleTabKey = (e: KeyboardEvent) => {
      if (autocomplete.suggestion && e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const text = autocomplete.acceptSuggestion();
        if (text && editorRef.current) {
          editorRef.current.chain().focus().insertContent(text).run();
        }
      }
    };
    window.addEventListener("keydown", handleTabKey, true);
    return () => window.removeEventListener("keydown", handleTabKey, true);
  }, [autocomplete.suggestion]);

  const handleSaveClick = () => setSaveDialogOpen(true);
  const handleDownloadClick = () => {
    const typeLabel = selectedType?.label || "documento";
    setPdfFileName(`${sanitizeStorageFileName(typeLabel.toLowerCase()).replace(/_/g, "-")}-${new Date().toISOString().slice(0, 10)}`);
    setPdfNameDialogOpen(true);
  };
  const handleSignature = async () => {
    if (!actions.savedDocId) { toast({ title: "Salve primeiro", variant: "destructive" }); setSaveDialogOpen(true); return; }
    setSignatureOpen(true);
  };

  const improveModeLabel = actions.improvingMode === "legal" ? "Leis..." : actions.improvingMode === "formatting" ? "ABNT..." : "Gramática...";

  // ─── Chat panel callbacks (shared between desktop & mobile) ───
  const chatCallbacks = {
    onInsertText: (text: string) => {
      actions.saveSnapshot();
      const htmlText = text.includes("<") ? sanitizeHtmlForTiptap(text) : `<p>${text.replace(/\n/g, "<br>")}</p>`;
      try {
        if (editorRef.current) {
          const endPos = editorRef.current.state.doc.content.size;
          editorRef.current.chain().focus().insertContentAt(endPos, htmlText).run();
        } else { setEditedContent(editedContent + htmlText); }
        toast({ title: "Texto inserido no documento" });
      } catch (err) {
        setEditedContent(editedContent + htmlText);
      }
    },
    onReplaceContent: (newContent: string) => {
      actions.saveSnapshot();
      // Preserve formatting: merge AI text into original styles
      const merged = hasFormattingToPreserve(editedContent)
        ? mergeAITextPreservingStyles(editedContent, newContent)
        : newContent;
      const sanitized = sanitizeHtmlForTiptap(merged);
      if (editorRef.current) {
        editorRef.current.commands.setContent(sanitized);
      }
      setEditedContent(sanitized);
      // Reapply ruler margins and format after full content replacement
      actions.reapplyRulerMargins();
      toast({ title: "Documento atualizado" });
    },
    onReplaceSelection: (text: string) => {
      actions.saveSnapshot();
      if (editorRef.current) {
        const editor = editorRef.current;
        const { from, to } = editor.state.selection;
        if (from !== to) {
          editor.chain().focus().deleteSelection().insertContent(text).run();
        } else if (bubbleSelectedText) {
          // Use targeted correction to avoid wrong-occurrence replace
          const corrResult = applyHtmlCorrection(editedContent, bubbleSelectedText, text);
          if (corrResult.applied) setEditedContent(corrResult.result);
          else setEditedContent(editedContent.replace(bubbleSelectedText, text)); // last resort
        }
      } else if (bubbleSelectedText) {
        const corrResult = applyHtmlCorrection(editedContent, bubbleSelectedText, text);
        if (corrResult.applied) setEditedContent(corrResult.result);
        else setEditedContent(editedContent.replace(bubbleSelectedText, text));
      }
      setBubbleSelectedText("");
      toast({ title: "Seleção substituída" });
    },
    onInsertAtCursor: (text: string) => {
      actions.saveSnapshot();
      const htmlText = text.includes("<") ? sanitizeHtmlForTiptap(text) : `<p>${text.replace(/\n/g, "<br>")}</p>`;
      try {
        if (editorRef.current) editorRef.current.chain().focus().insertContent(htmlText).run();
        else setEditedContent(editedContent + htmlText);
        toast({ title: "Conteúdo inserido" });
      } catch (err) { console.error("Error inserting at cursor:", err); setEditedContent(editedContent + htmlText); }
    },
  };

  // ─── Bubble menu handler ───
  const handleAIAction = (action: AIBubbleAction, selectedText: string, nodeContext?: { nodeName: string; headingLevel?: number }) => {
    setBubbleSelectedText(selectedText);
    const editor = editorRef.current;
    if (editor) {
      const { from, to } = editor.state.selection;
      bubbleSelectionRef.current = { from, to };
    }
    bubbleNodeContextRef.current = nodeContext || null;

    // Actions that refine existing text → apply directly in editor (automatic)
    const autoActions = new Set(["melhorar", "reformular", "simplificar", "formalizar", "expandir"]);
    // Actions that generate new content → send to AI chat for user review
    const chatActions: Record<string, string> = {
      citacao: `Encontre e sugira a fundamentação legal mais relevante para o trecho selecionado. Adicione artigos de lei, súmulas e jurisprudência pertinentes em formato ABNT. NÃO remova nenhum texto original:\n\n"${selectedText}"`,
      fundamentar: `Sugira fundamentação legal robusta para o trecho a seguir. Inclua artigos de lei, princípios constitucionais, súmulas e jurisprudência dos tribunais superiores (STF/STJ) em formato ABNT. NÃO remova nenhum texto original:\n\n"${selectedText}"`,
      contra_argumentar: `Analise o trecho a seguir e antecipe possíveis contra-argumentos da parte contrária. Para cada objeção, sugira uma resposta fundamentada com base legal. NÃO remova nenhum texto original:\n\n"${selectedText}"`,
      nota_rodape: `Gere uma nota de rodapé acadêmica/jurídica para o trecho a seguir com referência bibliográfica ou legal completa em formato ABNT:\n\n"${selectedText}"`,
      traduzir: `Traduza o trecho a seguir para inglês e espanhol, mantendo a terminologia jurídica precisa. Apresente ambas as traduções separadas:\n\n"${selectedText}"`,
      resumir: `Gere um resumo executivo conciso do trecho a seguir, destacando pontos-chave, argumentos centrais e conclusões. Máximo 3 parágrafos:\n\n"${selectedText}"`,
      verificar_referencia: `Verifique as referências legais no trecho a seguir. Valide se os artigos, súmulas e leis citados existem, estão numerados corretamente e ainda estão em vigor. Indique correções se necessário:\n\n"${selectedText}"`,
    };

    if (autoActions.has(action)) {
      actions.handleBubbleImprove(action, selectedText);
    } else if (chatActions[action]) {
      setChatPanelOpen(true);
      setExternalChatMessage(chatActions[action]);
    }
  };

  return (
    <div className="flex flex-col gap-0">
        {/* Google Docs Sync Bar */}
        {gSync.hasGoogleToken && (
          <GoogleDocsSyncBar
            linkedDocId={gSync.linkedDocId}
            syncing={gSync.syncing}
            lastSyncAt={gSync.lastSyncAt}
            hasGoogleToken={gSync.hasGoogleToken}
            needsScopes={gSync.needsScopes}
            onCreateAndLink={(t) => gSync.createAndLink(t)}
            onPush={() => gSync.pushToGoogleDocs(editedContent, selectedType?.label)}
            onPull={async () => {
              const html = await gSync.pullFromGoogleDocs();
              if (html) { actions.saveSnapshot(); setEditedContent(html); if (editorRef.current) editorRef.current.commands.setContent(html); }
            }}
            onExport={(fmt) => gSync.exportViaGoogleDocs(fmt, editedContent, selectedType?.label || "Documento")}
            onLoadTemplate={async (id) => {
              const html = await gSync.createFromTemplate(id);
              if (html) { actions.saveSnapshot(); setEditedContent(html); if (editorRef.current) editorRef.current.commands.setContent(html); }
            }}
            onLinkDoc={(id) => gSync.setLinkedDoc(id)}
            onUnlink={() => gSync.setLinkedDoc(null)}
            onAuthorize={() => gSync.authorizeGoogleDocs()}
            onListDrive={(q, pt) => gSync.listDriveDocuments(q, pt)}
            onImportFromDrive={async (id) => {
              const html = await gSync.importFromDrive(id);
              if (html) { actions.saveSnapshot(); setEditedContent(html); if (editorRef.current) editorRef.current.commands.setContent(html); }
              return html;
            }}
            onShareDocument={(docId, email, role) => gSync.shareDocument(docId, email, role)}
            onRestoreRevision={(html) => {
              if (html) { setEditedContent(html); if (editorRef.current) editorRef.current.commands.setContent(html); }
            }}
            documentTitle={selectedType?.label || "Documento"}
          />
        )}
        {/* 3rem header + 2.5rem "Novo Doc" bar + 3rem footer bar (mobile) ≈ 8.5rem; desktop has no footer ≈ 5.5rem */}
        <div className={`flex flex-col border-x-0 border-b-0 border-t border-border/50 overflow-hidden ${isFullscreen ? "fixed inset-0 z-[9990] h-screen w-screen bg-background" : "h-[calc(100vh-8.5rem)] lg:h-[calc(100vh-5.5rem)]"}`}>
        {isFullscreen && (
          <div className="fixed top-3 right-3 z-[9999]">
            <Button variant="default" size="sm" className="gap-1.5 text-xs shadow-2xl bg-primary text-primary-foreground hover:bg-primary/90 border border-primary-foreground/20" onClick={() => setIsFullscreen(false)}>
              <Minimize className="h-3.5 w-3.5" /> Sair (Esc)
            </Button>
          </div>
        )}
        <div ref={setBar1Container} className="shrink-0" />

        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 overflow-hidden">
          <ResizablePanel defaultSize={chatPanelOpen && !isMobile ? 65 : 100} minSize={40} className="overflow-hidden flex flex-col">
            <div className="h-full flex flex-col overflow-hidden">
              <RichTextEditor
                bar1PortalTarget={bar1Container}
                isFullscreen={isFullscreen}
                onFullscreenToggle={() => setIsFullscreen(f => !f)}
                content={editedContent}
                onChange={(html) => {
                  setEditedContent(html);
                  // Trigger autocomplete on typing
                  if (aiEnabled && editorRef.current) {
                    const editor = editorRef.current;
                    const { from } = editor.state.selection;
                    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 500), from, " ");
                    const lastSentence = textBefore.split(/[.!?\n]/).pop()?.trim() || "";
                    if (lastSentence.length > 10) {
                      autocomplete.onTextChange(textBefore, lastSentence);
                    }
                  }
                }}
                readOnly={isDocProtected}
                onSelectionChange={(text) => { setEditorSelection(text); if (text) setBubbleSelectedText(text); }}
                onEditorReady={(editor) => { editorRef.current = editor; }}
                onRulerReady={(setters) => { rulerSettersRef.current = setters; }}
                onAIAction={handleAIAction}
                onImprove={(mode) => actions.handleImprove(mode as any)}
                onImproveWithDialog={(mode) => {
                  if (mode === "legal") setLegalDialogOpen(true);
                  else if (mode === "formatting" || mode === "abnt") setFormattingDialogOpen(true);
                  else if (mode === "grammar" || mode === "style") actions.handleImprove("light", { userQuery: mode === "grammar" ? "Foque em correção gramatical e ortográfica" : "Foque em melhoria de estilo, clareza e elegância" });
                  else actions.handleImprove(mode as any);
                }}
                onAggregate={() => setAggregateDialogOpen(true)}
                onPlanning={actions.handlePlanning}
                onStartPipeline={() => setPipelineIntakeOpen(true)}
                pipelineRunning={pipelineState.isRunning}
                planningLoading={actions.planningLoading}
                onCopy={actions.handleCopy}
                onSave={handleSaveClick}
                onDownload={handleDownloadClick}
                onSignature={handleSignature}
                onShare={() => setShareOpen(true)}
                onRedaction={() => setRedactionOpen(true)}
                onTemplates={() => setTemplateVarsOpen(true)}
                onUndoAI={actions.handleUndoAI}
                isDocProtected={isDocProtected}
                onToggleProtection={() => setIsDocProtected(!isDocProtected)}
                qualityScore={actions.qualityScore}
                improving={actions.improving}
                improvingLabel={actions.improvingProgress || improveModeLabel}
                contentHistory={actions.contentHistory.length}
                savedDocId={actions.savedDocId}
                signatureStatus={actions.signatureStatus}
                saving={actions.saving}
                detectingGaps={actions.detectingGaps}
                isAddingContent={actions.isAddingContent}
                documentLabel={selectedType?.label || "Documento"}
                documentCategory={selectedType?.category && ["penal", "civil", "trabalhista"].includes(selectedType.category) ? "Judicial" : "Extrajudicial"}
                documentTypeId={selectedType?.id}
                forceLetterhead={forceLetterhead}
                onForceLetterheadChange={onLetterheadChange}
                previewContent={<DocumentPreview content={editedContent} watermark={formData.watermark} includeStamp={false} documentType={selectedType?.id} forceLetterhead={forceLetterhead} customMarginTop={marginTop} customMarginBottom={marginBottom} prepareContent={actions.prepareContentForPdf} />}
                livePreviewContent={<DocumentPreview content={editedContent} watermark={formData.watermark} includeStamp={false} documentType={selectedType?.id} forceLetterhead={forceLetterhead} customMarginTop={marginTop} customMarginBottom={marginBottom} compact prepareContent={actions.prepareContentForPdf} />}
                settingsContent={<DocumentSettings watermark={formData.watermark} onWatermarkChange={onWatermarkChange || (() => {})} isJudicial={isJudicialCategory(selectedType?.category)} letterhead={forceLetterhead} onLetterheadChange={onLetterheadChange} marginTop={marginTop} marginBottom={marginBottom} onMarginTopChange={onMarginTopChange} onMarginBottomChange={onMarginBottomChange} />}
                suggestionsContent={<SuggestionsPanel suggestions={suggestions.editorSuggestions} onAccept={suggestions.handleAcceptSuggestion} onReject={suggestions.handleRejectSuggestion} onAcceptAll={suggestions.handleAcceptAllSuggestions} onRejectAll={suggestions.handleRejectAllSuggestions} />}
                suggestions={suggestions.editorSuggestions}
                onExternalChatMessage={(msg) => { setExternalChatMessage(msg); if (!chatPanelOpen) setChatPanelOpen(true); }}
              />
            </div>
          </ResizablePanel>

          {chatPanelOpen && !isMobile && <ResizableHandle withHandle />}

          {chatPanelOpen && !isMobile && (
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50} className="overflow-hidden border-l border-border">
              <DocumentAIChatPanel
                documentContent={editedContent}
                documentType={selectedType?.label || formData.tipo}
                documentId={actions.savedDocId || undefined}
                selectedText={editorSelection || bubbleSelectedText}
                inline={true}
                onClose={() => setChatPanelOpen(false)}
                externalMessage={externalChatMessage}
                onExternalMessageSent={() => setExternalChatMessage(null)}
                {...chatCallbacks}
                onImprove={(mode) => actions.handleImprove(mode as any)}
                onSave={handleSaveClick}
                onRedaction={() => setRedactionOpen(true)}
                onRulerChange={handleRulerChange}
              />
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Toggle chat panel button */}
      {!isMobile && (
        <div className="flex items-center justify-between px-2 py-0.5 bg-card/60 border border-border/40 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <input ref={actions.pdfImportRef} type="file" accept="application/pdf" className="hidden" onChange={actions.handleImportPdfLayout} />
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-1.5" disabled={actions.pdfImportLoading} onClick={() => actions.pdfImportRef.current?.click()}>
              {actions.pdfImportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Importar PDF</span>
            </Button>
            {/* Autocomplete suggestion indicator */}
            {autocomplete.suggestion && (
              <button
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium hover:bg-primary/20 transition-colors animate-in fade-in-50"
                onClick={() => {
                  const text = autocomplete.acceptSuggestion();
                  if (text && editorRef.current) {
                    editorRef.current.chain().focus().insertContent(text).run();
                  }
                }}
              >
                <Sparkles className="h-3 w-3" /> {autocomplete.suggestion.substring(0, 50)}{autocomplete.suggestion.length > 50 ? "…" : ""} <span className="text-[8px] bg-primary/20 rounded px-1">Tab</span>
              </button>
            )}
            {autocomplete.loading && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant={chatPanelOpen ? "default" : "outline"} size="sm" className="h-6 text-[10px] gap-1 px-1.5" onClick={() => setChatPanelOpen(!chatPanelOpen)}>
              {chatPanelOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <Brain className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{chatPanelOpen ? "Fechar Chat IA" : "Chat IA"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Mobile chat */}
      {isMobile && (
        <DocumentAIChatPanel
          documentContent={editedContent}
          documentType={selectedType?.label || formData.tipo}
          documentId={actions.savedDocId || undefined}
          selectedText={editorSelection || bubbleSelectedText}
          {...chatCallbacks}
          onImprove={(mode) => actions.handleImprove(mode as any)}
          onSave={handleSaveClick}
          onRedaction={() => setRedactionOpen(true)}
          onRulerChange={handleRulerChange}
        />
      )}

      {/* Scrollable bottom panels */}
      <div className="overflow-y-auto max-h-[40vh] space-y-2">
      {/* Completeness Gauge */}
      <DocumentCompletenessGauge
        editorHtml={editedContent}
        documentType={selectedType?.label || formData.tipo}
        onDetectGaps={() => actions.handleDetectGaps()}
        onInsertClause={(suggestion) => {
          actions.saveSnapshot();
          const html = suggestion.replace(/\n/g, "<br>");
          if (editorRef.current) {
            const endPos = editorRef.current.state.doc.content.size;
            editorRef.current.chain().focus().insertContentAt(endPos, `<p>${html}</p>`).run();
          } else {
            setEditedContent(editedContent + `<p>${html}</p>`);
          }
          toast({ title: "Cláusula inserida" });
        }}
        detectingGaps={actions.detectingGaps}
      />

      {/* AI Real-time Review Panel */}
      <AIReviewPanel
        issues={aiReview.issues}
        loading={aiReview.reviewLoading}
        neuralMetrics={aiReview.neuralMetrics}
        onRefresh={() => aiReview.runReview(editedContent)}
        onApplyFix={(issue) => {
          const replacement = (issue.replacementText || issue.fix || "").trim();
          if (!issue.excerpt || !replacement) return;
          actions.saveSnapshot();

          const editor = editorRef.current;
          // Force autoApplicable for the correction engine attempt
          const normalizedIssue = { ...issue, replacementText: replacement, autoApplicable: true };

          if (editor) {
            const result = applyTargetedCorrection(editor, normalizedIssue);
            if (result.success) {
              aiReview.removeIssue(issue.id);
              toast({ title: "✅ Correção aplicada" });
              return;
            }

            if (result.reason === "ambiguous") {
              toast({
                title: "⚠️ Trecho ambíguo",
                description: "A correção aparece em múltiplos pontos. Use aplicação manual individual.",
                variant: "destructive",
              });
              return;
            }

            // FALLBACK: try HTML correction on the current editor HTML
            const currentHtml = editor.getHTML();
            const { result: htmlResult, applied: htmlApplied } = applyHtmlCorrection(currentHtml, issue.excerpt, replacement);
            if (htmlApplied) {
              editor.commands.setContent(htmlResult);
              setEditedContent(htmlResult);
              aiReview.removeIssue(issue.id);
              toast({ title: "✅ Correção aplicada" });
              return;
            }

            toast({
              title: "❌ Trecho não encontrado",
              description: "O texto analisado mudou. Clique em Reanalisar e tente novamente.",
              variant: "destructive",
            });
            return;
          }

          const { result, applied } = applyHtmlCorrection(editedContent, issue.excerpt, replacement);
          if (applied) {
            setEditedContent(result);
            aiReview.removeIssue(issue.id);
            toast({ title: "✅ Correção aplicada" });
          } else {
            toast({ title: "❌ Não foi possível aplicar", variant: "destructive" });
          }
        }}
        onApplyAllSafe={() => {
          const editor = editorRef.current;
          if (!editor) return;
          actions.saveSnapshot();

          const safeIssues = aiReview.issues
            .filter((i) => i.excerpt && Boolean((i.replacementText || i.fix || "").trim()))
            .map((i) => ({ ...i, replacementText: (i.replacementText || i.fix || "").trim(), autoApplicable: true }));

          let appliedCount = 0;
          let ambiguousCount = 0;
          let notFoundCount = 0;

          for (const issue of safeIssues) {
            const result = applyTargetedCorrection(editor, issue);
            if (result.success) {
              aiReview.removeIssue(issue.id);
              appliedCount++;
            } else if (result.reason === "ambiguous") {
              ambiguousCount++;
            } else {
              notFoundCount++;
            }
          }

          if (appliedCount === 0) {
            toast({
              title: `⚠️ 0 correções aplicadas de ${safeIssues.length}`,
              description: ambiguousCount > 0
                ? `${ambiguousCount} ambíguas e ${notFoundCount} fora de contexto. Reanalise para gerar correções únicas.`
                : "Os trechos não batem com o texto atual. Reanalise o documento.",
              variant: "destructive",
            });
            return;
          }

          // Force re-pagination: batch corrections change content height, spacers may be stale
          if (editorRef.current) {
            try {
              const view = editorRef.current.view;
              if (view) {
                // First clear old spacer positions, then force recalculation
                view.dispatch(
                  editorRef.current.state.tr
                    .setMeta("pageBreakData", { branded: false, positions: [] })
                    .setMeta("forcePageBreakUpdate", true)
                );
                // Schedule a second pass after DOM settles
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    if (editorRef.current && !editorRef.current.isDestroyed) {
                      editorRef.current.view.dispatch(
                        editorRef.current.state.tr.setMeta("forcePageBreakUpdate", true)
                      );
                    }
                  });
                });
              }
            } catch { /* editor may be unmounted */ }
            // Re-review after successful batch apply to refresh the issue list
            aiReview.scheduleReview(editorRef.current.getHTML());
          }

          toast({
            title: `✅ ${appliedCount} correções aplicadas de ${safeIssues.length}`,
            description: ambiguousCount + notFoundCount > 0
              ? `${ambiguousCount} ambíguas, ${notFoundCount} não encontradas.`
              : undefined,
          });
        }}
      />

      {/* AI Structural Analysis Panel */}
      <AIStructuralPanel
        analysis={aiReview.structural}
        loading={aiReview.structuralLoading}
        onRefresh={() => aiReview.runStructuralAnalysis(editedContent)}
        onInsertSection={(text, sectionName) => {
          actions.saveSnapshot();
          const lines = text.split('\n');
          const html = `<h2>${lines[0]}</h2><p>${lines.slice(1).join('<br>')}</p>`;
          if (editorRef.current) {
            const endPos = editorRef.current.state.doc.content.size;
            editorRef.current.chain().focus().insertContentAt(endPos, html).run();
          } else {
            setEditedContent(editedContent + html);
          }
          aiReview.removeMissingSection(sectionName);
          toast({ title: `✅ Seção "${sectionName}" inserida` });
        }}
      />

      {/* Legal Pipeline Panel — 9 Agent Orchestration */}
      <LegalPipelinePanel
        pipeline={pipelineState}
        onStart={() => setPipelineIntakeOpen(true)}
        onReset={() => setPipelineState(createInitialPipelineState())}
        onStepClick={(stepId) => {
          const step = pipelineState.steps.find((s) => s.id === stepId);
          if (step?.output) {
            toast({ title: `📋 ${step.label}`, description: step.output.substring(0, 300) });
          }
        }}
        onInsertDocument={() => {
          if (pipelineState.finalDocument) {
            actions.saveSnapshot();
            const html = sanitizeHtmlForTiptap(pipelineState.finalDocument);
            if (!html || html.replace(/<[^>]*>/g, "").trim().length === 0) {
              toast({
                title: "⚠️ Saída inválida do pipeline",
                description: "O retorno veio vazio ou com formato inválido. Tente executar o pipeline novamente.",
              });
              return;
            }
            if (editorRef.current) {
              editorRef.current.commands.setContent(html);
            }
            setEditedContent(html);
            // Reapply ABNT formatting and ruler margins after pipeline insertion
            actions.reapplyRulerMargins();
            toast({ title: "✅ Documento do pipeline inserido no editor" });
          }
        }}
        onExportPdf={() => {
          if (pipelineState.finalDocument) {
            actions.handleConfirmDownload("pipeline-documento");
          }
        }}
        compact
      />

      {/* Pipeline Intake Dialog */}
      <PipelineIntakeDialog
        open={pipelineIntakeOpen}
        onOpenChange={setPipelineIntakeOpen}
        onStart={(ctx) => {
          runLegalPipeline(ctx, (newState) => setPipelineState({ ...newState }));
        }}
        defaultTopic={formData.fatos || formData.tipo || ""}
        defaultArea={formData.areaJuridica || "civil"}
        defaultDocType={selectedType?.label || formData.tipo || "Petição Inicial"}
        editorContent={editedContent}
      />

      {/* Planning Mode Panel */}
      {(actions.planningResult || actions.planningLoading) && (
        <div className="border-b border-border/30">
          <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground border-b border-border/20">
            <div className="flex items-center gap-1.5">
              <Brain className="h-3 w-3 text-primary" />
              <span className="font-medium">🧠 Plano de Ação IA</span>
              {actions.planningLoading && <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />}
            </div>
            {actions.planningResult && (
              <button
                className="text-[9px] text-muted-foreground hover:text-foreground"
                onClick={() => actions.setPlanningResult(null)}
              >✕ Fechar</button>
            )}
          </div>
          {actions.planningLoading && (
            <div className="px-3 py-4 flex flex-col items-center gap-1.5">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-[10px] text-muted-foreground">Analisando documento e criando plano...</p>
            </div>
          )}
          {actions.planningResult && (
            <div className="px-3 py-2 max-h-[300px] overflow-y-auto">
              <div className="text-[10px] text-foreground whitespace-pre-line leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                {actions.planningResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rewrite Variations Panel */}
      {rewriteVariationsText && (
        <RewriteVariationsPanel
          originalText={rewriteVariationsText}
          documentType={selectedType?.label || formData.tipo}
          documentCategory={selectedType?.category}
          onApply={(text) => {
            actions.saveSnapshot();
            const editor = editorRef.current;
            const sel = bubbleSelectionRef.current;
            if (editor && sel) {
              editor.chain().focus().setTextSelection({ from: sel.from, to: sel.to }).deleteSelection().insertContent(text).run();
            } else if (bubbleSelectedText) {
              const corrResult = applyHtmlCorrection(editedContent, bubbleSelectedText, text);
              if (corrResult.applied) setEditedContent(corrResult.result);
              else setEditedContent(editedContent.replace(bubbleSelectedText, text));
            }
            setRewriteVariationsText(null);
            toast({ title: "Variação aplicada" });
          }}
          onClose={() => setRewriteVariationsText(null)}
        />
      )}

      {/* Bottom panels */}
      <EditorBottomPanels
        suggestedQuestions={actions.suggestedQuestions}
        onRefine={actions.handleRefinement}
        onSkipRefinement={() => actions.setSuggestedQuestions([])}
        isRefining={actions.isRefining}
        strategicAnalysis={actions.strategicAnalysis}
        onClearAnalysis={() => actions.setStrategicAnalysis(null)}
        gapQuestions={actions.gapQuestions}
        isAddingContent={actions.isAddingContent}
        onAggregateContent={actions.handleAggregateContent}
        onClearGaps={() => { actions.setGapQuestions([]); actions.setStrategicAnalysis(null); }}
      />

      <p className="text-[10px] text-muted-foreground/60 text-center">
        Revise sempre antes de protocolar ou assinar — IA é auxiliar. OAB Provimento 205/2021 e LGPD.
      </p>
      </div>{/* End scrollable bottom panels */}

      {/* Dialogs */}
      <EditorDialogs
        saveDialogOpen={saveDialogOpen} setSaveDialogOpen={setSaveDialogOpen}
        onSaveToFolder={async (folderId) => { await actions.saveDocument(folderId); }}
        documentTitle={actions.getDocumentTitle()}
        defaultFolderName={selectedType?.category && ["penal", "civil", "trabalhista"].includes(selectedType.category) ? "Processos" : "Contratos"}
        signatureOpen={signatureOpen} setSignatureOpen={setSignatureOpen}
        savedDocId={actions.savedDocId}
        editedContent={editedContent}
        formData={formData}
        selectedTypeId={selectedType?.id}
        onSignatureSuccess={() => { setSignatureOpen(false); actions.setSignatureStatus("enviado"); toast({ title: "Enviado para assinatura!" }); }}
        shareOpen={shareOpen} setShareOpen={setShareOpen}
        pdfNameDialogOpen={pdfNameDialogOpen} setPdfNameDialogOpen={setPdfNameDialogOpen}
        pdfFileName={pdfFileName} setPdfFileName={setPdfFileName}
        onConfirmDownload={() => { setPdfNameDialogOpen(false); actions.handleConfirmDownload(pdfFileName); }}
        legalDialogOpen={legalDialogOpen} setLegalDialogOpen={setLegalDialogOpen}
        formattingDialogOpen={formattingDialogOpen} setFormattingDialogOpen={setFormattingDialogOpen}
        aggregateDialogOpen={aggregateDialogOpen} setAggregateDialogOpen={setAggregateDialogOpen}
        improving={actions.improving} improvingMode={actions.improvingMode}
        detectingGaps={actions.detectingGaps}
        onLegalSubmit={(text) => actions.handleImprove("legal", { userQuery: text })}
        onFormattingSubmit={(opts) => actions.handleImprove("formatting", { formattingOptions: opts })}
        onAggregateSubmit={(text) => actions.handleDetectGaps(text)}
        redactionOpen={redactionOpen} setRedactionOpen={setRedactionOpen}
        onApplyRedaction={(redacted) => { actions.saveSnapshot(); setEditedContent(redacted); toast({ title: "Redação LGPD aplicada" }); }}
        templateVarsOpen={templateVarsOpen} setTemplateVarsOpen={setTemplateVarsOpen}
        onApplyVariables={(filled) => { actions.saveSnapshot(); setEditedContent(filled); toast({ title: "Variáveis preenchidas!" }); }}
        onInsertVariable={(placeholder) => {
          if (editorRef.current) editorRef.current.chain().focus().insertContent(placeholder).run();
          else setEditedContent(editedContent + placeholder);
          toast({ title: "Variável inserida" });
        }}
        editorRef={editorRef}
      />
    </div>
  );
}
