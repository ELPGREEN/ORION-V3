
-- ═══════════════════════════════════════════════════════════
-- ARQUITETURA NEURAL: Banco Vetorial para Pesquisa Semântica
-- Usa pgvector para armazenar embeddings de textos jurídicos
-- ═══════════════════════════════════════════════════════════

-- 1. Habilitar extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Tabela de embeddings jurídicos
CREATE TABLE public.legal_embeddings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Conteúdo original
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,          -- ex: 'stf', 'lexml', 'camara', 'cnj', 'google_books'
  source_label TEXT NOT NULL,    -- ex: 'STF', 'LexML Brasil'
  content_type TEXT NOT NULL,    -- ex: 'lei', 'jurisprudencia', 'doutrina', 'proposicao'
  url TEXT,
  published_date TEXT,
  -- Metadados
  metadata JSONB DEFAULT '{}',
  -- Vetor de embedding (768 dimensões - Gemini text-embedding-004)
  embedding extensions.vector(768),
  -- Controle
  query_origin TEXT,             -- query que originou a indexação
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Índice vetorial para busca por similaridade (IVFFlat para performance)
CREATE INDEX idx_legal_embeddings_vector ON public.legal_embeddings 
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 50);

-- 4. Índices auxiliares para filtragem
CREATE INDEX idx_legal_embeddings_source ON public.legal_embeddings(source);
CREATE INDEX idx_legal_embeddings_type ON public.legal_embeddings(content_type);
CREATE INDEX idx_legal_embeddings_created ON public.legal_embeddings(created_at DESC);

-- 5. Índice GIN para metadados JSONB
CREATE INDEX idx_legal_embeddings_metadata ON public.legal_embeddings USING GIN(metadata);

-- 6. Índice de texto para busca híbrida (keyword + semântica)
CREATE INDEX idx_legal_embeddings_title_content ON public.legal_embeddings 
  USING GIN(to_tsvector('portuguese', title || ' ' || content));

-- 7. Habilitar RLS
ALTER TABLE public.legal_embeddings ENABLE ROW LEVEL SECURITY;

-- 8. Política: leitura pública (dados são de fontes públicas)
CREATE POLICY "Legal embeddings are publicly readable"
  ON public.legal_embeddings
  FOR SELECT
  USING (true);

-- 9. Política: inserção apenas via service_role (edge functions)
CREATE POLICY "Only service role can insert embeddings"
  ON public.legal_embeddings
  FOR INSERT
  WITH CHECK (true);

-- 10. Política: atualização apenas via service_role
CREATE POLICY "Only service role can update embeddings"
  ON public.legal_embeddings
  FOR UPDATE
  USING (true);

-- 11. Função para busca semântica por similaridade coseno
CREATE OR REPLACE FUNCTION public.search_legal_embeddings(
  query_embedding extensions.vector(768),
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
SET search_path = public
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
    1 - (le.embedding <=> query_embedding) AS similarity
  FROM public.legal_embeddings le
  WHERE
    (1 - (le.embedding <=> query_embedding)) >= match_threshold
    AND (filter_source IS NULL OR le.source = filter_source)
    AND (filter_type IS NULL OR le.content_type = filter_type)
  ORDER BY le.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 12. Função para busca híbrida (semântica + keyword)
CREATE OR REPLACE FUNCTION public.hybrid_search_legal(
  query_embedding extensions.vector(768),
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
SET search_path = public
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

-- 13. Trigger para updated_at
CREATE TRIGGER update_legal_embeddings_updated_at
  BEFORE UPDATE ON public.legal_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();
