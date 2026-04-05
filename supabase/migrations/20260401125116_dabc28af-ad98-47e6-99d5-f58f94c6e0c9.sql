-- Add missing columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS oab_number text,
ADD COLUMN IF NOT EXISTS oab_uf text,
ADD COLUMN IF NOT EXISTS areas_atuacao text[],
ADD COLUMN IF NOT EXISTS telefone text;

-- Fix RLS policies: they use auth.uid() = id but should use auth.uid() = user_id
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Add advogado SELECT policy for client_profiles (advogados see their assigned clients)
DROP POLICY IF EXISTS "Advogados view assigned clients" ON public.client_profiles;
CREATE POLICY "Advogados view assigned clients" ON public.client_profiles
  FOR SELECT USING (auth.uid() = advogado_id);

-- Advogados can update their assigned clients
DROP POLICY IF EXISTS "Advogados update assigned clients" ON public.client_profiles;
CREATE POLICY "Advogados update assigned clients" ON public.client_profiles
  FOR UPDATE USING (auth.uid() = advogado_id);