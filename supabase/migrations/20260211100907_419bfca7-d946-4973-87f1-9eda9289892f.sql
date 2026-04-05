
-- 1. Deduplicate neural_knowledge_base (keep newest)
DELETE FROM public.neural_knowledge_base a
USING public.neural_knowledge_base b
WHERE a.source_reference = b.source_reference
  AND a.user_id = b.user_id
  AND a.created_at < b.created_at;

-- Also handle exact same created_at by keeping lower id
DELETE FROM public.neural_knowledge_base a
USING public.neural_knowledge_base b
WHERE a.source_reference = b.source_reference
  AND a.user_id = b.user_id
  AND a.created_at = b.created_at
  AND a.id > b.id;

-- 2. Deduplicate legal_embeddings
DELETE FROM public.legal_embeddings a
USING public.legal_embeddings b
WHERE a.title = b.title
  AND a.source = b.source
  AND a.created_at < b.created_at;

DELETE FROM public.legal_embeddings a
USING public.legal_embeddings b
WHERE a.title = b.title
  AND a.source = b.source
  AND a.created_at = b.created_at
  AND a.id > b.id;

-- 3. Deduplicate neural_specializations
DELETE FROM public.neural_specializations a
USING public.neural_specializations b
WHERE a.user_id = b.user_id
  AND a.name = b.name
  AND a.created_at < b.created_at;

DELETE FROM public.neural_specializations a
USING public.neural_specializations b
WHERE a.user_id = b.user_id
  AND a.name = b.name
  AND a.created_at = b.created_at
  AND a.id > b.id;

-- 4. Deduplicate api_cache
DELETE FROM public.api_cache a
USING public.api_cache b
WHERE a.query_hash = b.query_hash
  AND a.source = b.source
  AND a.created_at < b.created_at;

DELETE FROM public.api_cache a
USING public.api_cache b
WHERE a.query_hash = b.query_hash
  AND a.source = b.source
  AND a.created_at = b.created_at
  AND a.id > b.id;

-- 5. Deduplicate query_embedding_cache
DELETE FROM public.query_embedding_cache a
USING public.query_embedding_cache b
WHERE a.query_hash = b.query_hash
  AND a.created_at < b.created_at;

DELETE FROM public.query_embedding_cache a
USING public.query_embedding_cache b
WHERE a.query_hash = b.query_hash
  AND a.created_at = b.created_at
  AND a.id > b.id;

-- Now add unique constraints
ALTER TABLE public.neural_knowledge_base
  ADD CONSTRAINT neural_knowledge_base_source_reference_user_id_key
  UNIQUE (source_reference, user_id);

ALTER TABLE public.legal_embeddings
  ADD CONSTRAINT legal_embeddings_title_source_key
  UNIQUE (title, source);

ALTER TABLE public.neural_specializations
  ADD CONSTRAINT neural_specializations_user_id_name_key
  UNIQUE (user_id, name);

ALTER TABLE public.api_cache
  ADD CONSTRAINT api_cache_query_hash_source_key
  UNIQUE (query_hash, source);

ALTER TABLE public.query_embedding_cache
  ADD CONSTRAINT query_embedding_cache_query_hash_key
  UNIQUE (query_hash);
