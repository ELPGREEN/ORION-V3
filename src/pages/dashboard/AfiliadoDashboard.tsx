import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Link2, MousePointerClick, DollarSign, TrendingUp, ArrowRight,
  ShoppingBag, FileText, MessageSquare, HelpCircle, BarChart3,
  Image, Globe, Brain, Crown, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AfiliadoDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: links } = useQuery({
    queryKey: ["afiliado-links", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_links")
        .select("*")
        .eq("affiliate_user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: commissions } = useQuery({
    queryKey: ["afiliado-commissions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_commissions")
        .select("*")
        .eq("affiliate_user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const totalClicks = links?.reduce((sum, l) => sum + (l.clicks || 0), 0) || 0;
  const totalConversions = links?.reduce((sum, l) => sum + (l.conversions || 0), 0) || 0;
  const pendingCommission = commissions?.filter((c) => c.status === "pending").reduce((sum, c) => sum + (c.amount_cents || 0), 0) || 0;
  const paidCommission = commissions?.filter((c) => c.status === "paid").reduce((sum, c) => sum + (c.amount_cents || 0), 0) || 0;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0.0";

  const stats = [
    { label: "Links Ativos", value: links?.length || 0, icon: Link2, color: "text-primary" },
    { label: "Cliques Totais", value: totalClicks, icon: MousePointerClick, color: "text-cyan-500" },
    { label: "Conversões", value: totalConversions, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Comissões Pendentes", value: `R$ ${(pendingCommission / 100).toFixed(2)}`, icon: DollarSign, color: "text-amber-500" },
  ];

  const tools = [
    { label: "Minha Vitrine", icon: Globe, path: `/vitrine/${user?.id}`, desc: "Sua loja pública de produtos afiliados" },
    { label: "Meus Links", icon: Link2, path: "/dashboard/afiliados", desc: "Gerenciar links de afiliado" },
    { label: "Marketplace", icon: ShoppingBag, path: "/dashboard/marketplace", desc: "Encontrar produtos para promover" },
    { label: "Comissões", icon: DollarSign, path: "/dashboard/pagamentos", desc: "Histórico de comissões e saques" },
    { label: "Materiais", icon: Image, path: "/dashboard/marketplace", desc: "Banners e materiais de divulgação" },
    { label: "Documentos", icon: FileText, path: "/dashboard/documentos", desc: "Contratos e termos de afiliação" },
    { label: "Orion IA", icon: Brain, path: "/consulta", desc: "Assistente IA para estratégias" },
    { label: "Meu Plano", icon: Crown, path: "/dashboard/plano", desc: "Ver plano e limites" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Painel do Afiliado</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Acompanhe seus links, cliques e comissões</p>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary">
          <Link2 className="h-3 w-3 mr-1" />
          Afiliado
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/80 backdrop-blur-sm border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Summary */}
      <Card className="bg-card/80 backdrop-blur-sm border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-foreground">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Taxa de Conversão</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-emerald-500">R$ {(paidCommission / 100).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Comissões Pagas</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-amber-500">R$ {(pendingCommission / 100).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Pendentes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Ferramentas</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tools.map((tool) => (
            <Card
              key={tool.label}
              className="bg-card/60 border-border/30 hover:border-primary/40 transition-all cursor-pointer group"
              onClick={() => navigate(tool.path)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <tool.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{tool.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tool.desc}</p>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors mt-1 flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Commissions */}
      {commissions && commissions.length > 0 && (
        <Card className="bg-card/80 border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Comissões Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {commissions.slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">Comissão #{c.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.status === "paid" ? "default" : "secondary"} className="text-xs">
                      {c.status === "paid" ? "Pago" : "Pendente"}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      R$ {((c.amount_cents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {(!links || links.length === 0) && (
        <Card className="bg-card/60 border-dashed border-primary/30">
          <CardContent className="p-8 text-center">
            <Link2 className="h-12 w-12 text-primary/40 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum link de afiliado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Explore o marketplace e gere seu primeiro link de afiliado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
