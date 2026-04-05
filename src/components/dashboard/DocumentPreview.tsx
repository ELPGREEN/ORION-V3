import { useState, useEffect, useCallback, useRef } from "react";
import { Eye, Loader2, RefreshCw, Maximize, Minimize, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePrintPreviewURL } from "@/lib/generators";

interface DocumentPreviewProps {
  content: string;
  watermark: string;
  includeStamp?: boolean;
  documentType?: string;
  forceLetterhead?: boolean;
  customMarginTop?: number;
  customMarginBottom?: number;
  compact?: boolean;
  prepareContent?: (content: string) => string;
}

export function DocumentPreview({ content, watermark, documentType, forceLetterhead, customMarginTop, customMarginBottom, compact, prepareContent }: DocumentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const prevUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController>();

  const generatePreview = useCallback(async () => {
    if (!content || !content.replace(/<[^>]*>/g, "").trim()) {
      setError("Sem conteúdo para visualizar");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const contentForPreview = prepareContent ? prepareContent(content) : content;
      const url = await generatePrintPreviewURL({
        content: contentForPreview,
        watermark,
        documentType,
        forceLetterhead,
        customMarginTop,
        customMarginBottom,
      });
      if (controller.signal.aborted) return;
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = url;
      setPreviewUrl(url);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("Preview error:", err);
      setError(`Erro: ${err instanceof Error ? err.message : "Falha ao gerar preview"}`);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [content, prepareContent, watermark, documentType, forceLetterhead, customMarginTop, customMarginBottom]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(generatePreview, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [generatePreview]);

  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  // ESC to exit fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen]);

  const previewIframe = previewUrl ? (
    <iframe
      src={previewUrl}
      className="w-full h-full border-0"
      title="Document Preview"
      style={{ overflow: "auto" }}
    />
  ) : null;

  const toolbar = (
    <div className={`flex items-center justify-between border-b border-border shrink-0 ${compact ? "px-2 py-1" : "px-3 py-1.5"}`}>
      <span className={`font-medium text-muted-foreground flex items-center gap-1.5 ${compact ? "text-[10px]" : "text-xs"}`}>
        <Eye className="h-3 w-3" />
        {compact ? "Preview PDF" : "Pré-visualização PDF"}
        {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={generatePreview}
          disabled={loading}
          title="Atualizar preview"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setFullscreen(!fullscreen)}
          title={fullscreen ? "Sair da tela cheia" : "Tela cheia"}
        >
          {fullscreen ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );

  const placeholderContent = (
    <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground gap-3">
      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerando PDF...
        </div>
      ) : error ? (
        <>
          <p className="text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="text-xs" onClick={generatePreview}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Tentar novamente
          </Button>
        </>
      ) : (
        <>
          <p>Clique para gerar a pré-visualização</p>
          <Button variant="outline" size="sm" className="text-xs" onClick={generatePreview}>
            <Eye className="h-3 w-3 mr-1" />
            Gerar Preview
          </Button>
        </>
      )}
    </div>
  );

  // Fullscreen overlay
  if (fullscreen) {
    return (
      <>
        {/* Inline placeholder when fullscreen */}
        <div className={compact ? "bg-card flex flex-col h-full" : "border border-border bg-card"}>
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground p-4">
            Preview em tela cheia. Pressione ESC para voltar.
          </div>
        </div>
        {/* Fullscreen portal */}
        <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Pré-visualização PDF
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={generatePreview} disabled={loading} title="Atualizar">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreen(false)} title="Fechar (ESC)">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {previewIframe || placeholderContent}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={compact ? "bg-card flex flex-col h-full" : "border border-border bg-card"}>
      {toolbar}
      <div className={compact ? "flex-1 min-h-0 overflow-auto" : "h-[500px] overflow-auto"}>
        {previewIframe || placeholderContent}
      </div>
    </div>
  );
}
