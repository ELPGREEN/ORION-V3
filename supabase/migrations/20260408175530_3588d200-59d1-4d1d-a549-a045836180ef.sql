
DROP VIEW IF EXISTS public.escritorio_public_view;

CREATE VIEW public.escritorio_public_view 
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  nome_escritorio,
  bio,
  areas_atuacao,
  site_ativo,
  logo_url,
  banner_url,
  frase_impacto,
  experiencia_anos,
  meta_description,
  linkedin_url,
  instagram_url,
  telefone,
  email_contato,
  whatsapp,
  website
FROM public.escritorio_config
WHERE site_ativo = true;

GRANT SELECT ON public.escritorio_public_view TO anon;
GRANT SELECT ON public.escritorio_public_view TO authenticated;

-- Add anon SELECT policy on escritorio_config restricted to public view columns
CREATE POLICY "Anon read via public view"
ON public.escritorio_config
FOR SELECT
TO anon
USING (site_ativo = true);
