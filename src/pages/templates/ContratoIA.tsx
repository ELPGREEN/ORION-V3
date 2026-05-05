import { useState } from "react";
import { FileSignature, AlertTriangle, Copy as CopyIcon, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TemplateScaffold, useTemplateGate } from "@/components/templates/TemplateScaffold";

const TOKEN_COST = 150;

interface Clausula { numero: string; titulo: string; conteudo: string; }
interface Contract {
  titulo: string; preambulo: string; consideranda?: string;
  clausulas: Clausula[]; foro: string; assinaturas: string;
  pontos_revisao: string[]; riscos_legais: string[];
}

export default function ContratoIA() {
  const { user, isPremium, isOwner, tokensRemaining } = useTemplateGate(TOKEN_COST);
  const [tipo, setTipo] = useState("");
  const [partes, setPartes] = useState("");
  const [objeto, setObjeto] = useState("");
  const [valor, setValor] = useState("");
  const [prazo, setPrazo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<Contract | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tipo.length < 3) return toast.error("Informe o tipo");
    setLoading(true); setOut(null);
    try {
      const { data, error } = await supabase.functions.invoke("contract-builder", {
        body: { tipo, partes, objeto, valor, prazo, observacoes },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOut(data.contract);
      if (!isPremium && !isOwner && user) {
        await supabase.from("user_plans").upsert(
          { user_id: user.id, ai_tokens_remaining: Math.max(0, tokensRemaining - TOKEN_COST), plan_type: "free" },
          { onConflict: "user_id" });
      }
      toast.success("Contrato entregue 📄");
    } catch (err: any) { toast.error(err?.message || "Falha"); }
    finally { setLoading(false); }
  }

  function exportContract() {
    if (!out) return;
    const txt = [
      out.titulo, "", out.preambulo, "",
      out.consideranda || "",
      ...out.clausulas.map((c) => `\n${c.numero} — ${c.titulo}\n${c.conteudo}`),
      "", out.foro, "", out.assinaturas,
    ].join("\n");
    navigator.clipboard.writeText(txt);
    toast.success("Contrato copiado");
  }

  return (
    <TemplateScaffold
      seoTitle="Contrato por IA | Rascunho jurídico pelo Orion"
      seoDescription="Descreva o tipo. Orion entrega rascunho de contrato com cláusulas, riscos e pontos de revisão."
      canonical="https://www.iasofthub.com/templates/contrato-ia"
      badgeText="Template Vertical · Advogados"
      badgeIcon={<Scale className="h-3 w-3 inline" />}
      title={<>Contrato <span className="text-primary">por IA</span></>}
      subtitle="Rascunho estruturado, cláusulas numeradas e checklist de revisão antes de assinar."
      tokenCost={TOKEN_COST}
      loading={loading}
      onSubmit={onSubmit}
      ctaIcon={<FileSignature className="h-4 w-4" />}
      ctaLabel="Gerar contrato"
      ctaLoadingLabel="Orion redigindo..."
      formContent={
        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo *</Label>
              <Input value={tipo} onChange={(e) => setTipo(e.target.value)} required className="mt-1.5" placeholder="Prestação de serviços" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Partes</Label>
              <Input value={partes} onChange={(e) => setPartes(e.target.value)} className="mt-1.5" placeholder="Empresa X e João Silva" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Valor</Label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} className="mt-1.5" /></div>
            <div><Label className="text-xs uppercase tracking-wider text-muted-foreground">Prazo</Label>
              <Input value={prazo} onChange={(e) => setPrazo(e.target.value)} className="mt-1.5" /></div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Objeto</Label>
            <Textarea value={objeto} onChange={(e) => setObjeto(e.target.value)} className="mt-1.5 min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="mt-1.5 min-h-[50px]"
              placeholder="Multa, exclusividade, NDA, foro específico..." />
          </div>
        </div>
      }
      resultContent={out && (
        <>
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={exportContract}>
              <CopyIcon className="h-3 w-3 mr-1.5" /> Copiar contrato
            </Button>
          </div>
          <Card className="p-6 border-primary/30 bg-primary/5">
            <h2 className="font-serif text-lg text-foreground mb-2">{out.titulo}</h2>
            <p className="text-sm text-foreground/85 whitespace-pre-line">{out.preambulo}</p>
          </Card>
          {out.consideranda && (
            <Card className="p-5 border-border/40 text-sm">
              <p className="text-foreground/85 whitespace-pre-line">{out.consideranda}</p>
            </Card>
          )}
          <div className="grid gap-3">
            {out.clausulas.map((c, i) => (
              <Card key={i} className="p-5 border-border/40">
                <div className="text-xs uppercase tracking-wider text-primary mb-1">{c.numero}</div>
                <div className="font-semibold text-foreground mb-2">{c.titulo}</div>
                <p className="text-sm text-foreground/85 whitespace-pre-line">{c.conteudo}</p>
              </Card>
            ))}
          </div>
          <Card className="p-5 border-border/40 text-sm">
            <p className="text-foreground/85 whitespace-pre-line">{out.foro}</p>
            <p className="text-foreground/70 text-xs mt-3 whitespace-pre-line">{out.assinaturas}</p>
          </Card>
          <Card className="p-6 border-amber-500/40 bg-amber-500/5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Pontos a revisar
            </h2>
            <ul className="space-y-1.5 text-sm">
              {out.pontos_revisao.map((p, i) => <li key={i} className="text-foreground/90">• {p}</li>)}
            </ul>
          </Card>
          {out.riscos_legais?.length > 0 && (
            <Card className="p-5 border-red-500/30 bg-red-500/5 text-sm">
              <div className="text-xs uppercase tracking-wider text-red-500 mb-2">Riscos legais</div>
              <ul className="space-y-1">{out.riscos_legais.map((r, i) => <li key={i} className="text-foreground/85">• {r}</li>)}</ul>
            </Card>
          )}
        </>
      )}
    />
  );
}
