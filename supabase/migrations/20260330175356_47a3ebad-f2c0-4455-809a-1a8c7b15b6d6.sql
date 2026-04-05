ALTER TABLE public.neural_agent_config
  ADD COLUMN IF NOT EXISTS speech_style text NOT NULL DEFAULT 'formal',
  ADD COLUMN IF NOT EXISTS formality_level integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS humor_mode text NOT NULL DEFAULT 'neutro',
  ADD COLUMN IF NOT EXISTS proactive_vision boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nickname text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mirroring_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS personality_prompt text NOT NULL DEFAULT '';