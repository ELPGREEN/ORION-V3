import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Scale, Sparkles, Lock, Coins, Copy, AlertTriangle, Upload, FileText, X, Download } from "lucide-react";
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

const TOKEN_COST = 150;

interface FundJur { tese: string; fundamento_legal: string; jurisprudencia: string; }
interface Peticao {
  tipo: string;
  competencia?: string;
  enderecamento: string;
  qualificacao: string;
  dos_fatos: string;
  do_direito: FundJur[];
  dos_pedidos: string[];
  valor_da_causa: string;
  provas: string[];
  observacoes_advogado: string[];
}

export default function PeticaoUmClique() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, isOwner, tokensRemaining, loading: planLoading } = useUserPlan();

  const TIPOS_PRESET = [
    { value: "Inicial", label: "Petição Inicial" },
    { value: "Contestação", label: "Contestação" },
    { value: "Recurso", label: "Recurso / Apelação" },
    { value: "Mandado de Segurança", label: "Mandado de Segurança" },
    { value: "Embargos", label: "Embargos" },
  ];
  const AREAS_PRESET = ["Trabalhista", "Cível", "Consumidor", "Família", "Tributário", "Previdenciário", "Penal"];

  const [tipo, setTipo] = useState("Inicial");
  const [area, setArea] = useState("");
  const [partes, setPartes] = useState("");
  const [fatos, setFatos] = useState("");
  const [pedido, setPedido] = useState("");
  const [loading, setLoading] = useState(false);
  const [pet, setPet] = useState<Peticao | null>(null);
  const [docName, setDocName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Arquivo muito grande (máx 5MB)");
    const isText = file.type.startsWith("text/") || file.name.match(/\.(txt|md|csv)$/i);
    if (!isText) {
      toast.error("Use arquivo .txt — para PDF, copie e cole o texto no campo Fatos");
      return;
    }
    setExtracting(true);
    try {
      const text = await file.text();
      const trimmed = text.slice(0, 8000).trim();
      setFatos((prev) => (prev ? prev + "\n\n" : "") + trimmed);
      setDocName(file.name);
      toast.success(`Documento carregado: ${file.name}`);
    } catch {
      toast.error("Falha ao ler arquivo");
    } finally {
      setExtracting(false);
    }
  }

  function clearDoc() {
    setDocName(null);
  }

  const canGenerate = !!user && (isOwner || isPremium || tokensRemaining >= TOKEN_COST);
  const showLoginGate = !planLoading && !user;
  const showUpgradeGate = !planLoading && !!user && !canGenerate;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (fatos.trim().length < 10) return toast.error("Descreva os fatos (mín. 10 caracteres)");
    if (!canGenerate) return toast.error("Plano Pro ou tokens free necessários.");
    setLoading(true); setPet(null);
    try {
      const { data, error } = await supabase.functions.invoke("peticao-builder", {
        body: { tipo, area, partes, fatos, pedido },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPet(data.peticao);
      if (!isPremium && !isOwner && user) {
        await supabase.from("user_plans").upsert(
          { user_id: user.id, ai_tokens_remaining: Math.max(0, tokensRemaining - TOKEN_COST), plan_type: "free" },
          { onConflict: "user_id" });
      }
      toast.success("Rascunho de petição entregue ⚖️");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar");
    } finally { setLoading(false); }
  }

  function exportText() {
    if (!pet) return;
    const txt = [
      `PETIÇÃO ${pet.tipo.toUpperCase()}`,
      "", pet.enderecamento, "",
      "QUALIFICAÇÃO:", pet.qualificacao, "",
      "DOS FATOS:", pet.dos_fatos, "",
      "DO DIREITO:",
      ...pet.do_direito.map((f, i) => `${i + 1}) ${f.tese}\n   Fundamento: ${f.fundamento_legal}\n   Jurisprudência: ${f.jurisprudencia}`),
      "",
      "DOS PEDIDOS:",
      ...pet.dos_pedidos.map((p, i) => `${i + 1}. ${p}`),
      "",
      `VALOR DA CAUSA: ${pet.valor_da_causa}`,
      "",
      "PROVAS:", ...pet.provas.map((p) => `- ${p}`),
      "",
      "OBSERVAÇÕES (revisar antes de protocolar):",
      ...pet.observacoes_advogado.map((o) => `- ${o}`),
    ].join("\n");
    navigator.clipboard.writeText(txt);
    toast.success("Petição copiada");
  }

  function downloadText() {
    if (!pet) return;
    const txt = [
      `PETIÇÃO ${pet.tipo.toUpperCase()}`,
      "", pet.enderecamento, "",
      "QUALIFICAÇÃO:", pet.qualificacao, "",
      "DOS FATOS:", pet.dos_fatos, "",
      "DO DIREITO:",
      ...pet.do_direito.map((f, i) => `${i + 1}) ${f.tese}\n   Fundamento: ${f.fundamento_legal}\n   Jurisprudência: ${f.jurisprudencia}`),
      "",
      "DOS PEDIDOS:",
      ...pet.dos_pedidos.map((p, i) => `${i + 1}. ${p}`),
      "",
      `VALOR DA CAUSA: ${pet.valor_da_causa}`,
      "",
      "PROVAS:", ...pet.provas.map((p) => `- ${p}`),
      "",
      "OBSERVAÇÕES (revisar antes de protocolar):",
      ...pet.observacoes_advogado.map((o) => `- ${o}`),
    ].join("\n");
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peticao-${pet.tipo.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download iniciado");
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Petição em 1 clique | Rascunho jurídico com IA pelo Orion"
        description="Descreva os fatos. Orion entrega rascunho de petição estruturada (CPC), com fundamentos, pedidos e revisão sugerida."
        canonical="https://www.iasofthub.com/templates/peticao"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Petição em 1 clique — Orion",
          description: "Rascunho de petição padrão CNJ gerado por IA, com fundamentos e pedidos.",
          url: "https://www.iasofthub.com/templates/peticao",
          applicationCategory: "LegalService",
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
            <Scale className="h-3 w-3 mr-1" /> Template Vertical · Advogados
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground mb-3 tracking-wide">
            Petição <span className="text-primary">em 1 clique</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Descreva os fatos. Orion devolve rascunho estruturado em padrão CNJ — com fundamentos, pedidos e pontos a revisar.
          </p>
        </div>

        <Card className="mb-6 p-3 border-amber-500/30 bg-amber-500/5 flex items-start gap-2 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-foreground/80">
            <strong>Atenção:</strong> esta peça é um RASCUNHO assistido por IA. Sempre revise jurisprudência, prazos e fundamentos antes de protocolar.
          </p>
        </Card>

        {!planLoading && (
          <div className="mb-6 flex items-center justify-center">
            {isOwner || isPremium ? (
              <Badge variant="outline" className="border-primary/40 text-primary px-3 py-1.5 text-xs">
                <Sparkles className="h-3 w-3 mr-1.5" /> Plano Pro · ilimitado
              </Badge>
            ) : user ? (
              <Badge variant="outline" className="border-border/60 text-muted-foreground px-3 py-1.5 text-xs">
                <Coins className="h-3 w-3 mr-1.5 text-primary" />
                {tokensRemaining} tokens · {TOKEN_COST} por petição
              </Badge>
            ) : null}
          </div>
        )}

        {showLoginGate && (
          <Card className="mb-8 p-6 border-primary/30 bg-primary/5 text-center">
            <Lock className="h-6 w-6 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Entre para gerar sua petição</h3>
            <p className="text-sm text-muted-foreground mb-4">Cadastro grátis · 1.000 tokens · sem cartão.</p>
            <Button onClick={() => navigate("/cadastro")} className="btn-gold">Criar conta grátis</Button>
          </Card>
        )}
        {showUpgradeGate && (
          <Card className="mb-8 p-6 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 text-center">
            <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Tokens insuficientes</h3>
            <p className="text-sm text-muted-foreground mb-4">{TOKEN_COST} tokens por petição. Upgrade para ilimitado.</p>
            <Button onClick={() => navigate("/plataforma")} className="btn-gold">Ver planos Pro</Button>
          </Card>
        )}

        <form onSubmit={handleGenerate} className="grid gap-4 mb-10">
          <Card className="p-6 border-primary/20 bg-card/40">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipo da peça</Label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {TIPOS_PRESET.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    <option value="Outra">Outra (descreva nos fatos)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Área</Label>
                  <Input value={area} onChange={(e) => setArea(e.target.value)} className="mt-1.5"
                    list="areas-juridicas" placeholder="Ex: Trabalhista" />
                  <datalist id="areas-juridicas">
                    {AREAS_PRESET.map((a) => <option key={a} value={a} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Partes</Label>
                <Input value={partes} onChange={(e) => setPartes(e.target.value)} className="mt-1.5"
                  placeholder="Autor: João da Silva | Réu: Empresa XYZ" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fatos *</Label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 cursor-pointer">
                    {extracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    Anexar documento (.txt)
                    <input type="file" accept=".txt,.md,text/plain" className="hidden" onChange={handleDocUpload} disabled={extracting} />
                  </label>
                </div>
                {docName && (
                  <div className="mb-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-primary/30 bg-primary/5 text-xs">
                    <FileText className="h-3 w-3 text-primary" />
                    <span className="text-foreground/80">{docName}</span>
                    <button type="button" onClick={clearDoc} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <Textarea value={fatos} onChange={(e) => setFatos(e.target.value)} required
                  placeholder="Descreva o que aconteceu, datas, valores, documentos... ou anexe um .txt acima"
                  className="min-h-[140px]" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pedido principal</Label>
                <Input value={pedido} onChange={(e) => setPedido(e.target.value)} className="mt-1.5"
                  placeholder="Ex: Reintegração + danos morais" />
              </div>
            </div>
          </Card>
          <Button type="submit" size="lg" className="btn-gold mx-auto px-10" disabled={loading || !canGenerate}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Orion redigindo...</>
              : <><Scale className="h-4 w-4 mr-2" /> Gerar petição</>}
          </Button>
        </form>

        {pet && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={downloadText}>
                <Download className="h-3 w-3 mr-1.5" /> Baixar .txt
              </Button>
              <Button size="sm" variant="outline" onClick={exportText}>
                <Copy className="h-3 w-3 mr-1.5" /> Copiar peça
              </Button>
            </div>

            <Card className="p-6 border-primary/30 bg-primary/5 space-y-3 text-sm">
              <div><span className="text-xs uppercase tracking-wider text-primary">Tipo:</span> <span className="font-medium">{pet.tipo}</span></div>
              {pet.competencia && <div><span className="text-xs uppercase tracking-wider text-primary">Competência:</span> {pet.competencia}</div>}
              <div><span className="text-xs uppercase tracking-wider text-primary">Endereçamento:</span> <p className="text-foreground/90 whitespace-pre-line">{pet.enderecamento}</p></div>
            </Card>

            <Card className="p-6 border-border/40">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">Qualificação</h2>
              <p className="text-foreground/90 text-sm whitespace-pre-line">{pet.qualificacao}</p>
            </Card>
            <Card className="p-6 border-border/40">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">Dos Fatos</h2>
              <p className="text-foreground/90 text-sm whitespace-pre-line">{pet.dos_fatos}</p>
            </Card>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Do Direito</h2>
              <div className="grid gap-3">
                {pet.do_direito.map((f, i) => (
                  <Card key={i} className="p-5 border-border/40 text-sm">
                    <div className="font-semibold text-foreground mb-2">{i + 1}. {f.tese}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Fundamento legal</div>
                    <p className="text-foreground/85 mb-2">{f.fundamento_legal}</p>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Jurisprudência (confirmar)</div>
                    <p className="text-foreground/70 italic">{f.jurisprudencia}</p>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="p-6 border-border/40">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Dos Pedidos</h2>
              <ol className="space-y-2 text-sm list-decimal list-inside">
                {pet.dos_pedidos.map((p, i) => <li key={i} className="text-foreground/90">{p}</li>)}
              </ol>
              <div className="mt-4 pt-4 border-t border-border/30 text-sm">
                <span className="text-xs uppercase tracking-wider text-primary">Valor da causa: </span>
                <span className="font-medium">{pet.valor_da_causa}</span>
              </div>
            </Card>

            <Card className="p-6 border-border/40">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Provas</h2>
              <ul className="space-y-1.5 text-sm">
                {pet.provas.map((p, i) => <li key={i} className="text-foreground/90">• {p}</li>)}
              </ul>
            </Card>

            <Card className="p-6 border-amber-500/40 bg-amber-500/5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Revisar antes de protocolar
              </h2>
              <ul className="space-y-1.5 text-sm">
                {pet.observacoes_advogado.map((o, i) => <li key={i} className="text-foreground/90">• {o}</li>)}
              </ul>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
