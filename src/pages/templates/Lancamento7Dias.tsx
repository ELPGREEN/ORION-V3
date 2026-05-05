import { useState } from "react";
import { Rocket, Mail, Calendar, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplateScaffold, useTemplateGate } from "@/components/templates/TemplateScaffold";

const TOKEN_COST = 150;

interface DayPlan { day_number: number; theme: string; email_subject: string; email_body: string; social_post: string; story_idea: string; cta: string; kpi: string; }
interface PreLaunch { day: string; action: string; channel: string; content: string; }
interface Launch { overview: string; pre_launch: PreLaunch[]; daily_plan: DayPlan[]; post_launch: string; first_action: string; }

export default function Lancamento7Dias() {
  const { user, isPremium, isOwner, tokensRemaining } = useTemplateGate(TOKEN_COST);
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [price, setPrice] = useState("");
  const [type, setType] = useState("Lançamento perpétuo");
  const [listSize, setListSize] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<Launch | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (product.length < 3) return toast.error("Descreva o produto");
    setLoading(true); setOut(null);
    try {
      const { data, error } = await supabase.functions.invoke("launch-builder", {
        body: { product, audience, price, type, list_size: listSize },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOut(data.launch);
      if (!isPremium && !isOwner && user) {
        await supabase.from("user_plans").upsert(
          { user_id: user.id, ai_tokens_remaining: Math.max(0, tokensRemaining - TOKEN_COST), plan_type: "free" },
          { onConflict: "user_id" });
      }
      toast.success("Lançamento entregue 🚀");
    } catch (err: any) { toast.error(err?.message || "Falha"); }
    finally { setLoading(false); }
  }

  return (
    <TemplateScaffold
      seoTitle="Lançamento 7 dias com IA | Orion"
      seoDescription="Plano completo de lançamento em 7 dias: emails, posts, stories e CTAs prontos."
      canonical="https://www.iasofthub.com/templates/lancamento-7-dias"
      badgeText="Template Vertical · Digital"
      badgeIcon={<Sparkles className="h-3 w-3 inline" />}
      title={<>Lançamento <span className="text-primary">7 dias</span></>}
      subtitle="Sequência completa de emails, posts, stories e CTAs — pronto pra disparar."
      tokenCost={TOKEN_COST}
      loading={loading}
      onSubmit={onSubmit}
      ctaIcon={<Rocket className="h-4 w-4" />}
      ctaLabel="Gerar lançamento"
      ctaLoadingLabel="Orion planejando..."
      formContent={
        <div className="grid gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Produto / Oferta *</Label>
            <Textarea value={product} onChange={(e) => setProduct(e.target.value)} required className="mt-1.5 min-h-[80px]"
              placeholder="Ex: Curso de tráfego pago para iniciantes, R$ 497, 12 módulos." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Público</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} className="mt-1.5" placeholder="Ex: iniciantes" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Preço</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1.5" placeholder="R$ 497" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo</Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} className="mt-1.5" placeholder="PLF / Relâmpago / Perpétuo" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Lista / audiência</Label>
              <Input value={listSize} onChange={(e) => setListSize(e.target.value)} className="mt-1.5" placeholder="2.000 leads" /></div>
          </div>
        </div>
      }
      resultContent={out && (
        <>
          <Card className="p-6 border-primary/30 bg-primary/5">
            <div className="text-xs uppercase tracking-wider text-primary mb-1">Estratégia</div>
            <p className="text-foreground/90">{out.overview}</p>
          </Card>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Pré-lançamento
            </h2>
            <div className="grid gap-3">
              {out.pre_launch.map((p, i) => (
                <Card key={i} className="p-4 border-border/40 text-sm">
                  <div className="flex gap-3 items-start mb-2">
                    <Badge variant="outline" className="text-xs">{p.day}</Badge>
                    <span className="text-xs text-primary uppercase tracking-wider">{p.channel}</span>
                  </div>
                  <p className="font-medium text-foreground mb-1">{p.action}</p>
                  <p className="text-foreground/80 text-xs whitespace-pre-line">{p.content}</p>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4" /> 7 dias do lançamento
            </h2>
            <div className="grid gap-3">
              {out.daily_plan.map((d) => (
                <Card key={d.day_number} className="p-5 border-border/40">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">D{d.day_number}</div>
                    <div className="font-semibold text-foreground">{d.theme}</div>
                  </div>
                  <div className="grid gap-3 text-sm">
                    <div className="p-3 bg-muted/30 rounded border border-border/30">
                      <div className="text-xs uppercase tracking-wider text-primary mb-1">📧 Email</div>
                      <p className="font-medium mb-1">Assunto: {d.email_subject}</p>
                      <p className="text-foreground/80 text-xs whitespace-pre-line">{d.email_body}</p>
                    </div>
                    <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Post: </span>{d.social_post}</div>
                    <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Story: </span>{d.story_idea}</div>
                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/30">
                      <div><span className="text-primary">CTA: </span>{d.cta}</div>
                      <div><span className="text-primary">KPI: </span>{d.kpi}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <Card className="p-6 border-border/40">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">Pós-lançamento</h2>
            <p className="text-foreground/90 text-sm whitespace-pre-line">{out.post_launch}</p>
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
