import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Zap, Activity, DollarSign, TrendingUp, Target, Users, ArrowUpRight, Loader2 } from "lucide-react";
import { ThemedSection } from "@/components/dashboard/DashboardTheme";

function formatBRL(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function MiniKPI({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-background/50 border border-border/30">
      <Icon className="h-3.5 w-3.5 text-[hsl(30,85%,52%)] shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{value}</p>
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}

export default function OrionOrchestratorWidget() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["orion-widget-kpis"],
    queryFn: async () => {
      const d7 = new Date(Date.now() - 7 * 86400000).toISOString();
      const d30 = new Date(Date.now() - 30 * 86400000).toISOString();

      const [metricsRes, ordersRes, clientsRes] = await Promise.all([
        supabase.from("ai_metrics").select("success, total_duration_ms").gte("created_at", d7),
        supabase.from("orders").select("total_cents, status").gte("created_at", d30),
        supabase.from("client_profiles").select("id, status", { count: "exact" }),
      ]);

      const metrics = metricsRes.data || [];
      const orders = ordersRes.data || [];
      const clients = clientsRes.data || [];

      const total = metrics.length;
      const errors = metrics.filter(m => !m.success).length;
      const throughput = total > 0 ? (total / 7).toFixed(0) : "0";
      const uptime = total > 0 ? (((total - errors) / total) * 100).toFixed(0) : "100";

      const completed = orders.filter(o => o.status === "completed");
      const revenue = completed.reduce((s, o) => s + (o.total_cents || 0), 0);
      const margin = revenue > 0 ? "100" : "0"; // Simplified without expenses query

      const active = clients.filter(c => c.status === "ativo").length;
      const convRate = clients.length > 0 ? ((completed.length / Math.max(clients.length, 1)) * 100).toFixed(0) : "0";
      const retention = clients.length > 0 ? ((active / clients.length) * 100).toFixed(0) : "0";

      return { throughput, uptime, revenue, margin, convRate, retention };
    },
    staleTime: 60_000,
  });

  return (
    <ThemedSection role="owner" title="Orion — Orquestrador" icon={Brain}>
      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <MiniKPI label="Throughput/dia" value={data?.throughput || "0"} icon={Zap} />
            <MiniKPI label="Uptime" value={`${data?.uptime || "100"}%`} icon={Activity} />
            <MiniKPI label="Receita 30d" value={formatBRL(data?.revenue || 0)} icon={DollarSign} />
            <MiniKPI label="Margem" value={`${data?.margin || "0"}%`} icon={TrendingUp} />
            <MiniKPI label="Conversão" value={`${data?.convRate || "0"}%`} icon={Target} />
            <MiniKPI label="Retenção 30d" value={`${data?.retention || "0"}%`} icon={Users} />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-[hsl(30,85%,52%,0.3)] hover:border-[hsl(30,85%,52%,0.6)]"
            onClick={() => navigate("/dashboard/orion-orchestrator")}
          >
            <Brain className="h-3.5 w-3.5" />
            Ver Painel Completo
            <ArrowUpRight className="h-3 w-3 ml-auto" />
          </Button>
        </div>
      )}
    </ThemedSection>
  );
}
