import { ExternalLink, BookOpen, Users, Copy, Scale, FileText, MapPin, Calendar, Hash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SourceBadge, TypeBadge } from "./SourceBadge";
import { useToast } from "@/hooks/use-toast";
import type { SearchResult } from "@/lib/api";

function addPesquisaContext(item: { title: string; source: string; sourceLabel: string; description: string; url?: string }) {
  const raw = sessionStorage.getItem("pesquisa_contexts");
  const arr = raw ? JSON.parse(raw) : [];
  arr.push(item);
  sessionStorage.setItem("pesquisa_contexts", JSON.stringify(arr));
  return arr.length;
}

interface Props {
  result: SearchResult;
}

export function SearchResultCard({ result }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCopy = () => {
    const text = `${result.title}\n${result.description}\nFonte: ${result.sourceLabel}${result.url ? `\nURL: ${result.url}` : ''}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Resultado copiado para a área de transferência." });
  };

  const isFallback = !!(result.metadata as any)?.fallback;

  // Validate URL before displaying "Abrir fonte" button
  const isValidUrl = (url?: string): boolean => {
    if (!url || url.trim() === '') return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const hasValidUrl = isValidUrl(result.url);

  return (
    <div className="bg-card border border-border p-4 hover:border-primary/30 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge source={result.source as any} />
          <TypeBadge type={result.type} />
          {result.date && (
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {result.date}
            </span>
          )}
          {isFallback && (
            <span className="text-[9px] px-1.5 py-0.5 border border-accent/30 bg-accent/10 text-accent-foreground tracking-wider">
              PORTAL
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-foreground mb-1.5 leading-snug">
        {result.title}
      </h3>

      {/* Description */}
      {result.description && (
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          {result.description}
        </p>
      )}

      {/* Detailed Metadata */}
      {result.metadata && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
          {result.metadata.authors && Array.isArray(result.metadata.authors) && (result.metadata.authors as string[]).length > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3 flex-shrink-0" />
              {(result.metadata.authors as string[]).join(', ')}
            </span>
          )}
          {result.metadata.court && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Scale className="h-3 w-3 flex-shrink-0" />
              {result.metadata.court as string}
            </span>
          )}
          {result.metadata.relator && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3 flex-shrink-0" />
              Rel. {result.metadata.relator as string}
            </span>
          )}
          {result.metadata.classe && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3 flex-shrink-0" />
              {result.metadata.classe as string}
            </span>
          )}
          {result.metadata.docketNumber && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3 flex-shrink-0" />
              {result.metadata.docketNumber as string}
            </span>
          )}
          {result.metadata.citation && Array.isArray(result.metadata.citation) && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <BookOpen className="h-3 w-3 flex-shrink-0" />
              {(result.metadata.citation as string[]).join(', ')}
            </span>
          )}
          {result.metadata.publisher && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3 flex-shrink-0" />
              {result.metadata.publisher as string}
            </span>
          )}
          {result.metadata.pageCount && (
            <span className="text-[10px] text-muted-foreground">
              {result.metadata.pageCount as number} págs.
            </span>
          )}
          {result.metadata.siglaTipo && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3 flex-shrink-0" />
              {result.metadata.siglaTipo as string} {result.metadata.numero as string}/{result.metadata.ano as number}
            </span>
          )}
          {result.metadata.portais && Array.isArray(result.metadata.portais) && (
            <div className="w-full flex flex-wrap gap-2 mt-1">
              {(result.metadata.portais as string[]).map((portal, i) => (
                <a
                  key={i}
                  href={portal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-primary hover:underline flex items-center gap-0.5"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  {portal.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions — always visible */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        {hasValidUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] h-7 text-primary hover:text-primary/80 hover:bg-primary/10"
            onClick={() => window.open(result.url, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            {isFallback ? 'Acessar portal' : 'Abrir fonte'}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] h-7 text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copiar
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-7 text-primary/70 hover:text-primary hover:bg-primary/5"
                onClick={() => {
                  const count = addPesquisaContext({
                    title: result.title,
                    source: result.source,
                    sourceLabel: result.sourceLabel,
                    description: (result.description || "").substring(0, 500),
                    url: result.url,
                  });
                  toast({
                    title: `Fundamentação adicionada (${count})`,
                    description: "Adicione mais resultados ou vá ao gerador de documentos.",
                    action: (
                      <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => navigate("/dashboard/gerar-documento")}>
                        Ir ao gerador
                      </Button>
                    ),
                  });
                }}
              >
                <Scale className="h-3 w-3 mr-1" />
                Fundamentar documento
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Envia este resultado como fundamentação para o gerador de documentos jurídicos</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {hasValidUrl && (
          <span className="text-[8px] text-muted-foreground/50 ml-auto truncate max-w-[200px]" title={result.url}>
            {result.url}
          </span>
        )}
      </div>
    </div>
  );
}
