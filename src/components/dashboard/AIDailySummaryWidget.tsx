import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Calendar, FileText, AlertCircle, TrendingUp, Loader2 } from "lucide-react";

interface SummaryData {
  todayDocs: number;
  upcomingConsultas: number;
  recentCases: number;
  aiInteractions: number;
}

export default function AIDailySummaryWidget() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["ai-daily-summary", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user");
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfWeek = new Date(today.getTime() + 7 * 86400000).toISOString();

      const [docsRes, consultasRes, casesRes, aiRes] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).gte("created_at", startOfDay),
        supabase.from("consultas").select("id", { count: "exact", head: true })
          .eq("advogado_id", user.id).gte("data_hora", startOfDay).lte("data_hora", endOfWeek),
        supabase.from("processos").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).gte("created_at", startOfDay),
        supabase.from("ai_metrics").select("id", { count: "exact", head: true })
          .eq("user_id", user.id).gte("created_at", startOfDay),
      ]);

      return {
        todayDocs: docsRes.count || 0,
        upcomingConsultas: consultasRes.count || 0,
        recentCases: casesRes.count || 0,
        aiInteractions: aiRes.count || 0,
      } as SummaryData;
    },
    enabled: !!user,
    staleTime: 120_000,
  });

  const insights = data ? [
    ...(data.upcomingConsultas > 0 ? [`${data.upcomingConsultas} consulta${data.upcomingConsultas > 1 ? "s" : ""} nos próximos 7 dias`] : []),
    ...(data.todayDocs > 0 ? [`${data.todayDocs} documento${data.todayDocs > 1 ? "s" : ""} criado${data.todayDocs > 1 ? "s" : ""} hoje`] : []),
    ...(data.aiInteractions > 0 ? [`${data.aiInteractions} interaç${data.aiInteractions > 1 ? "ões" : "ão"} com IA hoje`] : []),
    ...(data.recentCases > 0 ? [`${data.recentCases} novo${data.recentCases > 1 ? "s" : ""} processo${data.recentCases > 1 ? "s" : ""} hoje`] : []),
  ] : [];

  const summaryCards = [
    { label: "Docs Hoje", value: data?.todayDocs ?? 0, icon: FileText, color: "text-primary" },
    { label: "Consultas", value: data?.upcomingConsultas ?? 0, icon: Calendar, color: "text-accent" },
    { label: "Processos", value: data?.recentCases ?? 0, icon: AlertCircle, color: "text-primary" },
    { label: "IA Usos", value: data?.aiInteractions ?? 0, icon: Brain, color: "text-accent" },
  ];

  return (
    <div className="bg-card border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 bg-primary/10 border border-primary/20 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Resumo Inteligente</h3>
          <p className="text-[10px] text-muted-foreground">Visão geral do dia gerada pela IA</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Mini stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="bg-muted/30 border border-border p-2.5 text-center">
                <card.icon className={`h-3.5 w-3.5 mx-auto mb-1 ${card.color}`} />
                <p className="text-lg font-serif text-foreground tabular-nums">{card.value}</p>
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Insights */}
          {insights.length > 0 ? (
            <div className="space-y-1.5">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/10 text-xs text-foreground">
                  <span className="h-1.5 w-1.5 bg-primary rounded-full flex-shrink-0" />
                  {insight}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">
              Nenhuma atividade registrada hoje. Comece gerando um documento!
            </p>
          )}
        </>
      )}
    </div>
  );
}
