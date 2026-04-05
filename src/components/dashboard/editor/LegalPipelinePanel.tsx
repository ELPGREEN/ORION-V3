import { 
  Crown, Lightbulb, Search, BarChart3, BookOpen, PenTool, Quote, ShieldCheck, 
  FileText, CheckCircle, Loader2, Circle, AlertTriangle, ChevronDown, ChevronUp,
  Play, RotateCcw, Eye, FileDown, Clock, Download
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PipelineState, LegalAgentId, PipelineStepStatus } from "@/lib/legal-pipeline";

const STEP_ICONS: Record<LegalAgentId, React.ComponentType<{ className?: string }>> = {
  orquestrador: Crown,
  planejamento: Lightbulb,
  pesquisa: Search,
  analise: BarChart3,
  sintese: BookOpen,
  redacao: PenTool,
  citacao: Quote,
  revisao: ShieldCheck,
  formatacao: FileText,
};

const STATUS_STYLES: Record<PipelineStepStatus, string> = {
  pending: "text-muted-foreground border-border bg-muted/30",
  active: "text-primary border-primary bg-primary/10 shadow-sm shadow-primary/20",
  done: "text-emerald-600 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30",
  error: "text-destructive border-destructive/50 bg-destructive/10",
  skipped: "text-muted-foreground/60 border-border/50 bg-muted/20 opacity-60",
};

function StatusIcon({ status }: { status: PipelineStepStatus }) {
  switch (status) {
    case "active": return <Loader2 className="h-3 w-3 animate-spin" />;
    case "done": return <CheckCircle className="h-3 w-3" />;
    case "error": return <AlertTriangle className="h-3 w-3" />;
    default: return <Circle className="h-3 w-3 opacity-40" />;
  }
}

interface LegalPipelinePanelProps {
  pipeline: PipelineState;
  onStart?: () => void;
  onReset?: () => void;
  onStepClick?: (stepId: LegalAgentId) => void;
  onInsertDocument?: () => void;
  onExportPdf?: () => void;
  compact?: boolean;
}

export function LegalPipelinePanel({ pipeline, onStart, onReset, onStepClick, onInsertDocument, onExportPdf, compact }: LegalPipelinePanelProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [viewingOutput, setViewingOutput] = useState<string | null>(null);
  
  const completedCount = pipeline.steps.filter((s) => s.status === "done").length;
  const progress = pipeline.steps.length > 0 ? (completedCount / pipeline.steps.length) * 100 : 0;
  const activeStep = pipeline.steps.find((s) => s.status === "active");
  const totalElapsed = pipeline.completedAt && pipeline.startedAt
    ? ((pipeline.completedAt - pipeline.startedAt) / 1000).toFixed(1)
    : null;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Crown className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-semibold tracking-wide uppercase text-[10px] text-foreground">
            Pipeline Jurídico (9 Agentes)
          </span>
          {pipeline.isRunning && activeStep && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 animate-pulse bg-primary/10 text-primary border-primary/20 truncate max-w-[140px]">
              {activeStep.label}
            </Badge>
          )}
          {pipeline.completedAt && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
              ✓ Concluído {totalElapsed && `(${totalElapsed}s)`}
            </Badge>
          )}
        </div>

        {/* Mini progress */}
        <div className="flex items-center gap-1">
          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground tabular-nums w-8 text-right">{completedCount}/{pipeline.steps.length}</span>
        </div>

        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Steps */}
          <div className="p-2 space-y-0.5">
            {pipeline.steps.map((step, i) => {
              const Icon = STEP_ICONS[step.id];
              const isActive = step.status === "active";
              const isOrchestrator = step.id === "orquestrador";
              
              return (
                <div key={step.id}>
                  <button
                    onClick={() => {
                      if (step.output) setViewingOutput(viewingOutput === step.id ? null : step.id);
                      onStepClick?.(step.id);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md border text-left transition-all text-[11px]",
                      STATUS_STYLES[step.status],
                      isActive && "ring-1 ring-primary/30",
                      isOrchestrator && step.status !== "pending" && "border-primary/40"
                    )}
                  >
                    <span className={cn(
                      "text-[9px] font-mono w-3 shrink-0",
                      isOrchestrator ? "text-primary font-bold" : "text-muted-foreground"
                    )}>
                      {isOrchestrator ? "★" : i}
                    </span>
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", isOrchestrator && "text-primary")} />
                    <div className="flex-1 min-w-0">
                      <span className={cn("font-medium", isOrchestrator && "text-primary")}>{step.label}</span>
                      {!compact && (
                        <p className="text-[9px] text-muted-foreground truncate mt-0.5 leading-tight">{step.description}</p>
                      )}
                      {step.error && (
                        <p className="text-[9px] text-destructive truncate mt-0.5">{step.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {step.output && (
                        <Eye className={cn("h-2.5 w-2.5", viewingOutput === step.id ? "text-primary" : "text-muted-foreground/50")} />
                      )}
                      <StatusIcon status={step.status} />
                    </div>
                    {step.elapsed != null && step.elapsed > 0 && (
                      <span className="text-[8px] text-muted-foreground tabular-nums shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2 w-2" />
                        {(step.elapsed / 1000).toFixed(1)}s
                      </span>
                    )}
                  </button>

                  {/* Output preview */}
                  {viewingOutput === step.id && step.output && (
                    <div className="ml-6 mt-1 mb-1 p-2 bg-muted/50 rounded border border-border text-[10px] text-foreground max-h-[200px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {step.output.substring(0, 800)}
                      {step.output.length > 800 && (
                        <span className="text-muted-foreground block mt-1">… ({step.output.length} caracteres total)</span>
                      )}
                    </div>
                  )}

                  {/* Connector line between steps */}
                  {i < pipeline.steps.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <div className={cn(
                        "w-px h-2",
                        step.status === "done" ? "bg-emerald-300 dark:bg-emerald-700" : "bg-border"
                      )} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="border-t border-border px-2 py-1.5 flex gap-1.5">
            {!pipeline.isRunning ? (
              <>
                <Button size="sm" variant="default" className="h-6 text-[10px] gap-1 flex-1" onClick={onStart}>
                  <Play className="h-3 w-3" /> {pipeline.completedAt ? "Executar Novamente" : "Iniciar Pipeline"}
                </Button>
                {pipeline.finalDocument && onInsertDocument && (
                  <Button size="sm" variant="secondary" className="h-6 text-[10px] gap-1" onClick={onInsertDocument} title="Inserir documento gerado no editor">
                    <FileDown className="h-3 w-3" /> Inserir
                  </Button>
                )}
                {pipeline.finalDocument && onExportPdf && (
                  <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={onExportPdf} title="Exportar PDF direto">
                    <Download className="h-3 w-3" /> PDF
                  </Button>
                )}
              </>
            ) : (
              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 flex-1" disabled>
                <Loader2 className="h-3 w-3 animate-spin" /> Processando… ({completedCount}/{pipeline.steps.length})
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2" onClick={onReset} title="Resetar pipeline">
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
