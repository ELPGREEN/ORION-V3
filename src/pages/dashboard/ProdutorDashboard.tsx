import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Package, DollarSign, TrendingUp, ShoppingBag, ArrowRight, Share2, Store,
  Users, FileText, BarChart3, Globe, Brain, Crown,
  Star, CreditCard, FileEdit, Mail, BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProdutorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: products } = useQuery({
    queryKey: ["produtor-products", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("creator_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: orders } = useQuery({
    queryKey: ["produtor-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products!inner(creator_id)")
        .eq("products.creator_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: affiliateLinks } = useQuery({
    queryKey: ["produtor-affiliates", user?.id],
    queryFn: async () => {
      if (!products || products.length === 0) return [];
      const productIds = products.map((p) => p.id);
      const { data } = await supabase
        .from("affiliate_links")
        .select("*")
        .in("product_id", productIds);
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

  const stats = [
    { label: "Produtos Ativos", value: activeProducts, icon: Package, color: "text-primary" },
    { label: "Receita Total", value: `R$ ${(totalRevenue / 100).toFixed(2)}`, icon: DollarSign, color: "text-emerald-500" },
    { label: "Vendas", value: orders?.length || 0, icon: TrendingUp, color: "text-cyan-500" },
    { label: "Afiliados", value: totalAffiliates, icon: Users, color: "text-amber-500" },
    { label: "Clientes Ativos", value: customerAccessCount || 0, icon: BookOpen, color: "text-violet-500" },
  ];

  const tools = [
    { label: "Minha Loja", icon: Store, path: `/loja/${user?.id}`, desc: "Visualizar sua loja pública" },
    { label: "Meus Produtos", icon: Package, path: "/dashboard/meus-produtos", desc: "Criar e gerenciar produtos digitais" },
    { label: "Editor de Vendas", icon: FileEdit, path: "/dashboard/editor-vendas", desc: "Criar páginas de vendas profissionais" },
    { label: "Email Marketing", icon: Mail, path: "/dashboard/campanhas-email", desc: "Campanhas e automações de email" },
    { label: "Marketplace", icon: ShoppingBag, path: "/dashboard/marketplace", desc: "Explorar o marketplace" },
    { label: "Gerenciar Afiliados", icon: Share2, path: "/dashboard/produtor-afiliados", desc: "Programas, solicitações e comissões" },
    { label: "Vendas & Receita", icon: CreditCard, path: "/dashboard/pagamentos", desc: "Configurar Stripe e pagamentos" },
    { label: "Documentos", icon: FileText, path: "/dashboard/documentos", desc: "Contratos e termos de venda" },
    { label: "Docs Internacionais", icon: Globe, path: "/dashboard/documentos-internacionais", desc: "Documentos internacionais" },
    { label: "Orion IA", icon: Brain, path: "/consulta", desc: "Assistente IA para negócios" },
    { label: "Analytics", icon: BarChart3, path: "/dashboard/rede-neural", desc: "Métricas e inteligência artificial" },
    { label: "Avaliações", icon: Star, path: "/dashboard/marketplace", desc: "Ver avaliações dos clientes" },
    { label: "Meu Plano", icon: Crown, path: "/dashboard/plano", desc: "Ver plano e limites" },
    { label: "Perfil Público", icon: Globe, path: "/dashboard/escritorio", desc: "Configurar site / loja pública" },
  ];

  return (
    <div className="space-y-6">
      {/* Header — Violet/Purple vibrant theme */}
      <div className="relative overflow-hidden border border-[hsl(270,60%,50%,0.2)] bg-gradient-to-br from-[hsl(270,30%,8%)] via-card to-[hsl(270,60%,50%,0.08)] p-6 sm:p-8 rounded-lg">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 blur-[120px] animate-pulse" style={{ background: "hsl(270,60%,50%,0.1)", animationDuration: "4s" }} />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[hsl(270,60%,60%,0.6)] mb-1.5 font-sans">PAINEL DO PRODUTOR</p>
            <h1 className="text-2xl sm:text-3xl font-serif text-foreground flex items-center gap-2">
              <Store className="h-6 w-6 text-[hsl(270,60%,55%)]" />
              Seus Produtos & Vendas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie produtos, vendas e afiliados</p>
          </div>
          <Badge variant="outline" className="bg-[hsl(270,60%,50%,0.1)] text-[hsl(270,50%,65%)] border-[hsl(270,60%,50%,0.3)]">
            <Package className="h-3 w-3 mr-1" />
            Produtor
          </Badge>
        </div>
      </div>

      {/* Stats — violet accent */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/80 border-[hsl(270,60%,50%,0.12)] hover:border-[hsl(270,60%,50%,0.3)] transition-all hover:scale-[1.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-[hsl(270,60%,50%,0.1)] flex items-center justify-center">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Copy Store Link */}
      <Card className="bg-card/80 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Link da sua Loja</p>
              <p className="text-xs text-muted-foreground">{window.location.origin}/loja/{user?.id?.slice(0, 8)}...</p>
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/loja/${user?.id}`);
              toast.success("Link copiado!");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
          >
            <Share2 className="h-3 w-3" /> Copiar
          </button>
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

      {/* Recent Orders */}
      {orders && orders.length > 0 && (
        <Card className="bg-card/80 border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
