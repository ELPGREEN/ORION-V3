import { SEO } from "@/components/SEO";
import { Brain, Eye, Volume2, BarChart3, Mic, MicOff, VolumeX } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NeuralVision } from "@/components/dashboard/neural/NeuralVision";
import { useState, useEffect } from "react";
import { useOrionTTS } from "@/hooks/useOrionTTS";
import { useOrionSTT } from "@/hooks/useOrionSTT";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { value: metrics.length, label: "Total chamadas", color: "text-primary" },
          { value: `${successRate}%`, label: "Taxa sucesso", color: "text-green-400" },
          { value: `${avgDuration}ms`, label: "Latência média", color: "text-blue-400" },
          { value: avgQuality, label: "Qualidade média", color: "text-amber-400" },
        ].map((item) => (
          <Card key={item.label} className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6 text-center">
              <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
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

export default function RedeNeuralPage() {
  return (
    <div className="space-y-6">
      <SEO title="Rede Neural — ORION" description="Painel da rede neural do Orion com visão, voz e métricas IA" />
      <div>
        <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          Rede Neural
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão computacional, síntese de voz e métricas de IA — powered by Gemini 2.5 Flash.
        </p>
      </div>
      <Tabs defaultValue="visao" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/30">
          <TabsTrigger value="visao" className="flex items-center gap-2"><Eye className="h-4 w-4" /><span className="hidden sm:inline">Visão Neural</span><span className="sm:hidden">Visão</span></TabsTrigger>
          <TabsTrigger value="voz" className="flex items-center gap-2"><Volume2 className="h-4 w-4" /><span className="hidden sm:inline">Voz (TTS/STT)</span><span className="sm:hidden">Voz</span></TabsTrigger>
          <TabsTrigger value="metricas" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Métricas IA</span><span className="sm:hidden">Métricas</span></TabsTrigger>
        </TabsList>
        <TabsContent value="visao" className="mt-6"><NeuralVision /></TabsContent>
        <TabsContent value="voz" className="mt-6"><VozTab /></TabsContent>
        <TabsContent value="metricas" className="mt-6"><MetricasTab /></TabsContent>
      </Tabs>
    </div>
  );
}
