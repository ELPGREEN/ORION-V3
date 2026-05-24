import { useState, useEffect, useRef } from "react";
import { X, ChevronUp, ChevronDown, Replace, ReplaceAll, CaseSensitive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Editor } from "@tiptap/react";
import { useCustomHighlights } from "@/hooks/useCustomHighlights";
import {
  setSearchTerm,
  setReplaceTerm,
  setCaseSensitive as setCaseSensitiveCmd,
  goToNextResult,
  goToPrevResult,
  replaceCurrent,
  replaceAll,
  clearSearch,
  type SearchAndReplaceStorage,
} from "./SearchAndReplace";

interface FindReplaceBarProps {
  editor: Editor;
  onClose: () => void;
}

export function FindReplaceBar({ editor, onClose }: FindReplaceBarProps) {
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCS] = useState(false);
  const [, forceUpdate] = useState(0);

  // Get the editor DOM element for Custom Highlight API
  const editorContainerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    try {
      const view = editor?.view;
      if (view?.dom) editorContainerRef.current = view.dom;
    } catch { /* editor not mounted yet */ }
  }, [editor]);

  const { highlightText, clearHighlights, isSupported } = useCustomHighlights(editorContainerRef);

  const storage = (editor.storage as any).searchAndReplace as SearchAndReplaceStorage | undefined;
  const resultCount = storage?.results?.length ?? 0;
  const currentIndex = storage?.currentIndex ?? -1;

  const handleSearch = (term: string) => {
    setSearch(term);
    setSearchTerm(editor, term);
    // Also use native Custom Highlight API for visual overlay
    if (isSupported) {
      clearHighlights("search");
      if (term.length > 0) highlightText(term, "search");
    }
    forceUpdate((n) => n + 1);
  };

  const handleToggleCase = () => {
    const next = !caseSensitive;
    setCS(next);
    setCaseSensitiveCmd(editor, next);
    forceUpdate((n) => n + 1);
  };

  const handleNext = () => { goToNextResult(editor); forceUpdate((n) => n + 1); };
  const handlePrev = () => { goToPrevResult(editor); forceUpdate((n) => n + 1); };
  const handleReplace = () => { replaceCurrent(editor); clearHighlights("search"); if (search) highlightText(search, "search"); forceUpdate((n) => n + 1); };
  const handleReplaceAll = () => { replaceAll(editor); clearHighlights("search"); forceUpdate((n) => n + 1); };

  const handleClose = () => {
    clearSearch(editor);
    clearHighlights("search");
    onClose();
  };

  useEffect(() => {
    return () => { clearSearch(editor); clearHighlights("search"); };
  }, [editor, clearHighlights]);

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-secondary/50 border-b border-border text-xs">
      <div className="relative flex-1 min-w-[140px] max-w-[220px]">
        <Input
          className="h-7 text-xs pr-12"
          placeholder="Buscar..."
          aria-label="Termo para buscar"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.shiftKey) handlePrev();
              else handleNext();
            }
            if (e.key === "Escape") handleClose();
          }}
        />
        {resultCount > 0 && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
            {currentIndex + 1}/{resultCount}
          </span>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handlePrev}
        disabled={resultCount === 0}
        title="Anterior"
        aria-label="Ir para o resultado anterior"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleNext}
        disabled={resultCount === 0}
        title="Próximo"
        aria-label="Ir para o próximo resultado"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-7 w-7 ${caseSensitive ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
        onClick={handleToggleCase}
        title="Diferenciar maiúsculas"
        aria-label="Diferenciar maiúsculas e minúsculas"
      >
        <CaseSensitive className="h-3.5 w-3.5" />
      </Button>

      <span className="w-px h-5 bg-border" />

      <Input
        className="h-7 text-xs flex-1 min-w-[120px] max-w-[200px]"
        placeholder="Substituir por..."
        aria-label="Termo para substituir"
        value={replace}
        onChange={(e) => {
          setReplace(e.target.value);
          setReplaceTerm(editor, e.target.value);
        }}
        onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
      />

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleReplace}
        disabled={resultCount === 0}
        title="Substituir"
        aria-label="Substituir ocorrência atual"
      >
        <Replace className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleReplaceAll}
        disabled={resultCount === 0}
        title="Substituir todos"
        aria-label="Substituir todas as ocorrências"
      >
        <ReplaceAll className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 ml-auto"
        onClick={handleClose}
        title="Fechar"
        aria-label="Fechar barra de busca"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
