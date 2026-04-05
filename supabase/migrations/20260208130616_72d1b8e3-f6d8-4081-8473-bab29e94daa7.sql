
-- Tabela para armazenar métricas de cada query processada pela Super IA
CREATE TABLE public.ai_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  query TEXT NOT NULL,
  complexity TEXT NOT NULL DEFAULT 'simple',
  provider TEXT NOT NULL,
  cost_tier INTEGER NOT NULL DEFAULT 1,
  phase1_duration_ms INTEGER,
  phase2_duration_ms INTEGER,
  total_duration_ms INTEGER NOT NULL,
  tools_used TEXT[] DEFAULT '{}',
  data_sources_used TEXT[] DEFAULT '{}',
  tokens_estimated INTEGER,
  response_length INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_metrics ENABLE ROW LEVEL SECURITY;

-- Advogados can view all metrics
CREATE POLICY "Advogados can view all metrics"
ON public.ai_metrics
FOR SELECT
USING (public.has_role(auth.uid(), 'advogado'));

-- Service role can insert (from edge functions)
CREATE POLICY "Service role can insert metrics"
ON public.ai_metrics
FOR INSERT
WITH CHECK (true);

-- Create indexes for dashboard queries
CREATE INDEX idx_ai_metrics_created_at ON public.ai_metrics (created_at DESC);
CREATE INDEX idx_ai_metrics_provider ON public.ai_metrics (provider);
CREATE INDEX idx_ai_metrics_complexity ON public.ai_metrics (complexity);
CREATE INDEX idx_ai_metrics_cost_tier ON public.ai_metrics (cost_tier);
