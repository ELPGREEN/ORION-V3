
-- ═══════════════════════════════════════════════════════════════
-- FASE 1 RAG: Cache de APIs + Índices otimizados para 100k+ docs
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabela de cache para respostas de APIs (evita re-fetching)
CREATE TABLE public.api_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT NOT NULL,
  source TEXT NOT NULL,
  query_text TEXT NOT NULL,
  response_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMP WITH TIME ZONE
);

-- Índices para lookup rápido de cache
CREATE UNIQUE INDEX idx_api_cache_hash_source ON public.api_cache (query_hash, source);
CREATE INDEX idx_api_cache_expires ON public.api_cache (expires_at);

-- Enable RLS
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- Cache é gerenciado pelo sistema (service role), leitura pública para edge functions
CREATE POLICY "Cache readable by system" ON public.api_cache FOR SELECT USING (true);
CREATE POLICY "Cache writable by system" ON public.api_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Cache updatable by system" ON public.api_cache FOR UPDATE USING (true);
CREATE POLICY "Cache deletable by system" ON public.api_cache FOR DELETE USING (true);

-- 2. Índices adicionais na legal_embeddings para 100k+ docs
-- GIN index para full-text search em português (já usado por hybrid_search_legal)
CREATE INDEX IF NOT EXISTS idx_legal_embeddings_fts 
  ON public.legal_embeddings 
  USING GIN (to_tsvector('portuguese', title || ' ' || content));

-- Índice parcial por source para filtros frequentes
CREATE INDEX IF NOT EXISTS idx_legal_embeddings_source ON public.legal_embeddings (source);
CREATE INDEX IF NOT EXISTS idx_legal_embeddings_content_type ON public.legal_embeddings (content_type);
CREATE INDEX IF NOT EXISTS idx_legal_embeddings_created ON public.legal_embeddings (created_at DESC);

-- 3. Função para limpar cache expirado (pode ser chamada periodicamente)
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.api_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 4. Função melhorada de hybrid search com boost por fonte oficial
CREATE OR REPLACE FUNCTION public.hybrid_search_legal_v2(
  query_embedding extensions.vector,
  query_text text,
  match_count integer DEFAULT 15,
  semantic_weight double precision DEFAULT 0.6,
  keyword_weight double precision DEFAULT 0.25,
  authority_weight double precision DEFAULT 0.15,
  filter_source text DEFAULT NULL,
  filter_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, title text, content text, source text, source_label text,
  content_type text, url text, published_date text, metadata jsonb,
  semantic_score double precision, keyword_score double precision,
  authority_score double precision, combined_score double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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
      END)
    )::FLOAT AS combined_score
  FROM public.legal_embeddings le
  WHERE (filter_source IS NULL OR le.source = filter_source)
    AND (filter_type IS NULL OR le.content_type = filter_type)
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;
