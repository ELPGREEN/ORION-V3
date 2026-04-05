import { Zap, Brain, Bot, CheckCircle, Loader2, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import type { QueueJobStatus } from "@/hooks/useGenerationQueue";

interface Phase {
  id: string;
  label: string;
  provider: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  estimatedMs: number;
}

const PHASES: Phase[] = [
  {
    id: "structure",
    label: "Fase 1 — Estrutura",
    provider: "⚡ Motor Alpha — Relâmpago",
    description: "Esqueleto do documento, seções e legislação aplicável",
    icon: Zap,
    estimatedMs: 5000,
  },
  {
    id: "reasoning",
    label: "Fase 2 — Raciocínio Jurídico",
    provider: "Motor Epsilon",
    description: "Argumentação profunda, jurisprudência e doutrina",
    icon: Brain,
    estimatedMs: 20000,
  },
  {
    id: "review",
    label: "Fase 3 — Revisão Final",
    provider: "Motor Zeta",
    description: "Gramática, completude e formatação para peticionamento",
    icon: Bot,
    estimatedMs: 15000,
  },
];

interface TriplePipelineProgressProps {
  isActive: boolean;
  modelo: string;
  jobStatus: QueueJobStatus;
  jobMetadata?: Record<string, unknown> | null;
  jobStartTime?: number | null;
}

export function TriplePipelineProgress({ isActive, modelo, jobStatus, jobMetadata, jobStartTime }: TriplePipelineProgressProps) {
  const [currentPhase, setCurrentPhase] = useState(-1);
  const [phaseTimers, setPhaseTimers] = useState<number[]>([0, 0, 0]);

  const isTriple = modelo === "triple";
  const isCombined = modelo === "combined";
  const shouldShow = (isActive || jobStatus === "processing" || jobStatus === "queued") && (isTriple || isCombined);

  const phases = isTriple ? PHASES : PHASES.slice(1);

  // Drive phase progression from the persisted startTime (survives navigation)
  useEffect(() => {
    if (!shouldShow || (!isActive && jobStatus !== "processing")) {
      return;
    }

    // Use persisted start time so phases don't reset after navigation
    const origin = jobStartTime ?? Date.now();

    const tick = () => {
      const elapsed = Date.now() - origin;
      let accumulated = 0;
      let activePhase = 0;

      for (let i = 0; i < phases.length; i++) {
        accumulated += phases[i].estimatedMs;
        if (elapsed < accumulated) {
          activePhase = i;
          break;
        }
        if (i === phases.length - 1) {
          activePhase = phases.length - 1;
        }
      }

      setCurrentPhase(activePhase);

      setPhaseTimers(() => {
        const timers: number[] = [];
        let remaining = elapsed;
        for (let i = 0; i < phases.length; i++) {
          if (remaining <= 0) {
            timers.push(0);
          } else if (remaining >= phases[i].estimatedMs) {
            timers.push(phases[i].estimatedMs);
            remaining -= phases[i].estimatedMs;
          } else {
            timers.push(remaining);
            remaining = 0;
          }
        }
        return timers;
      });
    };

    tick(); // run immediately so there's no blank frame on reconnect
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [isActive, jobStatus, jobStartTime, phases]);

  useEffect(() => {
    if (jobStatus === "queued" && !jobStartTime) {
      setCurrentPhase(-1);
      setPhaseTimers([0, 0, 0]);
    }
  }, [jobStatus, jobStartTime]);

  if (!shouldShow) return null;

  const isCompleted = jobStatus === "completed";

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Crown className="h-4 w-4 text-primary animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-foreground tracking-wide">
            {isTriple ? "Pipeline Profissional Máximo" : "Pipeline Combinado"}
          </span>
          <p className="text-[10px] text-muted-foreground">
            {isTriple ? "3 IAs trabalhando em sequência" : "2 IAs trabalhando em sequência"}
          </p>
        </div>
        <span className="text-[9px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-medium">
          {isTriple ? "3-IAs" : "2-IAs"}
        </span>
      </div>

      {/* Phases */}
      <div className="space-y-0">
        {phases.map((phase, idx) => {
          const isDone = isCompleted || currentPhase > idx;
          const isActivePhase = !isCompleted && currentPhase === idx;
          const isPending = !isCompleted && currentPhase < idx;
          const Icon = phase.icon;
          const elapsed = phaseTimers[idx] || 0;
          const progress = isDone ? 1 : isActivePhase ? Math.min(elapsed / phase.estimatedMs, 0.95) : 0;

          return (
            <div key={phase.id}>
              <div className="flex items-start gap-3 py-2.5">
                {/* Status Icon */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isDone
                        ? "bg-primary/15 text-primary"
                        : isActivePhase
                        ? "bg-primary/10 text-primary ring-2 ring-primary/25 shadow-lg shadow-primary/10"
                        : "bg-muted text-muted-foreground/30"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : isActivePhase ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  {idx < phases.length - 1 && (
                    <div
                      className={`w-0.5 h-5 mt-1 transition-colors duration-300 rounded-full ${
                        isDone ? "bg-primary/30" : "bg-border"
                      }`}
                    />
                  )}
                </div>

                {/* Phase Info */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-medium transition-colors ${
                        isDone ? "text-primary" : isActivePhase ? "text-foreground" : "text-muted-foreground/40"
                      }`}
                    >
                      {phase.label}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                        isDone
                          ? "border-primary/25 text-primary bg-primary/5"
                          : isActivePhase
                          ? "border-primary/20 text-primary/70 bg-primary/5"
                          : "border-border text-muted-foreground/30"
                      }`}
                    >
                      {phase.provider}
                    </span>
                    {isDone && (
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {(elapsed / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[10px] mt-0.5 transition-colors ${
                      isPending ? "text-muted-foreground/25" : "text-muted-foreground/60"
                    }`}
                  >
                    {phase.description}
                  </p>

                  {/* Progress bar */}
                  {isActivePhase && (
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="pt-2 border-t border-border">
        {isCompleted && jobMetadata ? (
          <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground/50">
            {jobMetadata.tripleChainUsed && <span>✓ Pipeline 3-IAs</span>}
            {jobMetadata.specializedPromptUsed && <span>✓ Prompt especializado</span>}
            {jobMetadata.neuralEnhanced && <span>✓ Neural integrado</span>}
            {typeof jobMetadata.duration === "number" && (
              <span className="font-mono">⏱ {(jobMetadata.duration as number / 1000).toFixed(1)}s</span>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground/40">
            {isTriple
              ? "Alpha estrutura → Epsilon argumenta → Zeta revisa • ~40s"
              : "Epsilon gera → Zeta refina • ~35s"}
          </p>
        )}
      </div>
    </div>
  );
}
