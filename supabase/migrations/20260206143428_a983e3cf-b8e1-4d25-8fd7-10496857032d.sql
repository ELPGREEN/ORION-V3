CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Foundation: Create lovable and auxiliary tables early to prevent dependency errors in subsequent migrations
CREATE TABLE IF NOT EXISTS public.lovable_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL DEFAULT '',
  lovable_id TEXT,
  user_lovable_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lovable_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lovable_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lovable_id TEXT NOT NULL DEFAULT '',
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lovable_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lovable_webhook_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT, path TEXT, signature TEXT,
  payload JSONB, status INTEGER, response_body JSONB,
  error TEXT, received_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.lovable_webhook_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.signed_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  file_path TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.signed_urls ENABLE ROW LEVEL SECURITY;

-- Create documents table for storing AI-generated legal documents
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  parties_author TEXT,
  parties_defendant TEXT,
  case_number TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  watermark TEXT DEFAULT 'rascunho',
  pdf_url TEXT,
  signature_status TEXT DEFAULT 'pendente',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own documents
CREATE POLICY "Users can view their own documents"
ON public.documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON public.documents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.documents FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_documents
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();
