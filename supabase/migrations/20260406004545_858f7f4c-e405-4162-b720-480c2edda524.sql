-- Table for Orion's dynamically created autonomous agents
CREATE TABLE IF NOT EXISTS public.orion_autonomous_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  agent_role TEXT NOT NULL DEFAULT 'specialist',
  hf_model_id TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  system_prompt TEXT,
  capabilities JSONB DEFAULT '[]'::jsonb,
  performance_score NUMERIC(4,3) DEFAULT 0.500,
  invocation_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_by TEXT DEFAULT 'orion',
  creation_reason TEXT,
  is_active BOOLEAN DEFAULT true,
  parent_agent_id UUID REFERENCES public.orion_autonomous_agents(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_type TEXT NOT NULL DEFAULT 'user',
  display_name TEXT NOT NULL,
  elevenlabs_voice_id TEXT,
  voice_sample_url TEXT,
  voice_characteristics JSONB DEFAULT '{}'::jsonb,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orion_self_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type TEXT NOT NULL,
  target_path TEXT,
  findings JSONB DEFAULT '{}'::jsonb,
  agents_created TEXT[] DEFAULT '{}',
  difficulty_level NUMERIC(3,2) DEFAULT 0.00,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orion_autonomous_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orion_self_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read agents" ON public.orion_autonomous_agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages agents" ON public.orion_autonomous_agents FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users manage own voice profiles" ON public.voice_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Service role manages voice profiles" ON public.voice_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read analysis" ON public.orion_self_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages analysis" ON public.orion_self_analysis FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER set_updated_at_agents BEFORE UPDATE ON public.orion_autonomous_agents FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER set_updated_at_voice BEFORE UPDATE ON public.voice_profiles FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();