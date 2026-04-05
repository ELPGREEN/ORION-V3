import { Brain, Search, BookOpen, FileText, CheckCircle, Loader2, Zap, AlertTriangle, RefreshCw } from "lucide-react";

export interface PipelineNodeStatus {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
  elapsed?: number;
  details?: Record<string, unknown>;
  progress?: number;
}

const NODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  nlp: Brain,
  research: Search,
  synthesis: BookOpen,
  generation: FileText,
  validation: CheckCircle,
  self_correction: RefreshCw,
  auto_evolution: Zap,
};

interface PipelineProgressProps {
  isGenerating: boolean;
  modelo: "flash" | "pro";
  nodes?: PipelineNodeStatus[];
}

export function PipelineProgress({ isGenerating, modelo, nodes }: PipelineProgressProps) {
  if (!isGenerating && (!nodes || nodes.length === 0)) return null;

  // Use real SSE nodes if available, otherwise show static placeholder
  const displayNodes = nodes && nodes.length > 0 ? nodes : [];

  if (displayNodes.length === 0 && !isGenerating) return null;

  return (
    <div className="bg-card border border-border p-4 space-y-3 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-4 w-4 text-primary animate-pulse" />
        <span className="text-xs font-medium text-foreground tracking-wider uppercase">
          StateGraph Neural v4
        </span>
        <span className="text-[8px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 ml-auto">
          {modelo === "pro" ? "Pro" : "Flash"}
        </span>
      </div>

      <div className="space-y-2">
        {displayNodes.map((node) => {
          const Icon = NODE_ICONS[node.id] || FileText;
          const isActive = node.status === "active";
          const isDone = node.status === "done";
          const isError = node.status === "error";

          return (
            <div key={node.id} className="flex items-center gap-3">
              <div
                className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                  isDone ? "bg-primary/20 text-primary"
                    : isActive ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : isError ? "bg-destructive/20 text-destructive"
                    : "bg-muted text-muted-foreground/40"
                }`}
              >
                {isDone ? <CheckCircle className="h-3.5 w-3.5" />
                  : isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : isError ? <AlertTriangle className="h-3.5 w-3.5" />
                  : <Icon className="h-3 w-3" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${
                    isDone ? "text-primary font-medium"
                      : isActive ? "text-foreground font-medium"
                      : isError ? "text-destructive"
                      : "text-muted-foreground/50"
                  }`}>
                    {node.label}
                  </span>
                  {isDone && node.elapsed != null && (
                    <span className="text-[9px] text-muted-foreground">
                      {node.elapsed >= 1000 ? `${(node.elapsed / 1000).toFixed(1)}s` : `${node.elapsed}ms`}
                    </span>
                  )}
                </div>
                {isActive && (
                  <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all duration-300"
                      style={{ width: `${(node.progress || 0.3) * 100}%` }}
                    />
                  </div>
                )}
                {isDone && node.details && (
                  <div className="flex gap-1.5 mt-0.5 flex-wrap">
                    {Object.entries(node.details).map(([k, v]) => (
                      <span key={k} className="text-[8px] text-muted-foreground">
                        {k}: {typeof v === "number" ? v.toLocaleString() : String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {isDone && <span className="text-[9px] text-primary/60">✓</span>}
            </div>
          );
        })}
      </div>

      {isGenerating && (
        <p className="text-[10px] text-muted-foreground/60 pt-1 border-t border-border">
          Pipeline stateful com loops condicionais, auto-correção e indexação pgvector
        </p>
      )}
    </div>
  );
}
