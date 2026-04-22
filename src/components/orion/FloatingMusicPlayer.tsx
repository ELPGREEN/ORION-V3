import { useState, useRef, useEffect, useCallback } from "react";
import { X, Volume2, Volume1, VolumeX, Minimize2, Maximize2, ExternalLink, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { isMobileDevice, openYouTube, openSpotify } from "@/lib/utils/deep-link";
import {
  OrionEvents,
  dispatchOrionEvent,
  type OrionMusicCommandDetail,
  type OrionMusicPlayerShowDetail,
  type OrionSpeakingDetail,
  type OrionVolumeCommandDetail,
} from "@/lib/events/orion-events";

const STORAGE_KEY = "orion-music-player-prefs";

interface PlayerPrefs {
  volume: number;
  muted: boolean;
  minimized: boolean;
  /** Whether the player was open last session — restored on reload/route change */
  visible: boolean;
  lastQuery?: string;
}

const DEFAULT_PREFS: PlayerPrefs = {
  volume: 70,
  muted: false,
  minimized: false,
  visible: false,
};

function loadPrefs(): PlayerPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        volume: typeof parsed.volume === "number" ? parsed.volume : DEFAULT_PREFS.volume,
        muted: !!parsed.muted,
        minimized: !!parsed.minimized,
        visible: !!parsed.visible,
        lastQuery: typeof parsed.lastQuery === "string" ? parsed.lastQuery : undefined,
      };
    }
  } catch {}
  return { ...DEFAULT_PREFS };
}

function savePrefs(prefs: Partial<PlayerPrefs>) {
  try {
    const current = loadPrefs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {}
}

export function FloatingMusicPlayer() {
  const initial = loadPrefs();
  // Restore visibility + query from last session so reload / route change keeps the player open
  const [visible, setVisible] = useState(initial.visible && !!initial.lastQuery);
  const [query, setQuery] = useState(initial.visible && initial.lastQuery ? initial.lastQuery : "");
  const [muted, setMuted] = useState(initial.muted);
  const [volume, setVolume] = useState(initial.volume);
  const [minimized, setMinimized] = useState(initial.minimized);
  const [showFallbackButton, setShowFallbackButton] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fallbackTimerRef = useRef<number | null>(null);

  // Persist all UI prefs that should survive reload + route change
  useEffect(() => { savePrefs({ volume }); }, [volume]);
  useEffect(() => { savePrefs({ muted }); }, [muted]);
  useEffect(() => { savePrefs({ minimized }); }, [minimized]);
  useEffect(() => { savePrefs({ visible }); }, [visible]);
  useEffect(() => { if (query) savePrefs({ lastQuery: query }); }, [query]);

  // Listen for music commands from Orion (single source of truth)
  useEffect(() => {
    const showPlayer = (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      if (isMobileDevice()) {
        openYouTube(trimmed, true);
        return;
      }
      // Persist immediately so reload / route change can restore exact state
      savePrefs({ lastQuery: trimmed, visible: true });
      setQuery(trimmed);
      setVisible(true);
      // Reopening should respect the user's last minimized choice but never start hidden
      setShowFallbackButton(false);
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };

    const handler = (e: CustomEvent<OrionMusicCommandDetail>) => {
      const { action, query: q } = e.detail;
      if (action === "search_and_play" && q) {
        showPlayer(q);
      } else if (action === "stop" || action === "pause") {
        setVisible(false);
        savePrefs({ visible: false });
      }
    };

    // Explicit "show" event — triggered by fallback button or external code.
    // Always falls back to the persisted lastQuery so reopening restores playback.
    const showHandler = (e: CustomEvent<OrionMusicPlayerShowDetail>) => {
      const persisted = loadPrefs();
      const q = e.detail?.query || query || persisted.lastQuery || "";
      if (q) showPlayer(q);
    };

    // Speech-driven fallback: when Orion says "tocando", show button if player not visible after 1.2s
    const speakingHandler = (e: CustomEvent<OrionSpeakingDetail>) => {
      const text = (e.detail?.text || "").toLowerCase();
      if (/\btocando\b|\breproduzindo\b|\bcolocando\s+(?:a\s+)?m[uú]sica\b/.test(text)) {
        if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = window.setTimeout(() => {
          setVisible(prev => {
            if (!prev) setShowFallbackButton(true);
            return prev;
          });
        }, 1200);
      }
    };

    window.addEventListener(OrionEvents.MusicCommand, handler as EventListener);
    window.addEventListener(OrionEvents.MusicPlayerShow, showHandler as EventListener);
    window.addEventListener(OrionEvents.Speaking, speakingHandler as EventListener);
    return () => {
      window.removeEventListener(OrionEvents.MusicCommand, handler as EventListener);
      window.removeEventListener(OrionEvents.MusicPlayerShow, showHandler as EventListener);
      window.removeEventListener(OrionEvents.Speaking, speakingHandler as EventListener);
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
    };
  }, [query]);

  // Listen for volume commands
  useEffect(() => {
    const handler = (e: CustomEvent<OrionVolumeCommandDetail>) => {
      const { action, value } = e.detail || ({} as OrionVolumeCommandDetail);
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
    window.addEventListener(OrionEvents.VolumeCommand, handler as EventListener);
    return () => window.removeEventListener(OrionEvents.VolumeCommand, handler as EventListener);
  }, [volume]);

  const close = useCallback(() => {
    setVisible(false);
    setQuery("");
    setShowFallbackButton(false);
  }, []);

  const handleVolumeChange = useCallback((val: number[]) => {
    const v = val[0];
    setVolume(v);
    setMuted(v === 0);
  }, []);

  const openFromFallback = useCallback(() => {
    const q = query || loadPrefs().lastQuery || "";
    if (q) {
      dispatchOrionEvent(OrionEvents.MusicPlayerShow, { query: q });
    }
    setShowFallbackButton(false);
  }, [query]);

  const embedUrl = query
    ? `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1${muted || volume === 0 ? "&mute=1" : ""}`
    : "";

  // Fallback "Open Player" button when Orion announces playback but player didn't open
  if (showFallbackButton && !visible) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="fixed bottom-4 right-4 z-[9999]"
      >
        <Button
          onClick={openFromFallback}
          className="shadow-2xl bg-gradient-to-r from-red-500 to-primary text-primary-foreground gap-2 rounded-full px-5 py-6"
        >
          <Music className="h-4 w-4" />
          Abrir player
        </Button>
      </motion.div>
    );
  }

  if (!visible || !query) return null;

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
