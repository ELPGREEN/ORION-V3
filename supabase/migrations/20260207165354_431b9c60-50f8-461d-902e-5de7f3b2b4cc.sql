
-- Fix pgvector operator access: include extensions schema in search_path

-- Drop and recreate functions with correct search_path including extensions schema

DROP FUNCTION IF EXISTS public.search_legal_embeddings;
DROP FUNCTION IF EXISTS public.hybrid_search_legal;

-- Recreate semantic search function with correct search_path
CREATE OR REPLACE FUNCTION public.search_legal_embeddings(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  filter_source TEXT DEFAULT NULL,
  filter_type TEXT DEFAULT NULL
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
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    le.id,
    le.title,
    le.content,
    le.source,
    le.source_label,
    le.content_type,
    le.url,
    le.published_date,
    le.metadata,
    (1 - (le.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.legal_embeddings le
  WHERE
    (1 - (le.embedding <=> query_embedding))::FLOAT >= match_threshold
    AND (filter_source IS NULL OR le.source = filter_source)
    AND (filter_type IS NULL OR le.content_type = filter_type)
  ORDER BY le.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Recreate hybrid search function with correct search_path
CREATE OR REPLACE FUNCTION public.hybrid_search_legal(
  query_embedding vector(768),
  query_text TEXT,
  match_count INT DEFAULT 10,
  semantic_weight FLOAT DEFAULT 0.7,
  keyword_weight FLOAT DEFAULT 0.3,
  filter_source TEXT DEFAULT NULL,
  filter_type TEXT DEFAULT NULL
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
  combined_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    le.id,
    le.title,
    le.content,
    le.source,
    le.source_label,
    le.content_type,
    le.url,
    le.published_date,
    le.metadata,
    (1 - (le.embedding <=> query_embedding))::FLOAT AS semantic_score,
    COALESCE(ts_rank(to_tsvector('portuguese', le.title || ' ' || le.content), plainto_tsquery('portuguese', query_text)), 0)::FLOAT AS keyword_score,
    (
      semantic_weight * (1 - (le.embedding <=> query_embedding)) +
      keyword_weight * COALESCE(ts_rank(to_tsvector('portuguese', le.title || ' ' || le.content), plainto_tsquery('portuguese', query_text)), 0)
    )::FLOAT AS combined_score
  FROM public.legal_embeddings le
  WHERE
    (filter_source IS NULL OR le.source = filter_source)
    AND (filter_type IS NULL OR le.content_type = filter_type)
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;
