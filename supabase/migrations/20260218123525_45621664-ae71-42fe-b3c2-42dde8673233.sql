
-- Create andamentos table
CREATE TABLE public.andamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'outros',
  data_ocorrencia date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.andamentos ENABLE ROW LEVEL SECURITY;

-- Advogados: full access
CREATE POLICY "Advogados can manage andamentos"
ON public.andamentos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'advogado'::app_role))
WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));

-- Clientes: SELECT only for processos linked to their client_profile
CREATE POLICY "Clientes can view andamentos of their processos"
ON public.andamentos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.processos p
    JOIN public.client_profiles cp ON cp.id = p.client_profile_id
    WHERE p.id = andamentos.processo_id
      AND cp.user_id = auth.uid()
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_andamentos_updated_at
  BEFORE UPDATE ON public.andamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Add categoria column to processo_documents (if not exists)
ALTER TABLE public.processo_documents
  ADD COLUMN IF NOT EXISTS categoria text DEFAULT NULL;
