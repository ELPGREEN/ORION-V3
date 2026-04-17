import { useState, useEffect } from "react";
import {
  Scale,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  Download,
  Filter,
  RefreshCw,
  Globe,
  Landmark,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  buscaLegislacao,
  getCatalogo,
  ingestCodigos,
  searchLexML,
  type LegislacaoResult,
  type CatalogoLei,
} from "@/lib/api";

const AREAS_JURIDICAS = [
  { value: "todas", label: "Todas as Áreas" },
  { value: "constitucional", label: "Constitucional" },
  { value: "civil", label: "Direito Civil" },
  { value: "processo civil", label: "Processo Civil" },
  { value: "penal", label: "Direito Penal" },
  { value: "processo penal", label: "Processo Penal" },
  { value: "trabalhista", label: "Direito Trabalhista" },
  { value: "consumidor", label: "Direito do Consumidor" },
  { value: "tributário", label: "Direito Tributário" },
  { value: "administrativo", label: "Direito Administrativo" },
  { value: "previdenciário", label: "Direito Previdenciário" },
  { value: "empresarial", label: "Direito Empresarial" },
  { value: "ambiental", label: "Direito Ambiental" },
  { value: "eleitoral", label: "Direito Eleitoral" },
  { value: "digital", label: "Direito Digital" },
  { value: "imobiliário", label: "Direito Imobiliário" },
  { value: "militar", label: "Direito Militar" },
  { value: "internacional", label: "Direito Internacional" },
  { value: "família", label: "Direito de Família" },
  { value: "saúde", label: "Direito da Saúde" },
  { value: "educação", label: "Direito Educacional" },
  { value: "agrário", label: "Direito Agrário" },
  { value: "marítimo", label: "Marítimo/Aeronáutico" },
  { value: "bancário", label: "Bancário/Financeiro" },
  { value: "esporte", label: "Direito Desportivo" },
  { value: "energia", label: "Energia/Mineração" },
];

export function LegislacaoFederalPanel() {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState("catalogo");

  // Catálogo
  const [catalogo, setCatalogo] = useState<CatalogoLei[]>([]);
  const [catalogoArea, setCatalogoArea] = useState("todas");
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);

  // Ingestão
  const [ingesting, setIngesting] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [ingestResult, setIngestResult] = useState<{ total: number; indexed: number; errors: string[] } | null>(null);

  // Busca
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LegislacaoResult[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchSources, setSearchSources] = useState<string[]>([]);

  // LexML
  const [lexmlQuery, setLexmlQuery] = useState("");
  const [lexmlSearching, setLexmlSearching] = useState(false);
  const [lexmlResults, setLexmlResults] = useState<any[]>([]);

  useEffect(() => {
    handleLoadCatalogo();
  }, []);

  async function handleLoadCatalogo(area?: string) {
    setLoadingCatalogo(true);
    try {
      const res = await getCatalogo(area === "todas" ? undefined : area);
      if (res.success) {
        setCatalogo(res.leis);
      }
    } catch (error) {
      toast({ title: "Erro ao carregar catálogo", variant: "destructive" });
    } finally {
      setLoadingCatalogo(false);
    }
  }

  async function handleIngestCodigos() {
    setIngesting(true);
    setIngestResult(null);
    try {
      const areas = selectedAreas.length > 0 ? selectedAreas : undefined;
      const res = await ingestCodigos(areas);
      if (res.success) {
        setIngestResult({ total: res.total, indexed: res.indexed, errors: res.errors });
        toast({
          title: "Ingestão concluída!",
          description: `${res.indexed} de ${res.total} códigos indexados na rede neural`,
        });
      } else {
        toast({ title: "Erro na ingestão", variant: "destructive" });
      }
    } catch (error) {
      toast({
        title: "Erro ao ingerir legislação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIngesting(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await buscaLegislacao(searchQuery);
      if (res.success) {
        setSearchResults(res.results);
        setSearchTotal(res.totalResults);
        setSearchSources(res.sources || []);
      }
    } catch (error) {
      toast({ title: "Erro na busca", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }

  async function handleLexMLSearch() {
    if (!lexmlQuery.trim()) return;
    setLexmlSearching(true);
    try {
      const res = await searchLexML(lexmlQuery, 15);
      if (res?.results) {
        setLexmlResults(res.results);
      }
    } catch (error) {
      toast({ title: "Erro na busca LexML", variant: "destructive" });
    } finally {
      setLexmlSearching(false);
    }
  }

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Legislação Federal — Senado + Câmara + LexML
          </CardTitle>
          <CardDescription className="text-xs">
            Integração completa com a API Dados Abertos do Senado Federal (90+ endpoints), Câmara dos Deputados e LexML. 
            Todos os códigos, leis e normas do Brasil disponíveis para ingestão na rede neural.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid w-full grid-cols-4 bg-[hsl(var(--tron-bg-deep))] border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
          <TabsTrigger value="catalogo" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            Catálogo de Leis
          </TabsTrigger>
          <TabsTrigger value="ingestao" className="text-xs">
            <Download className="h-3 w-3 mr-1" />
            Ingestão em Massa
          </TabsTrigger>
          <TabsTrigger value="busca" className="text-xs">
            <Search className="h-3 w-3 mr-1" />
            Busca Unificada
          </TabsTrigger>
          <TabsTrigger value="lexml" className="text-xs">
            <Globe className="h-3 w-3 mr-1" />
            LexML Nacional
          </TabsTrigger>
        </TabsList>

        {/* ═══ CATÁLOGO ═══ */}
        <TabsContent value="catalogo" className="space-y-4">
          <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Catálogo Completo — {catalogo.length > 0 ? catalogo.length : "150+"} Códigos e Leis do Brasil
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    value={catalogoArea}
                    onValueChange={(v) => {
                      setCatalogoArea(v);
                      handleLoadCatalogo(v);
                    }}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                      <Filter className="h-3 w-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AREAS_JURIDICAS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLoadCatalogo(catalogoArea)}
                    disabled={loadingCatalogo}
                  >
                    {loadingCatalogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCatalogo ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {catalogo.map((lei, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-3 bg-background border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))] rounded-md hover:border-primary/50 transition-colors"
                    >
                      <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{lei.sigla}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{lei.nome}</p>
                        <Badge variant="outline" className="text-[9px] mt-1">
                          {lei.area}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {catalogo.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-3 text-center py-8">
                      Clique em atualizar para carregar o catálogo
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ INGESTÃO EM MASSA ═══ */}
        <TabsContent value="ingestao" className="space-y-4">
          <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                Ingerir Legislação na Rede Neural
              </CardTitle>
              <CardDescription className="text-xs">
                Indexa todos os códigos e leis brasileiras na base neural (neural_knowledge_base + legal_embeddings).
                Selecione áreas específicas ou ingira tudo de uma vez.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium mb-2">
                  Filtrar por Área Jurídica (vazio = todas as 26 áreas)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {AREAS_JURIDICAS.filter((a) => a.value !== "todas").map((area) => (
                    <label
                      key={area.value}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors text-xs ${
                        selectedAreas.includes(area.value)
                          ? "border-primary bg-primary/10"
                          : "border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))] hover:border-primary/50"
                      }`}
                    >
                      <Checkbox
                        checked={selectedAreas.includes(area.value)}
                        onCheckedChange={() => toggleArea(area.value)}
                      />
                      <span className="truncate">{area.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleIngestCodigos}
                disabled={ingesting}
                className="btn-gold w-full"
              >
                {ingesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Ingerindo legislação... (pode levar alguns minutos)
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    {selectedAreas.length > 0
                      ? `Ingerir ${selectedAreas.length} área(s) selecionada(s)`
                      : "Ingerir TODAS as leis brasileiras"}
                  </>
                )}
              </Button>

              {ingesting && (
                <p className="text-xs text-muted-foreground text-center">
                  ⚠️ A ingestão continua no servidor mesmo se você navegar para outra página.
                </p>
              )}

              {ingestResult && (
                <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] bg-muted/50 border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Resultado da Ingestão</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{ingestResult.total}</p>
                        <p className="text-xs text-muted-foreground">Total de Leis</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-primary">{ingestResult.indexed}</p>
                        <p className="text-xs text-muted-foreground">Indexadas</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-destructive">{ingestResult.errors.length}</p>
                        <p className="text-xs text-muted-foreground">Erros</p>
                      </div>
                    </div>
                    {ingestResult.errors.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {ingestResult.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ BUSCA UNIFICADA ═══ */}
        <TabsContent value="busca" className="space-y-4">
          <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" />
                Busca Unificada — Senado + Câmara + LexML
              </CardTitle>
              <CardDescription className="text-xs">
                Pesquise em todas as fontes legislativas simultaneamente. Os resultados são automaticamente
                indexados na rede neural.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: direito do consumidor, reforma trabalhista, LGPD..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-background border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]"
                />
                <Button onClick={handleSearch} disabled={searching} className="btn-gold shrink-0">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {searchTotal} resultados
                    </Badge>
                    {searchSources.map((src) => (
                      <Badge key={src} variant="secondary" className="text-[10px]">
                        {src}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {searchResults.map((result, i) => (
                      <div
                        key={i}
                        className="p-3 bg-background border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))] rounded-md hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground line-clamp-1">
                              {result.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">
                              {result.content}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="outline" className="text-[9px]">
                              {result.sourceLabel || result.source}
                            </Badge>
                            {result.date && (
                              <span className="text-[9px] text-muted-foreground">{result.date}</span>
                            )}
                          </div>
                        </div>
                        {result.url && (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary hover:underline mt-1 inline-block"
                          >
                            Ver fonte original →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ LexML ═══ */}
        <TabsContent value="lexml" className="space-y-4">
          <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                LexML — Rede de Informação Legislativa e Jurídica
              </CardTitle>
              <CardDescription className="text-xs">
                Busca na rede LexML que agrega legislação federal, estadual e municipal de todo o Brasil.
                Resultados são auto-indexados na rede neural.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: código penal, lei de falências, estatuto da criança..."
                  value={lexmlQuery}
                  onChange={(e) => setLexmlQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLexMLSearch()}
                  className="bg-background border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]"
                />
                <Button onClick={handleLexMLSearch} disabled={lexmlSearching} className="btn-gold shrink-0">
                  {lexmlSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {lexmlResults.length > 0 && (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {lexmlResults.map((result: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 bg-background border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))] rounded-md"
                    >
                      <p className="text-xs font-bold text-foreground line-clamp-2">
                        {result.title || result.titulo || "Sem título"}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">
                        {result.content || result.ementa || ""}
                      </p>
                      {(result.url || result.urn) && (
                        <a
                          href={result.url || `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(result.urn || result.title || result.titulo || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-primary hover:underline mt-1 inline-block"
                        >
                          Ver no LexML →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
