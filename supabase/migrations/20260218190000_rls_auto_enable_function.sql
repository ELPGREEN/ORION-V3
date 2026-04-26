-- ─────────────────────────────────────────────────────────────────
-- RLS AUTO ENABLE FUNCTION
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
    obj record;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    LOOP
        IF obj.schema_name = 'public' THEN
            EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
            RAISE NOTICE 'RLS automatically enabled on table %', obj.object_identity;
        END IF;
    END LOOP;
END;
$$;
