-- Create client_documents table for storing documents per client
CREATE TABLE IF NOT EXISTS public.client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id UUID NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  categoria TEXT DEFAULT 'geral',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_documents
CREATE POLICY "Advogados can manage client documents"
ON public.client_documents
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'advogado'))
WITH CHECK (has_role(auth.uid(), 'advogado'));

-- Clients can view their own documents
CREATE POLICY "Clients can view their own documents"
ON public.client_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_profiles cp
    WHERE cp.id = client_documents.client_profile_id
    AND cp.user_id = auth.uid()
  )
);