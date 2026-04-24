import sys

filename = 'supabase/migrations/20260331133513_3b30a05b-edf6-42b8-b297-18572f4b1111.sql'
with open(filename, 'r') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if 'CREATE POLICY "Users manage own feedback" ON public.interaction_feedback' in line:
        # Wrap in DO block to avoid duplicate error
        new_lines.append("DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own feedback' AND tablename = 'interaction_feedback') THEN\n")
        new_lines.append(line)
        skip = True
        continue

    if skip and 'WITH CHECK (auth.uid() = user_id);' in line:
        new_lines.append(line)
        new_lines.append("  END IF;\nEND $$;\n")
        skip = False
        continue

    new_lines.append(line)

with open(filename, 'w') as f:
    f.writelines(new_lines)
print("Policy wrapped in IF NOT EXISTS check")
