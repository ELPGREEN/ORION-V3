
-- Allow advogados to delete chat conversations
CREATE POLICY "Advogados can delete conversations"
  ON public.chat_conversations
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'advogado'::app_role));

-- Allow advogados to delete chat messages
CREATE POLICY "Advogados can delete messages"
  ON public.chat_messages
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'advogado'::app_role));
