import { useState, useEffect, useRef, useCallback } from "react";
import { GripVertical, Plus } from "lucide-react";

interface BlockHandleProps {
  editor: any;
  onPlusClick?: (pos: number) => void;
}

function getEditorView(editor: any) {
  try {
    return editor?.view ?? null;
  } catch {
    return null;
  }
}

export function BlockHandle({ editor, onPlusClick }: BlockHandleProps) {
  const [visible, setVisible] = useState(false);
  const [top, setTop] = useState(0);
  const [nodePos, setNodePos] = useState(0);
  const handleRef = useRef<HTMLDivElement>(null);
  const editorView = getEditorView(editor);
  const editorDom = editorView?.dom as HTMLElement | undefined;

  const updatePosition = useCallback(
    (e: MouseEvent) => {
      const view = getEditorView(editor);
      if (!view) return;
      const editorRect = view.dom.getBoundingClientRect();
      const pos = view.posAtCoords({ left: editorRect.left + 10, top: e.clientY });
      if (!pos) {
        setVisible(false);
        return;
      }

      try {
        const resolved = view.state.doc.resolve(pos.pos);
        // Get the top-level node (depth 1)
        const depth = Math.min(resolved.depth, 1);
        const nodeStart = resolved.before(depth + 1);
        const dom = view.nodeDOM(nodeStart);
        if (!dom || !(dom instanceof HTMLElement)) {
          setVisible(false);
          return;
        }

        const domRect = dom.getBoundingClientRect();
        const parentRect = view.dom.parentElement?.getBoundingClientRect() || editorRect;

        setTop(domRect.top - parentRect.top + (view.dom.parentElement?.scrollTop || 0));
        setNodePos(nodeStart);
        setVisible(true);
      } catch {
        setVisible(false);
      }
    },
    [editor]
  );

  useEffect(() => {
    if (!editorDom) return;
    const parent = editorDom.parentElement;
    if (!parent) return;

    const onMove = (e: MouseEvent) => updatePosition(e);
    const onLeave = () => setVisible(false);

    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);
    return () => {
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
    };
  }, [editorDom, updatePosition]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      const view = getEditorView(editor);
      if (!view) return;
      // Select the node for drag
      view.dispatch(
        view.state.tr.setSelection(
          editor.state.selection.constructor.create(view.state.doc, nodePos)
        )
      );
      // Set drag data
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
    },
    [editor, nodePos]
  );

  if (!visible) return null;

  return (
    <div
      ref={handleRef}
      className="block-handle absolute flex items-center gap-0.5 opacity-0 group-hover/canvas:opacity-100 transition-opacity z-10"
      style={{ top: `${top}px`, left: "-40px" }}
      contentEditable={false}
    >
      <button
        type="button"
        className="flex items-center justify-center h-6 w-6 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => {
          if (onPlusClick) {
            onPlusClick(nodePos);
          } else {
            // Insert a new paragraph and open slash menu
            editor
              .chain()
              .focus()
              .insertContentAt(nodePos, { type: "paragraph", content: [{ type: "text", text: "/" }] })
              .run();
          }
        }}
        title="Adicionar bloco"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="flex items-center justify-center h-6 w-6 rounded hover:bg-accent text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
        draggable
        onDragStart={handleDragStart}
        title="Arrastar para reordenar"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
