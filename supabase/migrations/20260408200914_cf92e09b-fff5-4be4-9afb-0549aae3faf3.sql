
-- =============================================
-- CRITICAL FIX 1: product-files storage policy
-- =============================================
DROP POLICY IF EXISTS "Auth download product files" ON storage.objects;

CREATE POLICY "Verified customers download product files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-files'
  AND EXISTS (
    SELECT 1 FROM public.customer_access ca
    JOIN public.products p ON p.id = ca.product_id
    WHERE ca.user_id = auth.uid()
      AND ca.is_active = true
      AND (ca.expires_at IS NULL OR ca.expires_at > now())
  )
);

-- =============================================
-- CRITICAL FIX 2: Security scan results - admin only
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view scan results" ON public.security_scan_results;
DROP POLICY IF EXISTS "Authenticated users can view scan runs" ON public.security_scan_runs;

CREATE POLICY "Admins read scan results"
ON public.security_scan_results FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read scan runs"
ON public.security_scan_runs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- CRITICAL FIX 3: AML reports - restrict token access
-- =============================================
DROP POLICY IF EXISTS "Token-based public access" ON public.aml_screening_reports;

-- Re-create with restricted columns approach: require authentication for full access
CREATE POLICY "Authenticated users read own AML reports"
ON public.aml_screening_reports FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =============================================
-- IMPORTANT: Restrict internal AI/system tables
-- =============================================

-- neural_evolution_proposals
DROP POLICY IF EXISTS "Authenticated users can view proposals" ON public.neural_evolution_proposals;
CREATE POLICY "Admins read evolution proposals"
ON public.neural_evolution_proposals FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- neural_prompt_versions
DROP POLICY IF EXISTS "Authenticated users can view prompt versions" ON public.neural_prompt_versions;
CREATE POLICY "Admins read prompt versions"
ON public.neural_prompt_versions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- orion_self_analysis
DROP POLICY IF EXISTS "Authenticated read analysis" ON public.orion_self_analysis;
CREATE POLICY "Admins read self analysis"
ON public.orion_self_analysis FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- cpf_cache - restrict to admin only (LGPD)
DROP POLICY IF EXISTS "Admins and editors read cpf cache" ON public.cpf_cache;
DROP POLICY IF EXISTS "Admins can manage cpf cache" ON public.cpf_cache;
DROP POLICY IF EXISTS "Admin/editor read cpf_cache" ON public.cpf_cache;

CREATE POLICY "Admins read cpf cache"
ON public.cpf_cache FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage cpf cache"
ON public.cpf_cache FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- aml_screening_matches - restrict to admin only (LGPD/GDPR)
DROP POLICY IF EXISTS "Editors can insert matches" ON public.aml_screening_matches;
DROP POLICY IF EXISTS "Editors can view matches" ON public.aml_screening_matches;
DROP POLICY IF EXISTS "Admin/editor read aml_screening_matches" ON public.aml_screening_matches;
DROP POLICY IF EXISTS "Admin/editor insert aml_screening_matches" ON public.aml_screening_matches;

CREATE POLICY "Admins read aml matches"
ON public.aml_screening_matches FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage aml matches"
ON public.aml_screening_matches FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
