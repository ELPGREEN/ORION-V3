
-- ══════════════════════════════════════════════════════════════════
-- FIX: generation_queue — increase max_attempts for triple/combined
-- and extend stale detection window for long-running pipelines
-- ══════════════════════════════════════════════════════════════════

-- Increase max_attempts for triple pipeline jobs (currently pending/queued)
-- Triple pipeline can take 60-90s and needs more retry headroom
UPDATE public.generation_queue
SET max_attempts = 5
WHERE params->>'modelo' = 'triple'
  AND status IN ('pending', 'queued');

UPDATE public.generation_queue
SET max_attempts = 4
WHERE params->>'modelo' = 'combined'
  AND status IN ('pending', 'queued');

-- Add a helper function to get the recommended max_attempts by modelo
-- so future inserts can use it
CREATE OR REPLACE FUNCTION public.get_queue_max_attempts(modelo text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN modelo = 'triple'   THEN 5
    WHEN modelo = 'combined' THEN 4
    ELSE 3
  END;
$$;

-- Add partial index to speed up queue worker's query for pending jobs
CREATE INDEX IF NOT EXISTS idx_generation_queue_pending_created
  ON public.generation_queue(created_at)
  WHERE status = 'pending';

-- Add partial index for processing jobs (stale detection)
CREATE INDEX IF NOT EXISTS idx_generation_queue_processing_started
  ON public.generation_queue(started_at)
  WHERE status = 'processing';
