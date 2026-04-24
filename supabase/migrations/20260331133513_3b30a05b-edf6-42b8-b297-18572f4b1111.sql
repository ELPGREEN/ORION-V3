
-- ==========================================
-- PART 2: Create missing tables (batch 1)
-- ==========================================

-- adaptive_system_prompts
CREATE TABLE IF NOT EXISTS public.adaptive_system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_fala VARCHAR NOT NULL DEFAULT '',
  instrucao_sistema TEXT NOT NULL DEFAULT '',
  humor_modo VARCHAR DEFAULT 'neutro',
  ativo BOOLEAN DEFAULT true,
  exemplos_resposta JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.adaptive_system_prompts ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated read adaptive prompts' AND tablename = 'adaptive_system_prompts') THEN
    CREATE POLICY "Authenticated read adaptive prompts" ON public.adaptive_system_prompts
  FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- api_cache
CREATE TABLE IF NOT EXISTS public.api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT NOT NULL DEFAULT '',
  query_text TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  response_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_count INTEGER NOT NULL DEFAULT 0,
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read api_cache" ON public.api_cache
  FOR SELECT TO authenticated USING (true);

-- chat_ia_messages
CREATE TABLE IF NOT EXISTS public.chat_ia_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_ia_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL DEFAULT '',
  provider TEXT,
  neural_enhanced BOOLEAN NOT NULL DEFAULT false,
  intent TEXT,
  intent_params JSONB,
  sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_ia_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own chat_ia_messages" ON public.chat_ia_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM chat_ia_conversations c WHERE c.id = chat_ia_messages.conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "Users insert own chat_ia_messages" ON public.chat_ia_messages
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM chat_ia_conversations c WHERE c.id = chat_ia_messages.conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "Users delete own chat_ia_messages" ON public.chat_ia_messages
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM chat_ia_conversations c WHERE c.id = chat_ia_messages.conversation_id AND c.user_id = auth.uid()));

-- secretary_summaries
CREATE TABLE IF NOT EXISTS public.secretary_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  collected_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  urgency TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.secretary_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage secretary_summaries" ON public.secretary_summaries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- face_auth_enrollments
CREATE TABLE IF NOT EXISTS public.face_auth_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  face_embedding_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  reference_images TEXT[] NOT NULL DEFAULT '{}',
  enrollment_quality NUMERIC NOT NULL DEFAULT 0,
  anti_spoof_config JSONB NOT NULL DEFAULT '{"min_confidence": 0.75, "liveness_required": true}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  verification_count INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.face_auth_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own face_auth" ON public.face_auth_enrollments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- face_auth_log
CREATE TABLE IF NOT EXISTS public.face_auth_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL DEFAULT '',
  confidence NUMERIC,
  device_info JSONB,
  ip_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.face_auth_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own face_auth_log" ON public.face_auth_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own face_auth_log" ON public.face_auth_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- interaction_feedback
CREATE TABLE IF NOT EXISTS public.interaction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID,
  resposta_sistema TEXT NOT NULL DEFAULT '',
  avaliacao TEXT NOT NULL DEFAULT 'neutro',
  naturalidade_score INTEGER,
  contexto_correto BOOLEAN,
  comentario_adicional TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.interaction_feedback ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own feedback' AND tablename = 'interaction_feedback') THEN
    CREATE POLICY "Users manage own feedback" ON public.interaction_feedback
      FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- neural_agent_config
CREATE TABLE IF NOT EXISTS public.neural_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nickname TEXT NOT NULL DEFAULT 'ELP',
  persona TEXT NOT NULL DEFAULT 'assistente_juridico',
  speech_style TEXT NOT NULL DEFAULT 'formal_amigavel',
  humor_mode TEXT NOT NULL DEFAULT 'sutil',
  formality_level INTEGER NOT NULL DEFAULT 7,
  response_length TEXT NOT NULL DEFAULT 'medio',
  personality_prompt TEXT NOT NULL DEFAULT '',
  custom_instructions TEXT NOT NULL DEFAULT '',
  active_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_commands JSONB NOT NULL DEFAULT '[]'::jsonb,
  mirroring_enabled BOOLEAN NOT NULL DEFAULT true,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  vision_enabled BOOLEAN NOT NULL DEFAULT false,
  vision_auto_describe BOOLEAN NOT NULL DEFAULT false,
  proactive_vision BOOLEAN NOT NULL DEFAULT false,
  vision_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  voice_enabled BOOLEAN NOT NULL DEFAULT false,
  voice_language TEXT NOT NULL DEFAULT 'pt-BR',
  voice_speed DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  voice_pitch DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  wake_word TEXT NOT NULL DEFAULT 'elp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.neural_agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own agent_config" ON public.neural_agent_config
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
