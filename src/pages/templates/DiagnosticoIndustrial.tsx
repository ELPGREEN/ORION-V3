import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Factory, Sparkles, Lock, Coins, AlertTriangle, TrendingUp, Upload, FileSpreadsheet, X } from "lucide-react";
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

const TOKEN_COST = 200;

interface Gargalo { etapa: string; impacto: string; causa_provavel: string; evidencia: string; }
interface Recomendacao { acao: string; prioridade: string; roi_estimado: string; prazo: string; }
interface Diagnosis {
  oee_estimado: string;
  gargalos: Gargalo[];
  riscos: string[];
  recomendacoes: Recomendacao[];
  integracoes_orion: string[];
  first_action: string;
}

export default function DiagnosticoIndustrial() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium, isOwner, tokensRemaining, loading: planLoading } = useUserPlan();

  const [setor, setSetor] = useState("");
  const [processo, setProcesso] = useState("");
  const [problema, setProblema] = useState("");
  const [dados, setDados] = useState("");
  const [capacidade, setCapacidade] = useState("");
  const [equipe, setEquipe] = useState("");
  const [loading, setLoading] = useState(false);
  const [diag, setDiag] = useState<Diagnosis | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [kpiSummary, setKpiSummary] = useState<{ rows: number; cols: string[]; numericStats: Record<string, { min: number; max: number; avg: number }> } | null>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 2MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = String(evt.target?.result || "");
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          toast.error("CSV vazio ou inválido");
          return;
        }
        const sep = lines[0].includes(";") ? ";" : ",";
        const headers = lines[0].split(sep).map((h) => h.trim());
        const rows = lines.slice(1).map((l) => l.split(sep));
        const numericStats: Record<string, { min: number; max: number; avg: number }> = {};
        headers.forEach((h, idx) => {
          const nums = rows.map((r) => parseFloat((r[idx] || "").replace(",", "."))).filter((n) => !isNaN(n));
          if (nums.length > rows.length * 0.6) {
            const min = Math.min(...nums);
            const max = Math.max(...nums);
            const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
            numericStats[h] = { min, max, avg: Math.round(avg * 100) / 100 };
          }
        });
        setKpiSummary({ rows: rows.length, cols: headers, numericStats });
        setFileName(file.name);
        const summary = [
          `Arquivo: ${file.name} (${rows.length} linhas, ${headers.length} colunas)`,
          `Colunas: ${headers.join(", ")}`,
          ...Object.entries(numericStats).map(([k, s]) => `${k}: min=${s.min}, max=${s.max}, média=${s.avg}`),
          `Amostra (primeiras 3 linhas):`,
          ...rows.slice(0, 3).map((r) => r.join(" | ")),
        ].join("\n");
        setDados(summary);
        toast.success(`CSV processado: ${rows.length} linhas`);
      } catch {
        toast.error("Falha ao processar CSV");
      }
    };
    reader.readAsText(file);
  }

  function clearFile() {
    setFileName(null);
    setKpiSummary(null);
    setDados("");
  }

  const canGenerate = !!user && (isOwner || isPremium || tokensRemaining >= TOKEN_COST);
  const showLoginGate = !planLoading && !user;
  const showUpgradeGate = !planLoading && !!user && !canGenerate;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (processo.trim().length < 3) return toast.error("Descreva o processo");
    if (!canGenerate) return toast.error("Plano Pro ou tokens necessários.");
    setLoading(true); setDiag(null);
    try {
      const { data, error } = await supabase.functions.invoke("industrial-diagnosis", {
        body: { setor, processo, problema, dados, capacidade, equipe },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDiag(data.diagnosis);
      if (!isPremium && !isOwner && user) {
        await supabase.from("user_plans").upsert(
          { user_id: user.id, ai_tokens_remaining: Math.max(0, tokensRemaining - TOKEN_COST), plan_type: "free" },
          { onConflict: "user_id" });
      }
      toast.success("Diagnóstico entregue 🏭");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar");
    } finally { setLoading(false); }
  }

  function impactoColor(i: string) {
    const v = i.toLowerCase();
    if (v.includes("alt")) return "text-red-500 border-red-500/40";
    if (v.includes("méd") || v.includes("med")) return "text-amber-500 border-amber-500/40";
    return "text-emerald-500 border-emerald-500/40";
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Diagnóstico Industrial com IA | Orion analisa sua linha de produção"
        description="Descreva seu processo. Orion devolve OEE estimado, gargalos, ROI das melhorias e plano de implementação — sem precisar de robô conectado."
        canonical="https://www.iasofthub.com/templates/diagnostico-industrial"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Diagnóstico Industrial com IA — Orion",
          description: "Diagnóstico de linha B2B: OEE, gargalos, ROI e roadmap sem robô instalado.",
          url: "https://www.iasofthub.com/templates/diagnostico-industrial",
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
            <Factory className="h-3 w-3 mr-1" /> Template Vertical · Indústria B2B
          </Badge>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground mb-3 tracking-wide">
            Diagnóstico de linha <span className="text-primary">em minutos</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Descreva seu processo. Orion devolve OEE, gargalos, ROI das melhorias e quais módulos integrar — antes de qualquer instalação.
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
                {tokensRemaining} tokens · {TOKEN_COST} por diagnóstico
              </Badge>
            ) : null}
          </div>
        )}

        {showLoginGate && (
          <Card className="mb-8 p-6 border-primary/30 bg-primary/5 text-center">
            <Lock className="h-6 w-6 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Entre para o diagnóstico</h3>
            <p className="text-sm text-muted-foreground mb-4">Cadastro grátis · 1.000 tokens · sem cartão.</p>
            <Button onClick={() => navigate("/cadastro")} className="btn-gold">Criar conta grátis</Button>
          </Card>
        )}
        {showUpgradeGate && (
          <Card className="mb-8 p-6 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 text-center">
            <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Tokens insuficientes</h3>
            <p className="text-sm text-muted-foreground mb-4">{TOKEN_COST} tokens por diagnóstico. Plano B2B inclui ilimitado + onboarding.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate("/plataforma")} className="btn-gold">Ver planos</Button>
              <Button onClick={() => navigate("/contato")} variant="outline">Falar com vendas B2B</Button>
            </div>
          </Card>
        )}

        <form onSubmit={handleGenerate} className="grid gap-4 mb-10">
          <Card className="p-6 border-primary/20 bg-card/40">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Setor</Label>
                  <Input value={setor} onChange={(e) => setSetor(e.target.value)} className="mt-1.5"
                    placeholder="Ex: Pneus / Alimentos / Auto" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Processo *</Label>
                  <Input value={processo} onChange={(e) => setProcesso(e.target.value)} required className="mt-1.5"
                    placeholder="Ex: Linha de extrusão" />
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Problema reportado</Label>
                <Input value={problema} onChange={(e) => setProblema(e.target.value)} className="mt-1.5"
                  placeholder="Ex: 12% de refugo + paradas frequentes na estação 3" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dados / KPIs (CSV ou texto)</Label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 cursor-pointer">
                    <Upload className="h-3 w-3" />
                    Upload CSV
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
                {fileName && kpiSummary && (
                  <div className="mb-2 p-3 rounded-md border border-primary/30 bg-primary/5 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        {fileName} · {kpiSummary.rows} linhas
                      </div>
                      <button type="button" onClick={clearFile} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {Object.keys(kpiSummary.numericStats).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                        {Object.entries(kpiSummary.numericStats).slice(0, 6).map(([k, s]) => (
                          <div key={k} className="bg-background/60 rounded p-2 border border-border/40">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{k}</div>
                            <div className="text-foreground/90 font-mono text-[11px]">μ {s.avg}</div>
                            <div className="text-muted-foreground font-mono text-[10px]">[{s.min}–{s.max}]</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <Textarea value={dados} onChange={(e) => setDados(e.target.value)}
                  placeholder="Ex: Turno A: 1.200 un/h, refugo 11%; Turno B: 980 un/h, refugo 14%... ou faça upload de CSV acima"
                  className="min-h-[100px] font-mono text-xs" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Capacidade instalada</Label>
                  <Input value={capacidade} onChange={(e) => setCapacidade(e.target.value)} className="mt-1.5"
                    placeholder="Ex: 2.500 un/h" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Equipe / turnos</Label>
                  <Input value={equipe} onChange={(e) => setEquipe(e.target.value)} className="mt-1.5"
                    placeholder="Ex: 3 turnos, 8 operadores" />
                </div>
              </div>
            </div>
          </Card>
          <Button type="submit" size="lg" className="btn-gold mx-auto px-10" disabled={loading || !canGenerate}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Orion analisando...</>
              : <><Factory className="h-4 w-4 mr-2" /> Gerar diagnóstico</>}
          </Button>
          <button
            type="button"
            onClick={() => {
              setDiag({
                oee_estimado: "62% (potencial 84%)",
                gargalos: [
                  { etapa: "Estação 3 — Extrusão", impacto: "Alto", causa_provavel: "Variação térmica do molde causando refugo de 12%", evidencia: "Refugo Turno B 14% > Turno A 11%; correlacionado a temperatura ambiente" },
                  { etapa: "Setup entre lotes", impacto: "Médio", causa_provavel: "Troca manual de ferramenta (~22min)", evidencia: "8 trocas/dia × 3 turnos = 9h paradas" },
                ],
                riscos: ["Falha sensor temperatura sem redundância", "Ausência de manutenção preditiva no motor principal"],
                recomendacoes: [
                  { acao: "Sensor IoT térmico + alerta MQTT na estação 3", prioridade: "Crítica", roi_estimado: "Redução refugo 12% → 5% (~R$ 180k/ano)", prazo: "30 dias" },
                  { acao: "SMED no setup (troca rápida)", prioridade: "Alta", roi_estimado: "+8% OEE (~R$ 220k/ano)", prazo: "60 dias" },
                  { acao: "ROS2 + visão para inspeção automática pós-extrusão", prioridade: "Média", roi_estimado: "Refugo passante zero (~R$ 90k/ano)", prazo: "90 dias" },
                ],
                integracoes_orion: ["MQTT broker para sensores", "ROSBridge p/ inspeção visual", "Dashboard OEE em tempo real"],
                first_action: "Instalar sensor térmico DS18B20 + edge gateway na estação 3 (kit Orion B2B, 7 dias).",
              });
              toast.success("Demo carregado — sem consumir tokens");
            }}
            className="text-xs text-muted-foreground hover:text-primary mx-auto -mt-2"
          >
            Ver demo com dados de exemplo (sandbox · sem robô)
          </button>
        </form>

        {diag && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-6 border-primary/30 bg-primary/5">
              <div className="text-xs uppercase tracking-wider text-primary mb-1">OEE estimado</div>
              <p className="text-2xl font-bold text-foreground">{diag.oee_estimado}</p>
            </Card>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Gargalos identificados
              </h2>
              <div className="grid gap-3">
                {diag.gargalos.map((g, i) => (
                  <Card key={i} className="p-5 border-border/40">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-semibold text-foreground">{g.etapa}</div>
                      <Badge variant="outline" className={`text-xs ${impactoColor(g.impacto)}`}>{g.impacto}</Badge>
                    </div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Causa provável</div>
                    <p className="text-foreground/85 text-sm mb-2">{g.causa_provavel}</p>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Evidência</div>
                    <p className="text-foreground/70 text-xs italic">{g.evidencia}</p>
                  </Card>
                ))}
              </div>
            </div>

            {diag.riscos?.length > 0 && (
              <Card className="p-6 border-amber-500/40 bg-amber-500/5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3">Riscos</h2>
                <ul className="space-y-1.5 text-sm">
                  {diag.riscos.map((r, i) => <li key={i} className="text-foreground/90">• {r}</li>)}
                </ul>
              </Card>
            )}

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Recomendações priorizadas
              </h2>
              <div className="grid gap-3">
                {diag.recomendacoes.map((r, i) => (
                  <Card key={i} className="p-5 border-border/40">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="font-semibold text-foreground flex-1">{r.acao}</div>
                      <Badge variant="outline" className={`text-xs ${impactoColor(r.prioridade)}`}>{r.prioridade}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                      <div>
                        <div className="uppercase tracking-wider text-muted-foreground mb-1">ROI estimado</div>
                        <p className="text-primary font-medium">{r.roi_estimado}</p>
                      </div>
                      <div>
                        <div className="uppercase tracking-wider text-muted-foreground mb-1">Prazo</div>
                        <p className="text-foreground/85">{r.prazo}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="p-6 border-border/40">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">Módulos Orion sugeridos</h2>
              <div className="flex flex-wrap gap-2">
                {diag.integracoes_orion.map((m, i) => (
                  <Badge key={i} variant="outline" className="border-primary/30 text-foreground">{m}</Badge>
                ))}
              </div>
            </Card>

            <Card className="p-6 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5">
              <div className="text-xs uppercase tracking-wider text-primary mb-1">Primeira ação</div>
              <p className="text-foreground font-medium mb-4">{diag.first_action}</p>
              <Button onClick={() => navigate("/contato")} className="btn-gold">
                Quero implementar com a equipe Orion
              </Button>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
