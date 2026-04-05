-- Fix security definer view by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.available_advogados;
CREATE VIEW public.available_advogados WITH (security_invoker = true) AS
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