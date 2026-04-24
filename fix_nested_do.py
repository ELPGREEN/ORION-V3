import sys
import re

filename = 'supabase/migrations/20260331133513_3b30a05b-edf6-42b8-b297-18572f4b1111.sql'
with open(filename, 'r') as f:
    content = f.read()

# Replace the double DO block for interaction_feedback
nested_block = """DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own feedback' AND tablename = 'interaction_feedback') THEN
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own feedback' AND tablename = 'interaction_feedback') THEN
    CREATE POLICY "Users manage own feedback" ON public.interaction_feedback
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
  END IF;
END $$;"""

correct_block = """DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own feedback' AND tablename = 'interaction_feedback') THEN
    CREATE POLICY "Users manage own feedback" ON public.interaction_feedback
      FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;"""

if nested_block in content:
    content = content.replace(nested_block, correct_block)
    with open(filename, 'w') as f:
        f.write(content)
    print("Nested DO block fixed")
else:
    print("Nested block not found exactly as expected, trying regex")
    # Try a more flexible replacement if literal match fails
    pattern = r'DO $$\s+BEGIN\s+IF NOT EXISTS \(SELECT 1 FROM pg_policies WHERE policyname = \'Users manage own feedback\' AND tablename = \'interaction_feedback\'\) THEN\s+DO $$\s+BEGIN\s+IF NOT EXISTS \(SELECT 1 FROM pg_policies WHERE policyname = \'Users manage own feedback\' AND tablename = \'interaction_feedback\'\) THEN\s+CREATE POLICY "Users manage own feedback" ON public\.interaction_feedback\s+FOR ALL TO authenticated\s+USING \(auth\.uid\(\) = user_id\) WITH CHECK \(auth\.uid\(\) = user_id\);\s+END IF;\s+END $$;\s+END IF;\s+END $$;'
    content = re.sub(pattern, correct_block, content, flags=re.DOTALL)
    with open(filename, 'w') as f:
        f.write(content)
    print("Flexible replacement attempted")
