import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Share2, Users, DollarSign, TrendingUp, Settings, CheckCircle, XCircle, Clock,
  Loader2, ToggleLeft, ToggleRight, Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function ProdutorAfiliados() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Meus programas
  const { data: programs } = useQuery({
    queryKey: ["producer-affiliate-programs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_programs")
        .select("*, products(name, price_cents)")
        .eq("creator_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  // Meus produtos sem programa
  const { data: productsWithoutProgram } = useQuery({
    queryKey: ["products-without-program", user?.id, programs],
    queryFn: async () => {
      const programProductIds = programs?.map((p: any) => p.product_id) || [];
      const { data } = await supabase
        .from("products")
        .select("id, name, price_cents")
        .eq("creator_id", user!.id)
        .eq("status", "active");
      return (data || []).filter((p: any) => !programProductIds.includes(p.id));
    },
    enabled: !!user && !!programs,
  });

  // Solicitações pendentes
  const { data: requests } = useQuery({
    queryKey: ["producer-affiliate-requests", user?.id],
    queryFn: async () => {
      if (!programs || programs.length === 0) return [];
      const programIds = programs.map((p: any) => p.id);
      const { data } = await supabase
        .from("affiliate_requests")
        .select("*, affiliate_programs(products(name)), profiles:affiliate_user_id(full_name, email)")
        .in("program_id", programIds)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && !!programs && programs.length > 0,
  });

  // Vendas dos afiliados
  const { data: sales } = useQuery({
    queryKey: ["producer-affiliate-sales", user?.id],
    queryFn: async () => {
      if (!programs || programs.length === 0) return [];
      const productIds = programs.map((p: any) => p.product_id);
      const { data } = await supabase
        .from("affiliate_sales")
        .select("*, products(name)")
        .in("product_id", productIds)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user && !!programs && programs.length > 0,
  });

  // Criar programa
  const createProgram = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("affiliate_programs").insert({
        product_id: productId,
        creator_id: user!.id,
        commission_percent: 30,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Programa de afiliados criado!");
      qc.invalidateQueries({ queryKey: ["producer-affiliate-programs"] });
      qc.invalidateQueries({ queryKey: ["products-without-program"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Aprovar/rejeitar
  const reviewRequest = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("affiliate_requests")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Se aprovado, criar link de afiliado
      if (status === "approved") {
        const req = requests?.find((r: any) => r.id === id);
        if (req) {
          const program = programs?.find((p: any) => p.id === req.program_id);
          if (program) {
            await supabase.from("affiliate_links").insert({
              affiliate_user_id: req.affiliate_user_id,
              product_id: program.product_id,
            });
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Solicitação atualizada!");
      qc.invalidateQueries({ queryKey: ["producer-affiliate-requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Toggle programa ativo
  const toggleProgram = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("affiliate_programs")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["producer-affiliate-programs"] });
    },
  });

  const pendingRequests = requests?.filter((r: any) => r.status === "pending") || [];
  const totalCommissionPaid = sales?.reduce((s: number, v: any) => s + (v.commission_cents || 0), 0) || 0;
  const totalSalesCount = sales?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Programa de Afiliados</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Gerencie afiliados e comissões dos seus produtos</p>
        </div>
        {pendingRequests.length > 0 && (
          <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
            {pendingRequests.length} pendente(s)
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card/80 border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <Share2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Programas Ativos</p>
              <p className="text-lg font-bold text-foreground">{programs?.filter((p: any) => p.is_active).length || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-cyan-500" />
            <div>
              <p className="text-xs text-muted-foreground">Vendas via Afiliado</p>
              <p className="text-lg font-bold text-foreground">{totalSalesCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/80 border-border/40">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-xs text-muted-foreground">Comissões Pagas</p>
              <p className="text-lg font-bold text-foreground">R$ {(totalCommissionPaid / 100).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="programs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="programs">Meus Programas</TabsTrigger>
          <TabsTrigger value="requests">
            Solicitações
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center rounded-full">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
        </TabsList>

        {/* Programas */}
        <TabsContent value="programs" className="space-y-3">
          {programs?.map((prog: any) => (
            <Card key={prog.id} className="bg-card/80 border-border/40">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{prog.products?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Comissão: {prog.commission_percent}% • Cookie: {prog.cookie_days}d
                    • {prog.auto_approve ? "Auto-aprovação" : "Aprovação manual"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={prog.is_active}
                    onCheckedChange={(checked) => toggleProgram.mutate({ id: prog.id, is_active: checked })}
                  />
                  <span className="text-xs text-muted-foreground">{prog.is_active ? "Ativo" : "Inativo"}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {productsWithoutProgram && productsWithoutProgram.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Produtos sem programa</h3>
              {productsWithoutProgram.map((product: any) => (
                <Card key={product.id} className="bg-card/60 border-dashed border-primary/30 mb-2">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm text-foreground">{product.name}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createProgram.mutate(product.id)}
                      disabled={createProgram.isPending}
                    >
                      {createProgram.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                        <><Percent className="h-3.5 w-3.5 mr-1" /> Criar Programa</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Solicitações */}
        <TabsContent value="requests" className="space-y-3">
          {(!requests || requests.length === 0) ? (
            <Card className="bg-card/60 border-dashed">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-primary/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma solicitação recebida</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((req: any) => {
              const profile = req.profiles;
              return (
                <Card key={req.id} className="bg-card/80 border-border/40">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {profile?.full_name || profile?.email || "Afiliado"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {req.affiliate_programs?.products?.name} • {new Date(req.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {req.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => reviewRequest.mutate({ id: req.id, status: "approved" })}
                          disabled={reviewRequest.isPending}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => reviewRequest.mutate({ id: req.id, status: "rejected" })}
                          disabled={reviewRequest.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                        </Button>
                      </div>
                    ) : (
                      <Badge variant={req.status === "approved" ? "default" : "destructive"} className="text-xs">
                        {req.status === "approved" ? "Aprovado" : "Rejeitado"}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Vendas */}
        <TabsContent value="sales" className="space-y-3">
          {(!sales || sales.length === 0) ? (
            <Card className="bg-card/60 border-dashed">
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-12 w-12 text-primary/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma venda via afiliado ainda</p>
              </CardContent>
            </Card>
          ) : (
            sales.map((sale: any) => (
              <Card key={sale.id} className="bg-card/80 border-border/40">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{sale.products?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.created_at).toLocaleDateString("pt-BR")} • via {sale.tracking_type === "coupon" ? "Cupom" : "Link"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">R$ {((sale.amount_cents || 0) / 100).toFixed(2)}</p>
                    <p className="text-xs text-emerald-500">Comissão: R$ {((sale.commission_cents || 0) / 100).toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
