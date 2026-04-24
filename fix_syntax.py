import os

file_path = "supabase/migrations/20260211150825_2b4262e1-d44c-41ff-bc7d-09de2452baeb.sql"
with open(file_path, "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "-- CREATE POLICY \"Advogados can view lovable_webhook_requests\"" in line:
        new_lines.append("CREATE POLICY \"Advogados can view lovable_webhook_requests\"\n")
    elif "-- ON public.lovable_webhook_requests" in line:
        new_lines.append("ON public.lovable_webhook_requests\n")
    else:
        new_lines.append(line)

with open(file_path, "w") as f:
    f.writelines(new_lines)

print("Migration syntax fixed: uncommented lovable_webhook_requests policy.")
