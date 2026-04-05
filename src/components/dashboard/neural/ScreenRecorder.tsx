import { useState } from 'react';
import { Circle, Square, Pause, Play, Upload, Settings, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useScreenRecorder } from '@/hooks/useScreenRecorder';
import { QUALITY_PRESETS, getQualityLevel, setQualityLevel, type QualityLevel } from '@/lib/neural/quality-presets';
import { cn } from '@/lib/utils';

export function ScreenRecorder() {
  const { isRecording, isPaused, duration, isUploading, startRecording, stopRecording, togglePause } = useScreenRecorder();
  const [selectedQuality, setSelectedQuality] = useState<QualityLevel>(getQualityLevel());

  const handleQualityChange = (level: QualityLevel) => {
    setSelectedQuality(level);
    setQualityLevel(level);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const preset = QUALITY_PRESETS[selectedQuality];

  return (
    <div className="flex items-center gap-2">
      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full bg-red-500",
            !isPaused && "animate-pulse"
          )} />
          <span className="text-xs font-mono text-red-400">{formatDuration(duration)}</span>
        </div>
      )}

      {isUploading && (
        <Badge variant="outline" className="text-xs gap-1 border-primary/30">
          <Upload className="h-3 w-3 animate-spin" />
          Salvando...
        </Badge>
      )}

      {/* Main controls */}
      {!isRecording ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => startRecording(selectedQuality)}
          className="gap-1.5 text-xs border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
          disabled={isUploading}
        >
          <Circle className="h-3 w-3 fill-red-500 text-red-500" />
          REC
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={togglePause}>
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-red-400 hover:text-red-300"
            onClick={stopRecording}
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </Button>
        </div>
      )}

      {/* Config popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={isRecording}>
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4" />
              Configuração de Gravação
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Qualidade</label>
              <Select value={selectedQuality} onValueChange={(v) => handleQualityChange(v as QualityLevel)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(QUALITY_PRESETS).map((p) => (
                    <SelectItem key={p.level} value={p.level} className="text-xs">
                      {p.label} ({p.resolution.width}x{p.resolution.height})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>FPS: <span className="text-foreground">{preset.fpsCap}</span></div>
              <div>JPEG: <span className="text-foreground">{(preset.jpegQuality * 100).toFixed(0)}%</span></div>
              <div>Bitrate: <span className="text-foreground">{(preset.videoBitrate / 1_000_000).toFixed(1)}Mbps</span></div>
              <div>Skip: <span className="text-foreground">{preset.frameSkip}</span></div>
              <div className="col-span-2">TTS: <span className="text-foreground capitalize">{preset.ttsEngine}</span></div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
