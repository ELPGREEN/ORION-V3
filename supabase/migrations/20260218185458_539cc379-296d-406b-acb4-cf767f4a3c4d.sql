
-- Fix overly permissive INSERT policy on neural_learning_data
-- The policy "Authenticated users can insert learning data" allows inserting
-- records with any user_id as long as the caller is authenticated.
-- We drop it and keep only the correct one that enforces auth.uid() = user_id.

DROP POLICY IF EXISTS "Authenticated users can insert learning data" ON public.neural_learning_data;

-- Also add UPDATE/DELETE so users can manage their own learning data
-- (currently they can only INSERT and SELECT their own data — no way to correct mistakes)
CREATE POLICY "Users can update their own learning data"
  ON public.neural_learning_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning data"
  ON public.neural_learning_data
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow service_role (edge functions) to insert learning data without user_id restriction
-- (needed for background AI learning jobs that don't have a user context)
CREATE POLICY "Service role can manage learning data"
  ON public.neural_learning_data
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
