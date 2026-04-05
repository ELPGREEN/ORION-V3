import { useState } from "react";
import { Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface WatermarkConfig {
  text: string;
  opacity: number;
  fontSize: number;
  rotation: number;
  color: string;
}

const DEFAULT_WATERMARK: WatermarkConfig = {
  text: "CONFIDENCIAL",
  opacity: 0.08,
  fontSize: 64,
  rotation: -35,
  color: "hsl(var(--muted-foreground))",
};

interface WatermarkOverlayProps {
  config: WatermarkConfig | null;
  onChange: (config: WatermarkConfig | null) => void;
}

export function WatermarkControl({ config, onChange }: WatermarkOverlayProps) {
  const isActive = config !== null;

  const handleToggle = (active: boolean) => {
    onChange(active ? { ...DEFAULT_WATERMARK } : null);
  };

  const update = (partial: Partial<WatermarkConfig>) => {
    if (!config) return;
    onChange({ ...config, ...partial });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          title="Marca d'água"
        >
          <Droplets className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-3" align="start">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Marca d'água</span>
          <Switch checked={isActive} onCheckedChange={handleToggle} />
        </div>
        {isActive && config && (
          <>
            <Input
              className="h-7 text-xs"
              value={config.text}
              onChange={(e) => update({ text: e.target.value })}
              placeholder="Texto..."
            />
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Opacidade: {Math.round(config.opacity * 100)}%</span>
              <Slider
                value={[config.opacity * 100]}
                onValueChange={([v]) => update({ opacity: v / 100 })}
                min={2}
                max={30}
                step={1}
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Tamanho: {config.fontSize}px</span>
              <Slider
                value={[config.fontSize]}
                onValueChange={([v]) => update({ fontSize: v })}
                min={24}
                max={120}
                step={2}
              />
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function WatermarkCSS({ config }: { config: WatermarkConfig }) {
  return (
    <div
      className="absolute inset-0 z-10 pointer-events-none overflow-hidden flex flex-col items-center justify-center gap-16"
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="whitespace-nowrap font-bold select-none"
          style={{
            fontSize: `${config.fontSize}px`,
            color: config.color,
            opacity: config.opacity,
            transform: `rotate(${config.rotation}deg)`,
            letterSpacing: "0.2em",
          }}
        >
          {config.text}
        </div>
      ))}
    </div>
  );
}
