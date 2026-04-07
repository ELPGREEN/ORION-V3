import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Share2, DollarSign, TrendingUp, MousePointer, ArrowRight, Eye,
  ShoppingBag, Brain, Crown, Globe, Link2, Copy,
  Clock, Search, Loader2, Sparkles, BarChart3, CalendarDays, Target, Lightbulb,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

export default function AfiliadoDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [copyLoading, setCopyLoading] = useState<string | null>(null);
  const [orionLoading, setOrionLoading] = useState<string | null>(null);
  const [orionResult, setOrionResult] = useState<string | null>(null);

  const callOrion = async (action: string, extra: Record<string, string> = {}) => {
    setOrionLoading(action);
    setOrionResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("orion-produtor-ai", {
        body: { action, ...extra },
      });
      if (error) throw error;
      setOrionResult(data.result);
      toast.success("Orion respondeu!");
    } catch {
      toast.error("Erro ao consultar Orion");
    } finally {
      setOrionLoading(null);
    }
  };

  const generateCopy = async (product: any) => {
    setCopyLoading(product.id);
    try {
      const { data, error } = await supabase.functions.invoke("orion-produtor-ai", {
        body: {
          action: "generate_copy",
          product_title: product.title || product.name,
          product_description: product.description,
          context: `R$ ${((product.price_cents || 0) / 100).toFixed(2)}`,
        },
      });
      if (error) throw error;
      toast.info(data.result, { duration: 15000 });
    } catch {
      toast.error("Erro ao gerar copy");
    } finally {
      setCopyLoading(null);
    }
  };

  const { data: myRequests } = useQuery({
    queryKey: ["affiliate-requests", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_requests")
        .select("*, affiliate_programs(*, products(*))")
        .eq("affiliate_user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: programs } = useQuery({
    queryKey: ["affiliate-programs-marketplace"],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_programs")
        .select("*, products(*)")
        .eq("is_active", true);
      return data || [];
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["affiliate-sales", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_sales")
        .select("*, products(*)")
        .eq("affiliate_user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: myLinks } = useQuery({
    queryKey: ["affiliate-links-mine", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_links")
        .select("*, products(*)")
        .eq("affiliate_user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const requestMutation = useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase.from("affiliate_requests").insert({
        program_id: programId,
        affiliate_user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada!");
      qc.invalidateQueries({ queryKey: ["affiliate-requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approvedRequests = myRequests?.filter((r: any) => r.status === "approved") || [];
  const pendingRequests = myRequests?.filter((r: any) => r.status === "pending") || [];
  const requestedProgramIds = new Set(myRequests?.map((r: any) => r.program_id) || []);

  const totalCommission = sales?.reduce((s: number, v: any) => s + (v.commission_cents || 0), 0) || 0;
  const totalClicks = myLinks?.reduce((s: number, l: any) => s + (l.clicks || 0), 0) || 0;
  const totalConversions = myLinks?.reduce((s: number, l: any) => s + (l.conversions || 0), 0) || 0;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0";

  const filteredPrograms = programs?.filter((p: any) => {
    if (!search) return true;
    return (p.products?.name?.toLowerCase() || "").includes(search.toLowerCase());
  }) || [];

  // Analytics data
  const salesByProduct = useMemo(() => {
    if (!sales || sales.length === 0) return [];
    const map: Record<string, { name: string; vendas: number; comissao: number }> = {};
    sales.forEach((s: any) => {
      const name = s.products?.name || "Desconhecido";
      if (!map[name]) map[name] = { name, vendas: 0, comissao: 0 };
      map[name].vendas++;
      map[name].comissao += (s.commission_cents || 0) / 100;
    });
    return Object.values(map).sort((a, b) => b.vendas - a.vendas);
  }, [sales]);

  const salesByDay = useMemo(() => {
    if (!sales || sales.length === 0) return [];
    const map: Record<string, { dia: string; vendas: number; receita: number }> = {};
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    sales.filter((s: any) => new Date(s.created_at) > last30).forEach((s: any) => {
      const dia = new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (!map[dia]) map[dia] = { dia, vendas: 0, receita: 0 };
      map[dia].vendas++;
      map[dia].receita += (s.commission_cents || 0) / 100;
    });
    return Object.values(map);
  }, [sales]);

  const stats = [
    { label: "Produtos Ativos", value: approvedRequests.length, icon: ShoppingBag, color: "text-primary" },
    { label: "Comissões", value: `R$ ${(totalCommission / 100).toFixed(2)}`, icon: DollarSign, color: "text-emerald-500" },
    { label: "Cliques", value: totalClicks, icon: MousePointer, color: "text-cyan-500" },
    { label: "Conversão", value: `${conversionRate}%`, icon: TrendingUp, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Painel do Afiliado</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Promova produtos e ganhe comissões</p>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary">
          <Share2 className="h-3 w-3 mr-1" />Afiliado
        </Badge>
      </div>

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

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="products">Meus Produtos</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="links">Links & Cupons</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1">
            <BarChart3 className="h-3 w-3" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="orion" className="gap-1">
            <Brain className="h-3 w-3" /> Orion IA
          </TabsTrigger>
        </TabsList>

        {/* ── Products Tab ── */}
        <TabsContent value="products" className="space-y-3">
          {approvedRequests.length === 0 ? (
            <Card className="bg-card/60 border-dashed border-primary/30">
              <CardContent className="p-8 text-center">
                <ShoppingBag className="h-12 w-12 text-primary/40 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Nenhum produto ainda</h3>
                <p className="text-sm text-muted-foreground">Explore o Marketplace e solicite afiliação</p>
              </CardContent>
            </Card>
          ) : (
            approvedRequests.map((req: any) => {
              const product = req.affiliate_programs?.products;
              const program = req.affiliate_programs;
              const link = myLinks?.find((l: any) => l.product_id === product?.id);
              return (
                <Card key={req.id} className="bg-card/80 border-border/40">
                  <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ShoppingBag className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{product?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Comissão: {program?.commission_percent}% • R$ {((product?.price_cents || 0) / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {link && (
                        <Button variant="outline" size="sm" onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/vitrine/${user?.id}?ref=${link.hash}`);
                          toast.success("Link copiado!");
                        }}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Link
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => generateCopy(product)} disabled={!!copyLoading} className="gap-1 text-xs">
                        {copyLoading === product?.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Copy IA
                      </Button>
                      <Badge variant="secondary" className="text-xs">{link?.clicks || 0} cliques</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
          {pendingRequests.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Aguardando Aprovação</h3>
              {pendingRequests.map((req: any) => (
                <Card key={req.id} className="bg-card/60 border-amber-500/20 mb-2">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-foreground">{req.affiliate_programs?.products?.name}</span>
                    </div>
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">Pendente</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Marketplace Tab ── */}
        <TabsContent value="marketplace" className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar produtos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          {filteredPrograms.map((prog: any) => {
            const alreadyRequested = requestedProgramIds.has(prog.id);
            return (
              <Card key={prog.id} className="bg-card/80 border-border/40">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{prog.products?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Comissão: {prog.commission_percent}% • Cookie: {prog.cookie_days}d
                        {prog.auto_approve && " • Auto-aprovação"}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" disabled={alreadyRequested || requestMutation.isPending}
                    variant={alreadyRequested ? "secondary" : "default"}
                    onClick={() => requestMutation.mutate(prog.id)}>
                    {alreadyRequested ? "Solicitado" : requestMutation.isPending ?
                      <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Enviando</> :
                      <><Link2 className="h-3.5 w-3.5 mr-1" />Afiliar-se</>}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Sales Tab ── */}
        <TabsContent value="sales" className="space-y-3">
          {(!sales || sales.length === 0) ? (
            <Card className="bg-card/60 border-dashed">
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-12 w-12 text-primary/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma venda registrada ainda</p>
              </CardContent>
            </Card>
          ) : sales.map((sale: any) => (
            <Card key={sale.id} className="bg-card/80 border-border/40">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{sale.products?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sale.created_at).toLocaleDateString("pt-BR")} • via {sale.tracking_type === "coupon" ? "Cupom" : "Link"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-500">
                  R$ {((sale.commission_cents || 0) / 100).toFixed(2)}
                </span>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── Links Tab ── */}
        <TabsContent value="links" className="space-y-3">
          {myLinks?.map((link: any) => (
            <Card key={link.id} className="bg-card/80 border-border/40">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-foreground">{link.products?.name}</p>
                  <Button variant="outline" size="sm" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/vitrine/${user?.id}?ref=${link.hash}`);
                    toast.success("Link copiado!");
                  }}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                  </Button>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MousePointer className="h-3 w-3" />{link.clicks} cliques</span>
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{link.conversions} conversões</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />
                    {link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : 0}% taxa
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ── Analytics Tab ── */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Sales by Product */}
            <Card className="bg-card/80 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Vendas por Produto
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesByProduct.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sem dados ainda</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={salesByProduct}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Sales Trend */}
            <Card className="bg-card/80 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" /> Tendência (30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {salesByDay.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sem dados ainda</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="receita" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Conversion funnel */}
          <Card className="bg-card/80 border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cyan-500" /> Funil de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-foreground">{totalClicks}</p>
                  <p className="text-xs text-muted-foreground">Cliques</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 text-center p-4 rounded-lg bg-muted/30">
                  <p className="text-2xl font-bold text-foreground">{totalConversions}</p>
                  <p className="text-xs text-muted-foreground">Conversões</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 text-center p-4 rounded-lg bg-primary/10">
                  <p className="text-2xl font-bold text-primary">{conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">Taxa</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Orion IA Tab ── */}
        <TabsContent value="orion" className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="bg-card/60 border-border/30 hover:border-primary/40 transition-all cursor-pointer group"
              onClick={() => callOrion("affiliate_strategy", {
                context: `Produtos: ${approvedRequests.length}. Cliques totais: ${totalClicks}. Conversões: ${totalConversions}. Taxa: ${conversionRate}%. Comissão total: R$ ${(totalCommission / 100).toFixed(2)}`
              })}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Estratégia de Vendas</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Orion analisa seus dados e sugere ações</p>
                </div>
                {orionLoading === "affiliate_strategy" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/30 hover:border-primary/40 transition-all cursor-pointer group"
              onClick={() => callOrion("best_products", {
                context: programs?.map((p: any) => `${p.products?.name}: ${p.commission_percent}% comissão, R$ ${((p.products?.price_cents || 0) / 100).toFixed(2)}`).join("\n") || "Sem dados"
              })}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                  <Lightbulb className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Melhores Produtos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Recomendações do marketplace</p>
                </div>
                {orionLoading === "best_products" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/30 hover:border-primary/40 transition-all cursor-pointer group"
              onClick={() => {
                const firstProduct = approvedRequests[0]?.affiliate_programs?.products;
                callOrion("social_calendar", {
                  product_title: firstProduct?.name || "Produto digital",
                  product_description: firstProduct?.description || "",
                  context: `Afiliado com ${approvedRequests.length} produtos ativos`
                });
              }}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors">
                  <CalendarDays className="h-4 w-4 text-cyan-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Calendário Social</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Plano de postagens 7 dias</p>
                </div>
                {orionLoading === "social_calendar" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              </CardContent>
            </Card>
          </div>

          {/* Orion Result */}
          {orionResult && (
            <Card className="bg-card/80 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" /> Resposta do Orion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                  {orionResult}
                </div>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => {
                  navigator.clipboard.writeText(orionResult);
                  toast.success("Copiado!");
                }}>
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: "Vitrine Pública", icon: Globe, path: `/vitrine/${user?.id}`, desc: "Sua loja de afiliado" },
          { label: "Orion IA", icon: Brain, path: "/consulta", desc: "Assistente para vendas" },
          { label: "Meu Plano", icon: Crown, path: "/dashboard/configuracoes", desc: "Ver limites" },
        ].map((tool) => (
          <Card key={tool.label} className="bg-card/60 border-border/30 hover:border-primary/40 transition-all cursor-pointer group"
            onClick={() => navigate(tool.path)}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <tool.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{tool.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tool.desc}</p>
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
