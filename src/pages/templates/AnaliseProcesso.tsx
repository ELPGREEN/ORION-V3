import { useState } from "react";
import { Search, Scale, AlertTriangle, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplateScaffold, useTemplateGate } from "@/components/templates/TemplateScaffold";

const TOKEN_COST = 200;

interface Risco { risco: string; probabilidade: string; mitigacao: string; }
interface Passo { passo: string; prazo: string; prioridade: string; }
interface Analysis {
  sumario: string; partes: string[]; pedidos_identificados: string[];
  fase_processual: string; pontos_fortes: string[]; pontos_fracos: string[];
  riscos: Risco[]; estrategia_recomendada: string; proximos_passos: Passo[];
  jurisprudencia_buscar: string[]; estimativa_resultado: string;
}

export default function AnaliseProcesso() {
  const { user, isPremium, isOwner, tokensRemaining } = useTemplateGate(TOKEN_COST);
  const [caseText, setCaseText] = useState("");
  const [lado, setLado] = useState("");
  const [area, setArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<Analysis | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (caseText.length < 30) return toast.error("Cole o conteúdo do processo (mín. 30 chars)");
    setLoading(true); setOut(null);
    try {
      const { data, error } = await supabase.functions.invoke("case-analyzer", {
        body: { case_text: caseText, lado, area },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOut(data.analysis);
      if (!isPremium && !isOwner && user) {
        await supabase.from("user_plans").upsert(
          { user_id: user.id, ai_tokens_remaining: Math.max(0, tokensRemaining - TOKEN_COST), plan_type: "free" },
          { onConflict: "user_id" });
      }
      toast.success("Análise entregue ⚖️");
    } catch (err: any) { toast.error(err?.message || "Falha"); }
    finally { setLoading(false); }
  }

  return (
    <TemplateScaffold
      seoTitle="Análise de processo com IA | Orion Jurídico"
      seoDescription="Cole os autos. Orion identifica pedidos, riscos, estratégia e próximos passos."
      canonical="https://www.iasofthub.com/templates/analise-processo"
      badgeText="Template Vertical · Advogados"
      badgeIcon={<Scale className="h-3 w-3 inline" />}
      title={<>Análise <span className="text-primary">de processo</span></>}
      subtitle="Cole o conteúdo dos autos. Orion devolve sumário, riscos, estratégia e próximos passos."
      tokenCost={TOKEN_COST}
      loading={loading}
      onSubmit={onSubmit}
      ctaIcon={<Search className="h-4 w-4" />}
      ctaLabel="Analisar processo"
      ctaLoadingLabel="Orion analisando..."
      formContent={
        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Lado representado</Label>
              <Input value={lado} onChange={(e) => setLado(e.target.value)} className="mt-1.5" placeholder="Autor / Réu" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Área</Label>
              <Input value={area} onChange={(e) => setArea(e.target.value)} className="mt-1.5" placeholder="Trabalhista / Cível" /></div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Conteúdo dos autos *</Label>
            <Textarea value={caseText} onChange={(e) => setCaseText(e.target.value)} required
              className="mt-1.5 min-h-[200px] font-mono text-xs"
              placeholder="Cole a petição, decisão, sentença ou resumo dos autos..." />
            <p className="text-xs text-muted-foreground mt-1.5">Aceita até ~60.000 caracteres por análise.</p>
          </div>
        </div>
      }
      resultContent={out && (
        <>
          <Card className="p-6 border-primary/30 bg-primary/5">
            <div className="text-xs uppercase tracking-wider text-primary mb-1">Sumário executivo</div>
            <p className="text-foreground/90 text-sm">{out.sumario}</p>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-primary/20 text-xs">
              <div><span className="uppercase tracking-wider text-muted-foreground">Fase: </span><span className="text-foreground">{out.fase_processual}</span></div>
              <div><span className="uppercase tracking-wider text-muted-foreground">Resultado estimado: </span><span className="text-foreground">{out.estimativa_resultado}</span></div>
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 gap-3">
            <Card className="p-5 border-border/40">
              <h3 className="text-xs uppercase tracking-wider text-emerald-500 mb-2">Pontos fortes</h3>
              <ul className="space-y-1 text-sm">{out.pontos_fortes.map((p, i) => <li key={i}>• {p}</li>)}</ul>
            </Card>
            <Card className="p-5 border-border/40">
              <h3 className="text-xs uppercase tracking-wider text-red-500 mb-2">Pontos fracos</h3>
              <ul className="space-y-1 text-sm">{out.pontos_fracos.map((p, i) => <li key={i}>• {p}</li>)}</ul>
            </Card>
          </div>

          <Card className="p-5 border-border/40">
            <h3 className="text-xs uppercase tracking-wider text-primary mb-3">Pedidos identificados</h3>
            <ul className="space-y-1 text-sm">{out.pedidos_identificados.map((p, i) => <li key={i} className="text-foreground/85">• {p}</li>)}</ul>
          </Card>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Riscos
            </h2>
            <div className="grid gap-3">
              {out.riscos.map((r, i) => (
                <Card key={i} className="p-4 border-border/40 text-sm">
                  <div className="flex justify-between gap-3 mb-2">
                    <div className="font-semibold text-foreground flex-1">{r.risco}</div>
                    <Badge variant="outline" className="text-xs">{r.probabilidade}</Badge>
                  </div>
                  <p className="text-foreground/80 text-xs"><span className="text-primary uppercase tracking-wider">Mitigação: </span>{r.mitigacao}</p>
                </Card>
              ))}
            </div>
          </div>

          <Card className="p-6 border-primary/30 bg-primary/5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Estratégia recomendada
            </h3>
            <p className="text-foreground/90 text-sm whitespace-pre-line">{out.estrategia_recomendada}</p>
          </Card>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Próximos passos</h2>
            <div className="grid gap-2">
              {out.proximos_passos.map((p, i) => (
                <Card key={i} className="p-4 border-border/40 text-sm flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{i + 1}</div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{p.passo}</div>
                    <div className="text-xs text-muted-foreground">Prazo: {p.prazo}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">{p.prioridade}</Badge>
                </Card>
              ))}
            </div>
          </div>

          <Card className="p-5 border-amber-500/30 bg-amber-500/5 text-sm">
            <h3 className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">Jurisprudência a buscar (confirmar)</h3>
            <ul className="space-y-1">{out.jurisprudencia_buscar.map((j, i) => <li key={i} className="text-foreground/85">• {j}</li>)}</ul>
          </Card>
        </>
      )}
    />
  );
}
