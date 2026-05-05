import { useState } from "react";
import { Megaphone, Target, Search, Copy as CopyIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplateScaffold, useTemplateGate } from "@/components/templates/TemplateScaffold";

const TOKEN_COST = 150;

interface Angle { angle_name: string; target: string; hook: string; }
interface MetaAd { format: string; hook_3s: string; body: string; cta: string; visual_brief: string; }
interface GoogleAd { campaign_type: string; headlines: string[]; descriptions: string[]; keywords: string[]; }
interface Ads { angles: Angle[]; meta_ads: MetaAd[]; google_ads: GoogleAd[]; budget_split: string; metrics_to_watch: string[]; first_action: string; }

export default function TrafegoPago() {
  const { user, isPremium, isOwner, tokensRemaining } = useTemplateGate(TOKEN_COST);
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [offer, setOffer] = useState("");
  const [budget, setBudget] = useState("R$ 50/dia");
  const [platform, setPlatform] = useState("Meta + Google");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<Ads | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (product.length < 3) return toast.error("Descreva o produto");
    setLoading(true); setOut(null);
    try {
      const { data, error } = await supabase.functions.invoke("ads-builder", {
        body: { product, audience, offer, budget, platform },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOut(data.ads);
      if (!isPremium && !isOwner && user) {
        await supabase.from("user_plans").upsert(
          { user_id: user.id, ai_tokens_remaining: Math.max(0, tokensRemaining - TOKEN_COST), plan_type: "free" },
          { onConflict: "user_id" });
      }
      toast.success("Pacote de ads entregue 🎯");
    } catch (err: any) { toast.error(err?.message || "Falha"); }
    finally { setLoading(false); }
  }

  const cp = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copiado"); };

  return (
    <TemplateScaffold
      seoTitle="Tráfego pago com IA | Meta + Google Ads pelo Orion"
      seoDescription="Ângulos, criativos, headlines e palavras-chave prontos. Orion entrega o pacote completo Meta + Google."
      canonical="https://www.iasofthub.com/templates/trafego-pago"
      badgeText="Template Vertical · Digital"
      badgeIcon={<Target className="h-3 w-3 inline" />}
      title={<>Tráfego pago <span className="text-primary">pronto</span></>}
      subtitle="Ângulos, criativos Meta, headlines Google, palavras-chave e divisão de verba — entregues em segundos."
      tokenCost={TOKEN_COST}
      loading={loading}
      onSubmit={onSubmit}
      ctaIcon={<Megaphone className="h-4 w-4" />}
      ctaLabel="Gerar campanhas"
      ctaLoadingLabel="Orion criando ads..."
      formContent={
        <div className="grid gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Produto *</Label>
            <Textarea value={product} onChange={(e) => setProduct(e.target.value)} required className="mt-1.5 min-h-[80px]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Público</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} className="mt-1.5" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Oferta / preço</Label>
              <Input value={offer} onChange={(e) => setOffer(e.target.value)} className="mt-1.5" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Verba</Label>
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} className="mt-1.5" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Plataformas</Label>
              <Input value={platform} onChange={(e) => setPlatform(e.target.value)} className="mt-1.5" /></div>
          </div>
        </div>
      }
      resultContent={out && (
        <>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Ângulos de venda</h2>
            <div className="grid gap-2">
              {out.angles.map((a, i) => (
                <Card key={i} className="p-4 border-border/40 text-sm">
                  <div className="font-semibold text-foreground mb-1">{i + 1}. {a.angle_name}</div>
                  <div className="text-xs text-muted-foreground mb-1.5">→ {a.target}</div>
                  <p className="text-foreground/85 italic">"{a.hook}"</p>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Criativos Meta</h2>
            <div className="grid gap-3">
              {out.meta_ads.map((m, i) => (
                <Card key={i} className="p-5 border-border/40">
                  <Badge variant="outline" className="text-xs mb-3">{m.format}</Badge>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-xs uppercase tracking-wider text-primary">Hook 3s: </span>{m.hook_3s}</div>
                    <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Body: </span>{m.body}</div>
                    <div><span className="text-xs uppercase tracking-wider text-muted-foreground">CTA: </span>{m.cta}</div>
                    <div className="text-xs text-muted-foreground italic pt-2 border-t border-border/30">🎬 {m.visual_brief}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
              <Search className="h-4 w-4" /> Google Ads
            </h2>
            <div className="grid gap-3">
              {out.google_ads.map((g, i) => (
                <Card key={i} className="p-5 border-border/40">
                  <Badge variant="outline" className="text-xs mb-3">{g.campaign_type}</Badge>
                  <div className="text-xs uppercase tracking-wider text-primary mb-1">Headlines (≤30 chars)</div>
                  <div className="grid sm:grid-cols-2 gap-1.5 mb-3 text-sm">
                    {g.headlines.map((h, j) => (
                      <div key={j} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                        <span className="text-foreground/90 truncate">{h}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => cp(h)}><CopyIcon className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-primary mb-1">Descrições (≤90 chars)</div>
                  <ul className="space-y-1 mb-3 text-sm">
                    {g.descriptions.map((d, j) => <li key={j} className="text-foreground/85">• {d}</li>)}
                  </ul>
                  <div className="text-xs uppercase tracking-wider text-primary mb-1">Palavras-chave</div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.keywords.map((k, j) => <Badge key={j} variant="outline" className="text-xs">{k}</Badge>)}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Card className="p-5 border-border/40 text-sm">
            <div className="text-xs uppercase tracking-wider text-primary mb-1">Divisão de verba</div>
            <p className="text-foreground/90 mb-3">{out.budget_split}</p>
            <div className="text-xs uppercase tracking-wider text-primary mb-1">Métricas a monitorar</div>
            <ul className="space-y-1">{out.metrics_to_watch.map((m, i) => <li key={i} className="text-foreground/85">• {m}</li>)}</ul>
          </Card>

          <Card className="p-6 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="text-xs uppercase tracking-wider text-primary mb-1">Primeira ação</div>
            <p className="text-foreground font-medium">{out.first_action}</p>
          </Card>
        </>
      )}
    />
  );
}
