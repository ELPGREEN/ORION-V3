
-- 1. neural_knowledge_base: restrict to admin
DROP POLICY IF EXISTS "Authenticated users can read knowledge" ON public.neural_knowledge_base;
DROP POLICY IF EXISTS "Authenticated read neural knowledge" ON public.neural_knowledge_base;
DROP POLICY IF EXISTS "Anyone can read neural knowledge" ON public.neural_knowledge_base;
DROP POLICY IF EXISTS "Service role full access neural knowledge" ON public.neural_knowledge_base;

CREATE POLICY "Admins read neural knowledge"
ON public.neural_knowledge_base FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage neural knowledge"
ON public.neural_knowledge_base FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. orion_autonomous_agents: restrict to admin
DROP POLICY IF EXISTS "Authenticated read agents" ON public.orion_autonomous_agents;
DROP POLICY IF EXISTS "Anyone can read agents" ON public.orion_autonomous_agents;

CREATE POLICY "Admins read agents"
ON public.orion_autonomous_agents FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage agents"
ON public.orion_autonomous_agents FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. adaptive_system_prompts: restrict to admin
DROP POLICY IF EXISTS "Authenticated read adaptive prompts" ON public.adaptive_system_prompts;

CREATE POLICY "Admins read adaptive prompts"
ON public.adaptive_system_prompts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. neural_learning_data: restrict to admin
DROP POLICY IF EXISTS "Authenticated read neural learning" ON public.neural_learning_data;
DROP POLICY IF EXISTS "Anyone can read neural learning data" ON public.neural_learning_data;

CREATE POLICY "Admins read neural learning"
ON public.neural_learning_data FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage neural learning"
ON public.neural_learning_data FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
