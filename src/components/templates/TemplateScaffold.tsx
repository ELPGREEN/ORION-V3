import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Lock, Coins, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";

interface TemplateScaffoldProps {
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
  title: string;
  description: string;
  children: ReactNode;
  isLoading?: boolean;
  onGenerate: (e: React.FormEvent) => void;
  tokenCost: number;
}

export function useTemplateGate(tokenCost: number) {
  const { user } = useAuth();
  const { isPremium, tokensRemaining } = useUserPlan();

  const isOwner = user?.email === 'info@elpgreen.com';

  return {
    user,
    isPremium,
    isOwner,
    tokensRemaining: tokensRemaining || 0
  };
}

export function TemplateScaffold({
  seoTitle,
  seoDescription,
  canonical,
  badgeText,
  badgeIcon,
  title,
  description,
  children,
  isLoading,
  onGenerate,
  tokenCost
}: TemplateScaffoldProps) {
  const navigate = useNavigate();
  const { isPremium, isOwner, tokensRemaining } = useTemplateGate(tokenCost);

  const canAccess = isPremium || isOwner || (tokensRemaining >= tokenCost);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
      />
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <Badge variant="outline" className="mb-2 gap-1 px-3 py-1">
                {badgeIcon} {badgeText}
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
                {title} <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </h1>
              <p className="text-muted-foreground">{description}</p>
            </div>

            <div className="flex items-center gap-4 bg-muted/50 p-3 rounded-lg border">
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground uppercase">Custo de Geração</p>
                <div className="flex items-center justify-end gap-1 font-bold text-primary">
                  <Coins className="h-4 w-4" /> {tokenCost} tokens
                </div>
              </div>
              <div className="w-[1px] h-8 bg-border" />
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground uppercase">Seu Saldo</p>
                <p className="font-bold">{isOwner ? "∞" : tokensRemaining} tokens</p>
              </div>
            </div>
          </div>
        </div>

        {!canAccess && !isOwner && (
          <Card className="p-12 text-center mb-8 border-dashed border-2 border-primary/20 bg-primary/5">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
              <p className="text-muted-foreground mb-6">
                Este template requer uma assinatura **Pro** ou saldo de tokens suficiente para ser utilizado.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg">
                  <Link to="/loja">Ver Planos de Assinatura</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/contato">Falar com Suporte</Link>
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 md:p-8">
          <form onSubmit={onGenerate} className="space-y-6 mb-8">
            {children}

            <Button
              type="submit"
              size="lg"
              className="w-full text-lg h-14"
              disabled={isLoading || (!canAccess && !isOwner)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Orion está construindo sua estratégia...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Gerar Estratégia Completa
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {isOwner ? "Acesso de proprietário: uso ilimitado." : "O custo será debitado apenas após a geração bem-sucedida."}
            </p>
          </form>
        </Card>
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
