/**
 * CSS Custom Highlight API hook
 * Provides non-destructive highlighting for search, AI suggestions,
 * and legal references without modifying the DOM.
 * Falls back gracefully if the API is not supported.
 */
import { useCallback, useRef, useEffect } from "react";

type HighlightCategory = "search" | "ai-suggestion" | "legal-ref" | "error";

const HIGHLIGHT_NAMES: Record<HighlightCategory, string> = {
  search: "editor-search",
  "ai-suggestion": "editor-ai-suggestion",
  "legal-ref": "editor-legal-ref",
  error: "editor-error",
};

// Register CSS once
let cssInjected = false;
function injectHighlightCSS() {
  if (cssInjected || typeof document === "undefined") return;
  cssInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    ::highlight(editor-search) {
      background-color: hsl(48 96% 53% / 0.4);
      color: inherit;
    }
    ::highlight(editor-ai-suggestion) {
      background-color: hsl(262 83% 58% / 0.2);
      text-decoration: underline wavy hsl(262 83% 58% / 0.5);
    }
    ::highlight(editor-legal-ref) {
      background-color: hsl(199 89% 48% / 0.15);
      border-bottom: 2px solid hsl(199 89% 48% / 0.6);
    }
    ::highlight(editor-error) {
      background-color: hsl(0 84% 60% / 0.15);
      text-decoration: underline wavy hsl(0 84% 60% / 0.7);
    }
  `;
  document.head.appendChild(style);
}

function isHighlightAPISupported(): boolean {
  return typeof CSS !== "undefined" && "highlights" in CSS;
}

export function useCustomHighlights(containerRef: React.RefObject<HTMLElement | null>) {
  const highlightsRef = useRef<Map<HighlightCategory, Highlight>>(new Map());

  useEffect(() => {
    injectHighlightCSS();
  }, []);

  const clearHighlights = useCallback((category?: HighlightCategory) => {
    if (!isHighlightAPISupported()) return;

    if (category) {
      const name = HIGHLIGHT_NAMES[category];
      CSS.highlights.delete(name);
      highlightsRef.current.delete(category);
    } else {
      Object.values(HIGHLIGHT_NAMES).forEach((name) => CSS.highlights.delete(name));
      highlightsRef.current.clear();
    }
  }, []);

  const highlightText = useCallback(
    (text: string, category: HighlightCategory) => {
      if (!isHighlightAPISupported() || !containerRef.current || !text) return 0;

      const treeWalker = document.createTreeWalker(containerRef.current, NodeFilter.SHOW_TEXT);
      const ranges: Range[] = [];
      const lowerText = text.toLowerCase();

      let node: Text | null;
      while ((node = treeWalker.nextNode() as Text | null)) {
        const nodeText = node.textContent?.toLowerCase() || "";
        let startIdx = 0;
        while (startIdx < nodeText.length) {
          const idx = nodeText.indexOf(lowerText, startIdx);
          if (idx === -1) break;
          const range = new Range();
          range.setStart(node, idx);
          range.setEnd(node, idx + text.length);
          ranges.push(range);
          startIdx = idx + text.length;
        }
      }

      if (ranges.length > 0) {
        const highlight = new Highlight(...ranges);
        const name = HIGHLIGHT_NAMES[category];
        CSS.highlights.set(name, highlight);
        highlightsRef.current.set(category, highlight);
      }

      return ranges.length;
    },
    [containerRef]
  );

  const highlightRanges = useCallback(
    (ranges: Range[], category: HighlightCategory) => {
      if (!isHighlightAPISupported() || ranges.length === 0) return;

      const highlight = new Highlight(...ranges);
      const name = HIGHLIGHT_NAMES[category];
      CSS.highlights.set(name, highlight);
      highlightsRef.current.set(category, highlight);
    },
    []
  );

  return {
    highlightText,
    highlightRanges,
    clearHighlights,
    isSupported: isHighlightAPISupported(),
  };
}
