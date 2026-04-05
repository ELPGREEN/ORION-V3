import { useState, useEffect, useMemo } from "react";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useAuth } from "@/contexts/AuthContext";
import {
  Brain,
  Zap,
  TrendingUp,
  Clock,
  DollarSign,
  Database,
  Activity,
  BarChart3,
  RefreshCw,
  Server,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
} from "recharts";

interface AIMetric {
  id: string;
  query: string;
  complexity: string;
  provider: string;
  cost_tier: number;
  phase1_duration_ms: number | null;
  phase2_duration_ms: number | null;
  total_duration_ms: number;
  tools_used: string[];
  data_sources_used: string[];
  tokens_estimated: number | null;
  response_length: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  avgHitsPerEntry: number;
  topSources: { source: string; count: number }[];
}

const COST_TIER_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Tier Alpha (Velocidade)", color: "hsl(142, 71%, 45%)" },
  2: { label: "Tier Beta (Multimodal)", color: "hsl(200, 80%, 50%)" },
  3: { label: "Tier Gamma (Equilíbrio)", color: "hsl(46, 65%, 52%)" },
  4: { label: "Tier Delta (Premium)", color: "hsl(0, 72%, 51%)" },
};

const COMPLEXITY_COLORS: Record<string, string> = {
  simple: "hsl(142, 71%, 45%)",
  moderate: "hsl(46, 65%, 52%)",
  complex: "hsl(0, 72%, 51%)",
};

export default function MetricasIA() {
  const { logNeural } = useNeuralFeedback();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AIMetric[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [embeddingsCount, setEmbeddingsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const daysMap: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 };
      const days = daysMap[timeRange] || 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Fetch metrics, cache stats, and embeddings count in parallel
      const [metricsRes, cacheRes, embeddingsRes] = await Promise.all([
        supabase
          .from("ai_metrics")
          .select("*")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("api_cache")
          .select("source, hit_count, result_count"),
        supabase
          .from("legal_embeddings")
          .select("id", { count: "exact", head: true }),
      ]);

      if (metricsRes.error) throw metricsRes.error;
      setMetrics((metricsRes.data as any[]) || []);

      // Process cache stats
      const cacheData = (cacheRes.data as any[]) || [];
      if (cacheData.length > 0) {
        const totalHits = cacheData.reduce((sum: number, c: any) => sum + (c.hit_count || 0), 0);
        const sourceCounts: Record<string, number> = {};
        cacheData.forEach((c: any) => {
          sourceCounts[c.source] = (sourceCounts[c.source] || 0) + 1;
        });
        setCacheStats({
          totalEntries: cacheData.length,
          totalHits,
          avgHitsPerEntry: cacheData.length > 0 ? totalHits / cacheData.length : 0,
          topSources: Object.entries(sourceCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([source, count]) => ({ source, count })),
        });
      }

      setEmbeddingsCount(embeddingsRes.count || 0);

      // 🧠 Neural: registra acesso ao dashboard de métricas
      logNeural({
        interaction_type: "metricas_viewed",
        input_text: `Métricas IA consultadas — período: ${timeRange}`,
        output_text: `queries:${(metricsRes.data as any[]).length} embeddings:${embeddingsRes.count || 0}`,
        quality_score: 0.65,
        user_id: user?.id,
        metadata: { timeRange, source: "metricas_ia_dashboard" },
      });
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeRange]);

  // ─── COMPUTED STATS ───
  const stats = useMemo(() => {
    if (metrics.length === 0) return null;

    const totalQueries = metrics.length;
    const successRate = metrics.filter((m) => m.success).length / totalQueries;
    const avgDuration = metrics.reduce((sum, m) => sum + m.total_duration_ms, 0) / totalQueries;
    const avgCostTier = metrics.reduce((sum, m) => sum + m.cost_tier, 0) / totalQueries;

    // Provider distribution
    const providerCounts: Record<string, number> = {};
    metrics.forEach((m) => {
      const key = m.provider.replace("SuperIA/", "");
      providerCounts[key] = (providerCounts[key] || 0) + 1;
    });

    // Complexity distribution
    const complexityCounts: Record<string, number> = {};
    metrics.forEach((m) => {
      complexityCounts[m.complexity] = (complexityCounts[m.complexity] || 0) + 1;
    });

    // Cost tier distribution
    const costTierCounts: Record<number, number> = {};
    metrics.forEach((m) => {
      costTierCounts[m.cost_tier] = (costTierCounts[m.cost_tier] || 0) + 1;
    });

    // Data sources usage
    const sourceCounts: Record<string, number> = {};
    metrics.forEach((m) => {
      (m.data_sources_used || []).forEach((s) => {
        sourceCounts[s] = (sourceCounts[s] || 0) + 1;
      });
    });

    // Tools usage
    const toolCounts: Record<string, number> = {};
    metrics.forEach((m) => {
      (m.tools_used || []).forEach((t) => {
        toolCounts[t] = (toolCounts[t] || 0) + 1;
      });
    });

    // Timeline data (grouped by day)
    const dailyData: Record<string, { date: string; count: number; avgDuration: number; totalDuration: number }> = {};
    metrics.forEach((m) => {
      const day = m.created_at.split("T")[0];
      if (!dailyData[day]) {
        dailyData[day] = { date: day, count: 0, avgDuration: 0, totalDuration: 0 };
      }
      dailyData[day].count++;
      dailyData[day].totalDuration += m.total_duration_ms;
    });
    Object.values(dailyData).forEach((d) => {
      d.avgDuration = Math.round(d.totalDuration / d.count);
    });

    // Cost savings (compared to always using Tier Delta)
    const actualCost = metrics.reduce((sum, m) => sum + m.cost_tier, 0);
    const maxCost = totalQueries * 3; // If all used Tier Gamma
    const savingsPercent = Math.round(((maxCost - actualCost) / maxCost) * 100);

    return {
      totalQueries,
      successRate,
      avgDuration: Math.round(avgDuration),
      avgCostTier,
      providerCounts,
      complexityCounts,
      costTierCounts,
      sourceCounts,
      toolCounts,
      dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
      savingsPercent,
    };
  }, [metrics]);

  const providerPieData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.providerCounts).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const complexityPieData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.complexityCounts).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const costTierBarData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.costTierCounts).map(([tier, count]) => ({
      name: COST_TIER_LABELS[Number(tier)]?.label || `Tier ${tier}`,
      count,
      tier: Number(tier),
    }));
  }, [stats]);

  const sourceBarData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [stats]);

  const PIE_COLORS = [
    "hsl(46, 65%, 52%)",
    "hsl(200, 80%, 50%)",
    "hsl(142, 71%, 45%)",
    "hsl(280, 60%, 55%)",
    "hsl(0, 72%, 51%)",
    "hsl(30, 80%, 55%)",
  ];

  if (loading && metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm tracking-wider">CARREGANDO MÉTRICAS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-serif text-foreground tracking-wider">
              MÉTRICAS DA SUPER IA
            </h1>
            <p className="text-[10px] text-primary tracking-[0.2em]">
              DASHBOARD DE PERFORMANCE NEURAL
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-28 h-8 text-xs border-border bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">24 horas</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
            className="h-8 text-xs btn-outline-gold"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-[10px] text-muted-foreground tracking-wider">TOTAL QUERIES</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalQueries}</p>
              <p className="text-[10px] text-primary">
                {Math.round(stats.successRate * 100)}% sucesso
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-[10px] text-muted-foreground tracking-wider">TEMPO MÉDIO</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {stats.avgDuration < 1000
                  ? `${stats.avgDuration}ms`
                  : `${(stats.avgDuration / 1000).toFixed(1)}s`}
              </p>
              <p className="text-[10px] text-primary">por query</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-[10px] text-muted-foreground tracking-wider">ECONOMIA</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.savingsPercent}%</p>
              <p className="text-[10px] text-primary">vs. sempre Tier Delta</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-4 w-4 text-primary" />
                <span className="text-[10px] text-muted-foreground tracking-wider">TIER MÉDIO</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {stats.avgCostTier.toFixed(1)}
              </p>
              <p className="text-[10px] text-primary">
                {stats.avgCostTier < 1.5
                  ? "Ultra econômico"
                  : stats.avgCostTier < 2.5
                  ? "Econômico"
                  : "Moderado"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* RAG Infrastructure KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground tracking-wider">EMBEDDINGS</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {embeddingsCount.toLocaleString("pt-BR")}
            </p>
            <p className="text-[10px] text-primary">vetores no pgvector</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground tracking-wider">CACHE ENTRIES</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {cacheStats?.totalEntries || 0}
            </p>
            <p className="text-[10px] text-primary">
              {cacheStats?.totalHits || 0} cache hits
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground tracking-wider">HIT RATE</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {cacheStats && cacheStats.totalEntries > 0
                ? `${cacheStats.avgHitsPerEntry.toFixed(1)}x`
                : "0x"}
            </p>
            <p className="text-[10px] text-primary">média de reutilização</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground tracking-wider">FONTES CACHE</span>
            </div>
            <div className="flex gap-1 flex-wrap mt-1">
              {(cacheStats?.topSources || []).slice(0, 3).map((s) => (
                <Badge key={s.source} variant="secondary" className="text-[8px] px-1 py-0">
                  {s.source} ({s.count})
                </Badge>
              ))}
              {!cacheStats?.topSources?.length && (
                <span className="text-xs text-muted-foreground">Sem dados</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-serif tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                QUERIES POR DIA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.dailyData}>
                  <defs>
                    <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(46, 65%, 52%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(46, 65%, 52%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(40, 10%, 60%)" }}
                    tickFormatter={(v) => v.split("-").slice(1).join("/")} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(40, 10%, 60%)" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(20, 12%, 10%)", border: "1px solid hsl(46, 65%, 52%)", fontSize: 12 }}
                    labelStyle={{ color: "hsl(46, 65%, 52%)" }}
                  />
                  <Area type="monotone" dataKey="count" stroke="hsl(46, 65%, 52%)" fillOpacity={1} fill="url(#colorQueries)" name="Queries" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Provider Distribution */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-serif tracking-wider flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                PROVEDORES UTILIZADOS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={providerPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {providerPieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(20, 12%, 10%)", border: "1px solid hsl(46, 65%, 52%)", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row 2 */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cost Tier Distribution */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-serif tracking-wider flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                DISTRIBUIÇÃO DE CUSTOS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={costTierBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(40, 10%, 60%)" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(40, 10%, 60%)" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(20, 12%, 10%)", border: "1px solid hsl(46, 65%, 52%)", fontSize: 12 }} />
                  <Bar dataKey="count" name="Queries">
                    {costTierBarData.map((entry, index) => (
                      <Cell key={index} fill={COST_TIER_LABELS[entry.tier]?.color || PIE_COLORS[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Complexity Distribution */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-serif tracking-wider flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                COMPLEXIDADE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={complexityPieData} cx="50%" cy="50%" outerRadius={70}
                    dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {complexityPieData.map((entry) => (
                      <Cell key={entry.name} fill={COMPLEXITY_COLORS[entry.name] || PIE_COLORS[0]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(20, 12%, 10%)", border: "1px solid hsl(46, 65%, 52%)", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-serif tracking-wider flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                FONTES DE DADOS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sourceBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(40, 10%, 60%)" }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 9, fill: "hsl(40, 10%, 60%)" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(20, 12%, 10%)", border: "1px solid hsl(46, 65%, 52%)", fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(46, 65%, 52%)" name="Uso" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Queries Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-serif tracking-wider">
            QUERIES RECENTES
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-2">Hora</th>
                  <th className="text-left p-2">Query</th>
                  <th className="text-left p-2">Complexidade</th>
                  <th className="text-left p-2">Provedor</th>
                  <th className="text-left p-2">Tier</th>
                  <th className="text-left p-2">Duração</th>
                  <th className="text-left p-2">Fontes</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.slice(0, 20).map((m) => (
                  <tr key={m.id} className="border-b border-border/30 hover:bg-card/80">
                    <td className="p-2 text-muted-foreground whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="p-2 max-w-[200px] truncate text-foreground" title={m.query}>
                      {m.query}
                    </td>
                    <td className="p-2">
                      <Badge
                        variant="outline"
                        className="text-[9px]"
                        style={{
                          borderColor: COMPLEXITY_COLORS[m.complexity],
                          color: COMPLEXITY_COLORS[m.complexity],
                        }}
                      >
                        {m.complexity}
                      </Badge>
                    </td>
                    <td className="p-2 text-foreground whitespace-nowrap">
                      {m.provider.replace("SuperIA/", "")}
                    </td>
                    <td className="p-2">
                      <Badge
                        variant="outline"
                        className="text-[9px]"
                        style={{
                          borderColor: COST_TIER_LABELS[m.cost_tier]?.color,
                          color: COST_TIER_LABELS[m.cost_tier]?.color,
                        }}
                      >
                        T{m.cost_tier}
                      </Badge>
                    </td>
                    <td className="p-2 text-muted-foreground whitespace-nowrap">
                      {m.total_duration_ms < 1000
                        ? `${m.total_duration_ms}ms`
                        : `${(m.total_duration_ms / 1000).toFixed(1)}s`}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1 flex-wrap">
                        {(m.data_sources_used || []).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[8px] px-1 py-0">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-2">
                      {m.success ? (
                        <span className="text-green-500">✓</span>
                      ) : (
                        <span className="text-destructive" title={m.error_message || ""}>✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {metrics.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma métrica registrada ainda.</p>
              <p className="text-xs mt-1">
                As métricas serão coletadas automaticamente conforme o chat jurídico IA for utilizado.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
