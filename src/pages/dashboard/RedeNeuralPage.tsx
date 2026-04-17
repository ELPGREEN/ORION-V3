import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import {
  Brain,
  Upload,
  Plus,
  Sparkles,
  Settings2,
  BookOpen,
  Loader2,
  CheckCircle2,
  Clock,
  BarChart3,
  Zap,
  Database,
  FileText,
  Search,
  Layers,
  Eye,
  CloudUpload,
  File,
  X,
  GitBranch,
  Activity,
  Camera,
  Globe,
  Shield,
  Headphones,
  Cpu,
  Music,
  Play,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";

// Componentes modulares
import { NeuralErrorBoundary } from "@/components/dashboard/neural/NeuralErrorBoundary";
import { OrionPlaylistBar } from "@/components/orion/OrionPlaylistBar";
import { VideoOverlay } from "@/components/orion/VideoOverlay";
import { OrionIoTPanel } from "@/components/orion/OrionIoTPanel";
import { lazyRetry } from "@/lib/lazyRetry";

// Lazy-load Orchestrator tabs (merged from OrionOrchestratorPage)
const OrionOrchestratorTabs = lazy(lazyRetry(() => import("@/components/dashboard/neural/OrionOrchestratorTabs")));

// Lazy-load all heavy neural panels for code-splitting
const DataJudIngestionPanel = lazy(lazyRetry(() => import("@/components/dashboard/neural/DataJudIngestionPanel").then(m => ({ default: m.DataJudIngestionPanel }))));
const DataSourcesPanel = lazy(lazyRetry(() => import("@/components/dashboard/neural/DataSourcesPanel").then(m => ({ default: m.DataSourcesPanel }))));
const NeuralDocumentation = lazy(lazyRetry(() => import("@/components/dashboard/neural/NeuralDocumentation").then(m => ({ default: m.NeuralDocumentation }))));
const QuickActionsPanel = lazy(lazyRetry(() => import("@/components/dashboard/neural/QuickActionsPanel").then(m => ({ default: m.QuickActionsPanel }))));
const AttentionHeatmap = lazy(lazyRetry(() => import("@/components/dashboard/neural/AttentionHeatmap").then(m => ({ default: m.AttentionHeatmap }))));
const NeuralArchitectureDiagram = lazy(lazyRetry(() => import("@/components/dashboard/neural/NeuralArchitectureDiagram").then(m => ({ default: m.NeuralArchitectureDiagram }))));
const NeuroCoreArchitectureDiagram = lazy(lazyRetry(() => import("@/components/dashboard/neural/NeuroCoreArchitectureDiagram").then(m => ({ default: m.NeuroCoreArchitectureDiagram }))));
const NeuralGuideNonTech = lazy(lazyRetry(() => import("@/components/dashboard/neural/NeuralGuideNonTech").then(m => ({ default: m.NeuralGuideNonTech }))));
const LegislacaoFederalPanel = lazy(lazyRetry(() => import("@/components/dashboard/neural/LegislacaoFederalPanel").then(m => ({ default: m.LegislacaoFederalPanel }))));
const NeuralMetricsDashboard = lazy(lazyRetry(() => import("@/components/dashboard/neural/NeuralMetricsDashboard").then(m => ({ default: m.NeuralMetricsDashboard }))));
const NeuralSemanticSearch = lazy(lazyRetry(() => import("@/components/dashboard/neural/NeuralSemanticSearch").then(m => ({ default: m.NeuralSemanticSearch }))));
const QuantumPerceptronVisualization = lazy(lazyRetry(() => import("@/components/dashboard/neural/QuantumPerceptronVisualization").then(m => ({ default: m.QuantumPerceptronVisualization }))));
const ABMetricsDashboard = lazy(lazyRetry(() => import("@/components/dashboard/neural/ABMetricsDashboard").then(m => ({ default: m.ABMetricsDashboard }))));
const NeuralHealthDashboard = lazy(lazyRetry(() => import("@/components/dashboard/neural/NeuralHealthDashboard").then(m => ({ default: m.NeuralHealthDashboard }))));
const NeuralPDFReport = lazy(lazyRetry(() => import("@/components/dashboard/neural/NeuralPDFReport").then(m => ({ default: m.NeuralPDFReport }))));
const NeuralEvolutionPanel = lazy(lazyRetry(() => import("@/components/dashboard/neural/NeuralEvolutionPanel").then(m => ({ default: m.NeuralEvolutionPanel }))));
const ARCAgentPanel = lazy(lazyRetry(() => import("@/components/dashboard/neural/ARCAgentPanel")));
const JarvisHUD = lazy(lazyRetry(() => import("@/components/dashboard/neural/JarvisHUD").then(m => ({ default: m.JarvisHUD }))));
const ProactiveAlerts = lazy(lazyRetry(() => import("@/components/dashboard/neural/ProactiveAlerts").then(m => ({ default: m.ProactiveAlerts }))));
const NeuralNetworkLiveView = lazy(lazyRetry(() => import("@/components/dashboard/neural/NeuralNetworkLiveView").then(m => ({ default: m.NeuralNetworkLiveView }))));
const NeuralConsciousnessLoop = lazy(lazyRetry(() => import("@/components/dashboard/neural/NeuralConsciousnessLoop").then(m => ({ default: m.NeuralConsciousnessLoop }))));
const NeuralVision = lazy(lazyRetry(() => import("@/components/dashboard/neural/NeuralVision").then(m => ({ default: m.NeuralVision }))));
const WebAPIDashboard = lazy(lazyRetry(() => import("@/components/dashboard/neural/WebAPIDashboard").then(m => ({ default: m.WebAPIDashboard }))));
const FaceAuthEnroll = lazy(lazyRetry(() => import("@/components/auth/FaceAuthEnroll").then(m => ({ default: m.FaceAuthEnroll }))));
const OrionShieldPanel = lazy(lazyRetry(() => import("@/components/dashboard/neural/OrionShieldPanel").then(m => ({ default: m.OrionShieldPanel }))));
const ArquiteturaIA = lazy(lazyRetry(() => import("@/pages/dashboard/ArquiteturaIA")));
const JulesSelfImprovePanel = lazy(lazyRetry(() => import("@/components/dashboard/neural/JulesSelfImprovePanel").then(m => ({ default: m.JulesSelfImprovePanel }))));
const AttentionVisualizationLazy = lazy(() => import("@/components/dashboard/neural/AttentionVisualization").then((m) => ({ default: m.AttentionVisualization })));
const OrionAudiobookListener = lazy(lazyRetry(() => import("@/components/orion/OrionAudiobookListener").then(m => ({ default: m.OrionAudiobookListener }))));
const SpotifyPlayer = lazy(lazyRetry(() => import("@/components/spotify/SpotifyPlayer").then(m => ({ default: m.SpotifyPlayer }))));
const AmazonMusicPlayer = lazy(lazyRetry(() => import("@/components/amazon/AmazonMusicPlayer").then(m => ({ default: m.AmazonMusicPlayer }))));
const YouTubeMusicPlayer = lazy(lazyRetry(() => import("@/components/youtube-music/YouTubeMusicPlayer").then(m => ({ default: m.YouTubeMusicPlayer }))));

const OrionAPIStatusDashboard = lazy(lazyRetry(() => import("@/components/dashboard/neural/OrionAPIStatusDashboard").then(m => ({ default: m.OrionAPIStatusDashboard }))));
const QuantumRuntimeDashboard = lazy(lazyRetry(() => import("@/components/dashboard/neural/QuantumRuntimeDashboard").then(m => ({ default: m.QuantumRuntimeDashboard }))));
const ScreenRecorder = lazy(lazyRetry(() => import("@/components/dashboard/neural/ScreenRecorder").then(m => ({ default: m.ScreenRecorder }))));
const KnowledgeHarvester = lazy(lazyRetry(() => import("@/components/dashboard/neural/KnowledgeHarvester").then(m => ({ default: m.KnowledgeHarvester }))));
const PrivateKnowledge = lazy(lazyRetry(() => import("@/components/dashboard/neural/PrivateKnowledge").then(m => ({ default: m.PrivateKnowledge }))));
const HopfieldVisualization = lazy(lazyRetry(() => import("@/components/dashboard/neural/HopfieldVisualization").then(m => ({ default: m.HopfieldVisualization }))));
const PlasmaCanvas = lazy(lazyRetry(() => import("@/components/dashboard/neural/EnergyOrb").then(m => ({ default: m.PlasmaCanvas }))));
// ─── Fase 9.3: Smart Upload Panel ───
function SmartUploadPanel({ userId, onUploaded }: { userId?: string; onUploaded: () => void }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Array<{ fileName: string; status: string; chunks?: number; category?: string }>>([]);

  const ACCEPTED = ".pdf,.txt,.doc,.docx";
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const valid: File[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_FILE_SIZE) {
        toast({ title: `${f.name} excede 100MB`, variant: "destructive" });
      } else {
        valid.push(f);
      }
    }
    setPendingFiles(prev => [...prev, ...valid].slice(0, 5));
  }

  async function processFiles() {
    if (!userId || pendingFiles.length === 0) return;
    setUploading(true);
    const newResults: typeof results = [];

    for (const file of pendingFiles) {
      try {
        const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${userId}/smart-ingest/${Date.now()}_${safeName}`;
        const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
        if (uploadError) throw uploadError;

        const { data, error } = await supabase.functions.invoke("ingest-legal", {
          body: { action: "smart", storagePath: path, fileName: file.name, fileType: file.type },
        });

        if (error) throw error;
        
        const isQueued = data?.backgroundProcessing;
        newResults.push({
          fileName: file.name,
          status: isQueued ? "queued" : "success",
          chunks: data?.totalChunks,
          category: data?.category,
        });
        
        if (isQueued) {
          toast({ 
            title: `📚 ${file.name} — processamento em lotes`, 
            description: `${data?.indexed || 0} chunks indexados agora, ${data?.queued || 0} serão processados em segundo plano.`,
          });
        }
      } catch (err: any) {
        const isTimeout = err.message?.includes("timeout") || err.message?.includes("TIMEOUT") || err.message?.includes("408");
        const errorMsg = isTimeout
          ? "Processamento iniciado em segundo plano. Aguarde alguns minutos."
          : `erro: ${err.message}`;
        newResults.push({ fileName: file.name, status: `error: ${errorMsg}` });
      }
    }

    setResults(newResults);
    setPendingFiles([]);
    setUploading(false);
    onUploaded();
    const successCount = newResults.filter(r => r.status === "success").length;
    const errorCount = newResults.filter(r => r.status !== "success").length;
    if (successCount > 0) {
      toast({ title: `${successCount} documento(s) ingerido(s)`, description: "Chunks criados com embeddings." });
    }
    if (errorCount > 0) {
      toast({ 
        title: `${errorCount} documento(s) falharam`, 
        description: "Verifique os detalhes abaixo. PDFs grandes podem precisar ser divididos.",
        variant: "destructive",
      });
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CloudUpload className="h-4 w-4 text-primary" />
          Ingestão Inteligente de Documentos
        </CardTitle>
        <CardDescription className="text-xs">
          Arraste PDFs, TXTs ou DOCXs — serão automaticamente chunked, classificados e indexados
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Arraste arquivos aqui ou clique para selecionar
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            PDF, TXT, DOCX — até 100MB (livros grandes são processados em lotes automáticos)
          </p>
        </div>

        {/* Pending files */}
        {pendingFiles.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {pendingFiles.map((f, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-background border border-border rounded text-xs">
                <div className="flex items-center gap-2">
                  <File className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{f.name}</span>
                  <span className="text-muted-foreground">({(f.size / 1024).toFixed(0)} KB)</span>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button onClick={processFiles} disabled={uploading} className="btn-gold w-full mt-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              {uploading ? "Processando..." : `Ingerir ${pendingFiles.length} arquivo(s)`}
            </Button>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-3 space-y-1">
            {results.map((r, idx) => (
              <div key={idx} className={`flex items-center gap-2 p-2 rounded text-xs ${r.status === "success" ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                {r.status === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <X className="h-3.5 w-3.5 text-red-500" />
                )}
                <span>{r.fileName}</span>
                {r.chunks && <Badge variant="outline" className="text-[8px]">{r.chunks} chunks</Badge>}
                {r.category && <Badge variant="secondary" className="text-[8px]">{r.category}</Badge>}
                {r.status !== "success" && <span className="text-red-500 text-[9px]">{r.status}</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface Specialization {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  accuracy_score: number;
  training_status: string;
  created_at: string;
}

interface KnowledgeEntry {
  id: string;
  title: string;
  source_type: string;
  is_processed: boolean;
  created_at: string;
}

interface AIProvider {
  id: string;
  provider_name: string;
  display_name: string;
  is_enabled: boolean;
  priority: number;
}

export default function RedeNeuralPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { logNeural } = useNeuralFeedback();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [evolutionTriggered, setEvolutionTriggered] = useState(false);

  // Realtime: detect new applied evolutions → trigger face effect
  useEffect(() => {
    const channel = supabase
      .channel("neural-evolution-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "neural_evolution_proposals", filter: "status=eq.applied" },
        () => {
          setEvolutionTriggered(true);
          toast({ title: "🧠 Evolução Neural Aplicada", description: "O sistema evoluiu! Face neural ativada." });
          // Reset trigger after face duration + buffer
          setTimeout(() => setEvolutionTriggered(false), 65000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [toast]);

  // Data states
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [knowledgeTotalCount, setKnowledgeTotalCount] = useState(0);
  const [knowledgeProcessedCount, setKnowledgeProcessedCount] = useState(0);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [learningStats, setLearningStats] = useState({
    totalInteractions: 0,
    learnedItems: 0,
    averageQuality: 0,
  });

  // Form states — persisted to localStorage to survive refresh/tab switch
  const KNOWLEDGE_STORAGE_KEY = "neural_newKnowledge_draft";
  const [newKnowledge, setNewKnowledge] = useState(() => {
    try {
      const saved = localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { title: "", content: "", source_type: "jurisprudencia", source_reference: "", tags: "" };
  });

  // Persist form state on every change
  useEffect(() => {
    try {
      if (newKnowledge.title || newKnowledge.content || newKnowledge.tags || newKnowledge.source_reference) {
        localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(newKnowledge));
      } else {
        localStorage.removeItem(KNOWLEDGE_STORAGE_KEY);
      }
    } catch { /* ignore */ }
  }, [newKnowledge]);

  const [newSpecialization, setNewSpecialization] = useState({
    name: "",
    description: "",
    category: "direito_civil",
  });

  useEffect(() => {
    loadData();
    initialLoadDone.current = true;
  }, []);

  useRefreshOnFocus(useCallback(() => { if (initialLoadDone.current) loadData(true); }, []));

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const { data: specs } = await supabase
        .from("neural_specializations")
        .select("id, name, description, category, accuracy_score, training_status, is_active, training_data, prompts, created_at, updated_at, user_id")
        .order("created_at", { ascending: false });
      if (specs) setSpecializations(specs as Specialization[]);

      const { data: knowledge, count: knowledgeCount } = await supabase
        .from("neural_knowledge_base")
        .select("id, title, source_type, is_processed, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(20);
      if (knowledge) setKnowledgeEntries(knowledge as KnowledgeEntry[]);
      setKnowledgeTotalCount(knowledgeCount || knowledge?.length || 0);

      // Get real processed count
      const { count: processedCount } = await supabase
        .from("neural_knowledge_base")
        .select("id", { count: "exact", head: true })
        .eq("is_processed", true);
      setKnowledgeProcessedCount(processedCount || 0);

      const { data: provs } = await supabase
        .from("ai_providers")
        .select("*")
        .order("priority");
      if (provs) setProviders(provs as AIProvider[]);

      const { count: total } = await supabase
        .from("neural_learning_data")
        .select("*", { count: "exact", head: true });

      const { count: learned } = await supabase
        .from("neural_learning_data")
        .select("*", { count: "exact", head: true })
        .eq("learned", true);

      setLearningStats({
        totalInteractions: total || 0,
        learnedItems: learned || 0,
        averageQuality: total && learned ? (learned / total) : 0,
      });
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  async function handleAddKnowledge() {
    if (!newKnowledge.title || !newKnowledge.content) {
      toast({ title: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("neural-training", {
        body: {
          action: "add_knowledge",
          userId: user?.id,
          data: {
            ...newKnowledge,
            tags: newKnowledge.tags.split(",").map((t) => t.trim()).filter(Boolean),
          },
        },
      });

      if (error) throw error;

      // 🧠 Neural: conhecimento adicionado manualmente = sinal de alta qualidade
      logNeural({
        interaction_type: "document_viewed",
        input_text: newKnowledge.title,
        output_text: newKnowledge.content,
        quality_score: 0.85,
        user_id: user?.id,
        metadata: { source_type: newKnowledge.source_type, module: "rede_neural_knowledge", action: "add_knowledge" },
      });

      toast({ title: "Conhecimento adicionado!", description: "O embedding será gerado automaticamente." });
      setNewKnowledge({ title: "", content: "", source_type: "jurisprudencia", source_reference: "", tags: "" });
      localStorage.removeItem(KNOWLEDGE_STORAGE_KEY);
      loadData();
    } catch (error) {
      toast({ title: "Erro ao adicionar", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateSpecialization() {
    if (!newSpecialization.name) {
      toast({ title: "Preencha o nome da especialização", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("neural-training", {
        body: {
          action: "create_specialization",
          userId: user?.id,
          data: newSpecialization,
        },
      });

      if (error) throw error;

      toast({ title: "Especialização criada!", description: "O treinamento iniciará em breve." });
      setNewSpecialization({ name: "", description: "", category: "direito_civil" });
      loadData();
    } catch (error) {
      toast({ title: "Erro ao criar especialização", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleProvider(providerId: string, enabled: boolean) {
    try {
      await supabase
        .from("ai_providers")
        .update({ is_enabled: enabled })
        .eq("id", providerId);

      setProviders((prev) =>
        prev.map((p) => (p.id === providerId ? { ...p, is_enabled: enabled } : p))
      );

      toast({ title: enabled ? "Provedor ativado" : "Provedor desativado" });
    } catch (error) {
    }
  }

  async function toggleSpecialization(specId: string, active: boolean) {
    try {
      await supabase
        .from("neural_specializations")
        .update({ is_active: active })
        .eq("id", specId);

      setSpecializations((prev) =>
        prev.map((s) => (s.id === specId ? { ...s, is_active: active } : s))
      );

      toast({ title: active ? "Especialização ativada" : "Especialização desativada" });
    } catch (error) {
    }
  }

  const categoryLabels: Record<string, string> = {
    direito_civil: "Direito Civil",
    direito_penal: "Direito Penal",
    direito_trabalhista: "Direito Trabalhista",
    direito_tributario: "Direito Tributário",
    direito_familia: "Direito de Família",
    direito_consumidor: "Direito do Consumidor",
    direito_empresarial: "Direito Empresarial",
    direito_previdenciario: "Direito Previdenciário",
    direito_administrativo: "Direito Administrativo",
    direito_ambiental: "Direito Ambiental",
    direito_constitucional: "Direito Constitucional",
    direito_eleitoral: "Direito Eleitoral",
    direito_bancario: "Direito Bancário",
    direito_imobiliario: "Direito Imobiliário",
    direito_internacional: "Direito Internacional",
    us_constitutional: "US Constitutional Law",
    us_civil: "US Civil Law",
    us_criminal: "US Criminal Law",
    comparado: "Direito Comparado",
    jurisprudencia: "Jurisprudência",
    custom: "Personalizado",
  };

  const sourceTypeLabels: Record<string, string> = {
    jurisprudencia: "Jurisprudência",
    doutrina: "Doutrina",
    legislacao: "Legislação",
    modelo_documento: "Modelo de Documento",
    custom: "Personalizado",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-fade-in relative">
      {/* ═══ Tron Grid Background ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(#3B82F60.3) 1px, transparent 1px),
            linear-gradient(90deg, #3B82F60.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #3B82F60.08) 2px, #3B82F60.08) 4px)",
        }}
      />
      {/* Radial vignette */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)" }}
      />

      {/* Header — Tron Style */}
      <div className="relative flex items-center gap-3 md:gap-4 flex-wrap sm:flex-nowrap z-10 p-4 rounded-lg border border-[#D4AF37]/20 bg-gradient-to-r from-[#0a0a0f]/80 via-[#0a0a0f]/60 to-[#0a0a0f]/80"
        style={{ boxShadow: "0 0 30px rgba(212,175,55,0.08), inset 0 1px 0 rgba(212,175,55,0.15)" }}>
        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3B82F6]/30 to-transparent" />
        
        <div className="relative">
          <Brain className="h-7 w-7 md:h-9 md:w-9 shrink-0" style={{ color: "#D4AF37", filter: "drop-shadow(0 0 8px rgba(212,175,55,0.5))" }} />
          <div className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 20px rgba(212,175,55,0.2)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-2xl font-bold tracking-wider truncate"
              style={{ color: "#D4AF37", textShadow: "0 0 20px rgba(212,175,55,0.4)", letterSpacing: "0.08em" }}>
              REDE NEURAL CONEXÃO
            </h1>
            <Badge className="text-[9px] px-2 py-0 h-5 shrink-0 gap-1 border-0 font-mono"
              style={{ backgroundColor: "rgba(212,175,55,0.12)", color: "#D4AF37", boxShadow: "0 0 10px rgba(212,175,55,0.15)" }}>
              <Zap className="h-2.5 w-2.5" />
              LIVE
            </Badge>
          </div>
          <p className="text-[10px] md:text-xs mt-0.5 hidden sm:block font-mono tracking-wide"
            style={{ color: "#3B82F60.5)" }}>
            Painel Admin · IAs · Ingestão · Especializações · Documentação
          </p>
        </div>
        <NeuralPDFReport />
        <Suspense fallback={null}>
          <ScreenRecorder />
        </Suspense>
      </div>

      {/* ═══ Playlist Orion — Horizontal Player Bar ═══ */}
      <OrionPlaylistBar />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-10">
        <TabsList className="flex w-full overflow-x-auto fade-scroll-x gap-0.5 p-1.5 h-auto flex-nowrap rounded-lg border border-[#3B82F6]/15"
          style={{ backgroundColor: "rgba(10,10,15,0.7)", boxShadow: "0 0 20px #3B82F60.05), inset 0 1px 0 #3B82F60.1)" }}>
          <TabsTrigger value="overview" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Visão Geral</span>
            <span className="sm:hidden">Geral</span>
            {learningStats.totalInteractions > 0 && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />}
          </TabsTrigger>
          <TabsTrigger value="guide" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Guia
          </TabsTrigger>
          <TabsTrigger value="attention" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Eye className="h-3.5 w-3.5" />
            Atenção
          </TabsTrigger>
          <TabsTrigger value="ingestion" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Database className="h-3.5 w-3.5" />
            Ingestão
          </TabsTrigger>
          <TabsTrigger value="legislacao" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5" />
            Legislação
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Conhecimento</span>
            <span className="sm:hidden">Conhec.</span>
            {knowledgeTotalCount > 0 && (
              <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 ml-0.5">{knowledgeTotalCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="specializations" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Especializações</span>
            <span className="sm:hidden">Espec.</span>
            {specializations.length > 0 && (
              <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 ml-0.5">{specializations.filter(s => s.is_active).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="providers" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Provedores</span>
            <span className="sm:hidden">Prov.</span>
            {providers.length > 0 && (
              <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 ml-0.5">{providers.filter(p => p.is_enabled).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="evolution" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <GitBranch className="h-3.5 w-3.5" />
            Evolução
            {evolutionTriggered && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />}
          </TabsTrigger>
          <TabsTrigger value="consciousness" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Consciência</span>
            <span className="sm:hidden">AI</span>
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />
          </TabsTrigger>
          <TabsTrigger value="live" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Rede ao Vivo</span>
            <span className="sm:hidden">Live</span>
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
          </TabsTrigger>
          <TabsTrigger value="vision" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Visão Neural</span>
            <span className="sm:hidden">Visão</span>
          </TabsTrigger>
          <TabsTrigger value="webapis" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Web APIs</span>
            <span className="sm:hidden">APIs</span>
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse inline-block" />
          </TabsTrigger>
          <TabsTrigger value="rag-elp" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">R.A.G ELP</span>
            <span className="sm:hidden">RAG</span>
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse inline-block" />
          </TabsTrigger>
          <TabsTrigger value="docs" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Arquitetura</span>
            <span className="sm:hidden">Arq.</span>
          </TabsTrigger>
          <TabsTrigger value="interactive" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Demos</span>
            <span className="sm:hidden">Demos</span>
          </TabsTrigger>
          <TabsTrigger value="shield" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Orion Shield</span>
            <span className="sm:hidden">Shield</span>
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
          </TabsTrigger>
          <TabsTrigger value="audiobook" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Headphones className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Audiobook</span>
            <span className="sm:hidden">🎧</span>
          </TabsTrigger>
          <TabsTrigger value="api-status" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">API Status</span>
            <span className="sm:hidden">APIs</span>
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
          </TabsTrigger>
          <TabsTrigger value="quantum-runtime" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Cpu className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Quantum Runtime</span>
            <span className="sm:hidden">Quantum</span>
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse inline-block" />
          </TabsTrigger>
          <TabsTrigger value="iot-devices" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Radio className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">IoT Hub</span>
            <span className="sm:hidden">IoT</span>
          </TabsTrigger>
          <TabsTrigger value="orchestrator" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Orquestrador</span>
            <span className="sm:hidden">KPIs</span>
          </TabsTrigger>
          <TabsTrigger value="arc-agi" className="text-xs shrink-0 gap-1 px-2.5 py-1.5">
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ARC-AGI-3</span>
            <span className="sm:hidden">ARC</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arc-agi" className="space-y-4">
          <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando ARC...</div>}>
            <ARCAgentPanel />
          </Suspense>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* R.A.G ELP Holographic HUD */}
          <NeuralErrorBoundary fallbackTitle="Erro no HUD Holográfico">
            <JarvisHUD
              metrics={{
                neuralHealth: knowledgeProcessedCount > 0 ? Math.min(99.9, (knowledgeProcessedCount / Math.max(knowledgeTotalCount, 1)) * 100) : 0,
                activeConnections: providers.filter(p => p.is_enabled).length,
                processingLoad: Math.min(100, learningStats.totalInteractions % 100),
                knowledgeBase: knowledgeTotalCount,
                alertsCount: 0,
              }}
            />
          </NeuralErrorBoundary>

          {/* Proactive Alerts */}
          <NeuralErrorBoundary fallbackTitle="Erro nos Alertas">
            <ProactiveAlerts />
          </NeuralErrorBoundary>


          {/* Neural Health Dashboard */}
          <NeuralErrorBoundary fallbackTitle="Erro no Health Dashboard">
            <NeuralHealthDashboard />
          </NeuralErrorBoundary>

          {/* Neural Metrics Dashboard */}
          <NeuralErrorBoundary fallbackTitle="Erro no Metrics Dashboard">
            <NeuralMetricsDashboard />
          </NeuralErrorBoundary>

          {/* Orion Auto-Evolution Panel */}
          <NeuralErrorBoundary fallbackTitle="Erro no Orion Panel">
            <JulesSelfImprovePanel />
          </NeuralErrorBoundary>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { icon: Zap, label: "Interações IA", value: learningStats.totalInteractions, sub: `${learningStats.learnedItems} aprendidas`, color: "#D4AF37" },
              { icon: BookOpen, label: "Base Neural", value: knowledgeTotalCount, sub: `${knowledgeProcessedCount} com embeddings`, color: "#3B82F6" },
              { icon: Brain, label: "Especializações", value: specializations.filter((s) => s.is_active && s.training_status === "completed").length, sub: `${specializations.filter((s) => s.training_status === "training").length} em treinamento`, color: "#22c55e" },
              { icon: Settings2, label: "Provedores Ativos", value: providers.filter(p => p.is_enabled).length, sub: `de ${providers.length} configurados`, color: "#D4AF37" },
            ].map((card, i) => (
              <Card key={i} className="relative overflow-hidden border-0"
                style={{ backgroundColor: "rgba(10,10,15,0.6)", border: `1px solid ${card.color}22`, boxShadow: `0 0 15px ${card.color}08` }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${card.color}40, transparent)` }} />
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-mono font-medium flex items-center gap-2 tracking-wider uppercase" style={{ color: `${card.color}90`, fontSize: "11px" }}>
                    <card.icon className="h-4 w-4" style={{ color: card.color, filter: `drop-shadow(0 0 4px ${card.color}60)` }} />
                    {card.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold font-mono" style={{ color: card.color, textShadow: `0 0 15px ${card.color}40` }}>{card.value}</p>
                  <p className="text-xs mt-1 font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {card.sub}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Active Providers */}
          <Card className="relative overflow-hidden border-0"
            style={{ backgroundColor: "rgba(10,10,15,0.6)", border: "1px solid #3B82F60.12)" }}>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3B82F6]/30 to-transparent" />
            <CardHeader>
              <CardTitle className="text-sm font-mono font-medium tracking-wider uppercase" style={{ color: "#3B82F60.7)" }}>Provedores de IA Ativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {providers
                .filter((p) => p.is_enabled)
                .map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between p-2 rounded-md" style={{ backgroundColor: "#3B82F60.03)", border: "1px solid #3B82F60.08)" }}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.6)" }} />
                      <span className="text-sm font-mono" style={{ color: "rgba(255,255,255,0.7)" }}>{provider.display_name}</span>
                      <Badge className="text-[10px] border-0 font-mono" style={{ backgroundColor: "rgba(212,175,55,0.1)", color: "#D4AF37" }}>
                        P{provider.priority}
                      </Badge>
                    </div>
                    <CheckCircle2 className="h-4 w-4" style={{ color: "#22c55e", filter: "drop-shadow(0 0 4px rgba(34,197,94,0.5))" }} />
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guide Tab */}
        <TabsContent value="guide">
          <NeuralGuideNonTech />
        </TabsContent>

        {/* Attention Tab */}
        <TabsContent value="attention" className="space-y-4">
          <ABMetricsDashboard />
          <Suspense fallback={<Card className="border-border bg-card p-6"><div className="flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></Card>}>
            <AttentionVisualizationLazy />
          </Suspense>
          <QuantumPerceptronVisualization />
          <AttentionHeatmap />
        </TabsContent>

        {/* Ingestion Tab */}
        <TabsContent value="ingestion" className="space-y-6">
          <DataSourcesPanel />
          <DataJudIngestionPanel />
        </TabsContent>

        {/* Legislação Federal Tab */}
        <TabsContent value="legislacao">
          <LegislacaoFederalPanel />
        </TabsContent>
        {/* Knowledge Tab */}
        <TabsContent value="knowledge" className="space-y-4">
          {/* Smart Upload (Fase 9.3) */}
          <SmartUploadPanel userId={user?.id} onUploaded={loadData} />
          {/* Knowledge Harvester + Private Knowledge */}
          <NeuralErrorBoundary fallbackTitle="Erro no Knowledge Harvester">
            <Suspense fallback={<Card className="border-border bg-card p-6"><div className="flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></Card>}>
              <KnowledgeHarvester />
            </Suspense>
          </NeuralErrorBoundary>
          <NeuralErrorBoundary fallbackTitle="Erro no Private Knowledge">
            <Suspense fallback={<Card className="border-border bg-card p-6"><div className="flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></Card>}>
              <PrivateKnowledge />
            </Suspense>
          </NeuralErrorBoundary>
          {/* Semantic Search */}
          <NeuralSemanticSearch />
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Adicionar Conhecimento
              </CardTitle>
              <CardDescription className="text-xs">
                Expanda a base de conhecimento com jurisprudência, doutrina ou legislação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Título (ex: REsp 1.234.567/RS)"
                  value={newKnowledge.title}
                  onChange={(e) => setNewKnowledge((prev) => ({ ...prev, title: e.target.value }))}
                  className="bg-background border-border"
                />
                <Select
                  value={newKnowledge.source_type}
                  onValueChange={(v) => setNewKnowledge((prev) => ({ ...prev, source_type: v }))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jurisprudencia">Jurisprudência</SelectItem>
                    <SelectItem value="doutrina">Doutrina</SelectItem>
                    <SelectItem value="legislacao">Legislação</SelectItem>
                    <SelectItem value="modelo_documento">Modelo de Documento</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Cole aqui o conteúdo completo (ementa, acórdão, artigo, etc.)"
                value={newKnowledge.content}
                onChange={(e) => setNewKnowledge((prev) => ({ ...prev, content: e.target.value }))}
                className="min-h-[150px] bg-background border-border"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Referência/URL (opcional)"
                  value={newKnowledge.source_reference}
                  onChange={(e) => setNewKnowledge((prev) => ({ ...prev, source_reference: e.target.value }))}
                  className="bg-background border-border"
                />
                <Input
                  placeholder="Tags separadas por vírgula (ex: dano moral, consumidor)"
                  value={newKnowledge.tags}
                  onChange={(e) => setNewKnowledge((prev) => ({ ...prev, tags: e.target.value }))}
                  className="bg-background border-border"
                />
              </div>
              <Button onClick={handleAddKnowledge} disabled={submitting} className="btn-gold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Adicionar à Base de Conhecimento
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Conhecimento Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {knowledgeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-background border border-border rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{entry.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {sourceTypeLabels[entry.source_type] || entry.source_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.is_processed ? (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Processado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-warning border-warning">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {knowledgeEntries.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum conhecimento adicionado ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Specializations Tab */}
        <TabsContent value="specializations" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Especialização
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Crie especializações treinadas para áreas jurídicas específicas
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("legislacao")}
                  className="shrink-0"
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  Catálogo de Leis
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Nome da especialização"
                  value={newSpecialization.name}
                  onChange={(e) => setNewSpecialization((prev) => ({ ...prev, name: e.target.value }))}
                  className="bg-background border-border"
                />
                <Select
                  value={newSpecialization.category}
                  onValueChange={(v) => setNewSpecialization((prev) => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Descrição da especialização (opcional)"
                value={newSpecialization.description}
                onChange={(e) => setNewSpecialization((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-[80px] bg-background border-border"
              />
              <Button onClick={handleCreateSpecialization} disabled={submitting} className="btn-gold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Criar Especialização
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Especializações Existentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {specializations.map((spec) => (
                  <div
                    key={spec.id}
                    className="flex items-center justify-between p-3 bg-background border border-border rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{spec.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoryLabels[spec.category] || spec.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] ${
                          spec.training_status === "completed" 
                            ? "text-green-600 border-green-600" 
                            : spec.training_status === "training"
                            ? "text-warning border-warning"
                            : "text-muted-foreground"
                        }`}
                      >
                        {spec.training_status === "completed" ? "Treinado" : 
                         spec.training_status === "training" ? "Treinando" : "Pendente"}
                      </Badge>
                      <Switch
                        checked={spec.is_active}
                        onCheckedChange={(checked) => toggleSpecialization(spec.id, checked)}
                      />
                    </div>
                  </div>
                ))}
                {specializations.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma especialização criada ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Provedores de IA</CardTitle>
              <CardDescription className="text-xs">
                Ative/desative provedores e configure a ordem de prioridade (fallback)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-4 bg-background border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${provider.is_enabled ? "bg-green-500" : "bg-muted"}`} />
                      <div>
                        <p className="text-sm font-medium">{provider.display_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{provider.provider_name}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        Prioridade {provider.priority}
                      </Badge>
                    </div>
                    <Switch
                      checked={provider.is_enabled}
                      onCheckedChange={(checked) => toggleProvider(provider.id, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evolution Tab */}
        <TabsContent value="evolution">
          <NeuralEvolutionPanel />
        </TabsContent>

        {/* Neural Consciousness - Dedicated Loop + A/B Testing */}
        <TabsContent value="consciousness" className="space-y-4">
          {/* Energy Orb */}
          <NeuralErrorBoundary fallbackTitle="Erro no Energy Orb">
            <Suspense fallback={null}>
              <div className="flex justify-center">
                <PlasmaCanvas className="w-48 h-48" />
              </div>
            </Suspense>
          </NeuralErrorBoundary>

          <NeuralConsciousnessLoop />

          {/* Hopfield Visualization */}
          <NeuralErrorBoundary fallbackTitle="Erro no Hopfield">
            <Suspense fallback={<Card className="border-border bg-card p-6"><div className="flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></Card>}>
              <HopfieldVisualization />
            </Suspense>
          </NeuralErrorBoundary>

          <NeuralErrorBoundary fallbackTitle="Erro nas Métricas A/B">
            <ABMetricsDashboard />
          </NeuralErrorBoundary>
          <NeuralErrorBoundary fallbackTitle="Erro na Evolução">
            <NeuralEvolutionPanel />
          </NeuralErrorBoundary>
        </TabsContent>

        {/* Live Neural Network Visualization */}
        <TabsContent value="live" className="space-y-4">
          <NeuralErrorBoundary fallbackTitle="Erro na Rede ao Vivo">
            <NeuralNetworkLiveView />
          </NeuralErrorBoundary>
        </TabsContent>

        {/* Neural Vision Tab */}
        <TabsContent value="vision" className="space-y-4">
          <NeuralVision />
          <FaceAuthEnroll />
        </TabsContent>

        {/* Web APIs Tab */}
        <TabsContent value="webapis">
          <WebAPIDashboard />
        </TabsContent>

        {/* R.A.G ELP — Interface Neural Completa */}
        <TabsContent value="rag-elp" className="space-y-4">
          {/* HUD Holográfico */}
          <NeuralErrorBoundary fallbackTitle="Erro no R.A.G ELP">
            <JarvisHUD
              metrics={{
                neuralHealth: knowledgeProcessedCount > 0 ? Math.min(99.9, (knowledgeProcessedCount / Math.max(knowledgeTotalCount, 1)) * 100) : 0,
                activeConnections: providers.filter(p => p.is_enabled).length,
                processingLoad: Math.min(100, learningStats.totalInteractions % 100),
                knowledgeBase: knowledgeTotalCount,
                alertsCount: 0,
              }}
            />
          </NeuralErrorBoundary>

          {/* Alertas Proativos */}
          <NeuralErrorBoundary fallbackTitle="Erro nos Alertas">
            <ProactiveAlerts />
          </NeuralErrorBoundary>

          {/* Health Dashboard */}
          <NeuralErrorBoundary fallbackTitle="Erro no Health Dashboard">
            <NeuralHealthDashboard />
          </NeuralErrorBoundary>

          {/* Métricas Neurais */}
          <NeuralErrorBoundary fallbackTitle="Erro nas Métricas">
            <NeuralMetricsDashboard />
          </NeuralErrorBoundary>

          {/* Cards de estatísticas rápidas — Tron Style */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Zap, label: "Interações IA", value: learningStats.totalInteractions, sub: `${learningStats.learnedItems} aprendidas`, color: "#D4AF37" },
              { icon: Database, label: "Base Neural", value: knowledgeTotalCount, sub: `${knowledgeProcessedCount} com embeddings`, color: "#3B82F6" },
              { icon: Sparkles, label: "Especializações", value: specializations.filter(s => s.is_active).length, sub: `${specializations.filter(s => s.training_status === "training").length} treinando`, color: "#22c55e" },
              { icon: Settings2, label: "Provedores", value: providers.filter(p => p.is_enabled).length, sub: `de ${providers.length} configurados`, color: "#D4AF37" },
            ].map((card, i) => (
              <Card key={i} className="relative overflow-hidden border-0"
                style={{ backgroundColor: "rgba(10,10,15,0.6)", border: `1px solid ${card.color}22`, boxShadow: `0 0 12px ${card.color}06` }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${card.color}40, transparent)` }} />
                <CardContent className="pt-4 pb-3 px-3">
                  <div className="flex items-center gap-2 mb-1">
                    <card.icon className="h-3.5 w-3.5" style={{ color: card.color, filter: `drop-shadow(0 0 4px ${card.color}60)` }} />
                    <span className="text-[10px] font-mono font-medium tracking-wider uppercase" style={{ color: `${card.color}80` }}>{card.label}</span>
                  </div>
                  <p className="text-2xl font-bold font-mono" style={{ color: card.color, textShadow: `0 0 12px ${card.color}40` }}>{card.value}</p>
                  <p className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{card.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Busca Semântica */}
          <NeuralErrorBoundary fallbackTitle="Erro na Busca Semântica">
            <NeuralSemanticSearch />
          </NeuralErrorBoundary>

          {/* Ações Rápidas — Tron Style */}
          <Card className="relative overflow-hidden border-0"
            style={{ backgroundColor: "rgba(10,10,15,0.6)", border: "1px solid rgba(212,175,55,0.12)" }}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)" }} />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono font-medium flex items-center gap-2 tracking-wider uppercase" style={{ color: "rgba(212,175,55,0.7)" }}>
                <Zap className="h-4 w-4" style={{ color: "#D4AF37", filter: "drop-shadow(0 0 4px rgba(212,175,55,0.5))" }} />
                Ações Rápidas — Interface Neural
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: "Visão Geral", tab: "overview", icon: BarChart3, desc: "HUD + Health", color: "#D4AF37" },
                  { label: "Ingestão", tab: "ingestion", icon: Database, desc: "DataJud + Fontes", color: "#3B82F6" },
                  { label: "Conhecimento", tab: "knowledge", icon: BookOpen, desc: "Upload + Embeddings", color: "#3B82F6" },
                  { label: "Consciência", tab: "consciousness", icon: Brain, desc: "Loop Neural + A/B", color: "#22c55e" },
                  { label: "Rede ao Vivo", tab: "live", icon: Activity, desc: "Visualização 3D", color: "#22c55e" },
                  { label: "Visão Neural", tab: "vision", icon: Camera, desc: "Gestos + Face Auth", color: "#D4AF37" },
                  { label: "Web APIs", tab: "webapis", icon: Globe, desc: "APIs Externas", color: "#3B82F6" },
                  { label: "Arquitetura", tab: "docs", icon: Layers, desc: "Diagramas 9 Modelos", color: "#D4AF37" },
                  { label: "Orion Shield", tab: "shield", icon: Shield, desc: "Defesa em Tempo Real", color: "#22c55e" },
                ].map((item) => (
                  <Button
                    key={item.tab}
                    variant="outline"
                    className="h-auto p-3 flex flex-col items-start gap-1 text-left border-0"
                    style={{ backgroundColor: `${item.color}08`, border: `1px solid ${item.color}18` }}
                    onClick={() => setActiveTab(item.tab)}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-3.5 w-3.5" style={{ color: item.color, filter: `drop-shadow(0 0 3px ${item.color}60)` }} />
                      <span className="text-xs font-mono font-medium" style={{ color: `${item.color}cc` }}>{item.label}</span>
                    </div>
                    <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{item.desc}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Relatório PDF */}
          <NeuralErrorBoundary fallbackTitle="Erro no Relatório PDF">
            <NeuralPDFReport />
          </NeuralErrorBoundary>
        </TabsContent>

        {/* Architecture Tab */}
        <TabsContent value="docs" className="space-y-6">
          <NeuralArchitectureDiagram />
          <div className="border-t border-border my-6" />
          <NeuroCoreArchitectureDiagram />
        </TabsContent>

        {/* Interactive Demos Tab (ArquiteturaIA) */}
        <TabsContent value="interactive" className="space-y-6">
          <Suspense fallback={<Card className="border-border bg-card p-6"><div className="flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></Card>}>
            <ArquiteturaIA />
          </Suspense>
        </TabsContent>

        {/* Shield Tab */}
        <TabsContent value="shield" className="space-y-4">
          <Suspense fallback={<Card className="border-border bg-card p-6"><div className="flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></Card>}>
            <OrionShieldPanel />
          </Suspense>
        </TabsContent>

        {/* Audiobook & Media Tab — Reorganized */}
        <TabsContent value="audiobook" className="space-y-6">
          {/* Section 1: Learning */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-mono font-semibold text-foreground/80 tracking-wide uppercase">Aprendizado Auditivo</h3>
            </div>
            <Suspense fallback={<Card className="border-border bg-card p-6"><div className="flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></Card>}>
              <OrionAudiobookListener />
            </Suspense>
          </div>

          {/* Section 2: Music & Media — Sub-tabs */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Headphones className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-mono font-semibold text-foreground/80 tracking-wide uppercase">Música & Mídia</h3>
            </div>
            <Tabs defaultValue="spotify" className="w-full">
              <TabsList className="grid grid-cols-3 h-8 mb-3">
                <TabsTrigger value="spotify" className="text-[10px] gap-1 font-mono">
                  <Music className="h-3 w-3 text-[#1DB954]" /> Spotify
                </TabsTrigger>
                <TabsTrigger value="amazon" className="text-[10px] gap-1 font-mono">
                  <BookOpen className="h-3 w-3 text-[#FF9900]" /> Amazon
                </TabsTrigger>
                <TabsTrigger value="youtube" className="text-[10px] gap-1 font-mono">
                  <Play className="h-3 w-3 text-red-500" /> YouTube
                </TabsTrigger>
              </TabsList>
              <TabsContent value="spotify">
                <Suspense fallback={<Card className="border-border bg-card p-6"><div className="flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></Card>}>
                  <SpotifyPlayer />
                </Suspense>
              </TabsContent>
              <TabsContent value="amazon">
                <Suspense fallback={<Card className="border-border bg-card p-6"><div className="flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></Card>}>
                  <AmazonMusicPlayer />
                </Suspense>
              </TabsContent>
              <TabsContent value="youtube">
                <Suspense fallback={<Card className="border-border bg-card p-6"><div className="flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></Card>}>
                  <YouTubeMusicPlayer />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        {/* API Status Dashboard Tab */}
        <TabsContent value="api-status" className="space-y-4">
          <Suspense fallback={<Card className="border-border bg-card p-6"><div className="flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></Card>}>
            <OrionAPIStatusDashboard />
          </Suspense>
        </TabsContent>
        {/* Quantum Runtime Tab */}
        <TabsContent value="quantum-runtime" className="space-y-4">
          <Suspense fallback={<Card className="border-border bg-card p-6"><div className="flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div></Card>}>
            <QuantumRuntimeDashboard />
          </Suspense>
        </TabsContent>

        {/* IoT Devices Tab */}
        <TabsContent value="iot-devices" className="space-y-4">
          <OrionIoTPanel />
        </TabsContent>

        {/* Orchestrator Tab (merged from OrionOrchestratorPage) */}
        <TabsContent value="orchestrator" className="space-y-4">
          <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
            <OrionOrchestratorTabs />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
