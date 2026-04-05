
-- Tabela para armazenar eventos de webhook do CourtListener
CREATE TABLE public.courtlistener_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type INTEGER NOT NULL,
  event_type_label TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID
);

-- Enable RLS
ALTER TABLE public.courtlistener_webhook_events ENABLE ROW LEVEL SECURITY;

-- Advogados podem ver todos os eventos
CREATE POLICY "Advogados can view webhook events"
  ON public.courtlistener_webhook_events
  FOR SELECT
  USING (has_role(auth.uid(), 'advogado'::app_role));

-- Advogados podem atualizar eventos (marcar como processado)
CREATE POLICY "Advogados can update webhook events"
  ON public.courtlistener_webhook_events
  FOR UPDATE
  USING (has_role(auth.uid(), 'advogado'::app_role));

-- Service pode inserir (webhook público)
CREATE POLICY "Service can insert webhook events"
  ON public.courtlistener_webhook_events
  FOR INSERT
  WITH CHECK (true);

-- Advogados podem deletar eventos
CREATE POLICY "Advogados can delete webhook events"
  ON public.courtlistener_webhook_events
  FOR DELETE
  USING (has_role(auth.uid(), 'advogado'::app_role));

-- Index para busca por tipo e status
CREATE INDEX idx_webhook_events_type ON public.courtlistener_webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON public.courtlistener_webhook_events(processed);
CREATE INDEX idx_webhook_events_created ON public.courtlistener_webhook_events(created_at DESC);
