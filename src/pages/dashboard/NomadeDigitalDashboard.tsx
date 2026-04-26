import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Store, Package, DollarSign, TrendingUp, Users, Share2,
  Globe, CreditCard, FileText, MessageSquare, ArrowRight,
  Laptop, Wallet, ShoppingBag, BarChart3, Mail, Zap, Activity, Brain
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemedHeader, ThemedStatCard, ThemedSection, StatusLED } from "@/components/dashboard/DashboardTheme";
import { format } from "date-fns";

export default function NomadeDigitalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  const { data: products } = useQuery({
    queryKey: ["nomade-products", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("owner_id", user!.id) // Fixed mapping to owner_id if creator_id doesn't exist
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ["nomade-orders", user?.id],
    queryFn: async () => {
      if (!products || products.length === 0) return [];
      const productIds = products.map((p) => p.id);
      const { data } = await supabase
        .from("orders")
        .select("*")
        .in("product_id", productIds)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user && products && products.length > 0,
  });

  const { data: affiliateLinks } = useQuery({
    queryKey: ["nomade-affiliate-links", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_links")
        .select("*")
        .eq("affiliate_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.amount_cents || 0), 0) || 0;
  const activeProducts = products?.filter((p) => p.status === "active")?.length || 0;
  const totalClicks = affiliateLinks?.reduce((sum, l) => sum + (l.clicks || 0), 0) || 0;

  const statCards = [
    { label: "Receita Global", value: `R$ ${(totalRevenue / 100).toFixed(2)}`, icon: DollarSign, highlight: true },
    { label: "Produtos Ativos", value: activeProducts, icon: Package },
    { label: "Vendas Totais", value: orders?.length || 0, icon: TrendingUp },
    { label: "Cliques de Afiliado", value: totalClicks, icon: Users },
  ];

  const tools = [
    { label: "Minha Loja", icon: Store, path: `/loja/${user?.id}`, desc: "Vitrine pública internacional" },
    { label: "Gestão de Produtos", icon: Package, path: "/dashboard/meus-produtos", desc: "Pipeline de entrega digital" },
    { label: "Marketplace", icon: ShoppingBag, path: "/dashboard/marketplace", desc: "Rede de distribuição global" },
    { label: "Email Automations", icon: Mail, path: "/dashboard/campanhas-email", desc: "Réguas de conversão" },
    { label: "Hub de Afiliados", icon: Share2, path: "/dashboard/afiliados", desc: "Gestão de canais e parceiros" },
    { label: "Pagamentos", icon: CreditCard, path: "/dashboard/pagamentos", desc: "Settlements & Stripe Gateway" },
    { label: "Orion Advisor", icon: Brain, path: "/consulta", desc: "Consultoria estratégica via IA" },
    { label: "Performance Analytics", icon: BarChart3, path: "/dashboard/rede-neural", desc: "Métricas e ROI" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <ThemedHeader
        role="nomade"
        greeting={greeting}
        userName={user?.user_metadata?.nome || "Nômade"}
        subtitle="Infraestrutura de Negócios Digitais Sem Fronteiras"
        icon={Globe}
        badgeLabel="NÔMADE DIGITAL"
      >
        <div className="flex items-center gap-3">
          <StatusLED status="online" label="GLOBAL HUB" />
          <StatusLED status="online" label="MULTI-CURRENCY" />
        </div>
      </ThemedHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <ThemedStatCard
            key={s.label}
            role="nomade"
            label={s.label}
            value={s.value}
            icon={s.icon}
            highlight={s.highlight}
          />
        ))}
      </div>

      <ThemedSection role="nomade" title="Operações Estratégicas" icon={Zap}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tools.map((tool) => (
            <Button
              key={tool.label}
              variant="outline"
              className="flex-col h-auto py-5 gap-2 border-border/40 hover:border-primary/40 group"
              onClick={() => navigate(tool.path)}
            >
              <div className="p-2.5 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
                <tool.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-[11px] font-bold uppercase tracking-tight">{tool.label}</p>
                <p className="text-[9px] text-muted-foreground opacity-70 mt-0.5">{tool.desc}</p>
              </div>
            </Button>
          ))}
        </div>
      </ThemedSection>

      {orders && orders.length > 0 && (
        <ThemedSection role="nomade" title="Telemetria de Transações" icon={Activity}>
          <div className="bg-card/80 border border-border/50 rounded-lg p-4 h-[240px]">
            <div className="space-y-2">
              {orders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-2.5 border-b border-border/10 last:border-0 hover:bg-muted/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <div>
                      <p className="text-xs font-mono font-bold uppercase">ORDER #{order.id.slice(0, 8)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">
                        {format(new Date(order.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={order.status === "paid" ? "default" : "secondary"} className="text-[8px] uppercase h-4">
                      {order.status === "paid" ? "SUCCESS" : order.status}
                    </Badge>
                    <span className="text-xs font-bold font-mono">
                      R$ {((order.amount_cents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ThemedSection>
      )}

      {(!products || products.length === 0) && (
        <Card className="bg-card/60 border-dashed border-primary/30 p-12 text-center">
          <Laptop className="h-10 w-10 text-primary/30 mx-auto mb-3" />
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Setup de Loja Necessário</p>
          <p className="text-xs text-muted-foreground mb-6">Crie seu primeiro produto para ativar a infraestrutura de vendas.</p>
          <Button onClick={() => navigate("/dashboard/meus-produtos")} size="sm" className="text-[10px] uppercase tracking-widest">
            Inicializar Produto
          </Button>
        </Card>
      )}
    </div>
  );
}
