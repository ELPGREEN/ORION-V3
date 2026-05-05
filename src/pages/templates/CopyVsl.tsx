import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, PenTool, Sparkles, Lock, Coins, Film, Copy } from "lucide-react";
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

const TOKEN_COST = 100;

interface SalesLetter {
  hook: string; problem: string; agitation: string; solution: string;
  proof: string; offer: string; guarantee: string; urgency: string; cta: string;
}
interface VslBlock { timestamp: string; section: string; script: string; visual: string; }
interface CopyOutput {
  big_idea: string;
  headline_options: string[];
  sales_letter: SalesLetter;
  vsl_script: VslBlock[];
  first_action: string;
}

export default function CopyVslTemplate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, isOwner, tokensRemaining, loading: planLoading } = useUserPlan();

  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [price, setPrice] = useState("");
  const [promise, setPromise] = useState("");
  const [format, setFormat] = useState("VSL + carta");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<CopyOutput | null>(null);

  const canGenerate = !!user && (isOwner || isPremium || tokensRemaining >= TOKEN_COST);
  const showLoginGate = !planLoading && !user;
  const showUpgradeGate = !planLoading && !!user && !canGenerate;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!product.trim()) return toast.error("Descreva o produto");
    if (!canGenerate) return toast.error("Plano Pro ou tokens free necessários.");
    setLoading(true); setOut(null);
    try {
      const { data, error } = await supabase.functions.invoke("copy-vsl-builder", {
        body: { product, audience, price, promise, format },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOut(data.copy);
      if (!isPremium && !isOwner && user) {
        await supabase.from("user_plans").upsert(
          { user_id: user.id, ai_tokens_remaining: Math.max(0, tokensRemaining - TOKEN_COST), plan_type: "free" },
          { onConflict: "user_id" });
      }
      toast.success("Copy entregue ✨");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar");
    } finally { setLoading(false); }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Copy VSL com IA | Carta de vendas + roteiro de vídeo pelo Orion"
        description="Descreva sua oferta. Orion entrega headlines, carta de vendas completa e roteiro de VSL pronto para gravar."
        canonical="https://www.iasofthub.com/templates/copy-vsl"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Copy + VSL com IA — Orion",
          description: "Geração de carta de vendas e roteiro de VSL com IA.",
          url: "https://www.iasofthub.com/templates/copy-vsl",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          provider: { "@type": "Organization", name: "Orion Intelligence Platform", url: "https://www.iasofthub.com" },
        }}
      />
      <Header />
      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16 max-w-5xl">
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Link>

        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
            <Sparkles className="h-3 w-3 mr-1" /> Template Vertical · Digital
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground mb-3 tracking-wide">
            Copy de vendas <span className="text-primary">+ roteiro VSL</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Descreva sua oferta. Orion devolve big idea, 5 headlines, carta de vendas completa e VSL com timestamps.
          </p>
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
                {tokensRemaining} tokens · {TOKEN_COST} por copy
              </Badge>
            ) : null}
          </div>
        )}

        {showLoginGate && (
          <Card className="mb-8 p-6 border-primary/30 bg-primary/5 text-center">
            <Lock className="h-6 w-6 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Entre para gerar sua copy</h3>
            <p className="text-sm text-muted-foreground mb-4">Cadastro grátis · 1.000 tokens · sem cartão.</p>
            <Button onClick={() => navigate("/cadastro")} className="btn-gold">Criar conta grátis</Button>
          </Card>
        )}
        {showUpgradeGate && (
          <Card className="mb-8 p-6 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 text-center">
            <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Tokens insuficientes</h3>
            <p className="text-sm text-muted-foreground mb-4">{TOKEN_COST} tokens por copy. Upgrade para gerar ilimitado.</p>
            <Button onClick={() => navigate("/plataforma")} className="btn-gold">Ver planos Pro</Button>
          </Card>
        )}

        <form onSubmit={handleGenerate} className="grid gap-4 mb-10">
          <Card className="p-6 border-primary/20 bg-card/40">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="product" className="text-xs uppercase tracking-wider text-muted-foreground">Produto / Oferta *</Label>
                <Textarea id="product" value={product} onChange={(e) => setProduct(e.target.value)}
                  placeholder="Ex: Curso de inglês fluência em 6 meses para profissionais de TI..."
                  className="mt-1.5 min-h-[88px]" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="audience" className="text-xs uppercase tracking-wider text-muted-foreground">Público-alvo</Label>
                  <Input id="audience" value={audience} onChange={(e) => setAudience(e.target.value)} className="mt-1.5"
                    placeholder="Ex: devs sênior, 28-45 anos" />
                </div>
                <div>
                  <Label htmlFor="price" className="text-xs uppercase tracking-wider text-muted-foreground">Preço</Label>
                  <Input id="price" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1.5"
                    placeholder="Ex: R$ 1.997" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="promise" className="text-xs uppercase tracking-wider text-muted-foreground">Grande promessa</Label>
                  <Input id="promise" value={promise} onChange={(e) => setPromise(e.target.value)} className="mt-1.5"
                    placeholder="Ex: Falar inglês em reuniões em 90 dias" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="format" className="text-xs uppercase tracking-wider text-muted-foreground">Formato</Label>
                  <Input id="format" value={format} onChange={(e) => setFormat(e.target.value)} className="mt-1.5" />
                </div>
              </div>
            </div>
          </Card>
          <Button type="submit" size="lg" className="btn-gold mx-auto px-10" disabled={loading || !canGenerate}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Orion escrevendo...</>
              : <><PenTool className="h-4 w-4 mr-2" /> Gerar copy + VSL</>}
          </Button>
        </form>

        {out && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-6 border-primary/30 bg-primary/5">
              <div className="text-xs uppercase tracking-wider text-primary mb-1">Big Idea</div>
              <p className="text-foreground/90">{out.big_idea}</p>
            </Card>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">5 Headlines testáveis</h2>
              <div className="grid gap-2">
                {out.headline_options.map((h, i) => (
                  <Card key={i} className="p-4 border-border/40 flex items-start justify-between gap-3">
                    <p className="text-foreground/90 text-sm flex-1">{h}</p>
                    <Button size="icon" variant="ghost" onClick={() => copyText(h)}><Copy className="h-3.5 w-3.5" /></Button>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Carta de vendas</h2>
              <Card className="p-6 border-border/40 space-y-4 text-sm">
                {(["hook","problem","agitation","solution","proof","offer","guarantee","urgency","cta"] as const).map((k) => (
                  <div key={k}>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{k}</div>
                    <p className="text-foreground/90 whitespace-pre-line">{out.sales_letter[k]}</p>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="mt-2" onClick={() => copyText(Object.values(out.sales_letter).join("\n\n"))}>
                  <Copy className="h-3 w-3 mr-1.5" /> Copiar carta inteira
                </Button>
              </Card>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                <Film className="h-4 w-4" /> Roteiro VSL
              </h2>
              <div className="grid gap-3">
                {out.vsl_script.map((b, i) => (
                  <Card key={i} className="p-4 border-border/40">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="text-xs">{b.timestamp}</Badge>
                      <span className="text-xs uppercase tracking-wider text-primary">{b.section}</span>
                    </div>
                    <p className="text-foreground/90 text-sm mb-2 whitespace-pre-line">{b.script}</p>
                    <p className="text-xs text-muted-foreground"><span className="text-primary">Visual:</span> {b.visual}</p>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="p-6 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="text-xs uppercase tracking-wider text-primary mb-1">Primeira ação</div>
              <p className="text-foreground font-medium">{out.first_action}</p>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
