import { CheckCircle, Circle, Clock, FileText, Gavel, Scale, Send, AlertTriangle, Package, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ProcessStep {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const PROCESS_STEPS: ProcessStep[] = [
  { key: "novo", label: "Cadastrado", description: "Processo registrado no sistema", icon: FileText },
  { key: "em_analise", label: "Em Análise", description: "Advogado analisando o caso", icon: Scale },
  { key: "peticionado", label: "Peticionado", description: "Petição protocolada no tribunal", icon: Send },
  { key: "em_andamento", label: "Em Andamento", description: "Aguardando decisão judicial", icon: Gavel },
  { key: "audiencia", label: "Audiência", description: "Audiência marcada ou realizada", icon: Clock },
  { key: "concluido", label: "Concluído", description: "Processo finalizado", icon: CheckCircle },
];

const STATUS_MAP: Record<string, number> = {
  novo: 0,
  em_analise: 1,
  peticionado: 2,
  em_andamento: 3,
  audiencia: 4,
  concluido: 5,
  arquivado: 5,
  suspenso: -1,
};

export interface Andamento {
  id: string;
  tipo: string;
  descricao: string;
  data_ocorrencia: string;
  created_at: string;
}

interface ProcessStatusTrackerProps {
  status: string;
  ultimaMovimentacao?: string | null;
  compact?: boolean;
  andamentos?: Andamento[];
  showTimeline?: boolean;
}

const tipoIcons: Record<string, React.ElementType> = {
  despacho: Gavel,
  decisao: Scale,
  peticao: Send,
  audiencia: Clock,
  sentenca: CheckCircle,
  publicacao: FileText,
  outros: MapPin,
};

export function ProcessStatusTracker({ status, ultimaMovimentacao, compact = false, andamentos = [], showTimeline = false }: ProcessStatusTrackerProps) {
  const currentIndex = STATUS_MAP[status] ?? 0;
  const isSuspended = status === "suspenso";

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {PROCESS_STEPS.map((step, i) => {
          const isCompleted = !isSuspended && i <= currentIndex;
          const isCurrent = !isSuspended && i === currentIndex;
          return (
            <TooltipProvider key={step.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-0.5">
                    <div
                      className={`h-2.5 w-2.5 rounded-full transition-all ${
                        isSuspended
                          ? "bg-amber-500/40"
                          : isCompleted
                          ? "bg-primary"
                          : "bg-muted-foreground/20"
                      } ${isCurrent ? "ring-2 ring-primary/30 ring-offset-1 ring-offset-background" : ""}`}
                    />
                    {i < PROCESS_STEPS.length - 1 && (
                      <div
                        className={`h-0.5 w-3 ${
                          !isSuspended && i < currentIndex ? "bg-primary" : "bg-muted-foreground/15"
                        }`}
                      />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">
                  <p className="font-medium">{step.label}</p>
                  <p className="text-muted-foreground">{step.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isSuspended && (
        <div className="flex items-center gap-2 text-amber-400 text-[10px] mb-2 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded">
          <AlertTriangle className="h-3 w-3" />
          Processo suspenso
        </div>
      )}

      {/* Step Progress Bar */}
      <div className="flex items-center justify-between gap-0">
        {PROCESS_STEPS.map((step, i) => {
          const StepIcon = step.icon;
          const isCompleted = !isSuspended && i <= currentIndex;
          const isCurrent = !isSuspended && i === currentIndex;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-initial">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-1 relative">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                          isSuspended
                            ? "bg-muted border border-amber-500/30"
                            : isCurrent
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : isCompleted
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted border border-border text-muted-foreground"
                        )}
                      >
                        {isCompleted && !isCurrent ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : isSuspended ? (
                          <Circle className="h-4 w-4 text-amber-500/60" />
                        ) : (
                          <StepIcon className="h-4 w-4" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[8px] text-center leading-tight max-w-[56px]",
                          isCurrent ? "text-primary font-semibold" : isCompleted ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[10px] max-w-[160px]">
                    <p className="font-medium">{step.label}</p>
                    <p className="text-muted-foreground">{step.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {i < PROCESS_STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 rounded-full ${
                    !isSuspended && i < currentIndex ? "bg-primary" : "bg-muted-foreground/15"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {ultimaMovimentacao && !showTimeline && (
        <p className="text-[9px] text-muted-foreground text-center mt-1">
          Última movimentação: {new Date(ultimaMovimentacao).toLocaleDateString("pt-BR")}
        </p>
      )}

      {/* Andamentos Timeline — Package Tracking Style */}
      {showTimeline && andamentos.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Histórico de Movimentações</span>
          </div>
          <div className="relative ml-3">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
            
            <div className="space-y-0">
              {andamentos.map((a, i) => {
                const Icon = tipoIcons[a.tipo] || MapPin;
                const isFirst = i === 0;
                return (
                  <div key={a.id} className="flex gap-3 relative group">
                    {/* Dot */}
                    <div className="flex flex-col items-center z-10 pt-1">
                      <div
                        className={cn(
                          "h-[15px] w-[15px] rounded-full flex items-center justify-center border-2 transition-all",
                          isFirst
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-card border-border text-muted-foreground group-hover:border-primary/50"
                        )}
                      >
                        <Icon className="h-2 w-2" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className={cn(
                      "flex-1 pb-4 min-w-0",
                      isFirst ? "" : "opacity-70 group-hover:opacity-100 transition-opacity"
                    )}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-[10px] uppercase tracking-wider font-medium",
                          isFirst ? "text-primary" : "text-muted-foreground"
                        )}>
                          {a.tipo.replace("_", " ")}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60">
                          {new Date(a.data_ocorrencia).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <p className={cn(
                        "text-[11px] mt-0.5 leading-relaxed",
                        isFirst ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {a.descricao}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showTimeline && andamentos.length === 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[10px] text-muted-foreground text-center py-2">
            Nenhuma movimentação registrada ainda.
          </p>
        </div>
      )}
    </div>
  );
}
