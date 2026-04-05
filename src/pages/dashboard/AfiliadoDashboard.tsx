import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link2, MousePointerClick, DollarSign, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

  const stats = [
    { label: "Links Ativos", value: links?.length || 0, icon: Link2, color: "text-primary" },
    { label: "Cliques Totais", value: totalClicks, icon: MousePointerClick, color: "text-cyan-500" },
    { label: "Conversões", value: totalConversions, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Comissões Pendentes", value: `R$ ${(pendingCommission / 100).toFixed(2)}`, icon: DollarSign, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Painel do Afiliado</h1>
        <p className="text-muted-foreground text-sm mt-1">Acompanhe seus links, cliques e comissões</p>
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
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/dashboard/afiliados")}>
              Meus Links <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/dashboard/marketplace")}>
              Marketplace <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/dashboard/pagamentos")}>
              Comissões <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Taxa de Conversão</span>
                <span className="font-bold text-foreground">
                  {totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0.0"}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Comissões Pagas</span>
                <span className="font-bold text-emerald-500">R$ {(paidCommission / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Comissões Pendentes</span>
                <span className="font-bold text-amber-500">R$ {(pendingCommission / 100).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
