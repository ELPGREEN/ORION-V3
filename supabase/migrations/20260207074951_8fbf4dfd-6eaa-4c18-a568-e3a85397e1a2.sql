DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'client_profiles'
      AND policyname = 'Advogados can delete client profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Advogados can delete client profiles" ON public.client_profiles FOR DELETE TO authenticated USING (has_role(auth.uid(), ''advogado''::public.app_role))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'client_profiles'
      AND policyname = 'Clientes can delete their own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Clientes can delete their own profile" ON public.client_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id)';
  END IF;
END
$do$;