CREATE POLICY "Clientes can view active honorarios"
ON public.honorarios_config
FOR SELECT
TO authenticated
USING (ativo = true);