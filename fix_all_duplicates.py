import sys
import re

filename = 'supabase/migrations/20260331133513_3b30a05b-edf6-42b8-b297-18572f4b1111.sql'
with open(filename, 'r') as f:
    content = f.read()

# Helper to wrap policies
def wrap_policy(c, policy_name, table_name):
    # Find the policy definition
    pattern = rf'CREATE POLICY "{policy_name}" ON public\.{table_name}.*?;'
    match = re.search(pattern, c, re.DOTALL)
    if match:
        original = match.group(0)
        wrapped = f"""DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = '{policy_name}' AND tablename = '{table_name}') THEN
    {original}
  END IF;
END $$;"""
        return c.replace(original, wrapped)
    return c

content = wrap_policy(content, "Users manage own feedback", "interaction_feedback")
content = wrap_policy(content, "Authenticated read adaptive prompts", "adaptive_system_prompts")

with open(filename, 'w') as f:
    f.write(content)
print("Duplicate policies wrapped")
