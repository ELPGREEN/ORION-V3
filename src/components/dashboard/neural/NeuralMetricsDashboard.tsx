import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Brain,
  Database,
  Layers,
  Activity,
  TrendingUp,
  Loader2,
  ArrowRightLeft,
  MessageSquare,
  FileText,
  Zap,
  Target,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EmbeddingStats {
  totalEmbeddings: number;
  totalKnowledge: number;
  processedKnowledge: number;
  pendingKnowledge: number;
  sourceDistribution: { source: string; count: number }[];
  knowledgeDistribution: { source_type: string; count: number }[];
  recentActivity: { date: string; count: number }[];
  totalLearning: number;
  learnedCount: number;
  learningBySource: { source: string; count: number; avgScore: number }[];
  promotedCount: number;
  // Lacuna 7: Bias-Variance Metrics
  biasVarianceMetrics?: {
    bias: number;
    variance: number;
    precisionAtK: number;
    ndcg: number;
    avgLoss: number;
    sampleSize: number;
    biasVarianceTradeoff: number;
  };
  // Lacuna 8: Adam Optimizer Metrics
  adamMetrics?: {
    iteration: number;
    learningRate: number;
    confusion: Record<string, { tp: number; fp: number; fn: number; tn: number }>;
    f1ByCategory?: Record<string, number>;
    updatedAt?: string;
  };
}

export function NeuralMetricsDashboard() {
  const [stats, setStats] = useState<EmbeddingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const [
        embeddingsResult,
        knowledgeResult,
        knowledgeProcessedResult,
        learningResult,
        learnedResult,
        learningDetailsResult,
        promotedResult,
        metricsResult,
        adamResult,
      ] = await Promise.all([
        supabase.from("legal_embeddings").select("source", { count: "exact", head: false }).limit(1000),
        supabase.from("neural_knowledge_base").select("source_type, is_processed", { count: "exact", head: false }).limit(1000),
        supabase.from("neural_knowledge_base").select("id", { count: "exact", head: true }).eq("is_processed", true),
        supabase.from("neural_learning_data").select("id", { count: "exact", head: true }),
        supabase.from("neural_learning_data").select("id", { count: "exact", head: true }).eq("learned", true),
        supabase.from("neural_learning_data").select("interaction_type, quality_score").not("quality_score", "is", null).limit(500),
        supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).like("source", "neural_%"),
        supabase.from("neural_specializations").select("prompts").eq("name", "Bias-Variance Metrics").eq("is_active", true).maybeSingle(),
        supabase.from("neural_specializations").select("prompts").eq("name", "Adam Optimizer State v11").eq("is_active", true).maybeSingle(),
      ]);

      // Source distribution
      const sourceMap = new Map<string, number>();
      (embeddingsResult.data || []).forEach((row: any) => {
        const src = row.source || "unknown";
        sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
      });
      const sourceDistribution = Array.from(sourceMap.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);

      // Knowledge distribution
      const ktMap = new Map<string, number>();
      (knowledgeResult.data || []).forEach((row: any) => {
        const st = row.source_type || "unknown";
        ktMap.set(st, (ktMap.get(st) || 0) + 1);
      });
      const knowledgeDistribution = Array.from(ktMap.entries())
        .map(([source_type, count]) => ({ source_type, count }))
        .sort((a, b) => b.count - a.count);

      // Learning by source
      const learningMap = new Map<string, { count: number; totalScore: number }>();
      (learningDetailsResult.data || []).forEach((row: any) => {
        const src = row.interaction_type || "unknown";
        const existing = learningMap.get(src) || { count: 0, totalScore: 0 };
        existing.count += 1;
        existing.totalScore += (row.quality_score || 0);
        learningMap.set(src, existing);
      });
      const learningBySource = Array.from(learningMap.entries())
        .map(([source, data]) => ({
          source,
          count: data.count,
          avgScore: data.count > 0 ? Math.round((data.totalScore / data.count) * 100) / 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Bias-Variance metrics from DB
      const metricsData = (metricsResult.data?.prompts as any)?.metrics || null;

      // Adam Optimizer metrics from DB
      let adamMetrics: EmbeddingStats["adamMetrics"] | undefined;
      const adamRaw = (adamResult.data?.prompts as any)?.adam;
      if (adamRaw) {
        const baseEta = 0.05;
        const eta = baseEta / (1 + 0.005 * (adamRaw.iteration || 0));
        // Compute F1 per category from confusion matrix
        const f1ByCategory: Record<string, number> = {};
        for (const [cat, cm] of Object.entries(adamRaw.confusion || {})) {
          const c = cm as { tp: number; fp: number; fn: number; tn: number };
          const precision = c.tp / Math.max(c.tp + c.fp, 1);
          const recall = c.tp / Math.max(c.tp + c.fn, 1);
          f1ByCategory[cat] = 2 * precision * recall / Math.max(precision + recall, 1e-8);
        }
        adamMetrics = {
          iteration: adamRaw.iteration || 0,
          learningRate: eta,
          confusion: adamRaw.confusion || {},
          f1ByCategory,
          updatedAt: (adamResult.data?.prompts as any)?.updated_at,
        };
      }

      setStats({
        totalEmbeddings: embeddingsResult.count || sourceDistribution.reduce((s, d) => s + d.count, 0),
        totalKnowledge: knowledgeResult.count || knowledgeDistribution.reduce((s, d) => s + d.count, 0),
        processedKnowledge: knowledgeProcessedResult.count || 0,
        pendingKnowledge: (knowledgeResult.count || 0) - (knowledgeProcessedResult.count || 0),
        sourceDistribution,
        knowledgeDistribution,
        recentActivity: [],
        totalLearning: learningResult.count || 0,
        learnedCount: learnedResult.count || 0,
        learningBySource,
        promotedCount: promotedResult.count || 0,
        biasVarianceMetrics: metricsData,
        adamMetrics,
      });
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const processingRate = stats.totalKnowledge > 0
    ? Math.round((stats.processedKnowledge / stats.totalKnowledge) * 100)
    : 0;

  const learningRate = stats.totalLearning > 0
    ? Math.round((stats.learnedCount / stats.totalLearning) * 100)
    : 0;

  const maxSourceCount = Math.max(...stats.sourceDistribution.map(s => s.count), 1);

  const sourceLabels: Record<string, string> = {
    legislacao_federal: "Legislação Federal",
    catalogo_senado: "Catálogo Senado",
    jurisprudencia: "Jurisprudência",
    doutrina: "Doutrina",
    legislacao: "Legislação",
    modelo_documento: "Modelo Documento",
    chat_ia: "Chat IA",
    custom: "Personalizado",
    datajud: "DataJud",
    lexml: "LexML",
    senado_api: "Senado API",
    camara_api: "Câmara API",
    courtlistener: "CourtListener",
  };

  const interactionLabels: Record<string, { label: string; icon: typeof Brain }> = {
    document_generation: { label: "Geração Documentos", icon: FileText },
    chat_consulta: { label: "Chat Consulta", icon: MessageSquare },
    chat_documento: { label: "Chat Documento", icon: FileText },
    chat_pesquisa: { label: "Chat Pesquisa", icon: Database },
    chat_sintese: { label: "Chat Síntese", icon: Zap },
    chat: { label: "Chat IA", icon: MessageSquare },
    search: { label: "Pesquisa Neural", icon: Database },
  };

  const bvm = stats.biasVarianceMetrics;

  return (
    <div className="space-y-4">
      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Embeddings</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalEmbeddings.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{stats.sourceDistribution.length} fontes</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Base Neural</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalKnowledge.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{stats.knowledgeDistribution.length} tipos</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Processamento</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{processingRate}%</p>
            <Progress value={processingRate} className="h-1.5 mt-1" />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Aprendizado</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{learningRate}%</p>
            <p className="text-[10px] text-muted-foreground">{stats.learnedCount}/{stats.totalLearning} interações</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cross-Seed</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.promotedCount}</p>
            <p className="text-[10px] text-muted-foreground">promovidos p/ embeddings</p>
          </CardContent>
        </Card>
      </div>

      {/* Lacuna 7: Bias-Variance Metrics */}
      {bvm && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Métricas Deep Learning (Bias-Variância)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="p-3 bg-background border border-border rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Bias</p>
                <p className="text-lg font-bold text-foreground">{bvm.bias.toFixed(3)}</p>
                <Badge variant={Math.abs(bvm.bias) < 0.1 ? "default" : "secondary"} className="text-[9px] mt-1">
                  {Math.abs(bvm.bias) < 0.1 ? "✓ Baixo" : Math.abs(bvm.bias) < 0.3 ? "⚠ Médio" : "✗ Alto"}
                </Badge>
              </div>
              <div className="p-3 bg-background border border-border rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Variância</p>
                <p className="text-lg font-bold text-foreground">{bvm.variance.toFixed(3)}</p>
                <Badge variant={bvm.variance < 0.1 ? "default" : "secondary"} className="text-[9px] mt-1">
                  {bvm.variance < 0.1 ? "✓ Baixa" : bvm.variance < 0.25 ? "⚠ Média" : "✗ Alta"}
                </Badge>
              </div>
              <div className="p-3 bg-background border border-border rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Precision@K</p>
                <p className="text-lg font-bold text-foreground">{(bvm.precisionAtK * 100).toFixed(0)}%</p>
                <Progress value={bvm.precisionAtK * 100} className="h-1.5 mt-2" />
              </div>
              <div className="p-3 bg-background border border-border rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">NDCG</p>
                <p className="text-lg font-bold text-foreground">{bvm.ndcg.toFixed(3)}</p>
                <Progress value={bvm.ndcg * 100} className="h-1.5 mt-2" />
              </div>
              <div className="p-3 bg-background border border-border rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Loss Médio</p>
                <p className="text-lg font-bold text-foreground">{bvm.avgLoss.toFixed(3)}</p>
                <Badge variant={bvm.avgLoss < 0.5 ? "default" : "secondary"} className="text-[9px] mt-1">
                  {bvm.avgLoss < 0.5 ? "✓ Bom" : "⚠ Otimizar"}
                </Badge>
              </div>
              <div className="p-3 bg-background border border-border rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">MSE (B²+V)</p>
                <p className="text-lg font-bold text-foreground">{bvm.biasVarianceTradeoff.toFixed(3)}</p>
                <p className="text-[9px] text-muted-foreground mt-1">{bvm.sampleSize} amostras</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Legal Embeddings by Source */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Embeddings por Fonte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {stats.sourceDistribution.map((item) => (
                <div key={item.source} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                      {item.source}
                    </span>
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      {item.count}
                    </Badge>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full transition-all"
                      style={{ width: `${(item.count / maxSourceCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {stats.sourceDistribution.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum embedding ainda</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Base by Type */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Base de Conhecimento por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {stats.knowledgeDistribution.map((item) => {
                const maxKnowledge = Math.max(...stats.knowledgeDistribution.map(k => k.count), 1);
                return (
                  <div key={item.source_type} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                        {sourceLabels[item.source_type] || item.source_type}
                      </span>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {item.count}
                      </Badge>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent/70 rounded-full transition-all"
                        style={{ width: `${(item.count / maxKnowledge) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.knowledgeDistribution.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum conhecimento ainda</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Learning by Source */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Aprendizado por Fonte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {stats.learningBySource.map((item) => {
                const maxLearning = Math.max(...stats.learningBySource.map(l => l.count), 1);
                const info = interactionLabels[item.source] || { label: item.source, icon: Brain };
                const IconComponent = info.icon;
                return (
                  <div key={item.source} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <IconComponent className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {info.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] shrink-0">
                          {item.count}
                        </Badge>
                        <Badge 
                          variant={item.avgScore >= 0.7 ? "default" : "secondary"} 
                          className="text-[9px] shrink-0"
                        >
                          {item.avgScore.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/50 rounded-full transition-all"
                        style={{ width: `${(item.count / maxLearning) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.learningBySource.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum aprendizado ainda</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Adam Optimizer Metrics — Lacuna 8+13 */}
      {stats.adamMetrics && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Adam Optimizer — Estado v11 (β₁=0.9, β₂=0.999)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Header metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-background border border-border rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Iterações</p>
                <p className="text-lg font-bold text-foreground">{stats.adamMetrics.iteration}</p>
                <p className="text-[9px] text-muted-foreground">ciclos de feedback</p>
              </div>
              <div className="p-3 bg-background border border-border rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Learning Rate η(t)</p>
                <p className="text-lg font-bold text-foreground">{stats.adamMetrics.learningRate.toFixed(5)}</p>
                <p className="text-[9px] text-muted-foreground">com decay linear</p>
              </div>
              <div className="p-3 bg-background border border-border rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Categorias CM</p>
                <p className="text-lg font-bold text-foreground">{Object.keys(stats.adamMetrics.confusion).length}</p>
                <p className="text-[9px] text-muted-foreground">com matriz confusão</p>
              </div>
              <div className="p-3 bg-background border border-border rounded-lg text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Atualizado</p>
                <p className="text-xs font-medium text-foreground">
                  {stats.adamMetrics.updatedAt ? new Date(stats.adamMetrics.updatedAt).toLocaleDateString("pt-BR") : "—"}
                </p>
                <p className="text-[9px] text-muted-foreground">última evolução</p>
              </div>
            </div>

            {/* Confusion Matrix completa por categoria — Lacuna 13 */}
            {Object.keys(stats.adamMetrics.confusion).length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
                  Confusion Matrix + F1-Score por Categoria Jurídica (Lacuna 13)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[9px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Categoria</th>
                        <th className="text-center py-1.5 px-2 text-primary/80 font-medium">TP</th>
                        <th className="text-center py-1.5 px-2 text-destructive font-medium">FP</th>
                        <th className="text-center py-1.5 px-2 text-muted-foreground font-medium">FN</th>
                        <th className="text-center py-1.5 px-2 text-muted-foreground font-medium">Precisão</th>
                        <th className="text-center py-1.5 px-2 text-muted-foreground font-medium">Recall</th>
                        <th className="text-center py-1.5 px-2 text-primary font-medium">F1</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.adamMetrics.confusion).map(([cat, cm]) => {
                        const precision = cm.tp / Math.max(cm.tp + cm.fp, 1);
                        const recall = cm.tp / Math.max(cm.tp + cm.fn, 1);
                        const f1 = 2 * precision * recall / Math.max(precision + recall, 1e-8);
                        const f1Cls = f1 >= 0.7 ? "text-primary font-bold" : f1 >= 0.4 ? "text-foreground" : "text-destructive";
                        return (
                          <tr key={cat} className="border-b border-border/30 hover:bg-muted/20">
                            <td className="py-1.5 px-2 capitalize font-medium">{cat}</td>
                            <td className="text-center py-1.5 px-2 text-primary/80 font-mono">{cm.tp}</td>
                            <td className="text-center py-1.5 px-2 text-destructive font-mono">{cm.fp}</td>
                            <td className="text-center py-1.5 px-2 text-muted-foreground font-mono">{cm.fn}</td>
                            <td className="text-center py-1.5 px-2 font-mono">{(precision * 100).toFixed(0)}%</td>
                            <td className="text-center py-1.5 px-2 font-mono">{(recall * 100).toFixed(0)}%</td>
                            <td className="text-center py-1.5 px-2">
                              <div className="flex items-center justify-center gap-1">
                                <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary/70 rounded-full" style={{ width: `${f1 * 100}%` }} />
                                </div>
                                <span className={`font-mono font-bold ${f1Cls}`}>{(f1 * 100).toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  TP = Verdadeiro Positivo · FP = Falso Positivo · FN = Falso Negativo · 
                  Precisão = TP/(TP+FP) · Recall = TP/(TP+FN) · F1 = 2·P·R/(P+R)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Integration Status */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">🧠 Arquitetura Deep Learning v11</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "Funções de Ativação", desc: "Sigmoid + ReLU + Softmax + QuantumSigmoid" },
              { name: "Bias Neuronal", desc: "Bias por head + global bias (Lacuna 5)" },
              { name: "Loss Function", desc: "Binary CE + Multi-Class CE (Lacunas 1+11)" },
              { name: "Adam Optimizer", desc: "β₁=0.9, β₂=0.999, ε=1e-8 (Lacuna 8)" },
              { name: "Regularização", desc: "L2 decay + Dropout 20% (Lacuna 3)" },
              { name: "Backpropagation", desc: "Propagação de erro MHA (Lacuna 2)" },
              { name: "Parameter-Shift", desc: "Gradiente quântico-nativo (Lacuna 15)" },
              { name: "Multi-Layer QNN", desc: "3 camadas RX+RY+RZ (Lacuna 9)" },
              { name: "Amplitude Encoding", desc: "H + RY + RZ gate (Lacuna 10)" },
              { name: "Von Neumann Entropy", desc: "Entrelaçamento quântico (Lacuna 12)" },
              { name: "Confusion Matrix", desc: "TP/FP/FN/TN + P/R/F1 (Lacuna 13)" },
              { name: "Bias-Variância", desc: "P@K + NDCG + MSE (Lacuna 7)" },
            ].map((integration) => (
              <div key={integration.name} className="p-3 bg-background border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-xs font-medium">{integration.name}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{integration.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
