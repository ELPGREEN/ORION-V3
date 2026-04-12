import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Eye, Mic, FileText, Sparkles, Upload, Play, Trash2, CheckCircle2, AlertCircle, Zap, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// groq-vision-hybrid removed — stubs for backward compat
type VisionMode = "identify" | "describe" | "analyze" | "teach";
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve((r.result as string).split(",")[1]); r.onerror = reject; r.readAsDataURL(file); });
const hybridVisionAnalyze = async (_b64: string, _opts?: any) => ({ detections: [], mode: "identify", provider_used: "none", providers_available: [], protocols_available: 0, auto_learned: 0, evolution_status: "disabled", duration_ms: 0, timestamp: new Date().toISOString() });

// HuggingFace integrations
import {
  analyzeSentiment,
  extractEntities,
  summarizeText,
  zeroShotClassify,
  answerQuestion,
  isTransformersAvailable,
  clearPipelineCache,
  getLoadedPipelines,
} from "@/lib/huggingface";
import { hfClient } from "@/lib/huggingface";
import { analyzePDFViaSpace, checkSpaceHealth } from "@/lib/huggingface";

type TaskResult = { loading: boolean; data: unknown; error: string | null };

export default function LaboratorioIA() {
  const { toast } = useToast();
  const [transformersReady, setTransformersReady] = useState<boolean | null>(null);

  // Text tab state
  const [textInput, setTextInput] = useState("");
  const [sentimentResult, setSentimentResult] = useState<TaskResult>({ loading: false, data: null, error: null });
  const [nerResult, setNerResult] = useState<TaskResult>({ loading: false, data: null, error: null });
  const [summaryResult, setSummaryResult] = useState<TaskResult>({ loading: false, data: null, error: null });
  const [zeroShotLabels, setZeroShotLabels] = useState("direito civil, direito penal, direito trabalhista, direito tributário");
  const [zeroShotResult, setZeroShotResult] = useState<TaskResult>({ loading: false, data: null, error: null });
  const [qaContext, setQaContext] = useState("");
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaResult, setQaResult] = useState<TaskResult>({ loading: false, data: null, error: null });

  // Vision tab state
  const [imageUrl, setImageUrl] = useState("");
  const [visionResult, setVisionResult] = useState<TaskResult>({ loading: false, data: null, error: null });

  // Audio tab state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioResult, setAudioResult] = useState<TaskResult>({ loading: false, data: null, error: null });
  const [ttsText, setTtsText] = useState("");
  const [ttsResult, setTtsResult] = useState<TaskResult>({ loading: false, data: null, error: null });

  // PDF tab state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfResult, setPdfResult] = useState<TaskResult>({ loading: false, data: null, error: null });
  const [spaceHealth, setSpaceHealth] = useState<TaskResult>({ loading: false, data: null, error: null });

  // Hybrid Vision tab state
  const [hybridFile, setHybridFile] = useState<File | null>(null);
  const [hybridMode, setHybridMode] = useState<VisionMode>("identify");
  const [hybridTeachLabel, setHybridTeachLabel] = useState("");
  const [hybridContext, setHybridContext] = useState("");
  const [hybridResult, setHybridResult] = useState<TaskResult>({ loading: false, data: null, error: null });

  const checkTransformers = async () => {
    const available = await isTransformersAvailable();
    setTransformersReady(available);
    toast({
      title: available ? "Transformers.js disponível" : "Transformers.js indisponível",
      description: available ? "Modelos browser prontos para uso (WebAssembly)" : "Verifique se @huggingface/transformers está instalado",
    });
  };

  const runTask = async (setter: (v: TaskResult) => void, fn: () => Promise<unknown>) => {
    setter({ loading: true, data: null, error: null });
    try {
      const data = await fn();
      setter({ loading: false, data, error: null });
    } catch (e: any) {
      setter({ loading: false, data: null, error: e.message || "Erro desconhecido" });
    }
  };

  const renderResult = (result: TaskResult) => {
    if (result.loading) return <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" />Processando...</div>;
    if (result.error) return <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle className="h-4 w-4" />{result.error}</div>;
    if (result.data === null) return null;
    return (
      <pre className="bg-muted/50 border border-border rounded-md p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap">
        {typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2)}
      </pre>
    );
  };

  const loadedPipelines = getLoadedPipelines();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Laboratório IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Teste todas as ferramentas HuggingFace integradas — browser (WASM) e server-side
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={checkTransformers}>
            {transformersReady === null ? "Verificar Transformers.js" : transformersReady ? <><CheckCircle2 className="h-3 w-3 mr-1 text-primary" />WASM OK</> : <><AlertCircle className="h-3 w-3 mr-1 text-destructive" />Indisponível</>}
          </Button>
          {loadedPipelines.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { clearPipelineCache(); toast({ title: "Cache limpo" }); }}>
              <Trash2 className="h-3 w-3 mr-1" />Cache ({loadedPipelines.length})
            </Button>
          )}
        </div>
      </div>

      {/* Orion Integration Banner */}
      <div className="bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
        <div className="h-8 w-8 bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0 rounded-full">
          <Volume2 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Integrado com Orion por voz</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Todas as funções deste laboratório podem ser acionadas por voz. Diga <span className="text-primary font-medium">"Orion, status do laboratório"</span> para ver todas as capacidades.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              '"Analisar sentimento de [texto]"',
              '"Extrair entidades de [texto]"', 
              '"Resumir texto [texto]"',
              '"Transcrever áudio"',
              '"Visão híbrida"',
            ].map((cmd) => (
              <span key={cmd} className="inline-flex px-2 py-0.5 bg-primary/10 border border-primary/15 text-[10px] text-primary font-mono">
                🎙️ {cmd}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">🧠 Transformers.js — Browser (WASM)</Badge>
        <Badge variant="outline" className="text-xs">⚡ HF Inference API — Edge Function</Badge>
        <Badge variant="outline" className="text-xs">🔗 Gradio — HF Spaces</Badge>
        <Badge variant="outline" className="text-xs">🎙️ Orion Voice — Integrado</Badge>
      </div>

      <Tabs defaultValue="texto" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="texto" className="text-xs gap-1"><Sparkles className="h-3 w-3" />Texto</TabsTrigger>
          <TabsTrigger value="visao" className="text-xs gap-1"><Eye className="h-3 w-3" />Visão</TabsTrigger>
          <TabsTrigger value="hybrid" className="text-xs gap-1"><Zap className="h-3 w-3" />Hybrid Vision</TabsTrigger>
          <TabsTrigger value="audio" className="text-xs gap-1"><Mic className="h-3 w-3" />Áudio</TabsTrigger>
          <TabsTrigger value="pdf" className="text-xs gap-1"><FileText className="h-3 w-3" />PDF</TabsTrigger>
        </TabsList>

        {/* ===== TEXTO TAB ===== */}
        <TabsContent value="texto" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Texto de entrada</CardTitle>
              <CardDescription className="text-xs">Cole o texto para análise (sentimento, NER, resumo, classificação)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Digite ou cole um texto jurídico para análise..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sentiment */}
            <Card>
              <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center justify-between">
                  Análise de Sentimento
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="text-[10px]">Browser</Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">🎙️ Voz</Badge>
                  </div>
                </CardTitle>
                <CardDescription className="text-[10px]">Comando: "Orion, analisar sentimento de [texto]"</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button size="sm" className="w-full" disabled={!textInput || sentimentResult.loading} onClick={() => runTask(setSentimentResult, () => analyzeSentiment(textInput))}>
                  <Play className="h-3 w-3 mr-1" />Analisar
                </Button>
                {renderResult(sentimentResult)}
              </CardContent>
            </Card>

            {/* NER */}
            <Card>
              <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center justify-between">
                  Extração de Entidades (NER)
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="text-[10px]">Browser</Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">🎙️ Voz</Badge>
                  </div>
                </CardTitle>
                <CardDescription className="text-[10px]">Comando: "Orion, extrair entidades de [texto]"</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button size="sm" className="w-full" disabled={!textInput || nerResult.loading} onClick={() => runTask(setNerResult, () => extractEntities(textInput))}>
                  <Play className="h-3 w-3 mr-1" />Extrair
                </Button>
                {renderResult(nerResult)}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center justify-between">
                  Sumarização
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="text-[10px]">Browser</Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">🎙️ Voz</Badge>
                  </div>
                </CardTitle>
                <CardDescription className="text-[10px]">Comando: "Orion, resumir texto [texto]"</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button size="sm" className="w-full" disabled={!textInput || summaryResult.loading} onClick={() => runTask(setSummaryResult, () => summarizeText(textInput))}>
                  <Play className="h-3 w-3 mr-1" />Resumir
                </Button>
                {renderResult(summaryResult)}
              </CardContent>
            </Card>

            {/* Zero-shot */}
            <Card>
              <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center justify-between">
                  Classificação Zero-Shot
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="text-[10px]">Browser</Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">🎙️ Voz</Badge>
                  </div>
                </CardTitle>
                <CardDescription className="text-[10px]">Comando: "Orion, classificar [texto] como [categorias]"</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input placeholder="Labels (separados por vírgula)" value={zeroShotLabels} onChange={(e) => setZeroShotLabels(e.target.value)} className="text-xs" />
                <Button size="sm" className="w-full" disabled={!textInput || !zeroShotLabels || zeroShotResult.loading} onClick={() => runTask(setZeroShotResult, () => zeroShotClassify(textInput, zeroShotLabels.split(",").map(l => l.trim())))}>
                  <Play className="h-3 w-3 mr-1" />Classificar
                </Button>
                {renderResult(zeroShotResult)}
              </CardContent>
            </Card>
          </div>

          {/* Q&A */}
          <Card>
            <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center justify-between">
                  Pergunta & Resposta (Q&A)
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="text-[10px]">Browser</Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">🎙️ Voz</Badge>
                  </div>
                </CardTitle>
                <CardDescription className="text-[10px]">Comando: "Orion, responder sobre [pergunta] com base em [contexto]"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Contexto (ex: artigo de lei, trecho de contrato)..." value={qaContext} onChange={(e) => setQaContext(e.target.value)} rows={3} className="text-sm" />
              <Input placeholder="Pergunta sobre o contexto..." value={qaQuestion} onChange={(e) => setQaQuestion(e.target.value)} className="text-sm" />
              <Button size="sm" disabled={!qaContext || !qaQuestion || qaResult.loading} onClick={() => runTask(setQaResult, () => answerQuestion(qaQuestion, qaContext))}>
                <Play className="h-3 w-3 mr-1" />Responder
              </Button>
              {renderResult(qaResult)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== VISÃO TAB ===== */}
        <TabsContent value="visao" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Classificação de Imagem</CardTitle>
              <CardDescription className="text-xs">Envia imagem para classificação via HF Inference API (Edge Function)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="URL da imagem..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="text-sm" />
              <Button size="sm" disabled={!imageUrl || visionResult.loading} onClick={() => runTask(setVisionResult, () => hfClient.inference({ task: "image-classification", inputs: imageUrl }))}>
                <Play className="h-3 w-3 mr-1" />Classificar Imagem
              </Button>
              {renderResult(visionResult)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== HYBRID VISION TAB ===== */}
        <TabsContent value="hybrid" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Orion Vision Hybrid
                </span>
                <Badge variant="secondary" className="text-[10px]">Auto-Evolução</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Pipeline híbrido: protocolos locais → Motor Alpha Vision (só quando incerto) → auto-aprende e evolui
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input type="file" accept="image/*" onChange={(e) => setHybridFile(e.target.files?.[0] || null)} className="text-xs" />

              <div className="flex gap-2 flex-wrap">
                {(["identify", "describe", "analyze", "teach"] as VisionMode[]).map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={hybridMode === m ? "default" : "outline"}
                    onClick={() => setHybridMode(m)}
                    className="text-xs"
                  >
                    {m === "identify" ? "🔍 Identificar" : m === "describe" ? "📝 Descrever" : m === "analyze" ? "🧠 Analisar" : "📚 Ensinar"}
                  </Button>
                ))}
              </div>

              {hybridMode === "teach" && (
                <Input
                  placeholder="Nome do objeto para ensinar (ex: caneca azul)..."
                  value={hybridTeachLabel}
                  onChange={(e) => setHybridTeachLabel(e.target.value)}
                  className="text-sm"
                />
              )}

              <Textarea
                placeholder="Contexto adicional (opcional)..."
                value={hybridContext}
                onChange={(e) => setHybridContext(e.target.value)}
                rows={2}
                className="text-sm"
              />

              <Button
                size="sm"
                className="w-full"
                disabled={!hybridFile || hybridResult.loading || (hybridMode === "teach" && !hybridTeachLabel)}
                onClick={async () => {
                  if (!hybridFile) return;
                  runTask(setHybridResult, async () => {
                    const base64 = await fileToBase64(hybridFile);
                    return hybridVisionAnalyze(base64, {
                      mode: hybridMode,
                      mimeType: hybridFile.type || "image/jpeg",
                      teachLabel: hybridMode === "teach" ? hybridTeachLabel : undefined,
                      context: hybridContext || undefined,
                    });
                  });
                }}
              >
                <Play className="h-3 w-3 mr-1" />
                {hybridMode === "teach" ? "Ensinar Orion" : "Processar com Hybrid Vision"}
              </Button>
              {renderResult(hybridResult)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ÁUDIO TAB ===== */}
        <TabsContent value="audio" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Transcrição (Whisper)</CardTitle>
                <CardDescription className="text-xs">Envia áudio para transcrição via Edge Function</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} className="text-xs" />
                <Button size="sm" disabled={!audioFile || audioResult.loading} onClick={() => {
                  if (!audioFile) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64 = (reader.result as string).split(",")[1];
                    runTask(setAudioResult, () => hfClient.inference({ task: "automatic-speech-recognition", inputs: base64 }));
                  };
                  reader.readAsDataURL(audioFile);
                }}>
                  <Play className="h-3 w-3 mr-1" />Transcrever
                </Button>
                {renderResult(audioResult)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Text-to-Speech</CardTitle>
                <CardDescription className="text-xs">Gera áudio a partir de texto via Edge Function</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea placeholder="Texto para sintetizar em áudio..." value={ttsText} onChange={(e) => setTtsText(e.target.value)} rows={3} className="text-sm" />
                <Button size="sm" disabled={!ttsText || ttsResult.loading} onClick={() => runTask(setTtsResult, () => hfClient.inference({ task: "text-to-speech", inputs: ttsText }))}>
                  <Play className="h-3 w-3 mr-1" />Gerar Áudio
                </Button>
                {renderResult(ttsResult)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== PDF TAB ===== */}
        <TabsContent value="pdf" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Análise de PDF via Gradio Space
                <Button variant="outline" size="sm" onClick={() => runTask(setSpaceHealth, () => checkSpaceHealth())}>
                  {spaceHealth.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Health Check"}
                </Button>
              </CardTitle>
              <CardDescription className="text-xs">Conecta ao Space Ericsonv12/adv para análise de documentos PDF</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {spaceHealth.data && renderResult(spaceHealth)}
              <Input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="text-xs" />
              <div className="flex gap-2">
                <Button size="sm" disabled={!pdfFile || pdfResult.loading} onClick={() => runTask(setPdfResult, () => analyzePDFViaSpace(pdfFile!, "analyze"))}>
                  <Play className="h-3 w-3 mr-1" />Analisar
                </Button>
                <Button size="sm" variant="outline" disabled={!pdfFile || pdfResult.loading} onClick={() => runTask(setPdfResult, () => analyzePDFViaSpace(pdfFile!, "markdown"))}>
                  Markdown
                </Button>
                <Button size="sm" variant="outline" disabled={!pdfFile || pdfResult.loading} onClick={() => runTask(setPdfResult, () => analyzePDFViaSpace(pdfFile!, "html"))}>
                  HTML
                </Button>
              </div>
              {renderResult(pdfResult)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
