import { useCallback, type MutableRefObject } from "react";

interface UseRulerHandlersOptions {
  editor: any;
  rulerSelRef: MutableRefObject<{ from: number; to: number }>;
  setRulerLeftIndent: (v: number) => void;
  setRulerRightIndent: (v: number) => void;
  setRulerFirstLineIndent: (v: number) => void;
}

/**
 * Encapsulates ruler indent change handlers.
 * Selection-aware: with text selected, applies indent to all selected
 * paragraph/heading nodes via batch transactions; without selection,
 * updates the current node and global CSS.
 */
export function useRulerHandlers({
  editor,
  rulerSelRef,
  setRulerLeftIndent,
  setRulerRightIndent,
  setRulerFirstLineIndent,
}: UseRulerHandlersOptions) {
  const applyRulerAttribute = useCallback(
    (attr: string, v: number) => {
      if (!editor) return;
      const { from, to } = rulerSelRef.current;
      const hasSelection = from !== to;
      if (hasSelection) {
        const positions: number[] = [];
        editor.state.doc.nodesBetween(from, to, (node: any, pos: number) => {
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            positions.push(pos);
          }
        });
        let chain = editor.chain();
        for (const pos of positions) {
          chain = chain.command(({ tr }: any) => {
            tr.setNodeAttribute(pos, attr, v);
            return true;
          });
        }
        chain.run();
      } else {
        // Resolve the exact block at the cursor position
        const $pos = editor.state.doc.resolve(from);
        const node = $pos.parent;
        if (node.type.name === "paragraph" || node.type.name === "heading") {
          const nodePos = $pos.before($pos.depth);
          editor.chain().command(({ tr }: any) => {
            tr.setNodeAttribute(nodePos, attr, v);
            return true;
          }).run();
        }
      }
    },
    [editor, rulerSelRef]
  );

  const onLeftIndentChange = useCallback(
    (v: number) => {
      setRulerLeftIndent(v);
      applyRulerAttribute("indent", v);
    },
    [setRulerLeftIndent, applyRulerAttribute]
  );

  const onRightIndentChange = useCallback(
    (v: number) => {
      setRulerRightIndent(v);
      applyRulerAttribute("marginRight", v);
    },
    [setRulerRightIndent, applyRulerAttribute]
  );

  const onFirstLineIndentChange = useCallback(
    (v: number) => {
      setRulerFirstLineIndent(v);
      applyRulerAttribute("textIndent", v);
    },
    [setRulerFirstLineIndent, applyRulerAttribute]
  );

  return { onLeftIndentChange, onRightIndentChange, onFirstLineIndentChange };
}
