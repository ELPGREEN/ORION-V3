-- Add advogado_id to client_profiles for lawyer-client linking
ALTER TABLE public.client_profiles
  ADD COLUMN advogado_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_client_profiles_advogado_id ON public.client_profiles(advogado_id);

-- Create view for available advogados (accessible to clients)
CREATE OR REPLACE VIEW public.available_advogados AS
SELECT 
  ur.user_id,
  COALESCE(
    (SELECT ec.nome_escritorio FROM public.escritorio_config ec WHERE ec.user_id = ur.user_id LIMIT 1),
    'Advogado'
  ) as nome,
  (SELECT ec.oab FROM public.escritorio_config ec WHERE ec.user_id = ur.user_id LIMIT 1) as oab,
  (SELECT ec.telefone FROM public.escritorio_config ec WHERE ec.user_id = ur.user_id LIMIT 1) as telefone
FROM public.user_roles ur
WHERE ur.role = 'advogado';