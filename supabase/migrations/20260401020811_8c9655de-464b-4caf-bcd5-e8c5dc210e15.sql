
CREATE TABLE public.neural_code_patches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.neural_evolution_proposals(id) ON DELETE SET NULL,
  target_function TEXT NOT NULL,
  patch_type TEXT NOT NULL DEFAULT 'config_update',
  original_code TEXT,
  patched_code TEXT NOT NULL,
  validation_score FLOAT DEFAULT 0,
  validation_log JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.neural_code_patches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage patches" ON public.neural_code_patches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_neural_code_patches_status ON public.neural_code_patches(status);
CREATE INDEX idx_neural_code_patches_target ON public.neural_code_patches(target_function);
