
-- Fix 1: Invoices RLS - add user_id isolation
DROP POLICY IF EXISTS "Advogados can manage their own invoices" ON public.invoices;
CREATE POLICY "Advogados can manage their own invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'advogado') AND auth.uid() = user_id)
  WITH CHECK (has_role(auth.uid(), 'advogado') AND auth.uid() = user_id);

-- Fix 2: Publicacoes RLS - restore user_id check
DROP POLICY IF EXISTS "Advogados can manage their own articles" ON public.publicacoes;
CREATE POLICY "Advogados can manage their own articles"
  ON public.publicacoes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'advogado') AND auth.uid() = user_id)
  WITH CHECK (has_role(auth.uid(), 'advogado') AND auth.uid() = user_id);
