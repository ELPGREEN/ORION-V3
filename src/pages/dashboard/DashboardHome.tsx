import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles, FileText, FolderOpen, MessageSquare, TrendingUp,
  ChevronRight, Gavel, ScrollText, Handshake, PenTool, Shield,
  AlertTriangle, BarChart3, Loader2, Users, Clock, Calendar,
  Search, Bot, ArrowUpRight, Activity, Chrome, Globe2,
  Store, Cpu, Brain, FlaskConical, UserCog, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import AnalyticsDashboard from "@/components/dashboard/AnalyticsDashboard";
import SecretarySummariesWidget from "@/components/dashboard/SecretarySummariesWidget";
import OrionStatusWidget from "@/components/dashboard/OrionStatusWidget";
import AIDailySummaryWidget from "@/components/dashboard/AIDailySummaryWidget";

interface DashboardStats {
  documents: number;
  cases: number;
  chats: number;
  signatures: number;
  clients: number;
  pendingConsultas: number;
}

interface RecentActivity {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  link: string | null;
  created_at: string;
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { unlocked: adminUnlocked } = useAdminAccess();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Admin";

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  const { data: queryData, isLoading: loadingStats } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user");
      const [docsRes, processosRes, conversasRes, envelopesRes, clientsRes, consultasRes, notifRes] = await Promise.all([
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("processos").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("chat_conversations").select("id", { count: "exact", head: true }).or(`advogado_id.eq.${user.id},cliente_id.eq.${user.id}`),
        supabase.from("signature_envelopes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("client_profiles").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("consultas").select("id", { count: "exact", head: true }).eq("advogado_id", user.id).eq("status", "pendente"),
        supabase.from("notificacoes").select("id, titulo, descricao, tipo, link, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const stats: DashboardStats = {
        documents: docsRes.count || 0,
        cases: processosRes.count || 0,
        chats: conversasRes.count || 0,
        signatures: envelopesRes.count || 0,
        clients: clientsRes.count || 0,
        pendingConsultas: consultasRes.count || 0,
      };

      logNeural({
        interaction_type: "document_viewed",
        input_text: `Dashboard acessado — ${new Date().toISOString()}`,
        output_text: `docs:${stats.documents} processos:${stats.cases} chats:${stats.chats}`,
        quality_score: 0.6,
        user_id: user.id,
        metadata: { source: "dashboard_home", ...stats },
      });

      return { stats, activities: (notifRes.data || []) as RecentActivity[] };
    },
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const stats = queryData?.stats ?? { documents: 0, cases: 0, chats: 0, signatures: 0, clients: 0, pendingConsultas: 0 };
  const activities = queryData?.activities ?? [];

  const statCards = [
    { label: "Documentos", value: stats.documents, icon: FileText, gradient: "from-primary/20 to-primary/5", borderColor: "border-primary/30" },
    { label: "Processos", value: stats.cases, icon: FolderOpen, gradient: "from-accent/20 to-accent/5", borderColor: "border-accent/30" },
    { label: "Clientes", value: stats.clients, icon: Users, gradient: "from-primary/15 to-transparent", borderColor: "border-primary/20" },
    { label: "Conversas", value: stats.chats, icon: MessageSquare, gradient: "from-accent/15 to-transparent", borderColor: "border-accent/20" },
    { label: "Consultas Pendentes", value: stats.pendingConsultas, icon: Clock, gradient: "from-warning/15 to-transparent", borderColor: "border-warning/30" },
    { label: "Assinaturas", value: stats.signatures, icon: PenTool, gradient: "from-primary/10 to-transparent", borderColor: "border-primary/15" },
  ];

  const extrajudicialActions = [
    { title: "Contrato de Serviços", desc: "Minutas e termos", icon: Handshake, path: "/dashboard/gerar-documento?tipo=contrato-servicos" },
    { title: "Procuração", desc: "Ad judicia e extra", icon: PenTool, path: "/dashboard/gerar-documento?tipo=procuracao-ad-judicia" },
    { title: "Notificação", desc: "Extrajudicial", icon: AlertTriangle, path: "/dashboard/gerar-documento?tipo=notificacao-extrajudicial" },
    { title: "Acordo", desc: "Extrajudicial", icon: ScrollText, path: "/dashboard/gerar-documento?tipo=acordo-extrajudicial" },
  ];

  const judicialActions = [
    { title: "Petição Inicial", desc: "Todas as áreas", icon: Gavel, path: "/dashboard/gerar-documento?tipo=peticao-inicial" },
    { title: "Contestação", desc: "Defesa processual", icon: Shield, path: "/dashboard/gerar-documento?tipo=contestacao" },
    { title: "Recurso", desc: "Apelação e agravo", icon: Gavel, path: "/dashboard/gerar-documento?tipo=recurso-apelacao" },
    { title: "Cumprimento", desc: "De sentença", icon: FileText, path: "/dashboard/gerar-documento?tipo=cumprimento-sentenca" },
  ];

  const quickNav = [
    { title: "Orion IA", icon: Brain, path: "/consulta" },
    { title: "Pesquisa Jurídica", icon: Search, path: "/dashboard/pesquisa-unificada" },
    { title: "CRM & Clientes", icon: Users, path: "/dashboard/crm" },
    { title: "Agendar Consulta", icon: Calendar, path: "/dashboard/consultas" },
    { title: "Chat ao Vivo", icon: MessageSquare, path: "/dashboard/chat-ao-vivo" },
    { title: "Marketplace", icon: Store, path: "/dashboard/marketplace" },
    { title: "Docs Internacionais", icon: Globe2, path: "/dashboard/documentos-internacionais" },
    { title: "Assinaturas", icon: PenTool, path: "/dashboard/assinaturas" },
  ];

  const adminTools = [
    { title: "Ferramentas IA", icon: Brain, path: "/dashboard/rede-neural" },
    { title: "Laboratório IA", icon: FlaskConical, path: "/dashboard/laboratorio-ia" },
    { title: "Reformulação IA", icon: ScrollText, path: "/dashboard/reformulacao" },
    { title: "Ferramentas Google", icon: Globe2, path: "/dashboard/ferramentas-google" },
    { title: "Controle Robótico", icon: Bot, path: "/dashboard/controle-robotico" },
    { title: "Extensão Chrome", icon: Chrome, path: "/dashboard/extension" },
    { title: "Recursos EU", icon: Globe2, path: "/dashboard/recursos-eu" },
    { title: "Rede Neural", icon: Cpu, path: "/dashboard/rede-neural" },
    { title: "Usuários", icon: UserCog, path: "/dashboard/usuarios" },
  ];

  const handleQuickAction = (title: string, path: string) => {
    navigate(path);
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Welcome Hero ── */}
      <div className="relative overflow-hidden border border-primary/20 bg-gradient-to-br from-card via-card/95 to-primary/8 p-6 sm:p-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-accent/8 blur-[100px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-primary/5 rotate-45 opacity-30" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-primary/60 mb-1.5 font-sans">{greeting}</p>
            <h1 className="text-2xl sm:text-3xl font-serif text-foreground">
              <span className="text-gold-shine">{userName}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed">
              {stats.pendingConsultas > 0
                ? `Você tem ${stats.pendingConsultas} consulta${stats.pendingConsultas > 1 ? "s" : ""} pendente${stats.pendingConsultas > 1 ? "s" : ""} e ${stats.cases} processo${stats.cases !== 1 ? "s" : ""} ativo${stats.cases !== 1 ? "s" : ""}.`
                : `${stats.cases} processo${stats.cases !== 1 ? "s" : ""} ativo${stats.cases !== 1 ? "s" : ""} e ${stats.documents} documento${stats.documents !== 1 ? "s" : ""} no sistema.`}
            </p>
          </div>
          <div className="flex gap-3 sm:gap-4">
            {[
              { label: "Processos", value: stats.cases, color: "text-emerald-400" },
              { label: "Pendentes", value: stats.pendingConsultas, color: stats.pendingConsultas > 0 ? "text-warning" : "text-muted-foreground" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-xl sm:text-2xl font-serif ${s.color} transition-colors`}>
                  {loadingStats ? "–" : s.value}
                </p>
                <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Quick nav pills */}
        <div className="relative z-10 flex flex-wrap gap-2 mt-5">
          {quickNav.map((nav) => (
            <button
              key={nav.title}
              onClick={() => navigate(nav.path)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-all border backdrop-blur-sm bg-card/60 border-border text-muted-foreground hover:text-foreground hover:border-primary/25"
            >
              <nav.icon className="h-3 w-3" />
              {nav.title}
            </button>
          ))}
        </div>
        {/* Admin tools — only visible when admin unlocked */}
        {adminUnlocked && (
          <div className="relative z-10 mt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Lock className="h-3 w-3 text-primary/60" />
              <span className="text-[9px] uppercase tracking-[0.2em] text-primary/60 font-medium">Ferramentas Administrativas</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {adminTools.map((tool) => (
                <button
                  key={tool.title}
                  onClick={() => navigate(tool.path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium transition-all border backdrop-blur-sm bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                >
                  <tool.icon className="h-3 w-3" />
                  {tool.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Stat Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat, i) => (
          <button
            key={stat.label}
            onClick={() => setShowAnalytics(true)}
            className={`relative overflow-hidden bg-card border ${stat.borderColor} p-4 hover-gold-glow transition-all text-left animate-fade-in-up group`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50 pointer-events-none`} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-4 w-4 text-primary/70" />
                {!loadingStats && stat.value > 0 && (
                  <span className="h-1.5 w-1.5 bg-emerald-400 animate-pulse" style={{ animationDuration: '3s' }} />
                )}
              </div>
              {loadingStats ? (
                <div className="h-7 w-12 bg-muted animate-pulse" />
              ) : (
                <p className="text-2xl font-serif text-foreground tabular-nums">{stat.value}</p>
              )}
              <p className="text-[9px] text-muted-foreground tracking-wider uppercase mt-1 leading-tight">{stat.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Orion + AI Summary Row ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <OrionStatusWidget />
        <AIDailySummaryWidget />
      </div>

      {/* ── Analytics Toggle ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-serif text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          {t.dashboard.admin.analytics}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary hover:text-primary/80"
          onClick={() => setShowAnalytics(!showAnalytics)}
        >
          {showAnalytics ? t.common.close : t.common.viewAll}
          <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${showAnalytics ? "rotate-90" : ""}`} />
        </Button>
      </div>

      {showAnalytics && <AnalyticsDashboard />}

      {/* ── Secretary AI ── */}
      <SecretarySummariesWidget />

      {/* ── Quick Actions Grid ── */}
      {!showAnalytics && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Extrajudicial */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-primary" />
                Extrajudicial
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] text-primary hover:text-primary/80 h-6 px-2"
                onClick={() => navigate("/dashboard/gerar-documento")}
              >
                Ver todos <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {extrajudicialActions.map((action, i) => (
                <button
                  key={action.title}
                  onClick={() => handleQuickAction(action.title, action.path)}
                  className="bg-card border border-border p-3.5 text-left hover-gold-glow transition-all group animate-fade-in-up"
                  style={{ animationDelay: `${(i + 3) * 60}ms` }}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:border-primary/40 transition-colors">
                      <action.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-medium text-foreground leading-tight">{action.title}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{action.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Judicial */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
                <Gavel className="h-4 w-4 text-primary" />
                Judicial
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] text-primary hover:text-primary/80 h-6 px-2"
                onClick={() => navigate("/dashboard/gerar-documento")}
              >
                Ver todos <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {judicialActions.map((action, i) => (
                <button
                  key={action.title}
                  onClick={() => handleQuickAction(action.title, action.path)}
                  className="bg-card border border-border p-3.5 text-left hover-gold-glow transition-all group animate-fade-in-up"
                  style={{ animationDelay: `${(i + 5) * 60}ms` }}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 border border-border flex items-center justify-center flex-shrink-0 group-hover:border-primary/20 transition-colors">
                      <action.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-medium text-foreground leading-tight">{action.title}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{action.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Activity ── */}
      {!showAnalytics && (
        <div>
          <h2 className="text-sm font-serif text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t.dashboard.recentActivity}
          </h2>
          {loadingStats ? (
            <div className="bg-card border border-border p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-1.5">
              {activities.map((activity, i) => (
                <button
                  key={activity.id}
                  onClick={() => activity.link && navigate(activity.link)}
                  className="w-full bg-card border border-border p-3.5 text-left hover-gold-glow transition-all flex items-center gap-3 group animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="h-8 w-8 border border-border flex items-center justify-center flex-shrink-0 group-hover:border-primary/30 transition-colors">
                    <TrendingUp className="h-3.5 w-3.5 text-primary/70 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate group-hover:text-primary transition-colors">{activity.titulo}</p>
                    {activity.descricao && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{activity.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground/60">{formatTimeAgo(activity.created_at)}</span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border p-10 flex flex-col items-center justify-center text-center">
              <div className="relative h-14 w-14 border border-border flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-muted-foreground/20" />
                <div className="absolute -inset-2 bg-primary/5 blur-lg pointer-events-none" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{t.dashboard.noNotifications}</p>
              <p className="text-xs text-muted-foreground/60">{t.dashboard.quickActions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
