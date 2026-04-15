/**
 * OrionEmbeddedVideo — Draggable, minimizable YouTube player for Orion.
 * Minimized = small floating bar (audio continues). Reopen = full player.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Volume2, VolumeX, Maximize2, Minimize2, Play, Music, GripHorizontal, ChevronUp } from "lucide-react";
import {
  buildYouTubeSearchEmbed,
  clampPercent,
  normalizeYouTubeEmbedUrl,
  postYouTubeIframeCommand,
} from "@/lib/youtube-player";
import { useDraggable } from "@/hooks/useDraggable";

interface VideoCommand {
  action: string;
  url?: string;
  query?: string;
  title?: string;
  value?: number;
}

interface OrionEmbeddedVideoProps {
  onClose?: () => void;
}

export function OrionEmbeddedVideo({ onClose }: OrionEmbeddedVideoProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { pos, isDragging, onMouseDown, onTouchStart } = useDraggable({ x: 0, y: 0 });

  const sendPlayerCommand = useCallback((func: string, args: unknown[] = []) => {
    return postYouTubeIframeCommand(iframeRef.current, func, args);
  }, []);

  const syncPlayerState = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (muted || volume === 0) {
        sendPlayerCommand("mute");
        return;
      }
      sendPlayerCommand("unMute");
      sendPlayerCommand("setVolume", [volume]);
    });
  }, [muted, sendPlayerCommand, volume]);

  const applyVolume = useCallback((nextVolume: number, forceMuted?: boolean) => {
    const safeVolume = clampPercent(nextVolume, volume);
    const shouldMute = forceMuted ?? safeVolume === 0;
    setVolume(safeVolume);
    setMuted(shouldMute);
    window.setTimeout(() => {
      if (shouldMute) {
        sendPlayerCommand("mute");
      } else {
        sendPlayerCommand("unMute");
        sendPlayerCommand("setVolume", [safeVolume]);
      }
    }, 120);
  }, [sendPlayerCommand, volume]);

  const toggleMute = useCallback(() => {
    if (muted || volume === 0) {
      applyVolume(volume === 0 ? 50 : volume, false);
      return;
    }
    applyVolume(volume, true);
  }, [applyVolume, muted, volume]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const handleClose = useCallback(() => {
    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen().catch(() => {});
    }
    setVisible(false);
    setVideoUrl("");
    setTitle("");
    setMinimized(false);
    onClose?.();
  }, [onClose]);

  const handleMinimize = useCallback(() => {
    if (isFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setMinimized(true);
  }, [isFullscreen]);

  const handleRestore = useCallback(() => {
    setMinimized(false);
  }, []);

  const moveToAudioBar = useCallback(() => {
    if (!videoUrl) return;
    window.dispatchEvent(new CustomEvent("orion-video-command", {
      detail: { action: "play_video", url: videoUrl, title }
    }));
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("orion-video-command", {
        detail: { action: "minimize_to_bar" }
      }));
    }, 100);
    handleClose();
  }, [handleClose, title, videoUrl]);

  useEffect(() => {
    if (!visible || !videoUrl) return;
    const timer = window.setTimeout(syncPlayerState, 350);
    return () => window.clearTimeout(timer);
  }, [syncPlayerState, videoUrl, visible]);

  useEffect(() => {
    const embeddedHandler = (e: CustomEvent<VideoCommand>) => {
      const { action, url, query, title: nextTitle } = e.detail;
      if (action === "play_video" && url) {
        setVideoUrl(normalizeYouTubeEmbedUrl(url));
        setTitle(nextTitle || query || "Orion Video");
        setVisible(true);
        setMinimized(false);
      } else if (action === "search_video" && query) {
        setVideoUrl(buildYouTubeSearchEmbed(query));
        setTitle(nextTitle || query);
        setVisible(true);
        setMinimized(false);
      } else if (action === "close") {
        handleClose();
      }
    };

    const controlHandler = (e: CustomEvent<VideoCommand>) => {
      const { action, value } = e.detail;
      if (!visible || !videoUrl) return;

      if (action === "pause" || action === "stop") {
        sendPlayerCommand("pauseVideo");
      } else if (action === "play" || action === "resume") {
        sendPlayerCommand("playVideo");
      } else if (action === "next" || action === "skip") {
        sendPlayerCommand("nextVideo");
      } else if (action === "previous" || action === "prev") {
        sendPlayerCommand("previousVideo");
      } else if (action === "setVolume") {
        applyVolume(typeof value === "number" ? value : volume, false);
      } else if (action === "up" || action === "volume_up") {
        applyVolume(volume + 10, false);
      } else if (action === "down" || action === "volume_down") {
        applyVolume(volume - 10);
      } else if (action === "mute") {
        applyVolume(volume === 0 ? 50 : volume, true);
      } else if (action === "unmute") {
        applyVolume(volume === 0 ? 50 : volume, false);
      } else if (action === "maximize" || action === "fullscreen" || action === "aumentar_tela") {
        setMinimized(false);
        const el = containerRef.current;
        if (el && document.fullscreenElement !== el) {
          el.requestFullscreen().catch(() => {});
        }
      } else if (action === "diminuir_tela") {
        if (document.fullscreenElement === containerRef.current) {
          document.exitFullscreen().catch(() => {});
        }
      } else if (action === "minimize") {
        handleMinimize();
      } else if (action === "close") {
        handleClose();
      }
    };

    window.addEventListener("orion-embedded-video", embeddedHandler as EventListener);
    window.addEventListener("orion-video-command", controlHandler as EventListener);
    return () => {
      window.removeEventListener("orion-embedded-video", embeddedHandler as EventListener);
      window.removeEventListener("orion-video-command", controlHandler as EventListener);
    };
  }, [applyVolume, handleClose, handleMinimize, moveToAudioBar, sendPlayerCommand, videoUrl, visible, volume]);

  // Empty state
  if (!visible || !videoUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 space-y-3" style={{
        backgroundColor: "rgba(10,10,15,0.7)",
        border: "1px solid rgba(212,175,55,0.12)",
        borderRadius: "8px",
      }}>
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-500/10 to-amber-500/10 border border-red-500/20 flex items-center justify-center">
          <Play className="h-5 w-5 text-red-400/50" />
        </div>
        <p className="text-[10px] font-mono text-white/30">Nenhum vídeo em reprodução</p>
        <p className="text-[8px] font-mono text-white/15 max-w-[200px] text-center">
          Peça ao Orion: "toque um vídeo sobre..." ou "play [URL do YouTube]"
        </p>
      </div>
    );
  }

  // Minimized floating bar — iframe hidden but still in DOM (audio continues)
  if (minimized) {
    return (
      <>
        {/* Hidden iframe keeps audio playing */}
        <div className="fixed" style={{ width: 1, height: 1, opacity: 0, pointerEvents: "none", overflow: "hidden", position: "fixed", bottom: 0, left: 0, zIndex: -1 }}>
          <iframe
            ref={iframeRef}
            src={videoUrl}
            allow="autoplay; encrypted-media"
            title="Orion Video (minimized)"
          />
        </div>

        {/* Floating mini bar */}
        <div
          className="fixed z-[9999] flex items-center gap-2 px-3 py-2 rounded-full shadow-2xl cursor-move select-none"
          style={{
            bottom: 24,
            right: 24,
            transform: pos.x || pos.y ? `translate(${pos.x}px, ${pos.y}px)` : undefined,
            background: "linear-gradient(135deg, rgba(15,15,30,0.95), rgba(30,20,50,0.95))",
            border: "1px solid rgba(212,175,55,0.4)",
            boxShadow: "0 0 20px rgba(212,175,55,0.15), 0 8px 32px rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)",
          }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          data-drag-handle
        >
          <GripHorizontal className="h-3.5 w-3.5 text-white/30" />
          <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse"
            style={{ boxShadow: "0 0 8px rgba(239,68,68,0.4)" }}>
            <span className="text-[9px]">🎬</span>
          </div>
          <span className="text-[10px] font-mono text-white/70 max-w-[120px] truncate">{title}</span>

          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-white" onClick={toggleMute}>
            {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-amber-400" onClick={handleRestore} title="Abrir player">
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/60 hover:text-destructive" onClick={handleClose} title="Fechar">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </>
    );
  }

  // Full player — draggable
  return (
    <div
      ref={containerRef}
      className="flex flex-col rounded-lg overflow-hidden"
      style={{
        backgroundColor: "rgba(8,8,20,0.95)",
        border: "1px solid rgba(212,175,55,0.2)",
        boxShadow: "0 0 30px rgba(212,175,55,0.05), inset 0 1px 0 rgba(212,175,55,0.15)",
        transform: pos.x || pos.y ? `translate(${pos.x}px, ${pos.y}px)` : undefined,
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Top shimmer */}
      <div className="h-[2px]" style={{
        background: "linear-gradient(90deg, transparent, #D4AF37, #3B82F6, #D4AF37, transparent)",
        animation: "orion-shimmer 3s ease-in-out infinite",
      }} />

      {/* Header — drag handle */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06] cursor-grab active:cursor-grabbing"
        style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.05), rgba(59,130,246,0.03))" }}
        data-drag-handle
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="h-3.5 w-3.5 text-white/25 shrink-0" />
          <div className="h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center"
            style={{ boxShadow: "0 0 8px rgba(239,68,68,0.3)" }}>
            <span className="text-[10px]">🎬</span>
          </div>
          <span className="text-[10px] font-mono font-bold truncate" style={{ color: "#D4AF37" }}>
            ORION PLAYER
          </span>
          <span className="text-[9px] text-white/30 truncate max-w-[140px]">{title}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleMute}>
            {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleMinimize} title="Minimizar (áudio continua)">
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={moveToAudioBar} title="Enviar para playlist">
            <Music className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleFullscreen} title={isFullscreen ? "Sair tela cheia" : "Tela cheia"}>
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={handleClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Video */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        {/* Corner brackets */}
        <div className="absolute top-1 left-1 w-4 h-4 border-l-2 border-t-2 z-10 pointer-events-none" style={{ borderColor: "rgba(212,175,55,0.4)" }} />
        <div className="absolute top-1 right-1 w-4 h-4 border-r-2 border-t-2 z-10 pointer-events-none" style={{ borderColor: "rgba(212,175,55,0.4)" }} />
        <div className="absolute bottom-1 left-1 w-4 h-4 border-l-2 border-b-2 z-10 pointer-events-none" style={{ borderColor: "rgba(59,130,246,0.4)" }} />
        <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 z-10 pointer-events-none" style={{ borderColor: "rgba(59,130,246,0.4)" }} />

        <iframe
          ref={iframeRef}
          src={videoUrl}
          onLoad={syncPlayerState}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title="Orion Embedded Video"
        />

        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ boxShadow: "inset 0 0 20px rgba(212,175,55,0.03), inset 0 0 40px rgba(59,130,246,0.02)" }} />
      </div>

      {/* Bottom shimmer */}
      <div className="h-[2px]" style={{
        background: "linear-gradient(90deg, transparent, #3B82F6, #D4AF37, #3B82F6, transparent)",
        animation: "orion-shimmer 3s ease-in-out infinite reverse",
      }} />

      <style>{`
        @keyframes orion-shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
