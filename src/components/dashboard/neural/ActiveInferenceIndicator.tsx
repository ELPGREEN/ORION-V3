import { useState, useEffect } from "react";
import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ActiveInferenceResult } from "@/lib/neural/active-inference-guard";

export function ActiveInferenceIndicator() {
  const [result, setResult] = useState<ActiveInferenceResult | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ActiveInferenceResult>).detail;
      if (detail) setResult(detail);
    };
    const resetHandler = () => setResult(null);

    window.addEventListener("active-inference-check", handler);
    window.addEventListener("active-inference-reset", resetHandler);
    return () => {
      window.removeEventListener("active-inference-check", handler);
      window.removeEventListener("active-inference-reset", resetHandler);
    };
  }, []);

  if (!result) return null;

  const config = result.passed
    ? {
        Icon: ShieldCheck,
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-[hsl(var(--tron-neon))]",
        label: "Verificado",
        pulse: false,
      }
    : result.severity === "high"
      ? {
          Icon: ShieldAlert,
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-[hsl(var(--tron-danger))]",
          label: "Alta Surpresa",
          pulse: true,
        }
      : {
          Icon: ShieldQuestion,
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-400",
          label: "Verificar",
          pulse: false,
        };

  const { Icon, bg, border, text, label, pulse } = config;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${bg} ${border} ${text} text-xs font-mono cursor-default transition-all ${
              pulse ? "animate-pulse" : ""
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
            <span className="opacity-60">FE:{result.freeEnergy}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-xs bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.25)] text-gray-200"
        >
          <div className="space-y-1.5 text-xs">
            <div className="font-semibold flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Active Inference Guard
            </div>
            <div className="flex justify-between">
              <span>Free Energy:</span>
              <span className={text}>{result.freeEnergy}/100</span>
            </div>
            <div className="flex justify-between">
              <span>Latência:</span>
              <span>{result.timestamp.toFixed(1)}ms</span>
            </div>
            {result.errors.length > 0 && (
              <div className="border-t border-[hsl(var(--tron-neon)/0.25)] pt-1 mt-1 space-y-0.5">
                {result.errors.slice(0, 4).map((err, i) => (
                  <div key={i} className="text-[10px] opacity-80">
                    • {err.detail}
                  </div>
                ))}
              </div>
            )}
            {result.quality && (
              <div className="flex justify-between border-t border-[hsl(var(--tron-neon)/0.25)] pt-1">
                <span>Qualidade:</span>
                <span>{result.quality.score}/100</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
