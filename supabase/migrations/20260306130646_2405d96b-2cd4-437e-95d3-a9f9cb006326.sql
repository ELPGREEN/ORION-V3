-- Fix: Restrict neural_learning_data INSERT from {public} to {authenticated}
DROP POLICY IF EXISTS "Users can insert their own learning data" ON public.neural_learning_data;
CREATE POLICY "Users can insert their own learning data"
  ON public.neural_learning_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Fix: Restrict document_style_memory from {public} to {authenticated}
DROP POLICY IF EXISTS "Users can manage their own style memory" ON public.document_style_memory;
CREATE POLICY "Users can manage their own style memory"
  ON public.document_style_memory
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix: Restrict blooms from {public} to {authenticated}
DROP POLICY IF EXISTS "Users can manage their own blooms" ON public.blooms;
CREATE POLICY "Users can manage their own blooms"
  ON public.blooms
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix: Restrict blooms shared view from {public} to {authenticated}
DROP POLICY IF EXISTS "Shared users can view blooms" ON public.blooms;
CREATE POLICY "Shared users can view blooms"
  ON public.blooms
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bloom_shares bs
    WHERE bs.shared_with = auth.uid()
      AND bs.bloom_root_id = blooms.root_id
  ));

-- Fix: Restrict bloom_shares from {public} to {authenticated}
DROP POLICY IF EXISTS "Owners can manage shares" ON public.bloom_shares;
CREATE POLICY "Owners can manage shares"
  ON public.bloom_shares
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Shared users can view shares" ON public.bloom_shares;
CREATE POLICY "Shared users can view shares"
  ON public.bloom_shares
  FOR SELECT
  TO authenticated
  USING (auth.uid() = shared_with);