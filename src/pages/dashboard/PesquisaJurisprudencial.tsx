import { useState, useEffect, useCallback } from "react";
import { Search, BookOpen, ExternalLink, Loader2, Scale, Brain, Sparkles, X, Copy, Filter, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, BarChart3, FileText } from "lucide-react";
import { JurisdictionSelector, isSourceInJurisdiction, type Jurisdiction } from "@/components/dashboard/JurisdictionSelector";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {   type  type NeuralSearchResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AREA_COLORS } from "@/lib/area-colors";

interface SearchResult {
  id: string;
  tribunal: string;
  numero: string;
  ementa: string;
  fullContent: string;
  data: string;
  relator?: string;
  source: string;
  url?: string;
  score?: number;
  isNeural?: boolean;
  attention_heads?: Record<string, number>;
  quantum_category?: string;
  qnn_score?: number;
}

const STORAGE_KEY = "pesquisa-jurisprudencial-state";

// ═══════════════════════════════════════
// 60+ Tribunal Filters — Grouped by category
// ═══════════════════════════════════════
interface TribunalGroup {
  label: string;
  tribunais: { id: string; label: string; sources: string[] }[];
}

const tribunalGroups: TribunalGroup[] = [
  {
    label: "Geral",
    tribunais: [
      { id: "Todos", label: "Todos", sources: [] },
    ],
  },
  {
    label: "Superiores",
    tribunais: [
      { id: "STF", label: "STF", sources: ["stf", "stf_bigquery"] },
      { id: "STJ", label: "STJ", sources: ["datajud_stj"] },
      { id: "TST", label: "TST", sources: ["datajud_tst"] },
      { id: "TSE", label: "TSE", sources: ["datajud_tse"] },
      { id: "STM", label: "STM", sources: ["datajud_stm"] },
    ],
  },
  {
    label: "TRFs",
    tribunais: [
      { id: "TRF1", label: "TRF1", sources: ["datajud_trf1"] },
      { id: "TRF2", label: "TRF2", sources: ["datajud_trf2"] },
      { id: "TRF3", label: "TRF3", sources: ["datajud_trf3"] },
      { id: "TRF4", label: "TRF4", sources: ["datajud_trf4"] },
      { id: "TRF5", label: "TRF5", sources: ["datajud_trf5"] },
      { id: "TRF6", label: "TRF6", sources: ["datajud_trf6"] },
    ],
  },
  {
    label: "TJs",
    tribunais: [
      { id: "TJAC", label: "AC", sources: ["datajud_tjac"] },
      { id: "TJAL", label: "AL", sources: ["datajud_tjal"] },
      { id: "TJAM", label: "AM", sources: ["datajud_tjam"] },
      { id: "TJAP", label: "AP", sources: ["datajud_tjap"] },
      { id: "TJBA", label: "BA", sources: ["datajud_tjba"] },
      { id: "TJCE", label: "CE", sources: ["datajud_tjce"] },
      { id: "TJDFT", label: "DFT", sources: ["datajud_tjdft"] },
      { id: "TJES", label: "ES", sources: ["datajud_tjes"] },
      { id: "TJGO", label: "GO", sources: ["datajud_tjgo"] },
      { id: "TJMA", label: "MA", sources: ["datajud_tjma"] },
      { id: "TJMG", label: "MG", sources: ["datajud_tjmg"] },
      { id: "TJMS", label: "MS", sources: ["datajud_tjms"] },
      { id: "TJMT", label: "MT", sources: ["datajud_tjmt"] },
      { id: "TJPA", label: "PA", sources: ["datajud_tjpa"] },
      { id: "TJPB", label: "PB", sources: ["datajud_tjpb"] },
      { id: "TJPE", label: "PE", sources: ["datajud_tjpe"] },
      { id: "TJPI", label: "PI", sources: ["datajud_tjpi"] },
      { id: "TJPR", label: "PR", sources: ["datajud_tjpr"] },
      { id: "TJRJ", label: "RJ", sources: ["datajud_tjrj"] },
      { id: "TJRN", label: "RN", sources: ["datajud_tjrn"] },
      { id: "TJRO", label: "RO", sources: ["datajud_tjro"] },
      { id: "TJRR", label: "RR", sources: ["datajud_tjrr"] },
      { id: "TJRS", label: "RS", sources: ["datajud_tjrs", "tjrs"] },
      { id: "TJSC", label: "SC", sources: ["datajud_tjsc"] },
      { id: "TJSE", label: "SE", sources: ["datajud_tjse"] },
      { id: "TJSP", label: "SP", sources: ["datajud_tjsp"] },
      { id: "TJTO", label: "TO", sources: ["datajud_tjto"] },
    ],
  },
  {
    label: "TRTs",
    tribunais: [
      { id: "TRT1", label: "TRT1-RJ", sources: ["datajud_trt1"] },
      { id: "TRT2", label: "TRT2-SP", sources: ["datajud_trt2"] },
      { id: "TRT3", label: "TRT3-MG", sources: ["datajud_trt3"] },
      { id: "TRT4", label: "TRT4-RS", sources: ["datajud_trt4"] },
      { id: "TRT5", label: "TRT5-BA", sources: ["datajud_trt5"] },
      { id: "TRT6", label: "TRT6-PE", sources: ["datajud_trt6"] },
      { id: "TRT7", label: "TRT7-CE", sources: ["datajud_trt7"] },
      { id: "TRT8", label: "TRT8-PA", sources: ["datajud_trt8"] },
      { id: "TRT9", label: "TRT9-PR", sources: ["datajud_trt9"] },
      { id: "TRT10", label: "TRT10-DF", sources: ["datajud_trt10"] },
      { id: "TRT11", label: "TRT11-AM", sources: ["datajud_trt11"] },
      { id: "TRT12", label: "TRT12-SC", sources: ["datajud_trt12"] },
      { id: "TRT13", label: "TRT13-PB", sources: ["datajud_trt13"] },
      { id: "TRT14", label: "TRT14-RO", sources: ["datajud_trt14"] },
      { id: "TRT15", label: "TRT15-Campinas", sources: ["datajud_trt15"] },
      { id: "TRT16", label: "TRT16-MA", sources: ["datajud_trt16"] },
      { id: "TRT17", label: "TRT17-ES", sources: ["datajud_trt17"] },
      { id: "TRT18", label: "TRT18-GO", sources: ["datajud_trt18"] },
      { id: "TRT19", label: "TRT19-AL", sources: ["datajud_trt19"] },
      { id: "TRT20", label: "TRT20-SE", sources: ["datajud_trt20"] },
      { id: "TRT21", label: "TRT21-RN", sources: ["datajud_trt21"] },
      { id: "TRT22", label: "TRT22-PI", sources: ["datajud_trt22"] },
      { id: "TRT23", label: "TRT23-MT", sources: ["datajud_trt23"] },
      { id: "TRT24", label: "TRT24-MS", sources: ["datajud_trt24"] },
    ],
  },
  {
    label: "Legislação",
    tribunais: [
      { id: "LexML", label: "LexML", sources: ["lexml", "lexml_catalogo"] },
      { id: "Câmara", label: "Câmara", sources: ["camara"] },
      { id: "CNJ", label: "CNJ", sources: ["cnj"] },
    ],
  },
];

function getSelectedSources(tribunalId: string): string[] | undefined {
  if (tribunalId === "Todos") return undefined;
  for (const group of tribunalGroups) {
    const found = group.tribunais.find(t => t.id === tribunalId);
    if (found) return found.sources;
  }
  return undefined;
}

// ═══════════════════════════════════════
// Encoding fix
// ═══════════════════════════════════════
function fixEncoding(text: string): string {
  if (!text) return text;
  try {
    const replacements: [RegExp, string][] = [
      [/Ã§/g, "ç"], [/Ã£/g, "ã"], [/Ãµ/g, "õ"], [/Ã¡/g, "á"],
      [/Ã©/g, "é"], [/Ã­/g, "í"], [/Ã³/g, "ó"], [/Ãº/g, "ú"],
      [/Ã¢/g, "â"], [/Ãª/g, "ê"], [/Ã´/g, "ô"], [/Ã¼/g, "ü"],
      [/Ã /g, "à"], [/Ã‰/g, "É"], [/Ã"/g, "Ó"], [/Ãš/g, "Ú"],
      [/Ã‡/g, "Ç"], [/Ã¬/g, "ì"], [/Ã¹/g, "ù"],
      [/Â§/g, "§"], [/Âº/g, "º"], [/Âª/g, "ª"], [/Â°/g, "°"],
      [/â€"/g, "—"], [/â€"/g, "–"], [/â€œ/g, "\u201C"], [/â€\u009D/g, "\u201D"],
      [/â€˜/g, "\u2018"], [/â€™/g, "\u2019"],
    ];
    const latin1Fixes: [RegExp, string][] = [
      [/Reda\uFFFD\uFFFDo/g, "Redação"], [/C\uFFFDdigo/g, "Código"],
      [/n\uFFFD\s/g, "nº "], [/1\uFFFD/g, "1º"],
      [/execu\uFFFD\uFFFDo/g, "execução"], [/sobrev\uFFFDm/g, "sobrevém"],
      [/\uFFFD\s/g, "º "], [/condena\uFFFD\uFFFDo/g, "condenação"],
      [/extin\uFFFD\uFFFDo/g, "extinção"], [/infra\uFFFD\uFFFDo/g, "infração"],
      [/suspens\uFFFDo/g, "suspensão"], [/revoga\uFFFD\uFFFDo/g, "revogação"],
      [/cal\uFFFDnia/g, "calúnia"], [/senten\uFFFDa/g, "sentença"],
      [/a\uFFFD\uFFFDo/g, "ação"], [/fun\uFFFD\uFFFDo/g, "função"],
      [/puni\uFFFD\uFFFDo/g, "punição"], [/reabilita\uFFFD\uFFFDo/g, "reabilitação"],
      [/determina\uFFFD\uFFFDo/g, "determinação"], [/pr\uFFFDprios/g, "próprios"],
      [/pol\uFFFDticos/g, "políticos"], [/tamb\uFFFDm/g, "também"],
      [/\uFFFD\uFFFD/g, "çã"], [/\uFFFD/g, ""],
    ];
    let fixed = text;
    for (const [p, r] of replacements) fixed = fixed.replace(p, r);
    for (const [p, r] of latin1Fixes) fixed = fixed.replace(p, r);
    return fixed;
  } catch { return text; }
}

// ═══════════════════════════════════════
// Attention Head Labels
// ═══════════════════════════════════════
const HEAD_LABELS: Record<string, { label: string; icon: string }> = {
  semantic: { label: "Semântico", icon: "🧠" },
  keyword: { label: "Keyword", icon: "🔤" },
  authority: { label: "Autoridade", icon: "⚖️" },
  recency: { label: "Recência", icon: "🕐" },
  jurisdiction: { label: "Jurisdição", icon: "📍" },
  depth: { label: "Profundidade", icon: "📊" },
};

// ═══════════════════════════════════════
// Component: Attention Breakdown
// ═══════════════════════════════════════
function AttentionBreakdown({ heads }: { heads: Record<string, number> }) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[9px] mt-2 p-2 bg-muted/30 border border-border rounded">
      {Object.entries(heads).map(([key, value]) => {
        const meta = HEAD_LABELS[key];
        if (!meta) return null;
        const pct = Math.round((value || 0) * 100);
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span>{meta.icon}</span>
            <span className="text-muted-foreground">{meta.label}</span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-muted-foreground w-7 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════
// Component: Result Feedback Buttons
// ═══════════════════════════════════════
function ResultFeedback({
  result,
  query,
}: {
  result: SearchResult;
  query: string;
}) {
  const [sent, setSent] = useState<"positive" | "negative" | null>(null);
  const [sending, setSending] = useState(false);

  const send = async (feedback: "positive" | "negative") => {
    setSending(true);
    try {
      await submitSearchFeedback({
        result_id: result.id,
        query,
        quantum_category: result.quantum_category || "civil",
        feedback,
        attention_heads: result.attention_heads,
      });
      setSent(feedback);
    } catch (err) {
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <span className="text-[9px] text-muted-foreground">
        {sent === "positive" ? "✅ Relevante" : "❌ Irrelevante"} — QNN ajustado
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        disabled={sending}
        onClick={() => send("positive")}
        className="p-1 rounded hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary disabled:opacity-50"
        title="Resultado relevante"
      >
        <ThumbsUp className="h-3 w-3" />
      </button>
      <button
        disabled={sending}
        onClick={() => send("negative")}
        className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50"
        title="Resultado irrelevante"
      >
        <ThumbsDown className="h-3 w-3" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════
// Main Component
// ═══════════════════════════════════════
type NeuralSearchResult = any;
type NeuralSearchResponse = any;
const neuralSearch = async (..._a: any[]) => ({ results: [], totalResults: 0 });
const submitSearchFeedback = async (..._a: any[]) => {};

export default function PesquisaJurisprudencial() {
  const { isAdvogado } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const [query, setQuery] = useState(saved?.query || "");
  const [searching, setSearching] = useState(false);
  const [resultados, setResultados] = useState<SearchResult[]>(saved?.resultados || []);
  const [searched, setSearched] = useState(saved?.searched || false);
  const [selectedTribunal, setSelectedTribunal] = useState<string>(saved?.selectedTribunal || "Todos");
  const [fullTextDialog, setFullTextDialog] = useState<SearchResult | null>(null);
  const [searchTimings, setSearchTimings] = useState<Record<string, number>>({});
  const [pipeline, setPipeline] = useState<string[]>([]);
  const [showAllTribunais, setShowAllTribunais] = useState(false);
  const [expandedHeads, setExpandedHeads] = useState<Set<string>>(new Set());
  const [selectedContexts, setSelectedContexts] = useState<number>(() => {
    try {
      const raw = sessionStorage.getItem("pesquisa_contexts");
      return raw ? JSON.parse(raw).length : 0;
    } catch { return 0; }
  });
  const [refinedQuery, setRefinedQuery] = useState<string | null>(null);
  const [detectedArea, setDetectedArea] = useState<string | null>(null);
  const [queryType, setQueryType] = useState<string | null>(null);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("brasil");

  // Persist state
  useEffect(() => {
    if (searched && resultados.length > 0) {
      try {
        const trimmed = resultados.map(r => ({
          ...r,
          fullContent: r.fullContent?.substring(0, 1500) || "",
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          query, resultados: trimmed, searched, selectedTribunal,
        }));
      } catch (e) {
      }
    }
  }, [query, resultados, searched, selectedTribunal]);

  const toggleHeads = (id: string) => {
    setExpandedHeads(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResultados([]);
    setPipeline([]);
    setSearchTimings({});

    try {
      const startTime = performance.now();
      const filterSources = getSelectedSources(selectedTribunal);

      const neuralResponse = await neuralSearch(query.trim(), {
        mode: "search_and_index",
        hybrid: true,
        rerank: true,
        expandQueries: true,
        matchCount: 20,
        matchThreshold: 0.25,
        filterSources,
      });

      const totalTime = Math.round(performance.now() - startTime);
      setSearchTimings({ total: totalTime, ...neuralResponse.timings });
      setPipeline(neuralResponse.pipeline || []);
      setRefinedQuery(neuralResponse.refinedQuery || null);
      setDetectedArea(neuralResponse.area || null);
      setQueryType(neuralResponse.queryType || null);

      // Filter out internal documents (enriched_doc, doc_generated, generated_doc)
      const INTERNAL_SOURCES = new Set(["enriched_doc", "doc_generated", "generated_doc"]);
      const filteredNeuralResults = (neuralResponse.results || []).filter(
        (r) => !INTERNAL_SOURCES.has(r.source) && isSourceInJurisdiction(r.source, jurisdiction)
      );

      const results: SearchResult[] = filteredNeuralResults.map((r) => ({
        id: r.id || crypto.randomUUID(),
        tribunal: fixEncoding(r.source_label || r.source?.toUpperCase() || ""),
        numero: fixEncoding(r.title),
        ementa: fixEncoding((r.content || "").substring(0, 500)) + "...",
        fullContent: fixEncoding(r.content || ""),
        data: r.published_date || "N/A",
        source: r.source,
        url: r.url || undefined,
        score: r.combined_score || r.multi_head_score || r.similarity,
        isNeural: true,
        attention_heads: r.attention_heads,
        quantum_category: r.quantum_category || undefined,
        qnn_score: (r as any).qnn_score || undefined,
      }));

      // Fallback text search
      let textQuery = supabase
        .from("legal_embeddings")
        .select("id, title, content, source, source_label, url, published_date")
        .textSearch("content", query, { type: "websearch", config: "portuguese" })
        .limit(10);

      if (filterSources) {
        textQuery = textQuery.in("source", filterSources);
      }

      const { data: textResults } = await textQuery;
      const neuralIds = new Set(results.map(r => r.id));
      const extraResults: SearchResult[] = (textResults || [])
        .filter(r => !neuralIds.has(r.id))
        .map(r => ({
          id: r.id,
          tribunal: fixEncoding(r.source_label || r.source.toUpperCase()),
          numero: fixEncoding(r.title),
          ementa: fixEncoding(r.content.substring(0, 500)) + "...",
          fullContent: fixEncoding(r.content),
          data: r.published_date || "N/A",
          source: r.source,
          url: r.url || undefined,
          isNeural: false,
        }));

      const allResults = [...results, ...extraResults];
      setResultados(allResults);
      setSearched(true);

      // 🧠 Neural feedback: registra busca como sinal de aprendizado

      toast({
        title: "Pesquisa concluída",
        description: `${allResults.length} resultado(s) em ${totalTime}ms${results.length > 0 ? " • Pipeline RAG ativo" : ""}`,
      });
    } catch (error) {
      toast({
        title: "Erro na pesquisa",
        description: "Não foi possível realizar a busca. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleInsertInDocument = (result: SearchResult) => {
    const raw = sessionStorage.getItem("pesquisa_contexts");
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({
      title: result.numero,
      source: result.source,
      sourceLabel: result.tribunal,
      description: result.fullContent.substring(0, 500),
      url: result.url,
    });
    sessionStorage.setItem("pesquisa_contexts", JSON.stringify(arr));
    setSelectedContexts(arr.length);
    toast({
      title: `Fundamentação adicionada (${arr.length})`,
      description: "Adicione mais resultados ou vá ao gerador.",
      action: (
        <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => navigate("/dashboard/gerar-documento")}>
          Ir ao gerador
        </Button>
      ),
    });
  };

  const handleCopyResult = (result: SearchResult) => {
    const text = `${result.numero}\n${result.fullContent}\nFonte: ${result.tribunal}${result.url ? `\nURL: ${result.url}` : ""}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Resultado copiado para a área de transferência." });
  };

  // Determine which tribunal groups to show
  const visibleGroups = showAllTribunais
    ? tribunalGroups
    : tribunalGroups.filter(g => ["Geral", "Superiores", "TRFs", "Legislação"].includes(g.label));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-primary" />
          Pesquisa Jurisprudencial
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {isAdvogado
            ? "Busca híbrida com RAG Neural — semântica + keyword + autoridade + recência + QNN v11."
            : "Busque leis e jurisprudência relevantes para o seu caso."}
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-3 flex-wrap">
          <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} size="md" />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={
                jurisdiction === "eua"
                  ? 'Ex: "civil rights", due process, First Amendment...'
                  : isAdvogado
                    ? 'Ex: "código civil", imov*, 0001234-56.2023.8.21.0001, dano moral...'
                    : 'Ex: "direitos do consumidor", prazo*, número do processo...'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 bg-card border-border"
            />
          </div>
          <Button type="submit" className="btn-gold h-12 px-6" disabled={searching}>
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Pesquisar
              </>
            )}
          </Button>
        </div>

        {/* Grouped Tribunal Filters */}
        <div className="space-y-2">
          {visibleGroups.map((group) => (
            <div key={group.label} className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] text-muted-foreground/60 w-16 shrink-0 uppercase tracking-widest">
                {group.label}
              </span>
              {group.tribunais.map((t) => (
                 <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTribunal(t.id);
                    if (query.trim() && t.id !== selectedTribunal) {
                      // Auto-trigger search when tribunal changes and query exists
                      setTimeout(() => {
                        const form = document.querySelector('form');
                        if (form) form.requestSubmit();
                      }, 50);
                      toast({
                        title: `Filtro: ${t.label}`,
                        description: t.id === "Todos" ? "Buscando em todos os tribunais..." : `Pesquisando em ${t.label}...`,
                      });
                    }
                  }}
                  className={cn(
                    "text-[10px] px-2.5 py-1 border transition-colors tracking-wider uppercase",
                    selectedTribunal === t.id
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setShowAllTribunais(!showAllTribunais)}
            className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors"
          >
            {showAllTribunais ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showAllTribunais ? "Menos tribunais" : "Todos os tribunais (TJs + TRTs)"}
          </button>
        </div>
      </form>

      {/* Pipeline Info */}
      {searched && pipeline.length > 0 && (
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground flex-wrap">
          <Sparkles className="h-3 w-3 text-primary shrink-0" />
          <span>Pipeline:</span>
          {pipeline.map((step, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>→</span>}
              <span className="px-1.5 py-0.5 bg-muted/50 border border-border">{step}</span>
            </span>
          ))}
          {searchTimings.total && (
            <span className="ml-auto text-primary">{searchTimings.total}ms</span>
          )}
        </div>
      )}

      {/* Results */}
      {searched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">
                {resultados.length} resultado(s) para "{query}"
                {selectedTribunal !== "Todos" && ` — ${selectedTribunal}`}
                {queryType === "process_number" && (
                  <Badge variant="outline" className="ml-2 text-[9px] border-primary/50 text-primary">
                    🔢 Busca por número de processo
                  </Badge>
                )}
                {queryType === "exact_phrase" && (
                  <Badge variant="outline" className="ml-2 text-[9px] border-primary/50 text-primary">
                    🎯 Busca por frase exata
                  </Badge>
                )}
                {queryType === "wildcard" && (
                  <Badge variant="outline" className="ml-2 text-[9px] border-primary/50 text-primary">
                    🔤 Busca por radical/wildcard
                  </Badge>
                )}
                {refinedQuery && refinedQuery !== query && (
                  <span className="ml-2 text-primary/70">
                    🧠 Busca refinada: "{refinedQuery}"
                  </span>
                )}
              </p>
              {detectedArea && AREA_COLORS[detectedArea.toLowerCase()] && (
                <Badge className={`text-[10px] px-2 py-0.5 border ${AREA_COLORS[detectedArea.toLowerCase()].bg} ${AREA_COLORS[detectedArea.toLowerCase()].text}`}>
                  ⚖️ {AREA_COLORS[detectedArea.toLowerCase()].label}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-7 text-muted-foreground"
              onClick={() => {
                setResultados([]);
                setSearched(false);
                setQuery("");
                setPipeline([]);
                setSearchTimings({});
                localStorage.removeItem(STORAGE_KEY);
              }}
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          </div>

          {resultados.map((r) => (
            <div
              key={r.id}
              className="bg-card border border-border p-5 hover-gold-glow transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 border border-primary/30 text-primary tracking-wider">
                    {r.tribunal}
                  </span>
                  {/* Verified source badge */}
                  {(() => {
                    const VERIFIED_SOURCES = new Set([
                      "lexml", "lexml_catalogo", "camara", "camara_proposicoes", "dados_gov",
                      "stf", "stf_bigquery", "cnj",
                      "planalto_codigo_civil", "planalto_cpc", "planalto_codigo_penal", "planalto_clt",
                      "catalogo_leis", "neural_catalogo_leis",
                      "datajud_stj", "datajud_tst", "datajud_tse", "datajud_stm",
                      ...Array.from({ length: 6 }, (_, i) => `datajud_trf${i + 1}`),
                      ...["ac","al","am","ap","ba","ce","dft","es","go","ma","mg","ms","mt","pa","pb","pe","pi","pr","rj","rn","ro","rr","rs","sc","se","sp","to"].map(s => `datajud_tj${s}`),
                      ...Array.from({ length: 24 }, (_, i) => `datajud_trt${i + 1}`),
                    ]);
                    const isVerified = VERIFIED_SOURCES.has(r.source);
                    const isGoogleFallback = r.url?.includes("google.com/search");
                    if (isVerified && !isGoogleFallback) {
                      return (
                        <span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 text-green-600 flex items-center gap-0.5" title="Fonte oficial verificada">
                          ✅ Verificada
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {r.isNeural && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
                      <Brain className="h-2.5 w-2.5 mr-0.5" />
                      Neural
                    </Badge>
                  )}
                   {r.quantum_category && (() => {
                    const areaKey = r.quantum_category.toLowerCase();
                    const areaStyle = AREA_COLORS[areaKey];
                    if (areaStyle) {
                      return (
                        <Badge className={`text-[9px] px-1.5 py-0.5 border ${areaStyle.bg} ${areaStyle.text}`}>
                          ⚖️ {areaStyle.label}
                        </Badge>
                      );
                    }
                    return (
                      <span className="text-[8px] px-1.5 py-0.5 bg-muted text-muted-foreground border border-border rounded">
                        {r.quantum_category}
                      </span>
                    );
                  })()}
                  {r.score != null && r.score > 0 && (
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {(r.score * 100).toFixed(0)}%
                    </span>
                  )}
                  <span className="text-sm font-medium text-foreground line-clamp-1">{r.numero}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{r.data}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{r.ementa}</p>

              {/* Attention Heads Toggle */}
              {r.attention_heads && (
                <div className="mb-2">
                  <button
                    onClick={() => toggleHeads(r.id)}
                    className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors"
                  >
                    <BarChart3 className="h-3 w-3" />
                    {expandedHeads.has(r.id) ? "Ocultar" : "Ver"} análise de atenção
                  </button>
                  {expandedHeads.has(r.id) && (
                    <AttentionBreakdown heads={r.attention_heads} />
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ResultFeedback result={r} query={query} />
                  <span className="text-[10px] text-muted-foreground">
                    {r.relator ? `Rel. ${r.relator}` : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground h-7" onClick={() => handleCopyResult(r)}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </Button>
                  {isAdvogado && (
                    <Button variant="ghost" size="sm" className="text-[10px] text-primary h-7" onClick={() => handleInsertInDocument(r)}>
                      <Scale className="h-3 w-3 mr-1" />
                      Fundamentar documento
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground h-7" onClick={() => setFullTextDialog(r)}>
                    <BookOpen className="h-3 w-3 mr-1" />
                    Ver Inteiro Teor
                  </Button>
                  {r.url && (() => { try { const u = new URL(r.url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } })() && (
                    <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground h-7" onClick={() => window.open(r.url, "_blank")}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Fonte
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!searched && (
        <div className="bg-card border border-border p-12 flex flex-col items-center justify-center text-center">
          <Scale className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground mb-1">
            {isAdvogado
              ? "Busque jurisprudência com IA para embasar suas petições"
              : "Pesquise sobre leis e decisões relevantes para o seu caso"}
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Pipeline RAG: Embedding → Hybrid Search v3 → Multi-Head Attention → QNN v11 → Cross-Encoder Rerank
          </p>
        </div>
      )}

      {/* Full Text Dialog */}
      <Dialog open={!!fullTextDialog} onOpenChange={(open) => !open && setFullTextDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              {fullTextDialog?.numero}
            </DialogTitle>
          </DialogHeader>
          {fullTextDialog && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 border border-primary/30 text-primary tracking-wider">
                  {fullTextDialog.tribunal}
                </span>
                {fullTextDialog.isNeural && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
                    <Brain className="h-2.5 w-2.5 mr-0.5" />
                    Neural
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">{fullTextDialog.data}</span>
              </div>

              {fullTextDialog.attention_heads && (
                <AttentionBreakdown heads={fullTextDialog.attention_heads} />
              )}

              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap border border-border p-4 bg-muted/30">
                {fullTextDialog.fullContent}
              </div>
              {fullTextDialog.url && (() => { try { const u = new URL(fullTextDialog.url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } })() && (
                <Button variant="outline" size="sm" className="text-xs" onClick={() => window.open(fullTextDialog.url, "_blank")}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Acessar fonte original
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => handleCopyResult(fullTextDialog)}>
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
                {isAdvogado && (
                   <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => { handleInsertInDocument(fullTextDialog); setFullTextDialog(null); }}>
                     <Scale className="h-3 w-3 mr-1" />
                     Fundamentar documento
                   </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating bar when contexts are selected */}
      {selectedContexts > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <Scale className="h-4 w-4" />
          <span className="text-sm font-medium">
            {selectedContexts} fundamentação{selectedContexts > 1 ? "ções" : ""} selecionada{selectedContexts > 1 ? "s" : ""}
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs"
            onClick={() => navigate("/dashboard/gerar-documento")}
          >
            Gerar documento
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => {
              sessionStorage.removeItem("pesquisa_contexts");
              setSelectedContexts(0);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
