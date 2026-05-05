import { useState } from "react";
import { Wrench, Calendar, Package, Cpu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplateScaffold, useTemplateGate } from "@/components/templates/TemplateScaffold";

const TOKEN_COST = 200;

interface Equip { nome: string; criticidade: string; mtbf_estimado: string; mttr_estimado: string; }
interface Rotina { atividade: string; frequencia: string; responsavel: string; tempo_estimado: string; checklist: string[]; }
interface Plan {
  overview: string; equipamentos: Equip[]; rotinas: Rotina[];
  indicadores: string[]; estoque_pecas_criticas: string[];
  sensores_recomendados: string[]; integracao_orion: string[];
  roi_estimado: string; first_action: string;
}

export default function PlanoManutencao() {
  const { user, isPremium, isOwner, tokensRemaining } = useTemplateGate(TOKEN_COST);
  const [setor, setSetor] = useState("");
  const [equipamentos, setEquipamentos] = useState("");
  const [regime, setRegime] = useState("");
  const [problemas, setProblemas] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<Plan | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (equipamentos.length < 3) return toast.error("Liste os equipamentos");
    setLoading(true); setOut(null);
    try {
      const { data, error } = await supabase.functions.invoke("maintenance-planner", {
        body: { setor, equipamentos, regime, problemas },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOut(data.plan);
      if (!isPremium && !isOwner && user) {
        await supabase.from("user_plans").upsert(
          { user_id: user.id, ai_tokens_remaining: Math.max(0, tokensRemaining - TOKEN_COST), plan_type: "free" },
          { onConflict: "user_id" });
      }
      toast.success("Plano entregue 🔧");
    } catch (err: any) { toast.error(err?.message || "Falha"); }
    finally { setLoading(false); }
  }

  function critColor(c: string) {
    const v = c.toLowerCase();
    if (v.includes("alt")) return "text-red-500 border-red-500/40";
    if (v.includes("méd") || v.includes("med")) return "text-amber-500 border-amber-500/40";
    return "text-emerald-500 border-emerald-500/40";
  }

  return (
    <TemplateScaffold
      seoTitle="Plano de manutenção industrial com IA | Orion"
      seoDescription="Liste seus equipamentos. Orion entrega plano preventivo/preditivo, rotinas, sensores e ROI."
      canonical="https://www.iasofthub.com/templates/plano-manutencao"
      badgeText="Template Vertical · Indústria"
      badgeIcon={<Wrench className="h-3 w-3 inline" />}
      title={<>Plano de <span className="text-primary">manutenção</span></>}
      subtitle="Rotinas, frequências, sensores IoT e ROI — pronto para implantar com a equipe Orion."
      tokenCost={TOKEN_COST}
      loading={loading}
      onSubmit={onSubmit}
      ctaIcon={<Wrench className="h-4 w-4" />}
      ctaLabel="Gerar plano"
      ctaLoadingLabel="Orion planejando..."
      formContent={
        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Setor</Label>
              <Input value={setor} onChange={(e) => setSetor(e.target.value)} className="mt-1.5" placeholder="Ex: Pneus / Alimentos" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Regime de operação</Label>
              <Input value={regime} onChange={(e) => setRegime(e.target.value)} className="mt-1.5" placeholder="3 turnos / contínuo" /></div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Equipamentos *</Label>
            <Textarea value={equipamentos} onChange={(e) => setEquipamentos(e.target.value)} required
              className="mt-1.5 min-h-[100px]"
              placeholder="Ex: 2 extrusoras, 4 prensas hidráulicas 200t, 1 calandra, 3 esteiras transportadoras..." />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Problemas recorrentes</Label>
            <Textarea value={problemas} onChange={(e) => setProblemas(e.target.value)} className="mt-1.5 min-h-[60px]"
              placeholder="Ex: vazamento hidráulico mensal nas prensas, vibração anormal extrusora 2..." />
          </div>
        </div>
      }
      resultContent={out && (
        <>
          <Card className="p-6 border-primary/30 bg-primary/5">
            <div className="text-xs uppercase tracking-wider text-primary mb-1">Visão geral</div>
            <p className="text-foreground/90 text-sm whitespace-pre-line">{out.overview}</p>
            <div className="mt-4 pt-4 border-t border-primary/20 text-sm">
              <span className="text-xs uppercase tracking-wider text-primary">ROI estimado: </span>
              <span className="font-semibold">{out.roi_estimado}</span>
            </div>
          </Card>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Equipamentos mapeados</h2>
            <div className="grid gap-2">
              {out.equipamentos.map((e, i) => (
                <Card key={i} className="p-4 border-border/40 text-sm flex items-center gap-3">
                  <div className="font-medium text-foreground flex-1">{e.nome}</div>
                  <Badge variant="outline" className={`text-xs ${critColor(e.criticidade)}`}>{e.criticidade}</Badge>
                  <div className="text-xs text-muted-foreground hidden sm:block">MTBF: {e.mtbf_estimado} · MTTR: {e.mttr_estimado}</div>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Rotinas
            </h2>
            <div className="grid gap-3">
              {out.rotinas.map((r, i) => (
                <Card key={i} className="p-5 border-border/40">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="outline" className="text-xs">{r.frequencia}</Badge>
                    <div className="font-semibold text-foreground flex-1">{r.atividade}</div>
                    <span className="text-xs text-muted-foreground">{r.tempo_estimado}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">Responsável: {r.responsavel}</div>
                  <ul className="space-y-1 text-sm">
                    {r.checklist.map((c, j) => <li key={j} className="text-foreground/85">☐ {c}</li>)}
                  </ul>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Card className="p-5 border-border/40 text-sm">
              <h3 className="text-xs uppercase tracking-wider text-primary mb-2 flex items-center gap-2"><Package className="h-3.5 w-3.5" /> Estoque crítico</h3>
              <ul className="space-y-1">{out.estoque_pecas_criticas.map((p, i) => <li key={i} className="text-foreground/85">• {p}</li>)}</ul>
            </Card>
            <Card className="p-5 border-border/40 text-sm">
              <h3 className="text-xs uppercase tracking-wider text-primary mb-2 flex items-center gap-2"><Cpu className="h-3.5 w-3.5" /> Sensores recomendados</h3>
              <ul className="space-y-1">{out.sensores_recomendados.map((s, i) => <li key={i} className="text-foreground/85">• {s}</li>)}</ul>
            </Card>
          </div>

          <Card className="p-5 border-border/40 text-sm">
            <h3 className="text-xs uppercase tracking-wider text-primary mb-2">Indicadores</h3>
            <div className="flex flex-wrap gap-1.5">
              {out.indicadores.map((k, i) => <Badge key={i} variant="outline">{k}</Badge>)}
            </div>
          </Card>

          <Card className="p-5 border-border/40 text-sm">
            <h3 className="text-xs uppercase tracking-wider text-primary mb-2">Módulos Orion</h3>
            <div className="flex flex-wrap gap-1.5">
              {out.integracao_orion.map((k, i) => <Badge key={i} variant="outline" className="border-primary/30">{k}</Badge>)}
            </div>
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
