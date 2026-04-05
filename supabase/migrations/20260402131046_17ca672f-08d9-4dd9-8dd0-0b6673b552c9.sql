-- Reset items incorrectly marked as processed but without embeddings
UPDATE neural_knowledge_base 
SET is_processed = false 
WHERE embedding IS NULL AND is_processed = true;

-- Create helper function for edge functions to find items needing embeddings
CREATE OR REPLACE FUNCTION get_items_needing_embeddings(batch_limit int DEFAULT 100)
RETURNS TABLE(id uuid, title text, content text, source_type text)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT nkb.id, nkb.title, nkb.content, nkb.source_type
  FROM neural_knowledge_base nkb
  WHERE nkb.embedding IS NULL
  ORDER BY nkb.created_at DESC
  LIMIT batch_limit;
$$;

-- Create helper to count remaining items without embeddings  
CREATE OR REPLACE FUNCTION count_items_needing_embeddings()
RETURNS bigint
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COUNT(*) FROM neural_knowledge_base WHERE embedding IS NULL;
$$;