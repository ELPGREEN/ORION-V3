-- Allow authenticated users to insert their own learning data (feedback)
CREATE POLICY "Users can insert their own learning data"
ON public.neural_learning_data
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert with null user_id (system feedback)
CREATE POLICY "Authenticated users can insert learning data"
ON public.neural_learning_data
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);