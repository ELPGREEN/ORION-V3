import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Search, Sparkles, BarChart3 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface AttentionHead {
  name: string;
  weight: number;
  description: string;
}

interface AttentionResult {
  id: string;
  title: string;
  multi_head_score: number;
  attention_heads: Record<string, number>;
  source: string;
  rerank_position?: number;
}

interface AttentionWeights {
  heads: AttentionHead[];
  version: string;
}

const headLabels: Record<string, string> = {
  semantic: "Semântico",
  keyword: "Keyword",
  authority: "Autoridade",
  recency: "Recência",
  jurisdiction: "Jurisdição",
  depth: "Profundidade",
};

const headColors: Record<string, string> = {
  semantic: "bg-blue-500",
  keyword: "bg-green-500",
  authority: "bg-yellow-500",
  recency: "bg-purple-500",
  jurisdiction: "bg-orange-500",
  depth: "bg-pink-500",
};

function HeatCell({ value, headName }: { value: number; headName: string }) {
  const intensity = Math.round(value * 100);
  const bgOpacity = Math.max(0.1, value);
  const colorClass = headColors[headName] || "bg-primary";

  return (
    <div
      className="relative w-full h-8 rounded flex items-center justify-center text-[9px] font-mono font-bold transition-all"
      style={{
        backgroundColor: `hsl(var(--primary) / ${bgOpacity * 0.6})`,
      }}
      title={`${headLabels[headName] || headName}: ${intensity}%`}
    >
      <span className="text-foreground">{intensity}%</span>
    </div>
  );
}

export function AttentionHeatmap() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AttentionResult[]>([]);
  const [weights, setWeights] = useState<AttentionWeights | null>(null);

  async function runAttentionSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("neural-search", {
        body: {
          query: query.trim(),
          mode: "search",
          matchCount: 8,
          includeAttentionData: true,
          rerank: false,
        },
      });

      if (error) throw error;

      const attentionResults: AttentionResult[] = (data?.results || [])
        .filter((r: any) => r.attention_heads)
        .map((r: any) => ({
          id: r.id,
          title: r.title,
          multi_head_score: r.multi_head_score || r.combined_score || 0,
          attention_heads: r.attention_heads || {},
          source: r.source_label || r.source || "",
          rerank_position: r.rerank_position,
        }));

      setResults(attentionResults);
      if (data?.attentionWeights) {
        setWeights(data.attentionWeights);
      }
      toast({ title: `${attentionResults.length} resultados com atenção multi-head` });
    } catch (err: any) {
      toast({ title: "Erro na busca", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const headNames = weights?.heads?.map((h) => h.name) || ["semantic", "keyword", "authority", "recency", "jurisdiction", "depth"];

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Heatmap de Atenção Multi-Head
          </CardTitle>
          <CardDescription className="text-xs">
            Visualize quais cabeças de atenção (semântica, autoridade, jurisdição, etc.) mais influenciaram cada resultado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Digite uma query para analisar a atenção..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAttentionSearch()}
              className="bg-background border-border"
            />
            <Button onClick={runAttentionSearch} disabled={loading} className="btn-gold shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {/* Weights legend */}
          {weights && (
            <div className="flex flex-wrap gap-1.5">
              {weights.heads.map((head) => (
                <Badge
                  key={head.name}
                  variant="outline"
                  className="text-[8px] px-1.5 py-0.5 gap-1"
                  title={head.description}
                >
                  <div className={`w-2 h-2 rounded-full ${headColors[head.name] || "bg-primary"}`} />
                  {headLabels[head.name] || head.name}: {(head.weight * 100).toFixed(0)}%
                </Badge>
              ))}
              <Badge variant="outline" className="text-[8px] px-1.5 py-0.5 border-primary/30 text-primary">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                {weights.version}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Heatmap grid */}
      {results.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Mapa de Atenção — {results.length} resultados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-1.5 text-muted-foreground font-medium w-[200px]">Resultado</th>
                    {headNames.map((h) => (
                      <th key={h} className="text-center p-1.5 text-muted-foreground font-medium min-w-[60px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className={`w-2 h-2 rounded-full ${headColors[h] || "bg-primary"}`} />
                          <span className="text-[8px]">{headLabels[h] || h}</span>
                        </div>
                      </th>
                    ))}
                    <th className="text-center p-1.5 text-muted-foreground font-medium min-w-[60px]">
                      <span className="text-[8px] font-bold">MHA Score</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={result.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                      <td className="p-1.5">
                        <div className="flex items-start gap-1.5">
                          <span className="text-[9px] text-muted-foreground font-mono w-4 shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium text-foreground line-clamp-1">
                              {result.title}
                            </p>
                            <p className="text-[8px] text-muted-foreground">{result.source}</p>
                          </div>
                        </div>
                      </td>
                      {headNames.map((h) => (
                        <td key={h} className="p-1">
                          <HeatCell value={result.attention_heads[h] || 0} headName={h} />
                        </td>
                      ))}
                      <td className="p-1">
                        <div className="flex items-center justify-center">
                          <Badge
                            variant="outline"
                            className="text-[9px] font-mono font-bold border-primary/30 text-primary"
                          >
                            {(result.multi_head_score * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[9px] text-muted-foreground mt-3">
              💡 Cada célula mostra a contribuição percentual de cada "cabeça de atenção" no score final.
              Células mais escuras = maior influência. Score MHA = soma ponderada de todas as cabeças.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
