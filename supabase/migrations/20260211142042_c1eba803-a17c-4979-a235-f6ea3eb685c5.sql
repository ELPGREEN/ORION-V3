
-- Tabela de conversas do chat IA
CREATE TABLE public.chat_ia_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_ia_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own chat_ia_conversations"
ON public.chat_ia_conversations FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_chat_ia_conversations_updated_at
BEFORE UPDATE ON public.chat_ia_conversations
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Tabela de mensagens do chat IA
CREATE TABLE public.chat_ia_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_ia_conversations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL DEFAULT '',
  intent text,
  intent_params jsonb,
  provider text,
  sources jsonb,
  neural_enhanced boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_ia_messages ENABLE ROW LEVEL SECURITY;

-- RLS via join para evitar recursão
CREATE POLICY "Users can view their own chat_ia_messages"
ON public.chat_ia_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.chat_ia_conversations c
  WHERE c.id = chat_ia_messages.conversation_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can insert their own chat_ia_messages"
ON public.chat_ia_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chat_ia_conversations c
  WHERE c.id = chat_ia_messages.conversation_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own chat_ia_messages"
ON public.chat_ia_messages FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.chat_ia_conversations c
  WHERE c.id = chat_ia_messages.conversation_id AND c.user_id = auth.uid()
));

-- Índices
CREATE INDEX idx_chat_ia_conversations_user_id ON public.chat_ia_conversations(user_id);
CREATE INDEX idx_chat_ia_messages_conversation_id ON public.chat_ia_messages(conversation_id);
CREATE INDEX idx_chat_ia_conversations_updated_at ON public.chat_ia_conversations(updated_at DESC);
