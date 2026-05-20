import React from 'react';
import { Card } from '@/components/ui/card';
import { Eye, Brain, Cpu, Zap, Activity } from 'lucide-react';

/**
 * Neural Pipeline Flow - Visual tracking of the P-C-R-A cycle.
 * Optimized for BOLT V2.0 architectural integrity.
 */
export function NeuralPipelineFlow() {
  const steps = [
    { name: "Perception", icon: <Eye className="w-5 h-5" />, color: "text-blue-400", border: "border-blue-400/30" },
    { name: "Cognition", icon: <Brain className="w-5 h-5" />, color: "text-purple-400", border: "border-purple-400/30" },
    { name: "Reasoning", icon: <Cpu className="w-5 h-5" />, color: "text-yellow-400", border: "border-yellow-400/30" },
    { name: "Action", icon: <Zap className="w-5 h-5" />, color: "text-emerald-400", border: "border-emerald-400/30" },
  ];

  return (
    <Card className="p-8 bg-black/40 border-primary/20 backdrop-blur-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-2">
        <Activity className="w-4 h-4 text-primary/40 animate-pulse" />
      </div>

      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="space-y-1 text-center">
          <h3 className="text-xl font-bold tracking-tight text-primary">Neural Pipeline Integrity</h3>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">P-C-R-A Execution Cycle</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 relative">
          {steps.map((step, index) => (
            <React.Fragment key={step.name}>
              <div className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${step.border} bg-slate-900/50 hover:bg-slate-800/80 transition-all cursor-default group/step`}>
                <div className={`${step.color} group-hover/step:scale-110 transition-transform`}>
                  {step.icon}
                </div>
                <span className="text-sm font-medium">{step.name}</span>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block text-2xl text-primary/20 animate-in fade-in slide-in-from-left duration-1000">
                  →
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="w-full max-w-md h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-primary/40 animate-progress origin-left w-full" />
        </div>

        <p className="text-xs text-muted-foreground italic text-center max-w-sm">
          High-performance P-C-R-A flow active. Latency monitored via Neural Telemetry Hub.
        </p>
      </div>
    </Card>
  );
}

export default NeuralPipelineFlow;
