
-- 1. Drop the UNIQUE constraint on user_id so advogados can create multiple client profiles
ALTER TABLE public.client_profiles DROP CONSTRAINT IF EXISTS client_profiles_user_id_key;

-- 2. Create processos table for tracking legal cases
CREATE TABLE public.processos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  numero_processo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'civel',
  cliente_nome TEXT NOT NULL,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  vara TEXT,
  comarca TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento',
  descricao TEXT,
  ultima_movimentacao TEXT,
  data_distribuicao DATE,
  valor_causa NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Advogados can manage their own processos"
ON public.processos
FOR ALL
USING (has_role(auth.uid(), 'advogado'::app_role) AND auth.uid() = user_id)
WITH CHECK (has_role(auth.uid(), 'advogado'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Clientes can view processos linked to them"
ON public.processos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_profiles cp
    WHERE cp.id = processos.client_profile_id
    AND cp.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_processos_updated_at
  BEFORE UPDATE ON public.processos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();
