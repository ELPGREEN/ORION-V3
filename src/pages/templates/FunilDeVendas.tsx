import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Rocket, Sparkles, Target, Zap, CheckCircle2, Lock, Coins } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";

const FUNNEL_TOKEN_COST = 100;

interface FunnelStage {
  name: string;
  goal: string;
  channel: string;
  copy_headline: string;
  copy_body: string;
  cta: string;
  metric: string;
}

interface FunnelAutomation {
  trigger: string;
  action: string;
  tool: string;
}

interface Funnel {
  strategy: {
    avatar: string;
    big_idea: string;
    objection_handling: string[];
  };
  stages: FunnelStage[];
  automations: FunnelAutomation[];
  first_action: string;
}

export default function FunilDeVendasTemplate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, isOwner, tokensRemaining, hasOrionAccess, loading: planLoading } = useUserPlan();

  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [price, setPrice] = useState("");
  const [goal, setGoal] = useState("");
  const [channel, setChannel] = useState("");
  const [loading, setLoading] = useState(false);
  const [funnel, setFunnel] = useState<Funnel | null>(null);

  // Gate: precisa estar logado E (premium OU ter tokens free)
  const canGenerate = !!user && (isOwner || isPremium || tokensRemaining >= FUNNEL_TOKEN_COST);
  const showLoginGate = !planLoading && !user;
  const showUpgradeGate = !planLoading && !!user && !canGenerate;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!product.trim()) {
      toast.error("Descreva o produto/oferta primeiro");
      return;
    }
    if (!canGenerate) {
      toast.error("Você precisa de um plano Pro ou tokens free para gerar.");
      return;
    }
    setLoading(true);
    setFunnel(null);
    try {
      const { data, error } = await supabase.functions.invoke("funnel-builder", {
        body: { product, audience, price, goal, channel },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setFunnel(data.funnel);

      // Decrementa tokens free (premium/owner não decrementa)
      if (!isPremium && !isOwner && user) {
        const newBalance = Math.max(0, tokensRemaining - FUNNEL_TOKEN_COST);
        await supabase
          .from("user_plans")
          .upsert(
            { user_id: user.id, ai_tokens_remaining: newBalance, plan_type: "free" },
            { onConflict: "user_id" },
          );
      }

      toast.success("Funil entregue pelo Orion ✨");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Falha ao gerar funil");
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Funil de Vendas com IA | Orion entrega seu funil pronto"
        description="Diga seu produto. Orion devolve avatar, copy, etapas, automações e a primeira ação executável — em segundos."
        canonical="https://www.iasofthub.com/templates/funil-de-vendas"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Funil de Vendas com IA — Orion",
          description: "Gere funil completo (avatar, copy, etapas, automações) com IA em segundos.",
          url: "https://www.iasofthub.com/templates/funil-de-vendas",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          provider: { "@type": "Organization", name: "Orion Intelligence Platform", url: "https://www.iasofthub.com" },
        }}
      />
      <Header />

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 max-w-5xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>

        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Sparkles className="h-3 w-3 mr-1" /> Template Vertical · Digital
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground mb-3 tracking-wide">
            Funil de vendas <span className="text-primary">pronto em 1 minuto</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Descreva sua oferta. Orion entrega avatar, big idea, etapas com copy real, automações e a primeira ação executável.
          </p>
        </div>

        {/* Plan / token status */}
        {!planLoading && (
          <div className="mb-6 flex items-center justify-center">
            {isOwner || isPremium ? (
              <Badge variant="outline" className="border-primary/40 text-primary px-3 py-1.5 text-xs">
                <Sparkles className="h-3 w-3 mr-1.5" /> Plano Pro · gerações ilimitadas
              </Badge>
            ) : user ? (
              <Badge variant="outline" className="border-border/60 text-muted-foreground px-3 py-1.5 text-xs">
                <Coins className="h-3 w-3 mr-1.5 text-primary" />
                {tokensRemaining} tokens free · {FUNNEL_TOKEN_COST} por funil
              </Badge>
            ) : null}
          </div>
        )}

        {showLoginGate && (
          <Card className="mb-8 p-6 border-primary/30 bg-primary/5 text-center">
            <Lock className="h-6 w-6 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Entre para gerar seu funil</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cadastro grátis · 1.000 tokens iniciais · sem cartão.
            </p>
            <Button onClick={() => navigate("/cadastro")} className="btn-gold">
              Criar conta grátis
            </Button>
          </Card>
        )}

        {showUpgradeGate && (
          <Card className="mb-8 p-6 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 text-center">
            <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Tokens insuficientes</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cada funil custa {FUNNEL_TOKEN_COST} tokens. Faça upgrade pro plano Pro e gere quantos quiser.
            </p>
            <Button onClick={() => navigate("/plataforma")} className="btn-gold">
              Ver planos Pro
            </Button>
          </Card>
        )}

        <form onSubmit={handleGenerate} className="grid gap-4 mb-10">
          <Card className="p-6 border-primary/20 bg-card/40">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="product" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Produto / Oferta *
                </Label>
                <Textarea
                  id="product"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  placeholder="Ex: Mentoria 1:1 em tráfego pago para infoprodutores iniciantes, 8 semanas, com encontros semanais e suporte no WhatsApp."
                  className="mt-1.5 min-h-[88px]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="audience" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Público-alvo
                  </Label>
                  <Input
                    id="audience"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Ex: criadores 25-40 anos faturando até 10k/mês"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="price" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Ticket / Preço
                  </Label>
                  <Input
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Ex: R$ 1.997 ou 12x R$ 197"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="goal" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Objetivo principal
                  </Label>
                  <Input
                    id="goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Ex: 30 vendas em 60 dias"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="channel" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Canal preferido
                  </Label>
                  <Input
                    id="channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    placeholder="Ex: Instagram + WhatsApp"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Button type="submit" size="lg" className="btn-gold mx-auto px-10" disabled={loading || !canGenerate}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Orion está montando seu funil...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" /> Gerar funil agora
              </>
            )}
          </Button>
        </form>

        {funnel && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-6 border-primary/30 bg-primary/5">
              <div className="flex items-start gap-3 mb-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-1">Estratégia</h2>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Avatar</div>
                  <p className="text-foreground/90">{funnel.strategy.avatar}</p>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Big Idea</div>
                  <p className="text-foreground/90">{funnel.strategy.big_idea}</p>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Objeções e quebras</div>
                  <ul className="space-y-1.5">
                    {funnel.strategy.objection_handling.map((o, i) => (
                      <li key={i} className="flex gap-2 text-foreground/90">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" /> {o}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" /> Etapas do funil
              </h2>
              <div className="grid gap-3">
                {funnel.stages.map((stage, i) => (
                  <Card key={i} className="p-5 border-border/40 hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">{stage.name}</div>
                        <div className="text-xs text-muted-foreground">{stage.channel}</div>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Objetivo</div>
                        <p className="text-foreground/80">{stage.goal}</p>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">KPI</div>
                        <p className="text-foreground/80">{stage.metric}</p>
                      </div>
                      <div className="sm:col-span-2 p-3 bg-muted/30 border border-border/30 rounded">
                        <div className="text-xs uppercase tracking-wider text-primary mb-1">Headline</div>
                        <p className="font-medium text-foreground mb-2">{stage.copy_headline}</p>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Copy</div>
                        <p className="text-foreground/80 mb-2 whitespace-pre-line">{stage.copy_body}</p>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">CTA</div>
                        <p className="text-primary font-medium">→ {stage.cta}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {funnel.automations?.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Automações</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {funnel.automations.map((a, i) => (
                    <Card key={i} className="p-4 border-border/40 text-sm">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Quando</div>
                      <p className="text-foreground/90 mb-2">{a.trigger}</p>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Faça</div>
                      <p className="text-foreground/90 mb-2">{a.action}</p>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Em</div>
                      <p className="text-primary">{a.tool}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Card className="p-6 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="flex items-start gap-3">
                <Rocket className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="text-xs uppercase tracking-wider text-primary mb-1">Comece agora</div>
                  <p className="text-foreground font-medium">{funnel.first_action}</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
