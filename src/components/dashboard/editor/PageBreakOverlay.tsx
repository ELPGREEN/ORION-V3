import { useState, useEffect, useCallback, useRef } from "react";
import { getUsableHeight, getSpacerBase, BRANDED_MARGIN_TOP_PX, BRANDED_RESERVED_BOTTOM_PX, STD_MARGIN_TOP_PX, STD_MARGIN_BOTTOM_PX, PAGE_GAP_PX } from "./pageConstants";
import { isBrandedDocument } from "@/lib/generators";

function safeView(editor: any) {
  try { return editor?.view ?? null; } catch { return null; }
}

type MeasuredBlock = {
  el: HTMLElement;
  virtualTop: number;
  realTop: number;
  height: number;
};

interface PageBreakOverlayProps {
  editor: any;
  zoom?: number;
  documentType?: string;
  forceLetterhead?: boolean;
  onPageBreaksChange?: (breaks: number[]) => void;
  syncTrigger?: number;
}

/**
 * PageBreakOverlay — pagination algorithm
 *
 * Key fix: pageStartY = 0 (not blocks[0].virtualTop) to align with
 * PaginationEngine which starts at a fixed marginTop.
 *
 * Widget decorations are used instead of node decorations, so spacers
 * appear as separate DOM elements (not margin-bottom on blocks).
 */
export function PageBreakOverlay({ editor, zoom = 100, documentType, forceLetterhead, onPageBreaksChange, syncTrigger }: PageBreakOverlayProps) {
  const [pageBreaks, setPageBreaks] = useState<number[]>([]);
  
  /** Tracks the last position-based break key dispatched to the spacer plugin */
  const lastPositionKeyRef = useRef("");
  /** Tracks the last visual break key used for React state */
  const lastVisualKeyRef = useRef("");
  const stabilityCountRef = useRef(0);
  const visualSyncRetryRef = useRef(0);
  const emptyVisualFramesRef = useRef(0);
  /** Debounce timer to prevent rapid re-measurements causing visual jitter */
  const measureTimerRef = useRef<number | null>(null);
  const branded = forceLetterhead || isBrandedDocument(documentType);
  const usableHeight = getUsableHeight(branded);
  const spacerTotal = getSpacerBase(branded);

  const measure = useCallback(() => {
    const view = safeView(editor);
    if (!view?.dom) return;
    const dom = view.dom as HTMLElement;
    const children = Array.from(dom.children) as HTMLElement[];
    const domOffsetTop = dom.offsetTop || 0;

    if (children.length === 0) {
      setPageBreaks([]);
      onPageBreaksChange?.([]);
      return;
    }

    // ══════════════════════════════════════════════════════════════
    // Phase 1: Build block list with VIRTUAL positions
    // Subtract accumulated spacer widget heights from positions
    // ══════════════════════════════════════════════════════════════
    const blocks: MeasuredBlock[] = [];
    let accumulatedSpacer = 0;

    for (const child of children) {
      if (!child || child.offsetHeight <= 0) continue;
      // Skip spacer widget elements
      if (child.classList?.contains("page-break-spacer-widget")) {
        const spacerAttr = child.getAttribute("data-spacer-height");
        accumulatedSpacer += spacerAttr ? parseInt(spacerAttr, 10) : child.offsetHeight;
        continue;
      }
      if (child.classList?.contains("page-break-spacer")) continue;

      const realTop = child.offsetTop;
      const virtualTop = realTop - accumulatedSpacer;
      const computed = window.getComputedStyle(child);
      const marginBottom = Number.parseFloat(computed.marginBottom || "0") || 0;
      // Include bottom margin in flow height; otherwise page math underestimates
      // consumed space and text can bleed into footer/header zones.
      const height = child.offsetHeight + marginBottom;

      blocks.push({ el: child, virtualTop, realTop, height });
    }

    if (blocks.length === 0) {
      setPageBreaks([]);
      
      onPageBreaksChange?.([]);
      return;
    }

    // ══════════════════════════════════════════════════════════════
    // Phase 2: Paginate using VIRTUAL positions
    // BLOCK-LEVEL ONLY: spacers always go BETWEEN blocks (after previous block).
    // This guarantees no text bleeds into header/footer zones because
    // inline widget decorations inside paragraphs don't reliably push content.
    // ══════════════════════════════════════════════════════════════

    let pageStartY = 0;
    let pageBottom = pageStartY + usableHeight;

    const breakBlockIndices: number[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockTop = block.virtualTop;
      const blockBottom = blockTop + block.height;

      if (blockBottom > pageBottom) {
        // Place spacer after PREVIOUS block to push this block to next page
        const spacerBlockIndex = i > 0 ? i - 1 : i;
        breakBlockIndices.push(spacerBlockIndex);

        // Advance past this block (handles oversized blocks spanning multiple pages)
        pageStartY = pageBottom;
        pageBottom = pageStartY + usableHeight;
        while (blockBottom > pageBottom) {
          pageStartY = pageBottom;
          pageBottom = pageStartY + usableHeight;
        }
      }
    }

    // Phase 3: Resolve ProseMirror node positions (block-end only)
    // ══════════════════════════════════════════════════════════════

    const breakBlockPositions: number[] = [];
    for (const blockIdx of breakBlockIndices) {
      const el = blocks[blockIdx]?.el;
      if (!el) continue;
      try {
        const pmPos = view.posAtDOM(el, 0);
        const resolved = view.state.doc.resolve(pmPos);
        const depth = resolved.depth;
        const nodeStart = depth > 0 ? resolved.start(depth) - 1 : 0;
        if (nodeStart >= 0 && view.state.doc.nodeAt(nodeStart)) {
          breakBlockPositions.push(nodeStart);
        }
      } catch {
        // ignore resolution errors
      }
    }

    const normalizedBreakPositions = Array.from(new Set(breakBlockPositions)).sort((a, b) => a - b);
    const positionKey = normalizedBreakPositions.join(",");

    // ══════════════════════════════════════════════════════════════
    // Phase 4: Update PageBreakSpacerExtension storage
    // Stability threshold: only update if breaks actually changed
    // and haven't been oscillating (max 6 updates per measure cycle)
    // ══════════════════════════════════════════════════════════════

    const oldPositionKey = lastPositionKeyRef.current;

    if (positionKey !== oldPositionKey) {
      // Stability: prevent infinite oscillation
      stabilityCountRef.current += 1;
      if (stabilityCountRef.current > 15) {
        // Stop updating — breaks are oscillating
        return;
      }

      lastPositionKeyRef.current = positionKey;

      if (!editor.isDestroyed) {
        try {
          const v = safeView(editor);
          if (v) {
            // Pass break data via transaction meta (avoids instance-mismatch bugs)
            v.dispatch(
              editor.state.tr.setMeta("pageBreakData", {
                branded,
                positions: [...normalizedBreakPositions],
              })
            );
            // Re-measure after spacer widgets are inserted into DOM
            // Do NOT reset stabilityCount here — let Phase 4 track oscillation
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                measure();
              });
            });
            // Don't return — dispatch is synchronous, widgets are already in DOM.
            // Phase 5 below will read them immediately.
          }
        } catch {
          // editor may have been destroyed
        }
      }
    } else {
      // Breaks stabilized — reset counter
      stabilityCountRef.current = 0;
    }

    // ══════════════════════════════════════════════════════════════
    // Phase 5: Compute VISUAL break positions for overlay rendering
    // Scan actual spacer widget DOM elements for exact positions
    // ══════════════════════════════════════════════════════════════

    const spacerWidgets = Array.from(dom.querySelectorAll(".page-break-spacer-widget")) as HTMLElement[];
    const visualBreaks: number[] = [];

    for (const spacerEl of spacerWidgets) {
      const visualY = spacerEl.offsetTop + domOffsetTop;
      visualBreaks.push(visualY);
    }

    // Guard against transient states: on the limit line, PM/widget updates can be
    // temporarily out of sync for a frame and would incorrectly clear the footer.
    if (visualBreaks.length === 0) {
      if (normalizedBreakPositions.length > 0) {
        visualSyncRetryRef.current += 1;
        if (visualSyncRetryRef.current <= 12) {
          requestAnimationFrame(measure);
        }
        return;
      }

      // No visual and no logical breaks: require a few stable empty frames
      // before clearing, preventing one-frame flicker while typing Enter.
      emptyVisualFramesRef.current += 1;
      if (emptyVisualFramesRef.current < 3 && lastVisualKeyRef.current !== "") {
        requestAnimationFrame(measure);
        return;
      }
    } else {
      visualSyncRetryRef.current = 0;
      emptyVisualFramesRef.current = 0;
    }

    // Only update React state if visual breaks actually changed (avoid render loops)
    const visualKey = visualBreaks.map((b) => Math.round(b)).join(",");
    if (visualKey !== lastVisualKeyRef.current) {
      lastVisualKeyRef.current = visualKey;
      setPageBreaks(visualBreaks);
      
      onPageBreaksChange?.(visualBreaks);
    }
  }, [editor, onPageBreaksChange, usableHeight, spacerTotal, branded]);

  // ══════════════════════════════════════════════════════════════
  // Event listeners — measure on every editor mutation + resize
  // Reset stability counter on each new user action
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!editor) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleMeasure = () => {
      stabilityCountRef.current = 0; // reset on user action
      if (measureTimerRef.current) cancelAnimationFrame(measureTimerRef.current);
      if (debounceTimer) clearTimeout(debounceTimer);
      // Debounce: wait 50ms after last edit before re-measuring
      // This prevents rapid re-layouts that cause header/footer jitter
      debounceTimer = setTimeout(() => {
        measureTimerRef.current = requestAnimationFrame(() => {
          measure();
        });
      }, 50);
    };

    measure();
    editor.on("update", scheduleMeasure);
    editor.on("selectionUpdate", scheduleMeasure);

    const dom = safeView(editor)?.dom;
    let ro: ResizeObserver | null = null;
    if (dom) {
      ro = new ResizeObserver(() => {
        // Use same debounce as editor updates to prevent jitter
        scheduleMeasure();
      });
      ro.observe(dom);
    }

    return () => {
      editor.off("update", scheduleMeasure);
      editor.off("selectionUpdate", scheduleMeasure);
      ro?.disconnect();
      if (measureTimerRef.current) cancelAnimationFrame(measureTimerRef.current);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [editor, measure, syncTrigger]);

  // ══════════════════════════════════════════════════════════════
  // Render — page-break indicators + margin guides
  // ══════════════════════════════════════════════════════════════

  const marginTop = branded ? BRANDED_MARGIN_TOP_PX : STD_MARGIN_TOP_PX;
  const reservedBottom = branded ? BRANDED_RESERVED_BOTTOM_PX : STD_MARGIN_BOTTOM_PX;

  // The spacer widget height = reservedBottom + PAGE_GAP_PX + marginTop
  // So the next page content resumes at breakY + spacerTotal
  const spacerHeight = reservedBottom + PAGE_GAP_PX + marginTop;

  return (
    <>
      {/* ── First page margin guides ──
           Content starts at y=0 in the ProseMirror (header is above via CSS margin-top).
           Show a blue "cabeçalho" line at y=0 and an orange "rodapé" hint. ── */}

      {pageBreaks.map((breakY, idx) => {
        const pageNum = idx + 1;

        if (branded) {
          return (
            <div key={`pb-${idx}`} role="separator" aria-label={`Quebra entre página ${pageNum} e ${pageNum + 1}`}>
              {/* ── Footer limit: where content must stop ── */}
              <div style={{
                position: "absolute",
                top: breakY,
                left: 0,
                right: 0,
                height: 0,
                borderBottom: "1.5px dashed hsl(25 80% 55% / 0.7)",
                pointerEvents: "none",
                zIndex: 12,
              }}>
                <span style={{
                  position: "absolute",
                  bottom: 4,
                  right: 8,
                  fontSize: 9,
                  color: "hsl(25 80% 45%)",
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 600,
                  userSelect: "none",
                }}>
                  ▼ rodapé
                </span>
              </div>

              {/* ── Header limit on next page: where content resumes ── */}
              <div style={{
                position: "absolute",
                top: breakY + spacerHeight,
                left: 0,
                right: 0,
                height: 0,
                borderBottom: "1.5px dashed hsl(210 70% 55% / 0.7)",
                pointerEvents: "none",
                zIndex: 12,
              }}>
                <span style={{
                  position: "absolute",
                  top: 4,
                  right: 8,
                  fontSize: 9,
                  color: "hsl(210 70% 45%)",
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 600,
                  userSelect: "none",
                }}>
                  ▲ cabeçalho
                </span>
              </div>

              {/* Page number label */}
              <div style={{
                position: "absolute",
                top: breakY - 2,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 13,
                pointerEvents: "none",
              }}>
                <div style={{
                  background: "hsl(var(--foreground) / 0.82)",
                  color: "hsl(var(--background))",
                  padding: "2px 12px",
                  fontSize: 10,
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  borderRadius: 10,
                  letterSpacing: "0.3px",
                }}>
                  Pág. {pageNum} → {pageNum + 1}
                </div>
              </div>
            </div>
          );
        }

        // Non-branded: red ribbon + margin guides
        return (
          <div key={`pb-${idx}`} role="separator" aria-label={`Quebra entre página ${pageNum} e ${pageNum + 1}`}>
            {/* Red break line */}
            <div style={{
              position: "absolute",
              top: breakY,
              left: -8,
              right: -8,
              height: 3,
              background: "linear-gradient(to right, transparent 0%, hsl(0 72% 51%) 10%, hsl(0 72% 51%) 90%, transparent 100%)",
              zIndex: 12,
              pointerEvents: "none",
            }} />
            {/* Page label */}
            <div style={{
              position: "absolute",
              top: breakY - 14,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 13,
              display: "flex",
              alignItems: "center",
              pointerEvents: "none",
            }}>
              <div style={{ width: 0, height: 0, borderTop: "14px solid transparent", borderBottom: "14px solid transparent", borderRight: "8px solid hsl(0 72% 51%)" }} />
              <div style={{
                background: "hsl(0 72% 51%)",
                color: "hsl(0 0% 100%)",
                padding: "3px 14px",
                fontSize: 12,
                fontFamily: "system-ui, sans-serif",
                fontWeight: 800,
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                lineHeight: "22px",
              }}>
                PÁG. {pageNum} → PÁG. {pageNum + 1} DE {pageBreaks.length + 1}
              </div>
              <div style={{ width: 0, height: 0, borderTop: "14px solid transparent", borderBottom: "14px solid transparent", borderLeft: "8px solid hsl(0 72% 51%)" }} />
            </div>
            {/* Footer limit */}
            <div style={{
              position: "absolute",
              top: breakY,
              left: 0,
              right: 0,
              height: 0,
              borderBottom: "1.5px dashed hsl(25 80% 55% / 0.6)",
              pointerEvents: "none",
              zIndex: 12,
            }}>
              <span style={{
                position: "absolute",
                bottom: 4,
                right: 8,
                fontSize: 9,
                color: "hsl(25 70% 45%)",
                fontFamily: "system-ui, sans-serif",
                fontWeight: 600,
                userSelect: "none",
              }}>
                ▼ margem inferior
              </span>
            </div>
            {/* Header limit on next page */}
            <div style={{
              position: "absolute",
              top: breakY + spacerHeight,
              left: 0,
              right: 0,
              height: 0,
              borderBottom: "1.5px dashed hsl(210 70% 55% / 0.6)",
              pointerEvents: "none",
              zIndex: 12,
            }}>
              <span style={{
                position: "absolute",
                top: 4,
                right: 8,
                fontSize: 9,
                color: "hsl(210 70% 45%)",
                fontFamily: "system-ui, sans-serif",
                fontWeight: 600,
                userSelect: "none",
              }}>
                ▲ margem superior
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}
