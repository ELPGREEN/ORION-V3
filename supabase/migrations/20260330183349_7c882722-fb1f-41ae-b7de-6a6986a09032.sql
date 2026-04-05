
-- Fix: restrict adaptive_system_prompts write to advogados only
DROP POLICY IF EXISTS "Authenticated manage prompts" ON public.adaptive_system_prompts;

CREATE POLICY "Advogados manage prompts" ON public.adaptive_system_prompts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'advogado'::app_role))
  WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));
