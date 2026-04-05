-- Fix signature_envelopes delete policy: change from public to authenticated
DROP POLICY IF EXISTS "Advogados can delete their own envelopes" ON public.signature_envelopes;
CREATE POLICY "Advogados can delete their own envelopes"
ON public.signature_envelopes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fix chat_conversations: hide lawyer_instructions from clients
DROP POLICY IF EXISTS "Clientes veem suas próprias conversas" ON public.chat_conversations;
CREATE POLICY "Clientes veem suas próprias conversas"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (
  cliente_id = auth.uid()
  OR advogado_id = auth.uid()
  OR public.has_role(auth.uid(), 'advogado')
);