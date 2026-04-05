import { useState, useEffect, Suspense, lazy } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, DollarSign, Scale, ShoppingBag, TrendingUp, Activity,
  Shield, Eye, Loader2, Settings, BarChart3, Zap, Globe, Crown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const OrionBackground3D = lazy(() =>
  import("@/components/ui/OrionBackground3D").then(m => ({ default: m.OrionBackground3D }))
);

interface GlobalStats {
  totalUsers: number;
  totalAdvogados: number;
  totalClientes: number;
  totalProdutores: number;
  totalProducts: number;
  totalOrders: number;
  totalDocuments: number;
  totalProcessos: number;
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
        usersRes, advRes, cliRes, prodRes,
        productsRes, ordersRes, docsRes, procRes,
        recentRes
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "advogado"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "cliente"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "produtor"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("processos").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("user_id, full_name, email, created_at").order("created_at", { ascending: false }).limit(8),
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalAdvogados: advRes.count || 0,
        totalClientes: cliRes.count || 0,
        totalProdutores: prodRes.count || 0,
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalDocuments: docsRes.count || 0,
        totalProcessos: procRes.count || 0,
      });
      setRecentUsers(recentRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  const kpis = [
    { icon: Users, label: "Usuários Total", value: stats?.totalUsers || 0, color: "#00D4FF" },
    { icon: Scale, label: "Advogados", value: stats?.totalAdvogados || 0, color: "#D4AF37" },
    { icon: Users, label: "Clientes", value: stats?.totalClientes || 0, color: "#22c55e" },
    { icon: ShoppingBag, label: "Produtores", value: stats?.totalProdutores || 0, color: "#8B5CF6" },
    { icon: ShoppingBag, label: "Produtos", value: stats?.totalProducts || 0, color: "#f59e0b" },
    { icon: DollarSign, label: "Pedidos", value: stats?.totalOrders || 0, color: "#ef4444" },
    { icon: BarChart3, label: "Documentos", value: stats?.totalDocuments || 0, color: "#06b6d4" },
    { icon: Scale, label: "Processos", value: stats?.totalProcessos || 0, color: "#ec4899" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Suspense fallback={null}>
        <OrionBackground3D variant="mixed" intensity="low" className="fixed" />
      </Suspense>

      <div className="relative z-10 space-y-6 p-1">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-xl p-6"
          style={{
            background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(0,212,255,0.05), rgba(10,10,15,0.9))",
            border: "1px solid rgba(212,175,55,0.2)",
            boxShadow: "0 0 40px rgba(212,175,55,0.08)",
          }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
          <div className="flex items-center gap-3 mb-2">
            <Crown className="h-6 w-6" style={{ color: "#D4AF37", filter: "drop-shadow(0 0 8px #D4AF3780)" }} />
            <p className="text-[10px] font-mono tracking-[0.3em] uppercase" style={{ color: "rgba(212,175,55,0.6)" }}>
              ■ PAINEL DO PROPRIETÁRIO
            </p>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "#D4AF37", textShadow: "0 0 25px rgba(212,175,55,0.3)" }}>
            Controle Total
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            Visão global de todos os advogados, clientes, produtores e operações
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((kpi, i) => (
            <Card key={i} className="relative overflow-hidden border-0 hover:scale-[1.02] transition-transform cursor-pointer"
              style={{ backgroundColor: "rgba(10,10,15,0.7)", border: `1px solid ${kpi.color}15`, boxShadow: `0 0 20px ${kpi.color}05` }}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${kpi.color}30, transparent)` }} />
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className="h-4 w-4" style={{ color: kpi.color, filter: `drop-shadow(0 0 4px ${kpi.color}60)` }} />
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: `${kpi.color}80` }}>{kpi.label}</span>
                </div>
                <p className="text-3xl font-bold font-mono" style={{ color: kpi.color, textShadow: `0 0 15px ${kpi.color}30` }}>
                  {kpi.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="bg-card/50 border border-border/30 p-1">
            <TabsTrigger value="users" className="text-xs gap-1.5 data-[state=active]:bg-[#00D4FF]/10 data-[state=active]:text-[#00D4FF]">
              <Users className="h-3.5 w-3.5" /> Usuários Recentes
            </TabsTrigger>
            <TabsTrigger value="quick-actions" className="text-xs gap-1.5 data-[state=active]:bg-[#D4AF37]/10 data-[state=active]:text-[#D4AF37]">
              <Settings className="h-3.5 w-3.5" /> Ações Rápidas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-3">
            {recentUsers.map((u, i) => (
              <Card key={i} className="relative overflow-hidden border-0"
                style={{ backgroundColor: "rgba(10,10,15,0.7)", border: "1px solid rgba(0,212,255,0.1)" }}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(212,175,55,0.1))", color: "#00D4FF", border: "1px solid rgba(0,212,255,0.2)" }}>
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

          <TabsContent value="quick-actions" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Gerenciar Usuários", icon: Users, path: "/dashboard/usuarios", color: "#00D4FF" },
              { label: "Rede Neural", icon: Activity, path: "/dashboard/rede-neural", color: "#22c55e" },
              { label: "Marketplace", icon: ShoppingBag, path: "/dashboard/marketplace", color: "#D4AF37" },
              { label: "Processos", icon: Scale, path: "/dashboard/processos", color: "#8B5CF6" },
              { label: "Configurações", icon: Settings, path: "/dashboard/configuracoes", color: "#f59e0b" },
              { label: "Webhooks", icon: Globe, path: "/dashboard/configuracoes", color: "#06b6d4" },
            ].map((action, i) => (
              <Card key={i}
                className="relative overflow-hidden border-0 cursor-pointer hover:scale-[1.02] transition-all"
                style={{ backgroundColor: "rgba(10,10,15,0.7)", border: `1px solid ${action.color}15` }}
                onClick={() => navigate(action.path)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${action.color}15, ${action.color}05)`, border: `1px solid ${action.color}20` }}>
                    <action.icon className="h-5 w-5" style={{ color: action.color }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
