-- Add evolution_via_feedback and realtime_transcription to neural_agent_config
ALTER TABLE public.neural_agent_config
ADD COLUMN IF NOT EXISTS evolution_via_feedback BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS realtime_transcription BOOLEAN NOT NULL DEFAULT true;

-- Update existing rows to have default values (already handled by DEFAULT clause, but good practice)
UPDATE public.neural_agent_config
SET evolution_via_feedback = false, realtime_transcription = true
WHERE evolution_via_feedback IS NULL OR realtime_transcription IS NULL;
