
-- Allow advogados to insert new conversations (they can set any cliente_id)
CREATE POLICY "Advogados podem criar conversas"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));
