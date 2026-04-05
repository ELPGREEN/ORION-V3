import { useState, useEffect } from "react";
import { Brain, Sparkles, Loader2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { neuralSearch, type NeuralSearchResult } from "@/lib/api";

interface NeuralEnhancementPanelProps {
  query: string;
  isSearching: boolean;
  onSearchComplete?: (results: NeuralSearchResult[]) => void;
}

export function NeuralEnhancementPanel({ 
  query, 
  isSearching,
  onSearchComplete 
}: NeuralEnhancementPanelProps) {
  const [neuralResults, setNeuralResults] = useState<NeuralSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [searched, setSearched] = useState(false);
  const [timings, setTimings] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isSearching && query.trim().length > 5) {
      searchNeural();
    }
  }, [isSearching, query]);

  const searchNeural = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setNeuralResults([]);

    try {
      const startTime = performance.now();
      const response = await neuralSearch(query.trim(), {
        mode: "search_and_index",
        hybrid: true,
        rerank: true,
        expandQueries: true,
        matchCount: 8,
        matchThreshold: 0.3,
      });

      const endTime = performance.now();
      setTimings({ total: Math.round(endTime - startTime), ...response.timings });
      setNeuralResults(response.results || []);
      setSearched(true);
      onSearchComplete?.(response.results || []);
    } catch (err) {
      setNeuralResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (!searched && !loading && !isSearching) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Rede Neural RAG</span>
              {loading && (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              )}
              {!loading && neuralResults.length > 0 && (
                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                  +{neuralResults.length} resultados
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {loading ? "Buscando em embeddings semânticos..." : 
               neuralResults.length > 0 ? `Encontrados em ${timings.total || 0}ms` : 
               "Nenhum resultado neural adicional"}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Results */}
      {expanded && neuralResults.length > 0 && (
        <div className="px-4 pb-4 space-y-3">
          {/* Pipeline info */}
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Pipeline: Embedding → Hybrid Search → Rerank → Authority Score</span>
          </div>

          {/* Results grid */}
          <div className="grid gap-2">
            {neuralResults.slice(0, 5).map((result, idx) => (
              <div
                key={result.id || idx}
                className="bg-card border border-border p-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 border-primary/30 text-primary">
                      {result.source_label}
                    </Badge>
                    {result.combined_score && (
                      <span className="text-[9px] text-muted-foreground">
                        Score: {(result.combined_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {result.published_date && (
                    <span className="text-[9px] text-muted-foreground">
                      {result.published_date}
                    </span>
                  )}
                </div>
                
                <h4 className="text-sm font-medium text-foreground line-clamp-1 mb-1">
                  {result.title}
                </h4>
                
                <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">
                  {result.content?.substring(0, 200)}...
                </p>

                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Ver fonte original
                  </a>
                )}
              </div>
            ))}
          </div>

          {neuralResults.length > 5 && (
            <p className="text-[10px] text-muted-foreground text-center">
              +{neuralResults.length - 5} resultados adicionais na base neural
            </p>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-center gap-3 py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Processando embeddings semânticos...
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && neuralResults.length === 0 && expanded && (
        <div className="px-4 pb-4">
          <p className="text-[11px] text-muted-foreground text-center py-4">
            Nenhum documento indexado encontrado para esta consulta.
            Os resultados tradicionais ainda estão disponíveis acima.
          </p>
        </div>
      )}
    </div>
  );
}
