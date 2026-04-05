-- Update hybrid_search_legal_v3 to include new sources (dados_gov, stf_bigquery) in authority scoring
CREATE OR REPLACE FUNCTION public.hybrid_search_legal_v3(
  query_embedding vector, query_text text,
  match_count integer DEFAULT 20,
  semantic_weight double precision DEFAULT 0.55,
  keyword_weight double precision DEFAULT 0.25,
  authority_weight double precision DEFAULT 0.10,
  recency_weight double precision DEFAULT 0.10,
  filter_source text DEFAULT NULL::text,
  filter_type text DEFAULT NULL::text,
  filter_sources text[] DEFAULT NULL::text[],
  filter_date_from text DEFAULT NULL::text,
  filter_date_to text DEFAULT NULL::text
)
RETURNS TABLE(
  id uuid, title text, content text, source text, source_label text,
  content_type text, url text, published_date text, metadata jsonb,
  semantic_score double precision, keyword_score double precision,
  authority_score double precision, recency_score double precision,
  combined_score double precision
)
LANGUAGE plpgsql SECURITY DEFINER
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
    -- Authority score: boost official sources (includes new sources)
    (CASE
      WHEN le.source IN ('datajud_stj', 'datajud_tst', 'datajud_tse', 'stf', 'cnj', 'stf_bigquery') THEN 1.0
      WHEN le.source IN ('lexml', 'camara', 'dados_gov') THEN 0.85
      WHEN le.source IN ('freelaw', 'courtlistener_dockets') THEN 0.7
      WHEN le.source IN ('google_books', 'knowledge_graph') THEN 0.5
      ELSE 0.4
    END)::FLOAT AS authority_score,
    -- Recency score
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
        WHEN le.source IN ('datajud_stj', 'datajud_tst', 'datajud_tse', 'stf', 'cnj', 'stf_bigquery') THEN 1.0
        WHEN le.source IN ('lexml', 'camara', 'dados_gov') THEN 0.85
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
