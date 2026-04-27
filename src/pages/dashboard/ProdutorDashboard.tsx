import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Package,
  TrendingUp,
  Users,
  DollarSign,
  Store,
  FileEdit,
  Mail,
  ShoppingBag,
  Share2,
  CreditCard,
  FileText,
  Globe,
  Brain,
  BarChart3,
  Star,
  Crown,
  ArrowRight,
  BookOpen,
  Target,
  Zap,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { OrionProductInsights } from "@/components/dashboard/OrionProductInsights";
import { ThemedHeader, ThemedStatCard, ThemedSection, StatusLED } from "@/components/dashboard/DashboardTheme";
import { format } from "date-fns";

export default function ProdutorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  const { data: products } = useQuery({
    queryKey: ["produtor-products", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("creator_id", user?.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ["produtor-orders", user?.id],
    queryFn: async () => {
      if (!products || products.length === 0) return [];
      const productIds = products.map((p) => p.id);
      const { data } = await supabase.from("orders").select("*").in("product_id", productIds).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && !!products && products.length > 0,
  });

  const { data: affiliateLinks } = useQuery({
    queryKey: ["produtor-affiliates", user?.id],
    queryFn: async () => {
      if (!products || products.length === 0) return [];
      const productIds = products.map((p) => p.id);
      const { data } = await supabase.from("affiliate_links").select("*").in("product_id", productIds);
      return data || [];
    },
    enabled: !!user && !!products && products.length > 0,
  });

  const { data: customerAccessCount } = useQuery({
    queryKey: ["produtor-customers", user?.id],
    queryFn: async () => {
      if (!products || products.length === 0) return 0;
      const productIds = products.map((p) => p.id);
      const { count } = await supabase
        .from("customer_access")
        .select("*", { count: "exact", head: true })
        .in("product_id", productIds)
        .eq("is_active", true);
      return count || 0;
    },
    enabled: !!user && !!products && products.length > 0,
  });

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.amount_cents || 0), 0) || 0;
  const activeProducts = products?.filter((p) => p.status === "active")?.length || 0;
  const totalAffiliates = affiliateLinks?.length || 0;

  const statCards = [
    { label: "Produtos Ativos", value: activeProducts, icon: Package, route: "/dashboard/meus-produtos" },
    { label: "Receita Total", value: `R$ ${(totalRevenue / 100).toFixed(2)}`, icon: DollarSign, highlight: true },
    { label: "Vendas Realizadas", value: orders?.length || 0, icon: TrendingUp },
    { label: "Rede de Afiliados", value: totalAffiliates, icon: Users, route: "/dashboard/produtor-afiliados" },
    { label: "Base de Clientes", value: customerAccessCount || 0, icon: BookOpen },
  ];

  const tools = [
    { label: "Meus Produtos", icon: Package, path: "/dashboard/meus-produtos", desc: "Gestão de inventário digital" },
    { label: "Editor de Vendas", icon: FileEdit, path: "/dashboard/editor-vendas", desc: "Engine de conversão LPO" },
    { label: "Email Marketing", icon: Mail, path: "/dashboard/campanhas-email", desc: "Automação de réguas e CRM" },
    { label: "Marketplace", icon: ShoppingBag, path: "/dashboard/marketplace", desc: "Distribuição e escala" },
    { label: "Gerenciar Afiliados", icon: Share2, path: "/dashboard/produtor-afiliados", desc: "Expansão de canais de venda" },
    { label: "Vendas & Receita", icon: CreditCard, path: "/dashboard/pagamentos", desc: "Infraestrutura financeira Stripe" },
    { label: "Analytics IA", icon: BarChart3, path: "/dashboard/rede-neural", desc: "Inteligência de dados e ROI" },
    { label: "Meu Plano", icon: Crown, path: "/dashboard/plano", desc: "Escalabilidade de recursos" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <ThemedHeader
        role="produtor"
        greeting={greeting}
        userName={user?.user_metadata?.nome || "Produtor"}
        subtitle="Centro de Operações de Produtos Digitais & Escala Enterprise"
        icon={Target}
        badgeLabel="PRODUTOR"
      >
        <div className="flex items-center gap-3">
          <StatusLED status="online" label="ECOMMERCE ENGINE" />
          <StatusLED status="online" label="STRIPE CONNECT" />
        </div>
      </ThemedHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <ThemedStatCard
            key={s.label}
            role="produtor"
            label={s.label}
            value={s.value}
            icon={s.icon}
            onClick={s.route ? () => navigate(s.route) : undefined}
            highlight={s.highlight}
          />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {products && products.length > 0 && (
            <OrionProductInsights
              context={`Produtos ativos: ${activeProducts}, Vendas: ${orders?.length || 0}, Receita: R$${(totalRevenue / 100).toFixed(2)}, Afiliados: ${totalAffiliates}, Clientes ativos: ${customerAccessCount || 0}`}
            />
          )}
          {(!products || products.length === 0) && (
            <Card className="bg-card/60 border-dashed border-primary/30 h-[200px] flex items-center justify-center">
              <div className="text-center">
                 <Store className="h-10 w-10 text-primary/30 mx-auto mb-2" />
                 <p className="text-sm font-medium">Nenhum produto em produção</p>
                 <Button variant="link" onClick={() => navigate("/dashboard/meus-produtos")}>Criar primeiro produto</Button>
              </div>
            </Card>
          )}
        </div>

        <ThemedSection role="produtor" title="Infraestrutura de Loja" icon={Activity}>
          <Card className="bg-card/80 border-primary/20">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Status da Vitrine</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/20 bg-green-500/5">LIVE</Badge>
              </div>
              <div className="p-2 rounded bg-muted/30 border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Public URL</p>
                <p className="text-xs font-mono truncate">{window.location.origin}/loja/{user?.id?.slice(0, 12)}...</p>
              </div>
              <Button
                size="sm"
                className="w-full text-[10px] uppercase tracking-widest gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/loja/${user?.id}`);
                  toast.success("Endpoint copiado para o clipboard.");
                }}
              >
                <Share2 className="h-3.5 w-3.5" /> Copiar Link de Vendas
              </Button>
            </CardContent>
          </Card>
        </ThemedSection>
      </div>

      <ThemedSection role="produtor" title="Sistemas de Escala & Automação" icon={Zap}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tools.map((tool) => (
            <Button
              key={tool.label}
              variant="outline"
              className="flex-col h-auto py-5 gap-2 border-border/40 hover:border-primary/40 hover:bg-primary/5 group transition-all"
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
        <ThemedSection role="produtor" title="Telemetria de Vendas (Real-time)" icon={Activity}>
          <div className="bg-card/80 border border-border/50 rounded-lg p-4 h-[240px]">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {orders.slice(0, 10).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-2.5 rounded border border-border/20 bg-muted/5 group hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <p className="text-xs font-mono font-bold uppercase">TX: {order.id.slice(0, 12)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {format(new Date(order.created_at), "dd/MM/yyyy HH:mm:ss")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-500">R$ {((order.amount_cents || 0) / 100).toFixed(2)}</p>
                      <Badge variant="outline" className="text-[8px] h-4 uppercase">{order.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </ThemedSection>
      )}
    </div>
  );
}
