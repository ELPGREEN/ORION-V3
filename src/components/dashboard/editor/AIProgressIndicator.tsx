import { useEffect, useState } from "react";
import { Brain, Search, FileCheck, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AIProgressIndicatorProps {
  active: boolean;
  label?: string;
}

const STAGES = [
  { key: "context", label: "Analisando o contexto...", icon: Brain, duration: 2000 },
  { key: "search", label: "Buscando fundamentação legal...", icon: Search, duration: 3000 },
  { key: "generate", label: "Gerando resposta...", icon: FileCheck, duration: 4000 },
  { key: "validate", label: "Verificando a qualidade...", icon: ShieldCheck, duration: 2000 },
  { key: "done", label: "Concluído", icon: CheckCircle2, duration: 0 },
];

export function AIProgressIndicator({ active, label }: AIProgressIndicatorProps) {
  const [stageIdx, setStageIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setStageIdx(0);
      setProgress(0);
      return;
    }

    let currentStage = 0;
    setStageIdx(0);
    setProgress(0);

    const advanceStage = () => {
      if (currentStage < STAGES.length - 2) {
        currentStage++;
        setStageIdx(currentStage);
        setProgress(((currentStage + 1) / (STAGES.length - 1)) * 100);
        const next = STAGES[currentStage];
        if (next.duration > 0) {
          setTimeout(advanceStage, next.duration);
        }
      }
    };

    const initialTimer = setTimeout(advanceStage, STAGES[0].duration);

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const target = ((currentStage + 1) / (STAGES.length - 1)) * 100;
        if (prev >= target - 1) return prev;
        return prev + 0.5;
      });
    }, 50);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(progressInterval);
    };
  }, [active]);

  if (!active) return null;

  const stage = STAGES[stageIdx];
  const Icon = stage.icon;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <Icon className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
      <span className="text-[11px] text-primary font-medium whitespace-nowrap">
        {label || stage.label}
      </span>
      <Progress value={progress} className="h-1 flex-1 max-w-[120px] bg-secondary" />
      <span className="text-[9px] text-muted-foreground">{Math.round(progress)}%</span>
    </div>
  );
}
