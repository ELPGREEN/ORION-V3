
-- Add orion_voice_id to neural_agent_config
ALTER TABLE public.neural_agent_config ADD COLUMN IF NOT EXISTS orion_voice_id TEXT;

-- Create orion_voice_samples table
CREATE TABLE public.orion_voice_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sample_url TEXT NOT NULL,
  duration_ms INTEGER,
  quality_score NUMERIC(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orion_voice_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice samples"
  ON public.orion_voice_samples FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own voice samples"
  ON public.orion_voice_samples FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice samples"
  ON public.orion_voice_samples FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for voice samples
INSERT INTO storage.buckets (id, name, public) VALUES ('orion-voice-samples', 'orion-voice-samples', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own voice samples"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'orion-voice-samples' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own voice samples"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'orion-voice-samples' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own voice samples"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'orion-voice-samples' AND auth.uid()::text = (storage.foldername(name))[1]);
