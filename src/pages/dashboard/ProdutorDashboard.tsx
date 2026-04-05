import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, DollarSign, TrendingUp, ShoppingBag, ArrowRight, Share2, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.amount_cents || 0), 0) || 0;
  const activeProducts = products?.filter((p) => p.status === "active")?.length || 0;

  const stats = [
    { label: "Produtos Ativos", value: activeProducts, icon: Package, color: "text-primary" },
    { label: "Receita Total", value: `R$ ${(totalRevenue / 100).toFixed(2)}`, icon: DollarSign, color: "text-emerald-500" },
    { label: "Vendas Recentes", value: orders?.length || 0, icon: TrendingUp, color: "text-cyan-500" },
    { label: "Total Produtos", value: products?.length || 0, icon: ShoppingBag, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Painel do Produtor</h1>
        <p className="text-muted-foreground text-sm mt-1">Gerencie seus produtos e acompanhe suas vendas</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card/80 backdrop-blur-sm border-border/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
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

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="default"
              className="w-full justify-between btn-gold"
              onClick={() => {
                const url = `${window.location.origin}/loja/${user?.id}`;
                navigator.clipboard.writeText(url);
                toast.success("Link da sua loja copiado!");
              }}
            >
              <span className="flex items-center gap-2"><Store className="h-4 w-4" /> Minha Loja</span>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate(`/loja/${user?.id}`)}>
              Ver Loja <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/dashboard/meus-produtos")}>
              Meus Produtos <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/dashboard/marketplace")}>
              Marketplace <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/dashboard/pagamentos")}>
              Vendas & Receita <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {orders && orders.length > 0 ? (
              <div className="space-y-2">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border/20 last:border-0">
                    <span className="text-muted-foreground truncate">{order.buyer_user_id?.slice(0, 8) || "—"}</span>
                    <span className="font-medium text-foreground">R$ {((order.amount_cents || 0) / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma venda ainda</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
