-- Tabela de métricas de áudio do Orion (latência STT, confiança, tempo até primeiro token)
CREATE TABLE IF NOT EXISTS public.orion_audio_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  engine TEXT NOT NULL,
  stt_latency_ms INTEGER,
  confidence DOUBLE PRECISION,
  audio_duration_ms INTEGER,
  transcript_length INTEGER,
  semantic_filter_used BOOLEAN DEFAULT false,
  fallback_used BOOLEAN DEFAULT false,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orion_audio_metrics_user_created ON public.orion_audio_metrics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orion_audio_metrics_engine ON public.orion_audio_metrics(engine);

ALTER TABLE public.orion_audio_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own audio metrics" ON public.orion_audio_metrics;
CREATE POLICY "Users see own audio metrics"
  ON public.orion_audio_metrics FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users insert own audio metrics" ON public.orion_audio_metrics;
CREATE POLICY "Users insert own audio metrics"
  ON public.orion_audio_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Service role full access" ON public.orion_audio_metrics;
CREATE POLICY "Service role full access"
  ON public.orion_audio_metrics FOR ALL
  USING (auth.role() = 'service_role');