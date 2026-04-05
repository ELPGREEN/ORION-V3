import { useState, useMemo, useCallback } from "react";
import {
  pesquisaUnificada,
  type SourceId,
  type UnifiedSearchResponse,
  neuralSearch,
  type NeuralSearchResponse,
} from "@/lib/api";

export type SearchMode = "traditional" | "neural" | "comparative";

export interface AdvancedFilters {
  filterSources?: string[];
  filterDateFrom?: string;
  filterDateTo?: string;
  filterType?: string;
  expandQueries?: boolean;
}

export interface JurisprudencialSearchState {
  query: string;
  setQuery: (q: string) => void;
  searching: boolean;
  searchMode: SearchMode;
  setSearchMode: (m: SearchMode) => void;
  activeTribunal: number;
  setActiveTribunal: (i: number) => void;
  advancedFilters: AdvancedFilters;
  setAdvancedFilters: React.Dispatch<React.SetStateAction<AdvancedFilters>>;
  traditionalResponse: UnifiedSearchResponse | null;
  neuralResponse: NeuralSearchResponse | null;
  handleSearch: (e: React.FormEvent) => Promise<void>;
  sourceCounts: Record<string, number>;
  neuralSourceCounts: Record<string, number>;
  traditionalSourceCounts: Record<string, number>;
  searchTimings: { traditional?: number; neural?: number };
}

const TRIBUNAL_SOURCES: SourceId[][] = [
  ["stf", "lexml", "camara", "cnj", "freelaw", "courtlistener_dockets", "knowledge_graph", "google_books"],
  ["stf"],
  ["lexml"],
  ["camara"],
  ["cnj"],
  ["freelaw", "courtlistener_dockets"],
  ["google_books", "knowledge_graph"],
];

export { TRIBUNAL_SOURCES };

export function useJurisprudencialSearch(): JurisprudencialSearchState {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("traditional");
  const [activeTribunal, setActiveTribunal] = useState(0);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    expandQueries: false,
  });
  const [traditionalResponse, setTraditionalResponse] = useState<UnifiedSearchResponse | null>(null);
  const [neuralResponse, setNeuralResponse] = useState<NeuralSearchResponse | null>(null);
  const [searchTimings, setSearchTimings] = useState<{ traditional?: number; neural?: number }>({});

  const runTraditionalSearch = useCallback(async (q: string, tribunalIdx: number) => {
    const start = performance.now();
    try {
      const sources = TRIBUNAL_SOURCES[tribunalIdx];
      const data = await pesquisaUnificada(q, sources);
      return { data, time: Math.round(performance.now() - start) };
    } catch (err) {
      return {
        data: {
          query: q, totalResults: 0, results: [],
          errors: [{ source: "system", error: String(err) }],
          timestamp: new Date().toISOString(),
        } as UnifiedSearchResponse,
        time: Math.round(performance.now() - start),
      };
    }
  }, []);

  const runNeuralSearch = useCallback(async (q: string, tribunalIdx: number, filters: AdvancedFilters) => {
    const start = performance.now();
    try {
      const sourceFilter = tribunalIdx > 0 ? TRIBUNAL_SOURCES[tribunalIdx]?.[0] : undefined;
      const data = await neuralSearch(q, {
        mode: "search",
        hybrid: true,
        rerank: false,
        expandQueries: filters.expandQueries ?? false,
        matchThreshold: 0.25,
        matchCount: 20,
        filterSource: sourceFilter,
        filterType: filters.filterType,
        filterSources: filters.filterSources,
        filterDateFrom: filters.filterDateFrom,
        filterDateTo: filters.filterDateTo,
      });
      return { data, time: Math.round(performance.now() - start) };
    } catch (err) {
      return {
        data: {
          query: q, mode: "error", results: [], totalResults: 0,
          indexed: 0, pipeline: [], timestamp: new Date().toISOString(),
        } as NeuralSearchResponse,
        time: Math.round(performance.now() - start),
      };
    }
  }, []);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setTraditionalResponse(null);
    setNeuralResponse(null);
    setSearchTimings({});

    const q = query.trim();

    try {
      if (searchMode === "comparative") {
        const [tradResult, neuralResult] = await Promise.all([
          runTraditionalSearch(q, activeTribunal),
          runNeuralSearch(q, activeTribunal, advancedFilters),
        ]);
        setTraditionalResponse(tradResult.data);
        setNeuralResponse(neuralResult.data);
        setSearchTimings({ traditional: tradResult.time, neural: neuralResult.time });
      } else if (searchMode === "neural") {
        const result = await runNeuralSearch(q, activeTribunal, advancedFilters);
        setNeuralResponse(result.data);
        setSearchTimings({ neural: result.time });
      } else {
        const result = await runTraditionalSearch(q, activeTribunal);
        setTraditionalResponse(result.data);
        setSearchTimings({ traditional: result.time });
      }
    } finally {
      setSearching(false);
    }
  }, [query, searching, searchMode, activeTribunal, advancedFilters, runTraditionalSearch, runNeuralSearch]);

  const buildSourceCounts = useCallback((results: Array<{ source: string }>) => {
    const counts: Record<string, number> = {};
    results.forEach((r) => { counts[r.source] = (counts[r.source] || 0) + 1; });
    return counts;
  }, []);

  const traditionalSourceCounts = useMemo(
    () => (traditionalResponse ? buildSourceCounts(traditionalResponse.results) : {}),
    [traditionalResponse, buildSourceCounts]
  );
  const neuralSourceCounts = useMemo(
    () => (neuralResponse ? buildSourceCounts(neuralResponse.results) : {}),
    [neuralResponse, buildSourceCounts]
  );
  const sourceCounts = useMemo(() => {
    if (searchMode === "comparative") return { ...traditionalSourceCounts, ...neuralSourceCounts };
    if (searchMode === "neural") return neuralSourceCounts;
    return traditionalSourceCounts;
  }, [searchMode, traditionalSourceCounts, neuralSourceCounts]);

  return {
    query, setQuery, searching, searchMode, setSearchMode,
    activeTribunal, setActiveTribunal,
    advancedFilters, setAdvancedFilters,
    traditionalResponse, neuralResponse, handleSearch,
    sourceCounts, neuralSourceCounts, traditionalSourceCounts, searchTimings,
  };
}
