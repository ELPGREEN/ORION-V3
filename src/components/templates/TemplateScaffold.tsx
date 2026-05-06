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
      </main>
      <Footer />
    </div>
  );
}
