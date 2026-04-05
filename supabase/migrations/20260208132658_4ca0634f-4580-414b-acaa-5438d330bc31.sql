
-- ═══════════════════════════════════════════════════════════
-- FASE 2: RAG Pipeline Avançado
-- Query embedding cache + metadata indexes for 100k+ scale
-- ═══════════════════════════════════════════════════════════

-- 1. Query Embedding Cache — avoid re-computing embeddings for repeated queries
CREATE TABLE public.query_embedding_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT NOT NULL,
  query_text TEXT NOT NULL,
  embedding vector(768),
  task_type TEXT NOT NULL DEFAULT 'RETRIEVAL_QUERY',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMP WITH TIME ZONE
);

-- Unique constraint for upsert
CREATE UNIQUE INDEX idx_qec_query_hash ON public.query_embedding_cache (query_hash);

-- TTL cleanup index
CREATE INDEX idx_qec_expires ON public.query_embedding_cache (expires_at);

-- Enable RLS
ALTER TABLE public.query_embedding_cache ENABLE ROW LEVEL SECURITY;

-- Service role can manage cache
CREATE POLICY "Embedding cache readable by system" ON public.query_embedding_cache
  FOR SELECT USING (true);
CREATE POLICY "Embedding cache writable by system" ON public.query_embedding_cache
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Embedding cache updatable by system" ON public.query_embedding_cache
  FOR UPDATE USING (true);
CREATE POLICY "Embedding cache deletable by system" ON public.query_embedding_cache
  FOR DELETE USING (true);

-- 2. Composite indexes on legal_embeddings for metadata filtering at scale
-- Source + content_type for filtered searches
CREATE INDEX IF NOT EXISTS idx_le_source_type ON public.legal_embeddings (source, content_type);

-- Published date for date range filtering (partial index for non-null dates)
CREATE INDEX IF NOT EXISTS idx_le_published_date ON public.legal_embeddings (published_date) 
  WHERE published_date IS NOT NULL;

-- Source + published_date for combined tribunal+date filtering
CREATE INDEX IF NOT EXISTS idx_le_source_date ON public.legal_embeddings (source, published_date) 
  WHERE published_date IS NOT NULL;

-- Full-text search index for keyword matching (GIN)
CREATE INDEX IF NOT EXISTS idx_le_fts ON public.legal_embeddings 
  USING GIN (to_tsvector('portuguese', title || ' ' || content));

-- Content type index for type-based filtering
CREATE INDEX IF NOT EXISTS idx_le_content_type ON public.legal_embeddings (content_type);

-- Query origin for tracking which queries generated which embeddings
CREATE INDEX IF NOT EXISTS idx_le_query_origin ON public.legal_embeddings (query_origin)
  WHERE query_origin IS NOT NULL;

-- 3. Enhanced hybrid search v3 with date range filtering
CREATE OR REPLACE FUNCTION public.hybrid_search_legal_v3(
  query_embedding vector(768),
  query_text TEXT,
  match_count INTEGER DEFAULT 20,
  semantic_weight FLOAT DEFAULT 0.55,
  keyword_weight FLOAT DEFAULT 0.25,
  authority_weight FLOAT DEFAULT 0.10,
  recency_weight FLOAT DEFAULT 0.10,
  filter_source TEXT DEFAULT NULL,
  filter_type TEXT DEFAULT NULL,
  filter_sources TEXT[] DEFAULT NULL,
  filter_date_from TEXT DEFAULT NULL,
  filter_date_to TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source TEXT,
  source_label TEXT,
  content_type TEXT,
  url TEXT,
  published_date TEXT,
  metadata JSONB,
  semantic_score FLOAT,
  keyword_score FLOAT,
  authority_score FLOAT,
  recency_score FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    le.id, le.title, le.content, le.source, le.source_label,
    le.content_type, le.url, le.published_date, le.metadata,
    (1 - (le.embedding <=> query_embedding))::FLOAT AS semantic_score,
    COALESCE(ts_rank(
      to_tsvector('portuguese', le.title || ' ' || le.content),
      plainto_tsquery('portuguese', query_text)
    ), 0)::FLOAT AS keyword_score,
    -- Authority score: boost official sources
    (CASE
      WHEN le.source IN ('datajud_stj', 'datajud_tst', 'datajud_tse', 'stf', 'cnj') THEN 1.0
      WHEN le.source IN ('lexml', 'camara') THEN 0.85
      WHEN le.source IN ('freelaw', 'courtlistener_dockets') THEN 0.7
      WHEN le.source IN ('google_books', 'knowledge_graph') THEN 0.5
      ELSE 0.4
    END)::FLOAT AS authority_score,
    -- Recency score: boost recent documents
    (CASE
      WHEN le.published_date IS NULL THEN 0.3
      WHEN le.published_date >= to_char(now() - INTERVAL '1 year', 'YYYY-MM-DD') THEN 1.0
      WHEN le.published_date >= to_char(now() - INTERVAL '3 years', 'YYYY-MM-DD') THEN 0.8
      WHEN le.published_date >= to_char(now() - INTERVAL '5 years', 'YYYY-MM-DD') THEN 0.6
      WHEN le.published_date >= to_char(now() - INTERVAL '10 years', 'YYYY-MM-DD') THEN 0.4
      ELSE 0.2
    END)::FLOAT AS recency_score,
    (
      semantic_weight * (1 - (le.embedding <=> query_embedding)) +
      keyword_weight * COALESCE(ts_rank(
        to_tsvector('portuguese', le.title || ' ' || le.content),
        plainto_tsquery('portuguese', query_text)
      ), 0) +
      authority_weight * (CASE
        WHEN le.source IN ('datajud_stj', 'datajud_tst', 'datajud_tse', 'stf', 'cnj') THEN 1.0
        WHEN le.source IN ('lexml', 'camara') THEN 0.85
        WHEN le.source IN ('freelaw', 'courtlistener_dockets') THEN 0.7
        WHEN le.source IN ('google_books', 'knowledge_graph') THEN 0.5
        ELSE 0.4
      END) +
      recency_weight * (CASE
        WHEN le.published_date IS NULL THEN 0.3
        WHEN le.published_date >= to_char(now() - INTERVAL '1 year', 'YYYY-MM-DD') THEN 1.0
        WHEN le.published_date >= to_char(now() - INTERVAL '3 years', 'YYYY-MM-DD') THEN 0.8
        WHEN le.published_date >= to_char(now() - INTERVAL '5 years', 'YYYY-MM-DD') THEN 0.6
        WHEN le.published_date >= to_char(now() - INTERVAL '10 years', 'YYYY-MM-DD') THEN 0.4
        ELSE 0.2
      END)
    )::FLOAT AS combined_score
  FROM public.legal_embeddings le
  WHERE (filter_source IS NULL OR le.source = filter_source)
    AND (filter_type IS NULL OR le.content_type = filter_type)
    AND (filter_sources IS NULL OR le.source = ANY(filter_sources))
    AND (filter_date_from IS NULL OR le.published_date >= filter_date_from)
    AND (filter_date_to IS NULL OR le.published_date <= filter_date_to)
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- 4. Cleanup function for embedding cache
CREATE OR REPLACE FUNCTION public.cleanup_expired_embedding_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.query_embedding_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
