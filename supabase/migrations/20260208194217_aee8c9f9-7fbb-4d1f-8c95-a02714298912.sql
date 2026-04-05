-- Criar tabela para rascunhos de documentos
CREATE TABLE public.document_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  draft_key TEXT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  edited_content TEXT DEFAULT '',
  step INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_draft UNIQUE (user_id, draft_key)
);

-- Enable RLS
ALTER TABLE public.document_drafts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own drafts"
ON public.document_drafts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_document_drafts_updated_at
BEFORE UPDATE ON public.document_drafts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();