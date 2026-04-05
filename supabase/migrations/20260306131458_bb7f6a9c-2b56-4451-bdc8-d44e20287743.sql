-- =====================================================
-- Performance: Lightweight indexes + cleanup
-- =====================================================

-- 1. CRITICAL: user_roles(user_id, role) for has_role() RLS
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role 
  ON public.user_roles (user_id, role);

-- 2. neural_learning_data(user_id) — 36K seq scans
CREATE INDEX IF NOT EXISTS idx_neural_learning_data_user_id 
  ON public.neural_learning_data (user_id);

-- 3. neural_knowledge_base FTS
CREATE INDEX IF NOT EXISTS idx_neural_kb_fts 
  ON public.neural_knowledge_base 
  USING gin(to_tsvector('portuguese', title || ' ' || content));

-- 4. CLEANUP: Drop unused indexes (~87MB saved)
DROP INDEX IF EXISTS public.idx_legal_embeddings_fulltext;
DROP INDEX IF EXISTS public.idx_legal_embeddings_title_content;
DROP INDEX IF EXISTS public.idx_le_fts;
DROP INDEX IF EXISTS public.idx_le_query_origin;
DROP INDEX IF EXISTS public.idx_le_metadata;
DROP INDEX IF EXISTS public.idx_le_published_date;
DROP INDEX IF EXISTS public.idx_le_source_date;