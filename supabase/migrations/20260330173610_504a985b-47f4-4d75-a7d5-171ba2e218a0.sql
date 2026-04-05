
CREATE TABLE public.neural_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona TEXT NOT NULL DEFAULT 'profissional',
  custom_instructions TEXT NOT NULL DEFAULT '',
  wake_word TEXT NOT NULL DEFAULT 'Ana',
  voice_enabled BOOLEAN NOT NULL DEFAULT true,
  voice_language TEXT NOT NULL DEFAULT 'pt-BR',
  voice_speed NUMERIC NOT NULL DEFAULT 0.92,
  voice_pitch NUMERIC NOT NULL DEFAULT 0.85,
  vision_enabled BOOLEAN NOT NULL DEFAULT true,
  vision_auto_describe BOOLEAN NOT NULL DEFAULT false,
  vision_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_commands JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_modules JSONB NOT NULL DEFAULT '["chat","vision","voice","identification"]'::jsonb,
  response_length TEXT NOT NULL DEFAULT 'medium',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.neural_agent_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own neural config"
  ON public.neural_agent_config
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_neural_agent_config
  BEFORE UPDATE ON public.neural_agent_config
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();
