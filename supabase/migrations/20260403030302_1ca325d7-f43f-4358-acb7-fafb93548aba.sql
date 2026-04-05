ALTER TABLE public.neural_agent_config 
  ADD COLUMN IF NOT EXISTS voice_evolution_data JSONB DEFAULT NULL;