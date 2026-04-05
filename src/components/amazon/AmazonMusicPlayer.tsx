import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, LogIn, LogOut, ShoppingCart, Headphones, Music,
  Loader2, ExternalLink, Mic, Home, BookOpen, Brain,
  BookMarked, Sparkles, Play
} from "lucide-react";
import { toast } from "sonner";
import { useAmazonIntegration } from "@/hooks/useAmazonIntegration";
import {
  searchAmazonAudiobooks,
  searchAmazonMusic,
  getAmazonMusicUrl,
  getAlexaDevices,
  getKindleSuggestions,
  type AlexaDevice,
  type AmazonAudiobook,
  type AmazonMusicTrack,
  type KindleBook,
} from "@/lib/amazon/amazon-media-service";
import { absorbContent } from "@/lib/neural/orion-voice-evolution";

type AmazonTab = "music" | "audiobooks" | "kindle" | "alexa" | "shopping";

export function AmazonMusicPlayer() {
  const { status, loading: authLoading, connect, disconnect, connecting } = useAmazonIntegration();
  const [tab, setTab] = useState<AmazonTab>("music");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [alexaDevices, setAlexaDevices] = useState<AlexaDevice[]>([]);
  const [audiobooks, setAudiobooks] = useState<AmazonAudiobook[]>([]);
  const [musicTracks, setMusicTracks] = useState<AmazonMusicTrack[]>([]);
  const [kindleBooks, setKindleBooks] = useState<KindleBook[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [absorbing, setAbsorbing] = useState<string | null>(null);

  const connected = status.connected;

  useEffect(() => {
    if (connected && tab === "alexa") loadAlexaDevices();
  }, [connected, tab]);

  // Load default suggestions on mount
  useEffect(() => {
    if (musicTracks.length === 0) {
      searchAmazonMusic("").then(r => setMusicTracks(r.items as AmazonMusicTrack[]));
    }
    if (audiobooks.length === 0) {
      searchAmazonAudiobooks("").then(r => setAudiobooks(r.items as AmazonAudiobook[]));
    }
    if (kindleBooks.length === 0) {
      setKindleBooks(getKindleSuggestions(""));
    }
  }, []);

  const loadAlexaDevices = async () => {
    setLoading(true);
    try {
      const result = await getAlexaDevices();
      setAlexaDevices(result.devices);
      if (result.message) setStatusMessage(result.message);
    } catch {
      setStatusMessage("Erro ao buscar dispositivos Alexa");
    } finally {
      setLoading(false);
    }
  };

  const handleAudiobookSearch = async () => {
    setLoading(true);
    try {
      const result = await searchAmazonAudiobooks(searchQuery);
      setAudiobooks(result.items as AmazonAudiobook[]);
      setStatusMessage(result.message || "");
    } finally {
      setLoading(false);
    }
  };

  const handleMusicSearch = async () => {
    setLoading(true);
    try {
      const result = await searchAmazonMusic(searchQuery);
      setMusicTracks(result.items as AmazonMusicTrack[]);
      setStatusMessage(result.message || "");
    } finally {
      setLoading(false);
    }
  };

  const openAmazonMusic = (query?: string) => {
    window.open(getAmazonMusicUrl(query || searchQuery), "_blank");
  };

  const handleAbsorbBook = useCallback(async (title: string, type: "audiobook" | "kindle") => {
    setAbsorbing(title);
    try {
      // Simulate reading/listening and absorb content for Orion's evolution
      const contentType = type === "audiobook" ? "amazon_audiobook" : "audiobook";
      const durationMinutes = type === "audiobook" ? 15 : 10;
      const sampleText = `Conteúdo absorvido do livro "${title}". Este material contribui para o desenvolvimento linguístico, ampliação vocabular e refinamento prosódico do sistema neural Orion.`;
      
      absorbContent(title, contentType, durationMinutes, sampleText);
      
      toast.success(`🧠 Orion absorveu "${title}"`, {
        description: `+${durationMinutes}min de material ${type === "audiobook" ? "auditivo" : "textual"} processado`,
      });
    } finally {
      setAbsorbing(null);
    }
  }, []);

  const openAudible = () => {
    const url = searchQuery.trim()
      ? `https://www.audible.com/search?keywords=${encodeURIComponent(searchQuery)}`
      : "https://www.audible.com";
    window.open(url, "_blank");
  };

  const openKindle = () => {
    const url = searchQuery.trim()
      ? `https://www.amazon.com.br/s?k=${encodeURIComponent(searchQuery)}&i=digital-text`
      : "https://www.amazon.com.br/kindle-dbs/hz/subscribe/ku";
    window.open(url, "_blank");
  };

  const openAmazonShopping = () => {
    const url = searchQuery.trim()
      ? `https://www.amazon.com.br/s?k=${encodeURIComponent(searchQuery)}`
      : "https://www.amazon.com.br";
    window.open(url, "_blank");
  };

  const handleKindleSearch = () => {
    const results = getKindleSuggestions(searchQuery);
    setKindleBooks(results);
  };

  const tabs: { id: AmazonTab; label: string; icon: React.ReactNode }[] = [
    { id: "music", label: "Music", icon: <Music className="h-3 w-3" /> },
    { id: "audiobooks", label: "Audible", icon: <Headphones className="h-3 w-3" /> },
    { id: "kindle", label: "Kindle", icon: <BookMarked className="h-3 w-3" /> },
    { id: "alexa", label: "Alexa", icon: <Mic className="h-3 w-3" /> },
    { id: "shopping", label: "Loja", icon: <ShoppingCart className="h-3 w-3" /> },
  ];

  return (
    <Card className="border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-[#FF9900] to-[#FF9900]/50" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-[#FF9900]/10">
              <BookOpen className="h-4 w-4 text-[#FF9900]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Amazon Music & Biblioteca</h3>
              <p className="text-[10px] text-muted-foreground">
                {connected ? `${status.profile?.name || "Conectado"} · Music, Audible, Kindle & Alexa` : "Música, audiobooks, livros e Alexa"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={connected ? "ghost" : "default"}
            className={`h-6 text-[8px] font-mono gap-1 ${!connected ? "bg-[#FF9900] hover:bg-[#E88B00] text-black" : ""}`}
            onClick={() => {
              if (connected) { disconnect(); toast.info("Amazon desconectada"); }
              else connect();
            }}
            disabled={connecting || authLoading}
          >
            {connecting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : connected ? (
              <><LogOut className="h-3 w-3" /> Sair</>
            ) : (
              <><LogIn className="h-3 w-3" /> Conectar</>
            )}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/30 p-0.5 rounded-md">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] rounded transition-all ${
                tab === t.id
                  ? "bg-[#FF9900]/15 text-[#FF9900] font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Music Tab ── */}
        {tab === "music" && (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Buscar músicas, artistas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleMusicSearch()}
                className="flex-1 bg-muted/40 border border-border/30 rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#FF9900]/30"
              />
              <Button size="sm" className="h-7 px-2 bg-[#FF9900] hover:bg-[#E88B00] text-black" onClick={handleMusicSearch} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              </Button>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {["relaxar", "foco", "energia", "brasil", "pop"].map(mood => (
                <button
                  key={mood}
                  onClick={() => { setSearchQuery(mood); searchAmazonMusic(mood).then(r => setMusicTracks(r.items as AmazonMusicTrack[])); }}
                  className="px-2 py-0.5 text-[9px] rounded-full bg-[#FF9900]/10 text-[#FF9900] hover:bg-[#FF9900]/20 transition-colors capitalize"
                >
                  {mood}
                </button>
              ))}
            </div>

            <ScrollArea className="max-h-52">
              <div className="space-y-2">
                {musicTracks.map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded bg-muted/30 border border-border/20 group">
                    <Music className="h-4 w-4 text-[#FF9900]/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{t.title}</div>
                      <div className="text-[9px] text-muted-foreground truncate">
                        {t.artist} {t.album ? `• ${t.album}` : ""} {t.duration ? `• ${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, "0")}` : ""}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => openAmazonMusic(t.title + " " + t.artist)}
                      title="Abrir no Amazon Music"
                    >
                      <Play className="h-3 w-3 text-[#FF9900]" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button size="sm" variant="outline" className="w-full gap-1.5 text-[10px] border-[#FF9900]/20 text-[#FF9900] hover:bg-[#FF9900]/10" onClick={() => openAmazonMusic()}>
              <ExternalLink className="h-3 w-3" /> Abrir Amazon Music
            </Button>
          </div>
        )}

        {/* ── Audiobooks Tab ── */}
        {tab === "audiobooks" && (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Buscar audiobooks por tema..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAudiobookSearch()}
                className="flex-1 bg-muted/40 border border-border/30 rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#FF9900]/30"
              />
              <Button size="sm" className="h-7 px-2 bg-[#FF9900] hover:bg-[#E88B00] text-black" onClick={handleAudiobookSearch} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
              </Button>
            </div>

            <ScrollArea className="max-h-52">
              <div className="space-y-2">
                {audiobooks.map(b => (
                  <div key={b.asin} className="flex items-center gap-3 p-2.5 rounded bg-muted/30 border border-border/20 group">
                    <Headphones className="h-4 w-4 text-[#FF9900]/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{b.title}</div>
                      <div className="text-[9px] text-muted-foreground truncate">{b.author} {b.duration ? `• ${b.duration}` : ""}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleAbsorbBook(b.title, "audiobook")}
                      disabled={absorbing === b.title}
                      title="Orion absorve este conteúdo"
                    >
                      {absorbing === b.title ? (
                        <Loader2 className="h-3 w-3 animate-spin text-[#FF9900]" />
                      ) : (
                        <Brain className="h-3 w-3 text-[#FF9900]" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-[10px] border-[#FF9900]/20 text-[#FF9900] hover:bg-[#FF9900]/10" onClick={openAudible}>
                <ExternalLink className="h-3 w-3" /> Abrir Audible
              </Button>
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
                <Sparkles className="h-3 w-3" />
                <span>🧠 = absorver</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Kindle Tab ── */}
        {tab === "kindle" && (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Buscar livros por tema..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleKindleSearch()}
                className="flex-1 bg-muted/40 border border-border/30 rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#FF9900]/30"
              />
              <Button size="sm" className="h-7 px-2 bg-[#FF9900] hover:bg-[#E88B00] text-black" onClick={handleKindleSearch}>
                <Search className="h-3 w-3" />
              </Button>
            </div>

            <ScrollArea className="max-h-52">
              <div className="space-y-2">
                {kindleBooks.map(b => (
                  <div key={b.asin} className="flex items-center gap-3 p-2.5 rounded bg-muted/30 border border-border/20 group">
                    <BookMarked className="h-4 w-4 text-[#FF9900]/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{b.title}</div>
                      <div className="text-[9px] text-muted-foreground truncate">{b.author} • {b.category}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleAbsorbBook(b.title, "kindle")}
                      disabled={absorbing === b.title}
                      title="Orion estuda este livro"
                    >
                      {absorbing === b.title ? (
                        <Loader2 className="h-3 w-3 animate-spin text-[#FF9900]" />
                      ) : (
                        <Brain className="h-3 w-3 text-[#FF9900]" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-[10px] border-[#FF9900]/20 text-[#FF9900] hover:bg-[#FF9900]/10" onClick={openKindle}>
                <ExternalLink className="h-3 w-3" /> Abrir Kindle Store
              </Button>
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
                <Sparkles className="h-3 w-3" />
                <span>🧠 = estudar</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Alexa Tab ── */}
        {tab === "alexa" && (
          <div className="space-y-3">
            <div className="p-3 rounded bg-muted/30 border border-border/20 space-y-2">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-[#FF9900]" />
                <span className="text-xs font-medium text-foreground">Comandos de Voz Alexa</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Use seu dispositivo Alexa para interagir com o Orion. A API Alexa Smart Home requer escopos avançados que precisam de aprovação da Amazon.
              </p>
            </div>

            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {[
                  { cmd: "Alexa, leia meu Kindle", desc: "Narração de livros Kindle em qualquer Echo" },
                  { cmd: "Alexa, continue meu audiobook", desc: "Retoma a leitura no Audible" },
                  { cmd: "Alexa, o que tem no meu carrinho?", desc: "Lista itens do carrinho Amazon" },
                  { cmd: "Alexa, qual o status do meu pedido?", desc: "Rastreamento de entregas Amazon" },
                  { cmd: "Alexa, toque músicas relaxantes", desc: "Reproduz playlists no Amazon Music" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded bg-muted/30 border border-border/20">
                    <Mic className="h-3.5 w-3.5 text-[#FF9900]/60 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground">"{item.cmd}"</div>
                      <div className="text-[9px] text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1.5 text-[10px] border-[#FF9900]/20 text-[#FF9900] hover:bg-[#FF9900]/10"
              onClick={() => window.open("https://alexa.amazon.com.br", "_blank")}
            >
              <ExternalLink className="h-3 w-3" /> Gerenciar Alexa
            </Button>
          </div>
        )}

        {/* ── Shopping Tab ── */}
        {tab === "shopping" && (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Buscar na Amazon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && openAmazonShopping()}
                className="flex-1 bg-muted/40 border border-border/30 rounded px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#FF9900]/30"
              />
              <Button size="sm" className="h-7 px-2 bg-[#FF9900] hover:bg-[#E88B00] text-black" onClick={openAmazonShopping}>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-center py-4 space-y-3">
              <ShoppingCart className="h-8 w-8 text-[#FF9900]/30 mx-auto" />
              <p className="text-xs text-muted-foreground">Busque produtos na Amazon.com.br.</p>
              <Button size="sm" variant="outline" className="gap-1.5 text-[10px] border-[#FF9900]/20 text-[#FF9900] hover:bg-[#FF9900]/10" onClick={openAmazonShopping}>
                <ExternalLink className="h-3 w-3" /> Abrir Amazon Shopping
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
