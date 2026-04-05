import { useState } from "react";
import {
  Brain,
  Search,
  CheckCircle,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  FileText,
  Shield,
  Tag,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface DocumentGenerationResult {
  content: string;
  provider: string;
  pipeline: {
    stages: string[];
    analysis?: { areaJuridica: string; keywords: string[]; queriesUsed: number };
    research?: { totalResults: number; synthesizedChars: number };
    validation?: {
      isComplete: boolean;
      score: number;
      missingElements: string[];
      hallucinations: string[];
    };
    autoEvolution?: { indexed: number; entities: string[] };
  };
  timings: Record<string, number>;
  errors: string[];
}

interface PipelineResultPanelProps {
  result: DocumentGenerationResult;
}

export function PipelineResultPanel({ result }: PipelineResultPanelProps) {
  const [open, setOpen] = useState(false);

  const totalTime = Object.values(result.timings).reduce((a, b) => a + b, 0);
  const validationScore = result.pipeline.validation?.score ?? 0;
  const scorePercent = Math.round(validationScore * 100);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 bg-card border border-border p-3 hover:bg-accent/5 transition-colors cursor-pointer">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">
            Pipeline Completo
          </span>

          {/* Quick stats */}
          <div className="flex items-center gap-3 ml-auto mr-2">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {totalTime >= 1000
                ? `${(totalTime / 1000).toFixed(1)}s`
                : `${totalTime}ms`}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Search className="h-3 w-3" />
              {result.pipeline.research?.totalResults || 0} fontes
            </span>
            <span
              className={`text-[10px] flex items-center gap-1 ${
                scorePercent >= 75
                  ? "text-primary"
                  : scorePercent >= 50
                  ? "text-yellow-600"
                  : "text-destructive"
              }`}
            >
              <Shield className="h-3 w-3" />
              {scorePercent}%
            </span>
            {(result.pipeline.autoEvolution?.indexed ?? 0) > 0 && (
              <span className="text-[10px] text-primary flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Indexado
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20">
              {result.provider}
            </span>
          </div>

          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 border-border bg-card p-4 space-y-4">
          {/* Stages Timeline */}
          <div>
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Estágios Executados
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {result.pipeline.stages.map((stage, i) => (
                <span
                  key={i}
                  className="text-[9px] px-2 py-1 bg-primary/5 text-primary border border-primary/15"
                >
                  {stage.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          {/* NLP Analysis */}
          {result.pipeline.analysis && (
            <div>
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Brain className="h-3 w-3" /> Análise NLP
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground">
                    Área Jurídica
                  </span>
                  <p className="text-xs text-foreground font-medium">
                    {result.pipeline.analysis.areaJuridica}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground">
                    Keywords
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {result.pipeline.analysis.keywords
                      .slice(0, 6)
                      .map((kw, i) => (
                        <span
                          key={i}
                          className="text-[8px] px-1.5 py-0.5 bg-muted text-muted-foreground border border-border"
                        >
                          {kw}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-muted-foreground">
                    Queries Geradas
                  </span>
                  <p className="text-xs text-foreground">
                    {result.pipeline.analysis.queriesUsed}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Research */}
          {result.pipeline.research && (
            <div>
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Search className="h-3 w-3" /> Pesquisa Paralela
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 bg-muted/50 border border-border">
                  <Database className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {result.pipeline.research.totalResults}
                    </p>
                    <span className="text-[9px] text-muted-foreground">
                      resultados encontrados
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/50 border border-border">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {(
                        (result.pipeline.research.synthesizedChars || 0) / 1000
                      ).toFixed(1)}
                      K
                    </p>
                    <span className="text-[9px] text-muted-foreground">
                      chars sintetizados
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation */}
          {result.pipeline.validation && (
            <div>
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Validação de Completude
              </h4>
              <div className="space-y-2">
                {/* Score bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        scorePercent >= 75
                          ? "bg-primary"
                          : scorePercent >= 50
                          ? "bg-yellow-500"
                          : "bg-destructive"
                      }`}
                      style={{ width: `${scorePercent}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      scorePercent >= 75
                        ? "text-primary"
                        : scorePercent >= 50
                        ? "text-yellow-600"
                        : "text-destructive"
                    }`}
                  >
                    {scorePercent}%
                  </span>
                  {result.pipeline.validation.isComplete ? (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>

                {/* Missing elements */}
                {result.pipeline.validation.missingElements.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-muted-foreground">
                      Elementos pendentes:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {result.pipeline.validation.missingElements.map(
                        (el, i) => (
                          <span
                            key={i}
                            className="text-[8px] px-1.5 py-0.5 bg-accent text-accent-foreground border border-border"
                          >
                            {el.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Hallucinations */}
                {result.pipeline.validation.hallucinations.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] text-destructive">
                      ⚠ Possíveis alucinações:
                    </span>
                    {result.pipeline.validation.hallucinations.map((h, i) => (
                      <p
                        key={i}
                        className="text-[10px] text-destructive pl-2 border-l-2 border-destructive/30"
                      >
                        {h}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Auto-Evolution */}
          {result.pipeline.autoEvolution && (
            <div>
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Auto-Evolução
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2 bg-muted/50 border border-border">
                  <Database className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {result.pipeline.autoEvolution.indexed}
                    </p>
                    <span className="text-[9px] text-muted-foreground">
                      documentos indexados
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/50 border border-border">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {result.pipeline.autoEvolution.entities?.length || 0}
                    </p>
                    <span className="text-[9px] text-muted-foreground">
                      entidades extraídas
                    </span>
                  </div>
                </div>
              </div>
              {result.pipeline.autoEvolution.entities &&
                result.pipeline.autoEvolution.entities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.pipeline.autoEvolution.entities
                      .slice(0, 12)
                      .map((e, i) => (
                        <span
                          key={i}
                          className="text-[8px] px-1.5 py-0.5 bg-primary/5 text-primary border border-primary/15"
                        >
                          {typeof e === "string" ? e : String(e)}
                        </span>
                      ))}
                  </div>
                )}
            </div>
          )}

          {/* Timings */}
          <div>
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Tempos de Execução
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.timings).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-1.5 p-1.5 bg-muted/50 border border-border"
                >
                  <span className="text-[9px] text-muted-foreground">
                    {key.replace(/_ms$/, "").replace(/_/g, " ")}
                  </span>
                  <span className="text-[9px] font-medium text-foreground">
                    {value >= 1000
                      ? `${(value / 1000).toFixed(1)}s`
                      : `${value}ms`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div>
              <h4 className="text-[10px] font-medium text-destructive uppercase tracking-wider mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Erros Recuperados
              </h4>
              {result.errors.map((e, i) => (
                <p
                  key={i}
                  className="text-[10px] text-destructive/70 pl-2 border-l-2 border-destructive/20"
                >
                  {e}
                </p>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
