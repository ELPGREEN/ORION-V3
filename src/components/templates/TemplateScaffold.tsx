import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles, Lock, Coins } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";

interface Props {
  seoTitle: string;
  seoDescription: string;
  canonical: string;
  badgeText: string;
  badgeIcon: ReactNode;
  title: ReactNode;
  subtitle: string;
  tokenCost: number;
  loading: boolean;
  canSubmit?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  ctaIcon: ReactNode;
  ctaLabel: string;
  ctaLoadingLabel: string;
  formContent: ReactNode;
  resultContent?: ReactNode;
}

export function TemplateScaffold({
  seoTitle, seoDescription, canonical, badgeText, badgeIcon,
  title, subtitle, tokenCost, loading, canSubmit = true, onSubmit,
  ctaIcon, ctaLabel, ctaLoadingLabel, formContent, resultContent,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, isOwner, tokensRemaining, loading: planLoading } = useUserPlan();

  const canGenerate = !!user && (isOwner || isPremium || tokensRemaining >= tokenCost);
  const showLoginGate = !planLoading && !user;
  const showUpgradeGate = !planLoading && !!user && !canGenerate;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={seoTitle} description={seoDescription} canonical={canonical} />
      <Header />
      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 max-w-5xl">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>

        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            {badgeIcon} <span className="ml-1">{badgeText}</span>
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground mb-3 tracking-wide">{title}</h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {!planLoading && (
          <div className="mb-6 flex items-center justify-center">
            {isOwner || isPremium ? (
              <Badge variant="outline" className="border-primary/40 text-primary px-3 py-1.5 text-xs">
                <Sparkles className="h-3 w-3 mr-1.5" /> Plano Pro · ilimitado
              </Badge>
            ) : user ? (
              <Badge variant="outline" className="border-border/60 text-muted-foreground px-3 py-1.5 text-xs">
                <Coins className="h-3 w-3 mr-1.5 text-primary" />
                {tokensRemaining} tokens · {tokenCost} por geração
              </Badge>
            ) : null}
          </div>
        )}

        {showLoginGate && (
          <Card className="mb-8 p-6 border-primary/30 bg-primary/5 text-center">
            <Lock className="h-6 w-6 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Entre para gerar</h3>
            <p className="text-sm text-muted-foreground mb-4">Cadastro grátis · 1.000 tokens · sem cartão.</p>
            <Button onClick={() => navigate("/cadastro")} className="btn-gold">Criar conta grátis</Button>
          </Card>
        )}
        {showUpgradeGate && (
          <Card className="mb-8 p-6 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 text-center">
            <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Tokens insuficientes</h3>
            <p className="text-sm text-muted-foreground mb-4">{tokenCost} tokens por geração. Upgrade para ilimitado.</p>
            <Button onClick={() => navigate("/plataforma")} className="btn-gold">Ver planos Pro</Button>
          </Card>
        )}

        <form onSubmit={onSubmit} className="grid gap-4 mb-10">
          <Card className="p-6 border-primary/20 bg-card/40">{formContent}</Card>
          <Button type="submit" size="lg" className="btn-gold mx-auto px-10" disabled={loading || !canGenerate || !canSubmit}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {ctaLoadingLabel}</>
              : <>{ctaIcon} <span className="ml-2">{ctaLabel}</span></>}
          </Button>
        </form>

        {resultContent && <div className="space-y-6 animate-fade-in">{resultContent}</div>}
      </main>
      <Footer />
    </div>
  );
}

export function useTemplateGate(tokenCost: number) {
  const { user } = useAuth();
  const { isPremium, isOwner, tokensRemaining } = useUserPlan();
  const canGenerate = !!user && (isOwner || isPremium || tokensRemaining >= tokenCost);
  return { canGenerate, user, isPremium, isOwner, tokensRemaining };
}
