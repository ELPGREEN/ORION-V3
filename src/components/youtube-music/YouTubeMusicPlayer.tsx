import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Music, Search, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  ListMusic, TrendingUp, Loader2, ExternalLink, LogIn, LogOut, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  isYTMusicConnected, getYTMusicUser, startYTMusicLogin, disconnectYTMusic,
  searchYTMusic, getYTMusicPlaylists, getPlaylistTracks, getTrending,
  type YTMusicTrack, type YTMusicPlaylist,
} from "@/lib/youtube-music/youtube-music-service";

export function YouTubeMusicPlayer() {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

  // Search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YTMusicTrack[]>([]);
  const [searching, setSearching] = useState(false);

  // Playlists
  const [playlists, setPlaylists] = useState<YTMusicPlaylist[]>([]);
  const [playlistTracks, setPlaylistTracks] = useState<YTMusicTrack[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  // Trending
  const [trending, setTrending] = useState<YTMusicTrack[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);

  // Player
  const [currentTrack, setCurrentTrack] = useState<YTMusicTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check connection status
  useEffect(() => {
    const check = async () => {
      const c = await isYTMusicConnected();
      setConnected(c);
      if (c) {
        const u = await getYTMusicUser();
        setUser(u);
      }
    };
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const tracks = await searchYTMusic(query);
      setResults(tracks);
    } catch (e: any) {
      toast({ title: "Erro na busca", description: e.message, variant: "destructive" });
    }
    setSearching(false);
  }, [query, toast]);

  const loadPlaylists = useCallback(async () => {
    setLoadingPlaylists(true);
    try {
      const pl = await getYTMusicPlaylists();
      setPlaylists(pl);
    } catch (e: any) {
      toast({ title: "Erro ao carregar playlists", description: e.message, variant: "destructive" });
    }
    setLoadingPlaylists(false);
  }, [toast]);

  const loadPlaylistTracks = useCallback(async (playlistId: string) => {
    setSelectedPlaylist(playlistId);
    setLoadingPlaylists(true);
    try {
      const tracks = await getPlaylistTracks(playlistId);
      setPlaylistTracks(tracks);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setLoadingPlaylists(false);
  }, [toast]);

  const loadTrending = useCallback(async () => {
    setLoadingTrending(true);
    try {
      const tracks = await getTrending();
      setTrending(tracks);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setLoadingTrending(false);
  }, [toast]);

  const playTrack = (track: YTMusicTrack) => {
    setCurrentTrack(track);
    setPlaying(true);
  };

  const openInYTMusic = (videoId: string) => {
    window.open(`https://music.youtube.com/watch?v=${videoId}`, "_blank");
  };

  const handleDisconnect = async () => {
    await disconnectYTMusic();
    setConnected(false);
    setUser(null);
    setCurrentTrack(null);
    toast({ title: "YouTube Music desconectado" });
  };

  const TrackRow = ({ track }: { track: YTMusicTrack }) => (
    <div
      className={`flex items-center gap-3 p-2 rounded hover:bg-muted/40 cursor-pointer transition-colors group ${currentTrack?.id === track.id ? "bg-primary/10 border border-primary/20" : ""}`}
      onClick={() => playTrack(track)}
    >
      {track.thumbnail ? (
        <img src={track.thumbnail} alt={track.title} className="h-10 w-10 rounded object-cover shrink-0" />
      ) : (
        <div className="h-10 w-10 rounded bg-muted/50 flex items-center justify-center shrink-0">
          <Music className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{track.title}</div>
        <div className="text-[10px] text-muted-foreground truncate">{track.artist}</div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); openInYTMusic(track.videoId); }}>
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
      {track.duration && <span className="text-[10px] text-muted-foreground shrink-0">{track.duration}</span>}
    </div>
  );

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-red-600 flex items-center justify-center">
              <Play className="h-3 w-3 text-white fill-white" />
            </div>
            YouTube Music
          </CardTitle>
          <div className="flex items-center gap-2">
            {connected && user && (
              <span className="text-[10px] text-muted-foreground">{user.name || user.email}</span>
            )}
            {connected ? (
              <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 text-red-400 hover:text-red-300" onClick={handleDisconnect}>
                <LogOut className="h-3 w-3" /> Sair
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={startYTMusicLogin}>
                <LogIn className="h-3 w-3" /> Conectar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Embedded Player */}
        {currentTrack && (
          <div className="space-y-2">
            <div className="relative aspect-video rounded overflow-hidden bg-black">
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${currentTrack.videoId}?autoplay=1&enablejsapi=1${muted ? "&mute=1" : ""}`}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={currentTrack.title}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{currentTrack.title}</div>
                <div className="text-[10px] text-muted-foreground truncate">{currentTrack.artist}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setMuted(!muted)}>
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openInYTMusic(currentTrack.videoId)}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setCurrentTrack(null); setPlaying(false); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-8">
            <TabsTrigger value="search" className="text-[10px] gap-1"><Search className="h-3 w-3" /> Buscar</TabsTrigger>
            <TabsTrigger value="playlists" className="text-[10px] gap-1" onClick={loadPlaylists}><ListMusic className="h-3 w-3" /> Playlists</TabsTrigger>
            <TabsTrigger value="trending" className="text-[10px] gap-1" onClick={loadTrending}><TrendingUp className="h-3 w-3" /> Em Alta</TabsTrigger>
          </TabsList>

          {/* Search */}
          <TabsContent value="search" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar músicas, artistas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-8 text-xs"
              />
              <Button size="sm" className="h-8 px-3" onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              </Button>
            </div>
            {!connected && (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-2">Conecte sua conta Google para buscar e tocar músicas</p>
                <Button size="sm" variant="outline" className="text-[10px] gap-1" onClick={startYTMusicLogin}>
                  <LogIn className="h-3 w-3" /> Conectar YouTube Music
                </Button>
              </div>
            )}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {results.map((t) => <TrackRow key={t.id} track={t} />)}
            </div>
          </TabsContent>

          {/* Playlists */}
          <TabsContent value="playlists" className="space-y-3 mt-3">
            {!connected ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-2">Conecte para ver suas playlists</p>
                <Button size="sm" variant="outline" className="text-[10px] gap-1" onClick={startYTMusicLogin}>
                  <LogIn className="h-3 w-3" /> Conectar
                </Button>
              </div>
            ) : loadingPlaylists && !selectedPlaylist ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : selectedPlaylist ? (
              <div className="space-y-2">
                <Button size="sm" variant="ghost" className="text-[10px] gap-1" onClick={() => { setSelectedPlaylist(null); setPlaylistTracks([]); }}>
                  ← Voltar
                </Button>
                {loadingPlaylists ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {playlistTracks.map((t) => <TrackRow key={t.id} track={t} />)}
                  </div>
                )}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {playlists.map((pl) => (
                  <div
                    key={pl.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => loadPlaylistTracks(pl.id)}
                  >
                    {pl.thumbnail ? (
                      <img src={pl.thumbnail} alt={pl.title} className="h-10 w-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted/50 flex items-center justify-center shrink-0">
                        <ListMusic className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{pl.title}</div>
                      <div className="text-[10px] text-muted-foreground">{pl.itemCount} músicas</div>
                    </div>
                  </div>
                ))}
                {playlists.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma playlist encontrada</p>}
              </div>
            )}
          </TabsContent>

          {/* Trending */}
          <TabsContent value="trending" className="space-y-3 mt-3">
            {loadingTrending ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {trending.map((t) => <TrackRow key={t.id} track={t} />)}
                {trending.length === 0 && !loadingTrending && (
                  <p className="text-xs text-muted-foreground text-center py-4">Clique na aba para carregar músicas em alta</p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
