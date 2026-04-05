import { type ReactNode, type MutableRefObject, type RefObject } from "react";
import { useRulerHandlers } from "@/components/dashboard/editor/useRulerHandlers";
import { EditorContent } from "@tiptap/react";
import { EditorRuler } from "@/components/dashboard/editor/EditorRuler";
import { EditorVerticalRuler } from "@/components/dashboard/editor/EditorVerticalRuler";
import { DocumentOutline } from "@/components/dashboard/editor/DocumentOutline";
import { FloatingPageIndicator } from "@/components/dashboard/editor/FloatingPageIndicator";
import { PageBreakOverlay } from "@/components/dashboard/editor/PageBreakOverlay";
import { EditorPageFrame } from "@/components/dashboard/editor/EditorPageFrame";
import { SlashCommandMenu } from "@/components/dashboard/editor/SlashCommandMenu";
import { BlockHandle } from "@/components/dashboard/editor/BlockHandle";
import { WatermarkCSS, type WatermarkConfig } from "@/components/dashboard/editor/WatermarkOverlay";
import {
  EDITOR_WORKSPACE_BG_HSL,
  getSpacerBase,
  BRANDED_RESERVED_BOTTOM_PX,
  STD_MARGIN_BOTTOM_PX,
  PAGE_HEIGHT_PX,
} from "@/components/dashboard/editor/pageConstants";

/** Safely access editor.view (TipTap v3 throws if not mounted) */
function safeView(editor: any) {
  try { return editor?.view ?? null; } catch { return null; }
}

interface SlashMenuState {
  active: boolean;
  query: string;
  range: { from: number; to: number };
  coords: { left: number; top: number } | null;
}

interface EditorCanvasAreaProps {
  editor: any;
  isEditorMounted: boolean;
  zoom: number;
  showRuler: boolean;
  showVerticalRuler: boolean;
  showLetterhead: boolean;
  branded: boolean;
  rulerLeftIndent: number;
  rulerRightIndent: number;
  rulerFirstLineIndent: number;
  setRulerLeftIndent: (v: number) => void;
  setRulerRightIndent: (v: number) => void;
  setRulerFirstLineIndent: (v: number) => void;
  handleRulerDragStart: () => void;
  rulerSelRef: MutableRefObject<{ from: number; to: number }>;
  canvasContainerRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  outlineCollapsed: boolean;
  setOutlineCollapsed: (v: boolean) => void;
  documentLabel?: string;
  forceLetterhead?: boolean;
  onExternalChatMessage?: (msg: string) => void;
  currentPage: number;
  totalPages: number;
  editorPageBreaks: number[];
  setEditorPageBreaks: (v: number[]) => void;
  syncTrigger: number;
  usablePageHeight: number;
  firstPageTopOffset: number;
  isLockedByOther: boolean;
  letterheadSrc: string | null;
  editorWatermark: WatermarkConfig | null;
  slashMenuState: SlashMenuState;
  setSlashMenuState: (v: SlashMenuState) => void;
  showLivePreview: boolean;
  livePreviewContent?: ReactNode;
}

export function EditorCanvasArea({
  editor,
  isEditorMounted,
  zoom,
  showRuler,
  showVerticalRuler,
  showLetterhead,
  branded,
  rulerLeftIndent,
  rulerRightIndent,
  rulerFirstLineIndent,
  setRulerLeftIndent,
  setRulerRightIndent,
  setRulerFirstLineIndent,
  handleRulerDragStart,
  rulerSelRef,
  canvasContainerRef,
  scrollContainerRef,
  outlineCollapsed,
  setOutlineCollapsed,
  documentLabel,
  forceLetterhead,
  onExternalChatMessage,
  currentPage,
  totalPages,
  editorPageBreaks,
  setEditorPageBreaks,
  syncTrigger,
  usablePageHeight,
  firstPageTopOffset,
  isLockedByOther,
  letterheadSrc,
  editorWatermark,
  slashMenuState,
  setSlashMenuState,
  showLivePreview,
  livePreviewContent,
}: EditorCanvasAreaProps) {
  const { onLeftIndentChange, onRightIndentChange, onFirstLineIndentChange } = useRulerHandlers({
    editor,
    rulerSelRef,
    setRulerLeftIndent,
    setRulerRightIndent,
    setRulerFirstLineIndent,
  });

  return (
    <div className={`flex-1 overflow-hidden flex flex-col min-h-0`}>
      <div ref={canvasContainerRef} className="flex-1 overflow-hidden flex min-h-0">
        {isEditorMounted && (
          <DocumentOutline
            editor={editor}
            collapsed={outlineCollapsed}
            onToggle={() => setOutlineCollapsed(!outlineCollapsed)}
            documentType={documentLabel}
            forceLetterhead={forceLetterhead}
            onOrganizeSections={
              onExternalChatMessage
                ? () => {
                    onExternalChatMessage(
                      "Analise o documento completo e organize-o em seções com títulos H1, H2 e H3 apropriados. Identifique as partes principais (preâmbulo, fundamentação, pedidos, conclusão, assinatura) e insira headings estruturais sem alterar o conteúdo existente."
                    );
                  }
                : undefined
            }
          />
        )}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-muted">
          {/* Scrollable A4 page area */}
          <div
            className="flex-1 overflow-auto relative"
            ref={scrollContainerRef}
            style={{ background: EDITOR_WORKSPACE_BG_HSL }}
          >
            <FloatingPageIndicator
              currentPage={currentPage}
              totalPages={totalPages}
              scrollContainerRef={scrollContainerRef}
            />
            {/* Sticky Ruler — rendered inside the same scaled+centered flow as the canvas */}
            {showRuler && (
              <div
                className="sticky top-0 z-20 min-w-fit"
                style={{ background: EDITOR_WORKSPACE_BG_HSL }}
              >
                <div className="flex justify-center">
                  <div
                    className="flex items-start"
                    style={{
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "top center",
                      height: 28 * (zoom / 100),
                    }}
                  >
                    {/* Spacer matching vertical ruler width so horizontal ruler aligns with canvas */}
                    {showVerticalRuler && (
                      <div style={{ width: 28, flexShrink: 0 }} />
                    )}
                    <div style={{ width: 794 }}>
                      <EditorRuler
                        widthPx={794}
                        pagePaddingLeft={76}
                        pagePaddingRight={76}
                        leftIndent={rulerLeftIndent}
                        rightIndent={rulerRightIndent}
                        firstLineIndent={rulerFirstLineIndent}
                        onDragStart={handleRulerDragStart}
                        onLeftIndentChange={onLeftIndentChange}
                        onRightIndentChange={onRightIndentChange}
                        onFirstLineIndentChange={onFirstLineIndentChange}
                        zoom={zoom}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="py-4 min-h-full pt-0 pb-[40px] flex justify-center border-none min-w-fit">
              <div
                className="flex items-start"
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top center",
                }}
              >
                {/* Vertical Ruler */}
                {showVerticalRuler && (
                  <div
                    className="flex-shrink-0 sticky top-0"
                    style={{ marginTop: firstPageTopOffset }}
                  >
                    <EditorVerticalRuler
                      heightPx={safeView(editor)?.dom?.scrollHeight ?? PAGE_HEIGHT_PX}
                      branded={branded}
                      zoom={zoom}
                      pageBreaks={editorPageBreaks}
                    />
                  </div>
                )}
                <div className="flex flex-col items-center">
                  <div
                    className={`editor-canvas-a4 relative group/canvas mb-6${isLockedByOther ? " editor-locked-overlay" : ""}`}
                    style={
                      {
                        "--editor-page-height": `${usablePageHeight}px`,
                        marginTop: firstPageTopOffset,
                        minHeight:
                          editorPageBreaks.length > 0
                            ? editorPageBreaks[editorPageBreaks.length - 1] +
                              getSpacerBase(branded) +
                              usablePageHeight +
                              BRANDED_RESERVED_BOTTOM_PX
                            : usablePageHeight +
                              (branded ? BRANDED_RESERVED_BOTTOM_PX : STD_MARGIN_BOTTOM_PX),
                      } as React.CSSProperties
                    }
                  >
                    {/* Per-node indent attributes are rendered by TipTap's renderHTML.
                         No global CSS overrides needed — ruler handlers apply attributes
                         directly to individual nodes, and the Enter key handler copies
                         ruler values to new paragraphs. */}
                    {editorWatermark && <WatermarkCSS config={editorWatermark} />}
                    {isEditorMounted && <BlockHandle editor={editor} />}
                    <EditorContent editor={editor} />
                    {isEditorMounted && (
                      <PageBreakOverlay
                        editor={editor}
                        zoom={zoom}
                        documentType={documentLabel}
                        forceLetterhead={forceLetterhead}
                        onPageBreaksChange={setEditorPageBreaks}
                        syncTrigger={syncTrigger}
                      />
                    )}
                    {isEditorMounted && showLetterhead && branded && (
                      <EditorPageFrame
                        letterheadSrc={letterheadSrc}
                        show={showLetterhead && branded}
                        pageBreaks={editorPageBreaks}
                        contentHeight={safeView(editor)?.dom?.scrollHeight ?? usablePageHeight}
                      />
                    )}
                    {/* Slash Command Menu */}
                    {slashMenuState.active && slashMenuState.coords && (
                      <div
                        className="fixed z-50"
                        style={{
                          left: slashMenuState.coords.left,
                          top: slashMenuState.coords.top,
                        }}
                      >
                        <SlashCommandMenu
                          editor={editor}
                          query={slashMenuState.query}
                          range={slashMenuState.range}
                          onClose={() =>
                            setSlashMenuState({
                              active: false,
                              query: "",
                              range: { from: 0, to: 0 },
                              coords: null,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showLivePreview && livePreviewContent && (
          <div className="w-[40%] border-l border-border flex flex-col min-h-0">
            {livePreviewContent}
          </div>
        )}
      </div>
    </div>
  );
}
