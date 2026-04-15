import { useState, useRef, useEffect, useCallback } from "react";
import { X, Volume2, Volume1, VolumeX, Minimize2, Maximize2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { isMobileDevice, openYouTube, openSpotify } from "@/lib/utils/deep-link";
import { useLocation } from "react-router-dom";

interface MusicCommand {
  action: string;
  query: string;
  fullCommand: string;
}

export function FloatingMusicPlayer() {
  const location = useLocation();
  const isOnNeuralPage = location.pathname === "/dashboard/rede-neural";
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const [minimized, setMinimized] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for music commands from Orion (skip on neural page — OrionPlaylistBar handles it there)
  useEffect(() => {
    const handler = (e: CustomEvent<MusicCommand>) => {
      if (isOnNeuralPage) return;
      const { action, query: q } = e.detail;
      if (action === "search_and_play" && q) {
        if (isMobileDevice()) {
          openYouTube(q.trim(), true);
          return;
        }
        setQuery(q.trim());
        setVisible(true);
        setMinimized(false);
      } else if (action === "stop" || action === "pause") {
        setVisible(false);
      }
    };
    window.addEventListener("orion-music-command", handler as EventListener);
    return () => window.removeEventListener("orion-music-command", handler as EventListener);
  }, [isOnNeuralPage]);

  // Listen for volume commands
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { action, value } = e.detail || {};
      let newVol = volume;
      switch (action) {
        case "up": newVol = Math.min(100, volume + 15); break;
        case "down": newVol = Math.max(0, volume - 15); break;
        case "set": newVol = Math.max(0, Math.min(100, value ?? 50)); break;
        case "mute": setMuted(true); return;
        case "unmute": setMuted(false); return;
      }
      setVolume(newVol);
      setMuted(newVol === 0);
    };
    window.addEventListener("orion-volume-command", handler as EventListener);
    return () => window.removeEventListener("orion-volume-command", handler as EventListener);
  }, [volume]);

  const close = useCallback(() => {
    setVisible(false);
    setQuery("");
  }, []);

  const handleVolumeChange = useCallback((val: number[]) => {
    const v = val[0];
    setVolume(v);
    setMuted(v === 0);
  }, []);

  const embedUrl = query
    ? `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1${muted || volume === 0 ? "&mute=1" : ""}`
    : "";

  if (!visible || !query || isOnNeuralPage) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 80, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 80, scale: 0.9 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className={`fixed z-[9999] shadow-2xl rounded-xl overflow-hidden border border-border/50 bg-background/95 backdrop-blur-xl ${
          minimized
            ? "bottom-4 right-4 w-72 h-14"
            : "bottom-4 right-4 w-[380px] h-[280px]"
        }`}
        style={{ transition: "width 0.3s, height 0.3s" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-red-500/10 to-primary/10 border-b border-border/30">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">🎵</span>
            <span className="text-xs font-medium truncate text-foreground/80">
              {query}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => openSpotify(query)}
              title="Abrir no Spotify"
            >
              <ExternalLink className="h-3 w-3 text-green-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => { setMuted(!muted); }}
            >
              {muted || volume === 0 ? <VolumeX className="h-3 w-3" /> : volume < 50 ? <Volume1 className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </Button>
            <div className="w-14">
              <Slider value={[muted ? 0 : volume]} min={0} max={100} step={1} onValueChange={handleVolumeChange} className="h-5" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setMinimized(!minimized)}
            >
              {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-destructive"
              onClick={close}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Video */}
        {!minimized && (
          <div className="relative w-full" style={{ height: "calc(100% - 40px)" }}>
            <iframe
              ref={iframeRef}
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="YouTube Music Player"
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}