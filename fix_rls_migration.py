import sys

filename = 'supabase/migrations/20260218190434_3f3c56b3-e17e-4f88-8c8e-8cfa4ad70b65.sql'
with open(filename, 'r') as f:
    content = f.read()

function_def = """
-- Create function for auto-enabling RLS
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;
"""

if "CREATE OR REPLACE FUNCTION public.rls_auto_enable()" not in content:
    # Insert before the event trigger creation
    marker = "-- 1. Create the rls_auto_enable EVENT TRIGGER"
    if marker in content:
        parts = content.split(marker)
        new_content = parts[0] + function_def + "\n" + marker + parts[1]
        with open(filename, 'w') as f:
            f.write(new_content)
        print("Function rls_auto_enable added to migration")
    else:
        print("Marker not found")
else:
    print("Function already exists in file")
