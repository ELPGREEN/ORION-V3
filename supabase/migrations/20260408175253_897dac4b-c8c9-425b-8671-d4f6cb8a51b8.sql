
-- 1. ESCRITORIO_CONFIG: Replace anon SELECT with a restricted view
DROP POLICY IF EXISTS "Public can view active lawyer sites" ON public.escritorio_config;

CREATE OR REPLACE VIEW public.escritorio_public_view AS
SELECT 
  id,
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
  instagram_url
FROM public.escritorio_config
WHERE site_ativo = true;

GRANT SELECT ON public.escritorio_public_view TO anon;
GRANT SELECT ON public.escritorio_public_view TO authenticated;

-- 2. GENERATED_DOCUMENTS: Remove dangerous anon UPDATE policy
DROP POLICY IF EXISTS "Anon can update signature data" ON public.generated_documents;

-- 3. NEURAL_RUNTIME_PATCHES: Restrict read to admins only
DROP POLICY IF EXISTS "Read active patches" ON public.neural_runtime_patches;

CREATE POLICY "Admins can read patches"
ON public.neural_runtime_patches
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
