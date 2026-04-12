import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, FileText, Gavel, MessageSquare, Clock, AlertTriangle,
  ChevronRight, Search, PenTool, Bot, Calendar, Activity,
  Loader2, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, differenceInDays, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

      // Get deadlines from processos
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Clientes Ativos", value: stats?.clientCount || 0, icon: Users, route: "/dashboard/clientes" },
    { label: "Processos", value: stats?.processCount || 0, icon: Gavel, route: "/dashboard/processos" },
    { label: "Documentos", value: stats?.docCount || 0, icon: FileText, route: "/dashboard/documentos" },
    { label: "Mensagens", value: stats?.unreadMessages || 0, icon: MessageSquare, route: "/dashboard/chat", highlight: (stats?.unreadMessages || 0) > 0 },
    { label: "Consultas Pendentes", value: stats?.pendingConsultas || 0, icon: Calendar, route: "/dashboard/consultas" },
  ];

  const quickActions = [
    { label: "Gerar Documento", icon: PenTool, route: "/dashboard/gerar-documento" },
    { label: "Pesquisa Jurídica", icon: Search, route: "/dashboard/pesquisa" },
    { label: "CRM Clientes", icon: Users, route: "/dashboard/clientes" },
    { label: "Chat", icon: MessageSquare, route: "/dashboard/chat" },
    { label: "Orion IA", icon: Bot, route: "/dashboard/orion" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header — Emerald/Teal legal theme */}
      <div className="relative overflow-hidden border border-[hsl(160,60%,40%,0.2)] bg-gradient-to-br from-[hsl(160,30%,6%)] via-card to-[hsl(160,60%,40%,0.06)] p-6 sm:p-8 rounded-lg">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 blur-[120px] animate-pulse" style={{ background: "hsl(160,60%,40%,0.1)", animationDuration: "5s" }} />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[hsl(160,60%,50%,0.6)] mb-1.5 font-sans">{greeting}</p>
          <h1 className="text-2xl sm:text-3xl font-serif text-foreground">
            <span className="text-gold-shine">{userName}</span> <span className="text-[hsl(160,60%,50%)]">⚖️</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Painel do Advogado — {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Stats — emerald accent */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card
            key={s.label}
            className={`cursor-pointer transition-all hover:border-[hsl(160,60%,40%,0.4)] hover:scale-[1.02] ${s.highlight ? "border-[hsl(160,60%,40%,0.5)] bg-[hsl(160,60%,40%,0.06)]" : "border-border/50"}`}
            onClick={() => navigate(s.route)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[hsl(160,60%,40%,0.1)] flex items-center justify-center">
                <s.icon className="h-4 w-4 text-[hsl(160,60%,45%)]" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((a) => (
          <Button key={a.label} variant="outline" size="sm" onClick={() => navigate(a.route)} className="gap-2">
            <a.icon className="h-4 w-4" />
            {a.label}
          </Button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
      {/* Prazos Urgentes — left border color coding */}
        <Card className="lg:col-span-1 border-l-2 border-l-destructive/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 font-serif">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Prazos Urgentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {stats?.deadlines?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum prazo próximo 🎉</p>
              ) : (
                <div className="space-y-2">
                  {stats?.deadlines?.map((d: any) => {
                    const urgency = d.dias === 0 ? "destructive" : d.dias <= 3 ? "secondary" : "outline";
                    return (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer"
                        onClick={() => navigate("/dashboard/processos")}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{d.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(d.prazo, "dd/MM/yyyy")}
                          </p>
                        </div>
                        <Badge variant={urgency} className="shrink-0 ml-2">
                          {d.dias === 0 ? "HOJE" : d.dias === 1 ? "Amanhã" : `${d.dias}d`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Meus Clientes */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Meus Clientes
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/clientes")} className="gap-1 text-xs">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {stats?.clients?.slice(0, 8).map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate("/dashboard/clientes")}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-primary">{c.nome?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.nome}</p>
                        <p className="text-xs text-muted-foreground capitalize">{c.status}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                ))}
                {(!stats?.clients || stats.clients.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente cadastrado</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Mensagens Recentes */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Mensagens Recentes
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/chat")} className="gap-1 text-xs">
              Abrir Chat <ChevronRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {stats?.conversations?.slice(0, 8).map((conv: any) => (
                  <div
                    key={conv.id}
                    className="p-2 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/dashboard/chat?conv=${conv.id}`)}
                  >
                    <p className="text-sm font-medium truncate">{conv.ultima_mensagem || "Nova conversa"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(conv.updated_at), "dd/MM HH:mm")}</p>
                  </div>
                ))}
                {(!stats?.conversations || stats.conversations.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Orion Insights + Atividade Recente */}
      <div className="grid lg:grid-cols-2 gap-6">

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[240px]">
              <div className="space-y-2">
                {recentActivity?.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg border border-border/30">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.titulo}</p>
                      {a.descricao && <p className="text-xs text-muted-foreground truncate">{a.descricao}</p>}
                      <p className="text-xs text-muted-foreground/70">{format(new Date(a.created_at), "dd/MM HH:mm")}</p>
                    </div>
                  </div>
                ))}
                {(!recentActivity || recentActivity.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade recente</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
