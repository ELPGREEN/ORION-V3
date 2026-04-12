import { SEO } from "@/components/SEO";
import { Brain, Eye, Volume2, BarChart3, Mic, MicOff, VolumeX, Settings, FileText, Radio, Zap, Globe, TrendingUp, Sparkles, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NeuralVision } from "@/components/dashboard/neural/NeuralVision";
import { OrionStatusOrb } from "@/components/dashboard/neural/OrionStatusOrb";
import {
  ProcessingWidget,
  NeuralHealthWidget,
  ProvidersWidget,
  NetworkWidget,
  EnvironmentWidget,
  KnowledgeBaseWidget,
  SystemStatusWidget,
  AlertsWidget,
} from "@/components/dashboard/neural/NeuralDashboardWidgets";
import { useState, useEffect, useRef, useCallback } from "react";
import { useOrionTTS } from "@/hooks/useOrionTTS";
import { useOrionSTT } from "@/hooks/useOrionSTT";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

/* ─── Orion OS Header ──────────────────────────────── */
function OrionOSHeader() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");
  const dateStr = time.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).toUpperCase();

  return (
    <div className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-green-400 shadow-[0_0_6px_hsl(142_70%_50%/0.6)]" />
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">ORION OS v22.3</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-4xl font-mono font-bold text-foreground tracking-tight">{hours}:{minutes}</span>
          <span className="text-lg font-mono text-muted-foreground ml-1">{seconds}</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">{dateStr}</span>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-[9px] font-mono gap-1 border-green-500/30 text-green-400">
            <Zap className="h-2.5 w-2.5" /> MQTT <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
          </Badge>
          <Badge variant="outline" className="text-[9px] font-mono gap-1 border-green-500/30 text-green-400">
            <FileText className="h-2.5 w-2.5" /> RAG <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
          </Badge>
        </div>
      </div>

      {/* Orion Status Orb */}
      <OrionStatusOrb percentage={98.9} />

      {/* Stats below orb */}
      <div className="flex items-center justify-center gap-6 mt-4 text-[10px] font-mono text-muted-foreground">
        <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> 2.784 docs</span>
        <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> 8 providers</span>
        <span className="flex items-center gap-1"><Brain className="h-3 w-3" /> 9 modelos</span>
      </div>
    </div>
  );
}

/* ─── User Info Card ──────────────────────────────── */
function UserInfoCard() {
  const { user } = useAuth();

  return (
    <div className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center border border-border/30">
        <User className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-mono text-foreground">{user?.user_metadata?.full_name || "info"}</p>
        <p className="text-[10px] font-mono text-muted-foreground">{user?.email || "info@elpgreen.com"}</p>
        <p className="text-[9px] font-mono text-cyan-400/60">ORION v22.3 • CLEARANCE L5</p>
      </div>
    </div>
  );
}

/* ─── Painel Admin (main tab) ──────────────────────────────── */
function PainelAdminTab() {
  return (
    <div className="space-y-4">
      <OrionOSHeader />
      <UserInfoCard />
      <ProcessingWidget />
      <NeuralHealthWidget />
      <ProvidersWidget />
      <NetworkWidget />
      <EnvironmentWidget />
      <KnowledgeBaseWidget />
      <SystemStatusWidget />
      <AlertsWidget />
    </div>
  );
}

/* ─── VozTab ──────────────────────────────── */
function VozTab() {
  const tts = useOrionTTS({ voice: "Charon", lang: "pt-BR" });
  const [text, setText] = useState("Olá, eu sou o Orion. Como posso ajudá-lo hoje?");
  const [transcript, setTranscript] = useState("");
  const stt = useOrionSTT({
    lang: "pt-BR",
    continuous: false,
    wakeWord: "orion",
    onResult: (result) => setTranscript((prev) => prev ? `${prev}\n${result}` : result),
    onWakeWord: () => toast.info("🎤 Wake word detectada: Orion"),
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Volume2 className="h-5 w-5 text-primary" />Text-to-Speech (TTS)</CardTitle>
          <CardDescription>Gemini 2.5 Flash TTS via Edge Function</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite o texto..." rows={4} className="bg-background/50" />
          <div className="flex items-center gap-2">
            <Button onClick={() => tts.speak(text)} disabled={tts.speaking || tts.loading || !text.trim()} className="flex-1">
              {tts.loading ? "Gerando áudio..." : tts.speaking ? "Reproduzindo..." : "▶ Falar"}
            </Button>
            {tts.speaking && <Button variant="outline" size="icon" onClick={tts.stop}><VolumeX className="h-4 w-4" /></Button>}
          </div>
          {tts.error && <p className="text-xs text-destructive">{tts.error}</p>}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Voz: Charon (Gemini) • Status: {tts.speaking ? "🔊 Falando" : tts.loading ? "⏳ Carregando" : "✅ Pronto"}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Mic className="h-5 w-5 text-primary" />Speech-to-Text (STT)</CardTitle>
          <CardDescription>Web Speech API com wake word "Orion"</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={() => stt.listening ? stt.stopListening() : stt.startListening()} variant={stt.listening ? "destructive" : "default"} className="flex-1" disabled={!stt.supported}>
              {stt.listening ? <><MicOff className="h-4 w-4 mr-2" />Parar</> : <><Mic className="h-4 w-4 mr-2" />Iniciar Escuta</>}
            </Button>
            {transcript && <Button variant="outline" size="sm" onClick={() => setTranscript("")}>Limpar</Button>}
          </div>
          {!stt.supported && <p className="text-xs text-destructive">⚠ Web Speech API não suportada neste navegador.</p>}
          <div className="min-h-[100px] p-3 rounded-md bg-background/50 border border-border/50">
            {transcript ? <p className="text-sm whitespace-pre-wrap">{transcript}</p> : <p className="text-xs text-muted-foreground italic">{stt.listening ? "Escutando..." : "Clique em Iniciar Escuta"}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── MetricasTab ──────────────────────────────── */
function MetricasTab() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("ai_metrics").select("*").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { setMetrics(data || []); setLoading(false); });
  }, []);
  const avgDuration = metrics.length ? Math.round(metrics.reduce((s, m) => s + (m.total_duration_ms || 0), 0) / metrics.length) : 0;
  const successRate = metrics.length ? Math.round((metrics.filter((m) => m.success).length / metrics.length) * 100) : 0;
  const avgQuality = metrics.length ? (metrics.reduce((s, m) => s + (m.overall_quality_score || 0), 0) / metrics.length).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { value: metrics.length, label: "Total chamadas", color: "text-primary" },
          { value: `${successRate}%`, label: "Taxa sucesso", color: "text-green-400" },
          { value: `${avgDuration}ms`, label: "Latência média", color: "text-blue-400" },
          { value: avgQuality, label: "Qualidade média", color: "text-amber-400" },
        ].map((item) => (
          <Card key={item.label} className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6 text-center">
              <p className={`text-2xl sm:text-3xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="text-lg">Últimas chamadas IA</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : metrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma métrica registrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-2 px-2">Provider</th><th className="text-left py-2 px-2">Query</th>
                  <th className="text-center py-2 px-2">Duração</th><th className="text-center py-2 px-2">Qualidade</th>
                  <th className="text-center py-2 px-2">Status</th><th className="text-right py-2 px-2">Data</th>
                </tr></thead>
                <tbody>{metrics.map((m) => (
                  <tr key={m.id} className="border-b border-border/30 hover:bg-muted/10">
                    <td className="py-2 px-2"><Badge variant="outline" className="text-[10px]">{m.provider}</Badge></td>
                    <td className="py-2 px-2 max-w-[200px] truncate">{m.query || "—"}</td>
                    <td className="py-2 px-2 text-center">{m.total_duration_ms}ms</td>
                    <td className="py-2 px-2 text-center">{m.overall_quality_score?.toFixed(1) || "—"}</td>
                    <td className="py-2 px-2 text-center">{m.success ? <Badge className="bg-green-500/20 text-green-400 text-[10px]">OK</Badge> : <Badge className="bg-red-500/20 text-red-400 text-[10px]">Erro</Badge>}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{new Date(m.created_at).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Draggable Tab Scroll ──────────────────────────────── */
function DraggableTabList({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    startX.current = e.pageX - (ref.current?.offsetLeft || 0);
    scrollLeft.current = ref.current?.scrollLeft || 0;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    ref.current.scrollLeft = scrollLeft.current - (x - startX.current);
  }, [isDragging]);

  const onMouseUp = useCallback(() => setIsDragging(false), []);

  return (
    <div
      ref={ref}
      className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/30 hover:scrollbar-thumb-primary/50"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {children}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────── */
export default function RedeNeuralPage() {
  return (
    <div className="space-y-4">
      <SEO title="Rede Neural — ORION" description="Painel da rede neural do Orion com visão, voz e métricas IA" />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-serif text-foreground flex items-center gap-2">
              REDE NEURAL
              <Badge className="bg-green-500/20 text-green-400 text-[9px] font-mono gap-1">
                <Zap className="h-2.5 w-2.5" /> LIVE
              </Badge>
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono">
              Painel Admin • IAs • Ingestão • Especializações • Documentação
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1.5 font-mono">
            <FileText className="h-3.5 w-3.5" /> Exportar Relatório PDF
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 font-mono text-red-400 border-red-500/30">
            <Radio className="h-3.5 w-3.5" /> REC
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="painel" className="w-full">
        <DraggableTabList>
          <TabsList className="inline-flex w-auto min-w-full bg-muted/20 gap-0.5 p-1">
            <TabsTrigger value="painel" className="text-xs font-mono gap-1.5 whitespace-nowrap">
              <Sparkles className="h-3.5 w-3.5" /> Provedores <Badge className="bg-primary/20 text-primary text-[9px] h-4 px-1">8</Badge>
            </TabsTrigger>
            <TabsTrigger value="evolucao" className="text-xs font-mono gap-1.5 whitespace-nowrap">
              <TrendingUp className="h-3.5 w-3.5" /> Evolução <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            </TabsTrigger>
            <TabsTrigger value="consciencia" className="text-xs font-mono gap-1.5 whitespace-nowrap">
              <Brain className="h-3.5 w-3.5" /> Consciência <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            </TabsTrigger>
            <TabsTrigger value="rede-ao-vivo" className="text-xs font-mono gap-1.5 whitespace-nowrap">
              <Radio className="h-3.5 w-3.5" /> Rede ao Vivo <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
            </TabsTrigger>
            <TabsTrigger value="visao" className="text-xs font-mono gap-1.5 whitespace-nowrap">
              <Eye className="h-3.5 w-3.5" /> Visão Neural
            </TabsTrigger>
            <TabsTrigger value="voz" className="text-xs font-mono gap-1.5 whitespace-nowrap">
              <Volume2 className="h-3.5 w-3.5" /> Voz
            </TabsTrigger>
            <TabsTrigger value="metricas" className="text-xs font-mono gap-1.5 whitespace-nowrap">
              <BarChart3 className="h-3.5 w-3.5" /> Métricas IA
            </TabsTrigger>
            <TabsTrigger value="webapis" className="text-xs font-mono gap-1.5 whitespace-nowrap">
              <Globe className="h-3.5 w-3.5" /> Web APIs
            </TabsTrigger>
          </TabsList>
        </DraggableTabList>

        <TabsContent value="painel" className="mt-4"><PainelAdminTab /></TabsContent>
        <TabsContent value="evolucao" className="mt-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6 text-center text-muted-foreground font-mono text-sm">
              <TrendingUp className="h-8 w-8 mx-auto mb-3 text-primary/40" />
              Módulo de Evolução Neural — Monitoramento de aprendizado contínuo
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="consciencia" className="mt-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6 text-center text-muted-foreground font-mono text-sm">
              <Brain className="h-8 w-8 mx-auto mb-3 text-primary/40" />
              Consciousness Engine — Raciocínio metacognitivo ativo
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="rede-ao-vivo" className="mt-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6 text-center text-muted-foreground font-mono text-sm">
              <Radio className="h-8 w-8 mx-auto mb-3 text-green-400/40" />
              Rede ao Vivo — Visualização 3D de conexões neurais em tempo real
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="visao" className="mt-4"><NeuralVision /></TabsContent>
        <TabsContent value="voz" className="mt-4"><VozTab /></TabsContent>
        <TabsContent value="metricas" className="mt-4"><MetricasTab /></TabsContent>
        <TabsContent value="webapis" className="mt-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6 text-center text-muted-foreground font-mono text-sm">
              <Globe className="h-8 w-8 mx-auto mb-3 text-primary/40" />
              Web APIs — Endpoints REST e integrações externas
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
