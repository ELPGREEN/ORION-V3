import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  GitMerge,
  HeartPulse,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { wrapSupabase, wrapEdgeFunction } from "@/lib/errors";
import { callEvolution } from "@/lib/neural/ai-service";

const NeuralMapCompact = lazy(() =>
  import("./AttentionVisualization").then((module) => ({
    default: module.AttentionVisualization,
  })),
);

interface CronJobStatus {
  name: string;
  label: string;
  schedule: string;
  status: "healthy" | "warning" | "error" | "unknown";
  lastRun: string | null;
  description: string;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

interface EmbeddingHealth {
  legalTotal: number;
  legalPending: number;
  legalPercent: number;
  neuralTotal: number;
  neuralPending: number;
  neuralPercent: number;
}

interface AdamHealthSummary {
  iteration: number;
  learningRate: number;
  categoriesTracked: number;
  avgF1: number;
  bestCategory: string;
  worstCategory: string;
  f1ByArea?: Record<string, number>;
  metricsUpdatedAt?: string;
}

interface PipelineStats {
  totalLearningData: number;
  learnedItems: number;
  learningRate: number;
  recentFeedback: number;
}

interface HealthData {
  cronJobs: CronJobStatus[];
  queue: QueueStats;
  embeddings: EmbeddingHealth;
  recentErrors: { message: string; time: string; source: string }[];
  overallHealth: "healthy" | "degraded" | "critical";
  adamSummary?: AdamHealthSummary;
  pipeline?: PipelineStats;
}

export function NeuralHealthDashboard() {
  const { toast } = useToast();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);

  const loadHealth = useCallback(async () => {
    try {
      const [
        queuePending,
        queueProcessing,
        queueCompleted,
        queueFailed,
        legalTotal,
        legalPendingEmb,
        neuralTotal,
        neuralPendingEmb,
        recentFailedJobs,
        adamResult,
        learningTotal,
        learningLearned,
        recentFeedback,
      ] = await Promise.all([
        wrapSupabase(supabase.from("generation_queue").select("id", { count: "exact", head: true }).eq("status", "pending")),
        wrapSupabase(supabase.from("generation_queue").select("id", { count: "exact", head: true }).eq("status", "processing")),
        wrapSupabase(supabase.from("generation_queue").select("id", { count: "exact", head: true }).eq("status", "completed")),
        wrapSupabase(supabase.from("generation_queue").select("id", { count: "exact", head: true }).eq("status", "failed")),
        wrapSupabase(supabase.from("legal_embeddings").select("id", { count: "exact", head: true })),
        wrapSupabase(supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).is("embedding", null)),
        wrapSupabase(supabase.from("neural_knowledge_base").select("id", { count: "exact", head: true })),
        wrapSupabase(supabase.from("neural_knowledge_base").select("id", { count: "exact", head: true }).eq("is_processed", false)),
        wrapSupabase(supabase.from("generation_queue").select("error_message, completed_at, job_type").eq("status", "failed").order("completed_at", { ascending: false }).limit(5)),
        wrapSupabase(supabase.from("neural_specializations").select("prompts").eq("name", "Adam Optimizer State v11").eq("is_active", true).maybeSingle()),
        wrapSupabase(supabase.from("neural_learning_data").select("id", { count: "exact", head: true })),
        wrapSupabase(supabase.from("neural_learning_data").select("id", { count: "exact", head: true }).eq("learned", true)),
        wrapSupabase(supabase.from("neural_learning_data").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())),
      ]);

      const lt = legalTotal.count || 0;
      const lp = legalPendingEmb.count || 0;
      const nt = neuralTotal.count || 0;
      const np = neuralPendingEmb.count || 0;

      const queue: QueueStats = {
        pending: queuePending.count || 0,
        processing: queueProcessing.count || 0,
        completed: queueCompleted.count || 0,
        failed: queueFailed.count || 0,
        total: (queuePending.count || 0) + (queueProcessing.count || 0) + (queueCompleted.count || 0) + (queueFailed.count || 0),
      };

      const embeddings: EmbeddingHealth = {
        legalTotal: lt,
        legalPending: lp,
        legalPercent: lt > 0 ? Math.round(((lt - lp) / lt) * 100) : 100,
        neuralTotal: nt,
        neuralPending: np,
        neuralPercent: nt > 0 ? Math.round(((nt - np) / nt) * 100) : 100,
      };

      const recentErrorRows = (recentFailedJobs.data ?? []) as Array<{ error_message: string | null; completed_at: string | null; job_type: string | null }>;
      const recentErrors = recentErrorRows.map((j) => ({
        message: (j.error_message || "Unknown error").substring(0, 100),
        time: j.completed_at || "",
        source: j.job_type || "document",
      }));

      const cronJobs: CronJobStatus[] = [
        {
          name: "neural-pipeline-orchestrator",
          label: "Pipeline Orquestrador",
          schedule: "0 */2 * * *",
          status: "healthy",
          lastRun: null,
          description: "Coleta feedback + confusion matrix + triggers (a cada 2h)",
        },
        {
          name: "queue-worker",
          label: "Queue Worker",
          schedule: "* * * * *",
          status: queue.processing > 3 ? "warning" : "healthy",
          lastRun: null,
          description: "Processa fila de geração (a cada 1 min)",
        },
        {
          name: "generate-embeddings-fast",
          label: "Embeddings Rápidos",
          schedule: "*/2 * * * *",
          status: lp > 1000 ? "warning" : lp > 5000 ? "error" : "healthy",
          lastRun: null,
          description: `Vetorização contínua (a cada 2 min) — ${lp} pendentes`,
        },
        {
          name: "neural-auto-learn",
          label: "Auto-Aprendizado",
          schedule: "0 */2 * * *",
          status: "healthy",
          lastRun: null,
          description: "Backfill + promote + evolução (a cada 2h)",
        },
        {
          name: "auto-evolution-cron",
          label: "Auto-Evolução",
          schedule: "0 */4 * * *",
          status: "healthy",
          lastRun: null,
          description: "Ingestão de dados automatizada (a cada 4h)",
        },
        {
          name: "auto-ingestion-cron",
          label: "Pré-Ingestão Tribunais",
          schedule: "0 */6 * * *",
          status: "healthy",
          lastRun: null,
          description: "DataJud + LexML (a cada 6h)",
        },
      ];

      const hasErrors = queue.failed > 5 || recentErrors.length > 3;
      const hasWarnings = lp > 2000 || np > 10 || queue.processing > 5;
      const overallHealth: HealthData["overallHealth"] = hasErrors ? "critical" : hasWarnings ? "degraded" : "healthy";

      // Adam Optimizer summary — agora com dados reais da Etapa 2 do Pipeline
      let adamSummary: AdamHealthSummary | undefined;
      const adamRaw = (adamResult.data?.prompts as any)?.adam;
      if (adamRaw) {
        const f1ByArea = adamRaw.f1_by_area as Record<string, number> | undefined;
        const confusion = adamRaw.confusion as Record<string, { tp: number; fp: number; fn: number; tn: number }> | undefined;

        let f1Scores: { cat: string; f1: number }[] = [];
        
        if (f1ByArea) {
          // Dados computados pelo pipeline orchestrator (mais preciso)
          f1Scores = Object.entries(f1ByArea).map(([cat, f1]) => ({ cat, f1 }));
        } else if (confusion) {
          // Fallback: calcular do confusion matrix
          for (const [cat, cm] of Object.entries(confusion)) {
            const p = cm.tp / Math.max(cm.tp + cm.fp, 1);
            const r = cm.tp / Math.max(cm.tp + cm.fn, 1);
            f1Scores.push({ cat, f1: 2 * p * r / Math.max(p + r, 1e-8) });
          }
        }

        f1Scores.sort((a, b) => b.f1 - a.f1);
        const avgF1 = adamRaw.avg_f1 ?? (f1Scores.length > 0 ? f1Scores.reduce((s, x) => s + x.f1, 0) / f1Scores.length : 0);
        const baseEta = 0.05;
        const eta = baseEta / (1 + 0.005 * (adamRaw.iteration || 0));

        adamSummary = {
          iteration: adamRaw.iteration || 0,
          learningRate: eta,
          categoriesTracked: f1Scores.length,
          avgF1,
          bestCategory: f1Scores[0]?.cat || "—",
          worstCategory: f1Scores[f1Scores.length - 1]?.cat || "—",
          f1ByArea: f1ByArea || undefined,
          metricsUpdatedAt: adamRaw.metrics_updated_at,
        };
      }

      const totalLearning = learningTotal.count || 0;
      const learned = learningLearned.count || 0;
      const pipeline: PipelineStats = {
        totalLearningData: totalLearning,
        learnedItems: learned,
        learningRate: totalLearning > 0 ? Math.round((learned / totalLearning) * 100) : 0,
        recentFeedback: recentFeedback.count || 0,
      };

      setHealth({ cronJobs, queue, embeddings, recentErrors, overallHealth, adamSummary, pipeline });
    } catch (error) {
      console.error("[NeuralHealthDashboard] Erro ao carregar saúde do sistema:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadHealth();
  };

  const handleRunPipeline = async () => {
    setRunningPipeline(true);
    try {
      await wrapEdgeFunction(
        supabase.functions.invoke("neural-ops", {
          body: { action: "full_cycle" },
        }),
        "neural-ops",
        { action: "full_cycle" }
      );

      // Also trigger auto-evolution-cron + neural-evolution analyze
      supabase.functions.invoke("auto-evolution-cron", { body: {} }).catch(() => {});
      callEvolution("auto_approve_pending").catch(() => {});
      callEvolution("auto_apply_approved").catch(() => {});

      toast({
        title: "🧠 Pipeline Neural completo executado",
        description: "Pipeline + Auto-Evolução + Aprovação automática disparados.",
      });
      setTimeout(() => {
        setRefreshing(true);
        loadHealth();
      }, 5000);
    } catch (err: any) {
      toast({
        title: "Erro no pipeline",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRunningPipeline(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!health) return null;

  const healthColor = health.overallHealth === "healthy" ? "text-primary" : health.overallHealth === "degraded" ? "text-muted-foreground" : "text-destructive";
  const healthBg = health.overallHealth === "healthy" ? "bg-primary/10" : health.overallHealth === "degraded" ? "bg-muted/30" : "bg-destructive/10";
  const healthLabel = health.overallHealth === "healthy" ? "Saudável" : health.overallHealth === "degraded" ? "Atenção" : "Crítico";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-primary" />
          <h3 className="text-base font-medium">Saúde do Sistema Neural</h3>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Pipeline v1</Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${healthBg} ${healthColor} border-0 text-[10px]`}>
            {health.overallHealth === "healthy" ? <CheckCircle2 className="h-3 w-3 mr-1" /> :
             health.overallHealth === "degraded" ? <AlertTriangle className="h-3 w-3 mr-1" /> :
             <XCircle className="h-3 w-3 mr-1" />}
            {healthLabel}
          </Badge>
          <Button
            onClick={handleRunPipeline}
            size="sm"
            variant="default"
            className="btn-gold text-xs h-8"
            disabled={runningPipeline}
          >
            {runningPipeline ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
            {runningPipeline ? "Executando..." : "Executar Pipeline"}
          </Button>
          <Button onClick={handleRefresh} size="sm" variant="outline" disabled={refreshing} className="h-8">
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Primary System Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Embeddings Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{health.embeddings.legalTotal.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{health.embeddings.legalPercent}% vetorizados</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border border-muted-foreground/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pendentes Vetorização</span>
            </div>
            <p className="text-2xl font-bold text-muted-foreground">{health.embeddings.legalPending.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">~{Math.ceil(health.embeddings.legalPending / 50 * 2)} min restantes</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Base Neural</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{health.embeddings.neuralTotal.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{health.embeddings.neuralPercent}% processados</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Fila de Jobs</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{health.queue.completed}</p>
            <p className="text-[10px] text-muted-foreground">
              {health.queue.pending > 0 ? `${health.queue.pending} pendentes` : "Nenhum pendente"}
              {health.queue.failed > 0 ? ` · ${health.queue.failed} falhas` : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stats + Adam Summary */}
      {(health.pipeline || health.adamSummary) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pipeline / Aprendizado */}
          {health.pipeline && (
            <Card className="bg-card border-border flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <GitMerge className="h-4 w-4 text-primary" />
                  Pipeline de Aprendizado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-[10px] text-muted-foreground">Total Interações</p>
                    <p className="text-lg font-bold text-foreground">{health.pipeline.totalLearningData.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-[10px] text-muted-foreground">Itens Aprendidos</p>
                    <p className="text-lg font-bold text-primary">{health.pipeline.learnedItems.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-[10px] text-muted-foreground">Taxa de Aprendizado</p>
                    <p className="text-lg font-bold text-foreground">{health.pipeline.learningRate}%</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-[10px] text-muted-foreground">Feedback 24h</p>
                    <p className="text-lg font-bold text-foreground">{health.pipeline.recentFeedback}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Taxa de aprendizado</span>
                    <span className="font-mono">{health.pipeline.learningRate}%</span>
                  </div>
                  <Progress value={health.pipeline.learningRate} className="h-2" />
                </div>

                {/* Pipeline Jobs List */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Pipelines disponíveis
                  </p>
                  <div className="flex-1 overflow-y-auto max-h-[200px] space-y-1.5 pr-1">
                    {health.cronJobs.map(job => (
                      <div key={job.name} className="flex items-center justify-between p-2 bg-muted/10 border border-border/40 rounded group hover:border-primary/30 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-foreground truncate">{job.label}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{job.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Badge variant="outline" className={`text-[7px] h-4 px-1 ${
                            job.status === "healthy" ? "border-primary/30 text-primary" :
                            job.status === "warning" ? "border-amber-500/30 text-amber-400" :
                            "border-destructive/30 text-destructive"
                          }`}>
                            {job.status === "healthy" ? "OK" : job.status === "warning" ? "!" : "✕"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            title={`Executar ${job.label}`}
                            onClick={async () => {
                              try {
                                toast({ title: `Executando ${job.label}...` });
                                await supabase.functions.invoke(job.name, { body: {} });
                                toast({ title: `${job.label} executado ✓` });
                              } catch {
                                toast({ title: `Erro ao executar ${job.label}`, variant: "destructive" });
                              }
                            }}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] flex-1"
                      onClick={handleRunPipeline}
                      disabled={runningPipeline}
                    >
                      {runningPipeline ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                      {runningPipeline ? "Executando..." : "Executar Todos"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] flex-1"
                      onClick={handleRefresh}
                      disabled={refreshing}
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                      Analisar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Adam Optimizer / F1 por área OR Neural Map */}
          {health.adamSummary ? (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Adam Optimizer + F1-Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-muted-foreground">F1 Médio</p>
                    <p className="text-base font-bold text-primary">{(health.adamSummary.avgF1 * 100).toFixed(1)}%</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-muted-foreground">Categorias</p>
                    <p className="text-base font-bold">{health.adamSummary.categoriesTracked}</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-muted-foreground">Melhor área</p>
                    <p className="font-medium text-green-500 capitalize">{health.adamSummary.bestCategory}</p>
                  </div>
                  <div className="p-2 bg-muted/20 rounded">
                    <p className="text-muted-foreground">Pior área</p>
                    <p className="font-medium text-yellow-500 capitalize">{health.adamSummary.worstCategory}</p>
                  </div>
                </div>

                {health.adamSummary.f1ByArea && Object.keys(health.adamSummary.f1ByArea).length > 0 && (
                  <div className="space-y-1.5">
                    {Object.entries(health.adamSummary.f1ByArea)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([area, f1]) => (
                        <div key={area} className="space-y-0.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground capitalize">{area}</span>
                            <span className="font-mono">{(f1 * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={f1 * 100} className="h-1.5" />
                        </div>
                      ))
                    }
                  </div>
                )}

                {health.adamSummary.metricsUpdatedAt && (
                  <p className="text-[9px] text-muted-foreground">
                    Atualizado: {new Date(health.adamSummary.metricsUpdatedAt).toLocaleString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Suspense fallback={
              <Card className="bg-card border-border flex items-center justify-center min-h-[200px]">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </Card>
            }>
              <NeuralMapCompact />
            </Suspense>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Embedding Health */}
        <Card className="bg-card border-border flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Saúde dos Embeddings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Legal Embeddings</span>
                <span className="font-mono">{health.embeddings.legalPercent}% ({(health.embeddings.legalTotal - health.embeddings.legalPending).toLocaleString()}/{health.embeddings.legalTotal.toLocaleString()})</span>
              </div>
              <Progress value={health.embeddings.legalPercent} className="h-2" />
              {health.embeddings.legalPending > 0 && (
                <p className="text-[10px] text-yellow-500">{health.embeddings.legalPending.toLocaleString()} pendentes de vetorização</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Base Neural</span>
                <span className="font-mono">{health.embeddings.neuralPercent}% ({(health.embeddings.neuralTotal - health.embeddings.neuralPending).toLocaleString()}/{health.embeddings.neuralTotal.toLocaleString()})</span>
              </div>
              <Progress value={health.embeddings.neuralPercent} className="h-2" />
              {health.embeddings.neuralPending > 0 && (
                <p className="text-[10px] text-yellow-500">{health.embeddings.neuralPending.toLocaleString()} pendentes de processamento</p>
              )}
            </div>

            {/* Pipeline list filling remaining space */}
            <div className="flex-1 min-h-0 flex flex-col pt-2 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Pipelines para Execução
              </p>
              <div className="flex-1 overflow-y-auto max-h-[180px] space-y-1 pr-1">
                {health.cronJobs.map(job => (
                  <div key={`emb-${job.name}`} className="flex items-center justify-between p-1.5 bg-muted/10 border border-border/40 rounded group hover:border-primary/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-medium text-foreground truncate">{job.label}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <Badge variant="outline" className={`text-[7px] h-4 px-1 ${
                        job.status === "healthy" ? "border-primary/30 text-primary" :
                        job.status === "warning" ? "border-amber-500/30 text-amber-400" :
                        "border-destructive/30 text-destructive"
                      }`}>
                        {job.status === "healthy" ? "OK" : job.status === "warning" ? "!" : "✕"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        title={`Executar ${job.label}`}
                        onClick={async () => {
                          try {
                            toast({ title: `Executando ${job.label}...` });
                            await supabase.functions.invoke(job.name, { body: {} });
                            toast({ title: `${job.label} executado ✓` });
                          } catch {
                            toast({ title: `Erro ao executar ${job.label}`, variant: "destructive" });
                          }
                        }}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] flex-1"
                  onClick={handleRunPipeline}
                  disabled={runningPipeline}
                >
                  {runningPipeline ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                  Executar Todos
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] flex-1"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                  Analisar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cron Jobs */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Cron Jobs Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {health.cronJobs.map(job => (
                <div key={job.name} className="flex items-center justify-between p-2 bg-muted/20 border border-border/50 rounded">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      job.status === "healthy" ? "bg-primary" :
                      job.status === "warning" ? "bg-yellow-500" : "bg-destructive"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{job.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{job.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0 font-mono">{job.schedule}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      {health.recentErrors.length > 0 && (
        <Card className="bg-card border-border border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              Erros Recentes ({health.recentErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {health.recentErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-red-500/5 border border-red-500/10 rounded text-[10px]">
                  <XCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate">{err.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[8px] h-4">{err.source}</Badge>
                      {err.time && <span className="text-muted-foreground">{new Date(err.time).toLocaleString("pt-BR")}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
