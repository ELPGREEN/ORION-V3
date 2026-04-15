/**
 * ═══ Vision Control Panel (Inner content for HudCollapsibleSection) ═══
 */
import { useState, useCallback } from "react";
import { EyeOff, ScanFace, Hand, Type, Boxes, Activity, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

export interface VisionSettings {
  faceDetection: boolean;
  handDetection: boolean;
  objectDetection: boolean;
  textRecognition: boolean;
  motionDetection: boolean;
  confidenceThreshold: number;
  detectionFrequency: number;
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

const MODULES = [
  { key: "faceDetection" as const, label: "Rostos", icon: ScanFace, color: "#00e5ff" },
  { key: "handDetection" as const, label: "Mãos", icon: Hand, color: "#7c4dff" },
  { key: "objectDetection" as const, label: "Objetos", icon: Boxes, color: "#ffd740" },
  { key: "textRecognition" as const, label: "Texto (OCR)", icon: Type, color: "#69f0ae" },
  { key: "motionDetection" as const, label: "Movimento", icon: Activity, color: "#ff6e40" },
];

export function VisionControlPanel({ settings, onSettingsChange, isActive }: VisionControlPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleSetting = useCallback((key: keyof VisionSettings) => {
    if (typeof settings[key] === "boolean") {
      onSettingsChange({ ...settings, [key]: !settings[key] });
    }
  }, [settings, onSettingsChange]);

  if (!isActive) {
    return (
      <div className="px-3 py-2 flex items-center gap-1.5">
        <EyeOff className="h-3 w-3 text-white/20" />
        <span className="text-[9px] font-mono text-white/20">Visão inativa</span>
      </div>
    );
  }

  return (
    <div>
      {/* Module Toggles */}
      <div className="px-3 py-2 space-y-1.5">
        {MODULES.map(m => {
          const on = settings[m.key] as boolean;
          return (
            <div key={m.key} className="flex items-center gap-1.5">
              <m.icon className="h-3 w-3 shrink-0" style={{ color: on ? m.color : "rgba(255,255,255,0.15)" }} />
              <span className={`text-[9px] font-mono flex-1 ${on ? "text-white/50" : "text-white/15"}`}>{m.label}</span>
              <Switch
                checked={on}
                onCheckedChange={() => toggleSetting(m.key)}
                className="scale-[0.55] origin-right"
              />
            </div>
          );
        })}
      </div>

      {/* Expand advanced */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-[7px] font-mono text-white/20 hover:text-white/40 py-1 transition-colors"
      >
        {expanded ? "▲ Menos" : "▼ Avançado"}
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-2 border-t border-cyan-500/10 pt-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-white/25 flex items-center gap-1">
                <Zap className="h-2.5 w-2.5" style={{ color: "#ffd740" }} /> Confiança
              </span>
              <span className="text-[8px] font-mono font-bold" style={{ color: "#ffd740" }}>{settings.confidenceThreshold}%</span>
            </div>
            <Slider
              value={[settings.confidenceThreshold]}
              onValueChange={(v) => onSettingsChange({ ...settings, confidenceThreshold: v[0] })}
              min={10} max={95} step={5}
              className="h-3 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[role=slider]]:bg-yellow-400 [&_[role=slider]]:border-yellow-400"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-mono text-white/25">Frequência</span>
              <span className="text-[8px] font-mono font-bold" style={{ color: "#69f0ae" }}>1/{settings.detectionFrequency}</span>
            </div>
            <Slider
              value={[settings.detectionFrequency]}
              onValueChange={(v) => onSettingsChange({ ...settings, detectionFrequency: v[0] })}
              min={1} max={30} step={1}
              className="h-3 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_[role=slider]]:bg-emerald-400 [&_[role=slider]]:border-emerald-400"
            />
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            {([
              { key: "showBoundingBoxes" as const, label: "BBox" },
              { key: "showLabels" as const, label: "Labels" },
              { key: "showConfidence" as const, label: "%" },
            ]).map(opt => {
              const on = settings[opt.key] as boolean;
              return (
                <button key={opt.key}
                  onClick={() => toggleSetting(opt.key)}
                  className={`text-[7px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                    on ? "text-purple-300 border-purple-500/30 bg-purple-500/10"
                      : "text-white/15 border-white/[0.04] bg-transparent"
                  }`}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
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
