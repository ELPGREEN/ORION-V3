import { useState, useRef, useEffect, useCallback } from "react";
import { X, Volume2, Volume1, VolumeX, Minimize2, Maximize2, ExternalLink, Music, Loader2, Play, Pause, SkipBack, SkipForward, Youtube, ListMusic, Mic, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { isMobileDevice, openYouTube } from "@/lib/utils/deep-link";
import {
  OrionEvents,
  dispatchOrionEvent,
  type OrionMusicCommandDetail,
  type OrionMusicPlayerShowDetail,
  type OrionSpeakingDetail,
  type OrionVolumeCommandDetail,
  type OrionMusicResolvedDetail,
  type OrionMusicWidgetCommandDetail,
} from "@/lib/events/orion-events";
import { postYouTubeIframeCommand } from "@/lib/youtube-player";

const STORAGE_KEY = "orion-music-player-prefs";
const FLOATING_MOUNT_KEY = "__orionFloatingMusicPlayerMounted__";
const YT_ORIGIN = "https://www.youtube.com";

interface PlayerPrefs {
  volume: number;
  muted: boolean;
  minimized: boolean;
  /** Whether the player was open last session — restored on reload/route change */
  visible: boolean;
  lastQuery?: string;
  lastVideoId?: string;
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
        lastVideoId: typeof parsed.lastVideoId === "string" ? parsed.lastVideoId : undefined,
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

function buildYouTubeEmbedUrl(videoId: string, muted: boolean) {
  const url = new URL(`https://www.youtube.com/embed/${videoId}`);
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("enablejsapi", "1");
  if (typeof window !== "undefined" && window.location.origin) {
    url.searchParams.set("origin", window.location.origin);
  }
  if (muted) {
    url.searchParams.set("mute", "1");
  }
  return url.toString();
}

export type YouTubeCategory = "music" | "video" | "podcast";

export interface YouTubeSearchItem {
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string | null;
  publishedAt: string | null;
  category?: string;
}

async function searchYouTube(query: string, category: YouTubeCategory, maxResults = 5): Promise<YouTubeSearchItem[]> {
  const { data, error } = await supabase.functions.invoke("google-api-bridge", {
    body: {
      action: "youtube_search",
      params: { query, maxResults, category },
    },
  });

  if (error) throw error;

  const list: YouTubeSearchItem[] = Array.isArray(data?.videos) ? data.videos : [];
  const valid = list.filter((v) => typeof v.videoId === "string" && /^[\w-]{11}$/.test(v.videoId));
  if (valid.length === 0) throw new Error("Nenhum resultado válido encontrado");
  return valid;
}

function inferCategoryFromCommand(text?: string): YouTubeCategory {
  const normalized = (text || "").toLowerCase();
  if (/\b(podcast|podcasts|epis[oó]dio|entrevista)\b/.test(normalized)) return "podcast";
  if (/\b(v[ií]deo|video|filme|movie|trailer|assistir|ver|document[aá]rio|clipe)\b/.test(normalized)) return "video";
  return "music";
}

export function FloatingMusicPlayer() {
  // Singleton guard — only the first instance renders, prevents duplicates across routes
  const [isPrimary, setIsPrimary] = useState(false);
  useEffect(() => {
    const w = window as unknown as Record<string, number>;
    const current = w[FLOATING_MOUNT_KEY] || 0;
    if (current === 0) {
      w[FLOATING_MOUNT_KEY] = 1;
      setIsPrimary(true);
    } else {
      w[FLOATING_MOUNT_KEY] = current + 1;
    }
    return () => {
      const v = (w[FLOATING_MOUNT_KEY] || 1) - 1;
      w[FLOATING_MOUNT_KEY] = Math.max(0, v);
    };
  }, []);

  const initial = loadPrefs();
  // Keep the last media context, but only show the widget when Orion explicitly invokes it.
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState(initial.lastQuery ?? "");
  const [videoId, setVideoId] = useState(initial.lastVideoId ?? "");
  const [muted, setMuted] = useState(initial.muted);
  const [volume, setVolume] = useState(initial.volume);
  const [minimized, setMinimized] = useState(initial.minimized);
  const [showFallbackButton, setShowFallbackButton] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [resolvedPlatform, setResolvedPlatform] = useState<string>("YouTube");
  const [category, setCategory] = useState<YouTubeCategory>("music");
  const [results, setResults] = useState<YouTubeSearchItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const volumeCommandTimerRef = useRef<number | null>(null);
  const resolveRequestRef = useRef(0);

  // Persist all UI prefs that should survive reload + route change
  useEffect(() => { savePrefs({ volume }); }, [volume]);
  useEffect(() => { savePrefs({ muted }); }, [muted]);
  useEffect(() => { savePrefs({ minimized }); }, [minimized]);
  useEffect(() => { savePrefs({ visible }); }, [visible]);
  useEffect(() => { if (query) savePrefs({ lastQuery: query }); }, [query]);
  useEffect(() => { if (videoId) savePrefs({ lastVideoId: videoId }); }, [videoId]);

  // Listen for music commands from Orion (single source of truth)
  useEffect(() => {
    const showPlayer = async (q: string, cat: YouTubeCategory = category) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      if (isMobileDevice()) {
        openYouTube(trimmed, true);
        return;
      }
      const requestId = ++resolveRequestRef.current;
      setQuery(trimmed);
      setVideoId("");
      setVisible(true);
      setMinimized(false);
      setEmbedLoading(true);
      setResolvedPlatform(cat === "music" ? "YouTube · Música" : cat === "podcast" ? "YouTube · Podcast" : "YouTube · Vídeo");
      savePrefs({ lastQuery: trimmed, visible: true, minimized: false });
      setShowFallbackButton(false);
      setResults([]);
      setShowResults(false);
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }

      try {
        const items = await searchYouTube(trimmed, cat, 5);
        if (requestId !== resolveRequestRef.current) return;
        setResults(items);
        setShowResults(items.length > 1);
        const first = items[0];
        setVideoId(first.videoId);
        setPlaying(true);
        savePrefs({ lastQuery: trimmed, lastVideoId: first.videoId, visible: true, minimized: false });
      } catch (error) {
        if (requestId !== resolveRequestRef.current) return;
        console.error("[FloatingMusicPlayer] failed to resolve YouTube video:", error);
        setShowFallbackButton(true);
      } finally {
        if (requestId === resolveRequestRef.current) {
          setEmbedLoading(false);
          setFallbackLoading(false);
        }
      }
    };

    const handler = (e: CustomEvent<OrionMusicCommandDetail>) => {
      const { action, query: q, fullCommand } = e.detail;
      if (action === "search_and_play" && q) {
        showPlayer(q, inferCategoryFromCommand(fullCommand || q));
      } else if (action === "pause") {
        postYouTubeIframeCommand(iframeRef.current, "pauseVideo");
        setPlaying(false);
      } else if (action === "play" || action === "resume") {
        setVisible(true);
        postYouTubeIframeCommand(iframeRef.current, "playVideo");
        setPlaying(true);
      } else if (action === "next") {
        postYouTubeIframeCommand(iframeRef.current, "nextVideo");
      } else if (action === "prev" || action === "previous") {
        postYouTubeIframeCommand(iframeRef.current, "previousVideo");
      } else if (action === "stop") {
        postYouTubeIframeCommand(iframeRef.current, "pauseVideo");
        setPlaying(false);
      }
    };

    const showHandler = (e: CustomEvent<OrionMusicPlayerShowDetail>) => {
      const q = e.detail?.query || query || loadPrefs().lastQuery || "";
      if (q) showPlayer(q);
    };

    const widgetHandler = (e: CustomEvent<OrionMusicWidgetCommandDetail>) => {
      const action = e.detail?.action;
      if (action === "minimize") setMinimized(true);
      else if (action === "maximize") setMinimized(false);
      else if (action === "toggle") setMinimized((prev) => !prev);
      setVisible(true);
    };

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
    window.addEventListener(OrionEvents.MusicWidgetCommand, widgetHandler as EventListener);
    window.addEventListener(OrionEvents.Speaking, speakingHandler as EventListener);
    return () => {
      window.removeEventListener(OrionEvents.MusicCommand, handler as EventListener);
      window.removeEventListener(OrionEvents.MusicPlayerShow, showHandler as EventListener);
      window.removeEventListener(OrionEvents.MusicWidgetCommand, widgetHandler as EventListener);
      window.removeEventListener(OrionEvents.Speaking, speakingHandler as EventListener);
      if (fallbackTimerRef.current) window.clearTimeout(fallbackTimerRef.current);
    };
  }, [query]);

  // Listen for volume commands
  useEffect(() => {
    const handler = (e: CustomEvent<OrionVolumeCommandDetail>) => {
      if (volumeCommandTimerRef.current) {
        window.clearTimeout(volumeCommandTimerRef.current);
      }
      volumeCommandTimerRef.current = window.setTimeout(() => {
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
      }, 120);
    };
    window.addEventListener(OrionEvents.VolumeCommand, handler as EventListener);
    return () => {
      if (volumeCommandTimerRef.current) window.clearTimeout(volumeCommandTimerRef.current);
      window.removeEventListener(OrionEvents.VolumeCommand, handler as EventListener);
    };
  }, [volume]);

  // ── YouTube IFrame state sync (postMessage) ──────────────────
  // After iframe loads, we tell YouTube we're listening so it sends back state events.
  useEffect(() => {
    if (!videoId) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== YT_ORIGIN) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        // YT state codes: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
        if (data?.event === "onStateChange" || data?.event === "infoDelivery") {
          const state = data?.info?.playerState ?? data?.info;
          if (state === 1) setPlaying(true);
          else if (state === 2 || state === 0) setPlaying(false);
        }
      } catch { /* ignore non-JSON messages */ }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [videoId]);

  // Listen for resolver hints (shows "requested → resolved" platform in header)
  useEffect(() => {
    const handler = (e: CustomEvent<OrionMusicResolvedDetail>) => {
      const detail = e.detail;
      if (!detail) return;
      const label = detail.fallback && detail.requested
        ? `${detail.requested} → ${detail.resolved}`
        : detail.resolved.charAt(0).toUpperCase() + detail.resolved.slice(1);
      setResolvedPlatform(label);
    };
    window.addEventListener(OrionEvents.MusicResolved, handler as EventListener);
    return () => window.removeEventListener(OrionEvents.MusicResolved, handler as EventListener);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setQuery("");
    setVideoId("");
    setShowFallbackButton(false);
    setShowResults(false);
    setResults([]);
  }, []);

  // Re-run the current query under a different category (used by Música/Vídeos/Podcasts chips)
  const runSearch = useCallback(async (cat: YouTubeCategory, q?: string) => {
    const target = (q ?? query).trim();
    if (!target) return;
    setCategory(cat);
    const requestId = ++resolveRequestRef.current;
    setEmbedLoading(true);
    setVideoId("");
    setResolvedPlatform(cat === "music" ? "YouTube · Música" : cat === "podcast" ? "YouTube · Podcast" : "YouTube · Vídeo");
    try {
      const items = await searchYouTube(target, cat, 5);
      if (requestId !== resolveRequestRef.current) return;
      setResults(items);
      setShowResults(true);
      setVideoId(items[0].videoId);
      setPlaying(true);
      savePrefs({ lastQuery: target, lastVideoId: items[0].videoId });
    } catch (err) {
      if (requestId !== resolveRequestRef.current) return;
      console.error("[FloatingMusicPlayer] runSearch failed:", err);
      setShowFallbackButton(true);
    } finally {
      if (requestId === resolveRequestRef.current) setEmbedLoading(false);
    }
  }, [query]);

  const playFromList = useCallback((item: YouTubeSearchItem) => {
    setVideoId(item.videoId);
    setPlaying(true);
    setShowResults(false);
    savePrefs({ lastVideoId: item.videoId });
  }, []);

  const handleVolumeChange = useCallback((val: number[]) => {
    const v = val[0];
    setVolume(v);
    setMuted(v === 0);
    postYouTubeIframeCommand(iframeRef.current, "setVolume", [v]);
    if (v > 0) postYouTubeIframeCommand(iframeRef.current, "unMute");
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoId) return;
    if (playing) {
      postYouTubeIframeCommand(iframeRef.current, "pauseVideo");
      setPlaying(false);
    } else {
      postYouTubeIframeCommand(iframeRef.current, "playVideo");
      setPlaying(true);
    }
  }, [playing, videoId]);

  const handleNext = useCallback(() => {
    postYouTubeIframeCommand(iframeRef.current, "nextVideo");
  }, []);

  const handlePrev = useCallback(() => {
    postYouTubeIframeCommand(iframeRef.current, "previousVideo");
  }, []);

  // Sync mute state to iframe
  useEffect(() => {
    if (!videoId) return;
    postYouTubeIframeCommand(iframeRef.current, muted ? "mute" : "unMute");
    if (!muted && volume > 0) {
      postYouTubeIframeCommand(iframeRef.current, "setVolume", [volume]);
    }
  }, [muted, videoId, volume]);

  const openFromFallback = useCallback(() => {
    if (fallbackLoading) return;
    const q = query || loadPrefs().lastQuery || "";
    if (!q) {
      setShowFallbackButton(false);
      return;
    }
    setFallbackLoading(true);
    dispatchOrionEvent(OrionEvents.MusicPlayerShow, { query: q });
    // Re-enable after embed has had time to mount (safety net even if iframe.onLoad never fires)
    window.setTimeout(() => setFallbackLoading(false), 3000);
  }, [query, fallbackLoading]);

  const embedUrl = videoId
    ? buildYouTubeEmbedUrl(videoId, muted || volume === 0)
    : "";

  // Singleton: extra instances render nothing (prevents duplicate players across routes)
  if (!isPrimary) return null;

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
            : showResults
              ? "bottom-4 right-4 w-[380px] h-[460px]"
              : "bottom-4 right-4 w-[380px] h-[320px]"
        }`}
        style={{ transition: "width 0.3s, height 0.3s" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-red-500/10 to-primary/10 border-b border-border/30">
          <div className="flex items-center gap-2 min-w-0">
            <Youtube className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span className="text-xs font-medium truncate text-foreground/80">
              {query}
            </span>
            <span
              className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0"
              title="Plataforma resolvida"
            >
              {resolvedPlatform}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handlePrev}
              disabled={!videoId}
              title="Anterior"
            >
              <SkipBack className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full transition-colors"
              style={{ backgroundColor: playing ? "hsl(var(--primary) / 0.18)" : "transparent" }}
              onClick={togglePlay}
              disabled={!videoId}
              title={playing ? "Pausar" : "Tocar"}
              aria-pressed={playing}
            >
              {playing ? <Pause className="h-3 w-3 text-primary" /> : <Play className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleNext}
              disabled={!videoId}
              title="Próxima"
            >
              <SkipForward className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => openYouTube(videoId ? `https://www.youtube.com/watch?v=${videoId}` : query)}
              title="Abrir no YouTube"
            >
              <ExternalLink className="h-3 w-3 text-red-500" />
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

        {/* Category chips */}
        {!minimized && (
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/30 bg-muted/30">
            {([
              { key: "music", label: "Música", Icon: Music },
              { key: "video", label: "Vídeos", Icon: Film },
              { key: "podcast", label: "Podcasts", Icon: Mic },
            ] as const).map(({ key, label, Icon }) => (
              <Button
                key={key}
                variant={category === key ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[10px] gap-1"
                onClick={() => runSearch(key)}
                disabled={!query || embedLoading}
                aria-pressed={category === key}
              >
                <Icon className="h-3 w-3" />
                {label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 ml-auto text-[10px] gap-1"
              onClick={() => setShowResults((p) => !p)}
              disabled={results.length === 0}
              title="Lista de resultados"
            >
              <ListMusic className="h-3 w-3" />
              {results.length > 0 ? `${results.length}` : "—"}
            </Button>
          </div>
        )}

        {/* Manual playlist (top 5) */}
        {!minimized && showResults && results.length > 0 && (
          <div className="max-h-[140px] overflow-y-auto border-b border-border/30 bg-background/60">
            {results.map((item, idx) => (
              <button
                key={item.videoId}
                onClick={() => playFromList(item)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 text-left text-[11px] hover:bg-accent/40 transition-colors ${
                  item.videoId === videoId ? "bg-primary/10" : ""
                }`}
              >
                <span className="w-4 text-muted-foreground">{idx + 1}</span>
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" className="h-8 w-12 object-cover rounded" loading="lazy" />
                ) : (
                  <div className="h-8 w-12 rounded bg-muted" />
                )}
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-foreground/90">{item.title}</span>
                  <span className="block truncate text-muted-foreground text-[10px]">{item.channelName}</span>
                </span>
                {item.videoId === videoId && <Play className="h-3 w-3 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {/* Video */}
        <div
          className={minimized ? "absolute bottom-0 right-0 h-px w-px overflow-hidden opacity-0 pointer-events-none" : "relative w-full"}
          style={minimized ? undefined : { height: showResults ? "180px" : "calc(100% - 78px)" }}
          aria-hidden={minimized}
        >
          {!minimized && embedLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs text-foreground/80">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando player...
              </div>
            </div>
          )}
          {videoId ? (
            <iframe
              ref={iframeRef}
              src={embedUrl}
              onLoad={() => {
                setEmbedLoading(false);
                setFallbackLoading(false);
                setPlaying(true);
                try {
                  iframeRef.current?.contentWindow?.postMessage(
                    JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
                    YT_ORIGIN,
                  );
                  postYouTubeIframeCommand(iframeRef.current, "setVolume", [muted ? 0 : volume]);
                } catch {
                  /* ignore */
                }
              }}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="YouTube Music Player"
            />
          ) : !embedLoading && !minimized ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 px-6 text-center text-xs text-muted-foreground">
              Não consegui carregar um vídeo incorporável agora. Use o botão acima para abrir direto no YouTube.
            </div>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
