/**
 * Orion Video Overlay — Floating balloon video player
 * Opens YouTube/videos in a holographic projected overlay like Orion showing with a projector
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { X, Maximize2, Minimize2, Volume2, VolumeX, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface VideoCommand {
  action: string;
  url?: string;
  query?: string;
  title?: string;
}

export function VideoOverlay() {
  const [visible, setVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [muted, setMuted] = useState(false);

  // Listen for Orion video commands
  useEffect(() => {
    const handler = (e: CustomEvent<VideoCommand>) => {
      const { action, url, query, title: t } = e.detail;
      if (action === "play_video" && url) {
        const embedUrl = convertToEmbed(url);
        setVideoUrl(embedUrl);
        setTitle(t || query || "Orion Video");
        setVisible(true);
        setMinimized(false);
      } else if (action === "search_video" && query) {
        const searchUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`;
        setVideoUrl(searchUrl);
        setTitle(t || query);
        setVisible(true);
        setMinimized(false);
      } else if (action === "close") {
        setVisible(false);
      }
    };
    window.addEventListener("orion-video-command", handler as EventListener);
    return () => window.removeEventListener("orion-video-command", handler as EventListener);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setVideoUrl("");
    setTitle("");
  }, []);

  if (!visible || !videoUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 60 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 60 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className={`fixed z-[9999] overflow-hidden ${
          minimized
            ? "bottom-4 right-4 w-80 h-16"
            : "bottom-6 right-6 w-[480px] h-[320px] md:w-[560px] md:h-[360px]"
        }`}
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(212,175,55,0.25)",
          background: "linear-gradient(145deg, rgba(8,8,20,0.98), rgba(12,8,25,0.98))",
          boxShadow: `
            0 0 40px rgba(212,175,55,0.12),
            0 0 80px rgba(59,130,246,0.06),
            0 20px 60px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(212,175,55,0.2)
          `,
          transition: "width 0.3s, height 0.3s",
        }}
      >
        {/* ═══ Holographic top accent ═══ */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, transparent, #D4AF37, #3B82F6, #D4AF37, transparent)" }} />

        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#D4AF37]/5 to-[#3B82F6]/5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-5 w-5 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
              <span className="text-[10px]">🎬</span>
            </div>
            <span className="text-[10px] font-mono font-bold truncate"
              style={{ color: "#D4AF37", textShadow: "0 0 10px rgba(212,175,55,0.4)" }}>
              ORION PROJECTOR
            </span>
            <span className="text-[9px] text-muted-foreground truncate">{title}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMuted(!muted)}>
              {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(!minimized)}>
              {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={close}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* ═══ Video ═══ */}
        {!minimized && (
          <div className="relative w-full" style={{ height: "calc(100% - 40px)" }}>
            {/* Holographic scan line effect */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,175,55,0.1) 2px, rgba(212,175,55,0.1) 4px)",
              }}
            />
            {/* Corner brackets — projector frame */}
            <div className="absolute top-1 left-1 w-4 h-4 border-l-2 border-t-2 z-10 pointer-events-none" style={{ borderColor: "rgba(212,175,55,0.4)" }} />
            <div className="absolute top-1 right-1 w-4 h-4 border-r-2 border-t-2 z-10 pointer-events-none" style={{ borderColor: "rgba(212,175,55,0.4)" }} />
            <div className="absolute bottom-1 left-1 w-4 h-4 border-l-2 border-b-2 z-10 pointer-events-none" style={{ borderColor: "rgba(59,130,246,0.4)" }} />
            <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 z-10 pointer-events-none" style={{ borderColor: "rgba(59,130,246,0.4)" }} />

            <iframe
              src={`${videoUrl}${videoUrl.includes("?") ? "&" : "?"}${muted ? "mute=1&" : ""}autoplay=1`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Orion Video Projector"
            />
          </div>
        )}

        {/* ═══ Minimized info ═══ */}
        {minimized && (
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-[10px] truncate text-muted-foreground">{title}</span>
          </div>
        )}

        {/* Bottom glow */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, transparent, #3B82F6, #D4AF37, #3B82F6, transparent)" }} />
      </motion.div>
    </AnimatePresence>
  );
}

function convertToEmbed(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  
  // Already an embed
  if (url.includes("/embed")) return url;
  
  // Default: use as-is
  return url;
}
