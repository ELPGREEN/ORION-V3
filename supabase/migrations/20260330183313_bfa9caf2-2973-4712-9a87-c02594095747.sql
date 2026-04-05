
-- 1. User Communication Context
CREATE TABLE IF NOT EXISTS public.user_communication_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  estilo_comunicacao VARCHAR DEFAULT 'coloquial',
  nivel_formalidade INTEGER DEFAULT 5,
  girias_regional VARCHAR DEFAULT 'brasileiro_geral',
  perfil_fala VARCHAR DEFAULT 'Amigável/Coloquial',
  reatividade_visual BOOLEAN DEFAULT true,
  humor_atual VARCHAR DEFAULT 'neutro',
  historico_interacoes JSONB DEFAULT '[]'::jsonb,
  preferencias_explicitas JSONB DEFAULT '{}'::jsonb,
  topicos_evitar TEXT[] DEFAULT '{}',
  expressoes_favoritas TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_communication_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own comm context" ON public.user_communication_context
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_user_comm_ctx
  BEFORE UPDATE ON public.user_communication_context
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- 2. Environmental Context
CREATE TABLE IF NOT EXISTS public.environmental_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  objeto_detectado VARCHAR NOT NULL,
  categoria VARCHAR DEFAULT 'geral',
  confianca FLOAT DEFAULT 0.5,
  contexto_adicional VARCHAR,
  emocao_detectada VARCHAR,
  posicao_relativa VARCHAR,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.environmental_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own env ctx" ON public.environmental_context
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_env_ctx_active ON public.environmental_context(user_id, ativo, created_at DESC);

-- 3. Adaptive System Prompts
CREATE TABLE IF NOT EXISTS public.adaptive_system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_fala VARCHAR NOT NULL,
  humor_modo VARCHAR DEFAULT 'neutro',
  instrucao_sistema TEXT NOT NULL,
  exemplos_resposta JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.adaptive_system_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read prompts" ON public.adaptive_system_prompts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated manage prompts" ON public.adaptive_system_prompts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Interaction Feedback
CREATE TABLE IF NOT EXISTS public.interaction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID,
  resposta_sistema TEXT NOT NULL,
  avaliacao VARCHAR NOT NULL DEFAULT 'neutro',
  naturalidade_score INTEGER,
  contexto_correto BOOLEAN,
  comentario_adicional TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interaction_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own feedback" ON public.interaction_feedback
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Seed adaptive prompts
INSERT INTO public.adaptive_system_prompts (perfil_fala, humor_modo, instrucao_sistema, exemplos_resposta) VALUES
('Mano/Gírias/Rua', 'zueira', 
  'Você fala como um amigo próximo da rua. Use gírias brasileiras naturais (salve, mano, tá ligado, irmão, papo reto, suave). Ria com "kkkk" ou "hahaha". Seja leve e divertido. NUNCA use listas numeradas nem linguagem formal.',
  '[{"entrada":"E aí, tudo bem?","resposta":"Salveee mano! Tudo suave por aqui kkkk"},{"entrada":"Preciso de ajuda","resposta":"Bora lá irmão, fala o que tu precisa"}]'::jsonb),
('Mano/Gírias/Rua', 'frustrado',
  'O usuário está frustrado. Use gírias mas com tom de apoio. Frases como "relaxa irmão", "calma que a gente resolve", "tô contigo nessa".',
  '[{"entrada":"Deu tudo errado","resposta":"Pô mano, que bad... mas relaxa, tô aqui contigo. Bora resolver"}]'::jsonb),
('Amigável/Coloquial', 'neutro',
  'Fale de forma amigável e natural. Use linguagem clara, direta e acessível. Expressões como "beleza", "tranquilo", "show".',
  '[{"entrada":"Oi, preciso de info","resposta":"Oi! Claro, fala aí que eu te ajudo!"}]'::jsonb),
('Amigável/Coloquial', 'empático',
  'Seja caloroso e compreensivo. Use frases como "entendo perfeitamente", "faz sentido você se sentir assim", "vamos resolver juntos".',
  '[{"entrada":"Estou preocupado","resposta":"Entendo sua preocupação. Vamos olhar isso com calma, ok?"}]'::jsonb),
('Profissional/Neutro', 'neutro',
  'Tom profissional mas acessível. Linguagem clara e objetiva. Evite gírias mas não seja robótico.',
  '[{"entrada":"Preciso de orientação","resposta":"Claro! Vou analisar sua situação. Pode dar mais detalhes?"}]'::jsonb),
('Profissional/Neutro', 'frustrado',
  'Reconheça a frustração com empatia profissional. Mantenha calma e ofereça soluções concretas.',
  '[{"entrada":"Isso está demorando","resposta":"Compreendo sua insatisfação. Vou priorizar essa questão."}]'::jsonb);
