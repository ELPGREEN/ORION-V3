
-- Table for prompt/config versions with A/B tracking
CREATE TABLE public.neural_prompt_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL, -- 'document_generation', 'chat', 'search', 'mha_weights', 'temperature'
  key TEXT NOT NULL, -- specific identifier e.g. 'peticao_inicial_prompt', 'semantic_weight'
  version_label TEXT NOT NULL DEFAULT 'A',
  content TEXT NOT NULL, -- the prompt text or JSON config
  is_active BOOLEAN NOT NULL DEFAULT false,
  score_avg FLOAT DEFAULT 0,
  score_count INTEGER DEFAULT 0,
  parent_version_id UUID REFERENCES public.neural_prompt_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.neural_prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advogados can manage prompt versions" ON public.neural_prompt_versions
  FOR ALL USING (public.has_role(auth.uid(), 'advogado'));

-- Table for evolution proposals (auto-generated improvements awaiting approval)
CREATE TABLE public.neural_evolution_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_type TEXT NOT NULL, -- 'prompt_rewrite', 'config_change', 'code_fix', 'weight_tune'
  scope TEXT NOT NULL, -- 'gerar-documento', 'chat-juridico', 'neural-search', 'mha', etc.
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  current_value TEXT, -- what it is now
  proposed_value TEXT NOT NULL, -- what it should become
  reasoning TEXT NOT NULL, -- why the AI suggests this change
  impact_estimate TEXT, -- e.g. '+5% accuracy', 'fix timeout errors'
  evidence JSONB DEFAULT '{}', -- supporting data (error logs, feedback scores, etc.)
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'applied', 'reverted'
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.neural_evolution_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advogados can manage evolution proposals" ON public.neural_evolution_proposals
  FOR ALL USING (public.has_role(auth.uid(), 'advogado'));

-- Table for A/B experiment tracking
CREATE TABLE public.neural_ab_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL,
  variant_a_id UUID REFERENCES public.neural_prompt_versions(id),
  variant_b_id UUID REFERENCES public.neural_prompt_versions(id),
  traffic_split FLOAT DEFAULT 0.5, -- % going to variant B
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'concluded', 'cancelled'
  winner TEXT, -- 'A', 'B', null
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.neural_ab_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Advogados can manage AB experiments" ON public.neural_ab_experiments
  FOR ALL USING (public.has_role(auth.uid(), 'advogado'));

-- Indexes
CREATE INDEX idx_proposals_status ON public.neural_evolution_proposals(status);
CREATE INDEX idx_proposals_scope ON public.neural_evolution_proposals(scope);
CREATE INDEX idx_prompt_versions_scope ON public.neural_prompt_versions(scope, key);
CREATE INDEX idx_ab_experiments_status ON public.neural_ab_experiments(status);

-- Triggers for updated_at
CREATE TRIGGER update_prompt_versions_updated_at BEFORE UPDATE ON public.neural_prompt_versions
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
CREATE TRIGGER update_evolution_proposals_updated_at BEFORE UPDATE ON public.neural_evolution_proposals
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();
