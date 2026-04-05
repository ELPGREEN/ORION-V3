
-- Tabela de fila para geração assíncrona de documentos
CREATE TABLE public.generation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'document', -- 'document', 'datajud_ingestion'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  
  -- Input
  prompt TEXT,
  params JSONB NOT NULL DEFAULT '{}',
  
  -- Output
  result TEXT,
  result_metadata JSONB,
  error_message TEXT,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Retry
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3
);

-- Enable RLS
ALTER TABLE public.generation_queue ENABLE ROW LEVEL SECURITY;

-- Users can see their own jobs
CREATE POLICY "Users can view their own jobs"
  ON public.generation_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own jobs
CREATE POLICY "Users can insert their own jobs"
  ON public.generation_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update jobs (worker)
CREATE POLICY "Service can update jobs"
  ON public.generation_queue FOR UPDATE
  USING (true);

-- Service role can delete old jobs
CREATE POLICY "Service can delete jobs"
  ON public.generation_queue FOR DELETE
  USING (true);

-- Index for worker polling
CREATE INDEX idx_generation_queue_pending ON public.generation_queue (status, created_at)
  WHERE status = 'pending';

-- Index for user lookup
CREATE INDEX idx_generation_queue_user ON public.generation_queue (user_id, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_generation_queue_updated_at
  BEFORE UPDATE ON public.generation_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Enable pg_net for HTTP calls from pg_cron
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
