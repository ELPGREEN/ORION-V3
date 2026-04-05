
-- ============================================================
-- FIX 1: chat_conversations — advogados should only see THEIR conversations
-- ============================================================
DROP POLICY IF EXISTS "Clientes veem suas próprias conversas" ON public.chat_conversations;
DROP POLICY IF EXISTS "Participantes podem atualizar conversas" ON public.chat_conversations;
DROP POLICY IF EXISTS "Advogados podem criar conversas" ON public.chat_conversations;
DROP POLICY IF EXISTS "Advogados can delete conversations" ON public.chat_conversations;

-- SELECT: each advogado only sees conversations assigned to them
CREATE POLICY "Participantes podem ver conversas"
  ON public.chat_conversations FOR SELECT TO authenticated
  USING (
    cliente_id = auth.uid()
    OR advogado_id = auth.uid()
  );

-- UPDATE: only participants of this specific conversation
CREATE POLICY "Participantes podem atualizar conversas"
  ON public.chat_conversations FOR UPDATE TO authenticated
  USING (
    cliente_id = auth.uid()
    OR advogado_id = auth.uid()
  );

-- INSERT for advogados: must set themselves as advogado_id
CREATE POLICY "Advogados podem criar conversas"
  ON public.chat_conversations FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'advogado'::app_role) AND advogado_id = auth.uid()
  );

-- DELETE: only the assigned advogado
CREATE POLICY "Advogados can delete own conversations"
  ON public.chat_conversations FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'advogado'::app_role) AND advogado_id = auth.uid()
  );

-- ============================================================
-- FIX 2: chat_messages — advogados only see messages from THEIR conversations
-- ============================================================
DROP POLICY IF EXISTS "Participantes podem ver mensagens da conversa" ON public.chat_messages;
DROP POLICY IF EXISTS "Participantes podem enviar mensagens" ON public.chat_messages;
DROP POLICY IF EXISTS "Participantes podem marcar como lida" ON public.chat_messages;
DROP POLICY IF EXISTS "Advogados can delete messages" ON public.chat_messages;

CREATE POLICY "Participantes podem ver mensagens da conversa"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.cliente_id = auth.uid() OR c.advogado_id = auth.uid())
    )
  );

CREATE POLICY "Participantes podem enviar mensagens"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.cliente_id = auth.uid() OR c.advogado_id = auth.uid())
    )
  );

CREATE POLICY "Participantes podem marcar como lida"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND (c.cliente_id = auth.uid() OR c.advogado_id = auth.uid())
    )
  );

CREATE POLICY "Advogado pode deletar mensagens próprias"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
      AND c.advogado_id = auth.uid()
    )
  );

-- ============================================================
-- FIX 3: consultas — advogados only see consultas assigned to them
-- ============================================================
DROP POLICY IF EXISTS "Advogados can view all consultas" ON public.consultas;
DROP POLICY IF EXISTS "Advogados can update consultas" ON public.consultas;

CREATE POLICY "Advogados can view own consultas"
  ON public.consultas FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'advogado'::app_role)
    AND advogado_id = auth.uid()
  );

CREATE POLICY "Advogados can update own consultas"
  ON public.consultas FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'advogado'::app_role)
    AND advogado_id = auth.uid()
  );
