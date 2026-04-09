import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Users, Cpu, BarChart3, Activity, Target, Zap, PieChart, ArrowUpRight, Plus, RefreshCw } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from "recharts";
import { toast } from "sonner";

function formatBRL(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function KPICard({ label, value, icon: Icon, trend, suffix = "" }: { label: string; value: string | number; icon: any; trend?: number; suffix?: string }) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {trend !== undefined && (
            <Badge variant="outline" className={`text-[10px] ${trend >= 0 ? "text-emerald-400 border-emerald-400/30" : "text-red-400 border-red-400/30"}`}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
              {Math.abs(trend).toFixed(1)}%
            </Badge>
          )}
        </div>
        <p className="text-xl font-bold">{value}{suffix}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// ─── OPERACIONAL TAB ───
function OperacionalTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["orion-operational"],
    queryFn: async () => {
      const d7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const [m7, m30] = await Promise.all([
        supabase.from("ai_metrics").select("success, total_duration_ms, created_at").gte("created_at", d7),
        supabase.from("ai_metrics").select("success, total_duration_ms, created_at").gte("created_at", d30),
      ]);
      const metrics7 = m7.data || [];
      const metrics30 = m30.data || [];
      const total7 = metrics7.length;
      const errors7 = metrics7.filter(m => !m.success).length;
      const avgDur7 = total7 > 0 ? metrics7.reduce((s, m) => s + m.total_duration_ms, 0) / total7 / 1000 : 0;
      const throughput = total7 > 0 ? (total7 / 7).toFixed(1) : "0";
      const errorRate = total7 > 0 ? ((errors7 / total7) * 100).toFixed(1) : "0";
      const uptime = total7 > 0 ? (((total7 - errors7) / total7) * 100).toFixed(1) : "100";

      // Daily breakdown for chart
      const dailyMap: Record<string, { total: number; errors: number }> = {};
      metrics30.forEach(m => {
        const day = m.created_at.slice(0, 10);
        if (!dailyMap[day]) dailyMap[day] = { total: 0, errors: 0 };
        dailyMap[day].total++;
        if (!m.success) dailyMap[day].errors++;
      });
      const chartData = Object.entries(dailyMap).sort().slice(-14).map(([day, v]) => ({
        day: day.slice(5),
        tarefas: v.total,
        erros: v.errors,
      }));

      return { throughput, uptime, errorRate, avgDuration: avgDur7.toFixed(1), chartData, total7 };
    },
    staleTime: 60_000,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Throughput (tarefas/dia)" value={data?.throughput || "0"} icon={Zap} />
        <KPICard label="Uptime Robótico" value={data?.uptime || "100"} icon={Activity} suffix="%" />
        <KPICard label="Taxa de Erro" value={data?.errorRate || "0"} icon={AlertTriangle} suffix="%" />
        <KPICard label="Tempo Médio (s)" value={data?.avgDuration || "0"} icon={Cpu} />
      </div>
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Fluxo de Tarefas — Últimos 14 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.chartData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="tarefas" stroke="hsl(30, 85%, 52%)" fill="hsl(30, 85%, 52%, 0.15)" strokeWidth={2} />
              <Area type="monotone" dataKey="erros" stroke="hsl(0, 70%, 55%)" fill="hsl(0, 70%, 55%, 0.1)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── FINANCEIRO TAB ───
function FinanceiroTab() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ type: "saida", category: "operacional", description: "", amount: "", date: new Date().toISOString().slice(0, 10) });

  const { data: dre, isLoading, refetch } = useQuery({
    queryKey: ["orion-dre"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("orion-intelligence", {
        body: null,
        headers: {},
      });
      // Use query params via direct fetch
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orion-intelligence?action=dre&days=30`, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, "Content-Type": "application/json" },
      });
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: dre90 } = useQuery({
    queryKey: ["orion-dre-90"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orion-intelligence?action=dre&days=90`, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, "Content-Type": "application/json" },
      });
      return res.json();
    },
    staleTime: 120_000,
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("orion_financial_entries").insert({
        user_id: user.id,
        type: formData.type,
        category: formData.category,
        description: formData.description,
        amount_cents: Math.round(parseFloat(formData.amount) * 100),
        date: formData.date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrada registrada");
      setShowForm(false);
      setFormData({ type: "saida", category: "operacional", description: "", amount: "", date: new Date().toISOString().slice(0, 10) });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const projectionsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orion-intelligence?action=projections`, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, "Content-Type": "application/json" },
      });
      return res.json();
    },
    onSuccess: (d) => toast.success(d.insights || "Projeções geradas"),
    onError: () => toast.error("Erro ao gerar projeções"),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const burnRate = dre?.despesas_cents ? Math.round(dre.despesas_cents / (dre.periodo_dias / 30)) : 0;
  const ltv = dre?.orders_completed > 0 ? Math.round(dre.receita_vendas_cents / dre.orders_completed) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard label="Receita (30d)" value={formatBRL(dre?.receita_total_cents || 0)} icon={DollarSign} />
        <KPICard label="Margem Bruta" value={dre?.margem_bruta_percent || 0} icon={TrendingUp} suffix="%" />
        <KPICard label="Despesas (30d)" value={formatBRL(dre?.despesas_cents || 0)} icon={TrendingDown} />
        <KPICard label="Resultado" value={formatBRL(dre?.resultado_cents || 0)} icon={BarChart3} />
        <KPICard label="Burn Rate (mês)" value={formatBRL(burnRate)} icon={Activity} />
        <KPICard label="LTV Médio" value={formatBRL(ltv)} icon={Target} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3 mr-1" /> Entrada Manual
        </Button>
        <Button variant="outline" size="sm" onClick={() => projectionsMutation.mutate()} disabled={projectionsMutation.isPending}>
          {projectionsMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Brain className="h-3 w-3 mr-1" />}
          Projeções IA
        </Button>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {showForm && (
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}>
                <option value="saida">Saída</option>
                <option value="entrada">Entrada</option>
              </select>
              <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                <option value="operacional">Operacional</option>
                <option value="marketing">Marketing</option>
                <option value="salarios">Salários</option>
                <option value="impostos">Impostos</option>
                <option value="investimento">Investimento</option>
                <option value="outros">Outros</option>
              </select>
              <Input type="number" placeholder="Valor (R$)" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} />
              <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
            </div>
            <Input placeholder="Descrição" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            <Button size="sm" onClick={() => addEntry.mutate()} disabled={addEntry.isPending || !formData.amount}>
              {addEntry.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </CardContent>
        </Card>
      )}

      {dre?.despesas_por_categoria && Object.keys(dre.despesas_por_categoria).length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Despesas por Categoria</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={Object.entries(dre.despesas_por_categoria).map(([cat, val]) => ({ category: cat, valor: (val as number) / 100 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="valor" fill="hsl(30, 85%, 52%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── COMERCIAL TAB ───
function ComercialTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["orion-commercial"],
    queryFn: async () => {
      const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
      const [clientsRes, ordersRes, allClientsRes] = await Promise.all([
        supabase.from("client_profiles").select("id, status, created_at").gte("created_at", d30),
        supabase.from("orders").select("id, status, total_cents, created_at").gte("created_at", d30),
        supabase.from("client_profiles").select("id, status", { count: "exact", head: false }),
      ]);
      const newClients = clientsRes.data || [];
      const orders = ordersRes.data || [];
      const allClients = allClientsRes.data || [];
      const completed = orders.filter(o => o.status === "completed");
      const conversionRate = newClients.length > 0 ? ((completed.length / newClients.length) * 100).toFixed(1) : "0";
      const winRate = orders.length > 0 ? ((completed.length / orders.length) * 100).toFixed(1) : "0";
      const avgSale = completed.length > 0 ? Math.round(completed.reduce((s, o) => s + (o.total_cents || 0), 0) / completed.length) : 0;
      const activeClients = allClients.filter(c => c.status === "ativo").length;
      const retention = allClients.length > 0 ? ((activeClients / allClients.length) * 100).toFixed(1) : "0";

      const funnelData = [
        { name: "Leads", value: newClients.length, fill: "hsl(210, 70%, 50%)" },
        { name: "Pedidos", value: orders.length, fill: "hsl(30, 85%, 52%)" },
        { name: "Vendas", value: completed.length, fill: "hsl(160, 60%, 40%)" },
      ];

      return { conversionRate, winRate, avgSale, retention, newLeads: newClients.length, funnelData, churnRate: (100 - parseFloat(retention)).toFixed(1) };
    },
    staleTime: 60_000,
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPICard label="Taxa de Conversão" value={data?.conversionRate || "0"} icon={Target} suffix="%" />
        <KPICard label="Win Rate" value={data?.winRate || "0"} icon={TrendingUp} suffix="%" />
        <KPICard label="Valor Médio Venda" value={formatBRL(data?.avgSale || 0)} icon={DollarSign} />
        <KPICard label="Churn Rate" value={data?.churnRate || "0"} icon={TrendingDown} suffix="%" />
        <KPICard label="Retenção 30d" value={data?.retention || "0"} icon={Users} suffix="%" />
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Funil de Vendas — 30 Dias</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 h-[180px]">
            {(data?.funnelData || []).map((item: any, i: number) => {
              const maxVal = Math.max(...(data?.funnelData || []).map((d: any) => d.value), 1);
              const height = Math.max((item.value / maxVal) * 150, 20);
              return (
                <div key={item.name} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-lg font-bold">{item.value}</span>
                  <div className="w-full rounded-t-md transition-all" style={{ height, backgroundColor: item.fill, opacity: 0.8 }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── ALERTS ───
function AlertsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["orion-anomalies"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orion-intelligence?action=anomalies`, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, "Content-Type": "application/json" },
      });
      return res.json();
    },
    staleTime: 120_000,
  });

  if (isLoading || !data?.anomalies?.length) return null;

  return (
    <div className="space-y-2">
      {data.anomalies.map((a: any, i: number) => (
        <div key={i} className={`flex items-center gap-2 p-3 rounded-lg border ${a.severity === "critical" ? "border-red-500/30 bg-red-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
          <AlertTriangle className={`h-4 w-4 shrink-0 ${a.severity === "critical" ? "text-red-400" : "text-yellow-400"}`} />
          <span className="text-sm">{a.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ───
export default function OrionOrchestratorPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[hsl(30,85%,52%)] to-[hsl(30,85%,35%)] flex items-center justify-center">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Orion — Orquestrador Digital</h1>
          <p className="text-sm text-muted-foreground">Visão unificada: Operacional • Financeiro • Comercial</p>
        </div>
      </div>

      <AlertsSection />

      <Tabs defaultValue="financeiro" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="operacional" className="gap-1.5"><Cpu className="h-3.5 w-3.5" /> Operacional</TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Financeiro</TabsTrigger>
          <TabsTrigger value="comercial" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Comercial</TabsTrigger>
        </TabsList>
        <TabsContent value="operacional"><OperacionalTab /></TabsContent>
        <TabsContent value="financeiro"><FinanceiroTab /></TabsContent>
        <TabsContent value="comercial"><ComercialTab /></TabsContent>
      </Tabs>
    </div>
  );
}
