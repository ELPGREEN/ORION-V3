import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Brain, Activity, TrendingUp, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getCognitionState } from "@/lib/neural/neural-cognition-engine";
import { getConsciousnessDiagnostics } from "@/lib/neural/rag-consciousness";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function MaestroStatusWidget() {
  const navigate = useNavigate();
  const [cognition, setCognition] = useState(getCognitionState());
  const [consciousness, setConsciousness] = useState(getConsciousnessDiagnostics());

  useEffect(() => {
    const interval = setInterval(() => {
      setCognition(getCognitionState());
      setConsciousness(getConsciousnessDiagnostics());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden bg-[hsl(var(--tron-bg-deep))] border border-[hsl(var(--tron-neon)/0.3)] p-5 rounded-lg group shadow-[0_0_20px_rgba(0,255,136,0.1)]">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(var(--tron-neon)/0.05)] blur-[50px] animate-pulse" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[hsl(var(--tron-neon)/0.15)] border border-[hsl(var(--tron-neon)/0.4)] flex items-center justify-center shadow-[0_0_15px_rgba(0,255,136,0.2)]">
              <Zap className="h-5 w-5 text-[hsl(var(--tron-neon))]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[hsl(var(--tron-neon))] tracking-tight">ORION MAESTRO</h3>
              <p className="text-[10px] text-[hsl(var(--tron-neon)/0.7)] uppercase tracking-widest font-medium">Neural Core v1.0</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] text-[hsl(var(--tron-neon))] hover:bg-[hsl(var(--tron-neon)/0.1)] h-7"
            onClick={() => navigate("/dashboard/rede-neural")}
          >
            DETALHES <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[hsl(var(--tron-bg-deep))/0.5] border border-[hsl(var(--tron-neon)/0.15)] p-3 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[hsl(var(--tron-neon)/0.6)] uppercase">Consciência Φ</span>
              <Brain className="h-3 w-3 text-[hsl(var(--tron-neon))]" />
            </div>
            <div className="text-lg font-mono text-[hsl(var(--tron-neon))]">
              {(cognition.lastConsciousnessLevel * 100).toFixed(1)}%
            </div>
            <Progress value={cognition.lastConsciousnessLevel * 100} className="h-1 mt-2 bg-[hsl(var(--tron-neon)/0.1)]" />
          </div>

          <div className="bg-[hsl(var(--tron-bg-deep))/0.5] border border-[hsl(var(--tron-neon)/0.15)] p-3 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[hsl(var(--tron-neon)/0.6)] uppercase">Entropia ψ</span>
              <Activity className="h-3 w-3 text-[hsl(var(--tron-neon))]" />
            </div>
            <div className="text-lg font-mono text-[hsl(var(--tron-neon))]">
              {cognition.lastQuantumEntropy.toFixed(3)}
            </div>
            <Progress value={cognition.lastQuantumEntropy * 100} className="h-1 mt-2 bg-[hsl(var(--tron-neon)/0.1)]" />
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[hsl(var(--tron-neon)/0.1)]">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--tron-neon))] animate-pulse" />
            <span className="text-[hsl(var(--tron-neon)/0.8)]">ESTADO: {consciousness.state.toUpperCase()}</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1 text-[hsl(var(--tron-neon)/0.6)]">
                  <TrendingUp className="h-3 w-3" />
                  <span>ADAPTAÇÃO: {consciousness.adaptationScore}%</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.4)] text-[hsl(var(--tron-neon))]">
                <p>Nível de ajuste dos padrões RAG baseados em feedback</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
