ALTER TABLE public.report_verifications
  DROP CONSTRAINT report_verifications_generated_by_fkey;

ALTER TABLE public.report_verifications
  ADD CONSTRAINT report_verifications_generated_by_fkey
  FOREIGN KEY (generated_by) REFERENCES auth.users(id)
  ON DELETE SET NULL;