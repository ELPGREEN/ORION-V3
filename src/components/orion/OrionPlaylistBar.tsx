/**
 * Orion Playlist Bar — Horizontal music player at top of Neural Panel
 * Uses Spotify Web Playback SDK for Premium users (full tracks),
 * falls back to 30s preview + YouTube embed for non-Premium
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Music, Search, Play, Pause, SkipBack, SkipForward,
  Volume2, Volume1, VolumeX, Loader2, ListMusic, X, Youtube, Zap,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  OrionEvents,
  type OrionMusicCommandDetail,
  type OrionVolumeCommandDetail,
  type OrionMusicResolvedDetail,
  type ResolvedMusicPlatform,
} from "@/lib/events/orion-events";
import { toast } from "sonner";
import { searchSpotify, getSpotifyFriendlyError, getSpotifySdkToken } from "@/lib/spotify/spotify-service";
import { searchYTMusicPublic, type YTMusicTrack } from "@/lib/youtube-music/youtube-music-service";
import { useSpotifyPlayback } from "@/hooks/useSpotifyPlayback";

interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
  preview_url?: string | null;
  external_urls?: { spotify?: string };
}

interface UnifiedTrack {
  id: string;
  name: string;
  artist: string;
  thumbnail: string;
  duration_ms: number;
  source: "spotify" | "youtube";
  preview_url?: string | null;
  videoId?: string;
  external_url?: string;
  spotifyUri?: string;
}

function spotifyToUnified(t: SpotifyTrack): UnifiedTrack {
  return {
    id: `sp_${t.id}`, name: t.name, artist: t.artists.map(a => a.name).join(", "),
    thumbnail: t.album.images?.[t.album.images.length > 1 ? 1 : 0]?.url || "",
    duration_ms: t.duration_ms, source: "spotify", preview_url: t.preview_url,
    external_url: t.external_urls?.spotify, spotifyUri: t.uri,
  };
}

function ytToUnified(t: YTMusicTrack): UnifiedTrack {
  return {
    id: `yt_${t.videoId}`, name: t.title, artist: t.artist,
    thumbnail: t.thumbnail, duration_ms: 0, source: "youtube",
    videoId: t.videoId,
  };
}

// ── Singleton guard ─────────────────────────────────────────────
// Multiple OrionPlaylistBar instances would duplicate playback when an
// `orion-music-command` event is dispatched (each instance reacts).
// We mark the window when the first instance mounts; subsequent instances
// render `null` so only ONE bar is alive across Dashboard + RedeNeural.
const ORION_PLAYLIST_MOUNT_KEY = "__orionPlaylistBarMounted__";

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
      console.warn("[OrionPlaylistBar] Duplicate instance detected — rendering null to enforce singleton");
    }
    return () => {
      const v = (w[ORION_PLAYLIST_MOUNT_KEY] || 1) - 1;
      w[ORION_PLAYLIST_MOUNT_KEY] = Math.max(0, v);
    };
  }, []);

  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<UnifiedTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<UnifiedTrack | null>(null);
  const [isPlayingLocal, setIsPlayingLocal] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [ytEmbedVisible, setYtEmbedVisible] = useState(false);
  const [ytEmbedMinimized, setYtEmbedMinimized] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [useSDK, setUseSDK] = useState(false);
  const [barVisible, setBarVisible] = useState(true);
  const [resolvedInfo, setResolvedInfo] = useState<OrionMusicResolvedDetail | null>(() => {
    // Restore last resolved music decision so the widget reflects the latest
    // platform/query immediately on reopen — without waiting for a new event.
    try {
      const raw = localStorage.getItem("orion_last_music_resolved");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as OrionMusicResolvedDetail;
      return parsed && parsed.query && parsed.resolved ? parsed : null;
    } catch { return null; }
  });
  const [playbackMode, setPlaybackMode] = useState<"spotify-sdk" | "audio-preview" | "youtube" | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const ytIframeRef = useRef<HTMLIFrameElement>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();

  const sdk = useSpotifyPlayback(useSDK ? spotifyToken : null);

  useEffect(() => {
    let cancelled = false;

    getSpotifySdkToken()
      .then((data) => {
        if (cancelled) return;
        if (data.access_token && data.can_sdk) {
          setSpotifyToken(data.access_token);
          setUseSDK(true);
          return;
        }
        setSpotifyToken(null);
        setUseSDK(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSpotifyToken(null);
        setUseSDK(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!useSDK || !sdk.error) return;
    if (/auth|premium|conta|conectar/i.test(sdk.error)) {
      setUseSDK(false);
      setSpotifyToken(null);
    }
  }, [sdk.error, useSDK]);

  const isSpotifySdkPlayback = playbackMode === "spotify-sdk";
  const isPlaying = isSpotifySdkPlayback ? sdk.isPlaying : isPlayingLocal;
  const sdkProgress = sdk.currentTrack && sdk.currentTrack.durationMs > 0
    ? (sdk.positionMs / sdk.currentTrack.durationMs) * 100
    : 0;

  const sendYouTubeCommand = useCallback((command: "playVideo" | "pauseVideo") => {
    ytIframeRef.current?.contentWindow?.postMessage(JSON.stringify({
      event: "command",
      func: command,
      args: [],
    }), "https://www.youtube.com");
  }, []);

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    setLoading(true);
    try {
      const results: UnifiedTrack[] = [];

      try {
        const data = await searchSpotify(q, "track", 10);
        const items = data?.tracks?.items || [];
        results.push(...items.map(spotifyToUnified));
      } catch (e: any) {
        console.warn("[OrionPlaylist] Spotify search failed:", e.message);
      }

      try {
        const ytTracks = await searchYTMusicPublic(q);
        results.push(...ytTracks.map(ytToUnified));
      } catch (e: any) {
        console.warn("[OrionPlaylist] YouTube search failed:", e.message);
      }

      setTracks(results);
      setExpanded(true);
      if (results.length === 0) toast.info("Nenhuma faixa encontrada");
    } catch {
      toast.error("Erro na busca");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const playPreview = useCallback((track: UnifiedTrack) => {
    setCurrentTrack(track);
    setPlaybackMode("audio-preview");
    setIsPlayingLocal(true);
    setProgress(0);
    setYtEmbedVisible(false);

    const audio = audioRef.current;
    if (audio && track.preview_url) {
      clearInterval(progressInterval.current);
      audio.src = track.preview_url;
      audio.volume = volume / 100;
      audio.muted = muted;
      audio.play().catch(() => {
        toast.error("Erro ao reproduzir");
        setIsPlayingLocal(false);
      });
      progressInterval.current = setInterval(() => {
        if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
      }, 200);
    }
  }, [muted, volume]);

  const playTrack = useCallback(async (track: UnifiedTrack) => {
    if (audioRef.current) {
      audioRef.current.pause();
      clearInterval(progressInterval.current);
    }
    if (ytEmbedVisible) sendYouTubeCommand("pauseVideo");
    setYtEmbedVisible(false);
    setYtEmbedMinimized(false);
    setPlaybackMode(null);

    if (track.source === "spotify" && track.spotifyUri && useSDK && sdk.isReady && sdk.isPremium) {
      setCurrentTrack(track);
      const success = await sdk.playTrack(track.spotifyUri);
      if (success) {
        setPlaybackMode("spotify-sdk");
        setIsPlayingLocal(true);
        setProgress(0);
      } else {
        playPreview(track);
      }
    } else if (track.source === "spotify" && track.preview_url) {
      playPreview(track);
    } else if (track.source === "youtube" && track.videoId) {
      setCurrentTrack(track);
      setPlaybackMode("youtube");
      setIsPlayingLocal(true);
      setProgress(0);
      setYtEmbedVisible(true);
      setYtEmbedMinimized(false);
    } else if (track.external_url) {
      window.open(track.external_url, "_blank");
      toast.info("Preview indisponível — abrindo externamente");
      return;
    } else {
      toast.error("Faixa sem preview disponível");
      return;
    }

    window.dispatchEvent(new CustomEvent("orion-music-playing", {
      detail: { track: track.name, artist: track.artist }
    }));
  }, [ytEmbedVisible, sendYouTubeCommand, useSDK, sdk.isReady, sdk.isPremium, sdk.playTrack, playPreview]);

  const togglePlayPause = useCallback(async () => {
    if (!currentTrack || !playbackMode) return;

    if (playbackMode === "spotify-sdk") {
      await sdk.togglePlay();
      return;
    }

    if (playbackMode === "audio-preview") {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlayingLocal) {
        audio.pause();
        setIsPlayingLocal(false);
      } else {
        audio.play().catch(() => {});
        setIsPlayingLocal(true);
      }
      return;
    }

    if (!ytEmbedVisible) {
      setYtEmbedVisible(true);
      setYtEmbedMinimized(false);
      setIsPlayingLocal(true);
      return;
    }

    if (ytEmbedMinimized) {
      setYtEmbedMinimized(false);
      window.setTimeout(() => sendYouTubeCommand("playVideo"), 120);
      setIsPlayingLocal(true);
      return;
    }

    if (isPlayingLocal) {
      sendYouTubeCommand("pauseVideo");
      setIsPlayingLocal(false);
    } else {
      sendYouTubeCommand("playVideo");
      setIsPlayingLocal(true);
    }
  }, [currentTrack, playbackMode, sdk.togglePlay, isPlayingLocal, ytEmbedVisible, sendYouTubeCommand]);

  const playNext = useCallback(async () => {
    if (!currentTrack || tracks.length === 0) return;
    const idx = tracks.findIndex(t => t.id === currentTrack.id);
    const next = tracks[(idx + 1) % tracks.length];
    if (next) playTrack(next);
  }, [currentTrack, tracks, playTrack]);

  const playPrev = useCallback(async () => {
    if (!currentTrack || tracks.length === 0) return;
    const idx = tracks.findIndex(t => t.id === currentTrack.id);
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
    if (prev) playTrack(prev);
  }, [currentTrack, tracks, playTrack]);

  const toggleMute = useCallback(() => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (audioRef.current) audioRef.current.muted = newMuted;
    if (useSDK && sdk.isReady) {
      sdk.changeVolume(newMuted ? 0 : volume / 100);
    }
  }, [muted, volume, useSDK, sdk.isReady, sdk.changeVolume]);

  const handleVolumeChange = useCallback((val: number[]) => {
    const v = val[0];
    setVolume(v);
    if (v === 0) {
      setMuted(true);
    } else if (muted) {
      setMuted(false);
    }
    if (audioRef.current) {
      audioRef.current.volume = v / 100;
      audioRef.current.muted = v === 0;
    }
    if (useSDK && sdk.isReady) {
      sdk.changeVolume(v / 100);
    }
  }, [muted, useSDK, sdk.isReady, sdk.changeVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      setIsPlayingLocal(false);
      setProgress(0);
      clearInterval(progressInterval.current);
      playNext();
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [playNext]);

  useEffect(() => {
    const handler = (e: CustomEvent<OrionMusicCommandDetail>) => {
      const { action, query: q } = e.detail || ({} as OrionMusicCommandDetail);
      switch (action) {
        case "search_and_play":
          if (q) {
            setQuery(q);
            (async () => {
              setLoading(true);
              try {
                const results: UnifiedTrack[] = [];
                try {
                  const data = await searchSpotify(q, "track", 10);
                  results.push(...(data?.tracks?.items || []).map(spotifyToUnified));
                } catch {}
                try {
                  const ytTracks = await searchYTMusicPublic(q);
                  results.push(...ytTracks.map(ytToUnified));
                } catch {}
                setTracks(results);
                setExpanded(true);
                const playable = results.find(t => t.preview_url || t.videoId || t.spotifyUri);
                if (playable) setTimeout(() => playTrack(playable), 300);
              } finally {
                setLoading(false);
              }
            })();
          }
          break;
        case "pause":
          if (isPlaying) togglePlayPause();
          break;
        case "resume":
        case "play":
          if (!isPlaying && currentTrack) togglePlayPause();
          break;
        case "next":
          playNext();
          break;
        case "prev":
        case "previous":
          playPrev();
          break;
      }
    };
    window.addEventListener(OrionEvents.MusicCommand, handler as EventListener);
    return () => window.removeEventListener(OrionEvents.MusicCommand, handler as EventListener);
  }, [playTrack, isPlaying, togglePlayPause, playNext, playPrev, currentTrack]);

  useEffect(() => {
    const handler = (e: CustomEvent<OrionVolumeCommandDetail>) => {
      const { action, value } = e.detail || ({} as OrionVolumeCommandDetail);
      let newVol = volume;
      switch (action) {
        case "up":
          newVol = Math.min(100, volume + 15);
          break;
        case "down":
          newVol = Math.max(0, volume - 15);
          break;
        case "set":
          newVol = Math.max(0, Math.min(100, value ?? 50));
          break;
        case "mute":
          setMuted(true);
          if (audioRef.current) audioRef.current.muted = true;
          if (useSDK && sdk.isReady) sdk.changeVolume(0);
          return;
        case "unmute":
          setMuted(false);
          if (audioRef.current) audioRef.current.muted = false;
          if (useSDK && sdk.isReady) sdk.changeVolume(volume / 100);
          return;
      }
      setVolume(newVol);
      setMuted(newVol === 0);
      if (audioRef.current) {
        audioRef.current.volume = newVol / 100;
        audioRef.current.muted = newVol === 0;
      }
      if (useSDK && sdk.isReady) sdk.changeVolume(newVol / 100);
    };
    window.addEventListener(OrionEvents.VolumeCommand, handler as EventListener);
    return () => window.removeEventListener(OrionEvents.VolumeCommand, handler as EventListener);
  }, [volume, useSDK, sdk.isReady, sdk.changeVolume]);

  const formatMs = (ms: number) => {
    if (!ms) return "";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const displayTrack = isSpotifySdkPlayback && sdk.currentTrack ? {
    name: sdk.currentTrack.name,
    artist: sdk.currentTrack.artists.join(", "),
    thumbnail: sdk.currentTrack.albumArt,
    source: "spotify" as const,
  } : currentTrack ? {
    name: currentTrack.name,
    artist: currentTrack.artist,
    thumbnail: currentTrack.thumbnail,
    source: currentTrack.source,
  } : null;

  const displayProgress = isSpotifySdkPlayback ? sdkProgress : progress;

  // Singleton enforcement — render nothing if another instance is already mounted
  if (!isPrimary) return null;

  if (!barVisible) {
    return (
      <div className="relative z-10 flex justify-center py-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-3 text-[9px] gap-1 text-muted-foreground hover:text-[#D4AF37]"
          onClick={() => setBarVisible(true)}
        >
          <Music className="h-3 w-3" />
          Abrir Playlist
        </Button>
      </div>
    );
  }

  return (
    <div className="relative z-10">
      <audio ref={audioRef} preload="none" />

      {sdk.needsActivation && (
        <div className="mb-1 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
          <Zap className="h-3 w-3 text-amber-400" />
          <span className="text-[9px] text-amber-300">Toque para ativar o player</span>
          <Button variant="ghost" size="sm" className="h-5 px-2 text-[9px] text-amber-400"
            onClick={() => sdk.activateElement()}>
            Ativar
          </Button>
        </div>
      )}

      {ytEmbedVisible && currentTrack?.videoId && (
        <div className={`fixed z-[9998] rounded-lg overflow-hidden border border-[#D4AF37]/20 ${
          ytEmbedMinimized ? "bottom-20 right-6 w-[220px] h-[44px]" : "bottom-20 right-6 w-[320px] h-[180px]"
        }`}
          style={{ boxShadow: "0 0 30px rgba(212,175,55,0.1)" }}>
          {!ytEmbedMinimized ? (
            <iframe
              ref={ytIframeRef}
              src={`https://www.youtube.com/embed/${currentTrack.videoId}?enablejsapi=1&autoplay=1&${muted ? "mute=1&" : ""}rel=0`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="Orion Music Player"
            />
          ) : (
            <div className="w-full h-full flex items-center gap-2 px-3 bg-black/80 cursor-pointer" onClick={() => setYtEmbedMinimized(false)}>
              <Youtube className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-[10px] text-white/80 truncate flex-1">{currentTrack.name}</span>
            </div>
          )}
          <Button variant="ghost" size="icon"
            className="absolute top-1 right-1 h-6 w-6 bg-black/60 hover:bg-black/80 z-10"
            onClick={() => {
              if (!ytEmbedMinimized) {
                sendYouTubeCommand("pauseVideo");
              }
              setYtEmbedMinimized(true);
              setIsPlayingLocal(false);
            }}
            title="Minimizar vídeo">
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div
        className="rounded-lg border overflow-hidden"
        style={{
          borderColor: "rgba(212,175,55,0.2)",
          background: "linear-gradient(135deg, rgba(10,10,15,0.9) 0%, rgba(15,10,25,0.9) 100%)",
          boxShadow: "0 0 20px rgba(212,175,55,0.06), inset 0 1px 0 rgba(212,175,55,0.12)",
        }}
      >
        <div className="h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-6 w-6 rounded-md bg-[#D4AF37]/15 flex items-center justify-center">
              <ListMusic className="h-3.5 w-3.5" style={{ color: "#D4AF37" }} />
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest hidden sm:inline"
              style={{ color: "#D4AF37", textShadow: "0 0 10px rgba(212,175,55,0.4)" }}>
              PLAYLIST ORION
            </span>
            {useSDK && sdk.isReady && (
              <Badge variant="outline" className="text-[7px] px-1 py-0 border-green-500/30 text-green-400">SDK</Badge>
            )}
          </div>

          {displayTrack && (
            <div className="flex items-center gap-2 min-w-0 shrink">
              {displayTrack.thumbnail && (
                <img src={displayTrack.thumbnail} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
              )}
              <div className="min-w-0 hidden md:block">
                <p className="text-[10px] font-medium truncate text-foreground/80">{displayTrack.name}</p>
                <p className="text-[8px] text-muted-foreground truncate">{displayTrack.artist}</p>
              </div>
              {displayTrack.source === "youtube" && (
                <Youtube className="h-3 w-3 text-red-500 shrink-0" />
              )}
            </div>
          )}

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={playPrev}
              disabled={!currentTrack || (isSpotifySdkPlayback && sdk.disallows?.skipping_prev)}
            >
              <SkipBack className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              style={{ backgroundColor: isPlaying ? "rgba(212,175,55,0.15)" : "transparent" }}
              onClick={currentTrack ? togglePlayPause : undefined}
              disabled={!currentTrack || !playbackMode || (isSpotifySdkPlayback && (isPlaying ? sdk.disallows?.pausing : sdk.disallows?.resuming))}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" style={{ color: "#D4AF37" }} /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={playNext}
              disabled={!currentTrack || (isSpotifySdkPlayback && sdk.disallows?.skipping_next)}
            >
              <SkipForward className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMute}>
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

          {(currentTrack || (isSpotifySdkPlayback && sdk.currentTrack)) && (
            <div className="flex-1 max-w-[120px] hidden lg:block">
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${displayProgress}%`, background: "linear-gradient(90deg, #D4AF37, #3B82F6)" }} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 flex-1 min-w-0 max-w-xs ml-auto">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Buscar música..."
              className="h-7 text-[10px] bg-white/5 border-white/10 focus:border-[#D4AF37]/30 placeholder:text-white/20"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleSearch()} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            </Button>
          </div>

          {tracks.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setExpanded(!expanded)}>
              {expanded ? <X className="h-3 w-3" /> : <ListMusic className="h-3 w-3" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:text-destructive" onClick={() => { setBarVisible(false); setExpanded(false); }} title="Fechar playlist">
            <X className="h-3 w-3" />
          </Button>
        </div>

        {expanded && tracks.length > 0 && (
          <div className="border-t border-white/5">
            <ScrollArea className="h-[180px]">
              <div className="divide-y divide-white/[0.03]">
                {tracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors text-left ${
                      currentTrack?.id === track.id ? "bg-[#D4AF37]/5" : ""
                    }`}
                  >
                    {track.thumbnail ? (
                      <img src={track.thumbnail} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                        <Music className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium truncate text-foreground/80">
                        {currentTrack?.id === track.id && isPlaying && <span className="inline-block mr-1">🔊</span>}
                        {track.name}
                      </p>
                      <p className="text-[8px] text-muted-foreground truncate">{track.artist}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className={`text-[7px] px-1 py-0 ${
                        track.source === "youtube" ? "border-red-500/30 text-red-400" : "border-green-500/30 text-green-400"
                      }`}>
                        {track.source === "youtube" ? "YT" : "SP"}
                      </Badge>
                      {track.duration_ms > 0 && (
                        <span className="text-[8px] text-muted-foreground font-mono">{formatMs(track.duration_ms)}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
