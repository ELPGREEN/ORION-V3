
-- Enum for framework types
CREATE TYPE public.framework_type AS ENUM ('ui_component', 'business_logic', 'full_stack', 'utility', 'integration', 'template', 'pipeline');

-- Enum for framework status
CREATE TYPE public.framework_status AS ENUM ('draft', 'validating', 'published', 'deprecated', 'blocked');

-- Main frameworks registry
CREATE TABLE public.orion_frameworks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL DEFAULT '1.0.0',
  framework_type framework_type NOT NULL DEFAULT 'utility',
  status framework_status NOT NULL DEFAULT 'draft',
  description TEXT,
  readme_md TEXT,
  source_code TEXT NOT NULL,
  compiled_code TEXT,
  schema_definition JSONB,
  dependencies JSONB DEFAULT '[]'::jsonb,
  exports TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  author_agent TEXT NOT NULL DEFAULT 'orion-core',
  created_by UUID,
  confidence_score NUMERIC(4,3) DEFAULT 0.000,
  validation_result JSONB,
  downloads INTEGER DEFAULT 0,
  rating_avg NUMERIC(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  is_core BOOLEAN DEFAULT false,
  parent_framework_id UUID REFERENCES public.orion_frameworks(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketplace: user installations
CREATE TABLE public.orion_module_installations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  framework_id UUID NOT NULL REFERENCES public.orion_frameworks(id) ON DELETE CASCADE,
  installed_version TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, framework_id)
);

-- Ratings
CREATE TABLE public.orion_module_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  framework_id UUID NOT NULL REFERENCES public.orion_frameworks(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, framework_id)
);

-- Generation logs (audit trail)
CREATE TABLE public.orion_generation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  framework_id UUID REFERENCES public.orion_frameworks(id),
  agent_role TEXT NOT NULL,
  phase TEXT NOT NULL,
  action TEXT NOT NULL,
  reasoning TEXT,
  input_data JSONB,
  output_data JSONB,
  confidence NUMERIC(4,3),
  duration_ms INTEGER,
  blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orion_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orion_module_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orion_module_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orion_generation_log ENABLE ROW LEVEL SECURITY;

-- Frameworks: everyone can read published, admin can manage all
CREATE POLICY "Anyone can view published frameworks"
ON public.orion_frameworks FOR SELECT
USING (status = 'published' OR public.is_admin(auth.uid()));

CREATE POLICY "Admin can manage frameworks"
ON public.orion_frameworks FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Service role full access frameworks"
ON public.orion_frameworks FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Installations: users manage their own
CREATE POLICY "Users manage own installations"
ON public.orion_module_installations FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin view all installations"
ON public.orion_module_installations FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Ratings: users manage own, everyone reads
CREATE POLICY "Anyone can view ratings"
ON public.orion_module_ratings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users manage own ratings"
ON public.orion_module_ratings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ratings"
ON public.orion_module_ratings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Generation log: admin only + service role
CREATE POLICY "Admin view generation logs"
ON public.orion_generation_log FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role manages generation logs"
ON public.orion_generation_log FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_orion_frameworks_updated_at
BEFORE UPDATE ON public.orion_frameworks
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER update_orion_installations_updated_at
BEFORE UPDATE ON public.orion_module_installations
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- Index for marketplace queries
CREATE INDEX idx_orion_frameworks_type_status ON public.orion_frameworks(framework_type, status);
CREATE INDEX idx_orion_frameworks_tags ON public.orion_frameworks USING GIN(tags);
CREATE INDEX idx_orion_frameworks_slug ON public.orion_frameworks(slug);
