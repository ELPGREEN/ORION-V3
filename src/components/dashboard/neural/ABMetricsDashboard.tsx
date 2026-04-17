import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, ThumbsUp, ThumbsDown, BarChart3, Atom, RefreshCw, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FeedbackStats {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  categoryCounts: { category: string; positive: number; negative: number }[];
  recentFeedback: { query: string; category: string; feedback: string; created_at: string }[];
  weightEvolution: { name: string; currentWeights: number[]; label: string }[];
}

const HEAD_LABELS = ["Sem", "Kw", "Auth", "Rec", "Jur", "Dep"];
const CATEGORY_LABELS: Record<string, string> = {
  constitucional: "Constitucional",
  trabalhista: "Trabalhista",
  penal: "Penal",
  civil: "Civil",
  tributario: "Tributário",
  administrativo: "Administrativo",
  ambiental: "Ambiental",
  consumidor: "Consumidor",
  previdenciario: "Previdenciário",
  eleitoral: "Eleitoral",
  empresarial: "Empresarial",
  familia: "Família",
};

export function ABMetricsDashboard() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    setLoading(true);
    try {
      // 1. Load feedback data
      const { data: feedbackData } = await supabase
        .from("neural_learning_data")
        .select("input_text, output_text, quality_score, metadata, created_at")
        .eq("interaction_type", "quantum_feedback")
        .order("created_at", { ascending: false })
        .limit(200);

      const items = feedbackData || [];
      const positive = items.filter(i => i.quality_score === 1.0);
      const negative = items.filter(i => i.quality_score === 0.0);

      // Category counts
      const catMap = new Map<string, { positive: number; negative: number }>();
      for (const item of items) {
        const meta = (item.metadata || {}) as Record<string, unknown>;
        const cat = (meta.category as string) || "unknown";
        const existing = catMap.get(cat) || { positive: 0, negative: 0 };
        if (item.quality_score === 1.0) existing.positive++;
        else existing.negative++;
        catMap.set(cat, existing);
      }
      const categoryCounts = Array.from(catMap.entries())
        .map(([category, counts]) => ({ category, ...counts }))
        .sort((a, b) => (b.positive + b.negative) - (a.positive + a.negative));

      // Recent feedback
      const recentFeedback = items.slice(0, 10).map(item => {
        const meta = (item.metadata || {}) as Record<string, unknown>;
        let parsedOutput = { feedback: "unknown" };
        try { parsedOutput = JSON.parse(item.output_text || "{}"); } catch (e) { console.warn("[ABMetrics] Failed to parse output:", e); }
        return {
          query: item.input_text || "",
          category: (meta.category as string) || "unknown",
          feedback: (parsedOutput as Record<string, unknown>).feedback as string || (item.quality_score === 1.0 ? "positive" : "negative"),
          created_at: item.created_at || "",
        };
      });

      // 2. Load current quantum weights
      const { data: weightsData } = await supabase
        .from("neural_specializations")
        .select("prompts")
        .eq("name", "Quantum Category Weights")
        .eq("is_active", true)
        .maybeSingle();

      let weightEvolution: FeedbackStats["weightEvolution"] = [];
      const prompts = weightsData?.prompts as Record<string, unknown> | null;
      if (prompts?.categories) {
        const cats = prompts.categories as { name: string; weights: number[] }[];
        weightEvolution = cats.map(c => ({
          name: c.name,
          currentWeights: c.weights,
          label: CATEGORY_LABELS[c.name] || c.name,
        }));
      }

      setStats({
        totalFeedback: items.length,
        positiveFeedback: positive.length,
        negativeFeedback: negative.length,
        categoryCounts,
        recentFeedback,
        weightEvolution,
      });
    } catch (err) {
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

  const positiveRate = stats.totalFeedback > 0 ? Math.round((stats.positiveFeedback / stats.totalFeedback) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-base font-medium">Métricas A/B & Feedback</h3>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Fase 7</Badge>
        </div>
        <Button onClick={loadStats} size="sm" variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Feedback</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalFeedback}</p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ThumbsUp className="h-4 w-4 text-green-500" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Positivo</span>
            </div>
            <p className="text-2xl font-bold text-green-500">{stats.positiveFeedback}</p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ThumbsDown className="h-4 w-4 text-red-500" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Negativo</span>
            </div>
            <p className="text-2xl font-bold text-red-500">{stats.negativeFeedback}</p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Taxa Positiva</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{positiveRate}%</p>
            <Progress value={positiveRate} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Feedback by Category */}
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Atom className="h-4 w-4 text-violet-500" />
              Feedback por Categoria Quântica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.categoryCounts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum feedback registrado ainda. Use 👍/👎 nos resultados de pesquisa.</p>
              )}
              {stats.categoryCounts.map(cat => {
                const total = cat.positive + cat.negative;
                const rate = total > 0 ? Math.round((cat.positive / total) * 100) : 0;
                return (
                  <div key={cat.category} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 truncate">
                      {CATEGORY_LABELS[cat.category] || cat.category}
                    </span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-green-500/70 transition-all"
                        style={{ width: `${rate}%` }}
                      />
                      <div
                        className="h-full bg-red-500/70 transition-all"
                        style={{ width: `${100 - rate}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-16 text-right">
                      {cat.positive}↑ {cat.negative}↓
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Feedback */}
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Feedback Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {stats.recentFeedback.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum feedback ainda</p>
              )}
              {stats.recentFeedback.map((fb, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-muted/20 border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/50 rounded text-[10px]">
                  {fb.feedback === "positive" ? (
                    <ThumbsUp className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <ThumbsDown className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate">{fb.query}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant="outline" className="text-[8px] h-4">{CATEGORY_LABELS[fb.category] || fb.category}</Badge>
                      <span className="text-muted-foreground">{new Date(fb.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quantum Weight Evolution */}
      {stats.weightEvolution.length > 0 && (
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Atom className="h-4 w-4 text-violet-500" />
              Evolução dos Pesos Quânticos (Aprendidos)
              <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-500">Auto-tuning</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr>
                    <th className="text-left p-1.5 text-muted-foreground">Categoria</th>
                    {HEAD_LABELS.map(h => (
                      <th key={h} className="text-center p-1.5 text-muted-foreground">{h}</th>
                    ))}
                    <th className="text-center p-1.5 text-muted-foreground">Δ Default</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.weightEvolution.map(cat => {
                    // Compare with defaults
                    const defaults: Record<string, number[]> = {
                      constitucional: [-1, -1, 1, -1, 1, -1],
                      trabalhista: [-1, -1, -1, 1, 1, -1],
                      penal: [1, 1, -1, -1, 1, -1],
                      civil: [1, -1, -1, -1, -1, 1],
                      tributario: [-1, 1, 1, -1, 1, -1],
                      administrativo: [-1, 1, 1, 1, 1, -1],
                      ambiental: [1, -1, -1, 1, -1, 1],
                      consumidor: [1, 1, -1, 1, -1, -1],
                      previdenciario: [-1, 1, 1, 1, 1, 1],
                      eleitoral: [-1, -1, 1, 1, 1, -1],
                      empresarial: [1, 1, -1, -1, -1, 1],
                      familia: [1, -1, -1, 1, -1, 1],
                    };
                    const defaultW = defaults[cat.name] || cat.currentWeights;
                    const totalDelta = cat.currentWeights.reduce((s, w, i) => s + Math.abs(w - (defaultW[i] || 0)), 0);
                    const hasChanged = totalDelta > 0.01;

                    return (
                      <tr key={cat.name} className={hasChanged ? "bg-violet-500/5" : ""}>
                        <td className="p-1.5 font-medium text-foreground">{cat.label}</td>
                        {cat.currentWeights.map((w, i) => {
                          const def = defaultW[i] || 0;
                          const changed = Math.abs(w - def) > 0.01;
                          return (
                            <td key={i} className="text-center p-1.5">
                              <span
                                className={`inline-block w-10 py-0.5 rounded text-[9px] font-mono ${changed ? "ring-1 ring-violet-500/50" : ""}`}
                                style={{
                                  backgroundColor: w >= 0
                                    ? `hsla(142, 70%, 45%, ${Math.abs(w) * 0.4})`
                                    : `hsla(0, 70%, 45%, ${Math.abs(w) * 0.4})`,
                                  color: w >= 0 ? "hsl(142 70% 35%)" : "hsl(0 70% 40%)",
                                }}
                              >
                                {w > 0 ? "+" : ""}{w.toFixed(2)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="text-center p-1.5">
                          <span className={`text-[9px] font-mono ${hasChanged ? "text-violet-500 font-bold" : "text-muted-foreground"}`}>
                            {totalDelta.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-muted-foreground mt-2">
              Δ Default = soma das diferenças absolutas entre pesos aprendidos e iniciais. Valores maiores indicam mais aprendizado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}