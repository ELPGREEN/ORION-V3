import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Brain, ExternalLink, BookOpen, Sparkles, TrendingUp, History, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SearchResultItem {
  id: string;
  title: string;
  content: string;
  source_type: string;
  source_reference: string | null;
  tags: string[];
  semantic_score?: number;
  keyword_score?: number;
  combined_score?: number;
}

interface QueryHistoryEntry {
  query: string;
  resultCount: number;
  topResults: string[]; // top 3 result titles for context
}

export function NeuralSemanticSearch() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<"vector" | "text">("vector");
  
  // Fase 9.1: Conversational search state
  const [queryHistory, setQueryHistory] = useState<QueryHistoryEntry[]>([]);
  const [useContext, setUseContext] = useState(false);

  function buildPreviousContext(): string | undefined {
    if (!useContext || queryHistory.length === 0) return undefined;
    const last = queryHistory[queryHistory.length - 1];
    return `Query anterior: "${last.query}" (${last.resultCount} resultados). Resultados principais: ${last.topResults.join("; ")}`;
  }

  async function handleVectorSearch() {
    if (!query.trim()) return;

    setSearching(true);
    try {
      const previousContext = buildPreviousContext();
      
      const safeQuery = query.trim().length > 3500 ? query.trim().substring(0, 3500) : query.trim();
      const { data, error } = await supabase.functions.invoke("neural-search", {
        body: {
          query: safeQuery,
          mode: "neural_knowledge",
          matchCount: 20,
          previousContext,
        },
      });

      if (error) throw error;

      const neuralResults: SearchResultItem[] = (data?.neuralResults || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        source_type: item.source_type || "legislacao",
        source_reference: item.source_reference || null,
        tags: item.tags || [],
        semantic_score: item.semantic_score,
        keyword_score: item.keyword_score,
        combined_score: item.combined_score,
      }));

      if (neuralResults.length > 0) {
        setResults(neuralResults);
        // Track query history for conversational context
        setQueryHistory(prev => [...prev.slice(-4), {
          query: query.trim(),
          resultCount: neuralResults.length,
          topResults: neuralResults.slice(0, 3).map(r => r.title),
        }]);
        setUseContext(true); // Auto-enable context for follow-ups
        toast({ title: `${neuralResults.length} resultados via busca vetorial${previousContext ? " (contextual)" : ""}` });
      } else {
        await handleTextSearch();
      }
    } catch (error: any) {
      await handleTextSearch();
    } finally {
      setSearching(false);
    }
  }

  async function handleTextSearch() {
    try {
      const keywords = query.split(/\s+/).filter(w => w.length > 2).slice(0, 6);

      const { data, error } = await supabase
        .from("neural_knowledge_base")
        .select("id, title, content, source_type, source_reference, tags")
        .eq("is_processed", true)
        .textSearch("content", keywords.join(" & "), {
          type: "plain",
          config: "portuguese",
        })
        .limit(20);

      if (error) throw error;

      let resultList = (data || []).map((item: any) => ({
        ...item,
        tags: item.tags || [],
      }));

      if (!resultList.length) {
        const { data: fallback } = await supabase
          .from("neural_knowledge_base")
          .select("id, title, content, source_type, source_reference, tags")
          .eq("is_processed", true)
          .or(keywords.map(k => `title.ilike.%${k}%`).join(","))
          .limit(20);

        resultList = (fallback || []).map((item: any) => ({
          ...item,
          tags: item.tags || [],
        }));
      }

      setResults(resultList);
      // Track for conversational context
      if (resultList.length > 0) {
        setQueryHistory(prev => [...prev.slice(-4), {
          query: query.trim(),
          resultCount: resultList.length,
          topResults: resultList.slice(0, 3).map((r: any) => r.title),
        }]);
        setUseContext(true);
      }
      toast({ title: `${resultList.length} resultados encontrados (busca textual)` });
    } catch (error) {
      toast({ title: "Erro na busca", variant: "destructive" });
    }
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      if (searchMode === "vector") {
        await handleVectorSearch();
      } else {
        await handleTextSearch();
        setSearching(false);
      }
    } catch {
      setSearching(false);
    }
  }

  function handleRefineFromHistory(entry: QueryHistoryEntry) {
    setQuery("");
    setUseContext(true);
    toast({ title: "Contexto ativado", description: `Refine a busca "${entry.query}"` });
  }

  function clearHistory() {
    setQueryHistory([]);
    setUseContext(false);
  }

  const sourceTypeLabels: Record<string, string> = {
    jurisprudencia: "Jurisprudência",
    doutrina: "Doutrina",
    legislacao: "Legislação",
    legislacao_federal: "Legislação Federal",
    modelo_documento: "Modelo Documento",
    catalogo_senado: "Catálogo Senado",
    custom: "Personalizado",
    datajud: "DataJud",
    lexml: "LexML",
  };

  const sourceTypeColors: Record<string, string> = {
    jurisprudencia: "border-blue-500/30 text-blue-400",
    legislacao: "border-green-500/30 text-green-400",
    legislacao_federal: "border-green-500/30 text-green-400",
    doutrina: "border-purple-500/30 text-purple-400",
    catalogo_senado: "border-yellow-500/30 text-yellow-400",
    modelo_documento: "border-orange-500/30 text-orange-400",
  };

  function formatScore(score?: number): string {
    if (score === undefined || score === null) return "";
    return `${(score * 100).toFixed(0)}%`;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Busca Semântica na Base Neural
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Pesquise usando embeddings vetoriais para encontrar resultados por relevância semântica
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button
                variant={searchMode === "vector" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchMode("vector")}
                className="text-[10px] h-7 px-2"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Vetorial
              </Button>
              <Button
                variant={searchMode === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setSearchMode("text")}
                className="text-[10px] h-7 px-2"
              >
                <Search className="h-3 w-3 mr-1" />
                Texto
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder={useContext && queryHistory.length > 0
                ? `Refinar: "${queryHistory[queryHistory.length - 1].query}" → digite follow-up...`
                : "Ex: danos morais consumidor, reforma trabalhista, LGPD..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="bg-background border-border"
            />
            <Button onClick={handleSearch} disabled={searching} className="btn-gold shrink-0">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {searchMode === "vector" && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Busca por similaridade semântica (v11 Quantum Deep Learning)
              </p>
            )}
            {useContext && queryHistory.length > 0 && (
              <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                <RefreshCw className="h-2.5 w-2.5 mr-1" />
                Contexto conversacional ativo
              </Badge>
            )}
          </div>

          {/* Query History (Fase 9.1) */}
          {queryHistory.length > 0 && (
            <div className="mt-3 p-2 bg-muted/30 border border-border/50 rounded">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <History className="h-3 w-3" />
                  Histórico de buscas ({queryHistory.length})
                </span>
                <Button variant="ghost" size="sm" className="h-5 text-[9px] text-muted-foreground" onClick={clearHistory}>
                  Limpar
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {queryHistory.map((entry, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRefineFromHistory(entry)}
                    className="text-[9px] px-2 py-0.5 bg-background border border-border rounded hover:border-primary/50 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    "{entry.query}" ({entry.resultCount})
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {results.length} resultado{results.length !== 1 ? "s" : ""} encontrado{results.length !== 1 ? "s" : ""}
              {results[0]?.combined_score !== undefined && (
                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  Busca Vetorial
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-background border border-border rounded-lg hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                      <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.combined_score !== undefined && (
                        <Badge variant="outline" className="text-[9px] border-primary/20 text-primary">
                          <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                          {formatScore(item.combined_score)}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${sourceTypeColors[item.source_type] || ""}`}
                      >
                        {sourceTypeLabels[item.source_type] || item.source_type}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 mt-1">
                    {item.content.substring(0, 300)}
                    {item.content.length > 300 ? "..." : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {item.semantic_score !== undefined && (
                      <span className="text-[9px] text-muted-foreground">
                        Semântico: {formatScore(item.semantic_score)} | Keyword: {formatScore(item.keyword_score)}
                      </span>
                    )}
                    {item.tags?.slice(0, 5).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[8px]">
                        {tag}
                      </Badge>
                    ))}
                    {item.source_reference && (
                      <a
                        href={item.source_reference}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Fonte
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
