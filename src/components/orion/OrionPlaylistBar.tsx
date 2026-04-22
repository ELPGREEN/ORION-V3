/**
 * Orion Playlist Bar — Dedicated YouTube IFrame Player controller.
 * YouTube is the only supported platform (Spotify/Amazon removed).
 *
 * Features:
 *   • Singleton: only one instance is alive across Dashboard + RedeNeural
 *   • Persistent floating YouTube IFrame embed (search-based playlist)
 *   • Search → instant embed playback
 *   • Play / pause / next / previous / mute via YouTube IFrame postMessage API
 *   • Restores last query from localStorage
 *   • Reacts to `orion-music-command` events (Orion voice / fallback button)
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Music, Search, Play, Pause, SkipBack, SkipForward,
  Volume2, Volume1, VolumeX, Loader2, X, Youtube, Minimize2, Maximize2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  OrionEvents,
  type OrionMusicCommandDetail,
  type OrionVolumeCommandDetail,
  type OrionMusicResolvedDetail,
} from "@/lib/events/orion-events";

// ── Singleton guard ─────────────────────────────────────────────
const ORION_PLAYLIST_MOUNT_KEY = "__orionPlaylistBarMounted__";
const STORAGE_KEY = "orion_yt_player_state";

interface PersistedState {
  query: string;
  volume: number;
  muted: boolean;
  minimized: boolean;
  visible: boolean;
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  // Backwards-compat: pull last query from old resolver key
  try {
    const old = localStorage.getItem("orion_last_music_resolved");
    if (old) {
      const parsed = JSON.parse(old) as OrionMusicResolvedDetail;
      if (parsed?.query) return { ...DEFAULT_STATE, query: parsed.query };
    }
  } catch { /* ignore */ }
  return DEFAULT_STATE;
}

const DEFAULT_STATE: PersistedState = {
  query: "",
  volume: 70,
  muted: false,
  minimized: false,
  visible: true,
};

function saveState(partial: Partial<PersistedState>) {
  try {
    const current = loadState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
  } catch { /* ignore */ }
}

export function OrionPlaylistBar() {
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    const w = window as unknown as Record<string, number>;
    const current = w[ORION_PLAYLIST_MOUNT_KEY] || 0;
    if (current === 0) {
      w[ORION_PLAYLIST_MOUNT_KEY] = 1;
      setIsPrimary(true);
    } else {
      w[ORION_PLAYLIST_MOUNT_KEY] = current + 1;
      console.warn("[OrionPlaylistBar] Duplicate instance detected — rendering null");
    }
    return () => {
      const v = (w[ORION_PLAYLIST_MOUNT_KEY] || 1) - 1;
      w[ORION_PLAYLIST_MOUNT_KEY] = Math.max(0, v);
    };
  }, []);

  const initial = loadState();
  const [query, setQuery] = useState<string>(initial.query);
  const [activeQuery, setActiveQuery] = useState<string>(initial.query);
  const [volume, setVolume] = useState(initial.volume);
  const [muted, setMuted] = useState(initial.muted);
  const [barVisible, setBarVisible] = useState(initial.visible);
  const [minimized, setMinimized] = useState(initial.minimized);
  const [playing, setPlaying] = useState(false);
  const [embedLoading, setEmbedLoading] = useState(false);
  const ytIframeRef = useRef<HTMLIFrameElement>(null);

  // ── Persist whenever state changes ───────────────────────────
  useEffect(() => { saveState({ query: activeQuery }); }, [activeQuery]);
  useEffect(() => { saveState({ volume }); }, [volume]);
  useEffect(() => { saveState({ muted }); }, [muted]);
  useEffect(() => { saveState({ visible: barVisible }); }, [barVisible]);
  useEffect(() => { saveState({ minimized }); }, [minimized]);

  // ── YouTube IFrame postMessage helpers ───────────────────────
  const sendCommand = useCallback(
    (func: "playVideo" | "pauseVideo" | "nextVideo" | "previousVideo" | "mute" | "unMute" | "setVolume", args: unknown[] = []) => {
      ytIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "https://www.youtube.com",
      );
    },
    [],
  );

  const playMusic = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setActiveQuery(trimmed);
    setQuery(trimmed);
    setBarVisible(true);
    setMinimized(false);
    setEmbedLoading(true);
    setPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (!activeQuery) return;
    if (playing) {
      sendCommand("pauseVideo");
      setPlaying(false);
    } else {
      sendCommand("playVideo");
      setPlaying(true);
    }
  }, [activeQuery, playing, sendCommand]);

  const handleNext = useCallback(() => sendCommand("nextVideo"), [sendCommand]);
  const handlePrev = useCallback(() => sendCommand("previousVideo"), [sendCommand]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    sendCommand(next ? "mute" : "unMute");
  }, [muted, sendCommand]);

  const handleVolumeChange = useCallback((val: number[]) => {
    const v = val[0];
    setVolume(v);
    setMuted(v === 0);
    sendCommand("setVolume", [v]);
    if (v > 0 && muted) sendCommand("unMute");
  }, [muted, sendCommand]);

  // ── Listen for Orion music commands ──────────────────────────
  useEffect(() => {
    const handler = (e: CustomEvent<OrionMusicCommandDetail>) => {
      const { action, query: q } = e.detail || ({} as OrionMusicCommandDetail);
      switch (action) {
        case "search_and_play":
          if (q) playMusic(q);
          break;
        case "pause":
          if (playing) togglePlay();
          break;
        case "resume":
        case "play":
          if (!playing && activeQuery) togglePlay();
          break;
        case "next":
          handleNext();
          break;
        case "prev":
        case "previous":
          handlePrev();
          break;
        case "stop":
          sendCommand("pauseVideo");
          setPlaying(false);
          break;
      }
    };
    window.addEventListener(OrionEvents.MusicCommand, handler as EventListener);
    return () => window.removeEventListener(OrionEvents.MusicCommand, handler as EventListener);
  }, [playMusic, playing, activeQuery, togglePlay, handleNext, handlePrev, sendCommand]);

  // ── Listen for Orion volume commands ─────────────────────────
  useEffect(() => {
    const handler = (e: CustomEvent<OrionVolumeCommandDetail>) => {
      const { action, value } = e.detail || ({} as OrionVolumeCommandDetail);
      let newVol = volume;
      switch (action) {
        case "up": newVol = Math.min(100, volume + 15); break;
        case "down": newVol = Math.max(0, volume - 15); break;
        case "set": newVol = Math.max(0, Math.min(100, value ?? 50)); break;
        case "mute":
          setMuted(true);
          sendCommand("mute");
          return;
        case "unmute":
          setMuted(false);
          sendCommand("unMute");
          return;
      }
      setVolume(newVol);
      setMuted(newVol === 0);
      sendCommand("setVolume", [newVol]);
    };
    window.addEventListener(OrionEvents.VolumeCommand, handler as EventListener);
    return () => window.removeEventListener(OrionEvents.VolumeCommand, handler as EventListener);
  }, [volume, sendCommand]);

  const embedUrl = activeQuery
    ? `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(activeQuery)}&autoplay=1&enablejsapi=1${muted ? "&mute=1" : ""}`
    : "";

  // ── Singleton enforcement ────────────────────────────────────
  if (!isPrimary) return null;

  // ── Closed (collapsed pill) ──────────────────────────────────
  if (!barVisible) {
    return (
      <div className="relative z-10 flex justify-center py-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-3 text-[9px] gap-1 text-muted-foreground hover:text-primary"
          onClick={() => setBarVisible(true)}
        >
          <Music className="h-3 w-3" />
          Abrir Player
        </Button>
      </div>
    );
  }

  return (
    <div className="relative z-10">
      {/* ─── Floating YouTube embed (persistent) ─── */}
      {activeQuery && (
        <div
          className={`fixed z-[9998] rounded-lg overflow-hidden border border-primary/20 transition-all ${
            minimized
              ? "bottom-20 right-6 w-[240px] h-[44px]"
              : "bottom-20 right-6 w-[360px] h-[200px]"
          }`}
          style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.15)" }}
        >
          {!minimized ? (
            <>
              {embedLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              )}
              <iframe
                ref={ytIframeRef}
                src={embedUrl}
                onLoad={() => setEmbedLoading(false)}
                className="w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Orion YouTube Player"
              />
            </>
          ) : (
            <div
              className="w-full h-full flex items-center gap-2 px-3 bg-background/90 cursor-pointer"
              onClick={() => setMinimized(false)}
            >
              <Youtube className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-[10px] truncate flex-1 text-foreground/80">{activeQuery}</span>
            </div>
          )}
          <div className="absolute top-1 right-1 z-20 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-background/70 hover:bg-background/90"
              onClick={() => setMinimized((m) => !m)}
              title={minimized ? "Expandir" : "Minimizar"}
            >
              {minimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Control bar ─── */}
      <div
        className="rounded-lg border border-primary/20 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(var(--card) / 0.9), hsl(var(--background) / 0.95))",
          boxShadow: "0 0 20px hsl(var(--primary) / 0.06), inset 0 1px 0 hsl(var(--primary) / 0.12)",
        }}
      >
        <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center">
              <Youtube className="h-3.5 w-3.5 text-red-500" />
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest hidden sm:inline text-primary">
              YOUTUBE PLAYER
            </span>
          </div>

          {activeQuery && (
            <div className="flex items-center gap-2 min-w-0 shrink hidden md:flex">
              <span className="text-[10px] text-foreground/80 truncate">{activeQuery}</span>
            </div>
          )}

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrev}
              disabled={!activeQuery}
              title="Anterior"
            >
              <SkipBack className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              style={{ backgroundColor: playing ? "hsl(var(--primary) / 0.15)" : "transparent" }}
              onClick={togglePlay}
              disabled={!activeQuery}
            >
              {playing ? <Pause className="h-3.5 w-3.5 text-primary" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNext}
              disabled={!activeQuery}
              title="Próxima"
            >
              <SkipForward className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMute} title={muted ? "Ativar som" : "Silenciar"}>
              {muted || volume === 0 ? <VolumeX className="h-3 w-3" /> : volume < 50 ? <Volume1 className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </Button>
            <div className="w-16 hidden sm:block">
              <Slider
                value={[muted ? 0 : volume]}
                min={0}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="h-5"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 flex-1 min-w-0 max-w-xs ml-auto">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && playMusic(query)}
              placeholder="Buscar no YouTube..."
              className="h-7 text-[10px] bg-background/50 border-border/30 focus:border-primary/40 placeholder:text-muted-foreground/40"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => playMusic(query)}
              disabled={!query.trim()}
              title="Tocar"
            >
              <Search className="h-3 w-3" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 hover:text-destructive"
            onClick={() => setBarVisible(false)}
            title="Fechar player"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
