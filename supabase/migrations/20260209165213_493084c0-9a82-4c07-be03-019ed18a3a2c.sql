
-- Create processo_documents junction table
CREATE TABLE IF NOT EXISTS public.processo_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  storage_path text,
  file_type text,
  file_size integer,
  notas text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.processo_documents ENABLE ROW LEVEL SECURITY;

-- Advogados can manage processo documents
CREATE POLICY "Advogados can manage processo documents"
  ON public.processo_documents
  FOR ALL
  USING (has_role(auth.uid(), 'advogado'::app_role))
  WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));

-- Clients can view documents linked to their processes
CREATE POLICY "Clients can view processo documents"
  ON public.processo_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM processos p
      JOIN client_profiles cp ON cp.id = p.client_profile_id
      WHERE p.id = processo_documents.processo_id
        AND cp.user_id = auth.uid()
    )
  );
