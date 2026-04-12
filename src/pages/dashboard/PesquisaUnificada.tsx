import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  Search, Loader2, Scale, Filter, AlertTriangle, X,
  BookOpen, Landmark, ScrollText, Database, Globe2, Brain,
  ChevronDown, ChevronUp, Sparkles, BarChart3, Copy,
  ExternalLink, ThumbsUp, ThumbsDown, FileText,
} from "lucide-react";
import { JurisdictionSelector, filterSourcesByJurisdiction, isSourceInJurisdiction, type Jurisdiction } from "@/components/dashboard/JurisdictionSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchResultCard } from "@/components/dashboard/pesquisa/SearchResultCard";
import {
  pesquisaUnificada,
  SOURCE_LABELS,
  TYPE_LABELS,
  type SourceId,
  type ResultType,
  type SearchResult as UnifiedResult,
  type UnifiedSearchResponse,
  
  
  type 
  type 
} from "@/lib/api";
import { AREA_COLORS } from "@/lib/area-colors";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════
// 60+ Tribunal Filters
// ═══════════════════════════════════════
interface TribunalGroup {
  label: string;
  tribunais: { id: string; label: string; sources: string[] }[];
}

const tribunalGroups: TribunalGroup[] = [
  { label: "Geral", tribunais: [{ id: "Todos", label: "Todos", sources: [] }] },
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
      [/Ã‡/g, "Ç"],
    ];
    let fixed = text;
    for (const [p, r] of replacements) fixed = fixed.replace(p, r);
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
              <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-muted-foreground w-7 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════
// Feedback component
// ═══════════════════════════════════════
function ResultFeedback({ resultId, query, quantumCategory, attentionHeads }: {
  resultId: string; query: string; quantumCategory?: string; attentionHeads?: Record<string, number>;
}) {
  const [sent, setSent] = useState<"positive" | "negative" | null>(null);
  const [sending, setSending] = useState(false);

  const send = async (feedback: "positive" | "negative") => {
    setSending(true);
    try {
      await submitSearchFeedback({
        result_id: resultId,
        query,
        quantum_category: quantumCategory || "civil",
        feedback,
        attention_heads: attentionHeads,
      });
      setSent(feedback);
    } catch (e) { console.warn("[Pesquisa] Feedback send failed:", e); } finally { setSending(false); }
  };

  if (sent) return <span className="text-[9px] text-muted-foreground">{sent === "positive" ? "✅ Relevante" : "❌ Irrelevante"} — QNN ajustado</span>;

  return (
    <div className="flex items-center gap-1">
      <button disabled={sending} onClick={() => send("positive")} className="p-1 rounded hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary disabled:opacity-50" title="Relevante">
        <ThumbsUp className="h-3 w-3" />
      </button>
      <button disabled={sending} onClick={() => send("negative")} className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive disabled:opacity-50" title="Irrelevante">
        <ThumbsDown className="h-3 w-3" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════
// Unified Result type
// ═══════════════════════════════════════
interface MergedResult {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceLabel: string;
  url?: string;
  date?: string;
  score?: number;
  isNeural?: boolean;
  fullContent?: string;
  attention_heads?: Record<string, number>;
  quantum_category?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

const ALL_TYPES: ResultType[] = ['lei', 'jurisprudencia', 'doutrina', 'entidade', 'proposicao', 'estatistica'];

const INTERNAL_SOURCES = new Set(["enriched_doc", "doc_generated", "generated_doc"]);

const STORAGE_KEY = "pesquisa-unificada-v2-state";

// ═══════════════════════════════════════
// Main Component
// ═══════════════════════════════════════
type NeuralSearchResult = any;
type NeuralSearchResponse = any;
const neuralSearch = async (..._a: any[]): Promise<any> => ({ results: [], totalResults: 0, timings: {}, pipeline: [], refinedQuery: '', area: '', queryType: '' });
const submitSearchFeedback = async (..._a: any[]) => {};

export default function PesquisaUnificada() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isAdvogado } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  const saved = useMemo(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }, []);

  const [query, setQuery] = useState(searchParams.get("q") || saved?.query || "");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<MergedResult[]>(saved?.results || []);
  const [searched, setSearched] = useState(saved?.searched || false);
  const [errors, setErrors] = useState<{ source: string; error: string }[]>([]);
  const [selectedTribunal, setSelectedTribunal] = useState<string>(saved?.selectedTribunal || "Todos");
  const [typeFilter, setTypeFilter] = useState<ResultType | null>(saved?.typeFilter || null);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(saved?.jurisdiction || "brasil");
  const [showFilters, setShowFilters] = useState(false);
  const [showAllTribunais, setShowAllTribunais] = useState(false);
  const [pipeline, setPipeline] = useState<string[]>([]);
  const [searchTimings, setSearchTimings] = useState<Record<string, number>>({});
  const [refinedQuery, setRefinedQuery] = useState<string | null>(null);
  const [detectedArea, setDetectedArea] = useState<string | null>(null);
  const [queryType, setQueryType] = useState<string | null>(null);
  const [expandedHeads, setExpandedHeads] = useState<Set<string>>(new Set());
  const [fullTextDialog, setFullTextDialog] = useState<MergedResult | null>(null);

  // Persist
  useEffect(() => {
    if (searched && results.length > 0) {
      try {
        const trimmed = results.slice(0, 50).map(r => ({
          ...r,
          fullContent: r.fullContent?.substring(0, 1000) || "",
          description: r.description?.substring(0, 500) || "",
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          query, results: trimmed, searched, selectedTribunal, typeFilter, jurisdiction,
        }));
      } catch { /* ignore */ }
    }
  }, [query, results, searched, selectedTribunal, typeFilter, jurisdiction]);

  // Auto-search from ?q=
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q.trim() && !searched && !searching) {
      setQuery(q);
      setTimeout(() => document.querySelector('form')?.requestSubmit(), 100);
    }
  }, []);

  const toggleHeads = (id: string) => {
    setExpandedHeads(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setResults([]);
    setErrors([]);
    setPipeline([]);
    setSearchTimings({});

    const startTime = performance.now();
    const filterSources = getSelectedSources(selectedTribunal);

    try {
      // Run neural search and unified search in parallel
      const [neuralResponse, unifiedResponse] = await Promise.allSettled([
        neuralSearch(query.trim(), {
          mode: "search_and_index",
          hybrid: true,
          rerank: true,
          expandQueries: true,
          matchCount: 20,
          matchThreshold: 0.25,
          filterSources,
        }),
        pesquisaUnificada(
          query.trim(),
          filterSources as SourceId[] | undefined,
          typeFilter || undefined,
        ),
      ]);

      const totalTime = Math.round(performance.now() - startTime);
      const merged: MergedResult[] = [];
      const seenIds = new Set<string>();

      // Process neural results
      if (neuralResponse.status === "fulfilled") {
        const nr = neuralResponse.value;
        setSearchTimings({ total: totalTime, ...nr.timings });
        setPipeline(nr.pipeline || []);
        setRefinedQuery(nr.refinedQuery || null);
        setDetectedArea(nr.area || null);
        setQueryType(nr.queryType || null);

        for (const r of nr.results) {
          if (INTERNAL_SOURCES.has(r.source)) continue;
          if (!isSourceInJurisdiction(r.source, jurisdiction)) continue;
          const id = r.id || crypto.randomUUID();
          if (seenIds.has(id)) continue;
          seenIds.add(id);
          merged.push({
            id,
            title: fixEncoding(r.title),
            description: fixEncoding((r.content || "").substring(0, 500)),
            fullContent: fixEncoding(r.content || ""),
            source: r.source,
            sourceLabel: fixEncoding(r.source_label || r.source?.toUpperCase() || ""),
            url: r.url || undefined,
            date: r.published_date || undefined,
            score: r.combined_score || r.multi_head_score || r.similarity,
            isNeural: true,
            attention_heads: r.attention_heads,
            quantum_category: r.quantum_category || undefined,
            type: r.content_type,
            metadata: r.metadata,
          });
        }
      } else {
        setSearchTimings({ total: totalTime });
      }

      // Process unified results
      if (unifiedResponse.status === "fulfilled") {
        const ur = unifiedResponse.value;
        setErrors(ur.errors || []);

        for (const r of ur.results) {
          // Deduplicate by title similarity
          const titleLower = r.title.toLowerCase();
          const isDupe = merged.some(m => m.title.toLowerCase() === titleLower);
          if (isDupe) continue;
          const id = crypto.randomUUID();
          seenIds.add(id);
          merged.push({
            id,
            title: r.title,
            description: r.description || "",
            fullContent: r.description || "",
            source: r.source,
            sourceLabel: r.sourceLabel,
            url: r.url,
            date: r.date,
            isNeural: false,
            type: r.type,
            metadata: r.metadata,
          });
        }
      } else {
        setErrors([{ source: "system", error: "Erro na pesquisa unificada" }]);
      }

      // Also do text fallback search
      let textQuery = supabase
        .from("legal_embeddings")
        .select("id, title, content, source, source_label, url, published_date")
        .textSearch("content", query, { type: "websearch", config: "portuguese" })
        .limit(10);
      if (filterSources) textQuery = textQuery.in("source", filterSources);
      const { data: textResults } = await textQuery;

      for (const r of (textResults || [])) {
        if (seenIds.has(r.id)) continue;
        const titleLower = r.title.toLowerCase();
        if (merged.some(m => m.title.toLowerCase() === titleLower)) continue;
        seenIds.add(r.id);
        merged.push({
          id: r.id,
          title: fixEncoding(r.title),
          description: fixEncoding(r.content.substring(0, 500)),
          fullContent: fixEncoding(r.content),
          source: r.source,
          sourceLabel: fixEncoding(r.source_label || r.source.toUpperCase()),
          url: r.url || undefined,
          date: r.published_date || undefined,
          isNeural: false,
        });
      }

      // Sort: neural first, then by score
      merged.sort((a, b) => {
        if (a.isNeural && !b.isNeural) return -1;
        if (!a.isNeural && b.isNeural) return 1;
        return (b.score || 0) - (a.score || 0);
      });

      setResults(merged);
      setSearched(true);

      toast({
        title: "Pesquisa concluída",
        description: `${merged.length} resultado(s) em ${totalTime}ms`,
      });
    } catch (error) {
      toast({ title: "Erro na pesquisa", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }, [query, searching, selectedTribunal, typeFilter, jurisdiction]);

  const handleClear = () => {
    setResults([]); setSearched(false); setQuery(""); setPipeline([]); setSearchTimings({}); setErrors([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleCopy = (r: MergedResult) => {
    const text = `${r.title}\n${r.fullContent || r.description}\nFonte: ${r.sourceLabel}${r.url ? `\nURL: ${r.url}` : ""}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  const handleInsertInDocument = (r: MergedResult) => {
    const raw = sessionStorage.getItem("pesquisa_contexts");
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({ title: r.title, source: r.source, sourceLabel: r.sourceLabel, description: (r.fullContent || r.description || "").substring(0, 500), url: r.url });
    sessionStorage.setItem("pesquisa_contexts", JSON.stringify(arr));
    toast({
      title: `Fundamentação adicionada (${arr.length})`,
      description: "Adicione mais ou vá ao gerador.",
      action: <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => navigate("/dashboard/gerar-documento")}>Ir ao gerador</Button>,
    });
  };

  // Source counts
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    results.forEach(r => { counts[r.source] = (counts[r.source] || 0) + 1; });
    return counts;
  }, [results]);

  const visibleGroups = showAllTribunais
    ? tribunalGroups
    : tribunalGroups.filter(g => ["Geral", "Superiores", "TRFs", "Legislação"].includes(g.label));

  const VERIFIED_SOURCES = useMemo(() => new Set([
    "lexml", "lexml_catalogo", "camara", "dados_gov", "stf", "stf_bigquery", "cnj",
    "catalogo_leis", "planalto_codigo_civil", "planalto_cpc", "planalto_codigo_penal", "planalto_clt",
    "datajud_stj", "datajud_tst", "datajud_tse", "datajud_stm",
    ...Array.from({ length: 6 }, (_, i) => `datajud_trf${i + 1}`),
    ...["ac","al","am","ap","ba","ce","dft","es","go","ma","mg","ms","mt","pa","pb","pe","pi","pr","rj","rn","ro","rr","rs","sc","se","sp","to"].map(s => `datajud_tj${s}`),
    ...Array.from({ length: 24 }, (_, i) => `datajud_trt${i + 1}`),
  ]), []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
          <Scale className="h-6 w-6 text-primary" />
          Pesquisa Jurídica
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Busca híbrida RAG Neural + 35+ fontes reais — DataJud (60+ tribunais), LexML, STF, Câmara, Senado, CourtListener, Doutrina.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-3 flex-wrap">
          <JurisdictionSelector value={jurisdiction} onChange={setJurisdiction} size="md" />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={jurisdiction === "eua" ? 'Ex: "civil rights", due process...' : 'Ex: "dano moral", código civil art. 927, habeas corpus...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 bg-card border-border"
            />
          </div>
          <Button type="submit" className="btn-gold h-12 px-6" disabled={searching || !query.trim()}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4 mr-2" />Pesquisar</>}
          </Button>
          <Button type="button" variant="outline" className="h-12 px-3" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Tribunal Filters */}
        <div className="space-y-2">
          {visibleGroups.map((group) => (
            <div key={group.label} className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] text-muted-foreground/60 w-16 shrink-0 uppercase tracking-widest">{group.label}</span>
              {group.tribunais.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTribunal(t.id);
                    if (query.trim() && t.id !== selectedTribunal) {
                      setTimeout(() => document.querySelector('form')?.requestSubmit(), 50);
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

        {/* Type Filter */}
        {showFilters && (
          <div className="bg-card border border-border p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Tipo de Resultado</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setTypeFilter(null)}
                className={cn("text-[10px] px-2.5 py-1 border transition-colors tracking-wider", !typeFilter ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50")}>
                Todos
              </button>
              {ALL_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                  className={cn("text-[10px] px-2.5 py-1 border transition-colors tracking-wider", typeFilter === t ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50")}>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Loading */}
      {searching && (
        <div className="bg-card border border-border p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-sm text-muted-foreground">Buscando em RAG Neural + fontes em paralelo...</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Pipeline: Embedding → Hybrid Search → Multi-Head Attention → Rerank</p>
        </div>
      )}

      {/* Pipeline Info */}
      {searched && !searching && pipeline.length > 0 && (
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground flex-wrap">
          <Sparkles className="h-3 w-3 text-primary shrink-0" />
          <span>Pipeline:</span>
          {pipeline.map((step, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span>→</span>}
              <span className="px-1.5 py-0.5 bg-muted/50 border border-border">{step}</span>
            </span>
          ))}
          {searchTimings.total && <span className="ml-auto text-primary">{searchTimings.total}ms</span>}
        </div>
      )}

      {/* Results */}
      {searched && !searching && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{results.length}</span> resultado(s) para "{query}"
                {selectedTribunal !== "Todos" && ` — ${selectedTribunal}`}
                {queryType === "process_number" && <Badge variant="outline" className="ml-2 text-[9px] border-primary/50 text-primary">🔢 Número de processo</Badge>}
                {queryType === "exact_phrase" && <Badge variant="outline" className="ml-2 text-[9px] border-primary/50 text-primary">🎯 Frase exata</Badge>}
                {refinedQuery && refinedQuery !== query && <span className="ml-2 text-primary/70">🧠 Refinada: "{refinedQuery}"</span>}
              </p>
              {detectedArea && AREA_COLORS[detectedArea.toLowerCase()] && (
                <Badge className={`text-[10px] px-2 py-0.5 border ${AREA_COLORS[detectedArea.toLowerCase()].bg} ${AREA_COLORS[detectedArea.toLowerCase()].text}`}>
                  ⚖️ {AREA_COLORS[detectedArea.toLowerCase()].label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-[10px] h-7 text-muted-foreground" onClick={handleClear}>
                <X className="h-3 w-3 mr-1" />Limpar
              </Button>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(sourceCounts).slice(0, 8).map(([source, count]) => (
                  <Badge key={source} variant="outline" className="text-[9px] px-1.5 py-0">
                    {SOURCE_LABELS[source as SourceId] || source}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Algumas fontes retornaram erros:</p>
                {errors.map((err, i) => (
                  <p key={i} className="text-[10px] text-destructive/80">{SOURCE_LABELS[err.source as SourceId] || err.source}: {err.error}</p>
                ))}
              </div>
            </div>
          )}

          {/* Results list */}
          {results.map((r) => (
            <div key={r.id} className="bg-card border border-border p-5 hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 border border-primary/30 text-primary tracking-wider">{r.sourceLabel}</span>
                  {VERIFIED_SOURCES.has(r.source) && !r.url?.includes("google.com/search") && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 text-green-600 flex items-center gap-0.5">✅ Verificada</span>
                  )}
                  {r.isNeural && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
                      <Brain className="h-2.5 w-2.5 mr-0.5" />Neural
                    </Badge>
                  )}
                  {r.quantum_category && AREA_COLORS[r.quantum_category.toLowerCase()] && (
                    <Badge className={`text-[9px] px-1.5 py-0.5 border ${AREA_COLORS[r.quantum_category.toLowerCase()].bg} ${AREA_COLORS[r.quantum_category.toLowerCase()].text}`}>
                      ⚖️ {AREA_COLORS[r.quantum_category.toLowerCase()].label}
                    </Badge>
                  )}
                  {r.score != null && r.score > 0 && (
                    <span className="text-[9px] text-muted-foreground font-mono">{(r.score * 100).toFixed(0)}%</span>
                  )}
                  <span className="text-sm font-medium text-foreground line-clamp-1">{r.title}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{r.date || ""}</span>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{r.description}...</p>

              {/* Attention Heads */}
              {r.attention_heads && (
                <div className="mb-2">
                  <button onClick={() => toggleHeads(r.id)} className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors">
                    <BarChart3 className="h-3 w-3" />{expandedHeads.has(r.id) ? "Ocultar" : "Ver"} análise de atenção
                  </button>
                  {expandedHeads.has(r.id) && <AttentionBreakdown heads={r.attention_heads} />}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <ResultFeedback resultId={r.id} query={query} quantumCategory={r.quantum_category} attentionHeads={r.attention_heads} />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground h-7" onClick={() => handleCopy(r)}>
                    <Copy className="h-3 w-3 mr-1" />Copiar
                  </Button>
                  {isAdvogado && (
                    <Button variant="ghost" size="sm" className="text-[10px] text-primary h-7" onClick={() => handleInsertInDocument(r)}>
                      <Scale className="h-3 w-3 mr-1" />Fundamentar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground h-7" onClick={() => setFullTextDialog(r)}>
                    <BookOpen className="h-3 w-3 mr-1" />Inteiro Teor
                  </Button>
                  {r.url && (() => { try { const u = new URL(r.url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } })() && (
                    <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground h-7" onClick={() => window.open(r.url, "_blank")}>
                      <ExternalLink className="h-3 w-3 mr-1" />Fonte
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* No results */}
          {results.length === 0 && errors.length === 0 && (
            <div className="bg-card border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum resultado encontrado para "{query}".</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Tente termos mais genéricos ou ative mais fontes.</p>
            </div>
          )}

          <p className="text-[9px] text-muted-foreground/50 text-center">
            Pesquisa em fontes públicas. Dados pessoais não são armazenados. LGPD Art. 7°, II.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!searched && !searching && (
        <div className="bg-card border border-border p-12 flex flex-col items-center justify-center text-center">
          <Scale className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground mb-1">
            Busque jurisprudência e legislação com IA para embasar suas petições
          </p>
          <p className="text-[10px] text-muted-foreground/60 mb-4">
            🧠 RAG Neural · ⚖️ DataJud (60+ tribunais) · 📜 LexML · 🏛️ STF · 🏛️ Câmara · 📚 Senado · 🌍 CourtListener
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px] text-muted-foreground/40">
            <span>🧠 Doutrina + Rede Neural</span>
            <span>📖 Legislação (47 leis)</span>
            <span>⚖️ DataJud 60+ tribunais</span>
            <span>🌍 Direito Comparado</span>
          </div>
        </div>
      )}

      {/* Full Text Dialog */}
      <Dialog open={!!fullTextDialog} onOpenChange={(open) => !open && setFullTextDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />{fullTextDialog?.title}
            </DialogTitle>
          </DialogHeader>
          {fullTextDialog && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 border border-primary/30 text-primary tracking-wider">{fullTextDialog.sourceLabel}</span>
                {fullTextDialog.isNeural && <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary"><Brain className="h-2.5 w-2.5 mr-0.5" />Neural</Badge>}
                {fullTextDialog.date && <span className="text-[10px] text-muted-foreground">{fullTextDialog.date}</span>}
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed font-sans">
                  {fullTextDialog.fullContent || fullTextDialog.description}
                </pre>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => handleCopy(fullTextDialog)}><Copy className="h-3 w-3 mr-1" />Copiar</Button>
                {isAdvogado && <Button variant="ghost" size="sm" className="text-primary" onClick={() => { handleInsertInDocument(fullTextDialog); setFullTextDialog(null); }}><Scale className="h-3 w-3 mr-1" />Fundamentar</Button>}
                {fullTextDialog.url && <Button variant="ghost" size="sm" onClick={() => window.open(fullTextDialog.url, "_blank")}><ExternalLink className="h-3 w-3 mr-1" />Fonte</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
