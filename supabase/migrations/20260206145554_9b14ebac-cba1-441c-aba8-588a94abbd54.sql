
-- Fix RLS policies to restrict to authenticated role only

-- contacts
DROP POLICY IF EXISTS "Users can manage their own contacts" ON public.contacts;
CREATE POLICY "Users can manage their own contacts"
  ON public.contacts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- honorarios_config
DROP POLICY IF EXISTS "Advogados can manage their own honorarios" ON public.honorarios_config;
CREATE POLICY "Advogados can manage their own honorarios"
  ON public.honorarios_config FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view active honorarios" ON public.honorarios_config;
CREATE POLICY "Authenticated users can view active honorarios"
  ON public.honorarios_config FOR SELECT
  TO authenticated
  USING (ativo = true);

-- consultas
DROP POLICY IF EXISTS "Clientes can view their own consultas" ON public.consultas;
CREATE POLICY "Clientes can view their own consultas"
  ON public.consultas FOR SELECT
  TO authenticated
  USING (auth.uid() = cliente_id);

DROP POLICY IF EXISTS "Clientes can create consultas" ON public.consultas;
CREATE POLICY "Clientes can create consultas"
  ON public.consultas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = cliente_id);

DROP POLICY IF EXISTS "Advogados can view all consultas" ON public.consultas;
CREATE POLICY "Advogados can view all consultas"
  ON public.consultas FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'advogado'));

DROP POLICY IF EXISTS "Advogados can update consultas" ON public.consultas;
CREATE POLICY "Advogados can update consultas"
  ON public.consultas FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'advogado'));

-- tarefas
DROP POLICY IF EXISTS "Users can manage their own tarefas" ON public.tarefas;
CREATE POLICY "Users can manage their own tarefas"
  ON public.tarefas FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
