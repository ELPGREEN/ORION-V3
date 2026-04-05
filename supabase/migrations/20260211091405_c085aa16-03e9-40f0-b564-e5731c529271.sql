
-- Remove all duplicates from legal_embeddings, keeping only one per (title, source)
DELETE FROM public.legal_embeddings a
USING public.legal_embeddings b
WHERE a.title = b.title
  AND a.source = b.source
  AND a.id > b.id;

-- Now create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_embeddings_title_source 
ON public.legal_embeddings (title, source);
