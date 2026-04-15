/**
 * ═══ Vision Control Panel ═══
 * Modern controls for computer vision detection modules
 * Cyberpunk/Holographic styling
 */

import { useState, useEffect, useCallback } from "react";
import { 
  Eye, EyeOff, Target, Zap, Cpu, Layers, 
  Activity, ToggleLeft, ToggleRight, Gauge,
  ScanFace, Hand, Type, Boxes, Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface VisionSettings {
  faceDetection: boolean;
  handDetection: boolean;
  objectDetection: boolean;
  textRecognition: boolean;
  motionDetection: boolean;
  confidenceThreshold: number;
  detectionFrequency: number; // frames between detections
  showBoundingBoxes: boolean;
  showLabels: boolean;
  showConfidence: boolean;
}

interface VisionControlPanelProps {
  settings: VisionSettings;
  onSettingsChange: (settings: VisionSettings) => void;
  isActive: boolean;
  detectionStats?: {
    fps: number;
    objectsDetected: number;
    facesDetected: number;
    handsDetected: number;
    lastDetectionTime: number;
  };
}

export function VisionControlPanel({ 
  settings, 
  onSettingsChange, 
  isActive,
  detectionStats 
}: VisionControlPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const toggleSetting = useCallback((key: keyof VisionSettings) => {
    if (typeof settings[key] === "boolean") {
      onSettingsChange({ ...settings, [key]: !settings[key] });
    }
  }, [settings, onSettingsChange]);

  const updateThreshold = useCallback((value: number[]) => {
    onSettingsChange({ ...settings, confidenceThreshold: value[0] });
  }, [settings, onSettingsChange]);

  const updateFrequency = useCallback((value: number[]) => {
    onSettingsChange({ ...settings, detectionFrequency: value[0] });
  }, [settings, onSettingsChange]);

  const detectionModules = [
    { 
      key: "faceDetection" as const, 
      label: "Rostos", 
      icon: ScanFace, 
      color: "#00e5ff",
      description: "Detecção facial em tempo real"
    },
    { 
      key: "handDetection" as const, 
      label: "Mãos", 
      icon: Hand, 
      color: "#7c4dff",
      description: "Reconhecimento de gestos e mãos"
    },
    { 
      key: "objectDetection" as const, 
      label: "Objetos", 
      icon: Boxes, 
      color: "#ffd740",
      description: "Detecção de objetos e elementos"
    },
    { 
      key: "textRecognition" as const, 
      label: "Texto", 
      icon: Type, 
      color: "#69f0ae",
      description: "OCR - reconhecimento de texto"
    },
    { 
      key: "motionDetection" as const, 
      label: "Movimento", 
      icon: Activity, 
      color: "#ff6e40",
      description: "Detecção de movimento e fluxo óptico"
    },
  ];

  const visualizationOptions = [
    { key: "showBoundingBoxes" as const, label: "Bounding Boxes", icon: Target },
    { key: "showLabels" as const, label: "Rótulos", icon: Layers },
    { key: "showConfidence" as const, label: "Confiança", icon: Gauge },
  ];

  if (!isActive) {
    return (
      <div className="relative overflow-hidden rounded-lg p-4" 
        style={{ 
          backgroundColor: "rgba(10,10,15,0.85)", 
          border: "1px solid rgba(212,175,55,0.15)" 
        }}>
        <div className="flex items-center gap-3 text-muted-foreground">
          <EyeOff className="h-5 w-5" />
          <span className="text-sm font-mono">Visão inativa - ative para configurar</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative overflow-hidden rounded-lg" 
        style={{ 
          backgroundColor: "rgba(8,12,20,0.95)", 
          border: "1px solid rgba(212,175,55,0.12)",
          boxShadow: "0 0 20px rgba(212,175,55,0.08), inset 0 1px 0 rgba(212,175,55,0.1)"
        }}>
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
          style={{ borderBottom: expanded ? "1px solid rgba(212,175,55,0.08)" : "none" }}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Eye className="h-4 w-4" style={{ color: "#D4AF37", filter: "drop-shadow(0 0 4px rgba(212,175,55,0.5))" }} />
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="text-xs font-mono font-bold tracking-wider uppercase" 
              style={{ color: "rgba(212,175,55,0.8)" }}>
              Controle de Visão
            </span>
          </div>
          <div className="flex items-center gap-2">
            {detectionStats && (
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 gap-1">
                <Activity className="h-3 w-3" />
                {detectionStats.fps.toFixed(1)} FPS
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <span className="text-xs transition-transform duration-300" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="p-4 space-y-5">
            {/* ═══ Detection Modules ═══ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="h-3.5 w-3.5" style={{ color: "#00e5ff" }} />
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "rgba(0,229,255,0.7)" }}>
                  Módulos de Detecção
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {detectionModules.map((module) => {
                  const isEnabled = settings[module.key] as boolean;
                  return (
                    <Tooltip key={module.key}>
                      <TooltipTrigger asChild>
                        <div 
                          className={cn(
                            "relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300",
                            "border",
                            isEnabled 
                              ? "bg-opacity-20" 
                              : "opacity-50"
                          )}
                          style={{ 
                            backgroundColor: isEnabled ? `${module.color}10` : "rgba(0,0,0,0.3)",
                            borderColor: isEnabled ? `${module.color}40` : "rgba(255,255,255,0.05)"
                          }}
                          onClick={() => toggleSetting(module.key)}
                        >
                          {/* Glow effect when enabled */}
                          {isEnabled && (
                            <div 
                              className="absolute inset-0 rounded-lg animate-pulse"
                              style={{ 
                                background: `radial-gradient(circle at center, ${module.color}15 0%, transparent 70%)`,
                                animationDuration: "2s"
                              }} 
                            />
                          )}
                          
                          <div className="relative z-10 flex items-center gap-3 flex-1">
                            <module.icon 
                              className="h-4 w-4 shrink-0" 
                              style={{ color: isEnabled ? module.color : "rgba(255,255,255,0.3)" }}
                            />
                            <span className="text-xs font-medium" style={{ color: isEnabled ? "#fff" : "rgba(255,255,255,0.5)" }}>
                              {module.label}
                            </span>
                          </div>

                          <div className="relative z-10">
                            {isEnabled ? (
                              <ToggleRight className="h-5 w-5" style={{ color: module.color }} />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[200px] bg-zinc-900 border-zinc-700">
                        <p className="text-xs text-zinc-300">{module.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            {/* ═══ Visualization Options ═══ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-3.5 w-3.5" style={{ color: "#7c4dff" }} />
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "rgba(124,77,255,0.7)" }}>
                  Visualização
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {visualizationOptions.map((opt) => {
                  const isEnabled = settings[opt.key] as boolean;
                  return (
                    <Tooltip key={opt.key}>
                      <TooltipTrigger asChild>
                        <button
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all duration-200",
                            "border",
                            isEnabled 
                              ? "bg-purple-500/10 border-purple-500/40 text-purple-300" 
                              : "bg-black/30 border-white/5 text-muted-foreground"
                          )}
                          onClick={() => toggleSetting(opt.key)}
                        >
                          <opt.icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Alternar {opt.label.toLowerCase()}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            {/* ═══ Advanced Settings ═══ */}
            <div className="grid grid-cols-2 gap-4 pt-2" style={{ borderTop: "1px solid rgba(212,175,55,0.08)" }}>
              {/* Confidence Threshold */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                    <Zap className="h-3 w-3" style={{ color: "#ffd740" }} />
                    Limiar de Confiança
                  </span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: "#ffd740" }}>
                    {settings.confidenceThreshold}%
                  </span>
                </div>
                <Slider 
                  value={[settings.confidenceThreshold]} 
                  onValueChange={updateThreshold}
                  min={10}
                  max={95}
                  step={5}
                  className="[&_[role=slider]]:bg-yellow-400 [&_[role=slider]]:border-yellow-400"
                />
              </div>

              {/* Detection Frequency */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1.5">
                    <Gauge className="h-3 w-3" style={{ color: "#69f0ae" }} />
                    Frequência
                  </span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: "#69f0ae" }}>
                    1/{settings.detectionFrequency}
                  </span>
                </div>
                <Slider 
                  value={[settings.detectionFrequency]} 
                  onValueChange={updateFrequency}
                  min={1}
                  max={30}
                  step={1}
                  className="[&_[role=slider]]:bg-emerald-400 [&_[role=slider]]:border-emerald-400"
                />
              </div>
            </div>

            {/* ═══ Real-time Stats Badge ═══ */}
            {detectionStats && (
              <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: "1px solid rgba(212,175,55,0.08)" }}>
                <Badge variant="outline" className="text-[9px] border-cyan-500/30 text-cyan-400 font-mono gap-1">
                  <Boxes className="h-3 w-3" /> {detectionStats.objectsDetected} objetos
                </Badge>
                <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-400 font-mono gap-1">
                  <ScanFace className="h-3 w-3" /> {detectionStats.facesDetected} rostos
                </Badge>
                <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400 font-mono gap-1">
                  <Hand className="h-3 w-3" /> {detectionStats.handsDetected} mãos
                </Badge>
                {detectionStats.lastDetectionTime > 0 && (
                  <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-400 font-mono gap-1">
                    <Image className="h-3 w-3" /> {(Date.now() - detectionStats.lastDetectionTime) / 1000}s atrás
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2" style={{ borderColor: "rgba(212,175,55,0.5)" }} />
        <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2" style={{ borderColor: "rgba(212,175,55,0.5)" }} />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2" style={{ borderColor: "rgba(59,130,246,0.5)" }} />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2" style={{ borderColor: "rgba(59,130,246,0.5)" }} />
      </div>
    </TooltipProvider>
  );
}

export const DEFAULT_VISION_SETTINGS: VisionSettings = {
  faceDetection: true,
  handDetection: true,
  objectDetection: true,
  textRecognition: true,
  motionDetection: true,
  confidenceThreshold: 50,
  detectionFrequency: 10,
  showBoundingBoxes: true,
  showLabels: true,
  showConfidence: true,
};