import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, MousePointerClick, ShoppingCart, DollarSign, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Afiliados() {
  const { user } = useAuth();

  const { data: links, isLoading } = useQuery({
    queryKey: ["affiliate-dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_links")
        .select("*, products(*)")
        .eq("affiliate_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: commissions } = useQuery({
    queryKey: ["affiliate-commissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select("*")
        .eq("affiliate_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalClicks = links?.reduce((sum: number, l: any) => sum + (l.clicks || 0), 0) || 0;
  const totalConversions = links?.reduce((sum: number, l: any) => sum + (l.conversions || 0), 0) || 0;
  const totalEarnings = commissions?.reduce((sum: number, c: any) => sum + (c.amount_cents || 0), 0) || 0;
  const pendingEarnings = commissions?.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + c.amount_cents, 0) || 0;

  const copyLink = (hash: string, creatorId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/loja/${creatorId}?ref=${hash}`);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel do Afiliado</h1>
        <p className="text-muted-foreground text-sm">Acompanhe seus links, cliques e comissões</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Links Ativos", value: links?.length || 0, icon: Link2, color: "text-primary" },
          { label: "Cliques Totais", value: totalClicks, icon: MousePointerClick, color: "text-blue-400" },
          { label: "Conversões", value: totalConversions, icon: ShoppingCart, color: "text-green-400" },
          { label: "Ganhos Totais", value: `R$ ${(totalEarnings / 100).toFixed(2)}`, icon: DollarSign, color: "text-primary" },
        ].map((s, i) => (
          <Card key={i} className="bg-card/80 backdrop-blur-sm border-border/40">
            <CardContent className="flex items-center gap-4 py-4">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingEarnings > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4 flex items-center justify-between">
            <span className="text-sm text-foreground">Saldo pendente: <strong className="text-primary">R$ {(pendingEarnings / 100).toFixed(2)}</strong></span>
            <Badge variant="outline" className="border-primary/30 text-primary">Pendente</Badge>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Meus Links</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : !links?.length ? (
          <p className="text-muted-foreground text-sm">Nenhum link de afiliado ainda. Visite o Marketplace para se afiliar a produtos.</p>
        ) : (
          <div className="space-y-3">
            {links.map((l: any) => (
              <Card key={l.id} className="bg-card/80 border-border/40">
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{(l as any).products?.title || "Produto"}</p>
                    <p className="text-xs text-muted-foreground">{l.clicks} cliques · {l.conversions} conversões</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1 flex-shrink-0" onClick={() => copyLink(l.hash, (l as any).products?.creator_id || "")}>
                    <Copy className="h-3 w-3" /> Copiar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {commissions && commissions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Histórico de Comissões</h2>
          <div className="space-y-2">
            {commissions.map((c: any) => (
              <Card key={c.id} className="bg-card/80 border-border/40">
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">R$ {(c.amount_cents / 100).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Badge className={c.status === "paid" ? "bg-green-500/20 text-green-400" : c.status === "pending" ? "bg-warning/20 text-warning" : "bg-red-500/20 text-red-400"}>
                    {c.status === "paid" ? "Pago" : c.status === "pending" ? "Pendente" : "Cancelado"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
