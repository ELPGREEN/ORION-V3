/**
 * ═══ Vision Stats Panel (Compact HUD Sidebar) ═══
 * Real-time FPS and detection statistics — compact card
 * Matches JARVIS HUD sidebar style (~220px wide)
 */

import { useState, useEffect, useMemo } from "react";
import { 
  Activity, Zap, Cpu, Gauge, Boxes, ScanFace, Hand, 
  Eye, TrendingUp, TrendingDown, Wifi, WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DetectionStats {
  fps: number;
  totalFrames: number;
  objectsDetected: number;
  facesDetected: number;
  handsDetected: number;
  textRegionsFound: number;
  lastDetectionTime: number;
  processingMs: number;
  isActive: boolean;
  isConnected: boolean;
}

interface VisionStatsPanelProps {
  stats: DetectionStats;
  className?: string;
}

export function VisionStatsPanel({ stats, className }: VisionStatsPanelProps) {
  const [animatedFps, setAnimatedFps] = useState(0);
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);

  useEffect(() => {
    const diff = stats.fps - animatedFps;
    if (Math.abs(diff) > 0.5) {
      const timer = setTimeout(() => setAnimatedFps(prev => prev + diff * 0.3), 30);
      return () => clearTimeout(timer);
    }
  }, [stats.fps, animatedFps]);

  useEffect(() => {
    setFpsHistory(prev => [...prev, stats.fps].slice(-20));
  }, [stats.fps]);

  const fpsTrend = useMemo(() => {
    if (fpsHistory.length < 5) return "stable";
    const recent = fpsHistory.slice(-5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const current = fpsHistory[fpsHistory.length - 1];
    if (current > avg * 1.1) return "up";
    if (current < avg * 0.9) return "down";
    return "stable";
  }, [fpsHistory]);

  const fpsColor = !stats.isActive ? "#ef4444" : stats.fps >= 25 ? "#22c55e" : stats.fps >= 15 ? "#eab308" : "#f97316";

  const metrics = [
    { icon: Boxes, label: "Obj", value: stats.objectsDetected, color: "#ffd740" },
    { icon: ScanFace, label: "Face", value: stats.facesDetected, color: "#00e5ff" },
    { icon: Hand, label: "Mão", value: stats.handsDetected, color: "#7c4dff" },
    { icon: Eye, label: "Txt", value: stats.textRegionsFound, color: "#69f0ae" },
  ];

  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="px-3 py-2 space-y-2">
        {/* FPS display */}
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold font-mono" style={{ color: fpsColor, textShadow: `0 0 8px ${fpsColor}40` }}>
              {animatedFps.toFixed(1)}
            </span>
            <span className="text-[7px] font-mono text-white/20">FPS</span>
          </div>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-black/50">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(100, (stats.fps / 30) * 100)}%`,
                background: `linear-gradient(90deg, ${fpsColor}, #00e5ff)`,
                boxShadow: `0 0 6px ${fpsColor}40`
              }}
            />
          </div>
          {fpsTrend === "up" && <TrendingUp className="h-3 w-3 text-emerald-400 shrink-0" />}
          {fpsTrend === "down" && <TrendingDown className="h-3 w-3 text-red-400 shrink-0" />}
          {fpsTrend === "stable" && <Activity className="h-3 w-3 text-cyan-400/40 shrink-0" />}
        </div>

        {/* Detection counts grid */}
        <div className="grid grid-cols-4 gap-1">
          {metrics.map(m => (
            <div key={m.label} className="text-center">
              <m.icon className="h-3 w-3 mx-auto mb-0.5" style={{ color: m.value > 0 ? m.color : "rgba(255,255,255,0.1)" }} />
              <span className="text-[9px] font-mono font-bold block" style={{ color: m.value > 0 ? m.color : "rgba(255,255,255,0.1)" }}>
                {m.value}
              </span>
              <span className="text-[6px] font-mono text-white/15">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Processing info */}
        <div className="flex items-center justify-between text-[7px] font-mono text-white/20 pt-1 border-t border-cyan-500/5">
          <span className="flex items-center gap-1">
            <Cpu className="h-2.5 w-2.5" style={{ color: "#ff6e40" }} />
            {stats.processingMs}ms
          </span>
          <span>{stats.totalFrames} frms</span>
          <span className="flex items-center gap-0.5">
            <Zap className="h-2.5 w-2.5" style={{ color: fpsColor }} />
            {!stats.isActive ? "OFF" : stats.fps >= 25 ? "OK" : stats.fps >= 15 ? "MED" : "LOW"}
          </span>
        </div>
      </div>
    </div>
  );
}

export const DEFAULT_DETECTION_STATS: DetectionStats = {
  fps: 0,
  totalFrames: 0,
  objectsDetected: 0,
  facesDetected: 0,
  handsDetected: 0,
  textRegionsFound: 0,
  lastDetectionTime: 0,
  processingMs: 0,
  isActive: false,
  isConnected: false,
};
