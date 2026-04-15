/**
 * ═══ Vision Stats Panel ═══
 * Real-time FPS and detection statistics dashboard
 * Cyberpunk/Holographic styling with animated metrics
 */

import { useState, useEffect, useMemo } from "react";
import { 
  Activity, Zap, Cpu, Gauge, Boxes, ScanFace, Hand, 
  Eye, Clock, TrendingUp, TrendingDown, Wifi, WifiOff,
  RefreshCw, Radio
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface DetectionStats {
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

  // Animate FPS value
  useEffect(() => {
    const diff = stats.fps - animatedFps;
    if (Math.abs(diff) > 0.5) {
      const timer = setTimeout(() => {
        setAnimatedFps(prev => prev + diff * 0.3);
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [stats.fps, animatedFps]);

  // Track FPS history for trend
  useEffect(() => {
    setFpsHistory(prev => {
      const newHistory = [...prev, stats.fps].slice(-20);
      return newHistory;
    });
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

  const avgFps = useMemo(() => {
    if (fpsHistory.length === 0) return 0;
    return fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
  }, [fpsHistory]);

  const processingLoad = useMemo(() => {
    if (stats.fps === 0) return 0;
    return Math.min(100, (stats.processingMs / (1000 / stats.fps)) * 100);
  }, [stats.fps, stats.processingMs]);

  const timeSinceLastDetection = stats.lastDetectionTime > 0 
    ? (Date.now() - stats.lastDetectionTime) / 1000 
    : 0;

  const getStatusColor = () => {
    if (!stats.isActive) return "#ef4444";
    if (stats.fps >= 25) return "#22c55e";
    if (stats.fps >= 15) return "#eab308";
    return "#f97316";
  };

  const getStatusText = () => {
    if (!stats.isActive) return "Inativo";
    if (stats.fps >= 25) return "Excelente";
    if (stats.fps >= 15) return "Bom";
    if (stats.fps >= 5) return "Moderado";
    return "Lento";
  };

  return (
    <div className={cn("relative overflow-hidden rounded-lg p-4", className)} style={{ 
      backgroundColor: "rgba(8,12,20,0.95)", 
      border: "1px solid rgba(212,175,55,0.12)",
      boxShadow: "0 0 20px rgba(212,175,55,0.08)"
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="h-4 w-4 animate-pulse" style={{ color: getStatusColor() }} />
            <div 
              className="absolute inset-0 rounded-full animate-ping" 
              style={{ backgroundColor: getStatusColor(), opacity: 0.4 }}
            />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider uppercase" 
            style={{ color: "rgba(212,175,55,0.8)" }}>
            Estatísticas de Visão
          </span>
        </div>
        <Badge variant="outline" className="text-[9px] font-mono border-white/10 text-muted-foreground gap-1">
          {stats.isConnected ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-red-400" />}
          {stats.isConnected ? "Conectado" : "Offline"}
        </Badge>
      </div>

      {/* Main FPS Display */}
      <div className="relative mb-5 p-4 rounded-lg" style={{ 
        background: "linear-gradient(135deg, rgba(0,229,255,0.1) 0%, rgba(124,77,255,0.1) 100%)",
        border: "1px solid rgba(0,229,255,0.2)"
      }}>
        <div className="absolute top-0 left-0 w-full h-px" style={{ 
          background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.6), transparent)" 
        }} />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gauge className="h-6 w-6" style={{ color: "#00e5ff" }} />
            <div>
              <span className="text-[10px] font-mono text-muted-foreground block">FPS</span>
              <span className="text-3xl font-bold font-mono" style={{ 
                color: getStatusColor(),
                textShadow: `0 0 20px ${getStatusColor()}40`
              }}>
                {animatedFps.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {fpsTrend === "up" && (
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            )}
            {fpsTrend === "down" && (
              <TrendingDown className="h-5 w-5 text-red-400" />
            )}
            {fpsTrend === "stable" && (
              <Activity className="h-5 w-5 text-cyan-400" />
            )}
            
            <div className="text-right">
              <span className="text-[10px] font-mono text-muted-foreground block">Média</span>
              <span className="text-sm font-mono font-bold" style={{ color: "#00e5ff" }}>
                {avgFps.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* FPS Bar */}
        <div className="mt-3">
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(100, (stats.fps / 30) * 100)}%`,
                background: `linear-gradient(90deg, ${getStatusColor()}, #00e5ff)`,
                boxShadow: `0 0 10px ${getStatusColor()}60`
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] font-mono text-muted-foreground">0</span>
            <span className="text-[8px] font-mono text-muted-foreground">15</span>
            <span className="text-[8px] font-mono text-muted-foreground">30 FPS</span>
          </div>
        </div>
      </div>

      {/* Detection Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Objects */}
        <div className="relative p-3 rounded-lg" style={{ 
          backgroundColor: "rgba(255,215,64,0.08)",
          border: "1px solid rgba(255,215,64,0.15)"
        }}>
          <div className="flex items-center gap-2 mb-1">
            <Boxes className="h-3.5 w-3.5" style={{ color: "#ffd740" }} />
            <span className="text-[10px] font-mono text-muted-foreground">OBJETOS</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono" style={{ color: "#ffd740" }}>
              {stats.objectsDetected}
            </span>
          </div>
          <Progress value={(stats.objectsDetected / 20) * 100} className="h-1 mt-2" 
            style={{ 
              backgroundColor: "rgba(255,215,64,0.1)",
              "--progress-color": "#ffd740" 
            } as React.CSSProperties} 
          />
        </div>

        {/* Faces */}
        <div className="relative p-3 rounded-lg" style={{ 
          backgroundColor: "rgba(0,229,255,0.08)",
          border: "1px solid rgba(0,229,255,0.15)"
        }}>
          <div className="flex items-center gap-2 mb-1">
            <ScanFace className="h-3.5 w-3.5" style={{ color: "#00e5ff" }} />
            <span className="text-[10px] font-mono text-muted-foreground">ROSTOS</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono" style={{ color: "#00e5ff" }}>
              {stats.facesDetected}
            </span>
          </div>
          <Progress value={(stats.facesDetected / 5) * 100} className="h-1 mt-2"
            style={{ 
              backgroundColor: "rgba(0,229,255,0.1)",
              "--progress-color": "#00e5ff"
            } as React.CSSProperties}
          />
        </div>

        {/* Hands */}
        <div className="relative p-3 rounded-lg" style={{ 
          backgroundColor: "rgba(124,77,255,0.08)",
          border: "1px solid rgba(124,77,255,0.15)"
        }}>
          <div className="flex items-center gap-2 mb-1">
            <Hand className="h-3.5 w-3.5" style={{ color: "#7c4dff" }} />
            <span className="text-[10px] font-mono text-muted-foreground">MÃOS</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono" style={{ color: "#7c4dff" }}>
              {stats.handsDetected}
            </span>
          </div>
          <Progress value={(stats.handsDetected / 4) * 100} className="h-1 mt-2"
            style={{ 
              backgroundColor: "rgba(124,77,255,0.1)",
              "--progress-color": "#7c4dff"
            } as React.CSSProperties}
          />
        </div>

        {/* Text Regions */}
        <div className="relative p-3 rounded-lg" style={{ 
          backgroundColor: "rgba(105,240,166,0.08)",
          border: "1px solid rgba(105,240,166,0.15)"
        }}>
          <div className="flex items-center gap-2 mb-1">
            <Eye className="h-3.5 w-3.5" style={{ color: "#69f0ae" }} />
            <span className="text-[10px] font-mono text-muted-foreground">TEXTO</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono" style={{ color: "#69f0ae" }}>
              {stats.textRegionsFound}
            </span>
          </div>
          <Progress value={(stats.textRegionsFound / 10) * 100} className="h-1 mt-2"
            style={{ 
              backgroundColor: "rgba(105,240,166,0.1)",
              "--progress-color": "#69f0ae"
            } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(212,175,55,0.08)" }}>
        <div className="flex items-center gap-4">
          {/* Processing Time */}
          <div className="flex items-center gap-1.5">
            <Cpu className="h-3 w-3" style={{ color: "#ff6e40" }} />
            <span className="text-[10px] font-mono text-muted-foreground">
              {stats.processingMs}ms
            </span>
          </div>
          
          {/* Frames */}
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" style={{ color: "#ea80fc" }} />
            <span className="text-[10px] font-mono text-muted-foreground">
              {stats.totalFrames} frms
            </span>
          </div>

          {/* Last Detection */}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" style={{ color: timeSinceLastDetection < 5 ? "#22c55e" : "#f97316" }} />
            <span className="text-[10px] font-mono" style={{ 
              color: timeSinceLastDetection < 5 ? "#22c55e" : "#f97316" 
            }}>
              {timeSinceLastDetection < 1 ? "agora" : `${timeSinceLastDetection.toFixed(1)}s`}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <Badge 
          variant="outline" 
          className="text-[9px] font-mono"
          style={{ 
            borderColor: `${getStatusColor()}40`,
            color: getStatusColor(),
            backgroundColor: `${getStatusColor()}10`
          }}
        >
          <Zap className="h-3 w-3 mr-1" />
          {getStatusText()}
        </Badge>
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-2 h-2 border-l border-t" style={{ borderColor: "rgba(0,229,255,0.5)" }} />
      <div className="absolute top-0 right-0 w-2 h-2 border-r border-t" style={{ borderColor: "rgba(0,229,255,0.5)" }} />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b" style={{ borderColor: "rgba(124,77,255,0.5)" }} />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b" style={{ borderColor: "rgba(124,77,255,0.5)" }} />
    </div>
  );
}

// Default stats for when vision is inactive
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