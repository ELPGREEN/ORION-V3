import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ListTree, ChevronRight, ChevronLeft, Wand2, BookOpen, GripVertical } from "lucide-react";
import { isBrandedDocument } from "@/lib/generators";
import { getUsableHeight } from "./pageConstants";

function safeView(editor: any) {
  try { return editor?.view ?? null; } catch { return null; }
}

interface HeadingItem {
  id: string;
  level: number;
  text: string;
  pos: number;
  page: number;
  summary: string;
  index: string;
}

interface DocumentOutlineProps {
  editor: any;
  collapsed?: boolean;
  onToggle?: () => void;
  onOrganizeSections?: () => void;
  documentType?: string;
  forceLetterhead?: boolean;
}

export function DocumentOutline({ editor, collapsed, onToggle, onOrganizeSections, documentType, forceLetterhead }: DocumentOutlineProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activePos, setActivePos] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [panelWidth, setPanelWidth] = useState(280);
  const resizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const branded = forceLetterhead || isBrandedDocument(documentType);
  const usableHeight = getUsableHeight(branded);

  // ── Resize logic ──
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    const startX = e.clientX;
    const startW = panelWidth;

    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const delta = ev.clientX - startX;
      setPanelWidth(Math.max(180, Math.min(480, startW + delta)));
    };
    const onUp = () => {
      resizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [panelWidth]);

  const getPageForPos = useCallback((pos: number): number => {
    const view = safeView(editor);
    if (!view) return 1;
    try {
      const coords = view.coordsAtPos(pos);
      const editorRect = view.dom.getBoundingClientRect();
      const relativeTop = coords.top - editorRect.top + view.dom.scrollTop;
      return Math.floor(relativeTop / usableHeight) + 1;
    } catch {
      return 1;
    }
  }, [editor, usableHeight]);

  const extractHeadings = useCallback(() => {
    if (!editor) return;
    const raw: Omit<HeadingItem, "index">[] = [];
    const doc = editor.state.doc;

    doc.descendants((node: any, pos: number) => {
      if (node.type.name === "heading") {
        const summary = getNextParagraphText(doc, pos + node.nodeSize);
        raw.push({
          id: `heading-${pos}`,
          level: node.attrs.level || 1,
          text: node.textContent || "(sem título)",
          pos,
          page: getPageForPos(pos),
          summary,
        });
        return;
      }
      if (node.type.name === "paragraph" && node.childCount > 0 && node.textContent.trim().length > 0) {
        const text = node.textContent.trim();
        if (text.length > 120) return;

        let allBold = true;
        node.forEach((child: any) => {
          if (child.isText) {
            const hasBold = child.marks?.some((m: any) => m.type.name === "bold");
            if (!hasBold && child.text.trim().length > 0) allBold = false;
          }
        });

        const letters = text.replace(/[^a-záàâãéèêíïóôõöúüçA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ]/g, "");
        const isUpperCase = letters.length >= 3 && letters === letters.toUpperCase();

        const legalPattern = /^(d[oa]s?\s|das?\s|preliminar|cláusula|capítulo|seção|título|artigo)/i.test(text) ||
          /^(i{1,3}|iv|vi{0,3}|ix|x{1,3})\s*[–—\-\.]\s*/i.test(text) ||
          /^\d+[\.\)]\s+[A-ZÁÀÂÃÉÈÊ]/.test(text);

        if (allBold || isUpperCase || (allBold && legalPattern)) {
          const level = (allBold && isUpperCase) ? 1 : allBold ? 2 : isUpperCase ? 2 : 3;
          const summary = getNextParagraphText(doc, pos + node.nodeSize);
          raw.push({
            id: `pseudo-${pos}`,
            level,
            text,
            pos,
            page: getPageForPos(pos),
            summary,
          });
        }
      }
    });

    const counters = [0, 0, 0];
    const items: HeadingItem[] = raw.map((h) => {
      const lvl = Math.min(h.level, 3);
      counters[lvl - 1]++;
      for (let i = lvl; i < 3; i++) counters[i] = 0;

      const parts = counters.slice(0, lvl).filter((_, idx) => idx < lvl);
      const index = parts.join(".");

      return { ...h, index };
    });

    setHeadings(items);
  }, [editor, getPageForPos]);

  useEffect(() => {
    if (!editor) return;
    extractHeadings();
    editor.on("update", extractHeadings);
    return () => { editor.off("update", extractHeadings); };
  }, [editor, extractHeadings]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const { from } = editor.state.selection;
      let closest: number | null = null;
      for (const h of headings) {
        if (h.pos <= from) closest = h.pos;
      }
      setActivePos(closest);
    };
    editor.on("selectionUpdate", handler);
    return () => { editor.off("selectionUpdate", handler); };
  }, [editor, headings]);

  const scrollToHeading = (pos: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos).run();
    const view = safeView(editor);
    const domAtPos = view?.domAtPos(pos);
    if (domAtPos?.node) {
      const el = domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalPages = useMemo(() => {
    if (headings.length === 0) return 0;
    return Math.max(...headings.map((h) => h.page));
  }, [headings]);

  if (collapsed) {
    return (
      <div className="hidden sm:flex flex-col items-center py-2 border-r border-border bg-card/50 w-8 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onToggle}
          title="Abrir sumário"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="hidden sm:flex flex-col border-r border-border bg-card/50 shrink-0 min-w-0 relative"
      style={{ width: `${panelWidth}px` }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-border">
        <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[10px] font-semibold text-foreground uppercase tracking-wider flex-1 truncate">
          Sumário
        </span>
        {headings.length > 0 && (
          <span className="text-[8px] text-muted-foreground tabular-nums whitespace-nowrap">
            {headings.length} seções · {totalPages} pág{totalPages !== 1 ? "s" : ""}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-foreground shrink-0"
          onClick={onToggle}
          title="Fechar sumário"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="py-1.5 px-1">
          {headings.length === 0 && (
            <div className="px-3 py-4 text-center space-y-2">
              <ListTree className="h-6 w-6 mx-auto text-muted-foreground/40" />
              <p className="text-[10px] text-muted-foreground">
                Nenhum título detectado.<br />Use H1, H2 ou H3 para criar a estrutura.
              </p>
              {onOrganizeSections && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 gap-1 w-full"
                  onClick={onOrganizeSections}
                >
                  <Wand2 className="h-3 w-3" />
                  Organizar em Seções
                </Button>
              )}
            </div>
          )}

          {headings.map((h) => {
            const isActive = activePos === h.pos;
            const isExpanded = expandedIds.has(h.id);
            const hasSummary = h.summary.length > 0;
            const indent = (h.level - 1) * 12 + 4;

            const borderColor =
              h.level === 1
                ? "border-primary/60"
                : h.level === 2
                ? "border-primary/30"
                : "border-muted-foreground/20";

            return (
              <div key={h.id} className="group" style={{ paddingLeft: `${indent}px` }}>
                <button
                  onClick={() => scrollToHeading(h.pos)}
                  className={`w-full text-left py-1 px-1.5 rounded-sm transition-colors flex items-start gap-1 border-l-2 ${borderColor} ${
                    isActive
                      ? "bg-primary/8 text-primary"
                      : "text-foreground/80 hover:bg-accent/50"
                  }`}
                  title={`${h.text} — Pág. ${h.page}`}
                >
                  {hasSummary ? (
                    <span
                      onClick={(e) => toggleExpand(h.id, e)}
                      className="mt-[2px] shrink-0 cursor-pointer text-muted-foreground hover:text-foreground transition-transform"
                    >
                      <ChevronRight
                        className={`h-2.5 w-2.5 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </span>
                  ) : (
                    <span className="w-2.5 shrink-0" />
                  )}

                  <span className="text-[9px] font-mono text-muted-foreground shrink-0 mt-[1px] min-w-[16px]">
                    {h.index}
                  </span>

                  <span className="flex-1 flex items-baseline gap-0 min-w-0 overflow-hidden">
                    <span className={`text-[10px] shrink min-w-0 break-words whitespace-normal line-clamp-2 ${isActive ? "font-semibold" : "font-medium"}`}>
                      {h.text}
                    </span>
                    <span className="flex-1 mx-0.5 border-b border-dotted border-muted-foreground/30 min-w-[8px] self-end mb-[3px]" />
                    <span className="text-[9px] text-muted-foreground shrink-0 tabular-nums font-mono whitespace-nowrap">
                      {h.page}
                    </span>
                  </span>
                </button>

                {hasSummary && isExpanded && (
                  <div
                    className="ml-6 mr-1 mb-1 px-2 py-1 text-[9px] italic text-muted-foreground leading-relaxed border-l border-muted-foreground/15 bg-muted/30 rounded-sm"
                  >
                    <span className="opacity-60 mr-0.5">↳</span> {h.summary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Resize handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors group/resize z-10"
        title="Arrastar para redimensionar"
      >
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1.5 h-8 flex items-center justify-center opacity-0 group-hover/resize:opacity-100 transition-opacity">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

/** Extract first ~80 chars from the next paragraph node after a given position */
function getNextParagraphText(doc: any, afterPos: number): string {
  let found = "";
  let searching = true;
  try {
    doc.nodesBetween(afterPos, Math.min(afterPos + 500, doc.content.size), (node: any) => {
      if (!searching) return false;
      if (node.type.name === "paragraph" && node.textContent.trim().length > 0) {
        const text = node.textContent.trim();
        found = text.length > 80 ? text.slice(0, 80) + "…" : text;
        searching = false;
        return false;
      }
      if (node.type.name === "heading") {
        searching = false;
        return false;
      }
    });
  } catch {
    // ignore
  }
  return found;
}
