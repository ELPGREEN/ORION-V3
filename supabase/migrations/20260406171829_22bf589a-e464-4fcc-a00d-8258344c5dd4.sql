-- Drop legacy empty knowledge_embeddings table and orphan match_knowledge() RPC
DROP FUNCTION IF EXISTS public.match_knowledge(vector, double precision, integer);
DROP TABLE IF EXISTS public.knowledge_embeddings;