import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, FileText, Gavel, MessageSquare, Clock, AlertTriangle,
  ChevronRight, Search, PenTool, Bot, Calendar, Activity,
  Loader2, ArrowUpRight, Scale, ShieldCheck, Sparkles, Brain, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import OrionAdvogadoInsights from "@/components/dashboard/OrionAdvogadoInsights";
import { ThemedHeader, ThemedStatCard, ThemedSection, StatusLED } from "@/components/dashboard/DashboardTheme";

export default function AdvogadoDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.user_metadata?.nome || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Advogado";

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  // Stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["advogado-dashboard-stats", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user");
      const [clients, processos, docs, conversations, consultas, unread] = await Promise.all([
        supabase.from("client_profiles").select("id, nome, status, updated_at").eq("advogado_id", user.id).order("updated_at", { ascending: false }).limit(20),
        supabase.from("processos").select("id, titulo, status, proxima_audiencia, prazo_fatal, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("chat_conversations").select("id, cliente_id, ultima_mensagem, updated_at").eq("advogado_id", user.id).order("updated_at", { ascending: false }).limit(10),
        supabase.from("consultas").select("id, data_hora, tipo, status").eq("advogado_id", user.id).eq("status", "pendente"),
        supabase.rpc("get_unread_count", { _user_id: user.id }),
      ]);

      const now = new Date();
      const deadlines = (processos.data || [])
        .filter((p: any) => p.prazo_fatal && new Date(p.prazo_fatal) >= now)
        .map((p: any) => ({
          id: p.id,
          titulo: p.titulo,
          prazo: new Date(p.prazo_fatal),
          dias: differenceInDays(new Date(p.prazo_fatal), now),
        }))
        .sort((a: any, b: any) => a.prazo.getTime() - b.prazo.getTime())
        .slice(0, 7);

      return {
        clientCount: clients.data?.length || 0,
        clients: clients.data || [],
        processCount: processos.data?.length || 0,
        docCount: docs.count || 0,
        conversations: conversations.data || [],
        pendingConsultas: consultas.data?.length || 0,
        unreadMessages: (unread.data as number) || 0,
        deadlines,
      };
    },
    enabled: !!user,
  });

  // Recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ["advogado-recent-activity", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("notificacoes" as any)
        .select("id, titulo, descricao, tipo, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8);
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const statCards = [
    { label: "Clientes Ativos", value: stats?.clientCount || 0, icon: Users, route: "/dashboard/clientes" },
    { label: "Processos", value: stats?.processCount || 0, icon: Gavel, route: "/dashboard/processos" },
    { label: "Documentos", value: stats?.docCount || 0, icon: FileText, route: "/dashboard/documentos" },
    { label: "Mensagens", value: stats?.unreadMessages || 0, icon: MessageSquare, route: "/dashboard/chat", highlight: (stats?.unreadMessages || 0) > 0 },
    { label: "Consultas", value: stats?.pendingConsultas || 0, icon: Calendar, route: "/dashboard/consultas" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header — Advanced Emerald Theme */}
      <ThemedHeader
        role="advogado"
        greeting={greeting}
        userName={userName}
        subtitle="Infraestrutura de Inteligência Jurídica & Automação de Processos"
        icon={Scale}
        badgeLabel="ADVOGADO"
      >
        <div className="flex items-center gap-3">
          <StatusLED status="online" label="ORION AI" />
          <StatusLED status="online" label="WATSON BRIDGE" />
        </div>
      </ThemedHeader>

      {/* Stats — Premium Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <ThemedStatCard
            key={s.label}
            role="advogado"
            label={s.label}
            value={s.value}
            icon={s.icon}
            onClick={() => navigate(s.route)}
            highlight={s.highlight}
          />
        ))}
      </div>

      {/* Core Intelligence Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Urgent Deadlines — Enterprise Priority */}
        <ThemedSection role="advogado" title="Prioridade Crítica" icon={AlertTriangle} className="lg:col-span-1">
          <div className="bg-card/80 border border-border/50 rounded-lg p-4 h-[320px] flex flex-col">
            <ScrollArea className="flex-1">
              {stats?.deadlines?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center opacity-40">
                  <ShieldCheck className="h-10 w-10 mb-2" />
                  <p className="text-xs">Sistemas em conformidade. Nenhum prazo crítico detectado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats?.deadlines?.map((d: any) => {
                    const urgency = d.dias === 0 ? "destructive" : d.dias <= 3 ? "secondary" : "outline";
                    return (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2.5 rounded-md border border-border/40 hover:bg-muted/30 cursor-pointer group transition-colors"
                        onClick={() => navigate("/dashboard/processos")}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{d.titulo}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Target: {format(d.prazo, "dd/MM/yyyy")}
                          </p>
                        </div>
                        <Badge variant={urgency} className="shrink-0 ml-2 text-[9px] h-5">
                          {d.dias === 0 ? "CRITICAL" : d.dias === 1 ? "AMANHÃ" : `${d.dias}D`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <Button variant="ghost" size="sm" className="mt-2 w-full text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100" onClick={() => navigate("/dashboard/processos")}>
              Ver Infraestrutura Processual
            </Button>
          </div>
        </ThemedSection>

        {/* AI Orchestration / Insights */}
        <div className="lg:col-span-2">
           <OrionAdvogadoInsights />
        </div>
      </div>

      {/* Main Operations Section */}
      <ThemedSection role="advogado" title="Automação & Ferramentas de Produção" icon={Zap}>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {[
            { label: "Gerar Documento", icon: PenTool, route: "/dashboard/gerar-documento" },
            { label: "Pesquisa Jurisprudencial", icon: Search, route: "/dashboard/pesquisa" },
            { label: "Reformulação IA", icon: Sparkles, route: "/dashboard/reformulacao" },
            { label: "Assinatura Digital", icon: ShieldCheck, route: "/dashboard/assinatura-digital" },
            { label: "Laboratório IA", icon: Brain, route: "/dashboard/laboratorio-ia" },
            { label: "Orquestrador Neural", icon: Bot, route: "/dashboard/rede-neural" },
          ].map((a) => (
            <Button
              key={a.label}
              variant="outline"
              className="flex-col h-auto py-4 gap-2 border-border/40 hover:border-primary/40 hover:bg-primary/5 group"
              onClick={() => navigate(a.route)}
            >
              <div className="p-2 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors">
                <a.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter text-center">{a.label}</span>
            </Button>
          ))}
        </div>
      </ThemedSection>

      {/* Grid Secundário */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Gestão de Ativos (Clientes) */}
        <ThemedSection role="advogado" title="Gestão de Ativos & Clientes" icon={Users}>
          <div className="bg-card/80 border border-border/50 rounded-lg p-4 h-[300px] flex flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {stats?.clients?.slice(0, 8).map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded-md border border-border/30 hover:bg-muted/30 cursor-pointer group transition-all"
                    onClick={() => navigate("/dashboard/clientes")}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                        <span className="text-[10px] font-bold text-primary">{c.nome?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{c.nome}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{c.status}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
                {(!stats?.clients || stats.clients.length === 0) && (
                  <p className="text-[10px] text-muted-foreground text-center py-12">Nenhum registro no CRM</p>
                )}
              </div>
            </ScrollArea>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/clientes")} className="mt-2 text-[10px] uppercase tracking-widest opacity-60">
              Acessar CRM Completo
            </Button>
          </div>
        </ThemedSection>

        {/* Mensagens e Comunicação */}
        <ThemedSection role="advogado" title="Comunicação em Tempo Real" icon={MessageSquare}>
          <div className="bg-card/80 border border-border/50 rounded-lg p-4 h-[300px] flex flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {stats?.conversations?.slice(0, 8).map((conv: any) => (
                  <div
                    key={conv.id}
                    className="p-2.5 rounded-md border border-border/20 hover:bg-muted/30 cursor-pointer group transition-all"
                    onClick={() => navigate(`/dashboard/chat?conv=${conv.id}`)}
                  >
                    <div className="flex justify-between items-start mb-1">
                       <p className="text-[10px] font-mono text-primary uppercase">MSG_THREAD: {conv.id.slice(0, 8)}</p>
                       <p className="text-[9px] text-muted-foreground font-mono">{format(new Date(conv.updated_at), "dd/MM HH:mm")}</p>
                    </div>
                    <p className="text-xs font-medium truncate opacity-80">{conv.ultima_mensagem || "Nova solicitação de contato"}</p>
                  </div>
                ))}
                {(!stats?.conversations || stats.conversations.length === 0) && (
                  <p className="text-[10px] text-muted-foreground text-center py-12">Nenhum canal de chat ativo</p>
                )}
              </div>
            </ScrollArea>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/chat")} className="mt-2 text-[10px] uppercase tracking-widest opacity-60">
              Abrir Central de Mensagens
            </Button>
          </div>
        </ThemedSection>
      </div>

      {/* Telemetria de Eventos (Atividade) */}
      <ThemedSection role="advogado" title="Logs de Telemetria de Sistema" icon={Activity}>
          <div className="bg-card/80 border border-border/50 rounded-lg p-4 h-[240px]">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {recentActivity?.map((a: any) => (
                <div key={a.id} className="flex items-start gap-2 p-2 rounded-md border border-border/20 bg-muted/5">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0 animate-pulse" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{a.titulo}</p>
                    {a.descricao && <p className="text-[10px] text-muted-foreground truncate leading-relaxed">{a.descricao}</p>}
                    <p className="text-[8px] text-muted-foreground/50 font-mono mt-1 uppercase">TIMESTAMP: {format(new Date(a.created_at), "dd/MM HH:mm:ss")}</p>
                  </div>
                </div>
              ))}
              {(!recentActivity || recentActivity.length === 0) && (
                <p className="text-[10px] text-muted-foreground text-center py-12">Sem logs de atividade recentes</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </ThemedSection>
    </div>
  );
}
