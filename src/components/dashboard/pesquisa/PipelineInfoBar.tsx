import { Clock, Zap, Database, Sparkles, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { NeuralSearchResponse } from "@/lib/api";

interface Props {
  neuralResponse: NeuralSearchResponse;
  timing?: number;
}

export function PipelineInfoBar({ neuralResponse, timing }: Props) {
  const { pipeline, cacheHit, embeddingCacheHit, expandedQueries, indexed, version, timings } = neuralResponse;

  return (
    <div className="bg-primary/5 border border-primary/20 p-3 space-y-2">
      {/* Pipeline stages */}
      <div className="flex items-center gap-2 flex-wrap">
        <Brain className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="text-[10px] font-medium text-foreground">Pipeline {version || "v4"}:</span>
        {pipeline?.map((step, i) => (
          <span key={i} className="text-[8px] flex items-center gap-0.5">
            {i > 0 && <span className="text-muted-foreground">→</span>}
            <span className="px-1.5 py-0.5 border border-primary/20 text-primary bg-primary/5">
              {step}
            </span>
          </span>
        ))}
        {timing != null && (
          <span className="text-[9px] text-muted-foreground flex items-center gap-1 ml-auto">
            <Clock className="h-2.5 w-2.5" />
            {timing >= 1000 ? `${(timing / 1000).toFixed(1)}s` : `${timing}ms`}
          </span>
        )}
      </div>

      {/* Metadata badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {cacheHit && (
          <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-accent text-accent-foreground bg-accent/10">
            <Database className="h-2.5 w-2.5 mr-0.5" />
            Cache HIT
          </Badge>
        )}
        {embeddingCacheHit && (
          <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
            <Zap className="h-2.5 w-2.5 mr-0.5" />
            Embedding Cache
          </Badge>
        )}
        {indexed > 0 && (
          <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-primary/30 text-primary">
            +{indexed} chunks indexados
          </Badge>
        )}
        {timings && Object.entries(timings).map(([key, ms]) => (
          <Badge key={key} variant="outline" className="text-[8px] px-1.5 py-0 border-border text-muted-foreground">
            {key}: {typeof ms === "number" && ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}
          </Badge>
        ))}
      </div>

      {/* Expanded queries */}
      {expandedQueries && expandedQueries.length > 0 && (
        <div className="flex items-start gap-2 pt-1 border-t border-primary/10">
          <Sparkles className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-[9px] text-muted-foreground">
            <span className="text-foreground font-medium">Queries expandidas:</span>{" "}
            {expandedQueries.map((q, i) => (
              <span key={i}>
                {i > 0 && " · "}
                <span className="text-primary">"{q}"</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
