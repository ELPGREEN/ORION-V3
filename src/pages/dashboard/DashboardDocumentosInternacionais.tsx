import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, FileText, CheckCircle, DollarSign, Plus, Globe } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Deal = {
  id: string;
  type: string;
  status: string;
  title: string | null;
  counterparty: string | null;
  country: string | null;
  value_cents: number;
  probability: number;
  sent_at: string;
  closed_at: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  prospect: "bg-muted text-muted-foreground",
  sent: "bg-primary/20 text-primary",
  negotiating: "bg-yellow-500/20 text-yellow-400",
  closed: "bg-emerald-500/20 text-emerald-400",
  lost: "bg-destructive/20 text-destructive",
};

const STATUS_LABELS: Record<string, string> = {
  prospect: "Prospect",
  sent: "Enviado",
  negotiating: "Negociação",
  closed: "Fechado",
  lost: "Perdido",
};

const FUNNEL_STAGES = [
  { key: "prospect", label: "Prospect", color: "from-muted-foreground/20 to-muted-foreground/5" },
  { key: "sent", label: "LOI Enviada", color: "from-primary/30 to-primary/10" },
  { key: "negotiating", label: "Negociação", color: "from-yellow-500/30 to-yellow-500/10" },
  { key: "closed", label: "Contrato Fechado", color: "from-emerald-500/30 to-emerald-500/10" },
];

export default function DashboardDocumentosInternacionais() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("90");
  const [countryFilter, setCountryFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["international-dashboard", period],
    queryFn: async () => {
      const days = parseInt(period);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return { deals: [] as Deal[] };

      const { data: deals } = await supabase
        .from("deals")
        .select("*")
        .eq("creator_id", user.user.id)
        .gte("sent_at", cutoff.toISOString())
        .order("sent_at", { ascending: false });

      return { deals: (deals || []) as Deal[] };
    },
  });

  const deals = data?.deals || [];

  const filteredDeals = useMemo(() => {
    if (countryFilter === "all") return deals;
    return deals.filter((d) => d.country === countryFilter);
  }, [deals, countryFilter]);

  const countries = useMemo(() => {
    const set = new Set(deals.map((d) => d.country).filter(Boolean));
    return Array.from(set).sort();
  }, [deals]);

  const metrics = useMemo(() => {
    const lois = filteredDeals.filter((d) => d.type === "loi").length;
    const closed = filteredDeals.filter((d) => d.status === "closed");
    const closedCount = closed.length;
    const closedValue = closed.reduce((s, d) => s + (d.value_cents || 0), 0);
    const pipeline = filteredDeals
      .filter((d) => d.status !== "closed" && d.status !== "lost")
      .reduce((s, d) => s + ((d.value_cents || 0) * (d.probability || 0)) / 100, 0);
    return { lois, closedCount, closedValue, pipeline };
  }, [filteredDeals]);

  const funnelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    FUNNEL_STAGES.forEach((s) => {
      counts[s.key] = filteredDeals.filter((d) => d.status === s.key).length;
    });
    return counts;
  }, [filteredDeals]);

  const fmt = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Documentos Internacionais
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Pipeline • LOIs • Contratos gerados</p>
        </div>
        <Button
          className="gap-2 text-xs"
          onClick={() => navigate("/dashboard/gerar-documento")}
        >
          <Plus className="h-4 w-4" />
          Gerar Novo Documento
        </Button>
      </div>

      {/* KPIs — pré-atentive processing */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              LOIs Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{metrics.lois}</p>
            <p className="text-[10px] text-muted-foreground mt-1">últimos {period} dias</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Contratos Fechados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-400">{metrics.closedCount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{fmt(metrics.closedValue)}</p>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20 bg-cyan-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-cyan-400" />
              Pipeline Estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-cyan-400">{fmt(metrics.pipeline)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">valor ponderado por probabilidade</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Período</label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="180">Últimos 180 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">País</label>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-44 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os países</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c!}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Funil de Conversão */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Funil de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FUNNEL_STAGES.map((stage) => (
              <div
                key={stage.key}
                className={`bg-gradient-to-b ${stage.color} rounded-lg p-4 text-center border border-border/20`}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{stage.label}</p>
                <p className="text-2xl font-bold text-foreground">{funnelCounts[stage.key] || 0}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Documentos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Documentos Gerados</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Tipo</TableHead>
                <TableHead className="text-[10px]">Título / Contraparte</TableHead>
                <TableHead className="text-[10px]">País</TableHead>
                <TableHead className="text-[10px]">Data</TableHead>
                <TableHead className="text-[10px]">Valor</TableHead>
                <TableHead className="text-[10px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                    Nenhum documento encontrado neste período.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase">
                        {deal.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{deal.title || deal.counterparty || "—"}</TableCell>
                    <TableCell className="text-xs">{deal.country || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(deal.sent_at), "dd MMM yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs">{deal.value_cents ? fmt(deal.value_cents) : "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-[9px] ${STATUS_COLORS[deal.status] || ""}`}>
                        {STATUS_LABELS[deal.status] || deal.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
