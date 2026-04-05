import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, AlertCircle, PlusCircle, Search, ChevronDown, ChevronUp } from "lucide-react";
import { checkMissingClauses, type ClauseCheckResult } from "@/lib/analysis";
import { useState } from "react";

interface DocumentCompletenessGaugeProps {
  editorHtml: string;
  documentType?: string;
  onDetectGaps: () => void;
  onInsertClause: (suggestion: string) => void;
  detectingGaps?: boolean;
  compact?: boolean;
}

export function DocumentCompletenessGauge({
  editorHtml,
  documentType,
  onDetectGaps,
  onInsertClause,
  detectingGaps,
  compact,
}: DocumentCompletenessGaugeProps) {
  const [expanded, setExpanded] = useState(false);

  const result: ClauseCheckResult = useMemo(
    () => checkMissingClauses(editorHtml, documentType),
    [editorHtml, documentType]
  );

  if (result.checks.length === 0) return null;

  const missingRequired = result.checks.filter(c => c.required && !c.present);
  const missingOptional = result.checks.filter(c => !c.required && !c.present);
  const present = result.checks.filter(c => c.present);

  const gaugeColor =
    result.completeness >= 80 ? "text-green-600" :
    result.completeness >= 50 ? "text-amber-500" :
    "text-destructive";

  const progressClass =
    result.completeness >= 80 ? "[&>div]:bg-green-500" :
    result.completeness >= 50 ? "[&>div]:bg-amber-500" :
    "[&>div]:bg-destructive";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold ${gaugeColor}`}>{result.completeness}%</span>
        <Progress value={result.completeness} className={`h-1.5 w-16 ${progressClass}`} />
        {missingRequired.length > 0 && (
          <Badge variant="destructive" className="text-[9px] h-4">
            {missingRequired.length} obrigatória{missingRequired.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`text-lg font-bold ${gaugeColor}`}>{result.completeness}%</div>
          <div className="flex-1 min-w-0">
            <Progress value={result.completeness} className={`h-2 ${progressClass}`} />
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {present.length}/{result.checks.length} seções
          </span>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border">
          <ScrollArea className="max-h-[280px]">
            <div className="p-3 space-y-3">
              {/* Missing Required */}
              {missingRequired.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Obrigatórias Ausentes ({missingRequired.length})
                  </p>
                  {missingRequired.map(c => (
                    <div key={c.id} className="flex items-center gap-2 pl-1">
                      <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                      <span className="text-xs text-foreground flex-1">{c.label}</span>
                      {c.suggestion && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-5 text-[9px] px-1.5 gap-0.5"
                          onClick={(e) => { e.stopPropagation(); onInsertClause(c.suggestion!); }}
                        >
                          <PlusCircle className="h-2.5 w-2.5" />Inserir
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Missing Optional */}
              {missingOptional.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">
                    Recomendadas ({missingOptional.length})
                  </p>
                  {missingOptional.map(c => (
                    <div key={c.id} className="flex items-center gap-2 pl-1">
                      <span className="h-3 w-3 shrink-0 text-center text-[9px] text-amber-500">○</span>
                      <span className="text-xs text-muted-foreground flex-1">{c.label}</span>
                      {c.suggestion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[9px] px-1.5 gap-0.5 text-muted-foreground"
                          onClick={(e) => { e.stopPropagation(); onInsertClause(c.suggestion!); }}
                        >
                          <PlusCircle className="h-2.5 w-2.5" />Inserir
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Present */}
              {present.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">
                    ✓ Presentes ({present.length})
                  </p>
                  {present.map(c => (
                    <div key={c.id} className="flex items-center gap-2 pl-1 opacity-60">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      <span className="text-[11px] text-muted-foreground">{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Auto-detect gaps button */}
          <div className="border-t border-border p-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs gap-1.5"
              onClick={onDetectGaps}
              disabled={detectingGaps}
            >
              {detectingGaps ? (
                <><Loader2 className="h-3 w-3 animate-spin" />Analisando lacunas...</>
              ) : (
                <><Search className="h-3 w-3" />Detectar Lacunas com IA</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
