-- Repair: create stub Senado tables if missing + idempotent public-read policies
-- Pattern Jules should reuse: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS + CREATE POLICY

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['Contrato', 'avencas', 'banco de dados senado', 'empresa contratadas', 'licitações'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- 1. Create stub table if it doesn't exist (production already has data; CI/Preview gets empty stub)
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I (id bigserial PRIMARY KEY, raw jsonb, imported_at timestamptz DEFAULT now())',
      t
    );

    -- 2. Enable RLS (safe to re-run)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- 3. Drop existing policy then recreate (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "Public read access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Public read access" ON public.%I FOR SELECT USING (true)',
      t
    );
  END LOOP;
END $$;