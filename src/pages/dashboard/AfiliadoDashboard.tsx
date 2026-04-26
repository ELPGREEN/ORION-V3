import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp,
  Users,
  DollarSign,
  Share2,
  BarChart3,
  Brain,
  Globe,
  Crown,
  ArrowRight,
  Target,
  Zap,
  Activity,
  MousePointer2,
  PieChart,
  ShoppingBag,
  Copy,
  Loader2,
  Lightbulb,
  CalendarDays
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState } from "react";
import { ThemedHeader, ThemedStatCard, ThemedSection, StatusLED } from "@/components/dashboard/DashboardTheme";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from "recharts";

export default function AfiliadoDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orionLoading, setOrionLoading] = useState<string | null>(null);
  const [orionResult, setOrionResult] = useState<string | null>(null);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  const { data: approvedRequests } = useQuery({
    queryKey: ["afiliado-requests", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_requests")
        .select(`
          *,
          affiliate_programs (
            *,
            products (*)
          )
        `)
        .eq("affiliate_user_id", user?.id)
        .eq("status", "approved");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["afiliado-stats", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("affiliate_links").select("*").eq("affiliate_user_id", user?.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: sales } = useQuery({
    queryKey: ["afiliado-sales", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("affiliate_sales").select("*").eq("affiliate_user_id", user?.id);
      return data || [];
    },
    enabled: !!user,
  });

  const totalClicks = stats?.reduce((sum, s) => sum + (s.clicks || 0), 0) || 0;
  const totalConversions = stats?.reduce((sum, s) => sum + (s.conversions || 0), 0) || 0;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0;
  const totalCommission = sales?.reduce((sum, s) => sum + (s.commission_cents || 0), 0) || 0;

  const statCards = [
    { label: "Receita Acumulada", value: `R$ ${(totalCommission / 100).toFixed(2)}`, icon: DollarSign, highlight: true },
    { label: "Cliques em Links", value: totalClicks, icon: MousePointer2 },
    { label: "Conversões", value: totalConversions, icon: Target },
    { label: "Taxa de Conversão", value: `${conversionRate}%`, icon: TrendingUp },
    { label: "Programas Ativos", value: approvedRequests?.length || 0, icon: ShoppingBag },
  ];

  const callOrion = async (action: string, body: any) => {
    setOrionLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("orion-intelligence", {
        body: { action, ...body }
      });
      if (error) throw error;
      setOrionResult(data.result);
    } catch (err: any) {
      toast.error("Erro ao processar inteligência Orion");
    } finally {
      setOrionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <ThemedHeader
        role="afiliado"
        greeting={greeting}
        userName={user?.user_metadata?.nome || "Afiliado"}
        subtitle="Infraestrutura de Growth & Inteligência de Performance"
        icon={Zap}
        badgeLabel="AFILIADO"
      >
        <div className="flex items-center gap-3">
          <StatusLED status="online" label="TRAFFIC ANALYTICS" />
          <StatusLED status="online" label="CONVERSION ENGINE" />
        </div>
      </ThemedHeader>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <ThemedStatCard
            key={s.label}
            role="afiliado"
            label={s.label}
            value={s.value}
            icon={s.icon}
            highlight={s.highlight}
          />
        ))}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted/50 border border-border/40 p-1">
          <TabsTrigger value="overview" className="text-[10px] uppercase tracking-widest px-6">Overview</TabsTrigger>
          <TabsTrigger value="analytics" className="text-[10px] uppercase tracking-widest px-6">Intelligence</TabsTrigger>
          <TabsTrigger value="orion" className="text-[10px] uppercase tracking-widest px-6">Orion IA</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <ThemedSection role="afiliado" title="Seus Endpoints de Venda" icon={Share2}>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats?.map((link) => (
                <Card key={link.id} className="bg-card/80 border-border/40 hover:border-primary/40 transition-all group">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-tighter truncate opacity-70">Program ID: {link.id.slice(0, 8)}</p>
                      <Badge className="text-[9px] h-4 uppercase">{link.conversions} Sales</Badge>
                    </div>
                    <div className="p-2 rounded bg-muted/30 border border-border/50 font-mono text-[10px] truncate group-hover:text-primary transition-colors">
                      {window.location.origin}/afiliado/{link.hash}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-[10px] uppercase tracking-widest h-8 gap-2"
                      onClick={() => {
                        const url = `${window.location.origin}/afiliado/${link.hash}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Endpoint copiado.");
                      }}
                    >
                      <Copy className="h-3 w-3" /> Copiar Link
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ThemedSection>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
             <ThemedSection role="afiliado" title="Performance de Conversão" icon={PieChart}>
                <Card className="bg-card/80 border-border/40 h-[300px] flex items-center justify-center">
                  <div className="text-center opacity-40">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-xs uppercase tracking-widest">Telemetry Data Pending</p>
                  </div>
                </Card>
             </ThemedSection>
             <ThemedSection role="afiliado" title="Funil de Vendas Enterprise" icon={Target}>
                <div className="bg-card/80 border border-border/40 rounded-lg p-6 h-[300px] flex flex-col justify-center gap-4">
                   {[
                     { label: "Impressões", value: totalClicks * 12, color: "bg-blue-500/20 text-blue-400" },
                     { label: "Cliques Únicos", value: totalClicks, color: "bg-cyan-500/20 text-cyan-400" },
                     { label: "Checkouts Iniciados", value: Math.ceil(totalClicks * 0.15), color: "bg-emerald-500/20 text-emerald-400" },
                     { label: "Conversões Pagas", value: totalConversions, color: "bg-primary/20 text-primary" },
                   ].map((step, idx) => (
                     <div key={step.label} className="flex items-center gap-4">
                        <div className={`h-8 w-8 rounded flex items-center justify-center font-bold text-xs ${step.color}`}>{idx + 1}</div>
                        <div className="flex-1 border-b border-border/30 pb-2">
                           <div className="flex justify-between items-end">
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{step.label}</span>
                              <span className="text-sm font-mono font-bold">{step.value}</span>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </ThemedSection>
          </div>
        </TabsContent>

        <TabsContent value="orion" className="mt-6 space-y-6">
           <div className="grid sm:grid-cols-3 gap-3">
              {[
                { id: "affiliate_strategy", label: "Estratégia de Escala", desc: "IA analisa ROI e sugere otimizações", icon: Target },
                { id: "best_products", label: "Análise de Portfólio", desc: "Matching de produtos por lucratividade", icon: Lightbulb },
                { id: "social_calendar", label: "Automação de Conteúdo", desc: "Scripts de venda e réguas de growth", icon: CalendarDays },
              ].map(opt => (
                <Button
                  key={opt.id}
                  variant="outline"
                  className="flex-col h-auto py-5 gap-2 border-border/40 hover:border-primary/40 group"
                  onClick={() => callOrion(opt.id, { context: `Afiliado ID: ${user?.id}` })}
                >
                  <div className="p-2.5 rounded bg-primary/5 group-hover:bg-primary/10 transition-colors">
                    <opt.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-bold uppercase tracking-tight">{opt.label}</p>
                    <p className="text-[9px] text-muted-foreground opacity-70 mt-0.5">{opt.desc}</p>
                  </div>
                  {orionLoading === opt.id && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </Button>
              ))}
           </div>

           {orionResult && (
             <Card className="bg-card/80 border-primary/20 animate-in fade-in slide-in-from-bottom-2">
                <CardHeader className="pb-2 border-b border-border/30">
                  <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
                    <Brain className="h-3.5 w-3.5 text-primary" /> Relatório Orion Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                   <div className="text-sm text-foreground whitespace-pre-line leading-relaxed font-sans">
                      {orionResult}
                   </div>
                   <Button variant="outline" size="sm" className="mt-6 text-[10px] uppercase tracking-widest gap-2" onClick={() => {
                     navigator.clipboard.writeText(orionResult);
                     toast.success("Intelligence data copied.");
                   }}>
                      <Copy className="h-3.5 w-3.5" /> Exportar Dados
                   </Button>
                </CardContent>
             </Card>
           )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
