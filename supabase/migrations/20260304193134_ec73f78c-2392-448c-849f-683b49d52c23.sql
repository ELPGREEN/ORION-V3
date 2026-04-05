-- Table to store learned document style patterns
CREATE TABLE public.document_style_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  style_fingerprint JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, document_type)
);

ALTER TABLE public.document_style_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own style memory"
  ON public.document_style_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_document_style_memory_updated_at
  BEFORE UPDATE ON public.document_style_memory
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();