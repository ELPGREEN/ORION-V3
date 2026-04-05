import { useState, useCallback } from "react";
import type { Suggestion } from "@/components/dashboard/editor/types";

export function useEditorSuggestions(
  editorRef: React.MutableRefObject<any>,
  saveSnapshot: () => void,
  toast: (opts: any) => void,
) {
  const [editorSuggestions, setEditorSuggestions] = useState<Suggestion[]>([]);

  /** Find a suggestion mark's live range in the editor */
  const findSuggestionRange = useCallback((editor: any, suggestionId: string): { from: number; to: number } | null => {
    if (!editor) return null;
    try {
      const markType = editor.schema.marks.suggestion;
      if (!markType) return null;
      let found: { from: number; to: number } | null = null;
      editor.state.doc.descendants((node: any, pos: number) => {
        if (found) return false;
        node.marks.forEach((mark: any) => {
          if (mark.type.name === "suggestion" && mark.attrs.suggestionId === suggestionId) {
            found = { from: pos, to: pos + node.nodeSize };
          }
        });
      });
      return found;
    } catch { return null; }
  }, []);

  /** Remove a SINGLE suggestion mark by ID */
  const removeSuggestionMark = useCallback((editor: any, suggestionId: string) => {
    if (!editor) return;
    try {
      const markType = editor.schema.marks.suggestion;
      if (!markType) return;
      const ranges: { from: number; to: number }[] = [];
      editor.state.doc.descendants((node: any, pos: number) => {
        node.marks.forEach((mark: any) => {
          if (mark.type.name === "suggestion" && mark.attrs.suggestionId === suggestionId) {
            ranges.push({ from: pos, to: pos + node.nodeSize });
          }
        });
      });
      if (ranges.length === 0) return;
      const tr = editor.state.tr;
      for (let i = ranges.length - 1; i >= 0; i--) {
        tr.removeMark(ranges[i].from, ranges[i].to, markType);
      }
      if (tr.docChanged) editor.view.dispatch(tr);
    } catch { /* editor view not ready */ }
  }, []);

  /** Remove ALL suggestion marks from entire document */
  const clearAllSuggestionMarks = useCallback((editor: any) => {
    if (!editor) return;
    try {
      const markType = editor.schema.marks.suggestion;
      if (!markType) return;
      const ranges: { from: number; to: number }[] = [];
      editor.state.doc.descendants((node: any, pos: number) => {
        node.marks.forEach((mark: any) => {
          if (mark.type.name === "suggestion") {
            ranges.push({ from: pos, to: pos + node.nodeSize });
          }
        });
      });
      if (ranges.length === 0) return;
      const tr = editor.state.tr;
      for (let i = ranges.length - 1; i >= 0; i--) {
        tr.removeMark(ranges[i].from, ranges[i].to, markType);
      }
      if (tr.docChanged) editor.view.dispatch(tr);
      editor.view.dispatch(editor.state.tr.setStoredMarks([]));
    } catch { /* editor view not ready */ }
  }, []);

  const handleAcceptSuggestion = useCallback((id: string) => {
    const editor = editorRef.current;
    const suggestion = editorSuggestions.find(s => s.id === id);
    if (!editor || !suggestion) return;
    saveSnapshot();
    try {
      // Find the live range BEFORE removing the mark (removing shifts positions)
      const range = findSuggestionRange(editor, id) || { from: suggestion.from, to: suggestion.to };
      let insertText = suggestion.suggestedText;
      const outerPMatch = insertText.match(/^\s*<p[^>]*>([\s\S]*)<\/p>\s*$/i);
      if (outerPMatch) insertText = outerPMatch[1];
      // Use a single chain: select range, delete, insert — the mark is replaced naturally
      editor.view.dispatch(editor.state.tr.setStoredMarks([]));
      editor.chain().focus().setTextSelection(range).deleteSelection().insertContent(insertText).run();
      // Clean up any remaining mark fragments
      queueMicrotask(() => {
        try {
          removeSuggestionMark(editor, id);
          editor.view.dispatch(editor.state.tr.setStoredMarks([]));
        } catch { /* */ }
      });
    } catch (err) { console.warn("[Suggestion] Accept failed:", err); }
    setEditorSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: "accepted" } : s));
    toast({ title: "Sugestão aceita" });
  }, [editorRef, editorSuggestions, saveSnapshot, findSuggestionRange, removeSuggestionMark, toast]);

  const handleRejectSuggestion = useCallback((id: string) => {
    const editor = editorRef.current;
    if (editor) removeSuggestionMark(editor, id);
    setEditorSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: "rejected" } : s));
    toast({ title: "Sugestão rejeitada" });
  }, [editorRef, removeSuggestionMark, toast]);

  const handleAcceptAllSuggestions = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    saveSnapshot();
    const pending = editorSuggestions.filter(s => s.status === "pending");
    const sorted = [...pending].sort((a, b) => b.from - a.from);
    for (const s of sorted) {
      try {
        const range = findSuggestionRange(editor, s.id) || { from: s.from, to: s.to };
        let insertText = s.suggestedText;
        const outerPMatch = insertText.match(/^\s*<p[^>]*>([\s\S]*)<\/p>\s*$/i);
        if (outerPMatch) insertText = outerPMatch[1];
        removeSuggestionMark(editor, s.id);
        editor.chain().focus().setTextSelection(range).deleteSelection().insertContent(insertText).run();
      } catch (err) { console.warn("[Suggestion] Accept all - failed for:", s.id, err); }
    }
    try { editor.view.dispatch(editor.state.tr.setStoredMarks([])); } catch { /* */ }
    setEditorSuggestions(prev => prev.map(s => s.status === "pending" ? { ...s, status: "accepted" } : s));
    toast({ title: "Todas as sugestões aceitas" });
  }, [editorRef, editorSuggestions, saveSnapshot, findSuggestionRange, removeSuggestionMark, toast]);

  const handleRejectAllSuggestions = useCallback(() => {
    const editor = editorRef.current;
    if (editor) clearAllSuggestionMarks(editor);
    setEditorSuggestions(prev => prev.map(s => s.status === "pending" ? { ...s, status: "rejected" } : s));
    toast({ title: "Todas as sugestões rejeitadas" });
  }, [editorRef, clearAllSuggestionMarks, toast]);

  return {
    editorSuggestions, setEditorSuggestions,
    clearAllSuggestionMarks,
    handleAcceptSuggestion, handleRejectSuggestion,
    handleAcceptAllSuggestions, handleRejectAllSuggestions,
  };
}
