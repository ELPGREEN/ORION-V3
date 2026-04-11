/**
 * Orion Playlist Bar — Horizontal music player at top of Neural Panel
 * Searches Spotify via client credentials (no login needed), plays preview_url in-app
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Music, Search, Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Loader2, ListMusic, X,
} from "lucide-react";
import { toast } from "sonner";
import { searchSpotify, getSpotifyFriendlyError } from "@/lib/spotify/spotify-service";

interface Track {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
  preview_url?: string | null;
  external_urls?: { spotify?: string };
}

export function OrionPlaylistBar() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();

  // Search
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchSpotify(query, "track", 20);
      const items = data?.tracks?.items || [];
      setTracks(items);
      setExpanded(true);
      if (items.length === 0) toast.info("Nenhuma faixa encontrada");
    } catch (e: any) {
      toast.error(getSpotifyFriendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [query]);

  // Play track using preview_url (30s preview, no login needed)
  const playTrack = useCallback((track: Track) => {
    if (!track.preview_url) {
      // No preview available — open on Spotify
      if (track.external_urls?.spotify) {
        window.open(track.external_urls.spotify, "_blank");
        toast.info("Preview indisponível — abrindo no Spotify");
      } else {
        toast.error("Faixa sem preview disponível");
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      clearInterval(progressInterval.current);
    }

    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);

    const audio = audioRef.current;
    if (audio) {
      audio.src = track.preview_url;
      audio.muted = muted;
      audio.play().catch(() => {
        toast.error("Erro ao reproduzir");
        setIsPlaying(false);
      });

      progressInterval.current = setInterval(() => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      }, 200);
    }

    // Dispatch event for Orion to know
    window.dispatchEvent(new CustomEvent("orion-music-playing", {
      detail: { track: track.name, artist: track.artists[0]?.name }
    }));
  }, [muted]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying, currentTrack]);

  const playNext = useCallback(() => {
    if (!currentTrack || tracks.length === 0) return;
    const idx = tracks.findIndex(t => t.id === currentTrack.id);
    const next = tracks[(idx + 1) % tracks.length];
    if (next) playTrack(next);
  }, [currentTrack, tracks, playTrack]);

  const playPrev = useCallback(() => {
    if (!currentTrack || tracks.length === 0) return;
    const idx = tracks.findIndex(t => t.id === currentTrack.id);
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
    if (prev) playTrack(prev);
  }, [currentTrack, tracks, playTrack]);

  const toggleMute = useCallback(() => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (audioRef.current) audioRef.current.muted = newMuted;
  }, [muted]);

  // Audio ended → play next
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      clearInterval(progressInterval.current);
      playNext();
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [playNext]);

  // Listen for Orion voice commands to search/play
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { action, query: q } = e.detail || {};
      if (action === "search_and_play" && q) {
        setQuery(q);
        // Trigger search
        (async () => {
          setLoading(true);
          try {
            const data = await searchSpotify(q, "track", 20);
            const items = data?.tracks?.items || [];
            setTracks(items);
            setExpanded(true);
            // Auto-play first with preview
            const playable = items.find((t: Track) => t.preview_url);
            if (playable) {
              setTimeout(() => playTrack(playable), 300);
            } else if (items.length > 0) {
              toast.info("Nenhum preview disponível — selecione para abrir no Spotify");
            }
          } catch (e: any) {
            toast.error(getSpotifyFriendlyError(e));
          } finally {
            setLoading(false);
          }
        })();
      }
    };
    window.addEventListener("orion-music-command", handler as EventListener);
    return () => window.removeEventListener("orion-music-command", handler as EventListener);
  }, [playTrack]);

  const albumArt = (t: Track) => t.album.images?.[t.album.images.length > 1 ? 1 : 0]?.url;
  const formatMs = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative z-10">
      <audio ref={audioRef} preload="none" />

      {/* ═══ Playlist Orion Bar ═══ */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          borderColor: "rgba(212,175,55,0.2)",
          background: "linear-gradient(135deg, rgba(10,10,15,0.9) 0%, rgba(15,10,25,0.9) 100%)",
          boxShadow: "0 0 20px rgba(212,175,55,0.06), inset 0 1px 0 rgba(212,175,55,0.12)",
        }}
      >
        {/* Gold accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

        <div className="flex items-center gap-2 px-3 py-2">
          {/* Logo */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-6 w-6 rounded-md bg-[#D4AF37]/15 flex items-center justify-center">
              <ListMusic className="h-3.5 w-3.5" style={{ color: "#D4AF37" }} />
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest hidden sm:inline"
              style={{ color: "#D4AF37", textShadow: "0 0 10px rgba(212,175,55,0.4)" }}>
              PLAYLIST ORION
            </span>
          </div>

          {/* Now Playing */}
          {currentTrack && (
            <div className="flex items-center gap-2 min-w-0 shrink">
              {albumArt(currentTrack) && (
                <img src={albumArt(currentTrack)} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
              )}
              <div className="min-w-0 hidden md:block">
                <p className="text-[10px] font-medium truncate text-foreground/80">{currentTrack.name}</p>
                <p className="text-[8px] text-muted-foreground truncate">{currentTrack.artists.map(a => a.name).join(", ")}</p>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={playPrev} disabled={!currentTrack}>
              <SkipBack className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 rounded-full"
              style={{ backgroundColor: isPlaying ? "rgba(212,175,55,0.15)" : "transparent" }}
              onClick={currentTrack ? togglePlayPause : undefined}
              disabled={!currentTrack}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" style={{ color: "#D4AF37" }} /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={playNext} disabled={!currentTrack}>
              <SkipForward className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMute}>
              {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </Button>
          </div>

          {/* Progress bar */}
          {currentTrack && (
            <div className="flex-1 max-w-[120px] hidden lg:block">
              <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #D4AF37, #3B82F6)" }} />
              </div>
            </div>
          )}

          {/* Search */}
          <div className="flex items-center gap-1 flex-1 min-w-0 max-w-xs ml-auto">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Buscar música..."
              className="h-7 text-[10px] bg-white/5 border-white/10 focus:border-[#D4AF37]/30 placeholder:text-white/20"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            </Button>
          </div>

          {/* Toggle playlist */}
          {tracks.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setExpanded(!expanded)}>
              {expanded ? <X className="h-3 w-3" /> : <Music className="h-3 w-3" />}
            </Button>
          )}
        </div>

        {/* ═══ Track List (expandable) ═══ */}
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
                    {albumArt(track) ? (
                      <img src={albumArt(track)} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                        <Music className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium truncate text-foreground/80">
                        {currentTrack?.id === track.id && isPlaying && (
                          <span className="inline-block mr-1">🔊</span>
                        )}
                        {track.name}
                      </p>
                      <p className="text-[8px] text-muted-foreground truncate">
                        {track.artists.map(a => a.name).join(", ")} · {track.album.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!track.preview_url && (
                        <Badge variant="outline" className="text-[7px] px-1 py-0 border-amber-500/30 text-amber-400">
                          LINK
                        </Badge>
                      )}
                      <span className="text-[8px] text-muted-foreground font-mono">
                        {formatMs(track.duration_ms)}
                      </span>
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
