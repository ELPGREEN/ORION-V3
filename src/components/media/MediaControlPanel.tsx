import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * MediaControlPanel
 * Web-only media controller for HTML5 audio/video inside Orion.
 * Does NOT control OS-level players (no MCP Desktop Commander).
 *
 * Optional VL frame analysis uses the dedicated `video-frame-analysis`
 * edge function (Nemotron VL / Gemma 3 cascade). It does NOT alter the
 * general vision pipeline (Gemini GCP).
 */
export function MediaControlPanel() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mediaUrl, setMediaUrl] = useState("");
  const [activeMedia, setActiveMedia] = useState<"audio" | "video">("video");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const getEl = useCallback(() => {
    return activeMedia === "video" ? videoRef.current : audioRef.current;
  }, [activeMedia]);

  // Sync volume / muted to element
  useEffect(() => {
    const el = getEl();
    if (!el) return;
    el.volume = volume;
    el.muted = muted;
  }, [volume, muted, getEl]);

  const togglePlay = useCallback(async () => {
    const el = getEl();
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
        setIsPlaying(true);
      } catch (err) {
        toast.error("Não foi possível reproduzir", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      el.pause();
      setIsPlaying(false);
    }
  }, [getEl]);

  const seek = (delta: number) => {
    const el = getEl();
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + delta));
  };

  const onTimeUpdate = () => {
    const el = getEl();
    if (!el) return;
    setProgress(el.currentTime);
    if (!Number.isNaN(el.duration)) setDuration(el.duration);
  };

  const onSeekTo = (val: number[]) => {
    const el = getEl();
    if (!el) return;
    el.currentTime = val[0];
    setProgress(val[0]);
  };

  const captureFrameBase64 = (): string | null => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || activeMedia !== "video") return null;
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) return null;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.85);
  };

  const analyzeCurrentFrame = async () => {
    if (activeMedia !== "video") {
      toast.info("Análise de frame disponível apenas para vídeo");
      return;
    }
    const dataUrl = captureFrameBase64();
    if (!dataUrl) {
      toast.error("Não foi possível capturar o frame atual");
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke("video-frame-analysis", {
        body: {
          frame_url: dataUrl,
          metadata: {
            duration_sec: Math.round(duration),
            source: mediaUrl,
          },
          prompt:
            "Descreva o que está acontecendo neste frame. Liste objetos, pessoas, " +
            "ações e texto visível. Seja factual e conciso.",
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha na análise");
      setAnalysis(data.analysis);
      toast.success("Frame analisado", {
        description: `Modelo: ${data.model}`,
      });
    } catch (err) {
      toast.error("Erro na análise", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Painel de Mídia</h2>
        <p className="text-sm text-muted-foreground">
          Controle de áudio e vídeo embutidos. Análise de frames via VL dedicado.
        </p>
      </div>

      <Tabs
        value={activeMedia}
        onValueChange={(v) => {
          setActiveMedia(v as "audio" | "video");
          setIsPlaying(false);
          setProgress(0);
          setDuration(0);
          setAnalysis(null);
        }}
      >
        <TabsList>
          <TabsTrigger value="video">Vídeo</TabsTrigger>
          <TabsTrigger value="audio">Áudio</TabsTrigger>
        </TabsList>

        <div className="flex gap-2 mt-3">
          <Input
            placeholder={activeMedia === "video" ? "URL do vídeo (mp4, webm)" : "URL do áudio (mp3, ogg, wav)"}
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
          />
        </div>

        <TabsContent value="video" className="mt-4">
          {mediaUrl ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full rounded-md bg-black aspect-video"
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() =>
                toast.error("Erro ao carregar vídeo", { description: "Verifique a URL/codec" })
              }
              crossOrigin="anonymous"
              playsInline
            />
          ) : (
            <div className="w-full rounded-md bg-muted aspect-video flex items-center justify-center text-muted-foreground text-sm">
              Cole uma URL de vídeo acima
            </div>
          )}
        </TabsContent>

        <TabsContent value="audio" className="mt-4">
          {mediaUrl ? (
            <audio
              ref={audioRef}
              src={mediaUrl}
              className="w-full"
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => toast.error("Erro ao carregar áudio")}
            />
          ) : (
            <div className="w-full rounded-md bg-muted h-16 flex items-center justify-center text-muted-foreground text-sm">
              Cole uma URL de áudio acima
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Transport controls */}
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" onClick={() => seek(-10)} aria-label="Voltar 10s">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pausar" : "Reproduzir"}
          disabled={!mediaUrl}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="outline" onClick={() => seek(10)} aria-label="Avançar 10s">
          <SkipForward className="h-4 w-4" />
        </Button>

        <span className="text-xs tabular-nums text-muted-foreground ml-2">
          {fmt(progress)} / {fmt(duration)}
        </span>

        <div className="flex-1" />

        <Button
          size="icon"
          variant="ghost"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Ativar som" : "Silenciar"}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <Slider
          value={[muted ? 0 : volume]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={(v) => {
            setVolume(v[0]);
            setMuted(v[0] === 0);
          }}
          className="w-24"
        />
      </div>

      {/* Progress slider */}
      <Slider
        value={[progress]}
        min={0}
        max={Math.max(duration, 0.01)}
        step={0.1}
        onValueChange={onSeekTo}
        disabled={!duration}
      />

      {/* Frame analysis */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm">Análise de Frame (VL)</h3>
            <p className="text-xs text-muted-foreground">
              Captura o frame atual e envia para um modelo de visão-linguagem dedicado.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={analyzeCurrentFrame}
            disabled={analyzing || activeMedia !== "video" || !mediaUrl}
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" /> Analisar frame
              </>
            )}
          </Button>
        </div>

        {analysis && (
          <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{analysis}</div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
}
