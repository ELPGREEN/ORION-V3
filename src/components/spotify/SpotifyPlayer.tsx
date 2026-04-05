import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  Search, Disc3, Sparkles, LogIn, LogOut, Radio, Heart,
  Headphones, Zap, Moon, Brain, Palette, CloudRain, ExternalLink, Wifi, WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  isSpotifyConnected, startSpotifyLogin, disconnectSpotify,
  searchSpotify, getMoodRecommendations,
  getTopTracks, getRecentlyPlayed,
  type OrionMood, getSpotifyFriendlyError,
} from "@/lib/spotify/spotify-service";
import { useSpotifyPlayback } from "@/hooks/useSpotifyPlayback";

const MOODS: { id: OrionMood; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "focus", label: "Foco", icon: <Brain className="h-3 w-3" />, color: "text-cyan-400" },
  { id: "relax", label: "Relaxar", icon: <Moon className="h-3 w-3" />, color: "text-indigo-400" },
  { id: "energy", label: "Energia", icon: <Zap className="h-3 w-3" />, color: "text-amber-400" },
  { id: "melancholy", label: "Melancolia", icon: <CloudRain className="h-3 w-3" />, color: "text-blue-400" },
  { id: "creative", label: "Criativo", icon: <Palette className="h-3 w-3" />, color: "text-purple-400" },
  { id: "ambient", label: "Ambiente", icon: <Headphones className="h-3 w-3" />, color: "text-emerald-400" },
];

interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  artists: { name: string; id: string }[];
  album: {
    name: string;
    images: { url: string; width: number }[];
  };
  duration_ms: number;
  preview_url?: string;
  external_urls?: { spotify?: string };
}

export function SpotifyPlayer() {
  const [connected, setConnected] = useState(false);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState<OrionMood | null>(null);
  const [tab, setTab] = useState<"mood" | "search" | "top" | "recent">("mood");

  // Get access token for SDK — no longer in localStorage, SDK needs separate handling
  const accessToken = null; // SDK token now managed server-side
  
  // Web Playback SDK
  const sdk = useSpotifyPlayback(accessToken);

  useEffect(() => {
    const check = async () => setConnected(await isSpotifyConnected());
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const data = await searchSpotify(searchQuery, "track", 15);
      setTracks(data.tracks?.items || []);
    } catch (e: any) {
      toast.error(getSpotifyFriendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const handleMood = useCallback(async (mood: OrionMood) => {
    setCurrentMood(mood);
    setLoading(true);
    try {
      const data = await getMoodRecommendations(mood, 15);
      setTracks(data.tracks || []);
      toast.success(`🎵 ${MOODS.find(m => m.id === mood)?.label}: ${data.tracks?.length || 0} faixas`);
    } catch (e: any) {
      toast.error(getSpotifyFriendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTopTracks = useCallback(async () => {
    if (!connected) { toast.error("Conecte ao Spotify primeiro"); return; }
    setLoading(true);
    try {
      const data = await getTopTracks("medium_term", 20);
      setTracks(data.items || []);
    } catch (e: any) {
      toast.error(getSpotifyFriendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [connected]);

  const handleRecent = useCallback(async () => {
    if (!connected) { toast.error("Conecte ao Spotify primeiro"); return; }
    setLoading(true);
    try {
      const data = await getRecentlyPlayed(20);
      setTracks((data.items || []).map((i: any) => i.track));
    } catch (e: any) {
      toast.error(getSpotifyFriendlyError(e));
    } finally {
      setLoading(false);
    }
  }, [connected]);

  const handlePlayTrack = useCallback(async (track: SpotifyTrack) => {
    if (sdk.isReady && sdk.isPremium) {
      // Use Web Playback SDK (plays inside the app)
      const ok = await sdk.playTrack(track.uri);
      if (!ok) {
        // Fallback: open in Spotify
        if (track.external_urls?.spotify) {
          window.open(track.external_urls.spotify, "_blank");
          toast.info("Abrindo no Spotify...");
        }
      }
    } else if (track.external_urls?.spotify) {
      // No SDK — open in Spotify app/web
      window.open(track.external_urls.spotify, "_blank");
      toast.info("Abrindo no Spotify...");
    } else {
      toast.info("Faixa indisponível para reprodução");
    }
  }, [sdk]);

  const formatDuration = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const albumArt = (track: SpotifyTrack) =>
    track.album.images?.[track.album.images.length > 1 ? 1 : 0]?.url || "";

  // Current track info (from SDK or selected)
  const nowPlaying = sdk.currentTrack;
  const isPlaying = sdk.isPlaying;

  return (
    <Card className="border-white/[0.06] bg-gradient-to-br from-[#0a0f1a] to-[#060a10] overflow-hidden">
      <CardContent className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[#1DB954]/20 flex items-center justify-center">
              <Music className="h-3.5 w-3.5 text-[#1DB954]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-white/60">ORION × SPOTIFY</span>
              <Badge variant="outline" className={`text-[7px] ${
                sdk.isReady ? "border-[#1DB954]/30 text-[#1DB954]" : 
                connected ? "border-amber-500/30 text-amber-400" : 
                "border-white/10 text-white/30"
              }`}>
                {sdk.isReady ? "SDK ATIVO" : connected ? "CONECTADO" : "PÚBLICO"}
              </Badge>
              {sdk.isReady ? (
                <Wifi className="h-2.5 w-2.5 text-[#1DB954]/50" />
              ) : connected ? (
                <WifiOff className="h-2.5 w-2.5 text-amber-400/50" />
              ) : null}
            </div>
          </div>
          <Button
            size="sm" variant="ghost"
            className="h-6 text-[8px] font-mono gap-1"
            onClick={async () => {
              if (connected) { await disconnectSpotify(); setConnected(false); toast.info("Desconectado"); }
              else startSpotifyLogin();
            }}
          >
            {connected ? <><LogOut className="h-2.5 w-2.5" /> Sair</> : <><LogIn className="h-2.5 w-2.5" /> Login</>}
          </Button>
        </div>

        {/* SDK Status Banner */}
        {connected && !sdk.isReady && sdk.error && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1.5">
            <p className="text-[8px] font-mono text-amber-400/80">
              ⚠️ {sdk.error}. As músicas abrirão no app Spotify.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1">
          {[
            { id: "mood" as const, label: "Mood", icon: <Sparkles className="h-2.5 w-2.5" /> },
            { id: "search" as const, label: "Buscar", icon: <Search className="h-2.5 w-2.5" /> },
            { id: "top" as const, label: "Top", icon: <Heart className="h-2.5 w-2.5" />, needsAuth: true },
            { id: "recent" as const, label: "Recentes", icon: <Radio className="h-2.5 w-2.5" />, needsAuth: true },
          ].map(t => (
            <Button
              key={t.id} size="sm"
              variant={tab === t.id ? "default" : "ghost"}
              className={`h-6 text-[8px] font-mono gap-1 ${t.needsAuth && !connected ? "opacity-30" : ""}`}
              onClick={() => {
                setTab(t.id);
                if (t.id === "top") handleTopTracks();
                if (t.id === "recent") handleRecent();
              }}
              disabled={t.needsAuth && !connected}
            >
              {t.icon} {t.label}
            </Button>
          ))}
        </div>

        {/* Mood Grid */}
        {tab === "mood" && (
          <div className="grid grid-cols-3 gap-1.5">
            {MOODS.map(m => (
              <Button
                key={m.id} size="sm" variant="ghost"
                className={`h-12 flex-col gap-1 ${m.color} ${currentMood === m.id ? "bg-white/[0.08] ring-1 ring-white/10" : "hover:bg-white/[0.04]"}`}
                onClick={() => handleMood(m.id)}
                disabled={loading}
              >
                {m.icon}
                <span className="text-[8px] font-mono">{m.label}</span>
              </Button>
            ))}
          </div>
        )}

        {/* Search */}
        {tab === "search" && (
          <div className="flex gap-1">
            <input
              className="flex-1 h-7 bg-white/[0.04] border border-white/[0.08] rounded px-2 text-[10px] font-mono text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#1DB954]/30"
              placeholder="Buscar artista, música..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleSearch} disabled={loading}>
              <Search className="h-3 w-3 text-[#1DB954]" />
            </Button>
          </div>
        )}

        {/* Now Playing (SDK) */}
        {nowPlaying && (
          <div className="flex items-center gap-2 bg-[#1DB954]/10 rounded-lg p-2 border border-[#1DB954]/20">
            {nowPlaying.albumArt && (
              <img src={nowPlaying.albumArt} alt="" className="h-10 w-10 rounded shadow-lg" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono text-white/80 truncate">{nowPlaying.name}</p>
              <p className="text-[8px] font-mono text-white/30 truncate">
                {nowPlaying.artists.join(", ")}
              </p>
              {/* Progress bar */}
              <div className="mt-1 flex items-center gap-1">
                <span className="text-[6px] font-mono text-white/20">{formatDuration(sdk.positionMs)}</span>
                <div className="flex-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#1DB954] rounded-full transition-all"
                    style={{ width: `${nowPlaying.durationMs > 0 ? (sdk.positionMs / nowPlaying.durationMs) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-[6px] font-mono text-white/20">{formatDuration(nowPlaying.durationMs)}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={sdk.skipPrev}>
                <SkipBack className="h-2.5 w-2.5 text-white/40" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={sdk.togglePlay}>
                {isPlaying ? <Pause className="h-3.5 w-3.5 text-[#1DB954]" /> : <Play className="h-3.5 w-3.5 text-[#1DB954]" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={sdk.skipNext}>
                <SkipForward className="h-2.5 w-2.5 text-white/40" />
              </Button>
            </div>
          </div>
        )}

        {/* Volume */}
        {nowPlaying && (
          <div className="flex items-center gap-2">
            {sdk.volume === 0 ? <VolumeX className="h-2.5 w-2.5 text-white/20" /> : <Volume2 className="h-2.5 w-2.5 text-white/30" />}
            <Slider
              value={[sdk.volume * 100]} min={0} max={100} step={1}
              onValueChange={v => sdk.changeVolume(v[0] / 100)}
              className="flex-1"
            />
            <span className="text-[7px] font-mono text-white/20 w-6 text-right">{Math.round(sdk.volume * 100)}%</span>
          </div>
        )}

        {/* Track List */}
        {tracks.length > 0 && (
          <ScrollArea className="h-[240px]">
            <div className="space-y-1">
              {tracks.map((track, i) => (
                <div
                  key={`${track.id}-${i}`}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-all
                    hover:bg-white/[0.04] border border-transparent
                    ${nowPlaying?.uri === track.uri ? "bg-[#1DB954]/10 border-[#1DB954]/20" : ""}`}
                  onClick={() => handlePlayTrack(track)}
                >
                  <span className="text-[8px] font-mono text-white/15 w-4 text-right shrink-0">{i + 1}</span>
                  {albumArt(track) ? (
                    <img src={albumArt(track)} alt="" className="h-8 w-8 rounded shadow shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-white/[0.04] flex items-center justify-center shrink-0">
                      <Disc3 className="h-3 w-3 text-white/10" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-mono text-white/60 truncate">{track.name}</p>
                    <p className="text-[7px] font-mono text-white/25 truncate">
                      {track.artists.map(a => a.name).join(", ")} • {track.album.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[7px] font-mono text-white/15">{formatDuration(track.duration_ms)}</span>
                    {sdk.isReady && <Headphones className="h-2 w-2 text-[#1DB954]/40" />}
                    {track.external_urls?.spotify && (
                      <a
                        href={track.external_urls.spotify}
                        target="_blank" rel="noopener"
                        onClick={e => e.stopPropagation()}
                        className="opacity-30 hover:opacity-70"
                      >
                        <ExternalLink className="h-2 w-2" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {tracks.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-8 text-white/15">
            <Disc3 className="h-8 w-8 mb-2 animate-spin" style={{ animationDuration: "8s" }} />
            <p className="text-[9px] font-mono">
              {tab === "mood" ? "Selecione um mood para começar" : tab === "search" ? "Busque uma música ou artista" : "Carregando..."}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-6">
            <Disc3 className="h-5 w-5 text-[#1DB954] animate-spin" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
