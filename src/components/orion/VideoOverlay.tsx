/**
 * Orion Video Overlay — Holographic 3D Projector + Auto-minimize
 * Opens YouTube/videos as if Orion is projecting with a futuristic projector.
 * Auto-minimizes when video starts playing. Supports PiP via browser API.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { X, Maximize2, Minimize2, Volume2, VolumeX, PictureInPicture2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface VideoCommand {
  action: string;
  url?: string;
  query?: string;
  title?: string;
}

export function VideoOverlay() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [muted, setMuted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Don't render overlay on neural dashboard — uses embedded player instead
  const isOnNeuralDashboard = /\/dashboard\/rede-neural/i.test(location.pathname);

  useEffect(() => {
    const handler = (e: CustomEvent<VideoCommand>) => {
      const { action, url, query, title: t } = e.detail;
      console.log("[VideoOverlay] Received command:", action, "url:", url, "query:", query);
      if (action === "play_video" && url) {
        const embedUrl = convertToEmbed(url);
        console.log("[VideoOverlay] Playing embed:", embedUrl);
        setVideoUrl(embedUrl);
        setTitle(t || query || "Orion Video");
        setVisible(true);
        setMinimized(false); // Keep maximized so user can interact and hear audio
      } else if (action === "search_video" && query) {
        setVideoUrl(`https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1&enablejsapi=1`);
        setTitle(t || query);
        setVisible(true);
        setMinimized(false); // Keep maximized for audio playback
      } else if (action === "pause" || action === "stop") {
        // Send pause command to iframe via postMessage
        const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ event: "command", func: "pauseVideo" }, "*");
        }
      } else if (action === "play" || action === "resume") {
        // Send play command to iframe via postMessage
        const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ event: "command", func: "playVideo" }, "*");
        }
      } else if (action === "next" || action === "skip") {
        // Send next command to iframe via postMessage (works if playlist)
        const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ event: "command", func: "nextVideo" }, "*");
        }
      } else if (action === "previous" || action === "prev") {
        // Send previous command to iframe via postMessage (works if playlist)
        const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ event: "command", func: "previousVideo" }, "*");
        }
      } else if (action === "setVolume" || action === "volume") {
        // Send volume command to iframe via postMessage
        const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          const vol = parseInt(String(action).match(/\d+/)?.[0] || "50");
          iframe.contentWindow.postMessage({ event: "command", func: "setVolume", arg: vol }, "*");
        }
      } else if (action === "close") {
        setVisible(false);
      } else if (action === "maximize") {
        setMinimized(false);
      } else if (action === "minimize") {
        setMinimized(true);
      }
    };
    window.addEventListener("orion-video-command", handler as EventListener);
    return () => window.removeEventListener("orion-video-command", handler as EventListener);
  }, []);

  // Auto-minimize on route change
  useEffect(() => {
    if (!visible) return;
    const handleRouteChange = () => {
      if (visible && !minimized) {
        setMinimized(true);
      }
    };
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, [visible, minimized]);

  const close = useCallback(() => { setVisible(false); setVideoUrl(""); setTitle(""); setMinimized(false); }, []);

  const tryPiP = useCallback(async () => {
    // Try Document Picture-in-Picture API (Chrome 116+)
    if ("documentPictureInPicture" in window) {
      try {
        const pipWin = await (window as any).documentPictureInPicture.requestWindow({
          width: 480,
          height: 320,
        });
        const iframe = document.createElement("iframe");
        iframe.src = `${videoUrl}${videoUrl.includes("?") ? "&" : "?"}autoplay=1`;
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        pipWin.document.body.style.margin = "0";
        pipWin.document.body.style.background = "#000";
        pipWin.document.body.appendChild(iframe);
        setMinimized(true);
      } catch (err) {
        console.log("[Orion] PiP fallback — Document PiP not available:", err);
      }
    }
  }, [videoUrl]);

  if (!visible || !videoUrl || isOnNeuralDashboard) return null;

  return (
    {/* ═══ MUSIC BAR MODE (audio-only, video hidden) ═══ */}
    {barMode ? (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="fixed z-[9999] bottom-4 left-1/2 -translate-x-1/2 w-[360px] h-14 rounded-xl overflow-hidden border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl"
      >
        <div className="flex items-center justify-between h-full px-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-[10px]">🎬</span>
            <span className="text-xs font-medium truncate text-foreground/80">{title}</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMuted(!muted)}>
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setBarMode(false); setMinimized(false); }} title="Mostrar vídeo">
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={close}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {/* Hidden iframe keeps audio playing */}
        <iframe
          ref={iframeRef}
          src={`${videoUrl}${videoUrl.includes("?") ? "&" : "?"}${muted ? "mute=1&" : ""}autoplay=1`}
          className="absolute -top-[9999px] w-1 h-1 opacity-0 pointer-events-none"
          allow="autoplay; encrypted-media"
          title="Orion Audio"
        />
      </motion.div>
    ) : (
      /* ═══ NORMAL VIDEO OVERLAY ═══ */
      <motion.div
        initial={{ opacity: 0, scale: 0.7, y: 80, rotateX: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
        exit={{ opacity: 0, scale: 0.7, y: 80, rotateX: 15 }}
        transition={{ type: "spring", damping: 20, stiffness: 250 }}
        className={`fixed z-[9999] overflow-hidden ${
          minimized ? "bottom-4 right-4 w-72 h-14" : "bottom-6 right-6 w-[480px] h-[320px] md:w-[560px] md:h-[360px]"
        }`}
        style={{
          borderRadius: minimized ? "12px" : "16px",
          border: "1px solid rgba(212,175,55,0.3)",
          background: "linear-gradient(145deg, rgba(8,8,20,0.98), rgba(12,8,25,0.98))",
          boxShadow: minimized
            ? "0 4px 20px rgba(0,0,0,0.5), 0 0 15px rgba(212,175,55,0.1)"
            : `0 0 60px rgba(212,175,55,0.15), 0 0 120px rgba(59,130,246,0.08), 0 25px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,175,55,0.25)`,
          perspective: "1200px",
          transition: "width 0.3s, height 0.3s",
        }}
      >
        {/* Holographic shimmer top */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent, #D4AF37, #3B82F6, #D4AF37, transparent)",
            animation: "shimmer 3s ease-in-out infinite",
          }} />

        {/* Light cone effect (only when expanded) */}
        {!minimized && (
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[200%] h-20 pointer-events-none opacity-20"
            style={{
              background: "conic-gradient(from 180deg at 50% 100%, transparent 40%, rgba(212,175,55,0.3) 48%, rgba(59,130,246,0.2) 50%, rgba(212,175,55,0.3) 52%, transparent 60%)",
              filter: "blur(8px)",
            }} />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#D4AF37]/5 to-[#3B82F6]/5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-5 w-5 rounded-full bg-[#D4AF37]/20 flex items-center justify-center"
              style={{ boxShadow: "0 0 10px rgba(212,175,55,0.3)" }}>
              <span className="text-[10px]">🎬</span>
            </div>
            <span className="text-[10px] font-mono font-bold truncate"
              style={{ color: "#D4AF37", textShadow: "0 0 12px rgba(212,175,55,0.5)" }}>
              {minimized ? "ORION" : "ORION PROJECTOR"}
            </span>
            <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{title}</span>
          </div>
          <div className="flex items-center gap-0.5">
            {!minimized && (
              <>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={tryPiP} title="Picture-in-Picture">
                  <PictureInPicture2 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setBarMode(true)} title="Só áudio (barra de música)">
                  <Music className="h-3 w-3" />
                </Button>
              </>
            )}
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

        {/* Video */}
        {!minimized && (
          <div className="relative w-full" style={{ height: "calc(100% - 40px)" }}>
            <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,175,55,0.1) 2px, rgba(212,175,55,0.1) 4px)",
              }} />
            <div className="absolute top-1 left-1 w-5 h-5 border-l-2 border-t-2 z-10 pointer-events-none"
              style={{ borderColor: "rgba(212,175,55,0.5)", animation: "pulse 2s ease-in-out infinite" }} />
            <div className="absolute top-1 right-1 w-5 h-5 border-r-2 border-t-2 z-10 pointer-events-none"
              style={{ borderColor: "rgba(212,175,55,0.5)", animation: "pulse 2s ease-in-out infinite 0.5s" }} />
            <div className="absolute bottom-1 left-1 w-5 h-5 border-l-2 border-b-2 z-10 pointer-events-none"
              style={{ borderColor: "rgba(59,130,246,0.5)", animation: "pulse 2s ease-in-out infinite 1s" }} />
            <div className="absolute bottom-1 right-1 w-5 h-5 border-r-2 border-b-2 z-10 pointer-events-none"
              style={{ borderColor: "rgba(59,130,246,0.5)", animation: "pulse 2s ease-in-out infinite 1.5s" }} />
            <div className="absolute inset-0 pointer-events-none z-10 rounded-b-lg"
              style={{
                boxShadow: "inset 0 0 30px rgba(212,175,55,0.05), inset 0 0 60px rgba(59,130,246,0.03)",
              }} />
            <iframe
              ref={iframeRef}
              src={`${videoUrl}${videoUrl.includes("?") ? "&" : "?"}${muted ? "mute=1&" : ""}autoplay=1`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Orion Video Projector"
            />
          </div>
        )}

        {minimized && (
          <div className="flex items-center gap-2 px-3 py-1 cursor-pointer" onClick={() => setMinimized(false)}>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] truncate text-muted-foreground">{title}</span>
          </div>
        )}

        {/* Bottom glow */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent, #3B82F6, #D4AF37, #3B82F6, transparent)",
            animation: "shimmer 3s ease-in-out infinite reverse",
          }} />

        <style>{`
          @keyframes shimmer {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
      </motion.div>
    )}
    </AnimatePresence>
  );
}

function convertToEmbed(url: string): string {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?enablejsapi=1`;
  if (url.includes("/embed")) return url.includes("?") ? url : `${url}?enablejsapi=1`;
  return url;
}
