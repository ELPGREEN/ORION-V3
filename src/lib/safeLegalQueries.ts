import { supabase } from "@/integrations/supabase/client";

/**
 * Safe count for legal_embeddings — avoids selecting vector columns.
 * Returns 0 on any error instead of crashing.
 */
export async function safeLegalEmbeddingsCount(
  filterFn?: (q: any) => any
): Promise<number> {
  try {
    let query: any = supabase.from("legal_embeddings").select("id", { count: "exact", head: true });
    if (filterFn) query = filterFn(query);
    const { count, error } = await query;
    if (error) {
      console.warn("[safeLegalEmbeddingsCount]", error.message);
      return 0;
    }
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Safe source distribution — selects only `source`, never vector columns.
 */
export async function safeLegalEmbeddingsSources(limit = 1000): Promise<{ source: string }[]> {
  try {
    const { data, error } = await supabase
      .from("legal_embeddings")
      .select("source")
      .limit(limit);
    if (error) {
      console.warn("[safeLegalEmbeddingsSources]", error.message);
      return [];
    }
    return (data as any[]) || [];
  } catch {
    return [];
  }
}
