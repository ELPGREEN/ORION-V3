
-- ==========================================
-- PART 3: Add missing columns to existing tables + more tables
-- ==========================================

-- consultas: add valor, payment_status, payment_id
ALTER TABLE public.consultas ADD COLUMN IF NOT EXISTS valor NUMERIC;
ALTER TABLE public.consultas ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pendente';
ALTER TABLE public.consultas ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- contacts: add user_id
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS user_id UUID;

-- document_folders: add parent_id, client_profile_id
ALTER TABLE public.document_folders ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.document_folders(id);
ALTER TABLE public.document_folders ADD COLUMN IF NOT EXISTS client_profile_id UUID REFERENCES public.client_profiles(id);

-- neural_specializations: add prompts, user_id
ALTER TABLE public.neural_specializations ADD COLUMN IF NOT EXISTS prompts JSONB;
ALTER TABLE public.neural_specializations ADD COLUMN IF NOT EXISTS user_id UUID;

-- tarefas
CREATE TABLE IF NOT EXISTS public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  prioridade TEXT NOT NULL DEFAULT 'media',
  prazo TEXT,
  processo_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tarefas" ON public.tarefas
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_communication_context
CREATE TABLE IF NOT EXISTS public.user_communication_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  perfil_fala TEXT,
  estilo_comunicacao TEXT,
  nivel_formalidade INTEGER,
  humor_atual TEXT,
  girias_regional TEXT,
  expressoes_favoritas TEXT[],
  topicos_evitar TEXT[],
  reatividade_visual BOOLEAN,
  preferencias_explicitas JSONB,
  historico_interacoes JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_communication_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own comm context" ON public.user_communication_context
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_neural_profiles
CREATE TABLE IF NOT EXISTS public.user_neural_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'cliente',
  num_layers INTEGER NOT NULL DEFAULT 4,
  neurons_per_layer JSONB NOT NULL DEFAULT '[64,128,128,64]'::jsonb,
  weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  bias_vectors JSONB NOT NULL DEFAULT '{}'::jsonb,
  activation_functions JSONB NOT NULL DEFAULT '["relu","relu","relu","softmax"]'::jsonb,
  learning_rate DOUBLE PRECISION NOT NULL DEFAULT 0.001,
  training_epochs INTEGER NOT NULL DEFAULT 0,
  last_loss DOUBLE PRECISION,
  best_loss DOUBLE PRECISION,
  knowledge_neurons JSONB NOT NULL DEFAULT '{}'::jsonb,
  specializations JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_trained_at TIMESTAMPTZ,
  initialized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_neural_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own neural profile" ON public.user_neural_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- neural_training_log
CREATE TABLE IF NOT EXISTS public.neural_training_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  neural_profile_id UUID NOT NULL REFERENCES public.user_neural_profiles(id),
  epoch INTEGER NOT NULL,
  loss DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  weights_delta JSONB,
  training_data_sample JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.neural_training_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own training_log" ON public.neural_training_log
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- voice_auth_enrollments
CREATE TABLE IF NOT EXISTS public.voice_auth_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  voice_features JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_count INTEGER NOT NULL DEFAULT 0,
  enrollment_quality NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  verification_count INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_auth_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own voice enrollment" ON public.voice_auth_enrollments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- voice_auth_log
CREATE TABLE IF NOT EXISTS public.voice_auth_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL DEFAULT '',
  confidence NUMERIC,
  device_info JSONB,
  ip_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_auth_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own voice_log" ON public.voice_auth_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own voice_log" ON public.voice_auth_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- environmental_context
CREATE TABLE IF NOT EXISTS public.environmental_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  objeto_detectado VARCHAR NOT NULL DEFAULT '',
  categoria VARCHAR DEFAULT 'geral',
  confianca DOUBLE PRECISION DEFAULT 0.5,
  emocao_detectada VARCHAR,
  posicao_relativa VARCHAR,
  contexto_adicional VARCHAR,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.environmental_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own env_ctx" ON public.environmental_context
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- signed_urls
CREATE TABLE IF NOT EXISTS public.signed_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  file_path TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.signed_urls ENABLE ROW LEVEL SECURITY;

-- stripe_connect_accounts
CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_account_id TEXT NOT NULL DEFAULT '',
  display_name TEXT,
  business_type TEXT,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stripe accounts" ON public.stripe_connect_accounts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- shared_documents trigger notification
CREATE TABLE IF NOT EXISTS public.lovable_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL DEFAULT '',
  lovable_id TEXT,
  user_lovable_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lovable_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lovable_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lovable_id TEXT NOT NULL DEFAULT '',
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lovable_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.lovable_webhook_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method TEXT, path TEXT, signature TEXT,
  payload JSONB, status INTEGER, response_body JSONB,
  error TEXT, received_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.lovable_webhook_requests ENABLE ROW LEVEL SECURITY;

-- catalogo_dados_senado
CREATE TABLE IF NOT EXISTS public.catalogo_dados_senado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_categoria TEXT NOT NULL DEFAULT '',
  nom_conjunto_dados TEXT, des_conjunto_dados TEXT,
  nom_orgao_responsavel TEXT, cod_orgao_responsavel INTEGER,
  nom_sub_categoria TEXT, des_grupo_dados TEXT,
  nom_dicionario_dados TEXT, des_dicionario_dados TEXT,
  des_tipo_campo TEXT, des_frequencia_atualizacao TEXT,
  num_ordem INTEGER, txt_url TEXT, dth_ultima_atualizacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catalogo_dados_senado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read catalogo" ON public.catalogo_dados_senado
  FOR SELECT TO public USING (true);
