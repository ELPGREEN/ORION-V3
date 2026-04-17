import { useState, useEffect } from "react";
import { Zap, Search, Brain, Target, Radio } from "lucide-react";
import type { IntentVoltage } from "@/lib/neural/tesla-coil-amplifier";

const COILS = [
  { name: "Norm", icon: Zap, voltage: "~1kV" },
  { name: "Desamb", icon: Search, voltage: "~10kV" },
  { name: "Enriq", icon: Brain, voltage: "~100kV" },
  { name: "Foco", icon: Target, voltage: "~500kV" },
  { name: "Ress", icon: Radio, voltage: "~1MV" },
];

function confidenceColor(c: number): string {
  if (c >= 0.75) return "rgb(0, 212, 255)";   // cyan
  if (c >= 0.55) return "rgb(212, 175, 55)";   // gold
  if (c >= 0.35) return "rgb(255, 193, 7)";    // amber
  return "rgb(255, 82, 82)";                    // red
}

function confidenceBg(c: number): string {
  if (c >= 0.75) return "rgba(59,130,246, 0.15)";
  if (c >= 0.55) return "rgba(212, 175, 55, 0.15)";
  if (c >= 0.35) return "rgba(255, 193, 7, 0.15)";
  return "rgba(255, 82, 82, 0.15)";
}

export function TeslaCoilVoltagePanel() {
  const [voltage, setVoltage] = useState<IntentVoltage | null>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const onVoltage = (e: Event) => {
      const detail = (e as CustomEvent).detail as IntentVoltage;
      setVoltage(detail);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 1200);
    };
    const onReset = () => setVoltage(null);

    window.addEventListener("tesla-coil-voltage", onVoltage);
    window.addEventListener("tesla-coil-reset", onReset);
    return () => {
      window.removeEventListener("tesla-coil-voltage", onVoltage);
      window.removeEventListener("tesla-coil-reset", onReset);
    };
  }, []);

  if (!voltage) return null;

  const log = voltage.amplificationLog;

  return (
    <div className="relative bg-black/60 backdrop-blur-sm border border-cyan-500/20 rounded-sm overflow-hidden animate-fade-in">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-400/60 to-cyan-400/30" />
      
      {/* Header */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-cyan-500/10">
        <Zap className="h-3 w-3 text-amber-400 shrink-0" />
        <span className="text-[10px] font-mono text-amber-400/80 tracking-wider uppercase">Tesla Coil</span>
        <span
          className="ml-auto text-[7px] font-mono font-bold px-1.5 py-0.5 rounded-full border"
          style={{
            color: voltage.shouldExecute ? "rgb(0, 212, 255)" : "rgb(255, 82, 82)",
            borderColor: voltage.shouldExecute ? "rgba(59,130,246, 0.3)" : "rgba(255, 82, 82, 0.3)",
            background: voltage.shouldExecute ? "rgba(59,130,246, 0.1)" : "rgba(255, 82, 82, 0.1)",
          }}
        >
          {voltage.shouldExecute ? "EXECUTAR" : "CLARIFICAR"}
        </span>
      </div>

      {/* Coil bars */}
      <div className="px-3 py-2">
        <div className="flex gap-1.5 items-end h-[52px]">
          {COILS.map((coil, i) => {
            const entry = log[i];
            const conf = entry ? entry.outputConfidence : 0;
            const Icon = coil.icon;
            const color = confidenceColor(conf);
            const isActive = animating && i === log.length - 1;

            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <Icon
                  className="h-2.5 w-2.5 shrink-0 transition-all duration-300"
                  style={{
                    color,
                    filter: isActive ? `drop-shadow(0 0 4px ${color})` : undefined,
                    animation: isActive ? "pulse 0.6s ease-in-out infinite" : undefined,
                  }}
                />
                <div
                  className="w-full rounded-sm overflow-hidden relative"
                  style={{ height: "28px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="absolute bottom-0 left-0 w-full rounded-sm transition-all duration-700 ease-out"
                    style={{
                      height: `${Math.round(conf * 100)}%`,
                      background: `linear-gradient(to top, ${color}, ${confidenceBg(conf)})`,
                      boxShadow: isActive ? `0 0 8px ${color}` : undefined,
                    }}
                  />
                </div>
                <span className="text-[6px] font-mono text-white/25 leading-none">{coil.voltage}</span>
              </div>
            );
          })}
        </div>

        {/* Metrics row */}
        <div className="mt-1.5 flex justify-between text-[7px] font-mono">
          <span className="text-white/20">
            Conf: <span style={{ color: confidenceColor(voltage.confidence) }}>{(voltage.confidence * 100).toFixed(0)}%</span>
          </span>
          <span className="text-white/20">
            Amp: <span className="text-amber-400/70">{voltage.amplificationRatio.toFixed(1)}x</span>
          </span>
          <span className="text-white/20">
            <span className="text-white/30">{voltage.totalAmplificationMs}ms</span>
          </span>
        </div>

        {/* Intent */}
        <div className="mt-1 text-[7px] font-mono text-[hsl(var(--tron-neon))]/50 truncate">
          ⚡ {voltage.intent}{voltage.entities.length > 0 ? ` · ${voltage.entities.length} entidades` : ""}
        </div>
      </div>
    </div>
  );
}
