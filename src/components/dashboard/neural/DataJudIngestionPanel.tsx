import { useState, useEffect } from "react";
import { Database, Play, Loader2, CheckCircle2, AlertCircle, RefreshCw, History, Trash2, BookOpen, Scale, Building2, Globe, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useIngestionStatus } from "@/hooks/useIngestionStatus";
import { supabase } from "@/integrations/supabase/client";
import { 
  ingestUnified, 
  getVectorStoreStats, 
  TRIBUNAIS_DISPONIVEIS,
  CODIGOS_LEGAIS_DISPONIVEIS,
  ingestCodigosLegais,
  type UnifiedIngestionResult,
  type CodigosIngestionResult,
  type TribunalProgress,
} from "@/lib/api";

interface VectorStats {
  total: number;
  bySource: Record<string, number>;
  byType: Record<string, number>;
  lastUpdated: string | null;
}

export function DataJudIngestionPanel() {
  const { toast } = useToast();
  const { 
    currentJob, 
    isRunning, 
    startJob, 
    completeJob, 
    failJob, 
    retryJob,
    cancelJob,
    getRecentJobs,
    clearJobs 
  } = useIngestionStatus();
  
  const [loading, setLoading] = useState(false);
  const [loadingCodigos, setLoadingCodigos] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState<VectorStats | null>(null);
  const [lastResult, setLastResult] = useState<UnifiedIngestionResult | null>(null);
  const [lastCodigosResult, setLastCodigosResult] = useState<CodigosIngestionResult | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [tribunalProgress, setTribunalProgress] = useState<TribunalProgress[]>([]);
  const [selectedCodigos, setSelectedCodigos] = useState<string[]>(["codigo_penal", "codigo_civil", "clt"]);
  const [includeJurisprudencia, setIncludeJurisprudencia] = useState(true);
  const [loadingSenado, setLoadingSenado] = useState(false);
  const [senadoResult, setSenadoResult] = useState<Record<string, any> | null>(null);
  const [selectedSenadoTypes, setSelectedSenadoTypes] = useState<string[]>(["contratos", "licitacoes", "avencas", "empresas"]);
  const [loadingSenadoApi, setLoadingSenadoApi] = useState(false);
  const [senadoApiResult, setSenadoApiResult] = useState<Record<string, any> | null>(null);
  const [loadingUnivates, setLoadingUnivates] = useState(false);
  const [univatesResult, setUnivatesResult] = useState<any>(null);
  const [selectedApiEndpoints, setSelectedApiEndpoints] = useState<string[]>(["escritorios", "terceirizados", "notas_empenho", "atas_registro_preco"]);

  // Config state - persist in localStorage
  const [selectedTribunais, setSelectedTribunais] = useState<string[]>(() => {
    const saved = localStorage.getItem("datajud_tribunais");
    return saved ? JSON.parse(saved) : ["stj", "tjrs", "tjsp"];
  });
  const [diasAtras, setDiasAtras] = useState(() => {
    const saved = localStorage.getItem("datajud_dias");
    return saved ? parseInt(saved) : 15;
  });
  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem("datajud_size");
    return saved ? parseInt(saved) : 30;
  });
  const [generateEmbeddings, setGenerateEmbeddings] = useState(() => {
    const saved = localStorage.getItem("datajud_embeddings");
    return saved !== "false";
  });

  // Persist config changes
  useEffect(() => {
    localStorage.setItem("datajud_tribunais", JSON.stringify(selectedTribunais));
  }, [selectedTribunais]);
  
  useEffect(() => {
    localStorage.setItem("datajud_dias", diasAtras.toString());
  }, [diasAtras]);
  
  useEffect(() => {
    localStorage.setItem("datajud_size", size.toString());
  }, [size]);
  
  useEffect(() => {
    localStorage.setItem("datajud_embeddings", generateEmbeddings.toString());
  }, [generateEmbeddings]);

  // Load stats on mount
  useEffect(() => {
    handleLoadStats();
  }, []);

  // Show current job status if running
  useEffect(() => {
    if (currentJob && currentJob.status === "running") {
      setLoading(true);
    }
  }, [currentJob]);

  const toggleTribunal = (id: string) => {
    setSelectedTribunais(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const toggleCodigo = (id: string) => {
    setSelectedCodigos(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleRunCodigosIngestion = async () => {
    if (selectedCodigos.length === 0) {
      toast({ title: "Selecione ao menos um código", variant: "destructive" });
      return;
    }
    setLoadingCodigos(true);
    try {
      const result = await ingestCodigosLegais({
        codigos: selectedCodigos,
        includeJurisprudencia,
        jurisprudenciaSize: 3,
      });
      setLastCodigosResult(result);
      if (result.success) {
        toast({
          title: "Ingestão de Códigos concluída!",
          description: `${result.totalArtigos} artigos + ${result.totalJurisprudencia} jurisprudência ingeridos`,
        });
        handleLoadStats();
      } else {
        toast({ title: "Erro na ingestão de códigos", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erro ao ingerir códigos legais", variant: "destructive" });
    } finally {
      setLoadingCodigos(false);
    }
  };

  const handleLoadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await getVectorStoreStats();
      setStats(data);
    } catch (error) {
      toast({ title: "Erro ao carregar estatísticas", variant: "destructive" });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleRunIngestion = async () => {
    if (selectedTribunais.length === 0) {
      toast({ title: "Selecione ao menos um tribunal", variant: "destructive" });
      return;
    }

    const jobId = startJob("datajud", selectedTribunais);
    setLoading(true);
    setBatchProgress(null);
    setTribunalProgress([]);
    
    try {
      const result = await ingestUnified(
        {
          mode: "datajud",
          tribunais: selectedTribunais,
          diasAtras,
          size,
          generateEmbeddings,
          enableJuit: false,
        },
        (currentBatch, totalBatches, partialResult) => {
          setBatchProgress({ current: currentBatch, total: totalBatches });
          setLastResult(partialResult);
        },
        (progress) => {
          setTribunalProgress(progress);
        }
      );

      setLastResult(result);
      setBatchProgress(null);

      if (result.success) {
        completeJob(jobId, result.stats);
        toast({ 
          title: "Ingestão concluída!", 
          description: `${result.stats.totalInseridos} novos documentos, ${result.stats.totalDuplicados} duplicatas ignoradas` 
        });
        handleLoadStats();
      } else {
        failJob(jobId, result.error || "Erro desconhecido");
        toast({ title: "Erro na ingestão", description: result.error, variant: "destructive" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      failJob(jobId, errorMessage);
      toast({ title: "Erro ao executar ingestão", variant: "destructive" });
    } finally {
      setLoading(false);
      setBatchProgress(null);
    }
  };

  const SENADO_TYPES = [
    { id: "contratos", label: "Contratos", desc: "2.395 contratos administrativos", file: "senado_contratos.csv" },
    { id: "avencas", label: "Avenças", desc: "3.851 avenças e notas de empenho", file: "senado_avencas.csv" },
    { id: "licitacoes", label: "Licitações", desc: "2.867 processos licitatórios", file: "senado_licitacoes.csv" },
    { id: "empresas", label: "Empresas", desc: "5.028 empresas contratadas", file: "senado_empresas.csv" },
  ];

  const handleSenadoIngestion = async () => {
    if (selectedSenadoTypes.length === 0) {
      toast({ title: "Selecione ao menos um tipo", variant: "destructive" });
      return;
    }
    setLoadingSenado(true);
    setSenadoResult(null);
    const results: Record<string, any> = {};

    for (const type of selectedSenadoTypes) {
      const config = SENADO_TYPES.find(t => t.id === type);
      if (!config) continue;

      try {
        // Fetch CSV from public folder
        const csvResp = await fetch(`/data/${config.file}`);
        if (!csvResp.ok) {
          results[type] = { error: `CSV not found: ${config.file}` };
          continue;
        }
        const csvText = await csvResp.text();

        // Send in batches of 200
        let offset = 0;
        const batchSize = 200;
        let totalInserted = 0;
        let totalSkipped = 0;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase.functions.invoke("ingest-legal", {
            body: { action: "senado_bulk", type, csv: csvText, offset, batchSize },
          });

          if (error) {
            results[type] = { error: error.message, inserted: totalInserted };
            break;
          }

          totalInserted += data.inserted || 0;
          totalSkipped += data.skipped || 0;
          hasMore = data.has_more;
          offset = data.next_offset || offset + batchSize;
        }

        results[type] = { inserted: totalInserted, skipped: totalSkipped, success: true };
        toast({ title: `${config.label}: ${totalInserted} registros ingeridos` });
      } catch (err) {
        results[type] = { error: err instanceof Error ? err.message : "Erro" };
      }
    }

    setSenadoResult(results);
    setLoadingSenado(false);
    handleLoadStats();
  };

  const SENADO_API_ENDPOINTS = [
    { id: "escritorios", label: "Escritórios de Apoio", desc: "Escritórios dos senadores em exercício" },
    { id: "terceirizados", label: "Terceirizados", desc: "~3.150 funcionários terceirizados" },
    { id: "notas_empenho", label: "Notas de Empenho", desc: "~3.850 notas de empenho" },
    { id: "atas_registro_preco", label: "Atas Registro de Preço", desc: "~640 atas de registro de preço" },
    { id: "despesas_ceaps", label: "CEAPS 2024", desc: "Cota parlamentar (despesas)" },
    { id: "auxilio_moradia", label: "Auxílio Moradia", desc: "Moradia e transporte dos senadores" },
    { id: "quantitativos", label: "Quantitativos", desc: "Dados quantitativos de parlamentares" },
    { id: "menores_aprendizes", label: "Menores Aprendizes", desc: "Programa de aprendizagem" },
  ];

  const handleSenadoApiIngestion = async () => {
    if (selectedApiEndpoints.length === 0) {
      toast({ title: "Selecione ao menos um endpoint", variant: "destructive" });
      return;
    }
    setLoadingSenadoApi(true);
    setSenadoApiResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ingest-legal", {
        body: { action: "senado_api", endpoints: selectedApiEndpoints },
      });

      if (error) {
        toast({ title: "Erro na ingestão API Senado", description: error.message, variant: "destructive" });
        setSenadoApiResult({ error: error.message });
      } else {
        setSenadoApiResult(data.results);
        const totalInserted = Object.values(data.results as Record<string, any>).reduce(
          (sum: number, r: any) => sum + (r.inserted || 0), 0
        );
        toast({
          title: `API Senado: ${totalInserted} registros ingeridos`,
          description: `${selectedApiEndpoints.length} endpoints processados`,
        });
        handleLoadStats();
      }
    } catch (err) {
      toast({ title: "Erro na ingestão", variant: "destructive" });
    } finally {
      setLoadingSenadoApi(false);
    }
  };

  const handleUnivatesIngestion = async () => {
    setLoadingUnivates(true);
    setUnivatesResult(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("ingest-legal", {
        body: {
          temas: [
            "direito civil brasileiro",
            "direito penal",
            "direito trabalhista CLT",
            "direito constitucional",
            "direito do consumidor CDC",
          ],
          maxBooksPerTema: 10,
          generateEmbeddings: true,
          userId: user?.id,
        },
      });

      if (error) {
        toast({ title: "Erro na ingestão Univates", description: error.message, variant: "destructive" });
        setUnivatesResult({ error: error.message });
      } else {
        setUnivatesResult(data);
        toast({
          title: `Univates: ${data.totalInseridos} registros ingeridos`,
          description: `${data.totalTemas} temas processados, ${data.totalDuplicados} duplicados`,
        });
        handleLoadStats();
      }
    } catch (err) {
      toast({ title: "Erro na ingestão", variant: "destructive" });
    } finally {
      setLoadingUnivates(false);
    }
  };

  const recentJobs = getRecentJobs(5);

  return (
    <div className="space-y-4">
      {/* Stats Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Vector Store (legal_embeddings)
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLoadStats}
              disabled={loadingStats}
            >
              {loadingStats ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Documentos</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">
                  {Object.keys(stats.bySource).length}
                </p>
                <p className="text-xs text-muted-foreground">Fontes</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">
                  {Object.keys(stats.byType).length}
                </p>
                <p className="text-xs text-muted-foreground">Tipos</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-foreground">
                  {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString("pt-BR") : "N/D"}
                </p>
                <p className="text-xs text-muted-foreground">Última Atualização</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Carregando estatísticas...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Configurar Ingestão DataJud</CardTitle>
          <CardDescription className="text-xs">
            Selecione tribunais e configure parâmetros. Suas configurações são salvas automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tribunais Grid */}
          <div>
            <p className="text-xs font-medium mb-2">Tribunais ({selectedTribunais.length} selecionados)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {TRIBUNAIS_DISPONIVEIS.map(tribunal => (
                <label
                  key={tribunal.id}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                    selectedTribunais.includes(tribunal.id) 
                      ? "border-primary bg-primary/10" 
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedTribunais.includes(tribunal.id)}
                    onCheckedChange={() => toggleTribunal(tribunal.id)}
                  />
                  <span className="text-xs font-medium">{tribunal.sigla}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium">Dias atrás</label>
              <Input
                type="number"
                value={diasAtras}
                onChange={(e) => setDiasAtras(parseInt(e.target.value) || 15)}
                min={1}
                max={365}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Processos por tribunal</label>
              <Input
                type="number"
                value={size}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1) setSize(Math.min(val, 500));
                }}
                min={1}
                max={500}
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Máx: 500 por tribunal</p>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 p-2 border rounded cursor-pointer">
                <Checkbox
                  checked={generateEmbeddings}
                  onCheckedChange={(checked) => setGenerateEmbeddings(!!checked)}
                />
                <span className="text-xs">Gerar embeddings</span>
              </label>
            </div>
          </div>

          {/* Run / Cancel Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleRunIngestion} 
              disabled={loading || selectedTribunais.length === 0}
              className="btn-gold flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando... (pode levar alguns minutos)
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Executar Ingestão DataJud
                </>
              )}
            </Button>
            {loading && currentJob && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  cancelJob(currentJob.id);
                  setLoading(false);
                  setBatchProgress(null);
                  setTribunalProgress([]);
                  toast({ title: "Ingestão cancelada" });
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
          
          {loading && (
            <div className="space-y-3">
              {batchProgress && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500" 
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} 
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Lote {batchProgress.current}/{batchProgress.total}
                  </span>
                </div>
              )}

              {/* Per-tribunal real-time progress */}
              {tribunalProgress.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                  <p className="text-xs font-medium text-foreground mb-2">Progresso por tribunal:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                    {tribunalProgress.map((tp) => {
                      const tribunal = TRIBUNAIS_DISPONIVEIS.find(t => t.id === tp.tribunalId);
                      const sigla = tribunal?.sigla || tp.tribunalId.toUpperCase();
                      return (
                        <div 
                          key={tp.tribunalId} 
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs border transition-all duration-300 ${
                            tp.status === "processing" 
                              ? "border-primary bg-primary/10 text-primary animate-pulse" 
                              : tp.status === "done" 
                                ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-[hsl(var(--tron-neon))]" 
                                : tp.status === "error" 
                                  ? "border-destructive/30 bg-destructive/10 text-destructive" 
                                  : "border-border bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          {tp.status === "processing" && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                          {tp.status === "done" && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                          {tp.status === "error" && <AlertCircle className="h-3 w-3 shrink-0" />}
                          {tp.status === "pending" && <div className="h-3 w-3 rounded-full border border-muted-foreground/30 shrink-0" />}
                          <span className="font-medium">{sigla}</span>
                          {tp.status === "done" && tp.inseridos !== undefined && (
                            <span className="text-[10px] opacity-70">+{tp.inseridos}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground">
                      {tribunalProgress.filter(t => t.status === "done").length}/{tribunalProgress.length} concluídos
                    </span>
                    {lastResult?.stats?.totalInseridos != null && lastResult.stats.totalInseridos > 0 && (
                      <span className="text-[10px] text-primary font-medium">
                        {lastResult.stats.totalInseridos} documentos inseridos
                      </span>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                ⚠️ A ingestão processa em lotes de 3 tribunais para evitar timeout.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Códigos Legais (CP, CC, CLT) ═══ */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Ingestão de Códigos Legais + Jurisprudência
          </CardTitle>
          <CardDescription className="text-xs">
            Ingere artigos do Código Penal, Código Civil e CLT diretamente do Planalto.gov.br,
            com jurisprudência correlata do STF/STJ via DataJud.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Código Selection */}
          <div>
            <p className="text-xs font-medium mb-2">Códigos ({selectedCodigos.length} selecionados)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {CODIGOS_LEGAIS_DISPONIVEIS.map(codigo => (
                <label
                  key={codigo.id}
                  className={`flex items-center gap-2 p-3 rounded border cursor-pointer transition-colors ${
                    selectedCodigos.includes(codigo.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedCodigos.includes(codigo.id)}
                    onCheckedChange={() => toggleCodigo(codigo.id)}
                  />
                  <div>
                    <span className="text-sm font-medium">{codigo.sigla}</span>
                    <p className="text-xs text-muted-foreground">{codigo.nome} — {codigo.area}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Jurisprudence toggle */}
          <label className="flex items-center gap-2 p-2 border border-border rounded cursor-pointer">
            <Checkbox
              checked={includeJurisprudencia}
              onCheckedChange={(checked) => setIncludeJurisprudencia(!!checked)}
            />
            <div>
              <span className="text-xs font-medium">Incluir Jurisprudência STF/STJ</span>
              <p className="text-xs text-muted-foreground">Busca decisões relacionadas a cada área do código</p>
            </div>
          </label>

          {/* Run Button */}
          <Button
            onClick={handleRunCodigosIngestion}
            disabled={loadingCodigos || selectedCodigos.length === 0}
            className="btn-gold w-full"
          >
            {loadingCodigos ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Ingerindo Códigos... (pode levar vários minutos)
              </>
            ) : (
              <>
                <Scale className="h-4 w-4 mr-2" />
                Ingerir Códigos Legais + Jurisprudência
              </>
            )}
          </Button>

          {loadingCodigos && (
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ A ingestão busca artigos do Planalto.gov.br e jurisprudência do STF/STJ.
              Pode levar 5-15 minutos dependendo da quantidade.
            </p>
          )}

          {/* Codigos Result */}
          {lastCodigosResult && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--tron-neon))]" />
                <span className="text-sm font-medium">Resultado da Ingestão</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{lastCodigosResult.totalArtigos}</p>
                  <p className="text-xs text-muted-foreground">Artigos</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{lastCodigosResult.totalJurisprudencia}</p>
                  <p className="text-xs text-muted-foreground">Jurisprudência</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-muted-foreground">{lastCodigosResult.totalDuplicados}</p>
                  <p className="text-xs text-muted-foreground">Duplicados</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-destructive">{lastCodigosResult.totalErros}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>
              {lastCodigosResult.stats.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-background rounded text-xs">
                  <span className="font-medium">{s.sigla}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{s.artigosIngeridos} artigos</Badge>
                    <Badge variant="outline">{s.jurisprudenciaIngerida} jurisp.</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Dados Abertos Senado Federal ═══ */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Dados Abertos — Senado Federal (API v3)
          </CardTitle>
          <CardDescription className="text-xs">
            Ingere contratos, avenças, licitações e empresas contratadas do Senado Federal.
            Dados disponíveis para pesquisa jurídica, geração de documentos e Chat IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium mb-2">Tipos de dados ({selectedSenadoTypes.length} selecionados)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SENADO_TYPES.map(t => (
                <label
                  key={t.id}
                  className={`flex items-center gap-2 p-3 rounded border cursor-pointer transition-colors ${
                    selectedSenadoTypes.includes(t.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedSenadoTypes.includes(t.id)}
                    onCheckedChange={() =>
                      setSelectedSenadoTypes(prev =>
                        prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
                      )
                    }
                  />
                  <div>
                    <span className="text-sm font-medium">{t.label}</span>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSenadoIngestion}
            disabled={loadingSenado || selectedSenadoTypes.length === 0}
            className="btn-gold w-full"
          >
            {loadingSenado ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Ingerindo dados do Senado... (pode levar vários minutos)
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 mr-2" />
                Ingerir Dados do Senado Federal
              </>
            )}
          </Button>

          {loadingSenado && (
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ Processando CSVs em lotes de 200 registros. Total: ~14.000 registros.
            </p>
          )}

          {senadoResult && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Resultado da Ingestão Senado</span>
              </div>
              {Object.entries(senadoResult).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-background rounded text-xs">
                  <span className="font-medium capitalize">{key}</span>
                  <div className="flex items-center gap-2">
                    {val.success ? (
                      <>
                        <Badge variant="outline">{val.inserted} inseridos</Badge>
                        {val.skipped > 0 && <Badge variant="outline">{val.skipped} duplicados</Badge>}
                      </>
                    ) : (
                      <Badge variant="destructive">{val.error}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ API Live Senado Federal ═══ */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            API Live — Senado Federal (Dados em Tempo Real)
          </CardTitle>
          <CardDescription className="text-xs">
            Busca diretamente da API v3 do Senado: escritórios de apoio, terceirizados, notas de empenho,
            atas de registro de preço, CEAPS, auxílio moradia e mais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium mb-2">Endpoints ({selectedApiEndpoints.length} selecionados)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SENADO_API_ENDPOINTS.map(ep => (
                <label
                  key={ep.id}
                  className={`flex items-center gap-2 p-3 rounded border cursor-pointer transition-colors ${
                    selectedApiEndpoints.includes(ep.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedApiEndpoints.includes(ep.id)}
                    onCheckedChange={() =>
                      setSelectedApiEndpoints(prev =>
                        prev.includes(ep.id) ? prev.filter(x => x !== ep.id) : [...prev, ep.id]
                      )
                    }
                  />
                  <div>
                    <span className="text-sm font-medium">{ep.label}</span>
                    <p className="text-xs text-muted-foreground">{ep.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSenadoApiIngestion}
            disabled={loadingSenadoApi || selectedApiEndpoints.length === 0}
            className="btn-gold w-full"
          >
            {loadingSenadoApi ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Buscando da API do Senado... (pode levar vários minutos)
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Ingerir via API Live do Senado
              </>
            )}
          </Button>

          {loadingSenadoApi && (
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ Buscando CSVs diretamente de adm.senado.gov.br — cada endpoint pode conter milhares de registros.
            </p>
          )}

          {senadoApiResult && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Resultado API Live Senado</span>
              </div>
              {Object.entries(senadoApiResult).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-background rounded text-xs">
                  <span className="font-medium capitalize">{key.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    {val.success ? (
                      <>
                        <Badge variant="outline">{val.inserted} inseridos</Badge>
                        <Badge variant="outline">{val.total_records} total</Badge>
                        {val.skipped > 0 && <Badge variant="outline">{val.skipped} ignorados</Badge>}
                      </>
                    ) : (
                      <Badge variant="destructive">{val.error}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Biblioteca Univates / Minha Biblioteca ═══ */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Biblioteca Univates — Minha Biblioteca (E-books)
          </CardTitle>
          <CardDescription className="text-xs">
            Acessa a biblioteca digital da Univates para extrair e indexar conteúdo jurídico
            de e-books acadêmicos usando IA para extração de conceitos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleUnivatesIngestion}
            disabled={loadingUnivates}
            className="btn-gold w-full"
          >
            {loadingUnivates ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Acessando biblioteca e extraindo conteúdo... (pode levar vários minutos)
              </>
            ) : (
              <>
                <GraduationCap className="h-4 w-4 mr-2" />
                Ingerir E-books Jurídicos da Univates
              </>
            )}
          </Button>

          {loadingUnivates && (
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ Autenticando na biblioteca, buscando livros por tema jurídico e extraindo conceitos com IA.
              5 temas × 10 livros = até 50 livros processados.
            </p>
          )}

          {univatesResult && !univatesResult.error && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Resultado Biblioteca Univates</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{univatesResult.totalInseridos}</p>
                  <p className="text-xs text-muted-foreground">Inseridos</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-muted-foreground">{univatesResult.totalDuplicados}</p>
                  <p className="text-xs text-muted-foreground">Duplicados</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">{univatesResult.totalTemas}</p>
                  <p className="text-xs text-muted-foreground">Temas</p>
                </div>
              </div>
              {univatesResult.results?.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-background rounded text-xs">
                  <span className="font-medium">{r.tema}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{r.livrosEncontrados} livros</Badge>
                    <Badge variant="outline">{r.conceitosExtraidos} conceitos</Badge>
                    <Badge variant="outline">{r.inseridos} inseridos</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {univatesResult?.error && (
            <div className="mt-2 p-3 bg-destructive/10 rounded-lg">
              <p className="text-xs text-destructive">{univatesResult.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Result */}
      {lastResult && lastResult.stats && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-[hsl(var(--tron-neon))]" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              Resultado da Última Ingestão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-lg font-bold">{lastResult.stats.totalProcessados ?? 0}</p>
                <p className="text-xs text-muted-foreground">Processados</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{lastResult.stats.totalInseridos ?? 0}</p>
                <p className="text-xs text-muted-foreground">Novos</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-yellow-600">{lastResult.stats.totalDuplicados ?? 0}</p>
                <p className="text-xs text-muted-foreground">Duplicatas</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-600">{lastResult.stats.totalErros ?? 0}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>

            {/* Per tribunal results */}
            <div className="space-y-2">
              {(lastResult.results || []).map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                  <span className="font-medium">{r.tribunal?.toUpperCase() || r.tema}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{r.processados ?? 0} proc.</Badge>
                    <Badge variant="outline" className="text-green-600">{r.inseridos ?? 0} novos</Badge>
                    {(r.duplicados ?? 0) > 0 && (
                      <Badge variant="outline" className="text-yellow-600">{r.duplicados} dup.</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job History */}
      {recentJobs.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Histórico de Ingestões
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearJobs}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                  <div className="flex items-center gap-2">
                    {job.status === "completed" && <CheckCircle2 className="h-3 w-3 text-[hsl(var(--tron-neon))]" />}
                    {job.status === "failed" && <AlertCircle className="h-3 w-3 text-destructive" />}
                    {job.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                    <span>{new Date(job.startedAt).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{job.tribunais.length} tribunais</Badge>
                    {job.stats && (
                      <Badge variant="outline" className="text-green-600">
                        {job.stats.totalInseridos} novos
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
