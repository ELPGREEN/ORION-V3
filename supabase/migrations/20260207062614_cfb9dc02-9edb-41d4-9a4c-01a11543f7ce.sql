-- Tabela para mensagens de chat entre advogado e cliente
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'cliente',
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para conversas (agrupamento de mensagens)
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL,
  advogado_id UUID,
  status TEXT NOT NULL DEFAULT 'ativo',
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Index para performance
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_unread ON public.chat_messages(sender_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_chat_conversations_cliente ON public.chat_conversations(cliente_id);

-- RLS Policies para chat_messages
CREATE POLICY "Participantes podem ver mensagens da conversa"
ON public.chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
    AND (c.cliente_id = auth.uid() OR has_role(auth.uid(), 'advogado'))
  )
);

CREATE POLICY "Participantes podem enviar mensagens"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = conversation_id
    AND (c.cliente_id = auth.uid() OR has_role(auth.uid(), 'advogado'))
  )
);

CREATE POLICY "Participantes podem marcar como lida"
ON public.chat_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id
    AND (c.cliente_id = auth.uid() OR has_role(auth.uid(), 'advogado'))
  )
);

-- RLS Policies para chat_conversations
CREATE POLICY "Clientes veem suas próprias conversas"
ON public.chat_conversations FOR SELECT
USING (cliente_id = auth.uid() OR has_role(auth.uid(), 'advogado'));

CREATE POLICY "Clientes podem criar conversas"
ON public.chat_conversations FOR INSERT
WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "Participantes podem atualizar conversas"
ON public.chat_conversations FOR UPDATE
USING (cliente_id = auth.uid() OR has_role(auth.uid(), 'advogado'));

-- Função para contar mensagens não lidas
CREATE OR REPLACE FUNCTION public.get_unread_count(user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.chat_messages m
  JOIN public.chat_conversations c ON c.id = m.conversation_id
  WHERE m.read_at IS NULL
    AND m.sender_id != user_id
    AND (c.cliente_id = user_id OR has_role(user_id, 'advogado'))
$$;

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;