/**
 * Orion Video Overlay — Holographic 3D Projector + Auto-minimize + Drag
 * Opens YouTube/videos as if Orion is projecting with a futuristic projector.
 * Auto-minimizes when video starts playing. Supports PiP via browser API.
 * X button minimizes (does not destroy). Draggable with mouse.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { X, Maximize2, Minimize2, Volume2, VolumeX, PictureInPicture2, Music, Fullscreen, Shrink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  buildYouTubeSearchEmbed,
  clampPercent,
  normalizeYouTubeEmbedUrl,
  postYouTubeIframeCommand,
} from "@/lib/youtube-player";

interface VideoCommand {
  action: string;
  url?: string;
  query?: string;
  title?: string;
  value?: number;
}

export function VideoOverlay() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [minimized, setMinimized] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [barMode, setBarMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Drag state ───
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elX: number; elY: number } | null>(null);

  const isOnNeuralDashboard = /\/dashboard\/rede-neural/i.test(location.pathname);

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

  // ─── Drag handlers ───
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, iframe, input")) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elX: rect.left,
      elY: rect.top,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = ev.clientX - dragStartRef.current.mouseX;
      const dy = ev.clientY - dragStartRef.current.mouseY;
      setDragPos({
        x: dragStartRef.current.elX + dx,
        y: dragStartRef.current.elY + dy,
      });
    };

    const onUp = () => {
      dragStartRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const openFullscreen = useCallback(() => {
    setMinimized(false);
    setBarMode(false);
    window.setTimeout(() => {
      const el = containerRef.current;
      if (el && document.fullscreenElement !== el) {
        el.requestFullscreen().catch(() => {});
      }
    }, 120);
  }, []);

  const restoreFromFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setMinimized(false);
    setBarMode(false);
  }, []);

  const minimizeVideo = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setMinimized(true);
    setBarMode(false);
  }, []);

  const moveToBar = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setBarMode(true);
    setMinimized(false);
  }, []);

  // X button = minimize, not close
  const handleXButton = useCallback(() => {
    minimizeVideo();
  }, [minimizeVideo]);

  // Real close (hold shift + click X, or from minimized bar)
  const realClose = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setVisible(false);
    setVideoUrl("");
    setTitle("");
    setMinimized(false);
    setBarMode(false);
    setDragPos(null);
  }, []);

  // ─── Fullscreen ───
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) {
      document.exitFullscreen().catch(() => {});
    } else {
      openFullscreen();
    }
  }, [openFullscreen]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!visible || !videoUrl) return;
    const timer = window.setTimeout(syncPlayerState, 350);
    return () => window.clearTimeout(timer);
  }, [barMode, minimized, syncPlayerState, videoUrl, visible]);

  // ─── Event handler ───
  useEffect(() => {
    const handler = (e: CustomEvent<VideoCommand>) => {
      const { action, url, query, title: nextTitle, value } = e.detail;
      console.log("[VideoOverlay] Received command:", action, "url:", url, "query:", query, "value:", value);

      if (action === "play_video" && url) {
        setVideoUrl(normalizeYouTubeEmbedUrl(url));
        setTitle(nextTitle || query || "Orion Video");
        setVisible(true);
        setMinimized(false);
        setBarMode(false);
      } else if (action === "search_video" && query) {
        setVideoUrl(buildYouTubeSearchEmbed(query));
        setTitle(nextTitle || query);
        setVisible(true);
        setMinimized(false);
        setBarMode(false);
      } else if (action === "pause" || action === "stop") {
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
      } else if (action === "close") {
        realClose();
      } else if (action === "maximize" || action === "fullscreen" || action === "aumentar_tela") {
        openFullscreen();
      } else if (action === "diminuir_tela") {
        restoreFromFullscreen();
      } else if (action === "minimize") {
        minimizeVideo();
      } else if (action === "minimize_to_bar") {
        moveToBar();
      }
    };

    window.addEventListener("orion-video-command", handler as EventListener);
    return () => window.removeEventListener("orion-video-command", handler as EventListener);
  }, [applyVolume, moveToBar, minimizeVideo, openFullscreen, realClose, restoreFromFullscreen, sendPlayerCommand, volume]);

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

  const tryPiP = useCallback(async () => {
    if ("documentPictureInPicture" in window) {
      try {
        const pipWin = await (window as any).documentPictureInPicture.requestWindow({
          width: 480,
          height: 320,
        });
        const iframe = document.createElement("iframe");
        iframe.src = videoUrl;
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        pipWin.document.body.style.margin = "0";
        pipWin.document.body.style.background = "#000";
        pipWin.document.body.appendChild(iframe);
        setMinimized(true);
      } catch (err) {
        console.log("[Orion] PiP fallback:", err);
      }
    }
  }, [videoUrl]);

  if (!visible || !videoUrl || isOnNeuralDashboard) return null;

  // Position style for dragging
  const posStyle: React.CSSProperties = dragPos
    ? { left: dragPos.x, top: dragPos.y, right: "auto", bottom: "auto" }
    : {};

  return (
    <AnimatePresence>
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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMute}>
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setBarMode(false); setMinimized(false); }} title="Mostrar vídeo">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={realClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {/* Hidden iframe keeps audio playing */}
          <iframe
            ref={iframeRef}
            src={videoUrl}
            onLoad={syncPlayerState}
            className="absolute -top-[9999px] w-1 h-1 opacity-0 pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            title="Orion Audio"
          />
        </motion.div>
      ) : (
        /* ═══ NORMAL VIDEO OVERLAY ═══ */
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.7, y: 80, rotateX: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 80, rotateX: 15 }}
          transition={{ type: "spring", damping: 20, stiffness: 250 }}
          onMouseDown={onDragStart}
          className={`fixed z-[9999] overflow-hidden ${
            isFullscreen
              ? "inset-0 w-full h-full"
              : minimized
                ? "bottom-4 right-4 w-72 h-14"
                : "bottom-6 right-6 w-[480px] h-[320px] md:w-[560px] md:h-[360px]"
          }`}
          style={{
            ...posStyle,
            borderRadius: isFullscreen ? 0 : minimized ? "12px" : "16px",
            border: isFullscreen ? "none" : "1px solid rgba(212,175,55,0.3)",
            background: "linear-gradient(145deg, rgba(8,8,20,0.98), rgba(12,8,25,0.98))",
            boxShadow: isFullscreen ? "none" : minimized
              ? "0 4px 20px rgba(0,0,0,0.5), 0 0 15px rgba(212,175,55,0.1)"
              : "0 0 60px rgba(212,175,55,0.15), 0 0 120px rgba(59,130,246,0.08), 0 25px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(212,175,55,0.25)",
            cursor: isFullscreen ? "default" : "grab",
            transition: "width 0.3s, height 0.3s",
          }}
        >
          {/* Holographic shimmer top */}
          {!isFullscreen && (
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background: "linear-gradient(90deg, transparent, #D4AF37, #3B82F6, #D4AF37, transparent)",
                animation: "shimmer 3s ease-in-out infinite",
              }} />
          )}

          {/* Light cone effect (only when expanded, not fullscreen) */}
          {!minimized && !isFullscreen && (
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[200%] h-20 pointer-events-none opacity-20"
              style={{
                background: "conic-gradient(from 180deg at 50% 100%, transparent 40%, rgba(212,175,55,0.3) 48%, rgba(59,130,246,0.2) 50%, rgba(212,175,55,0.3) 52%, transparent 60%)",
                filter: "blur(8px)",
              }} />
          )}

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#D4AF37]/5 to-[#3B82F6]/5 border-b border-white/[0.06]"
            style={{ cursor: "grab" }}>
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
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleFullscreen} title={isFullscreen ? "Sair tela cheia" : "Tela cheia"}>
                    {isFullscreen ? <Shrink className="h-3 w-3" /> : <Fullscreen className="h-3 w-3" />}
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={moveToBar} title="Só áudio (barra de música)">
                <Music className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleMute}>
                {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(!minimized)}>
                {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              {/* X = minimize (not destroy) */}
              <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={handleXButton} title="Minimizar vídeo">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Video */}
          {!minimized && (
            <div className="relative w-full" style={{ height: "calc(100% - 40px)" }}>
              {/* Floating action buttons over video */}
              <div className="absolute top-2 right-2 z-20 flex gap-1">
                <button
                  onClick={toggleFullscreen}
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-black/70 hover:bg-black/90 border border-white/20 text-white transition-all hover:scale-110"
                  title={isFullscreen ? "Sair tela cheia" : "Tela cheia"}
                >
                  {isFullscreen ? <Shrink className="h-4 w-4" /> : <Fullscreen className="h-4 w-4" />}
                </button>
                <button
                  onClick={moveToBar}
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-black/70 hover:bg-black/90 border border-white/20 text-white transition-all hover:scale-110"
                  title="Só áudio (minimizar para barra)"
                >
                  <Music className="h-4 w-4" />
                </button>
                <button
                  onClick={minimizeVideo}
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-black/70 hover:bg-black/90 border border-white/20 text-white transition-all hover:scale-110"
                  title="Minimizar"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleXButton}
                  className="h-8 w-8 rounded-full flex items-center justify-center bg-black/70 hover:bg-red-600/90 border border-white/20 text-white transition-all hover:scale-110"
                  title="Minimizar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!isFullscreen && (
                <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
                  style={{
                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,175,55,0.1) 2px, rgba(212,175,55,0.1) 4px)",
                  }} />
              )}
              <iframe
                ref={iframeRef}
                src={videoUrl}
                onLoad={syncPlayerState}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                title="Orion Video Projector"
              />
            </div>
          )}

          {minimized && (
            <div className="flex items-center gap-2 px-3 py-1 cursor-pointer" onClick={() => setMinimized(false)}>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] truncate text-muted-foreground flex-1">{title}</span>
              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive shrink-0" onClick={(e) => { e.stopPropagation(); realClose(); }} title="Fechar vídeo">
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Bottom glow */}
          {!isFullscreen && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px]"
              style={{
                background: "linear-gradient(90deg, transparent, #3B82F6, #D4AF37, #3B82F6, transparent)",
                animation: "shimmer 3s ease-in-out infinite reverse",
              }} />
          )}

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
