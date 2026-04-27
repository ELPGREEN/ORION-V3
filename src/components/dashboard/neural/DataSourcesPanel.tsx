import { useState, useEffect } from "react";
import {
  Database,
  Globe,
  Scale,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BookOpen,
  GraduationCap,
  FileText,
  BookMarked,
  Gavel,
  Briefcase,
  Shield,
  Landmark,
  Leaf,
  Laptop,
  Search,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { wrapSupabase, wrapEdgeFunction } from "@/lib/errors";

interface SourceStats {
  source: string;
  total: number;
  withEmbeddings: number;
  latest: string | null;
  contentTypes: Record<string, number>;
}

const UNIVATES_AREAS = [
  { key: "civil", label: "Direito Civil e Processual", icon: FileText },
  { key: "penal", label: "Direito Penal e Processual Penal", icon: Gavel },
  { key: "constitucional", label: "Direito Constitucional e Administrativo", icon: Landmark },
  { key: "trabalhista", label: "Direito Trabalhista e Previdenciário", icon: Briefcase },
  { key: "tributario", label: "Direito Tributário e Financeiro", icon: Scale },
  { key: "empresarial", label: "Direito Empresarial", icon: Shield },
  { key: "ambiental", label: "Direito Ambiental e Agrário", icon: Leaf },
  { key: "digital", label: "Direito Digital e LGPD", icon: Laptop },
] as const;

const EXTRACTION_TYPES = [
  { key: "conceitos", label: "Conceitos e Definições", desc: "Institutos, princípios e definições jurídicas" },
  { key: "doutrina", label: "Doutrina e Citações", desc: "Posições doutrinárias com atribuição ao autor" },
  { key: "legislacao", label: "Referências Legislativas", desc: "Artigos, leis e súmulas citados nos e-books" },
  { key: "sumarios", label: "Sumários Temáticos", desc: "Estrutura dos livros por temas e capítulos" },
] as const;

// Reuse same extraction types alias for backward compat
const UNIVATES_EXTRACTION_TYPES = EXTRACTION_TYPES;

export function DataSourcesPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState<string | null>(null);
  const [stats, setStats] = useState<SourceStats[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const [sumulasBulkProgress, setSumulasBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [sumulasStats, setSumulasStats] = useState<{ total: number; withEmbeddings: number }>({ total: 0, withEmbeddings: 0 });
  const [stfJurisBulkProgress, setStfJurisBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [stfJurisStats, setStfJurisStats] = useState<{ total: number; withEmbeddings: number }>({ total: 0, withEmbeddings: 0 });
  const [doutrinaBulkProgress, setDoutrinaBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [doutrinaStats, setDoutrinaStats] = useState<{ total: number; withEmbeddings: number }>({ total: 0, withEmbeddings: 0 });
  const [auryBulkProgress, setAuryBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [auryStats, setAuryStats] = useState<{ total: number; withEmbeddings: number }>({ total: 0, withEmbeddings: 0 });

  // Univates state
  const [univatesAreas, setUnivatesAreas] = useState<string[]>(UNIVATES_AREAS.map(a => a.key));
  const [univatesTypes, setUnivatesTypes] = useState<string[]>(UNIVATES_EXTRACTION_TYPES.map(t => t.key));
  const [univatesStats, setUnivatesStats] = useState<{ total: number; withEmbeddings: number; latest: string | null }>({
    total: 0, withEmbeddings: 0, latest: null
  });

  // CourtListener state
  const [clAreas, setClAreas] = useState<string[]>(["civil", "constitucional"]);
  const [clTypes, setClTypes] = useState<string[]>(EXTRACTION_TYPES.map(t => t.key));
  const [clStats, setClStats] = useState<{ total: number; withEmbeddings: number; latest: string | null }>({
    total: 0, withEmbeddings: 0, latest: null
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      // Parallelize all queries for performance
      const sources = ["dados_gov", "stf_bigquery"];

      const [sourceResults, univResults, clResults, sumResults, stfJurisResults, doutrinaResults, auryResults] = await Promise.all([
        // Source stats (dados_gov + stf_bigquery)
        Promise.all(sources.map(async (source) => {
          const [total, withEmb, latestRow, typeData] = await Promise.all([
            wrapSupabase(supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).eq("source", source), { source, query: "total_count" }),
            wrapSupabase(supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).eq("source", source).not("embedding", "is", null), { source, query: "with_embedding_count" }),
            wrapSupabase(supabase.from("legal_embeddings").select("created_at, content_type").eq("source", source).order("created_at", { ascending: false }).limit(1), { source, query: "latest_row" }),
            wrapSupabase(supabase.from("legal_embeddings").select("content_type").eq("source", source), { source, query: "type_data" }),
          ]);
          const contentTypes: Record<string, number> = {};
          const typeRows = (typeData.data ?? []) as Array<{ content_type: string | null }>;
          typeRows.forEach((r) => {
            const key = r.content_type || "desconhecido";
            contentTypes[key] = (contentTypes[key] || 0) + 1;
          });
          return { source, total: total.count || 0, withEmbeddings: withEmb.count || 0, latest: latestRow.data?.[0]?.created_at || null, contentTypes } as SourceStats;
        })),
        // Univates
        Promise.all([
          wrapSupabase(supabase.from("neural_knowledge_base").select("id", { count: "exact", head: true }).like("source_type", "univates_%")),
          wrapSupabase(supabase.from("neural_knowledge_base").select("id", { count: "exact", head: true }).like("source_type", "univates_%").not("embedding", "is", null)),
          wrapSupabase(supabase.from("neural_knowledge_base").select("created_at").like("source_type", "univates_%").order("created_at", { ascending: false }).limit(1)),
        ]),
        // CourtListener
        Promise.all([
          wrapSupabase(supabase.from("neural_knowledge_base").select("id", { count: "exact", head: true }).like("source_type", "courtlistener_%")),
          wrapSupabase(supabase.from("neural_knowledge_base").select("id", { count: "exact", head: true }).like("source_type", "courtlistener_%").not("embedding", "is", null)),
          wrapSupabase(supabase.from("neural_knowledge_base").select("created_at").like("source_type", "courtlistener_%").order("created_at", { ascending: false }).limit(1)),
        ]),
        // Súmulas STJ
        Promise.all([
          wrapSupabase(supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).eq("source", "sumulas_stj")),
          wrapSupabase(supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).eq("source", "sumulas_stj").not("embedding", "is", null)),
        ]),
        // STF Jurisprudência
        Promise.all([
          wrapSupabase(supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).eq("source", "stf_jurisprudencia_tematica")),
          wrapSupabase(supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).eq("source", "stf_jurisprudencia_tematica").not("embedding", "is", null)),
        ]),
        // Doutrina
        Promise.all([
          wrapSupabase(supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).eq("source", "doutrina_processual_penal")),
          wrapSupabase(supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).eq("source", "doutrina_processual_penal").not("embedding", "is", null)),
        ]),
        // Aury Lopes
        Promise.all([
          wrapSupabase(supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).eq("source", "aury_lopes_processual")),
          wrapSupabase(supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).eq("source", "aury_lopes_processual").not("embedding", "is", null)),
        ]),
      ]);

      setStats(sourceResults);

      const [univTotal, univEmb, univLatest] = univResults;
      setUnivatesStats({ total: univTotal.count || 0, withEmbeddings: univEmb.count || 0, latest: univLatest.data?.[0]?.created_at || null });

      const [{ count: clTotal }, { count: clEmb }, { data: clLatest }] = clResults;
      setClStats({ total: clTotal || 0, withEmbeddings: clEmb || 0, latest: clLatest?.[0]?.created_at || null });

      const [{ count: sumTotal }, { count: sumEmb }] = sumResults;
      setSumulasStats({ total: sumTotal || 0, withEmbeddings: sumEmb || 0 });

      const [{ count: stfJurisTotal }, { count: stfJurisEmb }] = stfJurisResults;
      setStfJurisStats({ total: stfJurisTotal || 0, withEmbeddings: stfJurisEmb || 0 });

      const [{ count: doutrinaTotal }, { count: doutrinaEmb }] = doutrinaResults;
      setDoutrinaStats({ total: doutrinaTotal || 0, withEmbeddings: doutrinaEmb || 0 });

      const [{ count: auryTotal }, { count: auryEmb }] = auryResults;
      setAuryStats({ total: auryTotal || 0, withEmbeddings: auryEmb || 0 });
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }

  async function triggerIngestion(source: "dados_gov" | "stf_bigquery") {
    setIngesting(source);
    try {
      const body = source === "dados_gov"
        ? { action: "senado_api", limit: 20, fontes: ["camara", "senado"] }
        : { action: "jurisprudencia_stf", limit: 30, anoInicio: 2020 };

      const { data, error } = await supabase.functions.invoke("ingest-legal", { body });

      if (error) throw error;

      setLastResult({ source, ...data });
      toast({
        title: `Ingestão ${source === "dados_gov" ? "Dados Gov" : "STF BigQuery"} concluída`,
        description: `${data?.inseridos || 0} novos registros inseridos, ${data?.duplicados || 0} duplicados ignorados.`,
      });

      loadStats();
    } catch (error: any) {
      toast({
        title: "Erro na ingestão",
        description: error.message || "Falha ao executar ingestão",
        variant: "destructive",
      });
    } finally {
      setIngesting(null);
    }
  }

  async function triggerUnivatesIngestion() {
    if (univatesAreas.length === 0 || univatesTypes.length === 0) {
      toast({
        title: "Selecione ao menos uma área e um tipo",
        variant: "destructive",
      });
      return;
    }

    setIngesting("univates");
    try {
      const { data, error } = await supabase.functions.invoke("ingest-legal", {
        body: {
          areas: univatesAreas,
          extractionTypes: univatesTypes,
          maxBooksPerArea: 3,
          maxTermosPerArea: 2,
        },
      });

      if (error) throw error;

      setLastResult({ source: "univates", ...data });
      toast({
        title: "Ingestão Biblioteca Univates concluída",
        description: `${data?.inseridos_knowledge_base || 0} conteúdos indexados, ${data?.livros_encontrados || 0} livros processados.`,
      });

      loadStats();
    } catch (error: any) {
      toast({
        title: "Erro na ingestão Univates",
        description: error.message || "Falha ao acessar biblioteca digital",
        variant: "destructive",
      });
    } finally {
      setIngesting(null);
    }
  }

  async function triggerCourtListenerIngestion() {
    if (clAreas.length === 0 || clTypes.length === 0) {
      toast({ title: "Selecione ao menos uma área e um tipo", variant: "destructive" });
      return;
    }
    setIngesting("courtlistener");
    try {
      const { data, error } = await supabase.functions.invoke("courtlistener-search", {
        body: { areas: clAreas, extractionTypes: clTypes, maxCasesPerArea: 3 },
      });
      if (error) throw error;
      setLastResult({ source: "courtlistener", ...data });
      toast({
        title: "Ingestão CourtListener concluída",
        description: `${data?.inseridos || 0} conteúdos indexados, ${data?.casos_encontrados || 0} casos encontrados.`,
      });
      loadStats();
    } catch (error: any) {
      toast({ title: "Erro na ingestão CourtListener", description: error.message || "Falha ao acessar CourtListener", variant: "destructive" });
    } finally {
      setIngesting(null);
    }
  }

  async function triggerSumulasBulkIngest() {
    setIngesting("sumulas_bulk");
    setSumulasBulkProgress(null);
    try {
      const response = await fetch("/docs/sumulas-stj-completas.txt");
      if (!response.ok) throw new Error("Arquivo sumulas-stj-completas.txt não encontrado");
      const rawText = await response.text();

      let startFrom = 0;
      const batchSize = 30;
      let totalProcessed = 0;
      let totalParsed = 0;

      while (true) {
        const { data, error } = await supabase.functions.invoke("ingest-legal", {
          body: { text: rawText, batchSize, startFrom, generateEmbeddings: true },
        });
        if (error) throw error;

        totalParsed = data.totalAfterFilter || 0;
        totalProcessed += data.batchProcessed || 0;
        setSumulasBulkProgress({ current: Math.min(startFrom + batchSize, totalParsed), total: totalParsed });

        if (!data.nextStartFrom) break;
        startFrom = data.nextStartFrom;
      }

      setLastResult({ source: "sumulas_bulk", totalParsed, totalProcessed });
      toast({
        title: "Ingestão Súmulas STJ concluída!",
        description: `${totalParsed} súmulas parseadas e ingeridas com embeddings.`,
      });
      loadStats();
    } catch (error: any) {
      toast({ title: "Erro na ingestão de súmulas", description: error.message, variant: "destructive" });
    } finally {
      setIngesting(null);
      setSumulasBulkProgress(null);
    }
  }

  async function triggerStfJurisIngest() {
    setIngesting("stf_juris");
    setStfJurisBulkProgress(null);
    try {
      const response = await fetch("/docs/jurisprudencia-stf-penal.txt");
      if (!response.ok) throw new Error("Arquivo jurisprudencia-stf-penal.txt não encontrado");
      const rawText = await response.text();

      let startFrom = 0;
      const batchSize = 40;
      let totalProcessed = 0;
      let totalParsed = 0;

      while (true) {
        const { data, error } = await supabase.functions.invoke("ingest-legal", {
          body: { text: rawText, batchSize, startFrom, generateEmbeddings: true },
        });
        if (error) throw error;

        totalParsed = data.totalParsed || 0;
        totalProcessed += data.batchProcessed || 0;
        setStfJurisBulkProgress({ current: Math.min(startFrom + batchSize, totalParsed), total: totalParsed });

        if (!data.nextStartFrom) break;
        startFrom = data.nextStartFrom;
      }

      setLastResult({ source: "stf_juris", totalParsed, totalProcessed });
      toast({
        title: "Ingestão Jurisprudência STF concluída!",
        description: `${totalParsed} julgados parseados e ingeridos com embeddings.`,
      });
      loadStats();
    } catch (error: any) {
      toast({ title: "Erro na ingestão STF", description: error.message, variant: "destructive" });
    } finally {
      setIngesting(null);
      setStfJurisBulkProgress(null);
    }
  }

  async function triggerDoutrinaPenalIngest() {
    setIngesting("doutrina_penal");
    setDoutrinaBulkProgress(null);
    try {
      const response = await fetch("/docs/nocoes-direito-processual-penal.txt");
      if (!response.ok) throw new Error("Arquivo nocoes-direito-processual-penal.txt não encontrado");
      const rawText = await response.text();

      let startFrom = 0;
      const batchSize = 30;
      let totalProcessed = 0;
      let totalParsed = 0;

      while (true) {
        const { data, error } = await supabase.functions.invoke("ingest-legal", {
          body: { text: rawText, batchSize, startFrom, generateEmbeddings: true },
        });
        if (error) throw error;

        totalParsed = data.totalParsed || 0;
        totalProcessed += data.batchProcessed || 0;
        setDoutrinaBulkProgress({ current: Math.min(startFrom + batchSize, totalParsed), total: totalParsed });

        if (!data.nextStartFrom) break;
        startFrom = data.nextStartFrom;
      }

      setLastResult({ source: "doutrina_penal", totalParsed, totalProcessed });
      toast({
        title: "Ingestão Doutrina Processual Penal concluída!",
        description: `${totalParsed} seções parseadas e ingeridas com embeddings.`,
      });
      loadStats();
    } catch (error: any) {
      toast({ title: "Erro na ingestão de doutrina", description: error.message, variant: "destructive" });
    } finally {
      setIngesting(null);
      setDoutrinaBulkProgress(null);
    }
  }

  async function triggerAuryLopesIngest() {
    setIngesting("aury_lopes");
    setAuryBulkProgress(null);
    try {
      const response = await fetch("/docs/aury-lopes-direito-processual-penal.txt");
      if (!response.ok) throw new Error("Arquivo aury-lopes-direito-processual-penal.txt não encontrado");
      const rawText = await response.text();

      let startFrom = 0;
      const batchSize = 25;
      let totalProcessed = 0;
      let totalParsed = 0;

      while (true) {
        const { data, error } = await supabase.functions.invoke("ingest-legal", {
          body: { text: rawText, batchSize, startFrom, generateEmbeddings: true },
        });
        if (error) throw error;

        totalParsed = data.totalParsed || 0;
        totalProcessed += data.batchProcessed || 0;
        setAuryBulkProgress({ current: Math.min(startFrom + batchSize, totalParsed), total: totalParsed });

        if (!data.nextStartFrom) break;
        startFrom = data.nextStartFrom;
      }

      setLastResult({ source: "aury_lopes", totalParsed, totalProcessed });
      toast({
        title: "Ingestão Aury Lopes Jr. concluída!",
        description: `${totalParsed} seções parseadas e ingeridas com embeddings.`,
      });
      loadStats();
    } catch (error: any) {
      toast({ title: "Erro na ingestão Aury Lopes", description: error.message, variant: "destructive" });
    } finally {
      setIngesting(null);
      setAuryBulkProgress(null);
    }
  }

  function toggleArea(key: string) {
    setUnivatesAreas(prev =>
      prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]
    );
  }

  function toggleType(key: string) {
    setUnivatesTypes(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    );
  }

  function toggleClArea(key: string) {
    setClAreas(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);
  }

  function toggleClType(key: string) {
    setClTypes(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]);
  }

  const sourceConfig = {
    dados_gov: {
      label: "Dados Abertos (Câmara/Senado)",
      icon: Globe,
      description: "APIs diretas: Proposições da Câmara e Matérias do Senado Federal",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      badgeColor: "bg-emerald-500/20 text-emerald-400",
    },
    stf_bigquery: {
      label: "STF Corte Aberta (BigQuery)",
      icon: Scale,
      description: "Decisões do STF via Google BigQuery (basedosdados.br_stf_corte_aberta)",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      badgeColor: "bg-blue-500/20 text-blue-400",
    },
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const univatesEmbPercent = univatesStats.total > 0
    ? Math.round((univatesStats.withEmbeddings / univatesStats.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Fontes de Dados Externas</h3>
        </div>
        <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["dados_gov", "stf_bigquery"] as const).map((sourceKey) => {
          const config = sourceConfig[sourceKey];
          const stat = stats.find((s) => s.source === sourceKey);
          const Icon = config.icon;
          const embPercent = stat && stat.total > 0
            ? Math.round((stat.withEmbeddings / stat.total) * 100)
            : 0;

          return (
            <Card key={sourceKey} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {config.description}
                      </CardDescription>
                    </div>
                  </div>
                  {stat && stat.total > 0 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                    <p className="text-2xl font-bold text-foreground">{stat?.total || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Registros</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                    <p className="text-2xl font-bold text-foreground">{stat?.withEmbeddings || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Com Embedding</p>
                  </div>
                </div>

                {stat && stat.total > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Vetorização</span>
                      <span>{embPercent}%</span>
                    </div>
                    <Progress value={embPercent} className="h-1.5" />
                  </div>
                )}

                {stat && Object.keys(stat.contentTypes).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(stat.contentTypes).map(([type, count]) => (
                      <Badge key={type} variant="outline" className="text-[10px]">
                        {type.replace(/_/g, " ")}: {count}
                      </Badge>
                    ))}
                  </div>
                )}

                {stat?.latest && (
                  <p className="text-[10px] text-muted-foreground">
                    Última ingestão: {new Date(stat.latest).toLocaleString("pt-BR")}
                  </p>
                )}

                <Button
                  size="sm"
                  className="w-full"
                  variant={stat && stat.total > 0 ? "outline" : "default"}
                  onClick={() => triggerIngestion(sourceKey)}
                  disabled={ingesting !== null}
                >
                  {ingesting === sourceKey ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Ingerindo...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-1" />
                      {stat && stat.total > 0 ? "Executar Nova Ingestão" : "Iniciar Ingestão"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ========== BIBLIOTECA UNIVATES ========== */}
      <Card className="bg-card border-border border-l-4 border-l-purple-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <GraduationCap className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Biblioteca Univates — Minha Biblioteca
                  <Badge className="bg-purple-500/20 text-purple-400 text-[10px]">E-books</Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Extração e indexação de conteúdo jurídico de e-books acadêmicos com IA
                </CardDescription>
              </div>
            </div>
            {univatesStats.total > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <BookOpen className="h-4 w-4 text-purple-400 shrink-0" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-foreground">{univatesStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Conteúdos</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-foreground">{univatesStats.withEmbeddings}</p>
              <p className="text-[10px] text-muted-foreground">Com Embedding</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-purple-400">{univatesAreas.length}</p>
              <p className="text-[10px] text-muted-foreground">Áreas</p>
            </div>
          </div>

          {univatesStats.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Vetorização</span>
                <span>{univatesEmbPercent}%</span>
              </div>
              <Progress value={univatesEmbPercent} className="h-1.5" />
            </div>
          )}

          {univatesStats.latest && (
            <p className="text-[10px] text-muted-foreground">
              Última ingestão: {new Date(univatesStats.latest).toLocaleString("pt-BR")}
            </p>
          )}

          {/* Áreas Jurídicas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Áreas do Direito</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-muted-foreground"
                onClick={() =>
                  setUnivatesAreas(prev =>
                    prev.length === UNIVATES_AREAS.length ? [] : UNIVATES_AREAS.map(a => a.key)
                  )
                }
              >
                {univatesAreas.length === UNIVATES_AREAS.length ? "Desmarcar todas" : "Selecionar todas"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {UNIVATES_AREAS.map(area => {
                const AreaIcon = area.icon;
                return (
                  <label
                    key={area.key}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      univatesAreas.includes(area.key)
                        ? "bg-purple-500/10 text-purple-300"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={univatesAreas.includes(area.key)}
                      onCheckedChange={() => toggleArea(area.key)}
                      className="h-3.5 w-3.5"
                    />
                    <AreaIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{area.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Tipos de Extração */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Tipos de Extração IA</p>
            <div className="grid grid-cols-2 gap-1.5">
              {UNIVATES_EXTRACTION_TYPES.map(type => (
                <label
                  key={type.key}
                  className={`flex flex-col gap-0.5 p-2 rounded-lg cursor-pointer transition-colors ${
                    univatesTypes.includes(type.key)
                      ? "bg-purple-500/10 border border-purple-500/30"
                      : "bg-muted/30 border border-transparent hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={univatesTypes.includes(type.key)}
                      onCheckedChange={() => toggleType(type.key)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs font-medium text-foreground">{type.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground pl-5">{type.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Trigger Button */}
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-primary-foreground"
            onClick={triggerUnivatesIngestion}
            disabled={ingesting !== null || univatesAreas.length === 0 || univatesTypes.length === 0}
          >
            {ingesting === "univates" ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Extraindo e-books...
              </>
            ) : (
              <>
                <BookMarked className="h-4 w-4 mr-1" />
                Iniciar Extração ({univatesAreas.length} áreas × {univatesTypes.length} tipos)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ========== COURTLISTENER ========== */}
      <Card className="bg-card border-border border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Search className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  CourtListener — RECAP Archive
                  <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">US Courts</Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Jurisprudência americana: opinions, dockets e precedentes de tribunais federais e estaduais
                </CardDescription>
              </div>
            </div>
            {clStats.total > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Scale className="h-4 w-4 text-amber-400 shrink-0" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-foreground">{clStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Conteúdos</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-foreground">{clStats.withEmbeddings}</p>
              <p className="text-[10px] text-muted-foreground">Com Embedding</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-amber-400">{clAreas.length}</p>
              <p className="text-[10px] text-muted-foreground">Áreas</p>
            </div>
          </div>

          {clStats.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Vetorização</span>
                <span>{clStats.total > 0 ? Math.round((clStats.withEmbeddings / clStats.total) * 100) : 0}%</span>
              </div>
              <Progress value={clStats.total > 0 ? Math.round((clStats.withEmbeddings / clStats.total) * 100) : 0} className="h-1.5" />
            </div>
          )}

          {clStats.latest && (
            <p className="text-[10px] text-muted-foreground">
              Última ingestão: {new Date(clStats.latest).toLocaleString("pt-BR")}
            </p>
          )}

          {/* Áreas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Áreas do Direito</p>
              <Button
                variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground"
                onClick={() => setClAreas(prev => prev.length === UNIVATES_AREAS.length ? [] : UNIVATES_AREAS.map(a => a.key))}
              >
                {clAreas.length === UNIVATES_AREAS.length ? "Desmarcar todas" : "Selecionar todas"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {UNIVATES_AREAS.map(area => {
                const AreaIcon = area.icon;
                return (
                  <label
                    key={area.key}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      clAreas.includes(area.key)
                        ? "bg-amber-500/10 text-amber-300"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={clAreas.includes(area.key)}
                      onCheckedChange={() => toggleClArea(area.key)}
                      className="h-3.5 w-3.5"
                    />
                    <AreaIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{area.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Tipos de Extração */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Tipos de Extração IA</p>
            <div className="grid grid-cols-2 gap-1.5">
              {EXTRACTION_TYPES.map(type => (
                <label
                  key={type.key}
                  className={`flex flex-col gap-0.5 p-2 rounded-lg cursor-pointer transition-colors ${
                    clTypes.includes(type.key)
                      ? "bg-amber-500/10 border border-amber-500/30"
                      : "bg-muted/30 border border-transparent hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={clTypes.includes(type.key)}
                      onCheckedChange={() => toggleClType(type.key)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs font-medium text-foreground">{type.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground pl-5">{type.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Trigger */}
          <Button
            className="w-full bg-amber-600 hover:bg-amber-700 text-primary-foreground"
            onClick={triggerCourtListenerIngestion}
            disabled={ingesting !== null || clAreas.length === 0 || clTypes.length === 0}
          >
            {ingesting === "courtlistener" ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Pesquisando CourtListener...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-1" />
                Pesquisar CourtListener ({clAreas.length} áreas × {clTypes.length} tipos)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ========== SÚMULAS STJ BULK ========== */}
      <Card className="bg-card border-border border-l-4 border-l-red-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-500/10">
                <BookMarked className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Súmulas STJ — Ingestão Completa
                  <Badge className="bg-red-500/20 text-red-400 text-[10px]">676 Súmulas</Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Todas as súmulas do STJ com enunciados, precedentes e referências legislativas
                </CardDescription>
              </div>
            </div>
            {sumulasStats.total > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Gavel className="h-4 w-4 text-red-400 shrink-0" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-foreground">{sumulasStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Na Base</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-foreground">{sumulasStats.withEmbeddings}</p>
              <p className="text-[10px] text-muted-foreground">Com Embedding</p>
            </div>
          </div>

          {sumulasStats.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Vetorização</span>
                <span>{Math.round((sumulasStats.withEmbeddings / sumulasStats.total) * 100)}%</span>
              </div>
              <Progress value={Math.round((sumulasStats.withEmbeddings / sumulasStats.total) * 100)} className="h-1.5" />
            </div>
          )}

          {sumulasBulkProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span>{sumulasBulkProgress.current}/{sumulasBulkProgress.total}</span>
              </div>
              <Progress value={Math.round((sumulasBulkProgress.current / sumulasBulkProgress.total) * 100)} className="h-1.5" />
            </div>
          )}

          <Button
            className="w-full bg-red-600 hover:bg-red-700 text-primary-foreground"
            onClick={triggerSumulasBulkIngest}
            disabled={ingesting !== null}
          >
            {ingesting === "sumulas_bulk" ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Ingerindo Súmulas...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                {sumulasStats.total > 0 ? "Atualizar Súmulas (676)" : "Ingerir Todas as Súmulas (676)"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ========== JURISPRUDÊNCIA TEMÁTICA STF ========== */}
      <Card className="bg-card border-border border-l-4 border-l-indigo-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Landmark className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Jurisprudência Temática STF — Penal
                  <Badge className="bg-indigo-500/20 text-indigo-400 text-[10px]">27K+ linhas</Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Coletânea Temática de Jurisprudência: Direito Penal e Processual Penal do STF
                </CardDescription>
              </div>
            </div>
            {stfJurisStats.total > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Landmark className="h-4 w-4 text-indigo-400 shrink-0" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-foreground">{stfJurisStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Julgados</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-foreground">{stfJurisStats.withEmbeddings}</p>
              <p className="text-[10px] text-muted-foreground">Com Embedding</p>
            </div>
          </div>

          {stfJurisStats.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Vetorização</span>
                <span>{Math.round((stfJurisStats.withEmbeddings / stfJurisStats.total) * 100)}%</span>
              </div>
              <Progress value={Math.round((stfJurisStats.withEmbeddings / stfJurisStats.total) * 100)} className="h-1.5" />
            </div>
          )}

          {stfJurisBulkProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span>{stfJurisBulkProgress.current}/{stfJurisBulkProgress.total}</span>
              </div>
              <Progress value={Math.round((stfJurisBulkProgress.current / stfJurisBulkProgress.total) * 100)} className="h-1.5" />
            </div>
          )}

          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-primary-foreground"
            onClick={triggerStfJurisIngest}
            disabled={ingesting !== null}
          >
            {ingesting === "stf_juris" ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Ingerindo Jurisprudência STF...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                {stfJurisStats.total > 0 ? "Atualizar Jurisprudência STF" : "Ingerir Jurisprudência STF"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ========== DOUTRINA PROCESSUAL PENAL ========== */}
      <Card className="bg-card border-border border-l-4 border-l-teal-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-teal-500/10">
                <BookOpen className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  Doutrina — Dir. Processual Penal
                  <Badge className="bg-teal-500/20 text-teal-400 text-[10px]">1749 linhas</Badge>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Noções de Direito Processual Penal — Princípios Processuais Penais (Douglas Vargas)
                </CardDescription>
              </div>
            </div>
            {doutrinaStats.total > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <BookOpen className="h-4 w-4 text-teal-400 shrink-0" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-foreground">{doutrinaStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Seções</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-foreground">{doutrinaStats.withEmbeddings}</p>
              <p className="text-[10px] text-muted-foreground">Com Embedding</p>
            </div>
          </div>

          {doutrinaStats.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Vetorização</span>
                <span>{Math.round((doutrinaStats.withEmbeddings / doutrinaStats.total) * 100)}%</span>
              </div>
              <Progress value={Math.round((doutrinaStats.withEmbeddings / doutrinaStats.total) * 100)} className="h-1.5" />
            </div>
          )}

          {doutrinaBulkProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span>{doutrinaBulkProgress.current}/{doutrinaBulkProgress.total}</span>
              </div>
              <Progress value={Math.round((doutrinaBulkProgress.current / doutrinaBulkProgress.total) * 100)} className="h-1.5" />
            </div>
          )}

          <Button
            className="w-full bg-teal-600 hover:bg-teal-700 text-primary-foreground"
            onClick={triggerDoutrinaPenalIngest}
            disabled={ingesting !== null}
          >
            {ingesting === "doutrina_penal" ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Ingerindo Doutrina...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                {doutrinaStats.total > 0 ? "Atualizar Doutrina Penal" : "Ingerir Doutrina Processual Penal"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Aury Lopes Jr. Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Doutrina — Aury Lopes Jr.</CardTitle>
              <CardDescription className="text-[10px]">
                Direito Processual Penal, 16ª ed. (2019) — Saraiva
              </CardDescription>
            </div>
            {auryStats.total > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-foreground">{auryStats.total}</p>
              <p className="text-[10px] text-muted-foreground">Seções</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-foreground">{auryStats.withEmbeddings}</p>
              <p className="text-[10px] text-muted-foreground">Com Embedding</p>
            </div>
          </div>

          {auryStats.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Vetorização</span>
                <span>{Math.round((auryStats.withEmbeddings / auryStats.total) * 100)}%</span>
              </div>
              <Progress value={Math.round((auryStats.withEmbeddings / auryStats.total) * 100)} className="h-1.5" />
            </div>
          )}

          {auryBulkProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span>{auryBulkProgress.current}/{auryBulkProgress.total}</span>
              </div>
              <Progress value={Math.round((auryBulkProgress.current / auryBulkProgress.total) * 100)} className="h-1.5" />
            </div>
          )}

          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-primary-foreground"
            onClick={triggerAuryLopesIngest}
            disabled={ingesting !== null}
          >
            {ingesting === "aury_lopes" ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Ingerindo Aury Lopes...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                {auryStats.total > 0 ? "Atualizar Aury Lopes" : "Ingerir Aury Lopes Jr."}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {lastResult && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Último Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-auto max-h-40 text-muted-foreground">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="py-3 px-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Dados Gov:</strong> Usa APIs diretas da Câmara e do Senado (dados.gov.br requer autenticação gov.br).
              </p>
              <p>
                <strong>STF BigQuery:</strong> Usa <code>GOOGLE_SERVICE_ACCOUNT_KEY</code> já configurada para acessar o dataset <code>basedosdados.br_stf_corte_aberta.decisoes</code>.
              </p>
              <p>
                <strong>Biblioteca Univates:</strong> Acessa a biblioteca digital via <code>UNIVATES_BIBLIOTECA_URL</code> para extrair conceitos, doutrina e referências de e-books jurídicos. Os conteúdos são inseridos na <code>neural_knowledge_base</code> para vetorização automática.
              </p>
              <p>
                <strong>CourtListener:</strong> Usa <code>COURTLISTENER_API_KEY</code> para pesquisar jurisprudência americana (opinions, dockets, precedentes) via REST API v4. Extrai conceitos, doutrina comparada e referências legislativas com análise IA.
              </p>
              <p>
                Fontes são ingeridas automaticamente pelo cron <code>auto-evolution-cron</code> a cada 4 horas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
