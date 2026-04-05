
-- Create blooms table for AI content bloom network
CREATE TABLE public.blooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.blooms(id) ON DELETE CASCADE,
  root_id uuid REFERENCES public.blooms(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'idea' CHECK (type IN ('idea', 'task', 'visual', 'seo', 'outline')),
  ai_generated boolean NOT NULL DEFAULT false,
  position_x double precision DEFAULT 0,
  position_y double precision DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blooms ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Users can manage their own blooms"
  ON public.blooms FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Shared read-only: blooms where root owner shared
CREATE TABLE public.bloom_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bloom_root_id uuid NOT NULL REFERENCES public.blooms(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bloom_root_id, shared_with)
);

ALTER TABLE public.bloom_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage shares"
  ON public.bloom_shares FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Shared users can view shares"
  ON public.bloom_shares FOR SELECT
  USING (auth.uid() = shared_with);

-- Read-only policy for shared blooms
CREATE POLICY "Shared users can view blooms"
  ON public.blooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bloom_shares bs
      WHERE bs.shared_with = auth.uid()
        AND bs.bloom_root_id = blooms.root_id
    )
  );

-- Updated_at trigger
CREATE TRIGGER set_blooms_updated_at
  BEFORE UPDATE ON public.blooms
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Index for tree queries
CREATE INDEX idx_blooms_parent_id ON public.blooms(parent_id);
CREATE INDEX idx_blooms_root_id ON public.blooms(root_id);
CREATE INDEX idx_blooms_user_id ON public.blooms(user_id);
