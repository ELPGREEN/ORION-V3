
-- CRITICAL FIX 1: cpf_cache - PII exposed
DROP POLICY IF EXISTS "Authenticated read cpf cache" ON public.cpf_cache;
CREATE POLICY "Admins read cpf_cache"
  ON public.cpf_cache FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- CRITICAL FIX 2: secretary_summaries - open to all
DROP POLICY IF EXISTS "Authenticated manage secretary_summaries" ON public.secretary_summaries;
CREATE POLICY "Users manage own secretary_summaries"
  ON public.secretary_summaries FOR ALL
  TO authenticated
  USING (auth.uid() = cliente_id)
  WITH CHECK (auth.uid() = cliente_id);
CREATE POLICY "Admins manage all secretary_summaries"
  ON public.secretary_summaries FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- CRITICAL FIX 3: loi_documents - token not validated in policy
DROP POLICY IF EXISTS "Token-based loi access" ON public.loi_documents;
CREATE POLICY "Admins read loi_documents"
  ON public.loi_documents FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- CRITICAL FIX 4: report_verifications - hash check always true
DROP POLICY IF EXISTS "Public can verify via hash" ON public.report_verifications;
-- Verification is done via verify_report_by_hash() security definer function only

-- CRITICAL FIX 5: shared_documents - blanket USING (true) overrides restrictive policy
DROP POLICY IF EXISTS "Users view shared docs" ON public.shared_documents;

-- HIGH FIX 6: audit_log injection
DROP POLICY IF EXISTS "audit_log_authenticated_insert" ON public.audit_log;

-- HIGH FIX 7: signature_log injection
DROP POLICY IF EXISTS "signature_log_auth_insert" ON public.signature_log;
