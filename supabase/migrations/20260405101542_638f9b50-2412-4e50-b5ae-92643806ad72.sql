
-- =============================================
-- OWASP A01: Fix shared_documents USING(true)
-- =============================================
DROP POLICY IF EXISTS "Users can view shared documents" ON public.shared_documents;
DROP POLICY IF EXISTS "Authenticated users can view shared_documents" ON public.shared_documents;
DROP POLICY IF EXISTS "shared_documents_select" ON public.shared_documents;

CREATE POLICY "shared_docs_owner_or_recipient_select"
ON public.shared_documents
FOR SELECT
TO authenticated
USING (auth.uid() = shared_by OR auth.uid() = shared_with);

DROP POLICY IF EXISTS "Users can share documents" ON public.shared_documents;
DROP POLICY IF EXISTS "shared_documents_insert" ON public.shared_documents;

CREATE POLICY "shared_docs_owner_insert"
ON public.shared_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = shared_by);

DROP POLICY IF EXISTS "Users can delete shared documents" ON public.shared_documents;
DROP POLICY IF EXISTS "shared_documents_delete" ON public.shared_documents;

CREATE POLICY "shared_docs_owner_delete"
ON public.shared_documents
FOR DELETE
TO authenticated
USING (auth.uid() = shared_by);

-- =============================================
-- OWASP A01: Fix report_verifications anon exposure
-- =============================================
DROP POLICY IF EXISTS "Anyone can view report verifications" ON public.report_verifications;
DROP POLICY IF EXISTS "report_verifications_select" ON public.report_verifications;
DROP POLICY IF EXISTS "Anon can view verifications by hash" ON public.report_verifications;

-- Secure RPC for public hash verification (no direct table access needed)
CREATE OR REPLACE FUNCTION public.verify_report_by_hash(target_hash text)
RETURNS TABLE(
  id uuid,
  verification_hash varchar,
  document_title text,
  verified_at timestamptz,
  is_valid boolean,
  views_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.report_verifications rv
  SET views_count = rv.views_count + 1,
      last_viewed_at = now()
  WHERE rv.verification_hash = target_hash;

  RETURN QUERY
  SELECT rv.id, rv.verification_hash, rv.title, rv.generated_at, rv.is_signed, rv.views_count
  FROM public.report_verifications rv
  WHERE rv.verification_hash = target_hash;
END;
$$;

-- Only the generator can see their own verifications
CREATE POLICY "report_verifications_own_select"
ON public.report_verifications
FOR SELECT
TO authenticated
USING (auth.uid() = generated_by);

-- =============================================
-- OWASP A01: Fix signature_log PII exposure
-- (no user_id column — restrict to admins)
-- =============================================
DROP POLICY IF EXISTS "Anyone can view signature logs" ON public.signature_log;
DROP POLICY IF EXISTS "signature_log_select" ON public.signature_log;
DROP POLICY IF EXISTS "Authenticated users can view signature_log" ON public.signature_log;

CREATE POLICY "signature_log_admin_select"
ON public.signature_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Keep insert open for authenticated (signing flow needs it)
DROP POLICY IF EXISTS "signature_log_insert" ON public.signature_log;
DROP POLICY IF EXISTS "Authenticated users can insert signature_log" ON public.signature_log;

CREATE POLICY "signature_log_auth_insert"
ON public.signature_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =============================================
-- OWASP A01: Restrict admin_emails to admins
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view admin_emails" ON public.admin_emails;
DROP POLICY IF EXISTS "admin_emails_select" ON public.admin_emails;
DROP POLICY IF EXISTS "Admin can manage emails" ON public.admin_emails;

CREATE POLICY "admin_emails_admin_only_select"
ON public.admin_emails
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_emails_admin_only_insert"
ON public.admin_emails
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admin_emails_admin_only_update"
ON public.admin_emails
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_emails_admin_only_delete"
ON public.admin_emails
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- =============================================
-- OWASP A01: Restrict audit_log to admins (read)
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can view audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.audit_log;

CREATE POLICY "audit_log_admin_only_select"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "audit_log_authenticated_insert"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);
