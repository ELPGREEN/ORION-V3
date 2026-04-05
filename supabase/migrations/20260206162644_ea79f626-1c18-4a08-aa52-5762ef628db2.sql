
-- Create notifications table
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'sistema',
  titulo TEXT NOT NULL,
  descricao TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  referencia_id UUID,
  referencia_tipo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notificacoes"
  ON public.notificacoes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notificacoes"
  ON public.notificacoes FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert notifications (via edge functions/webhooks)
CREATE POLICY "Service can insert notificacoes"
  ON public.notificacoes FOR INSERT
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notificacoes"
  ON public.notificacoes FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX idx_notificacoes_lida ON public.notificacoes(user_id, lida);
