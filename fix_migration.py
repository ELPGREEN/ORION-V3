import os

file_path = "supabase/migrations/20260209171902_c7f3b012-92fa-483f-8eca-1d42f0f3be46.sql"
with open(file_path, "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "REVOKE ALL ON public.wrapper FROM anon, authenticated;" in line:
        new_lines.append("DO $$\n")
        new_lines.append("BEGIN\n")
        new_lines.append("  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'wrapper') THEN\n")
        new_lines.append("    REVOKE ALL ON public.wrapper FROM anon, authenticated;\n")
        new_lines.append("  END IF;\n")
        new_lines.append("END $$;\n")
    else:
        new_lines.append(line)

with open(file_path, "w") as f:
    f.writelines(new_lines)

print("Migration fixed with existence check for public.wrapper.")
