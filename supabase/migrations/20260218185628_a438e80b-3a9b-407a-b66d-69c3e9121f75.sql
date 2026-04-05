
-- ══════════════════════════════════════════════════════════════════
-- SECURITY HARDENING — Verification Round 3
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. user_roles: Prevent privilege escalation via self-insert
--    Users must NOT be able to assign themselves 'advogado' role.
--    Only service_role (backend) may insert any role; users can only
--    read their own roles (insertion is handled by the trigger).
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- Users can only read their own roles (set by trigger/admin)
-- No INSERT policy for authenticated users — only the trigger (SECURITY DEFINER)
-- and service_role can insert roles.
CREATE POLICY "Service role can manage user_roles"
  ON public.user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────
-- 2. neural_ab_experiments: Add WITH CHECK to ALL policy
--    Without WITH CHECK, INSERT/UPDATE bypass the USING condition.
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Advogados can manage AB experiments" ON public.neural_ab_experiments;
CREATE POLICY "Advogados can manage AB experiments"
  ON public.neural_ab_experiments
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'advogado'::app_role))
  WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));

-- ─────────────────────────────────────────────────────────────────
-- 3. neural_evolution_proposals: Add WITH CHECK to ALL policy
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Advogados can manage evolution proposals" ON public.neural_evolution_proposals;
CREATE POLICY "Advogados can manage evolution proposals"
  ON public.neural_evolution_proposals
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'advogado'::app_role))
  WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));

-- ─────────────────────────────────────────────────────────────────
-- 4. neural_prompt_versions: Add WITH CHECK to ALL policy
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Advogados can manage prompt versions" ON public.neural_prompt_versions;
CREATE POLICY "Advogados can manage prompt versions"
  ON public.neural_prompt_versions
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'advogado'::app_role))
  WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));

-- ─────────────────────────────────────────────────────────────────
-- 5. ai_metrics: Allow service_role to INSERT metrics
--    Edge functions run as service_role and need to log AI usage.
-- ─────────────────────────────────────────────────────────────────
CREATE POLICY "Service role can insert ai_metrics"
  ON public.ai_metrics
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────
-- 6. courtlistener_webhook_events: Allow service_role to INSERT
--    Webhook receiver edge function needs to write events.
-- ─────────────────────────────────────────────────────────────────
CREATE POLICY "Service role can insert webhook events"
  ON public.courtlistener_webhook_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────
-- 7. query_embedding_cache: Add service_role write access
--    Edge functions cache embedding results for performance.
-- ─────────────────────────────────────────────────────────────────
CREATE POLICY "Service role can manage query_embedding_cache"
  ON public.query_embedding_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────
-- 8. api_cache: Add service_role write access
--    Edge functions write cached API responses.
-- ─────────────────────────────────────────────────────────────────
CREATE POLICY "Service role can manage api_cache"
  ON public.api_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────
-- 9. shared_documents: Missing UPDATE policy
--    Advogados need to update shared doc metadata.
-- ─────────────────────────────────────────────────────────────────
CREATE POLICY "Advogados can update shared documents"
  ON public.shared_documents
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'advogado'::app_role))
  WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));
