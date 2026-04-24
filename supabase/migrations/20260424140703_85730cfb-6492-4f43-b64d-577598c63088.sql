-- Repair: tornar idempotente a policy duplicada de interaction_feedback
DROP POLICY IF EXISTS "Users manage own feedback" ON public.interaction_feedback;

CREATE POLICY "Users manage own feedback" ON public.interaction_feedback
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);