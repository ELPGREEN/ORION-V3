
-- Fix query_embedding_cache: add missing columns that cause silent upsert failures
ALTER TABLE public.query_embedding_cache ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'RETRIEVAL_QUERY';
ALTER TABLE public.query_embedding_cache ADD COLUMN IF NOT EXISTS last_hit_at timestamptz;

-- Replace IVFFlat (suboptimal for 557 rows with 50 lists) with HNSW
DROP INDEX IF EXISTS idx_legal_embeddings_embedding;
CREATE INDEX idx_legal_embeddings_embedding_hnsw ON public.legal_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
