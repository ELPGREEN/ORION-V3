import { Search, Brain, Zap, Clock, AlertTriangle, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SearchResultCard } from "./SearchResultCard";
// [REMOVED] import { NeuralSearchResultCard } from "./NeuralSearchResultCard";
import { SOURCE_LABELS, type SourceId, type UnifiedSearchResponse, type NeuralSearchResponse } from "@/lib/api";

interface Props {
  traditionalResponse: UnifiedSearchResponse | null;
  neuralResponse: NeuralSearchResponse | null;
  traditionalSourceCounts: Record<string, number>;
  neuralSourceCounts: Record<string, number>;
  searchTimings: { traditional?: number; neural?: number };
  displayQuery: string;
}

function ColumnHeader({
  icon: Icon,
  title,
  count,
  timing,
  variant,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  timing?: number;
  variant: "traditional" | "neural";
}) {
  return (
    <div className={`flex items-center justify-between pb-2 mb-3 border-b ${
      variant === "neural" ? "border-primary/20" : "border-border"
    }`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${variant === "neural" ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-xs font-medium text-foreground">{title}</span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
          {count}
        </Badge>
      </div>
      {timing != null && (
        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {timing >= 1000 ? `${(timing / 1000).toFixed(1)}s` : `${timing}ms`}
        </span>
      )}
    </div>
  );
}

export function ComparisonResults({
  traditionalResponse,
  neuralResponse,
  traditionalSourceCounts,
  neuralSourceCounts,
  searchTimings,
  displayQuery,
}: Props) {
  const tradCount = traditionalResponse?.totalResults ?? 0;
  const neuralCount = neuralResponse?.totalResults ?? 0;

  return (
    <div className="space-y-4">
      {/* Comparison Summary Bar */}
      <div className="bg-card border border-border p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">
            Comparação para "<span className="text-foreground font-medium">{displayQuery}</span>"
          </p>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <Search className="h-3 w-3" /> Tradicional: <span className="text-foreground font-medium">{tradCount}</span>
            </span>
            <span className="text-primary flex items-center gap-1">
              <Brain className="h-3 w-3" /> Neural: <span className="font-medium">{neuralCount}</span>
            </span>
          </div>
        </div>

        {/* Visual comparison bar */}
        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
          {tradCount + neuralCount > 0 && (
            <>
              <div
                className="bg-muted-foreground/40 transition-all"
                style={{ width: `${(tradCount / (tradCount + neuralCount)) * 100}%` }}
              />
              <div
                className="bg-primary transition-all"
                style={{ width: `${(neuralCount / (tradCount + neuralCount)) * 100}%` }}
              />
            </>
          )}
        </div>

        {/* Source badges */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Object.entries({ ...traditionalSourceCounts, ...neuralSourceCounts }).map(([source, count]) => (
            <Badge key={source} variant="outline" className="text-[9px] px-1.5 py-0">
              {SOURCE_LABELS[source as SourceId] || source}: {count}
            </Badge>
          ))}
        </div>
      </div>

      {/* Neural indexed info */}
      {neuralResponse && neuralResponse.indexed > 0 && (
        <div className="bg-primary/5 border border-primary/20 p-2 text-[10px] text-muted-foreground flex items-center gap-2">
          <Zap className="h-3 w-3 text-primary" />
          <span>
            <span className="text-foreground font-medium">{neuralResponse.indexed}</span> novos documentos indexados no banco vetorial.
          </span>
        </div>
      )}

      {/* Side-by-side columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Traditional column */}
        <div className="space-y-3">
          <ColumnHeader
            icon={Search}
            title="Tradicional"
            count={tradCount}
            timing={searchTimings.traditional}
            variant="traditional"
          />

          {/* Errors */}
          {traditionalResponse && traditionalResponse.errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 p-2 text-[10px] text-destructive flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <div>
                {traditionalResponse.errors.map((err, i) => (
                  <p key={i}>{SOURCE_LABELS[err.source as SourceId] || err.source}: {err.error}</p>
                ))}
              </div>
            </div>
          )}

          {traditionalResponse?.results.map((result, i) => (
            <SearchResultCard key={`trad-${result.source}-${i}`} result={result} />
          ))}

          {tradCount === 0 && traditionalResponse && (
            <div className="bg-muted/30 border border-border p-6 text-center">
              <p className="text-[11px] text-muted-foreground">Nenhum resultado tradicional.</p>
            </div>
          )}
        </div>

        {/* Neural column */}
        <div className="space-y-3">
          <ColumnHeader
            icon={Brain}
            title="Neural"
            count={neuralCount}
            timing={searchTimings.neural}
            variant="neural"
          />

          {/* Pipeline info */}
          {neuralResponse && neuralResponse.pipeline && neuralResponse.pipeline.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {neuralResponse.pipeline.map((step, i) => (
                <span key={i} className="text-[8px] px-1.5 py-0.5 border border-primary/20 text-primary bg-primary/5">
                  {step}
                </span>
              ))}
            </div>
          )}

          {neuralResponse?.results.map((result, i) => (
            <SearchResultCard key={`neural-${result.source}-${i}`} result={{ ...result, sourceLabel: result.source_label || result.source, description: result.content || "", type: "jurisprudencia" as const }} />
          ))}

          {neuralCount === 0 && neuralResponse && (
            <div className="bg-primary/5 border border-primary/20 p-6 text-center">
              <p className="text-[11px] text-muted-foreground">
                Nenhum resultado neural. A base semântica pode não ter dados indexados para este tema.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[9px] text-muted-foreground/50 text-center">
        Pesquisa em fontes públicas oficiais. Dados pessoais não são armazenados. LGPD Art. 7°, II.
      </p>
    </div>
  );
}
