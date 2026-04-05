import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface AIGhostTextProps {
  suggestion: string | null;
  loading: boolean;
  editorElement: HTMLElement | null;
  onAccept: () => void;
  onDismiss: () => void;
}

export function AIGhostText({ suggestion, loading, editorElement, onAccept, onDismiss }: AIGhostTextProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!editorElement || (!suggestion && !loading)) {
      setPosition(null);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setPosition(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorElement.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      // Cursor without selection — use cursor position
      const cursorRect = range.getClientRects()[0];
      if (cursorRect) {
        setPosition({
          top: cursorRect.bottom - editorRect.top + 4,
          left: cursorRect.left - editorRect.left,
        });
      }
    } else {
      setPosition({
        top: rect.bottom - editorRect.top + 4,
        left: rect.right - editorRect.left,
      });
    }
  }, [suggestion, loading, editorElement]);

  useEffect(() => {
    if (!suggestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        onAccept();
      } else if (e.key === "Escape") {
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [suggestion, onAccept, onDismiss]);

  if (!position || (!suggestion && !loading)) return null;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{ top: position.top, left: Math.min(position.left, 500) }}
    >
      {loading && !suggestion && (
        <span className="inline-flex items-center gap-1 text-muted-foreground/40 text-[11px]">
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
        </span>
      )}
      {suggestion && (
        <div className="pointer-events-auto flex items-start gap-1.5 max-w-[400px]">
          <span className="text-muted-foreground/40 text-[11px] leading-relaxed italic">
            {suggestion}
          </span>
          <span className="shrink-0 flex items-center gap-0.5 bg-primary/10 text-primary text-[8px] px-1 py-0.5 rounded font-medium mt-0.5">
            <Sparkles className="h-2 w-2" />Tab
          </span>
        </div>
      )}
    </div>
  );
}
