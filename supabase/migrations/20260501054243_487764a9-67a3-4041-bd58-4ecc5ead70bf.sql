-- Episodic Memory — Orion Singularity Protocol
CREATE TABLE IF NOT EXISTS public.orion_episodic_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  episode_type TEXT NOT NULL CHECK (episode_type IN ('interaction','failure','decision','reflection','milestone','correction')),
  agent TEXT CHECK (agent IN ('bolt','palette','harvester','orion','system')),
  command TEXT,
  response TEXT,
  sentiment TEXT,
  importance DOUBLE PRECISION NOT NULL DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  embedding vector(768),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orion_episodic_user ON public.orion_episodic_memory(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_orion_episodic_importance ON public.orion_episodic_memory(user_id, importance DESC, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_orion_episodic_type ON public.orion_episodic_memory(user_id, episode_type);
CREATE INDEX IF NOT EXISTS idx_orion_episodic_tags ON public.orion_episodic_memory USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_orion_episodic_embedding ON public.orion_episodic_memory USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.orion_episodic_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own episodes" ON public.orion_episodic_memory;
CREATE POLICY "Users view own episodes" ON public.orion_episodic_memory
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own episodes" ON public.orion_episodic_memory;
CREATE POLICY "Users insert own episodes" ON public.orion_episodic_memory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own episodes" ON public.orion_episodic_memory;
CREATE POLICY "Users update own episodes" ON public.orion_episodic_memory
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own episodes" ON public.orion_episodic_memory;
CREATE POLICY "Users delete own episodes" ON public.orion_episodic_memory
  FOR DELETE USING (auth.uid() = user_id);

-- Recall function: returns most important + most recent episodes for boot context
CREATE OR REPLACE FUNCTION public.get_recent_episodes(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_types TEXT[] DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  episode_type TEXT,
  agent TEXT,
  command TEXT,
  response TEXT,
  importance DOUBLE PRECISION,
  tags TEXT[],
  occurred_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT em.id, em.episode_type, em.agent, em.command, em.response,
         em.importance, em.tags, em.occurred_at
  FROM public.orion_episodic_memory em
  WHERE em.user_id = p_user_id
    AND (p_types IS NULL OR em.episode_type = ANY(p_types))
  ORDER BY em.importance DESC, em.occurred_at DESC
  LIMIT p_limit;
$$;