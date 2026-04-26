-- ─── Harden Evolution Security (v3 Standard) ───

-- 1. arc_evolution_proposals: restrict read to admins only
DROP POLICY IF EXISTS "Anyone authenticated can read arc_evolution_proposals" ON public.arc_evolution_proposals;
CREATE POLICY "Admins read arc evolution proposals"
  ON public.arc_evolution_proposals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. neural_evolution_proposals: ensure consistent admin-only access
DROP POLICY IF EXISTS "Admins read evolution proposals" ON public.neural_evolution_proposals;
CREATE POLICY "Admins manage all neural evolution proposals"
  ON public.neural_evolution_proposals FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. neural_learning_data: ensure admin-only access for technical patterns
DROP POLICY IF EXISTS "Authenticated read neural learning" ON public.neural_learning_data;
CREATE POLICY "Admins manage all neural learning data"
  ON public.neural_learning_data FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. arc_scorecards: restrict to admins
DROP POLICY IF EXISTS "Anyone authenticated can read arc_scorecards" ON public.arc_scorecards;
CREATE POLICY "Admins read arc scorecards"
  ON public.arc_scorecards FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. neural_prompt_versions: restrict to admins
DROP POLICY IF EXISTS "Admins read prompt versions" ON public.neural_prompt_versions;
CREATE POLICY "Admins manage all prompt versions"
  ON public.neural_prompt_versions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. neural_ab_experiments: restrict to admins
DROP POLICY IF EXISTS "Advogados can manage AB experiments" ON public.neural_ab_experiments;
CREATE POLICY "Admins manage all AB experiments"
  ON public.neural_ab_experiments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
