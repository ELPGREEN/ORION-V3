import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, Crown, Building2, Rocket, Check, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const PLANS = [
  {
    type: "starter",
    label: "Starter",
    icon: Zap,
    price: "Grátis",
    priceId: null,
    tokens: 1000,
    features: [
      { name: "Chat IA básico", limit: "1000 tokens trial", available: true },
      { name: "Documentos", limit: "3/mês", available: true },
      { name: "1 usuário", limit: "", available: true },
      { name: "Pesquisa IA avançada", limit: "", available: false },
      { name: "CRM de clientes", limit: "", available: false },
      { name: "Loja digital / Afiliados", limit: "", available: false },
      { name: "Assinatura digital", limit: "", available: false },
    ],
  },
  {
    type: "professional",
    label: "Professional",
    icon: Rocket,
    price: "R$ 97/mês",
    priceId: "STRIPE_PRICE_PROFESSIONAL",
    tokens: 100,
    features: [
      { name: "Chat IA avançado", limit: "100 msgs/mês", available: true },
      { name: "Documentos ilimitados", limit: "", available: true },
      { name: "Pesquisa IA / Jurisprudência", limit: "50/mês", available: true },
      { name: "Geração de peças / conteúdo", limit: "20/mês", available: true },
      { name: "Loja digital básica", limit: "5 produtos", available: true },
      { name: "3 usuários", limit: "", available: true },
      { name: "CRM completo", limit: "", available: false },
      { name: "API e Webhooks", limit: "", available: false },
    ],
  },
  {
    type: "business",
    label: "Business",
    icon: Building2,
    price: "R$ 297/mês",
    priceId: "STRIPE_PRICE_BUSINESS",
    tokens: 500,
    popular: true,
    features: [
      { name: "Chat IA ilimitado", limit: "500 msgs/mês", available: true },
      { name: "CRM completo + Pipeline", limit: "", available: true },
      { name: "Assinatura digital", limit: "50/mês", available: true },
      { name: "Loja + Afiliados", limit: "Ilimitado", available: true },
      { name: "Multi-usuários", limit: "10 usuários", available: true },
      { name: "Gestão de processos", limit: "", available: true },
      { name: "Dashboard métricas", limit: "", available: true },
      { name: "Rede Neural completa", limit: "", available: false },
    ],
  },
  {
    type: "enterprise",
    label: "Enterprise",
    icon: Crown,
    price: "R$ 497/mês",
    priceId: "STRIPE_PRICE_ENTERPRISE",
    tokens: 9999,
    features: [
      { name: "Tokens IA ilimitados", limit: "", available: true },
      { name: "Rede Neural completa", limit: "", available: true },
      { name: "Dashboard métricas avançado", limit: "", available: true },
      { name: "API + Webhooks", limit: "", available: true },
      { name: "Usuários ilimitados", limit: "", available: true },
      { name: "Deals internacionais", limit: "", available: true },
      { name: "Onboarding dedicado", limit: "", available: true },
      { name: "SLA garantido", limit: "", available: true },
    ],
  },
];

export default function PlanoUsuario() {
  const { user } = useAuth();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Detect successful Stripe payment return
  useEffect(() => {
    const success = searchParams.get("success");
    const planType = searchParams.get("plan");
    if (success === "true" && planType && user) {
      // Invalidate plan cache to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ["user-plan-gate", user.id] });
      queryClient.invalidateQueries({ queryKey: ["user-plan", user.id] });

      toast.success(`🚀 Pagamento confirmado! Plano ${planType} ativado.`, {
        description: "Orion será ativado agora. Iniciando configurações...",
        duration: 5000,
      });

      // Redirect to Orion onboarding after short delay
      const timer = setTimeout(() => {
        navigate("/dashboard/configurar-ia?from=payment&plan=" + planType, { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, user, navigate, queryClient]);
  const { data: plan } = useQuery({
    queryKey: ["user-plan", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_plans")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const currentPlan = plan?.plan_type || "starter";
  const currentPlanData = PLANS.find(p => p.type === currentPlan);
  const tokensTotal = currentPlanData?.tokens || 10;
  const tokensUsed = plan ? tokensTotal - plan.ai_tokens_remaining : 0;

  const handleUpgrade = async (planType: string) => {
    const selectedPlan = PLANS.find(p => p.type === planType);
    if (!selectedPlan?.priceId || !user) return;

    setUpgrading(planType);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-api", {
        body: { action: "plan_checkout", plan_type: planType, user_email: user.email },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (err: any) {
      toast.error("Erro ao iniciar checkout: " + (err.message || "Tente novamente"));
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meu Plano</h1>
        <p className="text-muted-foreground text-sm">Gerencie seu plano e tokens de IA</p>
      </div>

      {plan && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tokens de IA utilizados</span>
              <span className="text-sm text-muted-foreground">{tokensUsed} / {tokensTotal === 9999 ? "∞" : tokensTotal}</span>
            </div>
            <Progress value={tokensTotal > 0 && tokensTotal < 9999 ? (tokensUsed / tokensTotal) * 100 : 0} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.type;
          const isPopular = (p as any).popular;
          return (
            <Card key={p.type} className={`relative overflow-hidden ${isCurrent ? "border-primary/50 bg-primary/5" : isPopular ? "border-primary/30 bg-primary/3" : "bg-card/80 border-border/40"}`}>
              {isCurrent && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl font-medium">
                  Atual
                </div>
              )}
              {isPopular && !isCurrent && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-3 py-1 rounded-bl font-medium">
                  Popular
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <p.icon className={`h-5 w-5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                  <CardTitle className="text-lg">{p.label}</CardTitle>
                </div>
                <p className="text-2xl font-bold text-primary">{p.price}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{p.tokens === 9999 ? "Tokens ilimitados" : `${p.tokens} tokens/mês`}</p>
                <div className="space-y-2">
                  {p.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {f.available ? <Check className="h-3 w-3 text-green-400 flex-shrink-0" /> : <X className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />}
                      <span className={f.available ? "text-foreground" : "text-muted-foreground/50"}>{f.name}</span>
                      {f.limit && f.available && <Badge variant="outline" className="text-[10px] ml-auto flex-shrink-0">{f.limit}</Badge>}
                    </div>
                  ))}
                </div>
                {!isCurrent && p.priceId && (
                  <Button
                    className="w-full mt-4"
                    variant={isPopular ? "default" : "outline"}
                    disabled={upgrading === p.type}
                    onClick={() => handleUpgrade(p.type)}
                  >
                    {upgrading === p.type ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `Upgrade para ${p.label}`
                    )}
                  </Button>
                )}
                {!isCurrent && !p.priceId && p.type === "starter" && (
                  <p className="text-xs text-center text-muted-foreground mt-4">Plano atual gratuito</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
