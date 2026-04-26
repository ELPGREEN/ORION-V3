-- Repair: create stub Senado data tables if missing + policies
-- This ensures CI/Preview environments can apply RLS policies even if data hasn't been imported yet.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['Contrato', 'avencas', 'banco de dados senado', 'empresa contratadas', 'licitações'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Create stub table if it doesn't exist
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I (id bigserial PRIMARY KEY, raw jsonb, imported_at timestamptz DEFAULT now())',
      t
    );

    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Create policy (idempotent)
    EXECUTE format('DROP POLICY IF EXISTS "Public read access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Public read access" ON public.%I FOR SELECT USING (true)',
      t
    );
  END LOOP;
END $$;
