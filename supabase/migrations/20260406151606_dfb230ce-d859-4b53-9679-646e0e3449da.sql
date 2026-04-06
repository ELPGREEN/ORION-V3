
-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create user_private_knowledge table
CREATE TABLE public.user_private_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  encrypted_content TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user queries
CREATE INDEX idx_upk_user_id ON public.user_private_knowledge(user_id);

-- Index for vector search
CREATE INDEX idx_upk_embedding ON public.user_private_knowledge USING hnsw (embedding vector_cosine_ops);

-- Enable RLS
ALTER TABLE public.user_private_knowledge ENABLE ROW LEVEL SECURITY;

-- RLS: users can only access their own data
CREATE POLICY "Users can view own private knowledge"
  ON public.user_private_knowledge FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own private knowledge"
  ON public.user_private_knowledge FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own private knowledge"
  ON public.user_private_knowledge FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own private knowledge"
  ON public.user_private_knowledge FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER set_updated_at_user_private_knowledge
  BEFORE UPDATE ON public.user_private_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Search function for private knowledge
CREATE OR REPLACE FUNCTION public.search_private_knowledge(
  p_user_id UUID,
  query_embedding vector,
  match_count INTEGER DEFAULT 10,
  match_threshold DOUBLE PRECISION DEFAULT 0.5
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  tags TEXT[],
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    upk.id,
    upk.title,
    upk.tags,
    (1 - (upk.embedding <=> query_embedding))::DOUBLE PRECISION AS similarity
  FROM public.user_private_knowledge upk
  WHERE upk.user_id = p_user_id
    AND upk.embedding IS NOT NULL
    AND (1 - (upk.embedding <=> query_embedding)) > match_threshold
  ORDER BY upk.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
