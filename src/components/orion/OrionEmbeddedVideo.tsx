/**
 * OrionEmbeddedVideo — Player de vídeo embutido no painel Orion
 * Controles: mute, fechar, fullscreen. Estilo holográfico.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Volume2, VolumeX, Maximize2, Play } from "lucide-react";

interface VideoCommand {
  action: string;
  url?: string;
  query?: string;
  title?: string;
}

interface OrionEmbeddedVideoProps {
  onClose?: () => void;
}

export function OrionEmbeddedVideo({ onClose }: OrionEmbeddedVideoProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [muted, setMuted] = useState(false);
  const [visible, setVisible] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handler = (e: CustomEvent<VideoCommand>) => {
      const { action, url, query, title: t } = e.detail;
      if (action === "play_video" && url) {
        setVideoUrl(convertToEmbed(url));
        setTitle(t || query || "Orion Video");
        setVisible(true);
      } else if (action === "search_video" && query) {
        setVideoUrl(`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`);
        setTitle(t || query);
        setVisible(true);
      } else if (action === "close") {
        handleClose();
      }
    };
    window.addEventListener("orion-embedded-video", handler as EventListener);
    return () => window.removeEventListener("orion-embedded-video", handler as EventListener);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setVideoUrl("");
    setTitle("");
    onClose?.();
  }, [onClose]);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const newMuted = !prev;
      if (iframeRef.current) {
        const cmd = newMuted ? "mute" : "unMute";
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: cmd, args: "" }), "*"
        );
      }
      return newMuted;
    });
  }, []);

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

  return (
    <div className="flex flex-col rounded-lg overflow-hidden" style={{
      backgroundColor: "rgba(8,8,20,0.95)",
      border: "1px solid rgba(212,175,55,0.2)",
      boxShadow: "0 0 30px rgba(212,175,55,0.05), inset 0 1px 0 rgba(212,175,55,0.15)",
    }}>
      {/* Top shimmer */}
      <div className="h-[2px]" style={{
        background: "linear-gradient(90deg, transparent, #D4AF37, #3B82F6, #D4AF37, transparent)",
        animation: "orion-shimmer 3s ease-in-out infinite",
      }} />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06]"
        style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.05), rgba(59,130,246,0.03))" }}>
        <div className="flex items-center gap-2 min-w-0">
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
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(videoUrl, "_blank")}>
            <Maximize2 className="h-3 w-3" />
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
          src={`${videoUrl}${videoUrl.includes("?") ? "&" : "?"}${muted ? "mute=1&" : ""}autoplay=1&enablejsapi=1`}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title="Orion Embedded Video"
        />

        {/* Holographic edge glow */}
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

function convertToEmbed(url: string): string {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  if (url.includes("/embed")) return url;
  return url;
}
