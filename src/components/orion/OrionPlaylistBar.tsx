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
import { toast } from "sonner";
import { searchSpotify, getSpotifyFriendlyError, isSpotifyConnected } from "@/lib/spotify/spotify-service";
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

export function OrionPlaylistBar() {
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
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [useSDK, setUseSDK] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();

  // Spotify Web Playback SDK
  const sdk = useSpotifyPlayback(useSDK ? spotifyToken : null);

  // Check if Spotify is connected (has token via edge function)
  useEffect(() => {
    isSpotifyConnected().then(connected => {
      if (connected) {
        // Token is managed server-side; we pass a placeholder
        // The actual playback uses the edge function token
        setSpotifyToken("sdk-managed");
        setUseSDK(true);
      }
    }).catch(() => {});
  }, []);

  // Sync SDK state to local state
  const isPlaying = useSDK && sdk.isReady && sdk.currentTrack
    ? sdk.isPlaying
    : isPlayingLocal;

  const sdkProgress = sdk.currentTrack && sdk.currentTrack.durationMs > 0
    ? (sdk.positionMs / sdk.currentTrack.durationMs) * 100
    : 0;

  // Search both Spotify + YouTube
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

  // Play a track — SDK for Spotify Premium, preview/YT fallback
  const playTrack = useCallback(async (track: UnifiedTrack) => {
    // Stop current audio fallback
    if (audioRef.current) {
      audioRef.current.pause();
      clearInterval(progressInterval.current);
    }
    setYtEmbedVisible(false);

    // Try Spotify SDK for full playback (Premium)
    if (track.source === "spotify" && track.spotifyUri && useSDK && sdk.isReady && sdk.isPremium) {
      setCurrentTrack(track);
      const success = await sdk.playTrack(track.spotifyUri);
      if (success) {
        setIsPlayingLocal(true);
        setProgress(0);
      } else {
        // Fallback to preview
        playPreview(track);
      }
    } else if (track.source === "spotify" && track.preview_url) {
      playPreview(track);
    } else if (track.source === "youtube" && track.videoId) {
      setCurrentTrack(track);
      setIsPlayingLocal(true);
      setProgress(0);
      setYtEmbedVisible(true);
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
  }, [muted, useSDK, sdk.isReady, sdk.isPremium, sdk.playTrack]);

  const playPreview = useCallback((track: UnifiedTrack) => {
    setCurrentTrack(track);
    setIsPlayingLocal(true);
    setProgress(0);
    const audio = audioRef.current;
    if (audio && track.preview_url) {
      audio.src = track.preview_url;
      audio.muted = muted;
      audio.play().catch(() => { toast.error("Erro ao reproduzir"); setIsPlayingLocal(false); });
      progressInterval.current = setInterval(() => {
        if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
      }, 200);
    }
  }, [muted]);

  const togglePlayPause = useCallback(async () => {
    if (!currentTrack) return;

    // If using SDK for this track
    if (currentTrack.source === "spotify" && currentTrack.spotifyUri && useSDK && sdk.isReady && sdk.currentTrack) {
      await sdk.togglePlay();
      return;
    }

    if (currentTrack.source === "spotify") {
      const audio = audioRef.current;
      if (!audio) return;
      if (isPlayingLocal) { audio.pause(); setIsPlayingLocal(false); }
      else { audio.play().catch(() => {}); setIsPlayingLocal(true); }
    } else {
      setIsPlayingLocal(!isPlayingLocal);
    }
  }, [isPlayingLocal, currentTrack, useSDK, sdk]);

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
      sdk.changeVolume(newMuted ? 0 : 0.7);
    }
  }, [muted, useSDK, sdk]);

  // Audio ended → play next
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => { setIsPlayingLocal(false); setProgress(0); clearInterval(progressInterval.current); playNext(); };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [playNext]);

  // Listen for Orion voice commands
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { action, query: q } = e.detail || {};
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
              } finally { setLoading(false); }
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
          playPrev();
          break;
      }
    };
    window.addEventListener("orion-music-command", handler as EventListener);
    return () => window.removeEventListener("orion-music-command", handler as EventListener);
  }, [playTrack, isPlaying, togglePlayPause, playNext, playPrev, currentTrack]);

  const formatMs = (ms: number) => {
    if (!ms) return "";
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Determine display track info (SDK or local)
  const displayTrack = (useSDK && sdk.currentTrack) ? {
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

  const displayProgress = (useSDK && sdk.currentTrack) ? sdkProgress : progress;

  return (
    <div className="relative z-10">
      <audio ref={audioRef} preload="none" />

      {/* Activation prompt for mobile autoplay */}
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

      {/* YouTube embed */}
      {ytEmbedVisible && currentTrack?.videoId && (
        <div className="fixed bottom-20 right-6 w-[320px] h-[180px] z-[9998] rounded-lg overflow-hidden border border-[#D4AF37]/20"
          style={{ boxShadow: "0 0 30px rgba(212,175,55,0.1)" }}>
          <iframe
            src={`https://www.youtube.com/embed/${currentTrack.videoId}?autoplay=1&${muted ? "mute=1&" : ""}rel=0`}
            className="w-full h-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Orion Music Player"
          />
          <Button variant="ghost" size="icon"
            className="absolute top-1 right-1 h-6 w-6 bg-black/60 hover:bg-black/80 z-10"
            onClick={() => { setYtEmbedVisible(false); setIsPlayingLocal(false); }}>
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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={playPrev}
              disabled={!currentTrack || sdk.disallows?.skipping_prev}>
              <SkipBack className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-8 w-8 rounded-full"
              style={{ backgroundColor: isPlaying ? "rgba(212,175,55,0.15)" : "transparent" }}
              onClick={currentTrack ? togglePlayPause : undefined}
              disabled={!currentTrack || (isPlaying ? sdk.disallows?.pausing : sdk.disallows?.resuming)}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" style={{ color: "#D4AF37" }} /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={playNext}
              disabled={!currentTrack || sdk.disallows?.skipping_next}>
              <SkipForward className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMute}>
              {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </Button>
          </div>

          {(currentTrack || sdk.currentTrack) && (
            <div className="flex-1 max-w-[120px] hidden lg:block">
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${displayProgress}%`, background: "linear-gradient(90deg, #D4AF37, #3B82F6)" }} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-1 flex-1 min-w-0 max-w-xs ml-auto">
            <Input
              value={query} onChange={e => setQuery(e.target.value)}
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
              {expanded ? <X className="h-3 w-3" /> : <Music className="h-3 w-3" />}
            </Button>
          )}
        </div>

        {expanded && tracks.length > 0 && (
          <div className="border-t border-white/5">
            <ScrollArea className="h-[180px]">
              <div className="divide-y divide-white/[0.03]">
                {tracks.map((track) => (
                  <button
                    key={track.id} onClick={() => playTrack(track)}
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
