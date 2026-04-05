import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { getSpacerBase } from "./pageConstants";

export const SPACER_BASE = 0;

const spacerPluginKey = new PluginKey("pageBreakSpacerDecorations");

/**
 * PageBreakSpacerExtension — inserts invisible spacer widgets at page-break
 * positions calculated by PageBreakOverlay.
 *
 * Root cause fix: previous versions used onTransaction (fires AFTER view
 * update) or external storage (stale by one cycle). This version uses
 * plugin state.apply() to capture meta AND build DecorationSet atomically
 * — before props.decorations() is called by the view.
 */
export const PageBreakSpacerExtension = Extension.create({
  name: "pageBreakSpacer",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: spacerPluginKey,

        state: {
          init(): { branded: boolean; positions: number[]; decorations: DecorationSet } {
            return { branded: false, positions: [], decorations: DecorationSet.empty };
          },

          apply(
            tr: Transaction,
            prev: { branded: boolean; positions: number[]; decorations: DecorationSet },
            _oldState: EditorState,
            newState: EditorState
          ) {
            const metaData = tr.getMeta("pageBreakData") as
              | { branded: boolean; positions: number[] }
              | undefined;

            // No new meta — map existing decorations through doc changes
            if (!metaData) {
              if (tr.docChanged && prev.decorations !== DecorationSet.empty) {
                try {
                  return { ...prev, decorations: prev.decorations.map(tr.mapping, newState.doc) };
                } catch {
                  return { ...prev, decorations: DecorationSet.empty };
                }
              }
              return prev;
            }

            // New break data — build fresh DecorationSet
            const { branded, positions } = metaData;
            const spacerTotal = getSpacerBase(branded);
            const docSize = newState.doc.content.size;
            const decorationList: Decoration[] = [];

            const normalizedPositions = Array.from(
              new Set(
                positions
                  .map((p) => Math.max(0, Math.min(docSize, Math.trunc(p))))
                  .sort((a, b) => a - b)
              )
            );

            for (let idx = 0; idx < normalizedPositions.length; idx++) {
              const nodePos = normalizedPositions[idx];
              const node = newState.doc.nodeAt(nodePos);
              if (!node) continue;

              // Always place widget AFTER the block node (block boundary)
              const widgetPos = Math.min(docSize, nodePos + node.nodeSize);

              decorationList.push(
                Decoration.widget(
                  widgetPos,
                  () => {
                    const spacerDiv = document.createElement("div");
                    spacerDiv.className = "page-break-spacer-widget";
                    spacerDiv.setAttribute("data-spacer-height", String(spacerTotal));
                    spacerDiv.setAttribute("data-break-index", String(idx));
                    spacerDiv.style.height = `${spacerTotal}px`;
                    spacerDiv.style.display = "block";
                    spacerDiv.style.pointerEvents = "none";
                    spacerDiv.style.userSelect = "none";
                    spacerDiv.style.lineHeight = "0";
                    spacerDiv.style.fontSize = "0";
                    spacerDiv.style.overflow = "hidden";
                    spacerDiv.style.margin = "0";
                    spacerDiv.style.padding = "0";
                    return spacerDiv;
                  },
                  { side: 1, key: `spacer-${idx}-${widgetPos}` }
                )
              );
            }

            let decoSet = DecorationSet.empty;
            if (decorationList.length > 0) {
              try {
                decoSet = DecorationSet.create(newState.doc, decorationList);
              } catch {
                decoSet = DecorationSet.empty;
              }
            }

            return { branded, positions, decorations: decoSet };
          },
        },

        props: {
          decorations(state: EditorState): DecorationSet {
            const pluginState = spacerPluginKey.getState(state);
            return pluginState?.decorations ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});