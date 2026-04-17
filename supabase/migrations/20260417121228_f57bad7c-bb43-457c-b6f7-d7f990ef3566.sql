
-- ARC-AGI-3 integration tables

CREATE TABLE public.arc_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL UNIQUE,
  title text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  discovered_at timestamptz NOT NULL DEFAULT now(),
  last_played_at timestamptz,
  total_attempts integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  best_score numeric
);

ALTER TABLE public.arc_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read arc_games"
  ON public.arc_games FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage arc_games"
  ON public.arc_games FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.arc_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id text NOT NULL UNIQUE,
  game_id text NOT NULL,
  guid text,
  status text NOT NULL DEFAULT 'open',
  score numeric DEFAULT 0,
  level_reached integer DEFAULT 0,
  total_actions integer DEFAULT 0,
  won boolean DEFAULT false,
  strategy_summary text,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_by uuid
);

ALTER TABLE public.arc_scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read arc_scorecards"
  ON public.arc_scorecards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage arc_scorecards"
  ON public.arc_scorecards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_arc_scorecards_game ON public.arc_scorecards(game_id);
CREATE INDEX idx_arc_scorecards_created ON public.arc_scorecards(created_at DESC);

CREATE TABLE public.arc_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id text NOT NULL,
  game_id text NOT NULL,
  step integer NOT NULL,
  action_type text NOT NULL,
  action_payload jsonb DEFAULT '{}'::jsonb,
  observation jsonb DEFAULT '{}'::jsonb,
  reasoning text,
  reward numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.arc_actions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read arc_actions_log"
  ON public.arc_actions_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage arc_actions_log"
  ON public.arc_actions_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_arc_actions_scorecard ON public.arc_actions_log(scorecard_id, step);

CREATE TABLE public.arc_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL,
  strategy_name text NOT NULL,
  description text NOT NULL,
  pattern jsonb DEFAULT '{}'::jsonb,
  success_rate numeric DEFAULT 0,
  uses integer DEFAULT 0,
  wins integer DEFAULT 0,
  derived_from_scorecard text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.arc_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read arc_strategies"
  ON public.arc_strategies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage arc_strategies"
  ON public.arc_strategies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_arc_strategies_game ON public.arc_strategies(game_id);

CREATE TRIGGER trg_arc_strategies_updated
  BEFORE UPDATE ON public.arc_strategies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-evolution proposals from ARC learnings
CREATE TABLE public.arc_evolution_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_game_id text,
  source_scorecard_id text,
  title text NOT NULL,
  rationale text NOT NULL,
  target_files text[] DEFAULT ARRAY[]::text[],
  proposed_changes text NOT NULL,
  jules_pr_url text,
  jules_session_id text,
  status text NOT NULL DEFAULT 'pending',
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.arc_evolution_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read arc_evolution_proposals"
  ON public.arc_evolution_proposals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage arc_evolution_proposals"
  ON public.arc_evolution_proposals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_arc_proposals_updated
  BEFORE UPDATE ON public.arc_evolution_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
