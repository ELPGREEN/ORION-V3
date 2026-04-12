/**
 * Orion Video Overlay — Holographic 3D Projector
 * Opens YouTube/videos as if Orion is projecting with a futuristic projector
 */
import { useState, useEffect, useCallback } from "react";
import { X, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
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

  useEffect(() => {
    const handler = (e: CustomEvent<VideoCommand>) => {
      const { action, url, query, title: t } = e.detail;
      if (action === "play_video" && url) {
        setVideoUrl(convertToEmbed(url));
        setTitle(t || query || "Orion Video");
        setVisible(true);
        setMinimized(false);
      } else if (action === "search_video" && query) {
        setVideoUrl(`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1`);
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

  const close = useCallback(() => { setVisible(false); setVideoUrl(""); setTitle(""); }, []);

  if (!visible || !videoUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 80, rotateX: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
        exit={{ opacity: 0, scale: 0.7, y: 80, rotateX: 15 }}
        transition={{ type: "spring", damping: 20, stiffness: 250 }}
        className={`fixed z-[9999] overflow-hidden ${
          minimized ? "bottom-4 right-4 w-80 h-16" : "bottom-6 right-6 w-[480px] h-[320px] md:w-[560px] md:h-[360px]"
        }`}
        style={{
          borderRadius: "16px",
          border: "1px solid rgba(212,175,55,0.3)",
          background: "linear-gradient(145deg, rgba(8,8,20,0.98), rgba(12,8,25,0.98))",
          boxShadow: `
            0 0 60px rgba(212,175,55,0.15),
            0 0 120px rgba(59,130,246,0.08),
            0 25px 80px rgba(0,0,0,0.7),
            inset 0 1px 0 rgba(212,175,55,0.25)
          `,
          perspective: "1200px",
          transition: "width 0.3s, height 0.3s",
        }}
      >
        {/* ═══ Holographic shimmer top ═══ */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent, #D4AF37, #3B82F6, #D4AF37, transparent)",
            animation: "shimmer 3s ease-in-out infinite",
          }} />

        {/* ═══ Light cone effect ═══ */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[200%] h-20 pointer-events-none opacity-20"
          style={{
            background: "conic-gradient(from 180deg at 50% 100%, transparent 40%, rgba(212,175,55,0.3) 48%, rgba(59,130,246,0.2) 50%, rgba(212,175,55,0.3) 52%, transparent 60%)",
            filter: "blur(8px)",
          }} />

        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#D4AF37]/5 to-[#3B82F6]/5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-5 w-5 rounded-full bg-[#D4AF37]/20 flex items-center justify-center"
              style={{ boxShadow: "0 0 10px rgba(212,175,55,0.3)" }}>
              <span className="text-[10px]">🎬</span>
            </div>
            <span className="text-[10px] font-mono font-bold truncate"
              style={{ color: "#D4AF37", textShadow: "0 0 12px rgba(212,175,55,0.5)" }}>
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
            {/* Holographic scan lines */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,175,55,0.1) 2px, rgba(212,175,55,0.1) 4px)",
              }} />

            {/* Animated corner brackets */}
            <div className="absolute top-1 left-1 w-5 h-5 border-l-2 border-t-2 z-10 pointer-events-none"
              style={{ borderColor: "rgba(212,175,55,0.5)", animation: "pulse 2s ease-in-out infinite" }} />
            <div className="absolute top-1 right-1 w-5 h-5 border-r-2 border-t-2 z-10 pointer-events-none"
              style={{ borderColor: "rgba(212,175,55,0.5)", animation: "pulse 2s ease-in-out infinite 0.5s" }} />
            <div className="absolute bottom-1 left-1 w-5 h-5 border-l-2 border-b-2 z-10 pointer-events-none"
              style={{ borderColor: "rgba(59,130,246,0.5)", animation: "pulse 2s ease-in-out infinite 1s" }} />
            <div className="absolute bottom-1 right-1 w-5 h-5 border-r-2 border-b-2 z-10 pointer-events-none"
              style={{ borderColor: "rgba(59,130,246,0.5)", animation: "pulse 2s ease-in-out infinite 1.5s" }} />

            {/* Holographic edge glow */}
            <div className="absolute inset-0 pointer-events-none z-10 rounded-b-lg"
              style={{
                boxShadow: "inset 0 0 30px rgba(212,175,55,0.05), inset 0 0 60px rgba(59,130,246,0.03)",
              }} />

            <iframe
              src={`${videoUrl}${videoUrl.includes("?") ? "&" : "?"}${muted ? "mute=1&" : ""}autoplay=1`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Orion Video Projector"
            />
          </div>
        )}

        {minimized && (
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-[10px] truncate text-muted-foreground">{title}</span>
          </div>
        )}

        {/* Bottom glow */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent, #3B82F6, #D4AF37, #3B82F6, transparent)",
            animation: "shimmer 3s ease-in-out infinite reverse",
          }} />

        {/* CSS animations */}
        <style>{`
          @keyframes shimmer {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
}

function convertToEmbed(url: string): string {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  if (url.includes("/embed")) return url;
  return url;
}
