/**
 * Hook de busca semântica client-side
 * Gera embeddings no browser via Transformers.js e compara com embeddings do Supabase
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SemanticResult {
  id: string;
  title: string;
  content: string;
  source: string;
  similarity: number;
}

export function useSemanticSearch() {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SemanticResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, options?: {
    matchCount?: number;
    threshold?: number;
    filterSource?: string;
  }) => {
    if (!query || query.length < 3) return;

    setSearching(true);
    setError(null);

    try {
      // Generate embedding client-side via Transformers.js (WASM)
      const { extractEmbeddings } = await import("@/lib/huggingface/transformers-browser");
      const embeddings = await extractEmbeddings(query);
      const queryEmbedding = embeddings[0];

      if (!queryEmbedding || queryEmbedding.length === 0) {
        throw new Error("Failed to generate embedding");
      }

      // Search against Supabase using the RPC function
      const { data, error: rpcError } = await supabase.rpc("search_legal_embeddings", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: options?.threshold ?? 0.3,
        match_count: options?.matchCount ?? 20,
        filter_source: options?.filterSource ?? null,
        filter_type: null,
      });

      if (rpcError) throw rpcError;

      const mapped: SemanticResult[] = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title || "",
        content: row.content || "",
        source: row.source_label || row.source || "",
        similarity: row.similarity || 0,
      }));

      setResults(mapped);
      return mapped;
    } catch (err: any) {
      console.warn("[useSemanticSearch]", err);
      setError(err.message || "Erro na busca semântica");
      return [];
    } finally {
      setSearching(false);
    }
  }, []);

  return { search, results, searching, error };
}
