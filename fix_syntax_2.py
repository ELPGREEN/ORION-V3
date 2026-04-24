import os

file_path = "supabase/migrations/20260211153255_c1ab694a-b5ff-4506-ba1d-e7876a912942.sql"
with open(file_path, "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "  USING (has_role(auth.uid(), 'advogado'::app_role));" in line and "-- === lovable_webhook_requests ===" in "".join(new_lines[-10:]):
        new_lines.append("--  USING (has_role(auth.uid(), 'advogado'::app_role));\n")
    else:
        new_lines.append(line)

with open(file_path, "w") as f:
    f.writelines(new_lines)

print("Migration syntax fixed: commented out stray USING clause.")
