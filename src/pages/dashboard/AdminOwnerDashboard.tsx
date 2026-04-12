import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, DollarSign, Scale, ShoppingBag, TrendingUp, Activity,
  Shield, Eye, Loader2, Settings, BarChart3, Zap, Globe, Crown, Database,
  Bell, FileText, Brain, Bot, Share2, Cpu, UserCog, FlaskConical,
  Chrome, ScrollText, Package, MessageSquare,
} from "lucide-react";
import { BigQueryPanel } from "@/components/admin/BigQueryPanel";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GlobalStats {
  totalUsers: number;
  totalAdvogados: number;
  totalClientes: number;
  totalProdutores: number;
  totalAfiliados: number;
  totalProducts: number;
  totalOrders: number;
  totalDocuments: number;
  totalProcessos: number;
  totalRevenueCents: number;
}

export default function AdminOwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [
        usersRes, advRes, cliRes, prodRes, afilRes,
        productsRes, ordersRes, docsRes, procRes,
        recentRes, revenueRes
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "advogado"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "cliente"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "produtor"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "afiliado"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("processos").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("user_id, full_name, email, created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("orders").select("amount_cents").eq("status", "paid"),
      ]);

      const totalRevenue = (revenueRes.data || []).reduce((sum: number, o: any) => sum + (o.amount_cents || 0), 0);

      setStats({
        totalUsers: usersRes.count || 0,
        totalAdvogados: advRes.count || 0,
        totalClientes: cliRes.count || 0,
        totalProdutores: prodRes.count || 0,
        totalAfiliados: afilRes.count || 0,
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalDocuments: docsRes.count || 0,
        totalProcessos: procRes.count || 0,
        totalRevenueCents: totalRevenue,
      });
      setRecentUsers(recentRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    { icon: Users, label: "Usuários Total", value: stats?.totalUsers || 0, color: "hsl(var(--primary))" },
    { icon: Scale, label: "Advogados", value: stats?.totalAdvogados || 0, color: "hsl(var(--accent-foreground))" },
    { icon: Users, label: "Clientes", value: stats?.totalClientes || 0, color: "hsl(142, 71%, 45%)" },
    { icon: ShoppingBag, label: "Produtores", value: stats?.totalProdutores || 0, color: "hsl(263, 70%, 50%)" },
    { icon: Share2, label: "Afiliados", value: stats?.totalAfiliados || 0, color: "hsl(25, 95%, 53%)" },
    { icon: DollarSign, label: "Receita Total", value: `R$ ${((stats?.totalRevenueCents || 0) / 100).toFixed(0)}`, color: "hsl(142, 71%, 45%)" },
    { icon: Package, label: "Produtos", value: stats?.totalProducts || 0, color: "hsl(38, 92%, 50%)" },
    { icon: ShoppingBag, label: "Pedidos", value: stats?.totalOrders || 0, color: "hsl(0, 84%, 60%)" },
    { icon: BarChart3, label: "Documentos", value: stats?.totalDocuments || 0, color: "hsl(187, 85%, 53%)" },
    { icon: Scale, label: "Processos", value: stats?.totalProcessos || 0, color: "hsl(330, 81%, 60%)" },
  ];

  const quickActions = [
    { label: "Gerenciar Usuários", icon: UserCog, path: "/dashboard/usuarios", desc: "Ver e editar todos os usuários" },
    { label: "Rede Neural", icon: Brain, path: "/dashboard/rede-neural", desc: "IA e métricas neurais" },
    { label: "Marketplace", icon: ShoppingBag, path: "/dashboard/marketplace", desc: "Gerenciar produtos e marketplace" },
    { label: "Processos", icon: Scale, path: "/dashboard/processos", desc: "Todos os processos do sistema" },
    { label: "Laboratório IA", icon: FlaskConical, path: "/dashboard/laboratorio-ia", desc: "Testes e experimentos IA" },
    { label: "Controle Robótico", icon: Bot, path: "/dashboard/controle-robotico", desc: "Integração robótica e ROS" },
    { label: "Ferramentas Google", icon: Globe, path: "/dashboard/ferramentas-google", desc: "Google Docs, Drive, etc." },
    { label: "Extensão Chrome", icon: Chrome, path: "/dashboard/extension", desc: "Extensão do navegador" },
    { label: "Recursos EU", icon: Globe, path: "/dashboard/recursos-eu", desc: "Documentos internacionais" },
    { label: "Reformulação IA", icon: ScrollText, path: "/dashboard/reformulacao", desc: "Reformular documentos com IA" },
    { label: "Publicações", icon: FileText, path: "/dashboard/publicacoes", desc: "Blog e artigos" },
    { label: "Notificações", icon: Bell, path: "/dashboard/notificacoes", desc: "Enviar notificações" },
    { label: "Configurações", icon: Settings, path: "/dashboard/configuracoes", desc: "Configurar plataforma" },
    { label: "Chat IA", icon: MessageSquare, path: "/consulta", desc: "Orion IA assistente" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">

      <div className="relative z-10 space-y-6 p-1">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl p-6 bg-card border border-primary/20">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="flex items-center gap-3 mb-2">
            <Crown className="h-6 w-6 text-primary" />
            <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-primary/60">
              ■ PAINEL DO PROPRIETÁRIO
            </p>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            Controle Total
          </h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Visão global de todos os advogados, clientes, produtores, afiliados e operações
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {kpis.map((kpi, i) => (
            <Card key={i} className="relative overflow-hidden bg-card/80 border-border/30 hover:scale-[1.02] transition-transform cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {kpi.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="quick-actions" className="space-y-4">
          <TabsList className="bg-card/50 border border-border/30 p-1 flex-wrap h-auto">
            <TabsTrigger value="quick-actions" className="text-xs gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Settings className="h-3.5 w-3.5" /> Ferramentas
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Users className="h-3.5 w-3.5" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="bigquery" className="text-xs gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Database className="h-3.5 w-3.5" /> BigQuery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick-actions" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {quickActions.map((action, i) => (
              <Card key={i}
                className="bg-card/60 border-border/30 hover:border-primary/40 cursor-pointer hover:scale-[1.01] transition-all group"
                onClick={() => navigate(action.path)}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <action.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{action.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="users" className="space-y-3">
            {recentUsers.map((u, i) => (
              <Card key={i} className="bg-card/80 border-border/30">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm bg-primary/10 text-primary border border-primary/20">
                    {(u.full_name || u.email || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.full_name || "Sem nome"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 font-mono flex-shrink-0">
                    {u.created_at ? format(new Date(u.created_at), "dd/MM/yy", { locale: ptBR }) : "—"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="bigquery">
            <BigQueryPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
