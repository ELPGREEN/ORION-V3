-- Allow authenticated users to insert their own notifications
CREATE POLICY "Users can insert their own notificacoes"
ON public.notificacoes
FOR INSERT
WITH CHECK (auth.uid() = user_id);