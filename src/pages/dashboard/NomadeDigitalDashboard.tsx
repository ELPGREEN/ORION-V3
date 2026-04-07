import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Store, Package, DollarSign, TrendingUp, Users, Share2,
  Globe, CreditCard, FileText, MessageSquare, ArrowRight,
  Laptop, Wallet, ShoppingBag, BarChart3, Mail,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NomadeDigitalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: products } = useQuery({
    queryKey: ["nomade-products", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ["nomade-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products!inner(creator_id)")
        .eq("products.creator_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: affiliateLinks } = useQuery({
    queryKey: ["nomade-affiliate-links", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_links")
        .select("*")
        .eq("affiliate_user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.amount_cents || 0), 0) || 0;
  const activeProducts = products?.filter((p) => p.status === "active")?.length || 0;
  const totalClicks = affiliateLinks?.reduce((sum, l) => sum + (l.clicks || 0), 0) || 0;

  const stats = [
    { label: "Produtos Ativos", value: activeProducts, icon: Package, color: "text-primary" },
    { label: "Receita Total", value: `R$ ${(totalRevenue / 100).toFixed(2)}`, icon: DollarSign, color: "text-emerald-500" },
    { label: "Vendas", value: orders?.length || 0, icon: TrendingUp, color: "text-cyan-500" },
    { label: "Cliques Afiliados", value: totalClicks, icon: Users, color: "text-amber-500" },
  ];

  const tools = [
    { label: "Minha Loja", icon: Store, path: `/loja/${user?.id}`, desc: "Visualizar sua loja pública" },
    { label: "Meus Produtos", icon: Package, path: "/dashboard/meus-produtos", desc: "Criar e gerenciar produtos digitais" },
    { label: "Marketplace", icon: ShoppingBag, path: "/dashboard/marketplace", desc: "Explorar o marketplace" },
    { label: "Email Marketing", icon: Mail, path: "/dashboard/campanhas-email", desc: "Campanhas e automações de email" },
    { label: "Afiliados", icon: Share2, path: "/dashboard/afiliados", desc: "Gerenciar links de afiliados e comissões" },
    { label: "Pagamentos", icon: CreditCard, path: "/dashboard/pagamentos", desc: "Configurar Stripe e receber pagamentos" },
    { label: "Documentos", icon: FileText, path: "/dashboard/documentos", desc: "Seus documentos e contratos" },
    { label: "Chat IA", icon: MessageSquare, path: "/consulta", desc: "Assistente IA para negócios digitais" },
    { label: "Métricas", icon: BarChart3, path: "/dashboard/rede-neural", desc: "Analytics e inteligência artificial" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Laptop className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Painel Nômade Digital</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie sua loja, produtos, afiliados e finanças
          </p>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary">
          <Globe className="h-3 w-3 mr-1" />
          Nômade Digital
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

      {/* Quick Actions */}
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

      {/* Recent Orders */}
      {orders && orders.length > 0 && (
        <Card className="bg-card/80 border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Vendas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">Pedido #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={order.status === "paid" ? "default" : "secondary"} className="text-xs">
                      {order.status === "paid" ? "Pago" : order.status}
                    </Badge>
                    <span className="text-sm font-semibold text-foreground">
                      R$ {((order.amount_cents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {(!products || products.length === 0) && (
        <Card className="bg-card/60 border-dashed border-primary/30">
          <CardContent className="p-8 text-center">
            <Store className="h-12 w-12 text-primary/40 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Sua loja está vazia</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie seu primeiro produto digital e comece a vender
            </p>
            <Button onClick={() => navigate("/dashboard/meus-produtos")} className="gap-2">
              <Package className="h-4 w-4" />
              Criar Produto
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
